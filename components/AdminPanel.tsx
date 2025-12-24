
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CasinoLink } from '../types';
import { Icons } from '../constants';

const AdminPanel: React.FC = () => {
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [editingLink, setEditingLink] = useState<Partial<CasinoLink> | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      setLinks(data ?? []);
    } catch (err) {
      console.error("Erro ao buscar links:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;
    
    setLoading(true);
    setErrorMessage(null);

    // Preparar payload limpando campos indefinidos
    const payload: any = {
      title: editingLink.title || 'Sem título',
      description: editingLink.description || 'Clique para jogar',
      url: editingLink.url || '',
      type: editingLink.type || 'glass',
      icon: editingLink.icon || 'auto',
      badge: editingLink.badge || '',
      category: editingLink.category || 'Página 1',
      position: editingLink.position ?? links.length,
      is_highlighted: Boolean(editingLink.is_highlighted)
    };

    try {
      let result;
      if (editingLink.id) {
        // Atualizar existente
        result = await supabase
          .from('links')
          .update(payload)
          .eq('id', editingLink.id);
      } else {
        // Inserir novo
        result = await supabase
          .from('links')
          .insert([payload]);
      }

      if (result.error) throw result.error;

      // Sucesso
      setEditingLink(null);
      await fetchLinks();
      alert('✅ Publicado com sucesso!');
    } catch (err: any) {
      console.error("Erro detalhado ao salvar:", err);
      setErrorMessage(err.message || 'Erro de conexão com o banco de dados');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      const { error } = await supabase.from('links').delete().eq('id', id);
      if (error) throw error;
      fetchLinks();
    } catch (err) {
      alert('Erro ao excluir');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-10 bg-[#050505] min-h-screen text-white pb-32">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-black text-shimmer uppercase italic tracking-tighter">Gestor VIP</h2>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black mt-1">Controle de Plataformas</p>
        </div>
        <button 
          onClick={() => { supabase.auth.signOut(); window.location.hash = ''; window.location.reload(); }} 
          className="px-5 py-2.5 bg-white/5 text-gray-400 border border-white/10 rounded-xl text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all"
        >
          Sair do Painel
        </button>
      </div>

      {/* Add New Button */}
      <button
        onClick={() => {
          setErrorMessage(null);
          setEditingLink({ category: 'Página 1', type: 'glass', icon: 'auto', title: '', url: '', badge: '' });
        }}
        className="w-full py-6 bg-yellow-500 text-black font-black rounded-[2rem] uppercase text-sm mb-12 shadow-[0_15px_40px_rgba(212,175,55,0.2)] hover:scale-[1.01] transition-all active:scale-95 flex items-center justify-center gap-3"
      >
        <span className="text-xl">+</span> Adicionar Novo Link / Página
      </button>

      {/* List of Links */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-6 ml-2">Links Ativos</h3>
        
        {links.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
            <p className="text-gray-600 uppercase text-[9px] font-black tracking-[0.5em]">Nenhum link configurado</p>
          </div>
        ) : (
          links.map((link) => (
            <div key={link.id} className="bg-[#0f0f0f] p-5 rounded-[2.5rem] flex items-center justify-between border border-white/5 shadow-xl">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center border border-white/10 text-yellow-500 shadow-inner">
                  {Icons[link.icon || 'slots'] || Icons.slots}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm uppercase text-white tracking-tight">{link.title}</h4>
                    <span className="text-[8px] bg-yellow-500 text-black px-2 py-0.5 rounded-md font-black uppercase">
                      {link.category || 'Página 1'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 truncate max-w-[150px] md:max-w-xs opacity-50">{link.url}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => { setErrorMessage(null); setEditingLink(link); }} 
                  className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 text-white transition-all border border-white/5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.14-10.14a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.86 3.86z" /></svg>
                </button>
                <button 
                  onClick={() => handleDelete(link.id!)} 
                  className="w-11 h-11 flex items-center justify-center bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-600/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      {editingLink && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-xl flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <form onSubmit={handleSave} className="bg-[#0a0a0a] border border-white/10 p-8 md:p-10 rounded-[3rem] w-full max-w-xl my-auto space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-black text-shimmer uppercase italic">Configurar Link</h3>
              <button type="button" onClick={() => setEditingLink(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white">✕</button>
            </div>

            {errorMessage && (
              <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-2xl text-[10px] text-red-500 font-black uppercase text-center tracking-widest">
                Erro: {errorMessage}
              </div>
            )}
            
            <div className="space-y-5">
              <div className="p-5 bg-yellow-500/5 border border-yellow-500/10 rounded-[1.8rem]">
                <label className="text-[9px] uppercase font-black text-yellow-500 block mb-3 ml-1 tracking-widest">Página de Destino (Ex: Página 2)</label>
                <input 
                  className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none focus:border-yellow-500" 
                  value={editingLink.category || ''} 
                  onChange={e => setEditingLink({...editingLink, category: e.target.value})} 
                  placeholder="Ex: Página 1" 
                  required 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black text-gray-500 ml-1">Título</label>
                  <input className="w-full p-4 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-500" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} placeholder="Ex: Bet365" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black text-gray-500 ml-1">Estilo</label>
                  <select className="w-full p-4 rounded-xl text-[10px] font-black bg-white/5 border border-white/10 text-white outline-none uppercase" value={editingLink.type || 'glass'} onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}>
                    <option value="gold">Dourado</option>
                    <option value="neon-purple">Roxo</option>
                    <option value="neon-green">Verde</option>
                    <option value="glass">Vidro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-1">URL / Link Afiliado</label>
                <input className="w-full p-4 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-500 font-mono" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} placeholder="https://..." required />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black text-gray-500 ml-1">Ícone</label>
                  <select className="w-full p-4 rounded-xl text-[10px] font-black bg-white/5 border border-white/10 text-white outline-none uppercase" value={editingLink.icon || 'auto'} onChange={e => setEditingLink({...editingLink, icon: e.target.value})}>
                    <option value="auto">🌐 Auto</option>
                    <option value="slots">🎰 Slots</option>
                    <option value="rocket">🚀 Crash</option>
                    <option value="dice">🎲 Dados</option>
                    <option value="cards">🃏 Cartas</option>
                    <option value="fire">🔥 Fogo</option>
                    <option value="diamond">💎 VIP</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black text-gray-500 ml-1">Etiqueta</label>
                  <input className="w-full p-4 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-500" value={editingLink.badge || ''} onChange={e => setEditingLink({...editingLink, badge: e.target.value})} placeholder="Ex: PAGANDO" />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className={`w-full py-6 rounded-2xl uppercase text-[11px] font-black tracking-[0.3em] transition-all shadow-2xl ${
                loading ? 'bg-gray-800 text-gray-500' : 'bg-yellow-500 text-black hover:brightness-110 active:scale-95'
              }`}
            >
              {loading ? 'Processando...' : (editingLink.id ? 'Salvar Alterações' : 'Publicar Link')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
