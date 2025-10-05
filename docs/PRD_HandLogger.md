# PRD - Poker Hand Logger v1.1.1

## 📋 프로젝트 개요

**버전**: v1.1.1 (2025-10-02)
**목적**: 포커 핸드 실시간 기록 및 리뷰 시스템
**플랫폼**: Google Apps Script + Web App (모바일 최적화)
**코드 규모**: **1,218줄** (code.gs 562줄 + index.html 656줄)
**철학**: **최소주의 (Minimalism)** - 핵심 기능만 구현, 불필요한 복잡성 배제

---

## 🎯 핵심 목표

1. **실시간 핸드 기록**: 포커 게임 진행 중 액션/보드/결과 즉시 기록
2. **외부 시트 연동**: VIRTUAL 시트 자동 갱신 (파일명/히스토리/상태)
3. **데이터 리뷰**: 저장된 핸드 조회 및 상세 분석
4. **모바일 우선**: 터치 최적화 UI, 반응형 디자인

---

## 👥 주요 사용자

| 역할 | 주요 작업 | 사용 모드 |
|------|-----------|-----------|
| **딜러/기록자** | 실시간 핸드 입력 | Record Mode |
| **분석가** | 히스토리 데이터 조회/분석 | Review Mode |
| **프로듀서** | 외부 시트 연동 및 자막 생성 | External Settings |

---

## 🔑 핵심 기능

### 1. Record Mode (핸드 기록)

#### 1.1 테이블/플레이어 설정

**테이블 선택**:
- Type 시트에서 테이블 목록 자동 로드
- 다중 컬럼 별칭 지원:
  ```
  TableNo: ['Table No.', 'TableNo', 'Table_Number', 'table_no']
  ```

**참여자 선택**:
- 좌석별 토글 버튼 (Pill UI)
- 비참여자 제외 (액션 순서에서 자동 배제)
- ⚠️ **제약**: 액션 시작 후 참여자 변경 불가 (일관성 보장)

**BTN 지정**:
- CONFIG 시트에서 이전 BTN 자동 복원
- 수동 변경 가능

**스택 입력** (선택):
- 좌석별 시작 스택 입력
- ALLIN 금액 자동 계산에 사용
- ⚠️ **제약**: 미입력 시 ALLIN 금액 수동 입력 필요

---

#### 1.2 핸드 정보 입력

**시작 스트릿**:
- Preflop/Flop/Turn/River 고정 선택
- 중간부터 시작하는 핸드 지원 (예: Flop부터 기록)

**핸드 번호**:
- **자동**: CONFIG.hand_seq 자동 증가 (테이블별)
- **수동**: 사용자 입력 (선택)
- 우선순위: 수동 입력 > 자동 부여

**선 누적 팟** (선택):
- 이전 스트릿 팟 합산 시 사용
- 최종 팟 = pre_pot + sum(contrib)

**홀카드 선택**:
- 좌석별 2장 선택 (오버레이 UI)
- 카드 그리드: A→2 / ♠→♥→♦→♣
- ✅ **보드→홀카드 차단**: 보드 카드는 홀카드에서 선택 불가
- ❌ **홀카드→보드 미차단**: 홀카드 선택 후 보드에서 같은 카드 선택 가능 (향후 개선 예정)

---

#### 1.3 액션 기록

**턴 기반 시스템**:
- 현재 차례 좌석 자동 표시 (`turnSeat`)
- 턴 순서 계산:
  - **Preflop**: BTN 다음 좌석부터 시계방향
  - **Postflop**: BTN 다음 좌석부터, BTN이 마지막

**액션 버튼 동적 생성**:
```javascript
if (toCall > 0) {
  // CALL/RAISE/FOLD/ALLIN
} else {
  // CHECK/BET/FOLD/ALLIN
}
```

**금액 입력**:
- BET/RAISE/ALLIN 시 `prompt()` 표시
- ALLIN: 잔여 스택 자동 계산 (스택 입력 시)
  ```javascript
  remain = stack - contrib
  ```

