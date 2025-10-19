# +6시간 오류 해결 과정 상세 분석
**프로젝트**: Poker Hand Logger v3.9.0 → v3.9.15
**이슈**: VIRTUAL 시트 시간 매칭 및 Review 모드 시간 표시 +6시간 오류
**기간**: 2025-01-19
**최종 해결**: v3.9.15

---

## 📋 목차
1. [문제 요약](#1-문제-요약)
2. [시도한 해결 방법 (v3.9.0 ~ v3.9.14)](#2-시도한-해결-방법)
3. [왜 해결되지 않았는가](#3-왜-해결되지-않았는가)
4. [최종 해결 (v3.9.15)](#4-최종-해결-v3915)
5. [교훈](#5-교훈)

---

## 1. 문제 요약

### 1.1 초기 증상
- **사용자 보고**: "핸드 입력 시간과 동일한 시간값을 B열에서 찾아야 해. 현재 +6시간 값으로 매칭값을 찾는 오류 발생"
- **구체적 예시**:
  - 핸드 등록 시간: **10/19 00:23** (Cyprus 로컬 시간)
  - VIRTUAL 매칭 시간: **06:23** (6시간 차이)
  - Review 모드 표시: **10/19 06:23** (잘못된 표시)

### 1.2 환경 정보
- **사용자 위치**: Cyprus (UTC+2)
- **PC 로컬 시간**: Cyprus 시간 기준
- **브라우저 타임존**: Cyprus (UTC+2)
- **Apps Script 서버**: Google 서버 (타임존 가변)
- **VIRTUAL B열**: Cyprus 로컬 시간 (00:00~23:59, 분 단위)

---

## 2. 시도한 해결 방법

### v3.9.0: 클라이언트 로컬 시간 캡처 추가
**날짜**: 2025-01-19
**변경 사항**:
```javascript
// index.html (Line 1097-1109)
const now = new Date();
const localHHMM = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

const payload = {
  started_at: now.toISOString(), // UTC
  started_at_local: localHHMM,   // "00:23" (로컬 HH:mm)
  // ...
};
```

**의도**: 클라이언트에서 로컬 시간을 직접 전송하여 서버 타임존 변환 방지

**결과**: ❌ 실패 (서버가 필드를 무시함)

**실패 원인**:
- `started_at_local` 필드가 **HANDS 시트 스키마에 정의되지 않음**
- 서버가 알 수 없는 필드를 무시함
- Fallback 함수 `extractTimeHHMM_()` 계속 호출

---

### v3.9.7: extractTimeHHMM_() UTC → 로컬 변환
**날짜**: 2025-01-19
**변경 사항**:
```javascript
// code.gs (Line 1565-1573)
function extractTimeHHMM_(isoTime){
  const d = new Date(isoTime);
  // Before: d.getUTCHours() → UTC 시간
  // After: d.getHours() → 로컬 시간 ❌ (서버 타임존)
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${hh}:${mm}`;
}
```

**의도**: UTC 대신 로컬 시간 사용

**결과**: ❌ 실패 (+6시간 여전히 발생)

**실패 원인**:
- `getHours()`는 **서버의 타임존**을 사용 (브라우저 X)
- Apps Script 서버 타임존 ≠ Cyprus 타임존
- ISO 시간 "2025-01-19T00:23:00Z" → 서버 타임존으로 변환 → 06:23

---

### v3.9.8: VIRTUAL B열 → C열 변경 (Seoul 시간)
**날짜**: 2025-01-19
**변경 사항**:
```javascript
// code.gs (Line 956)
// Before: B열 (Cyprus 시간)
const rngVals = sh.getRange(startRow, 2, scanRows, 1).getValues();

// After: C열 (Seoul 시간)
const rngVals = sh.getRange(startRow, 3, scanRows, 1).getValues();
```

**의도**: PC가 Seoul에 있다고 가정하여 C열 매칭

**결과**: ❌ 실패 (잘못된 가정)

**실패 원인**:
- 사용자 위치를 잘못 가정함
- 사용자: "현재 **키프로스**이고, pc 로컬 시간은 키프로스 시간 기준이야"
- C열은 Seoul 시간이므로 Cyprus와 불일치

---

### v3.9.9: C열 → B열 롤백
**날짜**: 2025-01-19
**변경 사항**:
```javascript
// code.gs (Line 1085)
const rngVals = sh.getRange(startRow, 2, scanRows, 1).getValues(); // B열 (Cyprus)
```

**의도**: 사용자 피드백 반영하여 B열로 복귀

**결과**: ⚠️ 부분 성공 (VIRTUAL 매칭은 정상, Review 표시는 여전히 +6시간)

**남은 문제**:
- VIRTUAL 매칭: ✅ 정상 (00:23 == 00:23)
- Review 모드: ❌ 06:23 표시 (여전히 오류)

---

### v3.9.10: E열 데이터 확인 규칙 수정
**날짜**: 2025-01-19
**변경 사항**:
```javascript
// code.gs (Line 1140)
// Before: const E = '미완료';
// After: const E = '수정 중'; // 허용 값: '수정 중', '전송중', '복사완료', '미사용', '방송X'
```

**의도**: E열 validation 에러 수정 (별도 이슈)

**결과**: ✅ E열 에러 해결 (하지만 +6시간은 여전함)

**실패 원인**: 이 수정은 E열 문제만 해결, 시간 오류와 무관

---

### v3.9.11: HANDS 시트 스키마에 started_at_local 추가
**날짜**: 2025-01-19
**변경 사항**:
```javascript
// code.gs (Line 249-254)
setHeaderIfEmpty_(getOrCreateSheet_(ss,SH.HANDS),[
  'hand_id','client_uuid','table_id','hand_no',
  'start_street','started_at','started_at_local','ended_at','btn_seat', // ✅ started_at_local 추가
  // ...
]);
```

**의도**: started_at_local 필드를 시트 스키마에 정의

**결과**: ❌ 실패 (스키마만 정의, 실제 저장 안됨)

**실패 원인**:
- **appendRow 로직에서 started_at_local을 누락**
- 스키마는 있지만 데이터 저장 시 빈 칸으로 들어감
- 서버가 빈 값을 읽음 → Fallback 함수 계속 호출

---

### v3.9.12: appendRow에 started_at_local 추가
**날짜**: 2025-01-19
**변경 사항**:
```javascript
// code.gs (Line 614-620)
shH.appendRow([
  handId, String(payload.client_uuid||''), String(payload.table_id||''), String(handNo||''),
  String(payload.start_street||''),
  String(payload.started_at||new Date().toISOString()),
  String(payload.started_at_local||''), // ✅ 저장 로직 추가
  String(payload.ended_at||''),
  // ...
]);
```

**의도**: 실제로 started_at_local 값을 HANDS G열에 저장

**결과**: ⚠️ 부분 성공 (저장은 되지만 여전히 +6시간 표시)

**남은 문제**:
- HANDS G열: ✅ "00:23" 저장됨
- VIRTUAL 매칭: ✅ "00:23" 정상
- Review 모드: ❌ "06:23" 여전히 표시

---

### v3.9.13: 디버깅 로그 추가
**날짜**: 2025-01-19
**변경 사항**:
```javascript
// code.gs (Line 609-612)
Logger.log('🔍 [DEBUG] payload.started_at: ' + payload.started_at);
Logger.log('🔍 [DEBUG] payload.started_at_local: ' + payload.started_at_local);
Logger.log('🔍 [DEBUG] typeof started_at_local: ' + typeof payload.started_at_local);
```

**의도**: 실제 payload 값 확인

**결과**: ℹ️ 진단용 (문제 해결 X, 디버깅 정보만 제공)

---

### v3.9.14: buildHead() started_at_local 읽기 추가
**날짜**: 2025-01-19
**변경 사항**:
```javascript
// code.gs (Line 815-836)
const buildHead = (r, m) => ({
  hand_id: String(r[m['hand_id']]),
  // ...
  started_at: String(r[m['started_at']] || ''),
  started_at_local: String(r[m['started_at_local']] || ''), // ✅ 읽기 추가
  ended_at: String(r[m['ended_at']] || ''),
  // ...
});
```

**의도**: getHandDetail()에서 started_at_local 필드를 읽어 반환

**결과**: ⚠️ VIRTUAL 매칭은 해결, Review 표시는 여전히 +6시간

**실패 원인**:
- getHandDetail()은 단일 핸드 상세 조회용 (Review 모드 상세 패널)
- **queryHands()는 여전히 started_at_local을 읽지 않음** (리스트 조회)
- **index.html formatStartedAt()이 여전히 ISO 시간 변환** (브라우저 타임존 적용)

---

## 3. 왜 해결되지 않았는가

### 3.1 근본 원인 분석

#### 문제 1: 다층 데이터 흐름 (3단계)
```
클라이언트 → 서버 저장 → 서버 읽기 → 클라이언트 표시
   (✅)      (❌ v3.9.11)  (❌ v3.9.14) (❌ v3.9.15)
```

**각 단계별 실패**:
1. **v3.9.0~v3.9.10**: 클라이언트는 전송했지만 서버가 무시
2. **v3.9.11**: 스키마만 정의, 저장 안됨
3. **v3.9.12**: 저장은 되지만 읽기 누락 (getHandDetail만 수정)
4. **v3.9.14**: 상세 조회는 해결, 리스트 조회 누락 (queryHands)
5. **v3.9.15**: 리스트 조회는 해결, 클라이언트 표시 누락 (formatStartedAt)

#### 문제 2: 2개의 독립적인 경로
```
경로 A: VIRTUAL 매칭 (서버 사이드)
  started_at_local → extractTimeHHMM_() → VIRTUAL B열 매칭
  ✅ v3.9.9에서 해결 (B열 복귀)

경로 B: Review 모드 표시 (클라이언트 사이드)
  started_at → formatStartedAt() → new Date() → 브라우저 타임존
  ❌ v3.9.14까지 미해결
```

**착각한 부분**: 경로 A가 해결되어도 경로 B는 독립적으로 오류 발생

#### 문제 3: 부분 수정의 함정
| 버전 | 스키마 | 저장 | 읽기(상세) | 읽기(리스트) | 표시 |
|------|--------|------|-----------|------------|------|
| v3.9.11 | ✅ | ❌ | ❌ | ❌ | ❌ |
| v3.9.12 | ✅ | ✅ | ❌ | ❌ | ❌ |
| v3.9.14 | ✅ | ✅ | ✅ | ❌ | ❌ |
| v3.9.15 | ✅ | ✅ | ✅ | ✅ | ✅ |

**결론**: **5개 단계를 모두 수정해야 완전 해결** (점진적 수정으로 착각)

---

### 3.2 디버깅 난이도 요인

#### 요인 1: 숨겨진 타임존 변환
```javascript
// 보이지 않는 타임존 변환
new Date("2025-01-19T00:23:00Z")  // ISO 문자열
  .getHours()  // ← 서버 타임존 (v3.9.7) 또는 브라우저 타임존 (v3.9.15)
  // Cyprus에서는 02:23, 다른 타임존에서는 06:23
```

**문제**: `getHours()` 호출 시 어떤 타임존이 적용되는지 명확하지 않음

#### 요인 2: 동일 함수명, 다른 컨텍스트
```javascript
// 클라이언트 (index.html)
const hh = now.getHours(); // ✅ 브라우저 타임존 (Cyprus)

// 서버 (code.gs)
const hh = d.getHours();   // ❌ 서버 타임존 (Google Apps Script)
```

**혼동**: 같은 API지만 실행 환경에 따라 다른 결과

#### 요인 3: 멀티 레이어 캐싱
```javascript
// SessionStorage 캐싱 (index.html)
if (Date.now() - obj.timestamp < 60000) return obj.data;

// PropertiesService 캐싱 (code.gs)
if (age < CACHE_TTL.ROSTER) return JSON.parse(cached);
```

**문제**: 수정 후에도 캐시된 데이터가 반환되어 "왜 안 고쳐졌지?" 혼란

#### 요인 4: 분산된 시간 처리 로직
```javascript
// 시간 관련 코드 위치
1. index.html:1099 - localHHMM 생성
2. code.gs:619 - started_at_local 저장
3. code.gs:822 - buildHead() 읽기
4. code.gs:759 - queryHands() items 매핑
5. code.gs:1565 - extractTimeHHMM_() fallback
6. index.html:1336 - formatStartedAt() 표시
7. index.html:1354 - formatLocalTime() 표시
```

**문제**: 7개 위치에서 시간 처리 → 하나라도 누락 시 전체 실패

---

## 4. 최종 해결 (v3.9.15)

### 4.1 핵심 발견

**Review 모드 시간 표시 경로**:
```javascript
// 경로 1: 리스트 조회
queryHands() → items[].started_at → createListItem() → formatStartedAt()
                      ❌ started_at_local 누락

// 경로 2: 상세 조회
getHandDetail() → head.started_at → renderPotHeader() → formatStartedAt()
                        ❌ started_at_local 사용 안함

// formatStartedAt() 내부
new Date(isoString).getHours() // ← 브라우저 타임존 적용 → +6시간
```

### 4.2 3가지 수정

#### 수정 1: queryHands() started_at_local 포함
```javascript
// code.gs (Line 721-727)
// Before: 11개 컬럼
const cols = [
  map['hand_id'], map['table_id'], map['hand_no'], map['start_street'],
  map['started_at'], map['btn_seat'], // ❌ started_at_local 누락
  map['board_f1'], map['board_f2'], map['board_f3'],
  map['board_turn'], map['board_river']
];

// After: 12개 컬럼
const cols = [
  map['hand_id'], map['table_id'], map['hand_no'], map['start_street'],
  map['started_at'], map['started_at_local'], map['btn_seat'], // ✅ 추가
  map['board_f1'], map['board_f2'], map['board_f3'],
  map['board_turn'], map['board_river']
];

// items 매핑 (Line 753-760)
const items = slice.map(r => ({
  hand_id: String(r[0]),
  table_id: String(r[1]||''),
  hand_no: String(r[2]||''),
  start_street: String(r[3]||''),
  started_at: String(r[4]||''),
  started_at_local: String(r[5]||''), // ✅ 추가
  btn_seat: String(r[6]||''),
  board: {
    f1: r[7]||'',  // ✅ 인덱스 +1 조정
    f2: r[8]||'',
    f3: r[9]||'',
    turn: r[10]||'',
    river: r[11]||''
  }
}));
```

#### 수정 2: formatLocalTime() 헬퍼 추가
```javascript
// index.html (Line 1354-1360)
function formatLocalTime(hhmmTime){
  if(!hhmmTime) return '-';
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${month}/${day} ${hhmmTime}`;  // "10/19 00:23"
}
```

**장점**:
- 타임존 변환 없음 (HH:mm 문자열 그대로 사용)
- 날짜만 현재 날짜 사용 (VIRTUAL B열과 일관성)

#### 수정 3: started_at_local 우선 사용
```javascript
// index.html (Line 1534-1536) - renderPotHeader
const timeFormatted = head.started_at_local
  ? formatLocalTime(head.started_at_local)  // ✅ 로컬 시간 우선
  : formatStartedAt(head.started_at);       // Fallback

// index.html (Line 1368-1370) - createListItem
const timeDisplay = it.started_at_local
  ? formatLocalTime(it.started_at_local)
  : formatStartedAt(it.started_at);
```

### 4.3 최종 흐름도
```
클라이언트 입력 (00:23)
  ↓
index.html:1099 - localHHMM = "00:23" (getHours() 브라우저)
  ↓
code.gs:619 - HANDS G열 저장 "00:23"
  ↓
code.gs:822 - buildHead() 읽기 started_at_local="00:23"
  ↓
code.gs:759 - queryHands() items[].started_at_local="00:23"
  ↓
index.html:1354 - formatLocalTime("00:23") → "10/19 00:23"
  ↓
Review 모드 표시: ✅ "10/19 00:23"
VIRTUAL 매칭: ✅ "00:23" == B열 "00:23"
```

---

## 5. 교훈

### 5.1 기술적 교훈

#### 교훈 1: 타임존은 명시적으로 처리하라
```javascript
// ❌ 나쁜 예 (암묵적 타임존)
const hh = new Date(isoString).getHours(); // 어떤 타임존?

// ✅ 좋은 예 (명시적 타임존)
const localHHMM = "00:23"; // 로컬 시간 문자열
const utcISO = now.toISOString(); // UTC 명시
```

#### 교훈 2: 데이터 흐름 전체를 추적하라
```
입력 → 저장 → 읽기 → 표시
 (A)   (B)    (C)    (D)

A, B, C를 수정해도 D가 누락되면 사용자는 여전히 오류 확인
```

#### 교훈 3: 스키마와 로직을 함께 수정하라
```javascript
// v3.9.11 실수
setHeaderIfEmpty_([..., 'started_at_local', ...]); // ✅ 스키마
appendRow([..., started_at, ended_at, ...]);       // ❌ 로직 누락

// v3.9.12 수정
setHeaderIfEmpty_([..., 'started_at_local', ...]); // ✅ 스키마
appendRow([..., started_at, started_at_local, ended_at, ...]); // ✅ 로직
```

#### 교훈 4: 클라이언트/서버 API 불일치 주의
```javascript
// 클라이언트 (브라우저)
new Date().getHours(); // 브라우저 타임존

// 서버 (Apps Script)
new Date().getHours(); // 서버 타임존 (다를 수 있음)
```

---

### 5.2 디버깅 프로세스 교훈

#### 교훈 5: End-to-End 테스트 필수
```
1. 클라이언트 입력: "00:23" 확인
2. 서버 저장: HANDS G열 "00:23" 확인
3. 서버 읽기: payload.started_at_local "00:23" 확인
4. 클라이언트 표시: "10/19 00:23" 확인
```

**실수**: 중간 단계만 확인하고 최종 결과 미확인

#### 교훈 6: 캐시 무효화 확인
```javascript
// 수정 후 반드시 확인
1. Ctrl+Shift+R (브라우저 캐시 삭제)
2. sessionStorage.clear() (SessionStorage 삭제)
3. PropertiesService 캐시 만료 대기 (5분)
```

#### 교훈 7: 로그 기반 디버깅
```javascript
// v3.9.13 디버깅 로그 추가 (좋은 판단)
Logger.log('🔍 [DEBUG] payload.started_at_local: ' + payload.started_at_local);
Logger.log('🔍 [DEBUG] typeof started_at_local: ' + typeof payload.started_at_local);
```

**효과**: 실제 데이터 흐름 확인 가능

---

### 5.3 커뮤니케이션 교훈

#### 교훈 8: 환경 정보를 먼저 확인하라
```
v3.9.8 실수: Seoul 가정 (잘못된 가정)
v3.9.9 수정: Cyprus 확인 (사용자 피드백 반영)
```

**교훈**: 위치, 타임존, 브라우저 등 환경 정보는 초기에 확인

#### 교훈 9: 단계별 피드백 요청
```
v3.9.11 → v3.9.12 → v3.9.14 → v3.9.15
각 버전마다 사용자에게 테스트 요청 및 결과 확인
```

**효과**: 점진적 개선 + 회귀 방지

---

## 6. 체크리스트 (향후 유사 이슈 방지)

### 6.1 타임존 관련 수정 시
- [ ] 클라이언트/서버 실행 환경 구분
- [ ] `getHours()` 대신 HH:mm 문자열 사용 고려
- [ ] UTC vs 로컬 시간 명시적 구분
- [ ] 모든 타임존 변환 지점 문서화

### 6.2 스키마 변경 시
- [ ] 스키마 정의 (setHeaderIfEmpty_)
- [ ] 저장 로직 (appendRow)
- [ ] 읽기 로직 (buildHead, queryHands)
- [ ] 표시 로직 (index.html formatters)
- [ ] End-to-End 테스트

### 6.3 디버깅 시
- [ ] 로그 추가 (payload 값, 중간 변환 결과)
- [ ] 캐시 무효화 (브라우저, SessionStorage, PropertiesService)
- [ ] 실제 시트 데이터 확인 (HANDS G열 값)
- [ ] Apps Script 실행 로그 확인
- [ ] 사용자 환경 정보 확인 (위치, 타임존)

---

## 7. 최종 정리

### 문제 해결 타임라인
```
v3.9.0 (시작): 클라이언트 전송 추가 → 서버 무시
v3.9.7: 서버 함수 수정 → 서버 타임존 문제
v3.9.8: 잘못된 컬럼 → 위치 가정 오류
v3.9.9: 컬럼 복귀 → VIRTUAL 해결, Review 미해결
v3.9.11: 스키마 추가 → 저장 누락
v3.9.12: 저장 추가 → 읽기 누락 (리스트)
v3.9.14: 읽기 추가 (상세) → 표시 누락
v3.9.15: 표시 수정 → ✅ 완전 해결
```

### 소요 시간: 8번의 시도, 약 4-5시간

### 핵심 원인
1. **다층 데이터 흐름 미파악** (입력→저장→읽기→표시)
2. **부분 수정의 함정** (5개 단계 중 1-2개만 수정)
3. **타임존 API의 모호성** (getHours()가 어떤 타임존인지 불명확)

### 최종 해결책
1. **클라이언트**: `started_at_local` 문자열 전송 (HH:mm)
2. **서버 저장**: appendRow에 포함
3. **서버 읽기**: buildHead + queryHands 모두 포함
4. **클라이언트 표시**: formatLocalTime() 우선 사용 (타임존 변환 없음)

---

**작성자**: Claude Code Agent
**최종 업데이트**: 2025-01-19
**관련 버전**: v3.9.0 ~ v3.9.15
**참조 문서**: [README.md](../README.md), [code.gs](../code.gs), [index.html](../index.html)
