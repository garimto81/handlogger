# LLD (Low Level Design)
# Soft Content Sender - 기술 설계서

## 📋 문서 정보
- **작성일**: 2025-10-04
- **최종 수정**: 2025-10-05
- **버전**: v10.1
- **대상 독자**: 개발자, 시스템 관리자

---

## 1. 시스템 아키텍처

### 1.1 전체 구조도

```
┌─────────────────────────────────────────────────────────┐
│                  사용자 (브라우저)                        │
│  - 모바일 / 태블릿 / 데스크톱                             │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTPS
                   ↓
┌─────────────────────────────────────────────────────────┐
│          Google Apps Script Web App                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  softsender.gs (HTML + JavaScript)              │   │
│  │  - 사용자 인터페이스                             │   │
│  │  - 클라이언트 로직                               │   │
│  └──────────────────┬──────────────────────────────┘   │
│                     │ google.script.run (RPC)           │
│  ┌──────────────────↓──────────────────────────────┐   │
│  │  softsender_code.gs (서버 로직)                 │   │
│  │  - API 함수들                                    │   │
│  │  - 비즈니스 로직                                 │   │
│  └──────────────────┬──────────────────────────────┘   │
└────────────────────┼──────────────────────────────────┘
                     │ SpreadsheetApp API
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Google Sheets (데이터베이스)                │
│  ┌─────────────────┐    ┌──────────────────────────┐   │
│  │  CUE Sheet      │    │  TYPE Sheet              │   │
│  │  - virtual 탭   │    │  - Type 탭               │   │
│  │  (방송 큐시트)   │    │  - CountryMap 탭         │   │
│  └─────────────────┘    └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 계층 구조

| 계층 | 역할 | 기술 |
|------|------|------|
| **Presentation** | UI/UX, 사용자 입력 처리 | HTML5, CSS3, Vanilla JS |
| **Application** | 비즈니스 로직, API | Google Apps Script (JavaScript) |
| **Data** | 데이터 저장 및 조회 | Google Sheets |

---

## 2. 데이터베이스 설계

### 2.1 CUE Sheet - `virtual` 탭

#### 컬럼 구조
| 컬럼 | 예시 값 | 설명 |
|------|---------|------|
| A | (미사용) | - |
| B | (미사용) | - |
| **C** | `17:42` 또는 `17:42:30` | 시간 (HH:mm 또는 HH:mm:ss) |
| D | (미사용) | - |
| **E** | `미완료` / `완료` | 작업 상태 |
| **F** | `1742_John_Doe_PU` | 파일명 |
| **G** | `SOFT` | 콘텐츠 타입 (고정값) |
| H | (미사용) | - |
| I | (미사용) | - |
| **J** | `UNITED STATES...\nJOHN DOE\n...` | 자막 내용 (append) |

#### 데이터 예시
```
C열(시간) | E열(상태) | F열(파일명)           | G열(타입) | J열(자막 내용)
17:42     | 미완료    | 1742_John_Doe_PU     | SOFT      | UNITED STATES OF AMERICA
          |          |                       |           | JOHN DOE
          |          |                       |           | CURRENT STACK - 1,234,000 (62BB)
          |          |                       |           |
          |          |                       |           | SOUTH KOREA
          |          |                       |           | KIM MINSU
          |          |                       |           | ELIMINATED
```

#### 행 선택 로직
1. 사용자가 시간 선택 (예: `17:42`)
2. C열에서 일치하는 행 찾기
   - `17:42` (정확히 일치) ✅
   - `17:42:30` (HH:mm 부분만 비교) ✅
3. 해당 행에 데이터 업데이트

### 2.2 TYPE Sheet - `Type` 탭

#### 컬럼 구조
| 컬럼명 | 데이터 타입 | 예시 | 설명 |
|--------|------------|------|------|
| **Poker Room** | String | `PokerStars` | 포커룸 이름 |
| **Table Name** | String | `Final Table` | 테이블 이름 |
| **Table No.** | String/Number | `7` | 테이블 번호 |
| **Seat No.** | String | `#1` | 좌석 번호 |
| **Players** | String | `John Doe` | 플레이어 이름 |
| **Nationality** | String | `US` | 국가 코드 (2자리) |

