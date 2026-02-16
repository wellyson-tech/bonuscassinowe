
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
      } else if (hash === '#/roleta' || hash === '#roleta') {
        setView('roleta');
      } else if (hash === '#/bonusaleatorio' || hash === '#bonusaleatorio') {
        setView('bonusaleatorio');
      } else if (hash === '#/5debonus' || hash === '#5debonus') {
        setView('5debonus');
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
    return () => window.removeEventListener('hashchange', handleNavigation);
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
          effect: data.effect || 'scanner',
          roletaTitle: data.roleta_title || 'SALA VIP',
          roletaTagline: data.roleta_tagline || 'ROLETA ESTRATÉGICA',
          roletaLogoUrl: data.roleta_logo_url || data.logo_url,
          roletaEffect: data.roleta_effect || 'scanner',
          roletaBadgeText: data.roleta_badge_text || 'Acesso Restrito VIP'
        });
        
        if (data.footer_text && data.footer_text.includes('ORDER:')) {
          try {
            const orderPart = data.footer_text.split('ORDER:')[1];
            const parsedOrder = JSON.parse(orderPart);
            if (Array.isArray(parsedOrder)) setPagesOrder(parsedOrder);
          } catch(e) {}
        }
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
    const foundCats: string[] = [];
    links.forEach(l => {
      const name = (l.category || 'Página 1').trim();
      const lowerName = name.toLowerCase();
      // Filtrar categorias especiais da lista de tabs da home
      if (lowerName !== 'roleta' && lowerName !== 'bonus aleatorio' && lowerName !== '5 de bonus' && !foundCats.includes(name)) {
        foundCats.push(name);
      }
    });
    const ordered = pagesOrder.filter(c => foundCats.includes(c));
    foundCats.forEach(c => { if (!ordered.includes(c)) ordered.push(c); });
    const final = ordered.length > 0 ? ordered : (foundCats.length > 0 ? foundCats : ['Página 1']);
    if (!activeCategory || !final.includes(activeCategory)) setActiveCategory(final[0]);
    return final;
  }, [links, pagesOrder, activeCategory]);

  const filteredLinks = useMemo(() => {
    const target = activeCategory || categories[0] || 'Página 1';
    return links.filter(l => (l.category || 'Página 1').trim() === target.trim());
  }, [links, activeCategory, categories]);

  const BackgroundElements = ({ customEffect }: { customEffect?: string }) => {
    const effect = customEffect || brand.effect || 'scanner';
    return (
      <div className="effect-container fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-black -z-30" />
        {brand.backgroundUrl && (
          <div className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat opacity-40 transition-opacity duration-1000" 
               style={{ backgroundImage: `url(${brand.backgroundUrl})`, backgroundAttachment: 'fixed' }} />
        )}
        
        {effect === 'scanner' && <div className="scanner-beam" />}
        
        {effect === 'gold-rain' && Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="gold-particle" style={{ left: `${Math.random() * 100}%`, animationDuration: `${2 + Math.random() * 3}s`, animationDelay: `${Math.random() * 5}s` }} />
        ))}

        {effect === 'fire' && Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="fire-ember" style={{ left: `${Math.random() * 100}%`, animationDuration: `${2 + Math.random() * 4}s`, animationDelay: `${Math.random() * 3}s` }} />
        ))}

        {effect === 'money' && Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="money-item" style={{ left: `${Math.random() * 100}%`, animationDuration: `${3 + Math.random() * 5}s`, animationDelay: `${Math.random() * 8}s` }}>{['💵','💰','💎'][Math.floor(Math.random()*3)]}</div>
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
          <div key={i} className="confetti" style={{ left: `${Math.random() * 100}%`, backgroundColor: ['#fccd4d','#a855f7','#fff'][Math.floor(Math.random()*3)], animationDuration: `${2 + Math.random() * 4}s` }} />
        ))}

        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 -z-10" />
      </div>
    );
  };

  const CategoryPageView = ({ categoryName, title, tagline }: { categoryName: string, title?: string, tagline?: string }) => {
    const pageLinks = links.filter(l => (l.category || '').toLowerCase() === categoryName.toLowerCase());
    
    return (
      <div className="min-h-screen bg-black text-white relative font-sans overflow-x-hidden pb-20">
        <BackgroundElements customEffect={brand.roletaEffect} />
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent -z-5 pointer-events-none"></div>
        
        <main className="relative z-10 max-w-lg mx-auto px-6 py-16 flex flex-col items-center text-center">
          <header className="mb-12 w-full flex flex-col items-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-purple-500/40 blur-[70px] rounded-full scale-110"></div>
              <div className="w-32 h-32 p-1 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 relative shadow-2xl overflow-hidden">
                <img src={brand.roletaLogoUrl || brand.logoUrl} className="w-full h-full rounded-full object-cover border-[5px] border-black" alt="Logo" />
              </div>
            </div>
            <div className="inline-block px-4 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase tracking-[0.4em] mb-4">
              {brand.roletaBadgeText || 'Acesso Restrito'}
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-shimmer leading-none mb-2">
              {title || brand.roletaTitle}
            </h1>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white opacity-70">
              {tagline || brand.roletaTagline}
            </h2>
          </header>

          <div className="w-full space-y-4 mb-16">
            {pageLinks.length > 0 ? (
              pageLinks.map(link => <LinkButton key={link.id} link={link} />)
            ) : (
              <div className="glass-card p-10 rounded-[2rem] text-center border-dashed border-white/10 w-full">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Nenhuma oferta disponível</p>
                <p className="text-[8px] mt-2 opacity-30">Crie links no admin com a categoria "{categoryName}"</p>
              </div>
            )}
          </div>

          {/* BOTÃO VOLTAR FLUTUANTE NO CANTO DIREITO INFERIOR */}
          <button 
            onClick={() => { window.location.hash = '#/'; setView('public'); }} 
            className="fixed bottom-6 right-6 z-[100] w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 text-white rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all active:scale-90 group"
            title="Voltar para Início"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:-translate-x-0.5 transition-transform"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
        </main>
      </div>
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user?.id === ADMIN_UID) {
      window.location.hash = '#/admin-secret';
      setView('admin');
    } else {
      setLoginError('Credenciais inválidas');
    }
    setLoginLoading(false);
  };

  if (initializing) return null;

  if (view === 'admin') return <AdminPanel />;

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
        <BackgroundElements />
        <div className="w-full max-w-sm glass-card p-10 rounded-[3.5rem] text-center z-10 border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-black uppercase text-shimmer tracking-tighter italic mb-10">Acesso Restrito</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-2xl text-white outline-none focus:border-yellow-500" placeholder="E-mail" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-2xl text-white outline-none focus:border-yellow-500 font-mono" placeholder="Senha" />
            {loginError && <p className="text-[10px] text-red-500 uppercase font-black">{loginError}</p>}
            <button type="submit" disabled={loginLoading} className="w-full py-5 bg-yellow-500 text-black font-black rounded-2xl uppercase text-[11px] tracking-widest">{loginLoading ? 'Verificando...' : 'Entrar'}</button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'roleta') {
    return <CategoryPageView categoryName="Roleta" />;
  }

  if (view === 'bonusaleatorio') {
    return <CategoryPageView categoryName="Bonus Aleatorio" title="BÔNUS SURPRESA" tagline="OFERTAS ALEATÓRIAS DO DIA" />;
  }

  if (view === '5debonus') {
    return <CategoryPageView categoryName="5 de Bonus" title="R$ 5,00 GRÁTIS" tagline="PLATAFORMAS PAGANDO AGORA" />;
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
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-shimmer italic leading-tight">{brand.name}</h1>
            {brand.verified && (
              <div className="ig-verified-wrapper">
                <svg viewBox="0 0 24 24" className="ig-verified-bg"><path d="M12 2L14.4 4.8L17.7 4.2L18.7 7.5L21.8 8.8L21 12L21.8 15.2L18.7 16.5L17.7 19.8L14.4 19.2L12 22L9.6 19.2L6.3 19.8L5.3 16.5L2.2 15.2L3 12L2.2 8.8L5.3 7.5L6.3 4.2L9.6 4.8L12 2Z" /></svg>
                <svg viewBox="0 0 24 24" className="ig-verified-check"><path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z" /></svg>
              </div>
            )}
          </div>
          <p className="text-[12px] font-bold text-white uppercase tracking-[0.3em] mt-5 px-4 text-center border-t border-white/10 pt-4">{brand.tagline}</p>
        </header>
        
        {categories.length > 1 && (
          <nav className="w-full mb-12 sticky top-4 z-50 px-2">
            <div className="glass-card p-2 rounded-[2.5rem] flex items-center border border-white/5 relative overflow-hidden">
              <div className="absolute h-[calc(100%-16px)] bg-yellow-500 rounded-[2rem] transition-all duration-500 z-0" 
                   style={{ width: `${100 / categories.length}%`, left: `${(categories.indexOf(activeCategory) * (100 / categories.length))}%` }} />
              {categories.map((cat) => (
                <button key={cat} onClick={() => { setIsTransitioning(true); setTimeout(() => { setActiveCategory(cat); setIsTransitioning(false); }, 300); }} 
                        className={`relative z-10 flex-1 py-4 text-[10px] font-black uppercase transition-colors ${activeCategory === cat ? 'text-black' : 'text-gray-500 hover:text-white'}`}>{cat}</button>
              ))}
            </div>
          </nav>
        )}

        <div className={`w-full space-y-6 mb-16 transition-all duration-300 min-h-[400px] ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {/* BOTÃO ESPECIAL SALA VIP - APENAS EM 'LISTAS' */}
          {activeCategory.trim().toLowerCase() === 'listas' && (
            <a
              href="#/roleta"
              onClick={(e) => { e.preventDefault(); window.location.hash = '#/roleta'; setView('roleta'); }}
              className="relative w-full p-5 rounded-[2.2rem] flex items-center gap-5 group overflow-hidden border-b-[6px] neon-purple-btn text-purple-100 transform hover:scale-[1.03] transition-all duration-300 shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
              <div className="flex-shrink-0 z-10 group-hover:rotate-6 transition-transform duration-500">
                <div className="relative w-12 h-12 flex items-center justify-center rounded-2xl p-1 bg-white/5 border border-white/10 overflow-hidden shadow-inner">
                  <img src={brand.logoUrl} className="w-full h-full object-cover rounded-xl" alt="Logo" />
                </div>
              </div>
              <div className="flex-grow text-left z-10">
                <h3 className="text-[16px] font-black uppercase tracking-tight leading-tight">{brand.roletaTitle}</h3>
                <p className="text-[12px] font-medium mt-1 line-clamp-1 opacity-60 text-gray-400">
                  {brand.roletaTagline}
                </p>
              </div>
              <div className="flex-shrink-0 z-10 opacity-30 group-hover:opacity-100 transition-all transform group-hover:translate-x-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          )}

          {/* LISTA DE LINKS NORMAIS */}
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
