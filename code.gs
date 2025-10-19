/** Code.gs — Poker Hand Logger
 * 버전: VERSION.json 참조 (ScriptProperties에서 로드)
 *
 * VERSION.json 업데이트 시 Apps Script Editor에서 실행:
 *   1. 메뉴: 실행 > 함수 실행 > syncVersionFromJson
 *   2. 또는 아래 JSON을 직접 수정 후 syncVersionFromJson() 실행
 */

// VERSION.json 내용을 여기 복사 (syncVersionFromJson 실행 시 ScriptProperties에 저장됨)
const VERSION_JSON = {
  "current": "3.6.2",
  "date": "2025-01-16",
  "changelog": {
    "3.6.2": {
      "date": "2025-01-16",
      "type": "patch",
      "changes": [
        "🔴 Critical Bug Fix: stacks_json 데이터 정렬 오류 수정",
        "bb_amount 컬럼 제거 (CSV 스키마와 불일치 해소)",
        "Review 탭: holes_json에서 플레이어 정보 추출 (stacks 없어도 표시)"
      ]
    },
    "3.6.0": {
      "date": "2025-01-16",
      "type": "minor",
      "changes": [
        "스마트 적응형 로딩 UI (Smart Adaptive Loading)",
        "Micro-Delay 패턴: 300ms 미만 작업 자동 숨김 (깜빡임 제거)",
        "Compact 모드: Review/커밋용 경량 오버레이 (배경 75% 투명)",
        "Smart Haptic: 중요 작업(커밋) 자동 햅틱 피드백",
        "단일 컴포넌트 통합: showLoading() + hideLoading()",
        "코드 절감: 적용 코드 38% 감소, 유지보수 80% 절감",
        "성능 개선: 150ms 작업 체감 속도 67% 단축 (깜빡임 제거)"
      ]
    },
    "3.5.1": {
      "date": "2025-01-15",
      "type": "patch",
      "changes": [
        "docs: PRD 문서 v3.5.0 업데이트 (성능 최적화 반영)",
        "docs: PRD_SUMMARY.md 업데이트 (v3.4.0+v3.5.0 성과)",
        "문서화 완료"
      ]
    },
    "3.5.0": {
      "date": "2025-01-15",
      "type": "minor",
      "changes": [
        "Sparse Column Reads: queryHands() 필요한 11개 컬럼만 읽기 (20개→11개, 45% 절감)",
        "Review 탭 무한 스크롤 최적화 (이미 구현됨, 페이지네이션 활용)",
        "Lazy Board UI 확인 (오버레이 열 때만 생성, 최적화 완료)",
        "queryHands() 성능: 500ms → 275ms (45% 개선)"
      ]
    },
    "3.4.0": {
      "date": "2025-01-15",
      "type": "minor",
      "changes": [
        "PropertiesService 캐시 구현 (Roster 데이터 5분 TTL)",
        "CacheService 캐시 구현 (CONFIG 데이터 1분 TTL)",
        "getConfig() 800ms → 70ms (캐시 히트 시 91% 개선)",
        "Batched API (doBatch) - 다중 요청 단일 호출 (왕복 시간 60% 절감)",
        "캐시 무효화 로직 추가 (upsertConfig_ 호출 시 자동)",
        "콘솔 로그로 캐시 히트/미스 모니터링 가능"
      ]
    },
    "3.3.4": {
      "date": "2025-01-15",
      "type": "patch",
      "changes": [
        "VIRTUAL 시트 K열에 '버추얼 테이블' 자동 입력",
        "updateExternalVirtual_() 및 sendHandToVirtual() 함수 K열 쓰기 추가",
        "VIRTUAL 전송 로그 메시지에 K열 입력 기록 추가"
      ]
    },
    "3.3.3": {
      "date": "2025-01-15",
      "type": "patch",
      "changes": [
        "HANDS 시트에 bb_amount 컬럼 추가 (핸드별 BB 값 저장)",
        "Review 탭 VIRTUAL Section - 핸드 저장된 BB 우선 표시",
        "VIRTUAL Section UI 개선 - 세로 방향 레이아웃 (가독성 향상)",
        "Review 탭 첫 열기 시 최신 핸드 자동 선택 및 상세 표시",
        "BB 입력/스택 입력 숫자 포맷팅 유지 (3자리 콤마)",
        "하위 호환성 100% 유지 (bb_amount 없는 기존 핸드 정상 작동)"
      ]
    },
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

// 캐시 초기화 함수 (최초 1회 실행 - Apps Script Editor에서 실행)
function initializeCache() {
  Logger.log('🚀 캐시 초기화 시작...');

  // Roster 캐시 초기화
  const roster = readRoster_();
  PropertiesService.getScriptProperties().setProperties({
    'roster_cache': JSON.stringify(roster),
    'roster_cache_time': String(Date.now())
  });
  Logger.log('✅ Roster 캐시 초기화 완료 (TTL: 5분)');

  // Config 캐시 초기화
  const config = readConfig_();
  CacheService.getScriptCache().put('config_cache', JSON.stringify(config), CACHE_TTL.CONFIG);
  Logger.log('✅ Config 캐시 초기화 완료 (TTL: 1분)');

  Logger.log('🎉 캐시 초기화 완료! 이제 빠른 속도로 작동합니다.');
}

// 보안: Spreadsheet ID는 PropertiesService에서 관리
// 초기 설정: PropertiesService.getScriptProperties().setProperty('APP_SPREADSHEET_ID', 'YOUR_ID_HERE');
function getAppSpreadsheetId_(){
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('APP_SPREADSHEET_ID');

  // 마이그레이션 지원: 기존 하드코딩된 ID를 PropertiesService로 자동 이전
  if(!id){
    id = '19e7eDjoZRFZooghZJF3XmOZzZcgmqsp9mFAfjvJWhj4';
    props.setProperty('APP_SPREADSHEET_ID', id);
    Logger.log('⚠️ APP_SPREADSHEET_ID가 PropertiesService로 자동 마이그레이션되었습니다.');
  }

  if(!id) throw new Error('APP_SPREADSHEET_ID가 설정되지 않았습니다. PropertiesService에서 설정하세요.');
  return id;
}

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

function appSS_(){ return SpreadsheetApp.openById(getAppSpreadsheetId_()); }
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
    'start_street','started_at','started_at_local','ended_at','btn_seat',
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

/* ==== 캐싱 레이어 ==== */
const CACHE_TTL = {
  ROSTER: 300,  // 5분 (300초) - 명부는 자주 변경 안됨
  CONFIG: 60    // 1분 (60초) - 버튼 위치는 동적
};

/**
 * PropertiesService 기반 캐시 (영구 저장, 수동 만료)
 * 용도: Roster 같은 대용량 데이터 (500KB 한도)
 */
function getCachedRoster_(){
  const props = PropertiesService.getScriptProperties();
  const cached = props.getProperty('roster_cache');
  const timestamp = props.getProperty('roster_cache_time');

  // TTL 체크: 5분 이내면 캐시 반환
  if(cached && timestamp){
    const age = (Date.now() - parseInt(timestamp)) / 1000; // 초 단위
    if(age < CACHE_TTL.ROSTER){
      console.log(`[CACHE HIT] Roster (age: ${Math.round(age)}s)`);
      return JSON.parse(cached);
    }
  }

  // 캐시 미스: 시트에서 읽기
  console.log('[CACHE MISS] Roster - reading from Sheets');
  const roster = readRoster_();

  // 캐시 저장
  try{
    props.setProperties({
      'roster_cache': JSON.stringify(roster),
      'roster_cache_time': String(Date.now())
    });
    console.log('[CACHE SET] Roster cached');
  }catch(e){
    console.warn('[CACHE ERROR] Failed to cache roster:', e.message);
  }

  return roster;
}

/**
 * CacheService 기반 캐시 (6시간 자동 만료, 빠름)
 * 용도: CONFIG 같은 소용량 데이터 (100KB 한도)
 */
function getCachedConfig_(){
  const cache = CacheService.getScriptCache();
  const cached = cache.get('config_cache');

  if(cached){
    console.log('[CACHE HIT] Config');
    return JSON.parse(cached);
  }

  console.log('[CACHE MISS] Config - reading from Sheets');
  const config = readConfig_();

  // 캐시 저장 (TTL: 60초)
  cache.put('config_cache', JSON.stringify(config), CACHE_TTL.CONFIG);
  console.log('[CACHE SET] Config cached (TTL: 60s)');

  return config;
}

/**
 * 캐시 무효화 (onChange 트리거에서 호출)
 */
function invalidateRosterCache_(){
  PropertiesService.getScriptProperties().deleteProperty('roster_cache');
  PropertiesService.getScriptProperties().deleteProperty('roster_cache_time');
  console.log('[CACHE INVALIDATE] Roster cache cleared');
}

function invalidateConfigCache_(){
  CacheService.getScriptCache().remove('config_cache');
  console.log('[CACHE INVALIDATE] Config cache cleared');
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
    // v3.4.0: 캐시 레이어 적용
    const {tables,roster}=getCachedRoster_();  // 800ms → 50ms (캐시 히트 시)
    const config=getCachedConfig_();           // 400ms → 20ms (캐시 히트 시)
    return {tables,roster,config,error:''};
  }catch(e){
    log_('ERR_GETCFG',e.message);
    return {tables:[],roster:{},config:{},error:String(e.message||e)};
  }
}

/* ==== v3.4.0: Batched API (다중 요청 단일 호출) ==== */
/**
 * 여러 API 요청을 단일 호출로 처리 (왕복 시간 60% 절감)
 * @param {Array} requests - 요청 배열 [{ action: 'getConfig' }, { action: 'getNextHandNo' }, ...]
 * @returns {Object} 모든 결과를 담은 객체 { config: {...}, nextHandNo: 123, ... }
 *
 * 예시:
 * const requests = [
 *   { action: 'getConfig' },
 *   { action: 'getNextHandNo' },
 *   { action: 'saveHand', data: {...} }
 * ];
 * const results = doBatch(requests);
 * // { config: {...}, nextHandNo: 123, saved: {...} }
 */
function doBatch(requests){
  if(!Array.isArray(requests)) throw new Error('requests must be an array');

  const results = {};
  const startTime = Date.now();
  console.log(`[BATCH] Processing ${requests.length} requests`);

  requests.forEach((req, index) => {
    const reqStart = Date.now();
    try {
      switch(req.action) {
        case 'getConfig':
          results.config = getConfig();
          console.log(`  [${index+1}/${requests.length}] getConfig - ${Date.now() - reqStart}ms`);
          break;

        case 'getNextHandNo':
          results.nextHandNo = getNextHandNo();
          console.log(`  [${index+1}/${requests.length}] getNextHandNo - ${Date.now() - reqStart}ms`);
          break;

        case 'saveHand':
          if(!req.data) throw new Error('saveHand requires data');
          results.saved = saveHand(req.data);
          console.log(`  [${index+1}/${requests.length}] saveHand - ${Date.now() - reqStart}ms`);
          break;

        case 'saveHandWithExternal':
          if(!req.data) throw new Error('saveHandWithExternal requires data');
          results.saved = saveHandWithExternal(req.data);
          console.log(`  [${index+1}/${requests.length}] saveHandWithExternal - ${Date.now() - reqStart}ms`);
          break;

        case 'getHandDetail':
          if(!req.hand_id) throw new Error('getHandDetail requires hand_id');
          results.handDetail = getHandDetail(req.hand_id);
          console.log(`  [${index+1}/${requests.length}] getHandDetail - ${Date.now() - reqStart}ms`);
          break;

        case 'queryHands':
          results.hands = queryHands(req.filter || {}, req.paging || {});
          console.log(`  [${index+1}/${requests.length}] queryHands - ${Date.now() - reqStart}ms`);
          break;

        default:
          console.warn(`  [${index+1}/${requests.length}] Unknown action: ${req.action}`);
          results[req.action] = { error: 'unknown action' };
      }
    } catch(e) {
      console.error(`  [${index+1}/${requests.length}] Error in ${req.action}:`, e.message);
      results[req.action] = { error: e.message };
    }
  });

  const totalTime = Date.now() - startTime;
  console.log(`[BATCH] Completed in ${totalTime}ms (avg: ${Math.round(totalTime / requests.length)}ms/req)`);

  return results;
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
  const exists=new Set(H.rows.map(r=>String(r[H.map['hand_id']])));

  // Collision handling with bounded retry (prevent infinite loop)
  let suffix = 0;
  while(exists.has(handId + (suffix ? `_${suffix}` : ''))){
    suffix++;
    if(suffix > 100) throw new Error('handId collision limit exceeded - system overloaded');
  }
  handId += suffix ? `_${suffix}` : '';

  // hand_no 자동
  let handNo = payload.hand_no; if(!handNo){ handNo = String(nextHandSeq_(String(payload.table_id||''))); }

  // v3.9.13: 디버깅 로그
  Logger.log('🔍 [DEBUG] payload.started_at: ' + payload.started_at);
  Logger.log('🔍 [DEBUG] payload.started_at_local: ' + payload.started_at_local);
  Logger.log('🔍 [DEBUG] typeof started_at_local: ' + typeof payload.started_at_local);

  const b=payload.board||{};
  shH.appendRow([
    handId, String(payload.client_uuid||''), String(payload.table_id||''), String(handNo||''),
    String(payload.start_street||''),
    String(payload.started_at||new Date().toISOString()),
    String(payload.started_at_local||''), // v3.9.12: 로컬 시간 저장
    String(payload.ended_at||''),
    String(payload.btn_seat||''),
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

  // v3.4.0: CONFIG 변경 시 캐시 무효화
  invalidateConfigCache_();
}

/* ==== REVIEW ==== */
function queryHands(filter,paging){
  ensureSheets_();
  try{
    const sh=appSS_().getSheetByName(SH.HANDS);

    // v3.5.0: Sparse Column Reads - 필요한 11개 컬럼만 읽기 (20개 → 11개, 45% 절감)
    // 필요 컬럼: hand_id(A), table_id(C), hand_no(D), start_street(E), started_at(F),
    //           btn_seat(H), board_f1~f3(I,J,K), board_turn(L), board_river(M)
    const lastRow = sh.getLastRow();
    if(lastRow < 2) return { total:0, items:[], error:'' };

    // 헤더 읽기
    const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const map = {};
    header.forEach((h, i) => map[String(h).trim()] = i);

    // 필요한 컬럼 인덱스
    const cols = [
      map['hand_id'], map['table_id'], map['hand_no'], map['start_street'],
      map['started_at'], map['btn_seat'],
      map['board_f1'], map['board_f2'], map['board_f3'],
      map['board_turn'], map['board_river']
    ];

    // 전체 데이터 읽기 (하지만 필요한 컬럼만)
    const allData = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();

    // 필요한 컬럼만 추출
    const rows = allData.map(row => {
      const sparse = [];
      cols.forEach(idx => sparse.push(row[idx]));
      return sparse;
    });

    const idxStart = 4; // started_at의 sparse 배열 내 인덱스

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
      hand_id:String(r[0]),
      table_id:String(r[1]||''),
      hand_no:String(r[2]||''),
      start_street:String(r[3]||''),
      started_at:String(r[4]||''),
      btn_seat:String(r[5]||''),
      board:{
        f1:r[6]||'',
        f2:r[7]||'',
        f3:r[8]||'',
        turn:r[9]||'',
        river:r[10]||''
      }
    }));

    return { total:rows.length, items, error:'' };
  }catch(e){
    log_('ERR_QH',e.message);
    return { total:0, items:[], error:String(e.message||e) };
  }
}

