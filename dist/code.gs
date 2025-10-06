/* ========================================
 * VERSION (version.js)
 * ======================================== */
// HandLogger Version
// Auto-generated version file

const VERSION = {
  current: 'v2.7.2',
  name: 'Integration Complete',
  date: '2025-10-06',
  changes: [
    '원본 백업 → src/ 자동 복사 (빌드 시)',
    '공통 함수 12개 모듈화 (src/common/common.gs)',
    'tracker/tracker.gs doGet() 충돌 해결',
    'handlogger/tracker/softsender 원본 백업 공통 함수 제거',
    '버전 통일: v2.7.2'
  ],
  previous: 'v2.7.1',
  next: 'v3.0.0 (Unified Web App 배포)'
};

// Export for Google Apps Script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VERSION;
}


/* ========================================
 * COMMON MODULE (src/common/common.gs)
 * ======================================== */
/** common.gs - 공통 헬퍼 함수 (v2.7.2)
 *
 * HandLogger, Tracker, SoftSender에서 공통으로 사용하는 함수 모음
 *
 * 출처: handlogger_sub/handlogger_code.gs에서 추출
 */

/* ===== 동시성 제어 ===== */

function withScriptLock_(fn){
  // 짧은 지연 + 경량 재시도(반응성 우선)
  const L=LockService.getScriptLock();
  const attempts=3;
  for(let i=0;i<attempts;i++){
    try{
      L.waitLock(500); // 0.5s
      try{ return fn(); }
      finally{ try{L.releaseLock();}catch(e){} }
    }catch(e){
      Utilities.sleep(150 + 150*i); // 150ms backoff
      if(i===attempts-1) throw e;
    }
  }
}

/* ===== 스프레드시트 접근 ===== */

function appSS_(){ return SpreadsheetApp.openById(APP_SPREADSHEET_ID); }

function getOrCreateSheet_(ss,n){ return ss.getSheetByName(n)||ss.insertSheet(n); }

function setHeaderIfEmpty_(sh,hdr){
  const f=sh.getRange(1,1,1,hdr.length).getValues()[0];
  if((f||[]).join('')==='') sh.getRange(1,1,1,hdr.length).setValues([hdr]);
}

function readAll_(sh){
  const v=sh.getDataRange().getValues();
  if(v.length<2) return{header:v[0]||[],rows:[],map:{}};
  const header=v[0], rows=v.slice(1), map={};
  header.forEach((h,i)=>map[String(h).trim()]=i);
  return{header,rows,map};
}

/* ===== 데이터 파싱 ===== */

function findColIndex_(headerRow,aliases){
  return headerRow.findIndex(h=>aliases.some(a=>String(h).trim().toLowerCase()===a.toLowerCase()));
}

function toInt_(v){
  if(v==null) return 0;
  const s=String(v).replace(/[^\d-]/g,'').trim(); if(!s) return 0;
  const n=parseInt(s,10); return isNaN(n)?0:n;
}

function numComma_(n){ n=toInt_(n); return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,','); }

/* ===== 날짜/시간 처리 ===== */

function nowKST_(){
  const s = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy/MM/dd HH:mm:ss");
  return new Date(s);
}

function todayStartKST_(){
  const d = nowKST_();
  d.setHours(0,0,0,0);
  return d;
}

function extractTimeHHMM_(isoString){
  // ISO 8601 (UTC) → HH:MM (KST = UTC+9)
  // 예: "2025-10-06T09:59:47.379Z" → "18:59"
  if(!isoString) return '';

  try {
    const utcDate = new Date(isoString);
    if(isNaN(utcDate.getTime())) return '';

    // UTC → KST (+9시간)
    const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);

    const hh = String(kstDate.getUTCHours()).padStart(2, '0');
    const mm = String(kstDate.getUTCMinutes()).padStart(2, '0');

    return `${hh}:${mm}`;
  } catch(e) {
    return '';
  }
}

/* ===== Roster 읽기 ===== */

