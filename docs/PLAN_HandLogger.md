# PLAN - Poker Hand Logger

## 📌 프로젝트 개요
- **목표**: 포커 핸드 실시간 기록 및 외부 시트 연동 시스템 유지보수
- **현재 버전**: v2.2.1 (2025-10-05)
- **현재 상태**: ✅ Review 모드 UI 설계 완료, 🔨 구현 대기 중
- **주요 컴포넌트**: Google Apps Script (Code.gs, 562줄) + Web App (index.html, 656줄)

---

## 📚 완료된 작업 (2025-10-05)

### ✅ 프로젝트 문서화
**완료일**: 2025-10-05
**소요 시간**: 약 4시간

#### 생성된 문서
1. **[PRD_HandLogger.md](PRD_HandLogger.md)** - Product Requirements Document
   - 프로젝트 개요 및 핵심 목표
   - 주요 기능 상세 명세 (Record/Review/외부 연동)
   - 데이터 스키마 (HANDS/ACTIONS/CONFIG)
   - v1.1.1 변경사항 및 제약사항

2. **[LLD_HandLogger.md](LLD_HandLogger.md)** - Low-Level Design
   - 시스템 아키텍처 다이어그램
   - Code.gs 모듈별 상세 분석 (562줄)
   - index.html 구조 및 로직 (656줄)
   - 데이터 흐름 (Record/Review)
   - 동시성 제어 (ScriptLock/멱등성)

3. **[PLAN_HandLogger.md](PLAN_HandLogger.md)** - 본 문서
   - 프로젝트 진행 계획
   - 다음 작업 체크리스트

#### CSV 참고 자료 분석
- **파일**: [csv/Virtual_Table_Data - Hand.csv](../csv/Virtual_Table_Data - Hand.csv)
- **용도**: 기존 데이터 형식 참고 (2866행, 5가지 행 타입)
- **주요 발견**:
  - HAND[11,12,13]: BTN/SB/BB 좌석 정보
  - EVENT 타입: BOARD/액션/POT CORRECTION
  - 비표준 포맷: "RAIES" 오타, "CALL X,XXX" 등

---

## 🔍 다음 작업: HANDS 시트 업데이트 검증

### 📋 작업 개요
**목표**: 현재 HandLogger가 저장하는 HANDS/ACTIONS 데이터가 올바르게 동작하는지 검증

### ✅ 검증 체크리스트

#### 1단계: 기본 동작 확인
- [ ] **Web App 접속**
  - Apps Script 배포 URL 확인
  - Record/Review 모드 전환 동작 확인

- [ ] **테이블/플레이어 설정**
  - ROSTER 시트에서 테이블 목록 로드 확인
  - 좌석별 플레이어 정보 표시 확인
  - BTN 좌석 선택 및 복원 확인

#### 2단계: 핸드 기록 검증
- [ ] **샘플 핸드 기록** (Preflop → River)
  ```
  테이블: T01
  참여자: S1(Alice, 50000), S2(Bob, 50000), S3(Charlie, 50000)
  BTN: S1

  Preflop:
  - S1 BET 2000
  - S2 RAISE 5000
  - S3 FOLD
  - S1 CALL

  Flop (Kh 10d 7c):
  - S1 CHECK
  - S2 BET 10000
  - S1 RAISE 25000
  - S2 CALL

  Turn (2s):
  - S1 CHECK
  - S2 CHECK

  River (Ac):
  - S1 BET 15000
  - S2 FOLD
  ```

- [ ] **HANDS 시트 확인**
  - hand_id 생성 형식: `yyyyMMdd_HHmmssSSS`
  - table_id: "T01"
  - hand_no: CONFIG 시트 hand_seq 자동 증가 확인
  - btn_seat: "1"
  - board_f1~f3: "Kh", "10d", "7c"
  - board_turn: "2s"
  - board_river: "Ac"
  - start_street: "PREFLOP"
  - stacks_json: `{"1":50000,"2":50000,"3":50000}`
  - holes_json: 홀카드 입력 시 올바르게 저장되는지 확인

