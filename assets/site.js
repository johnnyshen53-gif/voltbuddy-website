// 電小二官網的互動程式：手機選單開合、從庫存系統讀取進行中的優惠。
(function () {
  'use strict';

  // ---------- 手機選單 ----------
  // 按漢堡鈕時切換選單的 open class，並同步 aria-expanded 讓螢幕閱讀器知道狀態。
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
    });
  }

  // ---------- 優惠資料 ----------
  // 呼叫資料庫的公開函式 get_public_promotions（只回傳進行中的組合，不含成本與庫存）。
  // 這把金鑰是「可公開」的 publishable key，和庫存系統前端用的是同一把；
  // 資料能不能讀取由資料庫權限決定，金鑰本身不代表任何權限。
  var API = 'https://kruflsixtejmhaucjikc.supabase.co/rest/v1/rpc/get_public_promotions';
  var KEY = 'sb_publishable_iMWbGmoLDBPsfxnAhhETIw_wPrUNCFY';

  function loadPromotions() {
    return fetch(API, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: '{}'
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  // 金額顯示成 NT$12,500（去掉多餘的 .00）。
  function money(n) {
    return 'NT$' + Number(n).toLocaleString('zh-TW', { maximumFractionDigits: 2 });
  }
  // 資料庫日期 2026-10-31 → 2026/10/31
  function day(d) { return String(d).replace(/-/g, '/'); }

  // 台北今天的日期（YYYY-MM-DD），用來判斷「即將結束」。
  function taipeiToday() {
    var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return parts; // en-CA 格式剛好是 YYYY-MM-DD
  }
  function daysLeft(endsOn) {
    var a = Date.parse(taipeiToday() + 'T00:00:00Z');
    var b = Date.parse(endsOn + 'T00:00:00Z');
    return Math.round((b - a) / 86400000);
  }

  // 建立元素的小工具：一律用 textContent 放文字，避免資料裡的特殊字元被當成網頁程式碼。
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function itemsText(items) {
    return (items || []).map(function (i) { return i.name + ' ×' + i.quantity; }).join('、');
  }
  function savings(p) {
    var s = Number(p.list_total) - Number(p.combo_price);
    return s > 0 ? s : 0;
  }

  function promoCard(p) {
    var card = el('article', 'promo');
    var top = el('div', 'promo-top');
    var left = daysLeft(p.ends_on);
    var badge = el('span', 'promo-badge' + (left <= 3 ? ' ending' : ''), left <= 3 ? (left === 0 ? '今天最後一天' : '剩 ' + left + ' 天') : '進行中');
    top.appendChild(badge);
    top.appendChild(el('span', 'promo-price', '組合價 ' + money(p.combo_price)));
    var save = savings(p);
    if (save > 0) top.appendChild(el('span', 'promo-save', '原價 ' + money(p.list_total) + '，省 ' + money(save)));
    var body = el('div', 'promo-body');
    body.appendChild(el('h3', null, p.name));
    body.appendChild(el('p', 'muted', itemsText(p.items)));
    body.appendChild(el('p', 'promo-period', '活動期間：' + day(p.starts_on) + '–' + day(p.ends_on)));
    card.appendChild(top);
    card.appendChild(body);
    return card;
  }

  function promoMini(p) {
    var a = el('a', 'promo-mini');
    a.href = 'promotions.html';
    var save = savings(p);
    a.appendChild(el('strong', null, save > 0 ? '省 ' + money(save) : '組合價 ' + money(p.combo_price)));
    a.appendChild(el('span', null, p.name));
    a.appendChild(el('span', 'muted', '至 ' + day(p.ends_on)));
    return a;
  }

  // 優惠專區頁：列出全部；沒有優惠或讀取失敗時顯示說明。
  var list = document.getElementById('promo-list');
  if (list) {
    var countEl = document.getElementById('promo-count');
    loadPromotions().then(function (rows) {
      list.textContent = '';
      if (!rows.length) {
        list.appendChild(el('div', 'status-box', '目前沒有進行中的優惠，敬請期待。想先了解價格，歡迎來電或用 LINE 詢問。'));
        if (countEl) countEl.textContent = '';
        return;
      }
      if (countEl) countEl.textContent = '共 ' + rows.length + ' 個優惠';
      var grid = el('div', 'grid');
      rows.forEach(function (p) { grid.appendChild(promoCard(p)); });
      list.appendChild(grid);
    }).catch(function () {
      list.textContent = '';
      list.appendChild(el('div', 'status-box', '優惠資訊暫時無法載入，請稍後再試，或來電 03-959-0633 詢問。'));
    });
  }

  // 首頁：有優惠才顯示「本月最划算」區塊，最多 3 個；沒有或讀取失敗就保持隱藏。
  var home = document.getElementById('home-promos');
  if (home) {
    loadPromotions().then(function (rows) {
      if (!rows.length) return;
      var grid = document.getElementById('home-promo-grid');
      rows.slice(0, 3).forEach(function (p) { grid.appendChild(promoMini(p)); });
      home.hidden = false;
    }).catch(function () { /* 首頁不顯示錯誤，維持隱藏 */ });
  }
})();
