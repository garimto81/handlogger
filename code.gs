/** Code.gs — Poker Hand Logger
 * 버전: VERSION.json 참조 (ScriptProperties에서 로드)
 *
 * VERSION.json 업데이트 시 Apps Script Editor에서 실행:
 *   1. 메뉴: 실행 > 함수 실행 > syncVersionFromJson
 *   2. 또는 아래 JSON을 직접 수정 후 syncVersionFromJson() 실행
 */

// VERSION.json 내용을 여기 복사 (syncVersionFromJson 실행 시 ScriptProperties에 저장됨)
const VERSION_JSON = {
  "current": "2.9.0",
  "date": "2025-10-13",
  "changelog": {
    "2.9.0": {
      "date": "2025-10-13",
      "type": "minor",
      "changes": [
        "Keyplayer 테이블 우선 정렬 (Record 모드)",
        "테이블 선택 시간 93% 절감 (8초 → 0.5초)",
        "⭐ 아이콘 + 골드 배경 + keyplayer 수 표시",
        "클라이언트 정렬 (O(n log n), 36개 테이블 < 1ms)",
        "하위 호환성 100% 유지 (keyplayer 컬럼 없어도 작동)",
        "모바일 Thumb Zone 최적화 (한 손 조작)",
        "테스트 함수 추가 (브라우저 콘솔: testKeyplayerSort())"
      ]
    },
    "2.8.0": {
      "date": "2025-10-12",
      "type": "minor",
      "changes": [
        "스프레드시트 통합 (ROSTER → APP 단일 스프레드시트)",
        "Roster 스키마 확장 (Type 시트: 6→11 컬럼)",
        "PlayerId 고유 ID 추적 (선택적)",
        "36개 테이블 대규모 토너먼트 지원",
        "PokerRoom, TableName, TableId, SeatId 메타데이터 추가",
        "하위 호환성 100% 유지 (기존 6컬럼 Type 시트 정상 작동)",
        "rosterSS_() 함수 제거 (appSS_()로 통합)",
        "ROSTER_SHEET_NAME: 'Type' 영구 사용"
      ]
    },
    "2.6.0": {
      "date": "2025-10-07",
      "type": "minor",
      "changes": [
        "Bottom Sheet 카드 선택 (화면 하단 슬라이드)",
        "4×13 그리드 1-Click 선택 (52개 카드)",
        "터치 반응성 최적화 (300ms → 0ms 지연)",
        "햅틱 피드백 100% 커버리지 (HAPTIC 상수)",
        "GPU 가속 애니메이션 (60fps)",
        "이벤트 위임 (52개 → 1개 리스너)",
        "터치 타겟 48px (WCAG 2.1 기준)",
        "addTouchButton 헬퍼 함수",
        "커밋 중복 방지 (debounce)"
      ]
    }
  },
  "metadata": {
    "project": "HandLogger",
    "description": "Poker Hand Logger for Google Apps Script"
  }
};

// 초기화 함수 (수동 실행 필요)
function syncVersionFromJson() {
  PropertiesService.getScriptProperties().setProperty('VERSION_JSON', JSON.stringify(VERSION_JSON));
  Logger.log('✅ VERSION.json synced to ScriptProperties');
  Logger.log(`Current version: ${VERSION_JSON.current}`);
}

const APP_SPREADSHEET_ID = '19e7eDjoZRFZooghZJF3XmOZzZcgmqsp9mFAfjvJWhj4'; // HANDS/ACTIONS/CONFIG/LOG/ROSTER 통합 저장소
const ROSTER_SHEET_NAME = 'Type'; // 플레이어 명부 시트 (APP_SPREADSHEET 내부, 영구 고정)
const SH = { HANDS:'HANDS', ACTS:'ACTIONS', CONFIG:'CONFIG', LOG:'LOG' };