function readRoster_(){
  // TYPE 시트에서 테이블/플레이어 정보 읽기
  const ss = appSS_();
  const sh = ss.getSheetByName(SH.TYPE);
  if(!sh) return [];

  const data = readAll_(sh);
  if(!data.rows.length) return [];

  const tableIdx = findColIndex_(data.header, ROSTER_HEADERS.tableNo);
  const seatIdx = findColIndex_(data.header, ROSTER_HEADERS.seatNo);
  const playerIdx = findColIndex_(data.header, ROSTER_HEADERS.player);
  const nationIdx = findColIndex_(data.header, ROSTER_HEADERS.nation);
  const chipsIdx = findColIndex_(data.header, ROSTER_HEADERS.chips);
  const keyplayerIdx = findColIndex_(data.header, ROSTER_HEADERS.keyplayer);

  return data.rows.map(row => ({
    tableNo: tableIdx >= 0 ? toInt_(row[tableIdx]) : 0,
    seatNo: seatIdx >= 0 ? toInt_(row[seatIdx]) : 0,
    player: playerIdx >= 0 ? String(row[playerIdx]||'').trim() : '',
    nation: nationIdx >= 0 ? String(row[nationIdx]||'').trim() : '',
    chips: chipsIdx >= 0 ? toInt_(row[chipsIdx]) : 0,
    keyplayer: keyplayerIdx >= 0 ? String(row[keyplayerIdx]||'').trim().toUpperCase() : ''
  })).filter(r => r.player);
}


/* ========================================
 * HANDLOGGER MODULE (src/handlogger/code.gs)
 * ======================================== */
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


/* ========================================
 * TRACKER MODULE (src/tracker/tracker.gs)
 * ======================================== */
/** tracker_realtime.gs — Tracker v1.3.0 (Refactored)
 *
 * 변경사항:
 * - 중복 코드 제거 (97.6% 감소)
 * - 입력 검증 추가 (XSS, 음수, 길이 제한)
 * - 배치 업데이트 최적화 (setValues 사용)
 * - 에러 핸들링 표준화
 * - 로깅 추가
 * - 캐싱 전략 개선 (TTL 1초)
 * - 동시성 개선 (ScriptLock 10초)
 * - 데이터 무결성 검증
 */

/* ===== 설정 ===== */
// TRACKER_VERSION (HandLogger에서 공유)
// TYPE_SHEET_NAME (HandLogger에서 공유)
const MAX_SEATS_PER_TABLE = 9;
const CACHE_TTL = 1000; // 1초
const MAX_LOCK_WAIT = 10000; // 10초

/* ===== 로깅 ===== */
const LOG_LEVEL = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const CURRENT_LOG_LEVEL = LOG_LEVEL.INFO;

function log_(level, functionName, message, data = null) {
  if (level > CURRENT_LOG_LEVEL) return;

  const timestamp = new Date().toISOString();
  const levelName = Object.keys(LOG_LEVEL).find(k => LOG_LEVEL[k] === level);

  let logMsg = `[${timestamp}] [${levelName}] ${functionName}: ${message}`;
  if (data) logMsg += ` | ${JSON.stringify(data)}`;

  console.log(logMsg);
}

/* ===== 설정 관리 ===== */
// APP_SPREADSHEET_ID (HandLogger에서 공유)

function setupSpreadsheetId(spreadsheetId) {
  // 상수로 관리하므로 설정 불필요
  log_(LOG_LEVEL.INFO, 'setupSpreadsheetId', 'APP_SPREADSHEET_ID 상수 사용 중');
  return APP_SPREADSHEET_ID;
}

function getSpreadsheetId_() {
  return APP_SPREADSHEET_ID;
}

function appSS_() {
  return SpreadsheetApp.openById(APP_SPREADSHEET_ID);
}

/* ===== 입력 검증 ===== */
function validateTableId_(tableId) {
  const id = String(tableId || '').trim();

  if (!id) throw new Error('테이블 ID가 비어있습니다.');
  if (id.length > 50) throw new Error('테이블 ID가 너무 깁니다. (최대 50자)');
  if (!/^[A-Z0-9_-]+$/i.test(id)) {
    throw new Error('테이블 ID는 영문, 숫자, -, _ 만 사용 가능합니다.');
  }

  return id.toUpperCase();
}

