import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle unauthorized access
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API Functions
export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('auth/login/', { username, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  register: async (username, email, password) => {
    const response = await api.post('auth/register/', { username, email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  logout: async () => {
    try {
      await api.post('auth/logout/');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },
  getMe: async () => {
    const response = await api.get('auth/me/');
    return response.data;
  },
  getUsers: async () => {
    const response = await api.get('users/');
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('profile/');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.put('profile/', data);
    return response.data;
  },
};


export const projectAPI = {
  getAll: async () => {
    const response = await api.get('projects/');
    return response.data;
  },
  getOne: async (id) => {
    const response = await api.get(`projects/${id}/`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('projects/', data);
    return response.data;
  },
  getJoinable: async () => {
    const response = await api.get('projects/joinable/');
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`projects/${id}/`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`projects/${id}/`);
    return response.data;
  },
  updateMembers: async (id, memberIds) => {
    const response = await api.post(`projects/${id}/manage_members/`, { member_ids: memberIds });
    return response.data;
  },
  updateColumns: async (id, columns) => {
    const response = await api.post(`projects/${id}/manage_columns/`, { columns });
    return response.data;
  },
};

export const issueAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('issues/', { params });
    return response.data;
  },
  getOne: async (id) => {
    const response = await api.get(`issues/${id}/`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('issues/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`issues/${id}/`, data); // patch for partial updates (e.g. status)
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`issues/${id}/`);
    return response.data;
  },
};

export const commentAPI = {
  getByIssue: async (issueId) => {
    const response = await api.get('comments/', { params: { issue: issueId } });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('comments/', data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`comments/${id}/`);
    return response.data;
  },
};

export const invitationAPI = {
  getAll: async () => {
    const response = await api.get('invitations/');
    return response.data;
  },
  create: async (email, projectId = null) => {
    const response = await api.post('invitations/', { email, project: projectId });
    return response.data;
  },
  validate: async (token) => {
    const response = await api.get('invitations/validate/', { params: { token } });
    return response.data;
  },
  accept: async (token, username, password) => {
    const response = await api.post('invitations/accept/', { token, username, password });
    return response.data;
  },
};

export const joinRequestAPI = {
  getAll: async () => {
    const response = await api.get('join-requests/');
    return response.data;
  },
  create: async (projectId) => {
    const response = await api.post('join-requests/', { project: projectId });
    return response.data;
  },
  approve: async (id) => {
    const response = await api.post(`join-requests/${id}/approve/`);
    return response.data;
  },
  reject: async (id) => {
    const response = await api.post(`join-requests/${id}/reject/`);
    return response.data;
  },
};

export const spaceAPI = {
  getAll: async () => {
    const response = await api.get('spaces/');
    return response.data;
  },
  getOne: async (id) => {
    const response = await api.get(`spaces/${id}/`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('spaces/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`spaces/${id}/`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`spaces/${id}/`);
    return response.data;
  },
  updateColumns: async (id, columns) => {
    const response = await api.post(`spaces/${id}/manage_columns/`, { columns });
    return response.data;
  },
};

export const sprintAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('sprints/', { params });
    return response.data;
  },
  getOne: async (id) => {
    const response = await api.get(`sprints/${id}/`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('sprints/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`sprints/${id}/`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`sprints/${id}/`);
    return response.data;
  },
  start: async (id) => {
    const response = await api.post(`sprints/${id}/start_sprint/`);
    return response.data;
  },
  complete: async (id, moveTo) => {
    const response = await api.post(`sprints/${id}/complete_sprint/`, { move_to: moveTo });
    return response.data;
  },
};

export const pageAPI = {
  getBySpace: async (spaceId) => {
    const response = await api.get('pages/', { params: { space: spaceId } });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('pages/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`pages/${id}/`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`pages/${id}/`);
    return response.data;
  },
};

export default api;
