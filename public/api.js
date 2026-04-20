const {
  GEMINI_MODEL = 'text-bison-001',
  API_PROXY_PATH = '',
} = window.NUTRIX_CONFIG || {};

assertConfig('API_PROXY_PATH', API_PROXY_PATH);

function assertConfig(key, value) {
  if (!value || value.includes('YOUR_') || value.includes('your-')) {
    throw new Error(`Missing required configuration for ${key}. Update config.js before deploying.`);
  }
}

const MICRO_TARGETS = [
  'vitamin a', 'vitamin c', 'vitamin d', 'calcium', 'iron', 'potassium', 'magnesium', 'fiber', 'zinc', 'vitamin b12', 'folate', 'vitamin e', 'vitamin k', 'phosphorus', 'selenium',
];

export async function searchFoodData(query) {
  // Try Open Food Facts first for broader coverage
  try {
    const openFoodData = await searchOpenFoodFacts(query);
    if (openFoodData) {
      return openFoodData;
    }
  } catch (error) {
    console.warn('Open Food Facts search failed, falling back to USDA:', error.message);
  }

  const endpoint = `${API_PROXY_PATH}/usda`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, pageSize: 1 }),
  });

  if (!response.ok) {
    throw new Error('Unable to retrieve food data from USDA.');
  }

  const data = await response.json();
  const food = data.foods?.[0];
  if (!food) {
    throw new Error('Food item not found in USDA database. Please refine your search.');
  }

  return extractNutrition(food, 'usda');
}

