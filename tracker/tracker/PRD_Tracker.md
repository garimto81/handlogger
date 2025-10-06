# PRD - Tracker (Key Player & Table Manager) v1.0

> **작업 목록** | 비전: [PLAN_Tracker](PLAN_Tracker.md) | 구현: [LLD_Tracker](LLD_Tracker.md)

## 🎯 프로젝트 목표

**현장 데이터 매니저가 키 플레이어 18명의 위치/칩을 실시간 추적하고, 테이블별 플레이어(9명)를 관리(추가/삭제/칩 수정)하는 독립 모듈**

- **PLAN 근거**: 시나리오 2 (신규 플레이어 등록 15초), 시나리오 3 (칩 업데이트 10초)
- **성공 기준**: 키 플레이어 칩 업데이트 ≤ 15초, 신규 플레이어 등록 ≤ 20초

---

## Phase 1: MVP (v1.0 목표)

### 1.1 Tracker 모드 UI 구조 🔴 High
- **근거**: PLAN 시나리오 1 (30초 내 18명 현황 확인)
- **성공**: Key Player View 로딩 시간 ≤ 2초
- **체크리스트**:
  - [ ] Header에 "Tracker" 버튼 추가 (Record/Review 옆)
  - [ ] `panelTracker` 영역 생성 (panelRecord/panelReview와 동일 구조)
  - [ ] Key Player View: 키 플레이어 카드 목록 (스크롤 가능)
  - [ ] Table View: 테이블별 9좌석 플레이어 목록
  - [ ] 모드 전환 (showTracker, hideTracker 함수)
- **예상**: 2시간
- **의존성**: 없음

---

