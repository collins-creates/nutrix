import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const {
  SUPABASE_URL = 'https://YOUR_SUPABASE_PROJECT.supabase.co',
  SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY',
} = window.NUTRIX_CONFIG || {};

assertConfig('SUPABASE_URL', SUPABASE_URL);
assertConfig('SUPABASE_ANON_KEY', SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'nutrix-auth',
  },
});

export async function signUp({ fullName, email, password, condition }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  }, {
    data: { full_name: fullName, condition: condition },
  });

  if (error) return { error };

  if (data.user) {
    await saveUserProfile(data.user.id, fullName, condition);
  }

  return { data, error };
}

export async function signIn({ email, password }) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase.from('profiles')
    .select('full_name, condition')
    .eq('id', userId)
    .single();

  if (error) return { error };
  return { data };
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function waitForAuth(timeoutMs = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const session = await getSession();
    if (session) {
      return session;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
}

export async function requireAuth(redirectUrl = 'login.html') {
  const session = await waitForAuth();
  if (!session) {
    window.location.href = redirectUrl;
    return null;
  }
  return session;
}

export async function saveFoodHistory({ userId, foodQuery, nutrition, analysis, healthScore }) {
  return supabase.from('food_history').insert([{
    user_id: userId,
    food_query: foodQuery,
    nutrition_data: nutrition,
    ai_analysis: analysis,
    health_score: healthScore,
  }]);
}

export async function fetchRecentFoodHistory({ userId, limit = 5 }) {
  return supabase.from('food_history')
    .select('food_query, nutrition_data, ai_analysis, health_score, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

function assertConfig(key, value) {
  if (!value || value.includes('YOUR_') || value.includes('your-')) {
    throw new Error(`Missing required configuration for ${key}. Update config.js before deploying.`);
  }
}

async function saveUserProfile(userId, fullName, condition) {
  await supabase.from('profiles').upsert({
    id: userId,
    full_name: fullName,
    condition: condition,
  });
}