**실시간 계산**:
| 항목 | 계산식 | 설명 |
|------|--------|------|
| **toCall** | `max(contrib) - contrib[seat]` | 현재 콜 금액 |
| **pot** | `pre_pot + sum(contrib)` | 누적 팟 |
| **contrib[seat]** | `contrib[seat] + amount_input` | 좌석별 기여액 |

---

#### 1.4 보드 카드 선택

**카드 그리드**:
- 4개 컬럼 (♠♥♦♣) x 13개 랭크 (A→2) = 52장
- 토글 방식: 클릭 → 선택/해제

**5장 제한**:
- Flop 3 + Turn + River = 최대 5장
- 초과 시 클릭 무시

**중복 방지**:
| 방향 | 구현 | 상태 |
|------|------|------|
| 보드 → 홀카드 | ✅ 차단 | 구현됨 |
| 홀카드 → 보드 | ❌ 미차단 | v1.2 예정 |

---

#### 1.5 스트릿 진행

**자동 전환 조건**:
```javascript
if (toCall === 0 && acted.size >= aliveNonAllin.length) {
  curStreet = nextStreet(curStreet)
}
```

**턴 순서 재계산**:
- 스트릿 변경 시 `buildTurnOrder()` 호출
- ALLIN/FOLD 플레이어 자동 건너뜀

**Undo 기능**:
- 마지막 액션 제거 (`actions.pop()`)
- 상태 복원: contrib, pot, toCall, allin, folded
- 스트릿 자동 복원 (actions 배열 기반)

---

#### 1.6 데이터 전송 (커밋)

**멱등성 보장**:
```javascript
// 중복 체크: client_uuid + started_at
if (exists(client_uuid, started_at)) {
  return {ok: true, idempotent: true}
}
```

**외부 시트 갱신** (External Sheet ID 설정 시):

**C열 파싱** (v1.1.1 개선):
| 타입 | 파싱 방식 |
|------|-----------|
| Date 객체 | `getHours()`, `getMinutes()`, `getSeconds()` |
| 숫자 (0~1) | 하루 분수 → 초 환산 |
| 문자열 | 정규식 `(\d{1,2}):(\d{2})(:(\d{2}))?` |

**행 선택 로직**:
```javascript
// 아래→위 검색 (가장 최근 행 우선)
for (i = length-1; i >= 0; i--) {
  if (rowTime <= nowKST) {
    pickRow = i+2
    break
  }
}
```

**컬럼 갱신**:
| 열 | 값 | 예시 |
|----|-----|------|
| E(5) | `"미완료"` | 고정값 |
| F(6) | 파일명 | `VT12_JDoe_AhKs_vs_JSmith_QdQc` |
| G(7) | `"A"` | 고정값 |
| H(8) | 3줄 요약 | `J.Doe(A♠K♠) vs J.Smith(Q♦Q♣)\n보드: K♥ 10♦ 7♣\n팟: 15.0BB (15,000)` |
| J(10) | `""` | **공란 (승자 판정 제거됨)** |

**실패 처리**:
- 외부 시트 실패 시에도 HANDS/ACTIONS 저장 성공
- LOG 시트에 오류 기록: `EXT_FAIL`

---

### 2. Review Mode (핸드 리뷰)

**주요 목적**: 저장된 핸드 조회 및 확인

#### 2.1 핸드 목록 조회

**정렬**:
- `started_at` 내림차순 (최신순)

**페이지네이션** (v2.2.1):
- 1페이지당 50건
- **UI 구현**: "더 보기" 버튼
  - 클릭 시 다음 50건 로드
  - 기존 목록에 append (누적 표시)
  - 남은 개수 표시 (예: "더 보기 (2716개 남음)")
- **백엔드**: `queryHands({}, {num: pageNum, size: 50})`
- **상태 관리**: 전역 변수 `reviewPage` (현재 페이지 번호)

