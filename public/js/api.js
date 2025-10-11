// public/js/api.js
const API_BASE = window.API_CONFIG?.BASE_URL || ''; // Assuming API is on the same origin

export async function fetchFileTree() {
    const res = await fetch(`${API_BASE}/api/files`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // API functions for communicating with the backend
    return res.json();
}

export async function listFiles(directoryPath = '') {
    const response = await fetch(`${API_BASE}/api/files?path=${encodeURIComponent(directoryPath)}`);
    return response.json();
}

export async function saveFile(filePath, content) {
    const res = await fetch(`${API_BASE}/api/save-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/api/upload-file`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}