#### 데이터 예시
```
Poker Room | Table Name  | Table No. | Seat No. | Players    | Nationality
PokerStars | Final Table | 7         | #1       | John Doe   | US
PokerStars | Final Table | 7         | #2       | Kim Minsu  | KR
PokerStars | Final Table | 7         | #3       | Lee Hyun   | KR
```

### 2.3 국가 코드 처리 (v9 변경)

**Type 탭의 Nationality 컬럼**에 있는 2자리 국가 코드(US, KR 등)를 **그대로 사용**합니다.

#### 변경 사항 (v9)
- ❌ CountryMap 탭 제거됨
- ❌ `getCountryMap()` 함수 삭제됨
- ✅ 2자리 국가 코드 직접 출력 (US, KR, JP 등)

---

## 3. API 설계

### 3.1 서버 함수 (softsender_code.gs)

#### 📌 `doGet()`
- **목적**: 웹 앱 진입점
- **반환**: HTML 페이지
- **동작**:
  1. `page`라는 이름의 HTML 템플릿 로드
  2. 타이틀 설정: "Soft Content Sender"
  3. iframe 허용 설정
  4. HTML 반환

#### 📌 `getBootstrap()`
- **목적**: 초기 설정 정보 제공
- **반환**:
  ```javascript
  {
    cueId: "13LpVWYHaJAM...",  // CUE Sheet ID
    typeId: "1J-lf8bYTLPb...", // TYPE Sheet ID
    tz: "Asia/Seoul"           // 타임존
  }
  ```

#### 📌 `getTypeRows(typeIdOverride)`
- **목적**: Type 탭에서 플레이어 정보 읽기
- **파라미터**:
  - `typeIdOverride` (선택): 사용자가 입력한 Sheet ID (없으면 기본값 사용)
- **반환**:
  ```javascript
  {
    ok: true,
    headers: ["Poker Room", "Table Name", ...],
    rows: [
      {
        room: "PokerStars",
        tname: "Final Table",
        tno: "7",
        seat: "#1",
        player: "John Doe",
        nat: "US"
      },
      ...
    ],
    typeId: "1J-lf8bYTLPb..."
  }
  ```
- **에러 시**:
  ```javascript
  {
    ok: false,
    error: "SHEET_NOT_FOUND:Type"
  }
  ```

#### 📌 ~~`getCountryMap(typeIdOverride)`~~ (v9에서 삭제됨)
- **삭제 사유**: 2자리 국가 코드를 그대로 사용하므로 불필요

#### 📌 `getTimeOptions(cueIdOverride)`
- **목적**: virtual 탭의 C열에서 ±20분 범위 시간 목록 추출
- **파라미터**: `cueIdOverride` (선택)
- **동작**:
  1. 현재 KST 시각 가져오기 (예: `17:42`)
  2. C열 전체 읽기
  3. `HH:mm` 형식만 필터링
  4. 현재 시각 ±20분 범위만 추출
  5. 중복 제거 + 시간순 정렬
- **반환**:
  ```javascript
  {
    ok: true,
    list: ["17:22", "17:30", "17:42", "17:55", "18:02"],
    center: "17:42",  // 현재 시각
    cueId: "13LpVWYH..."
  }
  ```

#### 📌 `buildFileName(kind, hhmm, tableNo, playerOrLabel)`
- **목적**: 파일명 자동 생성
- **파라미터**:
  - `kind`: 모드 (`PU`, `ELIM`, `L3`, `LEADERBOARD`, `BATCH`, 기타 → `SC`)
  - `hhmm`: 시간 4자리 (예: `1742`)
  - `tableNo`: 테이블 번호
  - `playerOrLabel`: 플레이어 이름 또는 테이블 레이블
- **로직**:
  - 특수문자/공백 → 언더스코어 변환
  - LEADERBOARD는 테이블 레이블 사용, 나머지는 플레이어 이름 사용
  - BATCH 모드 지원 (v10 추가)
- **반환 예시**:
  - `1742_John_Doe_PU`
  - `1742_Table7_LEADERBOARD`
  - `1742_Batch_3items` (v10)

