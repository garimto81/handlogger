# DB 설계 문서 - Hand 시트 (CSV 기반)

**버전**: v2.0.9
**작성일**: 2025-10-05
**최종 수정**: 2025-10-05 (EVENT 시간 개별 추적)
**목적**: Record 모드 재설계 - CSV 구조 기반 Hand 시트 스키마 정의

---

## 📌 설계 원칙

1. **CSV 구조 최대한 유지**: 기존 `csv/Virtual_Table_Data - Hand.csv` (2866행) 포맷 준수
2. **비정규화 단일 시트**: HANDS/ACTIONS 시트 폐기, Hand 시트 단일화
3. **행 타입 기반 유연성**: row_type 컬럼으로 5가지 타입 구분
4. **후반 작업팀 중심**: Review 모드에서 편리한 조회/편집

---

## 🗂️ CSV 구조 분석

### **행 타입 5가지**

| 타입 | 역할 | 반복 주기 | 필수 여부 |
|------|------|----------|----------|
| `GAME` | 게임 메타데이터 | 핸드 블록당 1개 | 필수 |
| `PAYOUTS` | 대회 정보/파일명 | 핸드 블록당 1개 | 필수 |
| `HAND` | 핸드 헤더 | 핸드당 1개 | 필수 |
| `PLAYER` | 참가자 정보 | 플레이어당 1개 | 필수 (1+) |
| `EVENT` | 액션/보드 이벤트 | 이벤트당 1개 | 선택 |

### **핸드 블록 구조**

```
1,GAME,GGProd Hand Logger,Virtual Table,2025-08-27
2,PAYOUTS,,VT1_SOORIN_Kc8c_vs_V06_Ah2d,...
3,HAND,1,1756296967,HOLDEM,BB_ANTE,10000,0,20000,20000,0,1,2,3,0,0,1,VT1
4,PLAYER,SOORIN,1,0,1000000,1200000,Kc 8c
5,PLAYER,V06,2,0,800000,600000,Ah 2d
6,EVENT,BET,1,5000,211613
7,EVENT,CALL,2,,211622
8,EVENT,BOARD,1,Qh,211638
9,EVENT,BOARD,1,Td,211641
10,EVENT,BOARD,1,9c,211646
[빈 줄] ← 핸드 종료
1,GAME,... ← 다음 핸드 시작
```

---

## 📊 Hand 시트 스키마 (19개 컬럼)

### **공통 컬럼 (모든 행)**

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| **A: row_type** | TEXT | 행 타입 (GAME/PAYOUTS/HAND/PLAYER/EVENT) | HAND |
| **B: hand_id** | TEXT | 핸드 그룹핑 키 (yyyyMMdd_HHmmss) | 20250827_211613 |
| **C: seq** | NUMBER | 핸드 내 순서 (1부터 시작) | 1, 2, 3, ... |

### **GAME 행 전용 컬럼**

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| **D: game_name** | TEXT | 게임 이름 | GGProd Hand Logger |
| **E: table_name** | TEXT | 테이블 이름 | Virtual Table |
| **F: game_date** | TEXT | 게임 날짜 | 2025-08-27 |

### **PAYOUTS 행 전용 컬럼**

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| **G: file_name** | TEXT | 파일명 (자동 생성) | VT1_SOORIN_Kc8c_vs_V06_Ah2d |
| **H: description** | TEXT | 설명 | 디버그 테스트 |

### **HAND 행 전용 컬럼**

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| **C: hand_no** | NUMBER | 핸드 번호 | 189 |
| **D: timestamp** | NUMBER | Unix timestamp (초) | 1758697248 |
| **E: game_type** | TEXT | 게임 종류 | HOLDEM |
| **F: ante_type** | TEXT | 앤티 타입 | BB_ANTE, NO_ANTE |
| **G: blinds** | NUMBER | BB 값 | 1000 |
| **H: game_date** | TEXT | 게임 날짜 | 2025-09-24 |
| **I: SB** | NUMBER | Small Blind (BB의 1/2) | 500 |
| **J: BB** | NUMBER | Big Blind | 1000 |
| **K: Ante** | NUMBER | Ante 값 | 0 |
| **L: BTN** | NUMBER | 버튼 좌석 번호 | 1 |
| **M: SB_seat** | NUMBER | SB 좌석 번호 | 2 |
| **N: BB_seat** | NUMBER | BB 좌석 번호 | 3 |
| **O-P: 빈값** | - | 예약 컬럼 | 0, 0 |
| **Q: 빈값** | - | 예약 컬럼 | '' |
| **R: table_no** | TEXT | 테이블 번호 (Type 시트에서 조회) | 1, 2, VT1 |