**표시 정보** (v2.2.1 개선):
- 핸드번호, 테이블, BTN, 시작 스트릿
- **보드 카드**: 컬러 배지 (♠♥♦♣) - `boardBadges_()` 함수 재사용
- **시작 시각**: 사람이 읽을 수 있는 형식 (예: `10/05 14:23`)
  - Before: `2025-10-05T14:23:15.123Z`
  - After: `10/05 14:23`

**UI 개선**:
- 목록 높이: `55vh` (기존 28vh에서 증가)
- 기존 `.seatCard` 클래스 재사용
- 기존 렌더링 로직 100% 유지

**UI 목업** (v2.2.1):
```
┌────────────────────────────────────────────────┐
│ Review                                         │
│ [새로고침]  총 2866건                           │
├────────────────────────────────────────────────┤
│ [핸드 목록 영역 - 55vh]                         │
│ ┌──────────────────────────────────────────┐  │
│ │ #189 · Table VT1 · BTN 1 · [PREFLOP]    │  │
│ │ 10/05 14:23                             │  │
│ │ Board: K♥ T♦ 9♣                         │  │
│ └──────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────┐  │
│ │ #190 · Table VT2 · BTN 2 · [FLOP]       │  │
│ │ 10/05 15:10                             │  │
│ │ Board: Q♠ J♥ 8♦                         │  │
│ └──────────────────────────────────────────┘  │
│ ... (스크롤 가능)                               │
├────────────────────────────────────────────────┤
│ [더 보기 (2816개 남음)]                         │
├────────────────────────────────────────────────┤
│ [핸드 상세 영역]                                │
│                                                │
│ Hand #189 · 20251005_142315  [✕ 닫기]          │
│ Table VT1 · BTN 1 · 시작: PREFLOP              │
│                                                │
│ ┌───┐┌───┐┌───┐                               │
│ │K♥││T♦││9♣│ (컬러 배지)                       │
│ └───┘└───┘└───┘                               │
│                                                │
│ Stacks @PREFLOP: SOORIN=1000000, V06=800000    │
│ Holes: SOORIN=K♣8♣, V06=A♥2♦                   │
│                                                │
│ PREFLOP                                        │
│ ┌─────────────────────────────────────────┐   │
│ │ SOORIN BET 5000 · pot 5000              │   │
│ └─────────────────────────────────────────┘   │
│ ┌─────────────────────────────────────────┐   │
│ │ V06 CALL · pot 10000                    │   │
│ └─────────────────────────────────────────┘   │
│                                                │
│ FLOP                                           │
│ ┌─────────────────────────────────────────┐   │
│ │ SOORIN CHECK · pot 10000                │   │
│ └─────────────────────────────────────────┘   │
│ ... (스크롤 가능)                               │
└────────────────────────────────────────────────┘
```

**주요 개선점**:
- ✅ 타임스탬프: `10/05 14:23` (ISO → 사람 읽기 쉬운 형식)
- ✅ 보드 카드: 목록/상세 모두 표시
- ✅ 페이지네이션: "더 보기 (N개 남음)" 버튼
- ✅ 닫기 버튼: 상세 영역 우측 상단
- ✅ 목록 높이: 28vh → 55vh (약 2배 증가)

#### 2.2 핸드 상세 조회

**클릭 동작**: 핸드 목록 항목 클릭 → 하단에 상세 정보 표시

**닫기 기능** (v2.2.1):
- 상세 영역 우측 상단에 "✕ 닫기" 버튼
- 클릭 시 상세 영역 초기화

**보드 배지 컬러**:
| 문양 | 색상 | CSS Class |
|------|------|-----------|
| ♠ | 검정 `#111111` | `cb-s` |
| ♥ | 빨강 `#ef4444` | `cb-h` |
| ♦ | 파랑 `#3b82f6` | `cb-d` |
| ♣ | 초록 `#22c55e` | `cb-c` |

