import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    username: string;
    avatar?: string;
  };
  likes: Array<{ user: string; createdAt: string }>;
  dislikes: Array<{ user: string; createdAt: string }>;
  likeCount: number;
  dislikeCount: number;
  engagementScore: number;
  replyCount?: number;
  isLikedByUser: boolean;
  isDislikedByUser: boolean;
  canEdit: boolean;
  parentComment?: string;
  isEdited: boolean;
  editedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentsResponse {
  success: boolean;
  data: {
    comments: Comment[];
    pagination: {
      currentPage: number;
      totalPages: number;
      total: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      isFirstPage: boolean;
      isLastPage: boolean;
      startIndex: number;
      endIndex: number;
      remainingItems: number;
    };
  };
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

// Auth API
export const authAPI = {
  login: (email: string, password: string): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login', { email, password }),

  register: (username: string, email: string, password: string): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', { username, email, password }),

  getProfile: (): Promise<AxiosResponse<{ success: boolean; data: { user: User } }>> =>
    api.get('/auth/me'),
};

// Comments API
export const commentsAPI = {
  getComments: (params?: {
    page?: number;
    limit?: number;
    sort?: 'newest' | 'mostLiked' | 'mostDisliked';
  }): Promise<AxiosResponse<CommentsResponse>> =>
    api.get('/comments', { params }),

  createComment: (content: string): Promise<AxiosResponse<{ success: boolean; data: Comment }>> =>
    api.post('/comments', { content }),

  updateComment: (id: string, content: string): Promise<AxiosResponse<{ success: boolean; data: Comment }>> =>
    api.put(`/comments/${id}`, { content }),

  deleteComment: (id: string): Promise<AxiosResponse<{ success: boolean }>> =>
    api.delete(`/comments/${id}`),

  likeComment: (id: string): Promise<AxiosResponse<{ success: boolean; data: Comment }>> =>
    api.post(`/comments/${id}/like`),

  dislikeComment: (id: string): Promise<AxiosResponse<{ success: boolean; data: Comment }>> =>
    api.post(`/comments/${id}/dislike`),

  removeReaction: (id: string): Promise<AxiosResponse<{ success: boolean; data: Comment }>> =>
    api.delete(`/comments/${id}/reaction`),

  getReplies: (commentId: string, params?: {
    page?: number;
    limit?: number;
    sort?: 'newest' | 'mostLiked' | 'mostDisliked';
  }): Promise<AxiosResponse<{ success: boolean; data: { replies: Comment[]; pagination: any } }>> =>
    api.get(`/comments/${commentId}/replies`, { params }),

  createReply: (content: string, parentComment: string): Promise<AxiosResponse<{ success: boolean; data: Comment }>> =>
    api.post('/comments', { content, parentComment }),
};

export default api;
