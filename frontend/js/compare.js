class CompareManager {
  constructor() {
    this.compareList = [];
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Compare toggle
    ui.elements.compareToggle.addEventListener('click', () => {
      this.toggleCompareSection();
    });

    // Modal actions
    ui.elements.addToCompare.addEventListener('click', () => {
      this.addCurrentFoodToCompare();
    });

    // Clear compare
    ui.elements.clearCompare.addEventListener('click', () => {
      this.clearCompareList();
    });

    // Event delegation for remove buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-compare')) {
        const fdcId = e.target.dataset.fdcId;
        this.removeFromCompare(fdcId);
      }
    });

    // Load initial state
    this.loadCompareState();
  }

  loadCompareState() {
    this.compareList = storage.getCompareList();
    if (this.compareList.length > 0) {
      this.showCompareSection();
    }
  }

  toggleCompareSection() {
    if (ui.elements.compareSection.classList.contains('hidden')) {
      this.showCompareSection();
    } else {
      this.hideCompareSection();
    }
  }

  showCompareSection() {
    ui.elements.compareSection.classList.remove('hidden');
    this.updateCompareDisplay();
  }

  hideCompareSection() {
    ui.elements.compareSection.classList.add('hidden');
  }

  addCurrentFoodToCompare() {
    const foodData = ui.elements.foodModal.dataset.foodData;
    if (!foodData) return;

    const food = JSON.parse(foodData);
    
    if (this.compareList.length >= 2) {
      ui.showError('You can only compare 2 foods at a time. Remove one to add another.');
      return;
    }

    // Check if already in compare list
    if (this.compareList.some(item => item.fdcId === food.fdcId)) {
      ui.showError('This food is already in the comparison list.');
      return;
    }

    this.addToCompare(food);
    ui.closeModal();
  }

  addToCompare(food) {
    this.compareList = storage.addToCompare(food);
    this.updateCompareDisplay();
    
    if (this.compareList.length === 2) {
      this.showCompareSection();
    }
  }

  removeFromCompare(fdcId) {
    this.compareList = storage.removeFromCompare(fdcId);
    this.updateCompareDisplay();
    
    if (this.compareList.length === 0) {
      this.hideCompareSection();
    }
  }

  clearCompareList() {
    storage.clearCompareList();
    this.compareList = [];
    this.updateCompareDisplay();
    this.hideCompareSection();
  }

  updateCompareDisplay() {
    ui.updateCompareItems();
  }

  // Advanced comparison features
  async performDetailedComparison(food1, food2) {
    try {
      // Get detailed information for both foods
      const [details1, details2] = await Promise.all([
        api.getFoodDetails(food1.fdcId),
        api.getFoodDetails(food2.fdcId)
      ]);

      if (details1.success && details2.success) {
        return this.createDetailedComparison(details1.data, details2.data);
      }
      
      throw new Error('Failed to load food details for comparison');
    } catch (error) {
      console.error('Detailed comparison error:', error);
      throw error;
    }
  }

  createDetailedComparison(food1, food2) {
    const comparison = {
      foods: [food1, food2],
      macros: this.compareMacros(food1, food2),
      vitamins: this.compareNutrientsByCategory(food1, food2, 'vitamins'),
      minerals: this.compareNutrientsByCategory(food1, food2, 'minerals'),
      other: this.compareNutrientsByCategory(food1, food2, 'other'),
      summary: this.generateComparisonSummary(food1, food2)
    };

    return comparison;
  }

  compareMacros(food1, food2) {
    const macros = ['calories', 'protein', 'carbohydrates', 'fat', 'fiber', 'sugar', 'sodium', 'cholesterol'];
    const comparison = {};

    macros.forEach(macro => {
      const value1 = food1.macros?.[macro] || food1[macro] || 0;
      const value2 = food2.macros?.[macro] || food2[macro] || 0;
      const diff = value2 - value1;
      const percentChange = value1 !== 0 ? ((diff / value1) * 100) : 0;

      comparison[macro] = {
        food1: value1,
        food2: value2,
        difference: diff,
        percentChange: percentChange,
        winner: diff > 0 ? 'food2' : diff < 0 ? 'food1' : 'tie'
      };
    });

    return comparison;
  }

  compareNutrientsByCategory(food1, food2, category) {
    const nutrients1 = food1.nutrients || {};
    const nutrients2 = food2.nutrients || {};
    const comparison = {};

    Object.entries(nutrients1).forEach(([key, nutrient1]) => {
      const nutrient2 = nutrients2[key];
      if (!nutrient2) return;

      // Categorize nutrients
      const nutrientCategory = this.categorizeNutrient(nutrient1.name);
      if (nutrientCategory !== category) return;

      const value1 = nutrient1.amount || 0;
      const value2 = nutrient2.amount || 0;
      const diff = value2 - value1;
      const percentChange = value1 !== 0 ? ((diff / value1) * 100) : 0;

      comparison[key] = {
        name: nutrient1.name,
        unit: nutrient1.unitName,
        food1: value1,
        food2: value2,
        difference: diff,
        percentChange: percentChange,
        winner: diff > 0 ? 'food2' : diff < 0 ? 'food1' : 'tie'
      };
    });

    return comparison;
  }

  categorizeNutrient(name) {
    const vitamins = ['Vitamin', 'vitamin', 'Retinol', 'Thiamin', 'Riboflavin', 'Niacin', 'Pantothenic', 'B-6', 'B-12', 'C', 'D', 'E', 'K', 'Folate', 'Folic', 'Biotin'];
    const minerals = ['Calcium', 'Iron', 'Magnesium', 'Phosphorus', 'Potassium', 'Sodium', 'Zinc', 'Copper', 'Manganese', 'Selenium', 'Iodine', 'Chromium', 'Molybdenum'];
    
    const lowerName = name.toLowerCase();
    
    if (vitamins.some(vitamin => lowerName.includes(vitamin.toLowerCase()))) {
      return 'vitamins';
    }
    
    if (minerals.some(mineral => lowerName.includes(mineral.toLowerCase()))) {
      return 'minerals';
    }
    
    return 'other';
  }

  generateComparisonSummary(food1, food2) {
    const macros = this.compareMacros(food1, food2);
    const summary = {
      overallWinner: null,
      keyDifferences: [],
      recommendations: []
    };

    // Count wins for each food
    let food1Wins = 0;
    let food2Wins = 0;

    Object.values(macros).forEach(macro => {
      if (macro.winner === 'food1') food1Wins++;
      else if (macro.winner === 'food2') food2Wins++;
      
      // Find significant differences (>50% difference)
      if (Math.abs(macro.percentChange) > 50) {
        summary.keyDifferences.push({
          nutrient: macro,
          significance: Math.abs(macro.percentChange)
        });
      }
    });

    // Sort key differences by significance
    summary.keyDifferences.sort((a, b) => b.significance - a.significance);

    // Determine overall winner based on macros
    if (food1Wins > food2Wins) {
      summary.overallWinner = 'food1';
    } else if (food2Wins > food1Wins) {
      summary.overallWinner = 'food2';
    } else {
      summary.overallWinner = 'tie';
    }

    // Generate recommendations
    summary.recommendations = this.generateRecommendations(macros, food1, food2);

    return summary;
  }

  generateRecommendations(macros, food1, food2) {
    const recommendations = [];

    // Protein recommendation
    if (macros.protein.difference > 5) {
      recommendations.push({
        type: 'protein',
        food: macros.protein.winner === 'food2' ? food2.description : food1.description,
        message: `Higher in protein by ${Math.abs(macros.protein.difference).toFixed(1)}g`
      });
    }

    // Calorie recommendation
    if (Math.abs(macros.calories.difference) > 50) {
      const lowerCalFood = macros.calories.winner === 'food1' ? food1 : food2;
      recommendations.push({
        type: 'calories',
        food: lowerCalFood.description,
        message: `Lower in calories by ${Math.abs(macros.calories.difference)}`
      });
    }

    // Fat recommendation
    if (macros.fat.difference > 3) {
      const lowerFatFood = macros.fat.winner === 'food1' ? food1 : food2;
      recommendations.push({
        type: 'fat',
        food: lowerFatFood.description,
        message: `Lower in fat by ${Math.abs(macros.fat.difference).toFixed(1)}g`
      });
    }

    // Fiber recommendation
    if (macros.fiber.difference > 1) {
      const higherFiberFood = macros.fiber.winner === 'food2' ? food2 : food1;
      recommendations.push({
        type: 'fiber',
        food: higherFiberFood.description,
        message: `Higher in fiber by ${Math.abs(macros.fiber.difference).toFixed(1)}g`
      });
    }

    return recommendations;
  }

  // Export comparison
  exportComparison() {
    if (this.compareList.length !== 2) {
      ui.showError('You need 2 foods to export a comparison');
      return null;
    }

    const comparison = {
      foods: this.compareList,
      comparedAt: new Date().toISOString(),
      macros: this.compareMacros(this.compareList[0], this.compareList[1]),
      summary: this.generateComparisonSummary(this.compareList[0], this.compareList[1])
    };

    return JSON.stringify(comparison, null, 2);
  }

  // Share comparison
  shareComparison() {
    const comparisonData = this.exportComparison();
    if (!comparisonData) return;

    try {
      // Create shareable URL (in a real app, this would generate a unique URL)
      const shareData = {
        title: 'Food Comparison',
        text: `Comparing ${this.compareList[0].description} vs ${this.compareList[1].description}`,
        url: window.location.href
      };

      if (navigator.share) {
        navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(comparisonData);
        ui.showError('Comparison data copied to clipboard');
      }
    } catch (error) {
      console.error('Share failed:', error);
      ui.showError('Failed to share comparison');
    }
  }

  // Print comparison
  printComparison() {
    if (this.compareList.length !== 2) {
      ui.showError('You need 2 foods to print a comparison');
      return;
    }

    window.print();
  }
}

// Create singleton instance
const compareManager = new CompareManager();
window.compareManager = compareManager;
