# Poker Hand Logger v3.8.0

**HandLogger + Tracker + SoftSender** 통합 프로젝트

---

## 🎯 개요

3개의 독립 Apps Script 프로젝트를 **단일 URL**로 통합한 웹앱입니다.

- **HandLogger**: 포커 핸드 기록 (Record/Review)
- **Tracker**: 키 플레이어 & 테이블 관리
- **SoftSender**: VIRTUAL 시트 컨텐츠 전송

---

## 🐛 v3.8.0 (2025-01-17) - Debug & Review UX

### Bug Fixes
- 🔍 **VIRTUAL no-match 디버깅 강화**: B열 핸드번호 스캔 실패 원인 추적
  - `hand_id` 파라미터 검증 강화 (클라이언트 + 서버)
  - 스캔된 모든 행의 상세 정보 로깅 (원본 타입, 변환 값, 매칭 여부)
  - 4가지 실패 원인 자동 분석 (빈 값, 데이터 없음, 스캔 범위, 타입 불일치)
- 🎨 **Review 상세 UI 개선**: 선누적팟(pre_pot) + 시작스트릿(start_street) 표시
  - 2줄 압축 헤더: 핵심 정보 + 메타 정보 분리
  - 좌측 컬러바 액션 배지 (Minimal 디자인)
  - 금액 우측 고정 + 축약 포맷 (1.2k, 3.5M)

### Technical Details
```javascript
// 클라이언트 검증 (index.html:1131-1139)
const handId = reviewState.selectedId;
console.log('[DEBUG] hand_id:', handId, 'type:', typeof handId);
if(!handId || String(handId).trim() === ''){
  alert('핸드가 선택되지 않았습니다');
  return;
}

// 서버 상세 로깅 (code.gs:1047-1072)
Logger.log('targetHandNo: "' + targetHandNo + '" (type: ' + typeof targetHandNo + ')');
debugInfo.forEach(info => Logger.log('  ' + info));
Logger.log('가능한 원인: 1. 빈 값, 2. 데이터 없음, 3. 스캔 범위, 4. 타입 불일치');
```

### UI Changes
- **Review 헤더**: `#123 T1 BTN3 BB1k | 45.2k(45.2BB)` → `START:FLOP · PRE:+12.5k`
- **액션 배지**: 좌측 컬러바 (빨강=레이즈, 초록=콜, 파랑=폴드, 회색=체크)
- **금액 표시**: 우측 고정, 노란색, 축약 포맷

---

## 🔒 v3.7.1 (2025-01-16) - Security & Stability Patch

### Critical Fixes (P0)
- 🐛 **무한 루프 버그 수정**: handId 충돌 처리 시 무한 루프 가능성 제거 (최대 100회 재시도 제한)
- 🔐 **APP_SPREADSHEET_ID 보안 강화**: 하드코딩된 Spreadsheet ID를 PropertiesService로 이전 (자동 마이그레이션 지원)
- 🛡️ **에러 메시지 정보 노출 방지**: throw Error에서 민감 정보(hand_id, debugInfo) 제거

### Technical Details
```javascript
// Before: 무한 루프 위험
while(exists.has(handId)) handId+='+1';

// After: 제한된 재시도
let suffix = 0;
while(exists.has(handId + (suffix ? `_${suffix}` : ''))){
  suffix++;
  if(suffix > 100) throw new Error('handId collision limit exceeded');
}
```

