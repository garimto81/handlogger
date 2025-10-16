# PRD 요약 문서
## Poker Hand Logger v3.7.1

**문서 버전**: 3.7.1 | **최종 업데이트**: 2025-01-16 | **5분 완독용**

---

## 🎯 제품 한 줄 요약
**실시간 포커 토너먼트 핸드 기록 & 브로드캐스트 자동화** - Google Apps Script 기반 제로 인프라, 모바일 최적화

---

## 📊 핵심 지표 (v3.7.1)

| 지표 | 목표 | 현재 |
|------|------|------|
| 핸드 기록 완료율 | 95% | 93% |
| VIRTUAL 전송 성공률 | 98% | 97% |
| 평균 핸드 기록 시간 | < 3분 | 2.8분 |
| **초기 로딩 시간** | **< 1초** | **0.475초 (76% 절감)** ⭐ |
| **VIRTUAL 전송 시간** | **< 5초** | **2.0초 (56% 개선)** ⭐ |
| **코드 품질** | **> 80점** | **82점 (Critical 0건)** ✅ |
| 지원 테이블 수 | 36개 | 36개 ✅ |

---

## 🚀 주요 변경사항

### v3.7.1 (2025-01-16) - 보안 & 안정성 패치 (P0 Critical)
| 이슈 | 상태 | 조치 |
|------|------|------|
| **무한 루프 버그** | Critical | ✅ 최대 100회 재시도 제한 |
| **Spreadsheet ID 노출** | Critical | ✅ PropertiesService 이전 |
| **에러 메시지 정보 노출** | Critical | ✅ 민감 정보 제거 (sanitization) |

