// HandLogger Version
// Auto-generated version file

const VERSION = {
  current: 'v2.7.2',
  name: 'Integration Complete',
  date: '2025-10-06',
  changes: [
    '원본 백업 → src/ 자동 복사 (빌드 시)',
    '공통 함수 12개 모듈화 (src/common/common.gs)',
    'tracker/tracker.gs doGet() 충돌 해결',
    'handlogger/tracker/softsender 원본 백업 공통 함수 제거',
    '버전 통일: v2.7.2'
  ],
  previous: 'v2.7.1',
  next: 'v3.0.0 (Unified Web App 배포)'
};

// Export for Google Apps Script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VERSION;
}
