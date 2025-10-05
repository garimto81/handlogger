# CSV 분석 - Virtual_Table_Data - Hand.csv

## 📊 **파일 정보**
- **파일명**: `Virtual_Table_Data - Hand.csv`
- **총 행 수**: 2,866줄
- **컬럼 수**: 18개 (고정)
- **인코딩**: UTF-8 (한글 포함)
- **구조**: 행 타입 기반 (GAME, PAYOUTS, HAND, PLAYER, EVENT)

---

## 🏗️ **전체 구조**

### **핸드 블록 단위**
```
핸드 블록 (Hand Block) = 1개의 완전한 포커 핸드
├─ GAME 행 (1줄) - 게임 메타데이터
├─ PAYOUTS 행 (1줄) - 승자 정보 (비어있거나 디버그 정보)
├─ HAND 행 (1줄) - 핸드 기본 정보
├─ PLAYER 행 (n줄) - 참가자 정보 (2~10명)
├─ EVENT 행 (m줄) - 보드/액션 이벤트
└─ 빈 행 (1줄) - 블록 구분자
```

### **예시: 핸드 블록 #1 (22줄)**
```csv
1,GAME,GGProd Hand Logger,Virtual Table,2025-08-27,,,,,,,,,,,,,
2,PAYOUTS,,DEBUG_1757916164470,...,디버그 테스트 - 2025. 9. 15. 오후 3:02:44,2025. 9. 14,,,,,,,,,
3,HAND,1,1756296967,HOLDEM,BB_ANTE,0,0,0,0,0,1,2,3,0,0,1,T02
4,PLAYER,Jaewon,1,0,1000000,1000000,10h 9d,,,,,,,,,,
5,PLAYER,Pauline Lebsack,2,0,1000000,1000000,5d 4c,,,,,,,,,,
6,PLAYER,David,3,0,1000000,1000000,Jd 10c,,,,,,,,,,
7,EVENT,BET,1,5000,211613,,,,,,,,,,,,
8,EVENT,CALL,2,,211622,,,,,,,,,,,,
9,EVENT,CALL,3,,211631,,,,,,,,,,,,
10,EVENT,BOARD,DEBUG_1757918671027,...,🔧 디버그 테스트 - 2025. 9. 15. 오후 5:11:23,2025. 9. 15,,,,,,,,,
11,EVENT,BOARD,1,6d,211638,,,,,,,,,,,,
12,EVENT,BOARD,1,4d,211641,,,,,,,,,,,,
13,EVENT,BET,1,50000,211652,,,,,,,,,,,,
14,EVENT,FOLD,2,,211702,,,,,,,,,,,,
15,EVENT,CALL,3,,211712,,,,,,,,,,,,
16,EVENT,BOARD,1,5s,211716,,,,,,,,,,,,
17,EVENT,CHECK,1,,211731,,,,,,,,,,,,
18,EVENT,CHECK,2,,211743,,,,,,,,,,,,
19,EVENT,BOARD,1,2h,211747,,,,,,,,,,,,
20,EVENT,BET,1,50000,211800,,,,,,,,,,,,
21,EVENT,CALL,2,,211814,,,,,,,,,,,,
22,,,,,,,,,,,,,,,,,
```

---

## 📋 **행 타입별 스키마**

### **1. GAME 행 (핸드 블록 메타데이터)**
**형식**: `rowNum,GAME,appName,tableName,gameDate,col6~17(공란)`

| 컬럼 | 이름 | 타입 | 설명 | 예시 |
|------|------|------|------|------|
| 0 | row_num | Number | 행 번호 (블록 내 순서) | `1` |
| 1 | row_type | String | 행 타입 (고정: "GAME") | `GAME` |
| 2 | app_name | String | 앱 이름 | `GGProd Hand Logger` |
| 3 | table_name | String | 테이블 이름 | `Virtual Table` |
| 4 | game_date | String | 게임 날짜 (YYYY-MM-DD) | `2025-08-27` |
| 5~17 | - | Empty | 공란 | ` ` |

---

### **2. PAYOUTS 행 (승자/디버그 정보)**
**형식**: `rowNum,PAYOUTS,col3~17(비어있거나 디버그 정보)`

| 컬럼 | 이름 | 타입 | 설명 | 예시 |
|------|------|------|------|------|
| 0 | row_num | Number | 행 번호 | `2` |
| 1 | row_type | String | 행 타입 (고정: "PAYOUTS") | `PAYOUTS` |
| 2~17 | - | Mixed | 비어있거나 디버그 정보 | (대부분 공란) |

