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

  // ---------- 車款與商品 ----------
  // 店長在庫存系統「官網商品」勾選顯示的車身／電池；照片放在公開的 website-photos 空間。官網不顯示價格。
  var ITEMS_API = 'https://kruflsixtejmhaucjikc.supabase.co/rest/v1/rpc/get_public_items';
  var PHOTO_BASE = 'https://kruflsixtejmhaucjikc.supabase.co/storage/v1/object/public/website-photos/';
  var TEL = 'tel:+88639590633';
  var LINE = 'https://line.me/R/ti/p/%40938itjgm';

  function photoUrl(path) {
    // 路徑由資料庫限制成「品項 id／檔名」；仍逐段編碼，避免特殊字元變成別的網址。
    return PHOTO_BASE + String(path).split('/').map(encodeURIComponent).join('/');
  }

  function modelCard(item) {
    var card = el('article', 'model');
    var media = el('div', 'model-media');
    if (item.photo_path) {
      var img = document.createElement('img');
      img.src = photoUrl(item.photo_path);
      img.alt = item.name;
      img.loading = 'lazy';
      img.width = 800; img.height = 600;
      media.appendChild(img);
    } else {
      media.appendChild(el('span', 'muted', '照片準備中'));
    }
    card.appendChild(media);
    var body = el('div', 'model-body');
    body.appendChild(el('span', 'model-cat', item.category));
    body.appendChild(el('h3', null, item.name));
    var specs = [];
    if (item.range_km) specs.push('續航約 ' + item.range_km + ' 公里');
    if (item.top_speed) specs.push('最高時速 ' + item.top_speed + ' 公里');
    if (item.battery_spec) specs.push((item.category === '電池' ? '規格 ' : '電池 ') + item.battery_spec);
    if (specs.length) {
      var ul = el('ul', 'model-specs');
      specs.forEach(function (s) { ul.appendChild(el('li', null, s)); });
      body.appendChild(ul);
    }
    if (item.summary) body.appendChild(el('p', 'muted', item.summary));
    if (item.category === '車身') body.appendChild(el('p', 'model-note', '車身價格含配件，不含電池（電池另購）'));
    var foot = el('div', 'model-foot');
    foot.appendChild(el('span', 'model-price', '價格歡迎洽詢'));
    var cta = el('a', 'btn btn-navy btn-sm', item.category === '車身' ? '預約試乘' : 'LINE 詢問');
    cta.href = item.category === '車身' ? 'store.html' : LINE;
    foot.appendChild(cta);
    body.appendChild(foot);
    card.appendChild(body);
    return card;
  }

  var modelList = document.getElementById('model-list');
  if (modelList) {
    var tabsEl = document.getElementById('model-tabs');
    var emptyEl = document.getElementById('model-empty');
    var showEmpty = function () { modelList.hidden = true; if (tabsEl) tabsEl.hidden = true; if (emptyEl) emptyEl.hidden = false; };
    fetch(ITEMS_API, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: '{}' })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (rows) {
        if (!rows.length) return showEmpty();
        var current = '全部';
        var draw = function () {
          modelList.textContent = '';
          var grid = el('div', 'grid model-grid');
          rows.filter(function (r) { return current === '全部' || r.category === current; })
            .forEach(function (r) { grid.appendChild(modelCard(r)); });
          modelList.appendChild(grid);
        };
        // 有兩種分類才顯示分頁籤（全部／車身／電池）。
        var cats = ['車身', '電池'].filter(function (c) { return rows.some(function (r) { return r.category === c; }); });
        if (tabsEl && cats.length > 1) {
          ['全部'].concat(cats).forEach(function (label) {
            var b = el('button', 'tab', label);
            b.type = 'button';
            b.setAttribute('aria-pressed', label === current ? 'true' : 'false');
            b.addEventListener('click', function () {
              current = label;
              Array.prototype.forEach.call(tabsEl.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
              draw();
            });
            tabsEl.appendChild(b);
          });
          tabsEl.hidden = false;
        }
        draw();
      })
      .catch(showEmpty);
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
