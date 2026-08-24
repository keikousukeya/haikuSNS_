'use client';

import { useState } from 'react';
import { Post, User } from '../../types';
import CommentSection from './CommentSection';

interface PostCardProps {
  post: Post;
  currentUser: User | null;
  onToggleLike: (post: Post) => void;
  onToggleRepost: (post: Post) => void;
  onToggleFollow: (post: Post) => void;
  onCommentAdded: (postId: number) => void;
  onOpenProfile: (userId: number) => void;
}

export default function PostCard({
  post,
  currentUser,
  onToggleLike,
  onToggleRepost,
  onToggleFollow,
  onCommentAdded,
  onOpenProfile,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [hasOpenedComments, setHasOpenedComments] = useState(false);

  const canFollow = currentUser && post.user_id !== currentUser.id;

  return (
    <div className="post">
      <div className="post-header">
        <div style={{ cursor: 'pointer' }} onClick={() => onOpenProfile(post.user_id)}>
          {post.avatar_url ? (
            <img src={post.avatar_url} alt={post.username} className="avatar-img" style={{ width: 40, height: 40 }} />
          ) : (
            <div className="post-avatar">{post.username.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <div className="post-info">
          <div style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => onOpenProfile(post.user_id)}>
            {post.display_name || post.username}
          </div>
          <div className="post-username" style={{ cursor: 'pointer', fontSize: '0.9em' }} onClick={() => onOpenProfile(post.user_id)}>
            @{post.username}
          </div>
          <div className="post-time">{new Date(post.created_at).toLocaleString('ja-JP')}</div>
        </div>
        {canFollow && (
          <button
            className={`follow-btn${post.is_following ? ' following' : ''}`}
            onClick={() => onToggleFollow(post)}
          >
            {post.is_following ? 'フォロー中' : 'フォロー'}
          </button>
        )}
      </div>
      <div className="post-content">{post.content}</div>
      <div style={{ fontSize: '0.9em', color: '#666', marginTop: '8px', marginBottom: '10px' }}>
        ふりがな: {post.furigana}
      </div>
      <div className="post-actions">
        <button
          className={`action-btn${post.is_liked ? ' active-like' : ''}`}
          onClick={() => currentUser && onToggleLike(post)}
          disabled={!currentUser}
        >
          🪷 座布団 {post.like_count}
        </button>
        <button
          className={`action-btn${post.is_reposted ? ' active-repost' : ''}`}
          onClick={() => currentUser && onToggleRepost(post)}
          disabled={!currentUser}
        >
          📣 唱和 {post.repost_count}
        </button>
        <button
          className="action-btn"
          onClick={() => {
            setShowComments((prev) => !prev);
            setHasOpenedComments(true);
          }}
        >
          💬 返す {post.comment_count}
        </button>
      </div>
      {hasOpenedComments && (
        <div style={{ display: showComments ? 'block' : 'none' }}>
          <CommentSection
            postId={post.id}
            currentUser={currentUser}
            onCommentAdded={() => onCommentAdded(post.id)}
          />
        </div>
      )}
    </div>
  );
}
