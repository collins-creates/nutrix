// Main application controller
class NutrixApp {
  constructor() {
    this.isInitialized = false;
    this.initializeApp();
  }

  async initializeApp() {
    try {
      console.log('Initializing Nutrix App...');
      
      // Initialize theme
      this.initializeTheme();
      
      // Initialize UI components
      this.initializeUI();
      
      // Load saved data
      this.loadSavedData();
      
      // Check API health
      await this.checkAPIHealth();
      
      // Set up global error handling
      this.setupErrorHandling();
      
      // Hide loading screen
      ui.hideLoading();
      
      this.isInitialized = true;
      console.log('Nutrix App initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      ui.showError('Failed to initialize application. Please refresh the page.');
      ui.hideLoading();
    }
  }

  initializeTheme() {
    const savedTheme = storage.getTheme();
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  initializeUI() {
    // Show recent searches if available
    const recentSearches = storage.getRecentSearches();
    if (recentSearches.length > 0) {
      ui.showRecentSearches(recentSearches);
    }

    // Show bookmarks if available
    const bookmarks = storage.getBookmarks();
    if (bookmarks.length > 0) {
      ui.showBookmarks(bookmarks);
    }

    // Show compare section if items exist
    const compareList = storage.getCompareList();
    if (compareList.length > 0) {
      compareManager.showCompareSection();
    }

    // Set up modal event listeners
    this.setupModalListeners();
  }

  setupModalListeners() {
    // Bookmark button in modal
    ui.elements.bookmarkFood.addEventListener('click', () => {
      this.toggleBookmark();
    });

    // Add to compare button in modal
    ui.elements.addToCompare.addEventListener('click', () => {
      compareManager.addCurrentFoodToCompare();
    });

    // Toggle nutrients details
    ui.elements.toggleNutrients.addEventListener('click', () => {
      this.toggleNutrientsDetails();
    });

    // Clear bookmarks
    document.getElementById('clearBookmarks')?.addEventListener('click', () => {
      this.clearAllBookmarks();
    });
  }

  loadSavedData() {
    // Load user preferences
    const preferences = storage.getPreferences();
    
    // Apply preferences
    if (preferences.pageSize) {
      ui.elements.pageSize.value = preferences.pageSize;
      searchManager.pageSize = preferences.pageSize;
    }
    
    if (preferences.dataSource) {
      ui.elements.dataSource.value = preferences.dataSource;
    }
  }

  async checkAPIHealth() {
    try {
      const response = await api.healthCheck();
      if (response.success) {
        console.log('API Health Check:', response);
        
        // Show API status in console for debugging
        if (response.data) {
          console.log('USDA API:', response.data.usdaApiKey ? 'Configured' : 'Not configured');
          console.log('Cache:', response.data.cacheStatus);
          console.log('INFOODS:', response.data.infoodsAvailable ? 'Available' : 'Not available');
        }
      }
    } catch (error) {
      console.warn('API Health Check failed:', error);
      // Don't show error to user, just log it
    }
  }

  setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      // Only show user-facing errors for critical issues
      if (event.error?.critical) {
        ui.showError('A critical error occurred. Please refresh the page.');
      }
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    });

