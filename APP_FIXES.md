// App.tsx修正パッチ
// 以下の変更をApp.tsxに適用してください：

// 1. handleAutoStructuredAdviceを修正（181行目付近）
const handleAutoStructuredAdvice = (advice: { todo?: string[]; summary?: string; raw?: string }) => {
  // string[]をTodoItem[]に変換
  const structuredAdvice: StructuredAdvice = {
    ...advice,
    todo: advice.todo ? advice.todo.map(text => ({ text, checked: false })) : undefined
  };
  setStructuredAdvice(structuredAdvice);
};

// 2. AdvicePanelにsuggestionsを渡す（404行目付近）
<AdvicePanel
  advice={currentAdvice}
  isMonitoring={isMonitoring}
  onClear={clearAdvice}
  onToggleMonitoring={toggleMonitoring}
  suggestions={suggestions} // この行を追加
/>

// 3. useScreenMonitorからsuggestionsを取得（191行目付近）
const {
  isMonitoring,
  currentAdvice,
  clearAdvice,
  generateStructuredAdvice,
  screenHistory,
  suggestions, // この行を追加
} = useScreenMonitor({
  ...monitorConfig,
  geminiApiKey,
  onStructuredAdvice: handleAutoStructuredAdvice,
});

// 4. HeaderにonMemoryClickを追加（349行目付近）
<Header 
  onSettingsClick={() => setShowSettings(!showSettings)}
  isMonitoring={isMonitoring}
  onToggleMonitoring={toggleMonitoring}
  onMemoryClick={() => setShowMemoryPanel(!showMemoryPanel)} // この行を追加
/>

// 5. MemoryPanelをJSXに追加（562行目付近、Toasterの前）
{/* メモリパネル */}
<MemoryPanel 
  isVisible={showMemoryPanel}
  onClose={() => setShowMemoryPanel(false)}
/>

// 6. generateStructuredAdviceのresult処理を修正（336行目付近）
const result = await generateStructuredAdvice(last.screenshot, last.context, screenHistory);
// string[]をTodoItem[]に変換
const structuredResult: StructuredAdvice = {
  ...result,
  todo: result.todo ? result.todo.map(text => ({ text, checked: false })) : undefined
};
setStructuredAdvice(structuredResult);

このファイルに記載された修正はすべて反映済みです。