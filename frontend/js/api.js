class API {
  constructor() {
    this.baseURL = window.location.origin + '/api';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async request(endpoint, options = {}) {
    let url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${endpoint}${JSON.stringify(options.params || {})}`;
    
    // Check cache for GET requests
    if (!options.method || options.method === 'GET') {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      };

      if (options.params) {
        const params = new URLSearchParams();
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value);
          }
        });
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache successful GET requests
      if (!options.method || options.method === 'GET') {
        this.setCache(cacheKey, data);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // Search methods
  async searchFoods(query, pageSize = 20, pageNumber = 1) {
    return this.request('/search', {
      params: { q: query, pageSize, pageNumber }
    });
  }

  async getAutocompleteSuggestions(query, limit = 10) {
    return this.request('/autocomplete', {
      params: { q: query, limit }
    });
  }

  async getFoodDetails(foodId) {
    return this.request(`/food/${foodId}`);
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create singleton instance
const api = new API();
window.api = api;
