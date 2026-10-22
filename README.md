# 電小二 Volt Buddy 官網

網址：https://voltbuddys.com （GitHub Pages）

- 純 HTML／CSS／JavaScript，不需要安裝或編譯，改完推到 `main` 分支就會自動上線。
- `assets/style.css`：全站樣式，品牌色集中在檔案最上方的 `:root`。
- `assets/site.js`：手機選單、從庫存系統讀取「進行中的特惠組合」（優惠專區與首頁）。
- 優惠資料來自庫存系統的 Supabase 公開函式 `get_public_promotions`，只回傳進行中組合的名稱、期間、價格與品名；店長在庫存系統「優惠設定」改組合，官網會自動更新。
- `CNAME`：GitHub Pages 自訂網域設定，請勿刪除。
