# PRD - Poker Hand Logger

## 📋 프로젝트 개요
**버전**: v2.0.0 (2025-10-06) - 대형 패치
**목적**: 포커 핸드 실시간 기록 및 모니터링 시스템
**플랫폼**: Google Apps Script + Web App

## 🚨 **v2.0.0 대형 패치 주요 변경사항**

### **1. 스프레드시트 구조 단일화**
- ❌ **폐기**: `APP_SPREADSHEET` (19e7eDjoZRFZooghZJF3XmOZzZcgmqsp9mFAfjvJWhj4)
  - HANDS 시트 삭제
  - ACTIONS 시트 삭제
  - CONFIG 시트 삭제
  - LOG 시트 삭제
- ✅ **유지**: `ROSTER_SPREADSHEET` (1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U)
  - Type 시트 (기존 유지)
  - **Hand 시트 (신규)** ← 모든 핸드 데이터 저장

### **2. 데이터 저장 위치 변경**
- **Before**: APP_SPREADSHEET/HANDS 시트
- **After**: ROSTER_SPREADSHEET/Hand 시트

### **3. VIRTUAL 시트 갱신 정책 변경**
- **Record 모드**: VIRTUAL 갱신 제거 (데이터 전송만)
- **Review 모드**: VIRTUAL 수동 갱신 유지 (버튼 클릭)

### **4. DB 구조 재설계**
- **참고 파일**: `csv/Virtual_Table_Data - Hand.csv` (2,866줄)
- **새 스키마**: 핸드별 1행, JSON 통합 방식
- **상세**: [CSV_ANALYSIS_Hand.md](CSV_ANALYSIS_Hand.md) 참조

## 🎯 핵심 목표
1. **실시간 핸드 기록**: 포커 게임 진행 중 액션/보드/결과 즉시 기록 (모바일 최적화)
2. **외부 시트 연동**: VIRTUAL 시트 자동 갱신 (파일명/히스토리/상태)
3. **핸드 모니터링**: 저장된 핸드 신속 확인 (PC 전용)
4. **역할별 최적화**:
   - Record 모드: 모바일 터치 중심
   - Review 모드: PC 2-Panel 중심

## 👥 주요 사용자
- **딜러/기록자**: 실시간 핸드 입력 (모바일)
- **모니터링 담당**: 핸드 내용 신속 확인 (PC)
- **프로듀서**: 외부 시트 연동 및 자막 생성

## 🔑 핵심 기능

### 1. Record Mode (핸드 기록)
#### 1.1 테이블/플레이어 설정
- **테이블 선택**: Type 시트에서 테이블 목록 로드
- **참여자 선택**: 좌석별 토글 (비참여자 제외)
- **BTN 지정**: 이전 BTN 자동 복원
- **스택 입력**: 좌석별 시작 스택 (선택)

#### 1.2 핸드 정보 입력
- **시작 스트릿**: Preflop/Flop/Turn/River 고정 선택
- **핸드 번호**: 자동 부여 또는 수동 입력
- **선 누적 팟**: pre_pot 입력 (선택)
- **홀카드 선택**: 좌석별 2장 선택 (오버레이 UI)

#### 1.3 액션 기록
- **턴 기반 시스템**: 현재 차례 좌석 자동 표시
- **액션 버튼**: CHECK/CALL/BET/RAISE/FOLD/ALLIN
- **금액 입력**: BET/RAISE/ALLIN 시 프롬프트
- **실시간 계산**:
  - toCall: 현재 콜 금액 자동 계산
  - pot: 누적 팟 실시간 업데이트
  - contrib: 좌석별 기여액 추적

#### 1.4 보드 카드 선택
- **카드 토글**: A→2 / ♠→♥→♦→♣ 그리드
- **5장 제한**: 최대 5장 선택 (Flop 3 + Turn + River)
- **중복 방지**: 보드↔홀카드 간 중복 차단 (단방향)
- **재탭 해제**: 선택 카드 재클릭 시 선택 해제

#### 1.5 스트릿 진행
- **자동 전환**: 액션 완료 시 다음 스트릿 자동 이동
  - Preflop → Flop → Turn → River
- **턴 순서 재계산**: 스트릿별 BTN 기준 순서 재정렬
- **Undo 기능**: 마지막 액션 되돌리기

