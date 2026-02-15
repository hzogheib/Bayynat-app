
import React from 'react';
import { Dua } from './types';

export const ATHAN_AUDIO_URL = "https://www.islamicfinder.org/prayer-times/athan/athan-madina.mp3";

export const PRAYER_NAMES: Record<string, { en: string; ar: string }> = {
  imsak: { en: "Imsak", ar: "إمساك" },
  fajr: { en: "Fajr", ar: "الفجر" },
  sunrise: { en: "Sunrise", ar: "الشروق" },
  dhuhr: { en: "Dhuhr", ar: "الظهر" },
  asr: { en: "Asr", ar: "العصر" },
  maghrib: { en: "Iftar / Maghrib", ar: "المغرب" },
  ghiyabHumra: { en: "Ghiyab Al-Humra", ar: "غياب الحمرة" },
  isha: { en: "Isha", ar: "العشاء" },
};

export const MECCA_COORDS = { lat: 21.4225, lng: 39.8262 };

export const RAMADAN_DUAS: Dua[] = [
  {
    id: 'ya-aliyyu',
    title: 'Dua after every Obligatory Prayer',
    arabic: 'يَا عَلِيُّ يَا عَظِيمُ، يَا غَفُورُ يَا رَحِيمُ، أَنْتَ الرَّبُّ الْعَظِيمُ الَّذِي لَيْسَ كَمِثْلِهِ شَيْءٌ وَهُوَ السَّمِيعُ الْبَصِيرُ',
    transliteration: 'Ya ‘Aliyyu ya ‘Azim, ya Ghafuru ya Rahim, Anta-r-Rabbu-l-‘Azimul-ladhi laysa kamithlihi shay’un wa huwa-s-Sami‘ul-Basir',
    translation: 'O High, O Mighty, O Forgiving, O Merciful, You are the Mighty Lord, Who has none like Him, and He is the All-hearing, the All-seeing.',
    category: 'daily'
  },
  {
    id: 'allahumma-adkhil',
    title: 'Dua for the People of the Graves',
    arabic: 'اللَّهُمَّ أَدْخِلْ عَلَى أَهْلِ الْقُبُورِ السُّرُورَ، اللَّهُمَّ أَغْنِ كُلَّ فَقِيرٍ، اللَّهُمَّ أَشْبِعْ كُلَّ جَائِعٍ',
    transliteration: 'Allahumma adkhil ‘ala ahli-l-quburi-s-surur, Allahumma aghni kulla faqir, Allahumma ashbi‘ kulla ja’i‘',
    translation: 'O Allah, give happiness to the people of the graves; O Allah, enrich every poor person; O Allah, satisfy every hungry person.',
    category: 'daily'
  },
  {
    id: 'shia-iftar',
    title: 'Iftar Supplication (Bayynat Recommended)',
    arabic: 'بِسْمِ اللَّهِ اللَّهُمَّ لَكَ صُمْنَا وَعَلَى رِزْقِكَ أَفْطَرْنَا فَتَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ',
    transliteration: 'Bismillah, Allahumma laka sumna wa ‘ala rizqika aftarna, fataqabbal minna, innaka Antas-Sami‘ul-‘Alim',
    translation: 'In the name of Allah, O Allah, for You we have fasted and with Your provision we have broken our fast, so accept it from us; surely You are the All-hearing, the All-knowing.',
    category: 'iftar'
  },
  {
    id: 'suhoor-intent',
    title: 'Niyyah for Fasting',
    arabic: 'أَصُومُ غَدًا مِنْ شَهْرِ رَمَضَانَ وُجُوباً لِقُرْبَةِ اللهِ تَعَالى',
    transliteration: 'Asumu ghadan min shahri Ramadhana wujuban li-qurbati Allahi Ta’ala',
    translation: 'I will fast tomorrow for the month of Ramadan as an obligation for the sake of Allah, the Most High.',
    category: 'suhoor'
  },
  {
    id: 'day-1',
    title: 'Dua for the First Day',
    arabic: 'اللَّهُمَّ اجْعَلْ صِيَامِي فِيهِ صِيَامَ الصَّائِمِينَ، وَقِيَامِي فِيهِ قِيَامَ الْقَائِمِينَ، وَنَبِّهْنِي فِيهِ عَنْ نَوْمَةِ الْغَافِلِينَ',
    transliteration: 'Allahummaj-’al siyami fihi siyama-s-sa’imin, wa qiyami fihi qiyama-l-qa’imin, wa nabbihni fihi ‘an nawmati-l-ghafilin',
    translation: 'O Allah, make my fasts in this month the fasts of those who sincerely fast, and my standing up in prayer of those who truly stand up in prayer, and awaken me from the sleep of the heedless.',
    category: 'daily'
  },
  {
    id: 'forgiveness-ramadan',
    title: 'General Prayer for Forgiveness',
    arabic: 'اللَّهُمَّ اغْفِرْ لِي ذُنُوبِي كُلَّهَا، دِقَّهَا وَجِلَّهَا، وَأَوَّلَهَا وَآخِرَهَا، وَعَلانِيَتَهَا وَسِرَّهَا',
    transliteration: 'Allahummagh-fir li dhunubi kullaha, diqqaha wa jillaha, wa awwalaha wa akhiraha, wa ‘alaniyataha wa sirraha',
    translation: 'O Allah, forgive all my sins, the small and the great, the first and the last, the open and the secret.',
    category: 'general'
  }
];

export function calculateQiblaBearing(userLat: number, userLng: number): number {
  const φ1 = userLat * (Math.PI / 180);
  const φ2 = MECCA_COORDS.lat * (Math.PI / 180);
  const Δλ = (MECCA_COORDS.lng - userLng) * (Math.PI / 180);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let θ = Math.atan2(y, x);
  θ = θ * (180 / Math.PI);
  return (θ + 360) % 360;
}
