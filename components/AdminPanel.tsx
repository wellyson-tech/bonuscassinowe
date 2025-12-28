
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CasinoLink, CasinoBrand, SocialLink } from '../types';
import { Icons, BRAND as DEFAULT_BRAND } from '../constants';

const AdminPanel: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<'links' | 'social' | 'brand'>('links');
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [brand, setBrand] = useState<CasinoBrand>(DEFAULT_BRAND);
  
  const [editingLink, setEditingLink] = useState<Partial<CasinoLink> | null>(null);
  const [editingSocial, setEditingSocial] = useState<Partial<SocialLink> | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
    setRefreshing(true);
    try {
      const { data } = await supabase.from('links').select('*').order('position', { ascending: true });
      if (data) {
        setLinks(data);
        if (data.length > 0 && !activeAdminPage) {
          const cats = Array.from(new Set(data.map(l => l.category || 'Página 1')));
          setActiveAdminPage(cats[0]);
        } else if (!activeAdminPage) setActiveAdminPage('Página 1');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'background') => {
    const file = e.target.files?.[0];
    if (!file) return;
    type === 'logo' ? setUploadingLogo(true) : setUploadingBg(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('brand').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('brand').getPublicUrl(fileName);
      if (type === 'logo') setBrand(prev => ({ ...prev, logoUrl: publicUrl }));
      else setBrand(prev => ({ ...prev, backgroundUrl: publicUrl }));
      alert("Imagem carregada!");
    } catch (err: any) {
      alert("Erro no upload: " + err.message);
    } finally {
      setUploadingLogo(false);
      setUploadingBg(false);
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
      });
      if (error) throw error;
      alert("Identidade salva!");
    } finally {
      setSavingBrand(false);
    }
  };

  const handleSaveSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSocial) return;
    setLoading(true);
    try {
      const payload = {
        name: editingSocial.name || 'Social',
        url: editingSocial.url || '',
        icon: editingSocial.icon || 'instagram',
        position: socials.length
      };
      if (editingSocial.id) await supabase.from('social_links').update(payload).eq('id', editingSocial.id);
      else await supabase.from('social_links').insert([payload]);
      setEditingSocial(null);
      fetchSocials();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;
    setLoading(true);
    try {
      const payload = {
        title: editingLink.title || 'Novo Link',
        description: editingLink.description || 'SAQUE MÍNIMO COM BÔNUS',
        url: editingLink.url || '',
        type: editingLink.type || 'glass',
        icon: editingLink.icon || 'auto',
        badge: editingLink.badge || '',
        category: editingLink.category || activeAdminPage || 'Página 1',
        position: editingLink.position ?? links.length
      };
      if (editingLink.id) await supabase.from('links').update(payload).eq('id', editingLink.id);
      else await supabase.from('links').insert([payload]);
      setEditingLink(null);
      fetchLinks();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (table: string, id: string) => {
    if (!confirm('Excluir este item?')) return;
    await supabase.from(table).delete().eq('id', id);
    table === 'links' ? fetchLinks() : fetchSocials();
  };

  const filteredLinks = useMemo(() => links.filter(l => (l.category || 'Página 1') === activeAdminPage), [links, activeAdminPage]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-10 bg-[#050505] min-h-screen text-white pb-32 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-2xl font-black text-shimmer uppercase italic tracking-tighter">CENTRAL DE CONTROLE</h2>
          <div className="flex items-center gap-2 mt-2">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
             <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Sistema Online - v3.0 Master</p>
          </div>
        </div>
        <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} className="px-6 py-2 bg-white/5 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Sair</button>
      </div>

      {/* Main Navigation */}
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

      {/* VIEW: LINKS */}
      {activeMenu === 'links' && (
        <div className="animate-fade-in space-y-8">
          <div className="flex flex-wrap gap-2 p-2 bg-white/[0.02] border border-white/5 rounded-[2.2rem]">
            {Array.from(new Set(links.map(l => l.category || 'Página 1'))).concat(activeAdminPage).filter((v, i, a) => a.indexOf(v) === i).map(cat => (
              <button key={cat} onClick={() => setActiveAdminPage(cat)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminPage === cat ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>{cat}</button>
            ))}
            <button onClick={() => { const n = prompt("Nome da página:"); if(n) setActiveAdminPage(n); }} className="px-4 py-3 text-yellow-500 text-[10px] font-black uppercase tracking-widest">+ Nova Página</button>
          </div>

          <button onClick={() => setEditingLink({ category: activeAdminPage, description: 'SAQUE MÍNIMO COM BÔNUS', type: 'glass', icon: 'auto' })} className="w-full py-6 bg-yellow-500 text-black font-black rounded-[2.5rem] uppercase text-xs shadow-2xl hover:scale-[1.01] transition-all">+ Adicionar Plataforma em "{activeAdminPage}"</button>

          <div className="space-y-4">
            {filteredLinks.map(link => (
              <div key={link.id} className="bg-[#0f0f0f] p-5 rounded-[2rem] flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10 text-yellow-500">{Icons[link.icon || 'slots'] || Icons.slots}</div>
                  <div>
                    <h4 className="font-bold text-sm uppercase">{link.title}</h4>
                    <p className="text-[9px] text-gray-500 uppercase font-black">{link.click_count || 0} Cliques • Estilo: {link.type}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingLink(link)} className="w-10 h-10 bg-white/5 flex items-center justify-center rounded-lg">⚙️</button>
                  <button onClick={() => handleDelete('links', link.id!)} className="w-10 h-10 bg-red-600/10 text-red-500 flex items-center justify-center rounded-lg">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: SOCIAL */}
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

      {/* VIEW: BRAND */}
      {activeMenu === 'brand' && (
        <div className="animate-fade-in max-w-2xl mx-auto">
          <form onSubmit={handleSaveBrand} className="bg-[#0f0f0f] p-10 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl">
            <div className="grid grid-cols-2 gap-8">
               <div className="text-center space-y-4">
                 <label className="text-[9px] uppercase font-black text-gray-500 tracking-widest">Logo Principal</label>
                 <div onClick={() => logoInputRef.current?.click()} className="w-24 h-24 mx-auto rounded-full border-2 border-dashed border-yellow-500 p-1 cursor-pointer overflow-hidden bg-black group">
                    <img src={brand.logoUrl} className="w-full h-full object-cover rounded-full group-hover:opacity-40" alt="Logo" />
                    {uploadingLogo && <div className="absolute inset-0 bg-black/80 flex items-center justify-center animate-spin">⌛</div>}
                 </div>
                 <input type="file" ref={logoInputRef} onChange={e => handleFileUpload(e, 'logo')} className="hidden" />
               </div>
               <div className="text-center space-y-4">
                 <label className="text-[9px] uppercase font-black text-gray-500 tracking-widest">Fundo (Background)</label>
                 <div onClick={() => bgInputRef.current?.click()} className="w-full h-24 rounded-2xl border-2 border-dashed border-blue-500 cursor-pointer overflow-hidden bg-black group relative">
                    {brand.backgroundUrl && <img src={brand.backgroundUrl} className="w-full h-full object-cover group-hover:opacity-40" alt="BG" />}
                    {uploadingBg && <div className="absolute inset-0 bg-black/80 flex items-center justify-center">...</div>}
                 </div>
                 <input type="file" ref={bgInputRef} onChange={e => handleFileUpload(e, 'background')} className="hidden" />
               </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest">Selo de Verificado</span>
                <button type="button" onClick={() => setBrand({...brand, verified: !brand.verified})} className={`w-12 h-6 rounded-full transition-all relative ${brand.verified ? 'bg-green-500' : 'bg-gray-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${brand.verified ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              {/* SELECTOR DE EFEITOS NO ADMIN */}
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Efeito Visual de Fundo</label>
                <select 
                  className="w-full p-4 rounded-2xl text-sm bg-black border border-white/10 text-white font-bold uppercase"
                  value={brand.effect || 'scanner'}
                  onChange={e => setBrand({...brand, effect: e.target.value as any})}
                >
                  <option value="scanner">🔦 Scanner Master (Luz Passante)</option>
                  <option value="gold-rain">✨ Chuva de Ouro (Partículas)</option>
                  <option value="cyber-grid">🌐 Cyber Grid (Grade 3D)</option>
                  <option value="nebula">🌌 Nebula Glow (Aurora)</option>
                  <option value="none">🚫 Vazio Absoluto (Sem Efeito)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Nome da Banca</label>
                <input className="w-full p-4 rounded-2xl text-sm bg-black border border-white/10 text-white font-bold" value={brand.name} onChange={e => setBrand({...brand, name: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Frase de Efeito (Tagline)</label>
                <textarea className="w-full p-4 rounded-2xl text-sm bg-black border border-white/10 text-white min-h-[80px]" value={brand.tagline} onChange={e => setBrand({...brand, tagline: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-gray-500 ml-2">Texto do Rodapé (Copyright)</label>
                <input className="w-full p-4 rounded-2xl text-sm bg-black border border-white/10 text-white" value={brand.footerText || ''} onChange={e => setBrand({...brand, footerText: e.target.value})} placeholder="© 2025 Todos os direitos reservados" />
              </div>
            </div>

            <button type="submit" disabled={savingBrand} className="w-full py-6 bg-blue-600 text-white font-black rounded-2xl uppercase text-[11px] tracking-widest shadow-xl">
              {savingBrand ? 'Salvando...' : 'Salvar Todas as Configurações'}
            </button>
          </form>
        </div>
      )}

      {/* MODAL EDITOR: LINKS */}
      {editingLink && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <form onSubmit={handleSaveLink} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] w-full max-w-xl my-auto space-y-6">
            <h3 className="text-xl font-black uppercase text-shimmer">Configurar Plataforma</h3>
            <div className="space-y-4">
              <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10" value={editingLink.category || ''} onChange={e => setEditingLink({...editingLink, category: e.target.value})} placeholder="Página (Ex: Página 1)" />
              <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10" value={editingLink.title || ''} onChange={e => setEditingLink({...editingLink, title: e.target.value})} placeholder="Nome da Plataforma" required />
              <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10" value={editingLink.description || ''} onChange={e => setEditingLink({...editingLink, description: e.target.value})} placeholder="Descrição" />
              <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10" value={editingLink.url || ''} onChange={e => setEditingLink({...editingLink, url: e.target.value})} placeholder="URL de Afiliado" required />
              <div className="grid grid-cols-2 gap-4">
                <select className="p-4 bg-black border border-white/10 rounded-xl text-[10px] uppercase font-black" value={editingLink.type} onChange={e => setEditingLink({...editingLink, type: e.target.value as any})}>
                  <option value="gold">Dourado</option><option value="neon-purple">Roxo</option><option value="neon-green">Verde</option><option value="glass">Vidro</option>
                </select>
                <select className="p-4 bg-black border border-white/10 rounded-xl text-[10px] uppercase font-black" value={editingLink.icon} onChange={e => setEditingLink({...editingLink, icon: e.target.value})}>
                  <option value="auto">🌐 Automático</option><option value="slots">🎰 Slots</option><option value="rocket">🚀 Crash</option><option value="fire">🔥 Fogo</option>
                </select>
              </div>
              <input className="w-full p-4 rounded-xl text-sm bg-black border border-white/10" value={editingLink.badge || ''} onChange={e => setEditingLink({...editingLink, badge: e.target.value})} placeholder="Etiqueta (Ex: BÔNUS 100%)" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditingLink(null)} className="flex-1 py-4 bg-white/5 rounded-xl uppercase font-black text-[10px]">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-2 py-4 bg-yellow-500 text-black rounded-xl uppercase font-black text-[10px] shadow-lg">Confirmar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL EDITOR: SOCIAL */}
      {editingSocial && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[9999]">
          <form onSubmit={handleSaveSocial} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] w-full max-w-sm space-y-6">
            <h3 className="text-xl font-black uppercase italic">Configurar Rede Social</h3>
            <div className="space-y-4">
              <input className="w-full p-4 rounded-xl bg-black border border-white/10 text-sm" value={editingSocial.name || ''} onChange={e => setEditingSocial({...editingSocial, name: e.target.value})} placeholder="Nome (Ex: Instagram)" required />
              <input className="w-full p-4 rounded-xl bg-black border border-white/10 text-sm" value={editingSocial.url || ''} onChange={e => setEditingSocial({...editingSocial, url: e.target.value})} placeholder="https://..." required />
              <select className="w-full p-4 bg-black border border-white/10 rounded-xl text-[10px] font-black uppercase" value={editingSocial.icon} onChange={e => setEditingSocial({...editingSocial, icon: e.target.value})}>
                 <option value="instagram">Instagram</option><option value="telegram">Telegram</option><option value="money">WhatsApp</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditingSocial(null)} className="flex-1 py-4 bg-white/5 rounded-xl uppercase font-black text-[10px]">Fechar</button>
              <button type="submit" className="flex-2 py-4 bg-blue-600 rounded-xl uppercase font-black text-[10px]">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
