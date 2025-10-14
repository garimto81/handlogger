# Task List: Document Synchronization v2.0.0
**PRD**: [0001-prd-document-sync.md](prds/0001-prd-document-sync.md)
**생성일**: 2025-10-14
**상태**: In Progress

---

## Parent Tasks

### T1: PRD.md 헤더 업데이트 ⏳
**담당**: AI Agent
**예상 시간**: 10분
**우선순위**: P0 (최우선)

**Sub-tasks**:
- [ ] T1.1: 버전 1.0.0 → 2.0.0 변경
- [ ] T1.2: 날짜 2025-10-12 → 2025-10-14 변경
- [ ] T1.3: 제목 v2.7.x → v2.9.0 변경
- [ ] T1.4: 주요 변경사항 4개 항목 추가

**파일**: `docs/PRD.md` (line 1-10)

---

### T2: 시스템 구성도 수정 ⏳
**담당**: AI Agent
**예상 시간**: 20분
**우선순위**: P0 (최우선)

**Sub-tasks**:
- [ ] T2.1: ROSTER_SPREADSHEET_ID 다이어그램 삭제
- [ ] T2.2: Type 시트 APP_SPREADSHEET 내부로 이동
- [ ] T2.3: v2.8.0 변경 라벨 추가
- [ ] T2.4: ASCII 다이어그램 정렬 확인

**파일**: `docs/PRD.md` (line 599-648)

---

### T3: Type 시트 스키마 확장 ⏳
**담당**: AI Agent
**예상 시간**: 20분
**우선순위**: P0 (최우선)

**Sub-tasks**:
- [ ] T3.1: 11컬럼 전체 테이블 작성 (필수 6 + 선택 5)
- [ ] T3.2: PlayerId, TableId, SeatId, PokerRoom, TableName 추가
- [ ] T3.3: 하위 호환성 설명 추가
- [ ] T3.4: 샘플 데이터 11컬럼 버전으로 업데이트

**파일**: `docs/PRD.md` (line 838-854)

---

### T4: readRoster_() 비즈니스 로직 업데이트 ⏳
**담당**: AI Agent
**예상 시간**: 15분
**우선순위**: P1 (높음)

**Sub-tasks**:
- [ ] T4.1: rosterSS_() → appSS_() 통합 설명
- [ ] T4.2: optIdx 선택적 컬럼 파싱 코드 블록 추가
- [ ] T4.3: 하위 호환 동작 설명 추가

**파일**: `docs/PRD.md` (line 154-160)

---

### T5: 로드맵 v2.8.0/v2.9.0 완료 표시 ⏳
**담당**: AI Agent
**예상 시간**: 10분
**우선순위**: P1 (높음)

**Sub-tasks**:
- [ ] T5.1: v2.8.0 섹션에 ✅ 체크 추가
- [ ] T5.2: v2.9.0 섹션 추가 + 완료 표시
- [ ] T5.3: v2.10.0 → v3.0.0 번호 변경 (기존 계획 유지)

**파일**: `docs/PRD.md` (line 1057-1101)

---

### T6: README.md 버전 동기화 ⏳
**담당**: AI Agent
**예상 시간**: 10분
**우선순위**: P2 (중간)

**Sub-tasks**:
- [ ] T6.1: 버전 v2.7.2 → v2.9.0 변경
- [ ] T6.2: v2.8.0 주요 변경사항 추가
- [ ] T6.3: v2.9.0 주요 변경사항 추가

**파일**: `README.md`

---

### T7: 검증 (DB_MIGRATION.md 교차 확인) ⏳
**담당**: AI Agent
**예상 시간**: 15분
**우선순위**: P1 (높음)

**Sub-tasks**:
- [ ] T7.1: Type 시트 컬럼 비교 (PRD vs DB_MIGRATION)
- [ ] T7.2: 스프레드시트 구조 비교
- [ ] T7.3: 함수명 변경 확인 (rosterSS_ 삭제)
- [ ] T7.4: 마크다운 lint 실행

**파일**: `docs/PRD.md`, `docs/DB_MIGRATION.md`

---

### T8: 버전 라벨 최종 확인 ⏳
**담당**: AI Agent
**예상 시간**: 5분
**우선순위**: P2 (중간)

**Sub-tasks**:
- [ ] T8.1: PRD.md 헤더 버전 2.0.0 확인
- [ ] T8.2: README.md 버전 v2.9.0 확인
- [ ] T8.3: 변경 이력 섹션 업데이트

**파일**: `docs/PRD.md`, `README.md`

---

### T9: Git 커밋 + 푸시 ⏳
**담당**: AI Agent
**예상 시간**: 10분
**우선순위**: P0 (최우선)

