
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
      alert('✅ Link salvo com sucesso!');
    } catch (err: any) {
      alert('❌ Erro ao salvar: ' + (err.message || 'Verifique permissões ou se a tabela existe.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este link permanentemente?')) return;

    const { error } = await supabase
      .from('links')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }

    fetchLinks();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err) {
      console.error("Erro ao sair:", err);
      window.location.reload();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-[#050505] min-h-screen text-white pb-24 relative z-[50]">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold gold-gradient bg-clip-text text-transparent uppercase tracking-tight">
            Centro de Comando
          </h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            Controle de Links & Ofertas
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-5 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 rounded-xl text-[10px] font-black transition-all uppercase"
        >
          Finalizar Sessão
        </button>
      </div>

      {/* ERRO DE TABELA */}
      {errorStatus === 'TABLE_MISSING' && (
        <div className="mb-10 p-8 bg-red-950/20 border-2 border-red-500/40 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl">⚠️</span>
            <h3 className="text-red-500 font-black uppercase text-lg">
              Banco de Dados não configurado
            </h3>
          </div>
          <p className="text-sm text-gray-300 mb-6 leading-relaxed">
            A tabela <b>links</b> não existe neste projeto Supabase. 
            Clique no botão abaixo para abrir o SQL Editor e criar a tabela.
          </p>
          <button 
            onClick={() => window.open('https://supabase.com/dashboard/project/ufqhxtfsoxzrofjpvhpk/sql/new', '_blank')}
            className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-500 transition-colors shadow-lg"
          >
            Abrir Editor SQL
          </button>
        </div>
      )}

      {/* LISTAGEM E BOTÃO ADICIONAR */}
      {!errorStatus && (
        <>
          <button
            onClick={() => {
              setEditingLink({
                title: '',
                url: '',
                description: '',
                type: 'glass',
                icon: 'auto',
                is_highlighted: false,
                badge: '',
              });
            }}
            className="mb-10 w-full py-6 gold-gradient text-black font-black rounded-2xl shadow-2xl uppercase tracking-tighter text-lg active:scale-95 transition-transform cursor-pointer"
          >
            + Adicionar Nova Oferta VIP
          </button>

          <div className="grid gap-4">
            {links.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">
                  Nenhum link ativo encontrado
                </p>
              </div>
            ) : (
              links.map(link => (
                <div
                  key={link.id}
                  className="glass-card p-5 rounded-2xl flex items-center justify-between border border-white/5 shadow-xl hover:border-yellow-500/30 transition-all"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-yellow-500 overflow-hidden">
                      {link.icon === 'auto' ? (
                         <img 
                          src={`https://www.google.com/s2/favicons?domain=${new URL(link.url || 'http://localhost').hostname}&sz=64`}
                          className="w-6 h-6 object-contain opacity-50"
                          alt="Auto"
                        />
                      ) : (Icons[link.icon as keyof typeof Icons] || Icons.chip)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm uppercase">
                          {link.title}
                        </h4>
                        {link.badge && (
                          <span className="text-[8px] bg-yellow-500 text-black px-2 py-0.5 rounded font-black uppercase">
                            {link.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 truncate max-w-[200px]">
                        {link.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingLink(link)}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(link.id!)}
                      className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors cursor-pointer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* FORMULÁRIO MODAL */}
      {editingLink && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[9999]">
          <form onSubmit={handleSave} className="bg-[#0c0c0c] border border-white/10 p-8 rounded-3xl w-full max-w-lg space-y-5 shadow-[0_0_100px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-black gold-gradient bg-clip-text text-transparent uppercase tracking-tight">Configurar Oferta</h3>
              <button 
                type="button" 
                onClick={() => setEditingLink(null)}
                className="text-gray-500 hover:text-white transition-colors p-2"
              >
                ✕
              </button>
            </div>
            
            <div className="grid gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Nome da Plataforma</label>
                <input 
                  className="w-full p-4 rounded-2xl text-sm bg-[#111] border border-white/10 outline-none focus:border-yellow-500 text-white placeholder:text-gray-700" 
                  value={editingLink.title || ''} 
                  onChange={e => setEditingLink({...editingLink, title: e.target.value})} 
                  required
                  placeholder="Ex: Royal Casino"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Link de Afiliado (URL Completa)</label>
                <input 
                  className="w-full p-4 rounded-2xl text-sm bg-[#111] border border-white/10 outline-none focus:border-yellow-500 text-white placeholder:text-gray-700" 
                  value={editingLink.url || ''} 
                  onChange={e => setEditingLink({...editingLink, url: e.target.value})} 
                  required
                  placeholder="https://plataforma.com/?aff=123"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Estilo Visual</label>
                  <select 
                    className="w-full p-4 rounded-2xl text-xs bg-[#111] border border-white/10 outline-none focus:border-yellow-500 text-white appearance-none cursor-pointer" 
                    value={editingLink.type || 'glass'} 
                    onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}
                  >
                    <option value="gold">💎 Dourado Premium</option>
                    <option value="neon-purple">💜 Roxo Neon</option>
                    <option value="neon-green">💚 Verde Neon</option>
                    <option value="glass">⚪ Vidro Simples</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Tipo de Ícone</label>
                  <select 
                    className="w-full p-4 rounded-2xl text-xs bg-[#111] border border-white/10 outline-none focus:border-yellow-500 text-white appearance-none cursor-pointer" 
                    value={editingLink.icon || 'auto'} 
                    onChange={e => setEditingLink({...editingLink, icon: e.target.value})}
                  >
                    <option value="auto">🌐 Ícone Automático do Site</option>
                    {Object.keys(Icons).map(i => (
                      <option key={i} value={i}>
                        {i.toUpperCase()} (Manual)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Selo de Destaque (Badge)</label>
                <input 
                  placeholder="Ex: NOVO ou PAGANDO MUITO"
                  className="w-full p-4 rounded-2xl text-sm bg-[#111] border border-white/10 outline-none focus:border-yellow-500 text-white placeholder:text-gray-700" 
                  value={editingLink.badge || ''} 
                  onChange={e => setEditingLink({...editingLink, badge: e.target.value})} 
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Chamada de Bônus (Descrição)</label>
                <input 
                  placeholder="Ex: Bônus de 100% no 1º depósito"
                  className="w-full p-4 rounded-2xl text-sm bg-[#111] border border-white/10 outline-none focus:border-yellow-500 text-white placeholder:text-gray-700" 
                  value={editingLink.description || ''} 
                  onChange={e => setEditingLink({...editingLink, description: e.target.value})} 
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-white/5">
              <button type="submit" disabled={loading} className="flex-1 py-5 gold-gradient text-black font-black rounded-2xl shadow-xl uppercase cursor-pointer hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                {loading ? 'Salvando...' : 'Confirmar e Publicar'}
              </button>
              <button type="button" onClick={() => setEditingLink(null)} className="px-8 py-5 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold uppercase transition-colors cursor-pointer text-gray-400 hover:text-white">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
