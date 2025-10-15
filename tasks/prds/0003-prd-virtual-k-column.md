# PRD-0003: VIRTUAL K열 테이블명 추가

**버전**: 1.0.0
**작성일**: 2025-01-15
**상태**: Approved

---

## 1. 개요

현재 VIRTUAL 시트 업데이트 시 E, F, G, H, J열만 작성하고 있으며, K열(테이블명)은 비어 있습니다. 모든 VIRTUAL 전송에 대해 K열에 "버추얼 테이블" 텍스트를 자동으로 입력하여 데이터 일관성을 확보합니다.

**목표**: VIRTUAL 시트 업데이트 시 K열에 "버추얼 테이블" 자동 입력

---

## 2. 목표

### 주요 목표
- [x] updateExternalVirtual_() 함수에 K열(col 11) 쓰기 추가
- [x] sendHandToVirtual() 함수에 K열(col 11) 쓰기 추가
- [x] 로그 메시지에 K열 입력 기록 추가

### 부가 목표
- [x] 기존 VIRTUAL 전송과 호환성 유지
- [x] 코드 가독성 유지 (주석 업데이트)

---

## 3. 사용자 스토리

**As a** 포커 핸드 분석자
**I want to** VIRTUAL 시트 K열에 테이블명이 자동 입력되기를
**So that** 모든 핸드가 "버추얼 테이블" 소속임을 명확히 알 수 있다

**수락 기준**:
- ✅ VIRTUAL 전송 시 K열에 "버추얼 테이블" 입력됨
- ✅ 기존 E, F, G, H, J열 입력은 정상 작동
- ✅ 로그에 K열 입력 성공 메시지 표시

---

## 4. 기능 요구사항

### 4.1 K열 입력

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| K열 자동 입력 | 모든 VIRTUAL 전송 시 K열에 "버추얼 테이블" 입력 | P0 |
| 로그 메시지 | K열 입력 성공 시 console.log 출력 | P1 |
| 주석 업데이트 | 비연속 컬럼 쓰기 주석에 K열 추가 | P1 |

### 4.2 구현 위치

**파일**: `code.gs`

**함수 1**: `updateExternalVirtual_()` (Line 597-601)
```javascript
// Before:
sh.getRange(pickRow, 5, 1, 1).setValue(E);
sh.getRange(pickRow, 6, 1, 1).setValue(F);
sh.getRange(pickRow, 7, 1, 1).setValue(G);
sh.getRange(pickRow, 8, 1, 1).setValue(H);
sh.getRange(pickRow,10, 1, 1).setValue(J);

// After:
sh.getRange(pickRow, 5, 1, 1).setValue(E);
sh.getRange(pickRow, 6, 1, 1).setValue(F);
sh.getRange(pickRow, 7, 1, 1).setValue(G);
sh.getRange(pickRow, 8, 1, 1).setValue(H);
sh.getRange(pickRow,10, 1, 1).setValue(J);
sh.getRange(pickRow,11, 1, 1).setValue('버추얼 테이블');
```

**함수 2**: `sendHandToVirtual()` (Line 742-751)
```javascript
// After J열 쓰기 (Line 750):
sh.getRange(pickRow,11, 1, 1).setValue('버추얼 테이블');
console.log('  ✓ K열 (col 11) 완료 - 입력값: 버추얼 테이블');
```

---

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 성능 | +1회 Range 쓰기 (무시 가능한 오버헤드) |
| 호환성 | 기존 VIRTUAL 시트 구조 변경 없음 |
| 로깅 | 모든 컬럼 쓰기 성공 시 로그 출력 |

---

## 6. 범위 제외

- K열 값 사용자 정의 (고정값 "버추얼 테이블"만 사용)
- 기존 VIRTUAL 데이터 역소급 업데이트
- K열 유효성 검증 (단순 문자열 입력)

---

## 7. 기술 스택

- **Backend**: Google Apps Script
- **API**: SpreadsheetApp.getRange()
- **Target**: VIRTUAL 시트 K열 (column 11)

---

## 8. 성공 지표

| 지표 | 목표 |
|------|------|
| K열 입력 성공률 | 100% |
| 로그 메시지 출력 | 100% |
| 기존 기능 호환성 | 100% (회귀 없음) |

---

## 9. 열린 질문

- ❌ 없음 (요구사항 명확)

---

## 10. 버전 히스토리

| 버전 | 날짜 | 변경사항 |
|------|------|----------|
| 1.0.0 | 2025-01-15 | 초안 작성 및 승인 |
