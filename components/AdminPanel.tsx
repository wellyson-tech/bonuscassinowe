
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
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .order('position', { ascending: true });
    
    if (error) {
      console.error('Erro ao buscar links:', error.message);
      if (error.message.includes('links')) {
        setErrorStatus('TABLE_MISSING');
      }
    } else {
      setErrorStatus(null);
      if (data) setLinks(data);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;

    setLoading(true);
    
    try {
      let error;
      if (editingLink.id) {
        const result = await supabase
          .from('links')
          .update({
            title: editingLink.title,
            description: editingLink.description,
            url: editingLink.url,
            type: editingLink.type,
            icon: editingLink.icon,
            badge: editingLink.badge,
            is_highlighted: editingLink.is_highlighted
          })
          .eq('id', editingLink.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('links')
          .insert([{ 
            title: editingLink.title,
            description: editingLink.description,
            url: editingLink.url,
            type: editingLink.type || 'glass',
            icon: editingLink.icon || 'chip',
            badge: editingLink.badge,
            is_highlighted: editingLink.is_highlighted || false,
            position: links.length 
          }]);
        error = result.error;
      }

      if (error) throw error;

      setEditingLink(null);
      await fetchLinks();
      alert('✅ Link salvo com sucesso!');
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      if (err.message?.includes('public.links')) {
        alert('❌ ERRO CRÍTICO: A tabela "links" não existe no seu Supabase. Siga as instruções na tela principal.');
        setErrorStatus('TABLE_MISSING');
      } else {
        alert('❌ Erro ao salvar: ' + (err.message || 'Erro desconhecido.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este link?')) {
      const { error } = await supabase.from('links').delete().eq('id', id);
      if (error) alert('Erro ao excluir: ' + error.message);
      fetchLinks();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-[#050505] min-h-screen text-white">
      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold gold-gradient bg-clip-text text-transparent">GERENCIAR LINKS</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Painel de Controle Royal</p>
        </div>
        <button onClick={handleLogout} className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 rounded-lg text-xs font-bold transition-all">
          SAIR DO PAINEL
        </button>
      </div>

      {errorStatus === 'TABLE_MISSING' && (
        <div className="mb-8 p-6 bg-red-900/20 border-2 border-red-500/50 rounded-2xl animate-pulse">
          <h3 className="text-red-500 font-bold mb-2 flex items-center gap-2">
            ⚠️ TABELA NÃO ENCONTRADA
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            A tabela <strong>links</strong> ainda não foi criada no seu banco de dados. 
            Você precisa rodar o script SQL no painel do Supabase.
          </p>
          <div className="bg-black/40 p-3 rounded-lg border border-white/10 mb-4">
            <code className="text-[10px] text-gray-400 block break-all">
              Vá em SQL Editor > New Query > Cole o código do SQL e aperte RUN.
            </code>
          </div>
          <button 
            onClick={() => window.open('https://supabase.com/dashboard/project/ufqhxtfsoxzrofjpvhpk/sql/new', '_blank')}
            className="text-xs bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
          >
            ABRIR SQL EDITOR DO SUPABASE
          </button>
        </div>
      )}

      <button 
        onClick={() => setEditingLink({ title: '', url: '', description: '', type: 'glass', icon: 'chip', is_highlighted: false, badge: '' })}
        className="mb-8 w-full py-4 gold-gradient text-black font-extrabold rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
      >
        + ADICIONAR NOVO LINK DE OFERTA
      </button>

      <div className="grid gap-4">
        {links.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl">
            <p className="text-gray-600">Nenhum link cadastrado ainda.</p>
          </div>
        ) : (
          links.map(link => (
            <div key={link.id} className="glass-card p-4 rounded-xl flex items-center justify-between group hover:border-yellow-500/30 transition-all">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${link.type === 'gold' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/5'}`}>
                  {Icons[link.icon]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm uppercase tracking-wide">{link.title}</h4>
                    {link.badge && <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">{link.badge}</span>}
                  </div>
                  <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{link.url}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditingLink(link)} className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors" title="Editar">✏️</button>
                <button onClick={() => handleDelete(link.id!)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors" title="Excluir">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingLink && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <form onSubmit={handleSave} className="bg-neutral-900 border border-white/10 p-8 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-xl font-bold gold-gradient bg-clip-text text-transparent uppercase tracking-tight">
                {editingLink.id ? 'Editar Link' : 'Novo Link'}
              </h3>
            </div>
            
            <div className="space-y-3">
              <input 
                placeholder="Título da Oferta" 
                className="w-full p-4 rounded-xl text-sm" 
                value={editingLink.title} 
                onChange={e => setEditingLink({...editingLink, title: e.target.value})} 
                required
              />
              <input 
                placeholder="Link (https://...)" 
                className="w-full p-4 rounded-xl text-sm" 
                value={editingLink.url} 
                onChange={e => setEditingLink({...editingLink, url: e.target.value})} 
                required
              />
              <input 
                placeholder="Descrição" 
                className="w-full p-4 rounded-xl text-sm" 
                value={editingLink.description} 
                onChange={e => setEditingLink({...editingLink, description: e.target.value})} 
              />
              <input 
                placeholder="Badge (Ex: BÔNUS 200%)" 
                className="w-full p-4 rounded-xl text-sm" 
                value={editingLink.badge} 
                onChange={e => setEditingLink({...editingLink, badge: e.target.value})} 
              />
              
              <div className="grid grid-cols-2 gap-4">
                <select 
                  className="w-full p-4 rounded-xl text-sm" 
                  value={editingLink.type} 
                  onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}
                >
                  <option value="gold">Dourado</option>
                  <option value="neon-purple">Roxo</option>
                  <option value="neon-green">Verde</option>
                  <option value="glass">Simples</option>
                </select>
                <select 
                  className="w-full p-4 rounded-xl text-sm" 
                  value={editingLink.icon} 
                  onChange={e => setEditingLink({...editingLink, icon: e.target.value as any})}
                >
                  {Object.keys(Icons).map(i => <option key={i} value={i}>{i.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={loading} className="flex-1 py-4 gold-gradient text-black font-bold rounded-xl shadow-lg">
                {loading ? 'SALVANDO...' : 'SALVAR'}
              </button>
              <button type="button" onClick={() => setEditingLink(null)} className="px-6 py-4 bg-white/5 rounded-xl">
                FECHAR
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
