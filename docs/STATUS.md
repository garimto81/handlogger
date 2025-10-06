# STATUS - HandLogger

**현재 버전**: v2.7.2
**마지막 업데이트**: 2025-10-06
**현재 상태**: ⚠️ 통합 실패 - 인과관계 및 의존성 분석 필요

---

## 📍 현재 위치

- **Phase 2 코드 모듈화**: ⚠️ 빌드 성공, 런타임 오류 발생
- **다음 단계**: 3개 앱 완전 분석 후 재통합 (Phase 2 재시작)

---

## ⚠️ 블로커

### v2.7.2 런타임 오류 (2025-10-06 23:XX)

**근본 원인**: 통합 과정에서 인과관계와 의존성을 완전히 이해하지 못함

#### 발생한 4개 오류:

1. **SyntaxError: missing ) after argument list** (Line 1290)
   - 템플릿 리터럴 또는 변수 null 처리 문제 추정
   - 빌드 전후 코드 변형 가능성

2. **TypeError: getKeyPlayers is not a function**
   - HTML: `.getKeyPlayers()` 호출 (Line 369)
   - GAS: `tracker_getKeyPlayers()` 정의 (Line 1072)
   - **네임스페이스 불일치**: tracker_ prefix 누락

3. **TypeError: getBootstrap is not a function**
   - HTML: `.getBootstrap()` 호출 (Line 1631)
   - GAS: `soft_getBootstrap()` 정의 (Line 1448)
   - **네임스페이스 불일치**: soft_ prefix 누락
   - Line 3611에는 `.soft_getBootstrap()` 올바르게 호출됨 (중복 init() 함수)

4. **Cannot read properties of null (reading 'map')**
   - 위 오류들로 인한 연쇄 실패
   - 초기화 실패 → null 데이터 → .map() 호출 실패

#### 핵심 문제:

- ❌ **함수 호출 규칙 불명확**: HandLogger 섹션은 prefix 없이, Tracker/SoftSender는 prefix 사용
- ❌ **중복 함수**: `init()`, `loadKeyPlayers()` 등이 여러 섹션에 중복 정의
- ❌ **빌드 프로세스**: 파일 병합 시 코드 변형 또는 누락 가능성
- ❌ **의존성 미파악**: 각 앱의 초기화 순서, 전역 변수 공유 방식 불명확

#### 다음 작업:

**Phase 2 재시작 - 완전 분석 후 재통합**

1. **3개 앱 개별 분석**:
   - HandLogger: 함수 목록, 전역 변수, 초기화 흐름
   - Tracker: 함수 목록, 전역 변수, 초기화 흐름
   - SoftSender: 함수 목록, 전역 변수, 초기화 흐름

2. **의존성 맵 작성**:
   - 공통 함수 vs 전용 함수
   - 네임스페이스 규칙 정의
   - 전역 변수 충돌 목록

3. **통합 전략 재수립**:
   - 단일 init() vs 탭별 초기화
   - 함수 호출 규칙 통일
   - 빌드 프로세스 검증 강화

---

## ✅ 최근 완료

### v2.7.0 - 공통 모듈 분리 + 빌드 검증 자동화 (2025-10-06)

#### 1. src/common/common.gs 생성
- ✅ 12개 공통 함수 분리:
  - 동시성 제어: `withScriptLock_()`
  - 스프레드시트 접근: `appSS_()`, `getOrCreateSheet_()`, `setHeaderIfEmpty_()`, `readAll_()`
  - 데이터 파싱: `findColIndex_()`, `toInt_()`, `numComma_()`
  - 날짜/시간 처리: `nowKST_()`, `todayStartKST_()`, `extractTimeHHMM_()`
  - Roster 읽기: `readRoster_()`

#### 2. build.js 병합 순서 수정
- ✅ 의존성 순서 보장: `version → common → handlogger → tracker → soft`
- ✅ 공통 함수 중복 제거 로직 삭제 (더 이상 필요 없음)
- ✅ VERSION 객체 통합 (version.js → dist/code.gs 최상단)

#### 3. verify-build.js 검증 자동화
- ✅ 12개 공통 함수 정의 위치 검증
- ✅ 정의가 호출보다 먼저 오는지 확인
- ✅ `npm run verify` 스크립트 추가

#### 4. 배포 자동화 개선
- ✅ `npm run push`: build → verify → deploy 순차 실행
- ✅ `npm run deploy`: build → verify → deploy → version deploy

#### 5. VERSION 중복 제거
- ✅ src/handlogger/code.gs: `const VERSION` 제거 → `VERSION.current` 사용
- ✅ version.js: 단일 버전 관리 소스

### v2.6.1 - 3개 프로젝트 통합 완료 (2025-10-06)

#### 1. 빌드 시스템 구축
- Node.js 기반 build.js 생성 (src/ → dist/ 자동 병합)
- 네임스페이스 충돌 방지: tracker_*, soft_* prefix
- clasp 배포 자동화: `npm run push`, `npm run deploy`
- CSS 스코핑: #panelTracker, #panelSoftsender

#### 2. 빌드 시스템 버그 수정 (버전 6-8)
- ✅ 함수명 변경: `.getKeyPlayers(` → `\.getKeyPlayers(` 단어 경계 사용
- ✅ CSS 충돌 해결: Tracker/SoftSender CSS를 패널별 네임스페이스에 스코핑
- ✅ window.onload 충돌: 제거 후 setMode()에서 탭 진입 시 초기화

