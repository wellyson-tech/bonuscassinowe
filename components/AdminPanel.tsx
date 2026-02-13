
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
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
      alert("Arquivo muito grande! Escolha uma imagem de até 1.5MB.");
      return;
    }

    setLoading(true);
    try {
      const base64 = await convertFileToBase64(file);
      if (type === 'logo') setBrand(prev => ({ ...prev, logoUrl: base64 }));
      else setBrand(prev => ({ ...prev, backgroundUrl: base64 }));
      showToast("Imagem processada com sucesso!");
    } catch (error: any) {
      showToast('Erro ao processar imagem', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinks = async (targetPageToSet?: string) => {
    try {
      const { data } = await supabase.from('links').select('*').order('position', { ascending: true }) as { data: CasinoLink[] | null };
      if (data) {
        setLinks(data);
        const foundCategories: string[] = Array.from(new Set(data.map(l => (((l.category as string) || 'Página 1').trim()))));
        if (targetPageToSet) setActiveAdminPage(targetPageToSet);
        else if (!activeAdminPage) {
          const matchedPage = pagesOrder.find(p => foundCategories.includes(p));
          const firstValid: string = matchedPage || foundCategories[0] || 'Página 1';
          setActiveAdminPage(firstValid);
        }
      }
    } catch (e) {}
  };

  const fetchSocials = async () => {
    const { data } = await supabase.from('social_links').select('*').order('position', { ascending: true });
    if (data) setSocials(data);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const baseText = brand.footerText?.split('ORDER:')[0] || '';
      const finalFooter = pagesOrder.length > 0 ? `${baseText}ORDER:${JSON.stringify(pagesOrder)}` : baseText;
      await supabase.from('brand_settings').update({
        name: brand.name, tagline: brand.tagline, logo_url: brand.logoUrl,
        background_url: brand.backgroundUrl, verified: brand.verified,
        footer_text: finalFooter, effect: brand.effect
      }).eq('id', 1);
      showToast("Configurações master salvas! ✅");
    } catch (err) { showToast("Erro ao salvar", "error"); } finally { setLoading(false); }
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;
    setLoading(true);
    try {
      const targetCategory = (editingLink.category || activeAdminPage || 'Página 1').trim();
      const payload = {
        title: editingLink.title, description: editingLink.description || 'SALA VIP ATIVA',
        url: editingLink.url, type: editingLink.type || 'glass',
        icon: editingLink.icon || 'auto', badge: editingLink.badge || '',
        category: targetCategory, position: editingLink.id ? editingLink.position : links.length + 1,
        is_highlighted: editingLink.is_highlighted ?? false,
        is_verified: editingLink.is_verified ?? false
      };
      if (editingLink.id) await supabase.from('links').update(payload).eq('id', editingLink.id);
      else await supabase.from('links').insert([payload]);
      setEditingLink(null);
      await fetchLinks(targetCategory);
      showToast("Link atualizado e verificado! ✅");
    } catch (err) { showToast("Erro ao salvar link", "error"); } finally { setLoading(false); }
  };

  const handleSaveSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSocial) return;
    setLoading(true);
    try {
      const payload = {
        name: editingSocial.name, url: editingSocial.url, icon: editingSocial.icon || 'instagram',
        position: editingSocial.id ? editingSocial.position : socials.length + 1
      };
      if (editingSocial.id) await supabase.from('social_links').update(payload).eq('id', editingSocial.id);
      else await supabase.from('social_links').insert([payload]);
      setEditingSocial(null);
      await fetchSocials();
      showToast("Rede social atualizada! ✅");
    } catch (err) { showToast("Erro ao salvar", "error"); } finally { setLoading(false); }
  };

  const handleDelete = async (table: 'links' | 'social_links', id: string) => {
    if (!confirm("Excluir permanentemente?")) return;
    setLoading(true);
    try {
      await supabase.from(table).delete().eq('id', id);
      table === 'links' ? await fetchLinks() : await fetchSocials();
      showToast("Item excluído com sucesso.");
    } catch (err) { showToast("Erro ao excluir", "error"); } finally { setLoading(false); }
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
      {/* TOAST DE SUCESSO */}
      {toast && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[10000] px-8 py-4 rounded-2xl shadow-2xl animate-fade-in-up flex items-center gap-3 border ${
          toast.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'
        }`}>
          <div className="w-5 h-5 flex items-center justify-center bg-current rounded-full">
            <svg className="w-3 h-3 text-black fill-current" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>
          </div>
          <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      )}

      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-2xl font-black text-shimmer uppercase italic tracking-tighter">CENTRAL DE CONTROLE</h2>
          <p className="text-[9px] text-gray-500 uppercase font-black mt-1 tracking-widest">Painel Administrativo v3.5</p>
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
              <div className="space-y-4">
                <label className="text-[10px] uppercase font-black text-gray-500 flex items-center gap-2">Avatar / Logo Master</label>
                <div className="flex items-center gap-6 bg-black/40 p-5 rounded-[2rem] border border-white/5">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-yellow-500/30 bg-black flex-shrink-0 shadow-xl">
                    <img src={brand.logoUrl} className="w-full h-full object-cover" alt="Preview" />
                  </div>
                  <div className="flex-grow space-y-2">
                    <input type="file" ref={logoInputRef} onChange={(e) => handleFileUpload(e, 'logo')} className="hidden" accept="image/*" />
                    <button type="button" onClick={() => logoInputRef.current?.click()} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase border border-white/10 transition-all">Alterar Imagem</button>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] uppercase font-black text-gray-500 flex items-center gap-2">Background da Página</label>
                <div className="flex items-center gap-6 bg-black/40 p-5 rounded-[2rem] border border-white/5">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10 bg-black flex-shrink-0 shadow-xl relative">
                    {brand.backgroundUrl && <img src={brand.backgroundUrl} className="w-full h-full object-cover" alt="BG Preview" />}
                  </div>
                  <div className="flex-grow space-y-2">
                    <input type="file" ref={bgInputRef} onChange={(e) => handleFileUpload(e, 'bg')} className="hidden" accept="image/*" />
                    <button type="button" onClick={() => bgInputRef.current?.click()} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase border border-white/10 transition-all">Enviar Fundo</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input className="w-full p-5 rounded-2xl bg-black border border-white/10 text-white text-sm focus:border-yellow-500 outline-none" placeholder="Nome" value={brand.name} onChange={e => setBrand({...brand, name: e.target.value})} required />
              <input className="w-full p-5 rounded-2xl bg-black border border-white/10 text-white text-sm focus:border-yellow-500 outline-none" placeholder="Slogan" value={brand.tagline} onChange={e => setBrand({...brand, tagline: e.target.value})} required />
            </div>

            <button type="submit" className="w-full py-6 bg-yellow-500 text-black font-black rounded-[2.5rem] uppercase text-xs shadow-2xl hover:scale-[1.01] transition-all">Salvar Tudo com Sucesso</button>
          </form>
        </div>
      )}

      {activeMenu === 'links' && (
        <div className="animate-fade-in space-y-8">
          <div className="flex flex-wrap gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-[2.2rem]">
            {sortedCategories.map((cat) => (
              <button key={cat} onClick={() => setActiveAdminPage(cat)} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-full ${activeAdminPage.trim() === cat.trim() ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>
                {cat}
              </button>
            ))}
          </div>

          <button onClick={() => setEditingLink({ category: activeAdminPage.trim(), type: 'glass', icon: 'auto', is_highlighted: false, is_verified: true })} className="w-full py-6 bg-yellow-500 text-black font-black rounded-[2.5rem] uppercase text-xs shadow-2xl">+ Novo Link Verificado</button>

          <div className="space-y-4">
            {filteredLinks.map((link) => (
              <div key={link.id} className="bg-[#0f0f0f] p-5 rounded-[2rem] flex items-center justify-between border border-white/5 group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10 text-white">{Icons[link.icon || 'slots']}</div>
                  <div>
                    <h4 className="font-bold text-sm uppercase flex items-center gap-2">
                      {link.title}
                      <span className="flex items-center gap-1 text-[8px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                         <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>
                         ONLINE
                      </span>
                    </h4>
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
          <form onSubmit={handleSaveLink} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] w-full max-w-xl my-auto space-y-5">
            <h3 className="text-xl font-black uppercase text-shimmer italic">Editar Link</h3>
            <div className="grid grid-cols-2 gap-4">
              <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none" placeholder="Título" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} required />
              <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none" placeholder="Página" value={editingLink.category || ''} onChange={e => setEditingLink({...editingLink, category: e.target.value})} required />
            </div>
            <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10 text-white outline-none" placeholder="URL" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} required />
            
            <div className="flex flex-col gap-3 p-5 bg-black rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="v-link-check" checked={editingLink.is_verified} onChange={e => setEditingLink({...editingLink, is_verified: e.target.checked})} className="w-5 h-5 accent-green-500" />
                <label htmlFor="v-link-check" className="text-[10px] font-black uppercase text-green-500">Exibir Selo de Verificação (Certinho Verde)</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="h-link-check" checked={editingLink.is_highlighted} onChange={e => setEditingLink({...editingLink, is_highlighted: e.target.checked})} className="w-5 h-5 accent-yellow-500" />
                <label htmlFor="h-link-check" className="text-[10px] font-black uppercase text-gray-400">Destacar este link</label>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setEditingLink(null)} className="flex-1 py-4 bg-white/5 rounded-2xl uppercase font-black text-[10px]">Sair</button>
              <button type="submit" className="flex-[2] py-4 bg-yellow-500 text-black rounded-2xl uppercase font-black text-[10px]">Concluir Edição ✅</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
