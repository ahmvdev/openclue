# OpenClue Kai (改良版)

This is an enhanced open-source version of the app Cluely, with continuous screen monitoring and contextual advice features.

## 🆕 New Features

### 継続的画面監視
- **リアルタイム監視**: 画面の変化を自動的に検知
- **文脈に沿ったアドバイス**: 画面の変化に基づいて自動的にアドバイスを生成
- **カスタマイズ可能な設定**: 監視間隔と変化検知の感度を調整可能

### スマートアドバイス
- **生産性向上**: 作業効率を改善するための提案
- **注意喚起**: 重要な変化や見逃しやすい点を指摘
- **次のアクション**: 取るべき行動を具体的に提案

## Features/Usage

### 基本機能
- Ask whats on the screen and it will tell you and provide more information
- The app takes a screenshot and sends the photo to the LLM requiring minimal effort

### 新機能
- **画面監視**: 設定ボタン（⚙️）から監視を有効にできます
- **リアルタイムアドバイス**: 画面が変化すると自動的にアドバイスが表示されます
- **監視設定**: 監視間隔（1-30秒）と変化検知感度を調整可能


## Shortcuts

- **Maximize or minimize:** CTRL + SHIFT + K 
- **Close the app completely:** CTRL + SHIFT + D
- **Toggle monitoring:** Click the eye icon (👁️) in the header
- **Open settings:** Click the settings icon (⚙️) in the header

## Screenshots of usecases:
![1](https://github.com/user-attachments/assets/c8b1b296-e932-4d90-a3eb-f464d960be6f)
![2](https://github.com/user-attachments/assets/5f7f3f19-b6cb-4dd4-bb35-433f8b3fae0d)


## Installation

1. **Run it locally**

```bash
npm install
```
2. **Create a `.env` file in the root directory and paste your API KEY:**

```bash
VITE_GEMINI_API_KEY=EXAMPLE_KEY_HERE
```

3. **Start development server**:

```bash
npm run electron:dev
```



### Build app

1. **Build the app**
```bash
npm run dist
```

2. Open it in `dist/win-unpacked`

There you go!

---

### Platform Support:
I have only tested this on windows so far.

Feedback appreciated. Thanks!


