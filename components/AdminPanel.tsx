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
  const [editingSocial, setEditingSocial] = useState<Partial<SocialLink> | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [activeAdminPage, setActiveAdminPage] = useState<string>('');
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

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
      if (table === 'links') await fetchLinks();
      else await fetchSocials();
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

  const moveCategory = async (category: string, direction: 'left' | 'right') => {
    if (loading) return;
    const categoriesOrder = Array.from(new Set(links.map(l => ((l.category as string) || 'Página 1').trim())));
    const currentIdx = categoriesOrder.indexOf(category.trim());
    if (currentIdx === -1) return;

    const targetIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= categoriesOrder.length) return;

    const targetCategoryName = categoriesOrder[targetIdx].trim();
    const currentCategoryName = category.trim();
    
    const currentCatLinks = links.filter(l => (l.category || 'Página 1').trim() === currentCategoryName);
    const targetCatLinks = links.filter(l => (l.category || 'Página 1').trim() === targetCategoryName);

    const updates = [
      ...currentCatLinks.map(l => ({ id: l.id, category: targetCategoryName })),
      ...targetCatLinks.map(l => ({ id: l.id, category: currentCategoryName }))
    ];

    setLoading(true);
    const { error } = await supabase.from('links').upsert(updates);
    
    if (!error) {
      const newActive = activeAdminPage.trim() === currentCategoryName ? targetCategoryName : activeAdminPage.trim();
      await fetchLinks(newActive);
    }
    setLoading(false);
  };

  const deepReorder = async () => {
    if (!confirm("Deseja normalizar todas as ordens (1, 2, 3...) de todas as páginas?")) return;
    setLoading(true);
    const uniqueCats = Array.from(new Set(links.map(l => (l.category || 'Página 1').trim())));
    let allUpdates: any[] = [];
    uniqueCats.forEach(cat => {
      const catLinks = links
        .filter(l => (l.category || 'Página 1').trim() === cat)
        .sort((a, b) => a.position - b.position);
      catLinks.forEach((link, index) => {
        allUpdates.push({ id: link.id, position: index + 1 });
      });
    });
    if (allUpdates.length > 0) {
      const { error } = await supabase.from('links').upsert(allUpdates);
      if (!error) fetchLinks();
    }
    setLoading(false);
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;
    setLoading(true);
    
    try {
      const targetCategory = (editingLink.category || activeAdminPage || 'Página 1').trim();
      const newPos = Number(editingLink.position) || 1;
      
      const basePayload = {
        title: editingLink.title || 'Novo Link',
        description: editingLink.description || 'SAQUE MÍNIMO COM BÔNUS',
        url: editingLink.url || '',
        type: editingLink.type || 'glass',
        icon: editingLink.icon || 'auto',
        badge: editingLink.badge || '',
        category: targetCategory,
        position: newPos,
        is_highlighted: editingLink.is_highlighted ?? false
      };

      if (!editingLink.id) {
        const { data: newLinkData, error: insertError } = await supabase
          .from('links')
          .insert([basePayload])
          .select()
          .single();
        
        if (insertError) throw insertError;

        if (newLinkData) {
          const otherLinks = links
            .filter(l => (l.category || 'Página 1').trim() === targetCategory && l.id !== newLinkData.id)
            .sort((a, b) => a.position - b.position);
          
          const newList = [...otherLinks];
          newList.splice(newPos - 1, 0, newLinkData);
          
          const updates = newList.map((l, i) => ({ 
            id: l.id, 
            position: i + 1, 
            category: targetCategory 
          }));
          
          await supabase.from('links').upsert(updates);
        }
      } else {
        const { error: updateError } = await supabase
          .from('links')
          .update(basePayload)
          .eq('id', editingLink.id);
          
        if (updateError) throw updateError;

        const pageLinks = links
          .filter(l => (l.category || 'Página 1').trim() === targetCategory)
          .map(l => l.id === editingLink.id ? { ...l, ...basePayload } : l)
          .sort((a, b) => a.position - b.position);

        const finalUpdates = pageLinks.map((item, idx) => ({
          id: item.id,
          position: idx + 1,
          category: targetCategory 
        }));
        
        await supabase.from('links').upsert(finalUpdates);
      }
      
      setEditingLink(null);
      await fetchLinks();
      alert("Plataforma salva com sucesso!");
    } catch (err: any) {
      console.error("Erro completo:", err);
      alert("Erro ao salvar: " + (err.message || "Verifique os campos obrigatórios."));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBrand(true);
    try {
      const { error } = await supabase.from('brand_settings').upsert({
        id: 1,
        name: brand.name,
        tagline: brand.tagline,
        logo_url: brand.logoUrl,
        background_url: brand.backgroundUrl,
        verified: brand.verified,
        footer_text: brand.footerText,
        effect: brand.effect
      }, { onConflict: 'id' });
      
      if (error) throw error;
      alert("Identidade visual salva com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar identidade: " + err.message);
    } finally {
      setSavingBrand(false);
    }
  };

  const uniqueCategories = useMemo(() => Array.from(new Set(links.map(l => (l.category || 'Página 1').trim()))), [links]);
  
  const filteredLinks = useMemo(() => {
    const currentAdminPage = activeAdminPage.trim();
    return links
      .filter(l => (l.category || 'Página 1').trim() === currentAdminPage)
      .sort((a, b) => a.position - b.position);
  }, [links, activeAdminPage]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-10 bg-[#050505] min-h-screen text-white pb-32 font-sans">
      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-2xl font-black text-shimmer uppercase italic tracking-tighter">CENTRAL DE CONTROLE</h2>
          <div className="flex items-center gap-2 mt-2">
             <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                   <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                   </svg>
                </div>
                <p className="text-[9px] text-green-500 uppercase tracking-widest font-black">Sistema Estável & Verificado</p>
             </div>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={deepReorder} className="px-4 py-2 bg-white/5 border border-white/10 text-yellow-500 rounded-xl text-[9px] font-black uppercase hover:bg-yellow-500 hover:text-black transition-all">Organizar Geral</button>
           <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} className="px-6 py-2 bg-white/5 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Sair</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-12">
        {(['links', 'social', 'brand'] as const).map(menu => (
          <button 
            key={menu}
            onClick={() => setActiveMenu(menu)}
            className={`py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest border transition-all ${
              activeMenu === menu ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
            }`}
          >
            {menu === 'links' ? '🎰 Plataformas' : menu === 'social' ? '📱 Redes Sociais' : '🎨 Identidade Visual'}
          </button>
        ))}
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
            <button onClick={() => { const n = prompt("Nome da nova página:"); if(n) setActiveAdminPage(n.trim()); }} className="px-4 py-3 text-yellow-500 text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500/10 rounded-full">+ Nova Página</button>
          </div>

          <button onClick={() => setEditingLink({ category: activeAdminPage.trim(), description: 'SAQUE MÍNIMO COM BÔNUS', type: 'glass', icon: 'auto', position: filteredLinks.length + 1, is_highlighted: false })} className="w-full py-6 bg-yellow-500 text-black font-black rounded-[2.5rem] uppercase text-xs shadow-2xl hover:scale-[1.01] transition-all">+ Adicionar em "{activeAdminPage}"</button>

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
                    <p className="text-[9px] text-gray-500 uppercase font-black">{link.click_count || 0} Cliques • Posição: <span className="text-yellow-500">{link.position}º</span></p>
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
    </div>
  );
};

export default AdminPanel;