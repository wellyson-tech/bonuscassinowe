
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CasinoLink, CasinoBrand, SocialLink, ExtraPageConfig } from '../types';
import { Icons, BRAND as DEFAULT_BRAND, ADMIN_UID } from '../constants';

const AdminPanel: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<'links' | 'social' | 'brand'>('links');
  const [activeBrandTab, setActiveBrandTab] = useState<'geral' | 'roleta' | 'bonus' | 'cinco'>('geral');
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [brand, setBrand] = useState<CasinoBrand>({
    ...DEFAULT_BRAND,
    extraPages: {
      bonusaleatorio: { title: 'BÔNUS SURPRESA', tagline: 'OFERTAS ALEATÓRIAS DO DIA', effect: 'money', badge: 'OFERTA LIMITADA' },
      cinco_bonus: { title: 'R$ 5,00 GRÁTIS', tagline: 'PLATAFORMAS PAGANDO AGORA', effect: 'scanner', badge: 'SAQUE IMEDIATO' }
    }
  });
  
  const [editingLink, setEditingLink] = useState<Partial<CasinoLink> | null>(null);
  const [editingSocial, setEditingSocial] = useState<Partial<SocialLink> | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeAdminPage, setActiveAdminPage] = useState<string>('');
  const [pagesOrder, setPagesOrder] = useState<string[]>([]);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const roletaLogoInputRef = useRef<HTMLInputElement>(null);
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
        let extraPages = brand.extraPages;
        let footerRaw = data.footer_text || '';
        
        if (footerRaw.includes('EXTRAS:')) {
          try {
            const extraPart = footerRaw.split('EXTRAS:')[1].split('ORDER:')[0];
            extraPages = JSON.parse(extraPart);
          } catch(e) {}
        }

        setBrand({
          name: data.name,
          tagline: data.tagline,
          logoUrl: data.logo_url,
          backgroundUrl: data.background_url,
          verified: data.verified,
          footerText: data.footer_text,
          effect: data.effect || 'scanner',
          roletaTitle: data.roleta_title || 'SALA VIP',
          roletaTagline: data.roleta_tagline || 'ROLETA ESTRATÉGICA',
          roletaLogoUrl: data.roleta_logo_url || data.logo_url,
          roletaEffect: data.roleta_effect || 'scanner',
          roletaBadgeText: data.roleta_badge_text || 'Acesso Restrito VIP',
          extraPages: extraPages
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'roleta_logo' | 'bg') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) { alert("Arquivo muito grande (Máx 1.5MB)"); return; }
    setLoading(true);
    try {
      const base64 = await convertFileToBase64(file);
      if (type === 'logo') setBrand(prev => ({ ...prev, logoUrl: base64 }));
      else if (type === 'roleta_logo') setBrand(prev => ({ ...prev, roletaLogoUrl: base64 }));
      else setBrand(prev => ({ ...prev, backgroundUrl: base64 }));
    } catch (error) { alert('Erro ao processar imagem'); } finally { setLoading(false); }
  };

  const fetchLinks = async (targetPage?: string) => {
    const { data } = await supabase.from('links').select('*').order('position', { ascending: true });
    if (data) {
      setLinks(data as CasinoLink[]);
      const found = Array.from(new Set((data as CasinoLink[]).map(l => (l.category || 'Página 1').trim())));
      if (targetPage) setActiveAdminPage(targetPage);
      else if (!activeAdminPage) setActiveAdminPage(pagesOrder.find(p => found.includes(p)) || found[0] || 'Página 1');
    }
  };

  const fetchSocials = async () => {
    const { data } = await supabase.from('social_links').select('*').order('position', { ascending: true });
    if (data) setSocials(data as SocialLink[]);
  };

  const moveCategory = async (name: string, dir: 'left' | 'right') => {
    const order = [...sortedCategories];
    const idx = order.indexOf(name.trim());
    if (idx === -1) return;
    const target = dir === 'left' ? idx - 1 : idx + 1;
    if (target < 0 || target >= order.length) return;
    [order[idx], order[target]] = [order[target], order[idx]];
    setPagesOrder(order);
    const { data } = await supabase.from('brand_settings').select('footer_text').eq('id', 1).single();
    const base = data?.footer_text?.split('EXTRAS:')[0]?.split('ORDER:')[0] || '';
    const extrasStr = `EXTRAS:${JSON.stringify(brand.extraPages)}`;
    await supabase.from('brand_settings').update({ footer_text: `${base}${extrasStr}ORDER:${JSON.stringify(order)}` }).eq('id', 1);
  };

  const jumpToPosition = async (id: string, n: number) => {
    const page = links.filter(l => (l.category || 'Página 1').trim() === activeAdminPage.trim()).sort((a,b) => a.position - b.position);
    const curr = page.findIndex(l => l.id === id);
    if (curr === -1) return;
    setLoading(true);
    const item = page.splice(curr, 1)[0];
    page.splice(Math.max(0, Math.min(n-1, page.length)), 0, item);
    const upserts = page.map((l, i) => ({ id: l.id, position: i + 1 }));
    await supabase.from('links').upsert(upserts);
    await fetchLinks();
    setLoading(false);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const base = brand.footerText?.split('EXTRAS:')[0]?.split('ORDER:')[0] || '';
    const extrasStr = `EXTRAS:${JSON.stringify(brand.extraPages)}`;
    const finalFooter = `${base}${extrasStr}ORDER:${JSON.stringify(pagesOrder)}`;
    
    const { error } = await supabase.from('brand_settings').update({
      name: brand.name, 
      tagline: brand.tagline, 
      logo_url: brand.logoUrl,
      background_url: brand.backgroundUrl, 
      verified: brand.verified,
      footer_text: finalFooter, 
      effect: brand.effect,
      roleta_title: brand.roletaTitle,
      roleta_tagline: brand.roletaTagline,
      roleta_logo_url: brand.roletaLogoUrl,
      roleta_effect: brand.roletaEffect,
      roleta_badge_text: brand.roletaBadgeText
    }).eq('id', 1);

    if (error) {
      alert("Erro ao salvar: Verifique a conexão.");
    } else {
      alert("Configurações atualizadas com sucesso!");
    }
    setLoading(false);
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;
    setLoading(true);
    const cat = (editingLink.category || activeAdminPage || 'Página 1').trim();
    const payload = { ...editingLink, category: cat, position: editingLink.id ? editingLink.position : links.length + 1 };
    delete (payload as any).created_at; delete (payload as any).click_count;
    if (editingLink.id) await supabase.from('links').update(payload).eq('id', editingLink.id);
    else await supabase.from('links').insert([payload]);
    setEditingLink(null);
    await fetchLinks(cat);
    setLoading(false);
  };

  const handleDelete = async (table: any, id: string) => {
    if (!confirm("Excluir permanentemente?")) return;
    setLoading(true);
    await supabase.from(table).delete().eq('id', id);
    table === 'links' ? await fetchLinks() : await fetchSocials();
    setLoading(false);
  };

  const sortedCategories = useMemo(() => {
    const found = Array.from(new Set(links.map(l => (l.category || 'Página 1').trim())));
    if (found.length === 0) return ['Página 1'];
    const order = pagesOrder.filter(c => found.includes(c));
    found.forEach(c => { if (!order.includes(c)) order.push(c); });
    return order;
  }, [links, pagesOrder]);

  const updateExtraPage = (key: 'bonusaleatorio' | 'cinco_bonus', field: keyof ExtraPageConfig, value: string) => {
    setBrand(prev => ({
      ...prev,
      extraPages: {
        ...prev.extraPages,
        [key]: {
          ...prev.extraPages?.[key],
          [field]: value
        }
      }
    }));
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-10 bg-[#050505] min-h-screen text-white pb-32 font-sans">
      {loading && <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center font-black uppercase text-yellow-500 tracking-widest animate-pulse">Sincronizando...</div>}
      
      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-2xl font-black text-shimmer uppercase italic tracking-tighter">CONTROLE MASTER 3.5</h2>
          <p className="text-[9px] text-gray-500 uppercase font-black">Gerencie suas páginas especiais e links</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { supabase.auth.signOut(); window.location.hash = '#/'; window.location.reload(); }} className="px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase">Sair</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-12">
        {(['links', 'social', 'brand'] as const).map(m => (
          <button key={m} onClick={() => setActiveMenu(m)} className={`py-5 rounded-[1.8rem] text-[10px] font-black uppercase border transition-all ${activeMenu === m ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg' : 'bg-white/5 text-gray-400 border-white/5'}`}>
            {m === 'links' ? '🎰 Meus Links' : m === 'social' ? '📱 Social' : '🎨 Estilo Site'}
          </button>
        ))}
      </div>

      {activeMenu === 'brand' && (
        <form onSubmit={handleSaveBrand} className="space-y-8 animate-fade-in">
          <div className="flex flex-wrap gap-2">
             <button type="button" onClick={() => setActiveBrandTab('geral')} className={`flex-1 py-4 rounded-2xl text-[8px] font-black uppercase border transition-all ${activeBrandTab === 'geral' ? 'bg-yellow-500 border-yellow-500 text-black' : 'bg-white/5 border-white/5 text-gray-500'}`}>Principal</button>
             <button type="button" onClick={() => setActiveBrandTab('roleta')} className={`flex-1 py-4 rounded-2xl text-[8px] font-black uppercase border transition-all ${activeBrandTab === 'roleta' ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white/5 border-white/5 text-gray-500'}`}>Roleta</button>
             <button type="button" onClick={() => setActiveBrandTab('bonus')} className={`flex-1 py-4 rounded-2xl text-[8px] font-black uppercase border transition-all ${activeBrandTab === 'bonus' ? 'bg-green-500 border-green-500 text-white' : 'bg-white/5 border-white/5 text-gray-500'}`}>Bônus Surpresa</button>
             <button type="button" onClick={() => setActiveBrandTab('cinco')} className={`flex-1 py-4 rounded-2xl text-[8px] font-black uppercase border transition-all ${activeBrandTab === 'cinco' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-gray-500'}`}>R$ 5 de Bônus</button>
          </div>

          <div className="bg-[#0f0f0f] p-8 rounded-[3rem] border border-white/5 space-y-8">
            {activeBrandTab === 'geral' && (
              <div className="space-y-8 animate-fade-in">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="p-6 bg-black rounded-[2rem] border border-white/5 flex items-center gap-4">
                    <img src={brand.logoUrl} className="w-16 h-16 rounded-full object-cover border-2 border-yellow-500" />
                    <button type="button" onClick={() => logoInputRef.current?.click()} className="flex-1 py-3 bg-white/5 rounded-xl text-[9px] font-black uppercase">Mudar Logo Principal</button>
                    <input type="file" ref={logoInputRef} onChange={e => handleFileUpload(e, 'logo')} className="hidden" />
                  </div>
                  <div className="p-6 bg-black rounded-[2rem] border border-white/5 flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
                      {brand.backgroundUrl ? <img src={brand.backgroundUrl} className="w-full h-full object-cover" /> : <span className="text-[8px] text-gray-500">SEM FUNDO</span>}
                    </div>
                    <button type="button" onClick={() => bgInputRef.current?.click()} className="flex-1 py-3 bg-white/5 rounded-xl text-[9px] font-black uppercase">Fundo do Site</button>
                    <input type="file" ref={bgInputRef} onChange={e => handleFileUpload(e, 'bg')} className="hidden" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Nome da Marca</label><input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm focus:border-yellow-500" value={brand.name} onChange={e => setBrand({...brand, name: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Slogan Principal</label><input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm focus:border-yellow-500" value={brand.tagline} onChange={e => setBrand({...brand, tagline: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Efeito Principal</label><select className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm" value={brand.effect} onChange={e => setBrand({...brand, effect: e.target.value as any})}><option value="scanner">Scanner Gold</option><option value="gold-rain">Chuva de Ouro</option><option value="matrix">Matrix</option><option value="fire">Fire Ember</option><option value="money">Money Rain</option><option value="space">Space Stars</option><option value="aurora">Aurora</option><option value="glitch">Glitch</option><option value="confetti">Confetti</option><option value="snow">Snow</option><option value="lightning">Lightning</option><option value="none">Nenhum</option></select></div>
                </div>
              </div>
            )}

            {activeBrandTab === 'roleta' && (
              <div className="space-y-8 animate-fade-in">
                <div className="p-6 bg-black rounded-[2rem] border border-white/5 flex items-center gap-4">
                  <img src={brand.roletaLogoUrl || brand.logoUrl} className="w-16 h-16 rounded-full object-cover border-2 border-purple-500" />
                  <button type="button" onClick={() => roletaLogoInputRef.current?.click()} className="flex-1 py-3 bg-white/5 rounded-xl text-[9px] font-black uppercase">Logo da Sala VIP</button>
                  <input type="file" ref={roletaLogoInputRef} onChange={e => handleFileUpload(e, 'roleta_logo')} className="hidden" />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Título Gigante</label><input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm focus:border-purple-500" value={brand.roletaTitle} onChange={e => setBrand({...brand, roletaTitle: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Subtítulo</label><input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm focus:border-purple-500" value={brand.roletaTagline} onChange={e => setBrand({...brand, roletaTagline: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Texto do Selo (Badge)</label><input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm focus:border-purple-500" value={brand.roletaBadgeText} onChange={e => setBrand({...brand, roletaBadgeText: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Efeito</label><select className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm" value={brand.roletaEffect} onChange={e => setBrand({...brand, roletaEffect: e.target.value})}><option value="scanner">Scanner Roxo</option><option value="aurora">Aurora</option><option value="money">Dinheiro</option><option value="none">Nenhum</option></select></div>
                </div>
              </div>
            )}

            {activeBrandTab === 'bonus' && (
              <div className="space-y-8 animate-fade-in">
                <h3 className="text-sm font-black text-green-500 uppercase">Página: Bônus Surpresa</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Título</label><input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm focus:border-green-500" value={brand.extraPages?.bonusaleatorio?.title} onChange={e => updateExtraPage('bonusaleatorio', 'title', e.target.value)} /></div>
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Subtítulo</label><input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm focus:border-green-500" value={brand.extraPages?.bonusaleatorio?.tagline} onChange={e => updateExtraPage('bonusaleatorio', 'tagline', e.target.value)} /></div>
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Badge</label><input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm focus:border-green-500" value={brand.extraPages?.bonusaleatorio?.badge} onChange={e => updateExtraPage('bonusaleatorio', 'badge', e.target.value)} /></div>
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Efeito</label><select className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm" value={brand.extraPages?.bonusaleatorio?.effect} onChange={e => updateExtraPage('bonusaleatorio', 'effect', e.target.value)}><option value="money">Chuva de Dinheiro</option><option value="gold-rain">Chuva de Ouro</option><option value="confetti">Confetti</option></select></div>
                </div>
              </div>
            )}

            {activeBrandTab === 'cinco' && (
              <div className="space-y-8 animate-fade-in">
                <h3 className="text-sm font-black text-blue-500 uppercase">Página: R$ 5 de Bônus</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Título</label><input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm focus:border-blue-500" value={brand.extraPages?.cinco_bonus?.title} onChange={e => updateExtraPage('cinco_bonus', 'title', e.target.value)} /></div>
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Subtítulo</label><input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm focus:border-blue-500" value={brand.extraPages?.cinco_bonus?.tagline} onChange={e => updateExtraPage('cinco_bonus', 'tagline', e.target.value)} /></div>
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Badge</label><input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm focus:border-blue-500" value={brand.extraPages?.cinco_bonus?.badge} onChange={e => updateExtraPage('cinco_bonus', 'badge', e.target.value)} /></div>
                  <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Efeito</label><select className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm" value={brand.extraPages?.cinco_bonus?.effect} onChange={e => updateExtraPage('cinco_bonus', 'effect', e.target.value)}><option value="scanner">Scanner</option><option value="lightning">Raios</option><option value="space">Espaço</option></select></div>
                </div>
              </div>
            )}

            <button type="submit" className="w-full py-6 bg-yellow-500 text-black font-black rounded-3xl uppercase text-xs shadow-2xl hover:scale-[1.01] transition-all">Salvar Tudo</button>
          </div>
        </form>
      )}

      {activeMenu === 'links' && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-wrap gap-2 p-4 bg-white/5 border border-white/5 rounded-[2.5rem] items-center">
            {sortedCategories.map((c, i) => (
              <div key={c} className={`flex items-center rounded-full border border-white/10 overflow-hidden ${activeAdminPage === c ? 'bg-white text-black' : 'bg-black/40 text-gray-400'}`}>
                <button onClick={() => setActiveAdminPage(c)} className="px-6 py-3 text-[9px] font-black uppercase">{c}</button>
                <button onClick={() => moveCategory(c, 'left')} className="px-3 border-l border-white/10 hover:text-yellow-500 text-xs">←</button>
                <button onClick={() => moveCategory(c, 'right')} className="px-3 border-l border-white/10 hover:text-yellow-500 text-xs">→</button>
              </div>
            ))}
            <button onClick={() => { const n = prompt("Nome da Página (EX: Bonus Aleatorio):"); if(n) setActiveAdminPage(n.trim()); }} className="px-4 py-3 text-yellow-500 text-[9px] font-black uppercase tracking-widest">+ Página</button>
          </div>
          <button onClick={() => setEditingLink({ category: activeAdminPage, type: 'glass', icon: 'auto' })} className="w-full py-6 bg-yellow-500 text-black font-black rounded-3xl uppercase text-xs shadow-2xl tracking-widest">+ Novo Link em "{activeAdminPage}"</button>
          <div className="space-y-4">
            {links.filter(l => (l.category || 'Página 1').trim() === activeAdminPage.trim()).sort((a,b) => a.position - b.position).map((l, i) => (
              <div key={l.id} className="bg-[#0f0f0f] p-5 rounded-[2rem] flex items-center justify-between border border-white/5 group">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-[7px] text-gray-500 font-black">POS</span>
                    <input type="number" defaultValue={i+1} onBlur={e => jumpToPosition(l.id!, parseInt(e.target.value))} className="w-10 h-10 bg-black border border-white/10 rounded-lg text-center text-xs font-black" />
                  </div>
                  <div className="w-12 h-12 bg-black rounded-xl border border-white/10 flex items-center justify-center text-yellow-500">{Icons[l.icon || 'slots'] || Icons.slots}</div>
                  <div>
                    <h4 className="font-bold text-sm uppercase flex items-center gap-2">{l.title}{l.badge && <span className="text-[7px] bg-yellow-500 text-black px-1 py-0.5 rounded">{l.badge}</span>}</h4>
                    <p className="text-[8px] text-gray-500 uppercase">{l.click_count || 0} CLIQUES</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingLink(l)} className="p-3 bg-white/5 rounded-xl hover:bg-white/10">⚙️</button>
                  <button onClick={() => handleDelete('links', l.id!)} className="p-3 bg-red-500/10 text-red-500 rounded-xl">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeMenu === 'social' && (
        <div className="space-y-6 animate-fade-in">
          <button onClick={() => setEditingSocial({ name: '', url: '', icon: 'instagram' })} className="w-full py-6 bg-yellow-500 text-black font-black rounded-3xl uppercase text-xs shadow-2xl">+ Social</button>
          <div className="grid grid-cols-1 gap-4">
            {socials.map(s => (
              <div key={s.id} className="bg-[#0f0f0f] p-5 rounded-[2rem] flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-xl border border-white/10 flex items-center justify-center">{Icons[s.icon] || s.name.charAt(0)}</div>
                  <h4 className="font-bold text-sm uppercase">{s.name}</h4>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingSocial(s)} className="p-3 bg-white/5 rounded-xl hover:bg-white/10">⚙️</button>
                  <button onClick={() => handleDelete('social_links', s.id!)} className="p-3 bg-red-500/10 text-red-500 rounded-xl">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingLink && (
        <div className="fixed inset-0 bg-black/95 z-[10000] flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <form onSubmit={handleSaveLink} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] w-full max-w-xl space-y-5 shadow-2xl my-auto">
            <h3 className="text-xl font-black uppercase text-yellow-500 italic mb-4">Configurar Link</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Título</label><input className="w-full bg-black p-4 rounded-xl text-sm border border-white/10 focus:border-yellow-500 outline-none" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} required /></div>
              <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Página/Categoria</label><input className="w-full bg-black p-4 rounded-xl text-sm border border-white/10 focus:border-yellow-500 outline-none" value={editingLink.category || ''} onChange={e => setEditingLink({...editingLink, category: e.target.value})} required /></div>
            </div>
            <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">Subtítulo</label><input className="w-full bg-black p-4 rounded-xl text-sm border border-white/10 focus:border-yellow-500 outline-none" value={editingLink.description || ''} onChange={e => setEditingLink({...editingLink, description: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500 ml-1">URL</label><input className="w-full bg-black p-4 rounded-xl text-sm border border-white/10 focus:border-yellow-500 outline-none" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} required /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500">Estilo</label><select className="w-full bg-black p-4 rounded-xl text-xs border border-white/10" value={editingLink.type} onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}><option value="glass">Glass</option><option value="gold">Gold</option><option value="neon-purple">Roxo</option><option value="neon-green">Verde</option></select></div>
              <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500">Ícone</label><select className="w-full bg-black p-4 rounded-xl text-xs border border-white/10" value={editingLink.icon} onChange={e => setEditingLink({...editingLink, icon: e.target.value})}><option value="auto">Auto</option>{Object.keys(Icons).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500">Selo</label><input className="w-full bg-black p-4 rounded-xl text-xs border border-white/10" value={editingLink.badge || ''} onChange={e => setEditingLink({...editingLink, badge: e.target.value.toUpperCase()})} placeholder="Opcional" /></div>
            </div>
            <div className="flex gap-3 pt-6 border-t border-white/5"><button type="button" onClick={() => setEditingLink(null)} className="flex-1 py-4 bg-white/5 rounded-2xl font-black uppercase text-[10px]">Cancelar</button><button type="submit" className="flex-[2] py-4 bg-yellow-500 text-black rounded-2xl font-black uppercase text-[10px]">Salvar</button></div>
          </form>
        </div>
      )}

      {editingSocial && (
        <div className="fixed inset-0 bg-black/95 z-[10000] flex items-center justify-center p-4">
          <form onSubmit={e => { e.preventDefault(); setLoading(true); const p = {...editingSocial}; delete (p as any).id; if(editingSocial.id) supabase.from('social_links').update(p).eq('id', editingSocial.id).then(()=>fetchSocials().then(()=>setEditingSocial(null))); else supabase.from('social_links').insert([p]).then(()=>fetchSocials().then(()=>setEditingSocial(null))); setLoading(false); }} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] w-full max-w-md space-y-5 shadow-2xl">
            <h3 className="text-xl font-black uppercase text-yellow-500 italic">Rede Social</h3>
            <input className="w-full bg-black p-4 rounded-xl border border-white/10" placeholder="Nome" value={editingSocial.name || ''} onChange={e => setEditingSocial({...editingSocial, name: e.target.value})} required />
            <input className="w-full bg-black p-4 rounded-xl border border-white/10" placeholder="URL Perfil" value={editingSocial.url || ''} onChange={e => setEditingSocial({...editingSocial, url: e.target.value})} required />
            <select className="w-full bg-black p-4 rounded-xl border border-white/10" value={editingSocial.icon} onChange={e => setEditingSocial({...editingSocial, icon: e.target.value})}><option value="instagram">Instagram</option><option value="telegram">Telegram</option><option value="whatsapp">WhatsApp</option><option value="twitter">X (Twitter)</option><option value="youtube">YouTube</option></select>
            <div className="flex gap-3 pt-4"><button type="button" onClick={() => setEditingSocial(null)} className="flex-1 py-4 bg-white/5 rounded-2xl font-black uppercase text-[10px]">Cancelar</button><button type="submit" className="flex-[2] py-4 bg-yellow-500 text-black rounded-2xl font-black uppercase text-[10px]">Salvar</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
