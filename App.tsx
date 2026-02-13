
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (hash === '#/admin-secret') {
        if (session && session.user.id === ADMIN_UID) setView('admin');
        else setView('login');
      } else if (hash === '#/roleta' || hash === '#roleta') {
        setView('roleta');
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
          effect: data.effect || 'scanner'
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
    if (data) setLinks(data);
  };

  const fetchSocials = async () => {
    const { data } = await supabase.from('social_links').select('*').order('position', { ascending: true });
    if (data) setSocials(data);
  };

  // Categorias para a Home (exclui Roleta)
  const categories = useMemo(() => {
    const foundCats: string[] = [];
    links.forEach(l => {
      const name = (l.category || 'Página 1').trim();
      if (name.toLowerCase() !== 'roleta' && !foundCats.includes(name)) foundCats.push(name);
    });
    const ordered = pagesOrder.filter(c => foundCats.includes(c));
    foundCats.forEach(c => { if (!ordered.includes(c)) ordered.push(c); });
    const final = ordered.length > 0 ? ordered : (foundCats.length > 0 ? foundCats : ['Página 1']);
    if (!activeCategory || !final.includes(activeCategory)) setActiveCategory(final[0]);
    return final;
  }, [links, pagesOrder, activeCategory]);

  const filteredLinks = useMemo(() => {
    const target = activeCategory || categories[0] || 'Página 1';
    return links.filter(l => (l.category || 'Página 1').trim() === target.trim() && (l.category || '').toLowerCase() !== 'roleta');
  }, [links, activeCategory, categories]);

  // Links específicos para a Roleta
  const roletaLinks = useMemo(() => {
    return links.filter(l => (l.category || '').toLowerCase() === 'roleta');
  }, [links]);

  const BackgroundElements = ({ isRoleta = false }) => {
    const effect = isRoleta ? 'scanner' : (brand.effect || 'scanner');
    return (
      <div className="effect-container fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-black -z-30" />
        {brand.backgroundUrl && (
          <div className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat opacity-40" 
               style={{ backgroundImage: `url(${brand.backgroundUrl})` }} />
        )}
        
        {/* Renderização das partículas */}
        {effect === 'scanner' && <div className={`scanner-beam ${isRoleta ? 'opacity-40' : 'opacity-10'}`} style={isRoleta ? { background: 'linear-gradient(110deg, transparent, rgba(168, 85, 247, 0.2) 50%, transparent)' } : {}} />}
        
        {effect === 'gold-rain' && Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="gold-particle" style={{ left: `${Math.random() * 100}%`, animationDuration: `${2 + Math.random() * 3}s`, animationDelay: `${Math.random() * 5}s` }} />
        ))}

        {effect === 'fire' && Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="fire-ember" style={{ left: `${Math.random() * 100}%`, animationDuration: `${2 + Math.random() * 4}s`, animationDelay: `${Math.random() * 3}s` }} />
        ))}

        {effect === 'money' && Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="money-item" style={{ left: `${Math.random() * 100}%`, animationDuration: `${4 + Math.random() * 4}s`, animationDelay: `${Math.random() * 8}s` }}>{['💵','💰','💎'][Math.floor(Math.random()*3)]}</div>
        ))}

        {effect === 'space' && Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="star" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDuration: `${3 + Math.random() * 8}s` }} />
        ))}

        {effect === 'aurora' && <div className="aurora-layer" />}
        {effect === 'lightning' && <div className="lightning-flash animate-lightning" />}
        {effect === 'confetti' && Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="confetti" style={{ left: `${Math.random() * 100}%`, backgroundColor: ['#fccd4d','#a855f7','#fff'][Math.floor(Math.random()*3)], animationDuration: `${3 + Math.random() * 3}s` }} />
        ))}

        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 -z-10" />
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
      setLoginError('Acesso Negado');
    }
    setLoginLoading(false);
  };

  if (initializing) return null;

  // Renderização do Painel Admin
  if (view === 'admin') return <AdminPanel />;

  // Renderização do Login Admin
  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
        <BackgroundElements />
        <div className="w-full max-w-sm glass-card p-10 rounded-[3.5rem] text-center z-10 border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-black uppercase text-shimmer tracking-tighter italic mb-10">Admin Login</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-2xl text-white outline-none focus:border-yellow-500" placeholder="E-mail" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-2xl text-white outline-none focus:border-yellow-500 font-mono" placeholder="Senha" />
            {loginError && <p className="text-[10px] text-red-500 uppercase font-black">{loginError}</p>}
            <button type="submit" disabled={loginLoading} className="w-full py-5 bg-yellow-500 text-black font-black rounded-2xl uppercase text-[11px] tracking-widest">{loginLoading ? 'Carregando...' : 'Entrar'}</button>
          </form>
        </div>
      </div>
    );
  }

  // Renderização da Sala VIP Roleta
  if (view === 'roleta') {
    return (
      <div className="min-h-screen bg-black text-white relative font-sans overflow-x-hidden pb-20">
        <BackgroundElements isRoleta={true} />
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent -z-5 pointer-events-none"></div>
        
        <main className="relative z-10 max-w-lg mx-auto px-6 py-16 flex flex-col items-center">
          <header className="text-center mb-12 w-full flex flex-col items-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-purple-500/40 blur-[70px] rounded-full scale-110"></div>
              <div className="w-32 h-32 p-1 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 relative shadow-2xl overflow-hidden">
                <img src={brand.logoUrl} className="w-full h-full rounded-full object-cover border-[5px] border-black" alt="Logo" />
              </div>
            </div>
            <div className="inline-block px-4 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase tracking-[0.4em] mb-4">Acesso Restrito VIP</div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-shimmer leading-none mb-2">SALA VIP</h1>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white opacity-70">ROLETA ESTRATÉGICA</h2>
          </header>

          <div className="w-full space-y-4 mb-16">
            {roletaLinks.length > 0 ? (
              roletaLinks.map(link => <LinkButton key={link.id} link={link} />)
            ) : (
              <div className="glass-card p-10 rounded-[2rem] text-center border-dashed border-white/10 w-full">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Nenhuma mesa disponível no momento</p>
              </div>
            )}
          </div>

          <a href="#/" className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-[0.3em] flex items-center gap-2 transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Voltar para Início
          </a>
        </main>
      </div>
    );
  }

  // Renderização da Página Principal (Home)
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
