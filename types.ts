
export interface CasinoLink {
  id?: string;
  title: string;
  description: string;
  url: string;
  type: 'gold' | 'neon-purple' | 'neon-green' | 'glass';
  icon: string;
  badge?: string;
  category?: string; // Campo para organizar por "Páginas" ou categorias
  position: number;
  click_count?: number;
  is_highlighted: boolean;
  created_at?: string;
}

export interface CasinoBrand {
  name: string;
  tagline: string;
  logoUrl: string;
  backgroundUrl?: string;
  verified: boolean;
}