#### 📌 `updateVirtual(payload)`
- **목적**: virtual 탭 업데이트 (핵심 함수)
- **파라미터**:
  ```javascript
  {
    cueId: "13LpVWYH...",    // CUE Sheet ID (선택)
    autoNow: true,            // 현재 시각 자동 선택 여부
    pickedTime: "17:42",      // 수동 선택 시간 (autoNow=false일 때)
    tz: "Asia/Seoul",         // 타임존
    kind: "PU",               // 모드
    eFix: "미완료",           // E열 값 (기본: "미완료")
    gFix: "SOFT",             // G열 값 (기본: "SOFT")
    filename: "1742_John_Doe_PU",  // F열 파일명
    jBlock: "UNITED STATES...\n..." // J열에 append할 내용
  }
  ```
- **동작 순서**:
  1. **행 찾기**:
     - `autoNow=true` → 현재 KST 시각(HH:mm) 사용
     - `autoNow=false` → `pickedTime` 사용
     - C열에서 일치하는 행 검색
  2. **J열 append**:
     - 기존 내용 읽기
     - 빈 줄 추가 (기존 내용이 있으면)
     - 새 내용 추가
  3. **E, F, G열 업데이트**:
     - E열: `미완료`
     - F열: 파일명
     - G열: `SOFT`
- **반환**:
  ```javascript
  {
    ok: true,
    row: 5,        // 업데이트된 행 번호
    time: "17:42"  // 매칭된 시간
  }
  ```
- **에러 예시**:
  ```javascript
  {
    ok: false,
    error: "NO_MATCH_TIME:17:42"  // 해당 시간 행 없음
  }
  ```

---

## 4. 클라이언트 로직 (softsender.gs)

### 4.1 전역 상태 (State)

```javascript
const state = {
  mode: 'ELIM',           // 현재 모드 (PU/ELIM/L3/LEADERBOARD)
  tz: 'Asia/Seoul',       // 타임존
  typeRows: [],           // Type 탭 전체 데이터
  byRoom: {},             // Room별 인덱스
  byRoomTable: {},        // Room+Table별 인덱스
  tableList: [],          // v9: Room+Table 통합 목록
  timeCenter: '',         // 현재 시각
  cueId: '',              // CUE Sheet ID (localStorage)
  typeId: '',             // TYPE Sheet ID (localStorage)
  batch: []               // v10: 배치 전송용 배열
};
```

### 4.2 데이터 인덱싱

#### `indexTypeRows(rows)`
- **목적**: 빠른 검색을 위한 인덱스 생성
- **입력**: Type 탭 전체 행 배열
- **출력**:
  ```javascript
  state.byRoom = {
    "PokerStars": [
      { room: "PokerStars", tname: "...", tno: "7", seat: "#1", ... },
      { room: "PokerStars", tname: "...", tno: "7", seat: "#2", ... },
      ...
    ],
    "888poker": [...]
  };

  state.byRoomTable = {
    "PokerStars|7": [
      { room: "PokerStars", tno: "7", seat: "#1", ... },
      { room: "PokerStars", tno: "7", seat: "#2", ... }
    ],
    "PokerStars|8": [...]
  };
  ```

### 4.3 UI 업데이트 플로우

#### Room 선택 → Table 필터링 → Seat 필터링
```
사용자가 Room 선택
    ↓
fillTables()
    ↓
byRoom[선택된 Room]에서 고유한 Table No. 추출
    ↓
selTableNo 드롭다운 갱신
    ↓
fillSeats()
    ↓
byRoomTable[Room|Table]에서 Seat No. 추출
    ↓
selSeat 드롭다운 갱신
    ↓
applyPickFromSeat()
    ↓
선택된 Seat의 플레이어 정보 자동 입력
    ↓
rebuildPreview()  // 미리보기 갱신
rebuildFileName() // 파일명 갱신
```

### 4.4 모드별 미리보기 생성

#### PU (Player Update)
```javascript
function rebuildPreview() {
  const country = (countryFull 입력값).toUpperCase();
  const name = (playerName 입력값).toUpperCase();
  const amt = (stackAmt 입력값);  // 예: 1,234,000
  const bb = (stackBB 계산값);    // 예: 62

  return `${country}\n${name}\nCURRENT STACK - ${amt} (${bb}BB)`;
}
```

