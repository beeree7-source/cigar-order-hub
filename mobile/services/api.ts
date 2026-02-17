import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// API URL configuration
// Note: For Android emulator, use 10.0.2.2 to access host machine's localhost
// For physical devices, use your computer's IP address (e.g., http://192.168.1.100:4000)
const getDefaultApiUrl = () => {
  if (Platform.OS === 'android') {
    // Android emulator can't access localhost, use special IP
    return 'http://10.0.2.2:4000';
  }
  return 'http://localhost:4000';
};

const API_URL = Constants.expoConfig?.extra?.apiUrl || getDefaultApiUrl();

/**
 * API Service for mobile app
 * Handles all HTTP requests to the backend
 */

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear and redirect to login
      await SecureStore.deleteItemAsync('userToken');
      // You can emit an event here to trigger navigation to login
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password });
    if (response.data.token) {
      await SecureStore.setItemAsync('userToken', response.data.token);
    }
    return response.data;
  },
  
  register: async (userData: any) => {
    const response = await api.post('/api/users/register', userData);
    return response.data;
  },
  
  logout: async () => {
    await SecureStore.deleteItemAsync('userToken');
  },
};

// Orders endpoints
export const ordersService = {
  getOrders: async (params?: any) => {
    const response = await api.get('/api/protected/orders', { params });
    return response.data;
  },
  
  createOrder: async (orderData: any) => {
    const response = await api.post('/api/protected/orders', orderData);
    return response.data;
  },
};

// Products endpoints
export const productsService = {
  getProducts: async (supplierId?: number) => {
    const url = supplierId 
      ? `/api/products/supplier/${supplierId}`
      : '/api/products/search';
    const response = await api.get(url);
    return response.data;
  },
  
  searchProducts: async (query: string) => {
    const response = await api.get('/api/products/search', {
      params: { search: query }
    });
    return response.data;
  },
};

// Invoices endpoints
export const invoicesService = {
  getInvoices: async (params?: any) => {
    const response = await api.get('/api/protected/invoices', { params });
    return response.data;
  },
  
  getInvoiceDetails: async (id: number) => {
    const response = await api.get(`/api/protected/invoices/${id}`);
    return response.data;
  },
  
  downloadInvoicePDF: async (id: number) => {
    const response = await api.get(`/api/protected/invoices/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

// Analytics endpoints
export const analyticsService = {
  getSummary: async () => {
    const response = await api.get('/api/protected/analytics/summary');
    return response.data;
  },
  
  getRevenue: async () => {
    const response = await api.get('/api/protected/analytics/revenue');
    return response.data;
  },
};

// Notifications endpoints
export const notificationsService = {
  getSettings: async () => {
    const response = await api.get('/api/protected/notifications/settings');
    return response.data;
  },
  
  updateSettings: async (settings: any) => {
    const response = await api.put('/api/protected/notifications/settings', settings);
    return response.data;
  },
  
  getHistory: async (params?: any) => {
    const response = await api.get('/api/protected/notifications/history', { params });
    return response.data;
  },
};

export default api;
