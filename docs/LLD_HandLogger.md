# LLD - Poker Hand Logger

## 🚨 **v2.0.0 대형 패치 (2025-10-06)**
- ❌ APP_SPREADSHEET 완전 폐기 (HANDS/ACTIONS/CONFIG/LOG 삭제)
- ✅ ROSTER_SPREADSHEET만 사용 (Hand 시트 신규)
- ✅ Record 모드 VIRTUAL 자동 갱신 제거
- ✅ Review 모드 VIRTUAL 수동 갱신 유지
- ✅ DB 구조 재설계 (핸드별 1행, JSON 통합)

## 🏗️ 시스템 아키텍처 (v2.0.0)

### 전체 구조
```
┌─────────────────────┐
│   Web Client        │
│  (index.html)       │
│  - Record UI        │
│  - Review UI        │
│  - LocalStorage     │
└──────┬──────────────┘
       │ google.script.run
       ▼
┌─────────────────────┐
│  Google Apps Script │
│    (Code.gs)        │
│  - doGet()          │
│  - Server Functions │
└──────┬──────────────┘
       │
       ▼
┌────────────────────────────────┐
│  ROSTER_SPREADSHEET (단일)     │
│  ID: 1J-lf8bY...               │
│  ┌──────────────────────────┐  │
│  │ Type (테이블/플레이어)    │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ Hand (핸드 데이터) ✨NEW  │  │
│  │ - 핸드별 1행             │  │
│  │ - players_json           │  │
│  │ - events_json            │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘

       ▼ (Review 모드 수동 갱신)
┌─────────────────────┐
│  External Sheet     │
│  (VIRTUAL 시트)     │
│  - C열: Time        │
│  - E,F,G,H,J: 갱신  │
└─────────────────────┘
```

## 📦 모듈 설계

### Code.gs 구조 (1233줄, +670줄 CSV 기능)

#### 1. 글로벌 상수/설정 (12-24줄)
```javascript
const APP_SPREADSHEET_ID = '19e7eDjoZRFZooghZJF3XmOZzZcgmqsp9mFAfjvJWhj4';
const ROSTER_SPREADSHEET_ID = '1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U';
const ROSTER_SHEET_NAME = 'Type';
const SH = { HANDS:'HANDS', ACTS:'ACTIONS', CONFIG:'CONFIG', LOG:'LOG' };
```

#### 2. 유틸리티 함수 (25-86줄)

##### 2.1 락 관리 (`withScriptLock_`)
- **위치**: 25-39줄
- **로직**:
  ```javascript
  - 최대 3회 재시도
  - 초기 대기: 500ms
  - Backoff: 150ms, 300ms, 450ms
  - finally 블록에서 releaseLock()
  ```

##### 2.2 시트 헬퍼
- `appSS_()`: APP 스프레드시트 (41줄)
- `rosterSS_()`: ROSTER 스프레드시트 (42줄)
- `getOrCreateSheet_()`: 시트 생성/조회 (43줄)
- `setHeaderIfEmpty_()`: 헤더 초기화 (44-47줄)

##### 2.3 데이터 읽기 (`readAll_`, 48-54줄)
```javascript
return {
  header: v[0],           // 헤더 행
  rows: v.slice(1),       // 데이터 행
  map: {}                 // 컬럼명→인덱스 매핑
}
```

##### 2.4 컬럼 찾기 (`findColIndex_`, 55-57줄)
- **다중 별칭 지원**:
  ```javascript
  ['Table No.', 'TableNo', 'Table_Number', 'table_no']
  ```

##### 2.5 타입 변환
- `toInt_()`: 안전한 정수 변환 (58-62줄)
- `nowKST_()`: KST 현재 시각 (63-66줄)
- `todayStartKST_()`: KST 오늘 00:00 (67-71줄)

#### 3. 초기화 (`ensureSheets_`, 72-86줄)
```javascript
HANDS: [
  'hand_id', 'client_uuid', 'table_id', 'hand_no',
  'start_street', 'started_at', 'ended_at', 'btn_seat',
  'board_f1', 'board_f2', 'board_f3', 'board_turn', 'board_river',
  'pre_pot', 'winner_seat', 'pot_final', 'stacks_json', 'holes_json', 'schema_ver'
]
ACTIONS: [
  'hand_id', 'seq', 'street', 'seat', 'action',
  'amount_input', 'to_call_after', 'contrib_after_seat', 'pot_after', 'note'
]
CONFIG: ['table_id', 'btn_seat', 'hand_seq', 'updated_at']
LOG: ['ts', 'func', 'table_id', 'code', 'msg', 'user']
```

#### 4. 웹 앱 진입점 (`doGet`, 88-93줄)
```javascript
ensureSheets_();
return HtmlService.createTemplateFromFile('index').evaluate()
  .setTitle('Poker Hand Logger — v1.1.1')
  .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
```

#### 5. ROSTER 관리 (95-120줄)

##### `readRoster_()` 로직
```javascript
1. Type 시트 읽기
2. 컬럼 인덱스 찾기 (다중 별칭)
3. 행 반복:
   - tableNo 추출 → tables Set 추가
   - seatNo, player, nation, chips 파싱
   - roster[tableNo] 배열에 push
4. 좌석 번호 오름차순 정렬
5. return { tables: [...], roster: {} }
```

#### 6. CONFIG 관리 (122-265줄)

##### 6.1 읽기 (`readConfig_`, 123-132줄)
```javascript
return {
  [table_id]: {
    btn_seat: String,
    hand_seq: Number,
    updated_at: Date
  }
}
```

##### 6.2 클라이언트 API (`getConfig`, 133-143줄)
```javascript
return {
  tables: String[],
  roster: { [table]: SeatInfo[] },
  config: { [table]: ConfigRow },
  error: String
}
```

##### 6.3 hand_seq 관리
- `nextHandSeq_()`: 자동 증가 (224-237줄)
  ```javascript
  1. CONFIG 시트에서 tableId 행 찾기
  2. found > 0:
     - hand_seq 읽기 → +1 → 저장
  3. else:
     - 새 행 추가 (hand_seq=1)
  4. return next
  ```
- `resetHandSeq()`: 수동 리셋 (238-252줄)
  - withScriptLock_ 래핑
  - toValue로 hand_seq 강제 설정

##### 6.4 BTN 업데이트 (`upsertConfig_`, 253-265줄)
- 테이블 행 찾기
- btn_seat, updated_at 갱신

#### 7. 핸드 저장 (145-221줄)

##### 7.1 기본 저장 (`saveHand`, 146-150줄)
```javascript
return withScriptLock_(() => _saveCore_(payload))
```

##### 7.2 외부 연동 저장 (`saveHandWithExternal`, 153-173줄)
```javascript
1. withScriptLock_() 진입
2. log_('SAVE_EXT_BEGIN', ...)
3. saved = _saveCore_(payload)
4. log_('SAVE_OK', hand_id, hand_no, idempotent)
5. if (ext && ext.sheetId):
   - detail = getHandDetail(saved.hand_id)
   - extRes = updateExternalVirtual_(ext.sheetId, detail, ext)
6. catch → extRes.reason 기록
7. return { ...saved, external: extRes }
```

##### 7.3 저장 코어 (`_saveCore_`, 176-221줄)
```javascript
1. 멱등성 체크:
   - client_uuid + started_at 중복 확인
   - 중복 시 return { ok:true, hand_id, idempotent:true }

2. hand_id 생성:
   - yyyyMMdd_HHmmssSSS
   - 중복 시 '+1' 접미사

3. hand_no:
   - payload.hand_no || nextHandSeq_(table_id)

4. HANDS 행 추가:
   - appendRow([hand_id, client_uuid, ..., 'v1.1.1'])
   - winner_seat: '' (공란)

5. ACTIONS 배치 추가:
   - rows = actions.map(...)
   - getRange().setValues(rows)

6. CONFIG 업데이트:
   - upsertConfig_(table_id, btn_seat)

7. return { ok:true, hand_id, hand_no, idempotent:false }
```

#### 8. 리뷰 (267-355줄)

##### 8.1 핸드 목록 (`queryHands`, 268-298줄)
```javascript
1. HANDS 시트 읽기
2. started_at 기준 내림차순 정렬
3. 페이징:
   - size = paging.size || 50
   - page = paging.num || 1
   - slice = rows[(page-1)*size : (page-1)*size+size]
4. items = slice.map(r => ({
     hand_id, table_id, btn_seat, hand_no, start_street, started_at,
     board: { f1, f2, f3, turn, river }
   }))
5. return { total, items, error }
```