#### ELIM (Elimination) - v9 업데이트
```javascript
const country = (player.nat).toUpperCase();  // 2자리 코드 그대로
const name = (playerName).toUpperCase();

// 상금 없음
if (selPrize.value === '') {
  return `${name} / ${country}\nELIMINATED`;
}

// 상금 있음
const place = prizePlace.value;    // 예: "5"
const amount = prizeAmount.value;  // 예: "10000"
return `${name} / ${country}\nELIMINATED IN ${place}TH PLACE ($${amount})`;
```

**출력 예시:**
- 상금 없음: `JOHN DOE / US\nELIMINATED`
- 상금 있음: `JOHN DOE / US\nELIMINATED IN 5TH PLACE ($10000)`

#### L3 (Lower Third)
```javascript
const name = (playerName).toUpperCase();
return `프로필 자막\n${name}`;
```

#### LEADERBOARD
```javascript
// 1. 플레이어별 칩스택 수집
const rows = [];
document.querySelectorAll('#lbList .lb-row').forEach(r => {
  const name = r.querySelector('.lbName').value;
  const amt = r.querySelector('.lbAmt').value;  // 예: "4,190,000"
  const chips = parseIntClean(amt);
  if (chips > 0) rows.push({ name, amt: comma(chips) });
});

// 2. 칩스택 내림차순 정렬
rows.sort((a,b) => parseInt(b.amt.replace(/,/g,'')) - parseInt(a.amt.replace(/,/g,'')));

// 3. 이름 변환: "John Doe" → "J. DOE"
const lines = rows.map(o =>
  `${nameToInitialLastUpper(o.name)}    ${o.amt}`.toUpperCase()
);

// 4. 푸터 생성
const footer = `LV ${level} | BLINDS ${formatKM(sb)} / ${formatKM(bb)} - ${formatKM(ante)}`;
// 예: "LV 15 | BLINDS 25K / 50K - 50K"

return lines.join('\n') + '\n\n' + footer;
```

### 4.5 숫자 포맷팅 유틸리티

#### `parseIntClean(s)`
- **목적**: 숫자 외 문자 제거 후 정수 변환
- **예시**:
  - `"1,234,000"` → `1234000`
  - `"50K"` → `50` (K는 제거됨, 주의!)

#### `comma(n)`
- **목적**: 천 단위 콤마 추가
- **예시**: `1234000` → `"1,234,000"`

#### `formatKM(nStr)`
- **목적**: K/M 단위 변환 (블라인드 표시용)
- **로직**:
  ```javascript
  if (n >= 1,000,000) {
    return (n / 1,000,000).toFixed(2).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1') + 'M';
  } else {
    return (n / 1,000).toFixed(2).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1') + 'K';
  }
  ```
- **예시**:
  - `25000` → `"25K"`
  - `50000` → `"50K"`
  - `2000000` → `"2M"`
  - `2500000` → `"2.5M"`

#### `nameToInitialLastUpper(full)`
- **목적**: 이름을 "이니셜. 성(대문자)" 형식으로 변환
- **로직**:
  ```javascript
  const parts = full.trim().split(/\s+/);  // 공백으로 분리
  const initial = parts[0][0].toUpperCase() + '.';
  const last = parts.slice(1).join(' ').toUpperCase();
  return last ? `${initial} ${last}` : initial;
  ```
- **예시**:
  - `"John Doe"` → `"J. DOE"`
  - `"Kim Min Su"` → `"K. MIN SU"`
  - `"Alice"` → `"A."`

---

## 5. 데이터 플로우 다이어그램

### 5.1 초기 로딩 (v9 업데이트)

```
1. 페이지 로드
   ↓
2. init() 호출
   ↓
3. getBootstrap() → 기본 Sheet ID, TZ 받기
   ↓
4. loadIdsFromLocal() → localStorage에서 사용자 지정 ID 로드
   ↓
5. reloadSheets()
   ├─ getTimeOptions() → 시간 목록 로드
   └─ getTypeRows() → 플레이어 정보 로드
   ↓
6. indexTypeRows() → 인덱스 생성 (byRoomTable, tableList)
   ↓
7. fillRoomTables() → Room+Table 통합 드롭다운 채우기 (v9)
   ↓
8. fillSeats() → Seat 드롭다운 채우기 ("#1 - John Doe" 형식)
   ↓
9. 사용 준비 완료
```

### 5.2 전송 플로우