**특이사항:**
- 대부분 공란
- 일부 디버그 정보 포함 (예: `DEBUG_1757916164470,debug_test_1757916164470.mp4`)

---

### **3. HAND 행 (핸드 기본 정보) ⭐ 핵심**

⚠️ **Critical: stakes_type에 따라 컬럼 위치가 다름**

#### **3.1 stakes_type = "BB_ANTE" 구조**
**형식**: `rowNum,HAND,handNo,timestamp,gameType,BB_ANTE,bb,unused,sb,bbAnte,unknown,btnSeat,sbSeat,bbSeat,unknown,unknown,level,tableId`

| 컬럼 | 이름 | 타입 | 설명 | 예시 |
|------|------|------|------|------|
| 0 | row_num | Number | 행 번호 | `3` |
| 1 | row_type | String | 행 타입 | `HAND` |
| 2 | hand_no | Number | 핸드 번호 | `181` |
| 3 | timestamp | Number | Unix 타임스탬프 (초) | `1758294658` |
| 4 | game_type | String | 게임 타입 | `HOLDEM` |
| 5 | stakes_type | String | 스테이크 타입 | `BB_ANTE` |
| 6 | bb | Number | Big Blind | `1000` |
| 7 | unused | Mixed | **사용 안 함** (날짜 등) | `2025-09-20` |
| 8 | sb | Number | Small Blind | `500` |
| 9 | bb_ante | Number | BB Ante | `1000` |
| 10 | unknown_1 | Number | 미상 | `0` |
| 11 | btn_seat | Number | **BTN 좌석** | `1` |
| 12 | sb_seat | Number | **SB 좌석** | `2` |
| 13 | bb_seat | Number | **BB 좌석** | `3` |
| 14 | unknown_2 | Number | 미상 | `0` |
| 15 | unknown_3 | Number | 미상 | `0` |
| 16 | level | Number | 레벨 | `1` |
| 17 | table_id | String | **테이블 ID** | `NewT13` |

#### **3.2 stakes_type = "NO_ANTE" 구조**
**형식**: `rowNum,HAND,handNo,timestamp,gameType,NO_ANTE,unknown,unused,sb,bb,bbAnte,btnSeat,sbSeat,bbSeat,unknown,unknown,level,tableId`

| 컬럼 | 이름 | 타입 | 설명 | 예시 |
|------|------|------|------|------|
| 0 | row_num | Number | 행 번호 | `3` |
| 1 | row_type | String | 행 타입 | `HAND` |
| 2 | hand_no | Number | 핸드 번호 | `168` |
| 3 | timestamp | Number | Unix 타임스탬프 (초) | `1758283332` |
| 4 | game_type | String | 게임 타입 | `HOLDEM` |
| 5 | stakes_type | String | 스테이크 타입 | `NO_ANTE` |
| 6 | unknown | Number | 미상 | `0` |
| 7 | unused | Empty | **빈 칸** | ` ` |
| 8 | sb | Number | Small Blind | `1000` |
| 9 | bb | Number | Big Blind | `2000` |
| 10 | bb_ante | Number | BB Ante (항상 0) | `0` |
| 11 | btn_seat | Number | **BTN 좌석** | `1` |
| 12 | sb_seat | Number | **SB 좌석** | `2` |
| 13 | bb_seat | Number | **BB 좌석** | `3` |
| 14 | unknown_2 | Number | 미상 | `0` |
| 15 | unknown_3 | Number | 미상 | `0` |
| 16 | level | Number | 레벨 | `1` |
| 17 | table_id | String | **테이블 ID** | `1` |

**⚠️ 파싱 시 주의사항:**
- `stakes_type` 값에 따라 bb/sb 위치가 다름
- BB_ANTE: [6]=bb, [8]=sb, [9]=bb_ante
- NO_ANTE: [8]=sb, [9]=bb, [10]=bb_ante (항상 0)

---

### **4. PLAYER 행 (참가자 정보)**
**형식**: `rowNum,PLAYER,playerName,seatNo,unknown,startStack,endStack,holeCards,position,isHero,marker,col12~17(공란)`

