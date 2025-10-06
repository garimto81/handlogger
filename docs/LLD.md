# LLD - Unified Apps Script Project

## 📋 문서 정보
- **작성일**: 2025-10-06
- **버전**: v2.6.1
- **상태**: 기술 설계 및 구현 인덱스

---

## 🏗️ 아키텍처 개요

```
handlogger/
├── handlogger_sub/               # ⭐ 원본 백업 (빌드 시 src/로 복사)
│   ├── handlogger_code.gs        # 원본 백엔드
│   └── handlogger_index.html     # 원본 UI
│
├── tracker/                      # ⭐ 원본 백업 (빌드 시 src/로 복사)
│   └── tracker.html              # 원본 UI
│
├── softsender/                   # ⭐ 원본 백업 (빌드 시 src/로 복사)
│   ├── softsender_code.gs        # 원본 백엔드
│   └── page.html                 # 원본 UI
│
├── src/                          # 개발 소스 (빌드 타임에 원본에서 복사됨)
│   ├── common/                   # ⭐ 공통 모듈
│   │   └── common.gs
│   ├── handlogger/
│   │   ├── code.gs               # HandLogger 백엔드
│   │   └── index.html            # HandLogger UI
│   ├── tracker/
│   │   ├── tracker.gs            # Tracker 백엔드
│   │   └── tracker.html          # Tracker UI
│   └── softsender/
│       ├── softsender_code.gs    # SoftSender 백엔드
│       └── page.html             # SoftSender UI
│
├── dist/                         # 빌드 결과물 (배포용)
│   ├── code.gs                   # ⭐ 통합된 단일 파일
│   └── index.html                # ⭐ 통합된 단일 파일
│
├── build.js                      # 빌드 스크립트
├── package.json
└── .clasp.json                   # Apps Script 배포 설정
```

### 빌드 프로세스

```
1. 원본 백업 → src/ 복사 (최신 상태 동기화)
   handlogger_sub/handlogger_code.gs → src/handlogger/code.gs
   handlogger_sub/handlogger_index.html → src/handlogger/index.html
   tracker/tracker.html → src/tracker/tracker.html
   softsender/softsender_code.gs → src/softsender/softsender_code.gs
   softsender/page.html → src/softsender/page.html

2. src/ → dist/ 빌드 (병합 및 변환)
   src/common/common.gs
   + src/handlogger/code.gs
   + src/tracker/tracker.gs (네임스페이스: tracker_*)
   + src/softsender/softsender_code.gs (네임스페이스: soft_*)
   → dist/code.gs

   src/handlogger/index.html (base)
   + src/tracker/tracker.html (CSS/JS 추출 및 스코핑)
   + src/softsender/page.html (CSS/JS 추출 및 스코핑)
   → dist/index.html

3. dist/ → Apps Script 배포
   npx clasp push
```

**중요**:
- ✅ **원본 백업 폴더**: 수정 금지, 빌드 시 자동 복사됨
- ✅ **src/ 폴더**: 빌드 타임에 원본에서 자동 생성됨
- ✅ **dist/ 폴더**: 배포용 최종 결과물

---

## 🔧 코드 모듈화 전략

### 모듈 분리 원칙

| 구분 | 위치 | 포함 내용 |
|------|------|-----------|
| **공통 모듈** | `src/common/` | 3개 프로젝트에서 공통으로 사용하는 헬퍼 함수 |
| **프로젝트별 모듈** | `src/handlogger/`, `src/tracker/`, `src/softsender/` | 각 프로젝트 고유 비즈니스 로직 |
| **통합 빌드 결과** | `dist/code.gs`, `dist/index.html` | 공통 모듈 + 3개 프로젝트 병합 결과물 |

---

## 📦 공통 모듈 함수 목록 (src/common/)

### 1. 동시성 제어
```javascript
function withScriptLock_(fn) { ... }
```
**역할**: Google Apps Script의 동시 실행 제어 (ScriptLock 래퍼)
**사용처**: HandLogger, Tracker, SoftSender 모두 시트 쓰기 작업 시 사용
**파일**: handlogger_sub/handlogger_code.gs:46

