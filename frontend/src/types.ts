export interface User {
  id: number;
  username: string;
  email: string;
  token: string;
}

export interface Post {
  id: number;
  user_id: number;
  content: string;
  furigana: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
  like_count: number;
  comment_count: number;
  repost_count: number;
  is_liked: boolean;
  is_reposted: boolean;
  is_following: boolean;
}

export interface Comment {
  id: number;
  user_id: number;
  post_id: number;
  content: string;
  furigana: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
}

export type TimelineType = 'recommended' | 'following' | 'latest';