##### 8.2 핸드 상세 (`getHandDetail`, 300-355줄)
```javascript
1. HANDS 시트에서 hand_id 행 찾기
2. head = {
     hand_id, table_id, btn_seat, hand_no, start_street,
     started_at, ended_at, board: {f1,f2,f3,turn,river},
     pre_pot, winner_seat: '', pot_final,
     stacks_json, holes_json
   }
3. ACTIONS 필터링:
   - filter(r => r.hand_id === hand_id)
   - map(r => ({ seq, street, seat, action, ... }))
   - sort((x,y) => x.seq - y.seq)
4. return { head, acts, error }
```

#### 9. 외부 시트 갱신 (357-560줄)

##### 9.1 시간 파싱 (`parseTimeCellToTodayKST_`, 358-387줄)
```javascript
1. Date 객체:
   - hh = raw.getHours()
   - mm = raw.getMinutes()
   - ss = raw.getSeconds() || 0

2. 숫자 (0~1):
   - totalSec = raw * 24 * 60 * 60
   - hh = floor(totalSec/3600) % 24
   - mm = floor((totalSec%3600)/60)
   - ss = totalSec % 60

3. 문자열 (disp):
   - match(/(\d{1,2})\s*:\s*(\d{2})(?::(\d{2}))?/)
   - hh = clamp(0, 23, m[1])
   - mm = clamp(0, 59, m[2])
   - ss = clamp(0, 59, m[3]) || 0

4. todayStartKST_().setHours(hh, mm, ss, 0)
5. return Date | null
```

##### 9.2 VIRTUAL 시트 업데이트 (`updateExternalVirtual_`, 389-434줄)
```javascript
1. VIRTUAL 시트 열기
2. C열 (Time) 읽기:
   - rngVals = getValues()  // 원시 값
   - rngDisp = getDisplayValues()  // 표시 값

3. 행 선택 (아래→위 검색):
   - for (i = length-1; i >= 0; i--):
     - t = parseTimeCellToTodayKST_(rngVals[i], rngDisp[i])
     - if (t && t <= now): pickRow = i+2; break

4. 값 구성:
   - E(5) = '미완료'
   - F(6) = buildFileName_(detail)
   - G(7) = 'A'
   - H(8) = buildHistoryBlock_(detail, ext.bb)
   - J(10) = ''

5. 비연속 쓰기:
   - getRange(pickRow, 5, 1, 1).setValue(E)
   - getRange(pickRow, 6, 1, 1).setValue(F)
   - ...

6. log_('EXT_OK', row=${pickRow})
7. return { updated: true, row: pickRow }
```

##### 9.3 Review 모드 수동 갱신 (`updateHandToVirtual`, v1.3.0 예정)
```javascript
function updateHandToVirtual(handId, ext) {
  // 1. 입력 검증
  if (!handId || !ext || !ext.sheetId) throw new Error()

  // 2. withScriptLock_ 진입
  return withScriptLock_(() => {
    log_('UPDATE_VIRTUAL_BEGIN', `hand_id=${handId}`, '')

    // 3. 핸드 상세 조회
    const detail = getHandDetail(handId)
    if (detail.error || !detail.head) throw new Error()

    // 4. 기존 updateExternalVirtual_ 재사용
    const result = updateExternalVirtual_(ext.sheetId, detail, ext)

    // 5. 로그 기록
    if (result.updated) {
      log_('UPDATE_VIRTUAL_OK', `hand_id=${handId} row=${result.row}`, '')
    } else {
      log_('UPDATE_VIRTUAL_SKIP', `hand_id=${handId} reason=${result.reason}`, '')
    }

    return result  // { updated: boolean, row?: number, reason?: string }
  })
}
```

**클라이언트 (index.html) 연동:**
```javascript
function updateHandToVirtual(handId) {
  const extSheetId = localStorage.getItem('phl_extSheetId') || ''
  const bb = toInt(localStorage.getItem('phl_bbSize') || '0')

  // extSheetId 미입력 시 입력 프롬프트
  if (!extSheetId) {
    const input = prompt('VIRTUAL 시트 ID를 입력하세요:', '')
    if (!input || !input.trim()) return
    localStorage.setItem('phl_extSheetId', input.trim())
  }

  const statusEl = document.getElementById('virtualUpdateStatus')
  statusEl.textContent = '갱신 중...'

  google.script.run
    .withSuccessHandler(res => {
      if (res.updated) {
        statusEl.textContent = `✅ 갱신 완료 (row ${res.row})`
      } else {
        statusEl.textContent = `⚠️ 갱신 실패: ${res.reason}`
      }
    })
    .withFailureHandler(err => {
      statusEl.textContent = `❌ 오류: ${err.message || err}`
    })
    .updateHandToVirtual(handId, { sheetId: extSheetId || localStorage.getItem('phl_extSheetId'), bb })
}
```

**renderDetailContent() 수정:**
```javascript
// 푸터 하단에 버튼 추가
const footerHTML = `
  <div class="sectionDivider"></div>
  <div class="potFooter">최종 팟: ${potDisplay.toLocaleString()}${bbStr}</div>

  <div style="margin-top:16px;padding:12px;border-top:1px solid var(--line)">
    <button onclick="updateHandToVirtual('${head.hand_id}')"
            class="pill"
            style="width:100%;padding:12px;font-size:1rem">
      🔄 VIRTUAL 시트에 갱신
    </button>
    <div id="virtualUpdateStatus" class="small muted" style="margin-top:8px;text-align:center"></div>
  </div>
`
```

#### 10. 포맷 생성 (436-547줄)

##### 10.1 파일명 (`buildFileName_`, 448-462줄)
```javascript
1. seatsOrder = participantsOrdered_(detail)
2. if (seatsOrder.length === 2):  // 헤즈업
   - a = nameShort_(table_id, seat[0])
   - b = nameShort_(table_id, seat[1])
   - ac = holes2_(holes_json, seat[0])  // ['As', 'Kh']
   - bc = holes2_(holes_json, seat[1])
   - return `VT${hand_no}_${a}_${ac.join('')}_vs_${b}_${bc.join('')}`
   // 예: VT12_JDoe_AhKs_vs_JSmith_QdQc
3. else:  // 멀티웨이
   - first = nameShort_(table_id, seat[0])
   - return `VT${hand_no}_${first}_MW`
```

##### 10.2 히스토리 블록 (`buildHistoryBlock_`, 464-481줄)
```javascript
1. board = [f1, f2, f3, turn, river].filter(Boolean)
2. seats = participantsOrdered_(detail)
3. parts = seats.map(s => {
     nm = nameShort_(table_id, s)
     hc = holesSym_(holes_json, s)  // '♠A♥K'
     return hc ? `${nm}(${hc})` : nm
   })
4. line1 = parts.join(' vs ')
5. line2 = board.length ? `보드: ${board.map(cardPretty_).join(' ')}` : '보드: -'
6. pot = finalPot_(detail)
7. bbLine = pot>0 && bb>0 ? `${round(pot/bb, 1)}BB (${numComma_(pot)})` : numComma_(pot)
8. line3 = `팟: ${bbLine}`
9. return `${line1}\n${line2}\n${line3}`
```

##### 10.3 헬퍼 함수
- `nameShort_()`: 플레이어 이름 단축 (484-492줄)
  ```javascript
  "John Doe" → "J.Doe"
  "Smith" → "Smith"
  ```
- `nationOf_()`: 국적 조회 (493-497줄)
- `participantsOrdered_()`: 액션 순서 추출 (499-512줄)
- `cardPretty_()`: 카드 심볼 변환 (515-518줄)
  ```javascript
  "As" → "A♠"
  ```
- `cardCode_()`: 카드 정규화 (519-529줄)
- `holes2_()`: 홀카드 2장 추출 (530-534줄)
- `holesSym_()`: 홀카드 심볼 (535-538줄)
- `finalPot_()`: 최종 팟 계산 (540-546줄)
  ```javascript
  head.pot_final || max(acts.pot_after) || pre_pot
  ```

#### 11. CSV Import/Export (564-1233줄, +670줄)

##### 11.1 Import 함수 (`importHandsFromCSV`, 574-650줄)
```javascript
function importHandsFromCSV(csvText, options) {
  1. CSV 파싱: lines.split(\n) → parseCSVLine_()
  2. 핸드 블록 분할: splitIntoHandBlocks_() (빈 행 기준)
  3. 각 블록 변환:
     - convertHandBlock_() → { hand, actions }
     - 중복 체크: isDuplicateHand_() (skipDuplicates 옵션)
     - 저장: _saveCore_(payload)
  4. 결과 반환:
     - { imported: 2, skipped: 0, errors: [] }
}
```

