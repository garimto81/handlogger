# 🚀 배포 가이드

## 1️⃣ Script ID 확보

### 방법 A: 기존 프로젝트 사용 (추천)

1. https://script.google.com/ 접속
2. "새 프로젝트" 클릭
3. 좌측 **⚙️ 프로젝트 설정** 클릭
4. **스크립트 ID** 복사
5. `.clasp.json` 파일의 `scriptId`에 붙여넣기

```json
{
  "scriptId": "여기에_복사한_ID_입력",
  "rootDir": "./dist"
}
```

---

### 방법 B: Clasp으로 자동 생성

```bash
# 1. clasp 로그인 (1회만)
npx clasp login

# 2. 새 프로젝트 생성 (자동으로 .clasp.json 생성됨)
cd c:\claude\handlogger
npx clasp create --type webapp --title "HandLogger Unified" --rootDir ./dist

# ✅ .clasp.json이 자동으로 생성됩니다!
```

---

## 2️⃣ 초기 배포

### Step 1: 로그인 (1회만)

```bash
npx clasp login
```

브라우저가 열리면 Google 계정으로 로그인

### Step 2: 빌드

```bash
npm run build
```

결과: `dist/code.gs`, `dist/index.html` 생성

### Step 3: 푸시

```bash
npx clasp push
```

또는

```bash
npm run push  # build + push 한번에
```

### Step 4: 웹앱 배포

```bash
# 새 배포 생성
npx clasp deploy --description "v2.6.0 통합 배포"

# 배포 URL 확인
npx clasp deployments
```

또는 웹 에디터에서:
1. https://script.google.com/ → 프로젝트 열기
2. 우측 상단 **배포** → **새 배포**
3. 유형: **웹 앱**
4. 액세스 권한: **모든 사용자**
5. **배포** 클릭
6. **웹 앱 URL** 복사

---

## 3️⃣ 개발 워크플로우

### 코드 수정 후 배포

```bash
# src/ 폴더에서 파일 수정
src/handlogger/code.gs
src/tracker/tracker.html

# 빌드 + 배포
npm run push

# 또는 watch 모드로 자동 빌드
npm run watch
# (다른 터미널에서)
npx clasp push --watch
```

---

## 4️⃣ 배포 확인

### Apps Script 에디터 확인

```bash
# 웹 에디터 열기
npx clasp open
```

확인 사항:
- ✅ `code.gs` 파일 존재
- ✅ `index.html` 파일 존재
- ✅ 함수: `tracker_getKeyPlayers()`, `soft_updateVirtual()` 등

### 웹앱 테스트

1. 배포 URL 열기
2. 상단 버튼 확인:
   - [Record] [Review] [Tracker] [SoftSender] [⚙️]
3. 각 탭 클릭해서 UI 확인

---

## 5️⃣ 버전 업데이트

### 새 배포 생성

```bash
# 1. 코드 수정
# 2. 빌드
npm run build

# 3. 푸시
npx clasp push

# 4. 새 버전 배포
npx clasp deploy --description "v2.7.0 - 새 기능 추가"
```

### 기존 배포 업데이트

```bash
# 배포 ID 확인
npx clasp deployments

# 특정 배포 업데이트
npx clasp deploy -i AKfycby... -d "버그 수정"
```

---

## 6️⃣ 문제 해결

### 로그인 오류

```bash
# 로그아웃 후 재로그인
npx clasp logout
npx clasp login
```

### 푸시 오류

```bash
# rootDir 확인
cat .clasp.json

# dist/ 폴더 확인
ls dist/

# 강제 푸시
npx clasp push --force
```

### 배포 권한 오류

1. Apps Script 에디터 열기
2. 우측 상단 **배포** → **배포 관리**
3. 액세스 권한 재설정

---

## 7️⃣ 빠른 명령어 정리

```bash
# 개발
npm run build          # 빌드만
npm run watch          # 자동 빌드
npm run push           # 빌드 + 푸시

# 배포
npx clasp push         # 코드 업로드
npx clasp deploy       # 새 배포
npx clasp open         # 에디터 열기
npx clasp deployments  # 배포 목록

# 확인
ls dist/              # 빌드 결과
cat .clasp.json       # Script ID 확인
```

---

## 8️⃣ 체크리스트

### 초기 설정
- [ ] Node.js 설치 확인 (`node --version`)
- [ ] `npm install` 실행
- [ ] `npx clasp login` 실행
- [ ] `.clasp.json`에 Script ID 입력

### 배포 전
- [ ] `npm run build` 성공
- [ ] `dist/code.gs` 생성 확인
- [ ] `dist/index.html` 생성 확인
- [ ] 함수 네임스페이스 확인 (`grep "tracker_\|soft_" dist/code.gs`)

### 배포 후
- [ ] Apps Script 에디터에서 파일 확인
- [ ] 웹앱 URL 접속
- [ ] 5개 탭 모두 동작 확인
- [ ] 스프레드시트 연동 테스트
