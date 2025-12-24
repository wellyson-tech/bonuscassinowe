
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
        if (error.message.includes('links') || error.code === '42P01') {
          setErrorStatus('TABLE_MISSING');
        }
        throw error;
      }
      setErrorStatus(null);
      setLinks(data || []);
    } catch (err) {
      console.error('Erro ao buscar links:', err);
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
      alert('✅ Salvo com sucesso!');
    } catch (err: any) {
      alert('❌ Erro: ' + (err.message || 'Verifique sua conexão e a tabela no Supabase.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir este link?')) {
      const { error } = await supabase.from('links').delete().eq('id', id);
      if (error) alert('Erro: ' + error.message);
      fetchLinks();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-[#050505] min-h-screen text-white pb-24">
      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold gold-gradient bg-clip-text text-transparent">ADMINISTRAÇÃO</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Controle de Plataformas</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 rounded-lg text-[10px] font-bold transition-all">
          SAIR
        </button>
      </div>

      {errorStatus === 'TABLE_MISSING' && (
        <div className="mb-8 p-6 bg-red-950/40 border border-red-500/50 rounded-2xl">
          <h3 className="text-red-500 font-bold mb-2">ERRO NO BANCO DE DADOS</h3>
          <p className="text-xs text-gray-300 mb-4 leading-relaxed">
            A tabela <b>links</b> não foi encontrada. Você precisa criá-la no SQL Editor do Supabase para o site funcionar.
          </p>
          <button 
            onClick={() => window.open('https://supabase.com/dashboard/project/ufqhxtfsoxzrofjpvhpk/sql/new', '_blank')}
            className="text-[10px] bg-red-600 text-white px-4 py-2 rounded-lg font-black uppercase"
          >
            Abrir SQL Editor Agora
          </button>
        </div>
      )}

      <button 
        onClick={() => setEditingLink({ title: '', url: '', description: '', type: 'glass', icon: 'chip', is_highlighted: false, badge: '' })}
        className="mb-8 w-full py-5 gold-gradient text-black font-black rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:scale-[1.01] transition-all uppercase tracking-tighter"
      >
        + Criar Nova Oferta
      </button>

      <div className="grid gap-3">
        {links.map(link => (
          <div key={link.id} className="glass-card p-4 rounded-xl flex items-center justify-between border border-white/5 hover:border-yellow-500/20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-yellow-500">
                {Icons[link.icon]}
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase">{link.title}</h4>
                <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{link.url}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingLink(link)} className="p-2 bg-white/5 rounded-lg text-xs">✏️</button>
              <button onClick={() => handleDelete(link.id!)} className="p-2 bg-red-500/10 text-red-500 rounded-lg text-xs">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {editingLink && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <form onSubmit={handleSave} className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold gold-gradient bg-clip-text text-transparent uppercase">Configurar Link</h3>
            
            <div className="space-y-3">
              <input 
                placeholder="Nome da Plataforma" 
                className="w-full p-4 rounded-xl text-sm" 
                value={editingLink.title || ''} 
                onChange={e => setEditingLink({...editingLink, title: e.target.value})} 
                required
              />
              <input 
                placeholder="Seu Link de Afiliado (https://...)" 
                className="w-full p-4 rounded-xl text-sm" 
                value={editingLink.url || ''} 
                onChange={e => setEditingLink({...editingLink, url: e.target.value})} 
                required
              />
              <input 
                placeholder="Descrição (Ex: Pagamento Imediato)" 
                className="w-full p-4 rounded-xl text-sm" 
                value={editingLink.description || ''} 
                onChange={e => setEditingLink({...editingLink, description: e.target.value})} 
              />
              <input 
                placeholder="Texto do Badge (Ex: POPULAR)" 
                className="w-full p-4 rounded-xl text-sm" 
                value={editingLink.badge || ''} 
                onChange={e => setEditingLink({...editingLink, badge: e.target.value})} 
              />
              
              <div className="grid grid-cols-2 gap-3">
                <select 
                  className="w-full p-4 rounded-xl text-xs bg-neutral-900 border border-white/10" 
                  value={editingLink.type || 'glass'} 
                  onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}
                >
                  <option value="gold">Dourado</option>
                  <option value="neon-purple">Roxo</option>
                  <option value="neon-green">Verde</option>
                  <option value="glass">Simples</option>
                </select>
                <select 
                  className="w-full p-4 rounded-xl text-xs bg-neutral-900 border border-white/10" 
                  value={editingLink.icon || 'chip'} 
                  onChange={e => setEditingLink({...editingLink, icon: e.target.value as any})}
                >
                  {Object.keys(Icons).map(i => <option key={i} value={i}>{i.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" disabled={loading} className="flex-1 py-4 gold-gradient text-black font-black rounded-xl">
                {loading ? 'SALVANDO...' : 'CONFIRMAR'}
              </button>
              <button type="button" onClick={() => setEditingLink(null)} className="px-6 py-4 bg-white/5 rounded-xl text-xs">
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