- [ ] **ACTIONS 시트 확인**
  - 총 12개 액션 생성 확인
  - seq: 1~12 순차 증가
  - street: PREFLOP(4) → FLOP(4) → TURN(2) → RIVER(2)
  - to_call_after 계산:
    - seq 2 (RAISE 5000): to_call_after = 5000
    - seq 4 (CALL): amount_input = 3000 (5000-2000)
  - pot_after 누적:
    - seq 1: 2000
    - seq 2: 7000 (2000+5000)
    - seq 3: 7000 (FOLD)
    - seq 4: 10000 (7000+3000)
    - seq 5: 10000 (CHECK)
    - seq 6: 20000 (10000+10000)
    - seq 7: 45000 (20000+25000)
    - seq 8: 60000 (45000+15000)
    - seq 9: 60000 (CHECK)
    - seq 10: 60000 (CHECK)
    - seq 11: 75000 (60000+15000)
    - seq 12: 75000 (FOLD)

- [ ] **CONFIG 시트 확인**
  - table_id: "T01" 행 생성/업데이트
  - btn_seat: "1" 저장
  - hand_seq: 자동 증가 (다음 핸드 번호 확인)
  - updated_at: 타임스탬프 갱신

#### 3단계: 멱등성 검증
- [ ] **중복 제출 방지**
  - 같은 핸드 2번 커밋 시도
  - client_uuid + started_at 조합으로 중복 차단 확인
  - HANDS 시트에 1개만 저장되는지 확인

#### 4단계: 외부 시트 연동 검증
- [ ] **VIRTUAL 시트 갱신**
  - External Sheet ID 설정
  - BB 값 설정
  - 커밋 시 VIRTUAL 시트 업데이트 확인
  - C열(Time) 파싱 동작 확인
  - E열: "미완료"
  - F열: 파일명 생성 (예: VT1_Alice_AsKs_vs_Bob_QdQc)
  - G열: "A"
  - H열: 3줄 요약 (참가자/보드/팟)
  - J열: 공란 (winner_seat 제거)

#### 5단계: Review 모드 검증
- [ ] **핸드 목록 조회**
  - 최신순 정렬 확인
  - 핸드 번호/테이블/시간 표시 확인

- [ ] **핸드 상세 조회**
  - 보드 카드 배지 표시
  - 스택 스냅샷 표시
  - 홀카드 표시
  - 액션 히스토리 스트릿별 그룹핑
  - 액션 배지 색상 (CHECK/CALL=녹색, BET/RAISE=빨강, FOLD=파랑, ALLIN=진빨강)

#### 6단계: 엣지 케이스 테스트
- [ ] **보드 미완성 허용**
  - Preflop only (보드 0장)
  - Flop only (보드 3장)
  - Turn까지 (보드 4장)

- [ ] **스트릿별 시작 핸드**
  - start_street: "FLOP" (보드 먼저 선택)
  - start_street: "TURN"
  - start_street: "RIVER"

- [ ] **ALLIN 처리**
  - ALLIN 액션 기록
  - amount_input 수동 입력 확인

- [ ] **pre_pot 입력**
  - pre_pot 값 설정
  - pot_after 계산에 반영 확인

#### 7단계: 성능 테스트
- [ ] **ScriptLock 동작**
  - 빠른 연속 커밋 시도
  - 락 대기 및 재시도 로그 확인 (LOG 시트)

- [ ] **대용량 데이터**
  - 100개 이상 핸드 저장
  - Review 목록 로딩 속도 확인

---

## 🐛 발견된 이슈 (Issue Tracker)

### Critical
_아직 없음_

### High
_아직 없음_

### Medium
_아직 없음_

### Low
_아직 없음_

---

## 🎯 향후 개발 계획 (v1.2.0 이후)

### 1. 보드↔홀카드 양방향 중복 차단
**우선순위**: HIGH
**예상 시간**: 1시간

### 1. 보드↔홀카드 양방향 중복 차단
**우선순위**: HIGH
**예상 시간**: 1시간

