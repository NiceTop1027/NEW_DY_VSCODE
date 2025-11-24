// public/js/api.js
// API functions using Axios

import http from './httpClient.js';

export async function fetchFileTree() {
  const response = await http.get('/api/files');
  return response.data;
}

export async function listFiles(directoryPath = '') {
  const response = await http.get('/api/files', {
    params: { path: directoryPath }
  });
  return response.data;
}

export async function fetchFileContent(filePath) {
  const response = await http.get('/api/file-content', {
    params: { path: filePath }
  });
  return response.data;
}

export async function saveFile(filePath, content) {
  const response = await http.post('/api/save-file', {
    path: filePath,
    content
  });
  return response.data;
}

export async function uploadFile(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await http.upload('/api/upload-file', formData, onProgress);
  return response.data;
}

// GitHub API functions
export async function githubCloneRepo(owner, repo, token) {
  const sessionId = localStorage.getItem('terminalSessionId');

  const response = await http.post('/api/github/clone', {
    owner,
    repo,
    sessionId
  }, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.data;
}

export async function githubPush(repoPath, message, token, files = null) {
  const sessionId = localStorage.getItem('terminalSessionId');

  const response = await http.post('/api/github/push', {
    repoPath,
    message,
    sessionId,
    files
  }, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.data;
}

export async function githubGetRepos(token) {
  const response = await http.get('/api/github/repos', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.data;
}