# PLAN - Poker Hand Logger

## 📌 프로젝트 개요
- **목표**: 포커 핸드 실시간 기록 및 외부 시트 연동 시스템 유지보수
- **현재 버전**: v2.0.1 (2025-10-06) ✅ **구현 완료 (검증 대기)**
- **현재 상태**: ✅ Hand 시트 **행 타입별 저장** 완료, **다음 세션 검증 예정**
- **주요 컴포넌트**: Google Apps Script (Code.gs) + Web App (index.html)
- **다음 작업**: [README.md 테스트 가이드](../README.md#-%EB%8B%A4%EC%9D%8C-%EC%84%B8%EC%85%98-%EA%B2%80%EC%A6%9D-%EA%B0%80%EC%9D%B4%EB%93%9C) 참조

---

## 🚨 **v2.0.0 대형 패치**

### 📋 패치 개요
**목표**: 데이터 아키텍처 단일화 및 Hand 시트 설계
**작업 기간**: 2025-10-06
**진행 상태**: 📝 문서 업데이트 완료 → 💻 코드 구현 대기

### 🔄 주요 변경사항

#### 1. 스프레드시트 구조 단일화
**Before (v1.x)**:
```
APP_SPREADSHEET (19e7eDjoZRFZooghZJF3XmOZzZcgmqsp9mFAfjvJWhj4)
├── HANDS 시트
├── ACTIONS 시트
├── CONFIG 시트
└── LOG 시트

ROSTER_SPREADSHEET (1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U)
└── Type 시트
```

**After (v2.0)**:
```
ROSTER_SPREADSHEET (1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U)
├── Type 시트 (기존 유지)
└── Hand 시트 (신규)
```

**폐기 대상**:
- ❌ APP_SPREADSHEET 전체 (시트 ID: 19e7eDjoZRFZooghZJF3XmOZzZcgmqsp9mFAfjvJWhj4)
- ❌ HANDS 시트 (6개 시트 → 1개 시트로 통합)
- ❌ ACTIONS 시트 (JSON 필드로 통합)
- ❌ CONFIG 시트 (불필요)
- ❌ LOG 시트 (불필요)

#### 2. Hand 시트 설계 (⚠️ Option A - 행 타입별 저장 방식으로 최종 변경)

**참조 데이터**: [csv/Virtual_Table_Data - Hand.csv](../csv/Virtual_Table_Data - Hand.csv) (2,866 lines, 5가지 row type)

**스키마 설계 근거**:
- CSV 파일 완전 분석 완료 ([CSV_ANALYSIS_Hand.md](CSV_ANALYSIS_Hand.md))
- Hand block 구조: GAME → PAYOUTS → HAND → PLAYER(n) → EVENT(m)
- Option A (Raw CSV): 5가지 row type 유지 → 복잡도 높음
- Option B (Normalized): HANDS/ACTIONS 분리 → 폐기 방침 위배
- **Option C (JSON 통합)**: 1 row per hand + JSON fields ✅ **선택**

**Hand 시트 컬럼 (19개) - v2.0.1**:
| # | 컬럼명 | 타입 | 필수 | 설명 | CSV 매핑 |
|---|--------|------|------|------|----------|
| 1 | hand_id | String | ✅ | 고유 핸드 ID | 자동 생성 |
| 2 | hand_no | Number | ✅ | 핸드 번호 | HAND[2] |
| 3 | timestamp | Number | ✅ | Unix 타임스탬프 (ms) | HAND[3] * 1000 |
| 4 | table_id | String | ✅ | 테이블 ID | HAND[17] |
| 5 | game_type | String | ✅ | HOLDEM/OMAHA | HAND[4] |
| 6 | stakes_type | String | ✅ | BB_ANTE/NO_ANTE | HAND[5] |
| 7 | bb | Number | ✅ | Big Blind | 조건부 (HAND[6] or [9]) |
| 8 | sb | Number | ✅ | Small Blind | HAND[8] |
| 9 | bb_ante | Number | ❌ | BB Ante | 조건부 (HAND[9] or [10]) |
| 10 | btn_seat | Number | ✅ | BTN 좌석 | HAND[11] |
| 11 | sb_seat | Number | ✅ | SB 좌석 | HAND[12] |
| 12 | bb_seat | Number | ✅ | BB 좌석 | HAND[13] |
| 13 | board_json | JSON | ❌ | 보드 카드 배열 | EVENT(BOARD) → ["Kh", "10d"] |
| 14 | players_json | JSON | ✅ | 플레이어 정보 배열 | PLAYER rows 통합 |
| 15 | events_json | JSON | ✅ | 이벤트 정보 배열 | EVENT rows 통합 |
| 16 | final_pot | Number | ❌ | 최종 팟 | initial_pot + contributed_pot |
| 17 | game_name | String | ❌ | 게임 이름 | GAME[2] |
| 18 | **initial_pot** | Number | ❌ | **초기 팟 (POT_CORRECTION)** | POT_CORRECTION 합계 |
| 19 | **contributed_pot** | Number | ❌ | **플레이어 베팅 합계** | BET/RAISE/CALL/ALL-IN 합계 |

**💡 final_pot 계산 공식:**
```javascript
final_pot = initial_pot + contributed_pot
```

**⚠️ stakes_type 조건부 파싱:**
- BB_ANTE: CSV[6]=bb, CSV[8]=sb, CSV[9]=bb_ante
- NO_ANTE: CSV[8]=sb, CSV[9]=bb, CSV[10]=bb_ante

**players_json 구조 (v2.0.1)**:
```json
[
  {
    "seat": 7,
    "name": "Katie Hills",
    "start_stack": 50000,
    "end_stack": 50000,
    "hole_cards": ["10h", "9d"],
    "position": "BTN",
    "is_hero": true,
    "marker": "BR"
  }
]
```

**🔄 v2.0.1 변경:**
- `hole_cards`: 문자열 → **배열**
- 홀카드 없을 시: **null**

**events_json 구조 (v2.0.1)**:
```json
[
  {"seq": 1, "event_type": "POT_CORRECTION", "amount": 5300},
  {"seq": 2, "event_type": "BOARD", "card": "8h"},
  {
    "seq": 3,
    "event_type": "RAISE",
    "seat": 9,
    "amount": 12200,
    "total_bet": 15000,
    "raise_type": "TO"
  },
  {"seq": 4, "event_type": "ALL-IN", "seat": 3, "amount": 0}
]
```

**🔄 v2.0.1 변경:**
- **RAISE_TO**: `total_bet`, `raise_type` 필드 추가
- **amount**: 증가 금액

#### 3. VIRTUAL 시트 갱신 정책 변경

**Before (v1.x)**:
- Record 모드 "데이터 전송" 버튼 → Hand 시트 + VIRTUAL 시트 자동 갱신
- Review 모드: VIRTUAL 갱신 불가

**After (v2.0)**:
- Record 모드 "데이터 전송" 버튼 → Hand 시트만 저장 (VIRTUAL 갱신 제거)
- Review 모드: "🔄 VIRTUAL 시트에 갱신" 버튼 추가 (수동 갱신 전용)

**사유**:
- Record 작업 중 외부 시트 오류로 인한 커밋 실패 방지
- Review 모드에서 선택적 갱신으로 사용자 통제권 강화

#### 4. CSV 변환 로직

**입력**: `csv/Virtual_Table_Data - Hand.csv` (2,866 lines)
**출력**: Hand 시트 (예상 ~500 rows, 1 hand = 1 row)

**변환 단계**:
1. **Hand Block 파싱**: 빈 줄 기준 블록 분리
2. **Row Type 식별**: GAME/PAYOUTS/HAND/PLAYER/EVENT
3. **JSON 생성**:
   - PLAYER rows → `players_json` 배열
   - EVENT rows → `events_json` 배열
   - BOARD 이벤트 → `board_json` 배열
4. **최종 팟 계산**: EVENT rows에서 BET/RAISE/CALL 합산
5. **Hand 시트 행 생성**: 16개 컬럼 매핑

**데이터 품질 이슈**:
- "RAIES" 오타 → "RAISE"로 자동 수정
- 홀카드 누락 (빈 문자열) → null 처리
- POT CORRECTION 이벤트 → 별도 event_type 유지

---

## 📚 완료된 작업 (2025-10-05)

### ✅ 프로젝트 문서화
**완료일**: 2025-10-05
**소요 시간**: 약 4시간

#### 생성된 문서
1. **[PRD_HandLogger.md](PRD_HandLogger.md)** - Product Requirements Document
   - 프로젝트 개요 및 핵심 목표
   - 주요 기능 상세 명세 (Record/Review/외부 연동)
   - 데이터 스키마 (HANDS/ACTIONS/CONFIG)
   - v1.1.1 변경사항 및 제약사항

2. **[LLD_HandLogger.md](LLD_HandLogger.md)** - Low-Level Design
   - 시스템 아키텍처 다이어그램
   - Code.gs 모듈별 상세 분석 (562줄)
   - index.html 구조 및 로직 (656줄)
   - 데이터 흐름 (Record/Review)
   - 동시성 제어 (ScriptLock/멱등성)

3. **[PLAN_HandLogger.md](PLAN_HandLogger.md)** - 본 문서
   - 프로젝트 진행 계획
   - 다음 작업 체크리스트

#### CSV 참고 자료 분석
- **파일**: [csv/Virtual_Table_Data - Hand.csv](../csv/Virtual_Table_Data - Hand.csv)
- **용도**: 기존 데이터 형식 참고 (2866행, 5가지 행 타입)
- **주요 발견**:
  - HAND[11,12,13]: BTN/SB/BB 좌석 정보
  - EVENT 타입: BOARD/액션/POT CORRECTION
  - 비표준 포맷: "RAIES" 오타, "CALL X,XXX" 등

---

## ✅ **v2.0.1 구현 완료** (2025-10-06)

### Phase 1: Hand 시트 생성 및 헤더 설정 ✅
**소요 시간**: 30분
**완료일**: 2025-10-06

**완료 내용**:
1. ✅ `ensureSheets_()` 함수 수정 ([code.gs:72-80](../code.gs#L72-L80))
2. ✅ 19-column 헤더 설정 (initial_pot, contributed_pot 추가)
3. ✅ APP_SPREADSHEET 시트 생성 로직 유지 (v1.x 하위 호환)

### Phase 2: CSV 파싱 함수 구현 ✅
**소요 시간**: 2시간
**완료일**: 2025-10-06

**완료 내용**:
1. ✅ `convertBlockToHandRow_(block)` - 핸드 블록 → 19-column 행 변환
2. ✅ `parseHandRow_(row)` - HAND 행 파싱 (stakes_type 조건부)
3. ✅ `parsePlayerRows_(rows)` - PLAYER 행들 → players_json
4. ✅ `parseEventRows_(rows)` - EVENT 행들 → events_json + board_json
5. ✅ `generateHandId_(timestamp)` - hand_id 생성
6. ✅ RAISE_TO 처리 로직 (total_bet, raise_type 필드)
7. ✅ hole_cards 배열 변환 (문자열 → ["10h","9d"])

**파일**: [code.gs:587-773](../code.gs#L587-L773)

**작업 내용**:
1. **신규 함수 추가** (code.gs):
   ```javascript
   /**
    * CSV Hand Block 파싱
    * @param {string[][]} csvRows - CSV 전체 행 배열
    * @return {Object[]} Hand 시트 행 배열
    */
   function parseHandBlocksFromCsv_(csvRows) {
     // 1. 빈 줄 기준 블록 분리
     // 2. 각 블록 내 GAME/PAYOUTS/HAND/PLAYER/EVENT 파싱
     // 3. JSON 생성 (players_json, events_json, board_json)
     // 4. Hand 시트 행 객체 생성
   }

   /**
    * CSV 파일 읽기 및 Hand 시트 일괄 저장
    * 관리자 전용 함수 (최초 1회 실행)
    */
   function importCsvToHandSheet() {
     // CSV 읽기 → parseHandBlocksFromCsv_() → Hand 시트 일괄 저장
   }
   ```

2. **검증**:
   - [ ] CSV 2,866 lines → ~500 hand rows 변환
   - [ ] players_json/events_json/board_json 형식 확인
   - [ ] "RAIES" → "RAISE" 자동 수정 확인
   - [ ] 홀카드 누락 null 처리 확인

### Phase 3: Record 모드 저장 로직 변경 ✅
**소요 시간**: 1.5시간
**완료일**: 2025-10-06

**완료 내용**:
1. ✅ `_saveHandToHandSheet_(payload)` - payload → Hand 시트 저장
2. ✅ `getHandDetailFromHandSheet_(handId)` - Hand 시트 조회
3. ✅ `getSeatName_(tableId, seat)` - Roster 기반 이름 조회
4. ✅ 멱등성 보장 (timestamp 기반, 1초 오차 허용)
5. ✅ VIRTUAL 시트 연동 유지 (기존 로직 재사용)

**파일**: [code.gs:780-974](../code.gs#L780-L974)

**주요 변경**:
- `saveHand()` → `_saveHandToHandSheet_()` 호출
- `saveHandWithExternal()` → Hand 시트 + VIRTUAL 갱신
- v1.x 호환: stacks_json, holes_json 재구성

**작업 내용**:
1. **code.gs 수정**:
   - `saveHandWithExternal()` 함수 → `saveHand()` 함수로 단순화
   - VIRTUAL 갱신 로직 제거 (Review 모드 전용으로 이동)
   - Hand 시트 저장 로직 추가 (16개 컬럼 매핑)
   - 기존 HANDS/ACTIONS 시트 저장 로직 제거

2. **index.html 수정**:
   - `commitHand()` 함수에서 `saveHandWithExternal()` → `saveHand()` 호출 변경
   - External Sheet ID 입력 필드 제거 (Record 모드)

3. **검증**:
   - [ ] Record 모드에서 핸드 커밋 성공 (Hand 시트 1행 추가)
   - [ ] players_json: 홀카드/스택 정보 포함
   - [ ] events_json: 액션 순서 및 금액 정확도
   - [ ] board_json: 보드 카드 배열 정확도
   - [ ] VIRTUAL 갱신 시도 없음 확인

### Phase 4-6: 보류 (현재 버전 범위 밖)
**사유**: v2.0.1 핵심 기능 완료, 추가 기능은 검증 후 진행

**작업 내용**:
1. **code.gs 수정**:
   ```javascript
   /**
    * Review 모드 전용: 핸드를 VIRTUAL 시트에 갱신
    * @param {string} handId - 핸드 ID
    * @param {Object} ext - { sheetId, bb }
    * @return {Object} { updated, row, reason }
    */
   function updateHandToVirtual(handId, ext) {
     // Hand 시트에서 handId 조회
     // getHandDetail() 형식으로 변환
     // updateExternalVirtual_() 호출
   }

   /**
    * Hand 시트에서 핸드 상세 조회
    * @param {string} handId
    * @return {Object} { head, acts }
    */
   function getHandDetailFromHandSheet(handId) {
     // Hand 시트 조회 → players_json/events_json 파싱
     // 기존 getHandDetail() 반환 형식과 호환
   }
   ```

2. **index.html 수정**:
   - `renderDetailContent()` 함수에 "🔄 VIRTUAL 시트에 갱신" 버튼 추가
   - `updateHandToVirtual()` 클라이언트 함수 추가
   - localStorage에서 extSheetId/bb 복원 로직 추가

3. **검증**:
   - [ ] Review 모드에서 핸드 선택 → "🔄 VIRTUAL 시트에 갱신" 버튼 표시
   - [ ] extSheetId 미입력 시 프롬프트 표시
   - [ ] VIRTUAL 시트 C/E/F/G/H/J 열 갱신 확인
   - [ ] 갱신 성공/실패 메시지 표시

---

### Phase 5: Review 모드 조회 로직 변경
**예상 시간**: 1시간
**목표**: Review 모드 핸드 목록/상세 조회를 Hand 시트 기반으로 변경

**작업 내용**:
1. **code.gs 수정**:
   - `queryHands()` 함수: HANDS 시트 → Hand 시트 조회로 변경
   - `getHandDetail()` 함수: `getHandDetailFromHandSheet()` 호출로 변경
   - players_json/events_json 파싱하여 기존 형식으로 변환

2. **검증**:
   - [ ] Review 모드 핸드 목록 정상 표시 (최신순 정렬)
   - [ ] 핸드 선택 시 상세 정보 정상 표시
   - [ ] 보드 카드/홀카드/액션 히스토리 정확도 확인
   - [ ] 무한 스크롤 동작 확인

---

### Phase 6: APP_SPREADSHEET 참조 완전 제거
**예상 시간**: 1시간
**목표**: code.gs/index.html에서 APP_SPREADSHEET 모든 참조 제거

**작업 내용**:
1. **code.gs 수정**:
   - `APP_SPREADSHEET_ID` 상수 제거
   - `ensureSheets_()` 함수에서 HANDS/ACTIONS/CONFIG/LOG 시트 생성 로직 제거
   - `log_()` 함수 제거 (불필요)

2. **코드 검색 및 제거**:
   - "APP_SPREADSHEET" 문자열 검색
   - "HANDS" 시트 참조 검색
   - "ACTIONS" 시트 참조 검색
   - "CONFIG" 시트 참조 검색
   - "LOG" 시트 참조 검색

3. **검증**:
   - [ ] code.gs에서 APP_SPREADSHEET 참조 0건
   - [ ] index.html에서 APP_SPREADSHEET 참조 0건
   - [ ] 실행 시 오류 없음 확인

---

### Phase 7: 통합 테스트
**예상 시간**: 2시간
**목표**: v2.0.0 전체 기능 검증

**Record 모드 플로우**:
1. [ ] 테이블 선택 (Type 시트 조회)
2. [ ] 좌석/스택 설정
3. [ ] 보드 카드 선택
4. [ ] 홀카드 입력
5. [ ] 액션 입력 (PREFLOP → RIVER)
6. [ ] "데이터 전송" 버튼 클릭
7. [ ] Hand 시트에 1행 추가 확인 (16개 컬럼)
8. [ ] players_json/events_json/board_json 정확도 검증

**Review 모드 플로우**:
1. [ ] 핸드 목록 조회 (Hand 시트 기반)
2. [ ] 핸드 선택 → 상세 표시
3. [ ] 2-Panel 레이아웃 동작 확인
4. [ ] "🔄 VIRTUAL 시트에 갱신" 버튼 클릭
5. [ ] extSheetId 입력 (프롬프트)
6. [ ] VIRTUAL 시트 C/E/F/G/H/J 열 갱신 확인
7. [ ] 갱신 성공 메시지 확인

**크로스 검증**:
- [ ] Record → Review 전환 (데이터 즉시 반영)
- [ ] Review → Record 전환 (상태 유지)
- [ ] 새로고침 후 양쪽 모드 정상

**데이터 품질 검증**:
- [ ] 중복 hand_id 방지 (멱등성)
- [ ] timestamp 정확도 (Unix ms)
- [ ] JSON 파싱 오류 없음
- [ ] 보드 미완성 핸드 허용 (Preflop only)

---

### Phase 8: 문서 업데이트 및 배포
**예상 시간**: 1시간
**목표**: v2.0.0 변경사항 문서화 및 배포

**작업 내용**:
1. **문서 업데이트**:
   - [x] PRD_HandLogger.md: v2.0.0 섹션 추가 ✅
   - [x] LLD_HandLogger.md: 아키텍처 다이어그램 업데이트 ✅
   - [x] PLAN_HandLogger.md: v2.0.0 구현 계획 추가 ✅
   - [x] CSV_ANALYSIS_Hand.md: CSV 분석 문서 작성 ✅

2. **Git 커밋**:
   - [ ] 변경사항 커밋 (v2.0.0 - Hand 시트 통합)
   - [ ] 커밋 메시지 작성 (PRD/LLD/PLAN 업데이트 포함)

3. **배포**:
   - [ ] Apps Script 배포
   - [ ] 프로덕션 테스트 (샘플 핸드 5개 기록)

---

### 예상 총 소요 시간
```
Phase 1: 30분  (Hand 시트 생성)
Phase 2: 2시간  (CSV 파싱)
Phase 3: 1.5시간 (Record 저장 변경)
Phase 4: 1.5시간 (Review VIRTUAL 갱신)
Phase 5: 1시간  (Review 조회 변경)
Phase 6: 1시간  (APP_SPREADSHEET 제거)
Phase 7: 2시간  (통합 테스트)
Phase 8: 1시간  (문서/배포)
─────────────
총합: 10.5시간
```

---

## 🔍 다음 작업: v2.0.0 코드 구현 (Option C 확인 후)

### 📋 작업 개요
**목표**: 현재 HandLogger가 저장하는 HANDS/ACTIONS 데이터가 올바르게 동작하는지 검증

### ✅ 검증 체크리스트

#### 1단계: 기본 동작 확인
- [ ] **Web App 접속**
  - Apps Script 배포 URL 확인
  - Record/Review 모드 전환 동작 확인

- [ ] **테이블/플레이어 설정**
  - ROSTER 시트에서 테이블 목록 로드 확인
  - 좌석별 플레이어 정보 표시 확인
  - BTN 좌석 선택 및 복원 확인

#### 2단계: 핸드 기록 검증
- [ ] **샘플 핸드 기록** (Preflop → River)
  ```
  테이블: T01
  참여자: S1(Alice, 50000), S2(Bob, 50000), S3(Charlie, 50000)
  BTN: S1

  Preflop:
  - S1 BET 2000
  - S2 RAISE 5000
  - S3 FOLD
  - S1 CALL

  Flop (Kh 10d 7c):
  - S1 CHECK
  - S2 BET 10000
  - S1 RAISE 25000
  - S2 CALL

  Turn (2s):
  - S1 CHECK
  - S2 CHECK

  River (Ac):
  - S1 BET 15000
  - S2 FOLD
  ```

- [ ] **HANDS 시트 확인**
  - hand_id 생성 형식: `yyyyMMdd_HHmmssSSS`
  - table_id: "T01"
  - hand_no: CONFIG 시트 hand_seq 자동 증가 확인
  - btn_seat: "1"
  - board_f1~f3: "Kh", "10d", "7c"
  - board_turn: "2s"
  - board_river: "Ac"
  - start_street: "PREFLOP"
  - stacks_json: `{"1":50000,"2":50000,"3":50000}`
  - holes_json: 홀카드 입력 시 올바르게 저장되는지 확인

- [ ] **ACTIONS 시트 확인**
  - 총 12개 액션 생성 확인
  - seq: 1~12 순차 증가
  - street: PREFLOP(4) → FLOP(4) → TURN(2) → RIVER(2)
  - to_call_after 계산:
    - seq 2 (RAISE 5000): to_call_after = 5000
    - seq 4 (CALL): amount_input = 3000 (5000-2000)
  - pot_after 누적:
    - seq 1: 2000
    - seq 2: 7000 (2000+5000)
    - seq 3: 7000 (FOLD)
    - seq 4: 10000 (7000+3000)
    - seq 5: 10000 (CHECK)
    - seq 6: 20000 (10000+10000)
    - seq 7: 45000 (20000+25000)
    - seq 8: 60000 (45000+15000)
    - seq 9: 60000 (CHECK)
    - seq 10: 60000 (CHECK)
    - seq 11: 75000 (60000+15000)
    - seq 12: 75000 (FOLD)

- [ ] **CONFIG 시트 확인**
  - table_id: "T01" 행 생성/업데이트
  - btn_seat: "1" 저장
  - hand_seq: 자동 증가 (다음 핸드 번호 확인)
  - updated_at: 타임스탬프 갱신

#### 3단계: 멱등성 검증
- [ ] **중복 제출 방지**
  - 같은 핸드 2번 커밋 시도
  - client_uuid + started_at 조합으로 중복 차단 확인
  - HANDS 시트에 1개만 저장되는지 확인

#### 4단계: 외부 시트 연동 검증
- [ ] **VIRTUAL 시트 갱신**
  - External Sheet ID 설정
  - BB 값 설정
  - 커밋 시 VIRTUAL 시트 업데이트 확인
  - C열(Time) 파싱 동작 확인
  - E열: "미완료"
  - F열: 파일명 생성 (예: VT1_Alice_AsKs_vs_Bob_QdQc)
  - G열: "A"
  - H열: 3줄 요약 (참가자/보드/팟)
  - J열: 공란 (winner_seat 제거)

#### 5단계: Review 모드 검증
- [ ] **핸드 목록 조회**
  - 최신순 정렬 확인
  - 핸드 번호/테이블/시간 표시 확인

- [ ] **핸드 상세 조회**
  - 보드 카드 배지 표시
  - 스택 스냅샷 표시
  - 홀카드 표시
  - 액션 히스토리 스트릿별 그룹핑
  - 액션 배지 색상 (CHECK/CALL=녹색, BET/RAISE=빨강, FOLD=파랑, ALLIN=진빨강)

#### 6단계: 엣지 케이스 테스트
- [ ] **보드 미완성 허용**
  - Preflop only (보드 0장)
  - Flop only (보드 3장)
  - Turn까지 (보드 4장)

- [ ] **스트릿별 시작 핸드**
  - start_street: "FLOP" (보드 먼저 선택)
  - start_street: "TURN"
  - start_street: "RIVER"

- [ ] **ALLIN 처리**
  - ALLIN 액션 기록
  - amount_input 수동 입력 확인

- [ ] **pre_pot 입력**
  - pre_pot 값 설정
  - pot_after 계산에 반영 확인

#### 7단계: 성능 테스트
- [ ] **ScriptLock 동작**
  - 빠른 연속 커밋 시도
  - 락 대기 및 재시도 로그 확인 (LOG 시트)

- [ ] **대용량 데이터**
  - 100개 이상 핸드 저장
  - Review 목록 로딩 속도 확인

---

## 🐛 발견된 이슈 (Issue Tracker)

### Critical
_없음_

### ✅ Resolved (v1.2.0-1.2.1)

**1. Review 모드 최신순 정렬 미작동** ✅ 수정 완료 (v1.2.0)
- **발견일**: 2025-10-06
- **수정일**: 2025-10-06
- **위치**: [code.gs:274-280](code.gs#L274-L280) `queryHands()`
- **증상**: 핸드 목록이 최신순(내림차순)으로 표시되지 않음
- **원인**: Date/String 혼합 타입 정렬 버그 (`localeCompare` 미작동)
- **해결**:
  ```javascript
  // Before
  rows.sort((a,b)=>String(b[idxStart]).localeCompare(String(a[idxStart])));

  // After
  rows.sort((a,b)=>{
    const aVal=a[idxStart], bVal=b[idxStart];
    const aTime=(aVal instanceof Date)?aVal.getTime():(new Date(aVal).getTime()||0);
    const bTime=(bVal instanceof Date)?bVal.getTime():(new Date(bVal).getTime()||0);
    return bTime-aTime; // 최신순
  });
  ```

**2. 플레이어 이름 "S.6" 표시 버그** ✅ 수정 완료 (v1.2.1)
- **발견일**: 2025-10-06
- **수정일**: 2025-10-06
- **위치**: [index.html:691-695](index.html#L691-L695) `getSeatNameByTable()`
- **증상**: Review 모드에서 "Alice" 대신 "S.6" 표시
- **원인**: `getSeatName()`이 `S.curTable` 사용 (Review 모드에서 undefined)
- **해결**: `getSeatNameByTable(tableId, seat)` 함수 추가

**3. localStorage 키 불일치** ✅ 수정 완료 (v1.2.1)
- **증상**: BB 값이 0BB로 표시
- **원인**: 저장 `phl_bbSize` / 조회 `bb` (키 불일치)
- **해결**: 모든 조회를 `phl_bbSize`로 통일

**4. 홀카드 색상 하드코딩 버그** ✅ 수정 완료 (v1.2.1)
- **증상**: 홀카드가 항상 검정/빨강으로 표시
- **원인**: `cb-s`, `cb-h` 하드코딩 (실제 수트 무시)
- **해결**: `renderCardBadge()` 통합 함수로 실제 수트 색상 적용

### Open
_없음_

---

## 🎯 향후 개발 계획

### v1.3.0 - Review 모드 VIRTUAL 수동 갱신 (다음 버전)
**우선순위**: HIGH
**예상 시간**: 2시간
**목표일**: 2025-10-07

#### 배경
- **현재 상황**: Record 모드에서만 VIRTUAL 자동 갱신 가능
- **요구사항**: Review 모드에서 특정 핸드를 선택하여 VIRTUAL 시트에 수동 갱신
- **활용 사례**:
  - 과거 핸드 재갱신
  - Record 모드에서 누락된 핸드 수동 처리
  - VIRTUAL 시트 row 매칭 실패 시 재시도

#### 작업 내용

##### 1. code.gs 수정 (신규 함수 추가)
```javascript
// 위치: code.gs 357줄 이후 추가
function updateHandToVirtual(handId, ext) {
  ensureSheets_();
  if (!handId || String(handId).trim() === '') {
    throw new Error('handId is required');
  }
  if (!ext || !ext.sheetId || String(ext.sheetId).trim() === '') {
    throw new Error('ext.sheetId is required');
  }

  return withScriptLock_(() => {
    log_('UPDATE_VIRTUAL_BEGIN', `hand_id=${handId}`, '');

    const detail = getHandDetail(handId);
    if (detail.error) {
      log_('UPDATE_VIRTUAL_FAIL', `hand_id=${handId} error=${detail.error}`, '');
      throw new Error(`핸드 조회 실패: ${detail.error}`);
    }
    if (!detail.head) {
      log_('UPDATE_VIRTUAL_FAIL', `hand_id=${handId} reason=no-head`, '');
      throw new Error('핸드 데이터가 없습니다');
    }

    const result = updateExternalVirtual_(ext.sheetId, detail, ext);

    if (result.updated) {
      log_('UPDATE_VIRTUAL_OK', `hand_id=${handId} row=${result.row}`, '');
    } else {
      log_('UPDATE_VIRTUAL_SKIP', `hand_id=${handId} reason=${result.reason}`, '');
    }

    return result;
  });
}
```

##### 2. index.html 수정

**2.1 renderDetailContent() 함수 수정** (670-750줄 근처)
```javascript
// 푸터 하단에 버튼 추가
function renderDetailContent(head, acts) {
  // ... 기존 렌더링 코드 ...

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
  `;

  return headerHTML + boardHTML + playerHTML + actionsHTML + footerHTML;
}
```

**2.2 updateHandToVirtual() 클라이언트 함수 추가** (750줄 이후)
```javascript
function updateHandToVirtual(handId) {
  let extSheetId = localStorage.getItem('phl_extSheetId') || '';
  const bb = toInt(localStorage.getItem('phl_bbSize') || '0');

  // extSheetId 미입력 시 입력 프롬프트
  if (!extSheetId) {
    const input = prompt('VIRTUAL 시트 ID를 입력하세요:\n(Record 모드 상단의 External Sheet ID와 동일)', '');
    if (!input || !input.trim()) {
      alert('시트 ID가 입력되지 않아 취소되었습니다.');
      return;
    }
    localStorage.setItem('phl_extSheetId', input.trim());
    extSheetId = input.trim();
  }

  const statusEl = document.getElementById('virtualUpdateStatus');
  if (!statusEl) return;

  statusEl.textContent = '갱신 중...';
  statusEl.style.color = 'var(--muted)';

  google.script.run
    .withSuccessHandler(res => {
      if (res.updated) {
        statusEl.textContent = `✅ 갱신 완료 (row ${res.row})`;
        statusEl.style.color = '#22c55e';
        setTimeout(() => { statusEl.textContent = ''; }, 5000);
      } else {
        statusEl.textContent = `⚠️ 갱신 실패: ${res.reason || '알 수 없는 오류'}`;
        statusEl.style.color = '#ef4444';
      }
    })
    .withFailureHandler(err => {
      const msg = (err && (err.message || err.toString())) || 'unknown error';
      statusEl.textContent = `❌ 오류: ${msg}`;
      statusEl.style.color = '#ef4444';
    })
    .updateHandToVirtual(handId, { sheetId: extSheetId, bb });
}
```

#### 검증 체크리스트
- [ ] extSheetId 미입력 시 프롬프트 표시
- [ ] localStorage에서 extSheetId 복원 동작
- [ ] VIRTUAL 시트 갱신 성공 (row 번호 표시)
- [ ] 갱신 실패 시 reason 메시지 표시
- [ ] 오류 발생 시 에러 메시지 표시
- [ ] Record 모드 기존 동작 영향 없음

---

### v1.4.0 - 보드↔홀카드 양방향 중복 차단
**우선순위**: HIGH
**예상 시간**: 1시간

#### 배경
- 현재: 보드 → 홀카드 단방향 차단만 구현 ([index.html:446](index.html#L446))
- 문제: 홀카드 선택 후 보드에 같은 카드 선택 가능

#### 작업 내용
1. **`toggleBoardCard()` 수정** ([index.html:417-422](index.html#L417-L422))
   ```javascript
   function toggleBoardCard(card, el) {
     // 추가: 홀카드 중복 체크
     const usedInHoles = Object.values(S.holes)
       .flat()
       .filter(Boolean)
       .includes(card);
     if (usedInHoles) {
       alert(`${prettyCard(card)}는 이미 홀카드에서 사용 중입니다.`);
       return;
     }

     const i = S.board.indexOf(card);
     // ... 기존 로직
   }
   ```

2. **`pickCardOverlay()` 유지**
   - 기존 보드 차단 로직 유지 ([index.html:446](index.html#L446))

3. **테스트 케이스**
   ```
   1. S1 홀카드 A♠K♠ 선택
   2. 보드에서 A♠ 클릭 → alert 표시, 선택 취소
   3. S1 홀카드 A♠ 지우기
   4. 보드에서 A♠ 클릭 → 정상 선택
   ```

#### 검증 기준
- [ ] 홀카드에 있는 카드는 보드 선택 불가
- [ ] 보드에 있는 카드는 홀카드 선택 불가 (기존 유지)
- [ ] 카드 삭제 시 즉시 다른 곳에서 선택 가능

---

### 2. ALLIN 자동 계산 개선
**우선순위**: MEDIUM
**예상 시간**: 2시간

#### 배경
- 현재: stacks[seat] 있을 때만 기본값 제공 ([index.html:348-350](index.html#L348-L350))
- 문제: 스택 미입력 시 수동 계산 필요

#### 작업 내용
1. **스택 추론 로직 추가**
   ```javascript
   function inferStack(seat) {
     // 1순위: 입력된 스택
     if (S.stacks[seat] != null) {
       return S.stacks[seat];
     }

     // 2순위: Roster 시작 칩
     const rosterSeat = S.seats.find(s => s.seat === seat);
     if (rosterSeat && rosterSeat.chips > 0) {
       return rosterSeat.chips;
     }

     // 3순위: null (수동 입력 필요)
     return null;
   }
   ```

2. **`onAction('ALLIN')` 수정** ([index.html:348-350](index.html#L348-L350))
   ```javascript
   if (kind === 'ALLIN') {
     const stack = inferStack(seat);
     let def = '';
     if (stack != null) {
       const remain = Math.max(0, stack - (S.contrib[seat] || 0));
       def = String(remain);
     }
     const val = prompt(`ALLIN 금액 (스택: ${stack || '미입력'})`, def);
     // ...
   }
   ```

3. **UI 개선**: 스택 그리드에 Roster 칩 힌트 표시
   ```html
   <input type="number"
          placeholder="stack (Roster: ${s.chips || '-'})"
          value="${S.stacks[s.seat] ?? ''}" />
   ```

#### 검증 기준
- [ ] 스택 입력 시: 기존 동작 유지
- [ ] 스택 미입력 + Roster 칩 존재: Roster 칩 기준 계산
- [ ] 둘 다 없을 시: 프롬프트 빈 값 (수동 입력)

---

### 3. 턴 순서 건너뛰기 최적화
**우선순위**: LOW
**예상 시간**: 1.5시간

#### 배경
- 현재: `skipInvalidActors()` 50회 루프 가드 ([index.html:258-266](index.html#L258-L266))
- 문제: 비효율적, 무한루프 리스크

#### 작업 내용
1. **`buildTurnOrder()` 수정** ([index.html:242-256](index.html#L242-L256))
   ```javascript
   function buildTurnOrder() {
     // active → aliveNonAllin으로 변경
     const active = S.seats
       .map(s => toInt(s.seat))
       .filter(seat =>
         S.activeSeatMap[seat] &&
         !S.allin[seat] &&
         !S.folded[seat]
       )
       .sort((a,b) => a - b);

     if (!active.length) {
       S.order = [];
       S.actorIdx = 0;
       return;
     }

     // ... 기존 Preflop/Postflop 로직
     // skipInvalidActors() 호출 제거
   }
   ```

2. **`advanceActor()` 간소화** ([index.html:384](index.html#L384))
   ```javascript
   function advanceActor() {
     if (S.order.length === 0) return;
     S.actorIdx = (S.actorIdx + 1) % S.order.length;
     // while 루프 제거 (order에 유효한 좌석만 존재)
   }
   ```

3. **폴드/올인 시 즉시 재계산**
   ```javascript
   function applyAction({ seat, action, amt }) {
     // ... 기존 로직
     if (action === 'ALLIN') S.allin[seat] = true;
     if (action === 'FOLD') S.folded[seat] = true;

     // 턴 순서 재계산
     if (action === 'FOLD' || action === 'ALLIN') {
       buildTurnOrder();
     } else {
       advanceActor();
     }
     // ...
   }
   ```

#### 검증 기준
- [ ] 폴드/올인 후 즉시 다음 유효 플레이어로 이동
- [ ] 모두 올인/폴드 시 S.order = [] (액션 불가)
- [ ] 무한루프 발생 없음

---

### 4. 외부 시트 Time 포맷 확장
**우선순위**: MEDIUM
**예상 시간**: 2.5시간

#### 배경
- 현재: `HH:mm(:ss)` 정규식만 지원 ([code.gs:375](code.gs#L375))
- 요청: "2:05 PM", "오후 2시 5분" 등 다양한 포맷 지원

#### 작업 내용
1. **Apps Script `Utilities.parseDate()` 활용**
   ```javascript
   function parseTimeCellToTodayKST_(raw, disp) {
     let hh = null, mm = null, ss = 0;

     // 1) Date 객체 (기존)
     if (raw && raw instanceof Date) {
       hh = raw.getHours();
       mm = raw.getMinutes();
       ss = raw.getSeconds() || 0;
     }
     // 2) 숫자 (기존)
     else if (typeof raw === 'number' && isFinite(raw)) {
       // ... 기존 로직
     }
     // 3) 문자열 확장
     else {
       const s = String(disp || '').trim();

       // 3-1) 기존 정규식 (HH:mm:ss)
       const m1 = s.match(/(\d{1,2})\s*:\s*(\d{2})(?::(\d{2}))?/);
       if (m1) {
         hh = parseInt(m1[1], 10);
         mm = parseInt(m1[2], 10);
         ss = m1[3] ? parseInt(m1[3], 10) : 0;
       }
       // 3-2) AM/PM 포맷 (2:05 PM)
       else {
         const m2 = s.match(/(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM|am|pm)/i);
         if (m2) {
           let h = parseInt(m2[1], 10);
           mm = parseInt(m2[2], 10);
           const period = m2[3].toUpperCase();
           if (period === 'PM' && h < 12) h += 12;
           if (period === 'AM' && h === 12) h = 0;
           hh = h;
           ss = 0;
         }
       }
     }

     if (hh === null || mm === null) return null;
     const base = todayStartKST_();
     base.setHours(hh, mm, ss, 0);
     return base;
   }
   ```

2. **테스트 케이스**
   ```
   "14:30"     → 14:30:00 ✓ (기존)
   "2:05 PM"   → 14:05:00 ✓ (신규)
   "12:00 AM"  → 00:00:00 ✓ (신규)
   "12:00 PM"  → 12:00:00 ✓ (신규)
   "오후 2시"  → null (미지원, 향후 확장)
   ```

3. **로그 추가**
   ```javascript
   log_('TIME_PARSE', `raw=${raw} disp=${disp} → ${result?.toISOString() || 'null'}`)
   ```

#### 검증 기준
- [ ] 기존 HH:mm(:ss) 포맷 정상 동작
- [ ] AM/PM 12시간 포맷 정상 변환
- [ ] 파싱 실패 시 null 반환 (오류 없음)

---

## 🚀 중기 목표 (v1.3.0)

### 5. 사이드팟 자동 계산
**우선순위**: HIGH
**예상 시간**: 8시간

#### 개요
- 현재: 메인팟만 계산 ([index.html:359](index.html#L359))
- 목표: 올인 상황 시 사이드팟 자동 분리

#### 설계
```javascript
// 사이드팟 계산 알고리즘
function computeSidePots() {
  // 1. 올인 플레이어 추출 (기여액 오름차순)
  const allinPlayers = Object.entries(S.allin)
    .filter(([_, isAllin]) => isAllin)
    .map(([seat, _]) => ({
      seat,
      contrib: S.contrib[seat]
    }))
    .sort((a,b) => a.contrib - b.contrib);

  if (allinPlayers.length === 0) {
    return [{
      name: 'Main Pot',
      amount: S.pot,
      eligible: aliveSeats()
    }];
  }

  const pots = [];
  let prevCap = 0;

  // 2. 각 올인 레벨별로 팟 생성
  for (const {seat, contrib} of allinPlayers) {
    const eligible = Object.keys(S.contrib)
      .filter(s => !S.folded[s] && S.contrib[s] >= contrib);

    const amount = eligible.reduce((sum, s) => {
      const contribution = Math.min(S.contrib[s], contrib) - prevCap;
      return sum + contribution;
    }, 0);

    pots.push({
      name: `${pots.length === 0 ? 'Main' : 'Side'} Pot ${pots.length + 1}`,
      cap: contrib,
      amount,
      eligible
    });

    prevCap = contrib;
  }

  // 3. 메인팟 (나머지)
  const remaining = aliveSeats().filter(s => !S.allin[s]);
  if (remaining.length > 0) {
    const mainAmount = remaining.reduce((sum, s) =>
      sum + (S.contrib[s] - prevCap), 0
    );
    pots.push({
      name: 'Main Pot',
      amount: mainAmount,
      eligible: remaining
    });
  }

  return pots;
}
```

#### UI 변경
1. **팟 표시 영역 확장**
   ```html
   <div id="potBreakdown">
     <div>Total: <b id="pot">0</b></div>
     <div id="sidePotList" class="small muted"></div>
   </div>
   ```

2. **렌더링**
   ```javascript
   function renderPot() {
     const pots = computeSidePots();
     document.getElementById('pot').textContent = S.pot;

     const listHtml = pots.map(p =>
       `${p.name}: ${p.amount} (${p.eligible.join(',')})`
     ).join('<br/>');
     document.getElementById('sidePotList').innerHTML = listHtml;
   }
   ```

3. **저장 포맷**
   ```javascript
   // HANDS 시트에 side_pots_json 컬럼 추가
   side_pots_json: JSON.stringify(computeSidePots())
   ```

#### 검증 케이스
```
시나리오: 3명 (S1, S2, S3)
S1 스택: 100, S2: 200, S3: 300

1. S1 ALLIN 100
   → Main Pot: 300 (S1,S2,S3 eligible)

2. S2 CALL 100
3. S3 CALL 100
4. Flop
5. S2 ALLIN 100 (총 200)
   → Main Pot: 300 (S1,S2,S3)
   → Side Pot: 200 (S2,S3)

6. S3 CALL 100
   → Main Pot: 300 (S1,S2,S3)
   → Side Pot: 200 (S2,S3)
```

#### 마일스톤
- [ ] `computeSidePots()` 함수 구현
- [ ] UI 렌더링 추가
- [ ] HANDS 시트 side_pots_json 컬럼 추가
- [ ] 테스트 시나리오 5개 검증
- [ ] Review 모드 사이드팟 표시

---

### 6. 핸드 히스토리 내보내기
**우선순위**: MEDIUM
**예상 시간**: 4시간

#### 기능
- 핸드 상세 → 텍스트 포맷 변환
- 포맷: PokerStars/GGPoker 호환

#### 구현
1. **서버 함수 추가** ([code.gs](code.gs))
   ```javascript
   function exportHandHistory(hand_id) {
     const { head, acts } = getHandDetail(hand_id);
     const roster = readRoster_().roster[head.table_id] || [];

     const lines = [
       `PokerStars Hand #${head.hand_no}: Hold'em No Limit`,
       `Table '${head.table_id}' 9-max Seat #${head.btn_seat} is the button`,
       ''
     ];

     // 좌석 정보
     roster.forEach(s => {
       const stack = safeParseJson_(head.stacks_json)[s.seat] || s.chips;
       lines.push(`Seat ${s.seat}: ${s.player} (${stack} in chips)`);
     });

     lines.push('');

     // 홀카드
     const holes = safeParseJson_(head.holes_json);
     Object.entries(holes).forEach(([seat, cards]) => {
       const player = roster.find(r => r.seat == seat)?.player || `Seat ${seat}`;
       lines.push(`Dealt to ${player} [${cards.join(' ')}]`);
     });

     lines.push('');

     // 액션 히스토리
     let curStreet = '';
     acts.forEach(a => {
       if (a.street !== curStreet) {
         curStreet = a.street;
         if (curStreet === 'FLOP') {
           const board = [head.board.f1, head.board.f2, head.board.f3].filter(Boolean);
           lines.push(`*** FLOP *** [${board.join(' ')}]`);
         } else if (curStreet === 'TURN') {
           lines.push(`*** TURN *** [${head.board.turn}]`);
         } else if (curStreet === 'RIVER') {
           lines.push(`*** RIVER *** [${head.board.river}]`);
         }
       }

       const player = roster.find(r => r.seat == a.seat)?.player || `Seat ${a.seat}`;
       const amt = a.amount_input > 0 ? ` ${a.amount_input}` : '';
       lines.push(`${player}: ${a.action.toLowerCase()}${amt}`);
     });

     return lines.join('\n');
   }
   ```

2. **클라이언트 버튼** ([index.html](index.html))
   ```javascript
   function exportCurrent() {
     const hand_id = currentDetailHandId; // 상세 조회 중인 hand_id
     google.script.run
       .withSuccessHandler(text => {
         const blob = new Blob([text], { type: 'text/plain' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `hand_${hand_id}.txt`;
         a.click();
       })
       .exportHandHistory(hand_id);
   }
   ```

3. **UI 버튼 추가**
   ```html
   <div id="detail">
     <!-- 상세 내용 -->
     <button onclick="exportCurrent()">핸드 히스토리 다운로드</button>
   </div>
   ```

#### 검증
- [ ] 내보낸 파일 PokerStars 뷰어 호환성
- [ ] 보드/홀카드 포맷 정확도
- [ ] 액션 순서/금액 일치

---

### 7. 모바일 반응형 개선
**우선순위**: LOW
**예상 시간**: 3시간

#### 현재 문제
- 카드 그리드 세로 스크롤 38vh 제한 ([index.html:25](index.html#L25))
- 액션 패드 2열 고정 ([index.html:30](index.html#L30))

#### 개선안
1. **뷰포트 기반 동적 높이**
   ```css
   .boardWrap {
     max-height: calc(100vh - 420px); /* 헤더+설정+여백 제외 */
   }
   ```

2. **액션 패드 가로 스크롤**
   ```css
   .actionDock .pad {
     display: flex;
     gap: 10px;
     overflow-x: auto;
     -webkit-overflow-scrolling: touch;
   }

   .actionDock button {
     flex: 0 0 48%; /* 모바일: 2열 */
     min-width: 140px;
   }

   @media (min-width: 768px) {
     .actionDock button {
       flex: 0 0 24%; /* 태블릿: 4열 */
     }
   }
   ```

3. **터치 제스처 개선**
   ```javascript
   // 카드 더블탭 선택/해제
   let lastTap = 0;
   el.ontouchend = (e) => {
     const now = Date.now();
     if (now - lastTap < 300) {
       handler(card, el);
     }
     lastTap = now;
   };
   ```

---

## 📊 장기 목표 (v2.0.0)

### 8. 멀티 테이블 동시 기록
**예상 시간**: 16시간

#### 개요
- 현재: 단일 테이블만 지원
- 목표: 탭 기반 멀티 테이블 전환

#### 아키텍처
```javascript
const S = {
  tables: [...],      // 전체 테이블 목록
  activeTableId: '',  // 현재 활성 탭
  sessions: {         // 테이블별 세션
    'T1': {
      curStreet: 'PREFLOP',
      btnSeat: 2,
      actions: [...],
      board: [...],
      // ... 기존 S 상태 전부
    },
    'T2': { /* ... */ }
  }
}

// 탭 전환
function switchTable(tableId) {
  saveCurrentSession();
  S.activeTableId = tableId;
  restoreSession(tableId);
  renderAll();
}
```

#### UI 변경
```html
<div id="tableTabs" class="row">
  <button data-table="T1" class="tab active">테이블 1</button>
  <button data-table="T2" class="tab">테이블 2</button>
  <button id="addTableBtn">+ 테이블 추가</button>
</div>
```

---

### 9. 실시간 동기화 (Firebase/Firestore)
**예상 시간**: 24시간

#### 배경
- 현재: Google Sheets 폴링 (새로고침 필요)
- 목표: 실시간 멀티 유저 동기화

#### 스택
- **백엔드**: Firebase Firestore
- **인증**: Firebase Auth (Google 계정 연동)
- **실시간**: Firestore onSnapshot

#### 마이그레이션 계획
1. **Phase 1**: Firestore 병렬 쓰기
   - HANDS/ACTIONS → Sheets + Firestore 동시 저장
   - 읽기는 Sheets 유지
2. **Phase 2**: 읽기 전환
   - Review 모드 Firestore 읽기로 전환
   - Sheets는 백업용
3. **Phase 3**: 완전 전환
   - Sheets 쓰기 제거
   - Apps Script → Cloud Functions

---

### 10. AI 핸드 분석
**예상 시간**: 40시간

#### 기능
- 핸드 히스토리 → GTO 분석
- 최적 액션 추천
- EV 계산

#### 통합
- **API**: PokerSnowie / PioSolver API
- **UI**: 상세 화면에 "분석" 버튼 추가
- **결과**: 스트릿별 최적 액션 + EV 차트

---

## 🐛 버그 수정 우선순위

### Critical (즉시 수정)
1. **멱등성 체크 타임존 불일치** ([code.gs:184](code.gs#L184))
   - 문제: `started_at` 문자열 비교 시 타임존 차이
   - 해결: ISO8601 정규화 또는 timestamp 비교
   ```javascript
   const t1 = new Date(r[idxStart]).getTime();
   const t2 = new Date(payload.started_at).getTime();
   if (Math.abs(t1 - t2) < 1000) { /* 멱등 */ }
   ```

### High (1주 내)
2. **hand_seq 경쟁 조건** ([code.gs:231-233](code.gs#L231-L233))
   - 문제: getValue() → +1 → setValue() 사이 간격
   - 해결: 원자적 증가 (Apps Script 제약으로 락 강화)
   ```javascript
   // 트랜잭션 시뮬레이션
   const cur = sh.getRange(found, idxS+1).getValue();
   const next = cur + 1;
   sh.getRange(found, idxS+1).setValue(next);
   // 검증
   const verify = sh.getRange(found, idxS+1).getValue();
   if (verify !== next) {
     throw new Error('Concurrent modification');
   }
   ```

### Medium (1개월 내)
3. **외부 시트 쓰기 실패 시 롤백 없음** ([code.gs:165-169](code.gs#L165-L169))
   - 문제: HANDS/ACTIONS 저장 성공 후 외부 시트 실패 시 데이터 불일치
   - 해결: 외부 시트를 선택적 기능으로 명시 (현재 동작 유지)
   - 또는: 외부 시트 실패 시 LOG에 재시도 큐 기록

---

## 📅 릴리스 일정

### v1.2.0 (즉시 - Review 모드 최적화 - 재설계)

**⚠️ 핵심 원칙**: Record 모드 기존 기능 100% 보존 (공용 함수 수정 금지)

#### Phase 0: 의존성 분석 (✅ 완료)
- [x] Record 함수 호출 그래프 작성
- [x] Review 함수 종속성 매핑
- [x] 공용 함수 식별 (6개: cardCode, prettyCard, seatNameOnly, getSeatName, toInt, safeJson_)
- [x] 문서 재작성 (PRD/LLD)

#### Phase 1: CSS 레이아웃 (15분)
- [ ] 2-Panel CSS 추가 (#panelReview flex-direction:row)
- [ ] 목록/상세 영역 크기 설정 (40%/60%, max-height:75vh)
- [ ] 선택 상태 CSS (.seatCard.selected)
- [ ] **검증**: Record 모드 스타일 영향 없음 확인

#### Phase 2: 서버 정렬 버그 수정 (30분)
- [ ] code.gs queryHands() 정렬 로직 수정
- [ ] Date/String 타입 혼합 처리
- [ ] **검증**: Review 목록 최신순 정렬 확인

#### Phase 3: Review 전용 함수 정리 (90분 → 수정)
**3-1. 안전하게 삭제 (6개, 20분)**
- [ ] suitClass_() 삭제 + CSS 직접 생성으로 대체
- [ ] cardBadge_() 삭제 + 템플릿 리터럴 대체
- [ ] boardBadges_() 삭제 + map().join() 대체
- [ ] actClass_() 삭제 + CSS 직접 생성
- [ ] formatActBadge_() 삭제 + 템플릿 리터럴 대체
- [ ] section_() 삭제 + HTML 직접 생성
- [ ] **검증**: Record 모드 전체 플로우 테스트

**3-2. 개선 (4개, 40분)**
- [ ] boardArrayAny_() → boardToArray_() 단순화
- [ ] groupByStreet_() → groupByStreet (언더스코어 제거)
- [ ] seatNameOnlyFmt() 호출 제거 → 직접 호출
- [ ] renderDetailBlock_() → renderDetailContent() 단순화
- [ ] **검증**: Review 상세 렌더링 확인

**3-3. 신규 함수 추가 (5개, 30분)**
- [ ] loadHandPage(page) - 페이징
- [ ] appendHands(hands) - 목록 추가
- [ ] handleListScroll() - 무한 스크롤
- [ ] updateSelectedState() - 선택 상태
- [ ] renderDetailContent() - 상세 렌더링
- [ ] **검증**: 무한 스크롤 동작 확인

#### Phase 4: 통합 검증 (30분)
**Record 모드 전체 플로우**
- [ ] 테이블 선택 → 좌석 선택
- [ ] 보드 카드 선택 (prettyCard 의존)
- [ ] 홀카드 오버레이 (prettyCard, getSeatName 의존)
- [ ] 액션 입력 → 액션 피드 (seatNameOnly, getSeatName 의존)
- [ ] 커밋 → 외부 시트 연동

**Review 모드 전체 플로우**
- [ ] 목록 로드 (무한 스크롤 10건)
- [ ] 핸드 선택 → 상세 표시
- [ ] 2-Panel 레이아웃 동작
- [ ] 선택 상태 표시

**크로스 검증**
- [ ] Record → Review 전환
- [ ] Review → Record 전환
- [ ] 새로고침 후 양쪽 모드 정상

#### 예상 시간
```
Phase 0: ✅ 완료
Phase 1: 15분
Phase 2: 30분
Phase 3: 90분
Phase 4: 30분
─────────────
총합: 165분 (2.75시간)
```

#### 롤백 계획
```
Phase 1 실패 → git restore index.html (CSS만)
Phase 2 실패 → git restore code.gs
Phase 3 실패 → git restore index.html + 이전 단계 재시도
Phase 4 실패 → 전체 롤백 + 근본 원인 재분석
```

### v1.3.0 (2주 후)
- [ ] 보드↔홀카드 양방향 중복 차단
- [ ] ALLIN 자동 계산 개선
- [ ] 턴 순서 최적화
- [ ] 외부 시트 Time 포맷 확장

### v1.4.0 (1개월 후)
- [ ] 사이드팟 자동 계산
- [ ] 핸드 히스토리 내보내기
- [ ] 모바일 반응형 개선

### v2.0.0 (3개월 후)
- [ ] 멀티 테이블 동시 기록
- [ ] Firebase 실시간 동기화
- [ ] AI 핸드 분석

---

## 🧪 테스트 전략

### 단위 테스트 (Google Apps Script)
```javascript
// tests/code.test.gs
function testParseTimeCellToTodayKST() {
  const cases = [
    { input: new Date(2025,10,5,14,30), expected: '14:30:00' },
    { input: 0.604166667, expected: '14:30:00' },
    { input: '14:30', expected: '14:30:00' },
    { input: '2:05 PM', expected: '14:05:00' },
    { input: '12:00 AM', expected: '00:00:00' }
  ];

  cases.forEach(c => {
    const result = parseTimeCellToTodayKST_(c.input, String(c.input));
    const actual = Utilities.formatDate(result, 'Asia/Seoul', 'HH:mm:ss');
    if (actual !== c.expected) {
      throw new Error(`Expected ${c.expected}, got ${actual}`);
    }
  });

  Logger.log('testParseTimeCellToTodayKST PASSED');
}
```

### E2E 테스트 (Puppeteer)
```javascript
// tests/e2e.spec.js
describe('Hand Recording', () => {
  it('should prevent duplicate cards between board and holes', async () => {
    await page.goto('https://script.google.com/...');

    // 홀카드에 A♠ 선택
    await page.click('[data-seat="1"] .holeBadge');
    await page.click('[data-card="As"]');

    // 보드에서 A♠ 클릭 시도
    await page.click('#boardRowRecord [data-card="As"]');

    // alert 확인
    const alertText = await page.evaluate(() => {
      return new Promise(resolve => {
        window.alert = (msg) => resolve(msg);
      });
    });

    expect(alertText).toContain('이미 홀카드에서 사용 중');
  });
});
```

---

## 📈 성능 모니터링

### 측정 지표
1. **서버 응답 시간**
   ```javascript
   function log_(code, msg, tableId) {
     const start = new Date();
     // ... 기존 로직
     const duration = new Date() - start;
     if (duration > 1000) {
       Logger.log(`SLOW: ${code} took ${duration}ms`);
     }
   }
   ```

2. **클라이언트 렌더링**
   ```javascript
   function renderAll() {
     const start = performance.now();
     renderSeatToggles();
     renderStackGrid();
     // ...
     const duration = performance.now() - start;
     if (duration > 100) {
       console.warn(`renderAll slow: ${duration}ms`);
     }
   }
   ```

3. **외부 시트 쓰기**
   ```javascript
   function updateExternalVirtual_() {
     const start = new Date();
     // ... setValue() 호출들
     const duration = new Date() - start;
     log_('EXT_PERF', `duration=${duration}ms`);
   }
   ```

---

## 🔒 보안 체크리스트

### 현재 보안 상태
- [x] 스크립트 락으로 동시성 제어
- [x] 멱등성으로 중복 방지
- [x] XSS: HtmlService 자동 이스케이프
- [ ] CSRF: 토큰 없음 (Apps Script 기본 보호 의존)
- [ ] 인증: Google 계정 기반 (Session.getActiveUser())
- [ ] 인가: 없음 (모든 사용자 동일 권한)

### 개선 사항
1. **테이블별 접근 제어** (v2.0)
   ```javascript
   // CONFIG 시트에 owner 컬럼 추가
   function checkAccess(tableId) {
     const owner = readConfig_()[tableId]?.owner;
     const user = Session.getActiveUser().getEmail();
     if (owner && owner !== user) {
       throw new Error('Access denied');
     }
   }
   ```

2. **데이터 검증 강화**
   ```javascript
   function validatePayload(p) {
     if (!p.table_id || !p.btn_seat) {
       throw new Error('Required fields missing');
     }
     if (p.actions && !Array.isArray(p.actions)) {
       throw new Error('actions must be array');
     }
     // ...
   }
   ```

---

## 📚 문서화 작업

### 코드 주석 추가
- [ ] [code.gs](code.gs) JSDoc 스타일 주석
  ```javascript
  /**
   * VIRTUAL 시트의 Time 셀(C열)을 KST 오늘 날짜 기준 시각으로 파싱
   * @param {Date|number|string} raw - 원시 셀 값
   * @param {string} disp - 표시 문자열 (getDisplayValues)
   * @return {Date|null} KST 시각 또는 null
   */
  function parseTimeCellToTodayKST_(raw, disp) { /* ... */ }
  ```

### API 문서 (JSDoc → Markdown)
- [ ] `generateApiDocs.js` 스크립트 작성
- [ ] `docs/API.md` 자동 생성

### 사용자 가이드
- [ ] `docs/USER_GUIDE.md` 작성
  - 초기 설정 (Roster 시트 준비)
  - 핸드 기록 플로우
  - 외부 시트 연동 설정
  - 트러블슈팅

---

## 🎓 팀 온보딩

### 신규 개발자용 체크리스트
1. [ ] PRD/LLD/PLAN 문서 읽기
2. [ ] 로컬 환경 설정
   - clasp 설치 (`npm i -g @google/clasp`)
   - `clasp login`
   - `clasp clone [SCRIPT_ID]`
3. [ ] 테스트 시트 생성
   - APP_SPREADSHEET 복사
   - ROSTER_SPREADSHEET 복사
   - code.gs 상수 업데이트
4. [ ] 첫 핸드 기록 (샘플 데이터)
5. [ ] 코드 수정 → `clasp push` → 테스트

### 코드 리뷰 가이드
- 스타일: Prettier (없음 → 추가 예정)
- 린팅: ESLint (없음 → 추가 예정)
- PR 템플릿:
  ```markdown
  ## 변경 사항
  - [ ] 버그 수정
  - [ ] 기능 추가
  - [ ] 리팩토링

  ## 테스트
  - [ ] 단위 테스트 추가/통과
  - [ ] E2E 시나리오 검증

  ## 문서
  - [ ] PRD/LLD 업데이트
  - [ ] 코드 주석 추가
  ```

---

## 📞 연락처 및 리소스

### 프로젝트 관리
- **Repo**: (GitHub 링크 추가 예정)
- **Issue Tracker**: GitHub Issues
- **CI/CD**: (Apps Script 자동 배포 설정 예정)

### 참고 자료
- [Apps Script Guides](https://developers.google.com/apps-script)
- [Sheets API Reference](https://developers.google.com/sheets/api)
- [Poker Hand Rankings](https://www.pokerstrategy.com/strategy/various-poker/hand-rankings/)

---

## 🏁 완료 기준

### v1.2.0 Definition of Done
- [ ] 모든 High 우선순위 작업 완료
- [ ] 단위 테스트 커버리지 > 70%
- [ ] E2E 테스트 핵심 시나리오 5개 통과
- [ ] 성능 회귀 없음 (렌더링 < 100ms)
- [ ] 문서 업데이트 (PRD/LLD 변경사항 반영)
- [ ] 배포 및 프로덕션 검증 (샘플 핸드 10개 기록)
