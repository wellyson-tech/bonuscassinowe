
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { BRAND, SOCIAL_LINKS } from './constants';
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
    const initApp = async () => {
      try {
        await fetchLinks();
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
      } catch (e) {
        console.error("Erro na inicialização:", e);
      } finally {
        setInitializing(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .order('position', { ascending: true });
    
    if (!error && data) {
      setLinks(data);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('Erro: ' + error.message);
    } else {
      setView('admin');
    }
    setLoading(false);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (view === 'login' && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#050505]">
        <form onSubmit={handleLogin} className="w-full max-w-sm glass-card p-8 rounded-2xl space-y-6 border border-white/5 shadow-2xl">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold gold-gradient bg-clip-text text-transparent uppercase">Acesso Restrito</h2>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Portal do Administrador</p>
          </div>
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="Seu E-mail" 
              className="w-full p-4 rounded-xl text-sm"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Sua Senha" 
              className="w-full p-4 rounded-xl text-sm"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="w-full py-4 gold-gradient text-black font-black rounded-xl hover:brightness-110 active:scale-95 transition-all">
            {loading ? 'AUTENTICANDO...' : 'ENTRAR AGORA'}
          </button>
          <button type="button" onClick={() => setView('public')} className="w-full text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-widest transition-colors">Voltar para o Site</button>
        </form>
      </div>
    );
  }

  if ((view === 'admin' || session) && session) {
    return <AdminPanel />;
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
          <div onClick={() => setView('login')} className="relative inline-block mb-6 cursor-pointer group">
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
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Aguardando atualização de ofertas...</p>
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
            <span>Servidor Criptografado</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;