### 2. 스프레드시트 접근
```javascript
function appSS_() { ... }
function getOrCreateSheet_(ss, name) { ... }
function setHeaderIfEmpty_(sheet, header) { ... }
function readAll_(sheet) { ... }
```
**역할**: 스프레드시트 CRUD 공통 헬퍼
**사용처**: 3개 프로젝트 모두 시트 읽기/쓰기 시 사용
**파일**:
- `appSS_()` → handlogger_sub/handlogger_code.gs:62
- `getOrCreateSheet_()` → handlogger_sub/handlogger_code.gs:63
- `setHeaderIfEmpty_()` → handlogger_sub/handlogger_code.gs:64
- `readAll_()` → handlogger_sub/handlogger_code.gs:68

### 3. 데이터 파싱
```javascript
function findColIndex_(headerRow, aliases) { ... }
function toInt_(value) { ... }
function numComma_(num) { ... }
```
**역할**: 시트 데이터 파싱 및 포맷팅
**사용처**: 칩 카운트, 테이블 번호 등 숫자 처리 시 공통 사용
**파일**:
- `findColIndex_()` → handlogger_sub/handlogger_code.gs:75
- `toInt_()` → handlogger_sub/handlogger_code.gs:78
- `numComma_()` → handlogger_sub/handlogger_code.gs:709

### 4. 날짜/시간 처리
```javascript
function nowKST_() { ... }
function todayStartKST_() { ... }
function extractTimeHHMM_(isoString) { ... }
```
**역할**: KST 타임존 기준 날짜/시간 처리
**사용처**: 핸드 타임스탬프, VIRTUAL 시트 Time 매칭 등
**파일**:
- `nowKST_()` → handlogger_sub/handlogger_code.gs:83
- `todayStartKST_()` → handlogger_sub/handlogger_code.gs:87
- `extractTimeHHMM_()` → handlogger_sub/handlogger_code.gs:557

### 5. Roster 읽기
```javascript
function readRoster_() { ... }
```
**역할**: TYPE 시트에서 테이블/플레이어 정보 읽기
**사용처**: HandLogger (플레이어 이름 조회), Tracker (칩 업데이트)
**파일**: handlogger_sub/handlogger_code.gs:120

---

## 🎯 프로젝트별 고유 함수

### HandLogger (src/handlogger/)

#### 핸드 데이터 저장
- `commitHand(handData)` → code.gs:...
- `recordActionJSON(action)` → code.gs:...
- `getAllActionsJSON()` → code.gs:...
- `resetUI()` → code.gs:...

#### 핸드 조회
- `queryHands(filter)` → code.gs:...
- `getHandsForReview(date)` → code.gs:...
- `getHandDetail(handId)` → code.gs:...

#### VIRTUAL 시트 전송
- `pushToVirtual(handIds, extSheetId)` → code.gs:...
- `buildSubtitleBlock_(hand, roster)` → code.gs:...
- `extractTimeHHMM_(isoString)` → code.gs:...

### Tracker (src/tracker/)

- `getKeyPlayers()` → tracker.gs:... (빌드 후: `tracker_getKeyPlayers()`)
- `getTablePlayers(tableNo)` → tracker.gs:... (빌드 후: `tracker_getTablePlayers()`)
- `updatePlayerChips(data)` → tracker.gs:... (빌드 후: `tracker_updatePlayerChips()`)
- `addPlayer(data)` → tracker.gs:... (빌드 후: `tracker_addPlayer()`)
- `removePlayer(data)` → tracker.gs:... (빌드 후: `tracker_removePlayer()`)

### SoftSender (src/softsender/)

- `getBootstrap()` → softsender_code.gs:... (빌드 후: `soft_getBootstrap()`)
- `updateVirtual(data)` → softsender_code.gs:... (빌드 후: `soft_updateVirtual()`)
- `buildFileName(type)` → softsender_code.gs:... (빌드 후: `soft_buildFileName()`)

---

## ⚙️ 빌드 시스템 (build.js)

### 네임스페이스 자동 처리

#### 함수명 변경 (Prefix 추가)
```javascript
// build.js:103-132
trackerJs = trackerJs
  .replace(/\.getKeyPlayers\(/g, '.tracker_getKeyPlayers(')
  .replace(/\.getTablePlayers\(/g, '.tracker_getTablePlayers(')
  .replace(/\.updatePlayerChips\(/g, '.tracker_updatePlayerChips(')
  .replace(/\.addPlayer\(/g, '.tracker_addPlayer(')
  .replace(/\.removePlayer\(/g, '.tracker_removePlayer(')
```

