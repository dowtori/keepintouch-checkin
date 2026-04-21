// ============================================================
// KEEPINTOUCH 체크인 시스템 — Google Apps Script
//
// [배포 방법]
// 1. script.google.com → 새 프로젝트 생성
// 2. 이 코드 전체를 붙여넣기
// 3. CONFIG.SPREADSHEET_ID 값을 실제 시트 ID로 교체
//    (시트 URL: .../spreadsheets/d/[이 부분]/edit)
// 4. CONFIG 의 COL_* 값을 실제 컬럼 위치에 맞게 수정
//    (A열=1, B열=2, C열=3 ...)
// 5. 배포 → 새 배포 → 웹 앱
//    - 다음 사용자로 실행: 나
//    - 액세스 권한: 모든 사용자
// 6. 배포 URL을 복사 → api.js 의 ENDPOINT에 붙여넣기
//
// [시트 구조 설정]
// 기존 시트에 아래 두 컬럼을 맨 오른쪽에 추가하세요:
//   - is_checked_in  (체크인여부, 기본값 FALSE)
//   - checked_in_at  (체크인시각, 비워두기)
// checkins 시트는 자동 생성됩니다.
// ============================================================

const CONFIG = {
  SPREADSHEET_ID: '1IKCbcPEW_A7_mFkbtV8AjJHoLyhMxeO0aVpPAFoY3HI',
  GUESTS_SHEET_GID: 0,
  CHECKINS_SHEET_NAME: 'checkins',

  // 컬럼 위치 (A=1, B=2, C=3 ...)
  COL_ID: 1,             // id (이미지 파일명에 사용)
  COL_NAME: 2,           // name
  COL_PHONE: 3,          // phone_last4
  COL_STATUS: 4,         // status (선정/예비)
  COL_CHECKED_IN: 5,     // is_checked_in
  COL_CHECKED_IN_AT: 6,  // checked_in_at
  COL_INSTAGRAM: 7,      // 비고 (Instagram URL)
};

// ─────────────────────────────────────────
// 라우터
// ─────────────────────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'lookup')  return respond(lookup(e.parameter.name, e.parameter.phone));
    if (action === 'checkin') return respond(checkin(Number(e.parameter.row_id), e.parameter.day));
    return respond({ error: 'unknown_action' });
  } catch (err) {
    return respond({ error: err.message });
  }
}

// ─────────────────────────────────────────
// 이름 + 연락처 뒷4자리 조회
// ─────────────────────────────────────────
function lookup(name, phone4) {
  const sheet = getGuestsSheet();
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row       = data[i];
    const rowName   = String(row[CONFIG.COL_NAME - 1]).trim();
    const rowPhone  = String(row[CONFIG.COL_PHONE - 1]).replace(/\D/g, '');
    const rowLast4  = rowPhone.slice(-4);
    const status    = String(row[CONFIG.COL_STATUS - 1]).trim();
    const checkedIn = row[CONFIG.COL_CHECKED_IN - 1];
    const checkedAt = row[CONFIG.COL_CHECKED_IN_AT - 1];

    if (rowName === name.trim() && rowLast4 === phone4.trim()) {
      return {
        found: true,
        id: String(row[CONFIG.COL_ID - 1]),          // A열 id (이미지 파일명)
        row_id: i + 1,                               // 시트 행 번호 (체크인에 사용)
        name: rowName,
        status: status,
        instagram: String(row[CONFIG.COL_INSTAGRAM - 1]).trim(),
        is_checked_in: checkedIn === true,
        checked_in_at: checkedIn === true ? String(checkedAt) : null,
      };
    }
  }

  return { found: false };
}

// ─────────────────────────────────────────
// 체크인 처리
// ─────────────────────────────────────────
function checkin(rowId, day) {
  const guestSheet   = getGuestsSheet();
  const checkinsSheet = getOrCreateCheckinsSheet();

  const rowData   = guestSheet.getRange(rowId, 1, 1, CONFIG.COL_CHECKED_IN_AT).getValues()[0];
  const name      = rowData[CONFIG.COL_NAME - 1];
  const checkedIn = rowData[CONFIG.COL_CHECKED_IN - 1];

  // 중복 체크인 방지
  if (checkedIn === true) {
    return {
      success: false,
      already_checked_in: true,
      checked_in_at: String(rowData[CONFIG.COL_CHECKED_IN_AT - 1]),
    };
  }

  const now = new Date();
  guestSheet.getRange(rowId, CONFIG.COL_CHECKED_IN).setValue(true);
  guestSheet.getRange(rowId, CONFIG.COL_CHECKED_IN_AT).setValue(now);
  checkinsSheet.appendRow([rowId, String(name), now, day]);

  return { success: true, name: String(name) };
}

// ─────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────
function getGuestsSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheets().find(s => s.getSheetId() === CONFIG.GUESTS_SHEET_GID);
  if (!sheet) throw new Error('guests sheet not found (GID: ' + CONFIG.GUESTS_SHEET_GID + ')');
  return sheet;
}

function getOrCreateCheckinsSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.CHECKINS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.CHECKINS_SHEET_NAME);
    sheet.appendRow(['row_id', 'name', 'checked_in_at', 'day']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
