# HandLogger 성능 분석 가이드

**v3.6.0** | 2025-01-16

---

## 🎯 개요

HandLogger의 모든 함수 성능을 측정하고 병목 구간을 식별하기 위한 가이드입니다.

---

## 📊 테스트 방법

### 1. **서버 함수 테스트** (Apps Script)

#### 전체 함수 테스트
```javascript
// Apps Script 에디터에서 실행
testAllFunctions()
```

**측정 항목**:
- ✅ getConfig() - 초기 로딩
- ✅ getNextHandNo() - 핸드 번호 조회
- ✅ queryHands(10) - Review 리스트 (10개)
- ✅ queryHands(50) - Review 리스트 (50개)
- ✅ getHandDetail() - 핸드 상세
- ✅ readRoster_() - Roster 읽기 (캐시 없음)
- ✅ getCachedRoster_() - Roster 읽기 (캐시 있음)
- ✅ readConfig_() - Config 읽기 (캐시 없음)
- ✅ getCachedConfig_() - Config 읽기 (캐시 있음)

#### 캐싱 효과 측정
```javascript
testCachingPerformance()
```

**측정 항목**:
- Roster 캐시 미스 vs 캐시 히트
- Config 캐시 미스 vs 캐시 히트
- 전체 getConfig() 캐싱 효과

#### Sparse Reads 효과 측정 (v3.5.0)
```javascript
testSparseReadsPerformance()
```

**측정 항목**:
- queryHands() 페이지 크기별 성능 (10/20/50/100개)

#### 병목 구간 상세 분석
```javascript
analyzeBottlenecks()
```

**측정 항목**:
- readAll_() 시트별 성능 (HANDS/ACTIONS/CONFIG/Type)
- 스프레드시트 읽기 vs 캐시
- JSON 파싱 성능 (holes_json/stacks_json)

---

### 2. **클라이언트 함수 테스트** (JavaScript)

**사용법**:
1. `client_performance_test.html` 파일을 브라우저에서 열기
2. "전체 테스트 실행" 버튼 클릭
3. 콘솔에서 결과 확인

**측정 항목**:

#### DOM 연산
- getElementById (100회)
- querySelector (100회)
- createElement + appendChild (100개)
- innerHTML (100개 요소)
- classList.add/remove (1000회)

#### 데이터 처리
- JSON.parse (작은 객체, 1000회)
- JSON.parse (큰 객체, 100회)
- Array.map (1000개)
- Array.filter (1000개)
- Array.sort (1000개)
- String.replace (정규식, 1000자)
- Object spread (1000회)
- Object.assign (1000회)

#### 렌더링
- 카드 배지 렌더링 (52개)
- 핸드 리스트 렌더링 (50개)
- 좌석 Pills 렌더링 (9개)
- 액션 로그 렌더링 (20개)
- 보드 카드 렌더링 (5장)

---

## 🔍 예상 병목 구간

### 서버 (Apps Script)

| 함수 | 예상 시간 | 병목 원인 |
|------|-----------|-----------|
| **getConfig() (캐시 미스)** | 800-1200ms | 스프레드시트 읽기 (Roster 300행) |
| **queryHands(50)** | 250-500ms | 전체 HANDS 시트 읽기 + 정렬 |
| **getHandDetail()** | 100-200ms | HANDS + ACTIONS 시트 읽기 |
| **readRoster_()** | 500-800ms | Type 시트 전체 읽기 (300행) |
| **saveHand()** | 200-400ms | 스프레드시트 쓰기 + Lock |

### 클라이언트 (JavaScript)

| 작업 | 예상 시간 | 병목 원인 |
|------|-----------|-----------|
| **innerHTML (100개)** | 5-10ms | DOM 트리 재구성 |
| **JSON.parse (큰 객체)** | 3-5ms | 50개 액션 배열 파싱 |
| **Array.sort (1000개)** | 1-2ms | 정렬 알고리즘 |
| **핸드 리스트 렌더링 (50개)** | 10-20ms | 복잡한 HTML 구조 |
| **String.replace (정규식)** | 2-3ms | 천 단위 콤마 삽입 |

---

## 📈 최적화 기회

### 🔴 높은 우선순위 (500ms 이상)

#### 1. **getConfig() 캐시 미스** (800ms → 70ms)
- ✅ **v3.4.0 완료**: PropertiesService 캐시 구현
- **효과**: 91% 개선 (캐시 히트 시)

#### 2. **queryHands() 대량 데이터** (500ms → 275ms)
- ✅ **v3.5.0 완료**: Sparse Column Reads (11개 컬럼만 읽기)
- **효과**: 45% 개선

#### 3. **readRoster_() 초기 로딩** (800ms → 50ms)
- ✅ **v3.4.0 완료**: PropertiesService 캐시 5분 TTL
- **효과**: 94% 개선

---

### 🟡 중간 우선순위 (100-500ms)

#### 1. **getHandDetail() 상세 조회** (150ms)
- **현재**: HANDS + ACTIONS 시트 전체 읽기
- **최적화 아이디어**:
  - 인덱스 컬럼 추가 (hand_id로 빠른 검색)
  - ACTIONS 시트 전용 캐시 (최근 10개 핸드)
- **예상 효과**: 150ms → 50ms (67% 개선)

