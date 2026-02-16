
export interface CasinoLink {
  id?: string;
  title: string;
  description: string;
  url: string;
  type: 'gold' | 'neon-purple' | 'neon-green' | 'glass';
  icon: string;
  badge?: string;
  category?: string;
  position: number;
  click_count?: number;
  is_highlighted: boolean;
  created_at?: string;
}

export interface SocialLink {
  id?: string;
  name: string;
  url: string;
  icon: string;
  position: number;
}

export interface ExtraPageConfig {
  title: string;
  tagline: string;
  effect: string;
  badge: string;
}

export interface CasinoBrand {
  name: string;
  tagline: string;
  logoUrl: string;
  backgroundUrl?: string;
  verified: boolean;
  footerText?: string;
  effect?: 'scanner' | 'gold-rain' | 'cyber-grid' | 'nebula' | 'matrix' | 'fire' | 'money' | 'space' | 'aurora' | 'glitch' | 'confetti' | 'snow' | 'lightning' | 'none';
  roletaTitle?: string;
  roletaTagline?: string;
  roletaLogoUrl?: string;
  roletaEffect?: string;
  roletaBadgeText?: string;
  // Configurações para as novas páginas extras
  extraPages?: {
    bonusaleatorio?: ExtraPageConfig;
    cinco_bonus?: ExtraPageConfig;
  };
}
