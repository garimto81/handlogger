/** Code.gs — Poker Hand Logger — v1.1.1 (2025-10-02)
 * 패치 내용(v1.1.1):
 * - VIRTUAL 시트 C열(Date/Time) 혼합 데이터(Date/숫자/문자열) 파싱 지원
 * - getValues + getDisplayValues 동시 사용, HH:mm(:ss)로 정규화하여 "오늘 KST" 시각으로 비교
 * - rowTime <= nowKST 인 가장 아래쪽(가장 최근) 행을 선택
 * - 그 외 저장/리뷰/쓰기 로직은 v1.1과 동일
 *
 * v1.1에서의 주요 변경(요약):
 * - 승자 판정 제거, J열 공란, 로그 강화, 락 재시도, 외부쓰기 최적화
 */

const APP_SPREADSHEET_ID = '19e7eDjoZRFZooghZJF3XmOZzZcgmqsp9mFAfjvJWhj4'; // HANDS/ACTIONS/CONFIG/LOG 저장소
const ROSTER_SPREADSHEET_ID = '1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U'; // 테이블/플레이어 명부
const ROSTER_SHEET_NAME = 'Type';
const SH = { HANDS:'HANDS', ACTS:'ACTIONS', CONFIG:'CONFIG', LOG:'LOG' };

const ROSTER_HEADERS = {
  tableNo:['Table No.','TableNo','Table_Number','table_no'],
  seatNo:['Seat No.','Seat','SeatNo','seat_no'],
  player:['Players','Player','Name'],
  nation:['Nationality','Nation','Country'],
  chips:['Chips','Stack','Starting Chips','StartStack'],
};

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

function appSS_(){ return SpreadsheetApp.openById(APP_SPREADSHEET_ID); }
function rosterSS_(){ return SpreadsheetApp.openById(ROSTER_SPREADSHEET_ID); }
function getOrCreateSheet_(ss,n){ return ss.getSheetByName(n)||ss.insertSheet(n); }
function setHeaderIfEmpty_(sh,hdr){
  const f=sh.getRange(1,1,1,hdr.length).getValues()[0];
  const isEmpty = (f||[]).join('').trim() === '';
  if(isEmpty) sh.getRange(1,1,1,hdr.length).setValues([hdr]);
}
function readAll_(sh){
  const v=sh.getDataRange().getValues();
  if(v.length<2) return{header:v[0]||[],rows:[],map:{}};
  const header=v[0], rows=v.slice(1), map={};
  header.forEach((h,i)=>map[String(h).trim()]=i);
  return{header,rows,map};
}
function findColIndex_(headerRow,aliases){
  return headerRow.findIndex(h=>aliases.some(a=>String(h).trim().toLowerCase()===a.toLowerCase()));
}
function toInt_(v){
  if(v==null) return 0;
  const s=String(v).replace(/[^\d-]/g,'').trim(); if(!s) return 0;
  const n=parseInt(s,10); return isNaN(n)?0:n;
}
function nowKST_(){
  const s = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy/MM/dd HH:mm:ss");
  return new Date(s);
}
function todayStartKST_(){
  const d = nowKST_();
  d.setHours(0,0,0,0);
  return d;
}
function ensureSheets_(){
  // v2.0.1: ROSTER_SPREADSHEET에 Hand 시트 생성 (헤더 없음, CSV 행 타입별 저장)
  const rosterSS = rosterSS_();
  getOrCreateSheet_(rosterSS, 'Hand'); // 헤더 없음

  // v1.x 하위 호환: APP_SPREADSHEET 시트 유지 (Phase 6에서 제거 예정)
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
}