    // Network status monitoring
    window.addEventListener('online', () => {
      console.log('Network connection restored');
      ui.hideError();
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      ui.showError('You are offline. Some features may not work.');
    });
  }

  // Modal functionality
  toggleBookmark() {
    const foodData = ui.elements.foodModal.dataset.foodData;
    if (!foodData) return;

    const food = JSON.parse(foodData);
    const isBookmarked = storage.isBookmarked(food.fdcId);

    if (isBookmarked) {
      storage.removeBookmark(food.fdcId);
      ui.elements.bookmarkFood.classList.remove('bookmarked');
      ui.elements.bookmarkFood.innerHTML = '<span class="action-icon">bookmark</span> Bookmark';
    } else {
      storage.addBookmark(food);
      ui.elements.bookmarkFood.classList.add('bookmarked');
      ui.elements.bookmarkFood.innerHTML = '<span class="action-icon">bookmark</span> Bookmarked';
    }

    // Update bookmarks display
    ui.showBookmarks(storage.getBookmarks());
  }

  toggleNutrientsDetails() {
    const isHidden = ui.elements.nutrientsList.classList.contains('hidden');
    const icon = ui.elements.toggleNutrients.querySelector('.toggle-icon');
    
    if (isHidden) {
      ui.elements.nutrientsList.classList.remove('hidden');
      icon.textContent = 'collapse_less';
    } else {
      ui.elements.nutrientsList.classList.add('hidden');
      icon.textContent = 'expand_more';
    }

    // Save preference
    storage.setPreference('showNutrientDetails', !isHidden);
  }

  clearAllBookmarks() {
    if (confirm('Are you sure you want to clear all bookmarks?')) {
      storage.clearBookmarks();
      ui.showBookmarks([]);
      ui.showError('All bookmarks cleared');
    }
  }

  // Keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K for search focus
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        ui.elements.searchInput.focus();
      }

      // Ctrl/Cmd + B for bookmarks
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        const bookmarksSection = document.getElementById('bookmarksSection');
        bookmarksSection.scrollIntoView({ behavior: 'smooth' });
      }

      // Ctrl/Cmd + / for help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        this.showHelp();
      }
    });
  }

  showHelp() {
    const helpContent = `
      <h3>Keyboard Shortcuts</h3>
      <ul>
        <li><kbd>Ctrl/Cmd + K</kbd> - Focus search</li>
        <li><kbd>Ctrl/Cmd + B</kbd> - Jump to bookmarks</li>
        <li><kbd>Ctrl/Cmd + /</kbd> - Show help</li>
        <li><kbd>Escape</kbd> - Close modal/autocomplete</li>
        <li><kbd>Enter</kbd> - Search/Select autocomplete</li>
        <li><kbd>Arrow Keys</kbd> - Navigate autocomplete</li>
      </ul>
      <h3>Tips</h3>
      <ul>
        <li>Search for any food to see nutritional information</li>
        <li>Bookmark foods for quick access</li>
        <li>Compare two foods side by side</li>
        <li>Use autocomplete for faster searching</li>
      </ul>
    `;

    // Create help modal
    const helpModal = document.createElement('div');
    helpModal.className = 'modal';
    helpModal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Help & Shortcuts</h2>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          ${helpContent}
        </div>
      </div>
    `;

    document.body.appendChild(helpModal);
    helpModal.classList.remove('hidden');

    // Close handlers
    const closeHelp = () => {
      helpModal.classList.add('hidden');
      setTimeout(() => document.body.removeChild(helpModal), 300);
    };

    helpModal.querySelector('.modal-close').addEventListener('click', closeHelp);
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) closeHelp();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeHelp();
    }, { once: true });
  }

  // Performance monitoring
  trackPerformance() {
    if ('performance' in window) {
      window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0];
        const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
        console.log(`Page load time: ${loadTime}ms`);
        
        // Track slow loads
        if (loadTime > 3000) {
          console.warn('Slow page load detected');
        }
      });
    }
  }

  // Feature detection
  detectFeatures() {
    const features = {
      localStorage: !!window.localStorage,
      fetch: !!window.fetch,
      promises: !!window.Promise,
      asyncAwait: (async () => {})() instanceof Promise,
      webp: this.detectWebPSupport(),
      intersectionObserver: !!window.IntersectionObserver,
      resizeObserver: !!window.ResizeObserver
    };

    console.log('Browser Features:', features);
    
    // Show warnings for missing features
    if (!features.localStorage) {
      ui.showError('Local storage is not available. Some features may not work.');
    }

    if (!features.fetch) {
      ui.showError('Your browser does not support modern APIs. Please upgrade to a newer browser.');
    }

    return features;
  }

  detectWebPSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  // Service worker registration (for PWA)
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.log('Service Worker registration failed:', error);
      }
    }
  }

  // App lifecycle
  async start() {
    if (this.isInitialized) {
      console.warn('App already initialized');
      return;
    }

    await this.initializeApp();
    this.setupKeyboardShortcuts();
    this.trackPerformance();
    this.detectFeatures();
    
    // Register service worker if in production
    if (window.location.hostname !== 'localhost') {
      this.registerServiceWorker();
    }

    console.log('Nutrix App started successfully');
  }

  // Cleanup
  destroy() {
    // Remove event listeners
    // Clear timeouts
    // Reset state
    console.log('Nutrix App destroyed');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new NutrixApp();
  window.nutrixApp = app;
  
  // Start the app
  app.start();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Page is hidden, pause any ongoing operations
    console.log('Page hidden');
  } else {
    // Page is visible, resume operations
    console.log('Page visible');
  }
});

// Handle before unload
window.addEventListener('beforeunload', (e) => {
  // Save any unsaved data
  // Clean up resources
  console.log('Page unloading');
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NutrixApp;
}
