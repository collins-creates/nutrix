class Storage {
  constructor() {
    this.prefix = 'nutrix_';
    this.maxRecentSearches = 10;
    this.maxBookmarks = 50;
  }

  // Generic storage methods
  set(key, value) {
    try {
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(`${this.prefix}${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return defaultValue;
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(`${this.prefix}${key}`);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  // Theme management
  getTheme() {
    return this.get('theme', 'light');
  }

  setTheme(theme) {
    this.set('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  toggleTheme() {
    const currentTheme = this.getTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }

  // Recent searches
  getRecentSearches() {
    return this.get('recentSearches', []);
  }

  addRecentSearch(query) {
    if (!query || query.trim().length < 2) return;

    const searches = this.getRecentSearches();
    const cleanedQuery = query.trim().toLowerCase();
    
    // Remove if already exists
    const filteredSearches = searches.filter(search => search !== cleanedQuery);
    
    // Add to beginning
    filteredSearches.unshift(cleanedQuery);
    
    // Limit to max size
    const limitedSearches = filteredSearches.slice(0, this.maxRecentSearches);
    
    this.set('recentSearches', limitedSearches);
    return limitedSearches;
  }

  clearRecentSearches() {
    this.remove('recentSearches');
  }

  // Bookmarks
  getBookmarks() {
    return this.get('bookmarks', []);
  }

  addBookmark(food) {
    const bookmarks = this.getBookmarks();
    
    // Check if already bookmarked
    const exists = bookmarks.some(bookmark => bookmark.fdcId === food.fdcId);
    if (exists) return bookmarks;

    const bookmark = {
      fdcId: food.fdcId,
      description: food.description,
      brandOwner: food.brandOwner || '',
      dataType: food.dataType,
      macros: food.macros,
      calories: food.calories,
      addedAt: new Date().toISOString()
    };

    bookmarks.unshift(bookmark);
    
    // Limit to max size
    const limitedBookmarks = bookmarks.slice(0, this.maxBookmarks);
    
    this.set('bookmarks', limitedBookmarks);
    return limitedBookmarks;
  }

  removeBookmark(fdcId) {
    const bookmarks = this.getBookmarks();
    const filteredBookmarks = bookmarks.filter(bookmark => bookmark.fdcId !== fdcId);
    this.set('bookmarks', filteredBookmarks);
    return filteredBookmarks;
  }

  isBookmarked(fdcId) {
    const bookmarks = this.getBookmarks();
    return bookmarks.some(bookmark => bookmark.fdcId === fdcId);
  }

  clearBookmarks() {
    this.remove('bookmarks');
  }

  // Comparison
  getCompareList() {
    return this.get('compareList', []);
  }

  addToCompare(food) {
    const compareList = this.getCompareList();
    
    // Check if already in compare list
    const exists = compareList.some(item => item.fdcId === food.fdcId);
    if (exists) return compareList;

    // Limit to 2 items
    if (compareList.length >= 2) {
      compareList.shift();
    }

    const compareItem = {
      fdcId: food.fdcId,
      description: food.description,
      brandOwner: food.brandOwner || '',
      dataType: food.dataType,
      macros: food.macros,
      calories: food.calories,
      addedAt: new Date().toISOString()
    };

    compareList.push(compareItem);
    this.set('compareList', compareList);
    return compareList;
  }

  removeFromCompare(fdcId) {
    const compareList = this.getCompareList();
    const filteredList = compareList.filter(item => item.fdcId !== fdcId);
    this.set('compareList', filteredList);
    return filteredList;
  }

  clearCompareList() {
    this.remove('compareList');
  }

  // User preferences
  getPreferences() {
    return this.get('preferences', {
      pageSize: 20,
      dataSource: 'all',
      autoSaveBookmarks: true,
      showNutrientDetails: false
    });
  }

  setPreference(key, value) {
    const preferences = this.getPreferences();
    preferences[key] = value;
    this.set('preferences', preferences);
  }

  // Storage usage
  getStorageUsage() {
    try {
      let total = 0;
      for (let key in localStorage) {
        if (key.startsWith(this.prefix)) {
          total += localStorage[key].length;
        }
      }
      return {
        used: total,
        usedFormatted: this.formatBytes(total),
        available: 5 * 1024 * 1024 - total, // ~5MB typical limit
        availableFormatted: this.formatBytes(5 * 1024 * 1024 - total)
      };
    } catch (error) {
      return { used: 0, usedFormatted: '0 B', available: 0, availableFormatted: '0 B' };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Export/Import
  exportData() {
    try {
      const data = {
        theme: this.getTheme(),
        recentSearches: this.getRecentSearches(),
        bookmarks: this.getBookmarks(),
        compareList: this.getCompareList(),
        preferences: this.getPreferences(),
        exportedAt: new Date().toISOString()
      };
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.theme) this.setTheme(data.theme);
      if (data.recentSearches) this.set('recentSearches', data.recentSearches);
      if (data.bookmarks) this.set('bookmarks', data.bookmarks);
      if (data.compareList) this.set('compareList', data.compareList);
      if (data.preferences) this.set('preferences', data.preferences);
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Clear all data
  clearAllData() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }
}

// Create singleton instance
const storage = new Storage();
window.storage = storage;