**출처**: 코드 리뷰 82/100 - Critical 이슈 3건 대응
**파일**: [code.gs:580-588](../code.gs#L580-L588), [164-179](../code.gs#L164-L179), [1011-1014](../code.gs#L1011-L1014)

### v3.7.0 (2025-01-16) - VIRTUAL 전송 성능 최적화
| 항목 | Before | After | 개선 |
|------|--------|-------|------|
| **VIRTUAL 전송 전체** | 4462ms | 2000ms | 56% 단축 ⭐ |
| **컬럼 읽기 (역순 스캔)** | 1482ms | 50ms | 97% 절감 |
| **핸드 상세 조회 (캐시)** | 1009ms | 100ms | 90% 개선 |
| **값 생성 (로깅 최소화)** | 985ms | 500ms | 50% 개선 |

**핵심 개선:**
- ✅ VIRTUAL 역순 스캔 (1442행 → 50행 윈도우)
- ✅ HandDetail 캐시 (CacheService 5분 TTL)
- ✅ 최근 데이터 우선: HANDS 100개, ACTIONS 500개
- ✅ 로깅 오버헤드 제거 (buildSubtitle_ 최적화)

### v3.5.0 (2025-01-15) - 2차 성능 최적화 (Sparse Reads)
| 항목 | Before | After | 개선 |
|------|--------|-------|------|
| **queryHands() 컬럼 읽기** | 20개 전체 | 11개 필수 | 45% 절감 ⭐ |
| **Review 탭 로딩** | 800ms | 475ms | 41% 단축 |
| **누적 성능 (v3.3.4 → v3.5.0)** | 2000ms | 475ms | **76% 개선** ⭐ |

**핵심 개선:**
- ✅ Sparse Column Reads (queryHands: 20→11 컬럼)
- ✅ 무한 스크롤 최적화 확인 (페이지네이션)
- ✅ Lazy Board UI 확인 (오버레이 방식)

### v3.4.0 (2025-01-15) - 1차 성능 최적화 (캐싱 레이어)
| 항목 | Before | After | 개선 |
|------|--------|-------|------|
| **PropertiesService 캐시** | 800ms | 50ms | 94% 단축 ⭐ |
| **CacheService 캐시** | 400ms | 20ms | 95% 단축 ⭐ |
| **getConfig() 전체** | 1200ms | 70ms | 91% 개선 |
| **Batched API** | N회 왕복 | 1회 왕복 | 60% 절감 |

**핵심 개선:**
- ✅ Roster 캐시 (5분 TTL, PropertiesService)
- ✅ CONFIG 캐시 (1분 TTL, CacheService)
- ✅ doBatch() 일괄 처리 API
- ✅ 캐시 무효화 (upsertConfig_ 시)

### v2.8.0 (2025-10-12) - 대규모 토너먼트 지원
| 항목 | Before | After | 개선 |
|------|--------|-------|------|
| **스프레드시트** | 2개 분리 (APP + ROSTER) | 1개 통합 | 관리 간소화 ⭐ |
| **시트 이름** | ROSTER (별도) | Type (APP 내부) | 영구 고정 |
| **컬럼 수** | 6개 | 11개 (5개 선택적 추가) | 83% 확장 |
| **테이블 지원** | 3개 | 36개 | 12배 확장 ⭐ |
| **플레이어 추적** | 이름만 | PlayerId 고유 ID | 동명이인 구분 |
| **함수 변경** | `rosterSS_()` | `appSS_()` 통합 | 코드 단순화 |

**핵심 개선:**
- ✅ 단일 스프레드시트 통합 (APP_SPREADSHEET_ID)
- ✅ Type 시트 확장 컬럼: playerId, tableId, seatId, pokerRoom, tableName
- ✅ 하위 호환성 100% (6컬럼 Type 시트 정상 작동)

### v2.9.0 (2025-10-13) - UX 개선
| 항목 | Before | After | 개선 |
|------|--------|-------|------|
| **테이블 정렬** | 번호순 | Keyplayer 우선 | 93% 시간 절감 ⭐ |
| **선택 시간** | 8초 (36개) | 0.5초 | O(n log n) |
| **키플레이어 표시** | 없음 | ⭐ 아이콘 + 골드 배경 | 시각적 강조 |
| **Keyplayer 수** | 표시 안함 | "(2 Key Players)" | 정보 제공 |

**핵심 개선:**
- ✅ 클라이언트 정렬 (`sortTablesByKeyplayer()`)
- ✅ 드롭다운 CSS 강조 (`keyplayer-option` 클래스)
- ✅ 하위 호환 (keyplayer 컬럼 없어도 작동)

---

## 🗂️ 데이터 모델 (v2.8.0 업데이트)

### 시스템 구조
```
APP_SPREADSHEET_ID (단일 통합) ⭐
├── HANDS (핸드 헤더)
├── ACTIONS (액션 시퀀스)
├── CONFIG (테이블 상태, 36개)
├── LOG (에러 로그)
└── Type (플레이어 명부, 11컬럼) ⭐
```

### Type 시트 스키마 (v2.8.0)
```
필수 6개: TableNo, SeatNo, Players, Nationality, Chips, Keyplayer
선택 5개: PlayerId, TableId, SeatId, PokerRoom, TableName ⭐
```

**하위 호환성:**
- v2.7.2 이전 6컬럼 → ✅ 정상 작동
- v2.8.0 11컬럼 → ✅ 정상 작동
- 선택적 필드 없으면 빈 문자열

---

## 🎨 주요 기능

### 1. Record Mode (핸드 기록)
**플로우**: 테이블 선택 → 좌석 토글 → 홀카드/보드 → 액션 → 커밋

**v2.9.0 개선:**
- ⭐ Keyplayer 테이블 최상단 정렬
- 드롭다운에서 "⭐ Table 15 (2 Key Players)" 표시
- 36개 테이블 < 1ms 정렬

**핵심 기술:**
- 기여액 기반 팟 계산 (사이드팟 미지원)
- ScriptLock 동시성 제어
- 멱등성 보장 (client_uuid + started_at)

### 2. Review Mode (핸드 복기)
**플로우**: 리스트 조회 → 상세 확인 → VIRTUAL 전송

**VIRTUAL 시트 자동화:**
- 파일명: `VT47_A-Kim_AcAd_vs_B-Lee_KhKc`
- 히스토리: 3줄 요약 (참가자, 보드, 팟)
- 키플레이어 자막: 이름/국적/스택 또는 ELIMINATED

### 3. 설정 관리
- BB 설정: 팟/스택 BB 환산
- VIRTUAL 시트 ID: localStorage 저장
- CONFIG 시트: 36개 테이블 상태 관리

---

## 📱 기술 스택

| 계층 | 기술 | 특징 |
|------|------|------|
| 프론트엔드 | HTML/CSS/JS | 단일 파일, 의존성 0 |
| 백엔드 | Google Apps Script | V8 Runtime, 서버리스 |
| DB | Google Sheets | 무료 (1,000만 셀) |
| 배포 | Web App | HTTPS 자동 |

**제로 인프라 비용** ✅

---

## ⚡ 성능 목표

| 작업 | 목표 | 현재 | 성능 |
|------|------|------|------|
| **getConfig()** | **< 2초** | **0.07초** | **91% 개선** ⭐ |
| **queryHands() 50건** | **< 1.5초** | **0.275초** | **45% 개선** ⭐ |
| **초기 로딩 전체** | **< 2초** | **0.475초** | **76% 개선** ⭐ |
| saveHand() | < 3초 | 2.5초 | ✅ |
| VIRTUAL 전송 | < 5초 | 3.2초 | ✅ |

**최적화 기법 (v3.4.0 + v3.5.0):**
- **PropertiesService 캐싱** (Roster, 5분 TTL) ⭐
- **CacheService 캐싱** (CONFIG, 1분 TTL) ⭐
- **Batched API** (doBatch, 다중 요청 단일 호출) ⭐
- **Sparse Column Reads** (queryHands, 11/20 컬럼) ⭐
- SessionStorage 캐싱 (클라이언트)
- RequestAnimationFrame 렌더링
- Bulk Insert (ACTIONS 시트)
- 클라이언트 정렬 (v2.9.0, 서버 부하 감소)

---

## 🗺️ 로드맵

### ✅ 완료 (v3.7.0)
- Record/Review Mode
- VIRTUAL 시트 연동
- Bottom Sheet 카드 선택
- 햅틱 피드백
- 버전 관리 시스템
- **단일 스프레드시트 통합 (v2.8.0)**
- **36개 테이블 지원 (v2.8.0)**
- **Keyplayer 우선 정렬 (v2.9.0)**
- **캐싱 레이어 (v3.4.0): 91% 성능 개선** ⭐
- **Sparse Reads (v3.5.0): 45% 추가 개선** ⭐
- **VIRTUAL 전송 최적화 (v3.7.0): 56% 성능 개선** ⭐

### 단기 (2026 Q1)
- **v3.6.0 (2026-02)**: 사이드팟 자동 계산
- **v3.7.0 (2026-03)**: 멀티 테이블 병렬 지원 (탭 UI)

### 중기 (2026 Q1-Q2)
- **v4.0.0 (2026-02)**: 오프라인 모드 (PWA)
- **v4.1.0 (2026-04)**: 실시간 협업 (Firebase)

### 장기 (2026 H2)
- **v5.0.0 (2026-09)**: AI 자동 기록 (OCR, 음성인식, GPT-4)

---

## 🎯 사용자 페르소나

### 1. 딜러 (Primary)
**목표**: 실시간 정확한 액션 기록, 게임 흐름 방해 최소화
**Pain Point**: 36개 테이블 중 키플레이어 테이블 찾기 어려움
**v2.9.0 해결**: ⭐ 아이콘 + 최상단 정렬 → 8초 → 0.5초

### 2. 브로드캐스트 프로듀서 (Secondary)
**목표**: 핸드 선택 후 VIRTUAL 시트 자동 전송
**Pain Point**: 수동 파일명/자막 작성
**해결**: 자동 포매팅 (98% 성공률)

### 3. 플로어 매니저 (Admin)
**목표**: 36개 테이블 핸드 번호/상태 동기화
**Pain Point**: 테이블 간 불일치
**v2.8.0 해결**: CONFIG 시트 36개 테이블 관리

---

## 🔒 보안 & 규정

### 인증
- Google OAuth 2.0 자동 처리
- 배포 모드: "나만" 또는 "조직 내"

### 데이터 보호
- HTTPS/TLS 1.2+ 강제
- Google Sheets AES-256 암호화
- 민감 정보: PlayerId (선택적, 주최자 책임)

### GDPR 준수
- 개인 데이터: 이름, 국적, PlayerId (공개 정보)
- 삭제 권리: 수동 행 삭제
- 보존 기간: 5년

---

## 📈 성공 지표 요약

| KPI | 목표 | 상태 |
|-----|------|------|
| 핸드 기록 완료율 | 95% | 93% 🟡 |
| VIRTUAL 전송 성공률 | 98% | 97% 🟡 |
| **평균 응답 시간 (v3.4.0+)** | **< 2초** | **0.07초 ✅** ⭐ |
| **초기 로딩 (v3.5.0)** | **< 1초** | **0.475초 ✅** ⭐ |
| 크래시율 | < 0.5% | 0.3% ✅ |
| NPS | 8.5+ | 8.2 🟡 |

---

## 🚨 주요 리스크 & 완화

### 1. Apps Script 할당량 초과
**완화**: 캐싱 5분 연장, Bulk 최적화, 아카이빙 자동화

### 2. 동시성 충돌 (hand_seq)
**완화**: ScriptLock 1초 증가, 재시도 5회, 검증 강화

### 3. 사용자 학습 곡선
**완화**: 온보딩 튜토리얼, 비디오 매뉴얼, v2.9.0 시각적 강조

---

## 📚 관련 문서

| 문서 | 용도 | 링크 |
|------|------|------|
| **PRD.md** | 전체 요구사항 (상세) | [PRD.md](PRD.md) |
| **DB_MIGRATION.md** | v2.8.0 마이그레이션 | [DB_MIGRATION.md](DB_MIGRATION.md) |
| **README.md** | 프로젝트 개요 | [README.md](../README.md) |
| **CLAUDE.md** | 개발 가이드라인 | [CLAUDE.md](../CLAUDE.md) |

---

## 💡 Quick Start

### 사용자 (딜러)
1. 앱 열기 → 테이블 선택 **(v2.9.0: ⭐ 키플레이어 테이블 최상단)**
2. 참여 좌석 토글 → 홀카드/보드 선택
3. 액션 버튼 (CHECK/CALL/BET/RAISE/FOLD/ALLIN)
4. 커밋 → 완료

### 관리자 (플로어 매니저)
1. CONFIG 시트 → 36개 테이블 확인
2. Type 시트 → 플레이어 명부 관리 (11컬럼)
3. LOG 시트 → ERR_* 필터링

### 프로듀서 (Review Mode)
1. Review 모드 → 핸드 리스트 확인
2. 핸드 선택 → 상세 확인
3. VIRTUAL 전송 → 자동 포매팅

---

## 🔄 v2.8.0 & v2.9.0 마이그레이션 요약

### v2.8.0 변경사항
```javascript
// Before (v2.7.2)
const ROSTER_SPREADSHEET_ID = '1J-lf8bYT...'; // 별도 스프레드시트
function rosterSS_() { return SpreadsheetApp.openById(ROSTER_SPREADSHEET_ID); }

// After (v2.8.0)
// ROSTER_SPREADSHEET_ID 삭제 ⭐
const ROSTER_SHEET_NAME = 'Type'; // APP_SPREADSHEET 내부
function appSS_() { return SpreadsheetApp.openById(APP_SPREADSHEET_ID); }
```

**영향:**
- ✅ 2개 스프레드시트 → 1개 통합
- ✅ Type 시트 6컬럼 → 11컬럼
- ✅ 3개 테이블 → 36개 테이블
- ✅ 하위 호환 100% (기존 코드 정상 작동)

### v2.9.0 변경사항
```javascript
// 클라이언트 정렬 (index.html)
S.tables = sortTablesByKeyplayer(data.tables, S.roster);

// CSS 강조
select#tableSel option.keyplayer-option {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  font-weight: 800;
}
```

**영향:**
- ✅ 테이블 선택 시간 93% 절감 (8초 → 0.5초)
- ✅ ⭐ 아이콘 + 골드 배경
- ✅ Keyplayer 수 표시
- ✅ 하위 호환 (keyplayer 컬럼 없어도 작동)

---

## 🎯 핵심 메시지

### 제품 가치
1. **제로 인프라 비용**: Google Apps Script 서버리스
2. **실시간 연동**: 핸드 → VIRTUAL 5초 이내
3. **모바일 최적화**: 48px 터치, 햅틱 피드백
4. **대규모 지원**: 36개 테이블 동시 운영 (v2.8.0)
5. **초고속 성능**: 76% 로딩 시간 단축 (v3.4.0+v3.5.0) ⭐

### 차별화 요소
- Google Sheets 기반 **제로 인프라**
- 기여액 기반 **정확한 팟 계산**
- 키플레이어 **자동 자막 생성**
- **v3.4.0+v3.5.0+v3.7.0**: 3단계 성능 최적화로 **누적 80% 개선** ⭐

---

**문서 끝 · 전체 PRD는 [PRD.md](PRD.md) 참조**

*이 요약 문서는 PRD.md의 핵심 내용만 추출한 5분 완독용입니다.*
*상세 내용은 PRD.md (1,327줄) 및 DB_MIGRATION.md (1,023줄)를 참조하세요.*