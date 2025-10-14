# PRD-0002: Hand Number Auto-Increment

**버전**: 1.0.0
**작성일**: 2025-01-15
**상태**: Approved

---

## 1. 개요

현재 HandLogger는 핸드 번호(hand_no)를 수동으로 입력해야 하며, 사용자가 HANDS 시트의 D열(hand_no)에서 마지막 번호를 확인한 후 다음 번호를 직접 입력해야 합니다. 이는 휴먼 에러를 유발하고 워크플로우를 느리게 만듭니다.

**목표**: HANDS 시트의 마지막 hand_no를 자동으로 조회하여 다음 번호를 자동 증가시키는 기능 구현

---

## 2. 목표

### 주요 목표
- [ ] Record 탭 시작 시 HANDS 시트 D열에서 최대 hand_no 자동 조회
- [ ] 다음 hand_no 자동 계산 및 표시
- [ ] 커밋 시 자동 증가된 hand_no 사용
- [ ] 수동 수정 옵션 제공 (특수 상황 대응)

### 부가 목표
- [ ] 시트 조회 실패 시 fallback 로직
- [ ] 캐싱으로 불필요한 시트 조회 최소화
- [ ] 테이블 변경 시 hand_no 갱신

---

## 3. 사용자 스토리

**As a** 포커 핸드 기록자
**I want to** 핸드 번호가 자동으로 증가하기를
**So that** 수동 입력 없이 빠르게 연속된 핸드를 기록할 수 있다

**수락 기준**:
- ✅ Record 탭 진입 시 다음 hand_no가 자동으로 표시됨
- ✅ 핸드 커밋 시 증가된 hand_no가 자동 적용됨
- ✅ 수동 수정 가능 (입력 필드 활성화)
- ✅ 시트 조회 실패 시 사용자에게 알림

---

## 4. 기능 요구사항

### 4.1 Auto-Increment Logic

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| **시트 조회** | HANDS 시트 D열(hand_no)에서 최대값 조회 | P0 |
| **자동 계산** | max(hand_no) + 1 계산 | P0 |
| **UI 표시** | Record 탭에 "다음 핸드: #N" 표시 | P0 |
| **커밋 적용** | commitHand() 호출 시 자동 hand_no 사용 | P0 |
| **수동 수정** | 입력 필드로 hand_no 직접 수정 가능 | P1 |
| **테이블 변경 갱신** | 테이블 변경 시 hand_no 재조회 | P1 |
| **캐싱** | 세션 내 max hand_no 캐싱 (불필요한 조회 방지) | P2 |

### 4.2 Backend (code.gs)

```javascript
// 새 함수 추가
function getNextHandNo(tableId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const handsSheet = ss.getSheetByName('HANDS');

  if (!handsSheet) return 1; // HANDS 시트 없으면 1부터 시작

  const data = handsSheet.getDataRange().getValues();
  const header = data[0];
  const handNoCol = header.indexOf('hand_no'); // D열 (index 3)

  if (handNoCol === -1) return 1;

  let maxHandNo = 0;
  for (let i = 1; i < data.length; i++) {
    const handNo = parseInt(data[i][handNoCol]);
    if (!isNaN(handNo) && handNo > maxHandNo) {
      maxHandNo = handNo;
    }
  }

  return maxHandNo + 1;
}
```

### 4.3 Frontend (index.html)

