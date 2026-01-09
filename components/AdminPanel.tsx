
import React, { useState, useEffect, useMemo } from 'react';
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
  const [pagesOrder, setPagesOrder] = useState<string[]>([]);

  useEffect(() => {
    const initAdmin = async () => {
      setLoading(true);
      await fetchBrand();
      await fetchLinks();
      await fetchSocials();
      setLoading(false);
    };
    initAdmin();
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
        
        if (data.footer_text && data.footer_text.includes('ORDER:')) {
            try {
                const orderPart = data.footer_text.split('ORDER:')[1];
                const parsed = JSON.parse(orderPart);
                if (Array.isArray(parsed)) setPagesOrder(parsed);
            } catch(e) {}
        }
      }
    } catch (e) {}
  };

  const fetchLinks = async (targetPageToSet?: string) => {
    try {
      const { data } = await supabase.from('links').select('*').order('position', { ascending: true });
      if (data) {
        setLinks(data);
        
        const foundCategories = Array.from(new Set(data.map(l => ((l.category as string) || 'Página 1').trim())));

        if (targetPageToSet) {
          setActiveAdminPage(targetPageToSet);
        } else if (!activeAdminPage) {
          // Busca a primeira da ordem salva que realmente tenha links
          const firstValid = pagesOrder.find(p => foundCategories.includes(p)) || foundCategories[0] || 'Página 1';
          setActiveAdminPage(firstValid);
        }
      }
    } catch (e) {}
  };

  const fetchSocials = async () => {
    const { data } = await supabase.from('social_links').select('*').order('position', { ascending: true });
    if (data) setSocials(data);
  };

  const moveCategory = async (categoryName: string, direction: 'left' | 'right') => {
    const currentOrder = [...sortedCategories];
    const idx = currentOrder.indexOf(categoryName.trim());
    if (idx === -1) return;

    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentOrder.length) return;

    const newOrder = [...currentOrder];
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
    
    setPagesOrder(newOrder);

    try {
        const { data: brandData } = await supabase.from('brand_settings').select('footer_text').eq('id', 1).single();
        const baseText = brandData?.footer_text?.split('ORDER:')[0] || '';
        await supabase.from('brand_settings').update({ 
            footer_text: `${baseText}ORDER:${JSON.stringify(newOrder)}` 
        }).eq('id', 1);
    } catch(e) {}
  };

  const moveLink = async (id: string, direction: 'up' | 'down') => {
    const pageLinks = links
      .filter(l => (l.category || 'Página 1').trim() === activeAdminPage.trim())
      .sort((a, b) => a.position - b.position);

    const currentIdx = pageLinks.findIndex(l => l.id === id);
    if (currentIdx === -1) return;

    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= pageLinks.length) return;

    const currentLink = pageLinks[currentIdx];
    const targetLink = pageLinks[targetIdx];

    await supabase.from('links').upsert([
      { id: currentLink.id, position: targetLink.position },
      { id: targetLink.id, position: currentLink.position }
    ]);

    fetchLinks();
  };

  const handleDelete = async (table: 'links' | 'social_links', id: string) => {
    if (!confirm("Excluir permanentemente?")) return;
    setLoading(true);
    try {
      await supabase.from(table).delete().eq('id', id);
      await fetchLinks();
    } catch (err) {
      alert("Erro ao excluir");
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
        description: editingLink.description || 'SAQUE MÍNIMO COM BÔNUS',
        url: editingLink.url,
        type: editingLink.type || 'glass',
        icon: editingLink.icon || 'auto',
        badge: editingLink.badge || '',
        category: targetCategory,
        position: editingLink.id ? editingLink.position : links.length + 1,
        is_highlighted: editingLink.is_highlighted ?? false
      };

      if (editingLink.id) {
        await supabase.from('links').update(payload).eq('id', editingLink.id);
      } else {
        await supabase.from('links').insert([payload]);
      }
      
      setEditingLink(null);
      await fetchLinks(targetCategory);
    } catch (err) {
      alert("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const sortedCategories = useMemo(() => {
    const foundCats = Array.from(new Set(links.map(l => (l.category || 'Página 1').trim())));
    if (foundCats.length === 0) return ['Página 1'];

    const existingOrder = pagesOrder.filter(c => foundCats.includes(c));
    foundCats.forEach(c => {
        if (!existingOrder.includes(c)) existingOrder.push(c);
    });
    
    return existingOrder;
  }, [links, pagesOrder]);

  const filteredLinks = useMemo(() => {
    return links
      .filter(l => (l.category || 'Página 1').trim() === activeAdminPage.trim())
      .sort((a, b) => a.position - b.position);
  }, [links, activeAdminPage]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-10 bg-[#050505] min-h-screen text-white pb-32 font-sans">
      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-2xl font-black text-shimmer uppercase italic tracking-tighter">CENTRAL DE CONTROLE</h2>
          <p className="text-[9px] text-gray-500 uppercase font-black mt-1">Gestão de Plataformas • {activeAdminPage}</p>
        </div>
        <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} className="px-6 py-2 bg-white/5 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Sair</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-12">
        {(['links', 'social', 'brand'] as const).map(menu => (
          <button key={menu} onClick={() => setActiveMenu(menu)} className={`py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest border transition-all ${activeMenu === menu ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}`}>
            {menu === 'links' ? '🎰 Plataformas' : menu === 'social' ? '📱 Redes' : '🎨 Identidade'}
          </button>
        ))}
      </div>

      {activeMenu === 'links' && (
        <div className="animate-fade-in space-y-8">
          <div className="flex flex-wrap gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-[2.2rem] items-center">
            {sortedCategories.map((cat, idx) => (
              <div key={cat} className="flex items-center bg-black/40 rounded-full border border-white/5 overflow-hidden shadow-lg">
                <button onClick={() => setActiveAdminPage(cat)} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminPage.trim() === cat.trim() ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>
                  {cat}
                </button>
                <div className="flex border-l border-white/5 bg-black/60">
                  <button disabled={idx === 0} onClick={() => moveCategory(cat, 'left')} className="px-3 py-3 text-xs hover:text-yellow-500 disabled:opacity-20 transition-colors">←</button>
                  <button disabled={idx === sortedCategories.length - 1} onClick={() => moveCategory(cat, 'right')} className="px-3 py-3 text-xs hover:text-yellow-500 disabled:opacity-20 transition-colors">→</button>
                </div>
              </div>
            ))}
            <button onClick={() => { const n = prompt("Nome da nova página:"); if(n) setActiveAdminPage(n.trim()); }} className="px-4 py-3 text-yellow-500 text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500/10 rounded-full">+ Nova Categoria</button>
          </div>

          <button onClick={() => setEditingLink({ category: activeAdminPage.trim(), type: 'glass', icon: 'auto', is_highlighted: false })} className="w-full py-6 bg-yellow-500 text-black font-black rounded-[2.5rem] uppercase text-xs shadow-2xl hover:scale-[1.01] transition-all">
            + Adicionar em "{activeAdminPage}"
          </button>

          <div className="space-y-4">
            {filteredLinks.map((link, idx) => (
              <div key={link.id} className="bg-[#0f0f0f] p-5 rounded-[2rem] flex items-center justify-between border border-white/5 group">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveLink(link.id!, 'up')} disabled={idx === 0} className="w-6 h-6 bg-white/5 rounded flex items-center justify-center text-[10px] hover:bg-yellow-500 hover:text-black disabled:opacity-10">▲</button>
                    <button onClick={() => moveLink(link.id!, 'down')} disabled={idx === filteredLinks.length - 1} className="w-6 h-6 bg-white/5 rounded flex items-center justify-center text-[10px] hover:bg-yellow-500 hover:text-black disabled:opacity-10">▼</button>
                  </div>
                  <div className={`w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10 ${link.type === 'gold' ? 'text-yellow-500' : 'text-white'}`}>
                    {Icons[link.icon || 'slots'] || Icons.slots}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase flex items-center gap-2">
                      {link.title}
                      {link.badge && <span className="text-[7px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-md font-black">{link.badge}</span>}
                    </h4>
                    <p className="text-[9px] text-gray-500 uppercase font-black">
                      {link.click_count || 0} Cliques • Posição: {idx + 1}
                    </p>
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
          <form onSubmit={handleSaveLink} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] w-full max-w-xl my-auto space-y-5 shadow-2xl">
            <h3 className="text-xl font-black uppercase text-shimmer mb-4 italic">Configurar Link</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Título do Botão</label>
                <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white focus:border-yellow-500 outline-none" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} placeholder="Ex: Cadastro com Bônus" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Página (Categoria)</label>
                <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white focus:border-yellow-500 outline-none" value={editingLink.category || ''} onChange={e => setEditingLink({...editingLink, category: e.target.value})} placeholder="Página 1" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Descrição Curta</label>
              <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white focus:border-yellow-500 outline-none" value={editingLink.description || ''} onChange={e => setEditingLink({...editingLink, description: e.target.value})} placeholder="SAQUE MÍNIMO COM BÔNUS" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[8px] uppercase font-black text-gray-500 ml-1">URL de Destino</label>
              <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white focus:border-yellow-500 outline-none font-mono" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} placeholder="https://..." required />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Tipo de Estilo</label>
                <select className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none" value={editingLink.type || 'glass'} onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}>
                  <option value="glass">Glass (Padrão)</option>
                  <option value="gold">Gold (Premium)</option>
                  <option value="neon-purple">Neon Purple</option>
                  <option value="neon-green">Neon Green</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Ícone</label>
                <select className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none" value={editingLink.icon || 'auto'} onChange={e => setEditingLink({...editingLink, icon: e.target.value})}>
                  <option value="auto">Auto (Favicon)</option>
                  {Object.keys(Icons).map(key => <option key={key} value={key}>{key}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Badge (Texto Curto)</label>
                <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none" value={editingLink.badge || ''} onChange={e => setEditingLink({...editingLink, badge: e.target.value.toUpperCase()})} placeholder="TOP" />
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl">
              <input type="checkbox" id="highlight" checked={editingLink.is_highlighted || false} onChange={e => setEditingLink({...editingLink, is_highlighted: e.target.checked})} className="w-4 h-4 accent-yellow-500" />
              <label htmlFor="highlight" className="text-[10px] font-black uppercase text-gray-300">Destacar este link (Animação Extra)</label>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/5">
              <button type="button" onClick={() => setEditingLink(null)} className="flex-1 py-4 bg-white/5 rounded-2xl uppercase font-black text-[10px] hover:bg-white/10 transition-all">Cancelar</button>
              <button type="submit" className="flex-[2] py-4 bg-yellow-500 text-black rounded-2xl uppercase font-black text-[10px] shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-95 transition-all">Salvar Link</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