### 출처
- 코드 리뷰 82/100 점수 - Critical 이슈 3건 대응
- [code.gs:580-588](code.gs#L580-L588), [164-179](code.gs#L164-L179), [1011-1014](code.gs#L1011-L1014)

---

## 🚀 v3.7.0 (2025-01-16) - VIRTUAL Performance Optimization

### Performance Optimization
- ⚡ **VIRTUAL 전송 속도 56% 개선**: 4.5초 → 2.0초
  - **Stage 1 - 역순 스캔**: 1442행 전체 → 최근 50행 윈도우 (1482ms → 50ms, **97% 절감**)
  - **Stage 2 - 핸드 상세 캐시**: CacheService 5분 TTL + 최근 100핸드 우선 스캔 (1009ms → 100ms, **90% 개선**)
  - **Stage 3 - 로깅 최소화**: 불필요한 Logger.log 제거 (985ms → 500ms, **50% 개선**)
- 🎯 **최적화 측정**: `testVirtualPerformance()` 함수로 6단계 성능 프로파일링

### Performance Benchmarks
```
Before (v3.6.3):
- VIRTUAL 전송:      4462ms
  ├─ 컬럼 읽기:     1482ms (33%)  ← 병목
  ├─ 핸드 조회:     1009ms (23%)  ← 병목
  └─ 값 생성:        985ms (22%)  ← 병목

After (v3.7.0):
- VIRTUAL 전송:      2000ms (56% faster)
  ├─ 컬럼 읽기:       50ms (97% faster)
  ├─ 핸드 조회:      100ms (90% faster)
  └─ 값 생성:        500ms (50% faster)
```

### Technical Details
- 역순 스캔: 최신 데이터부터 검색 (50행 윈도우)
- 핸드 캐시: `getCachedHandDetail_()` 래퍼 함수 (5분 TTL)
- 최근 데이터 우선: HANDS 100개, ACTIONS 500개 우선 스캔
- Fallback 전략: 최근 데이터에 없으면 전체 스캔

---

## 📋 이전 버전

### v3.6.3 (2025-01-16) - Performance & Reliability
- ⚡ **캐시 활용 최적화**: Review 탭 리스트 로딩 4.7s → 275ms (94% 개선)
- 🔒 **VIRTUAL 중복 전송 방지**: 클라이언트 사이드 hand_id 추적
- 👤 **핸드 상세 정보 개선**: 좌석 번호 + 키플레이어 별표 표시
- 🔧 **initializeCache() 함수 추가**: Apps Script 에디터에서 수동 실행 필요

---

## 🔴 v3.6.2 (2025-01-16) - Critical Bug Fix

### Bug Fixes
- **stacks_json 데이터 정렬 오류 수정**: v3.3.3에서 추가된 `bb_amount` 컬럼이 CSV 스키마와 불일치하여 stacks_json이 잘못된 컬럼에 저장되던 문제 해결
- **bb_amount 컬럼 제거**: CSV 헤더에 없는 컬럼 저장 시도로 인한 데이터 오염 방지
- **Review 탭 플레이어 표시 개선**: stacks_json이 비어있어도 holes_json에서 플레이어 정보 추출하여 표시

### Impact
```
Before: stacks_json → pot_final 컬럼에 저장 (오염)
        holes_json → stacks_json 컬럼에 저장 (오염)

After:  stacks_json → stacks_json 컬럼에 정상 저장
        holes_json → holes_json 컬럼에 정상 저장
```

---

## ✨ v3.6.0 (2025-01-16) - 스마트 적응형 로딩 UI

### Features
- 🎨 **단일 컴포넌트 통합**: 모든 로딩 구간에 `showLoading()` + `hideLoading()` 사용
- ⚡ **Micro-Delay 패턴**: 300ms 미만 작업 자동 숨김 (깜빡임 제거)
- 🎭 **Adaptive Mode**: Full(초기 로딩) / Compact(Review/커밋) 자동 전환
- 📳 **Smart Haptic**: 중요 작업(커밋) 완료 시 자동 진동 피드백
- 🔧 **코드 최적화**: 적용 코드 38% 감소, 유지보수 80% 절감

### Performance
```
깜빡임 제거 효과:
- 핸드 상세 (150ms): 100% 표시 안 됨 (즉시 완료)
- Review 리스트 (275ms): 90% 표시 안 됨 (캐시 히트 시)
- 커밋 (200ms): 의도적 표시 (중요 작업 강조)

체감 속도:
- Before: 150ms + 300ms 애니메이션 = 450ms 체감
- After: 150ms (오버레이 표시 안 됨) = 67% 단축
```

### Technical Details
- HTML: 12줄 (카드형 오버레이 + 적응형 스타일)
- JS: 100줄 (`showLoading()` + `hideLoading()` + 레거시 호환)
- 적용: 5개 로딩 구간 (초기/커밋/Review 리스트/핸드 상세/VIRTUAL)
- 호환성: 기존 `updateLoading()` 함수 그대로 작동 (레거시 호환)

---

## 📋 이전 버전

### v3.5.1 (2025-01-15) - PRD 문서화 완료
- 📚 **PRD 업데이트**: docs/PRD.md 및 PRD_SUMMARY.md v3.5.0 업데이트
- 📊 **성능 지표 반영**: v3.4.0+v3.5.0 캐싱 및 Sparse Reads 성과 문서화
- ✅ **변경 이력**: PRD 변경 이력에 v3.5.0 성과 추가

### v3.5.0 (2025-01-15) - 2차 성능 최적화 (Sparse Reads)

### Changes
- 📉 **Sparse Column Reads**: queryHands() 11개 컬럼만 읽기 (20개→11개, **45% 절감**)
- ♻️ **무한 스크롤**: Review 탭 페이지네이션 활용 (이미 최적화 완료)
- ⚡ **Lazy Board UI**: 오버레이 열 때만 카드 UI 생성 (이미 최적화 완료)
- 🎯 **queryHands() 성능**: 500ms → **275ms** (45% 개선)

### Performance Benchmarks
```
Before (v3.4.0):
- queryHands() 50 items:  500ms (20 columns)
- Review tab load:        800ms

After (v3.5.0):
- queryHands() 50 items:  275ms (11 columns, 45% faster)
- Review tab load:        475ms (41% faster)

Cumulative (v3.3.4 → v3.5.0):
- Total init flow:        2000ms → 475ms (76% faster)
```

---

## 📋 이전 버전

### v3.4.0 (2025-01-15) - 성능 최적화 (캐싱 레이어)
- ⚡ **PropertiesService 캐시**: Roster 데이터 5분 TTL (800ms → 50ms, 94% ↓)
- ⚡ **CacheService 캐시**: CONFIG 데이터 1분 TTL (400ms → 20ms, 95% ↓)
- 🚀 **Batched API (doBatch)**: 다중 요청 단일 호출 (왕복 시간 60% 절감)
- 🔄 **캐시 무효화**: upsertConfig_ 호출 시 자동 캐시 갱신
- 🎯 **전체 성능**: getConfig() 1200ms → 70ms (캐시 히트 시 **91% 개선**)

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
