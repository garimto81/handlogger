# 구현 가이드 - v2.0.1 (최종)

## 📌 구현 개요
**버전**: v2.0.1 (2025-10-06)
**목표**: Hand 시트 **행 타입별 저장** (CSV 형식 호환)
**완료일**: 2025-10-06 (검증 대기 중)

---

## 🔄 중요 변경사항 (2025-10-06 최종)

### ⚠️ 스키마 변경: Option C → Option A

**기존 계획 (폐기)**:
- Option C: 핸드별 1행 저장 + JSON 통합 (19-column)

**최종 구현 (채택)**:
- **Option A: 행 타입별 저장** (CSV 원본 구조 유지)
- **이유**: CSV 파싱 앱과 동일한 형식으로 Hand 시트에 저장
- **형식**: GAME/PAYOUTS/HAND/PLAYER/EVENT 각각 별도 행

---

## ✅ 구현 완료 항목

### 1. Hand 시트 생성 (헤더 없음)
**파일**: [code.gs:73-76](../code.gs#L73-L76)

```javascript
ensureSheets_() {
  // v2.0.1: ROSTER_SPREADSHEET에 Hand 시트 생성 (헤더 없음, CSV 행 타입별 저장)
  const rosterSS = rosterSS_();
  getOrCreateSheet_(rosterSS, 'Hand'); // 헤더 없음
}
```

**결과**: ROSTER_SPREADSHEET에 Hand 시트 자동 생성 (빈 시트)

---

### 2. Record 모드 저장 로직 (행 타입별)
**파일**: [code.gs:781-907](../code.gs#L781-L907)

#### `_saveHandToHandSheet_(payload)`
Record 모드 payload → Hand 시트 **행 타입별 저장**

**저장 형식** (CSV와 동일):
```
행번호  row_type   col_3           col_4       col_5       ...
─────────────────────────────────────────────────────────────
1       GAME       GGProd...       Virtual...  2025-10-06  ...
2       PAYOUTS    (공란)
3       HAND       196             1759696805  HOLDEM      NO_ANTE  0  0  0  0  0  4  0  0  0  0  1  3
4       PLAYER     Freddie O'Hara  2           0           55000    55000  7s 7h
5       PLAYER     SOHEE           6           0           66000    66000  7d 7c
6       EVENT      POT CORRECTION  (공란)      4000        0
7       EVENT      BOARD           1           6s          0
8       EVENT      BOARD           1           6h          0
9       EVENT      BET             6           6000        0
10      EVENT      CALL            2           6000        0
11      (빈 행 - 핸드 구분자)
```

**멱등성**: HAND 행 timestamp 기반 (1초 오차 허용)
```javascript
// HAND 행 찾기
if (row[1] === 'HAND') {
  const rowTime = row[3]; // timestamp (col D)
  if (Math.abs(rowTime - payloadTime) < 1000) {
    return {ok: true, hand_no: row[2], idempotent: true};
  }
}
```

**각 행 타입별 생성**:
1. **GAME 행**: `[rowNum, 'GAME', 'GGProd Hand Logger', 'Virtual Table', date, ...]`
2. **PAYOUTS 행**: `[rowNum, 'PAYOUTS', '', ...]`
3. **HAND 행**: `[rowNum, 'HAND', hand_no, timestamp, 'HOLDEM', 'NO_ANTE', 0, 0, 0, 0, 0, btn_seat, 0, 0, 0, 0, 1, table_id]`
4. **PLAYER 행들**: `[rowNum, 'PLAYER', name, seat, 0, start_stack, end_stack, hole_cards, ...]`
5. **EVENT 행들**:
   - POT_CORRECTION: `[rowNum, 'EVENT', 'POT CORRECTION', '', amount, 0, ...]`
   - BOARD: `[rowNum, 'EVENT', 'BOARD', 1, card, 0, ...]`
   - 액션: `[rowNum, 'EVENT', action, seat, amount, 0, ...]`
6. **빈 행**: 핸드 블록 구분자

---

### 3. Hand 시트 조회 로직 (행 타입별 파싱)
**파일**: [code.gs:914-1013](../code.gs#L914-L1013)

#### `getHandDetailFromHandSheet_(handNo)`
Hand 시트 → v1.x 호환 형식 변환

**파싱 프로세스**:
1. **HAND 행 찾기**: `row[1] === 'HAND' && row[2] === handNo`
2. **블록 수집**: 다음 GAME 또는 빈 행까지 PLAYER/EVENT 수집
3. **v1.x 변환**:
   - PLAYER 행들 → stacks_json + holes_json
   - EVENT/BOARD 행들 → board 배열
   - EVENT/액션 행들 → acts 배열

**역변환 예시**:
```javascript
// PLAYER 행: "Freddie O'Hara", 2, 0, 55000, 55000, "7s 7h"
→ stacks_json: {"2": 55000}
→ holes_json: {"2": ["7s", "7h"]}

// EVENT 행: "BOARD", 1, "6s", 0
→ board.f1 = "6s"

// EVENT 행: "BET", 6, 6000, 0
→ acts: [{seq:1, street:'PREFLOP', seat:'6', action:'BET', amount_input:6000}]
```

---

## 🔧 통합 테스트 가이드 (다음 세션 실행)

### 준비 단계
```
1. ROSTER_SPREADSHEET 열기
2. Hand 시트 확인:
   - 헤더 없음 (빈 시트 또는 기존 CSV 데이터)
   - 기존 잘못된 데이터(19-column 형식) 있으면 전체 삭제

3. Apps Script 재배포:
   - 배포 → 새 배포 생성
   - 배포 URL 복사
```

### 테스트 1: Record 모드 기본 저장
```
1. Web App 접속
2. 테이블 선택 (예: Table 3)
3. 샘플 핸드 기록:
   ✓ 참여자 2명 선택 (Seat 2, 6)
   ✓ BTN: Seat 4
   ✓ Stack: 각 55000, 66000
   ✓ 홀카드: 7s 7h / 7d 7c
   ✓ pre_pot: 4000 입력
   ✓ 보드: 6s 6h 6d 6c 5s
   ✓ 액션:
     - Seat 6: BET 6000
     - Seat 2: CALL 6000
   ✓ "데이터 전송" 클릭

4. Hand 시트 확인:
   ✓ 11개 행 추가됨 (GAME/PAYOUTS/HAND/PLAYER×2/EVENT×6/빈행)
   ✓ A열: 행 번호 (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
   ✓ B열: row_type (GAME, PAYOUTS, HAND, PLAYER, PLAYER, EVENT, EVENT, ...)
   ✓ HAND 행(3번째 행):
     - C열: hand_no (196 또는 AUTO)
     - D열: timestamp (1759... 형식 숫자)
     - E열: HOLDEM
     - F열: NO_ANTE
     - L열: btn_seat (4)
     - R열: table_id (3)
   ✓ PLAYER 행들(4-5번째 행):
     - C열: 이름 (Freddie O'Hara, SOHEE)
     - D열: seat (2, 6)
     - F열: start_stack (55000, 66000)
     - H열: hole_cards (7s 7h, 7d 7c)
   ✓ EVENT 행들(6-10번째 행):
     - POT CORRECTION: C열=POT CORRECTION, E열=4000
     - BOARD×5: C열=BOARD, D열=1, E열=카드
     - BET: C열=BET, D열=6, E열=6000
     - CALL: C열=CALL, D열=2, E열=6000
   ✓ 11번째 행: 빈 행 (모든 셀 공란)
```

### 테스트 2: 멱등성 확인
```
1. 같은 핸드 다시 "데이터 전송" 클릭
2. 결과 메시지 확인:
   ✓ "완료: #196 (idempotent)" 또는 유사 메시지
   ✓ Hand 시트에 중복 행 없음 (11개 행 유지)
   ✓ 콘솔 오류 없음
```

### 테스트 3: VIRTUAL 시트 연동
```
1. External Sheet ID 입력 (VIRTUAL 시트 소속)
2. BB 값 입력 (예: 1000)
3. "설정 저장" 클릭
4. 새 핸드 기록 후 "데이터 전송"
5. VIRTUAL 시트 확인:
   ✓ E열: "미완료"
   ✓ F열: 파일명 (예: VT197_P1_vs_P2)
   ✓ G열: "A"
   ✓ H열: 3줄 요약 (플레이어 vs, 보드, 팟)
   ✓ J열: 공란 (승자 정보 없음)
```

### 테스트 4: Review 모드 조회 (제한적)
```
⚠️ 주의: 현재 Review 모드는 APP_SPREADSHEET/HANDS만 조회
Hand 시트 조회는 Phase 4에서 구현 예정

1. Review 모드 전환
2. "새로고침" 클릭
3. 예상 결과:
   - Hand 시트 핸드는 목록에 표시 안 됨
   - APP_SPREADSHEET 핸드만 표시됨
```

---

## ⚠️ 알려진 제약사항

### 1. BB/SB 값 미저장 (Record 모드)
**현상**:
- HAND 행 col G/H/I (bb/sb/bb_ante): 모두 0
- **이유**: Record 모드 UI에 블라인드 입력 필드 없음
- **영향**: Hand 시트에서 블라인드 정보 확인 불가
- **대안**: CSV Import 시에만 정확한 블라인드 저장 가능

### 2. Review 모드 미지원 (현재)
**현상**:
- Review 모드는 APP_SPREADSHEET/HANDS만 조회
- Hand 시트 핸드는 목록에 표시 안 됨
- **해결 예정**: Phase 4에서 queryHands() 수정

### 3. VIRTUAL 시트 hand_no 기반 조회
**현상**:
- `getHandDetailFromHandSheet_(handNo)` 사용
- hand_id 대신 hand_no로 조회
- **영향**: hand_no 중복 시 첫 번째 매칭 행만 반환
- **권장**: hand_no 자동 증가 사용 (CONFIG 시트 연동)

### 4. 스트릿 정보 손실
**현상**:
- EVENT 행에 street 정보 없음
- acts 변환 시 모두 'PREFLOP'으로 표시
- **영향**: Review 모드 스트릿별 블록 표시 불가
- **개선**: CSV Import는 스트릿 추론 가능 (BOARD 위치 기반)

---

## 📝 다음 단계

### Phase 4: Review 모드 Hand 시트 조회 지원
**목표**: queryHands()와 getHandDetail()을 Hand 시트 우선 조회로 변경

**작업**:
1. `queryHands()` 수정:
   - Hand 시트에서 HAND 행 수집
   - APP_SPREADSHEET/HANDS와 병합
   - 최신순 정렬 (timestamp 기준)

2. `getHandDetail()` 수정:
   - hand_id 또는 hand_no 기준 자동 판별
   - Hand 시트 우선 조회 → 없으면 APP_SPREADSHEET 조회

3. Review 모드 UI 업데이트:
   - 데이터 소스 표시 (Hand 시트 vs APP_SPREADSHEET)

### Phase 5: CSV Import 기능 (선택)
**목표**: `csv/Virtual_Table_Data - Hand.csv` → Hand 시트 일괄 저장

**작업**:
1. `importCsvToHandSheet()` 함수 추가
2. CSV 파싱 → 행 타입별 직접 저장 (변환 없이)
3. Apps Script UI 또는 Trigger 연동

---

## 🔗 참고 문서

- [PRD_HandLogger.md](PRD_HandLogger.md) - 제품 요구사항
- [CSV 분석 (아카이브)](archive/CSV_ANALYSIS_Hand.md) - CSV 구조 분석
- [PLAN_HandLogger.md](PLAN_HandLogger.md) - 전체 구현 계획
- [README.md](../README.md) - 빠른 시작 가이드

---

## 📋 변경 이력

### v2.0.1 (2025-10-06)
- **Option C → Option A 변경**: 행 타입별 저장 방식 채택
- **_saveHandToHandSheet_() 재작성**: GAME/PAYOUTS/HAND/PLAYER/EVENT 행 생성
- **getHandDetailFromHandSheet_() 재작성**: 행 타입별 파싱 → v1.x 변환
- **ensureSheets_() 수정**: Hand 시트 헤더 제거
- **테스트 가이드 작성**: 다음 세션 검증용 상세 가이드

---

**작성일**: 2025-10-06 (최종 업데이트)
**작성자**: Claude Code
**버전**: v2.0.1 (검증 대기)
**검증 예정일**: 다음 세션