**액션 배지 컬러**:
| 액션 | 색상 | CSS Class |
|------|------|-----------|
| CHECK/CALL | 녹색 | `act-chk`, `act-call` |
| BET/RAISE | 빨강 | `act-bet`, `act-raise` |
| FOLD | 파랑 | `act-fold` |
| ALLIN | 진빨강 | `act-allin` |

**표시 정보**:
```
Hand #12 · 20251002_143025123
Table T01 · BTN 1 · 시작: PREFLOP
[보드 배지: K♥ 10♦ 7♣ 2♠ A♣]
Stacks @PREFLOP: J.Doe=50000, J.Smith=50000
Holes: J.Doe=A♠K♠, J.Smith=Q♦Q♣

[PREFLOP]
J.Doe BET 2000 · pot 2000
J.Smith RAISE 5000 · pot 7000

[FLOP]
...
```

---

### 3. 외부 연동 기능

#### 3.1 External Sheet ID 설정

**localStorage 저장**:
- `phl_extSheetId`: 시트 ID
- `phl_bbSize`: Big Blind 금액

**BB 환산**:
```javascript
potBB = pot / bb  // 예: 15000 / 1000 = 15.0BB
```

---

### 4. 설정/구성 관리

#### 4.1 CONFIG 시트

| 컬럼 | 타입 | 설명 |
|------|------|------|
| table_id | String | 테이블 번호 (Primary Key) |
| btn_seat | String | 마지막 BTN 좌석 |
| hand_seq | Number | 다음 핸드 번호 시퀀스 |
| updated_at | Date | 마지막 갱신 시각 |

**기능**:
- **BTN 추적**: 테이블별 마지막 BTN 저장/복원
- **hand_seq 자동 증가**:
  ```javascript
  nextHandSeq(tableId) {
    current = CONFIG[tableId].hand_seq
    CONFIG[tableId].hand_seq = current + 1
    return current + 1
  }
  ```
- **reset 기능**: `resetHandSeq(tableId, toValue)` - 특정 테이블 시퀀스 초기화

---

#### 4.2 ROSTER 연동

**Type 시트 컬럼 별칭**:
```javascript
ROSTER_HEADERS = {
  tableNo: ['Table No.', 'TableNo', 'Table_Number', 'table_no'],
  seatNo: ['Seat No.', 'Seat', 'SeatNo', 'seat_no'],
  player: ['Players', 'Player', 'Name'],
  nation: ['Nationality', 'Nation', 'Country'],
  chips: ['Chips', 'Stack', 'Starting Chips', 'StartStack']
}
```

**이름 단축**:
```javascript
"John Doe" → "J.Doe"
"Smith" → "Smith"
```

---

## 📊 데이터 스키마

### HANDS 시트

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| hand_id | String | ✅ | `yyyyMMdd_HHmmssSSS` + 중복 시 `+1` 접미사 |
| client_uuid | String | ✅ | 멱등성 체크용 UUID v4 |
| table_id | String | ✅ | 테이블 번호 |
| hand_no | String | ✅ | 핸드 번호 (자동/수동) |
| start_street | String | ✅ | `PREFLOP`/`FLOP`/`TURN`/`RIVER` |
| started_at | ISO8601 | ✅ | 핸드 시작 시각 |
| ended_at | String | ❌ | 종료 시각 (미사용) |
| btn_seat | String | ✅ | BTN 좌석 번호 |
| board_f1, board_f2, board_f3 | String | ❌ | Flop 카드 (예: `"As"`) |
| board_turn, board_river | String | ❌ | Turn/River 카드 |
| pre_pot | Number | ❌ | 선 누적 팟 (기본값: 0) |
| **winner_seat** | String | ❌ | **v1.1 제거: 항상 공란** |
| pot_final | String | ❌ | 최종 팟 (미사용) |
| stacks_json | JSON | ❌ | `{"1":50000,"2":50000}` |
| holes_json | JSON | ❌ | `{"1":["As","Kh"],"2":["Qd","Qc"]}` |
| schema_ver | String | ✅ | `"v1.1.1"` 고정값 |

