
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { BRAND as DEFAULT_BRAND, ADMIN_UID, Icons } from './constants';
import LinkButton from './components/LinkButton';
import AdminPanel from './components/AdminPanel';
import { CasinoLink, CasinoBrand, SocialLink } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'public' | 'login' | 'admin'>('public');
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [brand, setBrand] = useState<CasinoBrand>(DEFAULT_BRAND);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [initializing, setInitializing] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const handleNavigation = async () => {
      const hash = window.location.hash;
      const { data: { session } } = await supabase.auth.getSession();
      if (hash === '#/admin-secret') {
        if (session && session.user.id === ADMIN_UID) setView('admin');
        else setView('login');
      } else {
        setView('public');
      }
    };

    const initApp = async () => {
      try {
        await handleNavigation();
        await Promise.all([fetchLinks(), fetchBrand(), fetchSocials()]);
      } catch (e) {
        console.error("Erro na inicialização:", e);
      } finally {
        setInitializing(false);
      }
    };

    initApp();
    window.addEventListener('hashchange', handleNavigation);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  const fetchBrand = async () => {
    try {
      const { data, error } = await supabase.from('brand_settings').select('*').eq('id', 1).single();
      if (data && !error) {
        setBrand({
          name: data.name,
          tagline: data.tagline,
          logoUrl: data.logo_url,
          backgroundUrl: data.background_url,
          verified: data.verified,
          footerText: data.footer_text,
          effect: data.effect || 'scanner'
        });
      }
    } catch (e) {}
  };

  const fetchSocials = async () => {
    try {
      const { data } = await supabase.from('social_links').select('*').order('position', { ascending: true });
      if (data) setSocials(data);
    } catch (e) {}
  };

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('position', { ascending: true });
      
      if (!error && data) {
        setLinks(data);
        const cats = Array.from(new Set(data.map(l => (l.category as string || 'Página 1').trim())));
        if (cats.length > 0) {
          if (!activeCategory || !cats.includes(activeCategory.trim())) {
            // Fix: Cast unknown element from cats array to string
            setActiveCategory(cats[0] as string);
          }
        }
      }
    } catch (e) {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user?.id === ADMIN_UID) setView('admin');
      else {
        await supabase.auth.signOut();
        setLoginError('Acesso negado.');
      }
    } catch (err: any) {
      setLoginError('Credenciais inválidas');
    } finally {
      setLoginLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = links.map(l => (l.category as string || 'Página 1').trim());
    const uniqueCats = Array.from(new Set(cats));
    return uniqueCats.length > 0 ? uniqueCats : ['Página 1'];
  }, [links]);

  const filteredLinks = useMemo(() => {
    const targetCat = (activeCategory || (categories[0] || 'Página 1')).trim();
    return links.filter(l => (l.category as string || 'Página 1').trim() === targetCat);
  }, [links, activeCategory, categories]);

  const changeCategory = (cat: string) => {
    const cleanCat = cat.trim();
    if (cleanCat === activeCategory.trim()) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveCategory(cleanCat);
      setIsTransitioning(false);
    }, 300);
  };

  const BackgroundElements = () => {
    const effect = brand.effect || 'scanner';
    return (
      <div className="effect-container">
        <div className="fixed inset-0 bg-black -z-30" />
        {brand.backgroundUrl && (
          <div 
            className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat opacity-40 transition-opacity duration-1000"
            style={{ backgroundImage: `url(${brand.backgroundUrl})`, backgroundAttachment: 'fixed' }}
          />
        )}
        {effect === 'scanner' && <div className="scanner-beam" />}
        {effect === 'gold-rain' && Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="gold-particle" style={{ left: `${Math.random() * 100}%`, animationDuration: `${2 + Math.random() * 3}s`, animationDelay: `${Math.random() * 5}s` }} />
        ))}
        {effect === 'matrix' && Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="matrix-column" style={{ left: `${(i * 3.3)}%`, animationDuration: `${3 + Math.random() * 5}s`, animationDelay: `${Math.random() * 5}s` }}>
            {Array.from({ length: 20 }).map(() => String.fromCharCode(0x30A0 + Math.random() * 96)).join('')}
          </div>
        ))}
        {effect === 'fire' && Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="fire-ember" style={{ left: `${Math.random() * 100}%`, animationDuration: `${3 + Math.random() * 4}s`, animationDelay: `${Math.random() * 5}s`, width: `${2 + Math.random() * 4}px` }} />
        ))}
        {effect === 'money' && Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="money-item" style={{ left: `${Math.random() * 100}%`, animationDuration: `${4 + Math.random() * 6}s`, animationDelay: `${Math.random() * 8}s` }}>
            {['💵', '💰', '🎰', '💎', '🪙'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
        {effect === 'space' && Array.from({ length: 100 }).map((_, i) => (
          <div key={i} className="star" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDuration: `${1 + Math.random() * 3}s`, animationDelay: `${Math.random() * 5}s` }} />
        ))}
        {effect === 'aurora' && <><div className="aurora-layer" style={{ top: '10%' }} /><div className="aurora-layer" style={{ top: '30%', animationDelay: '-10s', opacity: 0.5 }} /></>}
        {effect === 'confetti' && Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="confetti" style={{ left: `${Math.random() * 100}%`, backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`, animationDuration: `${3 + Math.random() * 4}s`, animationDelay: `${Math.random() * 5}s` }} />
        ))}
        {effect === 'snow' && Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="snow-particle" style={{ left: `${Math.random() * 100}%`, width: `${2 + Math.random() * 4}px`, height: `${2 + Math.random() * 4}px`, animationDuration: `${5 + Math.random() * 10}s`, animationDelay: `${Math.random() * 10}s` }} />
        ))}
        {effect === 'lightning' && <div className="lightning-flash animate-lightning" />}
        {effect === 'glitch' && Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="glitch-line" style={{ animationDelay: `${Math.random() * 2}s`, opacity: Math.random() * 0.3 }} />
        ))}
        <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 -z-15 pointer-events-none" />
      </div>
    );
  };

  if (initializing) return null;
  if (view === 'admin') return <AdminPanel />;

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
        <BackgroundElements />
        <div className="w-full max-w-sm glass-card p-10 rounded-[3.5rem] text-center z-10 border border-white/10">
          <h2 className="text-3xl font-black uppercase text-shimmer tracking-tighter italic mb-10">Admin Login</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-2xl text-white outline-none focus:border-yellow-500" placeholder="E-mail" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-2xl text-white outline-none focus:border-yellow-500 font-mono" placeholder="Senha" />
            {loginError && <p className="text-[10px] text-red-500 uppercase font-black">{loginError}</p>}
            <button type="submit" disabled={loginLoading} className="w-full py-5 bg-yellow-500 text-black font-black rounded-2xl uppercase text-[11px] tracking-widest">{loginLoading ? 'Carregando...' : 'Acessar Painel'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative font-sans overflow-x-hidden pb-20">
      <BackgroundElements />
      <main className="relative z-10 max-w-lg mx-auto px-6 py-16 flex flex-col items-center">
        <header className="text-center mb-12 w-full flex flex-col items-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-yellow-500/30 blur-[70px] rounded-full scale-110"></div>
            <div className="w-32 h-32 p-1 rounded-full bg-gradient-to-br from-yellow-200 via-yellow-600 to-yellow-300 relative animate-float shadow-2xl overflow-hidden">
              <img src={brand.logoUrl} className="w-full h-full rounded-full object-cover border-[5px] border-black" alt={brand.name} />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-4xl font-black uppercase tracking-tighter text-shimmer italic leading-tight">{brand.name}</h1>
              {brand.verified && (
                <div className="ig-verified-wrapper">
                  <svg viewBox="0 0 24 24" className="ig-verified-bg"><path d="M12 2L14.4 4.8L17.7 4.2L18.7 7.5L21.8 8.8L21 12L21.8 15.2L18.7 16.5L17.7 19.8L14.4 19.2L12 22L9.6 19.2L6.3 19.8L5.3 16.5L2.2 15.2L3 12L2.2 8.8L5.3 7.5L6.3 4.2L9.6 4.8L12 2Z" /></svg>
                  <svg viewBox="0 0 24 24" className="ig-verified-check"><path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z" /></svg>
                </div>
              )}
            </div>
            <p className="text-[12px] font-bold text-white uppercase tracking-[0.3em] mt-5 px-4 text-center max-w-[320px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] border-t border-white/10 pt-4">
              {brand.tagline}
            </p>
          </div>
        </header>
        {categories.length > 1 && (
          <nav className="w-full mb-12 sticky top-4 z-50 px-2">
            <div className="glass-card p-2 rounded-[2.5rem] flex items-center justify-between border border-white/5 shadow-2xl overflow-hidden relative">
              <div 
                className="absolute h-[calc(100%-16px)] bg-yellow-500 rounded-[2rem] transition-all duration-500 z-0"
                style={{
                  width: `${100 / categories.length}%`,
                  left: `${(categories.indexOf(activeCategory.trim()) * (100 / categories.length))}%`,
                  margin: '0 8px'
                }}
              />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => changeCategory(cat)}
                  className={`relative z-10 flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-colors duration-500 ${
                    activeCategory.trim() === cat.trim() ? 'text-black' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </nav>
        )}
        <div className={`w-full space-y-6 mb-16 transition-all duration-300 min-h-[400px] ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          {filteredLinks.map((link, idx) => (
            <div key={link.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
              <LinkButton link={link} />
            </div>
          ))}
        </div>
        <footer className="w-full text-center space-y-12">
          <div className="flex justify-center gap-6">
            {socials.map((social) => (
              <a key={social.id} href={social.url} target="_blank" rel="noopener noreferrer" className="w-16 h-16 flex items-center justify-center rounded-[2rem] bg-white/5 border border-white/10 hover:border-yellow-500/50 text-white transition-all hover:-translate-y-2">
                <div className="w-7 h-7">{Icons[social.icon] || social.name.charAt(0)}</div>
              </a>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.4em]">
            {brand.footerText || `${brand.name} © 2025`}
          </p>
        </footer>
      </main>
    </div>
  );
};

export default App;
