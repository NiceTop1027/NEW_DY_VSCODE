// public/js/search.js
// Advanced search with Fuse.js

import Fuse from 'fuse.js';

class SearchEngine {
  constructor() {
    this.fuse = null;
    this.files = [];
  }

  // Initialize search with file list
  initialize(fileList) {
    this.files = fileList;
        
    // Configure Fuse.js
    const options = {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'path', weight: 0.3 }
      ],
      threshold: 0.4, // 0 = perfect match, 1 = match anything
      distance: 100,
      minMatchCharLength: 1,
      includeScore: true,
      includeMatches: true,
      useExtendedSearch: true
    };

    this.fuse = new Fuse(this.files, options);
  }

  // Search files
  search(query) {
    if (!this.fuse || !query) {
      return this.files;
    }

    const results = this.fuse.search(query);
        
    return results.map(result => ({
      ...result.item,
      score: result.score,
      matches: result.matches
    }));
  }

  // Fuzzy search (allows typos)
  fuzzySearch(query) {
    if (!this.fuse || !query) {
      return this.files;
    }

    // Use extended search syntax
    const results = this.fuse.search(`'${query}`); // ' prefix for fuzzy
        
    return results.map(result => ({
      ...result.item,
      score: result.score,
      matches: result.matches
    }));
  }

  // Search by extension
  searchByExtension(extension) {
    return this.files.filter(file => 
      file.name.endsWith(`.${extension}`)
    );
  }

  // Search in path
  searchInPath(pathQuery) {
    if (!this.fuse || !pathQuery) {
      return this.files;
    }

    const results = this.fuse.search({
      path: pathQuery
    });
        
    return results.map(result => result.item);
  }

  // Get recently modified files
  getRecentFiles(limit = 10) {
    return [...this.files]
      .sort((a, b) => (b.modified || 0) - (a.modified || 0))
      .slice(0, limit);
  }

  // Get files by type
  getFilesByType(type) {
    const typeMap = {
      'code': ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'rb'],
      'web': ['html', 'css', 'scss', 'sass', 'less'],
      'data': ['json', 'xml', 'yaml', 'yml', 'csv'],
      'doc': ['md', 'txt', 'pdf', 'doc', 'docx'],
      'image': ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'],
      'config': ['config', 'conf', 'ini', 'env', 'toml']
    };

    const extensions = typeMap[type] || [];
        
    return this.files.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      return extensions.includes(ext);
    });
  }

  // Highlight matches in text
  highlightMatches(text, matches) {
    if (!matches || matches.length === 0) {
      return text;
    }

    let result = text;
    const highlights = [];

    matches.forEach(match => {
      match.indices.forEach(([start, end]) => {
        highlights.push({ start, end });
      });
    });

    // Sort by start position (descending) to avoid offset issues
    highlights.sort((a, b) => b.start - a.start);

    highlights.forEach(({ start, end }) => {
      result = 
                result.slice(0, start) +
                '<mark>' +
                result.slice(start, end + 1) +
                '</mark>' +
                result.slice(end + 1);
    });

    return result;
  }

  // Update file list
  updateFiles(fileList) {
    this.initialize(fileList);
  }

  // Add file
  addFile(file) {
    this.files.push(file);
    this.initialize(this.files);
  }

  // Remove file
  removeFile(path) {
    this.files = this.files.filter(f => f.path !== path);
    this.initialize(this.files);
  }
}

// Export singleton
export const searchEngine = new SearchEngine();
export default searchEngine;
