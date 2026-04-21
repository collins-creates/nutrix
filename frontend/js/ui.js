class UI {
  constructor() {
    this.elements = {};
    this.initializeElements();
    this.setupEventListeners();
    this.initializeSEO();
  }

  initializeElements() {
    // Loading
    this.elements.loadingScreen = document.getElementById('loadingScreen');
    
    // Header
    this.elements.themeToggle = document.getElementById('themeToggle');
    this.elements.compareToggle = document.getElementById('compareToggle');
    
    // Search
    this.elements.searchInput = document.getElementById('searchInput');
    this.elements.searchButton = document.getElementById('searchButton');
    this.elements.autocompleteDropdown = document.getElementById('autocompleteDropdown');
    this.elements.autocompleteList = this.elements.autocompleteDropdown.querySelector('.autocomplete-list');
    
    // Filters
    this.elements.pageSize = document.getElementById('pageSize');
    this.elements.dataSource = document.getElementById('dataSource');
    
    // Sections
    this.elements.recentSearches = document.getElementById('recentSearches');
    this.elements.recentSearchesList = this.elements.recentSearches.querySelector('.recent-searches-list');
    this.elements.bookmarksSection = document.getElementById('bookmarksSection');
    this.elements.bookmarksList = this.elements.bookmarksSection.querySelector('.bookmarks-list');
    this.elements.resultsSection = document.getElementById('resultsSection');
    this.elements.resultsGrid = document.getElementById('resultsGrid');
    this.elements.compareSection = document.getElementById('compareSection');
    
    // Results
    this.elements.resultsCount = document.getElementById('resultsCount');
    this.elements.resultsSource = document.getElementById('resultsSource');
    this.elements.pagination = document.getElementById('pagination');
    this.elements.prevPage = document.getElementById('prevPage');
    this.elements.nextPage = document.getElementById('nextPage');
    this.elements.pageInfo = document.getElementById('pageInfo');
    
    // Modal
    this.elements.foodModal = document.getElementById('foodModal');
    this.elements.closeModal = document.getElementById('closeModal');
    this.elements.modalFoodName = document.getElementById('modalFoodName');
    this.elements.foodBrand = document.getElementById('foodBrand');
    this.elements.foodDataType = document.getElementById('foodDataType');
    this.elements.foodServing = document.getElementById('foodServing');
    this.elements.bookmarkFood = document.getElementById('bookmarkFood');
    this.elements.addToCompare = document.getElementById('addToCompare');
    this.elements.toggleNutrients = document.getElementById('toggleNutrients');
    this.elements.nutrientsList = document.getElementById('nutrientsList');
    
    // Nutrition values
    this.elements.caloriesValue = document.getElementById('caloriesValue');
    this.elements.proteinValue = document.getElementById('proteinValue');
    this.elements.carbsValue = document.getElementById('carbsValue');
    this.elements.fatValue = document.getElementById('fatValue');
    
    // Compare
    this.elements.compare1 = document.getElementById('compare1');
    this.elements.compare2 = document.getElementById('compare2');
    this.elements.compareResults = document.getElementById('compareResults');
    this.elements.clearCompare = document.getElementById('clearCompare');
    
    // Error and empty states
    this.elements.errorMessage = document.getElementById('errorMessage');
    this.elements.errorText = document.getElementById('errorText');
    this.elements.dismissError = document.getElementById('dismissError');
    this.elements.emptyState = document.getElementById('emptyState');
  }

  setupEventListeners() {
    // Theme toggle
    this.elements.themeToggle.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Modal actions
    this.elements.closeModal.addEventListener('click', () => {
      this.closeModal();
    });

    // Event delegation for food cards
    document.addEventListener('click', (e) => {
      if (e.target.closest('.food-card')) {
        const fdcId = e.target.closest('.food-card').dataset.fdcId;
        this.showFoodDetails(fdcId);
      }
    });

    // Modal backdrop click
    this.elements.foodModal.addEventListener('click', (e) => {
      if (e.target === this.elements.foodModal) {
        this.closeModal();
      }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.elements.foodModal.classList.contains('hidden')) {
        this.closeModal();
      }
    });
  }

  initializeSEO() {
    this.originalTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    this.originalDescription = metaDescription ? metaDescription.content : '';
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    this.canonicalUrl = canonicalLink ? canonicalLink.href : window.location.origin;
  }

  updatePageSEO(title, description, url = null) {
    // Update page title
    document.title = title;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.content = description;
    }
    
    // Update canonical URL
    if (url) {
      const canonicalLink = document.querySelector('link[rel="canonical"]');
      if (canonicalLink) {
        canonicalLink.href = url;
      }
    }
    
    // Update Open Graph tags
    this.updateOpenGraphTags(title, description, url);
    
    // Update Twitter Card tags
    this.updateTwitterCardTags(title, description, url);
  }

  updateOpenGraphTags(title, description, url = null) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    
    if (ogTitle) ogTitle.content = title;
    if (ogDescription) ogDescription.content = description;
    if (ogUrl && url) ogUrl.content = url;
  }

  updateTwitterCardTags(title, description, url = null) {
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    
    if (twitterTitle) twitterTitle.content = title;
    if (twitterDescription) twitterDescription.content = description;
  }

  addFoodStructuredData(food) {
    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"][data-food-structured]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create structured data for food item
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Food",
      "name": food.description,
      "description": `Nutritional information for ${food.description}. Calories: ${food.calories || 'N/A'} per 100g serving.`,
      "url": `${this.canonicalUrl}?food=${food.fdcId}`,
      "image": `https://nutrix.com/images/foods/${food.fdcId}.jpg`,
      "nutrition": {
        "@type": "NutritionInformation",
        "calories": food.calories || 0,
        "carbohydrateContent": food.macros?.carbohydrates || 0,
        "proteinContent": food.macros?.protein || 0,
        "fatContent": food.macros?.fat || 0,
        "fiberContent": food.macros?.fiber || 0,
        "sugarContent": food.macros?.sugar || 0,
        "sodiumContent": food.macros?.sodium || 0,
        "cholesterolContent": food.macros?.cholesterol || 0,
        "servingSize": "100 g"
      },
      "additionalProperty": []
    };

    // Add vitamins and minerals as additional properties
    if (food.nutrients) {
      Object.entries(food.nutrients).forEach(([key, nutrient]) => {
        if (key.includes('Vitamin') || key.includes('mineral') || key.includes('Potassium') || key.includes('Calcium') || key.includes('Iron')) {
          structuredData.additionalProperty.push({
            "@type": "PropertyValue",
            "name": nutrient.name,
            "value": nutrient.amount,
            "unitText": nutrient.unitName
          });
        }
      });
    }

    // Create and append script tag
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-food-structured', 'true');
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }

  addSearchResultsStructuredData(query, results, totalCount) {
    // Remove existing search structured data
    const existingScript = document.querySelector('script[type="application/ld+json"][data-search-structured]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create structured data for search results
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      "name": `Search Results for "${query}"`,
      "description": `Found ${totalCount} foods matching "${query}". View detailed nutrition information for each food.`,
      "url": `${this.canonicalUrl}?q=${encodeURIComponent(query)}`,
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": results.length,
        "itemListElement": results.map((food, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Food",
            "name": food.description,
            "url": `${this.canonicalUrl}?food=${food.fdcId}`,
            "description": `Nutritional information for ${food.description}. Calories: ${food.calories || 'N/A'} per 100g serving.`,
            "nutrition": {
              "@type": "NutritionInformation",
              "calories": food.calories || 0,
              "carbohydrateContent": food.macros?.carbohydrates || 0,
              "proteinContent": food.macros?.protein || 0,
              "fatContent": food.macros?.fat || 0,
              "servingSize": "100 g"
            }
          }
        }))
      }
    };

    // Create and append script tag
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-search-structured', 'true');
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }

  addBreadcrumbStructuredData(breadcrumbs) {
    // Remove existing breadcrumb structured data
    const existingScript = document.querySelector('script[type="application/ld+json"][data-breadcrumb-structured]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create structured data for breadcrumbs
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": crumb.name,
        "item": crumb.url
      }))
    };

    // Create and append script tag
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-breadcrumb-structured', 'true');
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }

  resetSEO() {
    this.updatePageSEO(this.originalTitle, this.originalDescription, this.canonicalUrl);
    
    // Remove structured data
    const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"][data-structured]');
    structuredDataScripts.forEach(script => script.remove());
  }

  // Loading states
  showLoading() {
    this.elements.loadingScreen.classList.remove('hidden');
  }

  hideLoading() {
    this.elements.loadingScreen.classList.add('hidden');
  }

  // Theme
  updateThemeIcon(theme) {
    const icon = this.elements.themeToggle.querySelector('.theme-icon');
    icon.textContent = theme === 'light' ? 'moon' : 'sun';
  }

  // Search UI
  showAutocomplete(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      this.hideAutocomplete();
      return;
    }

    this.elements.autocompleteList.innerHTML = '';
    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.innerHTML = `
        <strong>${this.highlightMatch(suggestion.description, this.elements.searchInput.value)}</strong>
        ${suggestion.brandOwner ? `<span class="brand">${suggestion.brandOwner}</span>` : ''}
      `;
      item.addEventListener('click', () => {
        this.elements.searchInput.value = suggestion.description;
        this.hideAutocomplete();
        this.elements.searchInput.dispatchEvent(new Event('search'));
      });
      this.elements.autocompleteList.appendChild(item);
    });

    this.elements.autocompleteDropdown.classList.remove('hidden');
  }

  hideAutocomplete() {
    this.elements.autocompleteDropdown.classList.add('hidden');
  }

  highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // Results
  showResults(results, query) {
    this.hideEmptyState();
    this.elements.resultsSection.classList.remove('hidden');
    
    // Update SEO for search results page
    const title = `${query} - Nutrition Facts & Calories | Nutrix`;
    const description = `Find detailed nutrition information for ${query}. ${results.totalHits} foods found with calories, macros, vitamins & minerals. Free nutrition database.`;
    const url = `${this.canonicalUrl}?q=${encodeURIComponent(query)}`;
    this.updatePageSEO(title, description, url);
    
    // Add structured data for search results
    this.addSearchResultsStructuredData(query, results.foods, results.totalHits);
    
    // Add breadcrumb structured data
    const breadcrumbs = [
      { name: 'Home', url: this.canonicalUrl },
      { name: 'Search', url: `${this.canonicalUrl}/search` },
      { name: `Results for "${query}"`, url: url }
    ];
    this.addBreadcrumbStructuredData(breadcrumbs);
    
    // Update results info
    this.elements.resultsCount.textContent = `${results.totalHits} results`;
    this.elements.resultsSource.textContent = `from ${results.source}`;
    
    // Update pagination
    this.updatePagination(results.currentPage, results.pageSize, results.totalHits);
    
    // Render results grid
    this.renderResultsGrid(results.foods);
  }

  renderResultsGrid(foods) {
    this.elements.resultsGrid.innerHTML = '';
    
    if (foods.length === 0) {
      this.showEmptyState();
      return;
    }

    foods.forEach(food => {
      const card = this.createFoodCard(food);
      this.elements.resultsGrid.appendChild(card);
    });
  }

  createFoodCard(food) {
    const card = document.createElement('div');
    card.className = 'food-card';
    card.innerHTML = `
      <h4>${food.description}</h4>
      <div class="food-meta">
        ${food.brandOwner ? `<span>${food.brandOwner}</span>` : ''}
        <span>${food.dataType}</span>
        <span>Per 100${food.servingSizeUnit || 'g'}</span>
      </div>
      <div class="macros-preview">
        <div class="macro-preview-item">
          <div class="macro-preview-value">${food.calories || 0}</div>
          <div class="macro-preview-label">Cal</div>
        </div>
        <div class="macro-preview-item">
          <div class="macro-preview-value">${food.macros?.protein || 0}</div>
          <div class="macro-preview-label">Protein</div>
        </div>
        <div class="macro-preview-item">
          <div class="macro-preview-value">${food.macros?.carbohydrates || 0}</div>
          <div class="macro-preview-label">Carbs</div>
        </div>
        <div class="macro-preview-item">
          <div class="macro-preview-value">${food.macros?.fat || 0}</div>
          <div class="macro-preview-label">Fat</div>
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => this.showFoodModal(food));
    return card;
  }

  updatePagination(currentPage, pageSize, totalHits) {
    const totalPages = Math.ceil(totalHits / pageSize);
    
    if (totalPages <= 1) {
      this.elements.pagination.classList.add('hidden');
      return;
    }
    
    this.elements.pagination.classList.remove('hidden');
    this.elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    this.elements.prevPage.disabled = currentPage <= 1;
    this.elements.nextPage.disabled = currentPage >= totalPages;
  }

  // Modal
  showFoodModal(food) {
    // Update SEO for food details page
    const title = `${food.description} - Nutrition Facts & Calories | Nutrix`;
    const description = `Complete nutrition facts for ${food.description}. Calories: ${food.calories || 0}, Protein: ${food.macros?.protein || 0}g, Carbs: ${food.macros?.carbohydrates || 0}g, Fat: ${food.macros?.fat || 0}g per 100g serving.`;
    const url = `${this.canonicalUrl}?food=${food.fdcId}`;
    this.updatePageSEO(title, description, url);
    
    // Add structured data for food item
    this.addFoodStructuredData(food);
    
    // Add breadcrumb structured data
    const breadcrumbs = [
      { name: 'Home', url: this.canonicalUrl },
      { name: 'Search', url: `${this.canonicalUrl}/search` },
      { name: food.description, url: url }
    ];
    this.addBreadcrumbStructuredData(breadcrumbs);

    this.elements.modalFoodName.textContent = food.description;
    this.elements.foodBrand.textContent = food.brandOwner || 'Generic';
    this.elements.foodDataType.textContent = food.dataType;
    this.elements.foodServing.textContent = `Per 100${food.servingSizeUnit || 'g'}`;
    
    // Update nutrition values
    this.elements.caloriesValue.textContent = food.calories || 0;
    this.elements.proteinValue.textContent = food.macros?.protein || 0;
    this.elements.carbsValue.textContent = food.macros?.carbohydrates || 0;
    this.elements.fatValue.textContent = food.macros?.fat || 0;
    
    // Update bookmark button
    const isBookmarked = storage.isBookmarked(food.fdcId);
    this.elements.bookmarkFood.classList.toggle('bookmarked', isBookmarked);
    this.elements.bookmarkFood.innerHTML = `
      <span class="action-icon">bookmark</span>
      ${isBookmarked ? 'Bookmarked' : 'Bookmark'}
    `;
    
    // Store current food for bookmark/compare actions
    this.elements.foodModal.dataset.foodId = food.fdcId;
    this.elements.foodModal.dataset.foodData = JSON.stringify(food);
    
    // Render nutrients
    this.renderNutrients(food.nutrients || {});
    
    // Show modal
    this.elements.foodModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.elements.foodModal.classList.add('hidden');
    document.body.style.overflow = '';
    delete this.elements.foodModal.dataset.foodId;
    delete this.elements.foodModal.dataset.foodData;
    
    // Reset SEO to default state
    this.resetSEO();
  }

  renderNutrients(nutrients) {
    this.elements.nutrientsList.innerHTML = '';
    
    const nutrientEntries = Object.entries(nutrients).sort((a, b) => {
      const nameA = a[1].name || a[0];
      const nameB = b[1].name || b[0];
      return nameA.localeCompare(nameB);
    });

    nutrientEntries.forEach(([key, nutrient]) => {
      const item = document.createElement('div');
      item.className = 'nutrient-item';
      item.innerHTML = `
        <span class="nutrient-name">${nutrient.name || key}</span>
        <span class="nutrient-value">${nutrient.amount || 0} ${nutrient.unitName || ''}</span>
      `;
      this.elements.nutrientsList.appendChild(item);
    });
  }

  // Recent searches
  showRecentSearches(searches) {
    if (searches.length === 0) {
      this.elements.recentSearches.classList.add('hidden');
      return;
    }

    this.elements.recentSearches.classList.remove('hidden');
    this.elements.recentSearchesList.innerHTML = '';
    
    searches.forEach(search => {
      const item = document.createElement('span');
      item.className = 'recent-search-item';
      item.textContent = search;
      item.addEventListener('click', () => {
        this.elements.searchInput.value = search;
        this.elements.searchInput.dispatchEvent(new Event('search'));
      });
      this.elements.recentSearchesList.appendChild(item);
    });
  }

  // Bookmarks
  showBookmarks(bookmarks) {
    if (bookmarks.length === 0) {
      this.elements.bookmarksSection.classList.add('hidden');
      return;
    }

    this.elements.bookmarksSection.classList.remove('hidden');
    this.elements.bookmarksList.innerHTML = '';
    
    bookmarks.forEach(bookmark => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';
      item.innerHTML = `
        <div class="bookmark-info">
          <h4>${bookmark.description}</h4>
          <div class="meta">${bookmark.dataType} ${bookmark.brandOwner ? `· ${bookmark.brandOwner}` : ''}</div>
        </div>
        <button class="remove-bookmark" data-fdc-id="${bookmark.fdcId}">×</button>
      `;
      
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('remove-bookmark')) {
          this.showFoodModal(bookmark);
        }
      });
      
      item.querySelector('.remove-bookmark').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeBookmark(bookmark.fdcId);
      });
      
      this.elements.bookmarksList.appendChild(item);
    });
  }

  removeBookmark(fdcId) {
    storage.removeBookmark(fdcId);
    this.showBookmarks(storage.getBookmarks());
  }

  // Compare
  showCompareSection() {
    this.elements.compareSection.classList.remove('hidden');
    this.updateCompareItems();
  }

  hideCompareSection() {
    this.elements.compareSection.classList.add('hidden');
  }

  updateCompareItems() {
    const compareList = storage.getCompareList();
    
    // Update compare item 1
    if (compareList[0]) {
      this.elements.compare1.innerHTML = this.createCompareItemHTML(compareList[0]);
    } else {
      this.elements.compare1.innerHTML = '<div class="compare-placeholder">Select first food to compare</div>';
    }
    
    // Update compare item 2
    if (compareList[1]) {
      this.elements.compare2.innerHTML = this.createCompareItemHTML(compareList[1]);
    } else {
      this.elements.compare2.innerHTML = '<div class="compare-placeholder">Select second food to compare</div>';
    }
    
    // Show comparison if both items exist
    if (compareList.length === 2) {
      this.showComparison(compareList[0], compareList[1]);
    } else {
      this.elements.compareResults.classList.add('hidden');
    }
  }

  createCompareItemHTML(food) {
    return `
      <div class="compare-food">
        <h4>${food.description}</h4>
        <div class="compare-macros">
          <div class="macro-item">
            <span class="macro-label">Calories:</span>
            <span class="macro-value">${food.calories || 0}</span>
          </div>
          <div class="macro-item">
            <span class="macro-label">Protein:</span>
            <span class="macro-value">${food.macros?.protein || 0}g</span>
          </div>
          <div class="macro-item">
            <span class="macro-label">Carbs:</span>
            <span class="macro-value">${food.macros?.carbohydrates || 0}g</span>
          </div>
          <div class="macro-item">
            <span class="macro-label">Fat:</span>
            <span class="macro-value">${food.macros?.fat || 0}g</span>
          </div>
        </div>
        <button class="remove-compare" data-fdc-id="${food.fdcId}">Remove</button>
      </div>
    `;
  }

  showComparison(food1, food2) {
    this.elements.compareResults.classList.remove('hidden');
    
    const comparison = this.calculateComparison(food1, food2);
    this.elements.compareResults.innerHTML = `
      <h4>Nutritional Comparison</h4>
      <div class="comparison-table">
        <div class="comparison-header">
          <div></div>
          <div>${food1.description}</div>
          <div>${food2.description}</div>
          <div>Difference</div>
        </div>
        <div class="comparison-row">
          <span>Calories</span>
          <span>${food1.calories || 0}</span>
          <span>${food2.calories || 0}</span>
          <span class="${comparison.calories.diff >= 0 ? 'positive' : 'negative'}">
            ${comparison.calories.diff >= 0 ? '+' : ''}${comparison.calories.diff}
          </span>
        </div>
        <div class="comparison-row">
          <span>Protein (g)</span>
          <span>${food1.macros?.protein || 0}</span>
          <span>${food2.macros?.protein || 0}</span>
          <span class="${comparison.protein.diff >= 0 ? 'positive' : 'negative'}">
            ${comparison.protein.diff >= 0 ? '+' : ''}${comparison.protein.diff}
          </span>
        </div>
        <div class="comparison-row">
          <span>Carbs (g)</span>
          <span>${food1.macros?.carbohydrates || 0}</span>
          <span>${food2.macros?.carbohydrates || 0}</span>
          <span class="${comparison.carbs.diff >= 0 ? 'positive' : 'negative'}">
            ${comparison.carbs.diff >= 0 ? '+' : ''}${comparison.carbs.diff}
          </span>
        </div>
        <div class="comparison-row">
          <span>Fat (g)</span>
          <span>${food1.macros?.fat || 0}</span>
          <span>${food2.macros?.fat || 0}</span>
          <span class="${comparison.fat.diff >= 0 ? 'positive' : 'negative'}">
            ${comparison.fat.diff >= 0 ? '+' : ''}${comparison.fat.diff}
          </span>
        </div>
      </div>
    `;
  }

  calculateComparison(food1, food2) {
    return {
      calories: {
        diff: (food2.calories || 0) - (food1.calories || 0),
        percent: ((food2.calories || 0) / (food1.calories || 1) - 1) * 100
      },
      protein: {
        diff: (food2.macros?.protein || 0) - (food1.macros?.protein || 0),
        percent: ((food2.macros?.protein || 0) / (food1.macros?.protein || 1) - 1) * 100
      },
      carbs: {
        diff: (food2.macros?.carbohydrates || 0) - (food1.macros?.carbohydrates || 0),
        percent: ((food2.macros?.carbohydrates || 0) / (food1.macros?.carbohydrates || 1) - 1) * 100
      },
      fat: {
        diff: (food2.macros?.fat || 0) - (food1.macros?.fat || 0),
        percent: ((food2.macros?.fat || 0) / (food1.macros?.fat || 1) - 1) * 100
      }
    };
  }

  // Error handling
  showError(message) {
    this.elements.errorText.textContent = message;
    this.elements.errorMessage.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => this.hideError(), 5000);
  }

  hideError() {
    this.elements.errorMessage.classList.add('hidden');
  }

  // Empty state
  showEmptyState() {
    this.elements.emptyState.classList.remove('hidden');
    this.elements.resultsGrid.innerHTML = '';
  }

  hideEmptyState() {
    this.elements.emptyState.classList.add('hidden');
  }

  // Utility methods
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Create singleton instance
const ui = new UI();
window.ui = ui;