```
1. 사용자가 "전송" 버튼 클릭
   ↓
2. send() 함수 호출
   ↓
3. 유효성 검사
   ├─ 미리보기 비어있는지?
   ├─ 파일명 비어있는지?
   ├─ 모드별 필수 입력 확인
   │  ├─ PU: 칩스택, 빅블 입력?
   │  ├─ ELIM: 상금 유/무 선택?
   │  └─ LEADERBOARD: 레벨, SB/BB/ANTE, 칩스택 입력?
   └─ 실패 시 → 토스트 에러 메시지
   ↓
4. payload 객체 생성
   ↓
5. updateVirtual(payload) 호출 (서버)
   ↓
6. 서버에서 처리
   ├─ 시간 매칭 행 찾기
   ├─ J열 기존 내용 읽기
   ├─ 새 내용 append
   └─ E, F, G열 업데이트
   ↓
7. 결과 반환
   ├─ 성공 → 토스트 "행 5(17:42) 갱신 완료"
   └─ 실패 → 토스트 "실패: NO_MATCH_TIME:17:42"
```

---

## 6. 에러 처리

### 6.1 서버 에러 코드

| 코드 | 의미 | 해결 방법 |
|------|------|----------|
| `SHEET_NOT_FOUND:virtual` | CUE Sheet에 virtual 탭 없음 | Sheet ID 확인 또는 탭 생성 |
| `SHEET_NOT_FOUND:Type` | TYPE Sheet에 Type 탭 없음 | Sheet ID 확인 또는 탭 생성 |
| `BAD_HEADERS` | 필수 컬럼 누락 | 컬럼명 확인 (대소문자 무시) |
| `BAD_PAYLOAD` | payload 객체 잘못됨 | kind 필드 확인 |
| `EMPTY_VIRTUAL` | virtual 탭에 데이터 없음 | 최소 2행 이상 필요 |
| `TIME_FORMAT` | 시간 형식 오류 | HH:mm 형식 확인 |
| `NO_MATCH_TIME:17:42` | 해당 시간 행 없음 | C열에 해당 시간 추가 |
| `EMPTY_FILENAME` | 파일명 비어있음 | 파일명 입력 |
| `EMPTY_JBLOCK` | 자막 내용 비어있음 | 미리보기 내용 확인 |

### 6.2 클라이언트 에러 처리

```javascript
try {
  // 서버 호출
  google.script.run
    .withSuccessHandler(res => {
      if (!res?.ok) {
        toast('실패: ' + (res?.error || 'unknown'), false);
        setStatus('에러');
        return;
      }
      toast(`행 ${res.row}(${res.time}) 갱신 완료`);
      setStatus('준비됨');
    })
    .withFailureHandler(err => {
      toast('서버 오류: ' + (err?.message || err), false);
      setStatus('에러');
    })
    .updateVirtual(payload);
} catch (e) {
  toast('예외 발생: ' + e.message, false);
}
```

---

## 7. 성능 최적화

### 7.1 클라이언트

#### 1) 이벤트 리스너 최소화
- 입력 필드: `input` 이벤트 → 디바운싱 없이 즉시 반영 (UX 우선)
- 드롭다운: `change` 이벤트만 사용

#### 2) DOM 조작 최소화
- `innerHTML` 사용 시 전체 재생성 (필요할 때만)
- 텍스트 변경은 `textContent` 사용

#### 3) 데이터 캐싱
- `state` 객체에 모든 데이터 저장
- 서버 호출 최소화 (초기 로딩 후 재사용)

### 7.2 서버

#### 1) 범위 읽기 최적화
```javascript
// 전체 읽기 (느림)
const values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();

// 필요한 컬럼만 읽기 (빠름)
const colC = sh.getRange(2, 3, last - 1, 1).getDisplayValues().flat();
```

#### 2) Batch 업데이트
```javascript
// 개별 업데이트 (느림)
sh.getRange(row, 5).setValue(eVal);
sh.getRange(row, 6).setValue(fVal);
sh.getRange(row, 7).setValue(gVal);

// Batch 업데이트 (빠름, 필요시 사용)
sh.getRange(row, 5, 1, 3).setValues([[eVal, fVal, gVal]]);
```

---

## 8. 보안 고려사항

### 8.1 접근 제어
- **Web App 배포 설정**: "나만 사용" 또는 "조직 내"
- **Sheet 권한**: 편집 권한 있는 사용자만 사용 가능

