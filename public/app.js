import { requireAuth, signOut, saveFoodHistory, fetchRecentFoodHistory, getUserProfile } from './auth.js';
import { searchFoodData, analyzeNutrition, calculateFoodScore, buildWarnings, determinePurposeTag, formatNutrientValue } from './api.js';

const form = document.getElementById('food-form');
const input = document.getElementById('food-input');
const barcodeInput = document.getElementById('barcode-input');
const status = document.getElementById('dashboard-status');
const analyzeButton = document.getElementById('analyze-button');
const logoutButton = document.getElementById('logout-button');
const resultPanel = document.getElementById('result-panel');
const nutritionSummary = document.getElementById('nutrition-summary');
const healthProgress = document.getElementById('health-progress');
const aiInsights = document.getElementById('ai-insights');
const warningList = document.getElementById('warning-list');
const purposeTags = document.getElementById('purpose-tags');
const recommendedMeal = document.getElementById('recommended-meal');
const conditionReview = document.getElementById('condition-review');
const conditionSummary = document.getElementById('condition-summary');
const historyList = document.getElementById('history-list');
const dashboardTime = document.getElementById('dashboard-time');
const metricAnalyses = document.getElementById('metric-analyses');
const metricAverage = document.getElementById('metric-average');
const metricWarnings = document.getElementById('metric-warnings');
const metricLatest = document.getElementById('metric-latest');
const actionAnalyze = document.getElementById('action-analyze');
const actionHistory = document.getElementById('action-history');
const actionAlerts = document.getElementById('action-alerts');
const actionExport = document.getElementById('action-export');

let currentSession = null;
let currentCondition = '';

function setStatus(message, type = 'neutral') {
  status.textContent = message;
  status.classList.toggle('error', type === 'error');
  status.classList.toggle('success', type === 'success');
}

window.addEventListener('DOMContentLoaded', async () => {
  currentSession = await requireAuth();
  if (!currentSession) return;

  await loadUserCondition();
  await loadHistory();
  setDashboardTime();
  attachSidebarActions();
});

logoutButton.addEventListener('click', async () => {
  await signOut();
  window.location.href = 'login.html';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const foodQuery = input.value.trim();
  const barcode = barcodeInput.value.trim();
  const query = barcode || foodQuery;

  if (!query) {
    setStatus('Please enter a food item or barcode.', 'error');
    return;
  }

  analyzeButton.disabled = true;
  analyzeButton.textContent = 'Analyzing...';
  setStatus('Analyzing your nutrition...');
  resultPanel.hidden = true;

  try {
    const nutrition = await searchFoodData(query);
    const aiResponse = await analyzeNutrition({ foodQuery: query, nutrition });
    const healthScore = calculateFoodScore(nutrition);
    renderResult({ foodQuery: query, nutrition, aiResponse, healthScore });

    if (currentSession?.user?.id) {
      await saveFoodHistory({
        userId: currentSession.user.id,
        foodQuery: query,
        nutrition,
        analysis: aiResponse.analysis,
        healthScore,
      });
      await loadHistory();
    }

    setStatus('Analysis complete. Scroll for insights and guidance.', 'success');
  } catch (error) {
    setStatus(error.message || 'Unable to analyze nutrition at this time.', 'error');
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.textContent = 'Analyze nutrition';
  }
});

function renderResult({ foodQuery, nutrition, aiResponse, healthScore }) {
  nutritionSummary.innerHTML = '';
  purposeTags.innerHTML = '';
  warningList.innerHTML = '';
  recommendedMeal.textContent = '';

  const tagItems = determinePurposeTag(nutrition);
  tagItems.forEach((tag) => {
    const chip = document.createElement('span');
    chip.className = 'tag-item';
    chip.textContent = tag;
    purposeTags.appendChild(chip);
  });

  // Add data source tag
  if (nutrition.source) {
    const sourceTag = document.createElement('span');
    sourceTag.className = 'tag-item';
    sourceTag.textContent = `Data: ${nutrition.source}`;
    purposeTags.appendChild(sourceTag);
  }

  const summaryItems = [
    { label: 'Calories', value: `${Math.round(nutrition.calories)} kcal` },
    { label: 'Protein', value: formatNutrientValue(nutrition.protein, 'g') },
    { label: 'Carbs', value: formatNutrientValue(nutrition.carbs, 'g') },
    { label: 'Fat', value: formatNutrientValue(nutrition.fat, 'g') },
    { label: 'Sugar', value: formatNutrientValue(nutrition.sugar, 'g') },
    { label: 'Fiber', value: formatNutrientValue(nutrition.fiber, 'g') },
  ];

  summaryItems.forEach(({ label, value }) => {
    const box = document.createElement('div');
    box.className = 'summary-card';
    box.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
    nutritionSummary.appendChild(box);
  });

  const micronutrients = Object.entries(nutrition.micronutrients).slice(0, 6);
  if (micronutrients.length) {
    micronutrients.forEach(([name, value]) => {
      const box = document.createElement('div');
      box.className = 'summary-card';
      box.innerHTML = `<strong>${Math.round(value * 10) / 10}</strong><span>${name}</span>`;
      nutritionSummary.appendChild(box);
    });
  }

  // Add ingredients if available
  if (nutrition.ingredients) {
    const ingredientsBox = document.createElement('div');
    ingredientsBox.className = 'summary-card';
    ingredientsBox.innerHTML = `<strong>Ingredients</strong><span>${nutrition.ingredients.slice(0, 100)}${nutrition.ingredients.length > 100 ? '…' : ''}</span>`;
    nutritionSummary.appendChild(ingredientsBox);
  }

  healthProgress.style.width = `${healthScore}%`;
  aiInsights.textContent = aiResponse.analysis;
  const conditionAdvice = reviewConditionAlignment(nutrition, currentCondition);
  if (conditionAdvice) {
    conditionReview.hidden = false;
    conditionSummary.textContent = conditionAdvice.message;
    conditionReview.classList.toggle('condition-good', conditionAdvice.isGood);
    conditionReview.classList.toggle('condition-bad', !conditionAdvice.isGood);
  } else {
    conditionReview.hidden = true;
  }
  const warnings = buildWarnings(nutrition);
  if (warnings.length === 0) {
    warningList.innerHTML = '<div class="warning-item">No major red flags detected in this analysis.</div>';
  } else {
    warnings.forEach((message) => {
      const item = document.createElement('div');
      item.className = 'warning-item';
      item.textContent = message;
      warningList.appendChild(item);
    });
  }

  if (aiResponse.recommendedMeal) {
    recommendedMeal.textContent = `Recommended next meal: ${aiResponse.recommendedMeal}`;
  }

  resultPanel.hidden = false;
}

