/**
 * HandLogger 빌드 스크립트
 *
 * 기능:
 * 1. src/ 폴더의 분리된 코드를 읽기
 * 2. 함수명 충돌 방지 (네임스페이스 접두사 추가)
 * 3. dist/ 폴더에 통합 파일 생성
 *
 * 사용법:
 *   node build.js          # 빌드
 *   node build.js --watch  # 파일 변경 감지 & 자동 빌드
 */

const fs = require('fs');
const path = require('path');

const SRC = './src';
const DIST = './dist';

// 빌드 함수
function build() {
  console.log('🔨 빌드 시작...\n');

  // ===== Step 0: 원본 백업 → src/ 복사 (최신 상태 동기화) =====
  console.log('📋 원본 백업에서 src/로 복사 중...');

  // handlogger_sub → src/handlogger
  if (fs.existsSync('handlogger_sub/handlogger_code.gs')) {
    fs.copyFileSync('handlogger_sub/handlogger_code.gs', `${SRC}/handlogger/code.gs`);
    console.log('  ✅ handlogger_code.gs → src/handlogger/code.gs');
  }
  if (fs.existsSync('handlogger_sub/handlogger_index.html')) {
    fs.copyFileSync('handlogger_sub/handlogger_index.html', `${SRC}/handlogger/index.html`);
    console.log('  ✅ handlogger_index.html → src/handlogger/index.html');
  }

  // tracker → src/tracker
  if (fs.existsSync('tracker/tracker.html')) {
    fs.copyFileSync('tracker/tracker.html', `${SRC}/tracker/tracker.html`);
    console.log('  ✅ tracker.html → src/tracker/tracker.html');
  }

  // softsender → src/softsender
  if (fs.existsSync('softsender/softsender_code.gs')) {
    fs.copyFileSync('softsender/softsender_code.gs', `${SRC}/softsender/softsender_code.gs`);
    console.log('  ✅ softsender_code.gs → src/softsender/softsender_code.gs');
  }
  if (fs.existsSync('softsender/page.html')) {
    fs.copyFileSync('softsender/page.html', `${SRC}/softsender/page.html`);
    console.log('  ✅ page.html → src/softsender/page.html');
  }

  console.log('');

  // dist 폴더 생성
  if (!fs.existsSync(DIST)) {
    fs.mkdirSync(DIST);
  }

  // ===== code.gs 빌드 =====
  console.log('📄 code.gs 통합 중...');

  const versionCode = fs.readFileSync('./version.js', 'utf8');
  const commonCode = fs.readFileSync(`${SRC}/common/common.gs`, 'utf8');
  const handloggerCode = fs.readFileSync(`${SRC}/handlogger/code.gs`, 'utf8');
  const trackerCode = fs.readFileSync(`${SRC}/tracker/tracker.gs`, 'utf8');
  const softCode = fs.readFileSync(`${SRC}/softsender/softsender_code.gs`, 'utf8');

  // Tracker에서 중복 제거 (common에서 공유)
  let trackerCleaned = trackerCode
    // 중복 const 제거
    .replace(/const APP_SPREADSHEET_ID = .+;/g, '// APP_SPREADSHEET_ID (HandLogger에서 공유)')
    .replace(/const TYPE_SHEET_NAME = .+;/g, '// TYPE_SHEET_NAME (HandLogger에서 공유)')
    .replace(/const TRACKER_VERSION = .+;/g, '// TRACKER_VERSION (HandLogger에서 공유)')
    // doGet() 제거 (HandLogger가 처리)
    .replace(/function doGet\([\s\S]*?\n\}/g, '// doGet() 제거됨 (HandLogger가 처리)');

  // Tracker 함수명 변경
  const trackerNamespaced = trackerCleaned
    .replace(/function getKeyPlayers\(/g, 'function tracker_getKeyPlayers(')
    .replace(/function getTablePlayers\(/g, 'function tracker_getTablePlayers(')
    .replace(/function updatePlayerChips\(/g, 'function tracker_updatePlayerChips(')
    .replace(/function addPlayer\(/g, 'function tracker_addPlayer(')
    .replace(/function removePlayer\(/g, 'function tracker_removePlayer(');

  // SoftSender 함수명 변경 + doGet 제거
  const softNamespaced = softCode
    .replace(/function doGet\(\) \{[\s\S]*?\n\}/g, '// doGet() 제거됨 (HandLogger가 처리)')
    .replace(/function getBootstrap\(/g, 'function soft_getBootstrap(')
    .replace(/function getTypeRows\(/g, 'function soft_getTypeRows(')
    .replace(/function getTimeOptions\(/g, 'function soft_getTimeOptions(')
    .replace(/function buildFileName\(/g, 'function soft_buildFileName(')
    .replace(/function updateVirtual\(/g, 'function soft_updateVirtual(');

  // code.gs 통합
  const codeGsFinal = `/* ========================================
 * VERSION (version.js)
 * ======================================== */
${versionCode}

/* ========================================
 * COMMON MODULE (src/common/common.gs)
 * ======================================== */
${commonCode}

/* ========================================
 * HANDLOGGER MODULE (src/handlogger/code.gs)
 * ======================================== */
${handloggerCode}

/* ========================================
 * TRACKER MODULE (src/tracker/tracker.gs)
 * ======================================== */
${trackerNamespaced}

/* ========================================
 * SOFTSENDER MODULE (src/softsender/softsender_code.gs)
 * ======================================== */
${softNamespaced}
`;

  fs.writeFileSync(`${DIST}/code.gs`, codeGsFinal);
  console.log('  ✅ dist/code.gs 생성 완료');

  // ===== index.html 빌드 =====
  console.log('\n📄 index.html 통합 중...');

  const handloggerHtml = fs.readFileSync(`${SRC}/handlogger/index.html`, 'utf8');
  const trackerHtml = fs.readFileSync(`${SRC}/tracker/tracker.html`, 'utf8');
  const softHtml = fs.readFileSync(`${SRC}/softsender/page.html`, 'utf8');

  // Tracker HTML에서 <body> 내용 추출
  const trackerBodyMatch = trackerHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const trackerBody = trackerBodyMatch ? trackerBodyMatch[1] : '';

  // Tracker CSS 추출 및 네임스페이스 격리
  const trackerCssMatch = trackerHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  let trackerCss = trackerCssMatch ? trackerCssMatch[1] : '';

  // ✅ Tracker CSS를 #panelTracker 안에만 적용되도록 스코핑
  trackerCss = `#panelTracker {\n${trackerCss.replace(/\n/g, '\n  ')}\n}`;

  // Tracker JavaScript 추출 (함수 호출 수정)
  const trackerJsMatch = trackerHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  let trackerJs = trackerJsMatch ? trackerJsMatch[1] : '';

  // ✅ 함수명 변경 (google.script.run 체이닝 포함)
  trackerJs = trackerJs
    .replace(/\.getKeyPlayers\(/g, '.tracker_getKeyPlayers(')
    .replace(/\.getTablePlayers\(/g, '.tracker_getTablePlayers(')
    .replace(/\.updatePlayerChips\(/g, '.tracker_updatePlayerChips(')
    .replace(/\.addPlayer\(/g, '.tracker_addPlayer(')
    .replace(/\.removePlayer\(/g, '.tracker_removePlayer(')
    // ✅ window.onload 제거 (탭 진입시 초기화)
    .replace(/window\.onload\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};?/g, '// window.onload 제거됨 (탭 진입시 초기화)');

  // SoftSender HTML에서 <body> 내용 추출
  const softBodyMatch = softHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const softBody = softBodyMatch ? softBodyMatch[1] : '';

  // SoftSender CSS 추출 및 네임스페이스 격리
  const softCssMatch = softHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  let softCss = softCssMatch ? softCssMatch[1] : '';

  // ✅ SoftSender CSS를 #panelSoftsender 안에만 적용되도록 스코핑
  softCss = `#panelSoftsender {\n${softCss.replace(/\n/g, '\n  ')}\n}`;

  // SoftSender JavaScript 추출 (함수 호출 수정)
  const softJsMatch = softHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  let softJs = softJsMatch ? softJsMatch[1] : '';

  // ✅ 함수명 변경 (google.script.run 체이닝 포함)
  softJs = softJs
    .replace(/\.getBootstrap\(/g, '.soft_getBootstrap(')
    .replace(/\.getTypeRows\(/g, '.soft_getTypeRows(')
    .replace(/\.getTimeOptions\(/g, '.soft_getTimeOptions(')
    .replace(/\.buildFileName\(/g, '.soft_buildFileName(')
    .replace(/\.updateVirtual\(/g, '.soft_updateVirtual(')
    // ✅ window.addEventListener('load') 제거
    .replace(/window\.addEventListener\(\s*['"]load['"]\s*,\s*init\s*\)\s*;?/g, '// window.load 제거됨 (탭 진입시 초기화)');

  // HandLogger HTML에 Tracker/SoftSender 삽입
  let indexFinal = handloggerHtml;

  // 1. Header 버튼 추가
  indexFinal = indexFinal.replace(
    /<button id="modeSettings" type="button">⚙️<\/button>/,
    `<button id="modeTracker" type="button">Tracker</button> <button id="modeSoftSender" type="button">SoftSender</button> <button id="modeSettings" type="button">⚙️</button>`
  );

  // 2. CSS 추가 (</style> 직전)
  indexFinal = indexFinal.replace(
    '</style>',
    `
/* ========== Tracker CSS ========== */
${trackerCss}

/* ========== SoftSender CSS ========== */
${softCss}
</style>`
  );

  // 3. Tracker 패널 추가 (panelSettings 직전)
  indexFinal = indexFinal.replace(
    /<div class="panel hidden" id="panelSettings">/,
    `<div class="panel hidden" id="panelTracker">
${trackerBody}
</div>

  <div class="panel hidden" id="panelSoftSender">
${softBody}
</div>

  <div class="panel hidden" id="panelSettings">`
  );

  // 4. JavaScript 추가 (</script> 직전)
  indexFinal = indexFinal.replace(
    /(function safeJson_[\s\S]*?<\/script>)/,
    `$1

<script>
/* ========== Tracker JavaScript ========== */
${trackerJs}

/* ========== SoftSender JavaScript ========== */
${softJs}

/* ========== 모드 전환 추가 ========== */
document.addEventListener('DOMContentLoaded', () => {
  const modeTracker = document.getElementById('modeTracker');
  const modeSoft = document.getElementById('modeSoftSender');

  if (modeTracker) {
    modeTracker.onclick = () => setMode('tracker');
  }
  if (modeSoft) {
    modeSoft.onclick = () => setMode('softsender');
  }
});

// setMode 함수 확장
const originalSetMode = setMode;
function setMode(m) {
  const panels = ['record', 'review', 'tracker', 'softsender', 'settings'];
  const buttons = ['modeRecord', 'modeReview', 'modeTracker', 'modeSoftSender', 'modeSettings'];

  panels.forEach(p => {
    const el = document.getElementById('panel' + p.charAt(0).toUpperCase() + p.slice(1));
    if (el) el.classList.add('hidden');
  });

  buttons.forEach(b => {
    const el = document.getElementById(b);
    if (el) el.classList.remove('btnPrimary');
  });

  const targetPanel = document.getElementById('panel' + m.charAt(0).toUpperCase() + m.slice(1));
  const targetBtn = document.getElementById('mode' + m.charAt(0).toUpperCase() + m.slice(1));

  if (targetPanel) targetPanel.classList.remove('hidden');
  if (targetBtn) targetBtn.classList.add('btnPrimary');

  // Tracker 모드 진입 시 초기화
  if (m === 'tracker' && typeof loadKeyPlayers === 'function') {
    loadKeyPlayers();
  }

  // SoftSender 모드 진입 시 초기화 (중복 방지)
  if (m === 'softsender' && typeof init === 'function' && !window.softSenderInitialized) {
    init();
    window.softSenderInitialized = true;
  }
}
</script>`
  );

  fs.writeFileSync(`${DIST}/index.html`, indexFinal);
  console.log('  ✅ dist/index.html 생성 완료');

  console.log('\n✅ 빌드 완료!\n');
  console.log('📦 배포 명령: clasp push\n');
}

// Watch 모드
const args = process.argv.slice(2);
if (args.includes('--watch')) {
  console.log('👀 Watch 모드 활성화...\n');

  build(); // 초기 빌드

  const watchDirs = [
    `${SRC}/handlogger`,
    `${SRC}/tracker`,
    `${SRC}/softsender`
  ];

  watchDirs.forEach(dir => {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      console.log(`🔄 파일 변경 감지: ${filename}`);
      build();
    });
  });

  console.log('⌨️  Ctrl+C로 종료\n');
} else {
  build();
}