### 1.2 Key Player View 렌더링 🔴 High
- **근거**: PLAN 시나리오 1 (키 플레이어 18명 확인)
- **성공**: Type 시트 Keyplayer=TRUE 플레이어만 표시
- **체크리스트**:
  - [ ] `loadKeyPlayers()` 클라이언트 함수 (서버 호출)
  - [ ] `getKeyPlayers()` 서버 함수 (Type 시트 읽기)
  - [ ] 카드 렌더링 (테이블, 이름, 좌석, 국기, 칩)
  - [ ] 칩 변화량 표시 (localStorage 이전 값 비교 → ↑/↓/→)
  - [ ] [T## 관리] 버튼 → Table View 전환
- **예상**: 3시간
- **의존성**: 1.1 (UI 구조)

---

### 1.3 Table View 렌더링 🔴 High
- **근거**: PLAN 시나리오 2 (테이블 T15 플레이어 9명 관리)
- **성공**: 9좌석 전체 표시 (빈 좌석 포함)
- **체크리스트**:
  - [ ] `loadTablePlayers(tableId)` 클라이언트 함수
  - [ ] `getTablePlayers(tableId)` 서버 함수 (S1~S9 전체 반환)
  - [ ] 플레이어 행 렌더링 (이름, 국기, 칩, 🗑️ 버튼)
  - [ ] 빈 좌석 렌더링 ([+] 버튼)
  - [ ] 키 플레이어 ⭐ 표시 (Keyplayer=TRUE)
  - [ ] ← Back 버튼 → Key Player View 복귀
- **예상**: 3시간
- **의존성**: 1.1 (UI 구조)

---

### 1.4 칩 수정 기능 🔴 High
- **근거**: PLAN 시나리오 3 (칩 업데이트 10초)
- **성공**: 칩 클릭 → 입력 → 확인 ≤ 15초
- **체크리스트**:
  - [ ] Key Player View: 칩 텍스트 클릭 → 오버레이 팝업
  - [ ] Table View: 칩 텍스트 클릭 → 오버레이 팝업
  - [ ] 오버레이: `<input type="text">` (숫자만 입력 가능)
  - [ ] `updatePlayerChips(tableId, seatNo, newChips)` 서버 함수
  - [ ] Type 시트 Chips 컬럼 업데이트 (findRow → setValue)
  - [ ] 성공 시 UI 즉시 반영 + localStorage 저장 (칩 변화량 계산)
- **예상**: 2시간
- **의존성**: 1.2, 1.3 (칩 렌더링)

---

### 1.5 플레이어 추가 기능 🔴 High
- **근거**: PLAN 시나리오 2 (신규 플레이어 등록 15초)
- **성공**: [+] → 입력 → [추가] ≤ 20초
- **체크리스트**:
  - [ ] Table View: [+] 버튼 클릭 → 오버레이 팝업
  - [ ] 입력 필드: 이름(text), 국적(select), 칩(text), 키(checkbox)
  - [ ] `addPlayer(tableId, seatNo, name, nation, chips, isKey)` 서버 함수
  - [ ] Type 시트 appendRow (새 행 추가)
  - [ ] 성공 시 Table View 리렌더링
- **예상**: 2.5시간
- **의존성**: 1.3 (Table View)

---

### 1.6 플레이어 삭제 기능 🔴 High
- **근거**: PLAN 시나리오 4 (탈락자 삭제 10초)
- **성공**: 🗑️ → 확인 ≤ 10초
- **체크리스트**:
  - [ ] Table View: 🗑️ 버튼 클릭 → 확인 다이얼로그
  - [ ] `removePlayer(tableId, seatNo)` 서버 함수
  - [ ] Type 시트 행 삭제 (findRow → deleteRow)
  - [ ] 성공 시 Table View 리렌더링
- **예상**: 1.5시간
- **의존성**: 1.3 (Table View)

---

### 1.7 국적 드롭다운 데이터 🟡 Medium
- **근거**: 사용자 입력 편의성
- **성공**: 주요 30개국 국기 + ISO 코드 표시
- **체크리스트**:
  - [ ] `COUNTRIES` 상수 (KR, US, JP, CN, GB, FR, DE 등 30개)
  - [ ] `<select>` 드롭다운 렌더링 (🇰🇷 KR 형식)
  - [ ] 기본값: "KR"
- **예상**: 30분
- **의존성**: 1.5 (플레이어 추가)

---

### 1.8 에러 처리 및 로딩 상태 🟡 Medium
- **근거**: 프로덕션 안정성
- **성공**: 서버 에러 시 명확한 메시지 표시
- **체크리스트**:
  - [ ] 로딩 스피너 (서버 호출 중)
  - [ ] 에러 메시지 표시 (오버레이 또는 상단 알림)
  - [ ] 타임아웃 처리 (30초)
  - [ ] ScriptLock 재시도 에러 핸들링
- **예상**: 1시간
- **의존성**: 1.2~1.6 (모든 서버 함수)

---

### 1.9 반응형 디자인 (clamp 기반) 🔴 High
- **근거**: 다양한 디바이스(360px~430px) 최적화, 코드 중복 제거
- **성공**: 모든 스마트폰에서 최적 레이아웃, Tracker CSS 20% 감소, 터치 반응 ≤ 300ms (PLAN 기준)
- **체크리스트**:
  - [x] `:root` 변수 정의 (--sp-xs, --sp-sm, --sp-md, --sp-lg)
  - [x] `:root { font-size: clamp(15px, 4.8vw, 20px) }` 적용
  - [x] 여백 변수화: `padding: var(--sp-md)` 형태로 통일 (49개 사용처)
  - [x] 26개 절대값 → 4개 변수로 중앙 집중
  - [x] 빌드 후 Tracker CSS 크기 검증 (완료)
  - [ ] 360px/393px/430px 디바이스 테스트 (레이아웃 깨짐 없음)
- **예상**: 1.5시간
- **의존성**: 없음 (CSS 변수만 선언, 기존 절대값 병행 가능)

**기술 근거**:
```css
/* BEFORE: 분산된 절대값 26개 (2.1KB) */
.keyPlayerCard{padding:10px;margin-bottom:8px}
.cardHeader{gap:6px;margin-bottom:4px}
.manageBtn{padding:6px 10px}
/* ... 총 26개 속성 */

/* AFTER: 중앙 집중 변수 4개 (1.7KB, 20% 감소) */
:root{
  font-size:clamp(15px,4.8vw,20px);
  --sp-xs:clamp(3px,0.8vw,6px);    /* 작은 간격: 3~6px */
  --sp-sm:clamp(6px,1.5vw,10px);   /* 중간 간격: 6~10px */
  --sp-md:clamp(8px,2vw,14px);     /* 큰 간격: 8~14px */
  --sp-lg:clamp(12px,3vw,20px);    /* 오버레이: 12~20px */
}
.keyPlayerCard{padding:var(--sp-md);margin-bottom:var(--sp-sm)}
.cardHeader{gap:var(--sp-xs);margin-bottom:var(--sp-xs)}
.overlayBox{padding:var(--sp-lg)}
```

**디바이스 대응** (clamp 계산 검증):

- 360px (Galaxy S23): font-size 17.28px, --sp-md 8px (min 제약)
- 393px (iPhone 14): font-size 18.86px, --sp-md 8px (min 제약)
- 430px (iPhone 14 Plus): font-size 20px (max 제약), --sp-md 8.6px
- 768px+ (태블릿): font-size 20px (max 제약), --sp-md 14px (max 제약)

**계산 원리**:

```javascript
clamp(MIN, PREFERRED, MAX) = max(MIN, min(PREFERRED, MAX))

// 예: 360px에서 --sp-md: clamp(8px, 2vw, 14px)
2vw = 360 * 0.02 = 7.2px
clamp(8, 7.2, 14) = max(8, min(7.2, 14)) = max(8, 7.2) = 8px ✅
```

---

## Phase 2: 편의성 개선 (v1.1 예정)

### 2.1 키 플레이어 테이블 이동 🟡 Medium
- **근거**: PLAN 시나리오 누락 (테이블 이동 추적)
- **성공**: T15 → T28 이동 ≤ 20초
- **체크리스트**:
  - [ ] Key Player View: 카드에 [이동] 버튼 추가
  - [ ] 오버레이: 테이블 입력 (T__) + 좌석 자동/수동 선택
  - [ ] `movePlayer(oldTable, oldSeat, newTable, newSeat)` 서버 함수
  - [ ] Type 시트 Table No., Seat No. 업데이트
- **예상**: 2시간
- **의존성**: 1.2 (Key Player View)

---

### 2.2 테이블 검색/필터 🟢 Low
- **근거**: 80개 테이블 중 특정 테이블 빠른 접근
- **성공**: 테이블 검색 ≤ 5초
- **체크리스트**:
  - [ ] Key Player View 상단: 검색 입력 (`[T__]`)
  - [ ] 입력 시 카드 목록 필터링 (클라이언트 사이드)
  - [ ] 검색 초기화 버튼
- **예상**: 1시간
- **의존성**: 1.2 (Key Player View)

---

### 2.3 칩리더 정렬 🟢 Low
- **근거**: 칩 리더 10명 빠른 확인
- **성공**: 칩 내림차순 정렬 ≤ 2초
- **체크리스트**:
  - [ ] Key Player View: [칩리더 ▼] 드롭다운
  - [ ] 정렬 옵션: 칩 많은 순, 칩 적은 순, 테이블 번호순
  - [ ] localStorage 정렬 설정 저장
- **예상**: 1시간
- **의존성**: 1.2 (Key Player View)

---

### 2.4 칩 변화량 추적 개선 🟢 Low
- **근거**: 데이터 시각화
- **성공**: 칩 변화량 색상 코딩 (↑ 녹색, ↓ 빨강)
- **체크리스트**:
  - [ ] localStorage에 칩 이력 저장 (최근 3회)
  - [ ] 칩 변화량 CSS 클래스 (`.chip-up`, `.chip-down`)
  - [ ] 변화율 표시 (+50% 등)
- **예상**: 1.5시간
- **의존성**: 1.2 (Key Player View)

---

## Phase 3: 일괄 작업 (v1.2 예정)

### 3.1 테이블 일괄 칩 입력 🟡 Medium
- **근거**: 휴식 시간 칩 일괄 업데이트
- **성공**: 9명 칩 입력 ≤ 60초
- **체크리스트**:
  - [ ] Table View: [일괄 칩 입력] 버튼
  - [ ] 오버레이: S1~S9 입력 필드 (Enter로 다음 이동)
  - [ ] `updateTableChipsBulk(tableId, chipsArray)` 서버 함수
  - [ ] Type 시트 일괄 업데이트 (batchUpdate)
- **예상**: 3시간
- **의존성**: 1.3 (Table View)

---

### 3.2 Type 시트 초기화 🟢 Low
- **근거**: 신규 대회 시작 시 데이터 초기화
- **성공**: Type 시트 전체 삭제 ≤ 5초
- **체크리스트**:
  - [ ] 설정 모드에 [Type 초기화] 버튼
  - [ ] 확인 다이얼로그 (위험 경고)
  - [ ] `clearTypeSheet()` 서버 함수 (헤더 제외 전체 삭제)
- **예상**: 1시간
- **의존성**: 없음

---

## 🚫 제약사항

### 기능적 제약 (v1.0)
- **키 플레이어 직접 등록 불가**: Type 시트에서 Keyplayer 컬럼 수동 TRUE 설정 필요
- **테이블 이동 미지원**: v1.1에서 추가 예정
- **일괄 작업 미지원**: 칩 일괄 입력, 테이블 초기화 v1.2 예정

### 기술적 제약
- **Type 시트 의존성**: Tracker는 Type 시트만 사용 (HANDS/ACTIONS 독립)
- **ScriptLock 직렬화**: 동시 사용자 대기 발생 가능
- **모바일 최적화**: 393px 기준 (PC 미지원)

---

## 📊 성공 지표

### PLAN 기준
- [ ] **키 플레이어 칩 업데이트** ≤ 15초 (현재: 종이 메모 → 30분)
- [ ] **신규 플레이어 등록** ≤ 20초
- [ ] **플레이어 삭제** ≤ 10초
- [ ] **Type 시트 동기화 성공률** ≥ 99%

### 기술적 지표
- [ ] **Key Player View 로딩** ≤ 2초
- [ ] **Table View 로딩** ≤ 1초
- [ ] **모바일 터치 반응속도** ≤ 300ms

---

## 🔗 관련 문서

- [PLAN_Tracker.md](PLAN_Tracker.md) - 프로젝트 비전
- [LLD_Tracker.md](LLD_Tracker.md) - 기술 설계
- [PLAN_HandLogger.md](PLAN_HandLogger.md) - 본체 프로젝트