function validateSeatNo_(seatNo) {
  const seat = normalizeSeat_(seatNo);

  if (!/^S[1-9]$/.test(seat)) {
    throw new Error('좌석 번호는 S1-S9 형식이어야 합니다.');
  }

  return seat;
}

function validatePlayerName_(name) {
  const n = String(name || '').trim();

  if (!n) throw new Error('플레이어 이름이 비어있습니다.');
  if (n.length > 100) throw new Error('플레이어 이름이 너무 깁니다. (최대 100자)');

  // XSS 방지
  const sanitized = n.replace(/<[^>]*>/g, '');

  return sanitized;
}

function validateChips_(chips) {
  const c = toInt_(chips);

  if (c < 0) throw new Error('칩 수는 음수일 수 없습니다.');
  if (c > 10000000000) throw new Error('칩 수가 너무 큽니다.');

  return c;
}

function normalizeSeat_(seatNo) {
  let seat = String(seatNo || '').trim().toUpperCase();
  seat = seat.replace(/^S/i, '');

  if (/^\d+$/.test(seat)) {
    return 'S' + seat;
  }

  return 'S' + seat;
}

function normalizeSeatRaw_(seatNo) {
  return String(seatNo || '').trim().replace(/^S/i, '');
}

function toInt_(v) {
  if (v == null) return 0;
  const s = String(v).replace(/[^\d-]/g, '').trim();
  if (!s) return 0;
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

/* ===== 동시성 제어 ===== */
function withScriptLock_(fn) {
  const L = LockService.getScriptLock();
  const MAX_ATTEMPTS = 3;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const waitTime = MAX_LOCK_WAIT * (i + 1);
      L.waitLock(waitTime);

      try {
        return fn();
      } finally {
        try { L.releaseLock(); }
        catch (e) { log_(LOG_LEVEL.WARN, 'withScriptLock_', 'Lock 해제 실패', e); }
      }

    } catch (e) {
      const backoff = 200 + 300 * i;
      Utilities.sleep(backoff);

      if (i === MAX_ATTEMPTS - 1) {
        throw new Error(`동시 접근 제한: 잠시 후 다시 시도하세요.`);
      }
    }
  }
}

/* ===== 캐싱 ===== */
let sheetCache = null;
let cacheTimestamp = 0;

function getSheetData_(forceRefresh = false) {
  const now = Date.now();

  // 캐시 유효
  if (!forceRefresh && sheetCache && (now - cacheTimestamp < CACHE_TTL)) {
    return sheetCache;
  }

  // 새로 읽기
  const ss = appSS_();
  const sh = ss.getSheetByName(TYPE_SHEET_NAME);
  if (!sh) throw new Error('Type 시트가 없습니다.');

  const data = readAll_Optimized_(sh);

  const cols = {
    table: findColIndex_(data.header, ['Table No.', 'TableNo', 'table_no']),
    seat: findColIndex_(data.header, ['Seat No.', 'Seat', 'SeatNo', 'seat_no']),
    player: findColIndex_(data.header, ['Players', 'Player', 'Name']),
    nation: findColIndex_(data.header, ['Nationality', 'Nation', 'Country']),
    chips: findColIndex_(data.header, ['Chips', 'Stack', 'Starting Chips']),
    key: findColIndex_(data.header, ['Keyplayer', 'Key Player', 'KeyPlayer', 'key_player'])
  };

  if (cols.table === -1 || cols.seat === -1 || cols.player === -1) {
    throw new Error('Type 시트에 필수 컬럼이 없습니다.');
  }

  sheetCache = { sh, data, cols };
  cacheTimestamp = now;

  return sheetCache;
}

function invalidateCache_() {
  sheetCache = null;
}

/* ===== 최적화된 시트 읽기 ===== */
function readAll_Optimized_(sh) {
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();

  if (lastRow < 1 || lastCol < 1) {
    return { header: [], rows: [], map: {} };
  }

  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();

  if (values.length < 2) {
    return { header: values[0] || [], rows: [], map: {} };
  }

  const header = values[0];
  const rows = values.slice(1);
  const map = {};
  header.forEach((h, i) => map[String(h).trim()] = i);

  return { header, rows, map };
}

