import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API = axios.create({ baseURL: API_BASE });

API.interceptors.request.use((req) => {
  if (localStorage.getItem('token')) {
    req.headers['x-auth-token'] = localStorage.getItem('token');
  }
  return req;
});

export const login = (formData) => API.post('/auth/login', formData);
export const signup = (formData) => API.post('/auth/signup', formData);
export const fetchMe = () => API.get('/auth/me');
export const updateProfile = (userData) => API.put('/auth/profile', userData);
export const toggleFollow = (username) => API.post(`/auth/follow/${username}`);
export const fetchSuggestedUsers = () => API.get('/auth/suggested-users');
export const fetchOnlineUsers = () => API.get('/auth/online-users');
export const searchUsers = (q) => API.get(`/auth/search-users?q=${encodeURIComponent(q)}`);

export const fetchPosts = (page = 1, filter = 'all') => API.get(`/posts?page=${page}&limit=10&filter=${filter}`);
export const searchPosts = (query) => API.get(`/posts/search?q=${query}`);
export const createPost = (postData) => API.post('/posts', postData);
export const updatePost = (id, postData) => API.put(`/posts/${id}`, postData);
export const deletePost = (id) => API.delete(`/posts/${id}`);
export const likePost = (id) => API.post(`/posts/${id}/like`);
export const sharePost = (id) => API.post(`/posts/${id}/share`);
export const commentPost = (id, commentData) => API.post(`/posts/${id}/comment`, commentData);

export const fetchProfile = (username) => API.get(`/posts/profile/${username}`);
export const fetchUserPosts = (username) => API.get(`/posts/user/${username}`);

// Notifications
export const fetchNotifications = () => API.get('/notifications');
export const fetchUnreadCount = () => API.get('/notifications/unread-count');
export const markNotificationsRead = () => API.put('/notifications/mark-read');

// Messages
export const fetchConversations = () => API.get('/messages/conversations');
export const fetchMessages = (username) => API.get(`/messages/${username}`);
export const sendMessage = (receiver, text) => API.post('/messages', { receiver, text });
export const fetchChatUsers = () => API.get('/messages/users/all');

// Tasks
export const fetchTasks = () => API.get('/tasks');
export const createTask = (task) => API.post('/tasks', task);
export const updateTask = (id, task) => API.put(`/tasks/${id}`, task);
export const deleteTask = (id) => API.delete(`/tasks/${id}`);
export const fetchLeaderboard = () => API.get('/tasks/leaderboard/all');

// Uploads — returns { url, filename, size, mimetype } or throws
export const uploadImage = (file) => {
  const form = new FormData();
  form.append('image', file);
  return API.post('/uploads/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Password reset
export const forgotPassword = (email) => API.post('/auth/forgot-password', { email });
export const validateResetToken = (token) => API.get(`/auth/reset-token/${token}`);
export const resetPassword = (token, newPassword) => API.post('/auth/reset-password', { token, newPassword });
