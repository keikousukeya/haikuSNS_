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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (post_id) REFERENCES posts(id)
        )
      `,
        (err) => {
          if (err) {
            reject(err);
          } else {
            console.log("Database tables initialized");
            resolve();
          }
        }
      );
    });
  });
}
