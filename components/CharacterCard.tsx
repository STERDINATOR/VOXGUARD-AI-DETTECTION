
import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, Cpu, Activity, Clock, FileAudio, 
  Fingerprint, ScanEye, Code2, AlertOctagon, Lock, ChevronDown, 
  ChevronUp, HeartPulse, Brain, Zap, Fingerprint as FingerprintIcon,
  RotateCcw, AlertTriangle, Terminal, User, Network, Share2
} from 'lucide-react';
import { RiskLevel, ForensicData, DomainAnalysis } from '../types';

interface AnalysisReportCardProps {
  fileName: string;
  timestamp: string;
  color: 'cyan' | 'magenta' | 'yellow' | 'emerald';
  message: string;
  classification: string;
  confidence: number;
  spectralMarkers?: string[];
  suspectedAlgorithm?: string;
  scamLikelihood?: number;
  riskLevel?: RiskLevel;
  intentAnalysis?: string;
  forensicData?: ForensicData;
  domainAnalysis?: DomainAnalysis;
}

const AnalysisReportCard: React.FC<AnalysisReportCardProps> = ({ 
  fileName, 
  timestamp, 
  color, 
  message, 
  classification,
  confidence,
  spectralMarkers,
  suspectedAlgorithm,
  scamLikelihood = 0,
  riskLevel = 'LOW',
  intentAnalysis = 'Routine analysis complete.',
  forensicData,
  domainAnalysis
}) => {
  const [expanded, setExpanded] = useState(false);
  const isAi = classification === 'AI_GENERATED';

  // Dynamic Theme Configuration based on Classification
  const theme = isAi ? {
     primary: '#ff00ff', // Magenta for AI
     secondary: '#ef4444',
     bg: 'bg-[#1a0505]', // Solid dark red/black
     border: 'border-[#ff00ff]/40',
     text: 'text-[#ff00ff]',
     glow: 'shadow-[#ff00ff]/20',
     icon: ShieldAlert,
     title: "SYNTHETIC_SIGNAL DETECTED"
  } : {
     primary: '#00f3ff', // Cyan for Human
     secondary: '#10b981',
     bg: 'bg-[#020d18]', // Solid Stark Blue/Black
     border: 'border-[#00f3ff]/40',
     text: 'text-[#00f3ff]',
     glow: 'shadow-[#00f3ff]/20',
     icon: ShieldCheck,
     title: "BIOMETRIC_HUMAN VERIFIED"
  };

  const Icon = theme.icon;

  return (
    <div className={`relative overflow-hidden rounded-[24px] border ${theme.border} ${theme.bg} mb-6 transition-all duration-300 hover:scale-[1.01] ${theme.glow} shadow-2xl group`}>
       {/* Background Scanline/Grid FX */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none opacity-20 bg-[length:100%_2px,3px_100%]" />

       <div className="relative z-10 p-6 flex flex-col gap-6">

          {/* HEADER SECTION: Verdict & File Info */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-4 gap-4">
             <div className="flex gap-4 items-center">
                {/* Confidence Hexagon */}
                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                   <svg viewBox="0 0 100 100" className="w-full h-full absolute animate-spin-slow opacity-50">
                      <path d="M50 0 L93 25 L93 75 L50 100 L7 75 L7 25 Z" fill="none" stroke={theme.primary} strokeWidth="2" strokeDasharray="5,5" />
                   </svg>
                   <div className={`text-xl font-black ${theme.text} mono`}>{Math.round(confidence * 100)}%</div>
                   <div className="absolute bottom-0 text-[6px] font-black uppercase bg-black px-1 border border-white/10 text-slate-400">CONFIDENCE</div>
                </div>

                <div>
                   <h2 className={`text-xl md:text-2xl font-black italic tracking-tighter uppercase ${theme.text} flex items-center gap-2 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]`}>
                      <Icon className="w-6 h-6" />
                      {theme.title}
                   </h2>
                   <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]">
                         <FileAudio className="w-3 h-3" /> {fileName}
                      </div>
                      <div className="w-1 h-1 rounded-full bg-slate-600" />
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                         <Clock className="w-3 h-3" /> {new Date(timestamp).toLocaleTimeString()}
                      </div>
                   </div>
                </div>
             </div>

             {/* Risk Badge */}
             <div className="flex md:flex-col items-center md:items-end gap-2 md:gap-1 w-full md:w-auto justify-between md:justify-start">
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em]">Threat Assessment</span>
                <div className={`px-3 py-1 rounded border ${riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-emerald-500/10 border-emerald-500 text-emerald-500'} font-black text-[10px] uppercase tracking-widest flex items-center gap-2`}>
                   {riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? <AlertOctagon className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                   {riskLevel} RISK
                </div>
             </div>
          </div>

          {/* MAIN DASHBOARD GRID (Always Visible) */}
          {forensicData && (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Metric 1: Bio-Plausibility */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 relative overflow-hidden group/card hover:bg-white/10 transition-colors">
                   <div className="absolute top-0 right-0 p-2 opacity-20"><HeartPulse className="w-8 h-8 text-pink-500"/></div>
                   <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Bio-Plausibility</h5>
                   <div className="text-2xl font-black text-pink-500 mono mb-1">{forensicData.biomechanics.plausibilityScore}%</div>
                   <div className="w-full bg-black h-1.5 rounded-full overflow-hidden border border-white/10">
                      <div className="h-full bg-pink-500 transition-all duration-1000" style={{width: `${forensicData.biomechanics.plausibilityScore}%`}} />
                   </div>
                </div>

                {/* Metric 2: Cognitive Entropy */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 relative overflow-hidden group/card hover:bg-white/10 transition-colors">
                   <div className="absolute top-0 right-0 p-2 opacity-20"><Brain className="w-8 h-8 text-cyan-400"/></div>
                   <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Cognitive Load</h5>
                   <div className="text-2xl font-black text-cyan-400 mono mb-1">{forensicData.cognitive.entropyScore}%</div>
                   <div className="w-full bg-black h-1.5 rounded-full overflow-hidden border border-white/10">
                      <div className="h-full bg-cyan-400 transition-all duration-1000" style={{width: `${forensicData.cognitive.entropyScore}%`}} />
                   </div>
                </div>

                {/* Metric 3: Technical Integrity */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 relative overflow-hidden group/card hover:bg-white/10 transition-colors">
                   <div className="absolute top-0 right-0 p-2 opacity-20"><Code2 className="w-8 h-8 text-yellow-400"/></div>
                   <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Reversibility</h5>
                   <div className="text-2xl font-black text-yellow-400 mono mb-1">{forensicData.technical.reversibilityScore}%</div>
                   <div className="w-full bg-black h-1.5 rounded-full overflow-hidden border border-white/10">
                      <div className="h-full bg-yellow-400 transition-all duration-1000" style={{width: `${forensicData.technical.reversibilityScore}%`}} />
                   </div>
                </div>

                {/* Metric 4: Origin/Profile */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 relative overflow-hidden flex flex-col justify-between hover:bg-white/10 transition-colors">
                   <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Inferred Origin</h5>
                   <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded bg-white/5 border border-white/10`}>
                         {forensicData.profile.gender === 'MALE' ? <User className="w-4 h-4 text-blue-400"/> : <User className="w-4 h-4 text-pink-400"/>}
                      </div>
                      <div>
                         <div className="text-[9px] font-bold text-white uppercase">{forensicData.profile.ageEstimate.range} YRS</div>
                         <div className="text-[8px] text-slate-500 uppercase truncate max-w-[80px]">{suspectedAlgorithm || "Unknown Source"}</div>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* VERDICT MESSAGE BOX */}
          <div className={`p-4 rounded-xl border ${theme.border} bg-black/40 flex gap-4 items-start`}>
             <Terminal className={`w-4 h-4 ${theme.text} shrink-0 mt-0.5`} />
             <div className="space-y-1">
                <span className={`text-[9px] font-black uppercase ${theme.text} tracking-widest`}>SYSTEM VERDICT ANALYSIS</span>
                <p className="text-[10px] text-slate-300 font-mono leading-relaxed opacity-90">{message}</p>
             </div>
          </div>

          {/* EXPAND TOGGLE */}
          <button 
             onClick={() => setExpanded(!expanded)}
             className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center gap-2 transition-all group border border-white/5 hover:border-[#00f3ff]/30"
          >
             <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-white tracking-[0.2em] transition-colors">
                {expanded ? "COLLAPSE FORENSIC DATA" : "VIEW FULL FORENSIC REPORT"}
             </span>
             {expanded ? <ChevronUp className="w-3 h-3 text-slate-500"/> : <ChevronDown className="w-3 h-3 text-slate-500"/>}
          </button>

          {/* EXPANDED DETAILS */}
          {expanded && forensicData && (
             <div className="animate-in fade-in slide-in-from-top-4 space-y-6">
                
                {/* SECTION 1: TECHNICAL & BEHAVIORAL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-white/5">
                   {/* Left Col: Technical */}
                   <div className="space-y-4">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <Fingerprint className="w-3 h-3 text-emerald-400" /> Technical Telemetry
                      </h4>
                      
                      <div className="p-3 rounded bg-black/40 border border-white/5 space-y-2">
                         <div className="flex justify-between text-[9px] mono text-slate-400">
                            <span>HASH_INTEGRITY</span>
                            <span className="text-emerald-500">{forensicData.integrity.verdict}</span>
                         </div>
                         <div className="text-[8px] mono text-slate-600 break-all">
                            {forensicData.integrity.hash}
                         </div>
                      </div>
                   </div>

                   {/* Right Col: Intent & Profile */}
                   <div className="space-y-4">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <ScanEye className="w-3 h-3 text-purple-400" /> Behavioral Profiling
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                         <div className="p-2 bg-white/5 rounded border border-white/5">
                            <div className="text-[7px] text-slate-500 uppercase font-black">Emotional State</div>
                            <div className="text-[10px] text-white font-bold uppercase mt-1">{forensicData.emotional.primary}</div>
                            <div className="text-[8px] text-slate-500 mt-1">Drift: {forensicData.emotional.driftScore}%</div>
                         </div>
                         <div className="p-2 bg-white/5 rounded border border-white/5">
                            <div className="text-[7px] text-slate-500 uppercase font-black">Tonal Quality</div>
                            <div className="text-[10px] text-white font-bold uppercase mt-1">{forensicData.profile.tonalType}</div>
                         </div>
                      </div>
                      <div className="p-3 bg-red-500/5 border border-red-500/20 rounded">
                         <span className="text-[8px] font-black text-red-400 uppercase block mb-1">Intent Analysis</span>
                         <p className="text-[9px] text-red-200/80 leading-relaxed font-mono">
                            {intentAnalysis}
                         </p>
                      </div>
                   </div>
                </div>

                {/* SECTION 2: SIGNAL ORIGIN FINGERPRINTING */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                   <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Network className="w-3 h-3 text-[#00f3ff]" /> Signal Origin Fingerprinting
                   </h4>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Suspected Architecture */}
                      <div className="bg-black/40 rounded border border-white/5 p-3 flex flex-col justify-between">
                         <span className="text-[7px] text-slate-500 uppercase font-black block mb-1">Suspected Architecture</span>
                         <div className="text-white font-mono text-xs truncate font-bold tracking-tight">{suspectedAlgorithm || "UNIDENTIFIED_MODEL"}</div>
                         <div className="text-[8px] text-[#00f3ff] mt-2 flex items-center gap-1 font-mono">
                              <Share2 className="w-2.5 h-2.5" /> 
                              {forensicData.origin.isProbabilistic ? 'PROBABILISTIC MATCH' : 'DETERMINISTIC MATCH'}
                         </div>
                      </div>

                      {/* Vocoder Traits */}
                      <div className="bg-black/40 rounded border border-white/5 p-3 md:col-span-2">
                         <span className="text-[7px] text-slate-500 uppercase font-black block mb-3">Vocoder Family Probability</span>
                         <div className="space-y-2.5">
                              {/* Neural Vocoder */}
                              <div className="flex items-center gap-2 group/voc">
                                 <span className="text-[8px] text-slate-400 w-16 group-hover/voc:text-white transition-colors">NEURAL</span>
                                 <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#ff00ff] shadow-[0_0_10px_rgba(255,0,255,0.5)] transition-all duration-1000" style={{width: `${forensicData.origin.likelihood.neuralVocoder}%`}}></div>
                                 </div>
                                 <span className="text-[9px] text-[#ff00ff] font-mono w-8 text-right font-bold">{forensicData.origin.likelihood.neuralVocoder}%</span>
                              </div>
                              {/* Concatenative */}
                              <div className="flex items-center gap-2 group/voc">
                                 <span className="text-[8px] text-slate-400 w-16 group-hover/voc:text-white transition-colors">CONCAT</span>
                                 <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-1000" style={{width: `${forensicData.origin.likelihood.concatenative}%`}}></div>
                                 </div>
                                 <span className="text-[9px] text-yellow-500 font-mono w-8 text-right font-bold">{forensicData.origin.likelihood.concatenative}%</span>
                              </div>
                              {/* Humanoid */}
                              <div className="flex items-center gap-2 group/voc">
                                 <span className="text-[8px] text-slate-400 w-16 group-hover/voc:text-white transition-colors">ORGANIC</span>
                                 <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#00f3ff] shadow-[0_0_10px_rgba(0,243,255,0.5)] transition-all duration-1000" style={{width: `${forensicData.origin.likelihood.humanoid}%`}}></div>
                                 </div>
                                 <span className="text-[9px] text-[#00f3ff] font-mono w-8 text-right font-bold">{forensicData.origin.likelihood.humanoid}%</span>
                              </div>
                         </div>
                      </div>
                   </div>

                   {/* Pipeline Artifacts Tags */}
                   <div className="bg-black/40 rounded border border-white/5 p-4">
                      <span className="text-[7px] text-slate-500 uppercase font-black block mb-2 flex items-center gap-2">
                         <Cpu className="w-3 h-3" /> Detected Synthesis Pipeline Artifacts
                      </span>
                      <div className="flex flex-wrap gap-2">
                         {[...(spectralMarkers || []), ...forensicData.technical.artifacts].length > 0 ? (
                            [...(spectralMarkers || []), ...forensicData.technical.artifacts].map((marker, i) => (
                               <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[8px] font-mono text-slate-300 uppercase hover:bg-white/10 hover:border-[#00f3ff]/30 transition-all cursor-default">
                                  {marker}
                               </span>
                            ))
                         ) : (
                            <span className="text-[9px] text-slate-600 italic">No specific synthesis artifacts isolated.</span>
                         )}
                      </div>
                   </div>
                </div>

             </div>
          )}

       </div>
    </div>
  );
};

export default AnalysisReportCard;
