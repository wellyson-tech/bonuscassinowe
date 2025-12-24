
import React from 'react';
import { CasinoBrand } from './types';

export const ADMIN_UID = "5a7cd951-5bc2-4d63-8cf6-10c8e0b54178"; 

export const BRAND: CasinoBrand = {
  name: "Bônus CassinoWE",
  tagline: "As Melhores Plataformas com bônus estão aqui",
  logoUrl: "https://picsum.photos/seed/casino-logo/200/200",
  verified: true
};

export const SOCIAL_LINKS = [
  { name: 'Instagram', url: '#', icon: 'IG' },
  { name: 'Telegram', url: '#', icon: 'TG' },
  { name: 'WhatsApp', url: '#', icon: 'WA' },
];

export const Icons: Record<string, React.ReactNode> = {
  slot: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13H5V19H19V13M19 11C20.1 11 21 11.9 21 13V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V13C3 11.9 3.9 11 5 11V5C5 3.9 5.9 3 7 3H17C18.1 3 19 3.9 19 5V11M17 5H7V11H17V5M10 7H8V9H10V7M13 7H11V9H13V7M16 7H14V9H16V7Z" />
    </svg>
  ),
  '777': (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11,17H13L17,9H13V7H7V9H13L9,17M7,2H17A2,2 0 0,1 19,4V20A2,2 0 0,1 17,22H7A2,2 0 0,1 5,20V4A2,2 0 0,1 7,2M7,4V20H17V4H7Z" />
    </svg>
  ),
  crown: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5,16L3,5L8.5,10L12,4L15.5,10L21,5L19,16H5M19,19A1,1 0 0,1 18,20H6A1,1 0 0,1 5,19V18H19V19Z" />
    </svg>
  ),
  chip: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
    </svg>
  ),
  fire: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.55,11.2C17.32,10.9 17.05,10.64 16.79,10.38C15.56,9.19 15.39,8.16 15.39,7.15C15.39,5.74 15.94,4.41 15.94,3C15.94,2.79 15.92,2.57 15.89,2.37C14.96,3.06 14.19,4 13.71,5.08C13.24,6.15 13.06,7.34 13.23,8.5C13.26,8.74 13.3,9 13.35,9.22C12.44,8.4 11.83,7.24 11.69,5.97C11.66,5.65 11.66,5.33 11.68,5C10.15,6 9.17,7.72 9.17,9.66C9.17,10.25 9.27,10.82 9.45,11.35C8.9,10.9 8.44,10.35 8.12,9.73C7.57,10.85 7.27,12.11 7.27,13.43C7.27,17.43 10.5,20.67 14.5,20.67C18.5,20.67 21.73,17.43 21.73,13.43C21.73,12.63 21.6,11.87 21.36,11.16C20.36,12.16 18.91,12.56 17.55,11.2M14.5,19C11.93,19 9.85,16.92 9.85,14.35C9.85,13.68 10,13.04 10.26,12.47C11.61,13.82 13.68,14.07 15.3,13.04C16.33,12.38 16.92,11.33 16.92,10.21C17.84,11.25 18.23,12.75 17.75,14.1C17.27,15.45 16,16.36 14.57,16.36C14.07,16.36 13.6,16.24 13.18,16.03C13.56,17.72 12.18,19 10.5,19H14.5Z" />
    </svg>
  ),
  star: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" />
    </svg>
  ),
  diamond: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16,9H19L14,16L9,9H12V5H16M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z" />
    </svg>
  )
};