### 8.2 입력 검증
```javascript
// 서버 측 검증
if (!payload || !payload.kind) return { ok: false, error: 'BAD_PAYLOAD' };
if (!/^\d{2}:\d{2}$/.test(pickedStr)) throw new Error('TIME_FORMAT');
if (!fVal) throw new Error('EMPTY_FILENAME');
```

### 8.3 XSS 방지
- 사용자 입력을 그대로 HTML에 삽입하지 않음
- `textContent` 사용 (innerHTML 최소화)
- Sheet에 저장되는 데이터는 텍스트로만 처리

---

## 9. 테스트 시나리오

### 9.1 기본 흐름 테스트

#### TC-001: PU 모드 전송
1. 웹 앱 접속
2. PU 탭 선택
3. Room: PokerStars, Table: 7, Seat: #1 선택
4. 칩스택: 1,234,000, Big Blind: 20,000 입력
5. 미리보기 확인:
   ```
   UNITED STATES OF AMERICA
   JOHN DOE
   CURRENT STACK - 1,234,000 (62BB)
   ```
6. 전송 버튼 클릭
7. 성공 메시지 확인
8. Sheet의 해당 행 확인

#### TC-002: LEADERBOARD 모드 전송
1. LEADERBOARD 탭 선택
2. Room, Table 선택
3. Level: 15, SB: 25000, BB: 50000, ANTE: 50000 입력
4. 각 플레이어별 칩스택 입력
5. 미리보기 확인 (정렬 순서, K/M 변환)
6. 전송 버튼 클릭
7. 성공 확인

### 9.2 에러 처리 테스트

#### TC-003: 잘못된 Sheet ID
1. 존재하지 않는 Sheet ID 입력
2. ID 저장 버튼 클릭
3. 에러 메시지 확인: "시트 정보 로딩 실패"

#### TC-004: 필수 입력 누락
1. PU 모드 선택
2. 칩스택 입력 없이 전송
3. 에러 메시지 확인: "칩스택/빅블을 입력하세요."

---

## 10. 배포 가이드

### 10.1 초기 설정

#### 1) Google Apps Script 프로젝트 생성
1. https://script.google.com 접속
2. 새 프로젝트 생성
3. `softsender_code.gs` 파일 생성 → 서버 코드 붙여넣기
4. `softsender.gs` 파일 생성 (HTML) → 클라이언트 코드 붙여넣기
   - 파일명을 `page.html`로 변경 (중요!)

#### 2) 설정 값 수정
`softsender_code.gs` 파일 상단 CFG 객체:
```javascript
const CFG = {
  CUE_SHEET_ID: '여기에_CUE_Sheet_ID',
  TYPE_SHEET_ID: '여기에_TYPE_Sheet_ID',
  ...
};
```

#### 3) 배포
1. "배포" → "새 배포" 클릭
2. 유형: "웹 앱"
3. 실행 권한: "나"
4. 액세스 권한: "나만" 또는 "조직 내 모든 사용자"
5. 배포 → URL 복사

### 10.2 Sheet 준비

#### CUE Sheet
1. `virtual` 탭 생성
2. C열에 시간 값 입력 (예: 17:00, 17:30, 18:00)
3. 최소 2행 이상 데이터 필요

#### TYPE Sheet
1. `Type` 탭 생성
2. 헤더: `Poker Room`, `Table Name`, `Table No.`, `Seat No.`, `Players`, `Nationality`
3. 데이터 입력
4. `CountryMap` 탭 생성 (선택)
5. 헤더: `Code`, `Name`
6. 국가 코드-풀네임 매핑 입력

---

## 11. 유지보수

### 11.1 로그 확인
```javascript
// 서버 로그
Logger.log('디버그 정보: ' + JSON.stringify(data));

// 클라이언트 로그
console.log('디버그:', state);
```

### 11.2 버전 관리
- `softsender_code.gs` 상단 주석에 버전 명시
- 주요 변경사항 기록

### 11.3 백업
- Google Apps Script: "버전" 메뉴에서 버전 생성
- 로컬 저장: clasp (CLI 도구) 사용 권장

---

## 12. v10 배치 전송 기능

### 12.1 개요
여러 플레이어 정보를 한 번에 처리하는 기능입니다. 각 플레이어별로 다른 모드를 선택할 수 있으며, 한 번의 서버 호출로 모든 데이터를 전송합니다.