#### 배경
- 현재: 보드 → 홀카드 단방향 차단만 구현 ([index.html:446](index.html#L446))
- 문제: 홀카드 선택 후 보드에 같은 카드 선택 가능

#### 작업 내용
1. **`toggleBoardCard()` 수정** ([index.html:417-422](index.html#L417-L422))
   ```javascript
   function toggleBoardCard(card, el) {
     // 추가: 홀카드 중복 체크
     const usedInHoles = Object.values(S.holes)
       .flat()
       .filter(Boolean)
       .includes(card);
     if (usedInHoles) {
       alert(`${prettyCard(card)}는 이미 홀카드에서 사용 중입니다.`);
       return;
     }

     const i = S.board.indexOf(card);
     // ... 기존 로직
   }
   ```

2. **`pickCardOverlay()` 유지**
   - 기존 보드 차단 로직 유지 ([index.html:446](index.html#L446))

3. **테스트 케이스**
   ```
   1. S1 홀카드 A♠K♠ 선택
   2. 보드에서 A♠ 클릭 → alert 표시, 선택 취소
   3. S1 홀카드 A♠ 지우기
   4. 보드에서 A♠ 클릭 → 정상 선택
   ```

#### 검증 기준
- [ ] 홀카드에 있는 카드는 보드 선택 불가
- [ ] 보드에 있는 카드는 홀카드 선택 불가 (기존 유지)
- [ ] 카드 삭제 시 즉시 다른 곳에서 선택 가능

---

### 2. ALLIN 자동 계산 개선
**우선순위**: MEDIUM
**예상 시간**: 2시간

#### 배경
- 현재: stacks[seat] 있을 때만 기본값 제공 ([index.html:348-350](index.html#L348-L350))
- 문제: 스택 미입력 시 수동 계산 필요

#### 작업 내용
1. **스택 추론 로직 추가**
   ```javascript
   function inferStack(seat) {
     // 1순위: 입력된 스택
     if (S.stacks[seat] != null) {
       return S.stacks[seat];
     }

     // 2순위: Roster 시작 칩
     const rosterSeat = S.seats.find(s => s.seat === seat);
     if (rosterSeat && rosterSeat.chips > 0) {
       return rosterSeat.chips;
     }

     // 3순위: null (수동 입력 필요)
     return null;
   }
   ```

2. **`onAction('ALLIN')` 수정** ([index.html:348-350](index.html#L348-L350))
   ```javascript
   if (kind === 'ALLIN') {
     const stack = inferStack(seat);
     let def = '';
     if (stack != null) {
       const remain = Math.max(0, stack - (S.contrib[seat] || 0));
       def = String(remain);
     }
     const val = prompt(`ALLIN 금액 (스택: ${stack || '미입력'})`, def);
     // ...
   }
   ```

3. **UI 개선**: 스택 그리드에 Roster 칩 힌트 표시
   ```html
   <input type="number"
          placeholder="stack (Roster: ${s.chips || '-'})"
          value="${S.stacks[s.seat] ?? ''}" />
   ```

#### 검증 기준
- [ ] 스택 입력 시: 기존 동작 유지
- [ ] 스택 미입력 + Roster 칩 존재: Roster 칩 기준 계산
- [ ] 둘 다 없을 시: 프롬프트 빈 값 (수동 입력)

---

### 3. 턴 순서 건너뛰기 최적화
**우선순위**: LOW
**예상 시간**: 1.5시간

#### 배경
- 현재: `skipInvalidActors()` 50회 루프 가드 ([index.html:258-266](index.html#L258-L266))
- 문제: 비효율적, 무한루프 리스크

#### 작업 내용
1. **`buildTurnOrder()` 수정** ([index.html:242-256](index.html#L242-L256))
   ```javascript
   function buildTurnOrder() {
     // active → aliveNonAllin으로 변경
     const active = S.seats
       .map(s => toInt(s.seat))
       .filter(seat =>
         S.activeSeatMap[seat] &&
         !S.allin[seat] &&
         !S.folded[seat]
       )
       .sort((a,b) => a - b);

     if (!active.length) {
       S.order = [];
       S.actorIdx = 0;
       return;
     }

     // ... 기존 Preflop/Postflop 로직
     // skipInvalidActors() 호출 제거
   }
   ```

2. **`advanceActor()` 간소화** ([index.html:384](index.html#L384))
   ```javascript
   function advanceActor() {
     if (S.order.length === 0) return;
     S.actorIdx = (S.actorIdx + 1) % S.order.length;
     // while 루프 제거 (order에 유효한 좌석만 존재)
   }
   ```

3. **폴드/올인 시 즉시 재계산**
   ```javascript
   function applyAction({ seat, action, amt }) {
     // ... 기존 로직
     if (action === 'ALLIN') S.allin[seat] = true;
     if (action === 'FOLD') S.folded[seat] = true;

     // 턴 순서 재계산
     if (action === 'FOLD' || action === 'ALLIN') {
       buildTurnOrder();
     } else {
       advanceActor();
     }
     // ...
   }
   ```

#### 검증 기준
- [ ] 폴드/올인 후 즉시 다음 유효 플레이어로 이동
- [ ] 모두 올인/폴드 시 S.order = [] (액션 불가)
- [ ] 무한루프 발생 없음

---

### 4. 외부 시트 Time 포맷 확장
**우선순위**: MEDIUM
**예상 시간**: 2.5시간

#### 배경
- 현재: `HH:mm(:ss)` 정규식만 지원 ([code.gs:375](code.gs#L375))
- 요청: "2:05 PM", "오후 2시 5분" 등 다양한 포맷 지원

#### 작업 내용
1. **Apps Script `Utilities.parseDate()` 활용**
   ```javascript
   function parseTimeCellToTodayKST_(raw, disp) {
     let hh = null, mm = null, ss = 0;

     // 1) Date 객체 (기존)
     if (raw && raw instanceof Date) {
       hh = raw.getHours();
       mm = raw.getMinutes();
       ss = raw.getSeconds() || 0;
     }
     // 2) 숫자 (기존)
     else if (typeof raw === 'number' && isFinite(raw)) {
       // ... 기존 로직
     }
     // 3) 문자열 확장
     else {
       const s = String(disp || '').trim();

       // 3-1) 기존 정규식 (HH:mm:ss)
       const m1 = s.match(/(\d{1,2})\s*:\s*(\d{2})(?::(\d{2}))?/);
       if (m1) {
         hh = parseInt(m1[1], 10);
         mm = parseInt(m1[2], 10);
         ss = m1[3] ? parseInt(m1[3], 10) : 0;
       }
       // 3-2) AM/PM 포맷 (2:05 PM)
       else {
         const m2 = s.match(/(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM|am|pm)/i);
         if (m2) {
           let h = parseInt(m2[1], 10);
           mm = parseInt(m2[2], 10);
           const period = m2[3].toUpperCase();
           if (period === 'PM' && h < 12) h += 12;
           if (period === 'AM' && h === 12) h = 0;
           hh = h;
           ss = 0;
         }
       }
     }

     if (hh === null || mm === null) return null;
     const base = todayStartKST_();
     base.setHours(hh, mm, ss, 0);
     return base;
   }
   ```

2. **테스트 케이스**
   ```
   "14:30"     → 14:30:00 ✓ (기존)
   "2:05 PM"   → 14:05:00 ✓ (신규)
   "12:00 AM"  → 00:00:00 ✓ (신규)
   "12:00 PM"  → 12:00:00 ✓ (신규)
   "오후 2시"  → null (미지원, 향후 확장)
   ```

3. **로그 추가**
   ```javascript
   log_('TIME_PARSE', `raw=${raw} disp=${disp} → ${result?.toISOString() || 'null'}`)
   ```

#### 검증 기준
- [ ] 기존 HH:mm(:ss) 포맷 정상 동작
- [ ] AM/PM 12시간 포맷 정상 변환
- [ ] 파싱 실패 시 null 반환 (오류 없음)

---

## 🚀 중기 목표 (v1.3.0)

### 5. 사이드팟 자동 계산
**우선순위**: HIGH
**예상 시간**: 8시간

#### 개요
- 현재: 메인팟만 계산 ([index.html:359](index.html#L359))
- 목표: 올인 상황 시 사이드팟 자동 분리

#### 설계
```javascript
// 사이드팟 계산 알고리즘
function computeSidePots() {
  // 1. 올인 플레이어 추출 (기여액 오름차순)
  const allinPlayers = Object.entries(S.allin)
    .filter(([_, isAllin]) => isAllin)
    .map(([seat, _]) => ({
      seat,
      contrib: S.contrib[seat]
    }))
    .sort((a,b) => a.contrib - b.contrib);

  if (allinPlayers.length === 0) {
    return [{
      name: 'Main Pot',
      amount: S.pot,
      eligible: aliveSeats()
    }];
  }

  const pots = [];
  let prevCap = 0;

  // 2. 각 올인 레벨별로 팟 생성
  for (const {seat, contrib} of allinPlayers) {
    const eligible = Object.keys(S.contrib)
      .filter(s => !S.folded[s] && S.contrib[s] >= contrib);

    const amount = eligible.reduce((sum, s) => {
      const contribution = Math.min(S.contrib[s], contrib) - prevCap;
      return sum + contribution;
    }, 0);

    pots.push({
      name: `${pots.length === 0 ? 'Main' : 'Side'} Pot ${pots.length + 1}`,
      cap: contrib,
      amount,
      eligible
    });

    prevCap = contrib;
  }

  // 3. 메인팟 (나머지)
  const remaining = aliveSeats().filter(s => !S.allin[s]);
  if (remaining.length > 0) {
    const mainAmount = remaining.reduce((sum, s) =>
      sum + (S.contrib[s] - prevCap), 0
    );
    pots.push({
      name: 'Main Pot',
      amount: mainAmount,
      eligible: remaining
    });
  }

  return pots;
}
```

#### UI 변경
1. **팟 표시 영역 확장**
   ```html
   <div id="potBreakdown">
     <div>Total: <b id="pot">0</b></div>
     <div id="sidePotList" class="small muted"></div>
   </div>
   ```

2. **렌더링**
   ```javascript
   function renderPot() {
     const pots = computeSidePots();
     document.getElementById('pot').textContent = S.pot;

     const listHtml = pots.map(p =>
       `${p.name}: ${p.amount} (${p.eligible.join(',')})`
     ).join('<br/>');
     document.getElementById('sidePotList').innerHTML = listHtml;
   }
   ```

3. **저장 포맷**
   ```javascript
   // HANDS 시트에 side_pots_json 컬럼 추가
   side_pots_json: JSON.stringify(computeSidePots())
   ```

#### 검증 케이스
```
시나리오: 3명 (S1, S2, S3)
S1 스택: 100, S2: 200, S3: 300

1. S1 ALLIN 100
   → Main Pot: 300 (S1,S2,S3 eligible)

2. S2 CALL 100
3. S3 CALL 100
4. Flop
5. S2 ALLIN 100 (총 200)
   → Main Pot: 300 (S1,S2,S3)
   → Side Pot: 200 (S2,S3)

6. S3 CALL 100
   → Main Pot: 300 (S1,S2,S3)
   → Side Pot: 200 (S2,S3)
```

#### 마일스톤
- [ ] `computeSidePots()` 함수 구현
- [ ] UI 렌더링 추가
- [ ] HANDS 시트 side_pots_json 컬럼 추가
- [ ] 테스트 시나리오 5개 검증
- [ ] Review 모드 사이드팟 표시

---

### 6. 핸드 히스토리 내보내기
**우선순위**: MEDIUM
**예상 시간**: 4시간

#### 기능
- 핸드 상세 → 텍스트 포맷 변환
- 포맷: PokerStars/GGPoker 호환

#### 구현
1. **서버 함수 추가** ([code.gs](code.gs))
   ```javascript
   function exportHandHistory(hand_id) {
     const { head, acts } = getHandDetail(hand_id);
     const roster = readRoster_().roster[head.table_id] || [];

     const lines = [
       `PokerStars Hand #${head.hand_no}: Hold'em No Limit`,
       `Table '${head.table_id}' 9-max Seat #${head.btn_seat} is the button`,
       ''
     ];

     // 좌석 정보
     roster.forEach(s => {
       const stack = safeParseJson_(head.stacks_json)[s.seat] || s.chips;
       lines.push(`Seat ${s.seat}: ${s.player} (${stack} in chips)`);
     });

     lines.push('');

     // 홀카드
     const holes = safeParseJson_(head.holes_json);
     Object.entries(holes).forEach(([seat, cards]) => {
       const player = roster.find(r => r.seat == seat)?.player || `Seat ${seat}`;
       lines.push(`Dealt to ${player} [${cards.join(' ')}]`);
     });

     lines.push('');

     // 액션 히스토리
     let curStreet = '';
     acts.forEach(a => {
       if (a.street !== curStreet) {
         curStreet = a.street;
         if (curStreet === 'FLOP') {
           const board = [head.board.f1, head.board.f2, head.board.f3].filter(Boolean);
           lines.push(`*** FLOP *** [${board.join(' ')}]`);
         } else if (curStreet === 'TURN') {
           lines.push(`*** TURN *** [${head.board.turn}]`);
         } else if (curStreet === 'RIVER') {
           lines.push(`*** RIVER *** [${head.board.river}]`);
         }
       }

       const player = roster.find(r => r.seat == a.seat)?.player || `Seat ${a.seat}`;
       const amt = a.amount_input > 0 ? ` ${a.amount_input}` : '';
       lines.push(`${player}: ${a.action.toLowerCase()}${amt}`);
     });

     return lines.join('\n');
   }
   ```

2. **클라이언트 버튼** ([index.html](index.html))
   ```javascript
   function exportCurrent() {
     const hand_id = currentDetailHandId; // 상세 조회 중인 hand_id
     google.script.run
       .withSuccessHandler(text => {
         const blob = new Blob([text], { type: 'text/plain' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `hand_${hand_id}.txt`;
         a.click();
       })
       .exportHandHistory(hand_id);
   }
   ```

3. **UI 버튼 추가**
   ```html
   <div id="detail">
     <!-- 상세 내용 -->
     <button onclick="exportCurrent()">핸드 히스토리 다운로드</button>
   </div>
   ```

#### 검증
- [ ] 내보낸 파일 PokerStars 뷰어 호환성
- [ ] 보드/홀카드 포맷 정확도
- [ ] 액션 순서/금액 일치

---

### 7. 모바일 반응형 개선
**우선순위**: LOW
**예상 시간**: 3시간

#### 현재 문제
- 카드 그리드 세로 스크롤 38vh 제한 ([index.html:25](index.html#L25))
- 액션 패드 2열 고정 ([index.html:30](index.html#L30))

#### 개선안
1. **뷰포트 기반 동적 높이**
   ```css
   .boardWrap {
     max-height: calc(100vh - 420px); /* 헤더+설정+여백 제외 */
   }
   ```

2. **액션 패드 가로 스크롤**
   ```css
   .actionDock .pad {
     display: flex;
     gap: 10px;
     overflow-x: auto;
     -webkit-overflow-scrolling: touch;
   }

   .actionDock button {
     flex: 0 0 48%; /* 모바일: 2열 */
     min-width: 140px;
   }

   @media (min-width: 768px) {
     .actionDock button {
       flex: 0 0 24%; /* 태블릿: 4열 */
     }
   }
   ```

3. **터치 제스처 개선**
   ```javascript
   // 카드 더블탭 선택/해제
   let lastTap = 0;
   el.ontouchend = (e) => {
     const now = Date.now();
     if (now - lastTap < 300) {
       handler(card, el);
     }
     lastTap = now;
   };
   ```

---

## 📊 장기 목표 (v2.0.0)

### 8. 멀티 테이블 동시 기록
**예상 시간**: 16시간

#### 개요
- 현재: 단일 테이블만 지원
- 목표: 탭 기반 멀티 테이블 전환

#### 아키텍처
```javascript
const S = {
  tables: [...],      // 전체 테이블 목록
  activeTableId: '',  // 현재 활성 탭
  sessions: {         // 테이블별 세션
    'T1': {
      curStreet: 'PREFLOP',
      btnSeat: 2,
      actions: [...],
      board: [...],
      // ... 기존 S 상태 전부
    },
    'T2': { /* ... */ }
  }
}

// 탭 전환
function switchTable(tableId) {
  saveCurrentSession();
  S.activeTableId = tableId;
  restoreSession(tableId);
  renderAll();
}
```

#### UI 변경
```html
<div id="tableTabs" class="row">
  <button data-table="T1" class="tab active">테이블 1</button>
  <button data-table="T2" class="tab">테이블 2</button>
  <button id="addTableBtn">+ 테이블 추가</button>
</div>
```

---

### 9. 실시간 동기화 (Firebase/Firestore)
**예상 시간**: 24시간

#### 배경
- 현재: Google Sheets 폴링 (새로고침 필요)
- 목표: 실시간 멀티 유저 동기화

#### 스택
- **백엔드**: Firebase Firestore
- **인증**: Firebase Auth (Google 계정 연동)
- **실시간**: Firestore onSnapshot

#### 마이그레이션 계획
1. **Phase 1**: Firestore 병렬 쓰기
   - HANDS/ACTIONS → Sheets + Firestore 동시 저장
   - 읽기는 Sheets 유지
2. **Phase 2**: 읽기 전환
   - Review 모드 Firestore 읽기로 전환
   - Sheets는 백업용
3. **Phase 3**: 완전 전환
   - Sheets 쓰기 제거
   - Apps Script → Cloud Functions

---

### 10. AI 핸드 분석
**예상 시간**: 40시간

#### 기능
- 핸드 히스토리 → GTO 분석
- 최적 액션 추천
- EV 계산

#### 통합
- **API**: PokerSnowie / PioSolver API
- **UI**: 상세 화면에 "분석" 버튼 추가
- **결과**: 스트릿별 최적 액션 + EV 차트

---

## 🐛 버그 수정 우선순위

### Critical (즉시 수정)
1. **멱등성 체크 타임존 불일치** ([code.gs:184](code.gs#L184))
   - 문제: `started_at` 문자열 비교 시 타임존 차이
   - 해결: ISO8601 정규화 또는 timestamp 비교
   ```javascript
   const t1 = new Date(r[idxStart]).getTime();
   const t2 = new Date(payload.started_at).getTime();
   if (Math.abs(t1 - t2) < 1000) { /* 멱등 */ }
   ```

### High (1주 내)
2. **hand_seq 경쟁 조건** ([code.gs:231-233](code.gs#L231-L233))
   - 문제: getValue() → +1 → setValue() 사이 간격
   - 해결: 원자적 증가 (Apps Script 제약으로 락 강화)
   ```javascript
   // 트랜잭션 시뮬레이션
   const cur = sh.getRange(found, idxS+1).getValue();
   const next = cur + 1;
   sh.getRange(found, idxS+1).setValue(next);
   // 검증
   const verify = sh.getRange(found, idxS+1).getValue();
   if (verify !== next) {
     throw new Error('Concurrent modification');
   }
   ```

### Medium (1개월 내)
3. **외부 시트 쓰기 실패 시 롤백 없음** ([code.gs:165-169](code.gs#L165-L169))
   - 문제: HANDS/ACTIONS 저장 성공 후 외부 시트 실패 시 데이터 불일치
   - 해결: 외부 시트를 선택적 기능으로 명시 (현재 동작 유지)
   - 또는: 외부 시트 실패 시 LOG에 재시도 큐 기록

---

## 📅 릴리스 일정

### v1.2.0 (2주 후)
- [x] 보드↔홀카드 양방향 중복 차단
- [x] ALLIN 자동 계산 개선
- [x] 턴 순서 최적화
- [x] 외부 시트 Time 포맷 확장

### v1.3.0 (1개월 후)
- [ ] 사이드팟 자동 계산
- [ ] 핸드 히스토리 내보내기
- [ ] 모바일 반응형 개선

### v2.0.0 (3개월 후)
- [ ] 멀티 테이블 동시 기록
- [ ] Firebase 실시간 동기화
- [ ] AI 핸드 분석

---

## 🧪 테스트 전략

### 단위 테스트 (Google Apps Script)
```javascript
// tests/code.test.gs
function testParseTimeCellToTodayKST() {
  const cases = [
    { input: new Date(2025,10,5,14,30), expected: '14:30:00' },
    { input: 0.604166667, expected: '14:30:00' },
    { input: '14:30', expected: '14:30:00' },
    { input: '2:05 PM', expected: '14:05:00' },
    { input: '12:00 AM', expected: '00:00:00' }
  ];

  cases.forEach(c => {
    const result = parseTimeCellToTodayKST_(c.input, String(c.input));
    const actual = Utilities.formatDate(result, 'Asia/Seoul', 'HH:mm:ss');
    if (actual !== c.expected) {
      throw new Error(`Expected ${c.expected}, got ${actual}`);
    }
  });

  Logger.log('testParseTimeCellToTodayKST PASSED');
}
```

### E2E 테스트 (Puppeteer)
```javascript
// tests/e2e.spec.js
describe('Hand Recording', () => {
  it('should prevent duplicate cards between board and holes', async () => {
    await page.goto('https://script.google.com/...');

    // 홀카드에 A♠ 선택
    await page.click('[data-seat="1"] .holeBadge');
    await page.click('[data-card="As"]');

    // 보드에서 A♠ 클릭 시도
    await page.click('#boardRowRecord [data-card="As"]');

    // alert 확인
    const alertText = await page.evaluate(() => {
      return new Promise(resolve => {
        window.alert = (msg) => resolve(msg);
      });
    });

    expect(alertText).toContain('이미 홀카드에서 사용 중');
  });
});
```

---

## 📈 성능 모니터링

### 측정 지표
1. **서버 응답 시간**
   ```javascript
   function log_(code, msg, tableId) {
     const start = new Date();
     // ... 기존 로직
     const duration = new Date() - start;
     if (duration > 1000) {
       Logger.log(`SLOW: ${code} took ${duration}ms`);
     }
   }
   ```

2. **클라이언트 렌더링**
   ```javascript
   function renderAll() {
     const start = performance.now();
     renderSeatToggles();
     renderStackGrid();
     // ...
     const duration = performance.now() - start;
     if (duration > 100) {
       console.warn(`renderAll slow: ${duration}ms`);
     }
   }
   ```

3. **외부 시트 쓰기**
   ```javascript
   function updateExternalVirtual_() {
     const start = new Date();
     // ... setValue() 호출들
     const duration = new Date() - start;
     log_('EXT_PERF', `duration=${duration}ms`);
   }
   ```

---

## 🔒 보안 체크리스트

### 현재 보안 상태
- [x] 스크립트 락으로 동시성 제어
- [x] 멱등성으로 중복 방지
- [x] XSS: HtmlService 자동 이스케이프
- [ ] CSRF: 토큰 없음 (Apps Script 기본 보호 의존)
- [ ] 인증: Google 계정 기반 (Session.getActiveUser())
- [ ] 인가: 없음 (모든 사용자 동일 권한)

### 개선 사항
1. **테이블별 접근 제어** (v2.0)
   ```javascript
   // CONFIG 시트에 owner 컬럼 추가
   function checkAccess(tableId) {
     const owner = readConfig_()[tableId]?.owner;
     const user = Session.getActiveUser().getEmail();
     if (owner && owner !== user) {
       throw new Error('Access denied');
     }
   }
   ```

2. **데이터 검증 강화**
   ```javascript
   function validatePayload(p) {
     if (!p.table_id || !p.btn_seat) {
       throw new Error('Required fields missing');
     }
     if (p.actions && !Array.isArray(p.actions)) {
       throw new Error('actions must be array');
     }
     // ...
   }
   ```

---

## 📚 문서화 작업

### 코드 주석 추가
- [ ] [code.gs](code.gs) JSDoc 스타일 주석
  ```javascript
  /**
   * VIRTUAL 시트의 Time 셀(C열)을 KST 오늘 날짜 기준 시각으로 파싱
   * @param {Date|number|string} raw - 원시 셀 값
   * @param {string} disp - 표시 문자열 (getDisplayValues)
   * @return {Date|null} KST 시각 또는 null
   */
  function parseTimeCellToTodayKST_(raw, disp) { /* ... */ }
  ```

### API 문서 (JSDoc → Markdown)
- [ ] `generateApiDocs.js` 스크립트 작성
- [ ] `docs/API.md` 자동 생성

### 사용자 가이드
- [ ] `docs/USER_GUIDE.md` 작성
  - 초기 설정 (Roster 시트 준비)
  - 핸드 기록 플로우
  - 외부 시트 연동 설정
  - 트러블슈팅

---

## 🎓 팀 온보딩

### 신규 개발자용 체크리스트
1. [ ] PRD/LLD/PLAN 문서 읽기
2. [ ] 로컬 환경 설정
   - clasp 설치 (`npm i -g @google/clasp`)
   - `clasp login`
   - `clasp clone [SCRIPT_ID]`
3. [ ] 테스트 시트 생성
   - APP_SPREADSHEET 복사
   - ROSTER_SPREADSHEET 복사
   - code.gs 상수 업데이트
4. [ ] 첫 핸드 기록 (샘플 데이터)
5. [ ] 코드 수정 → `clasp push` → 테스트

### 코드 리뷰 가이드
- 스타일: Prettier (없음 → 추가 예정)
- 린팅: ESLint (없음 → 추가 예정)
- PR 템플릿:
  ```markdown
  ## 변경 사항
  - [ ] 버그 수정
  - [ ] 기능 추가
  - [ ] 리팩토링

  ## 테스트
  - [ ] 단위 테스트 추가/통과
  - [ ] E2E 시나리오 검증

  ## 문서
  - [ ] PRD/LLD 업데이트
  - [ ] 코드 주석 추가
  ```

---

## 📞 연락처 및 리소스

### 프로젝트 관리
- **Repo**: (GitHub 링크 추가 예정)
- **Issue Tracker**: GitHub Issues
- **CI/CD**: (Apps Script 자동 배포 설정 예정)

### 참고 자료
- [Apps Script Guides](https://developers.google.com/apps-script)
- [Sheets API Reference](https://developers.google.com/sheets/api)
- [Poker Hand Rankings](https://www.pokerstrategy.com/strategy/various-poker/hand-rankings/)

---

## 🏁 완료 기준

### v1.2.0 Definition of Done
- [ ] 모든 High 우선순위 작업 완료
- [ ] 단위 테스트 커버리지 > 70%
- [ ] E2E 테스트 핵심 시나리오 5개 통과
- [ ] 성능 회귀 없음 (렌더링 < 100ms)
- [ ] 문서 업데이트 (PRD/LLD 변경사항 반영)
- [ ] 배포 및 프로덕션 검증 (샘플 핸드 10개 기록)
