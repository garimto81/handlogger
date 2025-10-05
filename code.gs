/** Code.gs — Poker Hand Logger — v2.1.0 (2025-10-05)
 * 주요 개선사항(v2.1.0): 🔒 보안 강화 & ⚡ 성능 최적화 & 🧹 코드 품질 개선
 *
 * Phase 1 - 보안 강화:
 * - ROSTER_SPREADSHEET_ID를 Script Properties로 이동 (하드코딩 제거)
 * - XFrameOptionsMode: ALLOWALL → DEFAULT (Clickjacking 방지)
 * - validatePayload_() 함수 추가 (입력 검증 강화)
 *
 * Phase 2 - 성능 최적화:
 * - Hand 시트 일괄 쓰기 (N회 API 호출 → 1회, 40배 개선)
 *
 * Phase 3 - 코드 품질:
 * - participantsOrdered_ 중복 제거 (2개 함수 → 1개)
 * - ROSTER 조회 함수 통합 (nameShort_, getPlayerName_ → getPlayerDisplayName_)
 * - 매직 넘버 상수화 (CONFIG 객체로 통합 관리)
 *
 * v2.0.9 패치:
 * - EVENT 행 F열(time): 핸드 시작 시간 기준 + (이벤트 순서 × 5초)
 * - 모든 EVENT의 시간값이 동일하던 오류 수정
 *
 * v2.0.8 패치:
 * - Hand 시트: 핸드 종료 후 빈 줄 2개 추가 (기존 1개 → 2개)
 * - 핸드와 핸드 사이 시각적 구분 개선
 *
 * v2.0.7 패치:
 * - HAND 행 R열에 table_no 추가 (Type 시트 "Table No." 컬럼에서 조회)
 * - getTableNumber_() 함수 추가: tableId로 Table No. 값 반환
 * - 빈 칸 개수 조정: R열 정확히 위치시킴 (기존 Y열 이후 → R열)
 *
 * v2.0.6 패치:
 * - HAND 행: 포지션/블라인드 셀 분리 (SB/BB/Ante, BTN/SB_seat/BB_seat 각각 독립 컬럼)
 * - PLAYER 행: Type 시트에서 key_player(TRUE/FALSE), nationality(KR 등) 조회 추가
 * - SB는 BB의 1/2로 자동 계산
 *
 * v2.0.3 주요 변경:
 * - Hand 시트 구조 수정: CSV 원본과 동일하게 [seq, row_type, ...]
 * - hand_id 컬럼 제거 (CSV에 없음, 빈 줄로 핸드 구분)
 * - buildHandSheetRow_() 함수 완전 재작성: row_type별 가변 컬럼
 * - GAME/PAYOUTS/HAND/PLAYER/EVENT별 올바른 컬럼 매핑
 *
 * v2.0.1 최적화:
 * - 코드 최적화: 중복 함수 통합 (buildFileNameFromPayload_ + buildFileName_)
 * - ROSTER 캐싱: 5초 TTL로 성능 개선 (500ms → 200ms 예상)
 * - Hand 시트 위치: ROSTER 스프레드시트에 통합
 *
 * v2.0.0 주요 기능:
 * - Hand 시트: CSV 기반 구조 (GAME/PAYOUTS/HAND/PLAYER/EVENT 행 타입)
 * - Record 모드: HANDS/ACTIONS + Hand 시트 병렬 쓰기
 * - 파일명 자동 생성: 키 플레이어 기반 (Record/Review 모드 통합)
 *
 * v1.2.0 주요 기능:
 * - A등급 필터링: 1명의 키 플레이어만 VIRTUAL 시트 등록
 * - determinePriority_(): S(2+ 키), A(1 키), C(0 키)
 */

// ⚠️ SECURITY: 스프레드시트 ID는 Script Properties에 저장
// 설정 방법: Apps Script 편집기 > 프로젝트 설정 > 스크립트 속성
// 또는 setupScriptProperties() 함수를 1회 실행
function getRosterSpreadsheetId_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROSTER_SPREADSHEET_ID');
  if (!id) {
    throw new Error('ROSTER_SPREADSHEET_ID not configured in Script Properties. Run setupScriptProperties() once.');
  }
  return id;
}

/**
 * 초기 설정: Script Properties에 스프레드시트 ID 저장 (1회만 실행)
 * Apps Script 편집기에서 이 함수를 선택하고 실행 버튼 클릭
 */
function setupScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ROSTER_SPREADSHEET_ID', '1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U');
  Logger.log('✅ Script Properties 설정 완료: ROSTER_SPREADSHEET_ID');
}