async function searchOpenFoodFacts(query) {
  const url = `${API_PROXY_PATH}/openfoodfacts?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { cache: 'no-cache' });

  if (!response.ok) {
    throw new Error(`Open Food Facts API error: ${response.status}`);
  }

  const data = await response.json();
  const product = data.products?.[0];

  if (!product) {
    return null;
  }

  return extractNutrition(product, 'openfoodfacts');
}

function extractNutrition(food, source = 'usda') {
  let rawNutrients = [];
  let description = '';
  let brandOwner = '';
  let servingSize = null;
  let servingUnit = '';
  let ingredients = '';
  let allergens = '';
  let categories = '';
  let labels = '';

  if (source === 'usda') {
    rawNutrients = food.foodNutrients ?? [];
    description = food.description || food.lowercaseDescription || 'Food item';
    brandOwner = food.brandOwner || food.brand || '';
    servingSize = food.servingSize ?? null;
    servingUnit = food.servingSizeUnit ?? '';
  } else if (source === 'openfoodfacts') {
    // Open Food Facts structure
    description = food.product_name || food.product_name_en || 'Food item';
    brandOwner = food.brands || '';
    servingSize = food.serving_quantity ? Number(food.serving_quantity) : null;
    servingUnit = food.serving_size || '';
    ingredients = food.ingredients_text || '';
    allergens = food.allergens || '';
    categories = food.categories || '';
    labels = food.labels || '';

    // Extract nutrients from nutriments object
    const nutriments = food.nutriments || {};
    rawNutrients = Object.entries(nutriments).map(([key, value]) => ({
      name: key,
      amount: Number(value) || 0,
    }));
  }

  const nutrientValues = {};

  rawNutrients.forEach((item) => {
    const name = (item.nutrientName || item.name || '').toLowerCase();
    const value = Number(item.value ?? item.amount ?? 0);
    if (!Number.isNaN(value) && value !== 0) {
      nutrientValues[name] = value;
    }
  });

  const get = (keys) => keys.reduce((value, key) => value || nutrientValues[key], 0);

  const calories = get(['energy', 'energy kcal', 'calories', 'calories from fat', 'energy-kcal', 'energy-kcal_100g']);
  const protein = get(['protein', 'proteins', 'protein_100g']);
  const carbs = get(['carbohydrate, by difference', 'carbohydrate', 'total carbohydrate', 'carbohydrates', 'carbohydrates_100g']);
  const fat = get(['total lipid (fat)', 'total fat', 'fat', 'fat_100g']);
  const sugar = get(['sugars, total', 'sugar', 'sugars', 'sugars_100g']);
  const fiber = get(['fiber, total dietary', 'dietary fiber', 'fiber', 'fiber_100g']);
  const sodium = get(['sodium', 'salt', 'sodium_100g', 'salt_100g']);
  const satFat = get(['fatty acids, total saturated', 'saturated fat', 'saturated-fat', 'saturated-fat_100g']);
  const alcohol = get(['alcohol', 'alcohol_100g']);
  const cholesterol = get(['cholesterol', 'cholesterol_100g']);

  const micronutrients = MICRO_TARGETS.reduce((acc, nutrient) => {
    const value = get([nutrient, `${nutrient} (d)`, `${nutrient} (mg)`, `${nutrient} (mcg)`, `${nutrient}_100g`]);
    if (value) acc[nutrient] = value;
    return acc;
  }, {});

  return {
    description,
    brandOwner,
    servingSize,
    servingUnit,
    calories,
    protein,
    carbs,
    fat,
    sugar,
    fiber,
    sodium,
    satFat,
    alcohol,
    cholesterol,
    micronutrients,
    ingredients,
    allergens,
    categories,
    labels,
    source,
  };
}

export async function analyzeNutrition({ foodQuery, nutrition }) {
  const prompt = `You are a clinical nutrition intelligence system with access to comprehensive food data.

Analyze this food data and provide:
1. Health impact
2. Energy effect
3. Short-term and long-term effects
4. Best time to eat it
5. Simple human explanation
6. Recommended next meal
7. Any potential concerns based on ingredients or allergens

Food item: ${foodQuery}
Nutrition data: ${JSON.stringify(nutrition, null, 2)}

${nutrition.ingredients ? `Ingredients: ${nutrition.ingredients}` : ''}
${nutrition.allergens ? `Allergens: ${nutrition.allergens}` : ''}
${nutrition.categories ? `Categories: ${nutrition.categories}` : ''}
${nutrition.labels ? `Labels: ${nutrition.labels}` : ''}
${nutrition.source ? `Data source: ${nutrition.source}` : ''}`;

  try {
    const endPoint = `${API_PROXY_PATH}/gemini`;
    const body = { prompt, model: GEMINI_MODEL };
    const headers = { 'Content-Type': 'application/json' };

    const response = await fetch(endPoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.candidates?.[0]?.outputText || '';

    return {
      analysis: analysis.trim(),
      recommendedMeal: extractRecommendedMeal(analysis),
    };
  } catch (error) {
    console.warn('Gemini API failed, providing basic analysis:', error.message);
    const basicAnalysis = `Basic analysis for ${foodQuery}: This food provides approximately ${nutrition.calories} calories, with ${nutrition.protein}g protein, ${nutrition.carbs}g carbs, and ${nutrition.fat}g fat. ${nutrition.fiber > 0 ? `It contains ${nutrition.fiber}g fiber for digestive health.` : ''} ${nutrition.sugar > 10 ? 'Note the sugar content for blood sugar management.' : ''} Recommended next meal: A balanced meal with vegetables and lean protein.`;
    return {
      analysis: basicAnalysis,
      recommendedMeal: 'Balanced meal with vegetables and lean protein',
    };
  }
}

function extractRecommendedMeal(text) {
  const match = text.match(/Recommended next meal[:\-\s]*([^\n]+)/i);
  return match ? match[1].trim() : '';
}

export function calculateFoodScore(nutrition) {
  let score = 82;
  score += Math.min(18, nutrition.protein / 10);
  score += Math.min(12, nutrition.fiber / 3);
  score -= Math.max(0, (nutrition.sugar - 12) * 1.5);
  score -= Math.max(0, (nutrition.satFat - 5) * 2);
  score -= Math.max(0, (nutrition.sodium - 450) / 80);
  score -= Math.max(0, (nutrition.calories - 420) / 35);
  if (nutrition.alcohol > 0) score -= 18;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function buildWarnings(nutrition) {
  const warnings = [];
  if (nutrition.sugar >= 18) warnings.push('High sugar content may create rapid energy spikes and insulin load.');
  if (nutrition.satFat >= 6) warnings.push('Elevated saturated fat may impact cardiovascular health if consumed frequently.');
  if (nutrition.sodium >= 550) warnings.push('Sodium is elevated; this item may not be optimal for blood pressure control.');
  if (nutrition.alcohol > 0) warnings.push('Alcohol in the item can impair recovery and hydration balance.');
  if (nutrition.calories > 650) warnings.push('This portion has a high caloric load; consider portion control based on your energy needs.');
  return warnings;
}

export function determinePurposeTag(nutrition) {
  const tags = [];
  if (nutrition.protein >= 15 && nutrition.fat <= 18) tags.push('Muscle support');
  if (nutrition.carbs >= 25 && nutrition.sugar <= 18) tags.push('Energy balance');
  if (nutrition.protein >= 7 && nutrition.fiber >= 4 && nutrition.sugar < 15) tags.push('Cognitive support');
  if (nutrition.fat >= 12 && nutrition.carbs <= 30) tags.push('Recovery support');
  return tags.length ? tags.slice(0, 2) : ['Balanced formula'];
}

export function formatNutrientValue(value, unit = 'g') {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value * 10) / 10}${unit}`;
}
