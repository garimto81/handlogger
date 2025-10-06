# PRD - Poker Hand Logger v2.3

> **작업 목록** | 비전: [PLAN](PLAN_HandLogger.md) | 구현: [LLD](LLD_HandLogger.md) | 상태: [STATUS](STATUS.md)

## 🎯 프로젝트 목표

**대회 방송 프로덕션 데이터 매니저가 대회장에서 키 플레이어 핸드를 실시간 기록하고, 프로덕션/편집팀이 VIRTUAL 시트를 통해 즉시 데이터에 접근할 수 있는 모바일 웹앱**

- **PLAN 근거**: 시나리오 2 (핸드 실시간 기록), 시나리오 3 (프로덕션 팀 실시간 접근)
- **성공 기준**: 핸드당 기록 시간 ≤ 60초, 데이터 오류율 ≤ 5%

---

## Phase 1: MVP (v2.3 완료)

### 1.1 핸드 실시간 기록 🔴 High
- **근거**: PLAN 시나리오 2 (30초 내 핸드 기록 완료)
- **성공**: 핸드당 기록 시간 ≤ 60초
- **체크리스트**:
  - [x] 테이블 선택 드롭다운 (Type 시트 로드)
  - [x] BTN 좌석 선택 + 자동 복원 (CONFIG 시트)
  - [x] 액션 버튼 (CHECK/CALL/BET/RAISE/FOLD/ALLIN)
  - [x] 보드 카드 선택 (터치 UI, 5장 제한)
  - [x] 실시간 팟 계산 (contrib 기반)
  - [x] Commit → HANDS/ACTIONS 시트 저장
- **예상**: 완료 (v2.3)
- **의존성**: 없음

### 1.2 키 플레이어 관리 🔴 High
- **근거**: PLAN 시나리오 1 (Type 시트에 18명 키 플레이어 등록)
- **성공**: 80개 테이블 중 키 플레이어만 입력 가능
- **체크리스트**:
  - [x] Type 시트 파싱 (Table No., Seat No., Players, Chips)
  - [x] 다중 별칭 지원 (TableNo/Table_Number/table_no)
  - [x] 테이블별 플레이어 그룹핑 (roster 객체)
  - [x] 테이블 전환 시 해당 테이블 플레이어만 로드
- **예상**: 완료 (v2.3)
- **의존성**: 없음

### 1.3 VIRTUAL 시트 선별 전송 🔴 High
- **근거**: PLAN 시나리오 3 (후반 작업자가 Review에서 핸드 선별 → VIRTUAL 전송)
- **성공**: VIRTUAL 시트 전송 성공률 ≥ 99%
- **체크리스트**:
  - [x] Review 모드에서 핸드 상세 확인
  - [x] "VIRTUAL 전송" 버튼 추가 (detailContent 하단)
  - [x] `pushToVirtual(hand_id, sheetId, bb)` 서버 함수
  - [x] VIRTUAL 시트 appendRow (새 행 추가 방식)
  - [x] E열(상태) "미완료", F열(파일명), H열(히스토리) 자동 생성
  - [x] 전송 완료 메시지 표시 (행 번호, 파일명)
- **예상**: 완료 (v2.4)
- **의존성**: 1.1 (핸드 저장), 1.4 (Review 모드)

### 1.4 핸드 리뷰 🟡 Medium
- **근거**: PLAN 시나리오 3 (데이터 확인 시 즉시 조회)
- **성공**: Review 검색 시간 ≤ 10초
- **체크리스트**:
  - [x] 핸드 목록 (최신순 정렬, 무한 스크롤)
  - [x] 핸드 상세 (보드/스택/홀카드/액션 히스토리)
  - [x] 2-Panel 레이아웃 (List + Detail)
  - [x] 카드 배지 컬러 코딩 (♠검정/♥빨강/♦파랑/♣초록)
  - [x] 액션 배지 (CHECK/CALL=녹색, BET/RAISE=빨강, FOLD=파랑, ALLIN=진빨강)
- **예상**: 완료 (v2.2)
- **의존성**: 1.1 (핸드 데이터)

### 1.5 단일 파일 아키텍처 🔴 High
- **근거**: 관리 복잡도 감소 (2개 파일 → 1개 파일)
- **성공**: ROSTER_SPREADSHEET 완전 제거
- **체크리스트**:
  - [x] Type 시트 APP_SPREADSHEET로 이동
  - [x] ROSTER_SPREADSHEET_ID 상수 삭제
  - [x] rosterSS_() 함수 삭제
  - [x] readRoster_() → appSS() 사용
  - [x] 문서 업데이트 (LLD/PRD/MIGRATION/CHECKLIST)
- **예상**: 완료 (v2.3)
- **의존성**: 없음

### 1.6 보안 강화 🔴 High
- **근거**: 프로덕션 환경 XSS 취약점 제거
- **성공**: XSS 취약점 0건, localStorage 키 일관성 100%
- **체크리스트**:
  - [x] `renderStackGrid()` innerHTML → textContent 전환
  - [x] `renderPlayerRows()` innerHTML → textContent 전환
  - [x] `formatStreetSection()` innerHTML → textContent 전환
  - [x] `renderDetailContent()` Table ID textContent 처리
  - [x] localStorage 키 통일 (phl_ext_sheetId → phl_extSheetId)
