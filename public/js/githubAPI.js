// Direct GitHub API Integration (No Backend Required)
// This module handles GitHub operations directly from the browser

/**
 * Get authenticated user info
 */
export async function getUser(token) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get user repositories
 */
export async function getRepositories(token) {
  const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get repository contents
 */
export async function getRepoContents(owner, repo, path = '', token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      return []; // Empty repo or path doesn't exist
    }
    throw new Error(`GitHub API Error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get file content from repository
 */
export async function getFileContent(owner, repo, path, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.status}`);
  }

  const data = await response.json();

  // Decode base64 content
  if (data.content) {
    return atob(data.content.replace(/\n/g, ''));
  }

  return '';
}

/**
 * Create or update a file in repository
 */
export async function createOrUpdateFile(owner, repo, path, content, message, token, sha = null) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const body = {
    message: message,
    content: btoa(unescape(encodeURIComponent(content))), // Properly encode UTF-8 to base64
    ...(sha && { sha }) // Include SHA if updating existing file
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `GitHub API Error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Delete a file from repository
 */
export async function deleteFile(owner, repo, path, message, sha, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const body = {
    message: message,
    sha: sha
  };

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `GitHub API Error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get the latest commit SHA for a branch
 */
export async function getLatestCommitSHA(owner, repo, branch, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.object.sha;
}

/**
 * Create a tree (for batch file operations)
 */
export async function createTree(owner, repo, baseTree, files, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees`;

  const tree = files.map(file => ({
    path: file.path,
    mode: '100644', // File mode
    type: 'blob',
    content: file.content
  }));

  const body = {
    base_tree: baseTree,
    tree: tree
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `GitHub API Error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Create a commit
 */
export async function createCommit(owner, repo, message, treeSHA, parentSHA, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/commits`;

  const body = {
    message: message,
    tree: treeSHA,
    parents: [parentSHA]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `GitHub API Error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Update branch reference to point to new commit
 */
export async function updateReference(owner, repo, branch, commitSHA, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`;

  const body = {
    sha: commitSHA,
    force: false
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `GitHub API Error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Push multiple files to repository (batch operation)
 */
export async function pushFiles(owner, repo, files, message, branch = 'main', token) {
  try {
    // 1. Get the latest commit SHA
    const latestCommitSHA = await getLatestCommitSHA(owner, repo, branch, token);

    // 2. Create a tree with all files
    const tree = await createTree(owner, repo, latestCommitSHA, files, token);

    // 3. Create a commit
    const commit = await createCommit(owner, repo, message, tree.sha, latestCommitSHA, token);

    // 4. Update the branch reference
    await updateReference(owner, repo, branch, commit.sha, token);

    return {
      success: true,
      commit: commit,
      filesCount: files.length
    };
  } catch (error) {
    console.error('Push files error:', error);
    throw error;
  }
}
