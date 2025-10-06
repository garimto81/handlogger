/** Code.gs — Poker Hand Logger — 버전은 VERSION 상수 참조
 *
 * v2.5.0 변경사항 (2025-10-06):
 * - ⭐ VIRTUAL C열 Time 매칭: pushToVirtual() 재작성
 * - ⭐ Keyplayer 필터링: buildSubtitleBlock_() 추가
 * - extractTimeHHMM_(): ISO → HH:MM KST 변환
 * - Date 객체 처리: VIRTUAL C열 Date 형식 지원
 * - 헤더 3행 스킵: 행4부터 데이터 읽기
 *
 * v2.4.0 변경사항:
 * - XSS 취약점 수정 (textContent 전환)
 * - localStorage 키 통일 (phl_extSheetId)
 *
 * v2.3.0 변경사항:
 * - Type 시트 통합: APP_SPREADSHEET 단일 파일
 * - VIRTUAL 시트 선별 전송
 *
 * v2.2.0 변경사항:
 * - Review mode 2-panel 레이아웃
 * - 플레이어 이름 표시 개선
 */

/* ===== 버전 관리 ===== */
// VERSION, VERSION_DATE, VERSION_FULL → version.js에서 제공 (빌드 시 병합)

const APP_SPREADSHEET_ID = '19e7eDjoZRFZooghZJF3XmOZzZcgmqsp9mFAfjvJWhj4'; // 단일 파일 저장소
const SH = {
  HANDS: 'HANDS',
  ACTS: 'ACTIONS',
  CONFIG: 'CONFIG',
  LOG: 'LOG',
  TYPE: 'Type'  // ⭐ v2.3: 테이블/플레이어 (통합)
};

const ROSTER_HEADERS = {
  tableNo:['Table No.','TableNo','Table_Number','table_no'],
  seatNo:['Seat No.','Seat','SeatNo','seat_no'],
  player:['Players','Player','Name'],
  nation:['Nationality','Nation','Country'],
  chips:['Chips','Stack','Starting Chips','StartStack'],
  keyplayer:['Keyplayer','Key Player','KeyPlayer','key_player'], // ⭐ v2.5
};

// 공통 함수 (withScriptLock_, appSS_, getOrCreateSheet_, setHeaderIfEmpty_, readAll_, findColIndex_, toInt_, nowKST_, todayStartKST_) → src/common/common.gs로 이동
function ensureSheets_(){
  const ss=appSS_();
  setHeaderIfEmpty_(getOrCreateSheet_(ss,SH.HANDS),[
    'hand_id','client_uuid','table_id','hand_no',
    'start_street','started_at','ended_at','btn_seat',
    'board_f1','board_f2','board_f3','board_turn','board_river',
    'pre_pot','winner_seat','pot_final','stacks_json','holes_json','schema_ver'
  ]);
  setHeaderIfEmpty_(getOrCreateSheet_(ss,SH.ACTS),[
    'hand_id','seq','street','seat','action',
    'amount_input','to_call_after','contrib_after_seat','pot_after','note'
  ]);
  setHeaderIfEmpty_(getOrCreateSheet_(ss,SH.CONFIG),['table_id','btn_seat','hand_seq','updated_at']);
  setHeaderIfEmpty_(getOrCreateSheet_(ss,SH.LOG),['ts','func','table_id','code','msg','user']);
  // ⭐ v2.3: Type 시트 초기화 (통합)
  setHeaderIfEmpty_(getOrCreateSheet_(ss,SH.TYPE),[
    'Table No.','Seat No.','Players','Nationality','Chips'
  ]);
}