| 컬럼 | 이름 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|------|
| 0 | row_num | Number | ✅ | 행 번호 | `4`, `5`, `6` |
| 1 | row_type | String | ✅ | 행 타입 | `PLAYER` |
| 2 | player_name | String | ✅ | **플레이어 이름** | `Katie Hills`, `V08` |
| 3 | seat_no | Number | ✅ | **좌석 번호** | `7`, `8`, `9` |
| 4 | unknown | Number | ✅ | 미상 | `0` (항상 0) |
| 5 | start_stack | Number | ✅ | **시작 스택** | `50000`, `175000` |
| 6 | end_stack | Number | ✅ | **종료 스택** | `50000`, `101000` |
| 7 | hole_cards | String | ❌ | **홀카드** (공백 구분) | `10h 9d`, (공란) |
| 8 | **position** | String | ❌ | **포지션** | `BTN`, `SB`, `BB`, (공란) |
| 9 | **is_hero** | String | ❌ | **히어로 플레이어** | `TRUE`, (공란) |
| 10 | **marker** | String | ❌ | **마커/태그** | `KR`, `BR`, (공란) |
| 11~17 | - | Empty | - | 공란 | ` ` |

**특이사항:**
- 홀카드 포맷: `{rank}{suit} {rank}{suit}` (예: `As Ks`, `Qc Jc`)
- 홀카드 없을 수 있음 (공란)
- **position**: BTN/SB/BB만 표시, 나머지는 공란 (좌석 번호로 추론)
- **is_hero**: `TRUE` = 히어로 플레이어 (홀카드 보기 권한)
- **marker**: 바이인/리바이 등 태그 (예: `KR`, `BR`)

---

### **5. EVENT 행 (보드/액션 이벤트)**
**형식**: 이벤트 타입별로 상이

#### **5.1 BOARD 이벤트 (보드 카드)**
**형식**: `rowNum,EVENT,BOARD,source,cardCode,timestamp,col7~17(공란)`

| 컬럼 | 이름 | 타입 | 설명 | 예시 |
|------|------|------|------|------|
| 0 | row_num | Number | 행 번호 | `11`, `12`, `13` |
| 1 | row_type | String | 행 타입 (고정: "EVENT") | `EVENT` |
| 2 | event_type | String | 이벤트 타입 (고정: "BOARD") | `BOARD` |
| 3 | source | String/Number | 소스 (1 또는 디버그 ID) | `1`, `DEBUG_1757918671027` |
| 4 | card_code | String | **카드 코드** | `6d`, `4d`, `5s`, `Kh` |
| 5 | timestamp | Number | 타임스탬프 | `211638`, `211641` |
| 6~17 | - | Empty | 공란 | ` ` |

**보드 순서:**
1. Flop 3장 (BOARD × 3)
2. Turn 1장 (BOARD × 1)
3. River 1장 (BOARD × 1)

---

#### **5.2 액션 이벤트 (BET, CALL, RAISE, CHECK, FOLD, ALL-IN)**
**형식**: `rowNum,EVENT,actionType,seatNo,amount,timestamp,col7~17(공란)`

| 컬럼 | 이름 | 타입 | 설명 | 예시 |
|------|------|------|------|------|
| 0 | row_num | Number | 행 번호 | `7`, `8`, `9` |
| 1 | row_type | String | 행 타입 | `EVENT` |
| 2 | event_type | String | **액션 타입** | `BET`, `CALL 2,800`, `RAIES`*, `CHECK`, `FOLD`, `ALL-IN 0`, `RAISE TO` |
| 3 | seat_no | Number | **좌석 번호** | `1`, `2`, `3` |
| 4 | amount | Number/Empty | **금액** | `5000`, `2800`, (공란) |
| 5 | timestamp | Number | 타임스탬프 | `211613`, `211622` |
| 6~17 | - | Empty | 공란 | ` ` |

**⚠️ 중요: 이벤트 타입 다양성**
- `RAIES` → `RAISE` (오타, 자동 수정 필요)
- `CALL 2,800` → `CALL` (금액 포함 형식, 정규화 필요)
- `ALL-IN 0` → `ALL-IN` (금액 포함 형식, 정규화 필요)
- `RAISE TO` → `RAISE_TO` (레이즈 투 총 금액)

---

#### **5.3 POT CORRECTION 이벤트**
**형식**: `rowNum,EVENT,POT CORRECTION,empty,amount,timestamp,col7~17(공란)`

