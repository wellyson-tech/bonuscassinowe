
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CasinoLink, CasinoBrand, SocialLink } from '../types';
import { Icons, BRAND as DEFAULT_BRAND, ADMIN_UID } from '../constants';

const AdminPanel: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<'links' | 'social' | 'brand'>('links');
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [brand, setBrand] = useState<CasinoBrand>(DEFAULT_BRAND);
  
  const [editingLink, setEditingLink] = useState<Partial<CasinoLink> | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeAdminPage, setActiveAdminPage] = useState<string>('');

  useEffect(() => {
    fetchLinks();
    fetchBrand();
    fetchSocials();
  }, []);

  const fetchBrand = async () => {
    try {
      const { data } = await supabase.from('brand_settings').select('*').eq('id', 1).single();
      if (data) {
        setBrand({
          name: data.name,
          tagline: data.tagline,
          logoUrl: data.logo_url,
          backgroundUrl: data.background_url,
          verified: data.verified,
          footerText: data.footer_text,
          effect: data.effect || 'scanner'
        });
      }
    } catch (e) {}
  };

  const fetchSocials = async () => {
    const { data } = await supabase.from('social_links').select('*').order('position', { ascending: true });
    if (data) setSocials(data);
  };

  const fetchLinks = async (targetPageToSet?: string) => {
    try {
      const { data } = await supabase.from('links').select('*').order('position', { ascending: true });
      if (data) {
        setLinks(data);
        const uniqueCats = Array.from(new Set(data.map(l => ((l.category as string) || 'Página 1').trim())));
        
        if (targetPageToSet) {
          setActiveAdminPage(targetPageToSet.trim());
        } else if (uniqueCats.length > 0 && !activeAdminPage) {
          setActiveAdminPage(uniqueCats[0] as string);
        } else if (!activeAdminPage) {
          setActiveAdminPage('Página 1');
        }
      }
    } catch (e) {}
  };

  const handleDelete = async (table: 'links' | 'social_links', id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      await fetchLinks();
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const moveLink = async (id: string, direction: 'up' | 'down') => {
    const currentAdminPageTrimmed = activeAdminPage.trim();
    const pageLinks = links
      .filter(l => (l.category || 'Página 1').trim() === currentAdminPageTrimmed)
      .sort((a, b) => a.position - b.position);

    const currentIdx = pageLinks.findIndex(l => l.id === id);
    if (currentIdx === -1) return;

    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= pageLinks.length) return;

    const currentLink = pageLinks[currentIdx];
    const targetLink = pageLinks[targetIdx];

    const { error } = await supabase.from('links').upsert([
      { id: currentLink.id, position: targetLink.position },
      { id: targetLink.id, position: currentLink.position }
    ]);

    if (!error) fetchLinks();
  };

  // LÓGICA CORRIGIDA: Move a categoria e leva TODOS os links junto
  const moveCategory = async (categoryName: string, direction: 'left' | 'right') => {
    if (loading) return;
    const categoriesOrder = Array.from(new Set(links.map(l => ((l.category as string) || 'Página 1').trim())));
    const currentIdx = categoriesOrder.indexOf(categoryName.trim());
    
    if (currentIdx === -1) return;
    const targetIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= categoriesOrder.length) return;

    const targetCategoryName = categoriesOrder[targetIdx].trim();
    const currentCategoryName = categoryName.trim();
    
    // Pegamos todos os links de ambas as categorias para trocar os nomes
    const linksFromCurrent = links.filter(l => (l.category || 'Página 1').trim() === currentCategoryName);
    const linksFromTarget = links.filter(l => (l.category || 'Página 1').trim() === targetCategoryName);

    // Temporário para evitar conflito se necessário, mas o Upsert resolve
    const tempName = `TEMP_${Date.now()}`;

    setLoading(true);
    try {
      // 1. Move links da categoria atual para um nome temporário
      const step1 = linksFromCurrent.map(l => ({ id: l.id, category: tempName }));
      await supabase.from('links').upsert(step1);

      // 2. Move links da categoria alvo para a categoria atual
      const step2 = linksFromTarget.map(l => ({ id: l.id, category: currentCategoryName }));
      await supabase.from('links').upsert(step2);

      // 3. Move links do temporário para a categoria alvo
      const step3 = linksFromCurrent.map(l => ({ id: l.id, category: targetCategoryName }));
      await supabase.from('links').upsert(step3);

      // Atualiza a página ativa para a nova posição se for a que o admin está vendo
      const newActive = activeAdminPage.trim() === currentCategoryName ? targetCategoryName : activeAdminPage;
      await fetchLinks(newActive);
    } catch (err) {
      console.error(err);
      alert("Erro ao reorganizar páginas");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;
    setLoading(true);
    
    try {
      const targetCategory = (editingLink.category || activeAdminPage || 'Página 1').trim();
      const payload = {
        title: editingLink.title,
        description: editingLink.description,
        url: editingLink.url,
        type: editingLink.type,
        icon: editingLink.icon,
        badge: editingLink.badge,
        category: targetCategory,
        position: editingLink.position || links.length + 1,
        is_highlighted: editingLink.is_highlighted ?? false
      };

      if (editingLink.id) {
        await supabase.from('links').update(payload).eq('id', editingLink.id);
      } else {
        await supabase.from('links').insert([payload]);
      }
      
      setEditingLink(null);
      await fetchLinks();
    } catch (err: any) {
      alert("Erro ao salvar link");
    } finally {
      setLoading(false);
    }
  };

  const uniqueCategories = useMemo(() => Array.from(new Set(links.map(l => (l.category || 'Página 1').trim()))), [links]);
  const filteredLinks = useMemo(() => {
    return links
      .filter(l => (l.category || 'Página 1').trim() === activeAdminPage.trim())
      .sort((a, b) => a.position - b.position);
  }, [links, activeAdminPage]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-10 bg-[#050505] min-h-screen text-white pb-32 font-sans">
      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
        <h2 className="text-2xl font-black text-shimmer uppercase italic tracking-tighter">CENTRAL DE CONTROLE</h2>
        <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} className="px-6 py-2 bg-white/5 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase">Sair</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-12">
        <button onClick={() => setActiveMenu('links')} className={`py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest border transition-all ${activeMenu === 'links' ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg' : 'bg-white/5 text-gray-400 border-white/5'}`}>Plataformas</button>
        <button onClick={() => setActiveMenu('social')} className={`py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest border transition-all ${activeMenu === 'social' ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg' : 'bg-white/5 text-gray-400 border-white/5'}`}>Redes Sociais</button>
        <button onClick={() => setActiveMenu('brand')} className={`py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest border transition-all ${activeMenu === 'brand' ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg' : 'bg-white/5 text-gray-400 border-white/5'}`}>Identidade</button>
      </div>

      {activeMenu === 'links' && (
        <div className="animate-fade-in space-y-8">
          <div className="flex flex-wrap gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-[2.2rem] items-center">
            {uniqueCategories.map((cat, idx) => (
              <div key={cat as string} className="flex items-center bg-black/40 rounded-full border border-white/5 overflow-hidden shadow-lg">
                <button 
                  onClick={() => setActiveAdminPage(cat as string)} 
                  className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminPage.trim() === (cat as string).trim() ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                >
                  {cat as string}
                </button>
                <div className="flex border-l border-white/5 bg-black/60">
                  <button disabled={idx === 0 || loading} onClick={() => moveCategory(cat as string, 'left')} className="px-3 py-3 text-xs hover:text-yellow-500 disabled:opacity-20 transition-colors">←</button>
                  <button disabled={idx === uniqueCategories.length - 1 || loading} onClick={() => moveCategory(cat as string, 'right')} className="px-3 py-3 text-xs hover:text-yellow-500 disabled:opacity-20 transition-colors">→</button>
                </div>
              </div>
            ))}
            <button onClick={() => { const n = prompt("Nome da nova página:"); if(n) setActiveAdminPage(n.trim()); }} className="px-4 py-3 text-yellow-500 text-[10px] font-black uppercase tracking-widest">+ Nova Página</button>
          </div>

          <button onClick={() => setEditingLink({ category: activeAdminPage.trim(), type: 'glass', icon: 'auto' })} className="w-full py-6 bg-yellow-500 text-black font-black rounded-[2.5rem] uppercase text-xs shadow-2xl">+ Adicionar em "{activeAdminPage}"</button>

          <div className="space-y-4">
            {filteredLinks.map((link, idx) => (
              <div key={link.id} className="bg-[#0f0f0f] p-5 rounded-[2rem] flex items-center justify-between border border-white/5 group">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveLink(link.id!, 'up')} disabled={idx === 0} className="w-6 h-6 bg-white/5 rounded flex items-center justify-center text-[10px] hover:bg-yellow-500 hover:text-black disabled:opacity-10">▲</button>
                    <button onClick={() => moveLink(link.id!, 'down')} disabled={idx === filteredLinks.length - 1} className="w-6 h-6 bg-white/5 rounded flex items-center justify-center text-[10px] hover:bg-yellow-500 hover:text-black disabled:opacity-10">▼</button>
                  </div>
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10 text-yellow-500">
                    {Icons[link.icon || 'slots'] || Icons.slots}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase">{link.title}</h4>
                    <p className="text-[9px] text-gray-500 uppercase font-black">{link.click_count || 0} Cliques • Posição: {idx + 1}º</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingLink(link)} className="w-10 h-10 bg-white/5 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">⚙️</button>
                  <button onClick={() => handleDelete('links', link.id!)} className="w-10 h-10 bg-red-600/10 text-red-500 flex items-center justify-center rounded-lg hover:bg-red-600 hover:text-white transition-colors">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingLink && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <form onSubmit={handleSaveLink} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] w-full max-w-xl my-auto space-y-6 shadow-2xl">
            <h3 className="text-xl font-black uppercase text-shimmer">Configurar Plataforma</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Nome da Plataforma</label>
                <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} placeholder="Ex: Stake" required />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Página de Destino</label>
                <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10" value={editingLink.category || ''} onChange={e => setEditingLink({...editingLink, category: e.target.value})} placeholder="Ex: Página 1" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Descrição Curta</label>
              <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10" value={editingLink.description || ''} onChange={e => setEditingLink({...editingLink, description: e.target.value})} placeholder="Ex: Pagando muito agora" />
            </div>
            <div className="space-y-2">
              <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Link de Afiliado (URL)</label>
              <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} placeholder="https://..." required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Estilo do Card</label>
                <select className="w-full p-4 bg-black border border-white/10 rounded-xl text-[10px] uppercase font-black" value={editingLink.type} onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}>
                  <option value="gold">Dourado VIP</option>
                  <option value="neon-purple">Neon Roxo</option>
                  <option value="neon-green">Neon Verde</option>
                  <option value="glass">Vidro Fosco</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Ícone</label>
                <select className="w-full p-4 bg-black border border-white/10 rounded-xl text-[10px] uppercase font-black" value={editingLink.icon} onChange={e => setEditingLink({...editingLink, icon: e.target.value})}>
                  <option value="auto">🌐 Automático</option>
                  <option value="slots">🎰 Slots</option>
                  <option value="rocket">🚀 Crash</option>
                  <option value="fire">🔥 Fogo</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setEditingLink(null)} className="flex-1 py-4 bg-white/5 rounded-2xl uppercase font-black text-[10px]">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-[2] py-4 bg-yellow-500 text-black rounded-2xl uppercase font-black text-[10px] shadow-lg">
                {loading ? 'Salvando...' : 'Confirmar e Publicar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