**⚠️ 중요 변경 사항 (v2.0.7)**:
- **R열에 table_no 추가**: Type 시트의 "Table No." 컬럼 값
- **셀 단위 분리**: SB/BB/Ante, BTN/SB_seat/BB_seat 각각 독립 컬럼
- **SB 자동 계산**: BB의 1/2로 자동 설정

### **PLAYER 행 전용 컬럼**

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| **C: player_name** | TEXT | 플레이어 이름 | SOORIN |
| **D: seat** | NUMBER | 좌석 번호 | 2 |
| **E: 0** | NUMBER | 고정값 | 0 |
| **F: chips_start** | NUMBER | 시작 칩 | 220000 |
| **G: chips_end** | NUMBER | 종료 칩 | 182000 |
| **H: hole_cards** | TEXT | 홀카드 (스페이스 구분) | Kc 8c |
| **I: 빈값** | - | 예약 컬럼 | '' |
| **J: key_player** | TEXT | 키 플레이어 여부 (Type 시트 조회) | TRUE, FALSE |
| **K: nationality** | TEXT | 국가 (Type 시트 조회) | KR, US |

**⚠️ 중요 변경 사항 (v2.0.6-v2.0.7)**:
- **J열에 key_player 추가**: Type 시트의 "Key Player" 컬럼 값
- **K열에 nationality 추가**: Type 시트의 "Nationality" 컬럼 값
- **자동 조회**: readRoster_()를 통해 Type 시트에서 자동 조회

### **EVENT 행 전용 컬럼**

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| **U: event_type** | TEXT | 이벤트 타입 (액션/BOARD/POT CORRECTION) | BET, CALL, BOARD |
| **V: seat** | NUMBER | 좌석 번호 (액션만) | 1 |
| **W: amount** | NUMBER | 금액 (BET/RAISE/POT CORRECTION) | 5000 |
| **X: card** | TEXT | 보드 카드 (BOARD만) | Kd |
| **Y: time** | TEXT | 시간 (HHmmss) - 개별 액션 타임스탬프 | 211613, 211622, 211631 |

**⚠️ 중요 변경 사항 (v2.0.9)**:
- **Y열 time**: 핸드 시작 시간이 아닌 **개별 액션 발생 시각**
- **생성 방식**:
  1. Record 모드: 핸드 시작 시간 + (이벤트 순서 × 5초)
     - 예: 핸드 시작 21:16:00 → BET(21:16:00), CALL(21:16:05), BOARD(21:16:10), ...
  2. CSV Import: 원본 CSV의 개별 시간값 유지
- **형식**: HHmmss (예: 211613 = 21시 16분 13초)
- **이유**: ACTIONS 시트에 timestamp 컬럼이 없어 실제 발생 시각 미저장
- **장점**: 이벤트 순서 보장, 시간 간격 일정

---

## 🔑 주요 컬럼 상세

### **A: row_type**

**값 5가지**:
- `GAME`: 게임 메타데이터 (핸드 블록 시작)
- `PAYOUTS`: 파일명 정보 (핸드별)
- `HAND`: 핸드 헤더 (블라인드, 좌석 등)
- `PLAYER`: 참가자 정보 (이름, 칩, 홀카드)
- `EVENT`: 액션/보드 이벤트

**인덱스**: 필터링에 필수
- `WHERE row_type = 'HAND'` → 핸드 목록 조회
- `WHERE row_type = 'PLAYER' AND hand_id = ?` → 참가자 조회

### **B: hand_id**

**생성 규칙**:
```javascript
const hand_id = `${yyyyMMdd}_${HHmmssSSS}`;
// 예: 20250827_211613123
```

**역할**:
- 핸드 블록 그룹핑 키
- GAME → PAYOUTS → HAND → PLAYER → EVENT 모두 동일 hand_id