| 컬럼 | 이름 | 타입 | 설명 | 예시 |
|------|------|------|------|------|
| 0 | row_num | Number | 행 번호 | `6`, `16` |
| 1 | row_type | String | 행 타입 (고정: "EVENT") | `EVENT` |
| 2 | event_type | String | 이벤트 타입 | `POT CORRECTION` |
| 3 | - | Empty | 공란 | ` ` |
| 4 | amount | Number | **보정 금액** (음수 가능) | `-30000`, `1200000` |
| 5 | timestamp | Number | 타임스탬프 | `205907`, `210005` |
| 6~17 | - | Empty | 공란 | ` ` |

**용도**: 수동 팟 보정 (앤티, 실수 수정 등)

---

### **6. 빈 행 (블록 구분자)**
**형식**: `col0~17(모두 공란)`

- 각 핸드 블록 끝에 위치
- 블록 경계 구분용

---

## 🔍 **데이터 분석 결과**

### **1. 핵심 데이터 추출**

#### **핸드별 필수 정보 (HAND 행에서)**
- `hand_no`: 핸드 번호
- `timestamp`: Unix 타임스탬프
- `game_type`: HOLDEM
- `ante_type`: BB_ANTE, NO_ANTE
- `bb`, `sb`: 블라인드 금액
- `btn_seat`, `sb_seat`, `bb_seat`: 포지션 정보
- `table_id`: 테이블 ID

#### **플레이어 정보 (PLAYER 행에서)**
- `player_name`: 이름
- `seat_no`: 좌석
- `start_stack`, `end_stack`: 스택
- `hole_cards`: 홀카드 (있을 수도, 없을 수도)

#### **게임 진행 (EVENT 행에서)**
- **BOARD**: 보드 카드 (5장)
- **액션**: BET, CALL, RAISE, CHECK, FOLD
- **POT CORRECTION**: 수동 팟 보정

---

### **2. 데이터 품질 이슈**

| 이슈 | 발견 위치 | 빈도 | 심각도 | 처리 방안 |
|------|-----------|------|--------|-----------|
| **stakes_type별 컬럼 위치 다름** | HAND 행 | 높음 | **Critical** | 조건부 파싱 로직 |
| `RAIES` 오타 | EVENT 행 | 높음 | Medium | `RAIES` → `RAISE` 자동 수정 |
| 이벤트 타입 다양성 | EVENT 행 | 높음 | High | `CALL 2,800` → `CALL` 정규화 |
| BOARD 카드 중복 | EVENT 행 | 중간 | High | 중복 제거 (Set 사용) |
| 홀카드 누락 | PLAYER 행 | 중간 | Low | 빈 문자열 허용 |
| 스택 0 또는 음수 | PLAYER 행 | 낮음 | Low | 허용 (올인 등) |
| 디버그 정보 혼입 | PAYOUTS, EVENT 행 | 낮음 | Low | 무시 |

---

### **3. Hand 시트 저장 방식 제안**

#### **Option A: 행 타입별 저장 (CSV 원본 구조 유지)**
```
Hand 시트 컬럼:
- row_num (Number)
- row_type (String: GAME, PAYOUTS, HAND, PLAYER, EVENT)
- col_3 ~ col_17 (Mixed)

장점: CSV 원본과 1:1 매핑 용이
단점: 쿼리 복잡, 정규화 안됨
```

#### **Option B: 핸드별 1행 저장 + 관계 테이블 (정규화)**
```
Hand 시트 컬럼:
- hand_id (고유 ID, 자동 생성)
- hand_no
- timestamp
- game_type
- table_id
- btn_seat, sb_seat, bb_seat
- bb, sb, ante_type
- ... (HAND 행 정보)

Players 시트 (별도):
- hand_id (외래키)
- seat_no
- player_name
- start_stack, end_stack
- hole_cards

Events 시트 (별도):
- hand_id (외래키)
- seq (순서)
- event_type
- seat_no (액션만)
- card_code (BOARD만)
- amount
- timestamp

장점: 정규화, 쿼리 용이, 확장 가능
단점: 다중 시트 필요 (사용자가 ACTIONS/CONFIG/LOG 폐기 원함)
```

