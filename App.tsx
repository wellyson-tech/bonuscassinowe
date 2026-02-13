
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
  const [pagesOrder, setPagesOrder] = useState<string[]>([]);
  
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
        await fetchBrand();
        await Promise.all([fetchLinks(), fetchSocials()]);
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

  useEffect(() => {
    if (brand.logoUrl) {
      const fav = document.getElementById('dynamic-favicon') as HTMLLinkElement;
      const apple = document.getElementById('dynamic-apple-icon') as HTMLLinkElement;
      if (fav) fav.href = brand.logoUrl;
      if (apple) apple.href = brand.logoUrl;
      document.title = brand.name;
    }
  }, [brand]);

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
        
        if (data.footer_text && data.footer_text.includes('ORDER:')) {
            try {
                const orderPart = data.footer_text.split('ORDER:')[1];
                const parsedOrder = JSON.parse(orderPart);
                if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
                  setPagesOrder(parsedOrder);
                }
            } catch(e) {}
        }
      }
    } catch (e) {}
  };

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('position', { ascending: true });
      if (!error && data) setLinks(data);
    } catch (e) {}
  };

  const fetchSocials = async () => {
    try {
      const { data } = await supabase.from('social_links').select('*').order('position', { ascending: true });
      if (data) setSocials(data);
    } catch (e) {}
  };

  const categories = useMemo(() => {
    const foundCats: string[] = [];
    links.forEach(l => {
      const name = (l.category as string || 'Página 1').trim();
      // FILTRO: Não mostrar 'Roleta' na home
      if (name.toLowerCase() !== 'roleta' && !foundCats.includes(name)) {
        foundCats.push(name);
      }
    });
    if (foundCats.length === 0 && pagesOrder.length === 0) return ['Página 1'];
    const ordered = pagesOrder.filter(c => foundCats.includes(c));
    foundCats.forEach(c => { if (!ordered.includes(c)) ordered.push(c); });
    const finalCats = ordered.length > 0 ? ordered : foundCats;
    if (finalCats.length > 0 && (!activeCategory || !finalCats.includes(activeCategory))) {
        setActiveCategory(finalCats[0]);
    }
    return finalCats;
  }, [links, pagesOrder, activeCategory]);

  const filteredLinks = useMemo(() => {
    const targetCat = (activeCategory || categories[0] || 'Página 1').trim();
    return links.filter(l => {
      const cat = (l.category as string || 'Página 1').trim();
      return cat === targetCat && cat.toLowerCase() !== 'roleta';
    });
  }, [links, activeCategory, categories]);

  const changeCategory = (cat: string) => {
    if (cat.trim() === activeCategory.trim()) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveCategory(cat.trim());
      setIsTransitioning(false);
    }, 300);
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
    } catch (err) { setLoginError('Credenciais inválidas'); } finally { setLoginLoading(false); }
  };

  const BackgroundElements = () => {
    const effect = brand.effect || 'scanner';
    return (
      <div className="effect-container">
        <div className="fixed inset-0 bg-black -z-30" />
        {brand.backgroundUrl && (
          <div className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat opacity-40 transition-opacity duration-1000" style={{ backgroundImage: `url(${brand.backgroundUrl})`, backgroundAttachment: 'fixed' }} />
        )}
        {effect === 'scanner' && <div className="scanner-beam" />}
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
        <div className="w-full max-sm glass-card p-10 rounded-[3.5rem] text-center z-10 border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-black uppercase text-shimmer tracking-tighter italic mb-10">Admin Access</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-2xl text-white outline-none focus:border-yellow-500" placeholder="E-mail" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-2xl text-white outline-none focus:border-yellow-500 font-mono" placeholder="Senha" />
            {loginError && <p className="text-[10px] text-red-500 uppercase font-black">{loginError}</p>}
            <button type="submit" disabled={loginLoading} className="w-full py-5 bg-yellow-500 text-black font-black rounded-2xl uppercase text-[11px] tracking-widest">{loginLoading ? '...' : 'Acessar Master'}</button>
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
            <p className="text-[12px] font-bold text-white uppercase tracking-[0.3em] mt-5 px-4 text-center border-t border-white/10 pt-4">{brand.tagline}</p>
          </div>
        </header>
        
        {categories.length > 1 && (
          <nav className="w-full mb-12 sticky top-4 z-50 px-2">
            <div className="glass-card p-2 rounded-[2.5rem] flex items-center border border-white/5 relative">
              <div className="absolute h-[calc(100%-16px)] bg-yellow-500 rounded-[2rem] transition-all duration-500" style={{ width: `${100 / categories.length}%`, left: `${(categories.indexOf(activeCategory.trim()) * (100 / categories.length))}%`, margin: '0 0' }} />
              {categories.map((cat) => (
                <button key={cat} onClick={() => changeCategory(cat)} className={`relative z-10 flex-1 py-4 text-[10px] font-black uppercase transition-colors ${activeCategory.trim() === cat.trim() ? 'text-black' : 'text-gray-500 hover:text-white'}`}>{cat}</button>
              ))}
            </div>
          </nav>
        )}
        <div className={`w-full space-y-6 mb-16 transition-all duration-300 min-h-[400px] ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {filteredLinks.map((link) => (
            <LinkButton key={link.id} link={link} />
          ))}
        </div>
        <footer className="w-full text-center space-y-12">
          <div className="flex justify-center gap-6">
            {socials.map((social) => (
              <a key={social.id} href={social.url} target="_blank" className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white transition-all hover:-translate-y-1 hover:border-yellow-500/50">
                <div className="w-6 h-6">{Icons[social.icon] || social.name.charAt(0)}</div>
              </a>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.4em]">{brand.footerText?.split('ORDER:')[0] || `${brand.name} © 2025`}</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