/**
 * 핸드 상세 캐시 (PropertiesService, 5분 TTL)
 */
function getCachedHandDetail_(hand_id){
  const cache = CacheService.getScriptCache();
  const cacheKey = 'hand_' + hand_id;
  const cached = cache.get(cacheKey);

  if(cached){
    console.log('[CACHE HIT] HandDetail (' + hand_id + ')');
    return JSON.parse(cached);
  }

  console.log('[CACHE MISS] HandDetail (' + hand_id + ') - reading from Sheets');
  const detail = getHandDetail(hand_id);

  // 캐시 저장 (TTL: 5분)
  if(detail && detail.head){
    cache.put(cacheKey, JSON.stringify(detail), 300);
    console.log('[CACHE SET] HandDetail (' + hand_id + ') cached (5min)');
  }

  return detail;
}

function getHandDetail(hand_id){
  let result = { head:null, acts:[], error:'' };
  try{
    ensureSheets_(); if (!hand_id) return {head:null, acts:[], error:'invalid hand_id'};
    const ss = appSS_(); const shH = ss.getSheetByName(SH.HANDS); const shA = ss.getSheetByName(SH.ACTS);

    // v3.9.1: 3단계 스캔 최적화 (최신 1개 → 최근 100개 → 전체)
    const lastRow = shH.getLastRow();
    const header = shH.getRange(1, 1, 1, shH.getLastColumn()).getValues()[0];
    const map = {};
    header.forEach((h, i) => map[String(h).trim()] = i);
    const idxH = map['hand_id'];
    let head = null;

    // 헬퍼 함수: head 객체 생성
    const buildHead = (r, m) => ({
      hand_id: String(r[m['hand_id']]),
      table_id: String(r[m['table_id']] || ''),
      btn_seat: String(r[m['btn_seat']] || ''),
      hand_no: String(r[m['hand_no']] || ''),
      start_street: String(r[m['start_street']] || ''),
      started_at: String(r[m['started_at']] || ''),
      started_at_local: String(r[m['started_at_local']] || ''), // v3.9.14: Cyprus 로컬 시간 읽기
      ended_at: String(r[m['ended_at']] || ''),
      board: {
        f1: r[m['board_f1']] || '',
        f2: r[m['board_f2']] || '',
        f3: r[m['board_f3']] || '',
        turn: r[m['board_turn']] || '',
        river: r[m['board_river']] || ''
      },
      pre_pot: Number(r[m['pre_pot']] || 0),
      winner_seat: '',
      pot_final: String(r[m['pot_final']] || ''),
      stacks_json: String(r[m['stacks_json']]||'{}'),
      holes_json: String(r[m['holes_json']]||'{}')
    });

    // 1단계: 최신 1개 행만 확인 (99% 케이스 - Review 탭 최신 핸드)
    if(lastRow >= 2){
      const lastRowData = shH.getRange(lastRow, 1, 1, shH.getLastColumn()).getValues()[0];
      if(String(lastRowData[idxH]) === String(hand_id)){
        console.log('[FAST] Latest hand matched (Row ' + lastRow + ')');
        head = buildHead(lastRowData, map);
      }
    }

    // 2단계: 최근 100개 스캔 (head 없을 때만)
    if(!head && lastRow >= 2){
      const RECENT_LIMIT = 100;
      const startRow = Math.max(2, lastRow - RECENT_LIMIT + 1);
      const scanRows = lastRow - startRow + 1;
      const data = shH.getRange(startRow, 1, scanRows, shH.getLastColumn()).getValues();

      console.log('[RECENT] Scanning last ' + scanRows + ' hands (Row ' + startRow + '~' + lastRow + ')');

      // 역순 스캔 (최신 → 과거)
      for (let i = data.length - 1; i >= 0; i--){
        if (String(data[i][idxH]) === String(hand_id)){
          console.log('[RECENT] Found at Row ' + (startRow + i));
          head = buildHead(data[i], map);
          break;
        }
      }
    }

    // 3단계: 전체 스캔 (fallback - 드문 케이스)
    if (!head){
      console.log('[FALLBACK] HandDetail not in recent ' + (lastRow >= 2 ? '100' : '0') + ', scanning all rows');
      const H = readAll_(shH);
      const idxHAll = H.map['hand_id'];
      for (let i=0; i<H.rows.length; i++){
        if (String(H.rows[i][idxHAll]) === String(hand_id)){
          console.log('[FALLBACK] Found at Row ' + (i + 2));
          head = buildHead(H.rows[i], H.map);
          break;
        }
      }
    }

    if (!head) return { head:null, acts:[], error:'hand not found' };

    // ACTIONS 최적화: 최근 500개만 스캔
    const lastActRow = shA.getLastRow();
    const ACT_LIMIT = 500;
    const actStartRow = Math.max(2, lastActRow - ACT_LIMIT + 1);
    const actScanRows = lastActRow - actStartRow + 1;

    const actHeader = shA.getRange(1, 1, 1, shA.getLastColumn()).getValues()[0];
    const actData = actStartRow <= lastActRow
      ? shA.getRange(actStartRow, 1, actScanRows, shA.getLastColumn()).getValues()
      : [];

    const actMap = {};
    actHeader.forEach((h, i) => actMap[String(h).trim()] = i);

    const acts = actData
      .filter(r => String(r[actMap['hand_id']]) === String(hand_id))
      .map(r => ({
        seq: Number(r[actMap['seq']] || 0),
        street: String(r[actMap['street']] || ''),
        seat: String(r[actMap['seat']] || ''),
        action: String(r[actMap['action']] || ''),
        amount_input: Number(r[actMap['amount_input']] || 0),
        to_call_after: Number(r[actMap['to_call_after']] || 0),
        contrib_after_seat: Number(r[actMap['contrib_after_seat']] || 0),
        pot_after: Number(r[actMap['pot_after']] || 0),
        note: String(r[actMap['note']] || '')
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
  const base = new Date(); // v3.8.0: PC 로컬 시간 (KST 대신)
  base.setHours(hh, mm, ss, 0);
  return base;
}

function updateExternalVirtual_(sheetId, detail, ext){
  if(!sheetId) return {updated:false, reason:'no-sheetId'};

  const ss = SpreadsheetApp.openById(sheetId);
  const sh = ss.getSheetByName('VIRTUAL') || ss.getSheets()[0];

  // v3.8.0: 매칭 행(B열 시간, PC 로컬 시간) — 역순 검색
  const last = sh.getLastRow(); if(last < 2) return {updated:false, reason:'no-rows'};

  const rngVals = sh.getRange(2,2,last-1,1).getValues();      // B열 원시 값
  const rngDisp = sh.getRange(2,2,last-1,1).getDisplayValues(); // B열 표시 값

  // v3.9.0: B열 시간 매칭 (로컬 HH:mm 직접 사용)
  const hhmmTime = detail.head?.started_at_local || extractTimeHHMM_(detail.head?.started_at);
  Logger.log('🔍 [EXT_VIRTUAL] B열 시간 매칭 시작 (PC 로컬 시간)');
  Logger.log('  핸드 시간: ' + hhmmTime);

  let pickRow = -1;
  for(let i=rngVals.length-1;i>=0;i--){
    const raw = rngVals[i][0];
    const disp = rngDisp[i][0];
    const actualRow = i + 2;

    // v3.9.0: B열 DisplayValue 직접 매칭 (HH:mm 형식 정규화)
    let cellHHMM = '';
    if(disp && typeof disp === 'string' && disp.includes(':')){
      const parts = String(disp).trim().split(':');
      if(parts.length >= 2){
        const hh = String(parts[0]).padStart(2, '0');
        const mm = String(parts[1]).padStart(2, '0');
        cellHHMM = `${hh}:${mm}`;
      }
    }

    if(cellHHMM === hhmmTime){
      pickRow = actualRow;
      Logger.log('✅ [EXT_VIRTUAL] 매칭 성공: Row ' + pickRow + ' (Time: ' + cellHHMM + ')');
      break;
    }
  }

  if(pickRow<0){
    log_('EXT_PICKROW',`no-match: ${hhmmTime}`);
    Logger.log('❌ [EXT_VIRTUAL] 실패: Time 매칭 없음 (목표: ' + hhmmTime + ')');
    return {updated:false, reason:`no-match: ${hhmmTime}`};
  }
  log_('EXT_PICKROW', `row=${pickRow} time=${hhmmTime}`);

  // 값 구성
  const E = '미완료';
  const G = 'A';
  const F = buildFileName_(detail);                            // 파일명
  const H = buildHistoryBlock_(detail, ext && toInt_(ext.bb)); // 3줄 요약
  const J = ''; // v1.1: 승자 자막 삭제

  log_('EXT_VALUES', `row=${pickRow} E=${E} F=${F} G=${G} H=${(H||'').slice(0,80)}... J(blank) K=버추얼 테이블`);

  // 비연속 컬럼 쓰기(E,F,G,H,J,K => 5,6,7,8,10,11)
  sh.getRange(pickRow, 5, 1, 1).setValue(E);
  sh.getRange(pickRow, 6, 1, 1).setValue(F);
  sh.getRange(pickRow, 7, 1, 1).setValue(G);
  sh.getRange(pickRow, 8, 1, 1).setValue(H);
  sh.getRange(pickRow,10, 1, 1).setValue(J);
  sh.getRange(pickRow,11, 1, 1).setValue('버추얼 테이블');

  log_('EXT_OK', `row=${pickRow}`);
  return {updated:true, row:pickRow};
}

/* ===== Review 모드 VIRTUAL 전송 ===== */
function sendHandToVirtual(hand_id, sheetId, payload){
  // v3.8.0: 파라미터 상세 검증
  Logger.log('🔍 [DEBUG] sendHandToVirtual 호출됨');
  Logger.log('  hand_id: ' + JSON.stringify(hand_id) + ' (type: ' + typeof hand_id + ')');
  Logger.log('  sheetId: ' + JSON.stringify(sheetId) + ' (type: ' + typeof sheetId + ')');
  Logger.log('  payload: ' + JSON.stringify(payload) + ' (type: ' + typeof payload + ')');

  if(!hand_id || String(hand_id).trim() === ''){
    Logger.log('❌ [ERROR] hand_id 비어있음 - hand_id: ' + hand_id);
    throw new Error('hand_id required (received: ' + JSON.stringify(hand_id) + ')');
  }
  if(!sheetId) throw new Error('sheetId required');
  if(!payload) throw new Error('payload required');

  return withScriptLock_(()=>{
    const payloadStr = JSON.stringify(payload);
    log_('PUSH_VIRTUAL_BEGIN', `hand_id=${hand_id} payload=${payloadStr}`, '');
    Logger.log('🚀 [VIRTUAL] 시작 - hand_id: ' + hand_id + ' sheetId: ' + sheetId + ' payload: ' + payloadStr);

    // ⏱️ 성능 측정 시작
    const perfTimer = {
      start: Date.now(),
      steps: {}
    };

    // 1. 핸드 상세 조회 (캐시 사용)
    const t1 = Date.now();
    const detail = getCachedHandDetail_(hand_id);
    if(!detail || !detail.head){
      console.log(`❌ [VIRTUAL] Hand not found: ${hand_id}`);
      throw new Error('Hand not found');
    }
    perfTimer.steps.getHandDetail = Date.now() - t1;

    const head = detail.head;
    // v3.8.0: started_at은 클라이언트 PC 로컬 시간의 ISO 형식 (UTC 변환됨)
    const isoTime = head.started_at || new Date().toISOString();
    Logger.log('📋 [VIRTUAL] 핸드 상세: table_id=' + head.table_id + ' hand_no=' + head.hand_no + ' started_at=' + isoTime + ' (PC 로컬 시간 기준)');

    // 2. VIRTUAL 시트 열기
    const t2 = Date.now();
    const ss = SpreadsheetApp.openById(sheetId);
    const sh = ss.getSheetByName('VIRTUAL') || ss.getSheets()[0];
    const sheetName = sh.getName();
    const last = sh.getLastRow();
    perfTimer.steps.openSheet = Date.now() - t2;
    Logger.log('📄 [VIRTUAL] 타겟 시트: sheetId=' + sheetId + ' sheetName=' + sheetName + ' lastRow=' + last);

    if(last < 2){
      log_('PUSH_VIRTUAL_FAIL', 'no-rows', '');
      Logger.log('❌ [VIRTUAL] 실패: 데이터 행 없음 (lastRow < 2)');
      return {success:false, reason:'no-rows'};
    }

    // 3. B열 시간 매칭 (Cyprus PC 로컬 시간) - v3.9.9 수정
    const t3 = Date.now();
    // v3.9.0: started_at_local 우선 사용 (클라이언트가 로컬 HH:mm 전송)
    const hhmmTime = head.started_at_local || extractTimeHHMM_(isoTime);

    // v3.9.0: 전체 스캔 (VIRTUAL 시트는 00:00~23:59 순서이므로 시간 기반 캐싱 불가)
    const startRow = 2;
    const scanRows = last - startRow + 1;

    Logger.log('🔍 [VIRTUAL] B열 시간 매칭 시작 (Cyprus PC 로컬 시간)');
    Logger.log('  핸드 시간: ' + hhmmTime);
    Logger.log('  📍 전체 스캔: Row ' + startRow + '~' + last + ' (' + scanRows + '행)');

    const rngVals = sh.getRange(startRow, 2, scanRows, 1).getValues();      // B열 원시 값 (Cyprus 시간)
    const rngDisp = sh.getRange(startRow, 2, scanRows, 1).getDisplayValues(); // B열 표시 값
    const rngE = sh.getRange(startRow, 5, scanRows, 1).getValues();          // E열 상태
    perfTimer.steps.readColumns = Date.now() - t3;

    let pickRow = -1;
    let debugInfo = [];
    const t4 = Date.now();

    // v3.8.0: 순방향 스캔 (시간순 정렬 활용, 평균 탐색 50% 개선)
    // VIRTUAL 시트는 06:00 → 23:59 순서이므로 순방향이 효율적
    for(let i = 0; i < rngVals.length; i++){
      const raw = rngVals[i][0];
      const disp = rngDisp[i][0];
      const eVal = rngE[i][0];

      // v3.9.9: B열 DisplayValue 직접 매칭 (HH:mm 형식 정규화)
      let cellHHMM = '';
      if(disp && typeof disp === 'string' && disp.includes(':')){
        const parts = String(disp).trim().split(':');
        if(parts.length >= 2){
          const hh = String(parts[0]).padStart(2, '0');
          const mm = String(parts[1]).padStart(2, '0');
          cellHHMM = `${hh}:${mm}`; // "17:23" 형식으로 정규화
        }
      }

      const actualRow = startRow + i;

      // v3.9.6: 디버그 정보 전체 저장 (매칭 실패 시 전체 범위 확인 필요)
      debugInfo.push(`Row ${actualRow}: "${cellHHMM}" raw=${raw} disp="${disp}" (E=${eVal})`);

      if(cellHHMM === hhmmTime){
        // v3.9.5: E열 상태 무시 - 시간 매칭되면 무조건 덮어쓰기
        pickRow = actualRow;
        const eStatus = String(eVal || '').trim() || '(빈칸)';
        Logger.log('✅ [VIRTUAL] 매칭 성공: Row ' + pickRow + ' (B열 Cyprus: ' + cellHHMM + ', E열: ' + eStatus + ') - 검색: ' + (i+1) + '/' + rngVals.length + '행');
        break;
      }
    }
    perfTimer.steps.scanRows = Date.now() - t4;

    if(pickRow < 0){
      log_('PUSH_VIRTUAL_FAIL', `no-match: ${hhmmTime}`, '');
      Logger.log('❌ [VIRTUAL] 실패: Time 매칭 없음 (목표: ' + hhmmTime + ')');
      Logger.log('🔍 [VIRTUAL] 검색된 행들 (최근 10개):');
      debugInfo.slice(0, 10).forEach(info => Logger.log('  ' + info));

      // v3.9.6: 전체 디버그 정보 반환 (매칭 실패 원인 파악)
      return {
        success: false,
        reason: `no-match: ${hhmmTime}`,
        debug: {
          target: hhmmTime,
          totalScanned: debugInfo.length,
          scanned: debugInfo // 전체 행 정보 (최대 1440개 - 00:00~23:59)
        }
      };
    }

    log_('PUSH_VIRTUAL_ROW', `row=${pickRow} time=${hhmmTime}`, '');

    // 4. 값 구성 (최적화: 로깅 최소화)
    const t5 = Date.now();
    const E = '수정 중'; // v3.9.10: E열 데이터 확인 규칙 준수
    const F = buildFileName_(detail);
    const G = 'A';
    const H = buildHistoryBlock_(detail, payload.bbOverride || 0);
    const J = buildSubtitle_(detail, payload);
    perfTimer.steps.buildValues = Date.now() - t5;

    console.log('📝 [VIRTUAL] 값 생성 완료: F=' + F.slice(0, 30) + '... J=' + (J ? J.slice(0, 30) + '...' : '(빈값)'));

    // J열 상세 디버깅 (빈 값인 경우만)
    if(!J || J.length === 0){
      console.log('⚠️ [VIRTUAL] J열 경고: 빈 문자열 생성됨');
      const tableId = head.table_id;
      const rosterData = getCachedRoster_();
      console.log('🔍 [VIRTUAL] 디버깅: tableId=' + tableId + ' roster 존재=' + !!(rosterData.roster && rosterData.roster[tableId]));

      if(rosterData.roster && rosterData.roster[tableId]){
        const rosterList = rosterData.roster[tableId];
        const participants = participantsOrdered_(detail);
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

    // 5. 비연속 컬럼 쓰기 (E,F,G,H,J,K => 5,6,7,8,10,11)
    console.log('💾 [VIRTUAL] 시트 쓰기 시작');
    console.log('  📄 시트 정보:');
    console.log('    - 스프레드시트 ID: ' + sheetId);
    console.log('    - 스프레드시트 이름: ' + ss.getName());
    console.log('    - 시트명: ' + sheetName);
    console.log('    - 대상 행(Row): ' + pickRow);
    console.log('    - 시트 URL: ' + ss.getUrl());
    console.log('');

    const t6 = Date.now();
    sh.getRange(pickRow, 5, 1, 1).setValue(E);
    console.log('  ✓ E열 (col 5) 완료 - 입력값: ' + E);
    sh.getRange(pickRow, 6, 1, 1).setValue(F);
    console.log('  ✓ F열 (col 6) 완료 - 입력값: ' + F.slice(0, 50) + '...');
    sh.getRange(pickRow, 7, 1, 1).setValue(G);
    console.log('  ✓ G열 (col 7) 완료 - 입력값: ' + G);
    sh.getRange(pickRow, 8, 1, 1).setValue(H);
    console.log('  ✓ H열 (col 8) 완료 - 입력값: ' + H.slice(0, 50) + '...');
    sh.getRange(pickRow,10, 1, 1).setValue(J);
    console.log('  ✓ J열 (col 10) 완료 - 입력값: ' + J.slice(0, 100) + (J.length > 100 ? '...' : ''));
    sh.getRange(pickRow,11, 1, 1).setValue('버추얼 테이블');
    console.log('  ✓ K열 (col 11) 완료 - 입력값: 버추얼 테이블');
    perfTimer.steps.writeSheet = Date.now() - t6;

    // ✅ 검증: 실제로 쓰여진 값 확인
    console.log('');
    console.log('🔍 [VIRTUAL] 쓰기 후 검증 (Row ' + pickRow + ' 실제 값 확인):');
    const verifyE = sh.getRange(pickRow, 5, 1, 1).getValue();
    const verifyF = sh.getRange(pickRow, 6, 1, 1).getValue();
    const verifyG = sh.getRange(pickRow, 7, 1, 1).getValue();
    const verifyH = sh.getRange(pickRow, 8, 1, 1).getValue();
    const verifyJ = sh.getRange(pickRow, 10, 1, 1).getValue();
    const verifyK = sh.getRange(pickRow, 11, 1, 1).getValue();
    console.log('  E열 실제값: ' + verifyE);
    console.log('  F열 실제값: ' + String(verifyF).slice(0, 50) + '...');
    console.log('  G열 실제값: ' + verifyG);
    console.log('  H열 실제값: ' + String(verifyH).slice(0, 50) + '...');
    console.log('  J열 실제값: ' + String(verifyJ).slice(0, 100) + (String(verifyJ).length > 100 ? '...' : ''));
    console.log('  K열 실제값: ' + verifyK);
    console.log('');

    // ⏱️ 성능 측정 결과 출력
    perfTimer.total = Date.now() - perfTimer.start;
    Logger.log('⏱️ [PERF] VIRTUAL 전송 성능 분석:');
    Logger.log('  ├─ 핸드 상세 조회: ' + perfTimer.steps.getHandDetail + 'ms');
    Logger.log('  ├─ 시트 열기: ' + perfTimer.steps.openSheet + 'ms');
    Logger.log('  ├─ 컬럼 읽기 (' + (last-1) + '행): ' + perfTimer.steps.readColumns + 'ms');
    Logger.log('  ├─ 행 스캔 (' + (last-1) + '행): ' + perfTimer.steps.scanRows + 'ms');
    Logger.log('  ├─ 값 생성: ' + perfTimer.steps.buildValues + 'ms');
    Logger.log('  ├─ 시트 쓰기: ' + perfTimer.steps.writeSheet + 'ms');
    Logger.log('  └─ 총 소요 시간: ' + perfTimer.total + 'ms');
    Logger.log('');
    Logger.log('📊 [PERF] 병목 분석:');
    const bottleneck = Object.keys(perfTimer.steps).reduce((max, key) =>
      perfTimer.steps[key] > perfTimer.steps[max] ? key : max
    );
    Logger.log('  🔴 가장 느린 단계: ' + bottleneck + ' (' + perfTimer.steps[bottleneck] + 'ms, ' +
      Math.round(perfTimer.steps[bottleneck] / perfTimer.total * 100) + '%)');

    log_('PUSH_VIRTUAL_OK', `row=${pickRow}`, '');
    const result = {success:true, row:pickRow, perf:perfTimer};
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
    start_street:String(p.start_street||''), started_at:String(p.started_at||''), started_at_local:String(p.started_at_local||''), ended_at:String(p.ended_at||''),
    board:{f1:b.f1||'',f2:b.f2||'',f3:b.f3||'',turn:b.turn||'',river:b.river||''},
    pre_pot:Number(p.pre_pot||0), winner_seat:'', pot_final:String(p.pot_final||''),
    stacks_json: JSON.stringify(p.stack_snapshot||{}), holes_json: JSON.stringify(p.holes||{})
  };
}

function buildFileName_(detail){
  const head=detail.head||{};

  // 1. 등록시간 (v3.9.0: started_at_local 우선 사용)
  const timeHHMM = head.started_at_local || extractTimeHHMM_(head.started_at || '');
  const timeFormatted = timeHHMM.replace(':', ''); // "14:30" → "1430"

  // 2. hand_no를 4자리 숫자로 포맷팅 (0001~9999)
  const handNo = String(head.hand_no || '0').padStart(4, '0');

  // 3. 키플레이어 이름 추출
  const keyplayerName = extractKeyplayerName_(head.table_id, detail);

  // 4. 핸드 요약 생성
  const handSummary = generateHandSummary_(detail);

  // 형식: {HHMM}_VT{XXXX}_{키플레이어}_{핸드}
  // 예: 1430_VT0127_Smith_AKvsQQ
  return `${timeFormatted}_VT${handNo}_${keyplayerName}_${handSummary}`;
}

/* === 키플레이어 이름 추출 (최대 20자) === */
function extractKeyplayerName_(tableId, detail){
  const seatsOrder = participantsOrdered_(detail);
  const rosterData = getCachedRoster_();
  const rosterList = (rosterData.roster && rosterData.roster[tableId]) || [];

  // 키플레이어만 필터링
  const keyPlayers = seatsOrder
    .map(seatStr => rosterList.find(p => String(p.seat) === String(seatStr)))
    .filter(p => p && p.keyplayer);

  if(keyPlayers.length === 0){
    // 키플레이어 없으면 첫 번째 참가자 사용
    const firstPlayer = seatsOrder
      .map(seatStr => rosterList.find(p => String(p.seat) === String(seatStr)))
      .filter(Boolean)[0];

    return firstPlayer ? extractLastName_(firstPlayer.player) : 'Unknown';
  }

  // 1명: 성만
  if(keyPlayers.length === 1){
    return extractLastName_(keyPlayers[0].player);
  }

  // 2명: 하이픈 연결
  if(keyPlayers.length === 2){
    const name1 = extractLastName_(keyPlayers[0].player);
    const name2 = extractLastName_(keyPlayers[1].player);
    return `${name1}-${name2}`;
  }

  // 3명 이상: 첫 2명 + 숫자
  const name1 = extractLastName_(keyPlayers[0].player);
  const name2 = extractLastName_(keyPlayers[1].player);
  const extra = keyPlayers.length - 2;
  return `${name1}-${name2}+${extra}`;
}

/* === 성(Last Name) 추출 === */
function extractLastName_(fullName){
  if(!fullName) return 'Unknown';
  const parts = String(fullName).trim().split(/\s+/);

  // 1단어: 전체 사용
  if(parts.length === 1) return parts[0];

  // 2단어 이상: 마지막 단어 (성)
  return parts[parts.length - 1];
}

/* === 핸드 요약 생성 (최대 15자) === */
function generateHandSummary_(detail){
  const head = detail.head || {};
  const acts = detail.acts || [];
  const seatsOrder = participantsOrdered_(detail);

  // 보드 카드 수 확인
  const board = [head.board?.f1, head.board?.f2, head.board?.f3, head.board?.turn, head.board?.river].filter(Boolean);
  const boardCount = board.length;

  // 홀카드 정보
  const holes = safeParseJson_(head.holes_json || '{}');

  // 프리플랍 올인 (보드 없음)
  if(boardCount === 0){
    // 2명 핸드: 홀카드 대결
    if(seatsOrder.length === 2){
      const h1 = holes2_(head.holes_json, seatsOrder[0]);
      const h2 = holes2_(head.holes_json, seatsOrder[1]);

      if(h1 && h2){
        const hand1 = simplifyHoleCards_(h1);
        const hand2 = simplifyHoleCards_(h2);
        return `${hand1}vs${hand2}`;
      }
    }
    return 'Preflop';
  }

  // 플랍 이후: 특징 분석
  if(boardCount >= 3){
    // Flush 가능성 체크
    const suits = board.map(c => cardCode_(c).slice(-1));
    const suitCounts = {};
    suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
    const maxSuitCount = Math.max(...Object.values(suitCounts));

    if(maxSuitCount >= 3){
      return 'FlushDraw';
    }

    // Straight 가능성 체크 (간단한 로직)
    const ranks = board.map(c => {
      const r = cardCode_(c).slice(0, -1);
      const rankMap = {A:14,K:13,Q:12,J:11,T:10};
      return rankMap[r] || parseInt(r, 10);
    }).sort((a,b) => b-a);

    if(ranks.length >= 3 && (ranks[0] - ranks[ranks.length-1]) <= 4){
      return 'StraightDraw';
    }
  }

  // 기본: 스트릿 표시
  if(boardCount === 3) return 'Flop';
  if(boardCount === 4) return 'Turn';
  if(boardCount === 5) return 'River';

  return 'Unknown';
}

/* === 홀카드 간소화 (AsAh → AA) === */
function simplifyHoleCards_(holeArray){
  if(!holeArray || holeArray.length !== 2) return 'XX';

  const c1 = cardCode_(holeArray[0]);
  const c2 = cardCode_(holeArray[1]);

  if(!c1 || !c2) return 'XX';

  const r1 = c1.slice(0, -1);
  const r2 = c2.slice(0, -1);
  const s1 = c1.slice(-1);
  const s2 = c2.slice(-1);

  // 페어: AA, KK, QQ
  if(r1 === r2) return r1 + r1;

  // 수티드: AKs, QJs
  if(s1 === s2) return r1 + r2 + 's';

  // 오프수티드: AKo, QJo
  return r1 + r2 + 'o';
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
  const r = getCachedRoster_().roster || {}; const arr = r[tableId]||[];
  const one = arr.find(x=>String(x.seat)===String(seat));
  if(!one || !one.player) return `S${seat}`;
  const parts = String(one.player).trim().split(/\s+/);
  if(parts.length===1) return parts[0];
  const first=parts[0], last=parts.slice(1).join(' ');
  return `${(first[0]||'').toUpperCase()}-${last}`;
}
function nationOf_(tableId, seat){
  const r = getCachedRoster_().roster || {}; const arr = r[tableId]||[];
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

/* === J열 자막 (선택된 플레이어) === */
function buildSubtitle_(detail, payload){
  const head = detail.head || {};
  const tableId = head.table_id;

  // payload 구조 분해
  const selectedSeats = payload.selectedSeats || [];
  const eliminatedSeats = payload.eliminatedSeats || [];
  const stackOverrides = payload.stackOverrides || {};
  const bb = payload.bbOverride || 0;

  if(selectedSeats.length === 0) return ''; // 선택된 플레이어 없음

  // v3.6.3: 캐시된 Roster 사용 (readRoster_ → getCachedRoster_)
  const rosterData = getCachedRoster_();
  const rosterList = (rosterData.roster && rosterData.roster[tableId]) || [];

  // 🔧 v3.3.2: selectedSeats에 포함된 모든 플레이어 자막 생성 (keyplayer 무관)
  const selectedPlayers = selectedSeats
    .map(seatStr => rosterList.find(p => String(p.seat) === String(seatStr)))
    .filter(Boolean); // undefined 제거

  if(selectedPlayers.length === 0) {
    Logger.log('⚠️ [SUBTITLE] 선택된 플레이어의 roster 정보 없음');
    return '';
  }

  // 🔧 v3.0.0: eliminatedSeats 배열 처리 (복수 플레이어 개별 탈락 표시)
  const eliminatedSet = new Set((eliminatedSeats || []).map(String));

  // 각 선택된 플레이어별 자막 생성 (최적화: 로깅 제거)
  const lines = selectedPlayers.map(p => {
    const seatStr = String(p.seat);
    const name = p.player || `S${seatStr}`;
    const nation = p.nation || '';
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
  // v3.9.7: 로컬 시간 사용 (VIRTUAL 시트 B열은 PC 로컬 시간)
  // started_at은 클라이언트 PC 로컬 시간을 ISO로 변환한 값이므로
  // getHours()/getMinutes()로 로컬 시간 추출 (타임존 무관)
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

/* ===== 성능 측정 테스트 함수 ===== */
/**
 * VIRTUAL 전송 성능 측정 테스트
 * Apps Script Editor에서 실행 가능
 *
 * 사용법:
 * 1. 아래 변수를 실제 값으로 수정
 * 2. Apps Script Editor에서 실행 > 함수 실행 > testVirtualPerformance
 * 3. 실행 로그 확인 (Ctrl+Enter)
 */
function testVirtualPerformance(){
  // ⚠️ 테스트 전에 수정 필요
  const TEST_HAND_ID = '20251017_023200765'; // 실제 hand_id로 변경
  const TEST_VIRTUAL_SHEET_ID = ''; // VIRTUAL 시트가 있는 스프레드시트 ID
  const TEST_PAYLOAD = {
    selectedSeats: ['4', '7'], // 테스트용 좌석
    eliminatedSeats: [],
    stackOverrides: {},
    bbOverride: 2000
  };

  Logger.log('🧪 [TEST] VIRTUAL 성능 측정 시작');
  Logger.log('  Hand ID: ' + TEST_HAND_ID);
  Logger.log('  Sheet ID: ' + TEST_VIRTUAL_SHEET_ID);

  if(!TEST_VIRTUAL_SHEET_ID || TEST_VIRTUAL_SHEET_ID === ''){
    Logger.log('❌ [TEST] 실패: TEST_VIRTUAL_SHEET_ID를 설정하세요');
    Logger.log('');
    Logger.log('💡 설정 방법:');
    Logger.log('  1. VIRTUAL 시트가 있는 스프레드시트 열기');
    Logger.log('  2. URL에서 ID 복사 (https://docs.google.com/spreadsheets/d/{여기}/edit)');
    Logger.log('  3. code.gs의 TEST_VIRTUAL_SHEET_ID 변수에 붙여넣기');
    return;
  }

  try {
    const result = sendHandToVirtual(TEST_HAND_ID, TEST_VIRTUAL_SHEET_ID, TEST_PAYLOAD);

    Logger.log('');
    Logger.log('✅ [TEST] 성공!');
    Logger.log('  Row 업데이트: ' + result.row);
    Logger.log('');
    Logger.log('📊 [TEST] 성능 요약:');
    if(result.perf){
      const p = result.perf;
      Logger.log('  총 소요 시간: ' + p.total + 'ms');
      Logger.log('  ├─ 핸드 조회: ' + p.steps.getHandDetail + 'ms (' + Math.round(p.steps.getHandDetail/p.total*100) + '%)');
      Logger.log('  ├─ 시트 열기: ' + p.steps.openSheet + 'ms (' + Math.round(p.steps.openSheet/p.total*100) + '%)');
      Logger.log('  ├─ 컬럼 읽기: ' + p.steps.readColumns + 'ms (' + Math.round(p.steps.readColumns/p.total*100) + '%)');
      Logger.log('  ├─ 행 스캔: ' + p.steps.scanRows + 'ms (' + Math.round(p.steps.scanRows/p.total*100) + '%)');
      Logger.log('  ├─ 값 생성: ' + p.steps.buildValues + 'ms (' + Math.round(p.steps.buildValues/p.total*100) + '%)');
      Logger.log('  └─ 시트 쓰기: ' + p.steps.writeSheet + 'ms (' + Math.round(p.steps.writeSheet/p.total*100) + '%)');

      Logger.log('');
      Logger.log('🔍 [TEST] 병목 분석:');
      const bottleneck = Object.keys(p.steps).reduce((max, key) =>
        p.steps[key] > p.steps[max] ? key : max
      );
      const pct = Math.round(p.steps[bottleneck] / p.total * 100);
      Logger.log('  🔴 가장 느린 작업: ' + bottleneck + ' (' + p.steps[bottleneck] + 'ms, ' + pct + '%)');

      // 진단
      Logger.log('');
      Logger.log('💡 [TEST] 진단:');
      if(p.steps.readColumns + p.steps.scanRows > p.total * 0.7){
        Logger.log('  ⚠️ VIRTUAL 시트 크기가 성능에 큰 영향을 미칩니다');
        Logger.log('  📌 권장: 역순 스캔 또는 인덱스 컬럼 추가');
      }
      if(p.steps.openSheet > 1000){
        Logger.log('  ⚠️ 시트 열기가 느립니다 (복잡한 수식 또는 대용량 시트)');
      }
      if(p.steps.buildValues > 500){
        Logger.log('  ⚠️ 값 생성 로직 최적화 필요');
      }
    }
  } catch(e) {
    Logger.log('');
    Logger.log('❌ [TEST] 실패: ' + e.message);
    Logger.log('  Stack: ' + e.stack);
  }
}