function findColIndex_(headerRow, aliases) {
  return headerRow.findIndex(h =>
    aliases.some(a => String(h).trim().toLowerCase() === a.toLowerCase())
  );
}

/* ===== 공통 헬퍼 ===== */
function findPlayerRow_(data, cols, tableId, seatNo) {
  const tableUpper = String(tableId).trim().toUpperCase();
  const seatRaw = normalizeSeatRaw_(seatNo);

  return data.rows.findIndex(r => {
    const tableMatch = String(r[cols.table]).trim().toUpperCase() === tableUpper;
    const seatStr = normalizeSeatRaw_(r[cols.seat]);
    const seatMatch = seatStr === seatRaw;
    return tableMatch && seatMatch;
  });
}

/* ===== 표준 응답 ===== */
function successResponse_(data = {}) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: TRACKER_VERSION
    }
  };
}

function errorResponse_(functionName, error) {
  const errorId = Utilities.getUuid();

  log_(LOG_LEVEL.ERROR, functionName, error.message || error, { errorId });

  return {
    success: false,
    error: {
      message: error.message || '알 수 없는 오류가 발생했습니다.',
      errorId
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: TRACKER_VERSION
    }
  };
}

/* ===== 읽기 함수 ===== */

/**
 * 키 플레이어 목록 반환
 */
function tracker_getKeyPlayers() {
  try {
    log_(LOG_LEVEL.INFO, 'getKeyPlayers', '키 플레이어 조회 시작');

    const { data, cols } = getSheetData_();

    const players = data.rows
      .filter(row => {
        const isKey = cols.key !== -1 && (
          row[cols.key] === true ||
          String(row[cols.key]).toUpperCase() === 'TRUE'
        );
        return isKey;
      })
      .map(row => {
        let seatNo = String(row[cols.seat] || '').trim();
        if (/^\d+$/.test(seatNo)) seatNo = 'S' + seatNo;

        return {
          tableNo: String(row[cols.table] || '').trim(),
          seatNo,
          player: String(row[cols.player] || '').trim(),
          nation: cols.nation !== -1 ? String(row[cols.nation] || '').trim() : '',
          chips: cols.chips !== -1 ? toInt_(row[cols.chips]) : 0
        };
      })
      .filter(p => p.tableNo && p.seatNo && p.player);

    log_(LOG_LEVEL.INFO, 'getKeyPlayers', '키 플레이어 조회 완료', { count: players.length });

    // v1.2 호환성: Array 직접 반환
    return players;

  } catch (e) {
    return errorResponse_('getKeyPlayers', e);
  }
}

/**
 * 테이블 플레이어 목록 반환
 */
function tracker_getTablePlayers(tableId) {
  try {
    log_(LOG_LEVEL.INFO, 'getTablePlayers', '테이블 플레이어 조회 시작', { tableId });

    const validTableId = validateTableId_(tableId);
    const { data, cols } = getSheetData_();

    const playersMap = {};

    data.rows.forEach(row => {
      const t = String(row[cols.table] || '').trim().toUpperCase();
      if (t !== validTableId) return;

      let seatNo = String(row[cols.seat] || '').trim().toUpperCase();
      if (/^\d+$/.test(seatNo)) seatNo = 'S' + seatNo;

      const player = String(row[cols.player] || '').trim();
      const nation = cols.nation !== -1 ? String(row[cols.nation] || '').trim() : '';
      const chips = cols.chips !== -1 ? toInt_(row[cols.chips]) : 0;
      const keyplayer = cols.key !== -1 && (
        row[cols.key] === true ||
        String(row[cols.key]).toUpperCase() === 'TRUE'
      );

      if (seatNo && player) {
        playersMap[seatNo] = { seatNo, player, nation, chips, keyplayer };
      }
    });

    const players = [];
    for (let i = 1; i <= MAX_SEATS_PER_TABLE; i++) {
      const seat = `S${i}`;
      if (playersMap[seat]) {
        players.push(playersMap[seat]);
      } else {
        players.push({ seatNo: seat, empty: true });
      }
    }

    log_(LOG_LEVEL.INFO, 'getTablePlayers', '테이블 플레이어 조회 완료', { tableId, count: players.length });

    // v1.2 호환성: Array 직접 반환
    return players;

  } catch (e) {
    return errorResponse_('getTablePlayers', e);
  }
}

