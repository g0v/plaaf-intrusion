## 介紹 Introduction
- 2020/9/17 開始，中華民國國防部公告關於中共軍機進入我國空域的紀錄
- 資料來源 = https://www.mnd.gov.tw/PublishTable.aspx?Types=即時軍事動態&title=國防消息
- 資料在 `data/reports.jsonl` 1 行 1 則公告
- scraper 在 `scraper.js`

## 安裝 Installation
- `npm i`

## 執行 Execute
- 到[即時軍事動態](https://www.mnd.gov.tw/PublishTable.aspx?Types=即時軍事動態&title=國防消息)
- 點選最新公告
- 網址格式應為 `/Publish.aspx?p={p}&title=國防消息&SelectStyle=即時軍事動態`
- 紀錄 query 參數 `p`
- 執行 `npm start {p}`