---

### ACTIONS 시트

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| hand_id | String | ✅ | 핸드 외래키 |
| seq | Number | ✅ | 액션 순서 (1부터 시작) |
| street | String | ✅ | `PREFLOP`/`FLOP`/`TURN`/`RIVER` |
| seat | String | ✅ | 좌석 번호 |
| action | String | ✅ | `CHECK`/`CALL`/`BET`/`RAISE`/`FOLD`/`ALLIN` |
| amount_input | Number | ✅ | 입력 금액 (CHECK/FOLD: 0) |
| to_call_after | Number | ✅ | 액션 후 toCall 값 |
| contrib_after_seat | Number | ✅ | 액션 후 해당 좌석 기여액 |
| pot_after | Number | ✅ | 액션 후 팟 크기 |
| note | String | ❌ | 메모 (미사용) |

---

## 🚀 비기능 요구사항

### 성능

**스크립트 락**:
- 500ms 대기 + 3회 재시도
- 백오프: 150ms 단위

**외부 쓰기 최적화**:
- 비연속 컬럼 개별 setValue (배치 금지)
- Apps Script 제약: I열을 건너뛰는 배치 쓰기 불가

**로그 최소화**:
- LOG 시트에 핵심 이벤트만 기록
- `SAVE_EXT_BEGIN`, `SAVE_OK`, `EXT_PICKROW`, `EXT_VALUES`, `EXT_OK`, `EXT_FAIL`

---

### UX

**모바일 우선**:
- 28px 루트 폰트
- 버튼 최소 높이 66px
- 카드 그리드 54px 높이

**다크 테마**:
```css
--bg: #0b0d12
--panel: #101522
--text: #e7eaf0
--acc: #2a6fff
```

**즉시 피드백**:
- 커밋: `"저장 중…"` → `"완료: #12 (20251002_143025123)"`
- 설정: `"저장됨"` (1.5초 후 자동 삭제)

**오류 처리**:
- 사용자 친화적 오류 메시지
- 외부 시트 실패 시에도 HANDS 저장 성공

---

### 보안/안정성

**멱등성**:
- 중복 제출 방지 (client_uuid + started_at)
- UUID v4: `crypto.getRandomValues()`

**락 관리**:
- 동시 쓰기 충돌 방지 (LockService)
- 재시도 3회, 백오프 150ms

**오류 격리**:
- 외부 시트 실패 시에도 HANDS/ACTIONS 저장 성공
- `try-catch` 래핑

---

## 🔄 v1.1.1 변경 사항 (2025-10-02)

### C열 파싱 개선

**지원 타입**:
- Date 객체
- 숫자 (0~1)
- 문자열 `"HH:mm(:ss)"`

**정규화**:
- KST 오늘 날짜 기준
- `todayStartKST_().setHours(hh, mm, ss, 0)`

---

### 승자 판정 제거

**배경**:
포커 핸드 승자 판정은 단순 로직으로 불가능:
- **Fold 승리**: 남은 플레이어 1명
- **Showdown 승리**: 5카드 핸드 랭킹 비교 필요
- **Split Pot**: 복수 승자

**변경**:
- `winner_seat` 컬럼 항상 `""` 저장
- VIRTUAL 시트 J열 공란

**대안**:
- 수동 편집 (VIRTUAL 시트 J열)
- v1.2 핸드 평가 엔진 예정

---

### 로그 강화

| 코드 | 설명 |
|------|------|
| `EXT_PICKROW` | 선택된 행 번호 + 현재 시각 |
| `EXT_VALUES` | E/F/G/H/J 컬럼 값 요약 |
| `EXT_OK` | 성공 시 행 번호 |

---

## 📝 제약사항

