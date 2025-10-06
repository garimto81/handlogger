# PLAN - Unified Apps Script Project

## 📋 문서 정보
- **작성일**: 2025-10-06
- **버전**: v1.0
- **상태**: 불변 (프로젝트 비전)

---

## 🎯 목표

**3개의 독립적인 Google Apps Script 프로젝트(HandLogger, Tracker, SoftSender)를 단일 URL 웹앱으로 통합하여 배포 및 관리 효율성을 극대화한다.**

---

## 👥 페르소나

### 주요 사용자: 개발자/운영자

- **이름**: 김개발 (28세, 풀스택 개발자)
- **역할**: 포커 토너먼트 방송 시스템 개발 및 운영
- **현재 문제**:
  - **3개 URL 관리 지옥**: HandLogger, Tracker, SoftSender 각각 별도 배포 URL → 어느 URL이 최신인지 혼란
  - **배포 3배 소요**: 한 곳 수정해도 3개 프로젝트 각각 배포 → 30분 소요
  - **iframe URL 업데이트**: SoftSender 배포할 때마다 HandLogger에 새 URL 하드코딩 → 휴먼 에러 빈번
  - **코드 중복 지옥**: `withScriptLock_()`, `readRoster_()` 같은 헬퍼 함수를 3곳에 복붙 → 버그 수정 시 3곳 다 수정
  - **사용자 혼란**: 현장팀에게 "HandLogger는 이 URL, Tracker는 저 URL" 설명 → 북마크 잘못 저장
- **목표**:
  - **단일 URL 배포**: 하나의 URL로 모든 기능 접근
  - **1회 배포로 끝**: 코드 수정 → 빌드 → 푸시 → 완료
  - **코드 재사용**: 공통 헬퍼 함수 한 곳에만 유지
  - **사용자 편의**: "이 URL 하나만 북마크하세요" 한 마디로 끝
- **하루 일과**:
  - **09:00**: 출근, Slack 확인 → 현장팀 "어제 Tracker 칩 업데이트 안 돼요" 메시지
  - **09:15**: Apps Script 콘솔 접속, 3개 프로젝트 URL 중 어느 게 최신인지 확인
  - **09:30**: HandLogger 버그 발견 → 수정 → 빌드 → 배포 (10분 소요)
  - **10:00**: Tracker에도 같은 헬퍼 함수 버그 존재 → 복붙 → 배포 (10분 소요)
  - **10:30**: SoftSender도 같은 버그... (좌절)
  - **11:00**: "헬퍼 함수를 한 곳에만 두면 3배 빠를 텐데" 한숨
  - **오후**: 개발보다 배포 관리에 시간 낭비
  - **17:00**: 현장팀에게 "이 3개 URL 북마크하세요" 설명 → "어느 게 뭔지 모르겠어요" 답변
  - **퇴근 전**: "내일은 이 프로젝트들을 통합하자..." 다짐

---

## 📖 시나리오

### 시나리오 1: 첫 통합 배포 (D+0, 통합 완료일)

**[00:00]** 김개발, 기존 3개 프로젝트 소스 확보
  - `handlogger/code.gs` (733줄)
  - `tracker/tracker.gs` (294줄)
  - `softsender/softsender_code.gs` (177줄)

**[00:10]** 프로젝트 폴더 구조 설계
```
handlogger/
├── src/
│   ├── handlogger/
│   ├── tracker/
│   └── softsender/
├── dist/
├── build.js
└── package.json
```

**[00:30]** build.js 작성
  - 3개 `.gs` 파일 → `dist/code.gs` 병합
  - 3개 `.html` 파일 → `dist/index.html` 병합
  - 함수명 충돌 방지: `tracker_*`, `soft_*` prefix 자동 추가

**[01:00]** 첫 빌드 실행
```bash
npm run build
```

**[01:05]** `dist/code.gs` 확인
  - HandLogger 함수: `commitHand()`, `getHandsForReview()` (prefix 없음)
  - Tracker 함수: `tracker_getKeyPlayers()`, `tracker_updatePlayerChips()` ✅
  - SoftSender 함수: `soft_getBootstrap()`, `soft_updateVirtual()` ✅

**[01:20]** Apps Script 배포
```bash
npx clasp push
npx clasp deploy --description "v1.0 통합 배포"
```

**[01:25]** 웹앱 URL 접속 → 5개 탭 확인
  - [Record] [Review] [Tracker] [SoftSender] [⚙️]

**[01:30]** "드디어 URL 하나로 통합됐다!" (환호)

**결과**: 3개 URL → 1개 URL, 배포 시간 30분 → 5분

---

### 시나리오 2: 코드 수정 후 재배포 (D+7, 운영 중)

**[00:00]** 이슈 발생: Tracker에서 칩 업데이트 버그 발견

**[00:02]** `src/tracker/tracker.gs` 파일 수정
```javascript
function updatePlayerChips(tableId, seatNo, newChips) {
  // 버그 수정: 칩 검증 로직 추가
  if (newChips < 0) throw new Error('칩은 0 이상이어야 합니다');
  // ...
}
```

**[00:10]** 빌드 + 배포
```bash
npm run push  # build + clasp push 자동 실행
```

**[00:15]** 웹앱 새로고침 → 버그 수정 확인

**[00:20]** "5분 만에 배포 완료! 이전엔 30분 걸렸는데..."

**결과**: 수정 → 배포 시간 30분 → 5분 (6배 단축)

---

### 시나리오 3: 새 기능 추가 (D+30, SoftSender에 배치 전송 추가)

