
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.VITE_API_KEY });

/**
 * Utility to handle exponential backoff for API calls
 */
async function fetchWithRetry(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
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

export async function getRamadanInsight(city: string, currentTime: string, nextPrayer: string) {
  const cacheKey = `insight_${city.toLowerCase().replace(/\s/g, '_')}_${new Date().getHours()}`;
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
}

export async function getDetailedSchedule(city: string, year: number, month: number, country?: string, hijriMonth?: string) {
  const cacheKey = `schedule_${city.toLowerCase().replace(/\s/g, '_')}_${year}_${month}_${hijriMonth || 'greg'}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const locationString = country ? `${city}, ${country}` : city;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offsetMinutes = new Date().getTimezoneOffset();
  const offsetHours = -offsetMinutes / 60;
  const offsetString = `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
  let timeScope = hijriMonth ? `the Hijri month of ${hijriMonth} ${year}` : `the month ${month} of ${year}`;

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
    });
    setCache(cacheKey, result, 30); // Cache schedules for a month
    return result;
  } catch (error) {
    console.error("Gemini Schedule Error:", error);
    throw error; // Let the UI handle the error state
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

export async function getCities(country: string) {
  const cacheKey = `cities_${country.toLowerCase().replace(/\s/g, '_')}`;
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
