# HandLogger 문서 구조

**프로젝트**: Poker Hand Logger - Virtual Table Data Manager
**버전**: v2.2.1
**최종 업데이트**: 2025-10-05

---

## 🚀 시작하기

### **설치 가이드** (v2.2.1)
**파일**: [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)
**목적**: 초기 설치 및 Script Properties 설정
**중요**: v2.1.0+부터 보안 강화를 위해 **Script Properties 설정이 필수**입니다.

**⚠️ 오류 해결**:
```
Error: ROSTER_SPREADSHEET_ID not configured in Script Properties
```
→ [설치 가이드](INSTALLATION_GUIDE.md#step-2-script-properties-설정-필수)를 참조하여 `setupScriptProperties()` 함수를 실행하세요.

---

## 📂 메인 문서 (5개)

### **1. PRD (Product Requirements Document)**
**파일**: [PRD_HandLogger.md](PRD_HandLogger.md)
**목적**: 제품 요구사항 정의
**내용**:
- 프로젝트 개요 및 핵심 목표
- 주요 기능 상세 명세 (Record/Review/외부 연동)
- 사용자 시나리오 및 제약사항
- 데이터 스키마 (HANDS/ACTIONS/CONFIG)
- **v2.2.1**: Review 모드 페이지네이션 UI 명세

**업데이트 주기**: 주요 기능 추가 시

---

### **2. LLD (Low-Level Design)**
**파일**: [LLD_HandLogger.md](LLD_HandLogger.md)
**목적**: 상세 기술 설계
**내용**:
- 시스템 아키텍처 다이어그램
- Code.gs 모듈별 상세 분석 (562줄)
- index.html 구조 및 로직 (656줄)
- 데이터 흐름 (Record/Review)
- 동시성 제어 (ScriptLock/멱등성)
- **v2.2.1**: Review 모드 페이지네이션 구현 설계 (+57 lines)

**업데이트 주기**: 기술 구현 변경 시

---

### **3. PLAN (Implementation Plan)**
**파일**: [PLAN_HandLogger.md](PLAN_HandLogger.md)
**목적**: 구현 계획 및 로드맵
**내용**:
- 프로젝트 진행 상황
- 다음 작업 체크리스트
- 향후 개선 계획
- **최신**: v2.2.1 Review 모드 개선 구현 대기 중

**업데이트 주기**: 새로운 Phase 시작 시

---

### **4. DB_DESIGN_HandSheet.md**
**파일**: [DB_DESIGN_HandSheet.md](DB_DESIGN_HandSheet.md)
**목적**: Database 스키마 정의
**내용**:
- Hand 시트 스키마 정의
- Old format vs New format 비교
- 마이그레이션 가이드
- **핵심**: seq=1 AND row_type=GAME = 핸드 시작 (빈 줄 아님!)

**업데이트 주기**: DB 스키마 변경 시

---

### **5. INSTALLATION_GUIDE.md**
**파일**: [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)
**목적**: 설치 및 배포 가이드
**내용**:
- 초기 설치 및 Script Properties 설정
- v2.0.x → v2.2.1 업그레이드 가이드
- 문제 해결 (Troubleshooting)

**업데이트 주기**: 설치 절차 변경 시

---

## 📦 Archive (보관)

| 파일 | 설명 | 날짜 |
|------|------|------|
| [HAND_SHEET_BUG_HISTORY.md](archive/HAND_SHEET_BUG_HISTORY.md) | Hand 시트 컬럼 순서 버그 히스토리 (v2.0.1~v2.0.3 통합) | 2025-10-05 |

---

## 📋 문서 관리 규칙

### **1. 메인 문서 (5개)**
- ✅ **유지**: PRD, LLD, PLAN, DB_DESIGN, INSTALLATION_GUIDE
- ✅ **목적**: 프로젝트 전체 이해를 위한 핵심 문서
- 📝 **업데이트**: 주요 변경 시에만 수정
- 🔒 **보호**: 삭제 금지, 이전 버전은 archive/로 백업

### **2. Archive 문서**
- 📦 **보관 위치**: docs/archive/
- 📝 **보관 원칙**: 중요한 버그 히스토리만 통합 보관
- 🗑️ **삭제 정책**: 중복/구버전 문서는 통합 후 삭제

### **3. 새 문서 생성 규칙**

| 문서 타입 | 저장 위치 | 예시 |
|----------|---------|------|
| 버그 수정 | archive/ | HAND_SHEET_BUG_HISTORY.md |
| 성능 보고서 | 메인 (LLD에 통합) | - |
| 릴리즈 노트 | 메인 (PLAN에 통합) | - |
| 설계 변경 | 메인 (LLD 업데이트) | - |

### **4. 문서 통합 규칙**

**중복 제거**:
- 같은 내용이 2개 이상 문서에 있으면 → 메인 문서에만 유지
- 예: PRD + LLD 중복 → PRD에만 유지, LLD는 기술 세부사항만

**방대한 문서**:
- 50페이지 이상 → 서브폴더로 분리
- 예: DB 설계가 너무 길면 → docs/database/로 이동

**버전 관리**:
- 메인 문서 수정 시 → 이전 버전을 archive/에 백업
- 파일명: `{문서명}_v{버전}.md` (예: PRD_HandLogger_v2.0.md)

---

## 📝 문서 작성 가이드

### **버그 수정 문서 템플릿**

```markdown
# 🐛 v{version} Bugfix - {제목}

**날짜**: yyyy-mm-dd
**심각도**: 🔴 CRITICAL / 🟡 MEDIUM / 🟢 LOW

## 문제
{문제 설명}

## 원인
{근본 원인}

## 수정 사항
{변경 내역}

## 테스트
{검증 결과}
```

### **보고서 템플릿**

```markdown
# {보고서 제목}

**날짜**: yyyy-mm-dd
**타입**: 성능 / 검증 / 변경

## 요약
{핵심 내용}

## 상세
{분석 내용}

## 결론
{결과 및 권장사항}
```

---

## 🎯 문서 관리 체크리스트

**새 문서 생성 시**:
- [ ] 메인 5개 문서 중 하나에 포함 가능한가?
  - PRD: 제품 요구사항
  - LLD: 기술 설계
  - PLAN: 구현 계획
  - DB_DESIGN: 데이터베이스 스키마
  - INSTALLATION_GUIDE: 설치/배포
- [ ] 불가능하면 → archive/ 적절한 서브폴더에 저장
- [ ] 파일명: 명확한 prefix (BUGFIX_, REPORT_, RELEASE_)
- [ ] 날짜 포함 (파일 내 메타데이터)

**문서 업데이트 시**:
- [ ] 메인 문서 변경 → 이전 버전 archive/로 백업
- [ ] 중복 내용 확인 → 메인 문서에 통합
- [ ] README.md 테이블 업데이트

**월간 정리**:
- [ ] archive/ 문서 검토
- [ ] 6개월 이상 된 임시 문서 삭제
- [ ] 중복 문서 병합
- [ ] README.md 갱신

---

## 🔗 빠른 링크

### 메인 문서
- [PRD (제품 요구사항)](PRD_HandLogger.md)
- [LLD (기술 설계)](LLD_HandLogger.md)
- [PLAN (구현 계획)](PLAN_HandLogger.md)
- [DB_DESIGN (데이터베이스)](DB_DESIGN_HandSheet.md)
- [INSTALLATION_GUIDE (설치 가이드)](INSTALLATION_GUIDE.md)

### Archive
- [Hand 시트 버그 히스토리](archive/HAND_SHEET_BUG_HISTORY.md)

---

**마지막 정리**: 2025-10-05
**다음 정리 예정**: 2025-11-05
