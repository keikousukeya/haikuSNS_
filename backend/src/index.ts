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
app.get("/api/users/:id", optionalAuthenticateToken, (req, res) => {
  const { id } = req.params;
  const viewerId = (req as any).userId as number | null;
  const viewerIdParam = viewerId ?? 0; // 未ログイン時はヒットしないダミー値

  db.get(
    `
    SELECT
      id, username, bio, avatar_url, created_at,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
      EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
    FROM users u
    WHERE id = ?
  `,
    [viewerIdParam, id],
    (err, user: any) => {
      if (err || !user) {
        return res.status(404).json({ error: "User not found" });
      }

      user.is_following = !!user.is_following;

      // メールアドレスは本人がアクセスした場合のみ返す（他人からは非公開）
      if (viewerId === parseInt(id)) {
        db.get("SELECT email FROM users WHERE id = ?", [id], (err2, row: any) => {
          if (!err2 && row) {
            user.email = row.email;
          }
          res.json(user);
        });
        return;
      }

      res.json(user);
    }
  );
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

// ===== フォロー機能 =====

// フォロー
app.post("/api/users/:id/follow", authenticateToken, (req, res) => {
  const targetId = parseInt(req.params.id);
  const followerId = (req as any).userId;

  if (targetId === followerId) {
    return res.status(400).json({ error: "自分自身をフォローすることはできません" });
  }

  db.get("SELECT id FROM users WHERE id = ?", [targetId], (err, target) => {
    if (err || !target) {
      return res.status(404).json({ error: "対象ユーザーが見つかりません" });
    }

    db.run(
      "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)",
      [followerId, targetId],
      function (err) {
        if (err) {
          return res.status(400).json({ error: "既にフォローしています" });
        }

        res.json({ message: "フォローしました" });
      }
    );
  });
});

// フォロー解除
app.delete("/api/users/:id/follow", authenticateToken, (req, res) => {
  const targetId = parseInt(req.params.id);
  const followerId = (req as any).userId;

  db.run(
    "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
    [followerId, targetId],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json({ message: "フォローを解除しました" });
    }
  );
});

// フォロワー一覧（:idをフォローしているユーザー一覧）
app.get("/api/users/:id/followers", optionalAuthenticateToken, (req, res) => {
  const targetId = parseInt(req.params.id);
  const viewerId = (req as any).userId as number | null;
  const viewerIdParam = viewerId ?? 0;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

  db.all(
    `
    SELECT u.id, u.username, u.avatar_url,
      EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
    FROM follows f
    JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = ?
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `,
    [viewerIdParam, targetId, limit, offset],
    (err, rows: any[]) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json(rows.map((row) => ({ ...row, is_following: !!row.is_following })));
    }
  );
});

// フォロー中一覧（:idがフォローしているユーザー一覧）
app.get("/api/users/:id/following", optionalAuthenticateToken, (req, res) => {
  const targetId = parseInt(req.params.id);
  const viewerId = (req as any).userId as number | null;
  const viewerIdParam = viewerId ?? 0;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

  db.all(
    `
    SELECT u.id, u.username, u.avatar_url,
      EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
    FROM follows f
    JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ?
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `,
    [viewerIdParam, targetId, limit, offset],
    (err, rows: any[]) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json(rows.map((row) => ({ ...row, is_following: !!row.is_following })));
    }
  );
});

// ===== 投稿機能 =====

// 投稿作成
app.post("/api/posts", authenticateToken, (req, res) => {
  const { content, furigana } = req.body;
  const userId = (req as any).userId;

  if (!content) {
    return res.status(400).json({ error: "content is required" });
  }

  if (!furigana) {
    return res.status(400).json({ error: "furigana is required" });
  }

  // ふりがなが30文字以下かチェック（5・7・5＝17音＋区切りスペース2つ分の余裕）
  if (furigana.length > 30) {
    return res.status(400).json({ error: "ふりがなは30文字以下である必要があります" });
  }

  // 575バリデーション（本文は漢字を含み音数を正確に数えられないため、
  // ユーザーが入力した「ふりがな」を基に判定する）
  const validation = validateHaiku(furigana);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  db.run(
    "INSERT INTO posts (user_id, content, furigana) VALUES (?, ?, ?)",
    [userId, content, furigana],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json({
        id: this.lastID,
        user_id: userId,
        content,
        furigana,
        created_at: new Date().toISOString(),
      });
    }
  );
});

// タイムライン取得（おすすめ / フォロー中 / 最新）
const TIMELINE_SELECT = `
    SELECT
      p.id,
      p.user_id,
      p.content,
      p.furigana,
      p.created_at,
      u.username,
      u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
      (SELECT COUNT(*) FROM reposts WHERE post_id = p.id) as repost_count,
      EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
      EXISTS(SELECT 1 FROM reposts WHERE post_id = p.id AND user_id = ?) as is_reposted,
      EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = p.user_id) as is_following
    FROM posts p
    JOIN users u ON p.user_id = u.id
`;