```javascript
// 상태 추가
S.nextHandNo = 1; // 다음 핸드 번호 캐싱

// 초기화 시 조회
function initNextHandNo() {
  if (!S.curTable) {
    S.nextHandNo = 1;
    return;
  }

  google.script.run
    .withSuccessHandler(num => {
      S.nextHandNo = num;
      renderHandNoDisplay();
    })
    .withFailureHandler(err => {
      console.error('getNextHandNo failed:', err);
      S.nextHandNo = 1; // fallback
      renderHandNoDisplay();
    })
    .getNextHandNo(S.curTable);
}

// UI 렌더링
function renderHandNoDisplay() {
  const display = document.getElementById('handNoDisplay');
  display.innerHTML = `
    <div style="font-size:0.8rem; color:#64748b;">
      다음 핸드:
      <input id="handNoInput" type="number" value="${S.nextHandNo}"
             style="width:60px; padding:2px 4px;"
             onchange="S.nextHandNo = parseInt(this.value) || 1" />
    </div>
  `;
}

// 커밋 시 자동 적용
function commitHand() {
  const handNo = S.nextHandNo; // 자동 사용
  // ... 기존 로직에 handNo 전달 ...
  S.nextHandNo++; // 다음 번호 증가
  renderHandNoDisplay();
}
```

### 4.4 UI 배치

**위치**: Record 탭 상단, 테이블 선택 아래
**디자인**:
```
┌─────────────────────────────┐
│ 테이블: T1 ▼               │
│ 다음 핸드: [42] (수정 가능) │
│ 버튼 위치: 3 ▼             │
└─────────────────────────────┘
```

---

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| **성능** | 시트 조회 시간 < 1초 |
| **신뢰성** | 조회 실패 시 fallback = 1 |
| **사용성** | 자동/수동 모드 전환 자연스럽게 |
| **호환성** | 기존 commitHand() 로직과 통합 |

---

## 6. 범위 외 (Out of Scope)

- ❌ 다른 사용자와의 실시간 동기화 (멀티 유저)
- ❌ hand_no 중복 검증 (시트 unique constraint 없음)
- ❌ 과거 핸드 번호 수정 기능

---

## 7. 기술 스택

- **Backend**: Google Apps Script (code.gs)
- **Frontend**: Vanilla JavaScript (index.html)
- **Storage**: Google Sheets HANDS 시트 D열

---

## 8. 성공 지표

| 지표 | 목표 |
|------|------|
| **수동 입력 제거율** | 95% (특수 상황 5% 수동) |
| **조회 성공률** | 99% |
| **사용자 만족도** | "번호 입력 안 해도 돼서 편함" |

---

## 9. 오픈 질문

### Q1: 테이블별로 hand_no를 분리할까요?
**결정**: a) **전역 hand_no** (모든 테이블 공유, 1, 2, 3, ...)
**이유**: 현재 HANDS 시트 구조가 전역 hand_no 기반

### Q2: 시트 조회를 언제 실행할까요?
**결정**: a) **앱 시작 시 1회** (빠른 UX 우선)
**이유**: 단일 사용자 환경, 불필요한 조회 최소화

### Q3: 수동 수정 UI는 어떤 형태?
**결정**: a) **항상 입력 필드** (자유도 높음)
**이유**: 특수 상황 대응 필요 (수동 번호 지정)

---

## 10. 구현 계획

### Phase 1: Backend 구현 (30분)
- [ ] `getNextHandNo(tableId)` 함수 작성
- [ ] HANDS 시트 D열 조회 로직
- [ ] Fallback 처리 (시트 없음, 데이터 없음)

### Phase 2: Frontend 통합 (30분)
- [ ] `S.nextHandNo` 상태 추가
- [ ] `initNextHandNo()` 초기화 함수
- [ ] `renderHandNoDisplay()` UI 렌더링
- [ ] `commitHand()` 수정 (자동 hand_no 사용)

### Phase 3: Auto-Refresh (20분)
- [ ] 테이블 변경 시 `initNextHandNo()` 호출
- [ ] 커밋 후 `S.nextHandNo++` 증가
- [ ] 에러 핸들링 개선

### Phase 4: 테스트 & 검증 (20분)
- [ ] 빈 HANDS 시트 테스트 (첫 핸드)
- [ ] 기존 데이터 있는 시트 테스트
- [ ] 수동 수정 후 커밋 테스트
- [ ] 테이블 전환 테스트

**총 소요 시간**: 약 2시간

---

## 변경 이력

| 버전 | 날짜 | 변경사항 |
|------|------|----------|
| 1.0.0 | 2025-01-15 | 초안 작성 |