**인덱스**: 조회 성능 필수
- `WHERE hand_id = ?` → 특정 핸드 조회
- `GROUP BY hand_id` → 핸드별 집계

### **C: seq**

**순서**:
1. GAME (seq=1)
2. PAYOUTS (seq=2)
3. HAND (seq=3)
4. PLAYER (seq=4, 5, 6, ...)
5. EVENT (seq=N, N+1, ...)

**역할**: 핸드 내 순서 보장
- `ORDER BY hand_id, seq` → 시간순 정렬

### **G: file_name** (PAYOUTS 행)

**생성 로직**:
```javascript
function buildFileName_(detail) {
  const tableId = detail.table_id; // 'VT1'
  const keyPlayers = getKeyPlayers(detail); // [{name:'SOORIN', cards:'Kc8c'}, ...]

  if (keyPlayers.length === 0) {
    return `${tableId}_NoKeyPlayer`;
  }

  if (keyPlayers.length === 1) {
    const p = keyPlayers[0];
    return `${tableId}_${p.name}_${p.cards.join('')}`;
  }

  // 2명 이상: vs 구조
  const parts = keyPlayers.map(p => `${p.name}_${p.cards.join('')}`);
  return `${tableId}_${parts.join('_vs_')}`;
}
```

**예시**:
- 1명: `VT1_SOORIN_Kc8c`
- 2명: `VT1_SOORIN_Kc8c_vs_V06_Ah2d`
- 3명: `VT1_Alice_AsKs_vs_Bob_QhQd_vs_Charlie_JhJd`

### **U: event_type** (EVENT 행)

**액션 종류**:
- `BET`: 베팅
- `CALL`: 콜
- `RAISE` (또는 CSV의 오타 `RAIES`): 레이즈
- `FOLD`: 폴드
- `CHECK`: 체크
- `ALLIN`: 올인 (추가 필요)

**특수 이벤트**:
- `BOARD`: 보드 카드 (X 컬럼에 카드 정보)
- `POT CORRECTION`: 팟 수정 (W 컬럼에 수정 금액)

---

## 🎨 Virtual 시트 연동 로직

### **F열: 파일명**

**PAYOUTS 행의 G 컬럼에서 가져옴**:
```javascript
function getFileName(hand_id) {
  const payoutsRow = getRow('PAYOUTS', hand_id);
  return payoutsRow.file_name; // G 컬럼
}
```

### **H열: 3줄 핸드 요약**

**로직**:
```javascript
function buildHistoryBlock_(hand_id, bb) {
  const handRow = getRow('HAND', hand_id);
  const playerRows = getRows('PLAYER', hand_id);
  const boardRows = getRows('EVENT', hand_id, {event_type: 'BOARD'});

  // 1줄: 키 플레이어(홀카드) vs ...
  const keyPlayers = playerRows
    .filter(p => p.is_key_player) // ROSTER 조인 필요
    .map(p => {
      const cards = p.hole_cards.split(' ')
        .map(c => c.replace('h','♥').replace('d','♦').replace('c','♣').replace('s','♠'))
        .join('');
      return `${p.player_name}(${cards})`;
    });

  const line1 = keyPlayers.join(' vs ');

  // 2줄: 보드
  const boardCards = boardRows
    .map(e => e.card.replace('h','♥').replace('d','♦').replace('c','♣').replace('s','♠'))
    .join(' ');
  const line2 = boardCards ? `보드: ${boardCards}` : '보드: (없음)';

  // 3줄: 팟
  const potFinal = sumPot(hand_id); // EVENT 행 금액 합산
  const bbValue = bb > 0 ? (potFinal / bb).toFixed(1) : 0;
  const line3 = `팟: ${bbValue}BB (${potFinal.toLocaleString()})`;

  return `${line1}\n${line2}\n${line3}`;
}
```

**예시 출력**:
```
SOORIN(K♣8♣) vs V06(A♥2♦)
보드: Q♥ T♦ 9♣ 4♠ A♠
팟: 44.5BB (44,500)
```

### **J열: 자막 (키 플레이어만)**

