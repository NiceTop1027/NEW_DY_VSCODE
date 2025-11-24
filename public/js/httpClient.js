// public/js/httpClient.js
// HTTP client with Axios

import axios from 'axios';
import { showNotification } from './utils.js';

// Create axios instance with defaults
const httpClient = axios.create({
  baseURL: window.location.origin,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
httpClient.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now()
    };
        
    // Add GitHub token if available
    const githubToken = localStorage.getItem('github_token');
    if (githubToken && config.url.includes('github')) {
      config.headers.Authorization = `Bearer ${githubToken}`;
    }
        
    console.log(`📤 ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
httpClient.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    const { config, response } = error;
        
    // Log error
    console.error(`❌ ${config?.method?.toUpperCase()} ${config?.url} - ${response?.status || 'Network Error'}`);
        
    // Handle specific error codes
    if (response) {
      switch (response.status) {
      case 401:
        showNotification('인증이 필요합니다', 'error');
        // Clear invalid token
        if (config.url.includes('github')) {
          localStorage.removeItem('github_token');
        }
        break;
                    
      case 403:
        showNotification('접근이 거부되었습니다', 'error');
        break;
                    
      case 404:
        showNotification('요청한 리소스를 찾을 수 없습니다', 'error');
        break;
                    
      case 429:
        showNotification('요청이 너무 많습니다. 잠시 후 다시 시도하세요', 'warning');
        break;
                    
      case 500:
      case 502:
      case 503:
        showNotification('서버 오류가 발생했습니다', 'error');
        break;
                    
      default:
        if (response.status >= 400) {
          showNotification(`오류: ${response.data?.message || response.statusText}`, 'error');
        }
      }
    } else if (error.code === 'ECONNABORTED') {
      showNotification('요청 시간이 초과되었습니다', 'error');
    } else if (error.message === 'Network Error') {
      showNotification('네트워크 연결을 확인하세요', 'error');
    }
        
    // Retry logic for specific errors
    if (!config._retry && shouldRetry(error)) {
      config._retry = true;
      config._retryCount = (config._retryCount || 0) + 1;
            
      if (config._retryCount <= 3) {
        console.log(`🔄 Retrying request (${config._retryCount}/3)...`);
                
        // Exponential backoff
        const delay = Math.pow(2, config._retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
                
        return httpClient(config);
      }
    }
        
    return Promise.reject(error);
  }
);

// Helper: Determine if request should be retried
function shouldRetry(error) {
  if (!error.config) return false;
    
  // Don't retry on client errors (4xx)
  if (error.response && error.response.status >= 400 && error.response.status < 500) {
    return false;
  }
    
  // Retry on network errors, timeouts, and 5xx errors
  return (
    error.code === 'ECONNABORTED' ||
        error.message === 'Network Error' ||
        !error.response ||
        (error.response.status >= 500 && error.response.status < 600)
  );
}

// Convenience methods
export const http = {
  get: (url, config) => httpClient.get(url, config),
  post: (url, data, config) => httpClient.post(url, data, config),
  put: (url, data, config) => httpClient.put(url, data, config),
  delete: (url, config) => httpClient.delete(url, config),
  patch: (url, data, config) => httpClient.patch(url, data, config),
    
  // Upload with progress
  upload: (url, formData, onProgress) => {
    return httpClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onProgress) {
          onProgress(percentCompleted);
        }
      }
    });
  },
    
  // Download with progress
  download: (url, onProgress) => {
    return httpClient.get(url, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onProgress) {
          onProgress(percentCompleted);
        }
      }
    });
  },
    
  // Cancel token
  createCancelToken: () => axios.CancelToken.source(),
    
  // Check if error is cancel
  isCancel: (error) => axios.isCancel(error)
};

export default http;
