
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CasinoLink } from '../types';
import { Icons } from '../constants';

const AdminPanel: React.FC = () => {
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [editingLink, setEditingLink] = useState<Partial<CasinoLink> | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

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
          .insert([{ ...payload, position: links.length }]);
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
    if (!confirm('☢️ ATENÇÃO: Deseja realmente remover esta oferta? Esta ação não pode ser desfeita.')) return;

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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recém criado';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderPreviewIcon = (link: Partial<CasinoLink>) => {
    if (link.icon === 'auto' || (!Icons[link.icon as string] && link.url?.startsWith('http'))) {
      try {
        const url = new URL(link.url || 'http://localhost');
        return (
          <img 
            src={`https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`}
            className="w-10 h-10 object-contain"
            alt="Favicon"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; }}
          />
        );
      } catch (e) {
        return Icons.chip;
      }
    }
    return Icons[link.icon as string] || Icons.chip;
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-8 bg-[#050505] min-h-screen text-white pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-3xl font-black gold-gradient bg-clip-text text-transparent uppercase tracking-tight">
            Dashboard Estratégico
          </h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">
            Gestão de Ativos CassinoWE
          </p>
        </div>
        <div className="flex items-center gap-4">
           <button
            onClick={() => window.open('/', '_blank')}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest"
          >
            Ver Site Público
          </button>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest"
          >
            Encerrar Painel
          </button>
        </div>
      </div>

      {!errorStatus && (
        <div className="space-y-10">
          <button
            onClick={() => setEditingLink({ title: '', url: '', description: '', type: 'glass', icon: 'auto', is_highlighted: false, badge: '' })}
            className="w-full py-8 gold-gradient text-black font-black rounded-3xl shadow-2xl uppercase tracking-tighter text-xl active:scale-[0.98] transition-all cursor-pointer hover:brightness-110"
          >
            + Lançar Nova Campanha VIP
          </button>

          <div className="grid gap-6">
            {links.length === 0 ? (
              <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                <p className="text-gray-600 font-black uppercase tracking-widest text-xs">O ecossistema está vazio. Inicie sua primeira oferta acima.</p>
              </div>
            ) : (
              links.map(link => (
                <div
                  key={link.id}
                  className="glass-card p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between border border-white/5 shadow-2xl hover:border-yellow-500/20 transition-all group"
                >
                  <div className="flex items-center gap-6 w-full md:w-auto mb-6 md:mb-0">
                    <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center text-yellow-500 overflow-hidden relative">
                      {renderPreviewIcon(link)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-black text-base uppercase tracking-tight">{link.title}</h4>
                        <span className="text-[8px] bg-white/5 text-gray-500 px-2 py-0.5 rounded font-bold uppercase">{formatDate(link.created_at)}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate max-w-[280px] font-mono opacity-60">{link.url}</p>
                      {link.badge && (
                        <span className="inline-block mt-2 text-[8px] bg-yellow-500 text-black px-2 py-0.5 rounded font-black uppercase tracking-widest">
                          {link.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button
                      onClick={() => setEditingLink(link)}
                      className="flex-1 md:flex-none px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest border border-white/5"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(link.id!)}
                      className="flex-1 md:flex-none px-6 py-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest border border-red-500/20"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {editingLink && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-2xl flex items-center justify-center p-6 z-[9999]">
          <form onSubmit={handleSave} className="bg-[#0c0c0c] border border-white/10 p-10 rounded-[2.5rem] w-full max-w-xl space-y-6 shadow-[0_0_150px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto custom-scroll">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-2xl font-black gold-gradient bg-clip-text text-transparent uppercase tracking-tight">Parametrizar Campanha</h3>
                <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">Configurações de Conversão</p>
              </div>
              <button type="button" onClick={() => setEditingLink(null)} className="text-gray-600 hover:text-white transition-colors p-3 bg-white/5 rounded-full">✕</button>
            </div>
            
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-1 tracking-widest">Título da Oferta</label>
                <input className="w-full p-5 rounded-2xl text-sm bg-white/5 border border-white/10 outline-none focus:border-yellow-500 text-white" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} required />
              </div>
              
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-1 tracking-widest">URL de Redirecionamento</label>
                <input className="w-full p-5 rounded-2xl text-sm bg-white/5 border border-white/10 outline-none focus:border-yellow-500 text-white font-mono" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black text-gray-500 ml-1 tracking-widest">Skin Visual</label>
                  <select className="w-full p-5 rounded-2xl text-[10px] font-black bg-white/5 border border-white/10 outline-none focus:border-yellow-500 text-white uppercase" value={editingLink.type || 'glass'} onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}>
                    <option value="gold">💎 Dourado Premium</option>
                    <option value="neon-purple">💜 Roxo Neon</option>
                    <option value="neon-green">💚 Verde Neon</option>
                    <option value="glass">⚪ Vidro Minimalista</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black text-gray-500 ml-1 tracking-widest">Ativo Gráfico (Ícone)</label>
                  <select className="w-full p-5 rounded-2xl text-[10px] font-black bg-white/5 border border-white/10 outline-none focus:border-yellow-500 text-white uppercase" value={editingLink.icon || 'auto'} onChange={e => setEditingLink({...editingLink, icon: e.target.value})}>
                    <option value="auto">🌐 Automático (Favicon do Site)</option>
                    {Object.keys(Icons).map(i => <option key={i} value={i}>{i} (Manual)</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-1 tracking-widest">Etiqueta Flash (Badge)</label>
                <input className="w-full p-5 rounded-2xl text-sm bg-white/5 border border-white/10 outline-none focus:border-yellow-500 text-white" value={editingLink.badge || ''} onChange={e => setEditingLink({...editingLink, badge: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-1 tracking-widest">Copywriting (Subtítulo)</label>
                <textarea className="w-full p-5 rounded-2xl text-sm bg-white/5 border border-white/10 outline-none focus:border-yellow-500 text-white h-24 resize-none" value={editingLink.description || ''} onChange={e => setEditingLink({...editingLink, description: e.target.value})} />
              </div>
            </div>

            <div className="flex gap-4 pt-8 border-t border-white/5">
              <button type="submit" disabled={loading} className="flex-1 py-6 gold-gradient text-black font-black rounded-2xl shadow-2xl uppercase text-xs tracking-widest">
                {loading ? 'Sincronizando...' : 'Publicar Agora'}
              </button>
              <button type="button" onClick={() => setEditingLink(null)} className="px-10 py-6 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase text-gray-400">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
