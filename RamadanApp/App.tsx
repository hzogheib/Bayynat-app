import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Moon, 
  Sun, 
  Clock, 
  MapPin, 
  Volume2, 
  VolumeX, 
  Calendar as CalendarIcon,
  Info,
  Compass,
  BookOpen,
  Navigation,
  ChevronRight,
  ChevronLeft,
  X,
  Globe,
  Search,
  Check,
  Loader2,
  Share,
  Download,
  CalendarDays,
  Github,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { PRAYER_NAMES, ATHAN_AUDIO_URL, RAMADAN_DUAS, calculateQiblaBearing } from './constants';
import { AppLocation, DayInfo, AppView } from './types';
import { getRamadanInsight, getDetailedSchedule, getCountries, getCities } from './services/geminiService';
import { DateTime } from 'luxon';

const GREGORIAN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani", "Jumada al-ula", "Jumada al-akhira",
  "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
];

const BayynatLogo = () => (
  <div className="flex items-center gap-2">
    <div className="relative w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-md border border-[#c5a021]/30">
      <svg viewBox="0 0 100 100" className="w-8 h-8 text-[#006837]" fill="currentColor">
        <path d="M50 10 C30 10 10 30 10 50 C10 70 30 90 50 90 C70 90 90 70 90 50 C90 30 70 10 50 10 Z M50 20 C65 20 78 32 80 47 L20 47 C22 32 35 20 50 20 Z M20 53 L80 53 C78 68 65 80 50 80 C35 80 22 68 20 53 Z" />
        <circle cx="50" cy="50" r="5" className="text-[#c5a021]" />
      </svg>
    </div>
    <div className="flex flex-col">
      <h1 className="text-white font-black text-lg leading-none tracking-tight">BAYYNAT</h1>
      <span className="text-[#c5a021] text-[10px] font-bold uppercase tracking-widest text-left">Official Timings</span>
    </div>
  </div>
);

const addMinutes = (timeStr: string, mins: number): string => {
  if (!timeStr) return "";
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes + mins);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) {
    return timeStr;
  }
};

