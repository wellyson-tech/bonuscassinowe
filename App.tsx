
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { BRAND as DEFAULT_BRAND, ADMIN_UID, Icons } from './constants';
import LinkButton from './components/LinkButton';
import AdminPanel from './components/AdminPanel';
import { CasinoLink, CasinoBrand, SocialLink } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'public' | 'login' | 'admin' | 'roleta'>('public');
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [brand, setBrand] = useState<CasinoBrand>(DEFAULT_BRAND);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [initializing, setInitializing] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pagesOrder, setPagesOrder] = useState<string[]>([]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const handleNavigation = async () => {
      const hash = window.location.hash;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (hash === '#/admin-secret') {
          if (session && session.user.id === ADMIN_UID) setView('admin');
          else setView('login');
        } else if (hash === '#/roleta') {
          setView('roleta');
        } else {
          setView('public');
        }
      } catch (e) {
        setView('public');
      }
    };

    const initApp = async () => {
      try {
        await handleNavigation();
        await Promise.all([
          fetchBrand(),
          fetchLinks(),
          fetchSocials()
        ]);
      } catch (e) {
        console.error("Erro na inicialização:", e);
      } finally {
        // Força o encerramento do estado de inicialização para evitar tela preta
        setInitializing(false);
      }
    };

    initApp();
    window.addEventListener('hashchange', handleNavigation);
    return () => window.removeEventListener('hashchange', handleNavigation);
  }, []);

  const fetchBrand = async () => {
    try {
      const { data, error } = await supabase.from('brand_settings').select('*').eq('id', 1).single();
      if (data && !error) {
        setBrand({
          name: data.name, tagline: data.tagline, logoUrl: data.logo_url,
          backgroundUrl: data.background_url, verified: data.verified,
          footerText: data.footer_text, effect: data.effect || 'scanner'
        });
      }
    } catch (e) {}
  };

  const fetchLinks = async () => {
    try {
      const { data } = await supabase.from('links').select('*').order('position', { ascending: true });
      if (data) setLinks(data);
    } catch (e) {}
  };

  const fetchSocials = async () => {
    try {
      const { data } = await supabase.from('social_links').select('*').order('position', { ascending: true });
      if (data) setSocials(data);
    } catch (e) {}
  };

  const categories = useMemo(() => {
    const foundCats = Array.from(new Set(links.map(l => (l.category as string || 'Página 1').trim())));
    const filtered = foundCats.filter(c => c.toLowerCase() !== 'roleta');
    if (filtered.length > 0 && (!activeCategory || !filtered.includes(activeCategory))) {
        setActiveCategory(filtered[0]);
    }
    return filtered;
  }, [links, activeCategory]);

  const filteredLinks = useMemo(() => {
    if (view === 'roleta') {
      return links.filter(l => (l.category as string || '').toLowerCase() === 'roleta');
    }
    const targetCat = (activeCategory || categories[0] || 'Página 1').trim();
    return links.filter(l => (l.category as string || 'Página 1').trim() === targetCat);
  }, [links, activeCategory, categories, view]);

  const BackgroundElements = () => {
    const effect = brand.effect || 'scanner';
    return (
      <div className="effect-container">
        <div className="fixed inset-0 bg-black -z-30" />
        {brand.backgroundUrl && (
          <div className="fixed inset-0 -z-20 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${brand.backgroundUrl})` }} />
        )}
        {effect === 'scanner' && <div className="scanner-beam" />}
        {effect === 'gold-rain' && Array.from({ length: 40 }).map((_, i) => <div key={i} className="gold-particle" style={{ left: `${Math.random() * 100}%`, animationDuration: `${2+Math.random()*3}s` }} />)}
      </div>
    );
  };

  // Loader para evitar que o usuário veja apenas preto durante o fetch inicial
  if (initializing) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (view === 'admin') return <AdminPanel />;

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
        <BackgroundElements />
        <div className="w-full max-w-sm glass-card p-10 rounded-[3.5rem] text-center z-10 border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-black uppercase text-shimmer italic mb-10">Admin Access</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setLoginLoading(true);
            try {
              const { data, error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) throw error;
              if (data.user?.id === ADMIN_UID) setView('admin');
            } catch (err) {
              setLoginError('Credenciais inválidas');
            } finally {
              setLoginLoading(false);
            }
          }} className="space-y-5">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-2xl text-white outline-none focus:border-yellow-500 transition-all" placeholder="E-mail" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-2xl text-white outline-none focus:border-yellow-500 font-mono transition-all" placeholder="Senha" />
            {loginError && <p className="text-[10px] text-red-500 uppercase font-black text-center">{loginError}</p>}
            <button type="submit" disabled={loginLoading} className="w-full py-5 bg-yellow-500 text-black font-black rounded-2xl uppercase text-[11px] tracking-widest hover:bg-yellow-400 transition-all">{loginLoading ? 'Carregando...' : 'Entrar'}</button>
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
            <h1 className="text-4xl font-black uppercase tracking-tighter text-shimmer italic leading-tight">{brand.name}</h1>
            <p className="text-[12px] font-bold text-white uppercase tracking-[0.3em] mt-5 px-4 text-center max-w-[320px] opacity-70 border-t border-white/10 pt-4">{brand.tagline}</p>
          </div>
        </header>
        
        {categories.length > 1 && (
          <nav className="w-full mb-12 sticky top-4 z-50 px-2">
            <div className="glass-card p-2 rounded-[2.5rem] flex items-center justify-between border border-white/5 relative">
              <div 
                className="absolute h-[calc(100%-16px)] bg-yellow-500 rounded-[2rem] transition-all duration-500 z-0"
                style={{ width: `${100 / categories.length}%`, left: `${(categories.indexOf(activeCategory) * (100 / categories.length))}%`, margin: '0 8px' }}
              />
              {categories.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`relative z-10 flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-colors ${activeCategory === cat ? 'text-black' : 'text-gray-500'}`}>{cat}</button>
              ))}
            </div>
          </nav>
        )}

        <div className="w-full space-y-6 mb-16">
          {filteredLinks.map((link) => <LinkButton key={link.id} link={link} />)}
          {filteredLinks.length === 0 && <p className="text-center opacity-30 text-xs uppercase font-black py-10">Nenhum link encontrado</p>}
        </div>

        <footer className="w-full text-center space-y-12">
          <div className="flex justify-center gap-6">
            {socials.map((social) => (
              <a key={social.id} href={social.url} target="_blank" className="w-16 h-16 flex items-center justify-center rounded-[2rem] bg-white/5 border border-white/10 text-white transition-all hover:-translate-y-2">
                <div className="w-7 h-7">{Icons[social.icon] || social.name.charAt(0)}</div>
              </a>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.4em]">{brand.footerText || `${brand.name} © 2025`}</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