async function loadUserCondition() {
  if (!currentSession?.user?.id) return;
  const profileResult = await getUserProfile(currentSession.user.id);
  if (profileResult?.data?.condition) {
    currentCondition = profileResult.data.condition;
  } else if (currentSession.user.user_metadata?.condition) {
    currentCondition = currentSession.user.user_metadata.condition;
  }
}

function reviewConditionAlignment(nutrition, condition) {
  if (!condition) return null;

  const c = condition.toLowerCase();
  const advice = {
    message: `Your profile indicates ${condition}.`,
    isGood: true,
  };

  if (c.includes('diabetes')) {
    if (nutrition.sugar >= 12 || nutrition.carbs > 35) {
      advice.message = 'This item may be less suitable for diabetes management due to sugar and carbohydrate load.';
      advice.isGood = false;
    } else {
      advice.message = 'This item is generally compatible with diabetes-focused nutrition guidance.';
    }
  } else if (c.includes('hypertension')) {
    if (nutrition.sodium >= 550 || nutrition.satFat >= 7) {
      advice.message = 'This item may not be ideal for hypertension because of elevated sodium or saturated fat.';
      advice.isGood = false;
    } else {
      advice.message = 'This item appears well aligned with hypertension-sensitive nutrition.';
    }
  } else if (c.includes('high cholesterol')) {
    if (nutrition.satFat >= 7 || nutrition.cholesterol >= 80) {
      advice.message = 'The food contains elements that could be suboptimal for cholesterol control.';
      advice.isGood = false;
    } else {
      advice.message = 'This item is generally appropriate for cholesterol-conscious eating.';
    }
  } else if (c.includes('weight management')) {
    if (nutrition.calories > 520 || nutrition.sugar >= 18) {
      advice.message = 'This item may not align with weight management goals due to caloric and sugar density.';
      advice.isGood = false;
    } else {
      advice.message = 'This food is reasonably aligned with weight management guidance.';
    }
  } else if (c.includes('digestive support')) {
    if (nutrition.fiber < 4 && nutrition.fat > 18) {
      advice.message = 'This item may be less suitable for digestive support due to low fiber and high fat.';
      advice.isGood = false;
    } else {
      advice.message = 'This item is generally consistent with digestive-support nutrition.';
    }
  } else {
    advice.message = `Condition ${condition} is noted; use the nutrition summary to decide if it fits your goals.`;
    advice.isGood = true;
  }

  return advice;
}

async function loadHistory() {
  if (!currentSession?.user?.id) return;
  const { data, error } = await fetchRecentFoodHistory({ userId: currentSession.user.id, limit: 5 });
  historyList.innerHTML = '';

  if (error || !data || data.length === 0) {
    historyList.innerHTML = '<p class="result-copy">No recent searches found. Your latest analysis will appear here.</p>';
    renderDashboardMetrics([]);
    return;
  }

  renderDashboardMetrics(data);

  data.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <strong>${entry.food_query}</strong>
      <p>${entry.ai_analysis.slice(0, 120)}${entry.ai_analysis.length > 120 ? '…' : ''}</p>
      <time>${new Date(entry.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time>
    `;
    historyList.appendChild(item);
  });
}

function renderDashboardMetrics(history) {
  const analysesCount = history.length;
  const averageScore = history.length
    ? Math.round(history.reduce((sum, entry) => sum + (entry.health_score || 0), 0) / history.length)
    : 0;
  const warningCount = history.reduce((count, entry) => {
    const warnings = buildWarnings(entry.nutrition_data || {});
    return count + (warnings.length > 0 ? 1 : 0);
  }, 0);
  const latestFood = history[0]?.food_query || 'No entry';

  if (metricAnalyses) metricAnalyses.textContent = analysesCount;
  if (metricAverage) metricAverage.textContent = `${averageScore}`;
  if (metricWarnings) metricWarnings.textContent = warningCount;
  if (metricLatest) metricLatest.textContent = latestFood;
}

function setDashboardTime() {
  if (!dashboardTime) return;
  dashboardTime.textContent = new Date().toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function attachSidebarActions() {
  if (actionAnalyze) {
    actionAnalyze.addEventListener('click', () => {
      input.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (actionHistory) {
    actionHistory.addEventListener('click', () => {
      historyList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (actionAlerts) {
    actionAlerts.addEventListener('click', () => {
      warningList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (actionExport) {
    actionExport.addEventListener('click', () => {
      window.print();
    });
  }
}