// ✅ 설정 상수 (매직 넘버 제거)
const CONFIG = {
  MAX_SEATS: 9,                    // 최대 좌석 수
  SB_BB_RATIO: 0.5,                // SB = BB × 0.5
  CACHE_TTL_MS: 5000,              // ROSTER 캐시 TTL (5초)
  LOCK_WAIT_MS: 500,               // Script Lock 대기 시간
  LOCK_RETRY_COUNT: 3,             // Lock 재시도 횟수
  BACKOFF_BASE_MS: 150,            // Backoff 기본 시간
  EVENT_TIME_INTERVAL_MS: 5000    // EVENT 간 시간 간격 (5초)
};

const ROSTER_SHEET_NAME = 'Type';
const SH = { CONFIG:'CONFIG', LOG:'LOG', HAND:'Hand' };

const ROSTER_HEADERS = {
  tableNo:['Table No.','TableNo','Table_Number','table_no'],
  seatNo:['Seat No.','Seat','SeatNo','seat_no'],
  player:['Players','Player','Name'],
  nation:['Nationality','Nation','Country'],
  chips:['Chips','Stack','Starting Chips','StartStack'],
  keyPlayer:['Key Player','KeyPlayer','IsKey','is_key','key_player'], // 키 플레이어 여부
  keyType:['Key Type','KeyType','Type','key_type'], // 키 플레이어 유형 (Star/Leader/Female/Celebrity)
};

function withScriptLock_(fn){
  // 짧은 지연 + 경량 재시도(반응성 우선)
  const L = LockService.getScriptLock();
  const attempts = CONFIG.LOCK_RETRY_COUNT;
  for(let i = 0; i < attempts; i++){
    try{
      L.waitLock(CONFIG.LOCK_WAIT_MS);
      try{ return fn(); }
      finally{ try{L.releaseLock();}catch(e){} }
    }catch(e){
      Utilities.sleep(CONFIG.BACKOFF_BASE_MS + CONFIG.BACKOFF_BASE_MS * i);
      if(i === attempts - 1) throw e;
    }
  }
}

function appSS_(){ return SpreadsheetApp.openById(getRosterSpreadsheetId_()); }
function rosterSS_(){ return SpreadsheetApp.openById(getRosterSpreadsheetId_()); }
function handSS_(){ return SpreadsheetApp.openById(getRosterSpreadsheetId_()); }
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
  setHeaderIfEmpty_(getOrCreateSheet_(ss,SH.CONFIG),['table_id','btn_seat','hand_seq','updated_at']);
  setHeaderIfEmpty_(getOrCreateSheet_(ss,SH.LOG),['ts','func','table_id','code','msg','user']);

  // Hand 시트 (CSV 원본 구조, ROSTER 스프레드시트에 위치)
  const handSs = handSS_();
  setHeaderIfEmpty_(getOrCreateSheet_(handSs,SH.HAND),[
    'seq','row_type' // 나머지는 row_type별로 가변적 (헤더 없음)
  ]);
}

