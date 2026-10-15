import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Checks
export const submitCheck = (text, platform = 'web') =>
  http.post('/checks', { text, platform });

export const listChecks = (params = {}) =>
  http.get('/checks', { params });

export const getCheck = (id) =>
  http.get(`/checks/${id}`);

export const approveCheck = (id, tone, editedText) =>
  http.post(`/checks/${id}/approve`, { tone, ...(editedText ? { editedText } : {}) });

export const dismissCheck = (id) =>
  http.post(`/checks/${id}/dismiss`);

export const retryCheck = (id) =>
  http.post(`/checks/${id}/retry`);

// Groups
export const listGroups = () =>
  http.get('/groups');

