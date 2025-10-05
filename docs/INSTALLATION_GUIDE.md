# 설치 가이드 - Poker Hand Logger v2.2.1

**작성일**: 2025-10-05
**버전**: v2.2.1
**목적**: 초기 설치 및 Script Properties 설정 가이드

---

## 📋 사전 요구사항

1. **Google 계정**: Apps Script 접근 권한
2. **Google 스프레드시트 ID**: ROSTER/HANDS/ACTIONS/CONFIG/LOG/Hand 시트가 포함된 스프레드시트
3. **Apps Script 편집기 접근**: `도구 > 스크립트 편집기`

---

## 🚀 설치 단계

### Step 1: 코드 배포

1. Google Sheets 열기
2. `도구` > `스크립트 편집기` 클릭
3. `code.gs` 파일에 코드 복사/붙여넣기
4. `index.html` 파일 생성 후 HTML 코드 붙여넣기

### Step 2: Script Properties 설정 (필수)

**⚠️ 중요**: v2.1.0+부터 보안 강화를 위해 스프레드시트 ID가 Script Properties에 저장됩니다.

#### 방법 A: 자동 설정 (권장)

1. Apps Script 편집기에서 함수 선택 드롭다운 클릭
2. `setupScriptProperties` 선택
3. **실행 버튼** (▶) 클릭
4. 권한 승인 (최초 1회)
5. 로그 확인: `✅ Script Properties 설정 완료: ROSTER_SPREADSHEET_ID`

```javascript
// 자동으로 실행됩니다:
// - ROSTER_SPREADSHEET_ID = '1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U'
```

#### 방법 B: 수동 설정 (대체)

1. Apps Script 편집기에서 `프로젝트 설정` (⚙️) 클릭
2. `스크립트 속성` 섹션으로 스크롤
3. `스크립트 속성 추가` 클릭
4. 다음 값 입력:
   - **속성**: `ROSTER_SPREADSHEET_ID`
   - **값**: `1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U`
5. `스크립트 속성 저장` 클릭

### Step 3: 초기화

1. Apps Script 편집기에서 `ensureSheets` 함수 실행
2. 필요한 시트 자동 생성 확인:
   - HANDS
   - ACTIONS
   - CONFIG
   - LOG
   - Hand

### Step 4: 웹 앱 배포 (선택)

1. Apps Script 편집기에서 `배포` > `새 배포` 클릭
2. 배포 유형: `웹 앱`
3. 설명: `Poker Hand Logger v2.2.1`
4. 실행 계정: `나`
5. 액세스 권한: `나만`
6. `배포` 클릭
7. 웹 앱 URL 복사

---

## 🔧 문제 해결

### 오류: "ROSTER_SPREADSHEET_ID not configured"

**원인**: Script Properties에 스프레드시트 ID가 설정되지 않음

**해결방법**:
1. 방법 A 또는 방법 B로 Script Properties 설정
2. `setupScriptProperties()` 함수 재실행
3. 브라우저 새로고침

### 오류: "ReferenceError: getRosterSpreadsheetId_ is not defined"

**원인**: 이전 버전(v2.0.x) 코드 사용 중

**해결방법**:
1. `code.gs` 전체를 v2.1.0 코드로 교체
2. Apps Script 편집기에서 `저장` (Ctrl+S)
3. `setupScriptProperties()` 실행

### 오류: "권한이 필요합니다"

**원인**: 최초 실행 시 Google 권한 승인 필요

**해결방법**:
1. `권한 검토` 클릭
2. Google 계정 선택
3. `고급` > `안전하지 않은 페이지로 이동` (개발 중일 때)
4. `허용` 클릭

---

## 📊 설정 확인

### Script Properties 확인 방법

```javascript
// Apps Script 편집기에서 실행
function checkScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROSTER_SPREADSHEET_ID');
  Logger.log('ROSTER_SPREADSHEET_ID: ' + id);

  if (!id) {
    Logger.log('❌ 설정되지 않음 - setupScriptProperties() 실행 필요');
  } else {
    Logger.log('✅ 설정 완료');
  }
}
```

