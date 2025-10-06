# Poker Hand Logger v2.7.2 - Unified

**HandLogger + Tracker + SoftSender** 통합 프로젝트

---

## 🎯 개요

3개의 독립 Apps Script 프로젝트를 **단일 URL**로 통합한 웹앱입니다.

- **HandLogger**: 포커 핸드 기록 (Record/Review)
- **Tracker**: 키 플레이어 & 테이블 관리
- **SoftSender**: VIRTUAL 시트 컨텐츠 전송

---

## ⚠️ 현재 상태 (v2.7.2)

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