function castTimelineRows(rows: any[]) {
  return rows.map((row) => ({
    ...row,
    is_liked: !!row.is_liked,
    is_reposted: !!row.is_reposted,
    is_following: !!row.is_following,
  }));
}

app.get("/api/timeline", optionalAuthenticateToken, (req, res) => {
  const type = (req.query.type as string) || "recommended";
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
  const userId = (req as any).userId as number | null;
  const userIdParam = userId ?? 0; // 未ログイン時はヒットしないダミー値

  if (type === "following") {
    if (!userId) {
      return res.status(401).json({ error: "フォロー中タイムラインの閲覧にはログインが必要です" });
    }

    db.all(
      `${TIMELINE_SELECT}
      WHERE p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?`,
      [userIdParam, userIdParam, userIdParam, userId, limit, offset],
      (err, posts: any[]) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        res.json(castTimelineRows(posts));
      }
    );
    return;
  }

  if (type === "recommended") {
    const runRecommendedQuery = (withDateFilter: boolean, callback: (err: any, rows: any[]) => void) => {
      db.all(
        `${TIMELINE_SELECT}
        ${withDateFilter ? "WHERE p.created_at >= datetime('now', '-7 days')" : ""}
        ORDER BY (like_count + repost_count) DESC, p.created_at DESC
        LIMIT ? OFFSET ?`,
        [userIdParam, userIdParam, userIdParam, limit, offset],
        callback
      );
    };

    runRecommendedQuery(true, (err, posts: any[]) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      // 直近7日以内に投稿がない場合は日付フィルタを外して再取得する
      if (posts.length === 0 && offset === 0) {
        runRecommendedQuery(false, (err2, posts2: any[]) => {
          if (err2) {
            return res.status(400).json({ error: err2.message });
          }
          res.json(castTimelineRows(posts2));
        });
        return;
      }
      res.json(castTimelineRows(posts));
    });
    return;
  }

  // type === "latest"（既存互換のデフォルト挙動）
  db.all(
    `${TIMELINE_SELECT}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?`,
    [userIdParam, userIdParam, userIdParam, limit, offset],
    (err, posts: any[]) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json(castTimelineRows(posts));
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
      p.furigana,
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

// ===== 唱和（リポスト）機能 =====

// 唱和
app.post("/api/posts/:postId/repost", authenticateToken, (req, res) => {
  const { postId } = req.params;
  const userId = (req as any).userId;

  db.run(
    "INSERT INTO reposts (user_id, post_id) VALUES (?, ?)",
    [userId, postId],
    function (err) {
      if (err) {
        return res.status(400).json({ error: "既に唱和済み、または無効な投稿です" });
      }

      res.json({ message: "唱和しました" });
    }
  );
});

// 唱和解除
app.delete("/api/posts/:postId/repost", authenticateToken, (req, res) => {
  const { postId } = req.params;
  const userId = (req as any).userId;

  db.run("DELETE FROM reposts WHERE user_id = ? AND post_id = ?", [userId, postId], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    res.json({ message: "唱和を解除しました" });
  });
});

// ===== コメント機能 =====

// コメント追加
app.post("/api/posts/:postId/comments", authenticateToken, (req, res) => {
  const { postId } = req.params;
  const { content, furigana } = req.body;
  const userId = (req as any).userId;

  if (!content) {
    return res.status(400).json({ error: "content is required" });
  }

  if (!furigana) {
    return res.status(400).json({ error: "furigana is required" });
  }

  // ふりがなが30文字以下かチェック（5・7・5＝17音＋区切りスペース2つ分の余裕）
  if (furigana.length > 30) {
    return res.status(400).json({ error: "ふりがなは30文字以下である必要があります" });
  }

  // コメント（返し）も575バリデーション（本文は漢字を含み音数を正確に数えられないため、
  // ユーザーが入力した「ふりがな」を基に判定する）
  const validation = validateHaiku(furigana);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  db.run(
    "INSERT INTO comments (user_id, post_id, content, furigana) VALUES (?, ?, ?, ?)",
    [userId, postId, content, furigana],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json({
        id: this.lastID,
        user_id: userId,
        post_id: postId,
        content,
        furigana,
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
      c.furigana,
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

// JWT認証ミドルウェア（任意）：トークンが無い/不正でも401にせず通過させる
function optionalAuthenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    (req as any).userId = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    (req as any).userId = err ? null : decoded.id;
    next();
  });
}

// サーバー起動
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
