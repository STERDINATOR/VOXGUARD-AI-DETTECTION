import React from 'react';
import { SupportedLanguage } from '../types';

interface Props {
  language: SupportedLanguage;
}

const LanguageBadge: React.FC<Props> = ({ language }) => {
  const colors: Record<SupportedLanguage, string> = {
    Tamil: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    English: 'bg-[#00f3ff]/10 text-[#00f3ff] border-[#00f3ff]/30',
    Hindi: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Malayalam: 'bg-[#ff00ff]/10 text-[#ff00ff] border-[#ff00ff]/30',
    Telugu: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Auto: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-widest ${colors[language]}`}>
      {language}
    </span>
  );
};

export default LanguageBadge;