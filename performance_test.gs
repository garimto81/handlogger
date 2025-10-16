/**
 * HandLogger 성능 테스트 스크립트
 *
 * 사용법:
 * 1. Apps Script 에디터에서 이 파일을 프로젝트에 추가
 * 2. 메뉴: 실행 > 함수 실행 > testAllFunctions
 * 3. 로그 확인: 보기 > 로그 또는 실행 로그
 */

/**
 * 전체 함수 성능 테스트 (Public API만)
 */
function testAllFunctions() {
  Logger.log('========================================');
  Logger.log('HandLogger 성능 테스트 시작');
  Logger.log('========================================\n');

  const results = [];

  // 1. getConfig() - 초기 로딩
  results.push(testFunction_('getConfig', () => {
    return getConfig();
  }));

  // 2. getNextHandNo() - 핸드 번호 조회
  results.push(testFunction_('getNextHandNo', () => {
    return getNextHandNo();
  }));

  // 3. queryHands() - Review 리스트 (10개)
  results.push(testFunction_('queryHands(10)', () => {
    return queryHands({}, {num: 1, size: 10});
  }));

  // 4. queryHands() - Review 리스트 (50개)
  results.push(testFunction_('queryHands(50)', () => {
    return queryHands({}, {num: 1, size: 50});
  }));

  // 5. getHandDetail() - 핸드 상세
  const hands = queryHands({}, {num: 1, size: 1});
  if(hands && hands.items && hands.items.length > 0) {
    const handId = hands.items[0].hand_id;
    results.push(testFunction_('getHandDetail', () => {
      return getHandDetail(handId);
    }));
  }

  // 6. readRoster_() - Roster 읽기 (캐시 없음)
  invalidateRosterCache_();
  results.push(testFunction_('readRoster_ (no cache)', () => {
    return readRoster_();
  }));

  // 7. getCachedRoster_() - Roster 읽기 (캐시 있음)
  results.push(testFunction_('getCachedRoster_ (cached)', () => {
    return getCachedRoster_();
  }));

  // 8. readConfig_() - Config 읽기 (캐시 없음)
  invalidateConfigCache_();
  results.push(testFunction_('readConfig_ (no cache)', () => {
    return readConfig_();
  }));

  // 9. getCachedConfig_() - Config 읽기 (캐시 있음)
  results.push(testFunction_('getCachedConfig_ (cached)', () => {
    return getCachedConfig_();
  }));

  // 결과 정렬 (느린 순)
  results.sort((a, b) => b.time - a.time);

  Logger.log('\n========================================');
  Logger.log('성능 테스트 결과 (느린 순)');
  Logger.log('========================================\n');

  results.forEach((r, i) => {
    const timeStr = r.time < 1000
      ? `${r.time.toFixed(0)}ms`
      : `${(r.time / 1000).toFixed(2)}s`;

    const status = r.success ? '✅' : '❌';
    Logger.log(`${i+1}. ${status} ${r.name}: ${timeStr}`);

    if(!r.success) {
      Logger.log(`   오류: ${r.error}`);
    }
  });

  Logger.log('\n========================================');
  Logger.log('병목 구간 분석');
  Logger.log('========================================\n');

  const bottlenecks = results.filter(r => r.time > 500);
  if(bottlenecks.length > 0) {
    Logger.log(`⚠️ 500ms 이상 소요 함수: ${bottlenecks.length}개\n`);
    bottlenecks.forEach(r => {
      Logger.log(`- ${r.name}: ${r.time.toFixed(0)}ms`);
    });
  } else {
    Logger.log('✅ 모든 함수가 500ms 이내에 완료됨');
  }

  Logger.log('\n========================================');
  Logger.log('테스트 완료');
  Logger.log('========================================');
}

/**
 * 개별 함수 성능 테스트 (saveHand 제외 - 실제 데이터 저장 방지)
 */
function testReadOnlyFunctions() {
  Logger.log('========================================');
  Logger.log('읽기 전용 함수 성능 테스트');
  Logger.log('========================================\n');

  const results = [];

  // 읽기 함수만 테스트
  results.push(testFunction_('getConfig', () => getConfig()));
  results.push(testFunction_('getNextHandNo', () => getNextHandNo()));
  results.push(testFunction_('queryHands(10)', () => queryHands({}, {num: 1, size: 10})));
  results.push(testFunction_('readRoster_', () => readRoster_()));
  results.push(testFunction_('readConfig_', () => readConfig_()));

  // 결과 출력
  results.sort((a, b) => b.time - a.time);
  results.forEach((r, i) => {
    Logger.log(`${i+1}. ${r.name}: ${r.time.toFixed(0)}ms ${r.success ? '✅' : '❌'}`);
  });
}

/**
 * 캐싱 효과 측정
 */
