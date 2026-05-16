'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface User {
  id: number;
  username: string;
  email: string;
  token: string;
}

interface Post {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string;
  like_count: number;
  comment_count: number;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [postContent, setPostContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // マウント時にローカルストレージからユーザー情報を復元
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    loadTimeline();
  }, []);

  // タイムラインを読み込む
  const loadTimeline = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/timeline?limit=20`);
      setPosts(response.data);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    }
  };

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/users/login`, {
        email,
        password,
      });

      const userData = response.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setShowAuth(false);
      setEmail('');
      setPassword('');
      setSuccess('ログインしました！');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 登録処理
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/users/register`, {
        username,
        email,
        password,
      });

      const userData = response.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setShowAuth(false);
      setEmail('');
      setPassword('');
      setUsername('');
      setSuccess('登録しました！');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 投稿処理
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('ログインが必要です');
      return;
    }

    if (!postContent.trim()) {
      setError('投稿を入力してください');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/posts`,
        { content: postContent },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      setPostContent('');
      setSuccess('投稿しました！');
      setTimeout(() => setSuccess(''), 3000);
      await loadTimeline();
    } catch (err: any) {
      setError(err.response?.data?.error || '投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setSuccess('ログアウトしました');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div>
      <header className="header">
        <h1>575 SNS</h1>
        <div className="auth-section">
          {user ? (
            <>
              <span>{user.username}</span>
              <button onClick={handleLogout}>ログアウト</button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)}>ログイン</button>
          )}
        </div>
      </header>

      <div className="container">
        {error && <div className="error">❌ {error}</div>}
        {success && <div className="success">✓ {success}</div>}

        {user && (
          <form onSubmit={handlePost} className="post-form">
            <h2>新しく詠む</h2>
            <div className="hint">
              スペース区切りで「5・7・5」の形式で投稿してください<br />
              例：古池や　かわず飛び込む　水の音
            </div>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="スペース区切りで「5・7・5」で投稿..."
              disabled={loading}
            />
            <button type="submit" disabled={loading}>
              {loading ? '投稿中...' : '投稿する'}
            </button>
          </form>
        )}

        <h2 style={{ marginBottom: '15px' }}>タイムライン</h2>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
            投稿がまだありません
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="post">
              <div className="post-header">
                <div className="post-avatar">
                  {post.username.charAt(0).toUpperCase()}
                </div>
                <div className="post-info">
                  <div className="post-username">@{post.username}</div>
                  <div className="post-time">
                    {new Date(post.created_at).toLocaleString('ja-JP')}
                  </div>
                </div>
              </div>
              <div className="post-content">{post.content}</div>
              <div className="post-actions">
                <button className="action-btn">❤️ {post.like_count}</button>
                <button className="action-btn">💬 {post.comment_count}</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAuth && (
        <div className="modal" onClick={() => setShowAuth(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span
              className="modal-close"
              onClick={() => setShowAuth(false)}
            >
              ×
            </span>

            <h2>{isLogin ? 'ログイン' : '新規登録'}</h2>

            {error && <div className="error">{error}</div>}

            <form onSubmit={isLogin ? handleLogin : handleRegister}>
              {!isLogin && (
                <input
                  type="text"
                  placeholder="ユーザー名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              )}
              <input
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? '処理中...' : isLogin ? 'ログイン' : '登録'}
              </button>
            </form>

            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setEmail('');
                setPassword('');
                setUsername('');
              }}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                color: '#007bff',
                border: '1px solid #007bff',
              }}
            >
              {isLogin ? '新規登録はこちら' : 'ログインはこちら'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
