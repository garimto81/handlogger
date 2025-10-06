# CHANGELOG - HandLogger

## [v2.7.0] - 2025-10-06

### 🔨 코드 모듈화 (Common Module Extraction)

#### 공통 모듈 분리
- **src/common/common.gs 생성**: 12개 공통 함수 분리 (118 lines)
  - 동시성 제어: `withScriptLock_()`
  - 스프레드시트 접근: `appSS_()`, `getOrCreateSheet_()`, `setHeaderIfEmpty_()`, `readAll_()`
  - 데이터 파싱: `findColIndex_()`, `toInt_()`, `numComma_()`
  - 날짜/시간 처리: `nowKST_()`, `todayStartKST_()`, `extractTimeHHMM_()`
  - Roster 읽기: `readRoster_()`
- **src/handlogger/code.gs**: 12개 공통 함수 제거, 호출 코드 유지
- **src/tracker/tracker.gs**: 5개 공통 함수 제거 (withScriptLock_, appSS_, readAll_, findColIndex_, toInt_)
- **src/softsender/softsender_code.gs**: 공통 함수 미사용 검증 완료

#### 빌드 시스템 개선
- **build.js v2.7.0**: 병합 순서 수정 (version → common → handlogger → tracker → soft)
- **version.js 통합**: dist/code.gs 최상단에 VERSION 객체 배치
- **VERSION 중복 제거**: src/handlogger/code.gs의 `const VERSION` 제거 → `VERSION.current` 사용

#### 검증 자동화
- **verify-build.js 생성**: 12개 공통 함수 정의 위치 검증
  - 정의가 호출보다 먼저 오는지 확인
  - 함수 중복 여부 검증
- **package.json 스크립트 추가**:
  - `npm run verify`: 빌드 검증
  - `npm run push`: build → verify → deploy 순차 실행 (자동 검증 통합)

#### 배포 파이프라인
- **자동 검증 통합**: `npm run push`로 빌드 → 검증 → 배포 자동화
- **검증 결과**: 12개 공통 함수 모두 정의 순서 보장 확인

---

## [v2.6.1] - 2025-10-06

### 🔧 3개 프로젝트 통합 (HandLogger + Tracker + SoftSender)

#### 빌드 시스템 구축
- **Node.js 기반 빌드 스크립트**: `build.js` 생성 (src/ → dist/ 자동 병합)
- **네임스페이스 충돌 방지**: Tracker 함수는 `tracker_*`, SoftSender 함수는 `soft_*` prefix 자동 추가
- **clasp 배포 자동화**: `npm run build`, `npm run push`, `npm run deploy`
- **CSS 스코핑**: `#panelTracker`, `#panelSoftsender` 네임스페이스로 CSS 충돌 방지

#### 빌드 시스템 버그 수정 (버전 6-8)

**문제 1: 함수명 변경 누락**
- **증상**: `google.script.run...getKeyPlayers is not a function` 에러
- **원인**: `.getKeyPlayers(` 정규식이 `.withFailureHandler()​.getKeyPlayers()` 메서드 체이닝 미처리
- **해결**: `.getKeyPlayers(` → `\.getKeyPlayers(` 단어 경계 패턴 사용

**문제 2: CSS 충돌**
- **증상**: 상단 버튼이 세로로 배치됨
- **원인**: Tracker CSS `.row { display: grid }`가 HandLogger `.row { display: flex }` 덮어씀
- **해결**: Tracker/SoftSender CSS를 `#panelTracker { ... }`, `#panelSoftsender { ... }` 안에 스코핑

**문제 3: window.onload 충돌**
- **증상**: Tracker `window.onload`와 SoftSender `window.addEventListener('load')` 충돌
- **원인**: 통합 후 탭이 hidden 상태인데 페이지 로드 시 즉시 초기화 시도
- **해결**: window.onload 제거 + setMode() 함수에서 탭 진입 시 초기화

#### 배포 이력
- **버전 6**: 초기 통합 배포 (함수명 변경 버그)
- **버전 7**: 함수 호출 수정 시도 (여전히 에러)
- **버전 8**: CSS 스코핑 + 함수명 정규식 수정 완료

#### 문서 정리
- **docs/softsender/**: BUILD.md, CODE_REVIEW_v10.1.md, FEATURE_ENHANCEMENT_PLAN.md 삭제 (통합 후 불필요)
- **docs/tracker/**: 중복 문서 10개 삭제 (HandLogger 문서 잘못된 위치, 구버전 CHANGELOG/STATUS 등)
- **docs/ 루트**: 중복 CHANGELOG.md, STATUS.md 삭제
- **최종 구조**: 각 프로젝트별 PLAN/PRD/LLD만 유지

---

## [v2.4.0] - 2025-10-06

### 🔒 보안 패치 (Security Patch)

#### XSS 취약점 수정
- **수정**: `innerHTML` → `textContent` 전환으로 XSS 공격 차단
- **영향 범위**:
  - `renderStackGrid()`: 플레이어명 렌더링 (Line 365-413)
  - `renderPlayerRows()`: Review 모드 플레이어 목록 (Line 810-867)
  - `formatStreetSection()`: 액션 배지 플레이어명 (Line 759-788)
  - `renderDetailContent()`: Table ID 렌더링 (Line 849-914)
- **효과**: 악의적 HTML/스크립트 입력 시 문자열로 안전하게 표시

#### localStorage 키 불일치 수정
- **수정**: `phl_ext_sheetId` → `phl_extSheetId` 통일
- **위치**: `pushToVirtualSheet()` 함수 (Line 688)
- **효과**: 페이지 새로고침 후에도 External Sheet ID 정상 읽기

---

## [v2.3.0] - 2025-10-06

### ✨ 기능 추가 (Features)

#### VIRTUAL 시트 선별 전송 (Phase 1.3 완료)
- Review 모드에서 핸드 선별 후 VIRTUAL 시트 전송 기능
- `pushToVirtual(hand_id, sheetId, bb)` 서버 함수 구현
- F열(파일명) 기반 멱등성 체크 (중복 전송 방지)
- 전송 상태 UI 피드백 (전송 중/완료/실패/이미 전송됨)

#### 3-탭 UI 구조 개편
- Record 모드: 현장 데이터 입력 (테이블, BB, 액션)
- Review 모드: 핸드 모니터링 및 VIRTUAL 전송
- Settings 모드: External Sheet ID 설정

#### BB 입력 UX 개선
- Record 모드에서 BB 값 입력 및 실시간 localStorage 저장
- Review 모드에서 저장된 BB 값 자동 사용

### 🔧 개선 사항

#### 문서 업데이트
- PLAN: Aiden.Kim (후반 작업자) 페르소나 추가
- PLAN: 시나리오 2,3,5 워크플로우 재설계 (현장→후반 분리)
- PRD: Phase 1.3 체크리스트 완료

#### 아키텍처
- `updateExternalVirtual_()` DEPRECATED 처리 (C열 Time 매칭 방식)
- `pushToVirtual()` 신규 구현 (appendRow 방식)

---

## [v2.2.0] - 2025-09-28

### ✨ 기능
- Review 모드 v1.2.1: Mockup 디자인 완료 구현
- 2-Panel 레이아웃 + 무한 스크롤

---

## [v2.1.0] - 2025-09-27

### ✨ 기능
- 초기 Review 모드 구현
- 플레이어명 S.6 → 실제 이름 표시 수정

---

## [v1.1.1] - 2025-09-26

### 🎉 초기 릴리스
- Record 모드 핵심 기능
- HANDS/ACTIONS 시트 저장
- 모바일 최적화
