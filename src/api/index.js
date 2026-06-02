import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

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

export const fetchPosts = (page = 1) => API.get(`/posts?page=${page}&limit=10`);
export const createPost = (postData) => API.post('/posts', postData);
export const updatePost = (id, postData) => API.put(`/posts/${id}`, postData);
export const deletePost = (id) => API.delete(`/posts/${id}`);
export const likePost = (id) => API.post(`/posts/${id}/like`);
export const commentPost = (id, commentData) => API.post(`/posts/${id}/comment`, commentData);

export const fetchProfile = (username) => API.get(`/posts/profile/${username}`);
export const fetchUserPosts = (username) => API.get(`/posts/user/${username}`);
