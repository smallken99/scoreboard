const { useState, useEffect, useCallback, useRef } = React;

const STORAGE_KEY = 'family_scoreboard_react_v1';

const DEFAULT_STATE = {
  isConfigured: false,
  activeTab: 'user1',
  user1: {
    id: 'user1',
    name: '',
    score: 0,
    history: []
  },
  user2: {
    id: 'user2',
    name: '',
    score: 0,
    history: []
  }
};

function App() {
  // 載入初始資料
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          user1: { ...DEFAULT_STATE.user1, ...(parsed.user1 || {}) },
          user2: { ...DEFAULT_STATE.user2, ...(parsed.user2 || {}) }
        };
      }
    } catch (e) {
      console.error('讀取 localStorage 失敗:', e);
    }
    return DEFAULT_STATE;
  });

  // 管理介面 Modal 開關
  const [showManageModal, setShowManageModal] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return true;
    try {
      const parsed = JSON.parse(saved);
      return !parsed.isConfigured || (!parsed.user1?.name && !parsed.user2?.name);
    } catch (e) {
      return true;
    }
  });

  // 管理介面表單暫存
  const [editNames, setEditNames] = useState({
    name1: data.user1.name || '',
    name2: data.user2.name || ''
  });

  // 手動輸入分數暫存
  const [manualInputVal, setManualInputVal] = useState('');

  // 動態飄字動畫佇列
  const [floatingParticles, setFloatingParticles] = useState([]);

  // 看板動畫類型：'add' | 'sub' | null
  const [boardAnimType, setBoardAnimType] = useState(null);

  // 當 data 變動時同步存入 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('儲存至 localStorage 失敗:', e);
    }
  }, [data]);

  // 目前選中的使用者
  const currentKey = data.activeTab === 'user2' ? 'user2' : 'user1';
  const currentUser = data[currentKey];

  // 格式化時間
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hr = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}/${day} ${hr}:${min}`;
  };

  // 觸發主題動效 (震動、看板形變與光暈、浮動粒子)
  const triggerThemeAnimation = (delta) => {
    const isAdd = delta > 0;

    // 1. 手機觸覺反饋 (Haptic Feedback)
    if (navigator.vibrate) {
      try {
        if (isAdd) {
          navigator.vibrate(40); // 輕快短震
        } else {
          navigator.vibrate([30, 40, 50]); // 警示雙震
        }
      } catch (err) {}
    }

    // 2. 看板動畫 (果凍跳動 / 警示抖動)
    setBoardAnimType(isAdd ? 'add' : 'sub');
    setTimeout(() => {
      setBoardAnimType(null);
    }, 500);

    // 3. 浮動飄字粒子
    const particleId = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    const newParticle = {
      id: particleId,
      delta: delta,
      isAdd: isAdd,
      userKey: currentKey
    };

    setFloatingParticles(prev => [...prev, newParticle]);

    // 850ms 動畫結束後移除
    setTimeout(() => {
      setFloatingParticles(prev => prev.filter(p => p.id !== particleId));
    }, 850);
  };

  // 加減分核心函式
  const adjustScore = useCallback((delta) => {
    if (!delta || isNaN(delta)) return;

    setData(prev => {
      const activeUser = prev[currentKey];
      const prevScore = activeUser.score;
      const newScore = prevScore + delta;

      const logEntry = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        delta: delta,
        prevScore: prevScore,
        currentScore: newScore
      };

      return {
        ...prev,
        [currentKey]: {
          ...activeUser,
          score: newScore,
          history: [logEntry, ...(activeUser.history || [])]
        }
      };
    });

    triggerThemeAnimation(delta);
  }, [currentKey]);

  // 手動加分
  const handleManualAdd = () => {
    const val = parseInt(manualInputVal, 10);
    if (isNaN(val) || val <= 0) {
      alert('請輸入大於 0 的正整數！');
      return;
    }
    adjustScore(val);
    setManualInputVal('');
  };

  // 手動減分
  const handleManualSub = () => {
    const val = parseInt(manualInputVal, 10);
    if (isNaN(val) || val <= 0) {
      alert('請輸入大於 0 的正整數！');
      return;
    }
    adjustScore(-val);
    setManualInputVal('');
  };

  // 撤銷上一筆 (Undo)
  const handleUndo = () => {
    if (!currentUser.history || currentUser.history.length === 0) {
      alert('目前沒有可撤銷的紀錄！');
      return;
    }

    const lastEntry = currentUser.history[0];
    const confirmUndo = confirm(`確定要撤銷最近這筆 ${lastEntry.delta > 0 ? '+' : ''}${lastEntry.delta} 分的更動嗎？\n分數將回調至 ${lastEntry.prevScore} 分。`);
    if (!confirmUndo) return;

    setData(prev => {
      const activeUser = prev[currentKey];
      const [, ...restHistory] = activeUser.history;
      return {
        ...prev,
        [currentKey]: {
          ...activeUser,
          score: lastEntry.prevScore,
          history: restHistory
        }
      };
    });

    triggerThemeAnimation(-lastEntry.delta);
  };

  // 刪除特定一筆歷史並回退該筆分數
  const handleDeleteLog = (logId) => {
    const target = currentUser.history.find(h => h.id === logId);
    if (!target) return;

    const confirmDel = confirm(`確定要刪除這筆紀錄（${target.delta > 0 ? '+' : ''}${target.delta} 分）嗎？\n分數將會自動相應扣除/補回。`);
    if (!confirmDel) return;

    setData(prev => {
      const activeUser = prev[currentKey];
      return {
        ...prev,
        [currentKey]: {
          ...activeUser,
          score: activeUser.score - target.delta,
          history: activeUser.history.filter(h => h.id !== logId)
        }
      };
    });

    triggerThemeAnimation(-target.delta);
  };

  // 清空歷史紀錄
  const handleClearHistory = () => {
    if (!currentUser.history || currentUser.history.length === 0) return;
    if (confirm(`確定要清空【${currentUser.name || '此分頁'}】的所有歷史紀錄嗎？（目前總分將保留）`)) {
      setData(prev => ({
        ...prev,
        [currentKey]: {
          ...prev[currentKey],
          history: []
        }
      }));
    }
  };

  // 儲存管理設定
  const handleSaveNames = (e) => {
    if (e) e.preventDefault();
    const n1 = editNames.name1.trim();
    const n2 = editNames.name2.trim();

    if (!n1 || !n2) {
      alert('請填寫兩位小朋友的姓名！');
      return;
    }

    setData(prev => ({
      ...prev,
      isConfigured: true,
      user1: { ...prev.user1, name: n1 },
      user2: { ...prev.user2, name: n2 }
    }));
    setShowManageModal(false);
  };

  // 重設分數
  const handleResetScore = (key) => {
    const targetName = data[key].name || (key === 'user1' ? '小朋友 1' : '小朋友 2');
    if (confirm(`確定要將【${targetName}】的分數重設歸零嗎？`)) {
      setData(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          score: 0,
          history: [
            {
              id: 'log_' + Date.now(),
              timestamp: new Date().toISOString(),
              delta: 0,
              prevScore: prev[key].score,
              currentScore: 0
            },
            ...(prev[key].history || [])
          ]
        }
      }));
    }
  };

  // 匯出 JSON 備份檔
  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    a.href = url;
    a.download = `scoreboard_backup_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 匯入 JSON 備份檔
  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.user1 && parsed.user2) {
          if (confirm('確定要載入此備份資料嗎？目前的計分資料將會被取代！')) {
            setData(parsed);
            alert('🎉 備份資料還原成功！');
            setShowManageModal(false);
          }
        } else {
          alert('❌ 檔案格式不符合計分板備份格式！');
        }
      } catch (err) {
        alert('❌ 解析備份檔案失敗，請確認檔案格式是否正確。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 全部重設
  const handleResetAll = () => {
    if (confirm('⚠️ 警告：確定要清空所有資料並重新設定嗎？（將回到初始姓名設定）')) {
      localStorage.removeItem(STORAGE_KEY);
      setData(DEFAULT_STATE);
      setEditNames({ name1: '', name2: '' });
      setShowManageModal(true);
    }
  };

  const openManageModal = () => {
    setEditNames({
      name1: data.user1.name || '',
      name2: data.user2.name || ''
    });
    setShowManageModal(true);
  };

  const displayName1 = data.user1.name || '小朋友 1';
  const displayName2 = data.user2.name || '小朋友 2';
  const activeDisplayName = currentUser.name || (currentKey === 'user1' ? '小朋友 1' : '小朋友 2');

  // 動態主題視覺樣式
  const isUser1 = data.activeTab === 'user1';

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col px-3 sm:px-4 py-4 pb-12 relative overflow-hidden">
      {/* 頂部 Header */}
      <header className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <span className="text-2xl drop-shadow-xs">🏆</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">榮譽計分板</h1>
            <p className="text-xs text-slate-500">純粹計分 ‧ 個人專屬動效回饋</p>
          </div>
        </div>
        <button
          onClick={openManageModal}
          className="p-2 rounded-xl text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition active:scale-95 flex items-center space-x-1"
          title="管理姓名與設定"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs font-semibold pr-1">管理</span>
        </button>
      </header>

      {/* 2 個 TAB (分開計分) */}
      <nav className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200/90 rounded-2xl mb-4">
        {/* Tab 1 (藍色主題) */}
        <button
          onClick={() => setData(prev => ({ ...prev, activeTab: 'user1' }))}
          className={`flex items-center justify-center space-x-2 py-3 px-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 ${
            isUser1
              ? 'bg-white text-blue-600 shadow-md scale-[1.02]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <span className="truncate max-w-[90px]">{displayName1}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
            isUser1 ? 'bg-blue-100 text-blue-700' : 'bg-slate-300 text-slate-700'
          }`}>
            {data.user1.score}
          </span>
        </button>

        {/* Tab 2 (紫粉色主題) */}
        <button
          onClick={() => setData(prev => ({ ...prev, activeTab: 'user2' }))}
          className={`flex items-center justify-center space-x-2 py-3 px-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 ${
            !isUser1
              ? 'bg-white text-rose-600 shadow-md scale-[1.02]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <span className="truncate max-w-[90px]">{displayName2}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
            !isUser1 ? 'bg-rose-100 text-rose-700' : 'bg-slate-300 text-slate-700'
          }`}>
            {data.user2.score}
          </span>
        </button>
      </nav>

      {/* 核心大分數看板 (動態光暈、果凍彈跳、粒子發射源) */}
      <section
        className={`rounded-3xl p-6 text-white shadow-xl transition-all duration-300 mb-4 relative overflow-visible ${
          isUser1
            ? 'bg-gradient-to-br from-blue-500 via-sky-600 to-indigo-700 shadow-sky-500/25'
            : 'bg-gradient-to-br from-pink-500 via-rose-600 to-purple-700 shadow-rose-500/25'
        } ${boardAnimType === 'add' ? 'aura-pulse' : ''}`}
      >
        {/* 背景裝飾光斑 */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none blur-sm"></div>
        <div className="absolute -left-6 -top-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none blur-sm"></div>

        {/* 浮動飄字粒子容器 */}
        <div className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-center z-30">
          {floatingParticles.map(p => {
            const isBlue = p.userKey === 'user1';
            const badgeBg = p.isAdd
              ? (isBlue ? 'bg-cyan-400 text-cyan-950 border-cyan-200 shadow-cyan-400/50' : 'bg-pink-400 text-pink-950 border-pink-200 shadow-pink-400/50')
              : (isBlue ? 'bg-amber-400 text-amber-950 border-amber-200 shadow-amber-400/50' : 'bg-purple-300 text-purple-950 border-purple-200 shadow-purple-400/50');
            
            return (
              <div
                key={p.id}
                className={`absolute left-1/2 top-1/2 font-black text-2xl sm:text-3xl px-4 py-1.5 rounded-2xl border-2 shadow-xl ${badgeBg} ${p.isAdd ? 'float-add' : 'float-sub'}`}
              >
                {p.delta > 0 ? `+${p.delta}` : p.delta}
                <span className="text-sm ml-1">{p.isAdd ? '✨' : '⚠️'}</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center relative z-10">
          <span className="text-white/90 text-xs font-semibold tracking-wider mb-1 uppercase">
            {activeDisplayName} 目前榮譽積分
          </span>

          {/* 巨大分數 (支援 Jelly Bounce 與 Shake Down) */}
          <div
            className={`text-6xl sm:text-7xl font-black my-1 tracking-tight drop-shadow-md select-none transition-transform ${
              boardAnimType === 'add' ? 'anim-jelly' : boardAnimType === 'sub' ? 'anim-shake' : ''
            }`}
          >
            {currentUser.score}
          </div>

          {/* 撤銷操作 */}
          <div className="mt-3 pt-2.5 border-t border-white/20 w-full flex justify-center">
            <button
              onClick={handleUndo}
              disabled={!currentUser.history || currentUser.history.length === 0}
              className={`py-1.5 px-4 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                currentUser.history && currentUser.history.length > 0
                  ? 'bg-white/20 hover:bg-white/30 text-white active:scale-95 shadow-xs'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              <span>↩️ 撤銷上一筆操作</span>
            </button>
          </div>
        </div>
      </section>

      {/* 罐頭分數快捷鍵 (符合個人主題色系之加減分按鈕) */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-4">
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
          罐頭快捷分數
        </h2>

        {/* 加分排 (符合個人加分主題色) */}
        <div className="grid grid-cols-3 gap-2 mb-2.5">
          {[1, 5, 10].map(val => (
            <button
              key={'add_' + val}
              onClick={() => adjustScore(val)}
              className={`py-3 px-2 rounded-xl font-black text-lg flex items-center justify-center active:scale-90 transition-transform duration-100 shadow-sm border ${
                isUser1
                  ? 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-700 active:bg-sky-200'
                  : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-700 active:bg-rose-200'
              }`}
            >
              +{val}
            </button>
          ))}
        </div>

        {/* 減分排 (符合個人減分警示色) */}
        <div className="grid grid-cols-3 gap-2">
          {[-1, -5, -10].map(val => (
            <button
              key={'sub_' + val}
              onClick={() => adjustScore(val)}
              className={`py-3 px-2 rounded-xl font-black text-lg flex items-center justify-center active:scale-90 transition-transform duration-100 shadow-sm border ${
                isUser1
                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800 active:bg-amber-200'
                  : 'bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-800 active:bg-purple-200'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </section>

      {/* 手動輸入分數 */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-4">
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
          手動自訂分數
        </h2>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            min="1"
            max="999"
            value={manualInputVal}
            onChange={(e) => setManualInputVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleManualAdd(); }}
            placeholder="自訂數字"
            className="w-full px-3 py-2.5 text-center font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          />
          <button
            onClick={handleManualAdd}
            className={`px-4 py-2.5 rounded-xl text-white font-black text-sm whitespace-nowrap active:scale-95 transition shadow-sm ${
              isUser1
                ? 'bg-sky-600 hover:bg-sky-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            ➕ 加分
          </button>
          <button
            onClick={handleManualSub}
            className={`px-4 py-2.5 rounded-xl text-white font-black text-sm whitespace-nowrap active:scale-95 transition shadow-sm ${
              isUser1
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            ➖ 減分
          </button>
        </div>
      </section>

      {/* 簡潔變動紀錄 (純數值流水帳) */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex-1">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-1.5">
            <h2 className="font-bold text-slate-800 text-sm">異動明細</h2>
            <span className="text-xs text-slate-400">({currentUser.history?.length || 0})</span>
          </div>
          {currentUser.history && currentUser.history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs text-slate-400 hover:text-rose-600 transition"
            >
              清空紀錄
            </button>
          )}
        </div>

        {currentUser.history && currentUser.history.length > 0 ? (
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {currentUser.history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex items-center space-x-2 text-slate-500">
                  <span className="text-slate-400">{formatTime(entry.timestamp)}</span>
                  <span>•</span>
                  <span>{entry.prevScore} ➔ {entry.currentScore}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`font-black px-2 py-0.5 rounded ${
                    entry.delta > 0
                      ? (isUser1 ? 'text-sky-800 bg-sky-100' : 'text-rose-800 bg-rose-100')
                      : entry.delta < 0
                      ? (isUser1 ? 'text-amber-800 bg-amber-100' : 'text-purple-800 bg-purple-100')
                      : 'text-slate-600 bg-slate-200'
                  }`}>
                    {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                  </span>
                  <button
                    onClick={() => handleDeleteLog(entry.id)}
                    className="text-slate-300 hover:text-rose-500 p-0.5 transition"
                    title="刪除此筆"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            尚無計分紀錄
          </div>
        )}
      </section>

      {/* 管理介面 Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-800 text-base">計分板管理與設定</h3>
              {data.isConfigured && (
                <button
                  onClick={() => setShowManageModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  ×
                </button>
              )}
            </div>

            <form onSubmit={handleSaveNames} className="space-y-3">
              <p className="text-xs text-slate-500">
                請輸入 2 位小朋友的姓名，系統將建立各自專屬的 Tab 分開計分：
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  第 1 位小朋友姓名 (陽光藍主題)：
                </label>
                <input
                  type="text"
                  required
                  value={editNames.name1}
                  onChange={(e) => setEditNames(prev => ({ ...prev, name1: e.target.value }))}
                  placeholder="例如：黃辰軒"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  第 2 位小朋友姓名 (紫粉主題)：
                </label>
                <input
                  type="text"
                  required
                  value={editNames.name2}
                  onChange={(e) => setEditNames(prev => ({ ...prev, name2: e.target.value }))}
                  placeholder="例如：黃巧蔓"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white text-sm transition shadow-sm"
              >
                儲存姓名設定
              </button>
            </form>

            {data.isConfigured && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleResetScore('user1')}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    重設【{displayName1}】為 0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetScore('user2')}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    重設【{displayName2}】為 0
                  </button>
                </div>

                <div className="flex space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1"
                  >
                    <span>💾 匯出備份</span>
                  </button>
                  <label className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1 cursor-pointer">
                    <span>📂 匯入還原</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleResetAll}
                  className="w-full py-1.5 text-rose-600 hover:text-rose-700 text-xs font-semibold pt-1"
                >
                  全部清除並重新設定
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 掛載 React
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
