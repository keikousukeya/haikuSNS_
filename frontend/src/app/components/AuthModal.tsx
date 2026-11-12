'use client';

import { useState } from 'react';
import { login, register } from '../../lib/api';
import { User } from '../../types';

interface AuthModalProps {
  onClose: () => void;
  onAuthenticated: (user: User) => void;
}

export default function AuthModal({ onClose, onAuthenticated }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = isLogin ? await login(email, password) : await register(username, email, password);
      onAuthenticated(userData);
    } catch (err: any) {
      setError(err.response?.data?.error || (isLogin ? 'ログインに失敗しました' : '登録に失敗しました'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="modal-close" onClick={onClose}>
          ×
        </span>

        <h2>{isLogin ? 'ログイン' : '新規登録'}</h2>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
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
          <button type="submit" className="btn-block" disabled={loading}>
            {loading ? '処理中...' : isLogin ? 'ログイン' : '登録'}
          </button>
        </form>

        <button
          className="btn-ghost btn-block"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setEmail('');
            setPassword('');
            setUsername('');
          }}
        >
          {isLogin ? '新規登録はこちら' : 'ログインはこちら'}
        </button>
      </div>
    </div>
  );
}