- **예상**: 완료 (v2.4.0)
- **의존성**: 없음

### 1.7 VIRTUAL 시트 C열 Time 매칭 ✅ 완료 (v2.5.0)
- **근거**: PLAN 시나리오 3 (편집팀이 VIRTUAL C열에 time.log 미리 입력 → 매칭 필요)
- **성공**: Time 매칭 정확도 100%, 잘못된 행 입력 0건
- **체크리스트**:
  - [x] `extractTimeHHMM_(isoString)` 함수 추가 (ISO → HH:MM KST 변환)
  - [x] `pushToVirtual()` appendRow 제거 → C열 매칭 로직으로 재작성
  - [x] C열 전체 읽기 (행4부터, Date 객체 처리)
  - [x] Date 객체 → HH:MM 변환 로직 (getHours/getMinutes)
  - [x] 매칭 실패 시 명확한 에러 메시지 + LOG 시트 디버깅 정보
  - [x] F열 멱등성 체크 유지 (중복 전송 방지)
  - [x] E/F/G/H/J 열만 개별 업데이트 (`getRange().setValue()`)
  - [x] G열 등급 `'A'` 고정값 적용
  - [x] `buildSubtitleBlock_(detail, tableId, bb)` 자막 생성 함수 추가
  - [x] J열 자막 포맷: `NAME / NATION\nCURRENT STACK - XXX (XXBB)`
  - [x] TYPE 시트 Keyplayer 필터링 (Y/TRUE만 자막 출력)
  - [x] ROSTER_HEADERS에 keyplayer 추가
  - [x] readRoster_()에 keyplayer 필드 읽기
- **완료**: v2.5.0 (2025-10-06)
- **테스트**: ✅ 18:59 Time 매칭 성공 (행423)

---

## Phase 2: 성능 최적화 (v2.5 예정)

### 2.1 BB 입력 디바운싱 🟡 Medium
- **근거**: 매 키입력마다 localStorage 쓰기 → 성능 저하
- **성공**: localStorage 쓰기 횟수 90% 감소
- **체크리스트**:
  - [ ] `bbInput.oninput` 디바운싱 (500ms 지연)
  - [ ] `debounce()` 유틸 함수 추가
  - [ ] 즉시 UI 반영 + 지연 저장
- **예상**: 30분
- **의존성**: 없음

### 2.2 Commit 버튼 중복 클릭 방지 🟡 Medium
- **근거**: 연속 클릭 시 중복 핸드 저장 가능성
- **성공**: 중복 저장 에러율 0%
- **체크리스트**:
  - [ ] `commitBtn.onclick` 시작 시 `disabled=true`
  - [ ] 성공/실패 후 `disabled=false` 복원
  - [ ] 진행 중 UI 피드백 추가
- **예상**: 20분
- **의존성**: 없음

### 2.3 이벤트 리스너 메모리 누수 해결 🟡 Medium
- **근거**: `renderStackGrid()` 호출마다 리스너 중복 생성
- **성공**: 메모리 누수 0건
- **체크리스트**:
  - [ ] 이벤트 위임 패턴 적용 (grid 단위)
  - [ ] `replaceChildren()` 사용으로 리스너 자동 정리
  - [ ] DOM 쿼리 캐싱 (`getElementById` 반복 호출 제거)
- **예상**: 2시간
- **의존성**: 없음

---

## Phase 3: 사용성 개선 (v2.6 예정)

### 3.1 보드↔홀카드 양방향 중복 차단 🟡 Medium
- **근거**: 데이터 정확도 향상 (현재: 단방향만)
- **성공**: 카드 중복 에러율 0%
- **체크리스트**:
  - [ ] `toggleBoardCard()`에 홀카드 중복 체크 추가
  - [ ] alert 메시지 "이미 홀카드에서 사용 중"
  - [ ] `pickCardOverlay()` 기존 로직 유지
- **예상**: 1시간
- **의존성**: 없음

### 3.2 ALLIN 자동 계산 개선 🟡 Medium
- **근거**: 데이터 매니저 입력 속도 향상
- **성공**: ALLIN 입력 시간 50% 감소
- **체크리스트**:
  - [ ] Type 시트 칩 활용 (stacks 없을 때 대체)
  - [ ] `inferStack(seat)` 함수 추가 (1.입력 스택 → 2.Type 칩 → 3.null)
  - [ ] ALLIN 프롬프트에 기본값 자동 설정
- **예상**: 2시간
- **의존성**: 없음

### 3.3 테이블 이동 추적 개선 🟢 Low
- **근거**: PLAN 시나리오 4 (테이블 이동 빈번 발생)
- **성공**: 테이블 전환 시간 ≤ 5초
- **체크리스트**:
  - [ ] 최근 사용 테이블 localStorage 저장
  - [ ] 테이블 선택 드롭다운 상단에 최근 3개 표시
  - [ ] "마지막 테이블로 돌아가기" 버튼