| 제약 | 설명 | 대안 |
|------|------|------|
| **BTN만 지원** | SB/BB 구분 없음 | BTN 기준 턴 순서 계산 |
| **사이드팟 없음** | 자동 계산 미지원 | pre_pot 수동 입력 |
| **보드 미완성 허용** | 5장 미만 저장 가능 | Preflop only 핸드 지원 |
| **ALLIN 금액 수동** | 스택 미입력 시 | 스택 입력 시 자동 계산 |
| **홀카드→보드 미차단** | 단방향 차단만 구현 | v1.2 양방향 차단 예정 |
| **승자 판정 없음** | 자동 판정 미지원 | 수동 편집 또는 v1.2 엔진 |

---

## 🎯 성공 지표

1. **기록 정확도**: 액션/팟 계산 오류 0건
2. **외부 연동 성공률**: 95% 이상
3. **모바일 UX**: 터치 조작 3초 이내 완료
4. **데이터 무결성**: 멱등성 100% 보장

---

## 🔮 향후 계획 (v1.2.0 이후)

### 우선순위 HIGH

1. ✅ **Review 모드 UX 개선 (v2.2.1 완료)**
   - 페이지네이션 "더 보기" 버튼
   - 타임스탬프 가독성 개선
   - 보드 카드 시각화
   - 핸드 목록 높이 증가

2. **홀카드↔보드 양방향 중복 차단** (1시간)
   - `toggleBoardCard()` 수정
   - 홀카드 사용 여부 체크

3. **Apps Script 배포 가이드** (1시간)
   - 배포 URL 생성 방법
   - 권한 설정 가이드

---

### 우선순위 MEDIUM

4. **핸드 평가 엔진** (8시간)
   - 5카드 조합 생성
   - 핸드 랭킹 비교
   - 승자 자동 판정

---

### 우선순위 LOW

5. **SB/BB 지원** (4시간)
   - CONFIG 시트에 sb_seat, bb_seat 추가
   - 턴 순서 로직 수정

6. **사이드팟 자동 계산** (6시간)
   - ALLIN 플레이어별 팟 분할

---

## 📌 최소주의 원칙 (Minimalism Philosophy)

### 왜 1,275줄로 충분한가? (v2.2.1: +57줄)

**설계 철학**:
1. **핵심 기능에 집중**: Record/Review/External 연동만
2. **과도한 추상화 배제**: 직접 SpreadsheetApp 호출
3. **의존성 제로**: 순수 Apps Script + HTML
4. **단순한 데이터 모델**: HANDS/ACTIONS 2테이블
5. **명확한 책임 분리**:
   - code.gs: 데이터 저장/조회
   - index.html: UI 렌더링/상태 관리

**v2.2.1 개선 (Review 모드)**:
- ✅ **최소 침습**: 기존 코드 +57줄만 추가 (4.7% 증가)
- ✅ **기존 함수 재사용**: `boardBadges_()` 100% 재사용
- ✅ **기존 CSS 재사용**: 새 클래스 없음, 인라인 스타일만
- ✅ **렌더링 로직 유지**: 목록 렌더링 로직 100% 동일
- ✅ **코드 스타일 일관성**: 명령형/직접 DOM 조작 유지
- ✅ **핸드 구분 로직 수정**: `seq=1 AND row_type=GAME` 기준으로 변경 (빈 줄 방식 제거)

---

### 장점

✅ 빠른 로딩 속도
✅ 쉬운 유지보수
✅ 낮은 학습 곡선
✅ 높은 안정성

---

### 의도적 제약 (Trade-offs)

❌ 고급 기능 부족 (핸드 평가, 사이드팟)
❌ 확장성 제한 (대용량 데이터)
❌ 테스트 코드 없음

---

### 결론

**"Less is More"** - 핵심 기능만 완벽하게 구현하여 사용자 경험 극대화

---

## 📚 참고 자료

- [LLD_HandLogger.md](LLD_HandLogger.md): 상세 설계
- [PLAN_HandLogger.md](PLAN_HandLogger.md): 실행 계획
- [code.gs](../code.gs): 백엔드 코드 (562줄)
- [index.html](../index.html): 프론트엔드 코드 (656줄)
