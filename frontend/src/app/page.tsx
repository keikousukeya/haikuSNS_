'use client';

import { useEffect, useState } from 'react';
import { getTimeline, toggleFollow, toggleLike, toggleRepost } from '../lib/api';
import { Post, TimelineType, User } from '../types';
import AuthModal from './components/AuthModal';
import PostForm from './components/PostForm';
import TimelineTabs from './components/TimelineTabs';
import PostCard from './components/PostCard';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [timelineType, setTimelineType] = useState<TimelineType>('recommended');
  const [showAuth, setShowAuth] = useState(false);
  const [success, setSuccess] = useState('');
  const [timelineError, setTimelineError] = useState('');

  // マウント時にローカルストレージからユーザー情報を復元
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // タイムライン種別・ログイン状態が変わるたびに再取得する
  useEffect(() => {
    loadTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineType, user?.token]);

  const loadTimeline = async () => {
    setTimelineError('');
    try {
      const data = await getTimeline(timelineType, user?.token);
      setPosts(data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setTimelineError(err.response?.data?.error || 'ログインが必要です');
        setPosts([]);
      } else {
        console.error('Failed to load timeline:', err);
      }
    }
  };

  const handleAuthenticated = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setShowAuth(false);
    setSuccess('ようこそ！');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setSuccess('ログアウトしました');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleToggleLike = async (post: Post) => {
    if (!user) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, is_liked: !p.is_liked, like_count: p.like_count + (p.is_liked ? -1 : 1) }
          : p
      )
    );
    try {
      await toggleLike(post.id, post.is_liked, user.token);
    } catch (err) {
      console.error('Failed to toggle like:', err);
      loadTimeline();
    }
  };

  const handleToggleRepost = async (post: Post) => {
    if (!user) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, is_reposted: !p.is_reposted, repost_count: p.repost_count + (p.is_reposted ? -1 : 1) }
          : p
      )
    );
    try {
      await toggleRepost(post.id, post.is_reposted, user.token);
    } catch (err) {
      console.error('Failed to toggle repost:', err);
      loadTimeline();
    }
  };

  const handleToggleFollow = async (post: Post) => {
    if (!user) return;
    setPosts((prev) =>
      prev.map((p) => (p.user_id === post.user_id ? { ...p, is_following: !p.is_following } : p))
    );
    try {
      await toggleFollow(post.user_id, post.is_following, user.token);
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      loadTimeline();
    }
  };

  const handleCommentAdded = (postId: number) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)));
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
        {success && <div className="success">✓ {success}</div>}

        {user && <PostForm token={user.token} onPosted={loadTimeline} />}

        <TimelineTabs
          active={timelineType}
          isLoggedIn={!!user}
          onChange={setTimelineType}
          onRequireLogin={() => setShowAuth(true)}
        />

        {timelineType === 'following' && !user ? (
          <div className="empty-state">
            ログインするとフォロー中の俳人の句が見られます
            <div style={{ marginTop: '12px' }}>
              <button onClick={() => setShowAuth(true)}>ログイン</button>
            </div>
          </div>
        ) : timelineError ? (
          <div className="empty-state">{timelineError}</div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            {timelineType === 'following'
              ? 'まだ誰もフォローしていません。気になる俳人をフォローしてみましょう。'
              : '投稿がまだありません'}
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={user}
              onToggleLike={handleToggleLike}
              onToggleRepost={handleToggleRepost}
              onToggleFollow={handleToggleFollow}
              onCommentAdded={handleCommentAdded}
            />
          ))
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuthenticated={handleAuthenticated} />}
    </div>
  );
}
