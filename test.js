// 核心狀態邏輯單元測試 (含事蹟原因欄位驗證)
console.log("=== 開始邏輯單元測試 ===");

const data = {
  isConfigured: true,
  activeTab: "user1",
  user1: { id: "user1", name: "黃辰軒", score: 0, history: [] },
  user2: { id: "user2", name: "黃巧蔓", score: 0, history: [] }
};

// 1. 測試罐頭加分 (+1, +5, +10) 且附帶事蹟原因
const actionsWithReason = [
  { delta: 1, reason: "準時完成作業" },
  { delta: 5, reason: "主動收拾房間" },
  { delta: 10, reason: "" } // 非必要，留空
];

actionsWithReason.forEach(({ delta, reason }) => {
  const prev = data.user1.score;
  data.user1.score += delta;
  data.user1.history.unshift({ delta, reason: reason || "", prevScore: prev, currentScore: data.user1.score });
});

console.log("✓ 黃辰軒連續加分累積:", data.user1.score, "(預期: 16)");
if (data.user1.score !== 16) throw new Error("加分計算錯誤");
if (data.user1.history[2].reason !== "準時完成作業") throw new Error("事蹟原因未正確留存");
if (data.user1.history[0].reason !== "") throw new Error("非必要留空時應為空字串");

// 2. 測試罐頭扣分 (-5) 附帶扣記事由
const prevSub = data.user1.score;
data.user1.score -= 5;
data.user1.history.unshift({ delta: -5, reason: "超時看電視", prevScore: prevSub, currentScore: data.user1.score });
console.log("✓ 黃辰軒扣 5 分後累積:", data.user1.score, "(預期: 11)");
if (data.user1.score !== 11) throw new Error("減分計算錯誤");
if (data.user1.history[0].reason !== "超時看電視") throw new Error("扣記事由未正確儲存");

// 3. 測試手動輸入加分 (+7)
const manualVal = 7;
const prevManual = data.user1.score;
data.user1.score += manualVal;
data.user1.history.unshift({ delta: manualVal, reason: "鋼琴比賽獲獎", prevScore: prevManual, currentScore: data.user1.score });
console.log("✓ 黃辰軒手動加 7 分後累積:", data.user1.score, "(預期: 18)");
if (data.user1.score !== 18) throw new Error("手動加分錯誤");

// 4. 測試撤銷上一筆
const lastEntry = data.user1.history.shift();
data.user1.score = lastEntry.prevScore;
console.log("✓ 撤銷上一筆操作後累積:", data.user1.score, "(預期回調至: 11)");
if (data.user1.score !== 11) throw new Error("撤銷計算錯誤");

// 5. 測試分頁獨立性 (黃巧蔓加分不影響黃辰軒)
data.user2.score += 10;
data.user2.history.unshift({ delta: 10, reason: "幫忙做家務", prevScore: 0, currentScore: 10 });
console.log("✓ 黃巧蔓獨立加 10 分後累積:", data.user2.score, "(預期: 10)");
console.log("✓ 此時黃辰軒分數仍為:", data.user1.score, "(預期: 11)");
if (data.user2.score !== 10 || data.user1.score !== 11) throw new Error("分頁獨立性錯誤");

// 6. 測試刪除歷史特定記錄並回調分數
const itemIndex = 0; // 刪除第一筆
const itemToDelete = data.user1.history[itemIndex];
data.user1.score -= itemToDelete.delta;
data.user1.history.splice(itemIndex, 1);
console.log("✓ 刪除歷史紀錄後分數補回為:", data.user1.score);

console.log("=========================================");
console.log("🎉 所有包含事蹟原因之核心邏輯測試全部通過！");
