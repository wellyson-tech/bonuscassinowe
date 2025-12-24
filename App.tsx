
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { BRAND, SOCIAL_LINKS, ADMIN_UID, Icons } from './constants';
import LinkButton from './components/LinkButton';
import AdminPanel from './components/AdminPanel';
import { CasinoLink } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'public' | 'login' | 'admin'>('public');
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Destaques');
  const [initializing, setInitializing] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  
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
        if (cats.length > 0 && !cats.includes(activeCategory)) {
          setActiveCategory(cats[0]);
        }
      }
    } catch (e) {
      console.warn("Links carregados offline ou do cache.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user?.id === ADMIN_UID) {
        setView('admin');
      } else {
        await supabase.auth.signOut();
        setLoginError('Seu UID não tem permissão master.');
      }
    } catch (err: any) {
      setLoginError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : err.message);
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

  const BackgroundElements = () => (
    <>
      <div className="fixed inset-0 bg-[#000] -z-20" />
      <div 
        className="fixed inset-0 pointer-events-none z-[-15]"
        style={{
          background: `radial-gradient(800px circle at ${mousePos.x}% ${mousePos.y}%, rgba(212, 175, 55, 0.08), transparent 80%)`
        }}
      />
      <div className="scanner-beam" />
      <div className="energy-blob bg-yellow-600/10" style={{ width: '80vw', height: '80vw', top: '-10%', left: '-10%', '--duration': '15s', '--move-x': '100px', '--move-y': '50px' } as any} />
      <div className="energy-blob bg-yellow-500/5" style={{ width: '70vw', height: '70vw', bottom: '-10%', right: '-10%', '--duration': '20s', '--move-x': '-80px', '--move-y': '-100px' } as any} />
      {[...Array(30)].map((_, i) => (
        <div key={`p-${i}`} className="particle" style={{ left: `${Math.random() * 100}%`, width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`, '--duration': `${Math.random() * 8 + 6}s`, '--x-offset': `${(Math.random() - 0.5) * 200}px`, animationDelay: `${Math.random() * 10}s` } as any} />
      ))}
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/10 to-black pointer-events-none z-[2]" />
    </>
  );

  if (initializing) return null;

  if (view === 'admin') return <AdminPanel />;

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-black font-sans">
        <BackgroundElements />
        <div className="w-full max-w-sm glass-card p-10 rounded-[3rem] text-center z-10 border border-white/5 shadow-2xl animate-fade-in">
          <header className="mb-8">
            <h2 className="text-2xl font-black uppercase text-shimmer tracking-tighter mb-2 italic">Acesso Master</h2>
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.4em]">Painel Administrativo</p>
          </header>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-left space-y-1">
              <label className="text-[9px] uppercase font-black text-gray-500 ml-2 tracking-widest">E-mail</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-yellow-500/50 text-sm transition-all text-white"
                placeholder="admin@exemplo.com"
              />
            </div>
            
            <div className="text-left space-y-1">
              <label className="text-[9px] uppercase font-black text-gray-500 ml-2 tracking-widest">Senha</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-yellow-500/50 text-sm transition-all text-white font-mono"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <p className="text-[10px] text-red-500 font-black uppercase tracking-wider bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                {loginError}
              </p>
            )}

            <button 
              type="submit" 
              disabled={loginLoading}
              className="w-full py-4 gold-gradient text-black font-black rounded-2xl uppercase text-[11px] tracking-[0.2em] shadow-lg hover:brightness-110 active:scale-95 transition-all mt-4"
            >
              {loginLoading ? 'Validando...' : 'Entrar no Sistema'}
            </button>
            
            <button 
              type="button"
              onClick={() => { window.location.hash = ''; setView('public'); }}
              className="w-full py-3 text-[9px] text-gray-500 font-black uppercase tracking-widest hover:text-white transition-colors"
            >
              Voltar ao Site
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      <BackgroundElements />
      
      <main className="relative z-10 max-w-lg mx-auto px-6 py-16 flex flex-col items-center">
        <header className="text-center mb-14 w-full flex flex-col items-center">
          <div className="relative mb-10 group">
            <div className="absolute inset-0 bg-yellow-500/10 blur-[80px] rounded-full scale-125 group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="w-32 h-32 p-1.5 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-600 to-yellow-400 relative animate-float shadow-[0_10px_60px_rgba(212,175,55,0.15)]">
              <img 
                src={BRAND.logoUrl} 
                className="w-full h-full rounded-full object-cover border-[6px] border-black" 
                alt={BRAND.name} 
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-4xl font-black uppercase tracking-tighter text-shimmer italic font-display leading-tight">
                {BRAND.name}
              </h1>
              {BRAND.verified && (
                <div className="ig-verified-wrapper">
                  <svg viewBox="0 0 24 24" className="ig-verified-bg">
                    <path d="M12 2L14.4 4.8L17.7 4.2L18.7 7.5L21.8 8.8L21 12L21.8 15.2L18.7 16.5L17.7 19.8L14.4 19.2L12 22L9.6 19.2L6.3 19.8L5.3 16.5L2.2 15.2L3 12L2.2 8.8L5.3 7.5L6.3 4.2L9.6 4.8L12 2Z" />
                  </svg>
                  <svg viewBox="0 0 24 24" className="ig-verified-check">
                    <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.6em] mt-3 opacity-50">{BRAND.tagline}</p>
          </div>
        </header>

        {categories.length > 1 && (
          <nav className="w-full flex justify-center gap-3 mb-14 overflow-x-auto py-2 no-scrollbar px-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-700 whitespace-nowrap ${
                  activeCategory === cat 
                  ? 'bg-yellow-500 text-black shadow-[0_15px_45px_rgba(212,175,55,0.4)] scale-110 -translate-y-1' 
                  : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>
        )}

        <div className="w-full space-y-6 mb-24 min-h-[400px]">
          {filteredLinks.length > 0 ? (
            filteredLinks.map((link, idx) => (
              <div 
                key={link.id} 
                className="animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <LinkButton link={link} />
              </div>
            ))
          ) : (
            <div className="text-center py-32 opacity-10 border border-white/5 rounded-[4rem] bg-white/[0.02]">
              <p className="text-[10px] uppercase font-black tracking-[1em]">Carregando...</p>
            </div>
          )}
        </div>

        <footer className="w-full text-center space-y-12 pb-20">
          <div className="flex justify-center gap-8">
            {SOCIAL_LINKS.map((social) => (
              <a 
                key={social.name} 
                href={social.url} 
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-16 h-16 flex items-center justify-center rounded-[2.2rem] bg-white/5 border border-white/5 hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all duration-700 text-white shadow-2xl"
              >
                <span className="absolute inset-0 bg-yellow-500/15 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                <div className="relative z-10 w-7 h-7 flex items-center justify-center group-hover:scale-125 transition-transform duration-500">
                  {Icons[social.icon] || social.name.charAt(0)}
                </div>
              </a>
            ))}
          </div>
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-5 opacity-10">
              <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
              <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent"></div>
            </div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em]">
              {BRAND.name} &copy; 2025
            </p>
          </div>
        </footer>
      </main>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
