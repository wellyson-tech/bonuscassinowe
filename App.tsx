
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
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    fetchLinks();
    
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchLinks = async () => {
    try {
      // FETCH LINKS
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('position', { ascending: true });
      
      if (error) throw error;
      if (data) setLinks(data);
      setIsConfigured(true);
    } catch (err) {
      console.warn('Supabase não configurado ou erro na busca:', err);
      setIsConfigured(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  useEffect(() => {
    if (session && view === 'login') setView('admin');
  }, [session, view]);

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#050505]">
        <form onSubmit={handleLogin} className="w-full max-w-sm glass-card p-8 rounded-2xl space-y-6">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold gold-gradient bg-clip-text text-transparent uppercase">Admin Login</h2>
            <p className="text-gray-500 text-xs mt-1">Acesso restrito ao painel</p>
          </div>
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="E-mail" 
              className="w-full p-4 rounded-xl outline-none transition-all focus:ring-2 focus:ring-yellow-500/50"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Senha" 
              className="w-full p-4 rounded-xl outline-none transition-all focus:ring-2 focus:ring-yellow-500/50"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="w-full py-4 gold-gradient text-black font-bold rounded-xl active:scale-95 transition-transform">
            {loading ? 'CARREGANDO...' : 'ENTRAR'}
          </button>
          <button type="button" onClick={() => setView('public')} className="w-full text-xs text-gray-500 hover:text-white transition-colors">VOLTAR AO SITE</button>
        </form>
      </div>
    );
  }

  if (view === 'admin' && session) {
    return <AdminPanel />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center bg-[#050505]">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-900/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 w-full max-w-md px-6 py-12 flex flex-col items-center">
        <section className="text-center mb-10 w-full">
          <div onClick={() => setView('login')} className="relative inline-block mb-6 cursor-pointer group">
            <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full group-hover:bg-yellow-500/40 transition-colors" />
            <div className="relative p-1 rounded-full gold-gradient animate-float">
              <img src={BRAND.logoUrl} alt={BRAND.name} className="w-24 h-24 rounded-full border-4 border-[#050505] object-cover shadow-2xl" />
            </div>
            {BRAND.verified && (
              <div className="absolute bottom-1 right-1 bg-blue-500 rounded-full p-1 border-2 border-[#050505]">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L9 10.586l3.293-3.293a1 1 0 111.414 1.414z" /></svg>
              </div>
            )}
          </div>
          <h1 className="font-display text-4xl font-bold gold-gradient bg-clip-text text-transparent mb-2 tracking-tight">{BRAND.name}</h1>
          <p className="text-gray-400 text-sm uppercase tracking-[0.2em] font-medium opacity-80">{BRAND.tagline}</p>
        </section>

        {!isConfigured && (
          <div className="w-full p-4 mb-6 border border-yellow-500/30 bg-yellow-500/5 rounded-xl text-yellow-200/80 text-xs text-center leading-relaxed">
            ⚠️ <strong>Configuração Necessária:</strong> Insira seu URL e Anon Key no arquivo <code className="text-white">lib/supabase.ts</code> para carregar os links dinâmicos do banco de dados.
          </div>
        )}

        <section className="w-full flex flex-col gap-4 mb-16">
          {links.length > 0 ? (
            links.map((link) => <LinkButton key={link.id} link={link} />)
          ) : (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 text-xs uppercase tracking-widest animate-pulse">Buscando melhores cotações...</p>
            </div>
          )}
        </section>

        {/* Responsible Gaming Badges */}
        <div className="flex justify-center gap-4 mb-10 opacity-40 hover:opacity-100 transition-opacity">
          <div className="px-3 py-1 border border-white/20 rounded text-[10px] font-bold text-white">18+</div>
          <div className="px-3 py-1 border border-white/20 rounded text-[10px] font-bold text-white uppercase tracking-tighter">Jogo Responsável</div>
        </div>

        <div className="flex gap-6 mb-12">
          {SOCIAL_LINKS.map((social) => (
            <a key={social.name} href={social.url} className="text-gray-500 hover:text-yellow-500 transition-all hover:scale-110 flex flex-col items-center group">
               <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-yellow-500/30">
                  <span className="text-[11px] font-bold">{social.icon}</span>
               </div>
            </a>
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full z-50 glass-card py-4 px-6 border-t border-white/5">
        <div className="max-w-md mx-auto flex justify-between items-center text-[10px] font-bold text-gray-500 tracking-widest">
          <span>&copy; 2024 {BRAND.name}</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-emerald-500/80">SISTEMA ONLINE</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