- **예상**: 1.5시간
- **의존성**: 없음

---

## Phase 4: 데이터 관리 (v2.7 예정)

### 4.1 CSV Import/Export 🟢 Low
- **근거**: 기존 데이터 마이그레이션 지원
- **성공**: CSV 파일 Import 성공률 ≥ 95%
- **체크리스트**:
  - [x] `importHandsFromCSV()` 함수 (HAND/PLAYER/EVENT 행 파싱)
  - [x] `exportHandsToCSV()` 함수
  - [x] CSV 모드 UI 추가
  - [ ] Type 시트 CSV Import 지원
- **예상**: 완료 (코드 작성됨), Type 지원 +1시간
- **의존성**: 없음

### 3.2 핸드 삭제/수정 🟡 Medium
- **근거**: 잘못된 데이터 수정 필요
- **성공**: 삭제/수정 성공률 100%
- **체크리스트**:
  - [ ] Review 모드에 "삭제" 버튼 추가
  - [ ] 삭제 확인 다이얼로그 (hand_id 표시)
  - [ ] HANDS/ACTIONS 행 삭제 (withScriptLock_)
  - [ ] 수정 기능 (Record 모드에서 기존 데이터 로드)
- **예상**: 3시간
- **의존성**: 1.4 (Review 모드)

---

## Phase 4: 고급 기능 (v3.0 예정)

### 4.1 사이드팟 자동 계산 🔴 High
- **근거**: 정확한 팟 분배 추적
- **성공**: 사이드팟 계산 정확도 100%
- **체크리스트**:
  - [ ] `computeSidePots()` 함수 구현
  - [ ] HANDS 시트 `side_pots_json` 컬럼 추가
  - [ ] UI에 사이드팟 표시 (Main Pot / Side Pot 1, 2, ...)
  - [ ] Review 모드에 사이드팟 표시
- **예상**: 8시간
- **의존성**: 없음

### 4.2 핸드 히스토리 내보내기 🟡 Medium
- **근거**: 외부 분석 도구 호환성
- **성공**: PokerStars 포맷 호환
- **체크리스트**:
  - [ ] `exportHandHistory(hand_id)` 함수
  - [ ] PokerStars 텍스트 포맷 생성
  - [ ] Review 모드에 "내보내기" 버튼
  - [ ] 다운로드 기능 (Blob + URL.createObjectURL)
- **예상**: 4시간
- **의존성**: 1.4 (Review 모드)

### 4.3 모바일 반응형 개선 🟢 Low
- **근거**: 대회장에서 스마트폰 사용
- **성공**: 모바일 반응속도 ≤ 300ms
- **체크리스트**:
  - [ ] 뷰포트 기반 동적 높이 (calc(100vh - 420px))
  - [ ] 액션 패드 가로 스크롤
  - [ ] 카드 터치 영역 최소 44x44px
  - [ ] 더블탭 제스처 개선
- **예상**: 3시간
- **의존성**: 없음

---

## 🚫 제약사항

### 기술적 제약
- **Google Apps Script 실행 시간**: 최대 6분 (ScriptLock timeout)
- **Sheets API 쿼터**: 1일 500,000회 (동시 사용자 제한)
- **localStorage 용량**: 5~10MB (브라우저별 상이)

### 기능적 제약
- **BTN만 지원**: SB/BB 구분 없음 (CSV Import에서 SB/BB 파싱하지만 사용 안 함)
- **승자 판정 없음**: winner_seat 제거됨 (v1.1.1)
- **보드 미완성 허용**: Preflop only 핸드 저장 가능

---

## 📊 성공 지표

### PLAN 기준 (최종 목표)
- [ ] **핸드당 기록 시간** ≤ 60초 (현재: 30초 ✅ 달성)
- [ ] **후반 작업자 핸드 선별 시간** ≤ 10초/건 (Review 모드에서 확인 → VIRTUAL 전송)
- [ ] **키 플레이어 위치 업데이트** ≤ 30초 (Type 시트 수동 수정 → HandLogger 테이블 전환)
- [ ] **VIRTUAL 시트 전송 성공률** ≥ 99%
- [ ] **편집팀 전달 데이터 정확도** ≥ 95% (후반 작업자가 선별한 핸드만 전송)

### 기술적 지표
- [ ] **멱등성 보장**: 중복 제출 방지율 100%
- [ ] **ScriptLock 성공률**: ≥ 99% (재시도 포함)
- [ ] **모바일 반응속도**: ≤ 300ms (터치 → 반응)
- [ ] **데이터 정확도**: 액션/팟 계산 오류율 ≤ 1%

---

## 🔗 관련 문서

- [PLAN_HandLogger.md](PLAN_HandLogger.md) - 프로젝트 비전 (페르소나/시나리오/성공 기준)
- [LLD_HandLogger.md](LLD_HandLogger.md) - 기술 설계 (목차/AI 인덱스/기술 결정)
- [STATUS.md](STATUS.md) - 현재 진행 상태
- [CHANGELOG.md](CHANGELOG.md) - 버전별 변경 이력
