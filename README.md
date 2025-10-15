# Poker Hand Logger v3.4.0

**HandLogger + Tracker + SoftSender** 통합 프로젝트

---

## 🎯 개요

3개의 독립 Apps Script 프로젝트를 **단일 URL**로 통합한 웹앱입니다.

- **HandLogger**: 포커 핸드 기록 (Record/Review)
- **Tracker**: 키 플레이어 & 테이블 관리
- **SoftSender**: VIRTUAL 시트 컨텐츠 전송

---

## ✨ v3.4.0 (2025-01-15) - 성능 최적화 (캐싱 레이어)

### Changes
- ⚡ **PropertiesService 캐시**: Roster 데이터 5분 TTL (800ms → 50ms, 94% ↓)
- ⚡ **CacheService 캐시**: CONFIG 데이터 1분 TTL (400ms → 20ms, 95% ↓)
- 🚀 **Batched API (doBatch)**: 다중 요청 단일 호출 (왕복 시간 60% 절감)
- 🔄 **캐시 무효화**: upsertConfig_ 호출 시 자동 캐시 갱신
- 📊 **모니터링**: 콘솔 로그로 캐시 히트/미스 추적 가능
- 🎯 **전체 성능**: getConfig() 1200ms → 70ms (캐시 히트 시 **91% 개선**)

### Performance Benchmarks
```
Before (v3.3.4):
- getConfig() first call:  800-1200ms
- getConfig() repeat call: 800-1200ms (no cache)
- Total init flow:         2000-2500ms

After (v3.4.0):
- getConfig() first call:  800-1200ms (cache miss)
- getConfig() repeat call: 50-70ms (cache hit)
- Total init flow:         600-900ms (70% faster)
```

---

## 📋 이전 버전

### v3.3.4 (2025-01-15) - VIRTUAL K열 테이블명 추가
- 📝 **K열 자동 입력**: VIRTUAL 시트 전송 시 K열에 "버추얼 테이블" 자동 입력
- 🔧 **함수 업데이트**: updateExternalVirtual_() 및 sendHandToVirtual() K열 쓰기 추가
- 📊 **로그 개선**: K열 입력 성공 메시지 console.log 출력

### v3.3.3 (2025-01-15) - BB 값 저장 및 Review UX 개선
- 💾 **HANDS 시트 확장**: bb_amount 컬럼 추가 (핸드별 BB 값 저장)
- 🎯 **Review VIRTUAL BB**: 핸드 저장 시 BB 값 우선 표시 (전역 설정값 fallback)
- 🎨 **VIRTUAL UI 개선**: 세로 방향 레이아웃 (가독성 향상, 플레이어별 별도 줄)
- ⚡ **자동 핸드 선택**: Review 탭 첫 열기 시 최신 핸드 자동 로드
- 🔢 **숫자 포맷팅 유지**: BB/스택 입력 시 3자리 콤마 표시
- 🔄 **하위 호환**: bb_amount 없는 기존 핸드 정상 작동

### v3.3.1 (2025-01-15) - Record 탭 VIRTUAL 전송 제거
- ♻️ Record 탭 단순화: VIRTUAL 전송 기능을 Review 탭으로 완전 이전
- 🗑️ 139줄 코드 제거: 불필요한 UI 및 로직 삭제
- 🎯 명확한 역할 분리: Record(기록) / Review(검토+전송)

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
