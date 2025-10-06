# LLD - Poker Hand Logger v2.3

> **기술 설계** | 비전: [PLAN](PLAN_HandLogger.md) | 작업: [PRD](PRD_HandLogger.md) | 상태: [STATUS](STATUS.md)

## 📑 목차

1. [아키텍처 다이어그램](#🏗-아키텍처)
2. [code.gs 모듈](#code.gs-모듈-목차)
3. [index.html 모듈](#index.html-모듈-목차)
4. [데이터 스키마](#데이터-스키마)
5. [외부 연동 로직](#외부-시트-연동)

---

## 🏗 아키텍처

```
┌────────────────────────────────────┐
│   Web Client (index.html)          │
│   - Record UI (핸드 입력)           │
│   - Review UI (히스토리 조회)        │
│   - LocalStorage (설정 영구 저장)    │
└──────────┬─────────────────────────┘
           │ google.script.run
           ▼
┌────────────────────────────────────┐
│   Google Apps Script (code.gs)     │
│   - doGet() 웹앱 진입점              │
│   - commitHand() 핸드 저장           │
│   - queryHands() 리뷰 목록           │
│   - updateExternalVirtual_() 연동    │
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│   Google Sheets (1개 파일) ⭐       │
│   ┌────────────────────────────┐   │
│   │ APP_SPREADSHEET            │   │
│   │ - HANDS (핸드 데이터)       │   │
│   │ - ACTIONS (액션 로그)       │   │
│   │ - CONFIG (BTN/hand_seq)    │   │
│   │ - LOG (시스템 로그)          │   │
│   │ - Type (테이블/플레이어) ⭐  │   │
│   └────────────────────────────┘   │
└────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│   External Sheet (VIRTUAL)         │
│   - C열(Time) 기준 행 매칭           │
│   - E,F,G,H,J 열 자동 갱신           │
└────────────────────────────────────┘
```

---

## code.gs 모듈 목차

### 글로벌 상수 (12-27줄)
- `VERSION`, `APP_SPREADSHEET_ID`, `SH`, `ROSTER_HEADERS`

### 유틸리티 (37-101줄)
- `withScriptLock_()` - 락 관리 (500ms, 3회 재시도)
- `appSS_()`, `getOrCreateSheet_()`, `setHeaderIfEmpty_()`
- `readAll_()` - 시트 전체 읽기 (header/rows/map 반환)
- `findColIndex_()` - 다중 별칭 컬럼 찾기
- `toInt_()`, `nowKST_()`, `todayStartKST_()`
- `ensureSheets_()` - 5개 시트 헤더 초기화

### Type 시트 (110-136줄) ⭐ v2.3 통합
- `readRoster_()` - Type 시트 → `{ tables: [], roster: {} }`
- **변경**: `appSS_()` 사용 (이전: rosterSS_())

### CONFIG 관리 (138-265줄)
- `readConfig_()` - CONFIG → `{ [table_id]: { btn_seat, hand_seq } }`
- `getConfig()` - 클라이언트 API
- `nextHandSeq_()` - hand_seq 자동 증가
- `resetHandSeq()` - 시퀀스 리셋
- `upsertConfig_()` - BTN 업데이트

### 핸드 저장 (145-237줄)
- `saveHand()` - 기본 저장
- `saveHandWithExternal()` - 외부 시트 연동
- `_saveCore_()` - 멱등성 + HANDS/ACTIONS append

### 리뷰 (267-355줄)
- `queryHands()` - 페이징 목록
- `getHandDetail()` - 상세 조회

### 외부 시트 연동 (357-547줄)
- `parseTimeCellToTodayKST_()` - C열 Time 파싱
- `updateExternalVirtual_()` - VIRTUAL 시트 갱신
- `buildFileName_()` - F열 파일명 생성
- `buildHistoryBlock_()` - H열 히스토리 3줄 요약

### CSV Import/Export (564-1233줄)
- `importHandsFromCSV()` - CSV → HANDS/ACTIONS
- `exportHandsToCSV()` - HANDS/ACTIONS → CSV
- `convertHandBlock_()` - HAND/PLAYER/EVENT 행 파싱

### 로그 (552-560줄)
- `log_()` - LOG 시트 기록 (ts/func/table_id/code/msg/user)

---

## index.html 모듈 목차

### CSS 스타일 (8-87줄)
- CSS 변수 (--bg, --panel, --acc, ...)
- 주요 클래스 (.wrap, .panel, .pill, .card, .actionDock)
- Review 스타일 (.cardBadge, .actBadge)

### HTML 구조 (89-192줄)
- Header (모드 전환 버튼)
- Record Panel (테이블 선택/액션 입력/보드 선택)
- Review Panel (List + Detail 2-Panel)
- 홀카드 오버레이

### JavaScript 로직 (154-872줄)
- 전역 상태 `S` (tables/roster/curTable/seats/actions/board/holes/...)
- `initFromConfig()` - 초기화
- `onTableChange()` - 테이블 전환
- `buildTurnOrder()` - 턴 순서 계산
- `onAction()` - 액션 처리 (CHECK/CALL/BET/RAISE/FOLD/ALLIN)
- `applyAction()` - 상태 업데이트 + 스트릿 전환
- `computeToCall()` - toCall 계산
- `undoOnce()` - 마지막 액션 되돌리기
- `toggleBoardCard()` - 보드 카드 선택
- `pickCardOverlay()` - 홀카드 선택
- `commitHand()` - 핸드 커밋 (google.script.run.saveHandWithExternal)
- `loadList()`, `loadDetail()` - Review 모드 렌더링

---

## 🔍 AI 인덱스

### PRD 1.1 핸드 실시간 기록
- `index.html:342-369` - `onAction()`, `applyAction()`
- `code.gs:176-237` - `_saveCore_()`

### PRD 1.2 키 플레이어 관리
- `code.gs:110-136` - `readRoster_()` (Type 시트 파싱)
- `index.html:263-275` - `onTableChange()` (테이블 전환)

### PRD 1.3 외부 시트 자동 갱신
- `code.gs:358-387` - `parseTimeCellToTodayKST_()` (C열 파싱)
- `code.gs:389-434` - `updateExternalVirtual_()` (E,F,G,H,J 갱신)
- `code.gs:448-481` - `buildFileName_()`, `buildHistoryBlock_()`

### PRD 1.4 핸드 리뷰
- `code.gs:268-298` - `queryHands()` (페이징)
- `code.gs:300-355` - `getHandDetail()` (상세)
- `index.html:500-653` - `loadList()`, `renderDetailBlock_()`

### PRD 1.5 단일 파일 아키텍처
- `code.gs:20` - `APP_SPREADSHEET_ID` (단일 파일)
- `code.gs:26` - `SH.TYPE` 상수 추가
- `code.gs:112` - `appSS_()` 사용 (rosterSS_() 삭제)

### PRD 3.1 CSV Import/Export
- `code.gs:574-650` - `importHandsFromCSV()`
- `code.gs:657-682` - `exportHandsToCSV()`
- `code.gs:723-811` - `convertHandBlock_()` (HAND/PLAYER/EVENT 파싱)

---

## 🧠 기술 결정

### 왜 단일 파일 아키텍처? (v2.3)
- **PLAN 근거**: 데이터 매니저가 대회 전 Type 시트 입력 → 관리 파일 수 최소화
- **선택 이유**:
  - 파일 관리 복잡도 감소 (2개 → 1개)
  - Type 시트와 HANDS/ACTIONS 동일 파일 → 트랜잭션 일관성 향상
  - 외부 파일 의존성 제거
- **트레이드오프**: Type 시트 크기 증가 시 appSS_() 로드 시간 증가 (현재: 무시 가능)

### 왜 멱등성 (client_uuid + started_at)?
- **PLAN 근거**: 데이터 정확도 100% (중복 제출 방지)
- **선택 이유**:
  - 네트워크 불안정 환경에서 재시도 시 중복 저장 방지
  - hand_id는 생성 후 값이므로 중복 체크 불가
  - client_uuid (브라우저) + started_at (시각) 조합으로 유일성 보장
- **트레이드오프**: HANDS 시트 전체 스캔 필요 (성능: O(n), n=핸드 수)

### 왜 ScriptLock 500ms + 3회 재시도?
- **PLAN 근거**: 동시 사용자 충돌 방지 (대회장에서 여러 데이터 매니저)
- **선택 이유**:
  - 500ms 대기 → 반응성 유지 (2초 이내 응답)
  - 3회 재시도 → 성공률 99% 이상
  - 150ms backoff → 순차적 완화
- **트레이드오프**: 최대 지연 = 500 + 150 + 300 + 450 = 1400ms

### 왜 보드 카드 터치 UI?
- **PLAN 근거**: 모바일 우선 (대회장에서 스마트폰 사용)
- **선택 이유**:
  - 카드 52장 그리드 → 드롭다운보다 빠름 (1탭 vs 3탭)
  - 터치 영역 54px → 오터치 방지
  - 실시간 선택 해제 (재탭)
- **트레이드오프**: 화면 공간 소비 (38vh)

### 왜 VIRTUAL 시트 C열 Time 기준 매칭?
- **PLAN 근거**: 프로덕션 팀이 VIRTUAL 시트에서 사전에 Time 입력 → 핸드 기록 시 해당 행에 자동 갱신
- **선택 이유**:
  - Time ≤ nowKST 중 최신 행 선택 (아래→위 검색)
  - Date/숫자/문자열 혼합 데이터 파싱 지원
  - row 번호 반환 → 정확한 행 식별
- **트레이드오프**: Time 포맷 오류 시 매칭 실패 (null 반환)

### 왜 Type 시트 다중 별칭 지원?
- **PLAN 근거**: 다양한 대회 포맷 대응 (컬럼명 통일 불가)
- **선택 이유**:
  - "Table No." / "TableNo" / "Table_Number" 전부 인식
  - 사용자 에러 감소 (컬럼명 변경 불필요)
- **트레이드오프**: 코드 복잡도 증가 (findColIndex_ 함수)

### 왜 contrib 기반 팟 계산?
- **PLAN 근거**: 실시간 정확한 팟 표시 (데이터 매니저 검증 가능)
- **선택 이유**:
  - contrib[seat] = 좌석별 누적 기여액
  - pot = prePot + sum(contrib)
  - toCall = max(maxContrib - contrib[s]) for aliveSeats
- **트레이드오프**: 복잡한 로직 (사이드팟 미지원)

---

## 데이터 스키마

### HANDS 시트
| 컬럼 | 타입 | AI 인덱스 |
|------|------|----------|
| hand_id | String | `code.gs:206` (생성) |
| client_uuid | String | `index.html:473` (생성) |
| table_id | String | `S.curTable` |
| hand_no | String | `code.gs:210` (nextHandSeq_) |
| btn_seat | String | `S.btnSeat` |
| board_* | String | `S.board` → f1/f2/f3/turn/river |
| stacks_json | JSON | `S.stacks` |
| holes_json | JSON | `S.holes` |
| schema_ver | String | `VERSION` ("v2.3") |

### ACTIONS 시트
| 컬럼 | 타입 | AI 인덱스 |
|------|------|----------|
| hand_id | String | 외래키 |
| seq | Number | `S.nextSeq++` |
| street | String | `S.curStreet` |
| seat | String | 액션 좌석 |
| action | String | CHECK/CALL/BET/RAISE/FOLD/ALLIN |
| amount_input | Number | 입력 금액 |
| to_call_after | Number | `S.toCall` |
| contrib_after_seat | Number | `S.contrib[seat]` |
| pot_after | Number | `S.pot` |

### CONFIG 시트
| 컬럼 | 타입 | AI 인덱스 |
|------|------|----------|
| table_id | String | 테이블 ID |
| btn_seat | String | 마지막 BTN |
| hand_seq | Number | 자동 증가 시퀀스 |
| updated_at | Date | 갱신 시각 |

### Type 시트 ⭐ v2.3 추가, v2.5 상세화
| 컬럼 | 타입 | 예시 | 용도 | AI 인덱스 |
|------|------|------|------|----------|
| **Poker Room** | String | `Main Hall` | 대회장 구분 | `code.gs:readRoster_()` |
| **Table Name** | String | `Feature Table` | 테이블 명칭 | - |
| **Table No.** | String | `T15` | 테이블 번호 (T01~T80) | `code.gs:readRoster_()` 키 |
| **Seat No.** | Number | `3` | 좌석 번호 (1~9) | `code.gs:readRoster_()` |
| **Players** | String | `Kim Pro` | 플레이어 이름 | `code.gs:nameShort_()` |
| **Nationality** | String | `KR` | 국적 코드 (ISO 3166-1 alpha-2) | `code.gs:buildSubtitleBlock_()` ⭐ v2.5 |
| **Chips** | Number | `750000` | 시작 칩 | `code.gs:inferStack_()` (Phase 3.2) |
| **Keyplayer** | String/Boolean | `Y` / `TRUE` | 키 플레이어 여부 | `code.gs:buildSubtitleBlock_()` 필터 ⭐ v2.5 |

**참고**:
- `Nationality`: J열 자막 생성 시 국기 표시 (`KR`, `US`, `RU` 등)
- `Keyplayer`: J열 자막 생성 시 Y/TRUE인 플레이어만 출력 (필수 필터)

---

## 외부 시트 연동

### VIRTUAL 시트 구조 (v2.5+)
| 열 | 내용 | 입력 주체 | AI 인덱스 |
|----|------|----------|----------|
| **A** | (사용 안 함) | - | - |
| **B** | (사용 안 함) | - | - |
| **C** | **Time** (HH:MM, 예: `12:20`) | 편집팀 사전 입력 | `code.gs:extractTimeHHMM_()` |
| **D** | (사용 안 함) | - | - |
| **E** | **상태** (`미완료`) | HandLogger 자동 | `code.gs:pushToVirtual()` |
| **F** | **파일명** (VT15_Kim.Pro_AsKs_vs_Park.Second_QdQc) | HandLogger 자동 | `code.gs:buildFileName_()` |
| **G** | **등급** (`A` 고정) | HandLogger 자동 | `code.gs:pushToVirtual()` |
| **H** | **히스토리** (플레이어/보드/팟) | HandLogger 자동 | `code.gs:buildHistoryBlock_()` |
| **I** | (사용 안 함) | - | - |
| **J** | **자막** (이름/국기/스택/BB) | HandLogger 자동 | `code.gs:buildSubtitleBlock_()` |

### 워크플로우 (v2.5+)

#### 1️⃣ 사전 준비 (편집팀)
```
VIRTUAL 시트 C열에 time.log 값 미리 입력:
Row 2: 12:00
Row 3: 12:01
Row 4: 12:02
...
Row 121: 14:00
```

#### 2️⃣ 핸드 기록 (Henry - 현장)
```
1. Record 모드에서 핸드 입력
2. started_at = "2025-10-06T12:20:35Z" (ISO 8601 자동 생성)
3. Commit → HANDS/ACTIONS 시트만 저장
```

#### 3️⃣ VIRTUAL 전송 (v2.5 - C열 Time 매칭)
```javascript
// Review 모드 → 핸드 선택 → "VIRTUAL 전송" 버튼 클릭
pushToVirtual(hand_id, sheetId, bb) {
  // Step 1: ISO → HH:MM KST 변환
  const isoTime = "2025-10-06T03:20:35Z"; // UTC
  const hhmmTime = extractTimeHHMM_(isoTime); // "12:20" (KST = UTC+9)

  // Step 2: VIRTUAL C열 읽기 (행4부터, 헤더 3행 스킵)
  const cCol = sh.getRange(4, 3, lastRow-3, 1).getValues(); // Date 객체

  // Step 3: C열 Date 객체 → HH:MM 매칭
  let targetRow = -1;
  for (let i = 0; i < cCol.length; i++) {
    const rawValue = cCol[i][0];
    let cellTime = '';

    // Date 객체 처리 (Google Sheets Time 형식)
    if (rawValue instanceof Date) {
      cellTime = String(rawValue.getHours()).padStart(2, '0') + ':' +
                 String(rawValue.getMinutes()).padStart(2, '0');
    } else {
      cellTime = String(rawValue).trim();
    }

    if (cellTime === hhmmTime) {
      targetRow = i + 4; // 배열 인덱스 → 시트 행 번호 (헤더 오프셋)
      break;
    }
  }

  // Step 4: 매칭 실패 처리
  if (targetRow === -1) {
    log_('VIRTUAL_NOMATCH', `hhmmTime=${hhmmTime} sample=[...]`);
    throw new Error(`VIRTUAL 시트에 Time=${hhmmTime} 행이 없습니다. LOG 시트 확인`);
  }

  // Step 5: F열 멱등성 체크
  const existingF = sh.getRange(targetRow, 6).getValue();
  if (existingF && String(existingF).trim()) {
    return {success: true, idempotent: true, row: targetRow};
  }

  // Step 6: E/F/G/H/J 열만 개별 업데이트 (A/B/C/D/I 미사용)
  sh.getRange(targetRow, 5).setValue('미완료');  // E: 상태
  sh.getRange(targetRow, 6).setValue(F);         // F: 파일명
  sh.getRange(targetRow, 7).setValue('A');       // G: 등급 (고정)
  sh.getRange(targetRow, 8).setValue(H);         // H: 히스토리
  sh.getRange(targetRow, 10).setValue(J);        // J: 자막 (Keyplayer 필터링)

  return {success: true, hand_id, row: targetRow, fileName: F, time: hhmmTime};
}
```

### Time 매칭 로직 (`extractTimeHHMM_`) - v2.5
```javascript
function extractTimeHHMM_(isoString) {
  // ISO 8601 → HH:MM (KST 타임존 변환)
  // 예시:
  // - "2025-10-06T03:20:35Z" (UTC) → "12:20" (KST = UTC+9)
  // - "2025-10-06T09:59:47.379Z" → "18:59"

  const date = new Date(isoString);

  // KST 타임존 적용 (UTC+9)
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  const hours = String(kstDate.getUTCHours()).padStart(2, '0');
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}
```

**핵심**:
- Google Sheets Time 형식은 Date 객체로 저장됨
- `getHours()`는 **스크립트 타임존**에 따라 자동 변환
- VIRTUAL C열 Date 객체는 이미 KST로 표시되므로 `getHours()` 직접 사용

### 자막 생성 로직 (`buildSubtitleBlock_`)
```javascript
function buildSubtitleBlock_(detail, tableId, bb) {
  const seats = participantsOrdered_(detail); // [3, 8]
  const stacks = safeJson_(detail.head.stacks_json);
  const roster = readRoster_().roster || {};
  const arr = roster[tableId] || [];
  const lines = [];
  const bbValue = toInt_(bb) || 1;

  seats.forEach(s => {
    const player = arr.find(x => String(x.seat) === String(s));
    if(!player) return; // TYPE 시트에 없으면 스킵

    // ⭐ Keyplayer 필터링 (Y/TRUE만 자막 출력)
    const isKey = String(player.keyplayer || '').trim().toUpperCase();
    if(isKey !== 'Y' && isKey !== 'TRUE') return;

    const name = (player.player || `Seat ${s}`).toUpperCase(); // "KIM PRO"
    const nation = player.nationality || player.nation || '';  // "KR" ⭐ TYPE 시트 Nationality 컬럼
    const stack = toInt_(stacks[s]) || 0;
    const stackFormatted = numComma_(stack);  // "750,000"
    const bbCount = Math.round(stack / bbValue); // 37

    lines.push(`${name} / ${nation}`);
    lines.push(`CURRENT STACK - ${stack.toLocaleString()} (${bbCount}BB)`);
    lines.push(''); // 빈 줄
  });

  return lines.join('\n').trim();
}

// 출력 예시:
// KIM PRO / KR
// CURRENT STACK - 750,000 (37BB)
//
// PARK SECOND / US
// CURRENT STACK - 920,000 (46BB)
```

### 의존성 체크
✅ **필수**:
- `csv/time.log` 파일 존재 (HH:MM 1440줄) ✅ 확인 완료
- VIRTUAL 시트 C열에 Time 값 사전 입력 (편집팀 자동화 프로토콜) ✅ 완료
- `head.started_at` 필드 (ISO 8601 시간) ✅ 구현됨
- TYPE 시트 `Nationality` 컬럼 (ISO 3166-1 alpha-2) ✅ 확인 완료

✅ **필수** (v2.5+):
- TYPE 시트 `Keyplayer` 컬럼 (Y/TRUE만 J열 자막 출력)

### DEPRECATED (v2.5+)
❌ `updateExternalVirtual_()` - C열 Time 이하 행 검색 방식 (v2.3)
❌ `parseTimeCellToTodayKST_()` - Date 객체 파싱 (v2.3)
❌ `appendRow()` 방식 - 새 행 추가 (v2.4)

### 에러 처리
```javascript
// Case 1: Time 매칭 실패
if (targetRow === -1) {
  throw new Error(`VIRTUAL 시트에 Time=${hhmmTime} 행이 없습니다. time.log 확인 필요`);
}

// Case 2: 중복 전송
if (existingF) {
  log_('PUSH_VIRTUAL_SKIP', `Already filled: row=${targetRow} F=${existingF}`);
  return {success:true, idempotent:true};
}
```

---

## 🔗 관련 문서

- [PLAN_HandLogger.md](PLAN_HandLogger.md) - 프로젝트 비전
- [PRD_HandLogger.md](PRD_HandLogger.md) - 작업 목록
- [STATUS.md](STATUS.md) - 현재 상태
- [CHANGELOG.md](CHANGELOG.md) - 변경 이력