##### 11.2 Export 함수 (`exportHandsToCSV`, 657-682줄)
```javascript
function exportHandsToCSV(handIds) {
  1. handIds 배열 순회
  2. getHandDetail(handId) → { head, acts }
  3. convertHandToCSVBlock_(head, acts) → rows[][]
  4. CSV 텍스트 생성:
     - escapeCSVCell_() 이스케이프
     - join(',') → 행 → join('\n')
  5. return csvText
}
```

##### 11.3 핸드 블록 변환 (`convertHandBlock_`, 723-811줄)
```javascript
function convertHandBlock_(block) {
  // 1. 행 타입별 분류
  const handRow = block.find(r => r[1] === 'HAND');
  const playerRows = block.filter(r => r[1] === 'PLAYER');
  const eventRows = block.filter(r => r[1] === 'EVENT');

  // 2. HAND 정보 추출
  const handNo = handRow[2];
  const timestamp = handRow[3];
  const tableId = handRow[17];
  const btnSeat = handRow[11];  // ✅ BTN 좌석
  const sbSeat = handRow[12];   // SB 좌석
  const bbSeat = handRow[13];   // BB 좌석

  // 3. 타임스탬프 → ISO8601
  const startedAt = parseTimestamp_(timestamp);

  // 4. hand_id 생성 (yyyyMMdd_HHmmssSSS)
  const handId = generateHandId_(timestamp);

  // 5. JSON 생성
  const stacksJson = buildStacksJson_(playerRows);
  const holesJson = buildHolesJson_(playerRows);

  // 6. 보드 카드
  const boardCards = eventRows
    .filter(e => e[2] === 'BOARD')
    .map(e => e[4]);

  // 7. pre_pot (POT CORRECTION 합계)
  const prePot = eventRows
    .filter(e => e[2] === 'POT CORRECTION')
    .reduce((sum, e) => sum + toInt_(e[4]), 0);

  // 8. start_street 추론
  const startStreet = inferStartStreet_(eventRows);

  // 9. ACTIONS 생성
  const actions = buildActions_(handId, eventRows, startStreet, prePot, {
    btnSeat, sbSeat, bbSeat
  });

  // 10. pot_final
  const potFinal = actions.length > 0
    ? actions[actions.length - 1].pot_after
    : prePot;

  return {
    hand: { hand_id, client_uuid, table_id, hand_no, ... },
    actions: [ {...}, {...}, ... ]
  };
}
```

##### 11.4 start_street 추론 (`inferStartStreet_`, 906-938줄)
```javascript
function inferStartStreet_(eventRows) {
  const boardEvents = eventRows.filter(e => e[2] === 'BOARD');
  const actionEvents = eventRows.filter(e =>
    e[2] !== 'BOARD' && e[2] !== 'POT CORRECTION'
  );

  // 보드 없음 → PREFLOP
  if (boardEvents.length === 0) return 'PREFLOP';

  // 액션 없음 → 보드 개수로 판단
  if (actionEvents.length === 0) {
    if (boardEvents.length <= 3) return 'FLOP';
    if (boardEvents.length === 4) return 'TURN';
    return 'RIVER';
  }

  // 첫 액션과 첫 보드 순서 비교
  const firstActionIdx = eventRows.indexOf(actionEvents[0]);
  const firstBoardIdx = eventRows.indexOf(boardEvents[0]);

  if (firstActionIdx < firstBoardIdx) {
    // 액션이 보드보다 먼저 → PREFLOP
    return 'PREFLOP';
  }

  // 보드가 먼저 → 보드 개수로 판단
  const boardCountBeforeAction = eventRows
    .slice(0, firstActionIdx)
    .filter(e => e[2] === 'BOARD')
    .length;

  if (boardCountBeforeAction <= 3) return 'FLOP';
  if (boardCountBeforeAction === 4) return 'TURN';
  return 'RIVER';
}
```

##### 11.5 ACTIONS 생성 (`buildActions_`, 943-1024줄)
```javascript
function buildActions_(handId, eventRows, startStreet, prePot, positions) {
  const actions = [];
  let seq = 1;
  let pot = prePot;
  let toCall = 0;
  const contrib = {};
  let curStreet = startStreet;
  let boardCount = 0;

  for (const event of eventRows) {
    // POT CORRECTION 스킵
    if (event[2] === 'POT CORRECTION') continue;

    // BOARD 카드 추적 → 스트릿 전환
    if (event[2] === 'BOARD') {
      boardCount++;
      if (boardCount === 1 && curStreet === 'PREFLOP') curStreet = 'FLOP';
      else if (boardCount === 4) curStreet = 'TURN';
      else if (boardCount === 5) curStreet = 'RIVER';
      continue;
    }

    // 액션 이벤트
    const seat = String(event[3] || '');
    const actionType = normalizeAction_(event[2]);
    let amountInput = toInt_(event[4]);

    // CALL 금액 계산 (빈 값일 때)
    if (actionType === 'CALL' && amountInput === 0) {
      amountInput = Math.max(0, toCall - (contrib[seat] || 0));
    }

    // 기여액/팟 업데이트
    contrib[seat] = (contrib[seat] || 0) + amountInput;
    pot += amountInput;

    // toCall 재계산
    if (actionType === 'BET' || actionType === 'RAISE') {
      const maxContrib = Math.max(...Object.values(contrib).concat([0]));
      toCall = maxContrib - Math.min(...Object.values(contrib).concat([maxContrib]));
    }

    actions.push({
      hand_id: handId,
      seq: seq++,
      street: curStreet,
      seat,
      action: actionType,
      amount_input: amountInput,
      to_call_after: toCall,
      contrib_after_seat: contrib[seat],
      pot_after: pot,
      note: ''
    });
  }

  return actions;
}
```

##### 11.6 액션 타입 정규화 (`normalizeAction_`, 1029-1047줄)
```javascript
function normalizeAction_(rawAction) {
  const a = String(rawAction).trim().toUpperCase();

  // 오타 수정
  if (a === 'RAIES') return 'RAISE';

  // "RAISE TO" → "RAISE"
  if (a.startsWith('RAISE')) return 'RAISE';

  // "CALL 6,000" → "CALL"
  if (a.startsWith('CALL')) return 'CALL';

  // 표준 액션
  if (a === 'CHECK' || a === 'FOLD' || a === 'BET' || a === 'ALLIN') {
    return a;
  }

  return 'UNKNOWN';
}
```

##### 11.7 HANDS → CSV 변환 (`convertHandToCSVBlock_`, 1071-1200줄)
```javascript
function convertHandToCSVBlock_(head, acts) {
  const rows = [];

  // 1. GAME 행
  rows.push([1, 'GAME', 'GGProd Hand Logger', 'Virtual Table', gameDate, ...]);

  // 2. PAYOUTS 행 (비어있음)
  rows.push([2, 'PAYOUTS', '', '', ...]);

  // 3. HAND 행
  const ts = new Date(head.started_at).getTime();
  rows.push([
    3, 'HAND', head.hand_no, ts, 'HOLDEM', 'BB_ANTE',
    0, 0, 0, 0, 0,
    head.btn_seat, sbSeat, bbSeat,
    0, 0, 1, head.table_id
  ]);

  // 4. PLAYER 행들
  for (const seat of seats) {
    rows.push([
      rowNum++, 'PLAYER', `Player ${seat}`, seat, 0,
      stacks[seat], stacks[seat], holeCards, ...
    ]);
  }

  // 5. EVENT 행들 (보드 + 액션 인터리브)
  let boardIdx = 0;
  for (const act of acts) {
    // 스트릿 전환 시 보드 카드 추가
    if (act.street !== prevStreet) {
      const cardsToAdd = getCardsForStreet_(act.street, boardCards, boardIdx);
      for (const card of cardsToAdd) {
        rows.push([rowNum++, 'EVENT', 'BOARD', 1, card, ...]);
        boardIdx++;
      }
    }

    // 액션 행
    rows.push([rowNum++, 'EVENT', act.action, act.seat, amountStr, ...]);
  }

  // 6. 빈 행
  rows.push(['', '', ...]);

  return rows;
}
```

##### 11.8 헬퍼 함수
```javascript
// CSV 파싱
parseCSVLine_(line) → [col0, col1, ...]

// 핸드 블록 분할
splitIntoHandBlocks_(rows) → [[block1], [block2], ...]

// 타임스탬프 변환
parseTimestamp_(ts) → ISO8601 문자열

// hand_id 생성
generateHandId_(timestamp) → "yyyyMMdd_HHmmssSSS"

// JSON 생성
buildStacksJson_(playerRows) → '{"1":50000,"2":50000}'
buildHolesJson_(playerRows) → '{"1":["As","Ks"],"2":["Qd","Qc"]}'

// 중복 체크
isDuplicateHand_(hand) → boolean

// CSV 셀 이스케이프
escapeCSVCell_(value) → '"escaped"'

// JSON 안전 파싱
safeParseJson_(jsonStr) → object
```

