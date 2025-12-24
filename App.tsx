
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { BRAND, SOCIAL_LINKS, ADMIN_UID } from './constants';
import LinkButton from './components/LinkButton';
import AdminPanel from './components/AdminPanel';
import { CasinoLink } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'public' | 'login' | 'admin'>('public');
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Lógica de Roteamento Simples via URL
    const checkPath = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/admin-secret' || hash === '#/admin-secret') {
        setView('login');
      }
    };

    const initApp = async () => {
      try {
        checkPath();
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          if (currentSession.user.id === ADMIN_UID) {
            setSession(currentSession);
            setView('admin');
          } else {
            // Se o usuário logado não for o ADMIN_UID, desloga
            await supabase.auth.signOut();
            setSession(null);
          }
        }
        await fetchLinks();
      } catch (e) {
        console.error("Erro na inicialização:", e);
      } finally {
        setInitializing(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user.id === ADMIN_UID) {
        setSession(session);
        setView('admin');
      } else if (session) {
        // Bloqueio de outros usuários
        supabase.auth.signOut();
        alert("Acesso negado. Apenas o administrador mestre pode entrar.");
      } else {
        setSession(null);
        if (window.location.pathname !== '/admin-secret' && window.location.hash !== '#/admin-secret') {
          setView('public');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('position', { ascending: true });
      
      if (!error && data) {
        setLinks(data);
      }
    } catch (e) {
      console.warn("Tabela links não encontrada ou sem acesso.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      if (data.user?.id !== ADMIN_UID) {
        throw new Error("Este UID não possui permissões administrativas.");
      }

      setSession(data.session);
      setView('admin');
    } catch (error: any) {
      alert('Falha na Autenticação: ' + error.message);
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (view === 'admin' && session?.user?.id === ADMIN_UID) {
    return <AdminPanel />;
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#050505]">
        <div className="absolute inset-0 bg-yellow-500/5 blur-[150px] pointer-events-none" />
        <form onSubmit={handleLogin} className="w-full max-w-sm glass-card p-10 rounded-3xl space-y-8 border border-white/10 shadow-2xl relative z-10">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold gold-gradient bg-clip-text text-transparent uppercase tracking-tight">Portal Mestre</h2>
            <p className="text-gray-500 text-[10px] uppercase tracking-[0.4em] mt-2 font-black opacity-50">Identificação Necessária</p>
          </div>
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="E-mail Administrativo" 
              className="w-full p-4 rounded-2xl text-sm bg-white/5 border border-white/10 outline-none focus:border-yellow-500 transition-all placeholder:text-gray-600"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Chave de Acesso" 
              className="w-full p-4 rounded-2xl text-sm bg-white/5 border border-white/10 outline-none focus:border-yellow-500 transition-all placeholder:text-gray-600"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="w-full py-5 gold-gradient text-black font-black rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg uppercase tracking-widest text-xs">
            {loading ? 'Validando...' : 'Desbloquear Sistema'}
          </button>
          <button type="button" onClick={() => { window.location.href = "/"; setView('public'); }} className="w-full text-[10px] text-gray-600 hover:text-white uppercase font-bold tracking-widest transition-colors">Abortar e Voltar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center bg-[#050505]">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-yellow-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-900/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 w-full max-w-md px-6 py-12 flex flex-col items-center">
        <header className="text-center mb-12 w-full">
          <div className="relative inline-block mb-6 group">
            <div className="absolute inset-0 bg-yellow-500/10 blur-3xl rounded-full group-hover:bg-yellow-500/20 transition-colors" />
            <div className="relative p-1 rounded-full gold-gradient animate-float">
              <img src={BRAND.logoUrl} alt={BRAND.name} className="w-28 h-28 rounded-full border-4 border-[#050505] object-cover shadow-2xl" />
            </div>
          </div>
          <h1 className="font-display text-4xl font-bold gold-gradient bg-clip-text text-transparent mb-2 tracking-tighter uppercase">{BRAND.name}</h1>
          <p className="text-gray-500 text-[10px] uppercase tracking-[0.3em] font-black opacity-60">{BRAND.tagline}</p>
        </header>

        <section className="w-full flex flex-col gap-4 mb-20">
          {links.length > 0 ? (
            links.map((link) => <LinkButton key={link.id} link={link} />)
          ) : (
            <div className="text-center py-24 glass-card rounded-3xl border-dashed border-white/10">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Buscando as melhores ofertas...</p>
            </div>
          )}
        </section>

        <div className="flex gap-8 mb-16">
          {SOCIAL_LINKS.map((social) => (
            <a key={social.name} href={social.url} className="text-gray-600 hover:text-yellow-500 transition-all hover:scale-125">
               <span className="text-xs font-black uppercase tracking-widest">{social.icon}</span>
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-12 opacity-30 grayscale group hover:opacity-100 transition-opacity">
          <div className="text-[10px] font-black border border-white/40 px-2 py-1 rounded">18+</div>
          <div className="text-[10px] font-black uppercase tracking-widest">Jogue com Responsabilidade</div>
        </div>
      </main>

      <footer className="w-full glass-card py-6 px-6 border-t border-white/5 mt-auto">
        <div className="max-w-md mx-auto flex justify-between items-center text-[9px] font-black text-gray-600 tracking-[0.2em] uppercase">
          <span>&copy; {new Date().getFullYear()} {BRAND.name}</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span>Encriptação Ativa</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
