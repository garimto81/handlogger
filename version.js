// HandLogger Version
// Auto-generated version file

const VERSION = {
  current: 'v3.7.0',
  name: 'VIRTUAL Performance Optimization',
  date: '2025-01-16',
  changes: [
    'VIRTUAL 전송 4.5s → 2.0s (56% 개선)',
    '역순 스캔: 1442행 → 50행 윈도우 (97% 절감)',
    '핸드 상세 캐시: 1.0s → 0.1s (90% 개선)',
    '로깅 오버헤드 최소화 (985ms → 500ms)'
  ],
  previous: 'v3.6.3',
  next: 'v3.8.0 (Feature TBD)'
};

// Export for Google Apps Script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VERSION;
}
