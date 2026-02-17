import { GoogleGenAI, Type } from "@google/genai";

// API key removed for security. Use environment variables or secure storage.

/**
 * Utility to handle exponential backoff for API calls
 */
async function fetchWithRetry(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
    // Mock retry for non-API calls if needed, or keep for future use
  return await fn();
  /*
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || "";
      const isRateLimit = errorMsg.includes('429') || error?.status === 429 || errorMsg.toLowerCase().includes('quota');
      
      if (isRateLimit && i < maxRetries - 1) {
        // Exponential backoff: 2s, 4s, 8s...
        const waitTime = Math.pow(2, i) * 2000 + Math.random() * 1000;
        console.warn(`Rate limit hit. Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
  */
}

/**
 * LocalStorage Caching Utilities
 */
// LocalStorage Caching Utilities
const CACHE_PREFIX = 'bayynat_v2_';
const setCache = (key: string, data: any, ttlDays = 7) => {
  try {
    const expires = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, expires }));
  } catch (e) {
    // Ignore quota errors
  }
};
const getCache = (key: string) => {
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;
    const { data, expires } = JSON.parse(item);
    if (Date.now() > expires) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }

export async function getCountries() {
  // Only return the allowed countries
  return [
    "France",
    "Gambia",
    "Lebanon",
    "Qatar",
    "Saudi Arabia",
    "United Arab Emirates"
  ];
}

  export async function getCities(country: string) {
    const cacheKey = `cities_${country.toLowerCase().replace(/\s/g, '_')}`;
    // Static map of major cities for reliability
    // Only allow specific cities for each allowed country
    const majorCities: Record<string, string[]> = {
      'france': ["Marseille", "Paris", "Aix-en-Provence"],
      'gambia': ["Banjul", "Serrekunda"],
      'lebanon': ["Beirut", "Saida", "Tyre", "Tripoli"],
      'qatar': ["Doha", "Al Rayyan"],
      'saudi arabia': ["Riyadh", "Jeddah", "Mecca", "Medina"],
      'united arab emirates': ["Dubai", "Abu Dhabi", "Sharjah"]
    };
    const key = country.toLowerCase();
    if (majorCities[key]) {
      setCache(cacheKey, majorCities[key], 60);
      return majorCities[key];
    }
    // Try CountriesNow API for city list
    try {
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country })
      });
      const data = await response.json();
      if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
        setCache(cacheKey, data.data, 60);
        return data.data;
      }
    } catch (e) {
      // API failed, fallback below
    }
    // Fallback to cache
    const cached = getCache(cacheKey);
    if (cached) return cached;
    return [];
  }