function testCachingPerformance() {
  Logger.log('========================================');
  Logger.log('캐싱 효과 측정');
  Logger.log('========================================\n');

  // 1. Roster 캐싱 효과
  Logger.log('📊 Roster 캐싱 효과:\n');

  invalidateRosterCache_();
  const rosterNoCacheTime = measureTime_(() => getCachedRoster_());
  Logger.log(`캐시 미스: ${rosterNoCacheTime.toFixed(0)}ms`);

  const rosterCacheTime = measureTime_(() => getCachedRoster_());
  Logger.log(`캐시 히트: ${rosterCacheTime.toFixed(0)}ms`);

  const rosterImprovement = ((rosterNoCacheTime - rosterCacheTime) / rosterNoCacheTime * 100).toFixed(1);
  Logger.log(`개선율: ${rosterImprovement}% 🚀\n`);

  // 2. Config 캐싱 효과
  Logger.log('📊 Config 캐싱 효과:\n');

  invalidateConfigCache_();
  const configNoCacheTime = measureTime_(() => getCachedConfig_());
  Logger.log(`캐시 미스: ${configNoCacheTime.toFixed(0)}ms`);

  const configCacheTime = measureTime_(() => getCachedConfig_());
  Logger.log(`캐시 히트: ${configCacheTime.toFixed(0)}ms`);

  const configImprovement = ((configNoCacheTime - configCacheTime) / configNoCacheTime * 100).toFixed(1);
  Logger.log(`개선율: ${configImprovement}% 🚀\n`);

  // 3. 전체 getConfig() 캐싱 효과
  Logger.log('📊 getConfig() 전체 캐싱 효과:\n');

  invalidateRosterCache_();
  invalidateConfigCache_();
  const totalNoCacheTime = measureTime_(() => getConfig());
  Logger.log(`캐시 미스: ${totalNoCacheTime.toFixed(0)}ms`);

  const totalCacheTime = measureTime_(() => getConfig());
  Logger.log(`캐시 히트: ${totalCacheTime.toFixed(0)}ms`);

  const totalImprovement = ((totalNoCacheTime - totalCacheTime) / totalNoCacheTime * 100).toFixed(1);
  Logger.log(`개선율: ${totalImprovement}% 🚀`);
}

/**
 * Sparse Column Reads 효과 측정 (v3.5.0)
 */
function testSparseReadsPerformance() {
  Logger.log('========================================');
  Logger.log('Sparse Column Reads 효과 측정');
  Logger.log('========================================\n');

  // queryHands() 다양한 페이지 크기
  const sizes = [10, 20, 50, 100];

  Logger.log('📊 queryHands() 성능 (페이지 크기별):\n');

  sizes.forEach(size => {
    const time = measureTime_(() => queryHands({}, {num: 1, size: size}));
    Logger.log(`${size}개: ${time.toFixed(0)}ms`);
  });

  Logger.log('\n💡 Sparse Reads (v3.5.0): 11개 컬럼만 읽기 (20개 → 11개, 45% 절감)');
}

/**
 * 내부 헬퍼: 함수 실행 시간 측정
 */
function testFunction_(name, fn) {
  const start = Date.now();
  let success = true;
  let error = null;

  try {
    fn();
  } catch(e) {
    success = false;
    error = e.message || String(e);
  }

  const time = Date.now() - start;

  return {
    name: name,
    time: time,
    success: success,
    error: error
  };
}

/**
 * 내부 헬퍼: 순수 실행 시간 측정 (반환값 포함)
 */
function measureTime_(fn) {
  const start = Date.now();
  fn();
  return Date.now() - start;
}

/**
 * 빠른 성능 체크 (주요 함수만)
 */
function quickPerformanceCheck() {
  Logger.log('⚡ 빠른 성능 체크\n');

  const tests = [
    ['getConfig', () => getConfig()],
    ['queryHands(10)', () => queryHands({}, {num: 1, size: 10})],
    ['getNextHandNo', () => getNextHandNo()]
  ];

  tests.forEach(([name, fn]) => {
    const time = measureTime_(fn);
    const icon = time < 100 ? '🟢' : time < 500 ? '🟡' : '🔴';
    Logger.log(`${icon} ${name}: ${time.toFixed(0)}ms`);
  });
}

/**
 * 병목 구간 상세 분석
 */
function analyzeBottlenecks() {
  Logger.log('========================================');
  Logger.log('병목 구간 상세 분석');
  Logger.log('========================================\n');

  // 1. readAll_() 성능 (시트별)
  Logger.log('📊 readAll_() 성능 (시트별):\n');

  const ss = SpreadsheetApp.openById(APP_SPREADSHEET_ID);
  const sheets = ['HANDS', 'ACTIONS', 'CONFIG', 'Type'];

  sheets.forEach(sheetName => {
    const sh = ss.getSheetByName(sheetName);
    if(sh) {
      const time = measureTime_(() => {
        const data = sh.getDataRange().getValues();
        return data;
      });
      const rows = sh.getLastRow();
      Logger.log(`${sheetName}: ${time.toFixed(0)}ms (${rows}행)`);
    }
  });

  // 2. 스프레드시트 읽기 vs 캐시
  Logger.log('\n📊 스프레드시트 읽기 vs 캐시:\n');

  invalidateRosterCache_();
  const sheetReadTime = measureTime_(() => readRoster_());
  const cacheReadTime = measureTime_(() => getCachedRoster_());

  Logger.log(`시트 직접 읽기: ${sheetReadTime.toFixed(0)}ms`);
  Logger.log(`캐시 읽기: ${cacheReadTime.toFixed(0)}ms`);
  Logger.log(`속도 차이: ${(sheetReadTime / cacheReadTime).toFixed(1)}배 🚀`);

  // 3. JSON 파싱 성능
  Logger.log('\n📊 JSON 파싱 성능:\n');

  const hands = queryHands({}, {num: 1, size: 1});
  if(hands && hands.items && hands.items.length > 0) {
    const handId = hands.items[0].hand_id;
    const detail = getHandDetail(handId);

    if(detail && detail.head) {
      const holesJson = detail.head.holes_json || '{}';
      const stacksJson = detail.head.stacks_json || '{}';

      const holesTime = measureTime_(() => JSON.parse(holesJson));
      const stacksTime = measureTime_(() => JSON.parse(stacksJson));

      Logger.log(`holes_json 파싱: ${holesTime.toFixed(2)}ms`);
      Logger.log(`stacks_json 파싱: ${stacksTime.toFixed(2)}ms`);
    }
  }
}