#### **Option C: 핸드별 1행 저장 + JSON 통합 (절충안) ⭐ 추천**
```
Hand 시트 컬럼:
- hand_id (String, yyyyMMdd_HHmmssSSS)
- hand_no (Number)
- timestamp (Number, Unix timestamp)
- table_id (String)
- game_type (String, "HOLDEM")
- ante_type (String, "BB_ANTE", "NO_ANTE")
- bb (Number)
- sb (Number)
- btn_seat (Number)
- sb_seat (Number)
- bb_seat (Number)
- players_json (JSON String)
  예: [{"seat":1,"name":"Jaewon","start":1000000,"end":1000000,"holes":"10h 9d"}]
- events_json (JSON String)
  예: [{"type":"BET","seat":1,"amt":5000,"ts":211613},{"type":"BOARD","card":"6d","ts":211638}]
- board_cards (String, 공백 구분)
  예: "6d 4d 5s 2h Kh"
- game_date (String, YYYY-MM-DD)
- schema_ver (String, "v2.0.0")

장점:
✅ 단일 시트 (사용자 요구사항)
✅ 핸드별 1행 (간단)
✅ 상세 정보 보존 (JSON)
✅ Review 모드 쿼리 용이
✅ CSV import/export 가능

단점:
❌ JSON 파싱 필요 (성능 영향 미미)
```

---

## 🎯 **최종 Hand 시트 스키마 (Option C - v2.0.1)**

### **Hand 시트 컬럼 (19개)**

| # | 컬럼명 | 타입 | 필수 | 설명 | 예시 |
|---|--------|------|------|------|------|
| 1 | hand_id | String | ✅ | 고유 핸드 ID (PK) | `20250827_143052` |
| 2 | hand_no | Number | ✅ | 핸드 번호 | `181`, `168` |
| 3 | timestamp | Number | ✅ | Unix 타임스탬프 (ms) | `1758294658000` |
| 4 | table_id | String | ✅ | 테이블 ID | `NewT13` |
| 5 | game_type | String | ✅ | 게임 타입 | `HOLDEM` |
| 6 | stakes_type | String | ✅ | 스테이크 타입 | `BB_ANTE`, `NO_ANTE` |
| 7 | bb | Number | ✅ | Big Blind | `1000`, `2000` |
| 8 | sb | Number | ✅ | Small Blind | `500`, `1000` |
| 9 | bb_ante | Number | ❌ | BB Ante | `1000`, `0` |
| 10 | btn_seat | Number | ✅ | BTN 좌석 | `1` |
| 11 | sb_seat | Number | ✅ | SB 좌석 | `2` |
| 12 | bb_seat | Number | ✅ | BB 좌석 | `3` |
| 13 | board_json | JSON | ❌ | 보드 카드 배열 | `["Qs","10h","10s"]` |
| 14 | players_json | JSON | ✅ | 플레이어 정보 배열 | (하단 참조) |
| 15 | events_json | JSON | ✅ | 이벤트 정보 배열 | (하단 참조) |
| 16 | final_pot | Number | ❌ | 최종 팟 (계산) | `75000` |
| 17 | game_name | String | ❌ | 게임 이름 | `GGProd Hand Logger` |
| 18 | **initial_pot** | Number | ❌ | **초기 팟 (POT_CORRECTION 합계)** | `5300` |
| 19 | **contributed_pot** | Number | ❌ | **플레이어 베팅 합계** | `69700` |

**💡 final_pot 계산 공식:**
```javascript
final_pot = initial_pot + contributed_pot
```

**⚠️ stakes_type 조건부 파싱:**
- BB_ANTE: CSV[6]=bb, CSV[8]=sb, CSV[9]=bb_ante
- NO_ANTE: CSV[8]=sb, CSV[9]=bb, CSV[10]=bb_ante

### **players_json 구조 (v2.0.1)**
```json
[
  {
    "seat": 7,
    "name": "Katie Hills",
    "start_stack": 50000,
    "end_stack": 50000,
    "hole_cards": ["10h", "9d"],
    "position": "BTN",
    "is_hero": true,
    "marker": "BR"
  },
  {
    "seat": 8,
    "name": "V08",
    "start_stack": 175000,
    "end_stack": 175000,
    "hole_cards": null,
    "position": "SB",
    "is_hero": false,
    "marker": null
  }
]
```

**🔄 v2.0.1 변경사항:**
- `hole_cards`: 문자열 → **배열** (`["10h", "9d"]`)
- 홀카드 없을 시: 빈 문자열 → **null**

