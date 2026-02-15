
export interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  imsak: string;
  ghiyabHumra: string;
}

export interface AppLocation {
  latitude?: number;
  longitude?: number;
  city: string;
  country?: string;
}

export interface DayInfo {
  date: string;
  hijriDate: string;
  times: PrayerTimes;
}

export type AppView = 'today' | 'calendar' | 'qibla' | 'duas';

export enum CalculationMethod {
  BAYYNAT = 'Bayynat (Jaffari)',
  MWL = 'Muslim World League',
  ISNA = 'ISNA',
  EGYPT = 'Egypt',
  MAKKAH = 'Umm al-Qura',
  KARACHI = 'Karachi',
  TEHRAN = 'Tehran',
}

export interface Dua {
  id: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  category: 'daily' | 'iftar' | 'suhoor' | 'general';
}
