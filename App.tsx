
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { BRAND as DEFAULT_BRAND, ADMIN_UID, Icons } from './constants';
import LinkButton from './components/LinkButton';
import AdminPanel from './components/AdminPanel';
import { CasinoLink, CasinoBrand, SocialLink } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'public' | 'login' | 'admin' | 'roleta' | 'bonusaleatorio' | '5debonus'>('public');
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [brand, setBrand] = useState<CasinoBrand>({
    ...DEFAULT_BRAND,
    extraPages: {
      bonusaleatorio: { title: 'BÔNUS SURPRESA', tagline: 'OFERTAS ALEATÓRIAS DO DIA', effect: 'money', badge: 'OFERTA LIMITADA' },
      cinco_bonus: { title: 'R$ 5,00 GRÁS', tagline: 'PLATAFORMAS PAGANDO AGORA', effect: 'scanner', badge: 'SAQUE IMEDIATO' }
    }
  });
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [initializing, setInitializing] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const getNormalizedPath = () => {
    let path = window.location.pathname.toLowerCase();
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path;
  };

  const navigateTo = (path: string) => {
    try {
      window.history.pushState({}, '', path);
      handleNavigation();
    } catch (e) {
      window.location.href = path;
    }
  };

  const handleNavigation = async () => {
    const currentPath = getNormalizedPath();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (currentPath.includes('admin-secret')) {
      if (session && session.user.id === ADMIN_UID) {
        setView('admin');
      } else {
        setView('login');
      }
    } else if (currentPath === '/roleta') {
      setView('roleta');
    } else if (currentPath === '/bonusaleatorio') {
      setView('bonusaleatorio');
    } else if (currentPath === '/5debonus') {
      setView('5debonus');
    } else {
      setView('public');
    }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        // Observador de Auth para o Painel Admin não "sumir" após login
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user?.id === ADMIN_UID && window.location.pathname.includes('admin-secret')) {
            setView('admin');
          }
        });

        await handleNavigation();
        await fetchBrand();
        await Promise.all([fetchLinks(), fetchSocials()]);
        
        return () => subscription.unsubscribe();
      } catch (e) {
        console.error("Erro na carga inicial:", e);
      } finally {
        setTimeout(() => setInitializing(false), 800); // Delay suave para o loader
      }
    };
    initApp();
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  const fetchBrand = async () => {
    try {
      const { data } = await supabase.from('brand_settings').select('*').eq('id', 1).single();
      if (data) {
        let extraPages = brand.extraPages;
        if (data.footer_text?.includes('EXTRAS:')) {
          try {
            const extraPart = data.footer_text.split('EXTRAS:')[1].split('ORDER:')[0];
            extraPages = JSON.parse(extraPart);
          } catch(e) {}
        }
        setBrand({
          ...data,
          logoUrl: data.logo_url,
          backgroundUrl: data.background_url,
          roletaTitle: data.roleta_title || 'SALA VIP',
          roletaTagline: data.roleta_tagline || 'ROLETA ESTRATÉGICA',
          roletaLogoUrl: data.roleta_logo_url || data.logo_url,
          roletaBadgeText: data.roleta_badge_text || 'Acesso Restrito VIP',
          effect: data.effect || 'scanner',
          extraPages
        });
      }
    } catch (e) {}
  };

  const fetchLinks = async () => {
    const { data } = await supabase.from('links').select('*').order('position', { ascending: true });
    if (data) setLinks(data as CasinoLink[]);
  };

  const fetchSocials = async () => {
    const { data } = await supabase.from('social_links').select('*').order('position', { ascending: true });
    if (data) setSocials(data as SocialLink[]);
  };

  const categories = useMemo(() => {
    const found: string[] = [];
    links.forEach(l => {
      const name = (l.category || 'Página 1').trim();
      const forbidden = ['roleta', 'bonus aleatorio', '5 de bonus'];
      if (!forbidden.includes(name.toLowerCase()) && !found.includes(name)) found.push(name);
    });
    const final = found.length > 0 ? found : ['Página 1'];
    if (!activeCategory || !final.includes(activeCategory)) setActiveCategory(final[0]);
    return final;
  }, [links, activeCategory]);

  const filteredLinks = useMemo(() => {
    return links.filter(l => (l.category || 'Página 1').trim() === activeCategory.trim());
  }, [links, activeCategory]);

  const BackgroundElements = () => {
    const effect = brand.effect || 'scanner';
    return (
      <div className="effect-container fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-black -z-30" />
        {brand.backgroundUrl && (
          <div className="absolute inset-0 -z-20 bg-cover bg-center opacity-40 transition-opacity duration-1000" 
               style={{ backgroundImage: `url(${brand.backgroundUrl})`, backgroundAttachment: 'fixed' }} />
        )}
        
        {effect === 'scanner' && <div className="scanner-beam" />}
        {effect === 'gold-rain' && Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="gold-particle" style={{ left: `${Math.random() * 100}%`, animationDuration: `${2 + Math.random() * 3}s` }} />
        ))}
        {effect === 'money' && Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="money-item" style={{ left: `${Math.random() * 100}%`, animationDuration: `${3 + Math.random() * 5}s` }}>💵</div>
        ))}
        {effect === 'space' && Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="star" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDuration: `${3 + Math.random() * 8}s` }} />
        ))}
        {effect === 'aurora' && <div className="aurora-layer" />}
        {effect === 'lightning' && <div className="lightning-flash animate-lightning" />}
        {effect === 'glitch' && Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="glitch-line" style={{ top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s` }} />
        ))}
        {effect === 'confetti' && Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="confetti" style={{ left: `${Math.random() * 100}%`, animationDuration: `${2 + Math.random() * 4}s` }} />
        ))}
        {effect === 'fire' && Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="fire-ember" style={{ left: `${Math.random() * 100}%`, animationDuration: `${2 + Math.random() * 4}s` }} />
        ))}
        {effect === 'matrix' && Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="matrix-column" style={{ left: `${i * 5}%`, animationDuration: `${2 + Math.random() * 5}s` }}>1010101</div>
        ))}
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 -z-10" />
      </div>
    );
  };

  const CategoryPageView = ({ categoryName, title, tagline, badge }: { categoryName: string, title?: string, tagline?: string, badge?: string }) => {
    const pageLinks = links.filter(l => (l.category || '').toLowerCase() === categoryName.toLowerCase());
    return (
      <div className="min-h-screen bg-black text-white relative font-sans overflow-x-hidden pb-20 animate-fade-in">
        <BackgroundElements />
        <main className="relative z-10 max-w-lg mx-auto px-6 py-16 flex flex-col items-center text-center">
          <header className="mb-12 flex flex-col items-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-yellow-500/20 blur-[70px] rounded-full scale-110"></div>
              <div className="w-32 h-32 p-1 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-700 shadow-2xl relative">
                <img src={brand.roletaLogoUrl || brand.logoUrl} className="w-full h-full rounded-full object-cover border-[5px] border-black" alt="Logo" />
              </div>
            </div>
            <div className="inline-block px-4 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-[9px] font-black uppercase tracking-[0.4em] mb-4">{badge || 'ACESSO VIP'}</div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-shimmer mb-2 leading-none">{title}</h1>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white opacity-70">{tagline}</h2>
          </header>
          <div className="w-full space-y-4">
            {pageLinks.length > 0 ? pageLinks.map(link => <LinkButton key={link.id} link={link} />) : <div className="glass-card p-10 rounded-[2rem] opacity-30 text-[10px] font-black uppercase">Sem links configurados</div>}
          </div>
          <button onClick={() => navigateTo('/')} className="fixed bottom-6 right-6 w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all z-50"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
        </main>
      </div>
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setLoginError(error.message === 'Invalid login credentials' ? 'Credenciais Inválidas' : error.message);
    } else if (data.user?.id === ADMIN_UID) {
      navigateTo('/admin-secret');
    } else {
      setLoginError('Acesso Restrito ao Proprietário');
      await supabase.auth.signOut();
    }
    setLoginLoading(false);
  };

  // Loader de inicialização elegante
  if (initializing) return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999]">
      <div className="w-20 h-20 relative animate-float">
        <img src={brand.logoUrl} className="w-full h-full rounded-full object-cover border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]" alt="Logo" />
      </div>
      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-500 animate-[loading_1.5s_infinite_ease-in-out]"></div>
        </div>
        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-yellow-500/50">Carregando Master</p>
      </div>
      <style>{`@keyframes loading { 0% { width: 0; transform: translateX(-100%); } 50% { width: 100%; transform: translateX(0); } 100% { width: 0; transform: translateX(100%); } }`}</style>
    </div>
  );

  if (view === 'admin') return <AdminPanel />;
  
  if (view === 'login') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black relative">
      <BackgroundElements />
      <div className="w-full max-w-sm glass-card p-10 rounded-[3.5rem] z-10 border border-white/10 text-center shadow-2xl">
        <h2 className="text-3xl font-black uppercase text-shimmer mb-10 italic">Acesso Admin</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-2xl outline-none focus:border-yellow-500 text-white transition-all" placeholder="E-mail" />
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-2xl outline-none focus:border-yellow-500 text-white transition-all" placeholder="Senha" />
          {loginError && <p className="text-[10px] text-red-500 font-black uppercase bg-red-500/10 py-2 rounded-lg">{loginError}</p>}
          <button type="submit" disabled={loginLoading} className="w-full py-5 bg-yellow-500 text-black font-black rounded-2xl uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50">
            {loginLoading ? 'VALIDANDO...' : 'ENTRAR'}
          </button>
        </form>
        <button onClick={() => navigateTo('/')} className="mt-8 text-[9px] font-black uppercase text-gray-500 hover:text-white transition-colors">Voltar para o Site</button>
      </div>
    </div>
  );

  if (view === 'roleta') return <CategoryPageView categoryName="Roleta" title={brand.roletaTitle} tagline={brand.roletaTagline} badge={brand.roletaBadgeText} />;
  if (view === 'bonusaleatorio') return <CategoryPageView categoryName="Bonus Aleatorio" {...brand.extraPages?.bonusaleatorio} />;
  if (view === '5debonus') return <CategoryPageView categoryName="5 de Bonus" {...brand.extraPages?.cinco_bonus} />;

  return (
    <div className="min-h-screen bg-black text-white relative font-sans overflow-x-hidden pb-20 animate-fade-in">
      <BackgroundElements />
      <main className="relative z-10 max-w-lg mx-auto px-6 py-16 flex flex-col items-center">
        <header className="text-center mb-12 flex flex-col items-center">
          <div className="w-32 h-32 p-1 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-600 shadow-2xl mb-8 animate-float">
            <img src={brand.logoUrl} className="w-full h-full rounded-full object-cover border-[5px] border-black" alt="Logo" />
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black uppercase italic text-shimmer leading-tight">{brand.name}</h1>
            {brand.verified && <div className="ig-verified-wrapper"><svg viewBox="0 0 24 24" className="ig-verified-bg"><path d="M12 2L14.4 4.8L17.7 4.2L18.7 7.5L21.8 8.8L21 12L21.8 15.2L18.7 16.5L17.7 19.8L14.4 19.2L12 22L9.6 19.2L6.3 19.8L5.3 16.5L2.2 15.2L3 12L2.2 8.8L5.3 7.5L6.3 4.2L9.6 4.8L12 2Z" /></svg><svg viewBox="0 0 24 24" className="ig-verified-check"><path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z" /></svg></div>}
          </div>
          <p className="text-[11px] font-bold text-white uppercase tracking-[0.3em] mt-5 border-t border-white/10 pt-4 px-6 text-center opacity-70">{brand.tagline}</p>
        </header>

        {categories.length > 1 && (
          <nav className="w-full mb-12 sticky top-4 z-50">
            <div className="glass-card p-2 rounded-[2.5rem] flex items-center border border-white/5 relative overflow-hidden">
              <div className="absolute h-[calc(100%-16px)] bg-yellow-500 rounded-[2rem] transition-all duration-500 z-0" style={{ width: `${100 / categories.length}%`, left: `${(categories.indexOf(activeCategory) * (100 / categories.length))}%` }} />
              {categories.map((cat) => (
                <button key={cat} onClick={() => { setIsTransitioning(true); setTimeout(() => { setActiveCategory(cat); setIsTransitioning(false); }, 300); }} className={`relative z-10 flex-1 py-4 text-[9px] font-black uppercase transition-colors ${activeCategory === cat ? 'text-black' : 'text-gray-500'}`}>{cat}</button>
              ))}
            </div>
          </nav>
        )}

        <div className={`w-full space-y-6 transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {activeCategory.toLowerCase() === 'listas' && (
            <button onClick={() => navigateTo('/roleta')} className="relative w-full p-5 rounded-[2.2rem] flex items-center gap-5 border-b-[6px] neon-purple-btn transform hover:scale-[1.03] transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden p-1 group-hover:rotate-6 transition-transform"><img src={brand.logoUrl} className="w-full h-full object-cover rounded-xl" alt="Logo" /></div>
              <div className="flex-grow text-left"><h3 className="text-[16px] font-black uppercase text-purple-100">{brand.roletaTitle}</h3><p className="text-[11px] opacity-60 text-gray-400">{brand.roletaTagline}</p></div>
              <svg className="w-6 h-6 opacity-30 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M13 5l7 7-7 7" /></svg>
            </button>
          )}
          {filteredLinks.map((link) => <LinkButton key={link.id} link={link} />)}
        </div>

        <footer className="w-full text-center mt-20 space-y-10">
          <div className="flex justify-center gap-6">
            {socials.map((social) => (
              <a key={social.id} href={social.url} target="_blank" className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:border-yellow-500/50 transition-all"><div className="w-6 h-6">{Icons[social.icon] || social.name.charAt(0)}</div></a>
            ))}
          </div>
          <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.4em]">{brand.footerText?.split('EXTRAS:')[0] || `${brand.name} © 2025`}</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
