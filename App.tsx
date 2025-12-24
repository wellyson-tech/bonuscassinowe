
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { BRAND, SOCIAL_LINKS, ADMIN_UID, Icons } from './constants';
import LinkButton from './components/LinkButton';
import AdminPanel from './components/AdminPanel';
import { CasinoLink } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'public' | 'login' | 'admin'>('public');
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [initializing, setInitializing] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Estados de Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const handleNavigation = async () => {
      const hash = window.location.hash;
      const { data: { session } } = await supabase.auth.getSession();

      if (hash === '#/admin-secret') {
        if (session && session.user.id === ADMIN_UID) {
          setView('admin');
        } else {
          setView('login');
        }
      } else {
        setView('public');
      }
    };

    const initApp = async () => {
      try {
        await handleNavigation();
        await fetchLinks();
      } catch (e) {
        console.error("Erro na inicialização:", e);
      } finally {
        setInitializing(false);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    initApp();
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('position', { ascending: true });
      
      if (!error && data) {
        setLinks(data);
        const cats = Array.from(new Set(data.map(l => l.category || 'Destaques')));
        if (cats.length > 0 && !activeCategory) {
          setActiveCategory(cats[0]);
        }
      }
    } catch (e) {
      console.warn("Links carregados offline.");
    }
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
        setLoginError('Acesso não autorizado.');
      }
    } catch (err: any) {
      setLoginError('Credenciais inválidas');
    } finally {
      setLoginLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = links.map(l => l.category || 'Destaques');
    return Array.from(new Set(cats));
  }, [links]);

  const filteredLinks = useMemo(() => {
    return links.filter(l => (l.category || 'Destaques') === activeCategory);
  }, [links, activeCategory]);

  const changeCategory = (cat: string) => {
    if (cat === activeCategory) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveCategory(cat);
      setIsTransitioning(false);
    }, 300);
  };

  const BackgroundElements = () => (
    <>
      <div className="fixed inset-0 bg-[#000] -z-20" />
      <div className="fixed inset-0 pointer-events-none z-[-15]" style={{ background: `radial-gradient(800px circle at ${mousePos.x}% ${mousePos.y}%, rgba(212, 175, 55, 0.08), transparent 80%)` }} />
      <div className="scanner-beam" />
      <div className="energy-blob bg-yellow-600/10" style={{ width: '80vw', height: '80vw', top: '-10%', left: '-10%', '--duration': '15s' } as any} />
      {[...Array(20)].map((_, i) => (
        <div key={i} className="particle" style={{ left: `${Math.random() * 100}%`, '--duration': `${Math.random() * 5 + 5}s`, '--x-offset': `${(Math.random() - 0.5) * 100}px` } as any} />
      ))}
    </>
  );

  if (initializing) return null;
  if (view === 'admin') return <AdminPanel />;

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
        <BackgroundElements />
        <div className="w-full max-w-sm glass-card p-10 rounded-[3rem] text-center z-10 border border-white/5 animate-fade-in">
          <h2 className="text-2xl font-black uppercase text-shimmer tracking-tighter mb-8 italic">Painel Master</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm outline-none focus:border-yellow-500/50" placeholder="E-mail" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm outline-none focus:border-yellow-500/50" placeholder="Senha" />
            {loginError && <p className="text-[10px] text-red-500 uppercase font-black">{loginError}</p>}
            <button type="submit" disabled={loginLoading} className="w-full py-4 gold-gradient text-black font-black rounded-2xl uppercase text-[11px] tracking-widest">{loginLoading ? 'Aguarde...' : 'Entrar'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative font-sans overflow-x-hidden">
      <BackgroundElements />
      
      <main className="relative z-10 max-w-lg mx-auto px-6 py-16 flex flex-col items-center">
        {/* Header Profile */}
        <header className="text-center mb-10 w-full flex flex-col items-center">
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-yellow-500/20 blur-[60px] rounded-full scale-125"></div>
            <div className="w-28 h-28 p-1 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-600 to-yellow-400 relative animate-float">
              <img src={BRAND.logoUrl} className="w-full h-full rounded-full object-cover border-[4px] border-black" alt={BRAND.name} />
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-3xl font-black uppercase tracking-tighter text-shimmer italic leading-tight">{BRAND.name}</h1>
              {BRAND.verified && (
                <div className="ig-verified-wrapper">
                  <svg viewBox="0 0 24 24" className="ig-verified-bg"><path d="M12 2L14.4 4.8L17.7 4.2L18.7 7.5L21.8 8.8L21 12L21.8 15.2L18.7 16.5L17.7 19.8L14.4 19.2L12 22L9.6 19.2L6.3 19.8L5.3 16.5L2.2 15.2L3 12L2.2 8.8L5.3 7.5L6.3 4.2L9.6 4.8L12 2Z" /></svg>
                  <svg viewBox="0 0 24 24" className="ig-verified-check"><path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z" /></svg>
                </div>
              )}
            </div>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.5em] mt-2">{BRAND.tagline}</p>
          </div>
        </header>

        {/* Navigation Pages (Tabs) */}
        {categories.length > 0 && (
          <nav className="w-full mb-10 sticky top-4 z-50">
            <div className="glass-card p-1.5 rounded-[2rem] flex items-center justify-between border border-white/5 shadow-2xl overflow-hidden relative">
              {/* Active Background Indicator */}
              <div 
                className="absolute h-[calc(100%-12px)] bg-yellow-500 rounded-[1.5rem] transition-all duration-500 ease-out z-0 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                style={{
                  width: `${100 / categories.length}%`,
                  left: `${(categories.indexOf(activeCategory) * (100 / categories.length))}%`,
                  margin: '0 6px'
                }}
              />
              
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => changeCategory(cat)}
                  className={`relative z-10 flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest transition-colors duration-500 ${
                    activeCategory === cat ? 'text-black' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </nav>
        )}

        {/* Links List with Page Transition */}
        <div className={`w-full space-y-5 mb-20 transition-all duration-300 min-h-[400px] ${isTransitioning ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}>
          {filteredLinks.length > 0 ? (
            filteredLinks.map((link, idx) => (
              <div key={link.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.08}s` }}>
                <LinkButton link={link} />
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-[3rem] opacity-20">
              <div className="w-12 h-12 mx-auto mb-4">{Icons.slots}</div>
              <p className="text-[10px] uppercase font-black tracking-[0.5em]">Nesta página ainda não há links</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="w-full text-center space-y-10 pb-10">
          <div className="flex justify-center gap-6">
            {SOCIAL_LINKS.map((social) => (
              <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer" className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/30 text-white transition-all hover:-translate-y-1">
                <div className="w-6 h-6">{Icons[social.icon] || social.name.charAt(0)}</div>
              </a>
            ))}
          </div>
          <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em]">
            {BRAND.name} &copy; 2025
          </p>
        </footer>
      </main>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
