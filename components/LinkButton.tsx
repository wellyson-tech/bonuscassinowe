
import React from 'react';
import { CasinoLink } from '../types';
import { Icons } from '../constants';

interface Props {
  link: CasinoLink;
}

const LinkButton: React.FC<Props> = ({ link }) => {
  const getStyleClasses = () => {
    switch (link.type) {
      case 'gold':
        return 'gold-gradient text-black font-bold border-yellow-200 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transform hover:scale-[1.03] transition-all duration-300';
      case 'neon-purple':
        return 'bg-neutral-900 text-purple-100 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] border-2 hover:bg-neutral-800 transform hover:scale-[1.03] transition-all duration-300';
      case 'neon-green':
        return 'bg-neutral-900 text-green-100 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] border-2 hover:bg-neutral-800 transform hover:scale-[1.03] transition-all duration-300';
      case 'glass':
      default:
        return 'glass-card text-white border-white/10 hover:bg-white/10 transform hover:scale-[1.03] transition-all duration-300';
    }
  };

  return (
    <a
      href={link.url}
      className={`relative w-full p-4 rounded-2xl flex items-center gap-4 group overflow-hidden ${getStyleClasses()}`}
    >
      {/* Visual background effect for hover */}
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {/* Icon Section */}
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
        link.type === 'gold' ? 'bg-black/10' : 'bg-white/5'
      }`}>
        {Icons[link.icon]}
      </div>

      {/* Content Section */}
      <div className="flex-grow text-left">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-extrabold uppercase tracking-wider">{link.title}</h3>
          {link.badge && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              link.type === 'gold' ? 'bg-black text-yellow-500' : 'bg-white/10 text-white'
            }`}>
              {link.badge}
            </span>
          )}
        </div>
        <p className={`text-xs opacity-80 mt-0.5 line-clamp-1 ${
          link.type === 'gold' ? 'text-black' : 'text-gray-400'
        }`}>
          {link.description}
        </p>
      </div>

      {/* Action Arrow */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  );
};

export default LinkButton;
