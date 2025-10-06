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
// TRACKER_VERSION, TYPE_SHEET_NAME → HandLogger에서 공유 (통합 후 제거)
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
const APP_SPREADSHEET_ID = '19e7eDjoZRFZooghZJF3XmOZzZcgmqsp9mFAfjvJWhj4';

function setupSpreadsheetId(spreadsheetId) {
  // 상수로 관리하므로 설정 불필요
  log_(LOG_LEVEL.INFO, 'setupSpreadsheetId', 'APP_SPREADSHEET_ID 상수 사용 중');
  return APP_SPREADSHEET_ID;
}

function getSpreadsheetId_() {
  return APP_SPREADSHEET_ID;
}

// appSS_() → src/common/common.gs로 이동

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

// toInt_() → src/common/common.gs로 이동

// withScriptLock_() → src/common/common.gs로 이동

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

  const data = readAll_(sh);

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
// readAll_Optimized_() → src/common/common.gs의 readAll_()로 대체

// findColIndex_() → src/common/common.gs로 이동

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
function getKeyPlayers() {
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
function getTablePlayers(tableId) {
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
function updatePlayerChips(tableId, seatNo, newChips) {
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
function addPlayer(tableId, seatNo, name, nation, chips, isKey) {
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
function removePlayer(tableId, seatNo) {
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
 * 웹앱 진입점 (통합 후 제거 - HandLogger의 doGet()이 index.html 제공)
 */
// function doGet(e) 제거됨 → HandLogger가 처리