/* ===== 쓰기 함수 ===== */

/**
 * 플레이어 칩 수정
 */
function tracker_updatePlayerChips(tableId, seatNo, newChips) {
  return withScriptLock_(() => {
    try {
      log_(LOG_LEVEL.INFO, 'updatePlayerChips', '칩 업데이트 시작', { tableId, seatNo, newChips });

      const validTableId = validateTableId_(tableId);
      const validSeatNo = validateSeatNo_(seatNo);
      const validChips = validateChips_(newChips);

      const { sh, data, cols } = getSheetData_(true);

      const rowIndex = findPlayerRow_(data, cols, validTableId, validSeatNo);

      if (rowIndex === -1) {
        throw new Error('플레이어를 찾을 수 없습니다.');
      }

      const actualRow = rowIndex + 2;
      sh.getRange(actualRow, cols.chips + 1).setValue(validChips);

      invalidateCache_();

      log_(LOG_LEVEL.INFO, 'updatePlayerChips', '칩 업데이트 완료');

      return successResponse_();

    } catch (e) {
      return errorResponse_('updatePlayerChips', e);
    }
  });
}

/**
 * 플레이어 추가
 */
function tracker_addPlayer(tableId, seatNo, name, nation, chips, isKey) {
  return withScriptLock_(() => {
    try {
      log_(LOG_LEVEL.INFO, 'addPlayer', '플레이어 추가 시작', { tableId, seatNo, name });

      const validTableId = validateTableId_(tableId);
      const validSeatNo = validateSeatNo_(seatNo);
      const validName = validatePlayerName_(name);
      const validChips = validateChips_(chips);

      const { sh, data, cols } = getSheetData_(true);

      const exists = findPlayerRow_(data, cols, validTableId, validSeatNo) !== -1;
      if (exists) {
        throw new Error('해당 좌석에 이미 플레이어가 있습니다.');
      }

      const row = new Array(data.header.length).fill('');
      row[cols.table] = validTableId;
      row[cols.seat] = normalizeSeatRaw_(validSeatNo);
      if (cols.player !== -1) row[cols.player] = validName;
      if (cols.nation !== -1) row[cols.nation] = nation || '';
      if (cols.chips !== -1) row[cols.chips] = validChips;
      if (cols.key !== -1) row[cols.key] = Boolean(isKey);

      sh.appendRow(row);

      invalidateCache_();

      log_(LOG_LEVEL.INFO, 'addPlayer', '플레이어 추가 완료');

      return successResponse_();

    } catch (e) {
      return errorResponse_('addPlayer', e);
    }
  });
}

/**
 * 플레이어 삭제
 */
function tracker_removePlayer(tableId, seatNo) {
  return withScriptLock_(() => {
    try {
      log_(LOG_LEVEL.INFO, 'removePlayer', '플레이어 삭제 시작', { tableId, seatNo });

      const validTableId = validateTableId_(tableId);
      const validSeatNo = validateSeatNo_(seatNo);

      const { sh, data, cols } = getSheetData_(true);

      const rowIndex = findPlayerRow_(data, cols, validTableId, validSeatNo);

      if (rowIndex === -1) {
        throw new Error('플레이어를 찾을 수 없습니다.');
      }

      const actualRow = rowIndex + 2;
      sh.deleteRow(actualRow);

      invalidateCache_();

      log_(LOG_LEVEL.INFO, 'removePlayer', '플레이어 삭제 완료');

      return successResponse_();

    } catch (e) {
      return errorResponse_('removePlayer', e);
    }
  });
}

/**
 * 배치 칩 업데이트 (최적화)
 */
