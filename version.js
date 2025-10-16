// HandLogger Version
// Auto-generated version file

const VERSION = {
  current: 'v3.7.1',
  name: 'Security & Stability Patch',
  date: '2025-01-16',
  changes: [
    '무한 루프 버그 수정 (handId 충돌 처리)',
    'APP_SPREADSHEET_ID 보안 강화 (PropertiesService)',
    '에러 메시지 정보 노출 방지 (sanitization)'
  ],
  previous: 'v3.7.0',
  next: 'v3.8.0 (P1 Optimizations)'
};

// Export for Google Apps Script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VERSION;
}
