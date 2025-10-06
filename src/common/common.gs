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
