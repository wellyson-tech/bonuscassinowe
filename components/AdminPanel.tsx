
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
        if (error.code === '42P01' || error.message.includes('links')) {
          setErrorStatus('TABLE_MISSING');
        }
        throw error;
      }
      setErrorStatus(null);
      setLinks(data || []);
    } catch (err) {
      console.error('Erro:', err);
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
        icon: editingLink.icon || 'chip',
        badge: editingLink.badge || '',
        is_highlighted: !!editingLink.is_highlighted,
      };

      let error;
      if (editingLink.id) {
        const result = await supabase.from('links').update(payload).eq('id', editingLink.id);
        error = result.error;
      } else {
        const result = await supabase.from('links').insert([{ ...payload, position: links.length }]);
        error = result.error;
      }

      if (error) throw error;

      setEditingLink(null);
      await fetchLinks();
      alert('✅ Link salvo com sucesso!');
    } catch (err: any) {
      alert('❌ Erro: ' + (err.message || 'Verifique o banco de dados.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir permanentemente esta oferta?')) {
      const { error } = await supabase.from('links').delete().eq('id', id);
      if (error) alert('Erro: ' + error.message);
      fetchLinks();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-[#050505] min-h-screen text-white pb-24">
      <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold gold-gradient bg-clip-text text-transparent uppercase tracking-tight">Centro de Comando</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Controle de Links & Ofertas</p>
        </div>
        <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} className="px-5 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 rounded-xl text-[10px] font-black transition-all uppercase">
          Finalizar Sessão
        </button>
      </div>

      {errorStatus === 'TABLE_MISSING' && (
        <div className="mb-10 p-8 bg-red-950/20 border-2 border-red-500/40 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl">⚠️</span>
            <h3 className="text-red-500 font-black uppercase text-lg">Banco de Dados não configurado</h3>
          </div>
          <p className="text-sm text-gray-300 mb-6 leading-relaxed">
            A tabela principal de links ainda não foi criada. Você precisa rodar o script SQL no painel do Supabase para que o sistema possa salvar seus dados.
          </p>
          <button 
            onClick={() => window.open('https://supabase.com/dashboard/project/ufqhxtfsoxzrofjpvhpk/sql/new', '_blank')}
            className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-500 transition-colors shadow-lg"
          >
            Abrir Editor SQL e Criar Tabela
          </button>
        </div>
      )}

      {!errorStatus && (
        <>
          <button 
            onClick={() => setEditingLink({ title: '', url: '', description: '', type: 'glass', icon: 'chip', is_highlighted: false, badge: '' })}
            className="mb-10 w-full py-6 gold-gradient text-black font-black rounded-2xl shadow-2xl hover:scale-[1.01] active:scale-95 transition-all uppercase tracking-tighter text-lg"
          >
            + Adicionar Nova Oferta VIP
          </button>

          <div className="grid gap-4">
            {links.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Nenhum link ativo encontrado</p>
              </div>
            ) : (
              links.map(link => (
                <div key={link.id} className="glass-card p-5 rounded-2xl flex items-center justify-between border border-white/5 hover:border-yellow-500/30 transition-all shadow-xl group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-yellow-500 group-hover:bg-yellow-500/10 transition-colors">
                      {Icons[link.icon as keyof typeof Icons] || Icons.chip}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm uppercase tracking-wide">{link.title}</h4>
                        {link.badge && <span className="text-[8px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded font-black uppercase">{link.badge}</span>}
                      </div>
                      <p className="text-[10px] text-gray-500 truncate max-w-[200px] mt-0.5">{link.url}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingLink(link)} className="p-3 bg-white/5 hover:bg-yellow-500/20 hover:text-yellow-500 rounded-xl transition-all">✏️</button>
                    <button onClick={() => handleDelete(link.id!)} className="p-3 bg-red-500/5 hover:bg-red-500/20 text-red-500 rounded-xl transition-all">🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {editingLink && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
          <form onSubmit={handleSave} className="bg-[#0c0c0c] border border-white/10 p-8 rounded-3xl w-full max-w-lg space-y-5 shadow-[0_0_100px_rgba(0,0,0,1)]">
            <h3 className="text-xl font-black gold-gradient bg-clip-text text-transparent uppercase tracking-tight">Configurar Oferta</h3>
            
            <div className="grid gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-500 ml-1">Nome da Plataforma</label>
                <input 
                  className="w-full p-4 rounded-2xl text-sm" 
                  value={editingLink.title || ''} 
                  onChange={e => setEditingLink({...editingLink, title: e.target.value})} 
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-500 ml-1">Link de Afiliado</label>
                <input 
                  className="w-full p-4 rounded-2xl text-sm" 
                  value={editingLink.url || ''} 
                  onChange={e => setEditingLink({...editingLink, url: e.target.value})} 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-gray-500 ml-1">Estilo do Botão</label>
                  <select 
                    className="w-full p-4 rounded-2xl text-xs bg-neutral-900 border border-white/10" 
                    value={editingLink.type || 'glass'} 
                    onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}
                  >
                    <option value="gold">💎 VIP Dourado</option>
                    <option value="neon-purple">💜 Roxo Neon</option>
                    <option value="neon-green">💚 Verde Neon</option>
                    <option value="glass">⚪ Vidro Simples</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-gray-500 ml-1">Ícone</label>
                  <select 
                    className="w-full p-4 rounded-2xl text-xs bg-neutral-900 border border-white/10" 
                    value={editingLink.icon || 'chip'} 
                    onChange={e => setEditingLink({...editingLink, icon: e.target.value as any})}
                  >
                    {Object.keys(Icons).map(i => <option key={i} value={i}>{i.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-500 ml-1">Texto de Destaque (Badge)</label>
                <input 
                  placeholder="Ex: PAGANDO MUITO"
                  className="w-full p-4 rounded-2xl text-sm" 
                  value={editingLink.badge || ''} 
                  onChange={e => setEditingLink({...editingLink, badge: e.target.value})} 
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button type="submit" disabled={loading} className="flex-1 py-5 gold-gradient text-black font-black rounded-2xl shadow-xl uppercase">
                {loading ? 'Processando...' : 'Salvar Alterações'}
              </button>
              <button type="button" onClick={() => setEditingLink(null)} className="px-8 py-5 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold uppercase transition-colors">
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