### **events_json 구조 (v2.0.1)**
```json
[
  {
    "seq": 1,
    "event_type": "POT_CORRECTION",
    "amount": 5300,
    "ts": 0
  },
  {
    "seq": 2,
    "event_type": "BOARD",
    "card": "8h",
    "ts": 211638
  },
  {
    "seq": 3,
    "event_type": "BET",
    "seat": 2,
    "amount": 2800,
    "ts": 211652
  },
  {
    "seq": 4,
    "event_type": "RAISE",
    "seat": 9,
    "amount": 12200,
    "total_bet": 15000,
    "raise_type": "TO",
    "ts": 211702
  },
  {
    "seq": 5,
    "event_type": "ALL-IN",
    "seat": 3,
    "amount": 0,
    "ts": 211712
  }
]
```

**🔄 v2.0.1 변경사항:**
- **RAISE_TO 처리**: `total_bet`, `raise_type` 필드 추가
- **amount**: 증가 금액 (total_bet - 이전 베팅)
- **ALL-IN**: 금액 0도 허용

---

## 📝 **CSV → Hand 시트 변환 로직**

### **1. 핸드 블록 파싱**
```javascript
function parseHandBlock(csvLines) {
  const block = [];
  let i = 0;

  while (i < csvLines.length) {
    const line = csvLines[i].trim();
    if (line === '') break; // 빈 행 만나면 블록 종료
    block.push(parseCSVLine(line));
    i++;
  }

  return { block, nextIndex: i + 1 };
}
```

### **2. HAND 행 → hand 객체 (stakes_type 조건부 파싱)**
```javascript
function parseHandRow(row) {
  const stakesType = row[5];

  let bb, sb, bbAnte;

  if (stakesType === 'BB_ANTE') {
    bb = toInt(row[6]);
    sb = toInt(row[8]);
    bbAnte = toInt(row[9]);
  } else if (stakesType === 'NO_ANTE') {
    bb = toInt(row[9]);
    sb = toInt(row[8]);
    bbAnte = toInt(row[10]);
  }

  return {
    hand_no: toInt(row[2]),
    timestamp: toInt(row[3]) * 1000, // ms로 변환
    game_type: row[4],
    stakes_type: stakesType,
    bb,
    sb,
    bb_ante: bbAnte,
    btn_seat: toInt(row[11]),
    sb_seat: toInt(row[12]),
    bb_seat: toInt(row[13]),
    table_id: row[17]
  };
}
```

### **3. PLAYER 행 → players_json (v2.0.1 개선)**
```javascript
function parsePlayerRows(rows) {
  return rows.map(r => {
    const holeCardsRaw = r[7] || '';
    const holeCards = holeCardsRaw.trim()
      ? holeCardsRaw.trim().split(/\s+/)  // 배열로 변환
      : null;  // 빈 문자열 → null

    return {
      seat: toInt(r[3]),
      name: r[2],
      start_stack: toInt(r[5]),
      end_stack: toInt(r[6]),
      hole_cards: holeCards,         // ["10h", "9d"] 또는 null
      position: r[8] || null,        // BTN/SB/BB만
      is_hero: r[9] === 'TRUE',      // TRUE인 경우만 true
      marker: r[10] || null          // KR, BR 등 태그
    };
  });
}
```