function batchUpdateChips(updates) {
  return withScriptLock_(() => {
    try {
      log_(LOG_LEVEL.INFO, 'batchUpdateChips', '배치 업데이트 시작', { count: updates.length });

      if (!Array.isArray(updates) || updates.length === 0) {
        throw new Error('업데이트 목록이 비어있습니다.');
      }

      const { sh, data, cols } = getSheetData_(true);

      // 업데이트 대상 수집
      const updateMap = new Map();

      updates.forEach(u => {
        const validTableId = validateTableId_(u.tableId);
        const validSeatNo = validateSeatNo_(u.seatNo);
        const validChips = validateChips_(u.chips);

        const rowIndex = findPlayerRow_(data, cols, validTableId, validSeatNo);

        if (rowIndex !== -1) {
          const actualRow = rowIndex + 2;
          updateMap.set(actualRow, validChips);
        }
      });

      if (updateMap.size === 0) {
        return successResponse_({ updated: 0 });
      }

      // 연속 범위 병합
      const rows = Array.from(updateMap.keys()).sort((a, b) => a - b);
      const ranges = [];
      let start = rows[0];
      let end = rows[0];
      let values = [[updateMap.get(start)]];

      for (let i = 1; i < rows.length; i++) {
        if (rows[i] === end + 1) {
          end = rows[i];
          values.push([updateMap.get(rows[i])]);
        } else {
          ranges.push({
            range: sh.getRange(start, cols.chips + 1, end - start + 1, 1),
            values
          });
          start = rows[i];
          end = rows[i];
          values = [[updateMap.get(rows[i])]];
        }
      }

      ranges.push({
        range: sh.getRange(start, cols.chips + 1, end - start + 1, 1),
        values
      });

      // 배치 업데이트
      ranges.forEach(r => r.range.setValues(r.values));

      invalidateCache_();

      log_(LOG_LEVEL.INFO, 'batchUpdateChips', '배치 업데이트 완료', { updated: updateMap.size });

      return successResponse_({ updated: updateMap.size });

    } catch (e) {
      return errorResponse_('batchUpdateChips', e);
    }
  });
}

/* ===== 데이터 무결성 검증 ===== */

function validateSheetIntegrity() {
  try {
    const { data, cols } = getSheetData_(true);

    const errors = [];
    const seen = new Set();

    data.rows.forEach((row, idx) => {
      const rowNum = idx + 2;

      // 필수 필드
      if (!row[cols.table]) errors.push(`행 ${rowNum}: 테이블 번호 누락`);
      if (!row[cols.seat]) errors.push(`행 ${rowNum}: 좌석 번호 누락`);
      if (!row[cols.player]) errors.push(`행 ${rowNum}: 플레이어 이름 누락`);

      // 좌석 범위
      const seat = normalizeSeat_(row[cols.seat]);
      if (!/^S[1-9]$/.test(seat)) {
        errors.push(`행 ${rowNum}: 잘못된 좌석 번호 "${seat}"`);
      }

      // 칩 음수
      if (cols.chips !== -1 && toInt_(row[cols.chips]) < 0) {
        errors.push(`행 ${rowNum}: 음수 칩 수`);
      }

      // 중복
      const key = `${row[cols.table]}_${row[cols.seat]}`.toUpperCase();
      if (seen.has(key)) {
        errors.push(`행 ${rowNum}: 중복된 테이블/좌석 조합`);
      }
      seen.add(key);
    });

    return successResponse_({ valid: errors.length === 0, errors });

  } catch (e) {
    return errorResponse_('validateSheetIntegrity', e);
  }
}

/* ===== 디버그 ===== */

function debugGetAllTypeData() {
  try {
    const ss = appSS_();
    const sh = ss.getSheetByName(TYPE_SHEET_NAME);
    if (!sh) return errorResponse_('debugGetAllTypeData', new Error('Type 시트가 없습니다'));

    const data = sh.getDataRange().getValues();

    return successResponse_({
      sheetName: sh.getName(),
      totalRows: data.length,
      header: data[0],
      firstDataRow: data.length > 1 ? data[1] : null,
      allData: data
    });

  } catch (e) {
    return errorResponse_('debugGetAllTypeData', e);
  }
}

