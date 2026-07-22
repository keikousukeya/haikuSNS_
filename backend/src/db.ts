import sqlite3 from "sqlite3";
import path from "path";

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, "..", "haiku.db");

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Connected to SQLite database at:", dbPath);
  }
});

// 指定テーブルに指定カラムが無ければ ALTER TABLE で追加する
// （CREATE TABLE IF NOT EXISTS は既存テーブルを更新しないため、
// 　古いスキーマのdbファイルが残っていてもカラム不足エラーにならないようにする）
function ensureColumn(table: string, column: string, definition: string, callback: (err: Error | null) => void) {
  db.all(`PRAGMA table_info(${table})`, [], (err, rows: any[]) => {
    if (err) return callback(err);

    const exists = rows.some((row) => row.name === column);
    if (exists) return callback(null);

    console.log(`Migrating: adding column "${column}" to "${table}"`);
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (alterErr) => {
      callback(alterErr || null);
    });
  });
}

export function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // ユーザーテーブル
      db.run(
        `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          bio TEXT,
          avatar_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
        (err) => {
          if (err) reject(err);
        }
      );

      // 投稿テーブル
      db.run(
        `
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          furigana TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `,
        (err) => {
          if (err) reject(err);
        }
      );

      // いいね（座布団）テーブル
      db.run(
        `
        CREATE TABLE IF NOT EXISTS likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          post_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, post_id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (post_id) REFERENCES posts(id)
        )
      `,
        (err) => {
          if (err) reject(err);
        }
      );

      // コメント（短冊）テーブル
      db.run(
        `
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          post_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          furigana TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (post_id) REFERENCES posts(id)
        )
      `,
        (err) => {
          if (err) reject(err);
        }
      );

      // フォロー関係テーブル
      db.run(
        `
        CREATE TABLE IF NOT EXISTS follows (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          follower_id INTEGER NOT NULL,
          following_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(follower_id, following_id),
          FOREIGN KEY (follower_id) REFERENCES users(id),
          FOREIGN KEY (following_id) REFERENCES users(id)
        )
      `,
        (err) => {
          if (err) reject(err);
        }
      );

      // 唱和（リポスト）テーブル
      db.run(
        `
        CREATE TABLE IF NOT EXISTS reposts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          post_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, post_id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (post_id) REFERENCES posts(id)
        )
      `,
        (err) => {
          if (err) return reject(err);

          // 既存の古いdbファイルに対する不足カラムのマイグレーション
          ensureColumn("posts", "furigana", "TEXT NOT NULL DEFAULT ''", (err1) => {
            if (err1) return reject(err1);

            ensureColumn("comments", "furigana", "TEXT NOT NULL DEFAULT ''", (err2) => {
              if (err2) return reject(err2);

              console.log("Database tables initialized");
              resolve();
            });
          });
        }
      );
    });
  });
}
