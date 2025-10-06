# LLD - Tracker (Key Player & Table Manager) v1.0

> **기술 설계** | 비전: [PLAN_Tracker](PLAN_Tracker.md) | 작업: [PRD_Tracker](PRD_Tracker.md)

## 🔍 AI 인덱스

- **PRD 1.1**: `tracker.html:1` (독립 HTML 파일)
- **PRD 1.2**: `tracker.html:123` (loadKeyPlayers 함수), `tracker.gs:60` (getKeyPlayers 함수)
- **PRD 1.3**: `tracker.html:151` (loadTablePlayers 함수), `tracker.gs:105` (getTablePlayers 함수)
- **PRD 1.4**: `tracker.html:191` (editChips 함수), `tracker.gs:165` (updatePlayerChips 함수)
- **PRD 1.5**: `tracker.html:226` (addPlayerPrompt 함수), `tracker.gs:211` (addPlayer 함수)
- **PRD 1.6**: `tracker.html:279` (deletePlayerConfirm 함수), `tracker.gs:265` (removePlayer 함수)

---

## 📑 아키텍처

### 전체 구조
```
Tracker (완전 독립 웹앱)
├── 프론트엔드 (tracker.html) ← 신규 파일
│   ├── Key Player View (keyPlayerList div)
│   ├── Table View (tablePlayerList div)
│   └── 오버레이 (칩 수정/플레이어 추가/삭제 확인)
│
├── 백엔드 (tracker.gs) ← 신규 파일
│   ├── getKeyPlayers() - Type 시트 Keyplayer=TRUE 읽기
│   ├── getTablePlayers(tableId) - 특정 테이블 9좌석 읽기
│   ├── updatePlayerChips(tableId, seatNo, chips) - 칩 수정
│   ├── addPlayer(tableId, seatNo, name, nation, chips, isKey) - 플레이어 추가
│   ├── removePlayer(tableId, seatNo) - 플레이어 삭제
│   └── doGet_Tracker(e) - 웹앱 진입점
│
└── 데이터 소스 (Type 시트)
    └── 컬럼: Table No., Seat No., Players, Nationality, Chips, Keyplayer
```

---

## 🧠 기술 결정

### 1. 왜 완전 독립 파일 (tracker.html + tracker.gs)?
- **PLAN 근거**: HandLogger(index.html + code.gs)와 완전 분리
- **장점**:
  - index.html 수정 불필요 (기존 Record/Review 모드 무손실 유지)
  - Google Apps Script에서 별도 웹앱으로 배포 가능
  - 독립 개발/테스트 가능 (HandLogger 영향 없음)
- **트레이드오프**: 헬퍼 함수 중복 (withScriptLock_, readAll_ 등)

### 2. 왜 독립 웹앱?
- **PLAN 근거**: Tracker는 Type 시트만 관리, HANDS/ACTIONS 시트 미사용
- **장점**: HandLogger Record/Review 모드와 완전 분리 → 충돌 없음
- **트레이드오프**: 사용자가 2개 URL 관리 필요 (HandLogger + Tracker)

### 2. 왜 일반 텍스트 입력?
- **PLAN 근거**: Minimal Design 철학 (코드 최소화)
- **장점**: 숫자패드 커스텀 UI 불필요 → 구현 시간 50% 감소
- **트레이드오프**: 사용자가 "k" 단위 입력 필요 (예: 520000 또는 520k)

### 3. 왜 localStorage 칩 변화량 추적?
- **PLAN 근거**: 시나리오 3 (칩 변화량 시각화 ↑↓)
- **장점**: 서버 부하 없음, 클라이언트 사이드 완결
- **트레이드오프**: 브라우저 삭제 시 이력 손실

### 4. 왜 ScriptLock 사용?
- **PLAN 근거**: 동시 사용자 Type 시트 동시 쓰기 방지
- **장점**: 데이터 무결성 보장
- **트레이드오프**: 대기 시간 발생 (최대 0.5초)

---

## 🗂️ 데이터 모델

### Type 시트 구조
```
| Table No. | Seat No. | Players  | Nationality | Chips  | Keyplayer |
|-----------|----------|----------|-------------|--------|-----------|
| T15       | S3       | 박프로   | KR          | 520000 | TRUE      |
| T15       | S1       | Alice    | US          | 280000 | FALSE     |
| T28       | S5       | 김프로   | KR          | 310000 | TRUE      |
```

### localStorage 구조
```javascript
{
  "phl_chipHistory": {
    "T15_S3": [520000, 750000], // 이전 칩, 현재 칩
    "T28_S5": [310000, 270000]
  }
}
```

---

## 🔧 핵심 함수 설계

### 프론트엔드 (index.html)

