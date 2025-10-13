# Task List: PRD-0001 Keyplayer 테이블 우선 정렬

**PRD**: [0001-prd-keyplayer-table-sort.md](prds/0001-prd-keyplayer-table-sort.md)
**버전**: v2.9.0
**생성일**: 2025-10-13
**예상 소요**: 2-3시간

---

## Parent Tasks (5개 그룹)

### 1. Core Logic (정렬 로직)
- [ ] **T1.1**: `sortTablesByKeyplayer()` 함수 구현
- [ ] **T1.2**: keyplayer 수 집계 로직
- [ ] **T1.3**: 하위 호환성 처리 (keyplayer 컬럼 없는 경우)

### 2. UI Rendering (드롭다운 렌더링)
- [ ] **T2.1**: 테이블 선택 드롭다운 HTML 생성 수정
- [ ] **T2.2**: 키플레이어 카운트 표시 `(3 Key Players)`
- [ ] **T2.3**: CSS 스타일 추가 (골드 배경 + 굵은 글씨)

### 3. Integration (통합)
- [ ] **T3.1**: `initFromConfig()` 함수에 정렬 로직 통합
- [ ] **T3.2**: 정렬 순서 유지 검증 (테이블 변경 시)

### 4. Testing (테스트)
- [ ] **T4.1**: 키플레이어 2개 테이블 시나리오 테스트
- [ ] **T4.2**: 키플레이어 없는 경우 테스트
- [ ] **T4.3**: keyplayer 컬럼 없는 Type 시트 테스트
- [ ] **T4.4**: 빈 테이블 배열 엣지 케이스 테스트

### 5. Documentation (문서화)
- [ ] **T5.1**: README.md v2.9.0 섹션 추가
- [ ] **T5.2**: 코드 주석 추가
- [ ] **T5.3**: Git 커밋 메시지 작성

---

## Sub-Tasks (상세 작업)

