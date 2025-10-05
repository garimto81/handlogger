# Poker Hand Logger v2.0.1

포커 핸드 실시간 기록 및 모니터링 시스템

## 🚀 Quick Start

### 1. 스프레드시트 준비
```
ROSTER_SPREADSHEET (1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U)
├── Type 시트 - 테이블/플레이어 정보
└── Hand 시트 - 핸드 데이터 (자동 생성, 헤더 없음)
```

### 2. Apps Script 배포
1. [Apps Script Editor](https://script.google.com) 접속
2. code.gs 내용 붙여넣기
3. index.html 파일 생성 및 붙여넣기
4. 배포 → 새 배포 → 웹 앱
5. 액세스 권한: "나만" 선택

### 3. 핸드 기록
1. Web App URL 접속
2. Record 모드 선택
3. 테이블 선택 (Type 시트 기준)
4. 참여자/보드/액션 입력
5. "데이터 전송" 클릭

## 📚 문서

- **[구현 가이드](docs/IMPLEMENTATION_v2.0.1.md)** - v2.0.1 구현 상세 + 테스트 가이드
- **[PRD](docs/PRD_HandLogger.md)** - 제품 요구사항
- **[PLAN](docs/PLAN_HandLogger.md)** - 구현 계획
- **[CSV 분석 (아카이브)](docs/archive/CSV_ANALYSIS_Hand.md)** - CSV 구조 분석

## ✅ v2.0.1 주요 기능 (2025-10-06)

### Hand 시트 (행 타입별 저장)
- ✅ **CSV 형식 호환**: GAME/PAYOUTS/HAND/PLAYER/EVENT 각각 별도 행
- ✅ **헤더 없음**: 데이터 행만 저장
- ✅ **CSV 파싱 앱과 동일 구조**: Record 모드 + CSV Import 통합 저장소
- ✅ **멱등성**: timestamp 기반 (1초 오차 허용)

### Record 모드 저장
**예시 출력** (Hand 시트):
```
1   GAME       GGProd Hand Logger   Virtual Table   2025-10-06
2   PAYOUTS
3   HAND       196   1759696805624   HOLDEM   NO_ANTE   0   0   0   0   0   4   0   0   0   0   1   3
4   PLAYER     Freddie O'Hara       2   0   55000   55000   7s 7h
5   PLAYER     SOHEE                6   0   66000   66000   7d 7c
6   EVENT      POT CORRECTION             4000   0
7   EVENT      BOARD                1     6s     0
8   EVENT      BOARD                1     6h     0
9   EVENT      BET                  6     6000   0
10  EVENT      CALL                 2     6000   0
11  (빈 행)
```

### VIRTUAL 시트 연동
- ✅ Record 모드: 자동 갱신 (기존 유지)
- ✅ C열 Time 파싱 (Date/숫자/문자열 혼합 지원)
- ✅ E/F/G/H/J 열 갱신 (J열: 승자 정보 제거)

## 🔧 다음 세션 검증 가이드

### 준비 단계
1. **Hand 시트 초기화**:
   - ROSTER_SPREADSHEET > Hand 시트 열기
   - 기존 잘못된 데이터 전체 삭제 (19-column 형식이면 삭제)
   - 빈 시트 또는 CSV 데이터만 남김

2. **Apps Script 재배포**:
   - 배포 → 새 배포 생성
   - 배포 URL 복사

### 테스트 1: Record 모드 기본 저장
```
✓ Web App 접속
✓ 테이블 3 선택
✓ 참여자: Seat 2, 6
✓ BTN: Seat 4
✓ Stack: 55000, 66000
✓ 홀카드: 7s 7h / 7d 7c
✓ pre_pot: 4000
✓ 보드: 6s 6h 6d 6c 5s
✓ 액션: BET 6000 (S6), CALL 6000 (S2)
✓ "데이터 전송" 클릭

확인:
✓ Hand 시트 11개 행 추가 (GAME/PAYOUTS/HAND/PLAYER×2/EVENT×6/빈행)
✓ B열: row_type 확인 (GAME, PAYOUTS, HAND, PLAYER, EVENT, ...)
✓ HAND 행 C열: hand_no (196 또는 AUTO)
✓ PLAYER 행 C열: 이름, D열: seat, H열: 홀카드
```

### 테스트 2: 멱등성
```
✓ 같은 핸드 다시 "데이터 전송" 클릭
✓ 메시지: "완료: #196 (idempotent)"
✓ Hand 시트 중복 없음 (11개 행 유지)
```

### 테스트 3: VIRTUAL 연동
```
✓ External Sheet ID 입력
✓ BB 값: 1000
✓ 새 핸드 기록 후 전송
✓ VIRTUAL 시트 E/F/G/H/J 열 확인
```

**상세 가이드**: [IMPLEMENTATION_v2.0.1.md](docs/IMPLEMENTATION_v2.0.1.md#-%ED%86%B5%ED%95%A9-%ED%85%8C%EC%8A%A4%ED%8A%B8-%EA%B0%80%EC%9D%B4%EB%93%9C-%EB%8B%A4%EC%9D%8C-%EC%84%B8%EC%85%98-%EC%8B%A4%ED%96%89)

## ⚠️ 알려진 제약사항

### 1. BB/SB 값 미저장 (Record 모드)
- HAND 행 bb/sb/bb_ante: 모두 0
- **이유**: Record UI에 블라인드 입력 없음
- **대안**: CSV Import 시에만 정확한 값 저장 가능

### 2. Review 모드 미지원 (현재)
- Hand 시트 핸드는 Review 목록에 표시 안 됨
- **해결 예정**: Phase 4에서 queryHands() 수정

### 3. 스트릿 정보 손실
- EVENT 행에 street 미포함
- acts 변환 시 모두 'PREFLOP'으로 표시

## 📝 변경 이력

### v2.0.1 (2025-10-06) - 검증 대기 중
- **Option C → Option A 변경**: 행 타입별 저장 방식 채택
- **_saveHandToHandSheet_() 재작성**: GAME/PAYOUTS/HAND/PLAYER/EVENT 행 생성
- **getHandDetailFromHandSheet_() 재작성**: 행 타입별 파싱 → v1.x 변환
- **ensureSheets_() 수정**: Hand 시트 헤더 제거
- **테스트 가이드 작성**: 다음 세션 검증용

### v1.2.1 (2025-10-06)
- Review 모드 목업 구현
- 버그 수정 4건 (플레이어 이름, 홀카드 색상 등)

### v1.2.0 (2025-10-06)
- Review 모드 2-Panel 레이아웃
- 무한 스크롤 지원

### v1.1.1 (2025-10-02)
- C열 파싱 개선 (혼합 데이터 지원)
- 승자 판정 제거

## 📞 개발자

- **Claude Code** - v2.0.1 구현
- **작성일**: 2025-10-06 (최종 업데이트)
- **검증 예정일**: 다음 세션