#### 3. 문서 정리
- 16개 중복/임시 문서 삭제 (softsender 3개, tracker 10개, docs/ 루트 3개)
- BUILD_ISSUES.md → CHANGELOG.md로 통합
- 최종 구조: 각 프로젝트별 PLAN/PRD/LLD만 유지

### v2.5.0 - VIRTUAL C열 Time 매칭 (2025-10-06)

#### 1. pushToVirtual() 완전 재작성
- ❌ 기존: appendRow 방식 (A/B/D/I 열에 빈 값 입력)
- ✅ 신규: C열 Time 매칭 후 E/F/G/H/J만 개별 업데이트
- 헤더 3행 스킵 (행4부터 데이터 읽기)
- Date 객체 → HH:MM 변환 로직

#### 2. 타임존 처리
- `extractTimeHHMM_()`: ISO 8601 (UTC) → HH:MM (KST = UTC+9)
- `started_at` 예시: `2025-10-06T09:59:47.379Z` → `18:59`
- VIRTUAL C열 Date 객체 자동 KST 변환

#### 3. Keyplayer 필터링 (J열 자막)
- `buildSubtitleBlock_()`: Keyplayer='Y'/'TRUE'만 출력
- TYPE 시트 8개 컬럼 통합 (Nationality, Keyplayer 추가)
- `ROSTER_HEADERS`에 keyplayer 필드 추가
- `readRoster_()`에 keyplayer 읽기 로직 추가

#### 4. 디버깅 강화
- 매칭 실패 시 LOG 시트에 샘플 데이터 출력
- `VIRTUAL_MATCH` / `VIRTUAL_NOMATCH` 로그 코드

### v2.4.0 - 보안 패치

### 1. XSS 취약점 수정
- `renderStackGrid()`: 플레이어명 `textContent` 전환
- `renderPlayerRows()`: Review 플레이어 목록 `textContent` 전환
- `formatStreetSection()`: 액션 배지 `textContent` 전환
- `renderDetailContent()`: Table ID `textContent` 전환

### 2. localStorage 키 통일
- `phl_ext_sheetId` → `phl_extSheetId` 수정
- External Sheet ID 페이지 새로고침 후 정상 읽기 보장

### 3. 문서 업데이트
- CHANGELOG.md 생성 (v1.1.1 ~ v2.4.0)
- STATUS.md 생성 (현재 문서)

---

## 🚧 진행 중

### 배포 검증 대기
- ⏳ **버전 8 웹앱 테스트**: 5개 탭 모두 동작 확인 필요
  - Record 탭: 핸드 입력
  - Review 탭: 핸드 조회
  - Tracker 탭: 키 플레이어 관리
  - SoftSender 탭: VIRTUAL 컨텐츠 전송
  - Settings 탭: Sheet ID 설정

---

## 🧠 AI 메모리 (Context)

### 프로젝트 구조 (v2.6.1)
- **통합 아키텍처**: HandLogger + Tracker + SoftSender (단일 URL 배포)
- **빌드 시스템**: src/ → dist/ 자동 병합 (build.js)
- **5-탭 UI**: Record / Review / Tracker / SoftSender / Settings
- **역할 분리**:
  - Henry.Lee (현장 데이터 매니저) - Record, Tracker 사용
  - Aiden.Kim (후반 작업자) - Review, SoftSender 사용

### TYPE 시트 구조 (v2.5+)
- **8개 컬럼**: Poker Room / Table Name / Table No. / Seat No. / Players / **Nationality** / Chips / **Keyplayer**
- **Nationality**: ISO 3166-1 alpha-2 코드 (KR, US, RU 등) → J열 자막 생성 시 사용 ✅
- **Keyplayer**: J열 자막 필터링 (Y/TRUE만 출력) ✅ v2.5 구현

### 핵심 워크플로우
1. **Henry**: Record 모드 → 핸드 입력 → HANDS 시트 저장
2. **Aiden**: Review 모드 → 핸드 선별 → VIRTUAL 시트 전송 → 편집팀 공유

### 최근 기술 결정
- **VIRTUAL 전송 방식** (v2.5):
  - ❌ DEPRECATED: appendRow (v2.4 이전)
  - ✅ 현재: C열 Time 매칭 (행4부터, Date 객체 처리)
  - F열 멱등성 체크 유지
- **보안 정책**: `innerHTML` 금지 → `textContent` 사용 (XSS 방지)
- **localStorage 네이밍**: `phl_` prefix + camelCase 통일

### 다음 우선순위 (PRD 기준)
- Phase 1.7: ~~VIRTUAL C열 Time 매칭~~ ✅ 완료 (v2.5.0)
- Phase 2.1: BB 입력 디바운싱 (500ms)
- Phase 2.2: Commit 버튼 중복 클릭 방지
- Phase 2.3: 이벤트 리스너 메모리 누수 해결

---

## 📊 주요 지표

- **코드 라인**: ~920 lines (index.html)
- **서버 함수**: 23개 (code.gs)
- **보안 취약점**: 0건 (v2.4.0 기준)
- **localStorage 키**: 2개 (`phl_bbSize`, `phl_extSheetId`)