#### `loadKeyPlayers()` - 키 플레이어 목록 렌더링
```javascript
function loadKeyPlayers() {
  showLoading();
  google.script.run
    .withSuccessHandler(players => {
      const list = document.getElementById('keyPlayerList');
      list.innerHTML = '';
      players.forEach(p => {
        const card = createKeyPlayerCard(p); // 카드 HTML 생성
        list.appendChild(card);
      });
      hideLoading();
    })
    .withFailureHandler(err => showError(err))
    .getKeyPlayers();
}
```

#### `loadTablePlayers(tableId)` - 테이블 플레이어 목록 렌더링
```javascript
function loadTablePlayers(tableId) {
  showLoading();
  google.script.run
    .withSuccessHandler(players => {
      const list = document.getElementById('tablePlayerList');
      list.innerHTML = '';
      for (let i = 1; i <= 9; i++) {
        const seat = `S${i}`;
        const player = players.find(p => p.seatNo === seat);
        const row = player ? createPlayerRow(player) : createEmptySeatRow(seat);
        list.appendChild(row);
      }
      hideLoading();
    })
    .withFailureHandler(err => showError(err))
    .getTablePlayers(tableId);
}
```

#### `editChips(tableId, seatNo, currentChips)` - 칩 수정 오버레이
```javascript
function editChips(tableId, seatNo, currentChips) {
  const newChips = prompt(`현재: ${currentChips}\n새 칩 (예: 750000 또는 750k):`);
  if (!newChips) return;

  const parsed = parseChips(newChips); // "750k" → 750000 변환
  showLoading();
  google.script.run
    .withSuccessHandler(() => {
      saveChipHistory(tableId, seatNo, currentChips, parsed); // localStorage
      loadKeyPlayers(); // UI 리렌더링
    })
    .withFailureHandler(err => showError(err))
    .updatePlayerChips(tableId, seatNo, parsed);
}
```

#### `addPlayerPrompt(tableId, seatNo)` - 플레이어 추가 오버레이
```javascript
function addPlayerPrompt(tableId, seatNo) {
  // 간단 구현: 4개 prompt 연속 (v1.1에서 폼 오버레이로 개선)
  const name = prompt('이름:');
  if (!name) return;
  const nation = prompt('국적 (KR, US, JP 등):', 'KR');
  const chips = prompt('칩:');
  const isKey = confirm('키 플레이어로 등록?');

  showLoading();
  google.script.run
    .withSuccessHandler(() => loadTablePlayers(tableId))
    .withFailureHandler(err => showError(err))
    .addPlayer(tableId, seatNo, name, nation, parseChips(chips), isKey);
}
```

#### `deletePlayerConfirm(tableId, seatNo, playerName)` - 삭제 확인
```javascript
function deletePlayerConfirm(tableId, seatNo, playerName) {
  if (!confirm(`${seatNo} ${playerName} 삭제하시겠습니까?`)) return;

  showLoading();
  google.script.run
    .withSuccessHandler(() => loadTablePlayers(tableId))
    .withFailureHandler(err => showError(err))
    .removePlayer(tableId, seatNo);
}
```

---

### 백엔드 (code.gs)

#### `getKeyPlayers()` - 키 플레이어 목록 반환
```javascript
function getKeyPlayers() {
  const roster = readRoster_(); // 기존 함수 재사용
  return roster
    .filter(p => p.keyplayer === true)
    .map(p => ({
      tableNo: p.tableNo,
      seatNo: p.seatNo,
      player: p.player,
      nation: p.nation,
      chips: p.chips
    }));
}
```

#### `getTablePlayers(tableId)` - 테이블 전체 플레이어 반환
```javascript
function getTablePlayers(tableId) {
  const roster = readRoster_();
  const players = roster.filter(p => p.tableNo === tableId);

  const result = [];
  for (let i = 1; i <= 9; i++) {
    const seat = `S${i}`;
    const found = players.find(p => p.seatNo === seat);
    if (found) {
      result.push({
        seatNo: seat,
        player: found.player,
        nation: found.nation,
        chips: found.chips,
        keyplayer: found.keyplayer
      });
    } else {
      result.push({ seatNo: seat, empty: true });
    }
  }
  return result;
}
```

#### `updatePlayerChips(tableId, seatNo, newChips)` - 칩 업데이트
```javascript
function updatePlayerChips(tableId, seatNo, newChips) {
  return withScriptLock_(() => {
    const ss = appSS_();
    const sh = ss.getSheetByName(SH.TYPE);
    const data = readAll_(sh);

    const rowIndex = data.rows.findIndex(r =>
      r[data.map['Table No.']] === tableId &&
      r[data.map['Seat No.']] === seatNo
    );

    if (rowIndex === -1) throw new Error(`${tableId} ${seatNo} 플레이어 없음`);

    const chipsCol = data.map['Chips'];
    sh.getRange(rowIndex + 2, chipsCol + 1).setValue(newChips); // +2 = 헤더 + 0-index

    return { success: true };
  });
}
```