function doGet(){
  ensureSheets_();
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('Poker Hand Logger — ' + VERSION.current)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ==== Type 시트 (v2.3: 통합) ==== */
// readRoster_() → src/common/common.gs로 이동

/* ==== CONFIG ==== */
function readConfig_(){
  const sh=appSS_().getSheetByName(SH.CONFIG);
  const {rows,map}=readAll_(sh);
  const cfg={};
  rows.forEach(r=>{
    const t=String(r[map['table_id']]||'').trim(); if(!t) return;
    cfg[t]={btn_seat:r[map['btn_seat']]||'', hand_seq:toInt_(r[map['hand_seq']]), updated_at:r[map['updated_at']]||''};
  });
  return cfg;
}
function getConfig(){
  ensureSheets_();
  try{
    const {tables,roster}=readRoster_();
    const config=readConfig_();
    return {tables,roster,config,error:''};
  }catch(e){
    log_('ERR_GETCFG',e.message);
    return {tables:[],roster:{},config:{},error:String(e.message||e)};
  }
}

/* ==== SAVE (기존) ==== */
function saveHand(payload){
  ensureSheets_();
  if(!payload) throw new Error('empty payload');
  return withScriptLock_(()=>_saveCore_(payload));
}

/* ==== SAVE + 외부 시트 갱신(승자 없이) ==== */
function saveHandWithExternal(payload, ext){
  ensureSheets_();
  if(!payload) throw new Error('empty payload');
  return withScriptLock_(()=>{
    log_('SAVE_EXT_BEGIN', `table=${payload.table_id||''} started_at=${payload.started_at||''}`, payload.table_id);
    const saved = _saveCore_(payload); // {ok, hand_id, hand_no, idempotent}
    log_('SAVE_OK', `hand_id=${saved.hand_id} hand_no=${saved.hand_no} idempotent=${!!saved.idempotent}`, payload.table_id);

    let extRes = {updated:false, reason:'no-ext'};
    try{
      if(ext && ext.sheetId){
        const detail = getHandDetail(saved.hand_id); // {head, acts}
        extRes = updateExternalVirtual_(ext.sheetId, detail, ext); // no winner, J blank
      }
    }catch(e){
      extRes={updated:false, reason:String(e.message||e)};
      log_('EXT_FAIL', extRes.reason, payload.table_id);
    }
    return Object.assign({}, saved, {external:extRes});
  });
}

/* ==== 내부: 저장 코어 ==== */
function _saveCore_(payload){
  const ss=appSS_(), shH=ss.getSheetByName(SH.HANDS), shA=ss.getSheetByName(SH.ACTS);
  const H=readAll_(shH), A=readAll_(shA);

  // 멱등성: client_uuid + started_at
  const idxClient=H.map['client_uuid'], idxStart=H.map['started_at'];
  for(let i=0;i<H.rows.length;i++){
    const r=H.rows[i];
    if(String(r[idxClient])===String(payload.client_uuid) && String(r[idxStart])===String(payload.started_at)){
      return {ok:true, hand_id:String(r[H.map['hand_id']]), idempotent:true, hand_no:String(r[H.map['hand_no']]||'')};
    }
  }

  // hand_id
  let handId=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyyMMdd'_'HHmmssSSS");
  const exists=new Set(H.rows.map(r=>String(r[H.map['hand_id']]))); while(exists.has(handId)) handId+='+1';

  // hand_no 자동
  let handNo = payload.hand_no; if(!handNo){ handNo = String(nextHandSeq_(String(payload.table_id||''))); }

  const b=payload.board||{};
  shH.appendRow([
    handId, String(payload.client_uuid||''), String(payload.table_id||''), String(handNo||''),
    String(payload.start_street||''), String(payload.started_at||new Date().toISOString()), String(payload.ended_at||''), String(payload.btn_seat||''),
    String(b.f1||''), String(b.f2||''), String(b.f3||''), String(b.turn||''), String(b.river||''),
    Number(payload.pre_pot||0),
    '', // winner_seat 제거(v1.1) — 공란 유지
    String(payload.pot_final||''),
    JSON.stringify(payload.stack_snapshot||{}),
    JSON.stringify(payload.holes||{}),
    VERSION.current
  ]);

  const acts=Array.isArray(payload.actions)?payload.actions:[];
  if(acts.length){
    const rows=acts.map(a=>[
      handId, Number(a.seq||0), String(a.street||''), String(a.seat||''), String(a.action||''),
      Number(a.amount_input||0), Number(a.to_call_after||0), Number(a.contrib_after_seat||0), Number(a.pot_after||0), String(a.note||'')
    ]);
    shA.getRange(shA.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
  }

  if(payload.table_id){ upsertConfig_(String(payload.table_id), String(payload.btn_seat||'')); }

  return {ok:true, hand_id:handId, hand_no:handNo, idempotent:false};
}

/* ==== CONFIG seq ==== */
function nextHandSeq_(tableId){
  const sh=appSS_().getSheetByName(SH.CONFIG);
  const {header,rows,map}=readAll_(sh);
  const idxT=map['table_id'], idxS=map['hand_seq'], idxU=map['updated_at'];
  let found=-1; for(let i=0;i<rows.length;i++){ if(String(rows[i][idxT]).trim()===tableId){found=i+2; break;} }
  const now=new Date();
  if(found>0){
    const cur=toInt_(sh.getRange(found, idxS+1).getValue()); const next=cur+1;
    sh.getRange(found, idxS+1).setValue(next); if(idxU>=0) sh.getRange(found, idxU+1).setValue(now);
    return next;
  }else{
    const out=new Array(header.length).fill(''); out[idxT]=tableId; if(idxS>=0) out[idxS]=1; if(idxU>=0) out[idxU]=now; sh.appendRow(out); return 1;
  }
}
function resetHandSeq(tableId, toValue){
  return withScriptLock_(()=>{
    const sh=appSS_().getSheetByName(SH.CONFIG);
    const {header,rows,map}=readAll_(sh);
    const idxT=map['table_id'], idxS=map['hand_seq'], idxU=map['updated_at'];
    let found=-1; for(let i=0;i<rows.length;i++){ if(String(rows[i][idxT]).trim()===tableId){found=i+2; break;} }
    const now=new Date();
    if(found>0){
      sh.getRange(found, idxS+1).setValue(toInt_(toValue)); if(idxU>=0) sh.getRange(found, idxU+1).setValue(now);
    } else{
      const out=new Array(header.length).fill(''); out[idxT]=tableId; if(idxS>=0) out[idxS]=toInt_(toValue); if(idxU>=0) out[idxU]=now; sh.appendRow(out);
    }
    return {ok:true, table_id:tableId, hand_seq:toInt_(toValue)};
  });
}
function upsertConfig_(tableId, btnSeat){
  const sh=appSS_().getSheetByName(SH.CONFIG);
  const {header,rows,map}=readAll_(sh);
  const idxT=map['table_id'], idxB=map['btn_seat'], idxU=map['updated_at'];
  let found=-1; for(let i=0;i<rows.length;i++){ if(String(rows[i][idxT]).trim()===tableId){found=i+2; break;} }
  const now=new Date();
  if(found>0){
    if(idxB>=0 && btnSeat) sh.getRange(found, idxB+1).setValue(btnSeat);
    if(idxU>=0) sh.getRange(found, idxU+1).setValue(now);
  }else{
    const out=new Array(header.length).fill(''); out[idxT]=tableId; if(idxB>=0) out[idxB]=btnSeat||''; if(idxU>=0) out[idxU]=now; sh.appendRow(out);
  }
}

/* ==== REVIEW ==== */
function queryHands(filter,paging){
  ensureSheets_();
  try{
    const sh=appSS_().getSheetByName(SH.HANDS);
    const {rows,map}=readAll_(sh);
    const idxStart=map['started_at'];
    // v1.2.0 정렬 버그 수정: Date/String 혼합 대응
    rows.sort((a,b)=>{
      const aVal=a[idxStart], bVal=b[idxStart];
      const aTime=(aVal instanceof Date)?aVal.getTime():(new Date(aVal).getTime()||0);
      const bTime=(bVal instanceof Date)?bVal.getTime():(new Date(bVal).getTime()||0);
      return bTime-aTime; // 최신순(내림차순)
    });
    const size=(paging&&paging.size)?Number(paging.size):50;
    const page=(paging&&paging.num)?Number(paging.num):1;
    const slice=rows.slice((page-1)*size,(page-1)*size+size);
    const items=slice.map(r=>({
      hand_id:String(r[map['hand_id']]),
      table_id:String(r[map['table_id']]||''),
      btn_seat:String(r[map['btn_seat']]||''),
      hand_no:String(r[map['hand_no']]||''),
      start_street:String(r[map['start_street']]||''),
      started_at:String(r[idxStart]||''),
      board:{
        f1:r[map['board_f1']]||'',
        f2:r[map['board_f2']]||'',
        f3:r[map['board_f3']]||'',
        turn:r[map['board_turn']]||'',
        river:r[map['board_river']]||''
      }
    }));
    return { total:rows.length, items, error:'' };
  }catch(e){
    log_('ERR_QH',e.message);
    return { total:0, items:[], error:String(e.message||e) };
  }
}

function getHandDetail(hand_id){
  let result = { head:null, acts:[], error:'' };
  try{
    ensureSheets_(); if (!hand_id) return {head:null, acts:[], error:'invalid hand_id'};
    const ss = appSS_(); const shH = ss.getSheetByName(SH.HANDS); const shA = ss.getSheetByName(SH.ACTS);
    const H = readAll_(shH); const A = readAll_(shA);
    const idxH = H.map['hand_id']; let head = null;
    for (let i=0; i<H.rows.length; i++){
      if (String(H.rows[i][idxH]) === String(hand_id)){
        const r = H.rows[i], m = H.map;
        head = {
          hand_id: String(r[m['hand_id']]),
          table_id: String(r[m['table_id']] || ''),
          btn_seat: String(r[m['btn_seat']] || ''),
          hand_no: String(r[m['hand_no']] || ''),
          start_street: String(r[m['start_street']] || ''),
          started_at: String(r[m['started_at']] || ''),
          ended_at: String(r[m['ended_at']] || ''),
          board: {
            f1: r[m['board_f1']] || '',
            f2: r[m['board_f2']] || '',
            f3: r[m['board_f3']] || '',
            turn: r[m['board_turn']] || '',
            river: r[m['board_river']] || ''
          },
          pre_pot: Number(r[m['pre_pot']] || 0),
          winner_seat: '', // v1.1: winner 제거
          pot_final: String(r[m['pot_final']] || ''),
          stacks_json: String(r[m['stacks_json']]||'{}'),
          holes_json: String(r[m['holes_json']]||'{}')
        };
        break;
      }
    }
    if (!head) return { head:null, acts:[], error:'hand not found' };

    const acts = A.rows
      .filter(r => String(r[A.map['hand_id']]) === String(hand_id))
      .map(r => ({
        seq: Number(r[A.map['seq']] || 0),
        street: String(r[A.map['street']] || ''),
        seat: String(r[A.map['seat']] || ''),
        action: String(r[A.map['action']] || ''),
        amount_input: Number(r[A.map['amount_input']] || 0),
        to_call_after: Number(r[A.map['to_call_after']] || 0),
        contrib_after_seat: Number(r[A.map['contrib_after_seat']] || 0),
        pot_after: Number(r[A.map['pot_after']] || 0),
        note: String(r[A.map['note']] || '')
      }))
      .sort((x,y)=>x.seq - y.seq);

    return { head, acts, error:'' };
  } catch(e){
    return { head:null, acts:[], error:(e && e.message) ? e.message : 'unknown' };
  } finally { /* no-op */ }
}

/* ===== 외부 시트 갱신 (C열 파싱 보강) ===== */
function parseTimeCellToTodayKST_(raw, disp){
  let hh=null, mm=null, ss=0;

  // 1) Date 객체
  if (raw && raw instanceof Date){
    hh = raw.getHours(); mm = raw.getMinutes(); ss = raw.getSeconds()||0;
  }
  // 2) 숫자(시트의 하루 분수 0~1)
  else if (typeof raw === 'number' && isFinite(raw)){
    const totalSec = Math.round(raw * 24 * 60 * 60);
    hh = Math.floor(totalSec/3600) % 24;
    mm = Math.floor((totalSec%3600)/60);
    ss = totalSec % 60;
  }
  // 3) 표시 문자열 "HH:mm" 또는 "H:mm(:ss)"
  else {
    const s = String(disp||'').trim();
    const m = s.match(/(\d{1,2})\s*:\s*(\d{2})(?::(\d{2}))?/);
    if (m){
      hh = Math.max(0, Math.min(23, parseInt(m[1],10)));
      mm = Math.max(0, Math.min(59, parseInt(m[2],10)));
      ss = m[3] ? Math.max(0, Math.min(59, parseInt(m[3],10))) : 0;
    }
  }

  if (hh===null || mm===null) return null;
  const base = todayStartKST_();
  base.setHours(hh, mm, ss, 0);
  return base;
}

// ⚠️ DEPRECATED: C열 Time 매칭 방식 (v2.3 이전)
function updateExternalVirtual_(sheetId, detail, ext){
  if(!sheetId) return {updated:false, reason:'no-sheetId'};

  const ss = SpreadsheetApp.openById(sheetId);
  const sh = ss.getSheetByName('VIRTUAL') || ss.getSheets()[0];

  // 매칭 행(C열 Time) — 현재(KST) 이하 중 가장 최근(아래에서부터 검색)
  const now = nowKST_();
  const last = sh.getLastRow(); if(last < 2) return {updated:false, reason:'no-rows'};

  const rngVals = sh.getRange(2,3,last-1,1).getValues();          // 원시 값
  const rngDisp = sh.getRange(2,3,last-1,1).getDisplayValues();   // 표시 값(서식 반영)

  let pickRow = -1;
  for(let i=rngVals.length-1;i>=0;i--){
    const raw = rngVals[i][0];
    const disp = rngDisp[i][0];
    const t = parseTimeCellToTodayKST_(raw, disp);
    if (t && t.getTime() <= now.getTime()){ pickRow = i+2; break; }
  }

  if(pickRow<0){
    log_('EXT_PICKROW','no-match-by-time');
    return {updated:false, reason:'no-match-by-time'};
  }
  log_('EXT_PICKROW', `row=${pickRow} now=${now.toISOString()}`);

  // 값 구성
  const E = '미완료';
  const G = 'A';
  const F = buildFileName_(detail);                            // 파일명
  const H = buildHistoryBlock_(detail, ext && toInt_(ext.bb)); // 3줄 요약
  const J = ''; // v1.1: 승자 자막 삭제

  log_('EXT_VALUES', `row=${pickRow} E=${E} F=${F} G=${G} H=${(H||'').slice(0,80)}... J(blank)`);

  // 비연속 컬럼 쓰기(E,F,G,H,J => 5,6,7,8,10)
  sh.getRange(pickRow, 5, 1, 1).setValue(E);
  sh.getRange(pickRow, 6, 1, 1).setValue(F);
  sh.getRange(pickRow, 7, 1, 1).setValue(G);
  sh.getRange(pickRow, 8, 1, 1).setValue(H);
  sh.getRange(pickRow,10, 1, 1).setValue(J);

  log_('EXT_OK', `row=${pickRow}`);
  return {updated:true, row:pickRow};
}

/* ===== VIRTUAL 시트 전송 (v2.5+) ===== */
// Review 모드에서 선택된 핸드를 VIRTUAL 시트 C열 Time 매칭하여 업데이트
function pushToVirtual(hand_id, sheetId, bb){
  if(!hand_id) throw new Error('hand_id required');
  if(!sheetId) throw new Error('sheetId required');

  return withScriptLock_(()=>{
    log_('PUSH_VIRTUAL_BEGIN', `hand_id=${hand_id} sheetId=${sheetId}`);

    const detail = getHandDetail(hand_id); // {head, acts}
    if(!detail || !detail.head) throw new Error(`Hand not found: ${hand_id}`);

    const head = detail.head;
    const isoTime = head.started_at || nowKST_().toISOString();
    const hhmmTime = extractTimeHHMM_(isoTime); // ISO → "HH:MM"

    if(!hhmmTime) throw new Error('Invalid started_at time');

    const ss = SpreadsheetApp.openById(sheetId);
    const sh = ss.getSheetByName('VIRTUAL') || ss.getSheets()[0];

    // C열(Time) 전체 읽기 (헤더 행3 스킵, 데이터는 행4부터)
    const lastRow = sh.getLastRow();
    if(lastRow < 4) throw new Error('VIRTUAL 시트에 데이터 행이 없습니다');

    const cCol = sh.getRange(4, 3, lastRow-3, 1).getValues(); // C열 (4행부터)

    // HH:MM 매칭되는 행 찾기
    let targetRow = -1;
    for(let i=0; i<cCol.length; i++){
      const rawValue = cCol[i][0];
      let cellTime = '';

      // Time 형식 처리: Date 객체면 HH:MM 추출
      if(rawValue instanceof Date){
        // Google Apps Script는 Date 객체를 스크립트 타임존(KST)으로 자동 변환
        cellTime = String(rawValue.getHours()).padStart(2, '0') + ':' +
                   String(rawValue.getMinutes()).padStart(2, '0');
      } else {
        cellTime = String(rawValue).trim();
      }

      if(cellTime === hhmmTime){
        targetRow = i + 4; // 배열 인덱스 → 시트 행 번호 (행4부터 시작)
        log_('VIRTUAL_MATCH', `row=${targetRow} cellTime=${cellTime}`);
        break;
      }
    }

    // 행이 없으면 디버깅 로그 + 에러
    if(targetRow === -1){
      const sample = cCol.slice(0, 10).map((r,i) => {
        const v = r[0];
        const t = v instanceof Date ? `Date(${v.getHours()}:${v.getMinutes()})` : String(v);
        return `row${i+4}:${t}`;
      }).join(', ');
      log_('VIRTUAL_NOMATCH', `hhmmTime=${hhmmTime} sample=[${sample}]`);
      throw new Error(`VIRTUAL 시트에 Time=${hhmmTime} 행이 없습니다. LOG 시트 확인`);
    }

    // F열 멱등성 체크 (이미 입력됐는지)
    const existingF = sh.getRange(targetRow, 6).getValue();
    if(existingF && String(existingF).trim()){
      const F = buildFileName_(detail);
      log_('PUSH_VIRTUAL_SKIP', `Already filled: row=${targetRow} F=${existingF}`);
      return {success:true, hand_id, row:targetRow, fileName:F, time:hhmmTime, idempotent:true};
    }

    // 데이터 생성
    const F = buildFileName_(detail);
    const H = buildHistoryBlock_(detail, toInt_(bb));
    const J = buildSubtitleBlock_(detail, head.table_id, bb); // ⭐ v2.5: 자막 생성

    // E/F/G/H/J 열만 업데이트
    sh.getRange(targetRow, 5).setValue('미완료');  // E열: 상태
    sh.getRange(targetRow, 6).setValue(F);         // F열: 파일명
    sh.getRange(targetRow, 7).setValue('A');       // G열: 등급 (항상 A)
    sh.getRange(targetRow, 8).setValue(H);         // H열: 히스토리
    sh.getRange(targetRow, 10).setValue(J);        // J열: 자막

    log_('PUSH_VIRTUAL_OK', `hand_id=${hand_id} row=${targetRow} time=${hhmmTime}`);

    return {success:true, hand_id, row:targetRow, fileName:F, time:hhmmTime, idempotent:false};
  });
}

/* === ISO 시간 → HH:MM 변환 (v2.5+) === */
// extractTimeHHMM_() → src/common/common.gs로 이동

/* ===== 외부 포맷(승자 의존 없음) ===== */
function payloadHeadFrom_(p){
  const b=p.board||{};
  return {
    hand_id:'', table_id:String(p.table_id||''), btn_seat:String(p.btn_seat||''), hand_no:String(p.hand_no||''),
    start_street:String(p.start_street||''), started_at:String(p.started_at||''), ended_at:String(p.ended_at||''),
    board:{f1:b.f1||'',f2:b.f2||'',f3:b.f3||'',turn:b.turn||'',river:b.river||''},
    pre_pot:Number(p.pre_pot||0), winner_seat:'', pot_final:String(p.pot_final||''),
    stacks_json: JSON.stringify(p.stack_snapshot||{}), holes_json: JSON.stringify(p.holes||{})
  };
}

function buildFileName_(detail){
  const head=detail.head||{};
  const seatsOrder = participantsOrdered_(detail);
  if(seatsOrder.length===2){
    const a = nameShort_(head.table_id, seatsOrder[0]);
    const b = nameShort_(head.table_id, seatsOrder[1]);
    const ac = holes2_(head.holes_json, seatsOrder[0]);
    const bc = holes2_(head.holes_json, seatsOrder[1]);
    const aStr = a + (ac?`_${ac.join('')}`:'');
    const bStr = b + (bc?`_${bc.join('')}`:'');
    return `VT${head.hand_no||'-'}_${aStr}_vs_${bStr}`;
  }
  const first = seatsOrder[0] ? nameShort_(head.table_id, seatsOrder[0]) : 'P1';
  return `VT${head.hand_no||'-'}_${first}_MW`;
}

function buildHistoryBlock_(detail, bb){
  const head=detail.head||{};
  const board = [head.board?.f1, head.board?.f2, head.board?.f3, head.board?.turn, head.board?.river].filter(Boolean);
  const seats = participantsOrdered_(detail);
  const parts = [];
  seats.forEach(s=>{
    const nm = nameShort_(head.table_id, s);
    const hc = holesSym_(head.holes_json, s);
    parts.push(hc ? `${nm}(${hc})` : nm);
  });
  const line1 = parts.join(' vs ');
  const line2 = board.length ? `보드: ${board.map(cardPretty_).join(' ')}` : '보드: -';
  const pot = finalPot_(detail);
  const bbv = toInt_(bb);
  const bbLine = pot>0 && bbv>0 ? `${(Math.round((pot/bbv)*10)/10)}BB (${numComma_(pot)})` : `${numComma_(pot)}`;
  const line3 = `팟: ${bbLine}`;
  return `${line1}\n${line2}\n${line3}`;
}

/* === 자막 생성 (v2.5+) === */
function buildSubtitleBlock_(detail, tableId, bb){
  const head = detail.head || {};
  const stacks = safeParseJson_(head.stacks_json || '{}');
  const seats = participantsOrdered_(detail);
  const roster = readRoster_().roster || {};
  const arr = roster[tableId] || [];

  const lines = [];
  const bbValue = toInt_(bb) || 1;

  seats.forEach(s => {
    // TYPE 시트에서 플레이어 찾기
    const player = arr.find(x => String(x.seat) === String(s));
    if(!player) return; // TYPE 시트에 없으면 스킵

    // ⭐ Keyplayer 필터링 (Y/TRUE만 자막 출력)
    const isKey = String(player.keyplayer || '').trim().toUpperCase();
    if(isKey !== 'Y' && isKey !== 'TRUE') return;

    const name = (player.player || `Seat ${s}`).toUpperCase();
    const nation = player.nation || '';
    const stack = toInt_(stacks[s]) || 0;
    const stackFormatted = numComma_(stack);
    const bbCount = Math.round(stack / bbValue);

    lines.push(`${name} / ${nation}`);
    lines.push(`CURRENT STACK - ${stackFormatted} (${bbCount}BB)`);
    lines.push(''); // 빈 줄
  });

  return lines.join('\n').trim();
}

/* === 이름/명부 === */
function nameShort_(tableId, seat){
  const r = readRoster_().roster || {}; const arr = r[tableId]||[];
  const one = arr.find(x=>String(x.seat)===String(seat));
  if(!one || !one.player) return `S${seat}`;
  const parts = String(one.player).trim().split(/\s+/);
  if(parts.length===1) return parts[0];
  const first=parts[0], last=parts.slice(1).join(' ');
  return `${(first[0]||'').toUpperCase()}.${last}`;
}
function nationOf_(tableId, seat){
  const r = readRoster_().roster || {}; const arr = r[tableId]||[];
  const one = arr.find(x=>String(x.seat)===String(seat));
  return one? (one.nation||'') : '';
}

/* === 참가자 순서: 액션 등장 순 → 좌석번호 보정 === */
function participantsOrdered_(detail){
  const acts=(detail.acts||[]);
  const order=[]; const seen=new Set();
  acts.forEach(a=>{
    const s=String(a.seat||''); if(!s) return;
    if(!seen.has(s)){ seen.add(s); order.push(s); }
  });
  if(order.length===0){
    const holes = safeParseJson_(detail.head?.holes_json||'{}');
    return Object.keys(holes||{});
  }
  return order;
}

/* === 카드 & 포맷 === */
function cardPretty_(c){
  const cc=cardCode_(c); const s=cc.slice(-1), r=cc.slice(0,-1);
  const sym=(s==='s'?'♠':s==='h'?'♥':s==='d'?'♦':'♣'); return r+sym;
}
function cardCode_(cs){
  if(!cs) return '';
  if(typeof cs==='string') return cs.trim();
  if(cs.rank&&cs.suit){
    const map={spade:'s',heart:'h',diamond:'d',club:'c','S':'s','H':'h','D':'d','C':'c'};
    const r=String(cs.rank).toUpperCase().replace('10','T');
    const s=map[String(cs.suit)]||String(cs.suit).toLowerCase();
    return r+s;
  }
  return '';
}
function holes2_(holesJson, seat){
  const h=safeParseJson_(holesJson||'{}'); const arr=h && h[seat];
  if(Array.isArray(arr)&&arr[0]&&arr[1]){ return [cardCode_(arr[0]), cardCode_(arr[1])]; }
  return null;
}
function holesSym_(holesJson, seat){
  const h=holes2_(holesJson, seat); if(!h) return '';
  return `${cardPretty_(h[0])}${cardPretty_(h[1])}`;
}
// numComma_() → src/common/common.gs로 이동
function finalPot_(detail){
  const head=detail.head||{}; const acts=detail.acts||[];
  if(head.pot_final){ return toInt_(head.pot_final); }
  let pot=toInt_(head.pre_pot||0);
  if(acts.length){ const last=acts[acts.length-1]; pot = toInt_(last.pot_after||pot); }
  return pot;
}

/* === JSON safe === */
function safeParseJson_(s){ try{return s?JSON.parse(String(s)):{}}catch(e){ return {}; } }

/* ==== LOG ==== */
function log_(code,msg,tableId){
  try{
    appSS_().getSheetByName(SH.LOG).appendRow([
      new Date(),
      (function(){ try{return Utilities.getStackTrace().split('\n')[1]||'';}catch(e){return ''} })(),
      String(tableId||''), String(code||''), String(msg||''), Session.getActiveUser().getEmail()
    ]);
  }catch(e){ /* ignore */ }
}

function include_(name){ return HtmlService.createHtmlOutputFromFile(name).getContent(); }