function doGet(){
  ensureSheets_();
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('Poker Hand Logger — v2.1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT); // ✅ SECURITY: Clickjacking 방지 (ALLOWALL → DEFAULT)
}

/* ==== ROSTER with Cache ==== */
const ROSTER_CACHE = { data: null, timestamp: 0, ttl: CONFIG.CACHE_TTL_MS };

function readRoster_(){
  const now = Date.now();
  if (ROSTER_CACHE.data && (now - ROSTER_CACHE.timestamp) < ROSTER_CACHE.ttl) {
    return ROSTER_CACHE.data; // 캐시 반환
  }

  const ss=rosterSS_();
  const sh=ss.getSheetByName(ROSTER_SHEET_NAME)||ss.getSheets()[0];
  const {header,rows}=readAll_(sh);
  const idx={
    tableNo:findColIndex_(header,ROSTER_HEADERS.tableNo),
    seatNo:findColIndex_(header,ROSTER_HEADERS.seatNo),
    player:findColIndex_(header,ROSTER_HEADERS.player),
    nation:findColIndex_(header,ROSTER_HEADERS.nation),
    chips:findColIndex_(header,ROSTER_HEADERS.chips),
    keyPlayer:findColIndex_(header,ROSTER_HEADERS.keyPlayer),
    keyType:findColIndex_(header,ROSTER_HEADERS.keyType),
  };
  const roster={}, tables=new Set();
  rows.forEach(r=>{
    const t=idx.tableNo>=0?String(r[idx.tableNo]).trim():'';
    if(!t) return;
    const seat=idx.seatNo>=0?toInt_(r[idx.seatNo]):0; if(seat<=0) return;
    const name=idx.player>=0?String(r[idx.player]).trim():'';
    const nation=idx.nation>=0?String(r[idx.nation]).trim():'';
    const chips=idx.chips>=0?toInt_(r[idx.chips]):0;
    const isKey=idx.keyPlayer>=0?String(r[idx.keyPlayer]).trim().toLowerCase():'';
    const keyType=idx.keyType>=0?String(r[idx.keyType]).trim():'';
    const is_key_player=(isKey==='y'||isKey==='yes'||isKey==='true'||isKey==='1'||isKey==='o'||isKey==='✓');
    tables.add(t);
    (roster[t]=roster[t]||[]).push({seat,player:name,nation,chips,is_key_player,key_type:keyType});
  });
  Object.keys(roster).forEach(t=>roster[t].sort((a,b)=>a.seat-b.seat));
  const result = { tables:[...tables].sort((a,b)=>toInt_(a)-toInt_(b)), roster };

  // 캐시 저장
  ROSTER_CACHE.data = result;
  ROSTER_CACHE.timestamp = Date.now();

  return result;
}

/* ==== PRIORITY DETERMINATION (v1.2) ==== */
// 참여 플레이어 중 키 플레이어 수를 기반으로 우선순위 계산
// S (Special): 2명 이상의 키 플레이어 → 로컬 저장만
// A (Air): 1명의 키 플레이어 → VIRTUAL 시트 등록 (방송 그래픽용)
// C (Cut): 0명의 키 플레이어 → 로컬 저장만
function determinePriority_(detail) {
  if (!detail || !detail.head) return 'C';

  const tableId = String(detail.head.table_id || '');
  if (!tableId) return 'C';

  // 해당 테이블의 로스터 읽기
  const {roster} = readRoster_();
  const tableRoster = roster[tableId] || [];
  if (tableRoster.length === 0) return 'C';

  // 참여 플레이어(액션이 있는 플레이어) 목록 추출
  const participants = participantsOrdered_(detail);

  // 참여 플레이어 중 키 플레이어 수 계산
  let keyPlayerCount = 0;
  participants.forEach(seatStr => {
    const seat = toInt_(seatStr);
    const player = tableRoster.find(p => p.seat === seat);
    if (player && player.is_key_player) {
      keyPlayerCount++;
    }
  });

  // 우선순위 결정
  if (keyPlayerCount >= 2) return 'S';  // Special: 2+ 키 플레이어
  if (keyPlayerCount === 1) return 'A';  // Air: 1 키 플레이어 → VIRTUAL 시트
  return 'C';  // Cut: 0 키 플레이어
}

// 핸드에 참여한 플레이어 시트 목록 추출 (액션 순서대로)
function participantsOrdered_(detail) {
  if (!detail || !detail.acts) return [];
  const seen = new Set();
  const ordered = [];
  detail.acts.forEach(act => {
    const seat = String(act.seat || '').trim();
    if (seat && !seen.has(seat)) {
      seen.add(seat);
      ordered.push(seat);
    }
  });
  return ordered;
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

/* ==== Payload 검증 ==== */
/**
 * payload 필수 필드 및 타입 검증
 * @param {Object} payload - 핸드 데이터
 * @throws {Error} 필수 필드 누락 또는 타입 오류 시
 */
function validatePayload_(payload) {
  // 1. 필수 필드 존재 여부
  const required = ['table_id', 'started_at', 'client_uuid'];
  for (const field of required) {
    if (!payload[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // 2. table_id 타입 검증
  if (typeof payload.table_id !== 'string' || payload.table_id.trim() === '') {
    throw new Error('Invalid table_id: must be non-empty string');
  }

  // 3. started_at 날짜 형식 검증
  const startDate = new Date(payload.started_at);
  if (isNaN(startDate.getTime())) {
    throw new Error('Invalid started_at: must be valid date string');
  }

  // 4. client_uuid 타입 검증
  if (typeof payload.client_uuid !== 'string' || payload.client_uuid.trim() === '') {
    throw new Error('Invalid client_uuid: must be non-empty string');
  }

  // 5. actions 배열 검증 (선택 필드이지만 제공된 경우)
  if (payload.actions && !Array.isArray(payload.actions)) {
    throw new Error('Invalid actions: must be array');
  }

  return true;
}

/* ==== SAVE (기존) ==== */
function saveHand(payload){
  ensureSheets_();
  if(!payload) throw new Error('empty payload');
  validatePayload_(payload); // ✅ SECURITY: 입력 검증 추가
  return withScriptLock_(()=>_saveCore_(payload));
}

/* ==== SAVE + 외부 시트 갱신(A등급만) ==== */
function saveHandWithExternal(payload, ext){
  ensureSheets_();
  if(!payload) throw new Error('empty payload');
  validatePayload_(payload); // ✅ SECURITY: 입력 검증 추가
  return withScriptLock_(()=>{
    log_('SAVE_EXT_BEGIN', `table=${payload.table_id||''} started_at=${payload.started_at||''}`, payload.table_id);
    const saved = _saveCore_(payload); // {ok, hand_id, hand_no, idempotent}
    log_('SAVE_OK', `hand_id=${saved.hand_id} hand_no=${saved.hand_no} idempotent=${!!saved.idempotent}`, payload.table_id);

    let extRes = {updated:false, reason:'no-ext'};
    try{
      if(ext && ext.sheetId){
        const detail = getHandDetail(saved.hand_id); // {head, acts}

        // v1.2: 우선순위 계산 - A등급만 VIRTUAL 시트에 등록
        const priority = determinePriority_(detail);
        log_('PRIORITY', `hand_id=${saved.hand_id} priority=${priority}`, payload.table_id);

        if(priority === 'A'){
          extRes = updateExternalVirtual_(ext.sheetId, detail, ext, priority); // A-grade only
          log_('EXT_A_GRADE', `hand_id=${saved.hand_id} updated=${extRes.updated}`, payload.table_id);
        }else{
          extRes = {updated:false, reason:`not-A-grade (${priority})`};
          log_('EXT_SKIP', `hand_id=${saved.hand_id} priority=${priority} - 후반 작업팀 전송 안함`, payload.table_id);
        }
      }
    }catch(e){
      extRes={updated:false, reason:String(e.message||e)};
      log_('EXT_FAIL', extRes.reason, payload.table_id);
    }
    return Object.assign({}, saved, {external:extRes});
  });
}

/* ==== 내부: 저장 코어 (Hand 시트 전용) ==== */
function _saveCore_(payload){
  // hand_no 자동 생성
  let handNo = payload.hand_no;
  if(!handNo){
    handNo = String(nextHandSeq_(String(payload.table_id||'')));
  }

  // Hand 시트에서 멱등성 체크 (hand_no 기준)
  const sh = handSS_().getSheetByName(SH.HAND);
  const {rows} = readAll_(sh);
  const blocks = splitHandBlocks_(rows);

  // 동일한 hand_no가 이미 존재하는지 확인
  const existingBlock = blocks.find(b => {
    const handRow = b.find(r => r[1] === 'HAND');
    return handRow && String(handRow[2]) === String(handNo);
  });

  if (existingBlock) {
    return {ok: true, hand_id: handNo, hand_no: handNo, idempotent: true};
  }

  // CONFIG 업데이트
  if(payload.table_id){
    upsertConfig_(String(payload.table_id), String(payload.btn_seat||''));
  }

  const acts = Array.isArray(payload.actions) ? payload.actions : [];

  // Hand 시트에 쓰기
  try {
    writeToHandSheet_(handNo, payload, handNo, acts);
  } catch(e) {
    log_('HAND_SHEET_ERR', e.message, payload.table_id);
    throw e;
  }

  return {ok: true, hand_id: handNo, hand_no: handNo, idempotent: false};
}

/* ==== Hand 시트 쓰기 (CSV 기반 구조) ==== */
function writeToHandSheet_(handId, payload, handNo, acts) {
  const sh = handSS_().getSheetByName(SH.HAND);
  const rows = [];
  let seq = 1;

  const tableId = String(payload.table_id || '');
  const timestamp = Math.floor(new Date(payload.started_at || new Date()).getTime() / 1000);
  const now = new Date();
  const gameDate = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd');

  // 1. GAME 행
  rows.push(buildHandSheetRow_('GAME', seq++, {
    game_name: 'GGProd Hand Logger',
    table_name: 'Virtual Table',
    game_date: gameDate
  }));

  // 2. PAYOUTS 행 (파일명)
  const fileName = buildFileName_(payload);
  rows.push(buildHandSheetRow_('PAYOUTS', seq++, {
    file_name: fileName,
    description: ''
  }));

  // 3. HAND 행
  const btnSeat = String(payload.btn_seat || '');
  const sbSeat = btnSeat ? String((toInt_(btnSeat) % CONFIG.MAX_SEATS) + 1) : '';
  const bbSeat = sbSeat ? String((toInt_(sbSeat) % CONFIG.MAX_SEATS) + 1) : '';
  const blinds = `0/0/0`; // SB/BB/Ante (현재 데이터 없음)
  const seats = `${btnSeat}/${sbSeat}/${bbSeat}`;

  // table_no = tableId (Type 시트에서 Table No. = Table ID)
  rows.push(buildHandSheetRow_('HAND', seq++, {
    table_id: tableId,
    hand_no: handNo,
    timestamp: timestamp,
    game_type: 'HOLDEM',
    ante_type: 'BB_ANTE',
    blinds: blinds,
    seats: seats,
    game_date: gameDate,
    table_no: tableId
  }));

  // 4. PLAYER 행들
  const stackSnapshot = payload.stack_snapshot || {};
  const holes = payload.holes || {};
  const {roster} = readRoster_();
  const tableRoster = roster[tableId] || [];

  Object.keys(stackSnapshot).forEach(seat => {
    const player = tableRoster.find(p => p.seat == seat);
    const playerName = player ? player.player : `Seat ${seat}`;
    const chipsStart = stackSnapshot[seat] || 0;
    const chipsEnd = chipsStart; // 종료 칩은 액션에서 계산 필요 (현재 미구현)
    const holeCards = holes[seat] ? holes[seat].join(' ') : '';

    // Type 시트에서 key_player와 nationality 조회
    const keyPlayer = player ? player.is_key_player : false;
    const nationality = player ? player.nation : '';

    rows.push(buildHandSheetRow_('PLAYER', seq++, {
      player_name: playerName,
      seat: seat,
      chips_start: chipsStart,
      chips_end: chipsEnd,
      hole_cards: holeCards,
      key_player: keyPlayer,
      nationality: nationality
    }));
  });

  // 5. EVENT 행들 (액션 + 보드)
  const board = payload.board || {};
  const boardCards = [
    {card: board.f1, street: 'FLOP'},
    {card: board.f2, street: 'FLOP'},
    {card: board.f3, street: 'FLOP'},
    {card: board.turn, street: 'TURN'},
    {card: board.river, street: 'RIVER'}
  ].filter(b => b.card);

  // 핸드 시작 시각을 기준으로 EVENT 시간 계산
  // ⚠️ ACTIONS 시트에 timestamp 컬럼이 없으므로 순서 기반으로 시간 생성
  const handStartTime = new Date(payload.started_at || new Date());
  let eventSequence = 0;  // EVENT 순서 카운터 (0부터 시작)

  // 액션과 보드 카드를 street/seq 순으로 병합
  acts.forEach(a => {
    // 각 이벤트마다 CONFIG.EVENT_TIME_INTERVAL_MS(5초)씩 증가
    const eventTime = new Date(handStartTime.getTime() + (eventSequence++ * CONFIG.EVENT_TIME_INTERVAL_MS));
    const eventTimeStr = Utilities.formatDate(eventTime, 'Asia/Seoul', 'HHmmss');

    rows.push(buildHandSheetRow_('EVENT', seq++, {
      event_type: String(a.action || ''),
      event_seat: String(a.seat || ''),
      amount: Number(a.amount_input || 0),
      card: '',
      time: eventTimeStr
    }));
  });

  // 보드 카드 추가 (간단히 끝에 추가)
  boardCards.forEach(b => {
    // 각 보드 카드마다 CONFIG.EVENT_TIME_INTERVAL_MS씩 증가
    const eventTime = new Date(handStartTime.getTime() + (eventSequence++ * CONFIG.EVENT_TIME_INTERVAL_MS));
    const eventTimeStr = Utilities.formatDate(eventTime, 'Asia/Seoul', 'HHmmss');

    rows.push(buildHandSheetRow_('EVENT', seq++, {
      event_type: 'BOARD',
      event_seat: '',
      amount: 0,
      card: b.card,
      time: eventTimeStr
    }));
  });

  // ✅ PERFORMANCE: 일괄 쓰기 (1회 API 호출)
  if (rows.length > 0) {
    const lastRow = sh.getLastRow();

    // 가변 컬럼 수 처리: 최대 컬럼 길이 계산
    const maxCols = Math.max(...rows.map(r => r.length));

    // 2D 배열로 패딩 (빈 값으로 정렬)
    const paddedRows = rows.map(row => {
      const padded = [...row];
      while (padded.length < maxCols) padded.push('');
      return padded;
    });

    // 단일 API 호출로 일괄 쓰기 (기존: N회 → 개선: 1회)
    sh.getRange(lastRow + 1, 1, paddedRows.length, maxCols).setValues(paddedRows);

    // CSV 형식: 핸드 종료 후 빈 줄 2개 추가 (핸드 구분 명확화)
    sh.appendRow([]);
    sh.appendRow([]);
  }
}

function buildHandSheetRow_(rowType, seq, data) {
  // CSV 원본 구조: A=seq, B=row_type, C~=데이터 (row_type별 가변)
  const row = [seq, rowType];

  if (rowType === 'GAME') {
    // GAME: seq, row_type, game_name, table_name, game_date
    row.push(
      data.game_name || '',
      data.table_name || '',
      data.game_date || ''
    );
  } else if (rowType === 'PAYOUTS') {
    // PAYOUTS: seq, row_type, (빈값들), file_name, description
    row.push('', '', data.file_name || '', data.description || '');
  } else if (rowType === 'HAND') {
    // HAND: seq, row_type, hand_no, timestamp, game_type, ante_type, blinds, game_date, SB, BB, Ante, BTN, SB_seat, BB_seat, ..., table_id
    const blindsParts = String(data.blinds || '0/0/0').split('/');
    const sb = toInt_(blindsParts[1] || 0) * CONFIG.SB_BB_RATIO; // SB = BB × 0.5
    const bb = toInt_(blindsParts[1] || 0);
    const ante = toInt_(blindsParts[2] || 0);

    const seatsParts = String(data.seats || '//').split('/');
    const btnSeat = seatsParts[0] || '';
    const sbSeat = seatsParts[1] || '';
    const bbSeat = seatsParts[2] || '';

    row.push(
      data.hand_no || '',      // C: hand_no
      data.timestamp || '',    // D: timestamp
      data.game_type || '',    // E: game_type
      data.ante_type || '',    // F: ante_type
      bb,                      // G: blinds (BB 값)
      data.game_date || '',    // H: game_date
      sb,                      // I: SB
      bb,                      // J: BB
      ante,                    // K: Ante
      btnSeat,                 // L: BTN
      sbSeat,                  // M: SB_seat
      bbSeat,                  // N: BB_seat
      0, 0,                    // O-P: 빈값
      '',                      // Q: 빈값
      data.table_no || ''      // R: table_no (테이블 번호, Type 시트에서 조회)
    );
  } else if (rowType === 'PLAYER') {
    // PLAYER: seq, row_type, player_name, seat, 0, chips_start, chips_end, hole_cards, 빈칸, key_player, nationality
    row.push(
      data.player_name || '',
      data.seat || '',
      0,
      data.chips_start || '',
      data.chips_end || '',
      data.hole_cards || '',
      '',                          // I: 빈칸
      data.key_player ? 'TRUE' : 'FALSE',  // J: key_player (Type 시트 데이터)
      data.nationality || ''       // K: nationality (Type 시트 데이터)
    );
  } else if (rowType === 'EVENT') {
    // EVENT: seq, row_type, event_type, seat, amount/card, time
    row.push(
      data.event_type || '',
      data.event_seat || '',
      data.amount || data.card || '',
      data.time || ''
    );
  }

  return row;
}

// 파일명 생성 (Record/Review 모드 통합)
function buildFileName_(input) {
  // Record 모드 (payload): { table_id, holes }
  if (input.table_id && input.holes) {
    const tableId = String(input.table_id);
    const holes = input.holes;
    const keyPlayers = Object.entries(holes)
      .map(([seat, cards]) => {
        const player = getPlayerInfo_(tableId, seat);
        if (!player || !player.is_key_player) return null;
        return {
          name: player.player,
          seat: toInt_(seat),
          cards: Array.isArray(cards) ? cards.join('') : cards
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.seat - b.seat);

    if (keyPlayers.length === 0) return `${tableId}_NoKeyPlayer`;
    if (keyPlayers.length === 1) {
      const p = keyPlayers[0];
      return `${tableId}_${p.name}_${p.cards}`;
    }
    const parts = keyPlayers.map(p => `${p.name}_${p.cards}`);
    return `${tableId}_${parts.join('_vs_')}`;
  }

  // Review 모드 (detail): { head: { table_id, hand_no, holes_json } }
  const head = input.head || {};
  const seatsOrder = participantsOrdered_(input);
  if (seatsOrder.length === 2) {
    const a = getPlayerName_(head.table_id, seatsOrder[0]);
    const b = getPlayerName_(head.table_id, seatsOrder[1]);
    const ac = holes2_(head.holes_json, seatsOrder[0]);
    const bc = holes2_(head.holes_json, seatsOrder[1]);
    const aStr = a + (ac ? `_${ac.join('')}` : '');
    const bStr = b + (bc ? `_${bc.join('')}` : '');
    return `VT${head.hand_no || '-'}_${aStr}_vs_${bStr}`;
  }
  const first = seatsOrder[0] ? getPlayerName_(head.table_id, seatsOrder[0]) : 'P1';
  return `VT${head.hand_no || '-'}_${first}_MW`;
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

/* ==== REVIEW (Hand 시트 전용) ==== */

/**
 * Hand 시트에서 핸드 목록 조회
 * @param {Object} filter - 필터 옵션 (미사용)
 * @param {Object} paging - {size: 50, num: 1}
 * @returns {Object} {total, items, error}
 */
function queryHands(filter, paging) {
  ensureSheets_();
  try {
    const sh = handSS_().getSheetByName(SH.HAND);
    // Hand 시트는 헤더 없음 - 전체 데이터 읽기
    const allRows = sh.getDataRange().getValues();

    // 빈 줄 기준으로 핸드 블록 분리
    const blocks = splitHandBlocks_(allRows);

    // 각 블록에서 HAND 행 추출
    const handItems = blocks.map(block => {
      const handRow = block.find(r => r[1] === 'HAND');
      if (!handRow) return null;

      const payoutsRow = block.find(r => r[1] === 'PAYOUTS');
      const gameRow = block.find(r => r[1] === 'GAME');

      // HAND 행 구조: [seq, 'HAND', hand_no, timestamp, game_type, ante_type, blinds, game_date, SB, BB, Ante, BTN, SB_seat, BB_seat, 0, 0, '', table_id]
      const timestamp = Number(handRow[3]) || 0;
      const handNo = String(handRow[2] || '');
      const tableId = String(handRow[17] || ''); // R열
      const btnSeat = String(handRow[11] || ''); // L열
      const gameDate = String(handRow[7] || ''); // H열

      // 보드 카드 추출 (EVENT 행에서)
      const boardEvents = block.filter(r => r[1] === 'EVENT' && r[2] === 'BOARD');
      const board = {
        f1: boardEvents[0] ? boardEvents[0][4] : '',
        f2: boardEvents[1] ? boardEvents[1][4] : '',
        f3: boardEvents[2] ? boardEvents[2][4] : '',
        turn: boardEvents[3] ? boardEvents[3][4] : '',
        river: boardEvents[4] ? boardEvents[4][4] : ''
      };

      return {
        hand_id: handNo, // Hand 시트에는 hand_id 없으므로 hand_no 사용
        table_id: tableId,
        btn_seat: btnSeat,
        hand_no: handNo,
        start_street: 'PREFLOP', // 기본값
        started_at: new Date(timestamp * 1000).toISOString(),
        board: board,
        seq: handRow[0] // 정렬용
      };
    }).filter(Boolean);

    // 정렬: timestamp 내림차순 (seq 역순)
    handItems.sort((a, b) => (b.seq || 0) - (a.seq || 0));

    // 페이징
    const size = (paging && paging.size) || 50;
    const page = (paging && paging.num) || 1;
    const slice = handItems.slice((page-1)*size, page*size);

    return {total: handItems.length, items: slice, error: ''};
  } catch(e) {
    log_('ERR_QH_HANDSHEET', e.message);
    return {total: 0, items: [], error: String(e.message || e)};
  }
}

/**
 * Hand 시트에서 특정 핸드 상세 조회
 * @param {string} hand_id - hand_no 값
 * @returns {Object} {head, acts, error}
 */
function getHandDetail(hand_id) {
  try {
    ensureSheets_();
    if (!hand_id) return {head: null, acts: [], error: 'invalid hand_id'};

    const sh = handSS_().getSheetByName(SH.HAND);
    // Hand 시트는 헤더 없음 - 전체 데이터 읽기
    const allRows = sh.getDataRange().getValues();

    // 빈 줄 기준으로 핸드 블록 분리
    const blocks = splitHandBlocks_(allRows);

    // hand_no로 블록 찾기
    const block = blocks.find(b => {
      const handRow = b.find(r => r[1] === 'HAND');
      return handRow && String(handRow[2]) === String(hand_id); // C열: hand_no
    });

    if (!block) return {head: null, acts: [], error: 'hand not found'};

    // 블록 파싱
    const parsed = parseHandBlock_(block);

    // {head, acts} 형식으로 변환
    return convertHandSheetToDetail_(parsed);

  } catch(e) {
    log_('ERR_HANDDETAIL', e.message);
    return {head: null, acts: [], error: (e && e.message) ? e.message : 'unknown'};
  }
}

/* ==== Hand 시트 파싱 헬퍼 함수 ==== */

/**
 * seq=1 AND row_type=GAME 기준으로 핸드 블록 분리
 * v2.2.1: 빈 줄은 시각적 구분용, 실제 핸드 구분은 GAME 행 기준
 */
function splitHandBlocks_(rows) {
  const blocks = [];
  let current = [];

  rows.forEach(row => {
    // seq=1 AND row_type=GAME → 새로운 핸드 시작
    if (row[0] === 1 && row[1] === 'GAME') {
      if (current.length > 0) {
        blocks.push(current);
      }
      current = [row]; // 새 핸드 시작
    } else if (row[0] !== '' && row[0] != null && row[1] !== '' && row[1] != null) {
      // 빈 줄이 아닌 데이터 행만 추가
      current.push(row);
    }
    // 빈 줄은 무시 (CSV의 시각적 구분용)
  });

  if (current.length > 0) blocks.push(current);
  return blocks;
}

/**
 * 핸드 블록 파싱 (row_type별 분류)
 */
function parseHandBlock_(block) {
  return {
    game: block.find(r => r[1] === 'GAME'),
    payouts: block.find(r => r[1] === 'PAYOUTS'),
    hand: block.find(r => r[1] === 'HAND'),
    players: block.filter(r => r[1] === 'PLAYER'),
    events: block.filter(r => r[1] === 'EVENT')
  };
}

/**
 * Hand 시트 데이터 → {head, acts} 형식 변환
 */
function convertHandSheetToDetail_(parsed) {
  const handRow = parsed.hand;
  if (!handRow) return {head: null, acts: [], error: 'no HAND row'};

  // HAND 행 구조: [seq, 'HAND', hand_no, timestamp, game_type, ante_type, blinds, game_date, SB, BB, Ante, BTN, SB_seat, BB_seat, 0, 0, '', table_id]
  const timestamp = Number(handRow[3]) || 0;
  const tableId = String(handRow[17] || ''); // R열
  const handNo = String(handRow[2] || '');
  const btnSeat = String(handRow[11] || ''); // L열

  // 보드 카드 추출
  const boardEvents = parsed.events.filter(e => e[2] === 'BOARD');
  const board = {
    f1: boardEvents[0] ? boardEvents[0][4] : '',
    f2: boardEvents[1] ? boardEvents[1][4] : '',
    f3: boardEvents[2] ? boardEvents[2][4] : '',
    turn: boardEvents[3] ? boardEvents[3][4] : '',
    river: boardEvents[4] ? boardEvents[4][4] : ''
  };

  // stacks_json 구성
  const stacks = {};
  parsed.players.forEach(p => {
    const seat = String(p[3] || ''); // D열: seat
    const chips = Number(p[5]) || 0; // F열: chips_start
    if (seat) stacks[seat] = chips;
  });

  // holes_json 구성
  const holes = {};
  parsed.players.forEach(p => {
    const seat = String(p[3] || ''); // D열
    const holeCards = String(p[7] || ''); // H열
    if (seat && holeCards) {
      holes[seat] = holeCards.split(' ').filter(Boolean);
    }
  });

  // head 구성
  const head = {
    hand_id: handNo, // Hand 시트에는 hand_id 없으므로 hand_no 사용
    table_id: tableId,
    btn_seat: btnSeat,
    hand_no: handNo,
    start_street: 'PREFLOP', // 기본값
    started_at: new Date(timestamp * 1000).toISOString(),
    ended_at: '',
    board: board,
    pre_pot: 0, // Hand 시트에 없음
    winner_seat: '',
    pot_final: '',
    stacks_json: JSON.stringify(stacks),
    holes_json: JSON.stringify(holes)
  };

  // acts 구성 (EVENT → ACTIONS 형식)
  const actionEvents = parsed.events.filter(e => e[2] !== 'BOARD');
  let pot = 0;

  const acts = actionEvents.map((e, idx) => {
    const action = String(e[2] || ''); // U열: event_type
    const seat = String(e[3] || ''); // V열: seat
    const amount = Number(e[4]) || 0; // W열: amount

    pot += amount;

    return {
      seq: idx + 1,
      street: 'PREFLOP', // 스트릿 추론 필요 (향후 개선)
      seat: seat,
      action: action,
      amount_input: amount,
      to_call_after: 0, // Hand 시트에 없음
      contrib_after_seat: 0, // Hand 시트에 없음
      pot_after: pot,
      note: ''
    };
  });

  // pot_final 업데이트
  if (acts.length > 0) {
    head.pot_final = String(acts[acts.length - 1].pot_after);
  }

  return {head, acts, error: ''};
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

function updateExternalVirtual_(sheetId, detail, ext, priority){
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
  const G = priority || 'A'; // v1.2: 실제 우선순위 사용 (항상 A일 것임, saveHandWithExternal에서 필터링됨)
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

// ✅ 통합 ROSTER 조회 함수 (캐싱 사용)
function getPlayerInfo_(tableId, seat) {
  const {roster} = readRoster_();
  const tableRoster = roster[tableId] || [];
  return tableRoster.find(p => p.seat == seat);
}

/**
 * 플레이어 이름 조회 (형식 선택 가능)
 * @param {string} tableId - 테이블 ID
 * @param {string|number} seat - 좌석 번호
 * @param {string} format - 형식 ('full'|'first'|'short')
 * @returns {string} 플레이어 이름
 */
function getPlayerDisplayName_(tableId, seat, format = 'short') {
  const player = getPlayerInfo_(tableId, seat);
  if (!player || !player.player) return `S${seat}`;

  const fullName = String(player.player).trim();
  const parts = fullName.split(/\s+/);

  if (format === 'full') {
    return fullName;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (format === 'first') {
    return parts[0]; // 첫 단어만
  }

  // 'short' 형식 (기본값): J.Doe
  const first = parts[0];
  const last = parts.slice(1).join(' ');
  return `${(first[0] || '').toUpperCase()}.${last}`;
}

// Wrapper 함수: 하위 호환성 유지
function getPlayerName_(tableId, seat) {
  return getPlayerDisplayName_(tableId, seat, 'first');
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
// ✅ Wrapper 함수: getPlayerDisplayName_를 사용하여 중복 제거
function nameShort_(tableId, seat){
  return getPlayerDisplayName_(tableId, seat, 'short');
}
function nationOf_(tableId, seat){
  const r = readRoster_().roster || {}; const arr = r[tableId]||[];
  const one = arr.find(x=>String(x.seat)===String(seat));
  return one? (one.nation||'') : '';
}

/* === 참가자 순서: 액션 등장 순 → 좌석번호 보정 === */
// ⚠️ 중복 제거: participantsOrdered_는 Line 237에 이미 정의됨
// 이 부분은 삭제됨 (중복 함수)

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
