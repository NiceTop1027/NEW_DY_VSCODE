// public/js/gitClient.js
// Modern Git client using isomorphic-git

import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import FS from '@isomorphic-git/lightning-fs';

// Initialize file system
const fs = new FS('git-fs');

class GitClient {
  constructor() {
    this.fs = fs;
    this.dir = '/workspace';
    this.corsProxy = 'https://cors.isomorphic-git.org';
  }

  // Clear workspace directory
  async clearWorkspace() {
    try {
      console.log('🧹 Clearing workspace...');

      // Check if directory exists
      try {
        const files = await this.fs.promises.readdir(this.dir);

        // Delete all files and directories
        for (const file of files) {
          const fullPath = `${this.dir}/${file}`;
          try {
            const stat = await this.fs.promises.stat(fullPath);
            if (stat.isDirectory()) {
              await this.deleteDirRecursive(fullPath);
            } else {
              await this.fs.promises.unlink(fullPath);
            }
          } catch (err) {
            console.warn(`Could not delete ${fullPath}:`, err.message);
          }
        }

        console.log('✅ Workspace cleared');
      } catch (err) {
        // Directory doesn't exist, create it
        console.log('📁 Creating workspace directory');
        await this.fs.promises.mkdir(this.dir, { recursive: true });
      }
    } catch (error) {
      console.error('Clear workspace error:', error);
      // Don't throw, just log - we'll try to clone anyway
    }
  }

  // Helper: Delete directory recursively
  async deleteDirRecursive(dirPath) {
    const files = await this.fs.promises.readdir(dirPath);

    for (const file of files) {
      const fullPath = `${dirPath}/${file}`;
      const stat = await this.fs.promises.stat(fullPath);

      if (stat.isDirectory()) {
        await this.deleteDirRecursive(fullPath);
      } else {
        await this.fs.promises.unlink(fullPath);
      }
    }

    await this.fs.promises.rmdir(dirPath);
  }

