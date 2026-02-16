
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CasinoLink, CasinoBrand, SocialLink, ExtraPageConfig } from '../types';
import { Icons, BRAND as DEFAULT_BRAND } from '../constants';

const AdminPanel: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<'links' | 'social' | 'brand'>('links');
  const [activeBrandTab, setActiveBrandTab] = useState<'geral' | 'roleta' | 'bonus'>('geral');
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
  const [loading, setLoading] = useState(false);
  const [activeAdminPage, setActiveAdminPage] = useState<string>('Página 1');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const roletaLogoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initAdmin = async () => {
      setLoading(true);
      await Promise.all([fetchBrand(), fetchLinks(), fetchSocials()]);
      setLoading(false);
    };
    initAdmin();
  }, []);

  const fetchBrand = async () => {
    const { data } = await supabase.from('brand_settings').select('*').eq('id', 1).single();
    if (data) {
      let extraPages = brand.extraPages;
      if (data.footer_text?.includes('EXTRAS:')) {
        try {
          const extraPart = data.footer_text.split('EXTRAS:')[1].split('ORDER:')[0];
          extraPages = JSON.parse(extraPart);
        } catch(e) {}
      }
      setBrand({ ...data, extraPages, 
        roletaTitle: data.roleta_title, roletaTagline: data.roleta_tagline, 
        roletaLogoUrl: data.roleta_logo_url, roletaEffect: data.roleta_effect, 
        roletaBadgeText: data.roleta_badge_text, logoUrl: data.logo_url, backgroundUrl: data.background_url
      });
    }
  };

  const fetchLinks = async () => {
    const { data } = await supabase.from('links').select('*').order('position', { ascending: true });
    if (data) setLinks(data as CasinoLink[]);
  };

  const fetchSocials = async () => {
    const { data } = await supabase.from('social_links').select('*').order('position', { ascending: true });
    if (data) setSocials(data as SocialLink[]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'roleta_logo' | 'bg') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      if (type === 'logo') setBrand(prev => ({ ...prev, logoUrl: base64 }));
      else if (type === 'roleta_logo') setBrand(prev => ({ ...prev, roletaLogoUrl: base64 }));
      else setBrand(prev => ({ ...prev, backgroundUrl: base64 }));
    };
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const footerClean = brand.footerText?.split('EXTRAS:')[0] || '';
    const finalFooter = `${footerClean}EXTRAS:${JSON.stringify(brand.extraPages)}`;
    
    await supabase.from('brand_settings').update({
      name: brand.name, tagline: brand.tagline, logo_url: brand.logoUrl,
      background_url: brand.backgroundUrl, verified: brand.verified,
      footer_text: finalFooter, effect: brand.effect,
      roleta_title: brand.roletaTitle, roleta_tagline: brand.roletaTagline,
      roleta_logo_url: brand.roletaLogoUrl, roleta_effect: brand.roletaEffect,
      roleta_badge_text: brand.roletaBadgeText
    }).eq('id', 1);
    alert("Alterações salvas com sucesso!");
    setLoading(false);
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;
    setLoading(true);
    const payload = { ...editingLink, category: activeAdminPage, position: editingLink.position || links.length };
    delete (payload as any).created_at; delete (payload as any).click_count;
    
    if (editingLink.id) await supabase.from('links').update(payload).eq('id', editingLink.id);
    else await supabase.from('links').insert([payload]);
    
    setEditingLink(null);
    await fetchLinks();
    setLoading(false);
  };

  const sortedCategories = useMemo(() => {
    const found = Array.from(new Set(links.map(l => (l.category || 'Página 1').trim())));
    return found.length > 0 ? found : ['Página 1'];
  }, [links]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-10 bg-[#050505] min-h-screen text-white pb-32 font-sans">
      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
        <div><h2 className="text-2xl font-black text-shimmer uppercase italic tracking-tighter">PAINEL MASTER 4.0</h2><p className="text-[9px] text-gray-500 uppercase font-black">Sistema Sincronizado (SPA)</p></div>
        <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} className="px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase">Sair</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-12">
        {(['links', 'social', 'brand'] as const).map(m => (
          <button key={m} onClick={() => setActiveMenu(m)} className={`py-5 rounded-[1.8rem] text-[10px] font-black uppercase border transition-all ${activeMenu === m ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg' : 'bg-white/5 text-gray-400 border-white/5'}`}>
            {m === 'links' ? '🎰 Links' : m === 'social' ? '📱 Redes' : '🎨 Estilo'}
          </button>
        ))}
      </div>

      {activeMenu === 'brand' && (
        <form onSubmit={handleSaveBrand} className="space-y-8 animate-fade-in">
          <div className="flex gap-2">
             {['geral', 'roleta', 'bonus'].map((t) => (
                <button key={t} type="button" onClick={() => setActiveBrandTab(t as any)} className={`flex-1 py-4 rounded-2xl text-[8px] font-black uppercase border transition-all ${activeBrandTab === t ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-gray-500'}`}>{t}</button>
             ))}
          </div>

          <div className="bg-[#0f0f0f] p-8 rounded-[3rem] border border-white/5 space-y-6">
            {activeBrandTab === 'geral' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => logoInputRef.current?.click()} className="p-4 bg-black border border-white/10 rounded-2xl text-[8px] font-black uppercase">Alterar Logo Principal</button>
                  <button type="button" onClick={() => bgInputRef.current?.click()} className="p-4 bg-black border border-white/10 rounded-2xl text-[8px] font-black uppercase">Alterar Fundo (BG)</button>
                  <input type="file" ref={logoInputRef} onChange={e => handleFileUpload(e, 'logo')} className="hidden" />
                  <input type="file" ref={bgInputRef} onChange={e => handleFileUpload(e, 'bg')} className="hidden" />
                </div>
                <input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm" value={brand.name} onChange={e => setBrand({...brand, name: e.target.value})} placeholder="Nome do Site" />
                <input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm" value={brand.tagline} onChange={e => setBrand({...brand, tagline: e.target.value})} placeholder="Slogan" />
                <select className="w-full bg-black p-5 rounded-2xl border border-white/10 text-sm" value={brand.effect} onChange={e => setBrand({...brand, effect: e.target.value as any})}><option value="scanner">Scanner</option><option value="money">Dinheiro</option><option value="gold-rain">Chuva de Ouro</option><option value="aurora">Aurora</option><option value="none">Nenhum</option></select>
              </div>
            )}

            {activeBrandTab === 'roleta' && (
              <div className="space-y-6">
                <button type="button" onClick={() => roletaLogoInputRef.current?.click()} className="w-full p-4 bg-black border border-white/10 rounded-2xl text-[8px] font-black uppercase">Alterar Logo da Roleta</button>
                <input type="file" ref={roletaLogoInputRef} onChange={e => handleFileUpload(e, 'roleta_logo')} className="hidden" />
                <input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm" value={brand.roletaTitle} onChange={e => setBrand({...brand, roletaTitle: e.target.value})} placeholder="Título da Roleta" />
                <input className="w-full bg-black p-5 rounded-2xl border border-white/10 outline-none text-sm" value={brand.roletaTagline} onChange={e => setBrand({...brand, roletaTagline: e.target.value})} placeholder="Subtítulo" />
                <select className="w-full bg-black p-5 rounded-2xl border border-white/10 text-sm" value={brand.roletaEffect} onChange={e => setBrand({...brand, roletaEffect: e.target.value})}><option value="scanner">Scanner</option><option value="money">Dinheiro</option><option value="gold-rain">Chuva de Ouro</option></select>
              </div>
            )}

            <button type="submit" className="w-full py-6 bg-yellow-500 text-black font-black rounded-3xl uppercase text-xs shadow-2xl">Salvar Configurações</button>
          </div>
        </form>
      )}

      {activeMenu === 'links' && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-wrap gap-2 p-4 bg-white/5 border border-white/5 rounded-[2.5rem]">
            {sortedCategories.map((c) => (
              <button key={c} onClick={() => setActiveAdminPage(c)} className={`px-6 py-3 text-[9px] font-black uppercase rounded-full border transition-all ${activeAdminPage === c ? 'bg-white text-black border-white' : 'bg-black/40 text-gray-400 border-white/10'}`}>{c}</button>
            ))}
            <button onClick={() => { const n = prompt("Nome da nova página:"); if(n) setActiveAdminPage(n); }} className="px-4 py-3 text-yellow-500 text-[9px] font-black uppercase">+ Criar Página</button>
          </div>
          
          <button onClick={() => setEditingLink({ category: activeAdminPage, type: 'glass', icon: 'auto' })} className="w-full py-6 bg-yellow-500 text-black font-black rounded-3xl uppercase text-xs shadow-2xl">+ Novo Link em "{activeAdminPage}"</button>
          
          <div className="space-y-4">
            {links.filter(l => (l.category || 'Página 1') === activeAdminPage).map((l) => (
              <div key={l.id} className="bg-[#0f0f0f] p-5 rounded-[2.2rem] flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-xl border border-white/10 flex items-center justify-center text-yellow-500">{Icons[l.icon || 'slots'] || Icons.slots}</div>
                  <div><h4 className="font-bold text-sm uppercase">{l.title}</h4><p className="text-[8px] text-gray-500 uppercase">{l.click_count || 0} Cliques</p></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingLink(l)} className="p-3 bg-white/5 rounded-xl hover:bg-white/10">⚙️</button>
                  <button onClick={async () => { if(confirm("Excluir link?")) { await supabase.from('links').delete().eq('id', l.id); fetchLinks(); } }} className="p-3 bg-red-500/10 text-red-500 rounded-xl">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingLink && (
        <div className="fixed inset-0 bg-black/95 z-[10000] flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleSaveLink} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] w-full max-w-xl space-y-5">
            <h3 className="text-xl font-black uppercase text-yellow-500 italic">Configurar Link</h3>
            <input className="w-full bg-black p-4 rounded-xl border border-white/10 outline-none" placeholder="Título" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} required />
            <input className="w-full bg-black p-4 rounded-xl border border-white/10 outline-none" placeholder="URL de Destino" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} required />
            <div className="grid grid-cols-2 gap-4">
               <select className="w-full bg-black p-4 rounded-xl border border-white/10 text-xs" value={editingLink.type} onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}><option value="glass">Glass</option><option value="gold">Gold (VIP)</option><option value="neon-purple">Roxo Neon</option><option value="neon-green">Verde Neon</option></select>
               <input className="w-full bg-black p-4 rounded-xl border border-white/10 text-xs" placeholder="Badge (Ex: NOVO)" value={editingLink.badge || ''} onChange={e => setEditingLink({...editingLink, badge: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-6"><button type="button" onClick={() => setEditingLink(null)} className="flex-1 py-4 bg-white/5 rounded-2xl font-black uppercase text-[10px]">Cancelar</button><button type="submit" className="flex-[2] py-4 bg-yellow-500 text-black rounded-2xl font-black uppercase text-[10px]">Salvar Link</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