**로직**:
```javascript
function buildSubtitle_(hand_id, bb) {
  const playerRows = getRows('PLAYER', hand_id);

  const keyPlayers = playerRows
    .filter(p => p.is_key_player)
    .map(p => {
      const name = p.player_name;
      const nation = p.nation || ''; // ROSTER 조인
      const chipsEnd = p.chips_end;

      // 탈락 판정
      if (chipsEnd <= 0) {
        return `${name} / ${nation}\nELIMINATED`;
      }

      // 현재 스택
      const bbValue = bb > 0 ? (chipsEnd / bb).toFixed(0) : 0;
      return `${name} / ${nation}\nCURRENT STACK - ${chipsEnd.toLocaleString()} (${bbValue}BB)`;
    });

  return keyPlayers.join('\n\n');
}
```

**예시 출력**:
```
SOORIN / KR
CURRENT STACK - 182,000 (182BB)

V06 / USA
ELIMINATED
```

---

## 🔍 Review 모드 쿼리 예시

### **A등급 핸드 목록 조회**

```javascript
function queryAGradeHands() {
  const sh = appSS_().getSheetByName('Hand');
  const {rows, map} = readAll_(sh);

  // HAND 행만 필터
  const handRows = rows.filter(r => r[map['row_type']] === 'HAND');

  // A등급 필터 (determinePriority_ 사용)
  const aGradeHands = handRows.filter(r => {
    const hand_id = r[map['hand_id']];
    const detail = getHandDetailFromHandSheet(hand_id);
    const priority = determinePriority_(detail);
    return priority === 'A';
  });

  return aGradeHands.map(r => ({
    hand_id: r[map['hand_id']],
    table_id: r[map['table_id']],
    hand_no: r[map['hand_no']],
    timestamp: r[map['timestamp']],
    file_name: getFileName(r[map['hand_id']])
  }));
}
```

### **특정 핸드 상세 조회**

```javascript
function getHandDetailFromHandSheet(hand_id) {
  const sh = appSS_().getSheetByName('Hand');
  const {rows, map} = readAll_(sh);

  const handRows = rows.filter(r => r[map['hand_id']] === hand_id);

  // HAND 행
  const hand = handRows.find(r => r[map['row_type']] === 'HAND');

  // PLAYER 행들
  const players = handRows
    .filter(r => r[map['row_type']] === 'PLAYER')
    .map(r => ({
      name: r[map['player_name']],
      seat: r[map['seat']],
      chips_start: r[map['chips_start']],
      chips_end: r[map['chips_end']],
      hole_cards: r[map['hole_cards']]
    }));

  // EVENT 행들
  const events = handRows
    .filter(r => r[map['row_type']] === 'EVENT')
    .map(r => ({
      seq: r[map['seq']],
      event_type: r[map['event_type']],
      seat: r[map['seat']],
      amount: r[map['amount']],
      card: r[map['card']],
      time: r[map['time']]
    }));

  return {
    hand_id,
    head: {
      table_id: hand[map['table_id']],
      hand_no: hand[map['hand_no']],
      timestamp: hand[map['timestamp']],
      game_type: hand[map['game_type']],
      ante_type: hand[map['ante_type']],
      blinds: hand[map['blinds']],
      seats: hand[map['seats']]
    },
    players,
    events
  };
}
```

---

## 📝 Hand 시트 헤더 정의

```javascript
const HAND_SHEET_HEADERS = [
  'row_type',      // A
  'hand_id',       // B
  'seq',           // C
  'game_name',     // D (GAME)
  'table_name',    // E (GAME)
  'game_date',     // F (GAME)
  'file_name',     // G (PAYOUTS)
  'description',   // H (PAYOUTS)
  'table_id',      // I (HAND)
  'hand_no',       // J (HAND)
  'timestamp',     // K (HAND)
  'game_type',     // L (HAND)
  'ante_type',     // M (HAND)
  'blinds',        // N (HAND)
  'seats',         // O (HAND)
  'player_name',   // P (PLAYER)
  'seat',          // Q (PLAYER)
  'chips_start',   // R (PLAYER)
  'chips_end',     // S (PLAYER)
  'hole_cards',    // T (PLAYER)
  'event_type',    // U (EVENT)
  'event_seat',    // V (EVENT)
  'amount',        // W (EVENT)
  'card',          // X (EVENT)
  'time'           // Y (EVENT)
];
```

---

