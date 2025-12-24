
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CasinoLink } from '../types';
import { Icons } from '../constants';

const AdminPanel: React.FC = () => {
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [editingLink, setEditingLink] = useState<Partial<CasinoLink> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .order('position', { ascending: true });
    if (data) setLinks(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (editingLink?.id) {
      const { error } = await supabase
        .from('links')
        .update(editingLink)
        .eq('id', editingLink.id);
    } else {
      const { error } = await supabase
        .from('links')
        .insert([{ ...editingLink, position: links.length }]);
    }

    setEditingLink(null);
    fetchLinks();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza?')) {
      await supabase.from('links').delete().eq('id', id);
      fetchLinks();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-neutral-900 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold gold-gradient bg-clip-text text-transparent">GERENCIAR LINKS</h2>
        <button onClick={handleLogout} className="px-4 py-2 bg-red-600 rounded text-sm font-bold">SAIR</button>
      </div>

      <button 
        onClick={() => setEditingLink({ title: '', url: '', description: '', type: 'glass', icon: 'chip', is_highlighted: false })}
        className="mb-6 w-full py-3 gold-gradient text-black font-bold rounded-xl"
      >
        + NOVO LINK
      </button>

      <div className="grid gap-4">
        {links.map(link => (
          <div key={link.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/5 rounded-lg">{Icons[link.icon]}</div>
              <div>
                <h4 className="font-bold">{link.title}</h4>
                <p className="text-xs text-gray-500">{link.url}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingLink(link)} className="p-2 hover:text-yellow-500">✏️</button>
              <button onClick={() => handleDelete(link.id!)} className="p-2 hover:text-red-500">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {editingLink && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100]">
          <form onSubmit={handleSave} className="bg-neutral-900 border border-white/10 p-6 rounded-2xl w-full max-w-lg space-y-4">
            <h3 className="text-xl font-bold">{editingLink.id ? 'Editar Link' : 'Novo Link'}</h3>
            <input 
              placeholder="Título" 
              className="w-full p-3 rounded" 
              value={editingLink.title} 
              onChange={e => setEditingLink({...editingLink, title: e.target.value})} 
              required
            />
            <input 
              placeholder="URL" 
              className="w-full p-3 rounded" 
              value={editingLink.url} 
              onChange={e => setEditingLink({...editingLink, url: e.target.value})} 
              required
            />
            <textarea 
              placeholder="Descrição" 
              className="w-full p-3 rounded h-20" 
              value={editingLink.description} 
              onChange={e => setEditingLink({...editingLink, description: e.target.value})} 
            />
            <div className="grid grid-cols-2 gap-4">
              <select 
                className="p-3 rounded" 
                value={editingLink.type} 
                onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}
              >
                <option value="gold">Dourado</option>
                <option value="neon-purple">Roxo Neon</option>
                <option value="neon-green">Verde Neon</option>
                <option value="glass">Transparente</option>
              </select>
              <select 
                className="p-3 rounded" 
                value={editingLink.icon} 
                onChange={e => setEditingLink({...editingLink, icon: e.target.value as any})}
              >
                {Object.keys(Icons).map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="flex gap-4 pt-4">
              <button type="submit" disabled={loading} className="flex-1 py-3 gold-gradient text-black font-bold rounded">
                {loading ? 'SALVANDO...' : 'SALVAR'}
              </button>
              <button type="button" onClick={() => setEditingLink(null)} className="px-6 py-3 bg-white/5 rounded">CANCELAR</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
