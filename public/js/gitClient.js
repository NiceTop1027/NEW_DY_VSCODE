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

    // Clone repository
    async clone(url, token = null) {
        try {
            console.log('🔧 GitClient.clone() 호출됨');
            console.log('   URL:', url);
            console.log('   Token:', token ? token.substring(0, 7) + '...' : 'null');
            
            const onAuth = token ? () => ({
                username: token,
                password: 'x-oauth-basic'
            }) : undefined;
            
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
                    console.log(`Clone progress: ${progress.phase} ${progress.loaded}/${progress.total}`);
                }
            });

            return { success: true, message: 'Repository cloned successfully' };
        } catch (error) {
            console.error('Clone error:', error);
            throw new Error(`Clone failed: ${error.message}`);
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
