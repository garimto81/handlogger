# PRD - Unified Apps Script Project

## 📋 문서 정보
- **작성일**: 2025-10-06
- **버전**: v2.6.1
- **상태**: 작업 목록 (동적)

---

## Phase 1: 통합 MVP (v1.0~v2.6) ✅ 완료

### 1.1 빌드 시스템 구축 ✅ 완료
- **근거**: PLAN의 시나리오 1 (첫 통합 배포) 해결
- **성공**: PLAN의 "배포 소요 시간 30분 → 5분" 달성
- **완료일**: 2025-10-06
- **결과**: v2.6.0 배포

### 1.2 네임스페이스 충돌 방지 ✅ 완료
- **근거**: PLAN의 시나리오 2 (코드 수정 후 재배포) 해결
- **성공**: PLAN의 "함수명 충돌 0건" 달성
- **완료일**: 2025-10-06
- **결과**: tracker_*, soft_* prefix 자동 추가

### 1.3 CSS 스코핑 ✅ 완료
- **근거**: PLAN의 제약 사항 (CSS 충돌 방지)
- **성공**: Tracker/SoftSender 스타일 격리
- **완료일**: 2025-10-06
- **결과**: #panelTracker, #panelSoftsender

### 1.4 빌드 버그 수정 (v6-8) ✅ 완료
- **근거**: PLAN의 시나리오 2 (재배포 워크플로우)
- **성공**: 함수 호출 에러 0건, UI 레이아웃 정상
- **완료일**: 2025-10-06
- **결과**:
  - 함수명 정규식 수정 (`.getKeyPlayers(` → `\.getKeyPlayers(`)
  - CSS 충돌 해결 (#panelTracker 스코핑)

### 1.5 문서 정리 ✅ 완료
- **근거**: PLAN의 핵심 원칙 (단일 진실 공급원)
- **성공**: 중복 문서 0개, 구조 명확화
- **완료일**: 2025-10-06
- **결과**: 16개 임시 문서 삭제, docs/ 구조화

---

## Phase 2: 코드 모듈화 ✅ 완료 (v2.7.0)

### 2.1 공통 모듈 추출 ✅ 완료
- **근거**: PLAN의 "코드 재사용" 목표, LLD의 "모듈화 전략"
- **성공**: PLAN의 "코드 중복 67% 감소" 달성
- **의존성 해결 전략**: 빌드 타임 병합 방식
  - ✅ **개발 시**: src/ 파일들은 논리적 분리만 (가독성 향상)
  - ✅ **빌드 시**: build.js가 올바른 순서로 병합 (common → handlogger → tracker → soft)
  - ✅ **배포 시**: dist/code.gs는 단일 파일 (Apps Script 요구사항 충족)
  - ⚠️ **제약**: src/handlogger/code.gs 단독 실행 불가 (빌드 필수)
  - 📝 **이유**: Google Apps Script는 import/require 미지원
- **체크리스트**:
  - [x] **Step 1**: src/common/common.gs 생성 (빈 파일)
  - [x] **Step 2**: handlogger_sub/handlogger_code.gs → src/common/common.gs로 공통 함수 **12개** 복사
  - [x] **Step 3**: src/handlogger/code.gs **수정** (공통 함수 12개 제거)
  - [x] **Step 4**: src/tracker/tracker.gs **수정** (중복 함수 제거)
  - [x] **Step 5**: src/softsender/softsender_code.gs **검증** (공통 함수 미사용 확인)
- **완료일**: 2025-10-06
- **결과**: src/common/common.gs (118 lines, 12 functions)

### 2.2 빌드 스크립트 수정 ✅ 완료
- **근거**: LLD의 "빌드 시 처리 방식"
- **성공**: 공통 함수 1회만 존재, 빌드 크기 8% 감소
- **현재 build.js 문제**:
  - ❌ HandLogger가 공통 함수 제공자로 가정 (line 32-47)
  - ❌ Tracker가 "HandLogger에서 공유" 주석 (잘못된 의존성)
  - ✅ 수정 필요: src/common/을 공통 함수 제공자로 변경
- **의존성 보장**: 병합 순서 엄수
  ```javascript
  // 수정 전 (현재 - 잘못됨)
  const handloggerCode = ...  // 공통 함수 포함
  const trackerCleaned = trackerCode.replace(...)  // "HandLogger에서 공유"

  // 수정 후 (올바름)
  const commonCode = fs.readFileSync('src/common/common.gs', 'utf8');
  const handloggerCode = ...  // 공통 함수 제거됨
  const trackerCleaned = trackerCode.replace(...)  // "common에서 공유"

  const merged = [
    commonCode,        // 1️⃣ 공통 함수 정의
    handloggerCode,    // 2️⃣ HandLogger (호출만)
    prefixedTracker,   // 3️⃣ Tracker (호출만)
    prefixedSoft       // 4️⃣ SoftSender (호출만)
  ].join('\n\n');
  ```
- **체크리스트**:
  - [x] **Step 1**: build.js 상단에 `const versionCode`, `const commonCode` 추가
  - [x] **Step 2**: trackerCleaned 주석 수정 ("common에서 공유")
  - [x] **Step 3**: 병합 순서 수정 (version → common → handlogger → tracker → soft)
  - [x] **Step 4**: npm run build 테스트 성공
- **완료일**: 2025-10-06
- **결과**: build.js v2.7.0 (병합 순서 수정)

### 2.3 검증 및 배포 ✅ 완료
- **근거**: PLAN의 "배포 에러율 ≤ 1%"
- **성공**: 모든 탭 정상 동작, 함수 호출 에러 0건
- **자동 검증 스크립트 구현**: verify-build.js
  ```javascript
  // verify-build.js
  const fs = require('fs');
  const dist = fs.readFileSync('./dist/code.gs', 'utf8').split('\n');

  const commonFunctions = [
    'withScriptLock_', 'appSS_', 'getOrCreateSheet_',
    'setHeaderIfEmpty_', 'readAll_', 'findColIndex_',
    'toInt_', 'numComma_', 'nowKST_', 'todayStartKST_',
    'readRoster_', 'extractTimeHHMM_'  // ⭐ 12개로 수정
  ];

  // 1. 정의 위치 찾기
  const defLines = {};
  commonFunctions.forEach(fn => {
    const idx = dist.findIndex(l => l.match(new RegExp(`^function ${fn}\\(`)));
    if (idx === -1) {
      console.error(`❌ ${fn} 정의 없음!`);
      process.exit(1);
    }
    defLines[fn] = idx + 1;
  });

  // 2. 중복 확인
  commonFunctions.forEach(fn => {
    const count = dist.filter(l => l.match(new RegExp(`^function ${fn}\\(`))).length;
    if (count > 1) {
      console.error(`❌ ${fn} 중복 (${count}회)!`);
      process.exit(1);
    }
  });

  // 3. 정의 이전 호출 확인
  commonFunctions.forEach(fn => {
    for (let i = 0; i < defLines[fn] - 1; i++) {
      if (dist[i].match(new RegExp(`${fn}\\(`)) && !dist[i].match(/^function/)) {
        console.error(`❌ ${fn} 정의(${defLines[fn]}줄) 이전 호출(${i+1}줄)!`);
        process.exit(1);
      }
    }
  });

  console.log('✅ 모든 검증 통과!');
  ```
- **체크리스트**:
  - [x] **Step 1**: verify-build.js 생성
  - [x] **Step 2**: package.json 스크립트 추가
  - [x] **Step 3**: npm run verify 테스트 성공 (12개 함수 모두 통과)
  - [x] **Step 4**: npm run push → 자동 빌드 + 검증 + 배포 성공
  - [ ] **Step 5**: 웹앱 5개 탭 동작 테스트 (다음 단계)
- **완료일**: 2025-10-06
- **결과**: verify-build.js 생성, 자동 배포 파이프라인 구축

---

## Phase 3: 배포 검증 (현재 진행 중)

### 3.1 버전 8 웹앱 테스트 🟡 Medium
- **근거**: PLAN의 시나리오 1 (첫 통합 배포 검증)
- **성공**: 5개 탭 모두 정상 동작 확인
- **체크리스트**:
  - [ ] Record 탭: 핸드 입력 → HANDS 시트 저장 확인
  - [ ] Review 탭: 핸드 조회 → VIRTUAL 전송 확인
  - [ ] Tracker 탭: 키 플레이어 관리 → TYPE 시트 업데이트 확인
  - [ ] SoftSender 탭: VIRTUAL 컨텐츠 전송 확인
  - [ ] Settings 탭: Sheet ID 설정 → localStorage 저장 확인
- **예상**: 30분
- **의존성**: 버전 8 배포 완료

---

## Phase 4: 개선 작업 (v2.8~)

### 4.1 BB 입력 디바운싱 🟢 Low
- **근거**: STATUS의 "다음 우선순위 Phase 2.1"
- **성공**: BB 입력 시 500ms 지연 후 자동 계산
- **체크리스트**:
  - [ ] debounce() 함수 구현
  - [ ] BB 입력 필드에 적용
  - [ ] 테스트: 빠른 입력 시 1회만 계산 확인
- **예상**: 1시간
- **의존성**: 없음

### 4.2 Commit 버튼 중복 클릭 방지 🟢 Low
- **근거**: STATUS의 "다음 우선순위 Phase 2.2"
- **성공**: Commit 실행 중 버튼 비활성화
- **체크리스트**:
  - [ ] commitHand() 호출 시 버튼 disabled
  - [ ] 성공/실패 후 버튼 활성화
  - [ ] 테스트: 연속 클릭 시 1회만 저장 확인
- **예상**: 30분
- **의존성**: 없음

### 4.3 이벤트 리스너 메모리 누수 해결 🟢 Low
- **근거**: STATUS의 "다음 우선순위 Phase 2.3"
- **성공**: 모드 전환 시 이전 리스너 제거
- **체크리스트**:
  - [ ] removeEventListener() 호출 구조 설계
  - [ ] setMode() 함수 리팩토링
  - [ ] 테스트: 모드 100회 전환 후 메모리 확인
- **예상**: 2시간
- **의존성**: 없음

---

## Phase 5: 향후 비전 (v3.0~)

### 5.1 Hot Reload 🟡 Medium
- **근거**: PLAN의 "Phase 2 향후 비전"
- **성공**: src/ 파일 변경 시 자동 빌드 + 자동 배포
- **체크리스트**:
  - [ ] chokidar로 파일 감시
  - [ ] 변경 시 자동 build + push
  - [ ] 배포 완료 알림
- **예상**: 4시간
- **의존성**: 없음

### 5.2 TypeScript 전환 🟡 Medium
- **근거**: PLAN의 "Phase 2 향후 비전"
- **성공**: 타입 안정성 확보, IDE 자동완성
- **체크리스트**:
  - [ ] @types/google-apps-script 설치
  - [ ] code.gs → code.ts 변환
  - [ ] tsconfig.json 설정
  - [ ] 빌드 스크립트 TypeScript 지원
- **예상**: 8시간
- **의존성**: 없음

### 5.3 테스트 자동화 🟢 Low
- **근거**: PLAN의 "Phase 2 향후 비전"
- **성공**: 빌드 전 함수 호출 검증
- **체크리스트**:
  - [ ] Jest 설치
  - [ ] 핵심 함수 단위 테스트 작성
  - [ ] CI/CD 파이프라인 통합
- **예상**: 12시간
- **의존성**: 5.2 완료 권장

---

## 우선순위 요약

| Phase | 작업 | 우선순위 | 예상 시간 | 의존성 |
|-------|------|----------|-----------|--------|
| **2.1** | 공통 모듈 추출 | 🔴 High | 3h | 없음 |
| **2.2** | 빌드 스크립트 수정 | 🔴 High | 2h | 2.1 |
| **2.3** | 검증 및 배포 | 🔴 High | 2h | 2.2 |
| **3.1** | 버전 8 테스트 | 🟡 Medium | 30m | 배포 완료 |
| **4.1** | BB 디바운싱 | 🟢 Low | 1h | 없음 |
| **4.2** | Commit 중복 방지 | 🟢 Low | 30m | 없음 |
| **4.3** | 메모리 누수 해결 | 🟢 Low | 2h | 없음 |
| **5.1** | Hot Reload | 🟡 Medium | 4h | 없음 |
| **5.2** | TypeScript 전환 | 🟡 Medium | 8h | 없음 |
| **5.3** | 테스트 자동화 | 🟢 Low | 12h | 5.2 권장 |

---

## 🔗 관련 문서

- [PLAN.md](PLAN.md) - 프로젝트 비전
- [LLD.md](LLD.md) - 기술 설계
- [STATUS.md](STATUS.md) - 현재 상태
- [CHANGELOG.md](CHANGELOG.md) - 완료 이력
