# Hand 시트 컬럼 순서 버그 히스토리

**기간**: 2025-10-05
**심각도**: 🔴 CRITICAL
**상태**: ✅ v2.0.3에서 해결됨

---

## 📋 요약

Hand 시트 CSV 구조를 오해하여 불필요한 hand_id 컬럼을 추가했다가 제거한 버그.

**올바른 구조**: `[seq, row_type, ...]` (hand_id 컬럼 없음)

---

## 🔍 타임라인

### 1. BUG_ANALYSIS - 초기 분석 (잘못된 가정)

**발견**: DB_DESIGN 문서가 실제 CSV 구조와 다름

**착각한 구조**:
```
A      B        C         D~
手id   seq      row_type  [데이터...]
```

**실제 CSV 구조**:
```
A    B         C~
seq  row_type  [데이터...]
```

**핵심 오류**: hand_id 컬럼이 CSV에 없는데 있다고 착각함

---

### 2. v2.0.2 - 잘못된 수정 시도

**시도한 수정**:
```javascript
// buildHandSheetRow_() 함수
return [handId, seq, rowType, ...]; // ❌ WRONG
```

**결과**:
- A열: hand_id (20251005_135855169)
- B열: seq (1, 2, 3...)
- C열: row_type (GAME, PAYOUTS, HAND...)

**문제점**: CSV에 없는 컬럼을 추가함으로써 CSV import/export 호환성 깨짐

---

### 3. v2.0.3 - 올바른 수정 (최종)

**사용자 피드백**: "1	GAME	GGProd Hand Logger	... 이게 올바른 구조야"

**최종 수정**:
```javascript
// buildHandSheetRow_() 함수
function buildHandSheetRow_(rowType, seq, data) {
  const row = [seq, rowType]; // A, B열 - hand_id 제거!

  if (rowType === 'GAME') {
    row.push(data.game_name, data.table_name, data.game_date);
  }
  // ... 이하 row_type별 가변 컬럼 처리
  return row;
}
```

**복원된 구조**:
- A열: seq (1, 2, 3...)
- B열: row_type (GAME, PAYOUTS, HAND...)
- C열~: row_type에 따른 가변 데이터

---

## 💡 핵심 교훈

### 1. 핸드 구분 로직

**잘못된 이해**: "hand_id 컬럼으로 핸드를 그룹핑한다"

**올바른 이해**:
```
seq=1 AND row_type=GAME → 새로운 핸드 시작!
```

**CSV 구조**:
```csv
1,GAME,GGProd Hand Logger,Virtual Table,2025-10-05
2,PAYOUTS,,VT1_SOHEE_QsQh
3,HAND,1,190,1759640330,HOLDEM,BB_ANTE,10000,0,20000...
[빈 줄] ← 핸드 종료 (시각적 구분만, 실제 구분은 아님)

1,GAME,GGProd Hand Logger,Virtual Table,2025-10-05  ← seq=1 AND row_type=GAME이 진짜 핸드 구분!
2,PAYOUTS,,VT2_JANE_AhKs
...
```

**v2.2.1 수정**: `splitHandBlocks_()` 함수가 빈 줄 대신 `seq=1 AND row_type=GAME`으로 핸드를 구분하도록 변경

### 2. CSV 호환성 유지

**원칙**: CSV는 외부 툴(Excel, Python pandas 등)과 호환되어야 함

**hand_id 컬럼 불필요한 이유**:
- seq=1 + row_type=GAME으로 충분히 핸드 구분 가능
- 불필요한 컬럼 추가는 CSV 파일 크기 증가 + 복잡도 증가
- 빈 줄로 시각적 구분이 이미 되어 있음

### 3. 문서와 실제 코드 불일치 주의

**v2.0.2 버그의 근본 원인**: DB 설계 문서가 실제 CSV 구조를 잘못 기술함

**해결책**:
- 실제 CSV 파일 직접 확인
- 사용자 피드백 적극 반영
- 문서보다 코드/데이터가 진실

---

## 📊 영향 범위

### 기술적 영향

| 버전 | Hand 시트 구조 | CSV 호환성 | 상태 |
|------|---------------|-----------|------|
| v2.0.1 | [seq, row_type, ...] | ✅ 호환 | 정상 |
| v2.0.2 | [hand_id, seq, row_type, ...] | ❌ 비호환 | 버그 |
| v2.0.3+ | [seq, row_type, ...] | ✅ 호환 | 수정 완료 |

### 사용자 영향

- **Data Manager**: 영향 없음 (UI 변경 없음)
- **Post-Production Team**: 영향 없음 (아직 Hand 시트 미사용)
- **데이터 마이그레이션**: 불필요 (v2.0.2 데이터 폐기 가능)

---

## 🔗 관련 문서

- **DB_DESIGN_HandSheet.md**: 올바른 CSV 구조 문서화 (v2.0.3+ 반영)
- **LLD_HandLogger.md**: buildHandSheetRow_() 함수 사양

---

## 📝 통합 출처

이 문서는 다음 3개 문서를 통합함:
1. BUG_ANALYSIS_HandSheet.md - 초기 버그 분석
2. BUGFIX_v2.0.2.md - 잘못된 수정 시도
3. BUGFIX_v2.0.3_FINAL.md - 최종 올바른 수정
