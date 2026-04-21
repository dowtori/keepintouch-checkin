// ============================================================
// API LAYER — Google Sheets / Apps Script
//
// Supabase 전환 시 이 파일만 교체하면 됩니다.
// confirm.html / admin.html 은 수정 불필요.
// ============================================================

const API = {
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbzk2EWvbFAeYdd6pwLTfHbpL8Gq0zilLbCLvnTeIOb6mnwfYjjRyVp1Vq0ZqddJ9mpo/exec',

  async lookup(name, phone4) {
    const url = this.ENDPOINT
      + '?action=lookup'
      + '&name='  + encodeURIComponent(name.trim())
      + '&phone=' + encodeURIComponent(phone4.trim());
    const res = await fetch(url);
    return res.json();
  },

  async checkin(rowId, day) {
    const url = this.ENDPOINT
      + '?action=checkin'
      + '&row_id=' + rowId
      + '&day='    + day;
    const res = await fetch(url);
    return res.json();
  },

  async checkinCompanion(rowId, day) {
    const url = this.ENDPOINT
      + '?action=checkin_companion'
      + '&row_id=' + rowId
      + '&day='    + day;
    const res = await fetch(url);
    return res.json();
  },

  async list() {
    const url = this.ENDPOINT + '?action=list';
    const res = await fetch(url);
    return res.json();
  },
};