#### 12. 로그 (`log_`, 552-560줄)
```javascript
LOG.appendRow([
  new Date(),                          // ts
  Utilities.getStackTrace()[1],        // func (호출자)
  String(tableId || ''),               // table_id
  String(code || ''),                  // code
  String(msg || ''),                   // msg
  Session.getActiveUser().getEmail()   // user
])
```

### index.html 구조 (764줄, +108줄 CSV 기능)

#### 1. CSS 스타일 (8-60줄)

##### 1.1 CSS 변수
```css
:root {
  font-size: 28px;
  --bg: #0b0d12;
  --panel: #101522;
  --line: #1f2435;
  --muted: #9aa3b2;
  --acc: #2a6fff;
  --text: #e7eaf0;
}
```

##### 1.2 주요 클래스
- `.wrap`: 메인 컨테이너 (flex-col, gap:12px)
- `.panel`: 패널 (border-radius:14px)
- `.pill`: 토글 버튼 (border-radius:999px)
- `.seatCard`: 좌석 카드 (dashed border)
- `.boardWrap`: 카드 그리드 (4열, 최대 38vh)
- `.card`: 카드 셀 (54px, 선택 시 outline)
- `.actionDock`: 하단 고정 액션바 (sticky bottom)

##### 1.3 Review 스타일
```css
.cardBadge: 68x68px, border 6px
  .cb-s: ♠ black
  .cb-h: ♥ red (#ef4444)
  .cb-d: ♦ blue (#3b82f6)
  .cb-c: ♣ green (#22c55e)

.actBadge: 액션 배지
  .act-chk/call: green (#22c55e)
  .act-bet/raise: red (#ef4444)
  .act-fold: blue (#3b82f6)
  .act-allin: dark red (#b91c1c)
```

#### 2. HTML 구조 (62-152줄)

##### 2.1 Header (63-70줄)
```html
<header>
  <strong>Poker Hand Logger</strong> · v1.1
  <button id="modeRecord">Record</button>
  <button id="modeReview">Review</button>
  <button id="modeCSV">CSV</button> ✨ NEW
</header>
```

##### 2.2 Record Panel (72-135줄)
```html
<div id="panelRecord">
  <!-- 외부 설정 (76-85) -->
  <input id="extSheetId" />
  <input id="bbInput" />
  <button id="saveSettingsBtn" />

  <!-- 핸드 설정 (87-101) -->
  <select id="tableSel" />
  <input id="handNo" />
  <select id="streetStart" />
  <select id="btnSeat" />
  <input id="prePot" />

  <!-- 좌석 선택 (103-106) -->
  <div id="seatsRow" />

  <!-- 스택/홀카드 (108) -->
  <div id="stackGrid" />

  <!-- 보드 (110-116) -->
  <div id="boardRowRecord" />

  <!-- 액션 피드 (118-124) -->
  <div id="actionFeed" />

  <!-- 액션 패드 (126-134) -->
  <div class="actionDock">
    <div id="actionPad" />
    <button id="undoBtn">Undo</button>
    <button id="commitBtn">데이터 전송</button>
  </div>
</div>
```

##### 2.3 Review Panel (137-142줄)
```html
<div id="panelReview" class="hidden">
  <button id="refreshList">새로고침</button>
  <div id="list" />
  <div id="detail" />
</div>
```

##### 2.4 CSV Panel (144-180줄) ✨ NEW
```html
<div id="panelCSV" class="hidden">
  <h3>CSV Import/Export</h3>

  <!-- CSV Import -->
  <div>
    <h4>Import CSV</h4>
    <input type="file" id="csvFileInput" accept=".csv" />
    <label>
      <input type="checkbox" id="skipDuplicates" checked />
      중복 건너뛰기
    </label>
    <button id="importCSVBtn">CSV 가져오기</button>
    <button id="clearFileBtn">파일 선택 취소</button>
    <div id="importStatus"></div>
  </div>

  <!-- CSV Export -->
  <div>
    <h4>Export CSV</h4>
    <label>테이블 선택:</label>
    <select id="exportTableSel">
      <option value="">전체</option>
    </select>
    <label>최대:</label>
    <input id="exportLimit" type="number" value="50" min="1" max="500" />
    <button id="exportCSVBtn">CSV 내보내기</button>
    <div id="exportStatus"></div>
  </div>
</div>
```

##### 2.5 홀카드 오버레이 (188-192줄)
```html
<div id="overlay">
  <div class="box">
    <div id="ovTitle">홀카드 선택</div>
    <div id="boardRowOverlay" />
    <button onclick="closeOverlay()">닫기</button>
  </div>
</div>
```

#### 3. JavaScript 로직 (154-653줄)

##### 3.1 전역 상태 (`S`, 156-161줄)
```javascript
const S = {
  tables: [],           // 테이블 목록
  roster: {},           // { [table]: [{ seat, player, nation, chips }] }
  cfg: {},              // CONFIG { [table]: { btn_seat, hand_seq } }
  curTable: null,
  startStreetInit: 'PREFLOP',
  curStreet: 'PREFLOP',
  btnSeat: null,
  seats: [],            // 현재 테이블 좌석
  activeSeatMap: {},    // { [seat]: true }
  prePot: 0,
  actions: [],          // 액션 히스토리
  nextSeq: 1,
  board: [],            // 선택된 보드 카드
  toCall: 0,
  pot: 0,
  contrib: {},          // { [seat]: 기여액 }
  allin: {},            // { [seat]: true }
  folded: {},           // { [seat]: true }
  actorIdx: 0,          // 현재 턴 인덱스
  order: [],            // 턴 순서 배열
  acted: new Set(),     // 이번 스트릿 액션한 좌석
  holes: {},            // { [seat]: ['As', 'Kh'] }
  holePickSeat: null,
  handNo: '',
  stacks: {},           // { [seat]: 스택 }
  extSheetId: '',
  bbValue: 0
};
```

##### 3.2 초기화 (`initFromConfig`, 169-202줄)
```javascript
1. google.script.run.getConfig() 호출
2. S.tables, S.roster, S.cfg 설정
3. localStorage에서 extSheetId, bbValue 복원
4. tableSel 옵션 생성
5. 이벤트 핸들러 바인딩:
   - tableSel.onchange = onTableChange
   - streetStart.onchange → S.curStreet 변경
   - btnSeat.onchange → buildTurnOrder()
   - prePot.oninput → S.pot 재계산
   - undoBtn.onclick = undoOnce
   - commitBtn.onclick = commitHand
6. buildBoardUI('boardRowRecord', toggleBoardCard)
7. buildBoardUI('boardRowOverlay', pickCardOverlay)
8. setMode('record')
9. loadList()
```

##### 3.3 테이블 변경 (`onTableChange`, 221-232줄)
```javascript
1. S.curTable = e.target.value
2. roster[S.curTable] 파싱 → S.seats
3. S.activeSeatMap 초기화 (전체 true)
4. btnSel 옵션 생성 (cfg.btn_seat 기본값)
5. resetHandState(false)
```

##### 3.4 핸드 상태 리셋 (`resetHandState`, 235-240줄)
```javascript
S.contrib = {};
S.actions = [];
S.nextSeq = 1;
S.board = [];
S.holes = {};
S.pot = S.prePot;
S.toCall = 0;
S.allin = {};
S.folded = {};
S.acted = new Set();
S.curStreet = S.startStreetInit;
buildTurnOrder();
renderAll();
```

##### 3.5 턴 순서 구축 (`buildTurnOrder`, 242-256줄)
```javascript
1. active = seats.filter(activeSeatMap).sort()
2. btn = S.btnSeat

3. if (S.curStreet !== 'PREFLOP'):
   - BTN 다음부터 시작, BTN은 맨 뒤
   - start = active.findIndex(v > btn) || 0
   - rotated = active.slice(start) + active.slice(0, start)
   - filtered = rotated.filter(v !== btn)
   - if (btn in active): filtered.push(btn)
   - S.order = filtered

4. else (PREFLOP):
   - BTN 다음부터 시작
   - start = active.findIndex(v > btn) || 0
   - S.order = active.slice(start) + active.slice(0, start)

5. S.actorIdx = 0
6. skipInvalidActors()  // allin/folded 건너뛰기
```

