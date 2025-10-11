// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://web-production-87bbd.up.railway.app';

window.API_CONFIG = {
    BASE_URL: API_BASE_URL,
    GITHUB_CALLBACK_URL: `${API_BASE_URL}/api/github/callback`
};
