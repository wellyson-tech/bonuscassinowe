
export interface CasinoLink {
  id?: string;
  title: string;
  description: string;
  url: string;
  type: 'gold' | 'neon-purple' | 'neon-green' | 'glass';
  icon: string;
  badge?: string;
  position: number;
  click_count?: number; // Contador de acessos
  is_highlighted: boolean;
  created_at?: string;
}

export interface CasinoBrand {
  name: string;
  tagline: string;
  logoUrl: string;
  verified: boolean;
}