##### 3.6 액션 처리 (`onAction`, 342-354줄)
```javascript
1. FOLD:
   - S.folded[seat] = true
   - applyAction({ seat, action:'FOLD', amt:0 })

2. CHECK:
   - if (S.toCall > 0): return
   - applyAction({ seat, action:'CHECK', amt:0 })

3. CALL:
   - need = max(0, maxContribAll() - contrib[seat])
   - applyAction({ seat, action:'CALL', amt:need })

4. BET/RAISE/ALLIN:
   - if (ALLIN && stacks[seat]):
     - def = stacks[seat] - contrib[seat]
   - val = prompt(`금액 입력 (${kind})`, def)
   - applyAction({ seat, action:kind, amt:val })
```

##### 3.7 액션 적용 (`applyAction`, 356-369줄)
```javascript
1. S.contrib[seat] += amt
2. if (ALLIN): S.allin[seat] = true
3. S.pot = S.prePot + sumObj(S.contrib)
4. if (BET/RAISE/ALLIN):
   - S.acted = new Set([seat])  // 리레이즈 가능
5. else if (CHECK/CALL):
   - S.acted.add(seat)
6. computeToCall()
7. S.actions.push({
     seq: S.nextSeq++,
     street: S.curStreet,
     seat, action, amount_input: amt,
     to_call_after: S.toCall,
     contrib_after_seat: S.contrib[seat],
     pot_after: S.pot
   })
8. advanceActor()
9. if (isStreetComplete()):
   - nxt = nextStreet(S.curStreet)
   - if (nxt):
     - S.curStreet = nxt
     - S.acted = new Set()
     - computeToCall()
     - buildTurnOrder()
```

##### 3.8 toCall 계산 (`computeToCall`, 376-382줄)
```javascript
1. maxC = maxContribAll()  // 모든 좌석 중 최대 contrib
2. maxNeed = 0
3. for (s of aliveNonAllin()):
   - need = max(0, maxC - contrib[s])
   - if (need > maxNeed): maxNeed = need
4. S.toCall = maxNeed
```

##### 3.9 스트릿 완료 체크 (`isStreetComplete`, 385줄)
```javascript
1. alive = aliveNonAllin()
2. if (alive.length <= 1): return true
3. everyoneActed = S.acted.size >= alive.length
4. return (S.toCall === 0 && everyoneActed)
```

##### 3.10 Undo (`undoOnce`, 387-399줄)
```javascript
1. if (actions.length === 0): return
2. last = actions.pop()
3. S.nextSeq--
4. S.contrib[last.seat] -= last.amount_input
5. if (last.action === 'ALLIN'): S.allin[last.seat] = false
6. if (last.action === 'FOLD'): S.folded[last.seat] = false
7. S.curStreet = actions.length ? actions[length-1].street : S.startStreetInit
8. S.pot = S.prePot + sumObj(S.contrib)
9. computeToCall()
10. S.actorIdx = max(0, actorIdx - 1) % order.length
11. S.acted = new Set(actions.filter(a.street === curStreet).map(a.seat))
12. buildTurnOrder()
```

##### 3.11 보드 UI 구축 (`buildBoardUI`, 402-412줄)
```javascript
1. for (suit of ['s','h','d','c']):
   - col = div.suitCol
   - for (rank of ['A','K','Q',...,'2']):
     - c = rank + suit
     - el = div.card
     - el.textContent = prettyCard(c)  // 'A♠'
     - el.onclick = () => handler(c, el)
     - col.appendChild(el)
   - box.appendChild(col)
```

##### 3.12 보드 카드 토글 (`toggleBoardCard`, 417-422줄)
```javascript
1. i = S.board.indexOf(card)
2. if (i >= 0):
   - S.board.splice(i, 1)
   - el.classList.remove('sel')
3. else:
   - if (S.board.length >= 5): return
   - S.board.push(card)
   - el.classList.add('sel')
```

##### 3.13 홀카드 오버레이 (`openHoleOverlay`, 437-442줄)
```javascript
1. S.holePickSeat = seat
2. ovTitle.textContent = `${seatName} · 홀카드`
3. updateOvCount_(seat)
4. overlay.style.display = 'flex'
```

##### 3.14 홀카드 선택 (`pickCardOverlay`, 443-459줄)
```javascript
1. if (S.board.includes(card)): return  // 보드 중복 차단
2. arr = S.holes[seat] || ['', '']
3. existsIdx = arr.indexOf(card)
4. if (existsIdx >= 0):
   - arr[existsIdx] = ''  // 선택 해제
5. else:
   - if (!arr[0]): arr[0] = card
   - else if (!arr[1]): arr[1] = card
   - else: arr[0] = arr[1]; arr[1] = card  // 교체
6. S.holes[seat] = arr
7. renderStackGrid()
8. if (arr[0] && arr[1]): closeOverlay()  // 2장 완료 시 자동 닫기
```

##### 3.15 커밋 (`commitHand`, 468-498줄)
```javascript
1. saveSettings_()  // extSheetId/bbValue localStorage 저장
2. payload = {
     client_uuid: uuid(),
     table_id: S.curTable,
     hand_no: S.handNo || '',
     start_street: S.startStreetInit,
     started_at: new Date().toISOString(),
     btn_seat: S.btnSeat,
     board: { f1, f2, f3, turn, river },
     pre_pot: S.prePot,
     actions: S.actions.map(x => {...x}),
     holes: S.holes,
     stack_snapshot: S.stacks
   }
3. ext = { sheetId: S.extSheetId.trim(), bb: S.bbValue }
4. google.script.run
   .withSuccessHandler(res => {
     - extInfo = external.updated ? `외부시트 row ${row} 갱신` : `스킵(${reason})`
     - msg.textContent = `완료: #${hand_no} (${hand_id})${extInfo}`
     - resetHandState(true)
     - loadList()
   })
   .withFailureHandler(err => msg.textContent = `오류: ${err}`)
   .saveHandWithExternal(payload, ext)
```

##### 3.16 리뷰 렌더링 (`renderDetailBlock_`, 622-646줄)
```javascript
1. g = groupByStreet_(acts)
2. stacks = safeJson_(head.stacks_json)
3. holes = safeJson_(head.holes_json)
4. stackLine = Object.keys(stacks).map(s => `${name}=${stacks[s]}`).join(', ')
5. holeLine = Object.keys(holes).map(s => `${name}=${h[0]}${h[1]}`).join(', ')
6. return `
     <div>Hand #${hand_no} · ${hand_id}</div>
     <div>Table ${table_id} · BTN ${btn_seat} · 시작: ${start_street}</div>
     <div>${boardBadges_(board)}</div>
     ${stackLine}
     ${holeLine}
     ${section_('PREFLOP', g.PREFLOP)}
     ${section_('FLOP', g.FLOP)}
     ${section_('TURN', g.TURN)}
     ${section_('RIVER', g.RIVER)}
   `
```

## 🔄 데이터 흐름

### Record 흐름
```
1. 초기화
   google.script.run.getConfig()
   → initFromConfig()
   → tableSel 옵션 생성

2. 테이블 선택
   tableSel.onchange
   → readRoster_()
   → S.seats, activeSeatMap 설정
   → btnSel 옵션 (cfg.btn_seat 복원)

3. 핸드 설정
   streetStart, btnSeat, prePot 입력
   → buildTurnOrder()
   → S.order, S.actorIdx 계산

4. 액션 입력
   actionPad 버튼 클릭
   → onAction(kind, seat)
   → applyAction({ seat, action, amt })
   → S.contrib, S.pot, S.actions 업데이트
   → computeToCall()
   → advanceActor()
   → isStreetComplete() 체크
     → nextStreet() → buildTurnOrder()

5. 커밋
   commitBtn.onclick
   → saveSettings_() (localStorage)
   → google.script.run.saveHandWithExternal(payload, ext)
     → withScriptLock_()
       → _saveCore_(payload)
         → 멱등성 체크
         → hand_id 생성
         → HANDS.appendRow()
         → ACTIONS.setValues()
         → upsertConfig_()
       → getHandDetail(hand_id)
       → updateExternalVirtual_(ext.sheetId, detail, ext)
         → parseTimeCellToTodayKST_()
         → pickRow 선택
         → setValue() × 5 (E,F,G,H,J)
     → log_('EXT_OK', ...)
   → resetHandState(true)
   → loadList()
```

### Review 흐름 (PC 2-Panel 전용)
```
초기화:
  setMode('review')
  → loadHandList()
    → google.script.run.queryHands({}, {num:1, size:50})
      → return { total, items }
    → renderHandList(items)  // 왼쪽 패널
    → if items.length > 0:
         loadDetailToPanel(items[0].hand_id)  // 오른쪽 패널에 첫 핸드 자동 로드

