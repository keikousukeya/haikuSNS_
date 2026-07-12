import axios from 'axios';
import { Comment, Post, TimelineType } from '../types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function authHeaders(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function register(username: string, email: string, password: string) {
  const res = await axios.post(`${API_URL}/api/users/register`, { username, email, password });
  return res.data;
}

export async function login(email: string, password: string) {
  const res = await axios.post(`${API_URL}/api/users/login`, { email, password });
  return res.data;
}

export async function getTimeline(type: TimelineType, token?: string): Promise<Post[]> {
  const res = await axios.get(`${API_URL}/api/timeline`, {
    params: { type, limit: 20 },
    headers: authHeaders(token),
  });
  return res.data;
}

export async function createPost(content: string, furigana: string, token: string) {
  const res = await axios.post(
    `${API_URL}/api/posts`,
    { content, furigana },
    { headers: authHeaders(token) }
  );
  return res.data;
}

export async function toggleLike(postId: number, liked: boolean, token: string) {
  if (liked) {
    await axios.delete(`${API_URL}/api/posts/${postId}/like`, { headers: authHeaders(token) });
  } else {
    await axios.post(`${API_URL}/api/posts/${postId}/like`, {}, { headers: authHeaders(token) });
  }
}

export async function toggleRepost(postId: number, reposted: boolean, token: string) {
  if (reposted) {
    await axios.delete(`${API_URL}/api/posts/${postId}/repost`, { headers: authHeaders(token) });
  } else {
    await axios.post(`${API_URL}/api/posts/${postId}/repost`, {}, { headers: authHeaders(token) });
  }
}

export async function toggleFollow(userId: number, following: boolean, token: string) {
  if (following) {
    await axios.delete(`${API_URL}/api/users/${userId}/follow`, { headers: authHeaders(token) });
  } else {
    await axios.post(`${API_URL}/api/users/${userId}/follow`, {}, { headers: authHeaders(token) });
  }
}

export async function getComments(postId: number): Promise<Comment[]> {
  const res = await axios.get(`${API_URL}/api/posts/${postId}/comments`);
  return res.data;
}

export async function createComment(postId: number, content: string, token: string): Promise<Comment> {
  const res = await axios.post(
    `${API_URL}/api/posts/${postId}/comments`,
    { content },
    { headers: authHeaders(token) }
  );
  return res.data;
}