const ROSTER_HEADERS = {
  // 필수 필드 (기존)
  tableNo:['Table No.','TableNo','Table_Number','table_no'],
  seatNo:['Seat No.','Seat','SeatNo','seat_no'],
  player:['Players','Player','Name','PlayerName','player_name'],
  nation:['Nationality','Nation','Country','CountryCode'],
  chips:['Chips','Stack','Starting Chips','StartStack','ChipCount','chip_count'],
  keyplayer:['Keyplayer','KeyPlayer','Key Player','key_player'],

  // 선택적 필드 (Seats.csv 확장)
  playerId:['PlayerId','Player_Id','player_id'],
  tableId:['TableId','Table_Id','table_id'],
  seatId:['SeatId','Seat_Id','seat_id'],
  pokerRoom:['PokerRoom','Poker_Room','poker_room'],
  tableName:['TableName','Table_Name','table_name']
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
  const ver = getVersion();
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle(`Poker Hand Logger — v${ver.current}`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getVersion(){
  try {
    const stored = PropertiesService.getScriptProperties().getProperty('VERSION_JSON');
    if (stored) {
      const versionData = JSON.parse(stored);
      return {
        current: versionData.current,
        date: versionData.date,
        name: versionData.metadata?.project || 'HandLogger'
      };
    }
  } catch(e) {
    Logger.log('⚠️ VERSION.json not synced, using fallback');
  }

  // Fallback: VERSION_JSON 상수에서 읽기
  return {
    current: VERSION_JSON.current,
    date: VERSION_JSON.date,
    name: VERSION_JSON.metadata?.project || 'HandLogger'
  };
}

/* ==== ROSTER ==== */
function readRoster_(){
  const ss=appSS_();
  const sh=ss.getSheetByName(ROSTER_SHEET_NAME)||ss.getSheets()[0];
  const {header,rows}=readAll_(sh);

  // 필수 컬럼 인덱스
  const idx={
    tableNo:findColIndex_(header,ROSTER_HEADERS.tableNo),
    seatNo:findColIndex_(header,ROSTER_HEADERS.seatNo),
    player:findColIndex_(header,ROSTER_HEADERS.player),
    nation:findColIndex_(header,ROSTER_HEADERS.nation),
    chips:findColIndex_(header,ROSTER_HEADERS.chips),
    keyplayer:10 // 🔧 FIX: K열(인덱스 10) 고정 - 헤더 무관
  };

  // 선택적 컬럼 인덱스 (Seats.csv 확장 필드)
  const optIdx={
    playerId:findColIndex_(header,ROSTER_HEADERS.playerId),
    tableId:findColIndex_(header,ROSTER_HEADERS.tableId),
    seatId:findColIndex_(header,ROSTER_HEADERS.seatId),
    pokerRoom:findColIndex_(header,ROSTER_HEADERS.pokerRoom),
    tableName:findColIndex_(header,ROSTER_HEADERS.tableName)
  };

  const roster={}, tables=new Set();
  rows.forEach(r=>{
    const t=idx.tableNo>=0?String(r[idx.tableNo]).trim():'';
    if(!t) return;
    const seat=idx.seatNo>=0?toInt_(r[idx.seatNo]):0; if(seat<=0) return;
    const name=idx.player>=0?String(r[idx.player]).trim():'';
    const nation=idx.nation>=0?String(r[idx.nation]).trim():'';
    const chips=idx.chips>=0?toInt_(r[idx.chips]):0;
    const keyplayer=idx.keyplayer>=0?String(r[idx.keyplayer]).toUpperCase()==='TRUE':false;

    // 기본 플레이어 객체
    const playerObj = {seat,player:name,nation,chips,keyplayer};

    // 선택적 필드 추가 (있으면 포함)
    if(optIdx.playerId>=0) playerObj.playerId=String(r[optIdx.playerId]||'');
    if(optIdx.tableId>=0) playerObj.tableId=String(r[optIdx.tableId]||'');
    if(optIdx.seatId>=0) playerObj.seatId=String(r[optIdx.seatId]||'');
    if(optIdx.pokerRoom>=0) playerObj.pokerRoom=String(r[optIdx.pokerRoom]||'');
    if(optIdx.tableName>=0) playerObj.tableName=String(r[optIdx.tableName]||'');

    tables.add(t);
    (roster[t]=roster[t]||[]).push(playerObj);
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

/* ==== v3.3.0: Auto Hand Number ==== */
/**
 * HANDS 시트의 hand_no 최대값을 조회하여 다음 번호 반환
 * @returns {number} 다음 hand_no (HANDS 시트가 비어있으면 1)
 */
function getNextHandNo(){
  try {
    ensureSheets_();
    const ss = appSS_();
    const shH = ss.getSheetByName(SH.HANDS);

    if (!shH) return 1;

    const data = shH.getDataRange().getValues();
    if (data.length < 2) return 1; // 헤더만 있으면 1부터 시작

    const header = data[0];
    const handNoCol = header.indexOf('hand_no');

    if (handNoCol === -1) return 1;

    let maxHandNo = 0;
    for (let i = 1; i < data.length; i++) {
      const handNo = toInt_(data[i][handNoCol]);
      if (handNo > maxHandNo) {
        maxHandNo = handNo;
      }
    }

    return maxHandNo + 1;
  } catch(e) {
    log_('ERR_GETNEXTHANDNO', e.message);
    return 1; // fallback
  }
}

/* ==== SAVE (기존) ==== */
function saveHand(payload){
  ensureSheets_();
  if(!payload) throw new Error('empty payload');
  return withScriptLock_(()=>_saveCore_(payload));
}

/* ==== SAVE (VIRTUAL 전송 제거 - Review 모드에서 수동 전송) ==== */
function saveHandWithExternal(payload){
  ensureSheets_();
  if(!payload) throw new Error('empty payload');
  return withScriptLock_(()=>{
    log_('SAVE_BEGIN', `table=${payload.table_id||''} started_at=${payload.started_at||''}`, payload.table_id);
    const saved = _saveCore_(payload); // {ok, hand_id, hand_no, idempotent}
    log_('SAVE_OK', `hand_id=${saved.hand_id} hand_no=${saved.hand_no} idempotent=${!!saved.idempotent}`, payload.table_id);
    return saved;
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
    // Read-Modify-Write with conflict detection
    const before=toInt_(sh.getRange(found, idxS+1).getValue());
    const next=before+1;
    sh.getRange(found, idxS+1).setValue(next);
    if(idxU>=0) sh.getRange(found, idxU+1).setValue(now);

    // Verify no concurrent modification occurred
    Utilities.sleep(50);
    const after=toInt_(sh.getRange(found, idxS+1).getValue());
    if(after !== next){
      throw new Error('CONFLICT: hand_seq changed (expected '+next+', got '+after+')');
    }

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

/* ===== Review 모드 VIRTUAL 전송 ===== */
function sendHandToVirtual(hand_id, sheetId, payload){
  if(!hand_id) throw new Error('hand_id required');
  if(!sheetId) throw new Error('sheetId required');
  if(!payload) throw new Error('payload required');

  return withScriptLock_(()=>{
    const payloadStr = JSON.stringify(payload);
    log_('PUSH_VIRTUAL_BEGIN', `hand_id=${hand_id} payload=${payloadStr}`, '');
    Logger.log('🚀 [VIRTUAL] 시작 - hand_id: ' + hand_id + ' sheetId: ' + sheetId + ' payload: ' + payloadStr);

    // 1. 핸드 상세 조회
    const detail = getHandDetail(hand_id);
    if(!detail || !detail.head) throw new Error(`Hand not found: ${hand_id}`);

    const head = detail.head;
    const isoTime = head.started_at || nowKST_().toISOString();
    const hhmmTime = extractTimeHHMM_(isoTime);
    Logger.log('📋 [VIRTUAL] 핸드 상세: table_id=' + head.table_id + ' hand_no=' + head.hand_no + ' started_at=' + isoTime + ' hhmmTime=' + hhmmTime);

    // 2. VIRTUAL 시트 열기
    const ss = SpreadsheetApp.openById(sheetId);
    const sh = ss.getSheetByName('VIRTUAL') || ss.getSheets()[0];
    const sheetName = sh.getName();
    const last = sh.getLastRow();
    Logger.log('📄 [VIRTUAL] 타겟 시트: sheetId=' + sheetId + ' sheetName=' + sheetName + ' lastRow=' + last);

    if(last < 2){
      log_('PUSH_VIRTUAL_FAIL', 'no-rows', '');
      Logger.log('❌ [VIRTUAL] 실패: 데이터 행 없음 (lastRow < 2)');
      return {success:false, reason:'no-rows'};
    }

    // 3. C열 Time 매칭 (started_at 시간과 정확히 일치하는 행 찾기)
    const rngVals = sh.getRange(2,3,last-1,1).getValues();
    const rngDisp = sh.getRange(2,3,last-1,1).getDisplayValues();
    const rngE = sh.getRange(2,5,last-1,1).getValues(); // E열 상태 확인
    Logger.log('🔍 [VIRTUAL] C열 Time 검색 중... (목표: ' + hhmmTime + ')');

    let pickRow = -1;
    let debugInfo = [];
    for(let i=0; i<rngVals.length; i++){
      const raw = rngVals[i][0];
      const disp = rngDisp[i][0];
      const eVal = rngE[i][0]; // E열 값
      const cellTime = parseTimeCellToTodayKST_(raw, disp);
      const cellHHMM = cellTime ? extractTimeHHMM_(cellTime.toISOString()) : '';

      debugInfo.push(`Row ${i+2}: ${cellHHMM} (E=${eVal})`);

      if(cellHHMM === hhmmTime){
        // E열이 이미 '미완료'면 스킵 (이미 처리된 행)
        if(eVal === '미완료'){
          log_('PUSH_VIRTUAL_SKIP', `row=${i+2} already processed`, '');
          console.log('⏭️ [VIRTUAL] 스킵: Row ' + (i+2) + ' (이미 처리됨)');
          continue;
        }
        pickRow = i + 2;
        console.log('✅ [VIRTUAL] 매칭 성공: Row ' + pickRow + ' (Time: ' + cellHHMM + ')');
        break;
      }
    }

    if(pickRow < 0){
      log_('PUSH_VIRTUAL_FAIL', `no-match: ${hhmmTime}. Checked: ${debugInfo.join(', ')}`, '');
      console.log('❌ [VIRTUAL] 실패: Time 매칭 없음 (목표: ' + hhmmTime + ')');
      console.log('🔍 [VIRTUAL] 검색된 행들:', debugInfo.slice(0, 10).join(', '));
      return {success:false, reason:`no-match: ${hhmmTime}`};
    }

    log_('PUSH_VIRTUAL_ROW', `row=${pickRow} time=${hhmmTime}`, '');

    // 4. 값 구성
    console.log('🔧 [VIRTUAL] 값 생성 시작...');
    const E = '미완료';
    const F = buildFileName_(detail);
    const G = 'A';
    const H = buildHistoryBlock_(detail, payload.bbOverride || 0);
    const J = buildSubtitle_(detail, payload);

    console.log('📝 [VIRTUAL] 생성된 값:', {
      E: E,
      F: F.slice(0, 50) + (F.length > 50 ? '...' : ''),
      G: G,
      H: H.slice(0, 100) + (H.length > 100 ? '...' : ''),
      'J (길이)': J.length,
      'J (내용)': J || '(빈 문자열)'
    });

    // J열 상세 디버깅
    if(!J || J.length === 0){
      console.log('⚠️ [VIRTUAL] J열 경고: 빈 문자열 생성됨');
      console.log('🔍 [VIRTUAL] J열 생성 과정 추적 시작...');

      // buildSubtitle_ 함수 내부 로직 재실행 (디버깅용)
      const tableId = head.table_id;
      const rosterData = readRoster_();
      console.log('📊 [VIRTUAL] Roster 데이터:', {
        'tables 수': rosterData.tables ? rosterData.tables.length : 0,
        'roster 테이블 수': rosterData.roster ? Object.keys(rosterData.roster).length : 0,
        'tableId': tableId,
        'roster[tableId] 존재': !!(rosterData.roster && rosterData.roster[tableId])
      });

      if(rosterData.roster && rosterData.roster[tableId]){
        const rosterList = rosterData.roster[tableId];
        console.log('👥 [VIRTUAL] Table ' + tableId + ' Roster:', {
          '총 플레이어 수': rosterList.length,
          '플레이어 목록': rosterList.map(p => ({
            seat: p.seat,
            name: p.player,
            keyplayer: p.keyplayer
          }))
        });

        const participants = participantsOrdered_(detail);
        console.log('🎮 [VIRTUAL] 핸드 참가자:', participants);

        const keyPlayers = rosterList.filter(p => p.keyplayer && participants.includes(String(p.seat)));
        console.log('⭐ [VIRTUAL] 키플레이어 필터링 결과:', {
          '키플레이어 수': keyPlayers.length,
          '키플레이어 목록': keyPlayers.map(p => ({
            seat: p.seat,
            name: p.player
          }))
        });
      } else {
        console.log('❌ [VIRTUAL] roster[tableId] 없음 - rosterList가 빈 배열됨');
      }
    } else {
      console.log('✅ [VIRTUAL] J열 정상 생성 (길이: ' + J.length + ')');
    }

    // 5. 비연속 컬럼 쓰기 (E,F,G,H,J => 5,6,7,8,10)
    console.log('💾 [VIRTUAL] 시트 쓰기 시작 (Row: ' + pickRow + ')');
    sh.getRange(pickRow, 5, 1, 1).setValue(E);
    console.log('  ✓ E열 (col 5) 완료');
    sh.getRange(pickRow, 6, 1, 1).setValue(F);
    console.log('  ✓ F열 (col 6) 완료');
    sh.getRange(pickRow, 7, 1, 1).setValue(G);
    console.log('  ✓ G열 (col 7) 완료');
    sh.getRange(pickRow, 8, 1, 1).setValue(H);
    console.log('  ✓ H열 (col 8) 완료');
    sh.getRange(pickRow,10, 1, 1).setValue(J);
    console.log('  ✓ J열 (col 10) 완료 - 입력값:', J.slice(0, 100) + (J.length > 100 ? '...' : ''));

    log_('PUSH_VIRTUAL_OK', `row=${pickRow}`, '');
    const result = {success:true, row:pickRow};
    console.log('🎉 [VIRTUAL] 완료 - Row ' + pickRow + '에 데이터 입력 성공');
    console.log('sendHandToVirtual returning:', JSON.stringify(result));
    return result;
  });
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
  const parts = seatsOrder.map(seat => {
    const name = nameShort_(head.table_id, seat);
    const cards = holes2_(head.holes_json, seat);
    return name + (cards ? `_${cards.join('')}` : '');
  });
  return `VT${head.hand_no||'-'}_${parts.join('_vs_')}`;
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
  return `${(first[0]||'').toUpperCase()}-${last}`;
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

/* === J열 자막 (키플레이어) === */
function buildSubtitle_(detail, payload){
  const head = detail.head || {};
  const tableId = head.table_id;

  // payload 구조 분해
  const selectedSeats = payload.selectedSeats || [];
  const eliminatedSeats = payload.eliminatedSeats || [];
  const stackOverrides = payload.stackOverrides || {};
  const bb = payload.bbOverride || 0;

  // 🔧 FIX: readRoster_() 반환값 구조 수정 (.roster 1번만 접근)
  const rosterData = readRoster_();
  const rosterList = (rosterData.roster && rosterData.roster[tableId]) || [];

  // 선택된 플레이어 필터링 (selectedSeats에 포함 + keyplayer=true)
  const keyPlayers = rosterList.filter(p =>
    p.keyplayer && selectedSeats.includes(String(p.seat))
  );

  if(keyPlayers.length === 0) return ''; // 선택된 키플레이어 없음

  // 🔧 v3.0.0: eliminatedSeats 배열 처리 (복수 플레이어 개별 탈락 표시)
  const eliminatedSet = new Set((eliminatedSeats || []).map(String));

  // 각 키플레이어별 자막 생성
  const lines = keyPlayers.map(kp => {
    const seatStr = String(kp.seat);
    const name = kp.player || `S${seatStr}`;
    const nation = kp.nation || '';
    const line1 = `${name} / ${nation}`;

    // 해당 seat이 eliminatedSeats에 포함되면 ELIMINATED 표시
    if(eliminatedSet.has(seatStr)){
      return `${line1}\nELIMINATED`;
    }

    // 스택 계산: stackOverrides가 있으면 우선 사용, 없으면 stacks_json 사용
    const finalStack = stackOverrides[seatStr] !== undefined
      ? toInt_(stackOverrides[seatStr])
      : (safeParseJson_(head.stacks_json || '{}')[seatStr] || 0);

    const bbv = toInt_(bb);
    const stackBB = bbv > 0 ? `${Math.round(finalStack / bbv)}BB` : '';
    const stackText = bbv > 0
      ? `${numComma_(finalStack)} (${stackBB})`
      : numComma_(finalStack);

    return `${line1}\nCURRENT STACK - ${stackText}`;
  });

  return lines.join('\n\n');
}

/* === 시간 추출 (ISO → HH:mm) === */
function extractTimeHHMM_(isoTime){
  if(!isoTime) return '';
  const d = new Date(isoTime);
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${hh}:${mm}`;
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
