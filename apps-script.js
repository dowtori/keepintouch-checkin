// ============================================================
// KEEPINTOUCH 체크인 시스템 — Google Apps Script
//
// [배포 방법]
// 1. script.google.com → 기존 프로젝트 열기
// 2. 이 코드 전체를 붙여넣기 (기존 코드 대체)
// 3. 배포 → 배포 관리 → 연필 아이콘(수정) → 버전: 새 버전 → 배포
//    ※ '새 배포' 누르면 URL이 바뀌니 반드시 기존 배포 수정할 것
//
// [시트 컬럼 구조]
// A(1): id
// B(2): name
// C(3): phone_last4
// D(4): status
// E(5): is_checked_in
// F(6): checked_in_at
// G(7): 비고(instagram)
// H(8): companion_name        ← 신규 추가
// I(9): companion_is_checked_in ← 신규 추가 (기본값 FALSE)
// ============================================================

const CONFIG = {
  SPREADSHEET_ID: '1IKCbcPEW_A7_mFkbtV8AjJHoLyhMxeO0aVpPAFoY3HI',
  GUESTS_SHEET_GID: 0,
  CHECKINS_SHEET_NAME: 'checkins',

  // 컬럼 위치 (A=1, B=2, C=3 ...)
  COL_ID:                    1,
  COL_NAME:                  2,
  COL_PHONE:                 3,
  COL_STATUS:                4,
  COL_CHECKED_IN:            5,
  COL_CHECKED_IN_AT:         6,
  COL_INSTAGRAM:             7,
  COL_COMPANION_NAME:        8,  // 동행인 이름
  COL_COMPANION_CHECKED_IN:  9,  // 동행인 체크인 여부
};

// ─────────────────────────────────────────
// 라우터
// ─────────────────────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'lookup')            return respond(lookup(e.parameter.name, e.parameter.phone));
    if (action === 'checkin')           return respond(checkin(Number(e.parameter.row_id), e.parameter.day));
    if (action === 'checkin_companion') return respond(checkinCompanion(Number(e.parameter.row_id), e.parameter.day));
    if (action === 'list')              return respond(listGuests());
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
    const row      = data[i];
    const rowName  = String(row[CONFIG.COL_NAME - 1]).trim();
    const rowPhone = String(row[CONFIG.COL_PHONE - 1]).replace(/\D/g, '');
    const rowLast4 = rowPhone.slice(-4);

    if (rowName === name.trim() && rowLast4 === phone4.trim()) {
      const checkedIn      = row[CONFIG.COL_CHECKED_IN - 1];
      const companionName  = String(row[CONFIG.COL_COMPANION_NAME - 1] || '').trim();
      return {
        found:            true,
        id:               String(row[CONFIG.COL_ID - 1]),
        row_id:           i + 1,
        name:             rowName,
        instagram:        String(row[CONFIG.COL_INSTAGRAM - 1]).trim(),
        is_checked_in:    checkedIn === true,
        checked_in_at:    checkedIn === true ? String(row[CONFIG.COL_CHECKED_IN_AT - 1]) : null,
        companion_name:   companionName || null,
      };
    }
  }

  return { found: false };
}

// ─────────────────────────────────────────
// 메인 체크인 처리
// ─────────────────────────────────────────
function checkin(rowId, day) {
  const guestSheet    = getGuestsSheet();
  const checkinsSheet = getOrCreateCheckinsSheet();

  const rowData   = guestSheet.getRange(rowId, 1, 1, CONFIG.COL_COMPANION_CHECKED_IN).getValues()[0];
  const name      = String(rowData[CONFIG.COL_NAME - 1]).trim();
  const checkedIn = rowData[CONFIG.COL_CHECKED_IN - 1];

  if (checkedIn === true) {
    return {
      success:          false,
      already_checked_in: true,
      checked_in_at:    String(rowData[CONFIG.COL_CHECKED_IN_AT - 1]),
      companion_name:   String(rowData[CONFIG.COL_COMPANION_NAME - 1] || '').trim() || null,
    };
  }

  const now = new Date();
  guestSheet.getRange(rowId, CONFIG.COL_CHECKED_IN).setValue(true);
  guestSheet.getRange(rowId, CONFIG.COL_CHECKED_IN_AT).setValue(now);
  checkinsSheet.appendRow([rowId, name, now, day]);

  return {
    success:        true,
    name:           name,
    companion_name: String(rowData[CONFIG.COL_COMPANION_NAME - 1] || '').trim() || null,
  };
}

// ─────────────────────────────────────────
// 동행인 체크인 처리
// ─────────────────────────────────────────
function checkinCompanion(rowId, day) {
  const guestSheet    = getGuestsSheet();
  const checkinsSheet = getOrCreateCheckinsSheet();

  const rowData        = guestSheet.getRange(rowId, 1, 1, CONFIG.COL_COMPANION_CHECKED_IN).getValues()[0];
  const companionName  = String(rowData[CONFIG.COL_COMPANION_NAME - 1] || '').trim();
  const alreadyChecked = rowData[CONFIG.COL_COMPANION_CHECKED_IN - 1];

  if (!companionName) return { success: false, error: 'no_companion' };
  if (alreadyChecked === true) return { success: true, already: true, companion_name: companionName };

  guestSheet.getRange(rowId, CONFIG.COL_COMPANION_CHECKED_IN).setValue(true);
  checkinsSheet.appendRow([rowId, companionName + ' (동행인)', new Date(), day]);

  return { success: true, companion_name: companionName };
}

// ─────────────────────────────────────────
// 전체 게스트 목록 (어드민용)
// ─────────────────────────────────────────
function listGuests() {
  const sheet = getGuestsSheet();
  const data  = sheet.getDataRange().getValues();
  const guests = [];

  for (let i = 1; i < data.length; i++) {
    const row  = data[i];
    const name = String(row[CONFIG.COL_NAME - 1]).trim();
    if (!name) continue;

    const checkedIn         = row[CONFIG.COL_CHECKED_IN - 1] === true;
    const checkedAt         = checkedIn ? String(row[CONFIG.COL_CHECKED_IN_AT - 1]) : null;
    const companionName     = String(row[CONFIG.COL_COMPANION_NAME - 1] || '').trim() || null;
    const companionChecked  = row[CONFIG.COL_COMPANION_CHECKED_IN - 1] === true;

    guests.push({
      id:                       String(row[CONFIG.COL_ID - 1]),
      name:                     name,
      instagram:                String(row[CONFIG.COL_INSTAGRAM - 1] || '').trim(),
      is_checked_in:            checkedIn,
      checked_in_at:            checkedAt,
      companion_name:           companionName,
      companion_is_checked_in:  companionName ? companionChecked : null,
    });
  }

  return { guests };
}

// ─────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────
function getGuestsSheet() {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
