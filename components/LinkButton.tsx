
import React from 'react';
import { CasinoLink } from '../types';
import { Icons } from '../constants';
import { supabase } from '../lib/supabase';

interface Props {
  link: CasinoLink;
  isAdminView?: boolean;
}

const LinkButton: React.FC<Props> = ({ link, isAdminView = false }) => {
  const handleLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isAdminView) return;
    
    // Previne a navegação imediata para dar tempo ao banco de dados
    e.preventDefault();
    const targetUrl = link.url;

    try {
      // Tenta atualizar o contador no banco
      await supabase
        .from('links')
        .update({ click_count: (link.click_count || 0) + 1 })
        .eq('id', link.id);
    } catch (err) {
      console.error("Erro ao registrar clique:", err);
    } finally {
      // Abre o link em uma nova aba após a tentativa de salvamento
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getStyleClasses = () => {
    switch (link.type) {
      case 'gold':
        return 'gold-gradient text-black font-bold border-yellow-200 shadow-[0_10px_30px_rgba(212,175,55,0.4)] transform hover:scale-[1.03] transition-all duration-300';
      case 'neon-purple':
        return 'neon-purple-btn text-purple-100 transform hover:scale-[1.03] transition-all duration-300';
      case 'neon-green':
        return 'neon-green-btn text-green-100 transform hover:scale-[1.03] transition-all duration-300';
      case 'glass':
      default:
        return 'glass-card text-white border-white/5 hover:border-white/20 transform hover:scale-[1.03] transition-all duration-300 shadow-xl';
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
        
        // Tentando FaviconKit (128px) como fonte primária por ser maior e melhor qualidade
        const faviconUrl = `https://api.faviconkit.com/${domain}/128`;
        const fallbackFaviconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
        
        return (
          <div className={containerClasses}>
            <img 
              src={faviconUrl} 
              alt={link.title} 
              className="w-full h-full object-contain filter drop-shadow-md brightness-110" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Se o FaviconKit falhar, tenta o DuckDuckGo
                if (target.src === faviconUrl) {
                  target.src = fallbackFaviconUrl;
                } else {
                  // Se ambos falharem, mostra o ícone padrão
                  target.style.display = 'none';
                  if (target.parentElement) target.parentElement.innerHTML = '<div class="w-8 h-8 opacity-40">' + (Icons.slots as any) + '</div>';
                }
              }} 
            />
          </div>
        );
      } catch (e) {
        return <div className={containerClasses}><div className="w-8 h-8 opacity-40">{Icons.slots}</div></div>;
      }
    }
    
    const iconKey = link.icon.toLowerCase();
    const iconElement = Icons[iconKey] || Icons.slots;

    return (
      <div className={containerClasses}>
        <div className="relative w-full h-full flex items-center justify-center scale-110">
          {iconElement}
        </div>
      </div>
    );
  };

  return (
    <a
      href={link.url}
      onClick={handleLinkClick}
      className={`relative w-full p-5 rounded-[2.2rem] flex items-center gap-5 group overflow-hidden border-b-[6px] ${getStyleClasses()}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
      <div className="flex-shrink-0 z-10 group-hover:rotate-6 transition-transform duration-500">{renderIcon()}</div>
      <div className="flex-grow text-left z-10">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-black uppercase tracking-tight leading-tight">{link.title}</h3>
          {link.badge && (
            <span className={`text-[8px] px-2 py-1 rounded-lg font-black uppercase animate-pulse shadow-xl ${
              link.type === 'gold' ? 'bg-black text-yellow-500' : 'bg-yellow-500 text-black'
            }`}>{link.badge}</span>
          )}
        </div>
        <p className={`text-[12px] font-medium mt-1 line-clamp-1 opacity-60 ${link.type === 'gold' ? 'text-black/70' : 'text-gray-400'}`}>
          {link.description || 'Disponível agora - Clique para jogar'}
        </p>
      </div>
      <div className="flex-shrink-0 z-10 opacity-30 group-hover:opacity-100 transition-all transform group-hover:translate-x-2">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  );
};

export default LinkButton;
