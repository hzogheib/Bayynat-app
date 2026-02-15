import { GoogleGenAI, Type } from "@google/genai";

// Use primary key or fallback to secondary key
const apiKey = import.meta.env.VITE_API_KEY || import.meta.env.VITE_API_KEY_2;
// const ai = new GoogleGenAI({ apiKey });

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
  // Always clear cache for new city selection
  localStorage.removeItem('bayynat_v2_' + cacheKey);
  // Always clear cache for new city selection
  localStorage.removeItem('bayynat_v2_' + cacheKey);
>>>>>>> 3fc9f39 (Automatically clear schedule cache for new city selection)

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
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (data.code !== 200) {
      throw new Error(data.status || "Failed to fetch from Aladhan API");
    }
    const result = data.data.map((day: any) => {
      const timings = day.timings;
      const cleanTime = (t: string | undefined) => t ? t.split(' ')[0] : "";
      const dateStr = day.date.gregorian.date;
      return {
        date: dateStr.split('-').reverse().join('-'),
        hijri: `${day.date.hijri.day} ${day.date.hijri.month.en} ${day.date.hijri.year}`,
        imsak: cleanTime(timings.Imsak),
        fajr: cleanTime(timings.Fajr),
        sunrise: cleanTime(timings.Sunrise),
        dhuhr: cleanTime(timings.Dhuhr),
        asr: cleanTime(timings.Asr),
        maghrib: cleanTime(timings.Maghrib),
        isha: cleanTime(timings.Isha)
      };
    });
    setCache(cacheKey, result, 30);
    return result;
  } catch (error) {
    console.error("Schedule Fetch Error:", error);
    throw error;
  }
    });
    setCache(cacheKey, result, 30);
    return result;
  } catch (error) {
    console.error("Schedule Fetch Error:", error);
    throw error;
<<<<<<< HEAD
  }
  */

  // Alternative implementation using Aladhan API
  // https://aladhan.com/prayer-times-api#GetCalendarByCitys
  // Method 0 is Shia Ithna-Ashari, Leva Institute, Qum
  // Method 4 is Small Inteval (often used for Shia in some apps but check docs)
  // Let's use Method 0 (Shia Ithna-Ansari) or Method 10 (Institute of Geophysics, University of Tehran) which is common.
  // Method 0 params: Fajr 16deg, Maghrib 4deg? - check Aladhan docs: https://aladhan.com/prayer-times-api#GetCalendarByCitys
  // "0": "Shia Ithna-Ashari, Leva Institute, Qum"
  // "4": "Umm al-Qura University, Makkah" (Sunni)
  // "5": "Egyptian General Authority of Survey"
  // "7": "Institute of Geophysics, University of Tehran"
  // Let's stick with 0 or 7 for Shia/Jaffari.

  try {
     const cleanCity = city.split(',')[0].trim();
     const cleanCountry = country || "Lebanon"; // Default fallback
     
     // Method 0: Shia Ithna-Ashari, Leva Institute, Qum
     // Method 7: Institute of Geophysics, University of Tehran
     const methodId = 0; 

     const apiUrl = `https://api.aladhan.com/v1/calendarByCity/${year}/${month}?city=${encodeURIComponent(cleanCity)}&country=${encodeURIComponent(cleanCountry)}&method=${methodId}&school=0`; 
     // school=0 for Shafi, 1 for Hanafi. Doesn't affect Shia calc usually, but keep default.

     const response = await fetch(apiUrl);
     const data = await response.json();
     
     if (data.code !== 200) {
        throw new Error(data.status || "Failed to fetch from Aladhan API");
     }

     // Transform Aladhan data format to our app format
     const result = data.data.map((day: any) => {
        const timings = day.timings;
        
       const cleanTime = (t: string | undefined) => t ? t.split(' ')[0] : "";
       const dateStr = day.date.gregorian.date; // "16-02-2026"
       
       return {
         date: dateStr.split('-').reverse().join('-'), // "2026-02-16"
         hijri: `${day.date.hijri.day} ${day.date.hijri.month.en} ${day.date.hijri.year}`,
         imsak: cleanTime(timings.Imsak),
         fajr: cleanTime(timings.Fajr),
         sunrise: cleanTime(timings.Sunrise),
         dhuhr: cleanTime(timings.Dhuhr),
         asr: cleanTime(timings.Asr),
         maghrib: cleanTime(timings.Maghrib),
         isha: cleanTime(timings.Isha)
       };
     });
     
     setCache(cacheKey, result, 30);
     return result;

  } catch (error) {
     console.error("Schedule Fetch Error:", error);
     throw error;
=======
>>>>>>> 10329ae (Fix: Use city timezone for correct DST in prayer times (Beirut, etc.))
  }
}


  try {
     const cleanCity = city.split(',')[0].trim();
     const cleanCountry = country || "Lebanon"; // Default fallback
     
     // Method 0: Shia Ithna-Ashari, Leva Institute, Qum
     // Method 7: Institute of Geophysics, University of Tehran
     const methodId = 0; 

     const apiUrl = `https://api.aladhan.com/v1/calendarByCity/${year}/${month}?city=${encodeURIComponent(cleanCity)}&country=${encodeURIComponent(cleanCountry)}&method=${methodId}&school=0`; 
     // school=0 for Shafi, 1 for Hanafi. Doesn't affect Shia calc usually, but keep default.

     const response = await fetch(apiUrl);
     const data = await response.json();
     if (data.code !== 200) {
        throw new Error(data.status || "Failed to fetch from Aladhan API");
     }

     // Transform Aladhan data format to our app format
     const result = data.data.map((day: any) => {
        const timings = day.timings;
        
       const cleanTime = (t: string | undefined) => t ? t.split(' ')[0] : "";
       const dateStr = day.date.gregorian.date; // "16-02-2026"
       
       return {
         date: dateStr.split('-').reverse().join('-'), // "2026-02-16"
         hijri: `${day.date.hijri.day} ${day.date.hijri.month.en} ${day.date.hijri.year}`,
         imsak: cleanTime(timings.Imsak),
         fajr: cleanTime(timings.Fajr),
         sunrise: cleanTime(timings.Sunrise),
         dhuhr: cleanTime(timings.Dhuhr),
         asr: cleanTime(timings.Asr),
         maghrib: cleanTime(timings.Maghrib),
         isha: cleanTime(timings.Isha)
       };
     });
     
     setCache(cacheKey, result, 30);
     return result;

  } catch (error) {
     console.error("Schedule Fetch Error:", error);
     throw error;
  }
}
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

  // Static map of major cities for reliability
  const majorCities: Record<string, string[]> = {
    'lebanon': ["Beirut", "Tripoli", "Sidon", "Tyre", "Baalbek", "Zahle", "Nabatieh"],
    'france': ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille"],
    'united states': ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"],
    'united kingdom': ["London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Leeds", "Sheffield", "Bristol", "Edinburgh", "Leicester"],
    'germany': ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Dortmund", "Essen", "Leipzig"],
    'egypt': ["Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said", "Suez", "Luxor", "Aswan", "Tanta", "Mansoura"],
    'turkey': ["Istanbul", "Ankara", "Izmir", "Bursa", "Adana", "Gaziantep", "Konya", "Antalya", "Kayseri", "Mersin"],
    'iraq': ["Baghdad", "Basra", "Mosul", "Erbil", "Najaf", "Karbala", "Sulaymaniyah", "Kirkuk", "Diwaniya", "Nasiriyah"],
    'iran': ["Tehran", "Mashhad", "Isfahan", "Karaj", "Shiraz", "Tabriz", "Qom", "Ahvaz", "Kermanshah", "Urmia"],
    'saudi arabia': ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Tabuk", "Buraidah", "Abha", "Hail"],
    'pakistan': ["Karachi", "Lahore", "Faisalabad", "Rawalpindi", "Multan", "Peshawar", "Islamabad", "Quetta", "Sialkot", "Gujranwala"],
    'india': ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur"],
    'canada': ["Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec City", "Hamilton", "Kitchener"],
    'australia': ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra", "Newcastle", "Wollongong", "Logan City"],
    // Add more as needed
  };
  const key = country.toLowerCase();
  if (majorCities[key]) {
    setCache(cacheKey, majorCities[key], 60);
    return majorCities[key];
  }
  // Fallback generic list
  return ["Capital City", "Major City"]; 
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
