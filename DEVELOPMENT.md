# OpenClue Kai - 開発ガイド

## 🚀 クイックスタート

### 1. 依存関係のインストール
```bash
cd openclue-kai
npm install
```

### 2. 環境変数の設定
`.env.example` を `.env` にコピーして、Gemini API Keyを設定：
```bash
cp .env.example .env
# .envファイルを編集してAPI Keyを追加
```

### 3. 開発モードで起動
```bash
npm run electron:dev
```

## 📁 プロジェクト構造

```
openclue-kai/
├── src/                    # Reactアプリケーションのソース
│   ├── components/         # UIコンポーネント
│   ├── hooks/             # カスタムフック
│   └── utils/             # ユーティリティ関数
├── main/                   # Electronメインプロセス
│   ├── index.ts           # メインプロセスのエントリポイント
│   └── preload.ts         # プリロードスクリプト
├── assets/                 # 静的アセット
│   └── icons/             # アプリケーションアイコン
├── dist/                   # ビルドされたReactアプリ
├── app/                    # ビルドされたElectronアプリ
└── release/               # パッケージ化されたアプリ
```

## 🔧 主要な変更点

### 1. 統一されたショートカットキー
- Mac/Windows両対応のキーボードショートカット
- プラットフォーム検出による適切なキー表示
- グローバルショートカットの改善

### 2. 改善されたUI/UX
- モダンなデザインとアニメーション
- レスポンシブなレイアウト
- トースト通知システム
- システムトレイ対応

### 3. エラーハンドリング
- try-catchによる包括的なエラー処理
- ユーザーフレンドリーなエラーメッセージ
- フォールバック機能

### 4. パフォーマンス最適化
- 画像処理の最適化
- メモリ使用量の監視
- バッテリー状態の考慮

## 🐛 トラブルシューティング

### npm installでエラーが出る場合
```bash
# node_modulesを削除
rm -rf node_modules package-lock.json
# 再インストール
npm install
```

### ビルドエラーが出る場合
```bash
# キャッシュをクリア
npm run clean
# 再ビルド
npm run build
```

### 開発モードで起動しない場合
1. ポート5173が使用されていないか確認
2. .envファイルが正しく設定されているか確認
3. Electronのバージョンを確認

## 📦 ビルドとリリース

### Windows向けビルド
```bash
npm run dist:win
```

### macOS向けビルド
```bash
npm run dist:mac
```

### Linux向けビルド
```bash
npm run dist:linux
```

### 全プラットフォーム向けビルド
```bash
npm run dist
```

## 🔍 デバッグ

### 開発者ツールを開く
- 開発モード: F12キー
- 本番モード: Ctrl+Shift+I (Windows/Linux) / Cmd+Option+I (Mac)

### コンソールログの確認
```javascript
// メインプロセス
console.log('Main process log');

// レンダラープロセス
console.log('Renderer process log');
```

## 🎯 今後の開発タスク

### 優先度：高
- [ ] アイコンファイルの作成（.ico, .icns, .png）
- [ ] 自動アップデート機能の実装
- [ ] ユーザー設定のエクスポート/インポート

### 優先度：中
- [ ] 多言語対応
- [ ] テーマ切り替え機能
- [ ] ショートカットキーのカスタマイズ

### 優先度：低
- [ ] プラグインシステム
- [ ] クラウド同期
- [ ] 統計情報の表示

## 📚 参考資料

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Google Gemini API](https://ai.google.dev/)

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照してください。