**Sub-tasks**:
- [ ] T9.1: git add docs/PRD.md README.md tasks/*
- [ ] T9.2: git commit -m "docs: Update PRD to v2.0.0 [PRD-0001]"
- [ ] T9.3: git push origin master
- [ ] T9.4: 커밋 해시 확인

**명령어**: `git add -A && git commit && git push`

---

### T10: GitHub 검증 ⏳
**담당**: AI Agent
**예상 시간**: 5분
**우선순위**: P2 (중간)

**Sub-tasks**:
- [ ] T10.1: WebFetch로 PRD.md 원격 확인
- [ ] T10.2: WebFetch로 README.md 원격 확인
- [ ] T10.3: 버전 번호 일치 확인

**도구**: WebFetch API

---

### T11: 최종 문서 재확인 ⏳
**담당**: AI Agent
**예상 시간**: 5분
**우선순위**: P2 (중간)

**Sub-tasks**:
- [ ] T11.1: PRD_SUMMARY.md와 비교
- [ ] T11.2: 5개 섹션 육안 확인
- [ ] T11.3: 완료 보고서 작성

**결과물**: 완료 리포트

---

## 진행 상황

| Task | 상태 | 진행률 | 비고 |
|------|------|--------|------|
| T1: 헤더 업데이트 | ⏳ 대기 | 0% | - |
| T2: 시스템 구성도 | ⏳ 대기 | 0% | - |
| T3: Type 시트 스키마 | ⏳ 대기 | 0% | - |
| T4: readRoster_() 로직 | ⏳ 대기 | 0% | - |
| T5: 로드맵 | ⏳ 대기 | 0% | - |
| T6: README.md | ⏳ 대기 | 0% | - |
| T7: 검증 | ⏳ 대기 | 0% | - |
| T8: 버전 확인 | ⏳ 대기 | 0% | - |
| T9: Git 커밋 | ⏳ 대기 | 0% | - |
| T10: GitHub 검증 | ⏳ 대기 | 0% | - |
| T11: 최종 확인 | ⏳ 대기 | 0% | - |

**전체 진행률**: 0/11 (0%)

---

## 타임라인

```
2025-10-14 09:00 - Phase 0: PRD 작성 완료 ✅
2025-10-14 09:05 - Phase 0.5: Task List 생성 완료 ✅
2025-10-14 09:10 - Phase 1 시작: T1-T6 작업
2025-10-14 10:15 - Phase 2: T7 검증
2025-10-14 10:30 - Phase 3: T8 버전 확인
2025-10-14 10:35 - Phase 4: T9 Git 커밋
2025-10-14 10:45 - Phase 5: T10 GitHub 검증
2025-10-14 10:50 - Phase 6: T11 최종 확인
2025-10-14 10:55 - 완료 🎉
```

---

## 의존성 그래프

```
T1, T2, T3, T4, T5, T6 (병렬 가능)
  ↓
T7 (검증, T1-T6 완료 후)
  ↓
T8 (버전 확인, T7 완료 후)
  ↓
T9 (Git 커밋, T8 완료 후)
  ↓
T10 (GitHub 검증, T9 완료 후)
  ↓
T11 (최종 확인, T10 완료 후)
```

---

## 블로커 & 리스크

### 현재 블로커: 없음 ✅

### 잠재 리스크:
1. **T2 시스템 구성도**: ASCII 다이어그램 정렬 깨질 수 있음
   - **완화**: 고정폭 폰트 사용, 미리보기 확인
2. **T7 검증**: DB_MIGRATION.md와 불일치 발견 가능
   - **완화**: 수동 재확인, PRD 우선순위
3. **T9 Git**: merge conflict 가능성
   - **완화**: pull 먼저 실행

---

## 체크리스트 (완료 조건)

### Phase 1 완료 조건:
- [ ] T1-T6 모든 Sub-task 체크
- [ ] PRD.md 5개 섹션 수정 완료
- [ ] README.md 버전 동기화 완료

### Phase 2 완료 조건:
- [ ] T7 모든 Sub-task 체크
- [ ] DB_MIGRATION.md 교차 확인 PASS
- [ ] 마크다운 lint 오류 0건

### Phase 3 완료 조건:
- [ ] T8 모든 Sub-task 체크
- [ ] 버전 라벨 2.0.0 확인

### Phase 4 완료 조건:
- [ ] T9 모든 Sub-task 체크
- [ ] Git push 성공
- [ ] 커밋 해시 확보

### Phase 5 완료 조건:
- [ ] T10 모든 Sub-task 체크
- [ ] 원격 파일 버전 2.0.0 확인

### Phase 6 완료 조건:
- [ ] T11 모든 Sub-task 체크
- [ ] 완료 리포트 작성

---

**Task List 생성 완료 → Phase 1 시작**

*상태 마커: [ ] 미시작, [x] 완료, [!] 실패, [⏸] 블락*