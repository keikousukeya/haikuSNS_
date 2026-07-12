'use client';

import { useEffect, useState } from 'react';
import { createComment, getComments } from '../../lib/api';
import { Comment, User } from '../../types';

interface CommentSectionProps {
  postId: number;
  currentUser: User | null;
  onCommentAdded: () => void;
}

export default function CommentSection({ postId, currentUser, onCommentAdded }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);

  // 展開（マウント）時に一度だけコメントを取得する
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getComments(postId)
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch((err) => {
        console.error('Failed to load comments:', err);
        if (!cancelled) setComments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError('');

    if (!content.trim()) {
      setError('返しの句を入力してください');
      return;
    }

    setPosting(true);
    try {
      const newComment = await createComment(postId, content, currentUser.token);
      setComments((prev) => [...(prev || []), newComment]);
      setContent('');
      onCommentAdded();
    } catch (err: any) {
      setError(err.response?.data?.error || '返しの投稿に失敗しました');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="comment-section">
      {loading && <div style={{ fontSize: '0.85em', color: '#999' }}>読み込み中...</div>}

      {comments && comments.length === 0 && (
        <div style={{ fontSize: '0.85em', color: '#999' }}>まだ返しがありません</div>
      )}

      {comments &&
        comments.map((comment) => (
          <div key={comment.id} className="comment-item">
            <div className="post-avatar" style={{ width: '28px', height: '28px', fontSize: '0.8em' }}>
              {comment.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div className="post-username" style={{ fontSize: '0.9em' }}>@{comment.username}</div>
              <div className="post-content" style={{ fontSize: '0.95em' }}>{comment.content}</div>
            </div>
          </div>
        ))}

      {currentUser ? (
        <form onSubmit={handleSubmit} className="comment-form">
          {error && <div className="error">❌ {error}</div>}
          <div className="hint">返しの句も「5・7・5」で入力してください</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="スペース区切りで「5・7・5」で返す..."
            disabled={posting}
            style={{ width: '100%', minHeight: '60px' }}
          />
          <button type="submit" disabled={posting}>
            {posting ? '送信中...' : '返す'}
          </button>
        </form>
      ) : (
        <div style={{ fontSize: '0.85em', color: '#999' }}>返しの句を詠むにはログインが必要です</div>
      )}
    </div>
  );
}
