# Database Migration Guide
## Roster Schema Extension (Type Sheet)

**문서 버전**: 3.0.0
**작성일**: 2025-10-12
**최종 업데이트**: 2025-10-12
**대상 버전**: HandLogger v2.7.2 → v2.8.0
**마이그레이션 타입**: Schema Extension + Spreadsheet Consolidation (Type 시트 영구 사용)

---

## 📋 목차

1. [변경 개요](#1-변경-개요)
2. [변경 사유](#2-변경-사유)
3. [영향 범위 분석](#3-영향-범위-분석)
4. [스키마 비교](#4-스키마-비교)
5. [마이그레이션 계획](#5-마이그레이션-계획)
6. [상세 실행 가이드](#6-상세-실행-가이드)
7. [검증 체크리스트](#7-검증-체크리스트)
8. [롤백 전략](#8-롤백-전략)
9. [FAQ](#9-faq)

---

## 1. 변경 개요

### 1.1 변경 요약
**2개 스프레드시트를 1개로 통합하고, Type 시트 스키마를 확장 (6→11 컬럼)**

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| **스프레드시트 수** | 2개 (APP + ROSTER) | 1개 (APP 통합) |
| **시트 이름** | Type (ROSTER 스프레드시트) | Type (APP 스프레드시트) ⭐ |
| **필수 컬럼** | 6개 | 11개 (5개 추가, 선택적) |
| **테이블 수** | 1-3개 (소규모) | 1-36개 (대규모 지원) |
| **플레이어 추적** | 이름만 | PlayerId 고유 ID (선택적) |
| **테이블 식별** | TableNo만 | TableId + TableNo (선택적) |
| **하위 호환성** | - | ✅ 100% 보장 (기존 6컬럼 정상 작동) |

**⭐ 중요**: Seats.csv는 참고용이며, **실제로는 Type 시트만 사용**합니다.

### 1.2 변경 타임라인
```
2025-10-12 (Day 0): 마이그레이션 문서 작성
2025-10-13 (Day 1): 스키마 변경 및 code.gs 수정
2025-10-14 (Day 2): 스테이징 환경 테스트
2025-10-15 (Day 3): 프로덕션 배포
2025-10-16 (Day 4): 모니터링 및 검증
```

---

## 2. 변경 사유

### 2.1 비즈니스 요구사항
1. **스프레드시트 통합**: 관리 간소화 (2개 시트 → 1개 시트)
2. **대규모 토너먼트 지원**: 36개 테이블 동시 운영 (기존 3개 → 12배 확장)
3. **플레이어 고유 식별**: 동명이인, 재입장, 테이블 이동 추적
4. **외부 시스템 연동**: PlayerId 기반 통계/순위 시스템 통합
5. **데이터 무결성**: TableId/SeatId로 중복/충돌 방지

### 2.2 기술적 이점
- **단순화**: 1개 스프레드시트로 관리 포인트 감소 (rosterSS_() 함수 제거)
- **정규화**: 플레이어 정보 일원화 (Players.csv 참조 가능)
- **확장성**: 추가 메타데이터 (PokerRoom, TableName) 저장 공간 확보
- **성능**: 고유 ID 인덱싱으로 조회 속도 향상, 단일 API 호출로 지연 감소
- **호환성**: 기존 aliases 구조 활용으로 코드 변경 최소화

### 2.3 데이터 품질 개선
| 문제 | 기존 방식 | 개선 후 |
|------|-----------|---------|
| **동명이인** | 구분 불가 | PlayerId로 구분 |
| **재입장** | 중복 기록 | PlayerId로 이력 추적 |
| **테이블 이동** | 수동 관리 | TableId로 자동 매핑 |
| **칩 스택 동기화** | 수동 입력 | 외부 시스템 API 연동 가능 |

---

## 3. 영향 범위 분석

### 3.1 시스템 컴포넌트

```
┌─────────────────────────────────────────────────────────────┐
│                     영향 범위 다이어그램                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Google Sheets]                                             │
│   └─ APP_SPREADSHEET_ID (통합)                               │
│       ├─ Seats 시트 (신규)           🔴 HIGH IMPACT          │
│       │   ├─ 스키마 변경 (6→11 컬럼)                         │
│       │   └─ Keyplayer 컬럼 추가                             │
│       │                                                       │
│       ├─ HANDS 시트                  ✅ NO IMPACT            │
│       ├─ ACTIONS 시트                ✅ NO IMPACT            │
│       ├─ CONFIG 시트                 🟡 LOW IMPACT           │
│       │   └─ 36개 테이블 초기화 필요                         │
│       └─ LOG 시트                    ✅ NO IMPACT            │
│                                                               │
│  [code.gs]                                                    │
│   ├─ ROSTER_SPREADSHEET_ID           🔴 HIGH IMPACT          │
│   │   └─ 상수 삭제 (APP_SPREADSHEET_ID 통합)                 │
│   ├─ rosterSS_() 함수                🔴 HIGH IMPACT          │
│   │   └─ 함수 삭제 (appSS_()로 통합)                         │
│   ├─ ROSTER_SHEET_NAME               🟡 LOW IMPACT           │
│   │   └─ 'Type' → 'Seats' 변경                              │
│   ├─ ROSTER_HEADERS                  🟡 LOW IMPACT           │
│   │   └─ aliases 확장 (playerId 등)                          │
│   ├─ readRoster_()                   🔴 HIGH IMPACT          │
│   │   └─ rosterSS_() → appSS_() 변경                        │
│   ├─ saveHand()                      ✅ NO IMPACT            │
│   ├─ queryHands()                    ✅ NO IMPACT            │
│   └─ sendHandToVirtual()             ✅ NO IMPACT            │
│                                                               │
│  [index.html]                                                 │
│   ├─ 테이블 선택 UI                   ✅ NO IMPACT            │
│   ├─ 좌석 토글 렌더링                 ✅ NO IMPACT            │
│   └─ 키플레이어 ⭐ 표시              ✅ NO IMPACT            │
│                                                               │
└─────────────────────────────────────────────────────────────┘

🔴 HIGH: 필수 변경  🟡 LOW: 선택적 변경  ✅ NO: 변경 없음
```

### 3.2 영향 받는 기능

| 기능 | 영향도 | 변경 내용 | 테스트 필요 |
|------|--------|-----------|-------------|
| **Record Mode - 테이블 선택** | 🟡 Low | 36개 테이블 드롭다운 확장 | ✅ |
| **Record Mode - 좌석 토글** | 🟡 Low | PlayerId 내부 저장 (UI 변화 없음) | ✅ |
| **Record Mode - 핸드 커밋** | ✅ None | 영향 없음 | - |
| **Review Mode - 리스트** | ✅ None | 영향 없음 | - |
| **Review Mode - VIRTUAL 전송** | ✅ None | 영향 없음 | - |
| **CONFIG 시트 초기화** | 🔴 High | 36개 테이블 행 생성 | ✅ |

### 3.3 데이터 볼륨 변화

| 항목 | 변경 전 | 변경 후 | 증가율 |
|------|---------|---------|--------|
| Roster 시트 행 수 | 18-24행 (3테이블 × 6-8좌석) | 246행 (36테이블 × 평균 7좌석) | +1025% |
| Roster 시트 컬럼 수 | 6개 | 11개 | +83% |
| CONFIG 시트 행 수 | 3행 | 36행 | +1100% |
| 월간 데이터 증가 | 1,600행/일 | 1,600행/일 | 0% (핸드 수 동일) |

---

## 4. 스키마 비교

### 4.1 컬럼 매핑 테이블

| # | 기존 Type 컬럼 | Seats.csv 컬럼 | 데이터 타입 | 필수 여부 | 변경 사항 | 기본값 |
|---|----------------|----------------|-------------|-----------|-----------|--------|
| 1 | Table No. | **TableNo** | Number | ✅ | 이름 변경 (호환) | - |
| 2 | Seat No. | **SeatNo** | Number | ✅ | 이름 변경 (호환) | - |
| 3 | Players | **PlayerName** | String | ✅ | 이름 변경 (호환) | - |
| 4 | Nationality | **Nationality** | String(2) | ✅ | 동일 | - |
| 5 | Chips | **ChipCount** | Number | ✅ | 이름 변경 (호환) | - |
| 6 | Keyplayer | **Keyplayer** | Boolean | ⚠️ | **신규 추가 필요** | FALSE |
| 7 | - | **PokerRoom** | String | 선택 | 신규 추가 | "Main" |
| 8 | - | **TableName** | String | 선택 | 신규 추가 | "Black" |
| 9 | - | **TableId** | Number | 선택 | 신규 추가 | - |
| 10 | - | **SeatId** | Number | 선택 | 신규 추가 | - |
| 11 | - | **PlayerId** | Number | 🟡 권장 | 신규 추가 | - |

### 4.2 샘플 데이터 비교

#### 변경 전 (Type 시트)
```csv
Table No.,Seat No.,Players,Nationality,Chips,Keyplayer
1,1,Murat Altunok,TR,10000,FALSE
1,2,Stefano Spataro,IT,60000,TRUE
```

#### 변경 후 (Seats.csv)
```csv
PokerRoom,TableName,TableId,TableNo,SeatId,SeatNo,PlayerId,PlayerName,Nationality,ChipCount,Keyplayer
Main,Black,43149,1,429396,1,104616,Murat Altunok,TR,10000,FALSE
Main,Black,43149,1,429397,2,102743,Stefano Spataro,IT,60000,TRUE
```

### 4.3 데이터 타입 상세

| 컬럼 | 타입 | 제약 조건 | 예시 값 | 설명 |
|------|------|-----------|---------|------|
| **PokerRoom** | String(50) | 선택적 | "Main", "VIP" | 포커룸 구역 |
| **TableName** | String(50) | 선택적 | "Black", "Red" | 테이블 색상/이름 |
| **TableId** | Integer | Unique | 43149-43193 | 시스템 테이블 ID |
| **TableNo** | Integer | 1-99 | 1-36 | 물리적 테이블 번호 |
| **SeatId** | Integer | Unique | 429396-429842 | 시스템 좌석 ID |
| **SeatNo** | Integer | 1-9 | 1-7 | 좌석 위치 번호 |
| **PlayerId** | Integer | Foreign Key | 104616, 102743 | 플레이어 고유 ID |
| **PlayerName** | String(100) | Not Null | "Murat Altunok" | 플레이어 전체 이름 |
| **Nationality** | String(2) | ISO 3166-1 alpha-2 | "TR", "IT", "RU" | 국적 코드 |
| **ChipCount** | Integer | >= 0 | 10000, 60000 | 현재 칩 스택 |
| **Keyplayer** | Boolean | TRUE/FALSE | TRUE, FALSE | 키플레이어 여부 |

---

## 5. 마이그레이션 계획

### 5.1 마이그레이션 전략

**선택된 전략: Blue-Green Deployment (무중단 배포)**

```
┌─────────────────────────────────────────────────────────────┐
│              Blue-Green Deployment 플로우                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Phase 1: Preparation]                                      │
│   ├─ 기존 Type 시트 백업 (Type_BACKUP_20251012)             │
│   ├─ Seats.csv → 새 시트 업로드 (Seats_NEW)                 │
│   └─ Keyplayer 컬럼 수동 추가                                │
│                                                               │
│  [Phase 2: Code Update]                                      │
│   ├─ code.gs ROSTER_HEADERS 확장                            │
│   ├─ readRoster_() PlayerId 파싱 추가                       │
│   └─ VERSION_JSON → v2.8.0                                   │
│                                                               │
│  [Phase 3: Testing (Staging)]                                │
│   ├─ ROSTER_SHEET_NAME = 'Seats_NEW'                        │
│   ├─ getConfig() 테스트 (36개 테이블 로드)                   │
│   ├─ Record Mode 핸드 기록 테스트                            │
│   └─ Review Mode VIRTUAL 전송 테스트                         │
│                                                               │
│  [Phase 4: Cutover (Blue → Green)]                          │
│   ├─ ROSTER_SHEET_NAME = 'Seats' (최종 이름)                │
│   ├─ CONFIG 시트 36개 테이블 초기화                          │
│   ├─ 프로덕션 Apps Script 배포                               │
│   └─ 사용자 공지 (브라우저 캐시 클리어)                       │
│                                                               │
│  [Phase 5: Validation]                                       │
│   ├─ 실제 핸드 3건 기록 테스트                               │
│   ├─ LOG 시트 에러 모니터링                                  │
│   ├─ 성능 측정 (getConfig 응답 시간)                         │
│   └─ 24시간 모니터링                                         │
│                                                               │
│  [Phase 6: Cleanup]                                          │
│   ├─ 기존 Type 시트 아카이브                                 │
│   ├─ Seats_NEW 시트 삭제                                     │
│   └─ 문서 업데이트 (PRD.md, README.md)                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 위험 평가 및 완화 전략

| 위험 | 발생 가능성 | 영향도 | 완화 전략 | 담당자 |
|------|-------------|--------|-----------|--------|
| **Keyplayer 컬럼 누락** | Medium | High | 마이그레이션 스크립트로 자동 추가, 검증 단계 포함 | Dev Team |
| **36개 테이블 CONFIG 초기화 실패** | Low | High | 초기화 스크립트 사전 테스트, 롤백 스크립트 준비 | Dev Team |
| **PlayerId 파싱 오류** | Low | Medium | 선택적 필드로 설계 (없어도 동작), 에러 핸들링 강화 | Dev Team |
| **성능 저하 (246행 로드)** | Medium | Low | SessionStorage 캐싱 TTL 5분으로 연장 | Dev Team |
| **사용자 혼란 (36개 테이블)** | High | Low | 드롭다운 필터링 UI 개선, 온보딩 가이드 제공 | Product Team |

### 5.3 리소스 요구사항

| 리소스 | 필요량 | 담당 | 기한 |
|--------|--------|------|------|
| **개발자** | 8시간 | 1명 | Day 1 |
| **QA 테스터** | 4시간 | 1명 | Day 2 |
| **Google Sheets 편집 권한** | - | Admin | Day 0 |
| **Apps Script 배포 권한** | - | Admin | Day 3 |
| **백업 스토리지** | 10MB | Admin | Day 0 |

---

## 6. 상세 실행 가이드

### 6.1 사전 준비 (Pre-Migration)

#### Step 1: 현재 데이터 백업
```javascript
// Apps Script Editor에서 실행
function backupTypeSheet() {
  const ss = SpreadsheetApp.openById(APP_SPREADSHEET_ID); // ⚠️ APP_SPREADSHEET_ID 사용
  const typeSheet = ss.getSheetByName('Type'); // 기존 Type 시트 (있으면)

  if (!typeSheet) {
    Logger.log('⚠️ Type 시트가 없습니다. 새로운 Seats 시트 생성 예정.');
    return null;
  }

  const backupName = 'Type_BACKUP_' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');

  // 시트 복사
  const backup = typeSheet.copyTo(ss);
  backup.setName(backupName);

  Logger.log('✅ Backup created: ' + backupName);
  return backupName;
}
```

#### Step 2: Seats.csv 업로드
1. Google Sheets 열기: `APP_SPREADSHEET_ID` ⚠️ (기존 HANDS/ACTIONS/CONFIG 있는 스프레드시트)
2. **파일 > 가져오기 > 업로드**
3. `Seats.csv` 선택
4. 가져오기 위치: **새 시트로 삽입**
5. 시트 이름: `Seats_NEW`

#### Step 3: Keyplayer 컬럼 추가
```javascript
// Apps Script Editor에서 실행
function addKeyplayerColumn() {
  const ss = SpreadsheetApp.openById(APP_SPREADSHEET_ID); // ⚠️ APP_SPREADSHEET_ID 사용
  const sh = ss.getSheetByName('Seats_NEW');

  // K열 (11번째 컬럼)에 헤더 추가
  sh.getRange(1, 11).setValue('Keyplayer');

  // 모든 데이터 행에 기본값 FALSE 설정
  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    const range = sh.getRange(2, 11, lastRow - 1, 1);
    range.setValue('FALSE');
  }

  Logger.log('✅ Keyplayer column added with default FALSE');
}
```

#### Step 4: 키플레이어 수동 설정 (선택적)
- `Seats_NEW` 시트에서 키플레이어 행 찾기
- K열 (Keyplayer)을 `TRUE`로 변경
- 예시: Table 1, Seat 2 - Stefano Spataro → `TRUE`

---

### 6.2 코드 변경 (Code Migration)

#### Step 1: code.gs - 스프레드시트 통합 및 ROSTER_HEADERS 확장
```javascript
// code.gs line 43-45 변경 전
const APP_SPREADSHEET_ID = '19e7eDjoZRFZooghZJF3XmOZzZcgmqsp9mFAfjvJWhj4'; // HANDS/ACTIONS/CONFIG/LOG 저장소
const ROSTER_SPREADSHEET_ID = '1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U'; // 테이블/플레이어 명부
const ROSTER_SHEET_NAME = 'Type';
```

```javascript
// code.gs line 43-44 변경 후
const APP_SPREADSHEET_ID = '19e7eDjoZRFZooghZJF3XmOZzZcgmqsp9mFAfjvJWhj4'; // HANDS/ACTIONS/CONFIG/LOG/ROSTER 통합 저장소
const ROSTER_SHEET_NAME = 'Seats'; // 플레이어 명부 시트 (APP_SPREADSHEET 내부)
```

```javascript
// code.gs line 72-73 변경 전
function appSS_(){ return SpreadsheetApp.openById(APP_SPREADSHEET_ID); }
function rosterSS_(){ return SpreadsheetApp.openById(ROSTER_SPREADSHEET_ID); }
```

```javascript
// code.gs line 72 변경 후 (rosterSS_ 함수 삭제)
function appSS_(){ return SpreadsheetApp.openById(APP_SPREADSHEET_ID); }
```

```javascript
// code.gs line 47-54 ROSTER_HEADERS (기존 유지, 확장 가능)
const ROSTER_HEADERS = {
  tableNo:['Table No.','TableNo','Table_Number','table_no'],
  seatNo:['Seat No.','Seat','SeatNo','seat_no'],
  player:['Players','Player','Name'],
  nation:['Nationality','Nation','Country'],
  chips:['Chips','Stack','Starting Chips','StartStack'],
  keyplayer:['Keyplayer','KeyPlayer','Key Player','key_player']
};
```

```javascript
// code.gs line 48-60 변경 후
const ROSTER_HEADERS = {
  tableNo:['Table No.','TableNo','Table_Number','table_no'],
  seatNo:['Seat No.','Seat','SeatNo','seat_no'],
  player:['Players','Player','Name','PlayerName','player_name'],
  nation:['Nationality','Nation','Country','CountryCode'],
  chips:['Chips','Stack','Starting Chips','StartStack','ChipCount','chip_count'],
  keyplayer:['Keyplayer','KeyPlayer','Key Player','key_player'],

  // 신규 추가 (선택적)
  playerId:['PlayerId','Player_Id','player_id'],
  tableId:['TableId','Table_Id','table_id'],
  seatId:['SeatId','Seat_Id','seat_id'],
  pokerRoom:['PokerRoom','Poker_Room','poker_room'],
  tableName:['TableName','Table_Name','table_name']
};
```

#### Step 2: code.gs - readRoster_() 함수 수정
```javascript
// code.gs line 150-152 변경 전
function readRoster_(){
  const ss=rosterSS_(); // ⚠️ ROSTER_SPREADSHEET_ID 호출
  const sh=ss.getSheetByName(ROSTER_SHEET_NAME)||ss.getSheets()[0];
  const {header,rows}=readAll_(sh);
  const idx={
    tableNo:findColIndex_(header,ROSTER_HEADERS.tableNo),
    seatNo:findColIndex_(header,ROSTER_HEADERS.seatNo),
    player:findColIndex_(header,ROSTER_HEADERS.player),
    nation:findColIndex_(header,ROSTER_HEADERS.nation),
    chips:findColIndex_(header,ROSTER_HEADERS.chips),
    keyplayer:findColIndex_(header,ROSTER_HEADERS.keyplayer)
  };
  const roster={}, tables=new Set();
  rows.forEach(r=>{
    const t=idx.tableNo>=0?String(r[idx.tableNo]).trim():'';
    if(!t) return;
    const seat=idx.seatNo>=0?toInt_(r[idx.seatNo]):0; if(seat<=0) return;
    const name=idx.player>=0?String(r[idx.player]).trim():'';
    const nation=idx.nation>=0?String(r[idx.nation]).trim():'';
    const chips=idx.chips>=0?toInt_(r[idx.chips]):0;
    const keyplayer=idx.keyplayer>=0?String(r[idx.keyplayer]).toUpperCase()==='TRUE':false;
    tables.add(t);
    (roster[t]=roster[t]||[]).push({seat,player:name,nation,chips,keyplayer});
  });
  Object.keys(roster).forEach(t=>roster[t].sort((a,b)=>a.seat-b.seat));
  return { tables:[...tables].sort((a,b)=>toInt_(a)-toInt_(b)), roster };
}
```

```javascript
// code.gs line 151-190 변경 후
function readRoster_(){
  const ss=rosterSS_();
  const sh=ss.getSheetByName(ROSTER_SHEET_NAME)||ss.getSheets()[0];
  const {header,rows}=readAll_(sh);

  // 필수 컬럼
  const idx={
    tableNo:findColIndex_(header,ROSTER_HEADERS.tableNo),
    seatNo:findColIndex_(header,ROSTER_HEADERS.seatNo),
    player:findColIndex_(header,ROSTER_HEADERS.player),
    nation:findColIndex_(header,ROSTER_HEADERS.nation),
    chips:findColIndex_(header,ROSTER_HEADERS.chips),
    keyplayer:findColIndex_(header,ROSTER_HEADERS.keyplayer)
  };

  // 선택적 컬럼 (Seats.csv 확장 필드)
  const optIdx={
    playerId:findColIndex_(header,ROSTER_HEADERS.playerId),
    tableId:findColIndex_(header,ROSTER_HEADERS.tableId),
    seatId:findColIndex_(header,ROSTER_HEADERS.seatId),
    pokerRoom:findColIndex_(header,ROSTER_HEADERS.pokerRoom),
    tableName:findColIndex_(header,ROSTER_HEADERS.tableName)
  };

  const roster={}, tables=new Set();
  rows.forEach(r=>{
    const t=idx.tableNo>=0?String(r[idx.tableNo]).trim():'';
    if(!t) return;
    const seat=idx.seatNo>=0?toInt_(r[idx.seatNo]):0; if(seat<=0) return;
    const name=idx.player>=0?String(r[idx.player]).trim():'';
    const nation=idx.nation>=0?String(r[idx.nation]).trim():'';
    const chips=idx.chips>=0?toInt_(r[idx.chips]):0;
    const keyplayer=idx.keyplayer>=0?String(r[idx.keyplayer]).toUpperCase()==='TRUE':false;

    // 기본 플레이어 객체
    const playerObj = {seat,player:name,nation,chips,keyplayer};

    // 선택적 필드 추가 (있으면 포함)
    if(optIdx.playerId>=0) playerObj.playerId=String(r[optIdx.playerId]||'');
    if(optIdx.tableId>=0) playerObj.tableId=String(r[optIdx.tableId]||'');
    if(optIdx.seatId>=0) playerObj.seatId=String(r[optIdx.seatId]||'');
    if(optIdx.pokerRoom>=0) playerObj.pokerRoom=String(r[optIdx.pokerRoom]||'');
    if(optIdx.tableName>=0) playerObj.tableName=String(r[optIdx.tableName]||'');

    tables.add(t);
    (roster[t]=roster[t]||[]).push(playerObj);
  });

  Object.keys(roster).forEach(t=>roster[t].sort((a,b)=>a.seat-b.seat));
  return { tables:[...tables].sort((a,b)=>toInt_(a)-toInt_(b)), roster };
}
```

#### Step 3: code.gs - ROSTER_SHEET_NAME 변경
```javascript
// code.gs line 45 변경 전
const ROSTER_SHEET_NAME = 'Type';
```

```javascript
// code.gs line 45 변경 후 (스테이징 테스트)
const ROSTER_SHEET_NAME = 'Seats_NEW';
```

#### Step 4: VERSION_JSON 업데이트
```javascript
// code.gs line 2-3 변경
const VERSION_JSON = {
  "current": "2.8.0",  // v2.7.2 → v2.8.0
  "date": "2025-10-13",
  // ...
  "changelog": {
    "2.8.0": {
      "date": "2025-10-13",
      "type": "minor",
      "changes": [
        "Roster 스키마 확장 (Seats.csv 구조)",
        "PlayerId 고유 ID 추적",
        "36개 테이블 대규모 토너먼트 지원",
        "PokerRoom, TableName 메타데이터 추가",
        "하위 호환성 100% 유지"
      ]
    },
    "2.7.2": { /* 기존 내용 유지 */ }
  }
};
```

#### Step 5: 버전 동기화
```javascript
// Apps Script Editor에서 실행
syncVersionFromJson(); // ✅ v2.8.0 → ScriptProperties
```

---

### 6.3 CONFIG 시트 초기화

#### Step 1: 36개 테이블 자동 생성 스크립트
```javascript
// Apps Script Editor에서 실행
function initConfig36Tables() {
  const ss = appSS_();
  const sh = ss.getSheetByName(SH.CONFIG);

  // 기존 데이터 백업 (선택적)
  const existingData = sh.getDataRange().getValues();
  Logger.log('Existing CONFIG rows: ' + (existingData.length - 1));

  // 헤더 확인
  if (existingData.length < 1 || existingData[0][0] !== 'table_id') {
    throw new Error('CONFIG sheet header missing');
  }

  // 1-36번 테이블 생성
  const newRows = [];
  for (let i = 1; i <= 36; i++) {
    newRows.push([
      String(i),           // table_id
      '',                  // btn_seat (초기값 공백)
      1,                   // hand_seq (1부터 시작)
      new Date()           // updated_at
    ]);
  }

  // 기존 데이터 삭제 (헤더 제외)
  if (existingData.length > 1) {
    sh.deleteRows(2, existingData.length - 1);
  }

  // 새 데이터 삽입
  sh.getRange(2, 1, newRows.length, newRows[0].length).setValues(newRows);

  Logger.log('✅ CONFIG initialized with 36 tables');
  Logger.log('Tables: 1-36, hand_seq: 1');
}
```

#### Step 2: 검증
```javascript
// Apps Script Editor에서 실행
function verifyConfig() {
  const cfg = readConfig_();
  const tableCount = Object.keys(cfg).length;

  Logger.log('Total tables in CONFIG: ' + tableCount);
  Logger.log('Expected: 36');
  Logger.log('Match: ' + (tableCount === 36 ? '✅' : '❌'));

  // 샘플 출력
  Logger.log('Sample: Table 1 → ' + JSON.stringify(cfg['1']));
  Logger.log('Sample: Table 36 → ' + JSON.stringify(cfg['36']));
}
```

---

### 6.4 스테이징 테스트

#### Test Case 1: getConfig() 호출
```javascript
// Apps Script Editor에서 실행
function testGetConfig() {
  const result = getConfig();

  Logger.log('=== getConfig() Test ===');
  Logger.log('Error: ' + result.error);
  Logger.log('Tables count: ' + result.tables.length);
  Logger.log('Expected: 36');
  Logger.log('Tables: ' + result.tables.join(', '));

  // Table 1 roster 확인
  const table1 = result.roster['1'];
  Logger.log('\n=== Table 1 Roster ===');
  Logger.log('Players: ' + table1.length);
  table1.forEach(p => {
    Logger.log(`Seat ${p.seat}: ${p.player} (${p.nation}) - ${p.chips} chips, Keyplayer: ${p.keyplayer}`);
    if (p.playerId) Logger.log(`  → PlayerId: ${p.playerId}`);
  });
}
```

**예상 출력:**
```
=== getConfig() Test ===
Error:
Tables count: 36
Expected: 36
Tables: 1, 2, 3, 4, 5, ... 36

=== Table 1 Roster ===
Players: 7
Seat 1: Murat Altunok (TR) - 10000 chips, Keyplayer: false
  → PlayerId: 104616
Seat 2: Stefano Spataro (IT) - 60000 chips, Keyplayer: true
  → PlayerId: 102743
...
```

#### Test Case 2: Record Mode 핸드 기록
1. index.html 열기
2. Table 1 선택 → Roster 로드 확인
3. 좌석 1-7 표시 확인 (이름, 칩, ⭐ 키플레이어)
4. 간단한 핸드 기록:
   - BTN: Seat 1
   - 참여 좌석: Seat 1-3
   - 홀카드: Seat 1(Ah, Kd), Seat 2(Qs, Jc)
   - 보드: As, Kh, Qd
   - 액션: Seat 1 BET 1000, Seat 2 CALL, Seat 3 FOLD
5. 커밋 → 성공 메시지 확인

#### Test Case 3: LOG 시트 에러 확인
```sql
-- Google Sheets에서 필터링
LOG 시트 열기 → code 컬럼 필터 → "ERR_" 시작하는 행 확인
```

**예상 결과:** 0건 (에러 없음)

---

### 6.5 프로덕션 배포 (Cutover)

#### Step 1: 최종 시트 이름 변경
```javascript
// Google Sheets에서 수동 작업
1. 'Seats_NEW' 시트 우클릭 → 이름 바꾸기 → 'Seats'
2. 기존 'Type' 시트 → 'Type_OLD' (또는 삭제)
```

#### Step 2: code.gs 최종 변경
```javascript
// code.gs line 45 변경
const ROSTER_SHEET_NAME = 'Seats'; // Seats_NEW → Seats
```

#### Step 3: Apps Script 배포
```
Apps Script Editor
 → 배포 > 새 배포
 → 유형: 웹 앱
 → 액세스 권한: "나만" 또는 "조직 내 모든 사용자"
 → 배포
 → 새 URL 복사 (기존 URL 유지됨)
```

#### Step 4: 사용자 공지
**알림 템플릿:**
```
📢 HandLogger v2.8.0 업데이트 안내

배포 일시: 2025-10-13 18:00 KST
다운타임: 없음 (무중단 배포)

[주요 변경사항]
✅ 36개 테이블 동시 지원 (기존 3개 → 36개)
✅ 플레이어 고유 ID 추적
✅ 대규모 토너먼트 최적화

[사용자 액션]
1. 브라우저에서 Ctrl+Shift+R (강제 새로고침)
2. 테이블 선택 드롭다운에서 1-36번 확인
3. 기존 기능 정상 작동 확인

[문제 발생 시]
- LOG 시트 확인
- 또는 관리자 연락

감사합니다!
```

---

### 6.6 검증 (Post-Migration Validation)

#### Validation Checklist
```
⬜ getConfig() 36개 테이블 로드 성공 (응답 시간 < 3초)
⬜ Table 1-36 모든 테이블 Roster 로드 확인
⬜ 키플레이어 ⭐ 아이콘 표시 확인
⬜ Record Mode 핸드 3건 기록 성공
⬜ HANDS 시트 stacks_json에 정상 저장
⬜ ACTIONS 시트 액션 시퀀스 정상
⬜ CONFIG 시트 hand_seq 자동 증가 확인
⬜ Review Mode 리스트 로드 성공
⬜ VIRTUAL 전송 정상 작동 (Time 매칭)
⬜ LOG 시트 ERR_* 코드 0건
⬜ 성능: getConfig() < 2초, saveHand() < 3초
⬜ 24시간 모니터링 완료 (안정성 확인)
```

#### 성능 벤치마크
```javascript
// Apps Script Editor에서 실행
function benchmarkGetConfig() {
  const iterations = 10;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = new Date();
    getConfig();
    const end = new Date();
    times.push(end - start);
    Utilities.sleep(500); // 500ms 대기
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const max = Math.max(...times);
  const min = Math.min(...times);

  Logger.log('=== getConfig() Benchmark ===');
  Logger.log(`Iterations: ${iterations}`);
  Logger.log(`Average: ${avg.toFixed(0)}ms`);
  Logger.log(`Max: ${max}ms`);
  Logger.log(`Min: ${min}ms`);
  Logger.log(`Target: < 2000ms`);
  Logger.log(`Result: ${avg < 2000 ? '✅ PASS' : '❌ FAIL'}`);
}
```

---

## 7. 검증 체크리스트

### 7.1 기능 검증

| # | 검증 항목 | 예상 결과 | 실제 결과 | 상태 | 비고 |
|---|----------|-----------|-----------|------|------|
| 1 | getConfig() 36개 테이블 로드 | tables.length = 36 | - | ⬜ | - |
| 2 | Table 1 Roster 플레이어 수 | 7명 | - | ⬜ | Seats.csv 기준 |
| 3 | Keyplayer 플래그 정상 표시 | ⭐ 아이콘 | - | ⬜ | - |
| 4 | PlayerId 내부 저장 | playerObj.playerId 존재 | - | ⬜ | 콘솔 로그 |
| 5 | Record Mode 핸드 커밋 | 성공 메시지 | - | ⬜ | - |
| 6 | HANDS 시트 stacks_json | JSON 파싱 성공 | - | ⬜ | - |
| 7 | CONFIG hand_seq 증가 | 1 → 2 | - | ⬜ | - |
| 8 | Review Mode 리스트 로드 | 최신 핸드 표시 | - | ⬜ | - |
| 9 | VIRTUAL 전송 | Time 매칭 성공 | - | ⬜ | - |
| 10 | 빈 좌석 처리 | 좌석 스킵 (에러 없음) | - | ⬜ | Table 8 Seat 2 |

### 7.2 성능 검증

| 지표 | 목표 | 실제 | 상태 | 비고 |
|------|------|------|------|------|
| getConfig() 평균 응답 시간 | < 2초 | - | ⬜ | 10회 평균 |
| saveHand() 평균 응답 시간 | < 3초 | - | ⬜ | 10회 평균 |
| Roster 시트 크기 | 246행 × 11컬럼 | - | ⬜ | 2,706셀 |
| SessionStorage 캐싱 적중률 | > 80% | - | ⬜ | 브라우저 DevTools |
| Apps Script 일일 실행 시간 | < 30분 | - | ⬜ | 할당량 대시보드 |

### 7.3 데이터 무결성 검증

| # | 검증 항목 | SQL/스크립트 | 예상 결과 |
|---|----------|--------------|-----------|
| 1 | Keyplayer 컬럼 존재 | `=COUNTBLANK(K:K) < 247` | TRUE |
| 2 | PlayerId 유니크 (테이블 내) | 중복 체크 스크립트 | 0건 |
| 3 | TableNo 범위 | `=MAX(D:D) = 36, MIN(D:D) = 1` | TRUE |
| 4 | SeatNo 범위 | `=MAX(F:F) <= 7, MIN(F:F) >= 1` | TRUE |
| 5 | ChipCount 양수 | `=COUNTIF(J:J,"<0") = 0` | TRUE |

---

## 8. 롤백 전략

### 8.1 롤백 트리거 조건

다음 중 **하나라도 발생 시 즉시 롤백 수행:**

1. ❌ getConfig() 에러율 > 10% (10회 중 1회 이상 실패)
2. ❌ 핸드 커밋 실패율 > 5%
3. ❌ 평균 응답 시간 > 5초 (목표의 2.5배)
4. ❌ LOG 시트 ERR_GETCFG 코드 10건 이상/시간
5. ❌ 사용자 불만 접수 5건 이상

### 8.2 롤백 절차 (15분 이내 완료)

#### Step 1: code.gs 즉시 복구
```javascript
// code.gs line 45 변경
const ROSTER_SHEET_NAME = 'Type'; // Seats → Type

// code.gs line 48-54 원복 (ROSTER_HEADERS 축소)
const ROSTER_HEADERS = {
  tableNo:['Table No.','TableNo','Table_Number','table_no'],
  seatNo:['Seat No.','Seat','SeatNo','seat_no'],
  player:['Players','Player','Name'],
  nation:['Nationality','Nation','Country'],
  chips:['Chips','Stack','Starting Chips','StartStack'],
  keyplayer:['Keyplayer','KeyPlayer','Key Player','key_player']
  // playerId 등 제거
};
```

#### Step 2: readRoster_() 함수 원복
```javascript
// code.gs line 151-178 전체를 백업 버전으로 교체
// (optIdx 관련 코드 모두 제거)
```

#### Step 3: Apps Script 긴급 배포
```
Apps Script Editor
 → 배포 > 배포 관리
 → 기존 배포(v2.7.2) 선택
 → "이 배포 사용" 클릭
```

#### Step 4: CONFIG 시트 복구 (선택적)
```javascript
// 36개 → 3개로 축소 (필요 시)
function rollbackConfig() {
  const ss = appSS_();
  const sh = ss.getSheetByName(SH.CONFIG);

  // 4행부터 끝까지 삭제 (1-3번 테이블만 유지)
  const lastRow = sh.getLastRow();
  if (lastRow > 4) {
    sh.deleteRows(5, lastRow - 4);
  }

  Logger.log('✅ CONFIG rolled back to 3 tables');
}
```

#### Step 5: 사용자 공지
```
🚨 긴급 롤백 안내

배포 시각: 2025-10-13 20:30 KST
사유: [구체적 사유 명시]

[조치 사항]
✅ v2.7.2로 롤백 완료
✅ 기존 Type 시트 사용 재개
✅ 3개 테이블 정상 작동

[사용자 액션]
1. Ctrl+Shift+R (강제 새로고침)
2. 기존 워크플로우 정상 작동 확인

죄송합니다. 재배포 일정은 추후 공지드리겠습니다.
```

### 8.3 롤백 검증
```
⬜ getConfig() 에러율 < 1%
⬜ 테이블 3개 (1-3번) 로드 확인
⬜ Type 시트 정상 로드
⬜ 핸드 커밋 정상 작동
⬜ 10분간 안정성 모니터링
```

---

## 9. FAQ

### Q1: 기존 HANDS 시트 데이터는 마이그레이션이 필요한가요?
**A:** 아니요. HANDS/ACTIONS 시트는 변경 없으며, 기존 데이터는 그대로 유지됩니다. Roster 스키마 확장은 **앞으로 기록될 핸드**에만 영향을 줍니다.

### Q2: Keyplayer 컬럼을 추가하지 않으면 어떻게 되나요?
**A:** code.gs는 Keyplayer 컬럼이 없으면 자동으로 `false` 기본값을 사용합니다. 모든 플레이어가 일반 플레이어로 처리되지만, 기능은 정상 작동합니다.

### Q3: PlayerId가 없는 플레이어도 기록 가능한가요?
**A:** 네. PlayerId는 **선택적 필드**입니다. 없으면 빈 문자열로 저장되며, 핸드 기록에는 영향을 주지 않습니다.

### Q4: 36개 테이블이 모두 필요 없으면 어떻게 하나요?
**A:** CONFIG 시트에서 사용하지 않는 테이블 행을 삭제하거나, 프론트엔드 드롭다운에서 필터링할 수 있습니다. 예:
```javascript
// index.html에서 1-10번 테이블만 표시
const filteredTables = result.tables.filter(t => toInt_(t) <= 10);
```

### Q5: Seats.csv에 중복된 PlayerId가 있으면요?
**A:** 재입장(Re-Entry)인 경우 정상입니다. 동일 PlayerId가 여러 좌석에 나타날 수 있습니다. 시스템은 TableNo + SeatNo 조합으로 좌석을 식별합니다.

### Q6: 마이그레이션 중 핸드 기록이 필요하면?
**A:** Blue-Green 배포 방식이므로 **다운타임 0초**입니다. 마이그레이션 중에도 기존 Type 시트를 사용하여 핸드 기록이 가능합니다.

### Q7: Seats.csv 데이터를 실시간으로 업데이트할 수 있나요?
**A:** 네. Google Sheets에서 직접 편집하면 즉시 반영됩니다. SessionStorage 캐싱(1분 TTL) 후 자동으로 새 데이터를 로드합니다. 또는 사용자에게 새로고침을 요청하세요.

### Q8: PokerRoom, TableName 필드는 언제 사용하나요?
**A:** 여러 포커룸(Main, VIP)이나 테이블 색상(Black, Red)으로 구분이 필요한 경우 사용합니다. 현재 버전에서는 선택적이며, UI에 표시되지 않습니다.

### Q9: 성능이 저하되면 어떻게 하나요?
**A:**
1. SessionStorage 캐싱 TTL을 5분으로 연장
2. Roster 시트를 테이블별로 분리 (Seats_Table1, Seats_Table2...)
3. 사용하지 않는 테이블 행 삭제

### Q10: 마이그레이션 실패 시 데이터 손실 가능성은?
**A:** 0%. 백업(Type_BACKUP), Blue-Green 배포, 롤백 스크립트로 3중 안전장치가 있습니다. 최악의 경우 Type 시트로 즉시 복구 가능합니다.

---

## 10. 참고 자료

### 10.1 관련 문서
- [PRD.md](PRD.md) - 제품 요구사항 문서
- [README.md](../README.md) - 프로젝트 개요
- [CLAUDE.md](../CLAUDE.md) - 개발 가이드라인
- [Seats.csv](Seats.csv) - 원본 데이터 샘플
- [Players.csv](Players.csv) - 플레이어 전체 정보

### 10.2 외부 참조
- [Google Sheets API - Spreadsheet Service](https://developers.google.com/apps-script/reference/spreadsheet)
- [Blue-Green Deployment Pattern](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Database Migration Best Practices](https://www.liquibase.com/resources/guides/database-migration)

### 10.3 샘플 스크립트 저장소
```
handlogger/
├── docs/
│   ├── DB_MIGRATION.md (이 문서)
│   ├── migration_scripts/
│   │   ├── backup_type_sheet.js
│   │   ├── add_keyplayer_column.js
│   │   ├── init_config_36_tables.js
│   │   ├── verify_migration.js
│   │   └── rollback.js
│   └── test_cases/
│       ├── test_getconfig.js
│       ├── test_record_mode.js
│       └── benchmark_performance.js
```

---

## 11. 승인 및 이력

### 11.1 문서 승인

| 역할 | 이름 | 서명 | 날짜 |
|------|------|------|------|
| **작성자** | Dev Team | ✅ | 2025-10-12 |
| **검토자** (기술) | Engineering Lead | _______ | - |
| **검토자** (제품) | Product Manager | _______ | - |
| **승인자** | CTO | _______ | - |

### 11.2 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2025-10-12 | Dev Team | 초기 문서 작성 |

---

## 12. 체크리스트 요약

### 12.1 실행 전 체크리스트
```
⬜ Type 시트 백업 완료 (Type_BACKUP_20251012)
⬜ Seats.csv 업로드 완료 (Seats_NEW)
⬜ Keyplayer 컬럼 추가 완료 (K열)
⬜ code.gs 변경 완료 (ROSTER_HEADERS, readRoster_)
⬜ VERSION_JSON v2.8.0 동기화
⬜ CONFIG 36개 테이블 초기화 스크립트 준비
⬜ 롤백 스크립트 테스트 완료
⬜ 사용자 공지 준비
⬜ 모니터링 대시보드 설정
⬜ 팀원 교육 완료
```

### 12.2 실행 후 체크리스트
```
⬜ getConfig() 정상 작동 (36개 테이블)
⬜ Record Mode 핸드 3건 기록 성공
⬜ Review Mode VIRTUAL 전송 성공
⬜ LOG 시트 ERR_* 0건
⬜ 성능 벤치마크 통과 (< 2초)
⬜ 24시간 안정성 모니터링 완료
⬜ 사용자 피드백 수집 (NPS)
⬜ 문서 업데이트 (PRD, README)
⬜ Type_BACKUP 아카이브
⬜ 팀 회고 미팅
```

---

**문서 끝**

*이 마이그레이션 가이드는 HandLogger v2.7.2 → v2.8.0 데이터베이스 스키마 변경을 위한 공식 문서입니다.*
*모든 단계를 순서대로 수행하고, 검증 체크리스트를 완료한 후 배포를 진행하세요.*
*문제 발생 시 즉시 롤백 절차를 따르고, 팀에 보고하세요.*

---

## 📞 긴급 연락처

**마이그레이션 담당자:**
- Dev Team Lead: [이름] / [이메일] / [전화]
- Database Admin: [이름] / [이메일] / [전화]
- On-Call Engineer: [이름] / [전화]

**에스컬레이션 경로:**
1. Dev Team Lead (1차)
2. Engineering Manager (2차)
3. CTO (3차)

---

**행운을 빕니다! 🚀**