핸드 선택:
  handItem.onclick
  → loadDetailToPanel(hand_id)
    → 목록에서 선택 상태 표시 (이전 선택 제거, 현재 강조)
    → 오른쪽 패널 로딩 표시
    → google.script.run.getHandDetail(hand_id)
      → HANDS 행 찾기 → head
      → ACTIONS 필터/정렬 → acts
      → return { head, acts }
    → renderDetailContent(head, acts)
      → 헤더 섹션
      → 보드 섹션
      → 플레이어 섹션 (1줄 포맷)
      → 액션 타임라인 (텍스트 중심)

레이아웃:
  - 왼쪽 40%: 목록 (독립 스크롤, max-height: 75vh)
  - 오른쪽 60%: 상세 (독립 스크롤, max-height: 75vh)
  - CSS flex-direction: row
  - 목록 항상 보임 → 빠른 핸드 전환
```

### Review UI 목업 (v1.2.0 최적화)

#### 전체 레이아웃 (PC 1920×1080)
```
┌────────────────────────────────────────────────────────────────┐
│ [Record] [Review]                    Poker Hand Logger v1.1.1 │
├─────────────────────┬──────────────────────────────────────────┤
│ Review              │                                          │
│ [새로고침] 총 127건  │                                          │
│                     │                                          │
│ 왼쪽 패널 (40%)     │ 오른쪽 패널 (60%)                        │
│ max-height: 75vh    │ max-height: 75vh                         │
│ 독립 스크롤         │ 독립 스크롤                              │
└─────────────────────┴──────────────────────────────────────────┘
```

#### 왼쪽 패널: 목록
```
┌──────────────────────┐
│ Review               │
│ [새로고침] 총 127건   │
├──────────────────────┤
│                      │ ← 스크롤 시작
│ ┏━━━━━━━━━━━━━━━━┓ │ ← 선택된 핸드 (파란 테두리)
│ ┃ #12  T01 BTN 3  ┃ │
│ ┃ 75k  PREFLOP    ┃ │
│ ┃ [A♠][K♥][Q♦]... ┃ │ ← 작은 카드 배지 (32×32px)
│ ┃ 10-06 14:30     ┃ │
│ ┗━━━━━━━━━━━━━━━━┛ │
│                      │
│ ┌────────────────┐   │ ← 일반 핸드
│ │ #11  T02 BTN 1 │   │
│ │ 120k  FLOP     │   │
│ │ [K♠][K♥][7♦]   │   │
│ │ 10-06 14:25    │   │
│ └────────────────┘   │
│                      │
│ ┌────────────────┐   │
│ │ #10  T01 BTN 2 │   │
│ │ 55k  TURN      │   │
│ │ [9♠][9♥][9♦].. │   │
│ └────────────────┘   │
│                      │
│ ... (10건)           │
│                      │
│ [스크롤 하단 자동]   │ ← 100px 전 추가 로드
└──────────────────────┘
```

#### 오른쪽 패널: 상세
```
┌─────────────────────────────────────────┐
│ 핸드 #12           팟: 75,000 (75.0BB) │ ← 헤더 (3줄)
│ 20251006_143052                         │
│ T01 · BTN 3 · PREFLOP · 10-06 14:30   │
├─────────────────────────────────────────┤
│                                         │ ← 스크롤 시작
│ 보드                                    │
│ [A♠] [K♥] [Q♦] [2♠] [A♣]              │ ← 중간 배지 (44×44px)
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                         │
│ Alice (BTN)  [A♠][K♠]  50,000          │ ← 플레이어 (1줄)
│ Bob          [Q♦][Q♣]  45,000          │
│ Charlie      [J♠][T♠]  38,000          │
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                         │
│ PREFLOP                                 │ ← 스트릿 제목
│  Alice RAISE 5,000 → pot 5,000         │ ← 들여쓰기 12px
│  Bob CALL → pot 10,000                  │   RAISE=빨강
│  Charlie FOLD                           │   CALL=초록
│                                         │   FOLD=파랑
│ FLOP                                    │
│  Alice BET 10,000 → pot 20,000         │
│  Bob RAISE 25,000 → pot 45,000         │
│  Alice CALL → pot 60,000                │
│                                         │
│ TURN                                    │
│  Alice CHECK                            │
│  Bob BET 15,000 → pot 75,000           │
│  Alice FOLD                             │
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                         │
│ 최종 팟: 75,000 (75.0BB)               │
└─────────────────────────────────────────┘
```

#### 오른쪽 패널: 상세 (v1.3.0 VIRTUAL 갱신 추가)
```
┌─────────────────────────────────────────┐
│ 핸드 #12           팟: 75,000 (75.0BB) │ ← 헤더 (3줄)
│ 20251006_143052                         │
│ T01 · BTN 3 · PREFLOP · 10-06 14:30   │
├─────────────────────────────────────────┤
│                                         │ ← 스크롤 시작
│ 보드                                    │
│ [A♠] [K♥] [Q♦] [2♠] [A♣]              │
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                         │
│ Alice (BTN)  [A♠][K♠]  50,000          │
│ Bob          [Q♦][Q♣]  45,000          │
│ Charlie      [J♠][T♠]  38,000          │
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                         │
│ PREFLOP                                 │
│  Alice RAISE 5,000 → pot 5,000         │
│  Bob CALL → pot 10,000                  │
│  Charlie FOLD                           │
│                                         │
│ FLOP                                    │
│  Alice BET 10,000 → pot 20,000         │
│  Bob RAISE 25,000 → pot 45,000         │
│  Alice CALL → pot 60,000                │
│                                         │
│ TURN                                    │
│  Alice CHECK                            │
│  Bob BET 15,000 → pot 75,000           │
│  Alice FOLD                             │
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                         │
│ 최종 팟: 75,000 (75.0BB)               │
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← v1.3.0 추가
│                                         │
│ ┌───────────────────────────────────┐   │
│ │  🔄 VIRTUAL 시트에 갱신           │   │ ← 버튼 (파란색)
│ └───────────────────────────────────┘   │
│                                         │
│ ✅ 갱신 완료 (row 5)                   │ ← 상태 메시지
│ (또는)                                  │
│ ⚠️ 갱신 실패: no-match-by-time         │
│ (또는)                                  │
│ ❌ 오류: 핸드 조회 실패                 │
└─────────────────────────────────────────┘

