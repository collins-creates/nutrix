class SearchManager {
  constructor() {
    this.currentQuery = '';
    this.currentPage = 1;
    this.pageSize = 20;
    this.isSearching = false;
    this.searchTimeout = null;
    this.autocompleteTimeout = null;
    
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Search input
    ui.elements.searchInput.addEventListener('input', (e) => {
      this.handleSearchInput(e.target.value);
    });

    ui.elements.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.performSearch(e.target.value);
      } else if (e.key === 'Escape') {
        ui.hideAutocomplete();
      }
    });

    // Search button
    ui.elements.searchButton.addEventListener('click', () => {
      this.performSearch(ui.elements.searchInput.value);
    });

    // Custom search event
    ui.elements.searchInput.addEventListener('search', (e) => {
      this.performSearch(e.target.value);
    });

    // Autocomplete navigation
    document.addEventListener('keydown', (e) => {
      this.handleAutocompleteNavigation(e);
    });

    // Click outside to close autocomplete
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrapper')) {
        ui.hideAutocomplete();
      }
    });

    // Filters
    ui.elements.pageSize.addEventListener('change', (e) => {
      this.pageSize = parseInt(e.target.value);
      storage.setPreference('pageSize', this.pageSize);
      if (this.currentQuery) {
        this.performSearch(this.currentQuery);
      }
    });

    ui.elements.dataSource.addEventListener('change', (e) => {
      storage.setPreference('dataSource', e.target.value);
      if (this.currentQuery) {
        this.performSearch(this.currentQuery);
      }
    });

    // Pagination
    ui.elements.prevPage.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.performSearch(this.currentQuery, false);
      }
    });

    ui.elements.nextPage.addEventListener('click', () => {
      this.currentPage++;
      this.performSearch(this.currentQuery, false);
    });

    // Load preferences
    this.loadPreferences();
  }

  loadPreferences() {
    const preferences = storage.getPreferences();
    this.pageSize = preferences.pageSize;
    ui.elements.pageSize.value = this.pageSize;
    ui.elements.dataSource.value = preferences.dataSource;
  }

  handleSearchInput(query) {
    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce search
    this.searchTimeout = setTimeout(() => {
      if (query.trim().length >= 2) {
        this.fetchAutocomplete(query);
      } else {
        ui.hideAutocomplete();
      }
    }, 300);

    // Update current query for immediate search
    this.currentQuery = query;
  }

  async fetchAutocomplete(query) {
    try {
      const limit = 10;
      const response = await api.getAutocompleteSuggestions(query, limit);
      
      if (response.success && response.data) {
        ui.showAutocomplete(response.data);
      } else {
        ui.hideAutocomplete();
      }
    } catch (error) {
      console.warn('Autocomplete failed:', error);
      ui.hideAutocomplete();
    }
  }

  handleAutocompleteNavigation(e) {
    const items = ui.elements.autocompleteList.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;

    let currentIndex = -1;
    items.forEach((item, index) => {
      if (item.classList.contains('selected')) {
        currentIndex = index;
      }
    });

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[currentIndex]?.classList.remove('selected');
      currentIndex = Math.min(currentIndex + 1, items.length - 1);
      items[currentIndex]?.classList.add('selected');
      items[currentIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[currentIndex]?.classList.remove('selected');
      currentIndex = Math.max(currentIndex - 1, 0);
      items[currentIndex]?.classList.add('selected');
      items[currentIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && currentIndex >= 0) {
      e.preventDefault();
      const selectedItem = items[currentIndex];
      const suggestionText = selectedItem.querySelector('strong').textContent;
      ui.elements.searchInput.value = suggestionText;
      ui.hideAutocomplete();
      this.performSearch(suggestionText);
    }
  }

  async performSearch(query, resetPage = true) {
    if (!query || query.trim().length < 2) {
      ui.showError('Please enter at least 2 characters to search');
      return;
    }

    if (this.isSearching) {
      return;
    }

    this.isSearching = true;
    ui.hideAutocomplete();
    
    if (resetPage) {
      this.currentPage = 1;
    }

    // Update UI state
    ui.elements.searchButton.disabled = true;
    ui.elements.searchButton.innerHTML = '<span class="search-icon"> Searching...</span>';
    
    try {
      // Add to recent searches
      storage.addRecentSearch(query);
      ui.showRecentSearches(storage.getRecentSearches());

      // Perform search
      const response = await api.searchFoods(query, this.pageSize, this.currentPage);
      
      if (response.success) {
        this.currentQuery = query;
        ui.showResults(response.data, query);
        
        // Hide empty state and show results
        ui.hideEmptyState();
        
        // Scroll to results
        ui.elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        throw new Error(response.message || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      ui.showError(error.message || 'Search failed. Please try again.');
      ui.showEmptyState();
    } finally {
      this.isSearching = false;
      ui.elements.searchButton.disabled = false;
      ui.elements.searchButton.innerHTML = '<span class="search-icon">search</span>';
    }
  }

  async searchById(foodId) {
    try {
      ui.showLoading();
      
      const response = await api.getFoodDetails(foodId);
      
      if (response.success) {
        ui.showFoodModal(response.data);
      } else {
        throw new Error(response.message || 'Food not found');
      }
    } catch (error) {
      console.error('Food details error:', error);
      ui.showError(error.message || 'Failed to load food details');
    } finally {
      ui.hideLoading();
    }
  }

  clearSearch() {
    ui.elements.searchInput.value = '';
    this.currentQuery = '';
    this.currentPage = 1;
    ui.hideAutocomplete();
    ui.elements.resultsSection.classList.add('hidden');
    ui.hideEmptyState();
  }

  // Advanced search methods
  async searchWithFilters(query, filters = {}) {
    const params = {
      q: query,
      pageSize: filters.pageSize || this.pageSize,
      pageNumber: filters.pageNumber || this.currentPage
    };

    // Add data source filter if specified
    if (filters.dataSource && filters.dataSource !== 'all') {
      params.dataSource = filters.dataSource;
    }

    try {
      const response = await api.searchFoods(query, params.pageSize, params.pageNumber);
      
      if (response.success) {
        // Filter results if needed
        let filteredResults = response.data.foods;
        if (filters.dataSource && filters.dataSource !== 'all') {
          filteredResults = filteredResults.filter(food => 
            food.dataType.toLowerCase() === filters.dataSource.toLowerCase()
          );
        }

        return {
          ...response.data,
          foods: filteredResults,
          totalHits: filteredResults.length
        };
      }
      
      throw new Error(response.message || 'Search failed');
    } catch (error) {
      console.error('Advanced search error:', error);
      throw error;
    }
  }

  // Search suggestions based on recent searches and bookmarks
  getSmartSuggestions(query) {
    const recentSearches = storage.getRecentSearches();
    const bookmarks = storage.getBookmarks();
    const suggestions = new Set();

    // Add matching recent searches
    recentSearches.forEach(search => {
      if (search.includes(query.toLowerCase()) && search !== query.toLowerCase()) {
        suggestions.add(search);
      }
    });

    // Add matching bookmark descriptions
    bookmarks.forEach(bookmark => {
      if (bookmark.description.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(bookmark.description);
      }
    });

    return Array.from(suggestions).slice(0, 5);
  }

  // Search analytics
  trackSearch(query, resultsCount, searchTime) {
    const analytics = storage.get('searchAnalytics', {
      totalSearches: 0,
      averageResults: 0,
      averageTime: 0,
      popularQueries: {}
    });

    analytics.totalSearches++;
    analytics.averageResults = ((analytics.averageResults * (analytics.totalSearches - 1)) + resultsCount) / analytics.totalSearches;
    analytics.averageTime = ((analytics.averageTime * (analytics.totalSearches - 1)) + searchTime) / analytics.totalSearches;

    // Track popular queries
    if (!analytics.popularQueries[query]) {
      analytics.popularQueries[query] = 0;
    }
    analytics.popularQueries[query]++;

    storage.set('searchAnalytics', analytics);
  }

  // Export search history
  exportSearchHistory() {
    const recentSearches = storage.getRecentSearches();
    const analytics = storage.get('searchAnalytics', {});
    
    return {
      recentSearches,
      analytics,
      exportedAt: new Date().toISOString()
    };
  }

  // Clear search history
  clearSearchHistory() {
    storage.clearRecentSearches();
    storage.remove('searchAnalytics');
    ui.showRecentSearches([]);
  }
}

// Create singleton instance
const searchManager = new SearchManager();
window.searchManager = searchManager;
