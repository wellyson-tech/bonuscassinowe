
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
        // Extrai categorias únicas mantendo a ordem estável baseada na posição do link
        const cats: string[] = [];
        data.forEach(l => {
          const name = ((l.category as string) || 'Página 1').trim();
          if (!cats.includes(name)) cats.push(name);
        });
        
        if (targetPageToSet) {
          setActiveAdminPage(targetPageToSet.trim());
        } else if (cats.length > 0 && !activeAdminPage) {
          setActiveAdminPage(cats[0]);
        } else if (!activeAdminPage) {
          setActiveAdminPage('Página 1');
        }
      }
    } catch (e) {}
  };

  const moveCategory = async (categoryName: string, direction: 'left' | 'right') => {
    if (loading) return;
    
    // 1. Mapeia a ordem atual
    const cats: string[] = [];
    links.forEach(l => {
      const name = ((l.category as string) || 'Página 1').trim();
      if (!cats.includes(name)) cats.push(name);
    });

    const currentIdx = cats.indexOf(categoryName.trim());
    if (currentIdx === -1) return;
    
    const targetIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= cats.length) return;

    const currentCatName = cats[currentIdx];
    const targetCatName = cats[targetIdx];
    
    // Nome temporário para evitar colisão durante o swap no Supabase
    const tempName = `SWAP_TEMP_${Date.now()}`;

    setLoading(true);
    try {
      // PROCESSO DE TROCA ATÔMICA (Simulada)
      // Passo A: Move todos da Categoria 1 para Temporário
      const { error: errA } = await supabase.from('links').update({ category: tempName }).eq('category', currentCatName);
      if (errA) throw errA;

      // Passo B: Move todos da Categoria 2 para o nome da Categoria 1
      const { error: errB } = await supabase.from('links').update({ category: currentCatName }).eq('category', targetCatName);
      if (errB) throw errB;

      // Passo C: Move todos do Temporário para o nome da Categoria 2
      const { error: errC } = await supabase.from('links').update({ category: targetCatName }).eq('category', tempName);
      if (errC) throw errC;

      // Determina qual página deve ficar ativa após o swap
      const nextActive = activeAdminPage === currentCatName ? targetCatName : (activeAdminPage === targetCatName ? currentCatName : activeAdminPage);
      
      await fetchLinks(nextActive);
    } catch (err) {
      console.error("Erro no swap de categorias:", err);
      alert("Erro ao reorganizar páginas. Verifique sua conexão.");
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

  const uniqueCategories = useMemo(() => {
    const cats: string[] = [];
    links.forEach(l => {
      const name = (l.category || 'Página 1').trim();
      if (!cats.includes(name)) cats.push(name);
    });
    return cats;
  }, [links]);

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
          <p className="text-[9px] text-gray-500 uppercase font-black mt-1">Gerenciamento Seguro de Plataformas</p>
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
            {uniqueCategories.map((cat, idx) => (
              <div key={cat} className="flex items-center bg-black/40 rounded-full border border-white/5 overflow-hidden shadow-lg">
                <button onClick={() => setActiveAdminPage(cat)} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminPage.trim() === cat.trim() ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>
                  {cat}
                </button>
                <div className="flex border-l border-white/5 bg-black/60">
                  <button disabled={idx === 0 || loading} onClick={() => moveCategory(cat, 'left')} className="px-3 py-3 text-xs hover:text-yellow-500 disabled:opacity-20 transition-colors">←</button>
                  <button disabled={idx === uniqueCategories.length - 1 || loading} onClick={() => moveCategory(cat, 'right')} className="px-3 py-3 text-xs hover:text-yellow-500 disabled:opacity-20 transition-colors">→</button>
                </div>
              </div>
            ))}
            <button onClick={() => { const n = prompt("Nome da nova página:"); if(n) setActiveAdminPage(n.trim()); }} className="px-4 py-3 text-yellow-500 text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500/10 rounded-full">+ Nova Página</button>
          </div>

          <button onClick={() => setEditingLink({ category: activeAdminPage.trim(), type: 'glass', icon: 'auto' })} className="w-full py-6 bg-yellow-500 text-black font-black rounded-[2.5rem] uppercase text-xs shadow-2xl hover:scale-[1.01] transition-all">
            + Adicionar em "{activeAdminPage}"
          </button>

          <div className="space-y-4">
            {loading && (
              <div className="text-center py-10 animate-pulse text-yellow-500 text-[10px] font-black uppercase">Sincronizando links...</div>
            )}
            {!loading && filteredLinks.map((link, idx) => (
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
                    <p className="text-[9px] text-gray-500 uppercase font-black">{link.click_count || 0} Cliques</p>
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
                <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Página (Categoria)</label>
                <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white" value={editingLink.category || ''} onChange={e => setEditingLink({...editingLink, category: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Link de Afiliado (URL)</label>
              <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} required />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setEditingLink(null)} className="flex-1 py-4 bg-white/5 rounded-2xl uppercase font-black text-[10px]">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-[2] py-4 bg-yellow-500 text-black rounded-2xl uppercase font-black text-[10px] shadow-lg">
                {loading ? 'Sincronizando...' : 'Confirmar Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
