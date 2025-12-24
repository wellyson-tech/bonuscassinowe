
import React from 'react';
import { CasinoLink } from '../types';
import { Icons } from '../constants';
import { supabase } from '../lib/supabase';

interface Props {
  link: CasinoLink;
  isAdminView?: boolean;
}

const LinkButton: React.FC<Props> = ({ link, isAdminView = false }) => {
  const handleLinkClick = async () => {
    if (isAdminView) return;

    try {
      const { error } = await supabase
        .from('links')
        .update({ click_count: (link.click_count || 0) + 1 })
        .eq('id', link.id);
      
      if (error) console.error("Erro ao registrar clique:", error);
    } catch (e) {
      console.error(e);
    }
  };

  const getStyleClasses = () => {
    switch (link.type) {
      case 'gold':
        return 'gold-gradient text-black font-bold border-yellow-200 shadow-[0_10px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_rgba(212,175,55,0.5)] transform hover:scale-[1.02] transition-all duration-300';
      case 'neon-purple':
        return 'bg-neutral-900 text-purple-100 border-purple-500 shadow-[0_10px_20px_rgba(168,85,247,0.2)] hover:shadow-[0_15px_30px_rgba(168,85,247,0.4)] border-2 hover:bg-neutral-800 transform hover:scale-[1.02] transition-all duration-300';
      case 'neon-green':
        return 'bg-neutral-900 text-green-100 border-emerald-500 shadow-[0_10px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_15px_30px_rgba(16,185,129,0.4)] border-2 hover:bg-neutral-800 transform hover:scale-[1.02] transition-all duration-300';
      case 'glass':
      default:
        return 'glass-card text-white border-white/10 hover:bg-white/10 transform hover:scale-[1.02] transition-all duration-300 shadow-xl';
    }
  };

  const renderIcon = () => {
    const isAuto = !link.icon || link.icon === 'auto';
    const containerClasses = `relative w-12 h-12 flex items-center justify-center rounded-2xl p-2.5 transition-all shadow-inner border overflow-hidden ${
      link.type === 'gold' ? 'bg-black/10 border-black/20 text-black' : 'bg-white/10 border-white/10 text-white'
    }`;

    if (isAuto) {
      try {
        const cleanUrl = link.url.trim();
        const urlWithProtocol = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
        const domain = new URL(urlWithProtocol).hostname;
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        
        return (
          <div className={containerClasses}>
            <img src={faviconUrl} alt={link.title} className="w-full h-full object-contain filter drop-shadow-md brightness-110" onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.parentElement) target.parentElement.innerHTML = '<div class="w-8 h-8 opacity-40">' + (Icons.slots as any) + '</div>';
            }} />
          </div>
        );
      } catch (e) {
        return <div className={containerClasses}><div className="w-8 h-8 opacity-40">{Icons.slots}</div></div>;
      }
    }
    
    // Explicitly check for key in Icons object
    const iconKey = link.icon.toLowerCase();
    const iconElement = Icons[iconKey] || Icons.slots;

    return (
      <div className={containerClasses}>
        <div className="absolute inset-0 bg-white/5 blur-sm opacity-50"></div>
        <div className="relative w-full h-full flex items-center justify-center scale-110">
          {iconElement}
        </div>
      </div>
    );
  };

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleLinkClick}
      className={`relative w-full p-4 rounded-[1.8rem] flex items-center gap-5 group overflow-hidden border-b-4 ${getStyleClasses()}`}
    >
      {isAdminView && (
        <div className="absolute top-2 right-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 z-20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[9px] font-black text-white/80 uppercase">{link.click_count || 0} CLICKS</span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
      <div className="flex-shrink-0 z-10 transition-transform group-hover:scale-110 duration-500">{renderIcon()}</div>
      <div className="flex-grow text-left z-10">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-black uppercase tracking-tight leading-tight">{link.title}</h3>
          {link.badge && (
            <span className={`text-[8px] px-2 py-0.5 rounded-md font-black uppercase animate-pulse shadow-sm ${
              link.type === 'gold' ? 'bg-black text-yellow-500' : 'bg-yellow-500 text-black'
            }`}>{link.badge}</span>
          )}
        </div>
        <p className={`text-[11px] font-medium mt-0.5 line-clamp-1 opacity-60 ${link.type === 'gold' ? 'text-black/70' : 'text-gray-400'}`}>
          {link.description || 'Clique para acessar'}
        </p>
      </div>
      <div className="flex-shrink-0 z-10 opacity-20 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  );
};

export default LinkButton;