**[00:00]** 요구사항: SoftSender에 배치 전송 기능 추가

**[00:05]** `src/softsender/page.html` 수정
  - UI에 [배치에 추가] 버튼 추가
  - JavaScript에 `batchQueue` 배열 추가

**[00:20]** `src/softsender/softsender_code.gs` 수정
  - `updateVirtual()` 함수 수정 → 배치 처리 로직 추가

**[00:30]** 빌드 + 배포
```bash
npm run push
```

**[00:35]** 웹앱에서 SoftSender 탭 클릭 → 배치 전송 기능 확인

**[00:40]** "iframe이었다면 새 URL로 업데이트했어야 하는데, 통합이라 그냥 끝!"

**결과**: 새 기능 추가해도 URL 변경 없음, 사용자 영향 0

---

### 시나리오 4: 사용자 온보딩 (신규 현장팀원, D+60)

**[00:00]** 신입 박현장, 첫 근무일

**[00:05]** 김개발: "이 URL 하나만 북마크하세요"
  - https://script.google.com/macros/s/.../exec

**[00:10]** 박현장: "Record 탭에서 핸드 입력하고, Review 탭에서 확인하면 되죠?"

**[00:15]** 김개발: "네, Tracker는 키 플레이어 관리용이고, SoftSender는 자막 전송용이에요"

**[00:20]** 박현장: "아, 탭만 클릭하면 되네요. 쉽네요!"

**결과**: 온보딩 시간 30분 → 5분, 사용자 혼란도 90% 감소

---

## ✅ 성공 기준

### 정량적 지표

- [ ] **배포 URL 개수**: 3개 → 1개 (67% 감소)
- [ ] **배포 소요 시간**: 30분 → 5분 (83% 단축)
- [ ] **빌드 성공률**: ≥ 99%
- [ ] **함수명 충돌**: 0건 (네임스페이스 자동 처리)
- [ ] **배포 에러율**: ≤ 1%

### 정성적 지표

- [ ] **개발자**: "URL 관리가 너무 편해졌어요"
- [ ] **사용자**: "북마크 하나만 있으면 되네요"
- [ ] **유지보수**: "코드 수정이 3배 빨라졌어요"

### 비즈니스 임팩트

- [ ] **개발 생산성**: 배포 시간 83% 단축
- [ ] **사용자 만족도**: URL 혼란 해소
- [ ] **운영 안정성**: 배포 에러 1% 이하 유지

---

## 🔒 제약 사항

### 기술적 제약

- **Google Apps Script 제한**:
  - 스크립트 크기: 최대 50MB
  - 실행 시간: 최대 6분/호출
  - 동시 사용자: ScriptLock으로 직렬화

- **빌드 시스템**:
  - Node.js 기반 (로컬 환경 필요)
  - 정규식 변환 (함수명 충돌 방지)
  - CSS 스코핑 (스타일 충돌 방지)

### 운영적 제약

- **배포 프로세스**:
  1. src/ 수정 → 2. npm run build → 3. npm run push
  - 순서 지키지 않으면 배포 실패

- **개발 환경**:
  - Node.js 16+ 필수
  - clasp 설치 및 로그인 필요
  - Google Apps Script API 활성화 필요

### 코드 관리 제약

- **네임스페이스 규칙**:
  - HandLogger: prefix 없음 (기본)
  - Tracker: `tracker_*`
  - SoftSender: `soft_*`
  - 규칙 위반 시 함수 호출 에러

- **CSS 스코핑 규칙**:
  - HandLogger: 전역 CSS
  - Tracker: `#panelTracker { ... }`
  - SoftSender: `#panelSoftsender { ... }`

---

## 📐 핵심 원칙

1. **개발/배포 분리**: src/ (개발) → dist/ (배포)
2. **자동화 우선**: 수동 병합 금지, 빌드 스크립트 사용
3. **네임스페이스 철저**: 함수명/CSS 충돌 절대 불가
4. **단일 진실 공급원**: dist/ 는 항상 빌드 결과물, 직접 수정 금지
5. **하위 호환성**: 기존 3개 프로젝트 기능 100% 유지

---

## 🚀 향후 비전

### Phase 2 (v2.0~)
- **Hot Reload**: src/ 파일 변경 시 자동 빌드 + 자동 배포
- **TypeScript 전환**: 타입 안정성 확보
- **테스트 자동화**: 빌드 전 함수 호출 검증

### Phase 3 (v3.0~)
- **플러그인 시스템**: 새 모듈 추가 시 설정 파일만 수정
- **모니터링**: 배포 후 자동 헬스체크
- **롤백 시스템**: 배포 실패 시 이전 버전 자동 복구

---

## 💡 핵심 인사이트

> "3개 프로젝트를 따로 관리하는 건 3배의 수고가 아니라 9배의 수고다."
> \- 김개발 (통합 전)

> "통합 후 가장 좋은 점? URL 하나만 공유하면 끝이라는 것."
> \- 현장팀 피드백

**결론**: 통합은 단순히 파일을 합치는 게 아니라, 개발 생산성과 사용자 경험을 동시에 개선하는 전략적 결정이다.

---

## 🔗 관련 문서

- [README.md](../README.md) - 통합 프로젝트 사용 가이드
- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) - 배포 가이드
- [LLD.md](LLD.md) - 기술 설계 및 아키텍처
- [PRD.md](PRD.md) - 작업 목록
- [STATUS.md](STATUS.md) - 현재 상태
- [CHANGELOG.md](CHANGELOG.md) - 변경 이력
