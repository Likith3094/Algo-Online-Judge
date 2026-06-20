import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Enable sending cookies with requests
});

export const register = (payload) => api.post('/auth/register', payload);
export const login = (payload) => api.post('/auth/login', payload);
export const logout = () => api.post('/auth/logout');
export const fetchMe = () => api.get('/auth/me');
export const createProblem = (payload) => api.post('/problems', payload);
export const listProblems = (params) => api.get('/problems', { params });
export const getProblem = (id) => api.get(`/problems/${id}`);
export const deleteProblem = (id) => api.delete(`/problems/${id}`);
export const createContest = (payload) => api.post('/contests', payload);
export const listContests = (params) => api.get('/contests', { params });
export const getContest = (id) => api.get(`/contests/${id}`);
export const registerContest = (contestId) => api.post(`/contests/${contestId}/register`);

export default api;
