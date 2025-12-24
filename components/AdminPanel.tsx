
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CasinoLink } from '../types';
import { Icons } from '../constants';

const AdminPanel: React.FC = () => {
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [editingLink, setEditingLink] = useState<Partial<CasinoLink> | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
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

      if (error) {
        if (error.code === '42P01') {
          setErrorStatus('TABLE_MISSING');
          return;
        }
        console.error('Erro Supabase:', error);
        return;
      }

      setErrorStatus(null);
      setLinks(data ?? []);
    } catch (err) {
      console.error('Erro inesperado:', err);
    }
  };

  const onDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const newLinks = [...links];
    const itemToMove = newLinks[draggedItemIndex];
    newLinks.splice(draggedItemIndex, 1);
    newLinks.splice(index, 0, itemToMove);
    
    setDraggedItemIndex(index);
    setLinks(newLinks);
  };

  const onDragEnd = async () => {
    setDraggedItemIndex(null);
    setLoading(true);
    
    try {
      const updates = links.map((link, idx) => ({
        id: link.id,
        position: idx,
        title: link.title,
        url: link.url,
        type: link.type,
        icon: link.icon,
        description: link.description,
        badge: link.badge,
        category: link.category || 'Destaques',
        is_highlighted: link.is_highlighted
      }));

      const { error } = await supabase.from('links').upsert(updates);
      if (error) throw error;
    } catch (err) {
      alert("Erro ao salvar nova ordem!");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;

    setLoading(true);

    try {
      const payload = {
        title: editingLink.title || 'Sem título',
        description: editingLink.description || '',
        url: editingLink.url || '',
        type: editingLink.type || 'glass',
        icon: editingLink.icon || 'auto',
        badge: editingLink.badge || '',
        category: editingLink.category || 'Destaques',
        is_highlighted: !!editingLink.is_highlighted,
      };

      let error;

      if (editingLink.id) {
        const result = await supabase
          .from('links')
          .update(payload)
          .eq('id', editingLink.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('links')
          .insert([{ ...payload, position: links.length, click_count: 0 }]);
        error = result.error;
      }

      if (error) throw error;

      setEditingLink(null);
      await fetchLinks();
      alert('✅ Alterações publicadas com sucesso!');
    } catch (err: any) {
      alert('❌ Erro no Servidor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('☢️ Deseja realmente remover esta oferta?')) return;

    const { error } = await supabase
      .from('links')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Falha ao excluir: ' + error.message);
      return;
    }

    fetchLinks();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const renderPreviewIcon = (link: Partial<CasinoLink>) => {
    const isAuto = !link.icon || link.icon === 'auto';
    
    if (isAuto && link.url && link.url.length > 5) {
      try {
        const urlWithProtocol = link.url.startsWith('http') ? link.url : `https://${link.url}`;
        const domain = new URL(urlWithProtocol).hostname;
        return (
          <img 
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
            className="w-10 h-10 object-contain rounded-lg bg-white/5 p-1.5 border border-white/10"
            alt="Favicon"
          />
        );
      } catch (e) {
        return <div className="w-8 h-8 text-white/20">{Icons.slots}</div>;
      }
    }
    const iconName = (link.icon || 'slots').toLowerCase();
    return <div className="w-10 h-10 text-yellow-500 p-1">{Icons[iconName] || Icons.slots}</div>;
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-8 bg-[#050505] min-h-screen text-white pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-3xl font-black text-shimmer uppercase tracking-tight">Painel Master</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">Configuração de Plataformas e Links</p>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={() => window.open('/', '_blank')} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase">Ver Site</button>
           <button onClick={handleLogout} className="px-6 py-3 bg-red-600/10 text-red-500 border border-red-600/30 rounded-2xl text-[10px] font-black uppercase">Sair</button>
        </div>
      </div>

      <div className="space-y-10">
        <button
          onClick={() => setEditingLink({ title: '', url: '', description: '', type: 'glass', icon: 'auto', is_highlighted: false, badge: '', category: 'Destaques' })}
          className="w-full py-8 gold-gradient text-black font-black rounded-3xl uppercase text-xl hover:brightness-110 transition-all shadow-[0_20px_40px_rgba(212,175,55,0.2)]"
        >
          + Cadastrar Nova Plataforma
        </button>

        <div className="grid gap-6">
          {links.map((link, index) => (
            <div
              key={link.id}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragEnd={onDragEnd}
              className={`glass-card p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between border border-white/5 cursor-move transition-all ${draggedItemIndex === index ? 'opacity-30 scale-95' : 'opacity-100 hover:border-yellow-500/30'}`}
            >
              <div className="flex items-center gap-6 pointer-events-none">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  {renderPreviewIcon(link)}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="font-black text-base uppercase">{link.title}</h4>
                    <span className="text-[8px] bg-yellow-500 text-black px-2 py-0.5 rounded font-black uppercase">
                      {link.category || 'Destaques'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">{link.url}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4 md:mt-0">
                <button onClick={() => setEditingLink(link)} className="px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase hover:bg-white/10 transition-colors">Editar</button>
                <button onClick={() => handleDelete(link.id!)} className="px-6 py-4 bg-red-500/10 text-red-500 border border-red-500/10 rounded-2xl text-[10px] font-black uppercase hover:bg-red-500/20 transition-colors">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingLink && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-2xl flex items-center justify-center p-6 z-[9999]">
          <form onSubmit={handleSave} className="bg-[#0c0c0c] border border-white/10 p-10 rounded-[2.5rem] w-full max-w-xl space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black text-shimmer uppercase">Configurar Plataforma</h3>
              <button type="button" onClick={() => setEditingLink(null)} className="p-3 bg-white/5 rounded-full hover:bg-white/10">✕</button>
            </div>
            
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-400 ml-1">Página / Categoria</label>
                <input className="w-full p-5 rounded-2xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-500" value={editingLink.category || ''} onChange={e => setEditingLink({...editingLink, category: e.target.value})} placeholder="Ex: Cadastro, VIP, Slots" required />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-400 ml-1">Nome da Plataforma</label>
                <input className="w-full p-5 rounded-2xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-500" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} placeholder="Ex: Betano" required />
              </div>
              
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-400 ml-1">URL (Link de Afiliado)</label>
                <input className="w-full p-5 rounded-2xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-500 font-mono" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} placeholder="https://..." required />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black text-gray-400 ml-1">Ícone</label>
                  <select className="w-full p-5 rounded-2xl text-[10px] font-black bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-500 uppercase" value={editingLink.icon || 'auto'} onChange={e => setEditingLink({...editingLink, icon: e.target.value})}>
                    <option value="auto">🌐 Automático (Favicon)</option>
                    <option value="slots">🎰 Slots (777)</option>
                    <option value="rocket">🚀 Crash / Rocket</option>
                    <option value="dice">🎲 Games / Dados</option>
                    <option value="cards">🃏 Poker / Cartas</option>
                    <option value="trophy">🏆 VIP / Torneio</option>
                    <option value="money">💰 Saques / Dinheiro</option>
                    <option value="gift">🎁 Bônus / Presente</option>
                    <option value="diamond">💎 Diamond / Premium</option>
                    <option value="fire">🔥 Hot / Fogo</option>
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="telegram">✈️ Telegram</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black text-gray-400 ml-1">Estilo do Botão</label>
                  <select className="w-full p-5 rounded-2xl text-[10px] font-black bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-500 uppercase" value={editingLink.type || 'glass'} onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}>
                    <option value="gold">💎 Dourado Premium</option>
                    <option value="neon-purple">💜 Roxo Neon</option>
                    <option value="neon-green">💚 Verde Neon</option>
                    <option value="glass">⚪ Vidro Clean</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-400 ml-1">Etiqueta (Opcional)</label>
                <input className="w-full p-5 rounded-2xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-500" value={editingLink.badge || ''} onChange={e => setEditingLink({...editingLink, badge: e.target.value})} placeholder="Ex: PAGANDO MUITO" />
              </div>
              
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-400 ml-1">Descrição Curta</label>
                <textarea className="w-full p-5 rounded-2xl text-sm bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-500 h-24 resize-none" value={editingLink.description || ''} onChange={e => setEditingLink({...editingLink, description: e.target.value})} placeholder="Ex: Bônus de 100% no primeiro depósito" />
              </div>
            </div>

            <div className="flex gap-4 pt-8">
              <button type="submit" disabled={loading} className="flex-1 py-6 gold-gradient text-black font-black rounded-2xl uppercase text-xs tracking-widest shadow-lg hover:brightness-110 transition-all">
                {loading ? 'Sincronizando...' : 'Publicar Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
