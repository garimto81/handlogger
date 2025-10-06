/**
 * 빌드 검증 스크립트
 *
 * dist/code.gs의 함수 정의 순서를 검증:
 * - 공통 함수가 호출보다 먼저 정의되었는지 확인
 * - Apps Script는 import/require 미지원 → 순서가 중요
 *
 * 사용법:
 *   node verify-build.js
 */

const fs = require('fs');

const DIST_FILE = './dist/code.gs';

// 검증할 공통 함수 목록 (12개)
const commonFunctions = [
  'withScriptLock_', 'appSS_', 'getOrCreateSheet_',
  'setHeaderIfEmpty_', 'readAll_', 'findColIndex_',
  'toInt_', 'numComma_', 'nowKST_', 'todayStartKST_',
  'readRoster_', 'extractTimeHHMM_'
];

function verify() {
  console.log('🔍 빌드 검증 시작...\n');

  if (!fs.existsSync(DIST_FILE)) {
    console.error(`❌ ${DIST_FILE} 파일이 없습니다. npm run build를 먼저 실행하세요.`);
    process.exit(1);
  }

  const code = fs.readFileSync(DIST_FILE, 'utf8');
  const lines = code.split('\n');

  let errors = [];

  // 각 공통 함수에 대해 검증
  commonFunctions.forEach(fnName => {
    const definitionRegex = new RegExp(`^\\s*function ${fnName}\\(`);
    const callRegex = new RegExp(`[^/]${fnName}\\(`); // 주석 제외

    let definitionLine = -1;
    let firstCallLine = -1;

    lines.forEach((line, idx) => {
      // 함수 정의 찾기
      if (definitionRegex.test(line) && definitionLine === -1) {
        definitionLine = idx + 1; // 1-based line number
      }

      // 함수 호출 찾기 (정의 라인 제외, 주석 제외)
      if (callRegex.test(line) && idx + 1 !== definitionLine && !line.trim().startsWith('//')) {
        if (firstCallLine === -1) {
          firstCallLine = idx + 1;
        }
      }
    });

    // 검증: 정의가 호출보다 먼저 나와야 함
    if (definitionLine === -1) {
      errors.push(`❌ ${fnName}: 정의를 찾을 수 없음`);
    } else if (firstCallLine !== -1 && definitionLine > firstCallLine) {
      errors.push(`❌ ${fnName}: 정의(line ${definitionLine})가 호출(line ${firstCallLine})보다 뒤에 위치`);
    } else {
      console.log(`✅ ${fnName}: 정의(line ${definitionLine}) → 호출(line ${firstCallLine || 'N/A'})`);
    }
  });

  console.log('\n');

  if (errors.length > 0) {
    console.error('⚠️  검증 실패:\n');
    errors.forEach(err => console.error(`  ${err}`));
    console.error('\n💡 build.js의 병합 순서를 확인하세요 (common → handlogger → tracker → soft)\n');
    process.exit(1);
  } else {
    console.log('✅ 모든 검증 통과! 빌드가 올바르게 병합되었습니다.\n');
    process.exit(0);
  }
}

verify();
