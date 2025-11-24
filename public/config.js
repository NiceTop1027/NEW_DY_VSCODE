// API Configuration
// Railway serves both frontend and backend from the same domain
const API_BASE_URL = window.location.origin;

window.API_CONFIG = {
  BASE_URL: API_BASE_URL,
  GITHUB_CALLBACK_URL: `${API_BASE_URL}/api/github/callback`
};
