# 575 SNS - ローカル実行ガイド

このプロジェクトはDocker Composeで動作します。

## 前提条件

- Docker Desktop がインストールされていること

## セットアップと実行

### 1. Docker Compose で起動

```bash
docker-compose up --build
```

### 2. サービスへアクセス

- **フロントエンド**: http://localhost:3000
- **バックエンド API**: http://localhost:3001

## 動作確認

### テストユーザーで試す

1. http://localhost:3000 にアクセス
2. 「ログイン」ボタンをクリック → 「新規登録はこちら」で新規登録
3. ユーザー名、メール、パスワードを入力して登録
4. 登録後、「新しく詠む」から投稿を作成

### 575バリデーションテスト

575判定は「本文」ではなく「ふりがな」欄に対して行われます（本文は漢字を含んでよいため、そのままでは正確な音数を数えられないためです）。ふりがなはひらがな・カタカナのみでスペース区切りの「5・7・5」形式で入力してください。

なお、「字余り」「字足らず」は伝統的な俳句の技法として認められているため、各行の音数は目安の5・7・5から**±1音までのズレは許容**されます（例: 4音・7音・5音や、5音・8音・5音でも投稿可能）。

**成功例（ぴったり5・7・5）:**
```
本文　：古池や　かわず飛び込む　水の音
ふりがな：ふるいけや　かわずとびこむ　みずのおと
```

**成功例（字足らず、±1音の許容範囲内）:**
```
ふりがな：ふるいけ　かわずとびこむ　みずのおと
```
（1行目が4音＝目安の5音から-1）

**失敗例（許容範囲を超える字足らず）:**
```
ふりがな：ふるい　かわずとびこむ　みずのおと
```
（1行目が3音＝目安の5音から-2でエラーになる）

## API エンドポイント一覧

### 認証
- POST `/api/users/register` - ユーザー登録
- POST `/api/users/login` - ログイン
- GET `/api/users/:id` - ユーザー情報取得
- PUT `/api/users/:id` - プロフィール更新（認証必須）

### フォロー
- POST `/api/users/:id/follow` - フォロー（認証必須）
- DELETE `/api/users/:id/follow` - フォロー解除（認証必須）

### 投稿
- POST `/api/posts` - 投稿作成（認証必須）
- GET `/api/timeline?type=recommended|following|latest` - タイムライン取得（おすすめ/フォロー中/最新。フォロー中は認証必須）
- GET `/api/posts/:id` - 投稿詳細取得

### インタラクション
- POST `/api/posts/:postId/like` - 座布団（いいね、認証必須）
- DELETE `/api/posts/:postId/like` - 座布団削除（認証必須）
- POST `/api/posts/:postId/repost` - 唱和（リポスト、認証必須）
- DELETE `/api/posts/:postId/repost` - 唱和解除（認証必須）
- POST `/api/posts/:postId/comments` - 返し（コメント）作成（認証必須, 575形式）
- GET `/api/posts/:postId/comments` - 返し一覧取得

## トラブルシューティング

### ポート3000や3001が既に使われている場合

docker-compose.yml の `ports` を編集してください。

### `SQLITE_ERROR: table posts(またはcomments) has no column named furigana` が出る場合

`CREATE TABLE IF NOT EXISTS`はテーブルが既に存在すると何もしないため、本来は古いスキーマの`backend/haiku.db`が残っているとカラム不足エラーになります。現在は起動時（`initializeDatabase()`）に不足カラムを自動検出して`ALTER TABLE`で追加するマイグレーション処理が入っているため、`docker-compose up --build`で再起動するだけで自動的に解消します。

それでも解消しない場合（自動マイグレーション自体が失敗する場合）は、DBファイルを削除して作り直してください。**コンテナを停止してから**削除するのがポイントです（起動中はファイルが掴まれて削除できない/反映されないことがあります）。

PowerShellの場合:
```powershell
docker-compose down
Remove-Item backend\haiku.db -Force
docker-compose up --build
```

bash/macOS/Linuxの場合:
```bash
docker-compose down
rm -f backend/haiku.db
docker-compose up --build
```

## 技術スタック

- **フロントエンド**: Next.js 14 + React 18
- **バックエンド**: Node.js + Express + TypeScript
- **データベース**: SQLite
- **認証**: JWT (jsonwebtoken)
- **パスワードハッシング**: bcryptjs

## ローカル開発（Docker なし）

Node.js 20+ がインストール済みの場合：

```bash
# バックエンド
cd backend
npm install
npm run dev

# 別ターミナルでフロントエンド
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev
```