#### `addPlayer(tableId, seatNo, name, nation, chips, isKey)` - 플레이어 추가
```javascript
function addPlayer(tableId, seatNo, name, nation, chips, isKey) {
  return withScriptLock_(() => {
    const ss = appSS_();
    const sh = ss.getSheetByName(SH.TYPE);

    // 중복 체크
    const data = readAll_(sh);
    const exists = data.rows.some(r =>
      r[data.map['Table No.']] === tableId &&
      r[data.map['Seat No.']] === seatNo
    );
    if (exists) throw new Error(`${tableId} ${seatNo} 이미 존재`);

    // 추가
    sh.appendRow([tableId, seatNo, name, nation, chips, isKey]);
    return { success: true };
  });
}
```

#### `removePlayer(tableId, seatNo)` - 플레이어 삭제
```javascript
function removePlayer(tableId, seatNo) {
  return withScriptLock_(() => {
    const ss = appSS_();
    const sh = ss.getSheetByName(SH.TYPE);
    const data = readAll_(sh);

    const rowIndex = data.rows.findIndex(r =>
      r[data.map['Table No.']] === tableId &&
      r[data.map['Seat No.']] === seatNo
    );

    if (rowIndex === -1) throw new Error(`${tableId} ${seatNo} 플레이어 없음`);

    sh.deleteRow(rowIndex + 2); // +2 = 헤더 + 0-index
    return { success: true };
  });
}
```

---

## 🎨 UI 컴포넌트 설계

### Key Player Card
```html
<div class="keyPlayerCard">
  <div class="cardHeader">
    <span class="tableLabel">T15</span>
    <span class="playerName">박프로 (S3)</span>
    <span class="flag">🇰🇷</span>
  </div>
  <div class="chipRow" onclick="editChips('T15', 'S3', 750000)">
    <span class="chips">750k</span>
    <span class="chipChange up">↑230k</span>
  </div>
  <button onclick="loadTablePlayers('T15')">T15 관리</button>
</div>
```

### Table Player Row
```html
<!-- 플레이어 있을 때 -->
<div class="playerRow">
  <span class="seat">S3</span>
  <span class="name">박프로⭐</span>
  <span class="flag">🇰🇷</span>
  <span class="chips" onclick="editChips('T15', 'S3', 750000)">750k</span>
  <button class="deleteBtn" onclick="deletePlayerConfirm('T15', 'S3', '박프로')">🗑️</button>
</div>

<!-- 빈 좌석 -->
<div class="playerRow empty">
  <span class="seat">S2</span>
  <span class="emptySeat">(빈 좌석)</span>
  <button onclick="addPlayerPrompt('T15', 'S2')">[+]</button>
</div>
```

---

## 🚀 성능 최적화

### 1. 클라이언트 사이드 캐싱
- localStorage에 키 플레이어 목록 저장 (30초 TTL)
- 서버 호출 최소화

### 2. 배치 업데이트 (v1.2)
- 일괄 칩 입력 시 `batchUpdate` 사용
- 9명 칩 업데이트를 1번의 API 호출로 처리

### 3. UI 리렌더링 최적화
- 칩 수정 시 전체 리렌더링 대신 해당 카드만 업데이트 (v1.1)

---

## 🧪 테스트 시나리오

### 1. 키 플레이어 목록 로딩
- **Given**: Type 시트에 Keyplayer=TRUE 18명
- **When**: Tracker 모드 진입
- **Then**: 18개 카드 표시, 2초 이내 로딩

### 2. 칩 수정
- **Given**: 박프로 520k
- **When**: "520k" 클릭 → "750000" 입력 → 확인
- **Then**: Type 시트 업데이트, UI "750k" 표시, 변화량 "↑230k"

### 3. 플레이어 추가
- **Given**: T15 S2 빈 좌석
- **When**: [+] → "Alice", "US", "280000", ☐ 입력
- **Then**: Type 시트 행 추가, Table View 리렌더링

### 4. 플레이어 삭제
- **Given**: T15 S3 박프로
- **When**: 🗑️ → 확인
- **Then**: Type 시트 행 삭제, Table View 리렌더링

---

## 🔗 관련 문서

- [PLAN_Tracker.md](PLAN_Tracker.md) - 프로젝트 비전
- [PRD_Tracker.md](PRD_Tracker.md) - 작업 목록
- [LLD_HandLogger.md](LLD_HandLogger.md) - 본체 기술 설계