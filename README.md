# Poker Hand Logger v3.3.1

**HandLogger + Tracker + SoftSender** 통합 프로젝트

---

## 🎯 개요

3개의 독립 Apps Script 프로젝트를 **단일 URL**로 통합한 웹앱입니다.

- **HandLogger**: 포커 핸드 기록 (Record/Review)
- **Tracker**: 키 플레이어 & 테이블 관리
- **SoftSender**: VIRTUAL 시트 컨텐츠 전송

---

## ✨ v3.3.1 (2025-01-15) - Record 탭 VIRTUAL 전송 제거

### Changes
- ♻️ **Record 탭 단순화**: VIRTUAL 전송 기능을 Review 탭으로 완전 이전
- 🗑️ **139줄 코드 제거**: 불필요한 UI 및 로직 삭제
- 🎯 **명확한 역할 분리**: Record(기록) / Review(검토+전송)

---

## 📋 이전 버전

### v3.3.0 (2025-01-15) - 핸드 번호 자동 증가
- 🔢 **자동 핸드 번호**: HANDS 시트 D열 기준 자동 증가
- 💰 **숫자 포맷팅**: 천 단위 콤마 구분 (BB, pot, stack)
- PRD: [tasks/prds/0002-prd-auto-hand-number.md](tasks/prds/0002-prd-auto-hand-number.md)

### v2.9.0 (2025-10-13) - Keyplayer 테이블 우선 정렬

### Features
- ⭐ **Keyplayer 테이블 최상단 배치**: 36개 테이블 중 VIP/방송 대상 테이블 즉시 선택
- 🎨 **시각적 강조**: ⭐ 아이콘 + 골드 배경 + keyplayer 수 표시 `(3 Key Players)`
- ⚡ **선택 시간 93% 절감**: 8초 → 0.5초 (테이블 스크롤 제거)
- 🔄 **하위 호환**: keyplayer 컬럼 없는 기존 Type 시트 정상 작동
- 📱 **모바일 최적화**: Thumb Zone 내 배치 (한 손 조작 가능)

### Technical Details
- 클라이언트 정렬 (O(n log n), 36개 테이블 < 1ms)
- Record 모드만 적용 (Review 모드 제외)
- 테스트 함수 제공: 브라우저 콘솔에서 `testKeyplayerSort()` 실행
- PRD: [tasks/prds/0001-prd-keyplayer-table-sort.md](tasks/prds/0001-prd-keyplayer-table-sort.md)

### 사용 방법
1. Type 시트 K열(`keyplayer`)에 TRUE/FALSE 설정
2. 페이지 새로고침 (Ctrl+Shift+R)
3. Record 모드 테이블 드롭다운에서 ⭐ 표시 확인

---

## 📋 이전 버전

### v2.7.2 (2025-10-07)
**빌드 성공, 런타임 오류 발생** - 의존성 분석 미흡으로 인한 통합 실패

자세한 내용: [docs/STATUS.md](docs/STATUS.md)

---

## 📁 프로젝트 구조

```
handlogger/
├── handlogger_sub/           # HandLogger 원본 백업
├── tracker/                  # Tracker 원본 백업
├── softsender/               # SoftSender 원본 백업
│
├── src/                      # 개발 소스 (빌드 시 원본에서 복사)
│   ├── common/
│   │   └── common.gs        # 공통 함수 12개
│   ├── handlogger/
│   ├── tracker/
│   └── softsender/
│
├── dist/                     # 빌드 결과물 (Apps Script 배포)
│   ├── code.gs              # ⭐ 통합 파일
│   └── index.html           # ⭐ 통합 파일
│
├── build.js                 # 빌드 스크립트
├── verify-build.js          # 의존성 검증
├── version.js               # 단일 버전 관리
└── package.json
```

---

## 🚀 빌드 및 배포

### 빌드

```bash
npm run build      # 원본 백업 → src/ → dist/ 병합
npm run verify     # 의존성 검증 (12개 공통 함수)
```

### 배포

```bash
npx clasp push                           # Apps Script 업로드
npx clasp deploy -d "v2.7.2 설명"       # 배포 버전 생성
```

---

## 🔗 관련 문서

- [현재 상태](docs/STATUS.md) - 블로커 및 다음 작업
- [프로젝트 계획](docs/PLAN.md) - 통합 로드맵
- [배포 가이드](docs/DEPLOY_GUIDE.md) - 배포 절차
- [변경 이력](docs/CHANGELOG.md) - 버전별 변경사항

---

## 📄 라이선스

MIT License