**파일**: build.js:103-132

#### CSS 스코핑
```javascript
// build.js:94-99
trackerCss = `#panelTracker {\n${trackerCss.replace(/\n/g, '\n  ')}\n}`;
softCss = `#panelSoftsender {\n${softCss.replace(/\n/g, '\n  ')}\n}`;
```

**파일**: build.js:94-99

### 병합 순서 (의존성 보장)

```javascript
// build.js 병합 로직
const merged = [
  commonCode,        // 1️⃣ 공통 함수 정의 (withScriptLock_, appSS_, etc.)
  handloggerCode,    // 2️⃣ HandLogger (공통 함수 호출)
  prefixedTracker,   // 3️⃣ Tracker (공통 함수 호출)
  prefixedSoft       // 4️⃣ SoftSender (공통 함수 호출)
].join('\n\n');
```

**중요**:
- ✅ **정의가 호출보다 먼저** 위치해야 함
- ✅ Apps Script는 **import/require 미지원** → 빌드 타임 병합 필수
- ⚠️ src/ 파일 단독 실행 불가 (개발 시 논리적 분리만)

### 의존성 검증 스크립트

#### 수동 검증 (간단)
```bash
npm run build

# 공통 함수 정의 위치 확인
grep -n "function withScriptLock_" dist/code.gs  # 예: 46줄

# 모든 호출 확인 (모두 46줄 초과여야 함)
grep -n "withScriptLock_(" dist/code.gs

# 중복 확인 (결과: 1)
grep -c "function withScriptLock_" dist/code.gs
```

**문제**: 수동 눈으로 확인 → 휴먼 에러 가능

#### 자동 검증 (Phase 2.3에서 구현 예정)

**verify-build.js 예시**:
```javascript
// 1. 공통 함수 정의 위치 찾기
// 2. 중복 확인 (1회만 존재)
// 3. 호출이 정의 이후인지 자동 검증
// 4. 실패 시 process.exit(1)
```

**package.json**:
```json
"scripts": {
  "verify": "node verify-build.js",
  "push": "npm run build && npm run verify && npx clasp push"
}
```

상세 구현은 PRD 2.3 참조

### 네임스페이스 규칙

| 모듈 | 함수 Prefix | HTML ID Prefix | CSS Scope |
|------|-------------|----------------|-----------|
| **공통** | ❌ (없음) | N/A | N/A |
| **HandLogger** | ❌ (없음) | (기본) | 전역 |
| **Tracker** | `tracker_` | `panelTracker` | `#panelTracker { ... }` |
| **SoftSender** | `soft_` | `panelSoftsender` | `#panelSoftsender { ... }` |

---

## ⚠️ 현재 build.js 상태 vs 계획 불일치

### 문제점