function doGet(){
  ensureSheets_();
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('Poker Hand Logger — v1.1.1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ==== ROSTER ==== */
function readRoster_(){
  const ss=rosterSS_();
  const sh=ss.getSheetByName(ROSTER_SHEET_NAME)||ss.getSheets()[0];
  const {header,rows}=readAll_(sh);
  const idx={
    tableNo:findColIndex_(header,ROSTER_HEADERS.tableNo),
    seatNo:findColIndex_(header,ROSTER_HEADERS.seatNo),
    player:findColIndex_(header,ROSTER_HEADERS.player),
    nation:findColIndex_(header,ROSTER_HEADERS.nation),
    chips:findColIndex_(header,ROSTER_HEADERS.chips),
  };
  const roster={}, tables=new Set();
  rows.forEach(r=>{
    const t=idx.tableNo>=0?String(r[idx.tableNo]).trim():'';
    if(!t) return;
    const seat=idx.seatNo>=0?toInt_(r[idx.seatNo]):0; if(seat<=0) return;
    const name=idx.player>=0?String(r[idx.player]).trim():'';
    const nation=idx.nation>=0?String(r[idx.nation]).trim():'';
    const chips=idx.chips>=0?toInt_(r[idx.chips]):0;
    tables.add(t);
    (roster[t]=roster[t]||[]).push({seat,player:name,nation,chips});
  });
  Object.keys(roster).forEach(t=>roster[t].sort((a,b)=>a.seat-b.seat));
  return { tables:[...tables].sort((a,b)=>toInt_(a)-toInt_(b)), roster };
}

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

/* ==== SAVE (v2.0.1: Hand 시트 저장) ==== */
function saveHand(payload){
  ensureSheets_();
  if(!payload) throw new Error('empty payload');
  return withScriptLock_(()=>_saveHandToHandSheet_(payload));
}

/* ==== SAVE + 외부 시트 갱신(v2.0.1: Hand 기반) ==== */
function saveHandWithExternal(payload, ext){
  ensureSheets_();
  if(!payload) throw new Error('empty payload');
  return withScriptLock_(()=>{
    log_('SAVE_EXT_BEGIN', `table=${payload.table_id||''} started_at=${payload.started_at||''}`, payload.table_id);
    const saved = _saveHandToHandSheet_(payload); // {ok, hand_id, hand_no, idempotent}
    log_('SAVE_OK', `hand_id=${saved.hand_id} hand_no=${saved.hand_no} idempotent=${!!saved.idempotent}`, payload.table_id);

    let extRes = {updated:false, reason:'no-ext'};
    try{
      if(ext && ext.sheetId){
        const detail = getHandDetailFromHandSheet_(saved.hand_id); // {head, acts}
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
    'v1.1.1'
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
function numComma_(n){ n=toInt_(n); return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,','); }
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

/* ===== v2.0.1: CSV 파싱 함수 (Hand 시트 변환) ===== */

/**
 * CSV 핸드 블록을 Hand 시트 1개 행으로 변환
 * @param {Array<Array>} block - GAME/PAYOUTS/HAND/PLAYER/EVENT 행들
 * @return {Array} - 19개 컬럼 배열
 */
function convertBlockToHandRow_(block) {
  const gameRow = block.find(r => r[1] === 'GAME');
  const handRow = block.find(r => r[1] === 'HAND');
  const playerRows = block.filter(r => r[1] === 'PLAYER');
  const eventRows = block.filter(r => r[1] === 'EVENT');

  const hand = parseHandRow_(handRow);
  const players = parsePlayerRows_(playerRows);
  const { events, board_json } = parseEventRows_(eventRows);

  const hand_id = generateHandId_(hand.timestamp);
  const game_name = gameRow ? String(gameRow[2] || '') : '';

  // initial_pot 계산 (POT_CORRECTION 합계)
  const initial_pot = events
    .filter(e => e.event_type === 'POT_CORRECTION')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // contributed_pot 계산 (플레이어 베팅 합계)
  const contributed_pot = events
    .filter(e => ['BET', 'RAISE', 'CALL', 'ALL-IN'].includes(e.event_type))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // final_pot 계산
  const final_pot = initial_pot + contributed_pot;

  return [
    hand_id,                      // 1
    hand.hand_no,                 // 2
    hand.timestamp,               // 3
    hand.table_id,                // 4
    hand.game_type,               // 5
    hand.stakes_type,             // 6
    hand.bb,                      // 7
    hand.sb,                      // 8
    hand.bb_ante,                 // 9
    hand.btn_seat,                // 10
    hand.sb_seat,                 // 11
    hand.bb_seat,                 // 12
    JSON.stringify(board_json),   // 13
    JSON.stringify(players),      // 14
    JSON.stringify(events),       // 15
    final_pot,                    // 16
    game_name,                    // 17
    initial_pot,                  // 18
    contributed_pot               // 19
  ];
}

/**
 * HAND 행 파싱 (stakes_type 조건부)
 */
function parseHandRow_(row) {
  if (!row) throw new Error('HAND row missing');

  const stakes_type = String(row[4] || '').trim();
  const isBBAnte = (stakes_type === 'BB_ANTE');

  return {
    hand_no: toInt_(row[3]),
    stakes_type: stakes_type,
    game_type: String(row[5] || '').trim(),
    bb: isBBAnte ? toInt_(row[6]) : toInt_(row[9]),
    sb: isBBAnte ? toInt_(row[8]) : toInt_(row[8]),
    bb_ante: isBBAnte ? toInt_(row[9]) : toInt_(row[10]),
    btn_seat: toInt_(row[10]),
    sb_seat: toInt_(row[11]),
    bb_seat: toInt_(row[12]),
    timestamp: Date.parse(row[13]) || Date.now(),
    table_id: String(row[14] || '').trim()
  };
}

/**
 * PLAYER 행들 파싱 (v2.0.1: hole_cards 배열)
 */
function parsePlayerRows_(rows) {
  return rows.map(r => {
    const holeCardsRaw = String(r[7] || '').trim();
    const holeCards = holeCardsRaw
      ? holeCardsRaw.split(/\s+/)
      : null;

    return {
      seat: toInt_(r[3]),
      name: String(r[2] || '').trim(),
      start_stack: toInt_(r[5]),
      end_stack: toInt_(r[6]),
      hole_cards: holeCards,
      position: r[8] ? String(r[8]).trim() : null,
      is_hero: String(r[9]).toUpperCase() === 'TRUE',
      marker: r[10] ? String(r[10]).trim() : null
    };
  });
}

/**
 * EVENT 행들 파싱 (v2.0.1: RAISE_TO 처리, BOARD 중복 제거)
 */
function parseEventRows_(rows) {
  const events = [];
  const boardCards = [];
  const seenCards = new Set();
  let seq = 1;
  let lastBetAmount = 0;

  rows.forEach(r => {
    const typeRaw = String(r[2] || '').trim();
    let eventType = typeRaw;
    let isRaiseTo = false;

    // "RAISE TO" → "RAISE"
    if (typeRaw === 'RAISE TO') {
      eventType = 'RAISE';
      isRaiseTo = true;
    }

    // BOARD 처리
    if (eventType === 'BOARD') {
      const card = String(r[4] || '').trim();
      if (!card || seenCards.has(card)) return;
      seenCards.add(card);
      boardCards.push(card);
      events.push({
        seq: seq++,
        event_type: 'BOARD',
        card: card,
        ts: toInt_(r[5])
      });
      lastBetAmount = 0; // 새 스트릿
    }
    // 베팅 액션
    else if (['BET', 'RAISE', 'CALL', 'ALL-IN'].includes(eventType)) {
      const totalBet = toInt_(r[4]) || 0;
      let actualAmount = totalBet;

      const event = {
        seq: seq++,
        event_type: eventType,
        seat: toInt_(r[3]),
        amount: actualAmount,
        ts: toInt_(r[5])
      };

      // RAISE TO 처리
      if (isRaiseTo && lastBetAmount > 0) {
        actualAmount = totalBet - lastBetAmount;
        event.amount = actualAmount;
        event.total_bet = totalBet;
        event.raise_type = 'TO';
      }

      events.push(event);
      if (['BET', 'RAISE'].includes(eventType)) {
        lastBetAmount = totalBet;
      }
    }
    // 기타 액션
    else if (['CHECK', 'FOLD'].includes(eventType)) {
      events.push({
        seq: seq++,
        event_type: eventType,
        seat: toInt_(r[3]),
        ts: toInt_(r[5])
      });
    }
    // POT_CORRECTION
    else if (eventType === 'POT_CORRECTION') {
      events.push({
        seq: seq++,
        event_type: 'POT_CORRECTION',
        amount: toInt_(r[4]) || 0,
        ts: toInt_(r[5])
      });
    }
  });

  return { events, board_json: boardCards };
}

/**
 * hand_id 생성 (timestamp 기반)
 */
function generateHandId_(timestamp) {
  const d = new Date(timestamp);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyyMMdd'_'HHmmssSSS");
}

/**
 * v2.0.1: payload → Hand 시트 저장
 * @param {Object} payload - Record 모드 payload
 * @return {Object} {ok, hand_id, hand_no, idempotent}
 */
function _saveHandToHandSheet_(payload) {
  const rosterSS = rosterSS_();
  const handSheet = rosterSS.getSheetByName('Hand');
  if (!handSheet) throw new Error('Hand sheet not found');

  // 멱등성: payload timestamp 기반 (1초 오차 허용)
  const payloadTime = Date.parse(payload.started_at) || Date.now();
  const allRows = handSheet.getDataRange().getValues();

  // HAND 행에서 timestamp 확인 (col 3, 0-based index 3)
  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (row[1] === 'HAND') {
      const rowTimestamp = row[3]; // HAND 행 col D (timestamp)
      const rowTime = typeof rowTimestamp === 'number' ? rowTimestamp : Date.parse(rowTimestamp);
      if (Math.abs(rowTime - payloadTime) < 1000) {
        return {ok: true, hand_id: '', hand_no: String(row[2] || ''), idempotent: true};
      }
    }
  }

  const lastRow = handSheet.getLastRow();
  let rowNum = lastRow + 1;

  // 1) GAME 행
  const gameRow = new Array(18).fill('');
  gameRow[0] = rowNum++;
  gameRow[1] = 'GAME';
  gameRow[2] = 'GGProd Hand Logger';
  gameRow[3] = 'Virtual Table';
  gameRow[4] = Utilities.formatDate(new Date(payloadTime), 'Asia/Seoul', 'yyyy-MM-dd');
  handSheet.appendRow(gameRow);

  // 2) PAYOUTS 행
  const payoutsRow = new Array(18).fill('');
  payoutsRow[0] = rowNum++;
  payoutsRow[1] = 'PAYOUTS';
  handSheet.appendRow(payoutsRow);

  // 3) HAND 행
  const handNo = payload.hand_no || 'AUTO';
  const handRow = new Array(18).fill('');
  handRow[0] = rowNum++;
  handRow[1] = 'HAND';
  handRow[2] = handNo;
  handRow[3] = payloadTime;
  handRow[4] = 'HOLDEM';
  handRow[5] = 'NO_ANTE'; // Record 모드는 NO_ANTE 고정
  handRow[6] = 0; // bb (Record 미입력)
  handRow[7] = 0; // date (unused)
  handRow[8] = 0; // sb
  handRow[9] = 0; // bb (NO_ANTE 위치)
  handRow[10] = 0; // bb_ante
  handRow[11] = toInt_(payload.btn_seat);
  handRow[12] = 0; // sb_seat (Record 미입력)
  handRow[13] = 0; // bb_seat
  handRow[14] = 0; // unused
  handRow[15] = 0; // unused
  handRow[16] = 1; // unused
  handRow[17] = String(payload.table_id || '');
  handSheet.appendRow(handRow);

  // 4) PLAYER 행들
  const stackSnapshot = payload.stack_snapshot || {};
  const holes = payload.holes || {};
  Object.keys(stackSnapshot).sort((a, b) => toInt_(a) - toInt_(b)).forEach(seat => {
    const playerRow = new Array(18).fill('');
    playerRow[0] = rowNum++;
    playerRow[1] = 'PLAYER';
    playerRow[2] = getSeatName_(payload.table_id, seat);
    playerRow[3] = toInt_(seat);
    playerRow[4] = 0; // unused
    playerRow[5] = toInt_(stackSnapshot[seat]);
    playerRow[6] = toInt_(stackSnapshot[seat]);
    const holeCards = holes[seat];
    if (holeCards && holeCards[0] && holeCards[1]) {
      playerRow[7] = `${cardCode_(holeCards[0])} ${cardCode_(holeCards[1])}`;
    }
    handSheet.appendRow(playerRow);
  });

  // 5) EVENT 행들
  const board = payload.board || {};
  const boardCards = [board.f1, board.f2, board.f3, board.turn, board.river].filter(c => c && c.trim());

  // POT_CORRECTION (pre_pot이 있으면)
  if (payload.pre_pot && toInt_(payload.pre_pot) > 0) {
    const potRow = new Array(18).fill('');
    potRow[0] = rowNum++;
    potRow[1] = 'EVENT';
    potRow[2] = 'POT CORRECTION';
    potRow[3] = '';
    potRow[4] = toInt_(payload.pre_pot);
    potRow[5] = 0;
    handSheet.appendRow(potRow);
  }

  // BOARD 카드들
  boardCards.forEach(card => {
    const boardRow = new Array(18).fill('');
    boardRow[0] = rowNum++;
    boardRow[1] = 'EVENT';
    boardRow[2] = 'BOARD';
    boardRow[3] = 1;
    boardRow[4] = cardCode_(card);
    boardRow[5] = 0;
    handSheet.appendRow(boardRow);
  });

  // 액션들
  const acts = payload.actions || [];
  acts.forEach(a => {
    const eventRow = new Array(18).fill('');
    eventRow[0] = rowNum++;
    eventRow[1] = 'EVENT';
    eventRow[2] = String(a.action).toUpperCase();
    eventRow[3] = toInt_(a.seat);
    eventRow[4] = toInt_(a.amount_input) || '';
    eventRow[5] = 0;
    handSheet.appendRow(eventRow);
  });

  // 6) 빈 행 (핸드 구분자)
  handSheet.appendRow(new Array(18).fill(''));

  return {ok: true, hand_id: '', hand_no: handNo, idempotent: false};
}

/**
 * v2.0.1: Hand 시트에서 핸드 상세 조회 (행 타입별 파싱)
 * @param {string} handNo - HAND 행의 hand_no
 * @return {Object} {head, acts, error}
 */
function getHandDetailFromHandSheet_(handNo) {
  try {
    const rosterSS = rosterSS_();
    const handSheet = rosterSS.getSheetByName('Hand');
    if (!handSheet) return {head: null, acts: [], error: 'Hand sheet not found'};

    const allRows = handSheet.getDataRange().getValues();

    // HAND 행 찾기
    let handRowIdx = -1;
    let handRow = null;
    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      if (row[1] === 'HAND' && String(row[2]) === String(handNo)) {
        handRowIdx = i;
        handRow = row;
        break;
      }
    }

    if (!handRow) return {head: null, acts: [], error: 'hand not found'};

    // 같은 블록의 PLAYER/EVENT 행 수집 (다음 GAME 또는 빈 행까지)
    const playerRows = [];
    const eventRows = [];
    for (let i = handRowIdx + 1; i < allRows.length; i++) {
      const row = allRows[i];
      const rowType = row[1];
      if (rowType === 'GAME' || (row.every(c => !c))) break; // 다음 블록 시작
      if (rowType === 'PLAYER') playerRows.push(row);
      else if (rowType === 'EVENT') eventRows.push(row);
    }

    // head 생성
    const stacksJson = {};
    const holesJson = {};
    playerRows.forEach(r => {
      const seat = String(r[3]);
      stacksJson[seat] = toInt_(r[5]);
      const holeStr = String(r[7] || '').trim();
      if (holeStr) {
        const cards = holeStr.split(/\s+/);
        if (cards.length >= 2) holesJson[seat] = [cards[0], cards[1]];
      }
    });

    const boardCards = [];
    eventRows.forEach(r => {
      if (r[2] === 'BOARD') {
        const card = String(r[4] || '').trim();
        if (card) boardCards.push(card);
      }
    });

    const head = {
      hand_id: '', // 행 타입별 저장에서는 hand_id 없음
      table_id: String(handRow[17] || ''),
      btn_seat: String(handRow[11] || ''),
      hand_no: String(handRow[2] || ''),
      start_street: 'PREFLOP',
      started_at: new Date(handRow[3]).toISOString(),
      ended_at: new Date(handRow[3]).toISOString(),
      board: {
        f1: boardCards[0] || '',
        f2: boardCards[1] || '',
        f3: boardCards[2] || '',
        turn: boardCards[3] || '',
        river: boardCards[4] || ''
      },
      pre_pot: 0,
      winner_seat: '',
      pot_final: '',
      stacks_json: JSON.stringify(stacksJson),
      holes_json: JSON.stringify(holesJson)
    };

    // acts 생성
    const acts = [];
    let seq = 1;
    eventRows.forEach(r => {
      const eventType = r[2];
      if (eventType === 'BOARD' || eventType === 'POT CORRECTION') return;
      acts.push({
        seq: seq++,
        street: 'PREFLOP',
        seat: String(r[3] || ''),
        action: eventType,
        amount_input: toInt_(r[4]) || 0,
        to_call_after: 0,
        contrib_after_seat: 0,
        pot_after: 0,
        note: ''
      });
    });

    return {head, acts, error: ''};
  } catch (e) {
    return {head: null, acts: [], error: String(e.message || e)};
  }
}

/**
 * Helper: getSeatName (table_id 기반)
 */
function getSeatName_(tableId, seat) {
  const roster = readRoster_().roster[tableId] || [];
  const player = roster.find(p => String(p.seat) === String(seat));
  return player ? player.player : `Seat ${seat}`;
}
