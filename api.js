// ============================================================
// API LAYER — Google Sheets / Apps Script
//
// Supabase 전환 시 이 파일만 교체하면 됩니다.
// confirm.html 은 수정 불필요.
//
// [설정]
// Apps Script 배포 후 아래 ENDPOINT에 URL을 붙여넣으세요.
// ============================================================

const API = {
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbzk2EWvbFAeYdd6pwLTfHbpL8Gq0zilLbCLvnTeIOb6mnwfYjjRyVp1Vq0ZqddJ9mpo/exec',

  // 이름 + 연락처 뒷4자리로 게스트 조회
  // returns: { found, row_id, name, status, is_checked_in, checked_in_at }
  async lookup(name, phone4) {
    const url = this.ENDPOINT
      + '?action=lookup'
      + '&name='  + encodeURIComponent(name.trim())
      + '&phone=' + encodeURIComponent(phone4.trim());
    const res = await fetch(url);
    return res.json();
  },

  // 체크인 처리
  // returns: { success, name } | { success:false, already_checked_in, checked_in_at }
  async checkin(rowId, day) {
    const url = this.ENDPOINT
      + '?action=checkin'
      + '&row_id=' + rowId
      + '&day='    + day;
    const res = await fetch(url);
    return res.json();
  },
};