#### 1.6 데이터 전송 (커밋) - v2.0.0 변경
- **저장 위치**: `ROSTER_SPREADSHEET/Hand` 시트
- **멱등성 보장**: hand_id 기반 중복 방지
- **Hand 시트 저장**: 핸드별 1행 (JSON 통합)
- **✅ v2.0.0**: VIRTUAL 시트 자동 갱신 **제거**
  - Record 모드에서는 Hand 시트 저장만 수행
  - VIRTUAL 갱신은 Review 모드에서만 가능 (수동)

### 2. Review Mode (핸드 모니터링 - PC 전용)
**목적**: 기록된 핸드를 신속하게 파악하고 모니터링
**대상**: PC/태블릿 가로 모드 (모바일 비최적화)
**핵심**: 2-Panel 레이아웃으로 빠른 탐색 및 내용 확인
**제약**: ⚠️ **Record 모드 기존 기능 100% 보존 필수** (공용 함수 수정 금지)

#### 2.1 레이아웃 전략
- **2-Panel 구조**: 왼쪽 40% (목록) + 오른쪽 60% (상세)
- **독립 스크롤**: 각 패널 개별 스크롤 영역 (max-height: 75vh)
- **즉시 전환**: 목록 클릭 시 오른쪽 패널 즉시 갱신
- **컨텍스트 유지**: 목록 항상 보이므로 빠른 핸드 간 이동

#### 2.2 왼쪽 패널 (목록)
- **최신순 정렬**: started_at 기준 내림차순 (⚠️ 현재 버그 - v1.2.0 수정 예정)
- **무한 스크롤**: 초기 10건 로드 → 스크롤 시 자동 추가 로드 (PAGE_SIZE=10)
- **컴팩트 요약**:
  - 1행: 핸드번호/테이블/BTN
  - 2행: 팟/스트릿
  - 3행: 보드 미리보기 (작은 배지 32×32px)
  - 4행: 시간