버튼 스타일:
- width: 100%
- padding: 12px
- font-size: 1rem (28px 기준 28px)
- border-radius: 999px (pill 클래스)
- background: var(--acc) (#2a6fff)
- color: var(--text) (#e7eaf0)
- margin-top: 16px
- border-top: 1px solid var(--line)

상태 메시지 스타일:
- margin-top: 8px
- text-align: center
- font-size: small (0.75rem)
- 성공: color #22c55e (초록)
- 실패: color #ef4444 (빨강)
- 기본: color var(--muted) (#9aa3b2)
- 5초 후 자동 제거 (성공 시)
```

### Review 함수 설계 (v1.2.0 최적화)

#### 전역 상태
```javascript
let currentPage = 1;      // 현재 페이지 번호
let hasMore = true;       // 추가 로드 가능 여부
let selectedHandId = null; // 선택된 핸드 ID
const PAGE_SIZE = 10;      // 페이지당 10건
```

#### 핵심 함수 (7개)

**1. `loadHandList()`** - 초기화
```
currentPage = 1, hasMore = true
list.innerHTML = ''
loadHandPage(1)
list.onscroll = handleListScroll
```

**2. `loadHandPage(page)`** - 페이지 로드
```
queryHands({}, {num: page, size: 10})
if page === 1: list 초기화
appendHands(data.items)
hasMore = (data.items.length === 10)
if page === 1: 첫 핸드 자동 선택
```

**3. `appendHands(hands)`** - 목록 추가
```
for hand:
  div 생성 (4행: 핸드번호/팟/보드/시간)
  onclick = loadDetail(hand.hand_id)
  list.appendChild(div)
```

**4. `handleListScroll()`** - 무한 스크롤
```
if !hasMore: return
if scrollTop + clientHeight >= scrollHeight - 100:
  currentPage++
  loadHandPage(currentPage)
```

**5. `loadDetail(handId)`** - 상세 로드
```
selectedHandId = handId
updateSelectedState()
detail.innerHTML = "불러오는 중..."
getHandDetail(handId) → renderDetailContent()
```

**6. `updateSelectedState()`** - 선택 상태
```
모든 .seatCard에서 .selected 제거
현재 핸드에 .selected 추가
scrollIntoView({ block: 'nearest' })
```

**7. `renderDetailContent(head, acts)`** - 상세 렌더링
```
헤더: 핸드번호 + 최종팟 (3줄)
보드: 카드 배지
플레이어: 1줄 포맷 (이름+BTN+홀카드+스택)
액션 타임라인: 스트릿별 블록
  - 들여쓰기 12px
  - 색상: RAISE=빨강, CALL=초록, FOLD=파랑
```

#### CSS 추가

**2-Panel 레이아웃**
```css
#panelReview { display: flex; flex-direction: row; gap: 14px; }
#list { width: 40%; max-height: 75vh; overflow-y: auto; border-right: 1px solid var(--line); }
#detail { width: 60%; max-height: 75vh; overflow-y: auto; }
```

**선택 상태**
```css
.seatCard.selected { border: 2px solid var(--acc); background: #0e1322; }
```

**작은 카드 배지 (목록용)**
```css
.cardBadgeSmall { min-width: 32px; height: 32px; font-size: 0.75rem; border: 2px solid; }
```

**액션 색상**
```css
.action-raise, .action-bet { color: #ef4444; font-weight: 700; }
.action-call, .action-check { color: #22c55e; font-weight: 700; }
.action-fold { color: #3b82f6; font-weight: 700; }
```

#### 함수 의존성 분석 (v1.2.0 재설계)

### ⚠️ **중요: 함수 분류 원칙**

```
공용 함수 (삭제 절대 금지):
  - Record 모드에서 사용 중인 모든 함수
  - Review 모드도 사용하는 함수
  → 수정/삭제 시 Record 동작 중단!

Review 전용 함수 (정리 가능):
  - Review 모드에서만 사용
  - Record 모드 의존성 없음
  → 안전하게 개선 가능
```

---

### **1. 공용 함수 (Record ↔ Review 공유, 삭제 금지)**

| 함수 | 위치 | Record 사용 | Review 사용 | 역할 |
|------|------|------------|------------|------|
| `cardCode()` | 559줄 | ✅ (간접) | ✅ (직접) | 카드 정규화 |
| `prettyCard()` | 413줄 | ✅ (직접 3곳) | ✅ (직접 2곳) | 카드 심볼 변환 |
| `seatNameOnly()` | 277줄 | ✅ (직접 5곳) | ✅ (간접) | 이름 포맷 |
| `getSeatName()` | 598줄 | ✅ (직접 2곳) | ✅ (직접 3곳) | Roster 이름 조회 |
| `toInt()` | 651줄 | ✅ (전역 20+) | ✅ (전역) | 숫자 변환 |
| `safeJson_()` | 653줄 | ✅ (1곳) | ✅ (3곳) | JSON 파싱 |

**Record 의존성 상세**:
```javascript
// buildBoardUI() [408줄]
el.textContent = prettyCard(c);
  └─ prettyCard() [413줄]
       └─ cardCode() [559줄] ← ❌ 삭제 시 Record 보드 UI 깨짐!

// renderStackGrid() [297줄]
seatNameOnly(s.seat, s.name)
prettyCard(c1), prettyCard(c2)
  └─ cardCode() ← ❌ 삭제 시 홀카드 표시 깨짐!

// openHoleOverlay() [437줄]
seatNameOnly(seat, getSeatName(seat))
  └─ getSeatName() [598줄] ← ❌ 삭제 시 오버레이 깨짐!

// renderFeed() [331줄]
seatNameOnly(a.seat, getSeatName(a.seat))
  └─ getSeatName() [598줄] ← ❌ 삭제 시 액션 피드 깨짐!
```

---

### **2. Review 전용 함수 (안전하게 정리 가능)**

| 함수 | 위치 | Record 사용 | 삭제/개선 가능 | 이유 |
|------|------|------------|---------------|------|
| `boardArrayAny_()` | 575줄 | ❌ | ✅ 단순화 가능 | 복잡한 키 변환 → 간단한 배열 처리 |
| `suitClass_()` | 587줄 | ❌ | ✅ 삭제 가능 | CSS 클래스 직접 생성으로 대체 |
| `cardBadge_()` | 588줄 | ❌ | ✅ 삭제 가능 | 템플릿 리터럴로 대체 |
| `boardBadges_()` | 594줄 | ❌ | ✅ 삭제 가능 | map().join()으로 대체 |
| `seatNameOnlyFmt()` | 602줄 | ❌ | ✅ 삭제 가능 | 중복 래퍼 (직접 호출로 대체) |
| `actClass_()` | 603줄 | ❌ | ✅ 삭제 가능 | CSS 클래스 직접 생성 |
| `formatActBadge_()` | 611줄 | ❌ | ✅ 삭제 가능 | 템플릿 리터럴로 대체 |
| `groupByStreet_()` | 615줄 | ❌ | ✅ 개선 가능 | 언더스코어 제거 |
| `section_()` | 620줄 | ❌ | ✅ 삭제 가능 | HTML 직접 생성 |
| `renderDetailBlock_()` | 623줄 | ❌ | ✅ 개선 가능 | 단순화 + 이름 변경 |

---

### **3. 올바른 최적화 전략**

#### **Phase 1: 안전 확인 (삭제 전)**
```javascript
// ❌ 잘못된 접근
1. cardCode() 삭제 → prettyCard() 깨짐 → buildBoardUI() 깨짐 → Record 전체 중단

// ✅ 올바른 접근
1. 함수 호출 그래프 작성
2. Record 의존성 확인
3. Review 전용 함수만 선택
4. 단계별 삭제 + 테스트
```

#### **Phase 2: Review 전용 함수만 정리** (✅ v1.2.0-1.2.1 완료)
```javascript
// ✅ 삭제 완료 (6개 → renderCardBadge()로 통합)
- suitClass_() ✅ 삭제
- cardBadge_() ✅ 삭제
- actClass_() ✅ 삭제
- formatActBadge_() ✅ 삭제
- section_() ✅ 삭제

// ✅ 개선 완료 (4개)
- boardArrayAny_() → boardToArray() ✅
- groupByStreet_() → groupByStreet() ✅
- renderDetailBlock_() → renderDetailContent() ✅
- boardBadges_() → boardBadges() ✅

// ✅ 신규 헬퍼 추가 (v1.2.1)
- renderCardBadge(cs, size) - 카드 배지 통합 렌더링 (DRY)
- getSeatNameByTable(tableId, seat) - table_id 기반 Roster 조회
```

#### **Phase 3: 신규 기능 추가** (✅ v1.2.1 완료)
```javascript
// v1.2.0: 무한 스크롤 + 선택 상태
+ reviewState = {page, size, total, loading, hasMore, selectedId}
+ loadList(reset) - 목록 로드 (무한 스크롤 지원)
+ createListItem(it) - 목록 항목 생성 (작은 카드 배지)
+ selectAndLoadDetail(id, el) - 선택 + 상세 로드

// v1.2.1: 목업 완전 구현
+ renderCardBadge(cs, size='large') - 카드 배지 통합 (DRY, 버그 수정)
+ calculateFinalPot(head, acts) - 최종 팟 계산 (성능 최적화)
+ formatPotWithBB(pot, bb) - BB 변환 포맷팅 (NaN 방어)
+ renderPotHeader(head, acts) - 헤더 (팟 정보)
+ getSeatNameByTable(tableId, seat) - table_id 기반 Roster 조회 (버그 수정)
+ renderPlayerRows(head) - 플레이어 통합 뷰 (3컬럼 그리드)
+ renderPotFooter(head, acts) - 푸터 (최종 팟)
+ formatStreetSection(title, arr, tableId) - 스트릿 액션 섹션 (table_id 추가)
```

#### **Phase 4: 최종 결과** (v1.2.1)
```
Before (v1.1.1): 21개 함수
  - 공용: 6개 (유지)
  - Review 전용: 10개 (정리 대상)
  - 메인: 2개 (개선)
  - 유틸: 3개 (유지)

After (v1.2.1): 22개 함수
  - 공용: 7개 (getSeatNameByTable 추가)
  - Review 전용: 4개 (개선됨)
  - 신규: 11개 (v1.2.0 4개 + v1.2.1 7개)

코드량: 682줄 (v1.1.1) → 768줄 (v1.2.1) = +86줄 (+13%)
함수 품질: 중복 제거 (DRY), 버그 수정 4건, 코드 리뷰 9/10

핵심 개선:
  ✅ Record 안정성 100% 보장 (의존성 보존)
  ✅ 코드 중복 제거 (renderCardBadge 통합)
  ✅ 성능 최적화 (calculateFinalPot forEach 방식)
  ✅ 버그 수정 (localStorage 키, 홀카드 색상, 플레이어 이름, NaN 처리)
  ✅ 목업 완전 구현 (10/10)
```

---

### **4. 검증 체크리스트 (필수)**

```markdown
모든 변경 후 반드시 확인:

Record 모드 검증:
  - [ ] 보드 UI 카드 표시 (prettyCard 의존)
  - [ ] 홀카드 오버레이 (prettyCard, getSeatName 의존)
  - [ ] 액션 피드 (seatNameOnly, getSeatName 의존)
  - [ ] 스택 그리드 (seatNameOnly 의존)

Review 모드 검증:
  - [ ] 목록 로드 (boardArrayAny_ → boardToArray_)
  - [ ] 상세 렌더링 (새 함수들)
  - [ ] 카드 배지 표시
  - [ ] 액션 타임라인

크로스 검증:
  - [ ] Record → Review 전환 동작
  - [ ] Review → Record 전환 동작
  - [ ] 새로고침 후 양쪽 모드 정상
```

## 🔐 동시성 제어

### ScriptLock 전략
```javascript
withScriptLock_(fn) {
  for (i = 0; i < 3; i++) {
    try {
      L.waitLock(500)  // 0.5초 대기
      try {
        return fn()
      } finally {
        L.releaseLock()
      }
    } catch(e) {
      Utilities.sleep(150 + 150*i)  // 150ms, 300ms, 450ms
      if (i === 2) throw e
    }
  }
}
```

### 멱등성 보장
```javascript
// client_uuid + started_at 조합으로 중복 체크
for (r of H.rows) {
  if (r[idxClient] === payload.client_uuid &&
      r[idxStart] === payload.started_at) {
    return { ok:true, hand_id, idempotent:true }
  }
}
```

## 🎨 UI/UX 패턴

### 반응형 그리드
```css
/* 카드 그리드: 4열 (suit별) × 13행 (rank별) */
.boardWrap {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  max-height: 38vh;
  overflow: auto;
}

/* 액션 패드: 2열 균등 */
.actionDock .pad {
  grid-template-columns: repeat(2, 1fr);
}
```

### 상태 관리 패턴
```javascript
// 단일 진실 공급원 (Single Source of Truth)
const S = { /* 전역 상태 */ }

// 상태 변경 → renderAll() 호출
function applyAction() {
  // 상태 업데이트
  S.contrib[seat] += amt
  S.pot = ...
  S.actions.push(...)

  // UI 동기화
  renderAll()
}

// renderAll()은 모든 UI 컴포넌트 재렌더링
function renderAll() {
  renderSeatToggles()
  renderStackGrid()
  renderActionPad()
  renderTurnSeat()
  renderPot()
  renderFeed()
  syncBoardSelection('boardRowRecord')
}
```

## 📊 성능 고려사항

### 1. 배치 쓰기
```javascript
// ✅ ACTIONS 배치 insert
const rows = acts.map(a => [hand_id, seq, street, ...])
shA.getRange(lastRow+1, 1, rows.length, rows[0].length).setValues(rows)

// ❌ 외부 시트는 비연속 컬럼 → 개별 setValue
sh.getRange(pickRow, 5, 1, 1).setValue(E)
sh.getRange(pickRow, 6, 1, 1).setValue(F)
// ... (배치 불가)
```

### 2. 로그 최소화
```javascript
// 핵심 이벤트만 기록
log_('SAVE_EXT_BEGIN', ...)
log_('SAVE_OK', ...)
log_('EXT_PICKROW', ...)
log_('EXT_VALUES', ...)
log_('EXT_OK', ...)
log_('EXT_FAIL', ...)
```

### 3. 클라이언트 캐싱
```javascript
// localStorage 영구 저장
localStorage.setItem('phl_extSheetId', S.extSheetId)
localStorage.setItem('phl_bbSize', S.bbValue)

// 초기화 시 복원
S.extSheetId = localStorage.getItem('phl_extSheetId') || ''
S.bbValue = toInt(localStorage.getItem('phl_bbSize') || '0')
```

## 🧪 테스트 케이스

### 1. 멱등성 테스트
```
1. payload1 생성 (uuid=A, started_at=T1)
2. saveHand(payload1) → hand_id=H1
3. saveHand(payload1) → hand_id=H1, idempotent=true
4. HANDS 시트 확인: H1 행 1개만 존재
```

### 2. 턴 순서 테스트
```
테이블: [1,2,3,4], BTN=2

Preflop:
  order = [3,4,1,2]

Flop:
  order = [3,4,1] (BTN 제외)
  if BTN alive: order.push(2) → [3,4,1,2]
```

### 3. toCall 계산 테스트
```
contrib = { 1:100, 2:200, 3:200 }
aliveNonAllin = [1,2,3]

maxC = 200
S1 need = 200-100 = 100
S2 need = 200-200 = 0
S3 need = 200-200 = 0
toCall = max(100,0,0) = 100
```

### 4. C열 파싱 테스트
```
1. Date(2025,10,5,14,30,0) → 14:30:00
2. 0.604166667 (14:30 = 14.5/24) → 14:30:00
3. "14:30" → 14:30:00
4. "2:05 PM" → (정규식 실패) → null
```

### 5. 외부 시트 행 선택 테스트
```
C열: ["10:00", "12:00", "14:00", "16:00"]
now = 13:45 KST

parseTime("10:00") = 10:00 ≤ 13:45 ✓
parseTime("12:00") = 12:00 ≤ 13:45 ✓ (최신)
parseTime("14:00") = 14:00 > 13:45 ✗
parseTime("16:00") = 16:00 > 13:45 ✗

pickRow = 3 (12:00 행)
```

## 🔧 확장 포인트

### 1. 새 액션 타입 추가
```javascript
// onAction() 확장
if (kind === 'STRADDLE') {
  const amt = prompt('스트래들 금액')
  applyAction({ seat, action:'STRADDLE', amt })
}

// actClass_() 확장
if (k === 'STRADDLE') return 'act-straddle'

// CSS 추가
.act-straddle {
  border-color: #8b5cf6;
  background: rgba(139,92,246,.15);
}
```

### 2. 사이드팟 계산
```javascript
function computeSidePots() {
  const allIn = Object.entries(S.allin)
    .filter(([_, v]) => v)
    .map(([s, _]) => ({ seat:s, contrib:S.contrib[s] }))
    .sort((a,b) => a.contrib - b.contrib)

  const pots = []
  let prevCap = 0

  for (const {seat, contrib} of allIn) {
    const eligible = Object.keys(S.contrib)
      .filter(s => !S.folded[s] && S.contrib[s] >= contrib)
    const amount = eligible.reduce((sum, s) =>
      sum + Math.min(S.contrib[s], contrib) - prevCap
    , 0)
    pots.push({ cap:contrib, amount, eligible })
    prevCap = contrib
  }

  return pots
}
```

### 3. 스트릿별 보드 검증
```javascript
function validateBoard() {
  const boardLen = S.board.length
  const minCards = {
    'PREFLOP': 0,
    'FLOP': 3,
    'TURN': 4,
    'RIVER': 5
  }

  if (boardLen < minCards[S.curStreet]) {
    return { valid:false, msg:`${S.curStreet}는 최소 ${minCards[S.curStreet]}장 필요` }
  }
  return { valid:true }
}
```

### 4. 핸드 히스토리 내보내기
```javascript
function exportHandHistory(hand_id) {
  const { head, acts } = getHandDetail(hand_id)
  const lines = [
    `Hand #${head.hand_no} - ${head.started_at}`,
    `Table: ${head.table_id}, BTN: ${head.btn_seat}`,
    `Board: ${boardArrayAny_(head.board).join(' ')}`,
    '',
    ...acts.map(a =>
      `${a.street} - Seat ${a.seat}: ${a.action} ${a.amount_input || ''}`
    )
  ]
  return lines.join('\n')
}
```

## 🐛 알려진 제약사항

### 1. 보드↔홀카드 중복
- **현재**: 보드→홀카드 단방향 차단만 구현
- **제한**: 홀카드 선택 후 보드에 같은 카드 선택 가능 (역방향 미차단)
- **해결**: `toggleBoardCard()`에 홀카드 체크 추가
  ```javascript
  if (Object.values(S.holes).flat().includes(card)) return
  ```

### 2. ALLIN 스택 계산
- **현재**: 수동 입력 (stacks[seat] 참고용)
- **제한**: 스택이 없으면 기본값 없음
- **해결**: 스택 필수 입력 또는 contrib 기반 역산

### 3. 턴 순서 예외
- **현재**: allin/folded 자동 건너뛰기
- **제한**: 50회 루프 가드 (무한루프 방지)
- **해결**: 순서 배열에서 사전 제거
  ```javascript
  S.order = active.filter(s => !S.allin[s] && !S.folded[s])
  ```

### 4. 외부 시트 Time 포맷
- **현재**: HH:mm(:ss) 정규식만 지원
- **제한**: "2:05 PM", "오후 2시 5분" 등 미지원
- **해결**: moment.js 또는 Apps Script `Utilities.parseDate()` 활용
