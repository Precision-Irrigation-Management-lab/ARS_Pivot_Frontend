import axios from 'axios';

// Configure environment-specific base URLs
const API_CONFIG = {
  // Use AWS endpoint in production, localhost in development
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://ec2-3-143-251-59.us-east-2.compute.amazonaws.com' 
    : 'http://localhost:8000',
  
  // Service-specific endpoints
  SERVICES: {
    USER: '/user',
    PIVOT: '/pivot',
    ACCLIMA: '/acclima',
    DATA_UPLOAD: '/data-upload'
  },
  
  // Request timeout in milliseconds
  TIMEOUT: 10000,
  
  // Default headers
  HEADERS: {
    'Content-Type': 'application/json'
  }
};

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS
});

// Add request interceptor for authentication
apiClient.interceptors.request.use(
  config => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// API functions for farms
export const farmAPI = {
  getFarms: (userId) => apiClient.get(`${API_CONFIG.SERVICES.USER}/farms/${userId}`),
  createFarm: (farmData) => apiClient.post(`${API_CONFIG.SERVICES.USER}/farms`, farmData)
};

// API functions for irrigation systems
export const irrigationAPI = {
  getCenterPivots: (farmId) => apiClient.get(`${API_CONFIG.SERVICES.PIVOT}/centerpivots/${farmId}`),
  createCenterPivot: (pivotData) => apiClient.post(`${API_CONFIG.SERVICES.PIVOT}/centerpivots`, pivotData),
  getLinearMoves: (farmId) => apiClient.get(`${API_CONFIG.SERVICES.PIVOT}/linearmoves/${farmId}`),
  createLinearMove: (linearData) => apiClient.post(`${API_CONFIG.SERVICES.PIVOT}/linearmoves`, linearData),
  getMicroIrrigation: (farmId) => apiClient.get(`${API_CONFIG.SERVICES.PIVOT}/microirrigation/${farmId}`),
  createMicroIrrigation: (microData) => apiClient.post(`${API_CONFIG.SERVICES.PIVOT}/microirrigation`, microData),
  generateGeojsonFromXml: (data) => apiClient.post(`${API_CONFIG.SERVICES.PIVOT}/generate-centerpivot-geojson-from-xml`, data)
};

// API functions for user authentication
export const authAPI = {
  login: (credentials) => apiClient.post(`${API_CONFIG.SERVICES.USER}/token`, credentials),
  register: (userData) => apiClient.post(`${API_CONFIG.SERVICES.USER}/register`, userData),
  getUserInfo: () => apiClient.get(`${API_CONFIG.SERVICES.USER}/users/me`)
};

// API functions for data upload
export const dataAPI = {
  uploadCanopyData: (formData) => {
    return apiClient.post(`${API_CONFIG.SERVICES.DATA_UPLOAD}/upload-canopy-csv/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

// API functions for Acclima soil moisture sensors
export const acclimaAPI = {
  // Gateway and nodes
  getGateways: (userId) => apiClient.get(`${API_CONFIG.SERVICES.ACCLIMA}/tdrcred/${userId}`),
  getNodeData: (userId, gatewayId, nodeId) => 
    apiClient.get(`${API_CONFIG.SERVICES.ACCLIMA}/node/userid/${userId}/gatewayid/${gatewayId}/nodeid/${nodeId}`),
  
  // Sensor data
  getAllData: (userId, nodeId, startDate, endDate) => 
    apiClient.get(`${API_CONFIG.SERVICES.ACCLIMA}/data/userid/${userId}/nodeid/${nodeId}/all`, {
      params: { start_date: startDate, end_date: endDate }
    }),
  
  getAvgSwdData: (userId, nodeId, startDate, endDate) => 
    apiClient.get(`${API_CONFIG.SERVICES.ACCLIMA}/data/userid/${userId}/nodeid/${nodeId}/avg-swd`, {
      params: { start_date: startDate, end_date: endDate }
    }),
  
  getSensorData: (userId, nodeId, sensorAddress, startDate, endDate) => 
    apiClient.get(`${API_CONFIG.SERVICES.ACCLIMA}/data/userid/${userId}/nodeid/${nodeId}/sensoraddress/${sensorAddress}/startdate/${startDate}/enddate/${endDate}`)
};

// Search API functions (OpenStreetMap)
export const searchAPI = {
  searchLocation: (query) => 
    axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
};

export default {
  farmAPI,
  irrigationAPI,
  authAPI,
  dataAPI,
  acclimaAPI,
  searchAPI,
  API_CONFIG
};
