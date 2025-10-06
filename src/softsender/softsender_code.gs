/***********************
 * Soft Content Sender — v10.1
 * - v10.1: UX 개선 (스마트 전송 버튼, 통합 미리보기)
 * - v10: 배치 전송 기능 추가
 * - v9: Room+Table 통합, ELIM 개선
 * - CountryMap 제거 (2자리 국가 코드 직접 사용)
 ***********************/
const CFG = {
  CUE_SHEET_ID: '13LpVWYHaJAMtvc1OiCtkrcAYqavkXWaTg3Vke0R0CUQ', // 기본값
  CUE_TAB_VIRTUAL: 'virtual',
  TYPE_SHEET_ID: '1J-lf8bYTLPbpdhieUNdb8ckW_uwdQ3MtSBLmyRIwH7U',  // 기본값
  TYPE_TAB: 'Type',

  FIX_E: '미완료',
  FIX_G: 'SOFT',

  KST_TZ: 'Asia/Seoul',
  TIME_DISPLAY: 'HH:mm',
};

function doGet() {
  return HtmlService.createTemplateFromFile('page')
    .evaluate()
    .setTitle('Soft Content Sender')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getBootstrap() {
  return {
    cueId: CFG.CUE_SHEET_ID,
    typeId: CFG.TYPE_SHEET_ID,
    tz: CFG.KST_TZ,
  };
}

/* TYPE 읽기 (override 수용) */
function getTypeRows(typeIdOverride) {
  try {
    const typeId = String(typeIdOverride || CFG.TYPE_SHEET_ID).trim();
    const ss = SpreadsheetApp.openById(typeId);
    const sh = ss.getSheetByName(CFG.TYPE_TAB);
    if (!sh) throw new Error(`SHEET_NOT_FOUND:${CFG.TYPE_TAB}`);
    const values = sh.getDataRange().getValues();
    if (values.length < 2) return { ok: true, headers: values[0] || [], rows: [], typeId };

    const headers = values[0].map(v => String(v).trim());
    const idx = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const iRoom   = idx('Poker Room');
    const iTName  = idx('Table Name');
    const iTNo    = idx('Table No.');
    const iSeat   = idx('Seat No.');
    const iPlayer = idx('Players');
    const iNat    = idx('Nationality');

    if ([iRoom,iTName,iTNo,iSeat,iPlayer,iNat].some(i=>i<0)) throw new Error('BAD_HEADERS');

    const rows = values.slice(1).map(r => ({
      room:   String(r[iRoom]||'').trim(),
      tname:  String(r[iTName]||'').trim(),
      tno:    String(r[iTNo]||'').trim(),
      seat:   String(r[iSeat]||'').trim(),
      player: String(r[iPlayer]||'').trim(),
      nat:    String(r[iNat]||'').trim(),
    })).filter(r => r.room && r.tno && r.seat);

    return { ok:true, headers, rows, typeId };
  } catch(e) {
    return { ok:false, error:String(e) };
  }
}

/* CountryMap 제거됨 - 2자리 국가 코드를 그대로 사용 */

/* 시간 드롭다운(±20분) */
function getTimeOptions(cueIdOverride) {
  try {
    const cueId = String(cueIdOverride || CFG.CUE_SHEET_ID).trim();
    const ss = SpreadsheetApp.openById(cueId);
    const sh = ss.getSheetByName(CFG.CUE_TAB_VIRTUAL);
    if (!sh) throw new Error(`SHEET_NOT_FOUND:${CFG.CUE_TAB_VIRTUAL}`);

    const last = sh.getLastRow();
    if (last < 2) return { ok: true, list: [], cueId };

    const colC = sh.getRange(2, 3, last - 1, 1).getDisplayValues().flat();
    const nowKST = new Date();
    const center = Utilities.formatDate(nowKST, CFG.KST_TZ, CFG.TIME_DISPLAY); // "HH:mm"

    const toMin = (s) => {
      const m = String(s || '').match(/^(\d{2}):(\d{2})/);
      return m ? (parseInt(m[1],10)*60 + parseInt(m[2],10)) : null;
    };
    const cmin = toMin(center);
    const list = colC
      .map(v => String(v).trim())
      .filter(v => /^\d{2}:\d{2}/.test(v))
      .filter(v => {
        const m = toMin(v);
        return m !== null && Math.abs(m - cmin) <= 20;
      });

    const uniq = [...new Set(list)];
    uniq.sort((a,b)=>toMin(a)-toMin(b));
    return { ok:true, list:uniq, center, cueId };
  } catch(e) {
    return { ok:false, error:String(e) };
  }
}

/* 파일명: HHmm_<name>_<mode> */
function buildFileName(kind, hhmm, tableNo, playerOrLabel) {
  const safe = (s) => String(s || '').trim().replace(/[^\w\-#]+/g,'_');
  const modes = ['PU','ELIM','L3','LEADERBOARD','BATCH'];
  const mode = modes.includes(kind) ? kind : 'SC';
  const time = String(hhmm || '').padStart(4,'0');
  const name = (kind==='LEADERBOARD') ? safe(playerOrLabel || ('Table'+(tableNo||''))) : safe(playerOrLabel || 'Player');
  return `${time}_${name}_${mode}`;
}

/* 업데이트 */
function updateVirtual(payload) {
  if (!payload || !payload.kind) return { ok:false, error:'BAD_PAYLOAD' };

  try {
    const cueId = String(payload.cueId || CFG.CUE_SHEET_ID).trim();
    const ss = SpreadsheetApp.openById(cueId);
    const sh = ss.getSheetByName(CFG.CUE_TAB_VIRTUAL);
    if (!sh) throw new Error(`SHEET_NOT_FOUND:${CFG.CUE_TAB_VIRTUAL}`);

    const last = sh.getLastRow();
    if (last < 2) throw new Error('EMPTY_VIRTUAL');

    // 행 선택
    const colC = sh.getRange(2,3,last-1,1).getDisplayValues().flat();
    const nowKST = new Date();
    const nowHHmm = Utilities.formatDate(nowKST, CFG.KST_TZ, 'HH:mm');
    const pickedStr = (payload.autoNow ? nowHHmm : (payload.pickedTime||'')).trim();
    if (!/^\d{2}:\d{2}$/.test(pickedStr)) throw new Error('TIME_FORMAT');

    const rowIdx0 = colC.findIndex(v=>{
      const s = String(v).trim();
      if (/^\d{2}:\d{2}$/.test(s)) return s===pickedStr;
      const m = s.match(/^(\d{2}:\d{2}):\d{2}$/);
      return m ? (m[1]===pickedStr) : false;
    });
    if (rowIdx0 < 0) return { ok:false, error:`NO_MATCH_TIME:${pickedStr}` };
    const row = 2 + rowIdx0;

    // 값 준비
    const eVal = payload.eFix || CFG.FIX_E;
    const gVal = payload.gFix || CFG.FIX_G;
    const fVal = String(payload.filename||'').trim();
    const jBlock = String(payload.jBlock||'').replace(/\r\n/g,'\n');
    if (!fVal) throw new Error('EMPTY_FILENAME');
    if (!jBlock) throw new Error('EMPTY_JBLOCK');

    // J append
    const jCell = sh.getRange(row, 10); // J
    let cur = jCell.getValue();
    cur = cur ? String(cur).replace(/\r\n/g,'\n') : '';
    const needsLF = cur && !cur.endsWith('\n') ? '\n' : '';
    const glue = cur ? (needsLF + '\n') : '';
    const next = cur + glue + jBlock;

    // 세팅
    sh.getRange(row,5).setValue(eVal);  // E
    sh.getRange(row,6).setValue(fVal);  // F
    sh.getRange(row,7).setValue(gVal);  // G
    jCell.setValue(next);               // J

    return { ok:true, row, time:pickedStr };
  } catch(e) {
    return { ok:false, error:String(e) };
  }
}