### **4. EVENT 행 → events_json + board_json (v2.0.1 개선)**
```javascript
function parseEventRows(rows) {
  const events = [];
  const boardCards = [];
  const seenCards = new Set();
  let seq = 1;
  let lastBetAmount = 0;  // RAISE_TO 계산용

  rows.forEach(r => {
    const typeRaw = r[2]?.trim() || '';

    // 이벤트 타입 정규화
    let eventType = typeRaw;
    let isRaiseTo = false;

    if (typeRaw.startsWith('CALL ')) {
      eventType = 'CALL';
    } else if (typeRaw.startsWith('ALL-IN')) {
      eventType = 'ALL-IN';
    } else if (typeRaw === 'RAIES') {
      eventType = 'RAISE';  // 오타 수정
    } else if (typeRaw === 'RAISE TO') {
      eventType = 'RAISE';
      isRaiseTo = true;
    } else if (typeRaw === 'POT CORRECTION') {
      eventType = 'POT_CORRECTION';
    }

    if (eventType === 'BOARD') {
      const card = r[4]?.trim();
      if (!card || seenCards.has(card)) return;

      seenCards.add(card);
      boardCards.push(card);
      events.push({
        seq: seq++,
        event_type: 'BOARD',
        card,
        ts: toInt(r[5])
      });
      lastBetAmount = 0;  // 새 스트릿 시작
    }
    else if (eventType === 'POT_CORRECTION') {
      events.push({
        seq: seq++,
        event_type: 'POT_CORRECTION',
        amount: toInt(r[4]),
        ts: toInt(r[5])
      });
    }
    else if (['BET', 'RAISE', 'CALL', 'ALL-IN'].includes(eventType)) {
      const totalBet = toInt(r[4]) || 0;
      let actualAmount = totalBet;

      const event = {
        seq: seq++,
        event_type: eventType,
        seat: toInt(r[3]),
        amount: actualAmount,
        ts: toInt(r[5])
      };

      // RAISE TO 처리
      if (isRaiseTo && lastBetAmount > 0) {
        actualAmount = totalBet - lastBetAmount;
        event.amount = actualAmount;
        event.total_bet = totalBet;
        event.raise_type = 'TO';
      }

      events.push(event);

      // 마지막 베팅 금액 추적
      if (['BET', 'RAISE'].includes(eventType)) {
        lastBetAmount = totalBet;
      }
    }
    else if (['CHECK', 'FOLD'].includes(eventType)) {
      events.push({
        seq: seq++,
        event_type: eventType,
        seat: toInt(r[3]),
        ts: toInt(r[5])
      });
    }
  });

  return { events, board_json: boardCards };
}
```

### **5. hand_id 생성**
```javascript
function generateHandId(timestamp) {
  const date = new Date(timestamp);
  return Utilities.formatDate(date, 'Asia/Seoul', "yyyyMMdd'_'HHmmssSSS");
}
```

### **6. 최종 Hand 행 생성 (v2.0.1)**
```javascript
function convertBlockToHandRow(block) {
  const gameRow = block.find(r => r[1] === 'GAME');
  const handRow = block.find(r => r[1] === 'HAND');
  const playerRows = block.filter(r => r[1] === 'PLAYER');
  const eventRows = block.filter(r => r[1] === 'EVENT');

  const hand = parseHandRow(handRow);
  const players = parsePlayerRows(playerRows);
  const { events, board_json } = parseEventRows(eventRows);

  const hand_id = generateHandId(hand.timestamp);
  const game_name = gameRow[2];

  // initial_pot 계산 (POT_CORRECTION 합계)
  const initial_pot = events
    .filter(e => e.event_type === 'POT_CORRECTION')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // contributed_pot 계산 (플레이어 베팅 합계)
  const contributed_pot = events
    .filter(e => ['BET', 'RAISE', 'CALL', 'ALL-IN'].includes(e.event_type))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // final_pot 계산
  const final_pot = initial_pot + contributed_pot;

  return [
    hand_id,              // 1
    hand.hand_no,         // 2
    hand.timestamp,       // 3
    hand.table_id,        // 4
    hand.game_type,       // 5
    hand.stakes_type,     // 6
    hand.bb,              // 7
    hand.sb,              // 8
    hand.bb_ante,         // 9
    hand.btn_seat,        // 10
    hand.sb_seat,         // 11
    hand.bb_seat,         // 12
    JSON.stringify(board_json),   // 13
    JSON.stringify(players),      // 14
    JSON.stringify(events),       // 15
    final_pot,            // 16
    game_name,            // 17
    initial_pot,          // 18 ← NEW
    contributed_pot       // 19 ← NEW
  ];
}
```

---

## ✅ **검증 체크리스트**

- [ ] CSV 2,866줄 전체 파싱 성공
- [ ] `RAIES` → `RAISE` 자동 변환
- [ ] 홀카드 누락 처리 (빈 문자열)
- [ ] POT CORRECTION 이벤트 보존
- [ ] 보드 카드 순서 보존 (Flop 3 → Turn → River)
- [ ] 타임스탬프 → hand_id 변환
- [ ] JSON 파싱 오류 없음
- [ ] 빈 행 블록 구분 정확

---

## 🚀 **다음 단계**

1. ✅ CSV 분석 완료
2. ⏭️ code.gs 수정: Hand 시트 저장 로직 구현
3. ⏭️ index.html 수정: Record 모드 UI 조정
4. ⏭️ Review 모드: Hand 시트 읽기 로직
5. ⏭️ VIRTUAL 시트 갱신: Review 모드로 이동
6. ⏭️ 문서 업데이트: PRD, LLD, PLAN
