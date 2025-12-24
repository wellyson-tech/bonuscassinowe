
export interface CasinoLink {
  id?: string;
  title: string;
  description: string;
  url: string;
  type: 'gold' | 'neon-purple' | 'neon-green' | 'glass';
  icon: 'slot' | 'chip' | 'card' | 'crown' | 'fire' | 'trophy';
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
