
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
  const [pagesOrder, setPagesOrder] = useState<string[]>([]);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

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

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'bg') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      alert("Arquivo muito grande! Max 1.5MB.");
      return;
    }
    setLoading(true);
    try {
      const base64 = await convertFileToBase64(file);
      if (type === 'logo') setBrand(prev => ({ ...prev, logoUrl: base64 }));
      else setBrand(prev => ({ ...prev, backgroundUrl: base64 }));
      alert("Imagem processada! Salve a Identidade abaixo.");
    } catch (error) {
      alert('Erro ao processar imagem.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinks = async (targetPageToSet?: string) => {
    try {
      const { data } = await supabase.from('links').select('*').order('position', { ascending: true });
      if (data) {
        const typedData = data as CasinoLink[];
        setLinks(typedData);
        const foundCategories = Array.from(new Set(typedData.map(l => (String(l.category || 'Página 1')).trim())));
        if (targetPageToSet) {
          setActiveAdminPage(targetPageToSet);
        } else if (!activeAdminPage) {
          const firstValid = pagesOrder.find(p => foundCategories.includes(p)) || foundCategories[0] || 'Página 1';
          setActiveAdminPage(String(firstValid));
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

  const jumpToPosition = async (linkId: string, newPos: number) => {
    const pageLinks = [...links]
      .filter(l => (l.category || 'Página 1').trim() === activeAdminPage.trim())
      .sort((a, b) => a.position - b.position);
    const currentIdx = pageLinks.findIndex(l => l.id === linkId);
    if (currentIdx === -1) return;
    const targetIdx = Math.max(0, Math.min(newPos - 1, pageLinks.length - 1));
    if (targetIdx === currentIdx) return;
    setLoading(true);
    const movedItem = pageLinks.splice(currentIdx, 1)[0];
    pageLinks.splice(targetIdx, 0, movedItem);
    const updates = pageLinks.map((link, index) => ({ id: link.id, position: index + 1 }));
    try {
      await supabase.from('links').upsert(updates);
      await fetchLinks();
    } catch (err) { alert("Erro ao reordenar"); } finally { setLoading(false); }
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const baseText = brand.footerText?.split('ORDER:')[0] || '';
      const finalFooter = pagesOrder.length > 0 ? `${baseText}ORDER:${JSON.stringify(pagesOrder)}` : baseText;
      const { error } = await supabase.from('brand_settings').update({
        name: brand.name,
        tagline: brand.tagline,
        logo_url: brand.logoUrl,
        background_url: brand.backgroundUrl,
        verified: brand.verified,
        footer_text: finalFooter,
        effect: brand.effect
      }).eq('id', 1);
      if (error) throw error;
      alert("Configurações Master Salvas!");
    } catch (err) { alert("Erro ao salvar Identidade."); } finally { setLoading(false); }
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
    } catch (err) { alert("Erro ao salvar link"); } finally { setLoading(false); }
  };

  const handleSaveSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSocial) return;
    setLoading(true);
    try {
      const payload = {
        name: editingSocial.name,
        url: editingSocial.url,
        icon: editingSocial.icon || 'instagram',
        position: editingSocial.id ? editingSocial.position : socials.length + 1
      };
      if (editingSocial.id) {
        await supabase.from('social_links').update(payload).eq('id', editingSocial.id);
      } else {
        await supabase.from('social_links').insert([payload]);
      }
      setEditingSocial(null);
      await fetchSocials();
    } catch (err) { alert("Erro ao salvar rede social"); } finally { setLoading(false); }
  };

  const handleDelete = async (table: 'links' | 'social_links', id: string) => {
    if (!confirm("Confirmar exclusão?")) return;
    setLoading(true);
    try {
      await supabase.from(table).delete().eq('id', id);
      table === 'links' ? await fetchLinks() : await fetchSocials();
    } catch (err) { alert("Erro ao excluir"); } finally { setLoading(false); }
  };

  const sortedCategories = useMemo(() => {
    const foundCats = Array.from(new Set(links.map(l => (l.category || 'Página 1').trim())));
    if (foundCats.length === 0) return ['Página 1'];
    const existingOrder = pagesOrder.filter(c => foundCats.includes(c));
    foundCats.forEach(c => { if (!existingOrder.includes(c)) existingOrder.push(c); });
    return existingOrder;
  }, [links, pagesOrder]);

  const filteredLinks = useMemo(() => {
    return links.filter(l => (l.category || 'Página 1').trim() === activeAdminPage.trim()).sort((a, b) => a.position - b.position);
  }, [links, activeAdminPage]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-10 bg-[#050505] min-h-screen text-white pb-32 font-sans relative">
      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500"></div>
        </div>
      )}

      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
        <h2 className="text-2xl font-black text-shimmer uppercase italic tracking-tighter">CENTRAL DE CONTROLE</h2>
        <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} className="px-5 py-2 bg-red-600/10 text-red-500 text-[10px] font-black uppercase rounded-lg border border-red-500/20">Sair</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-12">
        {(['links', 'social', 'brand'] as const).map(menu => (
          <button key={menu} onClick={() => setActiveMenu(menu)} className={`py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest border transition-all ${activeMenu === menu ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-white/5 text-gray-400 border-white/5'}`}>
            {menu === 'links' ? '🎰 Plataformas' : menu === 'social' ? '📱 Redes' : '🎨 Identidade'}
          </button>
        ))}
      </div>

      {activeMenu === 'brand' && (
        <form onSubmit={handleSaveBrand} className="bg-[#0f0f0f] p-8 rounded-[3rem] border border-white/5 space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black text-gray-500">Logo Master</label>
                    <div className="flex items-center gap-4 bg-black p-4 rounded-2xl border border-white/5">
                        <img src={brand.logoUrl} className="w-16 h-16 rounded-full object-cover border border-yellow-500" />
                        <button type="button" onClick={() => logoInputRef.current?.click()} className="flex-grow py-2 bg-white/5 rounded-lg text-[9px] font-black uppercase">Alterar</button>
                        <input type="file" ref={logoInputRef} onChange={e => handleFileUpload(e, 'logo')} className="hidden" accept="image/*" />
                    </div>
                </div>
                <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black text-gray-500">Fundo (Background)</label>
                    <div className="flex items-center gap-4 bg-black p-4 rounded-2xl border border-white/5">
                        <div className="w-16 h-16 bg-white/5 rounded-lg overflow-hidden">
                            {brand.backgroundUrl && <img src={brand.backgroundUrl} className="w-full h-full object-cover" />}
                        </div>
                        <button type="button" onClick={() => bgInputRef.current?.click()} className="flex-grow py-2 bg-white/5 rounded-lg text-[9px] font-black uppercase">Enviar Fundo</button>
                        <input type="file" ref={bgInputRef} onChange={e => handleFileUpload(e, 'bg')} className="hidden" accept="image/*" />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <input className="w-full p-4 rounded-xl bg-black border border-white/10" value={brand.name} onChange={e => setBrand({...brand, name: e.target.value})} placeholder="Nome" />
                <input className="w-full p-4 rounded-xl bg-black border border-white/10" value={brand.tagline} onChange={e => setBrand({...brand, tagline: e.target.value})} placeholder="Slogan" />
            </div>
            <button type="submit" className="w-full py-5 bg-yellow-500 text-black font-black rounded-2xl uppercase">Salvar Identidade Master</button>
        </form>
      )}

      {activeMenu === 'links' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-wrap gap-2">
            {sortedCategories.map((cat, idx) => (
              <div key={cat} className={`flex items-center border rounded-full overflow-hidden ${activeAdminPage.trim() === cat.trim() ? 'border-white bg-white/10' : 'border-white/5'}`}>
                <button onClick={() => setActiveAdminPage(cat)} className={`px-5 py-2 text-[9px] font-black uppercase ${activeAdminPage.trim() === cat.trim() ? 'text-white' : 'text-gray-500'}`}>{cat}</button>
                <button onClick={() => moveCategory(cat, 'left')} className="px-2 py-2 bg-black/20 text-xs border-l border-white/5">←</button>
                <button onClick={() => moveCategory(cat, 'right')} className="px-2 py-2 bg-black/20 text-xs border-l border-white/5">→</button>
              </div>
            ))}
            <button onClick={() => { const n = prompt("Nome:"); if(n) setActiveAdminPage(n.trim()); }} className="px-4 py-2 text-yellow-500 text-[9px] font-black uppercase">+ Nova</button>
          </div>
          
          <button onClick={() => setEditingLink({ category: activeAdminPage, type: 'glass', icon: 'auto' })} className="w-full py-5 bg-yellow-500 text-black font-black rounded-2xl uppercase shadow-xl">+ Adicionar Link em "{activeAdminPage}"</button>
          
          <div className="space-y-3">
            {filteredLinks.map((link, idx) => (
              <div key={link.id} className="bg-[#0f0f0f] p-4 rounded-2xl flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-4">
                    <input type="number" defaultValue={idx + 1} onBlur={e => jumpToPosition(link.id!, parseInt(e.target.value))} className="w-10 h-10 bg-black text-center text-xs font-black rounded-lg border border-white/10" />
                    <div>
                        <h4 className="text-xs font-black uppercase">{link.title}</h4>
                        <p className="text-[9px] text-gray-500">{link.category}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setEditingLink(link)} className="p-2 bg-white/5 rounded-lg">⚙️</button>
                    <button onClick={() => handleDelete('links', link.id!)} className="p-2 bg-red-600/10 text-red-500 rounded-lg">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL LINK */}
      {editingLink && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
            <form onSubmit={handleSaveLink} className="bg-[#0f0f0f] p-8 rounded-[2.5rem] border border-white/10 w-full max-w-lg space-y-4">
                <h3 className="text-lg font-black uppercase text-yellow-500 mb-4 italic">Configurar Link</h3>
                <input className="w-full p-4 rounded-xl bg-black border border-white/10" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} placeholder="Título" required />
                <input className="w-full p-4 rounded-xl bg-black border border-white/10" value={editingLink.description || ''} onChange={e => setEditingLink({...editingLink, description: e.target.value})} placeholder="Descrição" />
                <input className="w-full p-4 rounded-xl bg-black border border-white/10" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} placeholder="URL" required />
                <div className="grid grid-cols-2 gap-4">
                    <select className="p-4 rounded-xl bg-black border border-white/10" value={editingLink.type || 'glass'} onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}>
                        <option value="glass">Glass</option>
                        <option value="gold">Gold</option>
                        <option value="neon-purple">Neon Purple</option>
                        <option value="neon-green">Neon Green</option>
                    </select>
                    <input className="p-4 rounded-xl bg-black border border-white/10" value={editingLink.badge || ''} onChange={e => setEditingLink({...editingLink, badge: e.target.value})} placeholder="Badge (ex: Bônus)" />
                </div>
                <div className="flex gap-2 pt-4">
                    <button type="button" onClick={() => setEditingLink(null)} className="flex-1 py-4 bg-white/5 rounded-xl text-[10px] font-black uppercase">Cancelar</button>
                    <button type="submit" className="flex-1 py-4 bg-yellow-500 text-black rounded-xl text-[10px] font-black uppercase">Salvar Link</button>
                </div>
            </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
