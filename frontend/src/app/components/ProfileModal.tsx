'use client';

import { useEffect, useState } from 'react';
import { getFollowers, getFollowing, getProfile, toggleFollow, updateProfile } from '../../lib/api';
import { FollowUser, Profile, User } from '../../types';

interface ProfileModalProps {
  userId: number;
  currentUser: User | null;
  onClose: () => void;
  onOpenProfile: (userId: number) => void;
  onFollowChanged: () => void;
}

type FollowTab = 'followers' | 'following';

export default function ProfileModal({
  userId,
  currentUser,
  onClose,
  onOpenProfile,
  onFollowChanged,
}: ProfileModalProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<FollowTab>('followers');
  const [lists, setLists] = useState<{ followers?: FollowUser[]; following?: FollowUser[] }>({});
  const [listLoading, setListLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [saving, setSaving] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  // userId変更時にプロフィールを再取得し、タブ・編集状態をリセットする
  useEffect(() => {
    setProfile(null);
    setError('');
    setLists({});
    setActiveTab('followers');
    setEditing(false);

    getProfile(userId, currentUser?.token)
      .then((data) => {
        setProfile(data);
        setDisplayNameInput(data.display_name || data.username);
        setBioInput(data.bio || '');
        setAvatarUrlInput(data.avatar_url || '');
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
        setError('プロフィールの取得に失敗しました');
      });
  }, [userId, currentUser?.token]);

  // タブ切り替え時に一覧を遅延取得（タブごとに一度だけ）
  useEffect(() => {
    if (lists[activeTab] !== undefined) return;

    setListLoading(true);
    const fetcher = activeTab === 'followers' ? getFollowers : getFollowing;
    fetcher(userId, currentUser?.token)
      .then((data) => {
        setLists((prev) => ({ ...prev, [activeTab]: data }));
      })
      .catch((err) => {
        console.error('Failed to load follow list:', err);
        setLists((prev) => ({ ...prev, [activeTab]: [] }));
      })
      .finally(() => setListLoading(false));
  }, [activeTab, userId, currentUser?.token, lists]);

  const handleToggleFollowUser = async (target: FollowUser) => {
    if (!currentUser) return;

    setLists((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab]?.map((u) =>
        u.id === target.id ? { ...u, is_following: !u.is_following } : u
      ),
    }));

    if (profile && profile.id === target.id) {
      setProfile({ ...profile, is_following: !profile.is_following });
    }

    try {
      await toggleFollow(target.id, target.is_following, currentUser.token);
      onFollowChanged();
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    }
  };

  const handleToggleProfileFollow = async () => {
    if (!currentUser || !profile) return;
    const wasFollowing = profile.is_following;
    setProfile({
      ...profile,
      is_following: !wasFollowing,
      follower_count: profile.follower_count + (wasFollowing ? -1 : 1),
    });
    try {
      await toggleFollow(profile.id, wasFollowing, currentUser.token);
      onFollowChanged();
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      setProfile({ ...profile, is_following: wasFollowing, follower_count: profile.follower_count });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !profile) return;
    setError('');
    setSaving(true);
    const trimmedDisplayName = displayNameInput.trim();
    if (!trimmedDisplayName) {
      setError('表示名を入力してください');
      setSaving(false);
      return;
    }

    try {
      await updateProfile(profile.id, trimmedDisplayName, bioInput, avatarUrlInput, currentUser.token);
      setProfile({ ...profile, display_name: trimmedDisplayName, bio: bioInput, avatar_url: avatarUrlInput });
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'プロフィールの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const renderAvatar = (avatarUrl: string | null, username: string, size: number) => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={username}
          className="avatar-img"
          style={{ width: size, height: size }}
        />
      );
    }
    return (
      <div className="post-avatar" style={{ width: size, height: size }}>
        {username.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="modal-close" onClick={onClose}>
          ×
        </span>

        {error && <div className="error">{error}</div>}

        {!profile ? (
          <div className="muted">読み込み中...</div>
        ) : (
          <>
            <div className="profile-header">
              {renderAvatar(profile.avatar_url, profile.username, 56)}
              <div className="post-info">
                <div className="post-name" style={{ fontSize: '17px' }}>{profile.display_name || profile.username}</div>
                <div className="post-username">@{profile.username}</div>
                {!editing && <div className="profile-bio">{profile.bio || '自己紹介はまだありません'}</div>}
              </div>
              {isOwnProfile && !editing && (
                <button className="btn-ghost follow-btn" onClick={() => setEditing(true)}>編集</button>
              )}
              {!isOwnProfile && currentUser && (
                <button
                  className={`follow-btn${profile.is_following ? ' following' : ''}`}
                  onClick={handleToggleProfileFollow}
                >
                  {profile.is_following ? 'フォロー中' : 'フォロー'}
                </button>
              )}
            </div>

            {editing && (
              <form onSubmit={handleSaveProfile} style={{ marginBottom: '20px' }}>
                <div className="hint">表示名・自己紹介・アイコンURLを編集できます（＠ID「{profile.username}」は変更できません）</div>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="表示名"
                  maxLength={30}
                  disabled={saving}
                />
                <textarea
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="自己紹介"
                  maxLength={160}
                  disabled={saving}
                  style={{ minHeight: '60px' }}
                />
                <input
                  type="text"
                  value={avatarUrlInput}
                  onChange={(e) => setAvatarUrlInput(e.target.value)}
                  placeholder="アイコン画像URL（任意）"
                  disabled={saving}
                />
                <div className="form-actions">
                  <button type="submit" disabled={saving}>
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setEditing(false);
                      setDisplayNameInput(profile.display_name || profile.username);
                      setBioInput(profile.bio || '');
                      setAvatarUrlInput(profile.avatar_url || '');
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            )}

            <div className="tabs">
              <button
                className={`tab${activeTab === 'followers' ? ' active' : ''}`}
                onClick={() => setActiveTab('followers')}
              >
                フォロワー {profile.follower_count}
              </button>
              <button
                className={`tab${activeTab === 'following' ? ' active' : ''}`}
                onClick={() => setActiveTab('following')}
              >
                フォロー中 {profile.following_count}
              </button>
            </div>

            <div className="follow-list">
              {listLoading && <div className="muted">読み込み中...</div>}
              {!listLoading && lists[activeTab]?.length === 0 && <div className="muted">まだいません</div>}
              {!listLoading &&
                lists[activeTab]?.map((u) => (
                  <div key={u.id} className="follow-list-item">
                    <div className="follow-list-user" onClick={() => onOpenProfile(u.id)}>
                      {renderAvatar(u.avatar_url, u.username, 32)}
                      <div className="post-info">
                        <div className="post-name">{u.display_name || u.username}</div>
                        <div className="post-username">@{u.username}</div>
                      </div>
                    </div>
                    {currentUser && currentUser.id !== u.id && (
                      <button
                        className={`follow-btn${u.is_following ? ' following' : ''}`}
                        onClick={() => handleToggleFollowUser(u)}
                      >
                        {u.is_following ? 'フォロー中' : 'フォロー'}
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
