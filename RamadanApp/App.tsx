import React from 'react';

function App() {
  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <h1>Ramadan App</h1>
      <p>Welcome! The app is now reset and ready for new code.</p>
      <p>Today's date: February 17, 2026</p>
    </div>
  );
}

export default App;
        } from 'lucide-react';
        import { PRAYER_NAMES, ATHAN_AUDIO_URL, RAMADAN_DUAS, calculateQiblaBearing } from './constants';
        import { AppLocation, DayInfo, AppView } from './types';
        import { getRamadanInsight, getDetailedSchedule } from './services/geminiService';
        import { RAMADAN_2026_PRAYER_TIMES, RamadanDay } from './ramadanTimes2026';
        import { DateTime } from 'luxon';

        // Utility: Map city name to IANA timezone string
        function getCityTimezone(city: string): string {
          const cityTimezones: Record<string, string> = {
            "Beirut": "Asia/Beirut",
            "Riyadh": "Asia/Riyadh",
            "Marseille": "Europe/Paris",
            "Doha": "Asia/Qatar",
            "Nabatiyeh": "Asia/Beirut",
            "London": "Europe/London",
            "New York": "America/New_York",
            "Karachi": "Asia/Karachi",
            "Dubai": "Asia/Dubai",
            "Cairo": "Africa/Cairo",
            "Current Location": DateTime.local().zoneName,
          };
          return cityTimezones[city] || DateTime.local().zoneName;
        }

        // Simple BayynatLogo component
        function BayynatLogo() {
          return (
            <span className="font-black text-xl text-[#c5a021]">Bayynat</span>
          );
        }

        function App() {
          // State declarations
          const [rememberLocation, setRememberLocation] = useState(false);
          const [showLocationModal, setShowLocationModal] = useState(() => {
            const savedLocation = localStorage.getItem('savedLocation');
            return !savedLocation;
          });
          const [location, setLocation] = useState<AppLocation | null>(null);
          const [currentTime, setCurrentTime] = useState(new Date());
          const [schedule, setSchedule] = useState<DayInfo[]>([]);
          const [todaySchedule, setTodaySchedule] = useState<DayInfo | null>(null);
          const strictRamadanCities = [
            'Beirut',
            'Riyadh',
            'Marseille',
            'Doha',
            'Nabatiyeh',
          ];
          const [insight, setInsight] = useState<string>("");
          const [isAthanEnabled, setIsAthanEnabled] = useState(true);
          const [loading, setLoading] = useState(true);
          const [calendarLoading, setCalendarLoading] = useState(false);
          const [view, setView] = useState<AppView>('today');
          const [heading, setHeading] = useState<number | null>(null);
          const [qiblaBearing, setQiblaBearing] = useState<number>(0);
          const [showInstallPrompt, setShowInstallPrompt] = useState(false);
          const [error, setError] = useState<string | null>(null);
          const [iftarCountdown, setIftarCountdown] = useState<string>("");
          const [calendarType, setCalendarType] = useState<'gregorian' | 'hijri'>('gregorian');
          const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
          const [selectedMonthIdx, setSelectedMonthIdx] = useState(new Date().getMonth());
          const [locationSearch, setLocationSearch] = useState("");
          const [selectedCountry, setSelectedCountry] = useState<string>("");
          const [cities, setCities] = useState<string[]>([]);
          const [countries, setCountries] = useState<string[]>(["Lebanon", "Saudi Arabia", "France", "Qatar", "UK", "USA", "Pakistan", "UAE", "Egypt"]);
          const [locationLoading, setLocationLoading] = useState(false);

          // Filtered cities/countries for search
          const filteredCities = cities.filter(city => city.toLowerCase().includes(locationSearch.toLowerCase()));
          const filteredCountries = countries.filter(country => country.toLowerCase().includes(locationSearch.toLowerCase()));

          // Handlers
          const handleCountrySelect = (country: string) => {
            setSelectedCountry(country);
            setLocationSearch("");
            setLocationLoading(true);
            // Simulate async city fetch
            setTimeout(() => {
              // In real app, fetch cities for country
              setCities(["Beirut", "Riyadh", "Marseille", "Doha", "Nabatiyeh"]); // Example
              setLocationLoading(false);
            }, 500);
          };

          const handleCitySelect = (city: string) => {
            setLocation({ city, country: selectedCountry });
            setShowLocationModal(false);
            if (rememberLocation) {
              localStorage.setItem('savedLocation', JSON.stringify({ city, country: selectedCountry }));
            }
          };

          // On mount, if a saved location exists, set it as the current location and close modal
          useEffect(() => {
            const savedLocation = localStorage.getItem('savedLocation');
            if (savedLocation) {
              try {
                const parsed = JSON.parse(savedLocation);
                if (parsed && parsed.city && parsed.country) {
                  setLocation(parsed);
                  setShowLocationModal(false);
                }
              } catch {}
            }
          }, []);

          // Iftar timer state and effect
          useEffect(() => {
            if (!todaySchedule || !todaySchedule.times.maghrib || !location) {
              setIftarCountdown("");
              return;
            }
            const tz = getCityTimezone(location.city);
            const now = DateTime.now().setZone(tz);
            const [maghribHour, maghribMinute] = todaySchedule.times.maghrib.split(":").map(Number);
            const maghrib = now.set({ hour: maghribHour, minute: maghribMinute, second: 0, millisecond: 0 });
            let diff = maghrib.diff(now, ['hours', 'minutes', 'seconds']).toObject();
            if (diff.hours! < 0 || diff.minutes! < 0 || diff.seconds! < 0) {
              diff = { hours: 0, minutes: 0, seconds: 0 };
            }
            const hours = Math.floor(diff.hours || 0);
            const minutes = Math.floor(diff.minutes || 0);
            const seconds = Math.floor(diff.seconds || 0);
            setIftarCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            const interval = setInterval(() => {
              const now = DateTime.now().setZone(tz);
              const maghrib = now.set({ hour: maghribHour, minute: maghribMinute, second: 0, millisecond: 0 });
              let diff = maghrib.diff(now, ['hours', 'minutes', 'seconds']).toObject();
              if (diff.hours! < 0 || diff.minutes! < 0 || diff.seconds! < 0) {
                diff = { hours: 0, minutes: 0, seconds: 0 };
              }
              const hours = Math.floor(diff.hours || 0);
              const minutes = Math.floor(diff.minutes || 0);
              const seconds = Math.floor(diff.seconds || 0);
              setIftarCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }, 1000);
            return () => clearInterval(interval);
          }, [todaySchedule, currentTime, location]);

          // Example variables for JSX (replace with your actual logic)
          const alignedHijriDate = "9 Ramadan 1447 AH";
          const formattedGregorianDate = "February 17, 2026";
          const nextPrayer = { name: "Maghrib", time: "18:00" };
          const cityTime = DateTime.now().toFormat("HH:mm");

          return (
            <div className="min-h-screen bg-slate-50 text-slate-900 max-w-md mx-auto flex flex-col relative shadow-2xl safe-top">
              {/* Header */}
              <header className="bg-[#006837] pt-4 pb-10 px-6 rounded-b-[3rem] shadow-2xl relative z-20">
                {/* Iftar Timer */}
                {iftarCountdown && (
                  <div className="flex flex-col items-center justify-center mb-4">
                    <span className="text-xs font-bold text-[#c5a021] uppercase tracking-widest">Time for Iftar</span>
                    <span className="text-3xl font-black text-white drop-shadow-lg font-mono">
                      {iftarCountdown === '00:00:00' || iftarCountdown === '0' ? 'افطارا شهيا' : iftarCountdown}
                    </span>
                  </div>
                )}
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
                      <span className="text-sm font-black text-slate-800">{alignedHijriDate || '...'}</span>
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
                    {/* ...existing code for today's view content... */}
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
                      {/* Remember my choice checkbox */}
                      <div className="flex items-center mb-4">
                        <input
                          id="remember-location"
                          type="checkbox"
                          className="mr-2 accent-[#006837]"
                          checked={rememberLocation}
                          onChange={e => setRememberLocation(e.target.checked)}
                        />
                        <label htmlFor="remember-location" className="text-sm text-slate-700 font-medium select-none">
                          Remember my choice
                        </label>
                      </div>
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
        }

        export default App;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 max-w-md mx-auto flex flex-col relative shadow-2xl safe-top">
      {/* Header */}
      <header className="bg-[#006837] pt-4 pb-10 px-6 rounded-b-[3rem] shadow-2xl relative z-20">
        {/* Iftar Timer */}
        {iftarCountdown && (
          <div className="flex flex-col items-center justify-center mb-4">
            <span className="text-xs font-bold text-[#c5a021] uppercase tracking-widest">Time for Iftar</span>
            <span className="text-3xl font-black text-white drop-shadow-lg font-mono">
              {iftarCountdown === '00:00:00' || iftarCountdown === '0' ? 'افطارا شهيا' : iftarCountdown}
            </span>
          </div>
        )}
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
                <span className="text-sm font-black text-slate-800">{alignedHijriDate || '...'}</span>
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
            {/* ...existing code for today's view content... */}
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
              {/* Remember my choice checkbox */}
              <div className="flex items-center mb-4">
                <input
                  id="remember-location"
                  type="checkbox"
                  className="mr-2 accent-[#006837]"
                  checked={rememberLocation}
                  onChange={e => setRememberLocation(e.target.checked)}
                />
                <label htmlFor="remember-location" className="text-sm text-slate-700 font-medium select-none">
                  Remember my choice
                </label>
              </div>
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
