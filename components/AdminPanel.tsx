
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

  const fetchLinks = async () => {
    try {
      const { data } = await supabase.from('links').select('*').order('position', { ascending: true });
      if (data) {
        setLinks(data);
        const uniqueCats = Array.from(new Set(data.map(l => l.category || 'Página 1')));
        if (uniqueCats.length > 0 && !activeAdminPage) {
          setActiveAdminPage(uniqueCats[0]);
        } else if (!activeAdminPage) setActiveAdminPage('Página 1');
      }
    } catch (e) {}
  };

  const moveLink = async (id: string, direction: 'up' | 'down') => {
    const pageLinks = links
      .filter(l => (l.category || 'Página 1') === activeAdminPage)
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
    const categoriesOrder = Array.from(new Set(links.map(l => l.category || 'Página 1')));
    const currentIdx = categoriesOrder.indexOf(category);
    if (currentIdx === -1) return;

    const targetIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= categoriesOrder.length) return;

    const targetCategory = categoriesOrder[targetIdx];
    const currentCatLinks = links.filter(l => (l.category || 'Página 1') === category);
    const targetCatLinks = links.filter(l => (l.category || 'Página 1') === targetCategory);

    const updates = [
      ...currentCatLinks.map(l => ({ id: l.id, category: targetCategory })),
      ...targetCatLinks.map(l => ({ id: l.id, category: category }))
    ];

    const { error } = await supabase.from('links').upsert(updates);
    if (!error) {
      setActiveAdminPage(direction === 'left' ? targetCategory : category); 
      fetchLinks();
    }
  };

  const deepReorder = async () => {
    if (!confirm("Deseja normalizar todas as ordens (1, 2, 3...) de todas as páginas?")) return;
    setLoading(true);
    const uniqueCats = Array.from(new Set(links.map(l => l.category || 'Página 1')));
    let allUpdates: any[] = [];
    uniqueCats.forEach(cat => {
      const catLinks = links
        .filter(l => (l.category || 'Página 1') === cat)
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
      const targetCategory = editingLink.category || activeAdminPage || 'Página 1';
      const newPos = Number(editingLink.position) || 1;
      
      // Objeto base sem o ID
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
        // INSERÇÃO: Não envia o campo 'id'
        const { data: newLinkData, error: insertError } = await supabase
          .from('links')
          .insert([basePayload])
          .select()
          .single();
        
        if (insertError) throw insertError;

        if (newLinkData) {
          // Reordenar os outros links da mesma página para acomodar a nova posição
          const otherLinks = links
            .filter(l => (l.category || 'Página 1') === targetCategory && l.id !== newLinkData.id)
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
        // ATUALIZAÇÃO: Envia o campo 'id' para identificar o registro
        const { error: updateError } = await supabase
          .from('links')
          .update(basePayload)
          .eq('id', editingLink.id);
          
        if (updateError) throw updateError;

        // Após atualizar, forçamos uma reordenação visual da página
        const pageLinks = links
          .filter(l => (l.category || 'Página 1') === targetCategory)
          .map(l => l.id === editingLink.id ? { ...l, ...basePayload } : l)
          .sort((a, b) => a.position - b.position);

        const finalUpdates = pageLinks.map((item, idx) => ({
          id: item.id,
          position: idx + 1
        }));
        
        await supabase.from('links').upsert(finalUpdates);
      }
      
      setEditingLink(null);
      await fetchLinks(); // Recarrega tudo
      alert("Plataforma salva com sucesso!");
    } catch (err: any) {
      console.error("Erro completo:", err);
      alert("Erro ao salvar: " + (err.message || "Verifique os campos obrigatórios."));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (table: string, id: string) => {
    if (!confirm('Excluir este item?')) return;
    await supabase.from(table).delete().eq('id', id);
    table === 'links' ? fetchLinks() : fetchSocials();
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'background') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isLogo = type === 'logo';
    isLogo ? setUploadingLogo(true) : setUploadingBg(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('brand')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('brand').getPublicUrl(fileName);
      
      if (isLogo) {
        setBrand(prev => ({ ...prev, logoUrl: publicUrl }));
      } else {
        setBrand(prev => ({ ...prev, backgroundUrl: publicUrl }));
      }
      
      alert(`Arquivo carregado! Clique em 'Salvar Configurações Master' para confirmar.`);
    } catch (err: any) {
      console.error("Erro no upload:", err);
      alert("Erro no upload: " + (err.message || "Erro desconhecido."));
    } finally {
      isLogo ? setUploadingLogo(false) : setUploadingBg(false);
    }
  };

  const uniqueCategories = useMemo(() => Array.from(new Set(links.map(l => l.category || 'Página 1'))), [links]);
  
  const filteredLinks = useMemo(() => {
    return links
      .filter(l => (l.category || 'Página 1') === activeAdminPage)
      .sort((a, b) => a.position - b.position);
  }, [links, activeAdminPage]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-10 bg-[#050505] min-h-screen text-white pb-32 font-sans">
      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-2xl font-black text-shimmer uppercase italic tracking-tighter">CENTRAL DE CONTROLE</h2>
          <div className="flex items-center gap-2 mt-2">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
             <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">v8.6 - Correção de Insert Ativa</p>
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
              <div key={cat} className="flex items-center bg-black/40 rounded-full border border-white/5 overflow-hidden shadow-lg">
                <button 
                  onClick={() => setActiveAdminPage(cat)} 
                  className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminPage === cat ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                >
                  {cat}
                </button>
                <div className="flex border-l border-white/5 bg-black/60">
                  <button disabled={idx === 0} onClick={() => moveCategory(cat, 'left')} className="px-3 py-3 text-xs hover:text-yellow-500 disabled:opacity-20 transition-colors">←</button>
                  <button disabled={idx === uniqueCategories.length - 1} onClick={() => moveCategory(cat, 'right')} className="px-3 py-3 text-xs hover:text-yellow-500 disabled:opacity-20 transition-colors">→</button>
                </div>
              </div>
            ))}
            <button onClick={() => { const n = prompt("Nome da nova página:"); if(n) setActiveAdminPage(n); }} className="px-4 py-3 text-yellow-500 text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500/10 rounded-full">+ Nova Página</button>
          </div>

          <button onClick={() => setEditingLink({ category: activeAdminPage, description: 'SAQUE MÍNIMO COM BÔNUS', type: 'glass', icon: 'auto', position: filteredLinks.length + 1, is_highlighted: false })} className="w-full py-6 bg-yellow-500 text-black font-black rounded-[2.5rem] uppercase text-xs shadow-2xl hover:scale-[1.01] transition-all">+ Adicionar em "{activeAdminPage}"</button>

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

      {activeMenu === 'social' && (
        <div className="animate-fade-in space-y-8">
          <button onClick={() => setEditingSocial({ icon: 'instagram' })} className="w-full py-6 bg-blue-600 text-white font-black rounded-[2.5rem] uppercase text-xs shadow-2xl hover:scale-[1.01] transition-all">+ Nova Rede Social</button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {socials.map(soc => (
              <div key={soc.id} className="bg-[#0f0f0f] p-6 rounded-[2rem] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-blue-400">{Icons[soc.icon] || soc.name[0]}</div>
                   <div>
                     <p className="font-black uppercase text-xs">{soc.name}</p>
                     <p className="text-[8px] text-gray-500 truncate max-w-[150px]">{soc.url}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingSocial(soc)} className="text-[10px] font-black uppercase text-blue-400">Editar</button>
                  <button onClick={() => handleDelete('social_links', soc.id!)} className="text-[10px] font-black uppercase text-red-500">Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeMenu === 'brand' && (
        <div className="animate-fade-in max-w-2xl mx-auto">
          <form onSubmit={handleSaveBrand} className="bg-[#0f0f0f] p-10 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl">
            <div className="grid grid-cols-2 gap-8">
               <div className="text-center space-y-4">
                 <label className="text-[9px] uppercase font-black text-gray-500 tracking-widest">Logo Principal</label>
                 <div onClick={() => logoInputRef.current?.click()} className="w-24 h-24 mx-auto rounded-full border-2 border-dashed border-yellow-500 p-1 cursor-pointer overflow-hidden bg-black group relative">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} className="w-full h-full object-cover rounded-full group-hover:opacity-40" alt="Logo" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 font-black text-[10px]">VAZIO</div>
                    )}
                    {uploadingLogo && <div className="absolute inset-0 bg-black/80 flex items-center justify-center animate-spin">⌛</div>}
                 </div>
                 <input type="file" ref={logoInputRef} onChange={e => handleFileUpload(e, 'logo')} className="hidden" accept="image/*" />
               </div>
               <div className="text-center space-y-4">
                 <label className="text-[9px] uppercase font-black text-gray-500 tracking-widest">Fundo (Background)</label>
                 <div onClick={() => bgInputRef.current?.click()} className="w-full h-24 rounded-2xl border-2 border-dashed border-blue-500 cursor-pointer overflow-hidden bg-black group relative">
                    {brand.backgroundUrl ? (
                      <img src={brand.backgroundUrl} className="w-full h-full object-cover group-hover:opacity-40" alt="BG" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 font-black text-[10px]">SEM FUNDO</div>
                    )}
                    {uploadingBg && <div className="absolute inset-0 bg-black/80 flex items-center justify-center animate-spin">⌛</div>}
                 </div>
                 <input type="file" ref={bgInputRef} onChange={e => handleFileUpload(e, 'background')} className="hidden" accept="image/*" />
               </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest">Selo de Verificado</span>
                <button type="button" onClick={() => setBrand({...brand, verified: !brand.verified})} className={`w-12 h-6 rounded-full transition-all relative ${brand.verified ? 'bg-green-500' : 'bg-gray-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${brand.verified ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Atmosfera (Efeito)</label>
                <select className="w-full p-4 rounded-2xl text-sm bg-black border border-white/10 text-white font-bold uppercase" value={brand.effect || 'scanner'} onChange={e => setBrand({...brand, effect: e.target.value as any})}>
                  <option value="none">🚫 Vazio</option>
                  <option value="scanner">🔦 Scanner</option>
                  <option value="glitch">📺 Glitch</option>
                  <option value="matrix">💻 Matrix</option>
                  <option value="gold-rain">💰 Gold Rain</option>
                  <option value="fire">🔥 Fire</option>
                  <option value="money">💵 Money</option>
                  <option value="space">🚀 Space</option>
                  <option value="aurora">🌈 Aurora</option>
                  <option value="snow">❄️ Snow</option>
                  <option value="lightning">⚡ Lightning</option>
                  <option value="confetti">🎉 Confetti</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Nome da Banca</label>
                <input className="w-full p-4 rounded-2xl text-sm bg-black border border-white/10 text-white font-bold" value={brand.name} onChange={e => setBrand({...brand, name: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Tagline (Bio)</label>
                <textarea className="w-full p-4 rounded-2xl text-sm bg-black border border-white/10 text-white min-h-[80px]" value={brand.tagline} onChange={e => setBrand({...brand, tagline: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Texto do Rodapé</label>
                <input className="w-full p-4 rounded-2xl text-sm bg-black border border-white/10 text-white" value={brand.footerText || ''} onChange={e => setBrand({...brand, footerText: e.target.value})} />
              </div>
            </div>

            <button type="submit" disabled={savingBrand} className="w-full py-6 bg-blue-600 text-white font-black rounded-2xl uppercase text-[11px] tracking-widest shadow-xl hover:bg-blue-700 transition-colors">
              {savingBrand ? 'Sincronizando...' : 'Salvar Configurações Master'}
            </button>
          </form>
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
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Posição na Lista</label>
                <input type="number" className="w-full p-4 rounded-xl text-sm bg-yellow-500/5 border border-yellow-500/30 text-yellow-500 font-bold" value={editingLink.position || ''} onChange={e => setEditingLink({...editingLink, position: parseInt(e.target.value)})} placeholder="1" required />
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
                  <option value="gold">Dourado VIP</option><option value="neon-purple">Neon Roxo</option><option value="neon-green">Neon Verde</option><option value="glass">Vidro Fosco</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Ícone</label>
                <select className="w-full p-4 bg-black border border-white/10 rounded-xl text-[10px] uppercase font-black" value={editingLink.icon} onChange={e => setEditingLink({...editingLink, icon: e.target.value})}>
                  <option value="auto">🌐 Automático (Favicon)</option><option value="slots">🎰 Slots</option><option value="rocket">🚀 Crash</option><option value="fire">🔥 Fogo</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Etiqueta (Badge)</label>
                <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10" value={editingLink.badge || ''} onChange={e => setEditingLink({...editingLink, badge: e.target.value})} placeholder="Ex: Novo" />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] uppercase font-black text-gray-500 ml-1">Página (Página 1, Página 2...)</label>
                <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10" value={editingLink.category || ''} onChange={e => setEditingLink({...editingLink, category: e.target.value})} placeholder="Página 1" />
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
