# OurHome Finance

複数人で家計を管理するためのWebアプリケーション。グループで家計を共有し、取引記録、予算管理、割り勘計算、決済機能などを提供します。

## 主な機能

- 📝 **取引記録**: 支出・収入の記録と管理
- 💰 **割り勘・立替**: 誰が支払ったか、誰が負担するかを記録
- 📊 **予算管理**: カテゴリ別の予算設定と進捗管理
- 💳 **決済機能**: グループ内の貸し借りを自動計算
- 📈 **レポート**: 支出の可視化と分析
- 📅 **カレンダー**: 日別の取引一覧
- 🎯 **目標設定**: 貯蓄目標の設定と追跡
- 👥 **グループ管理**: 複数人での家計共有

## 技術スタック

### フロントエンド
- **React 19.x** + **TypeScript**
- **React Router DOM 7.x** - ルーティング
- **Vite** - ビルドツール
- **Tailwind CSS** - スタイリング
- **Recharts** - グラフ表示
- **Framer Motion** - アニメーション
- **react-i18next** - 国際化対応（日本語・英語）

### 状態管理
- **Zustand** - クライアント状態管理
- **TanStack Query (React Query)** - サーバー状態管理とキャッシング

### バックエンド
- **Supabase**
  - PostgreSQL - データベース
  - Supabase Auth - 認証（メール/パスワード、OAuth）
  - Realtime - リアルタイム同期
  - Row Level Security (RLS) - 権限管理

## セットアップ

### 前提条件

- Node.js (推奨: 18.x以上)
- Supabaseアカウント

### インストール

1. リポジトリをクローン
```bash
git clone <repository-url>
cd ourhome-finance
```

2. 依存関係をインストール
```bash
npm install
```

3. 環境変数を設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Supabaseのセットアップ

詳細なセットアップ手順は [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) を参照してください。

主な手順：
- Supabaseプロジェクトの作成
- データベーススキーマの適用 (`docs/supabase/schema.sql`)
- RLSポリシーの設定 (`docs/supabase/rls-policies.sql`)
- 関数の作成 (`docs/supabase/functions.sql`)

5. 開発サーバーを起動
```bash
npm run dev
```

6. ブラウザで `http://localhost:5173` を開く

## ビルド

本番用ビルドを作成：

```bash
npm run build
```

ビルド結果は `dist/` ディレクトリに出力されます。

プレビュー：

```bash
npm run preview
```

## プロジェクト構造

```
ourhome-finance/
├── src/
│   ├── components/       # 共通UIコンポーネント
│   │   ├── ui/          # 基本UIコンポーネント
│   │   ├── accessibility/ # アクセシビリティコンポーネント
│   │   ├── budget/      # 予算関連コンポーネント
│   │   ├── history/     # 履歴関連コンポーネント
│   │   └── transaction/ # 取引関連コンポーネント
│   ├── screens/         # 画面コンポーネント
│   │   ├── auth/        # 認証画面
│   │   └── onboarding/  # オンボーディング画面
│   ├── hooks/           # カスタムフック
│   ├── lib/             # ユーティリティ・設定
│   ├── services/        # API呼び出しサービス
│   ├── stores/          # Zustandストア
│   └── types/           # 型定義
├── screens/             # メイン画面（レガシー）
├── components/          # 共通コンポーネント（レガシー）
├── docs/                # ドキュメント
│   ├── architecture/    # アーキテクチャ設計
│   └── supabase/        # Supabase関連
└── public/              # 静的ファイル
```

## ドキュメント

- [アーキテクチャ概要](./docs/architecture/00-overview.md)
- [Supabaseセットアップガイド](./docs/SUPABASE_SETUP.md)
- [データスキーマ設計](./docs/architecture/01-data-schema.md)
- [状態管理設計](./docs/architecture/02-state-management.md)
- [API設計](./docs/architecture/03-api-design.md)
- [認証設計](./docs/architecture/04-auth-design.md)

## 開発

### コードスタイル

- ESLint と Prettier を使用
- TypeScript の型安全性を重視

### 主要な設計原則

- **DRY原則**: コードの重複を避ける
- **SOLID原則**: 責任の分離と拡張性を重視
- **アクセシビリティ**: キーボード操作とスクリーンリーダー対応
- **国際化**: 日本語・英語対応

## ライセンス

このプロジェクトのライセンス情報については、リポジトリのLICENSEファイルを参照してください。

## 貢献

プルリクエストやイシューの報告を歓迎します。大きな変更を提案する場合は、まずイシューを作成して変更内容を議論してください。