| 항목 | 현재 build.js (v2.6.1) | 계획 (v2.7.0) | 상태 |
|------|------------------------|---------------|------|
| **공통 함수 제공자** | HandLogger (line 32-47) | src/common/ | ❌ 불일치 |
| **Tracker 주석** | "HandLogger에서 공유" | "common에서 공유" | ❌ 불일치 |
| **병합 순서** | `[handlogger, tracker, soft]` | `[common, handlogger, tracker, soft]` | ❌ 불일치 |
| **src/common/** | 없음 | 있음 (Phase 2.1에서 생성) | ⏳ 대기 중 |

### 현재 build.js 로직 (line 32-47)
```javascript
// ❌ 문제: HandLogger가 공통 함수 제공자
const handloggerCode = fs.readFileSync(`${SRC}/handlogger/code.gs`, 'utf8');
const trackerCode = fs.readFileSync(`${SRC}/tracker/tracker.gs`, 'utf8');

let trackerCleaned = trackerCode
  .replace(/function withScriptLock_\([\s\S]*?\n\}/g, '// withScriptLock_ (HandLogger에서 공유)')
  .replace(/function appSS_\([\s\S]*?\n\}/g, '// appSS_ (HandLogger에서 공유)');
```

### 해결 방안 (Phase 2.2)
PRD 2.2 참조 - build.js 전면 수정 필요

---

## 🚀 마이그레이션 계획 (v2.7.0)

### Step 1: 공통 모듈 추출 (handlogger_sub → src/common/)
```bash
# 1. src/common/common.gs 생성
# 2. handlogger_code.gs에서 공통 함수 복사
# 3. handlogger_code.gs에서 공통 함수 삭제
```

**공통 함수 (12개)**:
- `withScriptLock_()`, `appSS_()`, `getOrCreateSheet_()`, `setHeaderIfEmpty_()`
- `readAll_()`, `findColIndex_()`, `toInt_()`, `numComma_()`
- `nowKST_()`, `todayStartKST_()`, `readRoster_()`
- **`extractTimeHHMM_()`** ⭐ 추가 (VIRTUAL Time 매칭용)

### Step 2: 빌드 스크립트 수정
```javascript
// build.js 수정
const commonCode = fs.readFileSync('src/common/common.gs', 'utf8');
const handloggerCode = fs.readFileSync('src/handlogger/code.gs', 'utf8');

// 병합 로직 (의존성 순서 보장)
const merged = [
  commonCode,        // 1️⃣ 공통 함수 정의 (prefix 없음)
  handloggerCode,    // 2️⃣ HandLogger 함수 (prefix 없음, 공통 함수 호출)
  prefixedTracker,   // 3️⃣ Tracker (tracker_* prefix, 공통 함수 호출)
  prefixedSoft       // 4️⃣ SoftSender (soft_* prefix, 공통 함수 호출)
].join('\n\n');
```

**의존성 해결**:
- Apps Script는 import 미지원 → 빌드 시 단일 파일로 병합
- 공통 함수가 최상단 → 모든 모듈에서 호출 가능

### Step 3: 검증
```bash
npm run build
grep "withScriptLock_" dist/code.gs   # 공통 함수 1회만 존재 확인
grep "commitHand" dist/code.gs        # HandLogger 함수 존재 확인
grep "tracker_getKeyPlayers" dist/code.gs  # Tracker 네임스페이스 확인
```

### 기대 효과

| 지표 | 현재 (v2.6.1) | 목표 (v2.7.0) | 개선 |
|------|---------------|---------------|------|
| **코드 중복** | 3곳에 `withScriptLock_()` 존재 | 1곳 (src/common/) | **67% ⬇️** |
| **유지보수** | 버그 수정 시 3곳 수정 | 1곳만 수정 | **3배 ⬆️** |
| **가독성** | HandLogger 733줄 (공통 함수 포함) | 550줄 (순수 로직만) | **25% ⬇️** |
| **빌드 크기** | dist/code.gs 1800줄 (중복 포함) | 1650줄 (중복 제거) | **8% ⬇️** |

---

## 🐛 알려진 문제 및 해결책

### ✅ 해결됨: 함수 호출 에러 (v2.6.1)
**문제**: `google.script.run...getKeyPlayers is not a function`
**원인**: `.getKeyPlayers(` 정규식이 `.withFailureHandler().getKeyPlayers()` 메서드 체이닝 미처리
**해결**: `\bgetKeyPlayers\(` → `\.getKeyPlayers\(` 패턴 변경
**파일**: build.js:103

### ✅ 해결됨: 버튼 세로 배치 (v2.6.1)
**문제**: Tracker 탭 버튼이 세로로 배치됨
**원인**: Tracker CSS `.row { display: grid }` → HandLogger의 `.row { display: flex }` 덮어쓰기
**해결**: CSS 스코핑 `#panelTracker { ... }` 적용
**파일**: build.js:94

---

## 📊 기술 스택

- **런타임**: Google Apps Script (V8)
- **빌드**: Node.js + build.js (정규식 기반)
- **배포**: Clasp CLI
- **데이터 저장소**: Google Sheets
- **UI**: HTML + CSS + Vanilla JavaScript

---

## 🔗 관련 문서

- [PLAN.md](PLAN.md) - 프로젝트 비전
- [PRD.md](PRD.md) - 작업 목록
- [STATUS.md](STATUS.md) - 현재 상태
- [CHANGELOG.md](CHANGELOG.md) - 변경 이력
- [README.md](../README.md) - 사용 가이드
- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) - 배포 가이드