### 시트 확인 방법

```javascript
// Apps Script 편집기에서 실행
function checkSheets() {
  const ss = SpreadsheetApp.openById(getRosterSpreadsheetId_());
  const sheets = ss.getSheets().map(s => s.getName());
  Logger.log('생성된 시트: ' + sheets.join(', '));

  const required = ['HANDS', 'ACTIONS', 'CONFIG', 'LOG', 'Hand'];
  const missing = required.filter(name => !sheets.includes(name));

  if (missing.length > 0) {
    Logger.log('❌ 누락된 시트: ' + missing.join(', '));
    Logger.log('ensureSheets() 함수를 실행하세요.');
  } else {
    Logger.log('✅ 모든 필수 시트 확인 완료');
  }
}
```

---

## 🔄 업그레이드 (v2.0.x → v2.2.1)

### 주요 변경사항

**v2.1.0**: 하드코딩된 스프레드시트 ID 제거
**v2.2.1**: Review 모드 UI 개선 (페이지네이션 추가)

**Before (v2.0.x)**:
```javascript
const ROSTER_SPREADSHEET_ID = '1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U';
```

**After (v2.1.0+)**:
```javascript
function getRosterSpreadsheetId_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROSTER_SPREADSHEET_ID');
  if (!id) throw new Error('...');
  return id;
}
```

### 업그레이드 절차

1. **백업**: 기존 코드 및 데이터 백업
2. **코드 교체**: `code.gs` + `index.html` 전체를 v2.2.1로 교체
3. **Script Properties 설정**: `setupScriptProperties()` 실행
4. **테스트**: 핸드 저장 및 Review 모드 페이지네이션 확인
5. **검증**: Hand 시트 데이터 확인

---

## 🎯 환경별 설정

### 개발 환경

```javascript
function setupScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ROSTER_SPREADSHEET_ID', 'DEV_SPREADSHEET_ID'); // 개발용 ID
  Logger.log('✅ 개발 환경 설정 완료');
}
```

### 프로덕션 환경

```javascript
function setupScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ROSTER_SPREADSHEET_ID', '1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U');
  Logger.log('✅ 프로덕션 환경 설정 완료');
}
```

---

## 📞 지원

### 문서 참고

- **PRD**: [PRD_HandLogger.md](PRD_HandLogger.md) - 기능 명세
- **LLD**: [LLD_HandLogger.md](LLD_HandLogger.md) - 기술 설계
- **DB 설계**: [DB_DESIGN_HandSheet.md](DB_DESIGN_HandSheet.md) - Hand 시트 구조

### 로그 확인

```javascript
// 최근 로그 확인
function viewRecentLogs() {
  const ss = SpreadsheetApp.openById(getRosterSpreadsheetId_());
  const sh = ss.getSheetByName('LOG');
  const rows = sh.getDataRange().getValues();

  // 최근 10개 로그
  const recent = rows.slice(-10);
  recent.forEach(row => {
    Logger.log(`[${row[0]}] ${row[3]}: ${row[4]}`);
  });
}
```

---

## ✅ 설치 완료 체크리스트

- [ ] Apps Script 프로젝트 생성
- [ ] `code.gs` 파일 업로드
- [ ] `index.html` 파일 업로드
- [ ] `setupScriptProperties()` 실행 완료
- [ ] Script Properties에 ROSTER_SPREADSHEET_ID 설정 확인
- [ ] `ensureSheets()` 실행으로 시트 생성
- [ ] 웹 앱 배포 (선택)
- [ ] 테스트 핸드 저장 성공
- [ ] Hand 시트 데이터 확인

---

## 🔐 보안 권장사항

1. **Script Properties 사용**: 스프레드시트 ID를 코드에 하드코딩하지 마세요
2. **권한 최소화**: 웹 앱 배포 시 "나만" 액세스 권장
3. **정기 백업**: CONFIG, LOG 시트 정기 백업
4. **로그 모니터링**: LOG 시트에서 비정상 활동 확인

---

**마지막 업데이트**: 2025-10-05
**버전**: v2.2.1
