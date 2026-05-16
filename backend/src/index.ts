import express from "express";
import cors from "cors";
import { db, initializeDatabase } from "./db";
import { validateHaiku } from "./validateHaiku";
import bcrypt from "bcryptjs";
import 'dotenv/config';
const jwt: any = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-local-secret-change-me";

// ミドルウェア
app.use(cors());
app.use(express.json());

// 初期化
initializeDatabase().catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});

// ===== ユーザー管理 =====

// ユーザー作成
app.post("/api/users/register", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email, password are required" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  db.run(
    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    [username, email, passwordHash],
    function (err) {
      if (err) {
        return res.status(400).json({ error: "User already exists" });
      }

      const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET, { expiresIn: "7d" });
      res.json({
        id: this.lastID,
        username,
        email,
        token,
      });
    }
  );
});

// ログイン
app.post("/api/users/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user: any) => {
    if (err || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      token,
    });
  });
});

// ユーザー情報取得
app.get("/api/users/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT id, username, email, bio, avatar_url, created_at FROM users WHERE id = ?", [id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  });
});

// プロフィール更新
app.put("/api/users/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { bio, avatar_url } = req.body;
  const authUserId = (req as any).userId;

  if (parseInt(id) !== authUserId) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  db.run(
    "UPDATE users SET bio = ?, avatar_url = ? WHERE id = ?",
    [bio || null, avatar_url || null, id],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json({ message: "Profile updated" });
    }
  );
});

// ===== 投稿機能 =====

// 投稿作成
app.post("/api/posts", authenticateToken, (req, res) => {
  const { content } = req.body;
  const userId = (req as any).userId;

  if (!content) {
    return res.status(400).json({ error: "content is required" });
  }

  // 575バリデーション
  const validation = validateHaiku(content);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  db.run(
    "INSERT INTO posts (user_id, content) VALUES (?, ?)",
    [userId, content],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json({
        id: this.lastID,
        user_id: userId,
        content,
        created_at: new Date().toISOString(),
      });
    }
  );
});

// タイムライン取得
app.get("/api/timeline", (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

  db.all(
    `
    SELECT 
      p.id,
      p.user_id,
      p.content,
      p.created_at,
      u.username,
      u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `,
    [limit, offset],
    (err, posts) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json(posts);
    }
  );
});

// 投稿詳細取得
app.get("/api/posts/:id", (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT 
      p.id,
      p.user_id,
      p.content,
      p.created_at,
      u.username,
      u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `,
    [id],
    (err, post) => {
      if (err || !post) {
        return res.status(404).json({ error: "Post not found" });
      }

      res.json(post);
    }
  );
});

// ===== いいね機能 =====

// いいね追加
app.post("/api/posts/:postId/like", authenticateToken, (req, res) => {
  const { postId } = req.params;
  const userId = (req as any).userId;

  db.run(
    "INSERT INTO likes (user_id, post_id) VALUES (?, ?)",
    [userId, postId],
    function (err) {
      if (err) {
        return res.status(400).json({ error: "Already liked or invalid post" });
      }

      res.json({ message: "Liked" });
    }
  );
});

// いいね削除
app.delete("/api/posts/:postId/like", authenticateToken, (req, res) => {
  const { postId } = req.params;
  const userId = (req as any).userId;

  db.run("DELETE FROM likes WHERE user_id = ? AND post_id = ?", [userId, postId], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    res.json({ message: "Unliked" });
  });
});

// ===== コメント機能 =====

// コメント追加
app.post("/api/posts/:postId/comments", authenticateToken, (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = (req as any).userId;

  if (!content) {
    return res.status(400).json({ error: "content is required" });
  }

  // コメントも575バリデーション
  const validation = validateHaiku(content);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  db.run(
    "INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)",
    [userId, postId, content],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json({
        id: this.lastID,
        user_id: userId,
        post_id: postId,
        content,
        created_at: new Date().toISOString(),
      });
    }
  );
});

// コメント一覧取得
app.get("/api/posts/:postId/comments", (req, res) => {
  const { postId } = req.params;

  db.all(
    `
    SELECT 
      c.id,
      c.user_id,
      c.content,
      c.created_at,
      u.username,
      u.avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `,
    [postId],
    (err, comments) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json(comments);
    }
  );
});

// ===== ヘルスチェック =====

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ===== JWT認証ミドルウェア =====

function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    (req as any).userId = decoded.id;
    (req as any).username = decoded.username;
    next();
  });
}

// サーバー起動
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
