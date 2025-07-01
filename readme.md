# OpenClue Kai - 次世代AI画面アシスタント

## 概要
Cluelyの思想を継承しつつ、AIがPC画面・操作履歴・音声（今後対応）をリアルタイム解析し、文脈を深く理解して自発的に業務や学習をサポートする"Cluely超え"のオープンソースAIアシスタント。

## 主な特徴・機能
- **Gemini 2.5系API対応**：画像・テキスト・履歴・構造化出力（TODOリスト/要点）に対応。モデル自動切替・function calling設計も視野。
- **リアルタイム画面監視**：自動スクリーンショット・画像差分検知・アクティブウィンドウ履歴も統合。
- **文脈理解＆自発アドバイス**：直近の画面・操作履歴・文脈をAIが解析し、最適なアドバイスやTODOを自動生成。
- **構造化アドバイス**：TODOリスト・要点（summary）をJSONで生成、UIでチェック・履歴保存・再表示・永続化。
- **美しいUI/UX**：モダンなデザイン、アニメーション、トースト通知、システム情報（メモリ・バッテリー・監視状態）表示。
- **柔軟な設定**：監視間隔・感度・APIキー・履歴件数などをUIから調整。
- **ショートカットキー**：Mac/Win両対応。画面監視・スクショ・アドバイス取得・ウィンドウ移動・終了など。
- **プライバシー配慮**：画像差分はローカル処理、API送信は最小限。

## 画面イメージ
（スクリーンショットやGIFをここに追加推奨）

## ユースケース例
- 会議・面接・学習・作業支援・生産性分析・休憩提案など

## 今後の拡張性
- 音声解析・複数画面・クラウド同期・カレンダー/タスク連携・function calling自動化・多言語対応など

## インストール・セットアップ
1. Node.js 18以上を用意
2. リポジトリをクローン
3. `npm install` で依存関係導入
4. `.env`にGemini API Keyを設定（[取得はこちら](https://makersuite.google.com/app/apikey)）
5. `npm run electron:dev` で開発モード起動

## ビルド・配布
- Windows: `npm run dist:win`
- macOS: `npm run dist:mac`
- Linux: `npm run dist:linux`

## ショートカットキー一覧
| 機能 | Windows/Linux | Mac |
|------|---------------|-----|
| ウィンドウの表示/非表示 | Ctrl+B | ⌘+B |
| スクリーンショット | Ctrl+H | ⌘+H |
| 解決策を取得 | Ctrl+Enter | ⌘+Enter |
| 画面監視の切り替え | Ctrl+M | ⌘+M |
| ウィンドウ移動 | Ctrl+矢印 | ⌘+矢印 |
| アプリ終了 | Ctrl+Q | ⌘+Q |
| ... | ... | ... |

## 設定・カスタマイズ
- 監視間隔（1〜30秒）、変化感度（1〜50%）、API Key、履歴件数などをUIから調整
- TODOリストのチェック状態も自動保存・復元

## 技術スタック
- React + TypeScript + Vite + Electron + Tailwind CSS + Framer Motion
- Google Gemini API（2.5系Pro/Flash/Flash-Lite, マルチモーダル, JSON構造化出力）
- electron-storeによる永続化

## 開発・コントリビュート
- 詳細は[DEVELOPMENT.md](./DEVELOPMENT.md)参照
- プルリク歓迎！

## アイコン仕様
- Windows: icon.ico（マルチサイズ）
- macOS: icon.icns
- Linux: icon.png（512/256/128/64/32/16px）
- 推奨: シンプル・ブランドカラー・透明/単色背景

## ライセンス
MIT License（c）2025 Ahmad Saeed

---

**注意**: 本プロジェクトはCluelyのオープンソース思想を継承していますが、公式とは独立したものです。