### 12.2 데이터 구조
```javascript
state.batch = [
  {
    mode: 'PU',
    player: 'John Doe',
    seat: '#1',
    nat: 'US',
    content: 'JOHN DOE / US\nCURRENT STACK - 1,234,000 (62BB)'
  },
  {
    mode: 'ELIM',
    player: 'Kim Minsu',
    seat: '#2',
    nat: 'KR',
    content: 'KIM MINSU / KR\nELIMINATED'
  }
];
```

### 12.3 핵심 함수

#### `addToBatch()`
- **목적**: 현재 입력된 플레이어 정보를 배치에 추가
- **동작**:
  1. 현재 미리보기 내용 가져오기
  2. `state.batch` 배열에 추가
  3. `renderBatchList()` 호출하여 UI 갱신
  4. `moveToNextSeat()` 호출하여 다음 좌석으로 이동

#### `sendBatch()`
- **목적**: 배치 전체를 한 번에 전송
- **동작**:
  1. `state.batch`의 모든 content를 `\n\n`로 결합
  2. `updateVirtual()` 호출 (kind: 'BATCH')
  3. 성공 시 `state.batch = []` 초기화

#### `updateSendButton()`
- **목적**: 전송 버튼 텍스트를 배치 상태에 따라 변경
- **로직**:
  ```javascript
  if (state.batch.length > 0) {
    btnSend.innerHTML = `📤 배치 전송 (${state.batch.length}건)`;
  } else {
    btnSend.innerHTML = '전송';
  }
  ```

#### `updateBatchPreview()`
- **목적**: 통합 미리보기 (배치 + 현재 입력) 표시
- **로직**:
  ```javascript
  const batchContent = state.batch.map(item => item.content).join('\n\n');
  const currentPreview = generateCurrentPreview();

  previewEl.value = `=== 배치 전송될 내용 (${state.batch.length}건) ===\n\n${batchContent}\n\n=== 현재 입력 ===\n\n${currentPreview}`;
  ```

### 12.4 UI 컴포넌트

#### 배치 섹션 (page.html:210-223)
```html
<section id="batchSection" class="field" style="display:none;">
  <label>📦 배치 대기 중 (<span id="batchCount">0</span>건)</label>
  <button id="btnClearBatch">🗑️ 전체 삭제</button>
  <div id="batchList"><!-- 동적 생성 --></div>
</section>
```

#### 배치 추가 버튼 (page.html:233)
```html
<button class="btn ghost" id="btnAddToBatch" style="display:none;">
  ➕ 배치에 추가
</button>
```

### 12.5 키보드 단축키
- **Ctrl+B**: 배치에 추가 (데스크톱 사용자용)

### 12.6 워크플로우
```
1. 플레이어 1 선택 → 정보 입력
   ↓
2. [➕ 배치에 추가] 클릭 (또는 Ctrl+B)
   ↓
3. 자동으로 다음 좌석으로 이동
   ↓
4. 플레이어 2 선택 → 모드 변경 가능 → 정보 입력
   ↓
5. [➕ 배치에 추가] 반복
   ↓
6. 전송 버튼이 자동으로 "📤 배치 전송 (N건)"으로 변경
   ↓
7. 클릭 시 `sendBatch()` 호출
   ↓
8. 한 번의 서버 호출로 모든 데이터 전송
```

---

## 13. 확장 가능성

### 13.1 추가 모드 구현
```javascript
// 서버 (softsender_code.gs)
function buildFileName(kind, hhmm, tableNo, playerOrLabel) {
  const modes = ['PU', 'ELIM', 'L3', 'LEADERBOARD', 'NEW_MODE']; // 추가
  // ...
}

// 클라이언트 (softsender.gs)
function rebuildPreview() {
  // ...
  } else if (mode === 'NEW_MODE') {
    // 새 모드 로직
  }
}
```

### 13.2 다국어 지원
```javascript
const i18n = {
  ko: { send: '전송', success: '완료' },
  en: { send: 'Send', success: 'Success' }
};
```

---

## 📞 기술 지원
문제 발생 시 개발팀에 아래 정보를 제공하세요:
- 브라우저 종류 및 버전
- 에러 메시지 (스크린샷)
- Sheet ID
- 재현 방법
