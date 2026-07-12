'use client';

import { useState } from 'react';
import { createPost } from '../../lib/api';

interface PostFormProps {
  token: string;
  onPosted: () => void;
}

export default function PostForm({ token, onPosted }: PostFormProps) {
  const [content, setContent] = useState('');
  const [furigana, setFurigana] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('投稿を入力してください');
      return;
    }

    if (!furigana.trim()) {
      setError('ふりがなを入力してください');
      return;
    }

    if (furigana.length > 20) {
      setError('ふりがなは20文字以下である必要があります');
      return;
    }

    setLoading(true);

    try {
      await createPost(content, furigana, token);
      setContent('');
      setFurigana('');
      setSuccess('投稿しました！');
      setTimeout(() => setSuccess(''), 3000);
      onPosted();
    } catch (err: any) {
      setError(err.response?.data?.error || '投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="post-form">
      <h2>新しく詠む</h2>
      <div className="hint">
        スペース区切りで「5・7・5」の形式で投稿してください
        <br />
        例：古池や　かわず飛び込む　水の音
      </div>
      {error && <div className="error">❌ {error}</div>}
      {success && <div className="success">✓ {success}</div>}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="スペース区切りで「5・7・5」で投稿..."
        disabled={loading}
      />
      <input
        type="text"
        value={furigana}
        onChange={(e) => setFurigana(e.target.value)}
        placeholder="ふりがな（20文字以下）"
        maxLength={20}
        disabled={loading}
        style={{ marginTop: '10px', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '1em' }}
      />
      <div style={{ marginTop: '5px', fontSize: '0.9em', color: '#666' }}>{furigana.length}/20</div>
      <button type="submit" disabled={loading}>
        {loading ? '投稿中...' : '投稿する'}
      </button>
    </form>
  );
}
