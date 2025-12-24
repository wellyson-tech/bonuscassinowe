
export interface CasinoLink {
  id?: string;
  title: string;
  description: string;
  url: string;
  type: 'gold' | 'neon-purple' | 'neon-green' | 'glass';
  icon: string; // Mudado de união de literais para string para suportar URLs ou 'auto'
  badge?: string;
  position: number;
  is_highlighted: boolean;
  created_at?: string;
}

export interface CasinoBrand {
  name: string;
  tagline: string;
  logoUrl: string;
  verified: boolean;
}