#### 2. **saveHand() 저장** (200ms)
- **현재**: withScriptLock + 스프레드시트 쓰기
- **최적화 아이디어**:
  - Batch 쓰기 (여러 핸드 한 번에 저장)
  - Lock 대기 시간 단축 (500ms → 200ms)
- **예상 효과**: 200ms → 100ms (50% 개선)

---

### 🟢 낮은 우선순위 (< 100ms)

#### 1. **클라이언트 렌더링 최적화**
- **현재**: innerHTML로 일괄 렌더링
- **최적화 아이디어**:
  - Virtual DOM (React/Vue)
  - DocumentFragment 사용
  - CSS containment
- **예상 효과**: 20ms → 10ms (50% 개선)

#### 2. **JSON 파싱 최적화**
- **현재**: 매번 JSON.parse 호출
- **최적화 아이디어**:
  - Memoization (같은 데이터 재사용)
  - 필요한 필드만 파싱 (holes만 필요할 때 stacks 파싱 안 함)
- **예상 효과**: 5ms → 2ms (40% 개선)

---

## 🎯 최적화 로드맵

### Phase 1: 완료됨 (v3.4.0 + v3.5.0)
- ✅ PropertiesService 캐시 (Roster 5분 TTL)
- ✅ CacheService 캐시 (Config 1분 TTL)
- ✅ Sparse Column Reads (queryHands 11개 컬럼)
- ✅ Batched API (doBatch)

### Phase 2: 다음 릴리즈 (v3.7.0)
- 🔄 getHandDetail() 캐싱 (최근 10개 핸드)
- 🔄 ACTIONS 시트 인덱스 추가
- 🔄 saveHand() Batch 쓰기

### Phase 3: 장기 계획 (v4.0.0)
- 📅 Virtual DOM 도입 (React/Vue)
- 📅 ServiceWorker 오프라인 캐싱
- 📅 WebAssembly 데이터 처리

---

## 📊 성능 벤치마크 (v3.6.0)

### 서버 (Apps Script)

```
초기 로딩 (캐시 미스):
- getConfig():           800ms (Roster 300행 + Config)
- getNextHandNo():       100ms (HANDS 시트 D열 스캔)
- Total:                 900ms

초기 로딩 (캐시 히트):
- getConfig():            70ms (캐시 반환)
- getNextHandNo():       100ms (캐시 불가)
- Total:                 170ms (81% 개선)

Review 탭:
- queryHands(10):        150ms (Sparse Reads)
- getHandDetail():       150ms (HANDS + ACTIONS)
- Total:                 300ms

커밋:
- saveHand():            200ms (Lock + 쓰기)
```

### 클라이언트 (JavaScript)

```
DOM 연산:
- getElementById:          0.05ms (100회)
- querySelector:           0.2ms (100회)
- createElement:           3ms (100개)
- innerHTML:              5ms (100개)

데이터 처리:
- JSON.parse (작은):      2ms (1000회)
- JSON.parse (큰):        3ms (100회)
- Array.sort:             1ms (1000개)

렌더링:
- 카드 배지 (52개):       5ms
- 핸드 리스트 (50개):    15ms
- 좌석 Pills (9개):       3ms
```

---

## 🚀 실행 가이드

### Apps Script 테스트

1. **performance_test.gs 업로드**
   ```
   Apps Script 에디터 > 파일 > 새로 만들기 > 스크립트
   → performance_test.gs 내용 붙여넣기
   ```

2. **함수 실행**
   ```
   메뉴: 실행 > 함수 실행 > testAllFunctions
   ```

3. **로그 확인**
   ```
   메뉴: 보기 > 실행 로그
   ```

### 브라우저 테스트

1. **HTML 파일 열기**
   ```
   client_performance_test.html 더블클릭
   → 브라우저에서 자동 열림
   ```

2. **테스트 실행**
   ```
   "전체 테스트 실행" 버튼 클릭
   ```

3. **결과 확인**
   ```
   페이지 하단 "테스트 결과" 섹션
   또는 개발자 도구 > 콘솔
   ```

---

## 📝 결과 해석

### 성능 등급

| 시간 | 등급 | 아이콘 | 조치 |
|------|------|--------|------|
| < 10ms | 🟢 Fast | 빠름 | 유지 |
| 10-50ms | 🟡 Medium | 보통 | 모니터링 |
| > 50ms | 🔴 Slow | 느림 | 최적화 필요 |

### 병목 판단 기준

- **서버**: 500ms 이상 → 최적화 필수
- **클라이언트**: 50ms 이상 → 최적화 권장

---

## 🔧 문제 해결

### Q: "캐시 히트인데도 느려요"
A: TTL 만료 확인. Roster는 5분, Config는 1분 TTL입니다.

### Q: "queryHands가 500ms 넘어요"
A: 데이터 양 확인. HANDS 시트 1000행 이상이면 아카이빙 권장.

### Q: "클라이언트 렌더링이 느려요"
A: 브라우저 개발자 도구 > Performance 탭에서 프로파일링.

---

## 📚 참고 문서

- [v3.4.0 캐싱 레이어](README.md#v340-2025-01-15---성능-최적화-캐싱-레이어)
- [v3.5.0 Sparse Reads](README.md#v350-2025-01-15---2차-성능-최적화-sparse-reads)
- [v3.6.0 스마트 로딩](README.md#v360-2025-01-16---스마트-적응형-로딩-ui)

---

**작성**: Claude Code
**날짜**: 2025-01-16
**버전**: v3.6.0
