
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

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
const CACHE_PREFIX = 'bayynat_v2_';
const setCache = (key: string, data: any, ttlDays = 7) => {
  try {
    const expiry = Date.now() + (ttlDays * 24 * 60 * 60 * 1000);
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, expiry }));
  } catch (e) {
    console.warn("Failed to save to cache", e);
  }
};

const getCache = (key: string) => {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    const { data, expiry } = JSON.parse(cached);
    if (Date.now() > expiry) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
};

const INSIGHTS = [
  "Ramadan is a time to purify the soul, refocus attention on God, and practice self-discipline and sacrifice.",
  "Fasting is not just about hunger and thirst, but about patience, empathy, and spiritual awakening.",
  "In this holy month, let your heart be lighter and your prayers deeper. Seek closeness to Allah.",
  "The month of Ramadan is the one in which the Quran was sent down as guidance for mankind.",
  "Kindness and charity in Ramadan have multiplied rewards. Share your blessings with others.",
  "Use this time to reflect on your journey, seek forgiveness, and renew your intentions.",
  "Patience is the key to success. Ramadan teaches us the art of patience and gratitude.",
  "Let the spirit of Ramadan illuminate your heart and soul. May this be a month of transformation.",
  "Every fast is a step closer to purification. Embrace the struggle and find peace in worship.",
  "Remember the less fortunate in your prayers and actions. Community and compassion defined Ramadan."
];

export async function getRamadanInsight(city: string, currentTime: string, nextPrayer: string) {
  const cacheKey = `insight_${city.toLowerCase().replace(/\s/g, '_')}_${new Date().getHours()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  /*
  try {
    const result = await fetchWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Provide a short, beautiful spiritual reflection or tip for a fasting person in ${city}. The current local time is ${currentTime} and the next prayer is ${nextPrayer}. Keep it under 150 characters. Use a peaceful tone and relate it to the Shia (Jaffari) spiritual path if possible.`
              }
            ]
          }
        ],
        config: { temperature: 0.7 }
      });
      return response.text;
    });
    setCache(cacheKey, result, 0.5); // Cache for half a day
    return result;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Ramadan is a month of patience and spiritual growth. Focus on inner peace today.";
  }
  */
  
  // Fallback implementation
  const randomIndex = Math.floor(Math.random() * INSIGHTS.length);
  return INSIGHTS[randomIndex];
}