- **선택 상태 표시**: 현재 보는 핸드 파란 테두리 (2px solid #2a6fff)
- **빠른 스캔**: 작은 카드 배지로 보드 한눈에 파악

#### 2.3 오른쪽 패널 (상세) - v1.2.1 완성
- **헤더**:
  - 1행: 핸드번호 (좌) + **팟 (BB 변환)** (우, 파란 강조)
    - 예: `핸드 #12` | `팟: 75,000 (75.0BB)`
  - 2행: hand_id (작은 회색 텍스트)
  - 3행: table_id · btn_seat · start_street

- **보드 섹션**:
  - 제목: "보드" (작은 회색 텍스트)
  - 카드별 컬러 배지 (♠검정/♥빨강/♦파랑/♣초록, 68×68px)
  - 실제 수트 색상 적용 (v1.2.1 버그 수정)

- **플레이어 통합 뷰** (v1.2.1 신규):
  - 3컬럼 그리드: 이름(포지션) | 홀카드 | 스택
  - 예: `Alice (BTN) | [A♠][K♠] | 50,000`
  - BTN 위치 자동 표시
  - **실제 플레이어 이름 표시** (v1.2.1 버그 수정: "S.6" → "Alice")
  - table_id 기반 Roster 조회 (`getSeatNameByTable()`)

- **액션 히스토리**:
  - 스트릿별 블록 (PREFLOP/FLOP/TURN/RIVER)
  - 액션 배지 (이름 + 액션 + 금액 + pot)
  - 색상 코딩 (RAISE/BET=빨강, CALL/CHECK=초록, FOLD=파랑, ALLIN=진빨강)

- **푸터** (v1.2.1 신규):
  - 구분선 + 최종 팟 (BB 변환, 파란색 강조)
  - 예: `최종 팟: 75,000 (75.0BB)`

#### 2.4 VIRTUAL 수동 갱신 (v2.0.0 핵심 기능)
- **목적**: Review 모드에서 특정 핸드를 VIRTUAL 시트에 수동으로 갱신
- **UI 위치**: 오른쪽 패널 하단 (푸터 아래)
- **버튼**: "🔄 VIRTUAL 시트에 갱신"
- **동작 흐름**:
  1. 버튼 클릭
  2. localStorage에서 extSheetId 복원 (없으면 입력 프롬프트)
  3. `updateHandToVirtual(hand_id, ext)` 서버 호출
  4. 상태 메시지 표시:
     - 성공: "✅ 갱신 완료 (row 5)"
     - 실패: "⚠️ 갱신 실패: no-match-by-time"
     - 오류: "❌ 오류: [상세 메시지]"
- **VIRTUAL 시트 갱신 상세**:
  - **C열(Time) 기준 행 매칭**: 현재 시각 이하 중 가장 최근 행 선택
  - **E열**: "미완료" 상태
  - **F열**: 파일명 (예: VT12_JDoe_AhKs_vs_JSmith_QdQc)
  - **G열**: "A" 고정
  - **H열**: 3줄 요약 (참가자/보드/팟)
  - **J열**: 공란 (승자 제거)
- **활용 사례**:
  - 과거 핸드 재갱신
  - Record 모드에서 누락된 핸드 수동 처리
  - VIRTUAL 시트 row 매칭 실패 시 재시도

#### 2.5 개발 제약사항 (v1.2.0)
- **공용 함수 수정 금지**:
  - `cardCode()`, `prettyCard()`, `seatNameOnly()`, `getSeatName()` 등
  - Record 모드가 의존하는 모든 함수는 **읽기 전용**
- **점진적 개선**:
  - Review 전용 함수만 추가/수정
  - 기존 함수 재사용 우선
- **검증 필수**:
  - 모든 변경 후 Record 모드 전체 플로우 테스트
  - Review 기능 추가가 Record 동작에 영향 없음 확인

### 3. 외부 연동 기능
#### 3.1 External Sheet ID 설정
- **시트 ID 저장**: localStorage 영구 저장
- **BB 설정**: Big Blind 금액 (팟 BB 환산용)

#### 3.2 VIRTUAL 시트 갱신
- **C열 파싱 (v1.1.1 개선)**:
  - Date 객체: getHours/getMinutes/getSeconds
  - 숫자(0~1): 하루 분수 → 초 환산
  - 문자열: "HH:mm(:ss)" 정규식 파싱
- **행 선택 로직**:
  - 현재 KST 시각 이하 중 가장 최근 행 (아래→위 검색)
  - rowTime <= nowKST 조건
- **비연속 컬럼 쓰기**: E(5), F(6), G(7), H(8), J(10)

### 4. 설정/구성 관리
#### 4.1 CONFIG 시트
- **BTN 추적**: 테이블별 마지막 BTN 저장/복원
- **hand_seq 자동 증가**: 테이블별 핸드 번호 시퀀스
- **reset 기능**: 특정 테이블 시퀀스 초기화

#### 4.2 ROSTER 연동
- **Type 시트 파싱**:
  - TableNo/SeatNo/Player/Nationality/Chips 컬럼
  - 다중 별칭 지원 (예: "Table No.", "TableNo", "Table_Number")
- **플레이어 정보 자동 로드**: 테이블 선택 시 좌석별 정보 표시

## 📊 데이터 스키마 (v2.0.0)

### **Hand 시트 (v2.0.1)** (ROSTER_SPREADSHEET)
**스프레드시트 ID**: `1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U`

| # | 컬럼명 | 타입 | 필수 | 설명 | 예시 |
|---|--------|------|------|------|------|
| 1 | hand_id | String | ✅ | 고유 핸드 ID (PK) | `20250827_143052` |
| 2 | hand_no | Number | ✅ | 핸드 번호 | `181`, `168` |
| 3 | timestamp | Number | ✅ | Unix 타임스탬프 (ms) | `1758294658000` |
| 4 | table_id | String | ✅ | 테이블 ID | `NewT13`, `1` |
| 5 | game_type | String | ✅ | 게임 타입 | `HOLDEM` |
| 6 | stakes_type | String | ✅ | 스테이크 타입 | `BB_ANTE`, `NO_ANTE` |
| 7 | bb | Number | ✅ | Big Blind | `1000`, `2000` |
| 8 | sb | Number | ✅ | Small Blind | `500`, `1000` |
| 9 | bb_ante | Number | ❌ | BB Ante | `1000`, `0` |
| 10 | btn_seat | Number | ✅ | BTN 좌석 | `1` |
| 11 | sb_seat | Number | ✅ | SB 좌석 | `2` |
| 12 | bb_seat | Number | ✅ | BB 좌석 | `3` |
| 13 | board_json | JSON | ❌ | 보드 카드 배열 | `["Qs","10h","10s"]` |
| 14 | players_json | JSON | ✅ | 플레이어 정보 배열 | (하단 참조) |
| 15 | events_json | JSON | ✅ | 이벤트 정보 배열 | (하단 참조) |
| 16 | final_pot | Number | ❌ | 최종 팟 | `75000` |
| 17 | game_name | String | ❌ | 게임 이름 | `GGProd Hand Logger` |
| 18 | **initial_pot** | Number | ❌ | **초기 팟 (POT_CORRECTION 합계)** | `5300` |
| 19 | **contributed_pot** | Number | ❌ | **플레이어 베팅 합계** | `69700` |

**💡 final_pot 계산 공식:**
```javascript
final_pot = initial_pot + contributed_pot
```

**⚠️ CSV 파싱 주의사항:**
- `stakes_type`에 따라 CSV 컬럼 위치가 다름
- BB_ANTE: CSV[6]=bb, CSV[8]=sb, CSV[9]=bb_ante
- NO_ANTE: CSV[8]=sb, CSV[9]=bb, CSV[10]=bb_ante

**players_json 구조 (v2.0.1):**
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
  },
  {
    "seat": 5,
    "name": "V05",
    "start_stack": 22000,
    "end_stack": 20000,
    "hole_cards": null,
    "position": null,
    "is_hero": false,
    "marker": "KR"
  }
]
```

**🔄 v2.0.1 변경:**
- `hole_cards`: 문자열 → **배열** (`["10h", "9d"]`)
- 홀카드 없을 시: 빈 문자열 → **null**

**events_json 구조 (v2.0.1):**
```json
[
  {"seq": 1, "event_type": "POT_CORRECTION", "amount": 5300},
  {"seq": 2, "event_type": "BOARD", "card": "8h"},
  {"seq": 3, "event_type": "BET", "seat": 2, "amount": 2800},
  {
    "seq": 4,
    "event_type": "RAISE",
    "seat": 9,
    "amount": 12200,
    "total_bet": 15000,
    "raise_type": "TO"
  },
  {"seq": 5, "event_type": "ALL-IN", "seat": 3, "amount": 0}
]
```

**🔄 v2.0.1 변경:**
- **RAISE_TO 처리**: `total_bet`, `raise_type` 필드 추가
- **amount**: 증가 금액 (total_bet - 이전 베팅)

### ❌ **폐기된 시트 (v2.0.0)**
- **HANDS 시트** (APP_SPREADSHEET) → Hand 시트로 통합
- **ACTIONS 시트** (APP_SPREADSHEET) → events_json으로 통합
- **CONFIG 시트** (APP_SPREADSHEET) → 폐기 (BTN 자동 복원 제거)
- **LOG 시트** (APP_SPREADSHEET) → 폐기

## 🚀 비기능 요구사항

### 성능
- **스크립트 락**: 500ms 대기 + 3회 재시도 (150ms backoff)
- **외부 쓰기 최적화**: 비연속 컬럼 개별 setValue (배치 금지)
- **로그 최소화**: 핵심 이벤트만 LOG 시트 기록

### UX
- **모바일 우선**: 28px 루트 폰트, 터치 친화적 버튼 크기
- **다크 테마**: --bg:#0b0d12, --panel:#101522
- **즉시 피드백**: 커밋/설정 저장 시 메시지 표시
- **오류 처리**: 사용자 친화적 오류 메시지 + 재시도 안내

### 보안/안정성
- **멱등성**: 중복 제출 방지 (client_uuid + started_at)
- **락 관리**: 동시 쓰기 충돌 방지 (LockService)
- **오류 격리**: 외부 시트 실패 시에도 HANDS/ACTIONS 저장 성공

## 🔄 v1.1.1 변경 사항
### C열 파싱 개선
- **혼합 데이터 지원**: Date/숫자/문자열 자동 감지
- **정규화**: HH:mm(:ss) 포맷으로 통일
- **KST 비교**: 오늘 날짜 기준 시각 비교

### 승자 판정 제거
- **J열 공란**: winner_seat 로직 완전 제거
- **외부 시트**: J열에 빈 문자열 쓰기

### 로그 강화
- **EXT_PICKROW**: 선택된 행 번호 + 현재 시각 기록
- **EXT_VALUES**: E/F/G/H/J 컬럼 값 요약 기록

## 📝 제약사항
- **BTN만 지원**: SB/BB 구분 없음
- **사이드팟 없음**: 자동 계산 미지원 (수동 입력)
- **보드 미완성 허용**: 5장 미만 보드 저장 가능
- **ALLIN 금액 수동**: 스택 기반 자동 계산 옵션 제공

## 🎯 성공 지표
1. **기록 정확도**: 액션/팟 계산 오류 0건
2. **외부 연동 성공률**: 95% 이상
3. **모바일 UX**: 터치 조작 3초 이내 완료
4. **데이터 무결성**: 멱등성 100% 보장
