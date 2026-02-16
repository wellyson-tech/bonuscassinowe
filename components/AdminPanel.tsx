
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CasinoLink, CasinoBrand, SocialLink, ExtraPageConfig } from '../types';
import { Icons, BRAND as DEFAULT_BRAND } from '../constants';

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
        setBrand({ ...data, extraPages, 
          roletaTitle: data.roleta_title, roletaTagline: data.roleta_tagline, 
          roletaLogoUrl: data.roleta_logo_url, roletaEffect: data.roleta_effect, 
          roletaBadgeText: data.roleta_badge_text, logoUrl: data.logo_url, backgroundUrl: data.background_url
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

  const handleLogout = () => {
    supabase.auth.signOut();
    try {
      window.history.pushState({}, '', '/');
    } catch (e) {}
    window.location.reload();
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const base = brand.footerText?.split('EXTRAS:')[0]?.split('ORDER:')[0] || '';
    const extrasStr = `EXTRAS:${JSON.stringify(brand.extraPages)}`;
    const finalFooter = `${base}${extrasStr}ORDER:${JSON.stringify(pagesOrder)}`;
    
    await supabase.from('brand_settings').update({
      name: brand.name, tagline: brand.tagline, logo_url: brand.logoUrl,
      background_url: brand.backgroundUrl, verified: brand.verified,
      footer_text: finalFooter, effect: brand.effect,
      roleta_title: brand.roletaTitle, roleta_tagline: brand.roletaTagline,
      roleta_logo_url: brand.roletaLogoUrl, roleta_effect: brand.roletaEffect,
      roleta_badge_text: brand.roletaBadgeText
    }).eq('id', 1);
    alert("Salvo com sucesso!");
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

  const sortedCategories = useMemo(() => {
    const found = Array.from(new Set(links.map(l => (l.category || 'Página 1').trim())));
    if (found.length === 0) return ['Página 1'];
    const order = pagesOrder.filter(c => found.includes(c));
    found.forEach(c => { if (!order.includes(c)) order.push(c); });
    return order;
  }, [links, pagesOrder]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-10 bg-[#050505] min-h-screen text-white pb-32 font-sans">
      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
        <div><h2 className="text-2xl font-black text-shimmer uppercase italic tracking-tighter">PAINEL MASTER</h2><p className="text-[9px] text-gray-500 uppercase font-black">Sincronizado com Vercel Path Routing</p></div>
        <button onClick={handleLogout} className="px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase">Sair</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-12">
        {(['links', 'social', 'brand'] as const).map(m => (
          <button key={m} onClick={() => setActiveMenu(m)} className={`py-5 rounded-[1.8rem] text-[10px] font-black uppercase border transition-all ${activeMenu === m ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg' : 'bg-white/5 text-gray-400 border-white/5'}`}>
            {m === 'links' ? '🎰 Links' : m === 'social' ? '📱 Social' : '🎨 Estilo'}
          </button>
        ))}
      </div>

      {activeMenu === 'brand' && (
        <form onSubmit={handleSaveBrand} className="space-y-8">
          <div className="bg-[#0f0f0f] p-8 rounded-[3rem] border border-white/5 space-y-8">
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500">Nome Marca</label><input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm focus:border-yellow-500" value={brand.name} onChange={e => setBrand({...brand, name: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[8px] uppercase font-black text-gray-500">Slogan</label><input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm focus:border-yellow-500" value={brand.tagline} onChange={e => setBrand({...brand, tagline: e.target.value})} /></div>
             </div>
             <button type="submit" className="w-full py-6 bg-yellow-500 text-black font-black rounded-3xl uppercase text-xs shadow-2xl">Salvar Alterações</button>
          </div>
        </form>
      )}

      {activeMenu === 'links' && (
        <div className="space-y-8">
          <div className="flex flex-wrap gap-2 p-4 bg-white/5 border border-white/5 rounded-[2.5rem] items-center">
            {sortedCategories.map((c) => (
              <button key={c} onClick={() => setActiveAdminPage(c)} className={`px-6 py-3 text-[9px] font-black uppercase rounded-full border transition-all ${activeAdminPage === c ? 'bg-white text-black border-white' : 'bg-black/40 text-gray-400 border-white/10'}`}>{c}</button>
            ))}
          </div>
          <button onClick={() => setEditingLink({ category: activeAdminPage, type: 'glass', icon: 'auto' })} className="w-full py-6 bg-yellow-500 text-black font-black rounded-3xl uppercase text-xs shadow-2xl tracking-widest">+ Novo Link em "{activeAdminPage}"</button>
          <div className="space-y-4">
            {links.filter(l => (l.category || 'Página 1').trim() === activeAdminPage.trim()).map((l) => (
              <div key={l.id} className="bg-[#0f0f0f] p-5 rounded-[2rem] flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-xl border border-white/10 flex items-center justify-center text-yellow-500">{Icons[l.icon || 'slots'] || Icons.slots}</div>
                  <h4 className="font-bold text-sm uppercase">{l.title}</h4>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingLink(l)} className="p-3 bg-white/5 rounded-xl">⚙️</button>
                  <button onClick={async () => { if(confirm("Excluir?")) { await supabase.from('links').delete().eq('id', l.id); fetchLinks(); } }} className="p-3 bg-red-500/10 text-red-500 rounded-xl">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingLink && (
        <div className="fixed inset-0 bg-black/95 z-[10000] flex items-center justify-center p-4">
          <form onSubmit={handleSaveLink} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] w-full max-w-xl space-y-5">
            <h3 className="text-xl font-black uppercase text-yellow-500 italic">Editar Link</h3>
            <input className="w-full bg-black p-4 rounded-xl border border-white/10" placeholder="Título" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} required />
            <input className="w-full bg-black p-4 rounded-xl border border-white/10" placeholder="URL" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} required />
            <div className="flex gap-3 pt-6"><button type="button" onClick={() => setEditingLink(null)} className="flex-1 py-4 bg-white/5 rounded-2xl font-black uppercase text-[10px]">Cancelar</button><button type="submit" className="flex-[2] py-4 bg-yellow-500 text-black rounded-2xl font-black uppercase text-[10px]">Salvar</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