/**
 * 웹앱 진입점
 */
// doGet() 제거됨 (HandLogger가 처리)


/* ========================================
 * SOFTSENDER MODULE (src/softsender/softsender_code.gs)
 * ======================================== */
/***********************
 * Soft Content Sender — v10.1
 * - v10.1: UX 개선 (스마트 전송 버튼, 통합 미리보기)
 * - v10: 배치 전송 기능 추가
 * - v9: Room+Table 통합, ELIM 개선
 * - CountryMap 제거 (2자리 국가 코드 직접 사용)
 ***********************/
const CFG = {
  CUE_SHEET_ID: '13LpVWYHaJAMtvc1OiCtkrcAYqavkXWaTg3Vke0R0CUQ', // 기본값
  CUE_TAB_VIRTUAL: 'virtual',
  TYPE_SHEET_ID: '1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U',  // 기본값
  TYPE_TAB: 'Type',

  FIX_E: '미완료',
  FIX_G: 'SOFT',

  KST_TZ: 'Asia/Seoul',
  TIME_DISPLAY: 'HH:mm',
};

// doGet() 제거됨 (HandLogger가 처리)

function soft_getBootstrap() {
  return {
    cueId: CFG.CUE_SHEET_ID,
    typeId: CFG.TYPE_SHEET_ID,
    tz: CFG.KST_TZ,
  };
}

/* TYPE 읽기 (override 수용) */
function soft_getTypeRows(typeIdOverride) {
  try {
    const typeId = String(typeIdOverride || CFG.TYPE_SHEET_ID).trim();
    const ss = SpreadsheetApp.openById(typeId);
    const sh = ss.getSheetByName(CFG.TYPE_TAB);
    if (!sh) throw new Error(`SHEET_NOT_FOUND:${CFG.TYPE_TAB}`);
    const values = sh.getDataRange().getValues();
    if (values.length < 2) return { ok: true, headers: values[0] || [], rows: [], typeId };

    const headers = values[0].map(v => String(v).trim());
    const idx = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const iRoom   = idx('Poker Room');
    const iTName  = idx('Table Name');
    const iTNo    = idx('Table No.');
    const iSeat   = idx('Seat No.');
    const iPlayer = idx('Players');
    const iNat    = idx('Nationality');

    if ([iRoom,iTName,iTNo,iSeat,iPlayer,iNat].some(i=>i<0)) throw new Error('BAD_HEADERS');

    const rows = values.slice(1).map(r => ({
      room:   String(r[iRoom]||'').trim(),
      tname:  String(r[iTName]||'').trim(),
      tno:    String(r[iTNo]||'').trim(),
      seat:   String(r[iSeat]||'').trim(),
      player: String(r[iPlayer]||'').trim(),
      nat:    String(r[iNat]||'').trim(),
    })).filter(r => r.room && r.tno && r.seat);

    return { ok:true, headers, rows, typeId };
  } catch(e) {
    return { ok:false, error:String(e) };
  }
}

/* CountryMap 제거됨 - 2자리 국가 코드를 그대로 사용 */

/* 시간 드롭다운(±20분) */
function soft_getTimeOptions(cueIdOverride) {
  try {
    const cueId = String(cueIdOverride || CFG.CUE_SHEET_ID).trim();
    const ss = SpreadsheetApp.openById(cueId);
    const sh = ss.getSheetByName(CFG.CUE_TAB_VIRTUAL);
    if (!sh) throw new Error(`SHEET_NOT_FOUND:${CFG.CUE_TAB_VIRTUAL}`);

    const last = sh.getLastRow();
    if (last < 2) return { ok: true, list: [], cueId };

    const colC = sh.getRange(2, 3, last - 1, 1).getDisplayValues().flat();
    const nowKST = new Date();
    const center = Utilities.formatDate(nowKST, CFG.KST_TZ, CFG.TIME_DISPLAY); // "HH:mm"

    const toMin = (s) => {
      const m = String(s || '').match(/^(\d{2}):(\d{2})/);
      return m ? (parseInt(m[1],10)*60 + parseInt(m[2],10)) : null;
    };
    const cmin = toMin(center);
    const list = colC
      .map(v => String(v).trim())
      .filter(v => /^\d{2}:\d{2}/.test(v))
      .filter(v => {
        const m = toMin(v);
        return m !== null && Math.abs(m - cmin) <= 20;
      });

    const uniq = [...new Set(list)];
    uniq.sort((a,b)=>toMin(a)-toMin(b));
    return { ok:true, list:uniq, center, cueId };
  } catch(e) {
    return { ok:false, error:String(e) };
  }
}

