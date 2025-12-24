
import React from 'react';
import { CasinoBrand } from './types';

export const BRAND: CasinoBrand = {
  name: "ROYAL STAKES",
  tagline: "O Destino Premium para Apostas Globais",
  logoUrl: "https://picsum.photos/seed/casino-logo/200/200",
  verified: true
};

export const SOCIAL_LINKS = [
  { name: 'Instagram', url: '#', icon: 'IG' },
  { name: 'Telegram', url: '#', icon: 'TG' },
  { name: 'WhatsApp', url: '#', icon: 'WA' },
];

export const Icons: Record<string, React.ReactNode> = {
  slot: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 2m6-6a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  chip: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  card: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  crown: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  fire: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.5-7 3 3 3.5 1.3 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1s.5 2.5 3 4c0 0-2 .5-2 2.5s1.5 4.5 5 5c0 0-3 1.5-3 3z" /></svg>,
  trophy: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 16v2a2 2 0 002 2h2a2 2 0 002-2v-2M9 9h6v6H9V9z" /></svg>
};