## 🚀 마이그레이션 계획

### **Phase 1: Hand 시트 생성** (1주)

1. **Hand 시트 생성**
   ```javascript
   function createHandSheet() {
     const ss = appSS_();
     const sh = ss.insertSheet('Hand');
     sh.getRange(1, 1, 1, HAND_SHEET_HEADERS.length)
       .setValues([HAND_SHEET_HEADERS]);
   }
   ```

2. **CSV 데이터 import**
   ```javascript
   function importCSVToHandSheet() {
     const csvData = readCSV('csv/Virtual_Table_Data - Hand.csv');
     const sh = appSS_().getSheetByName('Hand');

     csvData.forEach((row, idx) => {
       const handSheetRow = convertCSVRowToHandSheetRow(row);
       sh.appendRow(handSheetRow);
     });
   }
   ```

### **Phase 2: Record 모드 수정** (2주)

1. **saveHand() 함수 수정**
   - HANDS/ACTIONS 시트 쓰기 → Hand 시트 쓰기
   - 행 타입별 분기 처리

2. **테스트**
   - 기존 HANDS/ACTIONS 데이터와 Hand 시트 데이터 비교
   - 일치 여부 검증

### **Phase 3: Review 모드 재설계** (2주)

1. **UI 개선**
   - 필터 바 추가 (A등급, 키 플레이어)
   - 핸드 목록 테이블 (체크박스, 파일명)
   - 상세 미리보기 (3줄 요약, 자막)

2. **Virtual 시트 입력 기능**
   - `batchWriteToVirtual()` 함수 구현
   - E/F/G/H/J 열 자동 채우기

### **Phase 4: HANDS/ACTIONS 폐기** (1주)

1. **데이터 검증**
   - Hand 시트 데이터 완전성 확인
   - 100개 샘플 핸드 비교

2. **시트 숨기기/삭제**
   - HANDS 시트 숨기기
   - ACTIONS 시트 숨기기
   - 2주 후 완전 삭제

---

## ✅ 검증 체크리스트

### **데이터 무결성**

- [ ] 모든 핸드 블록이 GAME → PAYOUTS → HAND 순서로 시작
- [ ] hand_id가 모든 행에 일관되게 적용
- [ ] seq가 연속적으로 증가 (1, 2, 3, ...)
- [ ] row_type이 5가지 값만 존재 (GAME/PAYOUTS/HAND/PLAYER/EVENT)

### **파일명 로직**

- [ ] 키 플레이어 0명: `{table_id}_NoKeyPlayer`
- [ ] 키 플레이어 1명: `{table_id}_{name}_{cards}`
- [ ] 키 플레이어 2+명: `{table_id}_{name1}_{cards1}_vs_{name2}_{cards2}`

### **3줄 요약 로직**

- [ ] 1줄: 키 플레이어(홀카드) vs ...
- [ ] 2줄: 보드: K♥ T♦ 9♣ 4♠ A♠
- [ ] 3줄: 팟: 44.5BB (44,500)

### **자막 로직**

- [ ] 키 플레이어만 출력
- [ ] chips_end > 0: `CURRENT STACK - {chips} ({bb}BB)`
- [ ] chips_end <= 0: `ELIMINATED`

---

## 📞 참고 자료

- **CSV 원본**: [c:\claude\handlogger\csv\Virtual_Table_Data - Hand.csv](../csv/Virtual_Table_Data - Hand.csv)
- **기존 스키마**: [PRD_HandLogger.md](PRD_HandLogger.md) - HANDS/ACTIONS 시트
- **우선순위 로직**: [code.gs:129-177](../code.gs#L129-L177) - determinePriority_()

---

## 🏁 완료 기준

- [ ] Hand 시트 생성 및 헤더 설정
- [ ] CSV 데이터 import 성공 (2866행)
- [ ] saveHand() 함수 Hand 시트 쓰기 변환
- [ ] Review 모드 UI 재설계 (필터/목록/상세)
- [ ] batchWriteToVirtual() 함수 구현
- [ ] Virtual 시트 E/F/G/H/J 열 자동 입력 확인
- [ ] 100개 샘플 핸드 검증 (기존 vs Hand 시트)
- [ ] HANDS/ACTIONS 시트 폐기
