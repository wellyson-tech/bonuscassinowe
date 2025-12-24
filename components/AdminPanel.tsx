
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CasinoLink } from '../types';
import { Icons } from '../constants';

const AdminPanel: React.FC = () => {
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [editingLink, setEditingLink] = useState<Partial<CasinoLink> | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('position', { ascending: true });
      if (!error) setLinks(data ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;
    setLoading(true);

    const payload = {
      title: editingLink.title || 'Sem título',
      description: editingLink.description || '',
      url: editingLink.url || '',
      type: editingLink.type || 'glass',
      icon: editingLink.icon || 'auto',
      badge: editingLink.badge || '',
      category: editingLink.category || 'Página 1',
      is_highlighted: !!editingLink.is_highlighted,
    };

    try {
      if (editingLink.id) {
        await supabase.from('links').update(payload).eq('id', editingLink.id);
      } else {
        await supabase.from('links').insert([{ ...payload, position: links.length }]);
      }
      setEditingLink(null);
      fetchLinks();
      alert('✅ Publicado com sucesso!');
    } catch (err) {
      alert('❌ Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir?')) return;
    await supabase.from('links').delete().eq('id', id);
    fetchLinks();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-[#050505] min-h-screen text-white pb-32">
      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-black text-shimmer uppercase italic">Gestão de Páginas</h2>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black mt-1">Organize seus links por abas</p>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.hash = '')} className="px-5 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase">Sair</button>
      </div>

      <button
        onClick={() => setEditingLink({ category: 'Página 1', type: 'glass', icon: 'auto' })}
        className="w-full py-6 gold-gradient text-black font-black rounded-3xl uppercase text-sm mb-10 shadow-xl"
      >
        + Novo Link / Plataforma
      </button>

      <div className="space-y-4">
        {links.map((link) => (
          <div key={link.id} className="glass-card p-5 rounded-[2rem] flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 text-yellow-500">
                {Icons[link.icon || 'slots'] || Icons.slots}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm uppercase">{link.title}</h4>
                  <span className="text-[8px] bg-white/10 text-white/50 px-2 py-0.5 rounded uppercase font-black">
                    {link.category}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{link.url}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingLink(link)} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.14-10.14a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.86 3.86z" /></svg>
              </button>
              <button onClick={() => handleDelete(link.id!)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingLink && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 z-[9999]">
          <form onSubmit={handleSave} className="bg-[#0c0c0c] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg space-y-5 animate-fade-in shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-shimmer uppercase italic">Configurar Link</h3>
              <button type="button" onClick={() => setEditingLink(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
                <label className="text-[9px] uppercase font-black text-yellow-500 block mb-2">Qual Página / Aba? (Página 1, Página 2...)</label>
                <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none focus:border-yellow-500" value={editingLink.category || ''} onChange={e => setEditingLink({...editingLink, category: e.target.value})} placeholder="Ex: Página 1" required />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-1">Título</label>
                <input className="w-full p-4 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-500" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} placeholder="Nome da Plataforma" required />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-1">URL (Link Afiliado)</label>
                <input className="w-full p-4 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-500 font-mono" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} placeholder="https://..." required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-gray-500 ml-1">Ícone</label>
                  <select className="w-full p-4 rounded-xl text-[10px] font-black bg-white/5 border border-white/10 text-white outline-none uppercase" value={editingLink.icon || 'auto'} onChange={e => setEditingLink({...editingLink, icon: e.target.value})}>
                    <option value="auto">🌐 Automático</option>
                    <option value="slots">🎰 Slots</option>
                    <option value="rocket">🚀 Crash</option>
                    <option value="dice">🎲 Dados</option>
                    <option value="cards">🃏 Cartas</option>
                    <option value="fire">🔥 Hot</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-gray-500 ml-1">Estilo</label>
                  <select className="w-full p-4 rounded-xl text-[10px] font-black bg-white/5 border border-white/10 text-white outline-none uppercase" value={editingLink.type || 'glass'} onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}>
                    <option value="gold">Dourado</option>
                    <option value="neon-purple">Roxo</option>
                    <option value="neon-green">Verde</option>
                    <option value="glass">Vidro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-1">Etiqueta (Badge)</label>
                <input className="w-full p-4 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-500" value={editingLink.badge || ''} onChange={e => setEditingLink({...editingLink, badge: e.target.value})} placeholder="Ex: PAGANDO MUITO" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-5 gold-gradient text-black font-black rounded-2xl uppercase text-[10px] tracking-widest mt-4">
              {loading ? 'Salvando...' : 'Publicar'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
