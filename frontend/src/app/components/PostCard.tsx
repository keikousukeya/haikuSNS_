'use client';

import { useState } from 'react';
import { Post, User } from '../../types';
import CommentSection from './CommentSection';
import HaikuText from './HaikuText';

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
        <div className="clickable" onClick={() => onOpenProfile(post.user_id)}>
          {post.avatar_url ? (
            <img src={post.avatar_url} alt={post.username} className="avatar-img" style={{ width: 40, height: 40 }} />
          ) : (
            <div className="post-avatar">{post.username.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <div className="post-info">
          <div className="post-name clickable" onClick={() => onOpenProfile(post.user_id)}>
            {post.display_name || post.username}
          </div>
          <div className="post-username clickable" onClick={() => onOpenProfile(post.user_id)}>
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
      <HaikuText content={post.content} furigana={post.furigana} />
      <div className="post-actions">
        <button
          className={`action-btn${post.is_liked ? ' active-like' : ''}`}
          onClick={() => currentUser && onToggleLike(post)}
          disabled={!currentUser}
        >
          座布団<span className="action-count">{post.like_count}</span>
        </button>
        <button
          className={`action-btn${post.is_reposted ? ' active-repost' : ''}`}
          onClick={() => currentUser && onToggleRepost(post)}
          disabled={!currentUser}
        >
          唱和<span className="action-count">{post.repost_count}</span>
        </button>
        <button
          className="action-btn"
          onClick={() => {
            setShowComments((prev) => !prev);
            setHasOpenedComments(true);
          }}
        >
          返す<span className="action-count">{post.comment_count}</span>
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
