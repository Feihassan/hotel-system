import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  getUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

// Rooms API
export const roomsAPI = {
  getAll: (params) => api.get('/rooms', { params }),
  getById: (id) => api.get(`/rooms/${id}`),
  create: (data) => api.post('/rooms', data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  updateStatus: (id, status) => api.patch(`/rooms/${id}/status`, { status }),
  delete: (id) => api.delete(`/rooms/${id}`),
  getTypes: () => api.get('/rooms/types/list'),
  createType: (data) => api.post('/rooms/types', data),
};

// Bookings API
export const bookingsAPI = {
  getAll: (params) => api.get('/bookings', { params }),
  getActive: () => api.get('/bookings/active'),
  getToday: () => api.get('/bookings/today'),
  getById: (id) => api.get(`/bookings/${id}`),
  checkIn: (data) => api.post('/bookings/check-in', data),
  checkOut: (id) => api.post(`/bookings/${id}/check-out`),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  cancel: (id) => api.post(`/bookings/${id}/cancel`),
  checkAvailability: (roomId, checkIn, checkOut) => 
    api.get(`/bookings/availability/${roomId}`, { params: { check_in: checkIn, check_out: checkOut } }),
};

// Guests API
export const guestsAPI = {
  getAll: (params) => api.get('/guests', { params }),
  search: (q) => api.get('/guests/search', { params: { q } }),
  getById: (id) => api.get(`/guests/${id}`),
  create: (data) => api.post('/guests', data),
  update: (id, data) => api.put(`/guests/${id}`, data),
};

// Payments API
export const paymentsAPI = {
  getForBooking: (bookingId) => api.get(`/payments/booking/${bookingId}`),
  process: (data) => api.post('/payments', data),
  getSummary: (bookingId) => api.get(`/payments/summary/${bookingId}`),
  addExtraCharge: (data) => api.post('/payments/extra-charge', data),
  getExtraCharges: (bookingId) => api.get(`/payments/extra-charges/${bookingId}`),
  getReceipt: (paymentId) => api.get(`/payments/receipt/${paymentId}`),
};

// Housekeeping API
export const housekeepingAPI = {
  getAll: (params) => api.get('/housekeeping', { params }),
  getPending: () => api.get('/housekeeping/pending'),
  getStats: () => api.get('/housekeeping/stats'),
  create: (data) => api.post('/housekeeping', data),
  updateStatus: (id, status) => api.patch(`/housekeeping/${id}/status`, { status }),
  markClean: (roomId) => api.post(`/housekeeping/mark-clean/${roomId}`),
  assign: (id, assignedTo) => api.patch(`/housekeeping/${id}/assign`, { assigned_to: assignedTo }),
};

// Reports API
export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getDaily: (date) => api.get('/reports/daily', { params: { date } }),
  getRevenue: (startDate, endDate) => api.get('/reports/revenue', { params: { start_date: startDate, end_date: endDate } }),
  getOccupancy: () => api.get('/reports/occupancy'),
  getGuests: (limit) => api.get('/reports/guests', { params: { limit } }),
  getReceptionistActivity: (params) => api.get('/reports/receptionist-activity', { params }),
  getShiftPerformance: (params) => api.get('/reports/shift-performance', { params }),
};

// Shifts API
export const shiftsAPI = {
  start: () => api.post('/shifts/start'),
  close: (id) => api.post(`/shifts/${id}/close`),
  getCurrent: () => api.get('/shifts/my/current'),
  getAll: (params) => api.get('/shifts', { params }),
  getAuditLogs: (params) => api.get('/shifts/audit-logs', { params }),
};
