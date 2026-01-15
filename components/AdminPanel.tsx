
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

  // Função para converter arquivo em String Base64 (Resolve erro de Bucket)
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

    // Verificar tamanho (Base64 aumenta o tamanho em ~33%, limitamos a 1.5MB original)
    if (file.size > 1.5 * 1024 * 1024) {
      alert("Arquivo muito grande! Escolha uma imagem de até 1.5MB.");
      return;
    }

    setLoading(true);
    try {
      const base64 = await convertFileToBase64(file);
      
      if (type === 'logo') {
        setBrand(prev => ({ ...prev, logoUrl: base64 }));
      } else {
        setBrand(prev => ({ ...prev, backgroundUrl: base64 }));
      }
      
      alert("Imagem carregada com sucesso! Não esqueça de 'Salvar Identidade' abaixo.");
    } catch (error: any) {
      alert('Erro ao processar imagem: ' + error.message);
    } finally {
      setLoading(false);
    }
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
      alert("Identidade master atualizada!");
    } catch (err) { alert("Erro ao salvar marca: Verifique se a imagem não é muito pesada."); } finally { setLoading(false); }
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
    if (!confirm("Excluir permanentemente?")) return;
    setLoading(true);
    try {
      await supabase.from(table).delete().eq('id', id);
      table === 'links' ? await fetchLinks() : await fetchSocials();
    } catch (err) { alert("Erro ao excluir"); } finally { setLoading(false); }
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
    } catch (err) { alert("Erro ao salvar"); } finally { setLoading(false); }
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
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-yellow-500"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Sincronizando Dados Master...</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-2xl font-black text-shimmer uppercase italic tracking-tighter">CENTRAL DE CONTROLE</h2>
          <p className="text-[9px] text-gray-500 uppercase font-black mt-1 tracking-widest">Painel Administrativo v3.0</p>
        </div>
        <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} className="px-6 py-2 bg-white/5 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Encerrar Sessão</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-12">
        {(['links', 'social', 'brand'] as const).map(menu => (
          <button key={menu} onClick={() => setActiveMenu(menu)} className={`py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest border transition-all ${activeMenu === menu ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}`}>
            {menu === 'links' ? '🎰 Plataformas' : menu === 'social' ? '📱 Redes' : '🎨 Identidade'}
          </button>
        ))}
      </div>

      {activeMenu === 'brand' && (
        <div className="animate-fade-in space-y-8">
          <form onSubmit={handleSaveBrand} className="bg-[#0f0f0f] p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* UPLOAD LOGO */}
              <div className="space-y-4">
                <label className="text-[10px] uppercase font-black text-gray-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> Avatar / Logo Master
                </label>
                <div className="flex items-center gap-6 bg-black/40 p-5 rounded-[2rem] border border-white/5">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-yellow-500/30 bg-black flex-shrink-0 shadow-xl">
                    <img src={brand.logoUrl} className="w-full h-full object-cover" alt="Preview" />
                  </div>
                  <div className="flex-grow space-y-2">
                    <input type="file" ref={logoInputRef} onChange={(e) => handleFileUpload(e, 'logo')} className="hidden" accept="image/*" />
                    <button type="button" onClick={() => logoInputRef.current?.click()} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase border border-white/10 transition-all">Alterar Imagem</button>
                    <p className="text-[7px] text-gray-600 uppercase font-bold text-center">Base64 • Max 1.5MB</p>
                  </div>
                </div>
              </div>

              {/* UPLOAD BACKGROUND */}
              <div className="space-y-4">
                <label className="text-[10px] uppercase font-black text-gray-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> Fundo da Página (Background)
                </label>
                <div className="flex items-center gap-6 bg-black/40 p-5 rounded-[2rem] border border-white/5">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10 bg-black flex-shrink-0 shadow-xl relative">
                    {brand.backgroundUrl ? (
                      <img src={brand.backgroundUrl} className="w-full h-full object-cover" alt="Preview BG" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-700">Vazio</div>
                    )}
                  </div>
                  <div className="flex-grow space-y-2">
                    <input type="file" ref={bgInputRef} onChange={(e) => handleFileUpload(e, 'bg')} className="hidden" accept="image/*" />
                    <button type="button" onClick={() => bgInputRef.current?.click()} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase border border-white/10 transition-all">Enviar Fundo</button>
                    <button type="button" onClick={() => setBrand({...brand, backgroundUrl: ''})} className="w-full py-2 text-red-500 text-[8px] font-black uppercase hover:bg-red-500/5 rounded-lg transition-all">Remover</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-1">Nome da Marca</label>
                <input className="w-full p-5 rounded-2xl bg-black border border-white/10 text-white text-sm focus:border-yellow-500 outline-none" value={brand.name} onChange={e => setBrand({...brand, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-1">Slogan Principal</label>
                <input className="w-full p-5 rounded-2xl bg-black border border-white/10 text-white text-sm focus:border-yellow-500 outline-none" value={brand.tagline} onChange={e => setBrand({...brand, tagline: e.target.value})} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-1">Efeito de Partículas</label>
                <select className="w-full p-5 rounded-2xl bg-black border border-white/10 text-white text-sm outline-none" value={brand.effect || 'scanner'} onChange={e => setBrand({...brand, effect: e.target.value as any})}>
                  <option value="scanner">Scanner Gold</option>
                  <option value="gold-rain">Chuva de Ouro</option>
                  <option value="matrix">Matrix Code</option>
                  <option value="fire">Chamas (Ember)</option>
                  <option value="money">Dinheiro Caindo</option>
                  <option value="space">Espaço (Estrelas)</option>
                  <option value="aurora">Aurora Boreal</option>
                  <option value="glitch">Glitch Lines</option>
                  <option value="confetti">Confetti Party</option>
                  <option value="snow">Neve</option>
                  <option value="lightning">Trovões (Flash)</option>
                  <option value="none">Nenhum</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-1">Texto do Rodapé</label>
                <input className="w-full p-5 rounded-2xl bg-black border border-white/10 text-white text-sm focus:border-yellow-500 outline-none" value={brand.footerText?.split('ORDER:')[0] || ''} onChange={e => setBrand({...brand, footerText: e.target.value})} />
              </div>
            </div>

            <div className="flex items-center gap-3 p-5 bg-black rounded-2xl border border-white/5">
              <input type="checkbox" id="v-brand" checked={brand.verified} onChange={e => setBrand({...brand, verified: e.target.checked})} className="w-5 h-5 accent-yellow-500" />
              <label htmlFor="v-brand" className="text-xs font-black uppercase text-gray-300">Exibir Selo de Verificação Blue</label>
            </div>
            
            <button type="submit" className="w-full py-6 bg-yellow-500 text-black font-black rounded-[2.5rem] uppercase text-xs shadow-2xl hover:scale-[1.01] transition-all">Salvar Identidade Visual</button>
          </form>
        </div>
      )}

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
          <button onClick={() => setEditingLink({ category: activeAdminPage.trim(), type: 'glass', icon: 'auto', is_highlighted: false })} className="w-full py-6 bg-yellow-500 text-black font-black rounded-[2.5rem] uppercase text-xs shadow-2xl hover:scale-[1.01] transition-all">+ Adicionar Link em "{activeAdminPage}"</button>
          <div className="space-y-4">
            {filteredLinks.map((link, idx) => (
              <div key={link.id} className="bg-[#0f0f0f] p-5 rounded-[2rem] flex items-center justify-between border border-white/5 group">
                <div className="flex items-center gap-4 flex-grow">
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[7px] font-black text-gray-600 uppercase">Pos</span>
                    <input type="number" min="1" max={filteredLinks.length} defaultValue={idx + 1} onBlur={(e) => jumpToPosition(link.id!, parseInt(e.target.value))} className="w-10 h-10 bg-black border border-white/10 rounded-lg text-center text-xs font-black focus:border-yellow-500 outline-none transition-colors" />
                  </div>
                  <div className={`w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10 ${link.type === 'gold' ? 'text-yellow-500' : 'text-white'}`}>{Icons[link.icon || 'slots'] || Icons.slots}</div>
                  <div>
                    <h4 className="font-bold text-sm uppercase flex items-center gap-2">{link.title}{link.badge && <span className="text-[7px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-md font-black">{link.badge}</span>}</h4>
                    <p className="text-[9px] text-gray-500 uppercase font-black">{link.click_count || 0} Cliques • Estilo: {link.type}</p>
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

      {activeMenu === 'social' && (
        <div className="animate-fade-in space-y-6">
          <button onClick={() => setEditingSocial({ name: '', url: '', icon: 'instagram' })} className="w-full py-6 bg-yellow-500 text-black font-black rounded-[2.5rem] uppercase text-xs shadow-2xl">+ Adicionar Rede Social</button>
          <div className="space-y-4">
            {socials.map((social) => (
              <div key={social.id} className="bg-[#0f0f0f] p-5 rounded-[2rem] flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10 text-white">{Icons[social.icon] || social.name.charAt(0)}</div>
                  <div>
                    <h4 className="font-bold text-sm uppercase">{social.name}</h4>
                    <p className="text-[9px] text-gray-500 uppercase truncate max-w-[200px]">{social.url}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingSocial(social)} className="w-10 h-10 bg-white/5 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">⚙️</button>
                  <button onClick={() => handleDelete('social_links', social.id!)} className="w-10 h-10 bg-red-600/10 text-red-500 flex items-center justify-center rounded-lg hover:bg-red-600 hover:text-white transition-colors">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modais de Edição */}
      {editingLink && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <form onSubmit={handleSaveLink} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] w-full max-w-xl my-auto space-y-5 shadow-2xl">
            <h3 className="text-xl font-black uppercase text-shimmer mb-4 italic">Configurar Link</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Título</label><input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white focus:border-yellow-500 outline-none" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} required /></div>
              <div className="space-y-1.5"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Página</label><input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white focus:border-yellow-500 outline-none" value={editingLink.category || ''} onChange={e => setEditingLink({...editingLink, category: e.target.value})} required /></div>
            </div>
            <div className="space-y-1.5"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Descrição</label><input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white focus:border-yellow-500 outline-none" value={editingLink.description || ''} onChange={e => setEditingLink({...editingLink, description: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">URL</label><input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white focus:border-yellow-500 outline-none" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} required /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Estilo</label><select className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none" value={editingLink.type || 'glass'} onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}><option value="glass">Glass</option><option value="gold">Gold</option><option value="neon-purple">Neon P</option><option value="neon-green">Neon G</option></select></div>
              <div className="space-y-1.5"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Ícone</label><select className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none" value={editingLink.icon || 'auto'} onChange={e => setEditingLink({...editingLink, icon: e.target.value})}><option value="auto">Auto</option>{Object.keys(Icons).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
              <div className="space-y-1.5"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Badge</label><input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none" value={editingLink.badge || ''} onChange={e => setEditingLink({...editingLink, badge: e.target.value.toUpperCase()})} /></div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl"><input type="checkbox" id="high-check" checked={editingLink.is_highlighted} onChange={e => setEditingLink({...editingLink, is_highlighted: e.target.checked})} className="w-4 h-4 accent-yellow-500" /><label htmlFor="high-check" className="text-[9px] font-black uppercase text-gray-300">Destacar Link</label></div>
            <div className="flex gap-3 pt-4 border-t border-white/5">
              <button type="button" onClick={() => setEditingLink(null)} className="flex-1 py-4 bg-white/5 rounded-2xl uppercase font-black text-[10px]">Cancelar</button>
              <button type="submit" className="flex-[2] py-4 bg-yellow-500 text-black rounded-2xl uppercase font-black text-[10px]">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {editingSocial && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[9999]">
          <form onSubmit={handleSaveSocial} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] w-full max-w-xl space-y-5 shadow-2xl">
            <h3 className="text-xl font-black uppercase text-shimmer mb-4 italic">Rede Social</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Nome</label><input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none" value={editingSocial.name || ''} onChange={e => setEditingSocial({...editingSocial, name: e.target.value})} required /></div>
              <div className="space-y-1.5"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Ícone</label><select className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none" value={editingSocial.icon || 'instagram'} onChange={e => setEditingSocial({...editingSocial, icon: e.target.value})}><option value="instagram">Instagram</option><option value="telegram">Telegram</option><option value="facebook">Facebook</option><option value="twitter">Twitter</option><option value="whatsapp">WhatsApp</option></select></div>
            </div>
            <div className="space-y-1.5"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Link (URL)</label><input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none" value={editingSocial.url || ''} onChange={e => setEditingSocial({...editingSocial, url: e.target.value})} required /></div>
            <div className="flex gap-3 pt-4 border-t border-white/5">
              <button type="button" onClick={() => setEditingSocial(null)} className="flex-1 py-4 bg-white/5 rounded-2xl uppercase font-black text-[10px]">Cancelar</button>
              <button type="submit" className="flex-[2] py-4 bg-yellow-500 text-black rounded-2xl uppercase font-black text-[10px]">Salvar Rede</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
