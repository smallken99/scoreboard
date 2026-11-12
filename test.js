// 核心狀態邏輯單元測試
console.log("=== 開始邏輯單元測試 ===");

const data = {
  isConfigured: true,
  activeTab: "user1",
  user1: { id: "user1", name: "黃辰軒", score: 0, history: [] },
  user2: { id: "user2", name: "黃巧蔓", score: 0, history: [] }
};

// 1. 測試罐頭加分 (+1, +5, +10)
[1, 5, 10].forEach(delta => {
  const prev = data.user1.score;
  data.user1.score += delta;
  data.user1.history.unshift({ delta, prevScore: prev, currentScore: data.user1.score });
});

console.log("✓ 黃辰軒連續加分 (+1, +5, +10) 累積:", data.user1.score, "(預期: 16)");
if (data.user1.score !== 16) throw new Error("加分計算錯誤");

// 2. 測試罐頭扣分 (-5)
const prevSub = data.user1.score;
data.user1.score -= 5;
data.user1.history.unshift({ delta: -5, prevScore: prevSub, currentScore: data.user1.score });
console.log("✓ 黃辰軒扣 5 分後累積:", data.user1.score, "(預期: 11)");
if (data.user1.score !== 11) throw new Error("減分計算錯誤");

// 3. 測試手動輸入加分 (+7)
const manualVal = 7;
const prevManual = data.user1.score;
data.user1.score += manualVal;
data.user1.history.unshift({ delta: manualVal, prevScore: prevManual, currentScore: data.user1.score });
console.log("✓ 黃辰軒手動加 7 分後累積:", data.user1.score, "(預期: 18)");
if (data.user1.score !== 18) throw new Error("手動加分錯誤");

// 4. 測試撤銷上一筆
const lastEntry = data.user1.history.shift();
data.user1.score = lastEntry.prevScore;
console.log("✓ 撤銷上一筆操作後累積:", data.user1.score, "(預期回調至: 11)");
if (data.user1.score !== 11) throw new Error("撤銷計算錯誤");

// 5. 測試分頁獨立性 (黃巧蔓加分不影響黃辰軒)
data.user2.score += 10;
console.log("✓ 黃巧蔓獨立加 10 分後累積:", data.user2.score, "(預期: 10)");
console.log("✓ 此時黃辰軒分數仍為:", data.user1.score, "(預期: 11)");
if (data.user2.score !== 10 || data.user1.score !== 11) throw new Error("分頁獨立性錯誤");

// 6. 測試刪除歷史特定記錄並回調分數
// 目前 user1 的 history 依序為: [-5], [+10], [+5], [+1], 刪除當中的 [-5]
const itemIndex = 0; // [-5]
const itemToDelete = data.user1.history[itemIndex];
data.user1.score -= itemToDelete.delta; // 11 - (-5) = 16
data.user1.history.splice(itemIndex, 1);
console.log("✓ 刪除扣 5 分的歷史紀錄後分數補回為:", data.user1.score, "(預期: 16)");
if (data.user1.score !== 16) throw new Error("刪除明細回調分數錯誤");

console.log("=========================================");
console.log("🎉 所有計分核心邏輯測試全部通過！");