export async function getDetailedSchedule(city: string, year: number, month: number, country?: string, hijriMonth?: string) {
  const cacheKey = `schedule_${city.toLowerCase().replace(/\s/g, '_')}_${year}_${month}_${hijriMonth || 'greg'}`;
  // Only clear cache if explicitly needed (not every call)
  // localStorage.removeItem('bayynat_v2_' + cacheKey);

  const cached = getCache(cacheKey);
  if (cached) return cached;

  // Timezone lookup for common cities
  const cityTimezones: Record<string, string> = {
    'beirut': 'Asia/Beirut',
    'london': 'Europe/London',
    'new york': 'America/New_York',
    'paris': 'Europe/Paris',
    'cairo': 'Africa/Cairo',
    'riyadh': 'Asia/Riyadh',
    'dubai': 'Asia/Dubai',
    'tehran': 'Asia/Tehran',
    'baghdad': 'Asia/Baghdad',
    'karachi': 'Asia/Karachi',
    'jakarta': 'Asia/Jakarta',
    'istanbul': 'Europe/Istanbul',
    // Add more as needed
  };
  const cleanCity = city.split(',')[0].trim();
  const cleanCountry = country || "Lebanon";
  const methodId = 0;
  const cityKey = cleanCity.toLowerCase();
  const timezone = cityTimezones[cityKey] || '';

  // Use calendarByAddress for reliable timezone handling
  let apiUrl = `https://api.aladhan.com/v1/calendarByAddress?address=${encodeURIComponent(cleanCity + ', ' + cleanCountry)}&year=${year}&month=${month}&method=${methodId}&school=0`;
  if (timezone) {
    apiUrl += `&timezone=${encodeURIComponent(timezone)}`;
  }

  try {
    const result = await fetchWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Generate a daily prayer schedule for ${timeScope} for ${locationString}. 
        CRITICAL: The current local timezone is ${timezone} (${offsetString}). 
        You MUST ensure the times strictly follow the local wall-clock (Daylight Saving Time rules for this specific region for the requested period).
        Use the Bayynat (Jaffari) calculation method (Maghrib is at the disappearance of the Eastern redness).
        Return a JSON array of objects with keys: 
        - date (YYYY-MM-DD)
        - hijri (e.g., "1 Ramadan 1446")
        - imsak, fajr, dhuhr, asr, maghrib, isha.`
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                hijri: { type: Type.STRING },
                imsak: { type: Type.STRING },
                fajr: { type: Type.STRING },
                dhuhr: { type: Type.STRING },
                asr: { type: Type.STRING },
                maghrib: { type: Type.STRING },
                isha: { type: Type.STRING },
              },
              required: ["date", "hijri", "fajr", "maghrib"]
            }
          }
        }
      });
      return JSON.parse(response.text);
>>>>>>> a13746a (Fix Gemini API request structure for generateContent)
    });
    setCache(cacheKey, result, 30);
    return result;
  } catch (error) {
    console.error("Schedule Fetch Error:", error);
    throw error;
  }
}

export async function getCountries() {
  const cacheKey = 'countries_list';
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const result = await fetchWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Return a JSON list of all sovereign countries in the world, sorted alphabetically. Format: array of strings."
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      return JSON.parse(response.text);
    });
    setCache(cacheKey, result, 60); // Cache countries for 60 days
    return result;
  } catch (error) {
    console.error("Gemini Countries Error:", error);
    return ["Lebanon", "Iraq", "Iran", "Kuwait", "Saudi Arabia", "United Arab Emirates", "United Kingdom", "USA", "Canada", "Australia", "Germany", "France"];
  }
}
  const cacheKey = 'countries_list';
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const result = await fetchWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Return a JSON list of all sovereign countries in the world, sorted alphabetically. Format: array of strings."
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      return JSON.parse(response.text);
    });
    setCache(cacheKey, result, 60); // Cache countries for 60 days
    return result;
  } catch (error) {
    console.error("Gemini Countries Error:", error);
    return ["Lebanon", "Iraq", "Iran", "Kuwait", "Saudi Arabia", "United Arab Emirates", "United Kingdom", "USA", "Canada", "Australia", "Germany", "France"];
  }
>>>>>>> a13746a (Fix Gemini API request structure for generateContent)
}

export async function getCities(country: string) {
  const cacheKey = `cities_${country.toLowerCase().replace(/\s/g, '_')}`;
  // Static map of major cities for reliability
  // Only allow specific cities for each allowed country
  const majorCities: Record<string, string[]> = {
    'france': ["Marseille", "Paris", "Aix-en-Provence"],
    'gambia': ["Banjul"],
    'lebanon': ["Beirut", "Nabatiyeh"],
    'qatar': ["Doha"],
    'saudi arabia': ["Riyadh"],
    'united arab emirates': ["Dubai", "Sharjah"]
  };
  // Always return major cities for allowed countries, ignore cache/API
  const key = country.toLowerCase();
  if (majorCities[key]) {
    return majorCities[key].sort();
  }
  return [];
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
  // Fallback to major cities map
  if (majorCities[key]) {
    setCache(cacheKey, majorCities[key], 60);
    return majorCities[key];
  }
  // Fallback to cache
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const result = await fetchWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Return a JSON list of the top 30 major cities in ${country}. Format: array of strings.`
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      return JSON.parse(response.text);
    });
    setCache(cacheKey, result, 60); // Cache cities for 60 days
    return result;
  } catch (error) {
    console.error("Gemini Cities Error:", error);
    // Return empty or common cities as fallback if needed
    return [];
  }
}

  try {
    const result = await fetchWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Return a JSON list of the top 30 major cities in ${country}. Format: array of strings.`
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      return JSON.parse(response.text);
    });
    setCache(cacheKey, result, 60); // Cache cities for 60 days
    return result;
  } catch (error) {
    console.error("Gemini Cities Error:", error);
    // Return empty or common cities as fallback if needed
    return [];
  }
>>>>>>> a13746a (Fix Gemini API request structure for generateContent)
}