### 📦 T1.1: `sortTablesByKeyplayer()` 함수 구현
**위치**: [index.html:250](index.html#L250) (initFromConfig 직전)
**예상 시간**: 30분

#### 구현 내용
```javascript
/**
 * keyplayer가 있는 테이블을 최상단으로 정렬
 * @param {string[]} tables - 테이블 ID 배열 (예: ['1', '15', '2', '23'])
 * @param {Object} roster - S.roster 객체 {tableId: [{seat, player, keyplayer}, ...]}
 * @returns {string[]} 정렬된 테이블 배열 (keyplayer 테이블 우선)
 */
function sortTablesByKeyplayer(tables, roster) {
  if (!tables || !tables.length) return [];

  const withKeyplayer = [];
  const withoutKeyplayer = [];

  tables.forEach(tableId => {
    const players = roster[tableId] || [];
    const hasKeyplayer = players.some(p => p.keyplayer === true);

    if (hasKeyplayer) {
      withKeyplayer.push(tableId);
    } else {
      withoutKeyplayer.push(tableId);
    }
  });

  // 각 그룹 내부를 번호순 정렬
  const sortByNumber = (a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    return (isNaN(numA) ? a : numA) - (isNaN(numB) ? b : numB);
  };

  withKeyplayer.sort(sortByNumber);
  withoutKeyplayer.sort(sortByNumber);

  return [...withKeyplayer, ...withoutKeyplayer];
}
```

#### 수락 기준
- [x] keyplayer ≥ 1인 테이블이 배열 앞쪽
- [x] 각 그룹 내 번호순 정렬
- [x] 빈 배열 입력 시 빈 배열 반환
- [x] roster 없으면 원본 배열 반환

---

### 📦 T1.2: keyplayer 수 집계 로직
**위치**: T1.1 함수 내부
**예상 시간**: 10분

#### 구현 내용
```javascript
// T1.1 함수에 통합
const keyplayerCount = players.filter(p => p.keyplayer === true).length;
```

#### 수락 기준
- [x] 각 테이블의 keyplayer 수 정확히 계산
- [x] keyplayer 필드 없으면 0으로 처리

---

### 📦 T1.3: 하위 호환성 처리
**위치**: T1.1 함수 내부
**예상 시간**: 15분

#### 구현 내용
```javascript
// keyplayer 필드 안전 접근
const hasKeyplayer = players.some(p => p.keyplayer === true);

// roster 객체 없는 경우 fallback
if (!roster || Object.keys(roster).length === 0) {
  console.warn('[sortTablesByKeyplayer] roster 데이터 없음 - 번호순 정렬');
  return tables.sort(sortByNumber);
}
```

#### 수락 기준
- [x] roster 없으면 원본 번호순 정렬
- [x] keyplayer 필드 없으면 false 처리
- [x] console 경고 메시지 표시
- [x] 에러 발생 안 함

---

### 📦 T2.1: 테이블 선택 드롭다운 HTML 생성 수정
**위치**: [index.html:275](index.html#L275)
**예상 시간**: 30분

#### 현재 코드
```javascript
sel.innerHTML = `<option value="">테이블 선택</option>${S.tables.map(t=>`<option value="${t}">${t}</option>`).join('')}`;
```

#### 수정 코드
```javascript
sel.innerHTML = `<option value="">테이블 선택</option>${S.tables.map(t => {
  const players = S.roster[t] || [];
  const keyplayerCount = players.filter(p => p.keyplayer === true).length;
  const isKeyplayer = keyplayerCount > 0;
  const label = isKeyplayer
    ? `⭐ Table ${t} (${keyplayerCount} Key Players)`
    : `Table ${t}`;
  const className = isKeyplayer ? 'keyplayer-option' : '';

  return `<option value="${t}" class="${className}">${label}</option>`;
}).join('')}`;
```

#### 수락 기준
- [x] ⭐ 아이콘 표시
- [x] keyplayer 수 표시 `(3 Key Players)`
- [x] CSS 클래스 `keyplayer-option` 추가
- [x] 일반 테이블은 기존과 동일

---

### 📦 T2.2: 키플레이어 카운트 표시
**위치**: T2.1에 통합
**예상 시간**: 이미 포함

#### 수락 기준
- [x] 1명: `(1 Key Player)` (단수)
- [x] 2명 이상: `(2 Key Players)` (복수)
- [x] 0명: 표시 안 함

---

### 📦 T2.3: CSS 스타일 추가
**위치**: [index.html:21](index.html#L21) `<style>` 섹션
**예상 시간**: 20분

#### 추가 CSS
```css
/* v2.9.0: Keyplayer 테이블 강조 */
select#tableSel option.keyplayer-option {
  font-weight: 800;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

/* 선택된 상태 (closed dropdown) */
select#tableSel:has(option.keyplayer-option:checked) {
  font-weight: 700;
  color: #92400e;
}
```

#### 수락 기준
- [x] 골드 그라데이션 배경 (#fef3c7 → #fde68a)
- [x] 진한 브라운 텍스트 (#92400e)
- [x] 굵은 글씨 (font-weight: 800)
- [x] 모바일 네이티브 드롭다운에서도 시각적 차이

---

### 📦 T3.1: `initFromConfig()` 함수에 정렬 로직 통합
**위치**: [index.html:258](index.html#L258)
**예상 시간**: 15분

#### 현재 코드
```javascript
function initFromConfig(data){
  perfEnd('init');
  S.tables=data.tables; S.roster=data.roster; S.cfg=data.config||{};
  // ...
```

#### 수정 코드
```javascript
function initFromConfig(data){
  perfEnd('init');
  S.roster=data.roster; S.cfg=data.config||{};

  // v2.9.0: keyplayer 테이블 우선 정렬 (Record 모드용)
  S.tables = sortTablesByKeyplayer(data.tables, S.roster);

  // ...
```

#### 수락 기준
- [x] getConfig() 응답 후 즉시 정렬
- [x] S.tables에 정렬된 배열 저장
- [x] 나머지 로직 정상 작동

---

### 📦 T3.2: 정렬 순서 유지 검증
**위치**: [index.html:326](index.html#L326) `onTableChange()`
**예상 시간**: 10분

#### 검증 내용
- 테이블 변경해도 S.tables 순서 유지
- 새로고침 전까지 정렬 순서 불변

#### 수락 기준
- [x] S.tables 배열 불변성 유지
- [x] 드롭다운 재렌더링 시 순서 동일

---

### 📦 T4.1: 키플레이어 2개 테이블 시나리오 테스트
**예상 시간**: 15분

#### 테스트 케이스
```javascript
// Input
const tables = ['1', '15', '2', '23', '3'];
const roster = {
  '15': [{seat: 1, keyplayer: true}, {seat: 2, keyplayer: false}],
  '23': [{seat: 1, keyplayer: true}],
  '1': [{seat: 1, keyplayer: false}]
};

// Expected Output
['15', '23', '1', '2', '3']
```

#### 수락 기준
- [x] 테이블 15, 23이 최상단
- [x] 나머지 번호순 정렬
- [x] ⭐ 아이콘 표시

---

### 📦 T4.2: 키플레이어 없는 경우 테스트
**예상 시간**: 10분

#### 테스트 케이스
```javascript
// Input
const tables = ['1', '2', '3'];
const roster = {
  '1': [{seat: 1, keyplayer: false}],
  '2': [{seat: 1, keyplayer: false}],
  '3': [{seat: 1, keyplayer: false}]
};

// Expected Output
['1', '2', '3']
```

#### 수락 기준
- [x] 기존과 동일한 번호순 정렬
- [x] ⭐ 아이콘 없음

---

### 📦 T4.3: keyplayer 컬럼 없는 Type 시트 테스트
**예상 시간**: 15분

#### 테스트 케이스
```javascript
// Input (keyplayer 필드 없음)
const tables = ['1', '2', '3'];
const roster = {
  '1': [{seat: 1, player: 'Alice', chips: 10000}],  // keyplayer 필드 없음
  '2': [{seat: 1, player: 'Bob'}]
};

// Expected Output
['1', '2', '3']
```

#### 수락 기준
- [x] 에러 없이 작동
- [x] 모든 테이블 일반 처리
- [x] console 경고 메시지 표시

---

### 📦 T4.4: 빈 테이블 배열 엣지 케이스 테스트
**예상 시간**: 10분

#### 테스트 케이스
```javascript
// Case 1: 빈 배열
sortTablesByKeyplayer([], roster) === []

// Case 2: roster 없음
sortTablesByKeyplayer(['1', '2'], {}) === ['1', '2']

// Case 3: null/undefined
sortTablesByKeyplayer(null, roster) === []
```

#### 수락 기준
- [x] 빈 배열 반환
- [x] 에러 발생 안 함

---

### 📦 T5.1: README.md v2.9.0 섹션 추가
**위치**: README.md (프로젝트 루트)
**예상 시간**: 15분

#### 추가 내용
```markdown
## v2.9.0 (2025-10-13) - Keyplayer 테이블 우선 정렬

### Features
- ⭐ **Keyplayer 테이블 최상단 배치**: 36개 테이블 중 VIP/방송 대상 테이블 즉시 선택
- 🎨 **시각적 강조**: ⭐ 아이콘 + 골드 배경 + keyplayer 수 표시
- ⚡ **선택 시간 93% 절감**: 8초 → 0.5초 (테이블 스크롤 제거)
- 🔄 **하위 호환**: keyplayer 컬럼 없는 기존 Type 시트 정상 작동

### Technical Details
- 클라이언트 정렬 (O(n log n), 36개 테이블 < 1ms)
- Record 모드만 적용 (Review 모드 제외)
- PRD: [0001-prd-keyplayer-table-sort.md](tasks/prds/0001-prd-keyplayer-table-sort.md)
```

#### 수락 기준
- [x] v2.9.0 섹션 추가
- [x] PRD 링크 포함
- [x] 주요 기능 나열

---

### 📦 T5.2: 코드 주석 추가
**위치**: 각 함수 상단
**예상 시간**: 10분

#### JSDoc 주석
```javascript
/**
 * v2.9.0: Keyplayer 테이블 우선 정렬
 * - keyplayer가 1명 이상 있는 테이블을 최상단 배치
 * - 각 그룹 내 번호순 정렬 (15, 23, 1, 2, 3, ...)
 * - 하위 호환: keyplayer 컬럼 없으면 모든 테이블 일반 처리
 *
 * @param {string[]} tables - 테이블 ID 배열
 * @param {Object} roster - {tableId: [{keyplayer: boolean}, ...]}
 * @returns {string[]} 정렬된 테이블 배열
 */
```

#### 수락 기준
- [x] sortTablesByKeyplayer() 주석
- [x] initFromConfig() 수정 부분 주석
- [x] 버전 번호 명시 (v2.9.0)

---

### 📦 T5.3: Git 커밋 메시지 작성
**예상 시간**: 5분

#### 커밋 메시지
```
feat: Keyplayer table priority sort (v2.9.0) [PRD-0001]

- Sort tables with keyplayer to top of dropdown
- Add ⭐ icon + gold background + keyplayer count
- Reduce selection time 93% (8s → 0.5s)
- Client-side sort (O(n log n), <1ms for 36 tables)
- Backward compatible (no keyplayer column = all normal)
- Record mode only (Review mode unchanged)

Closes #0001
```

#### 수락 기준
- [x] feat 타입 사용
- [x] 버전 명시 (v2.9.0)
- [x] PRD 참조 [PRD-0001]
- [x] 주요 변경사항 나열

---

## 작업 순서 (권장)

### Step 1: Core Logic (30분)
1. T1.1 → T1.2 → T1.3 (함수 구현)

### Step 2: UI Rendering (30분)
2. T2.3 (CSS 먼저) → T2.1 (HTML)

### Step 3: Integration (15분)
3. T3.1 → T3.2

### Step 4: Testing (50분)
4. T4.1 → T4.2 → T4.3 → T4.4

### Step 5: Documentation (30분)
5. T5.2 (주석) → T5.1 (README) → T5.3 (커밋)

**총 예상 시간**: 2시간 35분

---

## 체크리스트

### Phase 0.5 완료
- [x] Parent Tasks 정의 (5개 그룹)
- [x] Sub-Tasks 상세 작업 (14개)
- [x] 각 Task별 수락 기준
- [x] 예상 시간 산정
- [x] 작업 순서 권장

### 다음 단계
- [ ] **사용자 확인 대기** ← 현재 단계
- [ ] Phase 1: T1.1~T3.2 코드 구현
- [ ] Phase 2: T4.1~T4.4 테스트
- [ ] Phase 3: 버전 업데이트 (v2.9.0)
- [ ] Phase 4: T5.3 Git 커밋
- [ ] Phase 5: GitHub 검증
- [ ] Phase 6: 캐시 갱신

---

**준비 완료**: Task List 검토 후 "코딩 시작" 또는 "Go" 입력 시 Phase 1 개발 시작! 🚀