  // Clone repository
  async clone(url, token = null) {
    try {
      console.log('🔧 GitClient.clone() 시작');
      console.log('   URL:', url);
      console.log('   Token 존재:', !!token);
      console.log('   Token 길이:', token ? token.length : 0);

      // Clear workspace before cloning
      await this.clearWorkspace();

      // Prepare auth callback
      const onAuth = token ? () => {
        console.log('🔐 onAuth 콜백 호출됨');
        return {
          username: token,
          password: 'x-oauth-basic'
        };
      } : undefined;

      console.log('📡 isomorphic-git.clone() 호출...');

      await git.clone({
        fs: this.fs,
        http,
        dir: this.dir,
        url,
        corsProxy: this.corsProxy,
        singleBranch: true,
        depth: 1,
        onAuth,
        onProgress: (progress) => {
          console.log(`📦 Clone progress: ${progress.phase} ${progress.loaded}/${progress.total || '?'}`);
        },
        onMessage: (message) => {
          console.log('💬 Git message:', message);
        },
        onAuthFailure: ({ url, auth }) => {
          console.error('❌ Auth failed for:', url);
          console.error('   Auth method:', auth);
          throw new Error('GitHub authentication failed. Please check your token.');
        }
      });

      console.log('✅ Clone 완료!');
      return { success: true, message: 'Repository cloned successfully' };
    } catch (error) {
      console.error('❌ Clone error:', error);
      console.error('   Error name:', error.name);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);

      // Provide more helpful error messages
      let userMessage = error.message;

      if (error.message.includes('401') || error.message.includes('authentication')) {
        userMessage = 'GitHub authentication failed (401). Your token may be invalid or expired.';
      } else if (error.message.includes('404')) {
        userMessage = 'Repository not found (404). Check if the repository exists and you have access.';
      } else if (error.message.includes('403')) {
        userMessage = 'Access forbidden (403). Your token may not have the required "repo" permission.';
      } else if (error.message.includes('CORS')) {
        userMessage = 'CORS error. This is usually a temporary issue with the proxy server.';
      }

      throw new Error(userMessage);
    }
  }

  // Add files to staging
  async add(filepath = '.') {
    try {
      await git.add({
        fs: this.fs,
        dir: this.dir,
        filepath
      });
      return { success: true };
    } catch (error) {
      console.error('Add error:', error);
      throw new Error(`Add failed: ${error.message}`);
    }
  }

  // Commit changes
  async commit(message, author = { name: 'User', email: 'user@example.com' }) {
    try {
      const sha = await git.commit({
        fs: this.fs,
        dir: this.dir,
        message,
        author
      });
      return { success: true, sha };
    } catch (error) {
      console.error('Commit error:', error);
      throw new Error(`Commit failed: ${error.message}`);
    }
  }

  // Push changes
  async push(token, remote = 'origin', branch = 'main') {
    try {
      const onAuth = () => ({
        username: token,
        password: 'x-oauth-basic'
      });
            
      const result = await git.push({
        fs: this.fs,
        http,
        dir: this.dir,
        remote,
        ref: branch,
        corsProxy: this.corsProxy,
        onAuth,
        onProgress: (progress) => {
          console.log(`Push progress: ${progress.phase} ${progress.loaded}/${progress.total}`);
        }
      });
      return { success: true, result };
    } catch (error) {
      console.error('Push error:', error);
      throw new Error(`Push failed: ${error.message}`);
    }
  }

  // Pull changes
  async pull(token, remote = 'origin', branch = 'main') {
    try {
      const onAuth = () => ({
        username: token,
        password: 'x-oauth-basic'
      });
            
      await git.pull({
        fs: this.fs,
        http,
        dir: this.dir,
        ref: branch,
        corsProxy: this.corsProxy,
        onAuth,
        author: { name: 'User', email: 'user@example.com' }
      });
      return { success: true };
    } catch (error) {
      console.error('Pull error:', error);
      throw new Error(`Pull failed: ${error.message}`);
    }
  }

  // Get status
  async status() {
    try {
      const status = await git.statusMatrix({
        fs: this.fs,
        dir: this.dir
      });

      const changes = {
        modified: [],
        added: [],
        deleted: [],
        untracked: []
      };

      for (const [filepath, headStatus, workdirStatus, stageStatus] of status) {
        if (headStatus === 1 && workdirStatus === 2 && stageStatus === 1) {
          changes.modified.push(filepath);
        } else if (headStatus === 0 && workdirStatus === 2 && stageStatus === 0) {
          changes.untracked.push(filepath);
        } else if (headStatus === 1 && workdirStatus === 0 && stageStatus === 1) {
          changes.deleted.push(filepath);
        } else if (headStatus === 0 && workdirStatus === 2 && stageStatus === 2) {
          changes.added.push(filepath);
        }
      }

      return changes;
    } catch (error) {
      console.error('Status error:', error);
      throw new Error(`Status failed: ${error.message}`);
    }
  }

  // Get log
  async log(depth = 10) {
    try {
      const commits = await git.log({
        fs: this.fs,
        dir: this.dir,
        depth
      });
      return commits;
    } catch (error) {
      console.error('Log error:', error);
      throw new Error(`Log failed: ${error.message}`);
    }
  }

  // Read file
  async readFile(filepath) {
    try {
      const data = await this.fs.promises.readFile(`${this.dir}/${filepath}`, { encoding: 'utf8' });
      return data;
    } catch (error) {
      console.error('Read file error:', error);
      throw new Error(`Read file failed: ${error.message}`);
    }
  }

  // Write file
  async writeFile(filepath, content) {
    try {
      await this.fs.promises.writeFile(`${this.dir}/${filepath}`, content, { encoding: 'utf8' });
      return { success: true };
    } catch (error) {
      console.error('Write file error:', error);
      throw new Error(`Write file failed: ${error.message}`);
    }
  }

  // List files
  async listFiles(dirpath = '') {
    try {
      const fullPath = dirpath ? `${this.dir}/${dirpath}` : this.dir;
      const files = await this.fs.promises.readdir(fullPath);
      return files;
    } catch (error) {
      console.error('List files error:', error);
      throw new Error(`List files failed: ${error.message}`);
    }
  }

  // Get current branch
  async currentBranch() {
    try {
      const branch = await git.currentBranch({
        fs: this.fs,
        dir: this.dir,
        fullname: false
      });
      return branch;
    } catch (error) {
      console.error('Current branch error:', error);
      return 'main';
    }
  }
}

// Export singleton instance
export const gitClient = new GitClient();
export default gitClient;