const CITY_TIMEZONES: Record<string, string> = {
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

const getCityTimezone = (city: string) => {
  const key = city.toLowerCase();
  return CITY_TIMEZONES[key] || 'UTC';
};

const App: React.FC = () => {
  const [location, setLocation] = useState<AppLocation | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [schedule, setSchedule] = useState<DayInfo[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<DayInfo | null>(null);
  const [insight, setInsight] = useState<string>("");
  const [isAthanEnabled, setIsAthanEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [view, setView] = useState<AppView>('today');
  const [heading, setHeading] = useState<number | null>(null);
  const [qiblaBearing, setQiblaBearing] = useState<number>(0);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calendar View States
  const [calendarType, setCalendarType] = useState<'gregorian' | 'hijri'>('gregorian');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(new Date().getMonth());

  // Location Selection States
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  const athanAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastAthanTriggeredRef = useRef<string | null>(null);

  // City time state
  const [cityTime, setCityTime] = useState<string>("");

  // Update cityTime using Luxon
  useEffect(() => {
    if (!location || !location.city) {
      setCityTime("");
      return;
    }
    let tz = getCityTimezone(location.city);
    // If city is 'Current Location', use device timezone
    if (location.city === "Current Location") {
      tz = DateTime.local().zoneName;
    }
    const updateCityTime = () => {
      setCityTime(
        DateTime.now().setZone(tz).toFormat('HH:mm')
      );
    };
    updateCityTime();
    const interval = setInterval(updateCityTime, 1000);
    return () => clearInterval(interval);
  }, [location]);

  useEffect(() => {
    athanAudioRef.current = new Audio(ATHAN_AUDIO_URL);
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      setShowInstallPrompt(true);
    }
    return () => {
      athanAudioRef.current?.pause();
      athanAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const detectLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ latitude, longitude, city: "Current Location", country: "Auto" });
            setQiblaBearing(calculateQiblaBearing(latitude, longitude));
          },
          () => {
            const defaultLoc = { latitude: 33.8938, longitude: 35.5018, city: "Beirut", country: "Lebanon" };
            setLocation(defaultLoc);
            setQiblaBearing(calculateQiblaBearing(defaultLoc.latitude, defaultLoc.longitude));
          }
        );
      }
    };
    detectLocation();
  }, []);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const compassHeading = (e as any).webkitCompassHeading || (360 - (e.alpha || 0));
      setHeading(compassHeading);
    };

    if (view === 'qibla') {
      window.addEventListener('deviceorientation', handleOrientation, true);
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission().catch(console.error);
      }
    } else {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    }

    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, [view]);

  const fetchData = useCallback(async (isFullRefresh = false) => {
    if (!location) return;
    setError(null);
    if (isFullRefresh) setLoading(true);
    else setCalendarLoading(true);

    try {
      const now = new Date();
      const targetMonth = selectedMonthIdx + 1;
      const targetYear = selectedYear;
      const hijriMonthParam = calendarType === 'hijri' ? HIJRI_MONTHS[selectedMonthIdx] : undefined;

      const data = await getDetailedSchedule(
        location.city, 
        targetYear, 
        targetMonth, 
        location.country, 
        hijriMonthParam
      );
      
      if (!data || data.length === 0) {
        throw new Error("Unable to load schedule. Our servers are currently busy.");
      }

      const formattedData: DayInfo[] = data.map((d: any) => {
        const maghrib = d.maghrib;
        const ghiyabHumra = addMinutes(maghrib, 10);
        return {
          date: d.date,
          hijriDate: d.hijri || "...",
          times: {
            imsak: d.imsak || d.fajr,
            fajr: d.fajr,
            sunrise: d.sunrise || "06:15",
            dhuhr: d.dhuhr,
            asr: d.asr,
            maghrib: maghrib,
            ghiyabHumra: ghiyabHumra,
            isha: d.isha,
          }
        };
      });

      setSchedule(formattedData);
      
      const todayStr = now.toISOString().split('T')[0];
      const foundToday = formattedData.find(d => d.date.includes(todayStr));
      if (foundToday || isFullRefresh) {
         setTodaySchedule(foundToday || formattedData[0]);
      }

      if (isFullRefresh) {
        getRamadanInsight(location.city, now.toLocaleTimeString(), "Maghrib").then(setInsight);
      }
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
        setError("API Quota Reached. Using cached data if available. Please try again in a few minutes.");
      } else {
        setError(msg || "Something went wrong while fetching data.");
      }
    } finally {
      setLoading(false);
      setCalendarLoading(false);
    }
  }, [location, selectedMonthIdx, selectedYear, calendarType]);

  useEffect(() => {
    fetchData(true);
  }, [location]);

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    fetchData(false);
  }, [selectedMonthIdx, selectedYear, calendarType]);

  useEffect(() => {
    if (showLocationModal && countries.length === 0) {
      setLocationLoading(true);
      getCountries().then(res => {
        setCountries(res);
        setLocationLoading(false);
      }).catch(() => {
        setLocationLoading(false);
      });
    }
  }, [showLocationModal]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (isAthanEnabled && todaySchedule) {
        const currentHM = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const maghribTime = todaySchedule.times.maghrib;

        if (currentHM === maghribTime && lastAthanTriggeredRef.current !== currentHM) {
          athanAudioRef.current?.play().catch(console.error);
          lastAthanTriggeredRef.current = currentHM;
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [todaySchedule, isAthanEnabled]);

  const filteredCountries = useMemo(() => {
    return countries.filter(c => c.toLowerCase().includes(locationSearch.toLowerCase()));
  }, [countries, locationSearch]);

  const filteredCities = useMemo(() => {
    return cities.filter(c => c.toLowerCase().includes(locationSearch.toLowerCase()));
  }, [cities, locationSearch]);

  const handleCountrySelect = async (country: string) => {
    setSelectedCountry(country);
    setLocationSearch("");
    setLocationLoading(true);
    try {
      const cityList = await getCities(country);
      setCities(cityList);
    } catch (e) {
      setCities(["Major City 1", "Major City 2"]); // Fallback
    } finally {
      setLocationLoading(false);
    }
  };

  const handleCitySelect = (city: string) => {
    setLocation({ city, country: selectedCountry });
    setShowLocationModal(false);
    setSelectedCountry("");
    setCities([]);
    setLocationSearch("");
  };

  const getNextPrayer = useCallback(() => {
    if (!todaySchedule) return null;
    const nowStr = currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const keys = ['imsak', 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'ghiyabHumra', 'isha'] as const;
    
    for (const key of keys) {
      if (todaySchedule.times[key] > nowStr) {
        return { name: PRAYER_NAMES[key].en, time: todaySchedule.times[key] };
      }
    }
    return { name: PRAYER_NAMES.imsak.en, time: todaySchedule.times.imsak };
  }, [todaySchedule, currentTime]);

  const nextPrayer = getNextPrayer();

  const getTimezoneName = () => {
    try {
      return new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
        .formatToParts(new Date())
        .find(p => p.type === 'timeZoneName')?.value;
    } catch {
      return "";
    }
  };

  const prayerOrder = ['imsak', 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'ghiyabHumra', 'isha'];

  const formattedGregorianDate = useMemo(() => {
    return currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [currentTime]);

  const handlePrevMonth = () => {
    setSelectedMonthIdx(prev => (prev === 0 ? 11 : prev - 1));
    if (selectedMonthIdx === 0) setSelectedYear(prev => prev - 1);
  };

  const handleNextMonth = () => {
    setSelectedMonthIdx(prev => (prev === 11 ? 0 : prev + 1));
    if (selectedMonthIdx === 11) setSelectedYear(prev => prev + 1);
  };

  if (loading && !showLocationModal) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#006837] text-white p-8 text-center">
        <div className="w-24 h-24 mb-6 relative">
           <div className="absolute inset-0 bg-[#c5a021] rounded-full animate-ping opacity-25"></div>
           <div className="relative bg-white p-4 rounded-full shadow-2xl flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-16 h-16 text-[#006837]" fill="currentColor">
                <path d="M50 10 C30 10 10 30 10 50 C10 70 30 90 50 90 C70 90 90 70 90 50 C90 30 70 10 50 10 Z M50 20 C65 20 78 32 80 47 L20 47 C22 32 35 20 50 20 Z M20 53 L80 53 C78 68 65 80 50 80 C35 80 22 68 20 53 Z" />
              </svg>
           </div>
        </div>
        <h1 className="text-2xl font-bold mb-2 font-arabic">رمضان كريم</h1>
        <h2 className="text-xl font-bold mb-2">Syncing Schedule</h2>
        <p className="text-emerald-100 opacity-80 text-sm">Calibrating to your local clock...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 max-w-md mx-auto flex flex-col relative shadow-2xl safe-top">
      {/* Header */}
      <header className="bg-[#006837] pt-8 pb-10 px-6 rounded-b-[3rem] shadow-2xl relative z-20">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Moon size={120} className="text-white" />
        </div>
        
        <div className="flex justify-between items-center mb-8 relative">
          <BayynatLogo />
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsAthanEnabled(!isAthanEnabled)}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${isAthanEnabled ? 'bg-white text-[#006837] shadow-lg' : 'bg-red-500/20 text-red-100'}`}
            >
              {isAthanEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 relative overflow-hidden">
          {error && (
            <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-[10px] font-bold py-1 px-4 flex items-center gap-2 animate-pulse z-30">
              <AlertCircle size={12} /> {error}
            </div>
          )}
          
          <div className="mb-4 border-b border-slate-50 pb-4">
            <div className="flex items-center gap-2 text-[#006837] mb-1">
              <CalendarDays size={16} />
              <p className="text-[10px] font-black uppercase tracking-widest">Today's Date</p>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-800">{todaySchedule?.hijriDate || '...'}</span>
              <span className="text-[11px] font-medium text-slate-400">{formattedGregorianDate}</span>
            </div>
          </div>

          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[#006837] font-bold text-xs uppercase tracking-widest mb-1">Upcoming Prayer</p>
              <h3 className="text-3xl font-black text-slate-800">{nextPrayer?.name}</h3>
            </div>
            <div className="bg-[#c5a021] text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
              {nextPrayer?.time}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-slate-500 border-t border-slate-50 pt-4">
            <div className="flex items-center gap-1.5 font-medium text-sm">
              <Clock size={16} className="text-[#c5a021]" />
              <span className="flex items-center gap-1">
                {cityTime}
                <span className="text-[10px] text-slate-300 font-bold bg-slate-100 px-1 rounded">{getCityTimezone(location?.city || "")}</span>
              </span>
            </div>
            <button 
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-1.5 font-bold text-sm text-[#006837] hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
            >
              <MapPin size={16} className="text-[#c5a021]" />
              <span className="truncate max-w-[100px]">{location?.city}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 pt-8 pb-32 overflow-y-auto z-10 scroll-smooth">
        {view === 'today' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-8 p-6 bg-emerald-50 rounded-2xl border-l-4 border-[#006837] relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <BookOpen size={40} className="text-[#006837]" />
              </div>
              <h4 className="text-[#006837] font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1">
                <Info size={12} /> Daily Spiritual Tip
              </h4>
              <p className="text-slate-700 italic text-sm leading-relaxed font-medium">"{insight || 'Loading spiritual reflection...'}"</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {prayerOrder.map((key) => {
                const time = (todaySchedule?.times as any)?.[key];
                if (!time) return null;
                const isNext = nextPrayer?.time === time;
                return (
                  <div 
                    key={key}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                      isNext 
                      ? 'bg-[#006837] border-[#006837] text-white shadow-xl scale-[1.02]' 
                      : 'bg-white border-slate-100 text-slate-800 hover:border-[#006837]/30 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isNext ? 'bg-white/20 text-white' : 'bg-slate-50 text-[#006837]'}`}>
                        {key === 'maghrib' || key === 'ghiyabHumra' ? <Moon size={20} /> : (key === 'fajr' || key === 'imsak' ? <Sun size={20} /> : <Clock size={20} />)}
                      </div>
                      <div>
                        <p className={`font-bold ${isNext ? 'text-white' : 'text-slate-800'}`}>{PRAYER_NAMES[key]?.en || key}</p>
                        <p className={`text-[10px] font-arabic font-bold ${isNext ? 'text-white/70' : 'text-slate-400'}`}>{PRAYER_NAMES[key]?.ar}</p>
                      </div>
                    </div>
                    <div className={`text-xl font-black font-mono ${isNext ? 'text-[#c5a021]' : 'text-slate-800'}`}>
                      {time}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 bg-white p-4 rounded-[2rem] shadow-md border border-slate-100">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex bg-slate-50 p-1 rounded-2xl w-full">
                     <button 
                        onClick={() => setCalendarType('gregorian')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${calendarType === 'gregorian' ? 'bg-[#006837] text-white shadow-md' : 'text-slate-400'}`}
                     >
                        Gregorian
                     </button>
                     <button 
                        onClick={() => setCalendarType('hijri')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${calendarType === 'hijri' ? 'bg-[#c5a021] text-white shadow-md' : 'text-slate-400'}`}
                     >
                        Hijri
                     </button>
                  </div>
               </div>

               <div className="flex items-center justify-between px-2">
                  <button onClick={handlePrevMonth} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-[#006837]">
                     <ChevronLeft size={20} />
                  </button>
                  <div className="text-center">
                     <p className="font-black text-slate-800">
                        {calendarType === 'gregorian' ? GREGORIAN_MONTHS[selectedMonthIdx] : HIJRI_MONTHS[selectedMonthIdx]}
                     </p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedYear}</p>
                  </div>
                  <button onClick={handleNextMonth} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-[#006837]">
                     <ChevronRight size={20} />
                  </button>
               </div>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl mb-4 relative min-h-[400px]">
              {calendarLoading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-[#006837] mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#006837]">Fetching Schedule...</p>
                </div>
              )}
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-[#006837]">Fajr</th>
                    <th className="p-4 text-[#c5a021]">Iftar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {schedule.length > 0 ? schedule.map((day, idx) => {
                    const isToday = day.date.includes(currentTime.toISOString().split('T')[0]);
                    return (
                      <tr key={idx} className={`${isToday ? 'bg-[#006837]/5' : ''} hover:bg-slate-50/50 transition-colors`}>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{day.hijriDate.split(' ')[0]} {day.hijriDate.split(' ')[1]}</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(day.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-[#006837] font-black font-mono">{day.times.fajr}</td>
                        <td className="p-4 text-[#c5a021] font-black font-mono">{day.times.maghrib}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={3} className="p-12 text-center text-slate-400">
                        <AlertCircle className="mx-auto mb-2 opacity-20" size={40} />
                        <p className="text-xs font-bold uppercase tracking-widest">No schedule found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'qibla' && (
          <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center">
             <h3 className="text-xl font-black text-slate-800 mb-10 flex items-center gap-3">
               <Compass className="text-[#006837]" /> Qibla Direction
             </h3>
             <div className="relative w-72 h-72 mb-12">
                <div className="absolute inset-0 rounded-full border-8 border-slate-100 shadow-inner"></div>
                <div className="absolute inset-8 rounded-full border-2 border-slate-50"></div>
                <div 
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
                  style={{ transform: `rotate(${- (heading || 0)}deg)` }}
                >
                  <div 
                    className="absolute w-2 h-full rounded-full transition-transform duration-500"
                    style={{ transform: `rotate(${qiblaBearing}deg)` }}
                  >
                    <div className="h-1/2 w-full bg-gradient-to-t from-[#006837] to-[#c5a021] rounded-t-full shadow-lg flex flex-col items-center">
                       <Navigation className="text-white mt-4 rotate-180" size={24} fill="white" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-4 border-[#006837] shadow-xl"></div>
             </div>
             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg text-center max-w-xs">
                <p className="text-4xl font-black text-[#006837] mb-2">{Math.round(qiblaBearing)}°</p>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">Align the golden needle with the top of your screen to find the Kaaba.</p>
             </div>
          </div>
        )}

        {view === 'duas' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <h3 className="text-xl font-black text-slate-800 px-2 flex items-center gap-3">
              <BookOpen className="text-[#006837]" /> Ramadan Supplications
            </h3>
            {RAMADAN_DUAS.map((dua) => (
              <div key={dua.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md space-y-4">
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <span className="text-[10px] font-black uppercase text-[#c5a021] bg-[#c5a021]/10 px-3 py-1 rounded-full">{dua.category}</span>
                  <p className="font-bold text-slate-800 text-sm">{dua.title}</p>
                </div>
                <p className="font-arabic text-3xl text-right leading-loose text-[#006837] py-2">
                  {dua.arabic}
                </p>
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                  <p className="text-xs text-slate-400 italic font-medium">"{dua.transliteration}"</p>
                  <p className="text-sm text-slate-700 leading-relaxed font-semibold">{dua.translation}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-6 left-6 right-6 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex items-center justify-around p-3 z-[100]">
        {[
          { id: 'today', icon: Clock, label: 'Today' },
          { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
          { id: 'qibla', icon: Compass, label: 'Qibla' },
          { id: 'duas', icon: BookOpen, label: 'Duas' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as AppView)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 group ${view === item.id ? 'text-[#006837]' : 'text-slate-300'}`}
          >
            <div className={`p-2 rounded-2xl transition-all ${view === item.id ? 'bg-[#006837]/10 scale-110' : 'group-hover:bg-slate-50'}`}>
              <item.icon size={24} strokeWidth={view === item.id ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${view === item.id ? 'opacity-100' : 'opacity-0'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md h-[80vh] sm:h-auto sm:max-h-[85vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-500 overflow-hidden">
            <div className="p-8 pb-4">
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    {selectedCountry && (
                      <button 
                        onClick={() => { setSelectedCountry(""); setCities([]); setLocationSearch(""); }}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <ChevronLeft size={20} className="text-[#006837]" />
                      </button>
                    )}
                    <h3 className="text-2xl font-black text-[#006837]">
                      {selectedCountry ? 'Select City' : 'Select Country'}
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-1 ml-1">
                    <Globe size={10} /> {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </p>
                </div>
                <button 
                  onClick={() => { setShowLocationModal(false); setSelectedCountry(""); setCities([]); setLocationSearch(""); }}
                  className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative mb-4">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search size={18} />
                </div>
                <input 
                  type="text"
                  placeholder={selectedCountry ? `Search city in ${selectedCountry}...` : "Search countries..."}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-[#006837]/20 font-medium placeholder:text-slate-300"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8">
              {locationLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="animate-spin text-[#c5a021] mb-2" size={32} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Updating Database...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {selectedCountry ? (
                    filteredCities.map((city) => (
                      <button
                        key={city}
                        onClick={() => handleCitySelect(city)}
                        className="flex items-center justify-between p-4 rounded-2xl hover:bg-emerald-50 text-left transition-colors border border-transparent hover:border-emerald-100 group"
                      >
                        <span className="font-bold text-slate-700 group-hover:text-[#006837]">{city}</span>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-[#006837]" />
                      </button>
                    ))
                  ) : (
                    filteredCountries.map((country) => (
                      <button
                        key={country}
                        onClick={() => handleCountrySelect(country)}
                        className="flex items-center justify-between p-4 rounded-2xl hover:bg-emerald-50 text-left transition-colors border border-transparent hover:border-emerald-100 group"
                      >
                        <span className="font-bold text-slate-700 group-hover:text-[#006837]">{country}</span>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-[#006837]" />
                      </button>
                    ))
                  )}
                  {(selectedCountry ? filteredCities : filteredCountries).length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <Search size={32} className="mx-auto mb-2 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">No results found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