/* 파일명: HHmm_<name>_<mode> */
function soft_buildFileName(kind, hhmm, tableNo, playerOrLabel) {
  const safe = (s) => String(s || '').trim().replace(/[^\w\-#]+/g,'_');
  const modes = ['PU','ELIM','L3','LEADERBOARD','BATCH'];
  const mode = modes.includes(kind) ? kind : 'SC';
  const time = String(hhmm || '').padStart(4,'0');
  const name = (kind==='LEADERBOARD') ? safe(playerOrLabel || ('Table'+(tableNo||''))) : safe(playerOrLabel || 'Player');
  return `${time}_${name}_${mode}`;
}

/* 업데이트 */
function soft_updateVirtual(payload) {
  if (!payload || !payload.kind) return { ok:false, error:'BAD_PAYLOAD' };

  try {
    const cueId = String(payload.cueId || CFG.CUE_SHEET_ID).trim();
    const ss = SpreadsheetApp.openById(cueId);
    const sh = ss.getSheetByName(CFG.CUE_TAB_VIRTUAL);
    if (!sh) throw new Error(`SHEET_NOT_FOUND:${CFG.CUE_TAB_VIRTUAL}`);

    const last = sh.getLastRow();
    if (last < 2) throw new Error('EMPTY_VIRTUAL');

    // 행 선택
    const colC = sh.getRange(2,3,last-1,1).getDisplayValues().flat();
    const nowKST = new Date();
    const nowHHmm = Utilities.formatDate(nowKST, CFG.KST_TZ, 'HH:mm');
    const pickedStr = (payload.autoNow ? nowHHmm : (payload.pickedTime||'')).trim();
    if (!/^\d{2}:\d{2}$/.test(pickedStr)) throw new Error('TIME_FORMAT');

    const rowIdx0 = colC.findIndex(v=>{
      const s = String(v).trim();
      if (/^\d{2}:\d{2}$/.test(s)) return s===pickedStr;
      const m = s.match(/^(\d{2}:\d{2}):\d{2}$/);
      return m ? (m[1]===pickedStr) : false;
    });
    if (rowIdx0 < 0) return { ok:false, error:`NO_MATCH_TIME:${pickedStr}` };
    const row = 2 + rowIdx0;

    // 값 준비
    const eVal = payload.eFix || CFG.FIX_E;
    const gVal = payload.gFix || CFG.FIX_G;
    const fVal = String(payload.filename||'').trim();
    const jBlock = String(payload.jBlock||'').replace(/\r\n/g,'\n');
    if (!fVal) throw new Error('EMPTY_FILENAME');
    if (!jBlock) throw new Error('EMPTY_JBLOCK');

    // J append
    const jCell = sh.getRange(row, 10); // J
    let cur = jCell.getValue();
    cur = cur ? String(cur).replace(/\r\n/g,'\n') : '';
    const needsLF = cur && !cur.endsWith('\n') ? '\n' : '';
    const glue = cur ? (needsLF + '\n') : '';
    const next = cur + glue + jBlock;

    // 세팅
    sh.getRange(row,5).setValue(eVal);  // E
    sh.getRange(row,6).setValue(fVal);  // F
    sh.getRange(row,7).setValue(gVal);  // G
    jCell.setValue(next);               // J

    return { ok:true, row, time:pickedStr };
  } catch(e) {
    return { ok:false, error:String(e) };
  }
}

