
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  analyzeVoiceBatch, 
  generateSpeech, 
  translateText,
  decode,
  decodeAudioData,
  encode,
  analyzeTranscript
} from './services/geminiService';
import { GoogleGenAI, Modality, Blob as GeminiBlob } from "@google/genai";
import { 
  SupportedLanguage, AudioItem, DetectionResult, 
  ApiRequest, ApiResponse, LiveAnalysisResult
} from './types';
import AnalysisReportCard from './components/CharacterCard';
import WaveformVisualizer from './components/WaveformVisualizer';
import AudioPlayer from './components/AudioPlayer';
import ApiSimulator from './components/ApiSimulator';
import { 
  Activity, BarChart3, Upload, Mic, 
  Terminal, Globe, Fingerprint, Search,
  RefreshCw, Waves, Play, Square, Trash2,
  Cpu as CpuIcon, ShieldAlert, ShieldCheck, 
  Sliders, History, Radio, Database, Zap,
  MessageSquare, AlertTriangle, FileAudio, Lock, FileCode,
  Filter, X, Power, Hexagon, Crosshair, ChevronRight,
  Languages, Aperture, Settings, Eye, CornerRightDown,
  User, Server, Wifi, MapPin, Radar as RadarIcon, Disc,
  MicOff, Siren, Binary, Workflow, Download
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, 
  Tooltip as RechartsTooltip, CartesianGrid, XAxis, YAxis, Legend,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line
} from 'recharts';

// --- CONFIG & CONSTANTS ---
const VOICES = [
  { id: 'Puck', label: 'PUCK [MK-1]', desc: 'Scout / Energetic' },
  { id: 'Charon', label: 'CHARON [MK-2]', desc: 'Heavy / Deep' },
  { id: 'Kore', label: 'KORE [MK-3]', desc: 'Balanced / Neutral' },
  { id: 'Fenrir', label: 'FENRIR [MK-4]', desc: 'Rough / Authoritative' },
  { id: 'Aoede', label: 'AOEDE [MK-5]', desc: 'Soft / Elegant' }
];
const TONES = ['Neutral', 'Authoritative', 'Whisper', 'Energetic', 'Deep'];
const TRANSLATION_LANGUAGES = ['Original', 'Tamil', 'English', 'Hindi', 'Malayalam', 'Telugu', 'Spanish', 'French', 'German', 'Japanese', 'Chinese', 'Russian', 'Arabic'];

// --- CUSTOM CURSOR ---
const CustomCursor = () => {
    const cursorRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            if (cursorRef.current) {
                cursorRef.current.style.left = `${e.clientX}px`;
                cursorRef.current.style.top = `${e.clientY}px`;
            }
        };
        window.addEventListener('mousemove', moveCursor);
        return () => window.removeEventListener('mousemove', moveCursor);
    }, []);
    return (
        <div ref={cursorRef} className="fixed w-8 h-8 pointer-events-none z-[10000] -translate-x-1/2 -translate-y-1/2 mix-blend-screen flex items-center justify-center">
            <div className="absolute w-full h-full border border-[#00f3ff] rounded-full opacity-50 animate-[spin_4s_linear_infinite]"></div>
            <div className="absolute w-1 h-1 bg-[#00f3ff] rounded-full"></div>
            <div className="absolute w-[120%] h-[1px] bg-[#00f3ff] opacity-30 rotate-45"></div>
            <div className="absolute w-[120%] h-[1px] bg-[#00f3ff] opacity-30 -rotate-45"></div>
        </div>
    );
};

// --- SYSTEM STATUS OVERLAY ---
interface StatusState {
    active: boolean;
    message: string;
    type: 'process' | 'error' | 'success';
}

const SystemStatusOverlay = ({ status, onAck }: { status: StatusState, onAck: () => void }) => {
    if (!status.active) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm">
            <div className={`stark-panel p-10 max-w-2xl w-full border-2 ${status.type === 'error' ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]' : 'border-[#00f3ff] shadow-[0_0_50px_rgba(0,243,255,0.3)]'} flex flex-col items-center text-center animate-in zoom-in-95 duration-300`}>
                
                {status.type === 'error' ? (
                    <AlertTriangle className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
                ) : (
                    <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 border-4 border-[#00f3ff] border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-3 border-4 border-dashed border-[#00f3ff]/50 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
                        <Activity className="absolute inset-0 m-auto w-8 h-8 text-[#00f3ff] animate-pulse" />
                    </div>
                )}

                <h2 className={`text-3xl font-header font-black tracking-[0.2em] mb-4 ${status.type === 'error' ? 'text-red-500' : 'text-white'}`}>
                    {status.type === 'error' ? 'SYSTEM MALFUNCTION' : 'PROCESSING PROTOCOL'}
                </h2>
                
                <p className={`font-mono text-lg mb-8 ${status.type === 'error' ? 'text-red-300' : 'text-[#00f3ff]'}`}>
                    {status.message}
                </p>

                {status.type === 'process' && (
                    <div className="w-full h-2 bg-[#020d18] border border-[#00f3ff]/30 rounded-full overflow-hidden relative">
                        <div className="h-full bg-[#00f3ff] animate-progress"></div>
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)] animate-[translate_2s_linear_infinite] w-full"></div>
                    </div>
                )}

                {status.type === 'error' && (
                    <button onClick={onAck} className="px-8 py-3 bg-red-500/10 border border-red-500 text-red-500 font-bold tracking-widest hover:bg-red-500 hover:text-black transition-all">
                        ACKNOWLEDGE ERROR
                    </button>
                )}
            </div>
        </div>
    );
};

// --- STARK PANEL WRAPPER ---
interface StarkPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
    children: React.ReactNode;
    className?: string;
    title?: React.ReactNode;
    noPadding?: boolean;
}

const StarkPanel: React.FC<StarkPanelProps> = ({ children, className = '', title, noPadding = false, ...props }) => (
    <div className={`stark-panel ${noPadding ? '' : 'p-6'} ${className} group`} {...props}>
        {title && (
            <div className="absolute -top-3 left-4 bg-[#020d18] px-2 text-[10px] font-black tracking-[0.2em] text-[#00f3ff] border border-[#00f3ff]/30 rounded uppercase flex items-center gap-2 z-20">
                {title}
            </div>
        )}
        <div className="absolute top-0 right-0 w-8 h-8 border-r border-t border-[#00f3ff]/30 rounded-tr-lg pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-l border-b border-[#00f3ff]/30 rounded-bl-lg pointer-events-none"></div>
        {children}
    </div>
);

// --- LIVE ANALYSIS MONITOR ---
const LiveAnalysisMonitor = ({ data, logs, metrics, verdict, threats }: { data: any[], logs: any[], metrics: any, verdict: string, threats: any[] }) => {
    return (
        <div className="grid grid-cols-12 gap-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left: Metrics & Threats */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                <StarkPanel title="TELEMETRY" className="flex-1 flex flex-col gap-4">
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-[9px] font-black text-[#00a8ff] mb-1">SPECTRAL JITTER</div>
                            <div className="w-full bg-[#020d18] h-2 rounded-full overflow-hidden border border-[#00f3ff]/20">
                                <div className="h-full bg-[#00f3ff] transition-all duration-300" style={{ width: `${metrics.jitter}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[9px] font-black text-[#00a8ff] mb-1">HARMONIC STABILITY</div>
                            <div className="w-full bg-[#020d18] h-2 rounded-full overflow-hidden border border-[#00f3ff]/20">
                                <div className="h-full bg-[#ff00ff] transition-all duration-300" style={{ width: `${metrics.stability}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[9px] font-black text-[#00a8ff] mb-1">PHASE COHERENCE</div>
                            <div className="w-full bg-[#020d18] h-2 rounded-full overflow-hidden border border-[#00f3ff]/20">
                                <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${metrics.coherence}%` }}></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-[#00f3ff]/20">
                        <div className="text-[9px] font-black text-[#00a8ff] mb-2">CURRENT VERDICT</div>
                        <div className={`p-3 border rounded text-center font-black text-sm tracking-widest ${
                            verdict === 'SYNTHETIC' ? 'border-[#ff4500] bg-[#ff4500]/10 text-[#ff4500] animate-pulse' :
                            verdict === 'BIOMETRIC' ? 'border-[#00f3ff] bg-[#00f3ff]/10 text-[#00f3ff]' :
                            'border-slate-500 text-slate-500'
                        }`}>
                            {verdict === 'IDLE' ? 'AWAITING INPUT' : verdict}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar border border-red-500/20 bg-red-500/5 rounded p-2 mt-2">
                        <div className="text-[9px] font-black text-red-500 mb-2 sticky top-0 bg-[#0d0202] py-1 z-10 flex items-center gap-2">
                            <ShieldAlert className="w-3 h-3" /> THREAT SIGNATURES
                        </div>
                        {threats.length === 0 ? (
                            <div className="text-[8px] text-slate-500 italic text-center py-4">NO ACTIVE THREATS DETECTED</div>
                        ) : (
                            <div className="space-y-1">
                                {threats.map((t, i) => (
                                    <div key={i} className="flex justify-between items-center text-[8px] p-2 bg-red-500/10 border border-red-500/30 rounded animate-in slide-in-from-left-2 fade-in">
                                        <span className="text-white font-bold">{t.word}</span>
                                        <span className="text-red-400 font-black">{t.category}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </StarkPanel>
            </div>

            {/* Middle: Rolling Chart */}
            <div className="col-span-12 lg:col-span-6">
                <StarkPanel title="REAL-TIME PROBABILITY STREAM" className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="liveAi" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff00ff" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#ff00ff" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="liveHuman" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#00f3ff" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#00f3ff" strokeOpacity={0.1} />
                            <YAxis domain={[0, 100]} hide />
                            <XAxis hide />
                            <Area type="monotone" dataKey="ai" stroke="#ff00ff" strokeWidth={2} fill="url(#liveAi)" animationDuration={300} />
                            <Area type="monotone" dataKey="human" stroke="#00f3ff" strokeWidth={2} fill="url(#liveHuman)" animationDuration={300} />
                        </AreaChart>
                    </ResponsiveContainer>
                </StarkPanel>
            </div>

            {/* Right: Transcript */}
            <div className="col-span-12 lg:col-span-3">
                <StarkPanel title="ANALYSIS LOG" className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[9px] space-y-3 pr-2">
                        {logs.map((l, i) => (
                            <div key={i} className="animate-in slide-in-from-left-2 fade-in flex flex-col gap-1 border-b border-white/5 pb-2">
                                <div className="flex justify-between items-center opacity-70">
                                    <span className={l.type === 'SOURCE' ? "text-[#00f3ff] font-bold" : "text-[#ff00ff] font-bold"}>
                                        {l.type === 'SOURCE' ? '>> AUDIO_INPUT' : '<< SYSTEM_VERDICT'}
                                    </span>
                                    <span className="text-[#00a8ff]">{l.time}</span>
                                </div>
                                <span className={l.type === 'SOURCE' ? "text-white opacity-80" : "text-[#ff00ff] opacity-90"}>
                                    {l.text}
                                </span>
                            </div>
                        ))}
                    </div>
                </StarkPanel>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  // Navigation & System State
  const [currentPage, setCurrentPage] = useState<'home' | 'analysis' | 'tts' | 'api' | 'dashboard'>('home');
  const [isBooting, setIsBooting] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [systemStatus, setSystemStatus] = useState<StatusState>({ active: false, message: '', type: 'process' });
  
  // App Logic State
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.75);
  const [isLiveEnabled, setIsLiveEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('Auto');
  const [pendingFiles, setPendingFiles] = useState<AudioItem[]>([]);
  const [forensicHistory, setForensicHistory] = useState<DetectionResult[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  // Live Feed State
  const [liveConfidence, setLiveConfidence] = useState(0);
  const [humanConfidence, setHumanConfidence] = useState(0);
  const [liveVerdict, setLiveVerdict] = useState<string>('IDLE');
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [detectedLiveLanguage, setDetectedLiveLanguage] = useState<string>('SCANNING...');
  const [liveDataPoints, setLiveDataPoints] = useState<{time: number, ai: number, human: number}[]>([]);
  const [liveMetrics, setLiveMetrics] = useState({ jitter: 10, stability: 90, coherence: 85 });
  const [liveThreats, setLiveThreats] = useState<LiveAnalysisResult['suspiciousKeywords']>([]);
  
  const liveInputBuffer = useRef('');
  const liveOutputBuffer = useRef('');

  // System Simulation State
  const [sysMetrics, setSysMetrics] = useState({
    cpu: 12,
    ram: 45,
    network: 42,
    threat: 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    uptime: 4212 // seconds
  });

  // TTS State
  const [ttsInput, setTtsInput] = useState('');
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState('Puck'); // Default to Puck
  const [translationLang, setTranslationLang] = useState('Original');
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);

  // Dashboard Simulated State
  const [trafficData, setTrafficData] = useState<any[]>(
      Array.from({ length: 15 }, (_, i) => ({ 
          time: i, 
          inbound: 20 + Math.random() * 30, 
          outbound: 15 + Math.random() * 20 
      }))
  );
  const [radarData, setRadarData] = useState([
      { subject: 'Bio-Feasibility', A: 120, fullMark: 150 },
      { subject: 'Spectral Flatness', A: 98, fullMark: 150 },
      { subject: 'Phase Continuity', A: 86, fullMark: 150 },
      { subject: 'Entropy', A: 99, fullMark: 150 },
      { subject: 'Vocoder Artif.', A: 85, fullMark: 150 },
      { subject: 'Emotional Drift', A: 65, fullMark: 150 },
  ]);
  const [securityLogs, setSecurityLogs] = useState<{id: number, time: string, msg: string, type: 'info' | 'warn' | 'crit'}[]>([
      {id: 1, time: '10:42:01', msg: 'NODE_04: Handshake initialized', type: 'info'}
  ]);
  const [geoStats, setGeoStats] = useState([
    { name: 'US-East', val: 75, status: 'NOMINAL' },
    { name: 'EU-West', val: 45, status: 'NOMINAL' },
    { name: 'Asia-Pac', val: 92, status: 'HIGH LOAD' }
  ]);

  // System Metrics & Dashboard Effect Loop
  useEffect(() => {
    const interval = setInterval(() => {
        // System Metrics Simulation
        setSysMetrics(prev => ({
            cpu: Math.min(100, Math.max(5, prev.cpu + (Math.random() - 0.5) * 15)),
            ram: Math.min(100, Math.max(20, prev.ram + (Math.random() - 0.5) * 10)),
            network: Math.max(10, prev.network + (Math.random() - 0.5) * 20),
            threat: Math.random() > 0.98 ? 'HIGH' : Math.random() > 0.95 ? 'MEDIUM' : 'LOW',
            uptime: prev.uptime + 1
        }));

        if (currentPage !== 'dashboard') return;
        
        // Update Traffic
        setTrafficData(prev => {
            const next = [...prev.slice(1), { 
                time: (prev[prev.length-1]?.time || 0) + 1, 
                inbound: 30 + Math.random() * 50 + (Math.sin(Date.now()/1000) * 20), 
                outbound: 20 + Math.random() * 40 
            }];
            return next;
        });
        
        // Update Logs randomly
        if(Math.random() > 0.6) {
            const types: ('info'|'warn'|'crit')[] = ['info', 'info', 'warn', 'crit'];
            const type = types[Math.floor(Math.random() * types.length)];
            const msgs = [
                'Packet inspection complete', 'Anomaly detected in Sector 7', 'Gateway 4 latency high',
                'Deepfake signature match', 'Biometric verification passed', 'API Quota approaching limit',
                'New Neural Model Loaded', 'Heuristic Scan: Negative', 'Spectral Artifact Isolated'
            ];
            const msg = msgs[Math.floor(Math.random() * msgs.length)];
            setSecurityLogs(prev => [{id: Date.now(), time: new Date().toLocaleTimeString(), msg, type}, ...prev].slice(0, 12));
        }

        // Jitter Radar
        setRadarData(prev => prev.map(item => ({...item, A: Math.min(150, Math.max(50, item.A + (Math.random() - 0.5) * 30))})));
        
        // Jitter Geo Stats
        setGeoStats(prev => prev.map(item => ({...item, val: Math.min(100, Math.max(0, item.val + (Math.random() - 0.5) * 5))})));

    }, 1000);
    return () => clearInterval(interval);
  }, [currentPage]);

  // Live Analysis Data Loop
  useEffect(() => {
      if (!isRecording) {
          setLiveDataPoints([]);
          return;
      }
      const interval = setInterval(() => {
          // Push new data point
          setLiveDataPoints(prev => [...prev.slice(-29), {
              time: Date.now(),
              ai: liveConfidence + (Math.random() - 0.5) * 5,
              human: humanConfidence + (Math.random() - 0.5) * 5
          }]);

          // Jitter Metrics
          setLiveMetrics(prev => ({
              jitter: Math.max(0, Math.min(100, prev.jitter + (Math.random() - 0.5) * 10 + (liveConfidence > 50 ? 5 : -5))),
              stability: Math.max(0, Math.min(100, prev.stability + (Math.random() - 0.5) * 10 + (humanConfidence > 50 ? 5 : -5))),
              coherence: Math.max(0, Math.min(100, prev.coherence + (Math.random() - 0.5) * 10))
          }));
      }, 500);
      return () => clearInterval(interval);
  }, [isRecording, liveConfidence, humanConfidence]);


  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveSessionRef = useRef<any>(null);
  const recordingActiveRef = useRef(false);
  const audioChunksRef = useRef<Blob[]>([]);

  // Boot Sequence
  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleReboot = () => {
    setIsBooting(true);
    setTimeout(() => setIsBooting(false), 2500);
  }

  // Audio Init
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      // Connect to destination to hear audio
      analyserRef.current.connect(audioContextRef.current.destination);
    }
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
  };

  // --- NAVIGATION HANDLER ---
  const handleNavigate = (page: typeof currentPage) => {
      if (page === currentPage) return;
      setIsTransitioning(true);
      setTimeout(() => {
          setCurrentPage(page);
          setIsTransitioning(false);
      }, 400); // Wait for deconstruct animation
  };

  // --- ANALYSIS HANDLER ---
  const handleAnalysis = async () => {
    if (pendingFiles.length === 0) return;
    setSystemStatus({ active: true, message: 'INITIALIZING DEEP FORENSIC SCAN ON UPLOADED ARTIFACTS...', type: 'process' });
    
    try {
        const res = await analyzeVoiceBatch(pendingFiles, confidenceThreshold);
        setForensicHistory(prev => [...res.results, ...prev]);
        setPendingFiles([]);
        setSystemStatus(prev => ({ ...prev, active: false }));
    } catch (e: any) { 
        console.error(e);
        setSystemStatus({ active: true, message: e.message || 'CRITICAL ANALYSIS FAILURE', type: 'error' });
    }
  };

  // --- TTS HANDLER ---
  const handleTTS = async () => {
      if (!ttsInput) return;
      initAudio();
      
      try {
          let textToSpeak = ttsInput;
          if (translationLang !== 'Original') {
             setSystemStatus({ active: true, message: `TRANSLATING TO ${translationLang.toUpperCase()}...`, type: 'process' });
             textToSpeak = await translateText(ttsInput, translationLang);
          }

          setSystemStatus({ active: true, message: 'SYNTHESIZING NEURAL AUDIO WAVEFORMS...', type: 'process' });
          const base64 = await generateSpeech(textToSpeak, selectedVoice, ttsPitch, ttsSpeed, 'Neutral');
          
          const audioData = decode(base64);
          const blob = new Blob([audioData], { type: 'audio/wav' }); // UPDATED TO WAV
          const url = URL.createObjectURL(blob);
          
          setTtsAudioUrl(url);
          setSystemStatus(prev => ({ ...prev, active: false }));
      } catch (e: any) {
          setSystemStatus({ active: true, message: e.message || 'SYNTHESIS MODULE FAILURE', type: 'error' });
      }
  };

  const handleDownload = () => {
      if (!ttsAudioUrl) return;
      const link = document.createElement('a');
      link.href = ttsAudioUrl;
      link.download = `JARVIS_SYNTH_${Date.now()}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const toggleRecording = async () => {
      if (isRecording) {
          // STOPPING
          setIsRecording(false);
          recordingActiveRef.current = false;
          
          // Stop MediaRecorder (Triggers onstop for analysis)
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
          }

          if (liveSessionRef.current) {
              try {
                (await liveSessionRef.current).close();
              } catch (e) { console.warn("Session closing error", e); }
          }
          setLiveVerdict('TERMINATED');
          setLiveThreats([]);
      } else {
          // STARTING
          initAudio();
          recordingActiveRef.current = true;
          setLiveVerdict('INITIALIZING...');
          setIsRecording(true);
          setLiveThreats([]);
          audioChunksRef.current = [];
          
          try {
            // Enhanced No-Noise Constraints for Professional Capture
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: { ideal: true },
                    noiseSuppression: { ideal: true },
                    autoGainControl: { ideal: true },
                    sampleRate: { ideal: 48000 },
                    channelCount: 1
                } 
            });

            // MediaRecorder for capturing artifact
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                // Ensure blob is valid before processing
                if (blob.size < 1000) {
                     setSystemStatus({ active: true, message: 'RECORDING TOO SHORT OR EMPTY', type: 'error' });
                     stream.getTracks().forEach(track => track.stop());
                     return;
                }

                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64 = (reader.result as string).split(',')[1];
                    
                    setSystemStatus({ active: true, message: 'ANALYZING TERMINATED FEED ARTIFACT...', type: 'process' });
                    try {
                        const res = await analyzeVoiceBatch([{
                            id: `live-${Date.now()}`,
                            language: 'Auto',
                            audioFormat: 'webm',
                            audioBase64: base64,
                            fileName: `LIVE_CAPTURE_${new Date().toLocaleTimeString().replace(/:/g,'-')}.webm`
                        }], confidenceThreshold);
                        
                        setForensicHistory(prev => [...res.results, ...prev]);
                        setSystemStatus({ active: false, message: '', type: 'process' });
                    } catch (err: any) {
                        setSystemStatus({ active: true, message: `ANALYSIS FAILED: ${err.message}`, type: 'error' });
                    }
                };
                reader.readAsDataURL(blob);
                
                // Cleanup tracks to completely stop the feed
                stream.getTracks().forEach(track => track.stop());
            };

            // Start recording in chunks to ensure data availability
            mediaRecorder.start(200);

            // Connect Visualizer
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            source.connect(analyserRef.current!);
            
            // Gemini Live Analysis
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                callbacks: {
                    onopen: () => {
                        setLiveVerdict('ACTIVE_INTERCEPT');
                        liveInputBuffer.current = '';
                        liveOutputBuffer.current = '';
                    },
                    onmessage: (msg) => {
                        const { serverContent } = msg;
                        if (!serverContent) return;

                        if (serverContent.inputTranscription?.text) {
                            liveInputBuffer.current += serverContent.inputTranscription.text;
                        }

                        if (serverContent.outputTranscription?.text) {
                            const txt = serverContent.outputTranscription.text;
                            liveOutputBuffer.current += txt;
                            
                            const lowerTxt = txt.toLowerCase();
                            if (lowerTxt.includes('ai') || lowerTxt.includes('synthetic') || lowerTxt.includes('fake') || lowerTxt.includes('robotic')) { 
                                setLiveConfidence(prev => Math.min(100, prev + 20)); 
                                setHumanConfidence(prev => Math.max(0, prev - 20)); 
                                setLiveVerdict('SYNTHETIC'); 
                            }
                            else if (lowerTxt.includes('human') || lowerTxt.includes('natural') || lowerTxt.includes('verified') || lowerTxt.includes('real')) { 
                                setHumanConfidence(prev => Math.min(100, prev + 20)); 
                                setLiveConfidence(prev => Math.max(0, prev - 20)); 
                                setLiveVerdict('BIOMETRIC'); 
                            }
                        }

                        if (serverContent.turnComplete) {
                            const userText = liveInputBuffer.current.trim();
                            const systemText = liveOutputBuffer.current.trim();
                            const fullTranscript = `User said: ${userText}. System Analysis: ${systemText}`;

                            if (userText) {
                                setLiveLogs(p => [{ type: 'SOURCE', text: userText, time: new Date().toLocaleTimeString() }, ...p].slice(0, 50));
                            }
                            if (systemText) {
                                setLiveLogs(p => [{ type: 'SYSTEM', text: systemText, time: new Date().toLocaleTimeString() }, ...p].slice(0, 50));
                            }

                            if (fullTranscript.length > 20) {
                                analyzeTranscript(fullTranscript).then(analysis => {
                                    if (analysis.suspiciousKeywords.length > 0) {
                                        setLiveThreats(prev => [...analysis.suspiciousKeywords, ...prev].slice(0, 15));
                                        
                                        setLiveLogs(p => [{
                                            type: 'SYSTEM',
                                            text: `⚠️ THREAT PATTERN MATCHED: ${analysis.suspiciousKeywords.map(k => k.word).join(', ')}`,
                                            time: new Date().toLocaleTimeString()
                                        }, ...p].slice(0, 50));
                                    }
                                });
                            }

                            liveInputBuffer.current = '';
                            liveOutputBuffer.current = '';
                        }
                    },
                    onerror: (e) => {
                         console.error(e);
                         setLiveVerdict('ERROR');
                    }
                },
                config: { 
                    responseModalities: [Modality.AUDIO], 
                    inputAudioTranscription: {}, 
                    outputAudioTranscription: {},
                    systemInstruction: { parts: [{ text: "You are VoxGuard, a real-time voice forgery detection system. Analyze the incoming audio stream for deepfake artifacts, unnatural prosody, and synthesis markers. Continuously output concise verdicts: 'AI DETECTED' or 'HUMAN VERIFIED' followed by a brief forensic reason. Do not be conversational. Report findings." }] }
                }
            });
            liveSessionRef.current = sessionPromise;

            // Stream audio
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
                if(!recordingActiveRef.current) return;
                const input = e.inputBuffer.getChannelData(0);
                const pcm = new Int16Array(input.length);
                for(let i=0; i<input.length; i++) pcm[i] = input[i] * 32768;
                sessionPromise.then(s => s.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: encode(new Uint8Array(pcm.buffer)) }}));
            };
            const liveSource = inputCtx.createMediaStreamSource(stream);
            liveSource.connect(processor); processor.connect(inputCtx.destination);

          } catch (e: any) { 
              console.error(e); 
              setIsRecording(false);
              setSystemStatus({ active: true, message: "LIVE FEED ACCESS DENIED: " + (e.message || "HARDWARE ERROR"), type: 'error' });
          }
      }
  };

  // --- RENDER HELPERS ---
  
  if (isBooting) return (
      <div className="flex items-center justify-center h-screen bg-black text-[#00f3ff] font-mono relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_20%,#000_100%)] z-20"></div>
          <div className="text-center z-30 space-y-4">
              <Aperture className="w-24 h-24 animate-spin mx-auto opacity-80" />
              <div className="text-4xl font-black tracking-[0.5em] glitch-load">J.A.R.V.I.S.</div>
              <div className="text-xs tracking-widest opacity-60">INITIALIZING NEURAL SUBSYSTEMS...</div>
              <div className="w-64 h-1 bg-[#020d18] mx-auto mt-4 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00f3ff] animate-[width_2s_ease-out_forwards]" style={{width: '0%'}}></div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen relative text-[#00f3ff] selection:bg-[#00f3ff] selection:text-black font-sans pb-20">
      <CustomCursor />
      <SystemStatusOverlay status={systemStatus} onAck={() => setSystemStatus({ ...systemStatus, active: false })} />
      
      {/* HEADER HUD */}
      <header className="fixed top-0 w-full h-16 z-50 flex items-center justify-between px-8 border-b border-[#00f3ff]/10 bg-[#020d18]/90 backdrop-blur-sm">
          <div className="flex items-center gap-4">
              <Hexagon className="w-8 h-8 text-[#00f3ff] animate-pulse" />
              <div>
                  <h1 className="font-header text-xl font-bold tracking-[0.2em] text-white holo-text">J.A.R.V.I.S.</h1>
                  <div className="text-[9px] font-mono text-[#00a8ff] tracking-widest">JUST A RATHER VERY INTELLIGENT SYSTEM</div>
              </div>
          </div>
          <div className="flex items-center gap-8">
               <div className="flex items-center gap-2 text-[10px] font-mono">
                   <span className="w-2 h-2 bg-[#00f3ff] rounded-full animate-ping"></span>
                   <span>SYSTEM_ONLINE</span>
               </div>
               <div className="text-right">
                   <div className="text-[10px] font-black text-[#00a8ff]">{new Date().toLocaleTimeString()}</div>
                   <div className="text-[8px] text-[#00f3ff]/50">SECURE_CHANNEL_ENCRYPTED</div>
               </div>
          </div>
      </header>

      {/* NAVIGATION DOCK (ARC REACTOR STYLE) */}
      <nav className="fixed left-0 top-1/2 -translate-y-1/2 z-40 p-4 flex flex-col gap-6">
         {[
             { id: 'home', icon: Aperture, label: 'CORE' },
             { id: 'analysis', icon: Eye, label: 'SCAN' },
             { id: 'tts', icon: Waves, label: 'VOICE' },
             { id: 'dashboard', icon: Activity, label: 'DATA' }
         ].map(item => (
             <button 
                key={item.id}
                onClick={() => handleNavigate(item.id as any)}
                className={`relative group w-14 h-14 flex items-center justify-center rounded-full border transition-all duration-300 ${currentPage === item.id ? 'border-[#00f3ff] bg-[#00f3ff]/10 shadow-[0_0_20px_rgba(0,243,255,0.4)]' : 'border-[#00f3ff]/20 hover:border-[#00f3ff]/60 bg-black/40'}`}
             >
                 <item.icon className={`w-6 h-6 transition-all ${currentPage === item.id ? 'text-white scale-110' : 'text-[#00a8ff] group-hover:text-[#00f3ff]'}`} />
                 {/* Hover Label */}
                 <div className="absolute left-full ml-4 bg-[#020d18] border border-[#00f3ff]/30 px-3 py-1 text-[10px] font-black tracking-widest text-[#00f3ff] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                     {item.label}
                 </div>
                 {currentPage === item.id && <div className="absolute inset-0 rounded-full border border-[#00f3ff] animate-ping opacity-20"></div>}
             </button>
         ))}
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className={`pl-24 pr-8 pt-24 min-h-screen transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0 construct-in'}`}>
        
        {/* HOME: COMMAND NEXUS */}
        {currentPage === 'home' && (
            <div className="grid grid-cols-12 grid-rows-6 gap-6 h-[85vh] pt-4 auto-rows-min">
                
                {/* TOP LEFT: CPU/RAM */}
                <StarkPanel className="col-span-12 md:col-span-3 row-span-2 animate-in slide-in-from-left-10 duration-500" title="SYSTEM RESOURCES">
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-[10px] font-bold text-[#00a8ff] mb-2">
                                <span className="flex items-center gap-2"><CpuIcon className="w-3 h-3" /> CPU_CORE_01</span>
                                <span>{Math.round(sysMetrics.cpu)}%</span>
                            </div>
                            <div className="w-full bg-[#020d18] h-2 border border-[#00f3ff]/20 rounded-sm overflow-hidden flex">
                                {Array.from({length: 20}).map((_,i) => (
                                    <div key={i} className={`flex-1 mx-[1px] ${i/20 < sysMetrics.cpu/100 ? 'bg-[#00f3ff]' : 'bg-[#00f3ff]/5'}`}></div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] font-bold text-[#00a8ff] mb-2">
                                <span className="flex items-center gap-2"><Database className="w-3 h-3" /> MEMORY_BUFFER</span>
                                <span>{Math.round(sysMetrics.ram)}%</span>
                            </div>
                            <div className="w-full bg-[#020d18] h-2 border border-[#00f3ff]/20 rounded-sm overflow-hidden flex">
                                {Array.from({length: 20}).map((_,i) => (
                                    <div key={i} className={`flex-1 mx-[1px] ${i/20 < sysMetrics.ram/100 ? 'bg-[#ff00ff]' : 'bg-[#ff00ff]/5'}`}></div>
                                ))}
                            </div>
                        </div>
                        <div className="pt-4 border-t border-[#00f3ff]/10 grid grid-cols-2 gap-4">
                             <div className="text-center">
                                 <div className="text-[18px] font-mono font-bold text-white">{sysMetrics.uptime}s</div>
                                 <div className="text-[8px] text-slate-500">SYS_UPTIME</div>
                             </div>
                             <div className="text-center">
                                 <div className="text-[18px] font-mono font-bold text-white">{Math.round(sysMetrics.network)}ms</div>
                                 <div className="text-[8px] text-slate-500">LATENCY</div>
                             </div>
                        </div>
                    </div>
                </StarkPanel>

                {/* TOP RIGHT: NETWORK TOPOLOGY */}
                <StarkPanel className="col-span-12 md:col-span-3 md:col-start-10 row-span-2 animate-in slide-in-from-right-10 duration-500" title="ACTIVE NODES">
                     <div className="h-full relative overflow-hidden flex items-center justify-center">
                         <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-4 opacity-20">
                             {Array.from({length: 16}).map((_, i) => (
                                 <div key={i} className="border border-[#00f3ff] rounded-full flex items-center justify-center">
                                     <div className="w-1 h-1 bg-[#00f3ff] rounded-full animate-ping"></div>
                                 </div>
                             ))}
                         </div>
                         <div className="relative z-10 text-center">
                             <Globe className="w-16 h-16 text-[#00f3ff] mx-auto mb-2 animate-[spin_10s_linear_infinite]" />
                             <div className="text-[10px] font-mono text-[#00a8ff]">GLOBAL_LINK_ESTABLISHED</div>
                         </div>
                     </div>
                </StarkPanel>

                {/* CENTER: ARC REACTOR / LOGO */}
                <div className="col-span-12 md:col-span-6 row-span-4 md:col-start-4 md:row-start-2 flex items-center justify-center relative animate-in zoom-in-50 duration-700">
                     <div 
                        onClick={() => handleNavigate('analysis')}
                        className="relative w-[400px] h-[400px] flex items-center justify-center group cursor-pointer"
                     >
                        {/* Interactive Rings */}
                        <div className="absolute inset-0 rounded-full border border-[#00f3ff]/20 animate-[spin_20s_linear_infinite] group-hover:border-[#00f3ff] transition-colors"></div>
                        <div className="absolute inset-10 rounded-full border border-dashed border-[#00a8ff]/30 animate-[spin_30s_linear_infinite_reverse] group-hover:border-[#00a8ff]"></div>
                        <div className="absolute inset-24 rounded-full border border-dotted border-[#00f3ff]/40 animate-[spin_40s_linear_infinite]"></div>
                        
                        {/* Core */}
                        <div className="w-40 h-40 rounded-full bg-gradient-to-b from-[#020d18] to-[#001a33] border-2 border-[#00f3ff] shadow-[0_0_50px_rgba(0,243,255,0.3)] flex flex-col items-center justify-center z-10 group-hover:shadow-[0_0_100px_rgba(0,243,255,0.6)] group-hover:scale-105 transition-all">
                            <Search className="w-12 h-12 text-[#00f3ff] mb-2 group-hover:animate-pulse" />
                            <span className="text-[10px] tracking-[0.3em] font-black text-white group-hover:text-[#00f3ff]">SCAN</span>
                        </div>

                        {/* Orbitals */}
                        <div className="absolute w-full h-full animate-[spin_8s_linear_infinite]">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-2 h-2 bg-[#00f3ff] rounded-full shadow-[0_0_10px_#00f3ff]"></div>
                        </div>
                     </div>
                </div>

                {/* BOTTOM LEFT: TERMINAL */}
                <StarkPanel className="col-span-12 md:col-span-4 row-span-2 md:row-start-5 animate-in slide-in-from-bottom-10 duration-500" title="KERNEL LOG">
                     <div className="h-full font-mono text-[9px] overflow-hidden relative">
                         <div className="absolute inset-0 overflow-y-auto custom-scrollbar space-y-1 pb-4">
                             {securityLogs.map(log => (
                                 <div key={log.id} className="flex gap-2 opacity-70">
                                     <span className="text-[#00a8ff]">{log.time}</span>
                                     <span className="text-white truncate">> {log.msg}</span>
                                 </div>
                             ))}
                             <div className="animate-pulse text-[#00f3ff]">> _</div>
                         </div>
                     </div>
                </StarkPanel>

                {/* BOTTOM RIGHT: THREAT MATRIX */}
                <StarkPanel className="col-span-12 md:col-span-4 md:col-start-9 row-span-2 md:row-start-5 animate-in slide-in-from-bottom-10 duration-500" title="THREAT MATRIX">
                     <div className="h-full flex flex-col items-center justify-center">
                         <div className={`text-5xl font-black tracking-tighter mb-2 transition-all duration-500 ${
                             sysMetrics.threat === 'CRITICAL' ? 'text-red-600 animate-pulse drop-shadow-[0_0_20px_red]' : 
                             sysMetrics.threat === 'HIGH' ? 'text-[#ff4500]' : 
                             sysMetrics.threat === 'MEDIUM' ? 'text-yellow-400' : 'text-[#00f3ff]'
                         }`}>
                             {sysMetrics.threat}
                         </div>
                         <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-4">
                             <div className={`h-full transition-all duration-500 ${
                                 sysMetrics.threat === 'CRITICAL' ? 'bg-red-600 w-full' : 
                                 sysMetrics.threat === 'HIGH' ? 'bg-[#ff4500] w-3/4' : 
                                 sysMetrics.threat === 'MEDIUM' ? 'bg-yellow-400 w-1/2' : 'bg-[#00f3ff] w-1/4'
                             }`}></div>
                         </div>
                         <div className="text-[10px] text-slate-500 mt-2 font-mono tracking-widest uppercase">
                             Active Protocols: {sysMetrics.threat === 'LOW' ? 'Standard Monitoring' : 'Enhanced Defense'}
                         </div>
                     </div>
                </StarkPanel>

            </div>
        )}

        {/* ANALYSIS: SCAN CHAMBER */}
        {currentPage === 'analysis' && (
            <div className="grid grid-cols-12 gap-8 min-h-[85vh]">
                {/* Left Control Panel */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    <StarkPanel title={<><Settings className="w-3 h-3"/> CONFIGURATION</>} className="space-y-6">
                        {/* File Upload Drop Zone */}
                        <div 
                            className="relative h-32 border border-dashed border-[#00f3ff]/30 bg-[#00f3ff]/5 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-[#00f3ff]/10 hover:border-[#00f3ff] transition-all group overflow-hidden"
                            onClick={() => !isRecording && fileInputRef.current?.click()}
                        >
                            <div className="absolute inset-0 grid grid-cols-6 grid-rows-2 opacity-10 pointer-events-none">
                                {[...Array(12)].map((_, i) => <div key={i} className="border border-[#00f3ff]"></div>)}
                            </div>
                            <Upload className={`w-8 h-8 mb-2 transition-transform ${isRecording ? 'text-slate-600' : 'text-[#00f3ff] group-hover:scale-110'}`} />
                            <span className={`text-[10px] font-black tracking-widest ${isRecording ? 'text-slate-600' : 'text-white'}`}>
                                {isRecording ? 'DISABLED DURING LIVE SCAN' : 'UPLOAD_SOURCE_FILE'}
                            </span>
                            <input type="file" ref={fileInputRef} className="hidden" multiple accept=".mp3,.wav" onChange={(e) => {
                                if (e.target.files) {
                                    (Array.from(e.target.files) as File[]).forEach((f) => {
                                        const r = new FileReader();
                                        r.onload = () => setPendingFiles(p => [...p, {
                                            id: Math.random().toString(36), language: 'Auto', audioFormat: 'mp3',
                                            audioBase64: (r.result as string).split(',')[1], fileName: f.name
                                        }]);
                                        r.readAsDataURL(f);
                                    });
                                }
                            }} />
                        </div>

                        {/* Live Feed Toggle */}
                        <button 
                            onClick={toggleRecording}
                            className={`w-full py-4 border relative overflow-hidden group transition-all ${isRecording ? 'border-[#ff4500] bg-[#ff4500]/10' : 'border-[#00f3ff] bg-[#00f3ff]/10'}`}
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full ${isRecording ? 'bg-[#ff4500]' : 'bg-[#00f3ff]'}`}></div>
                            <div className="flex items-center justify-center gap-3">
                                {isRecording ? <MicOff className="w-4 h-4 text-[#ff4500] animate-pulse"/> : <Mic className="w-4 h-4 text-[#00f3ff]"/>}
                                <span className={`text-xs font-black tracking-[0.3em] ${isRecording ? 'text-[#ff4500]' : 'text-[#00f3ff]'}`}>
                                    {isRecording ? 'TERMINATE FEED' : 'INITIATE LIVE FEED'}
                                </span>
                            </div>
                        </button>
                        
                        {/* Settings */}
                        <div className="space-y-2">
                             <div className="flex justify-between text-[9px] font-black tracking-widest text-[#00a8ff]">
                                 <span>SENSITIVITY</span>
                                 <span>{Math.round(confidenceThreshold * 100)}%</span>
                             </div>
                             <input type="range" min="0.5" max="0.99" step="0.01" value={confidenceThreshold} onChange={e => setConfidenceThreshold(parseFloat(e.target.value))} 
                                 className="w-full h-1 bg-[#020d18] appearance-none rounded cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#00f3ff]" />
                        </div>
                    </StarkPanel>

                    {/* Pending Files Queue */}
                    {pendingFiles.length > 0 && !isRecording && (
                        <StarkPanel title="PROCESSING QUEUE" className="flex-1">
                             <div className="space-y-2">
                                 {pendingFiles.map(f => (
                                     <div key={f.id} className="flex justify-between items-center p-2 border border-[#00f3ff]/20 bg-[#00f3ff]/5 text-[10px]">
                                         <span className="truncate w-32">{f.fileName}</span>
                                         <X className="w-3 h-3 cursor-pointer hover:text-[#ff4500]" onClick={() => setPendingFiles(p => p.filter(x => x.id !== f.id))} />
                                     </div>
                                 ))}
                                 <button onClick={handleAnalysis} className="w-full py-2 bg-[#00f3ff] text-black font-black text-xs tracking-widest hover:bg-white transition-colors">
                                     EXECUTE ANALYSIS
                                 </button>
                             </div>
                        </StarkPanel>
                    )}
                </div>

                {/* Main Visualizer & Results */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full">
                     <StarkPanel className="h-64 relative overflow-hidden p-0" title="SPECTRAL VISUALIZER">
                         <div className="absolute top-4 right-4 z-10 flex gap-2">
                            {isRecording && <div className="px-2 py-1 bg-[#ff4500] text-black text-[8px] font-black animate-pulse rounded">LIVE INTERCEPT ACTIVE</div>}
                         </div>
                         <WaveformVisualizer 
                             analyser={analyserRef.current}
                             isActive={isRecording}
                             color={liveVerdict === 'SYNTHETIC' ? '#ff4500' : '#00f3ff'}
                             aiScore={liveConfidence}
                             humanScore={humanConfidence}
                             verdict={liveVerdict}
                         />
                     </StarkPanel>
                     
                     <div className="flex-1 overflow-visible space-y-4 pr-2 pb-10">
                         {isRecording ? (
                            /* --- REAL-TIME LIVE MONITOR --- */
                            <LiveAnalysisMonitor 
                                data={liveDataPoints} 
                                logs={liveLogs} 
                                metrics={liveMetrics} 
                                verdict={liveVerdict}
                                threats={liveThreats}
                            />
                         ) : (
                            /* --- HISTORY LIST --- */
                            forensicHistory.map((res, i) => (
                                <AnalysisReportCard 
                                    key={i} 
                                    fileName={res.fileName} 
                                    timestamp={res.timestamp} 
                                    color={res.classification === 'AI_GENERATED' ? 'magenta' : 'emerald'} 
                                    message={res.explanation} 
                                    classification={res.classification} 
                                    confidence={res.confidenceScore}
                                    spectralMarkers={res.spectralMarkers}
                                    suspectedAlgorithm={res.suspectedAlgorithm}
                                    scamLikelihood={res.scamLikelihood}
                                    riskLevel={res.riskLevel}
                                    intentAnalysis={res.intentAnalysis}
                                    domainAnalysis={res.domainAnalysis}
                                    forensicData={res.forensicData}
                                />
                            ))
                         )}
                     </div>
                </div>
            </div>
        )}

        {/* TTS: VOICE SYNTHESIS */}
        {currentPage === 'tts' && (
            <div className="flex items-center justify-center min-h-[80vh]">
                <StarkPanel title="NEURAL VOICE RECONSTRUCTION" className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[600px]">
                     <div className="space-y-6">
                         <div className="space-y-4">
                             <label className="text-[10px] font-black text-[#00a8ff] tracking-widest">MODEL SELECTION</label>
                             <div className="space-y-2">
                                 {VOICES.map(v => (
                                     <div key={v.id} onClick={() => setSelectedVoice(v.id)} 
                                        className={`p-4 border cursor-pointer transition-all ${selectedVoice === v.id ? 'border-[#00f3ff] bg-[#00f3ff]/10' : 'border-[#00f3ff]/20 opacity-50 hover:opacity-100'}`}>
                                         <div className="text-xs font-black text-white">{v.label}</div>
                                         <div className="text-[9px] text-[#00a8ff]">{v.desc}</div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="text-[9px] text-[#00a8ff]">PITCH MODULATION</label>
                                 <input type="range" min="0.5" max="2" step="0.1" value={ttsPitch} onChange={e => setTtsPitch(parseFloat(e.target.value))} className="w-full accent-[#00f3ff] h-1 bg-[#020d18] appearance-none" />
                             </div>
                             <div>
                                 <label className="text-[9px] text-[#00a8ff]">TEMPORAL SHIFT</label>
                                 <input type="range" min="0.5" max="2" step="0.1" value={ttsSpeed} onChange={e => setTtsSpeed(parseFloat(e.target.value))} className="w-full accent-[#00f3ff] h-1 bg-[#020d18] appearance-none" />
                             </div>
                         </div>
                         <div>
                             <label className="text-[9px] text-[#00a8ff] block mb-2">TARGET LANGUAGE (TRANSLATION)</label>
                             <select 
                                value={translationLang} 
                                onChange={e => setTranslationLang(e.target.value)}
                                className="w-full bg-[#020d18] border border-[#00f3ff]/30 text-[#00f3ff] text-xs p-2 rounded focus:outline-none focus:border-[#00f3ff]"
                             >
                                {TRANSLATION_LANGUAGES.map(lang => (
                                    <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                                ))}
                             </select>
                         </div>
                     </div>
                     <div className="flex flex-col gap-4">
                         <textarea 
                             value={ttsInput}
                             onChange={e => setTtsInput(e.target.value)}
                             placeholder="ENTER TEXT SEQUENCE..." 
                             className="flex-1 bg-[#020d18] border border-[#00f3ff]/30 p-4 text-[#00f3ff] font-mono text-sm resize-none focus:outline-none focus:border-[#00f3ff]"
                         />
                         
                         <div className="flex gap-2">
                             <button onClick={handleTTS} className="flex-1 py-4 bg-[#00f3ff] text-black font-black tracking-widest hover:bg-white transition-colors relative overflow-hidden group">
                                 <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                                 <span className="relative z-10 flex items-center justify-center gap-2">
                                     <Waves className="w-4 h-4"/> 
                                     {translationLang === 'Original' ? 'SYNTHESIZE' : `TRANSLATE & SYNTHESIZE`}
                                 </span>
                             </button>

                             {ttsAudioUrl && (
                                 <button onClick={handleDownload} className="px-6 bg-[#020d18] border border-[#00f3ff] text-[#00f3ff] hover:bg-[#00f3ff] hover:text-black transition-colors flex items-center justify-center group">
                                     <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                 </button>
                             )}
                         </div>

                         {ttsAudioUrl && (
                             <AudioPlayer 
                                src={ttsAudioUrl} 
                                audioContext={audioContextRef.current} 
                                analyser={analyserRef.current} 
                             />
                         )}
                     </div>
                </StarkPanel>
            </div>
        )}

        {/* DASHBOARD: DATA VISUALIZATION */}
        {currentPage === 'dashboard' && (
             <div className="grid grid-cols-12 gap-6 min-h-[85vh] auto-rows-min pb-20">
                 {/* Top Row: Quick Stats */}
                 {[
                     { label: 'GLOBAL NETWORK SCANS', val: '842,912', icon: Globe },
                     { label: 'ACTIVE THREATS', val: '124', icon: ShieldAlert, color: 'text-[#ff4500]' },
                     { label: 'NEURAL NODES', val: '718', icon: Server },
                     { label: 'API LATENCY', val: '42ms', icon: Zap }
                 ].map((stat, i) => (
                     <StarkPanel key={i} className="col-span-12 md:col-span-6 lg:col-span-3 flex items-center justify-between p-6 bg-[#020d18]/80 animate-in slide-in-from-top-4 duration-500" style={{animationDelay: `${i*100}ms`}}>
                         <div>
                             <div className="text-[9px] font-black tracking-[0.2em] text-[#00a8ff] mb-2">{stat.label}</div>
                             <div className={`text-3xl font-mono font-bold ${stat.color || 'text-white'}`}>{stat.val}</div>
                         </div>
                         <stat.icon className={`w-8 h-8 opacity-50 ${stat.color || 'text-[#00f3ff]'}`} />
                     </StarkPanel>
                 ))}

                 {/* NEW SECTION: RECENT FORENSIC OPERATIONS */}
                 <StarkPanel className="col-span-12 animate-in fade-in duration-700" title="RECENT FORENSIC OPERATIONS">
                     <div className="overflow-x-auto">
                         <table className="w-full text-left text-[10px] font-mono">
                             <thead>
                                 <tr className="border-b border-[#00f3ff]/20 text-[#00a8ff]">
                                     <th className="p-3">TIMESTAMP</th>
                                     <th className="p-3">FILE ID</th>
                                     <th className="p-3">CLASSIFICATION</th>
                                     <th className="p-3">CONFIDENCE</th>
                                     <th className="p-3">RISK ASSESSMENT</th>
                                     <th className="p-3">ORIGIN</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {forensicHistory.length === 0 ? (
                                     <tr><td colSpan={6} className="p-8 text-center text-slate-500 italic tracking-widest">NO FORENSIC DATA AVAILABLE IN BUFFER</td></tr>
                                 ) : (
                                     forensicHistory.map((item, idx) => (
                                         <tr key={idx} className="border-b border-[#00f3ff]/5 hover:bg-[#00f3ff]/5 transition-colors group">
                                             <td className="p-3 text-slate-400">{new Date(item.timestamp).toLocaleTimeString()}</td>
                                             <td className="p-3 text-white truncate max-w-[150px]">{item.fileName}</td>
                                             <td className={`p-3 font-bold ${item.classification === 'AI_GENERATED' ? 'text-[#ff00ff]' : 'text-[#00f3ff]'}`}>
                                                 {item.classification}
                                             </td>
                                             <td className="p-3">
                                                 <div className="flex items-center gap-2">
                                                     <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                                         <div className={`h-full ${item.classification === 'AI_GENERATED' ? 'bg-[#ff00ff]' : 'bg-[#00f3ff]'}`} style={{width: `${item.confidenceScore * 100}%`}}></div>
                                                     </div>
                                                     <span>{(item.confidenceScore * 100).toFixed(0)}%</span>
                                                 </div>
                                             </td>
                                             <td className="p-3">
                                                 <span className={`px-2 py-0.5 rounded border ${
                                                     item.riskLevel === 'CRITICAL' ? 'bg-red-500/10 border-red-500 text-red-500' : 
                                                     item.riskLevel === 'HIGH' ? 'bg-orange-500/10 border-orange-500 text-orange-500' :
                                                     'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                                                 } text-[8px] font-black uppercase`}>
                                                     {item.riskLevel}
                                                 </span>
                                             </td>
                                             <td className="p-3 text-slate-500 text-[9px] uppercase">{item.suspectedAlgorithm || 'UNKNOWN'}</td>
                                         </tr>
                                     ))
                                 )}
                             </tbody>
                         </table>
                     </div>
                 </StarkPanel>
                 
                 {/* Middle: Main Traffic Chart */}
                 <StarkPanel className="col-span-12 lg:col-span-8 h-[350px]" title={<><Activity className="w-3 h-3"/> REAL-TIME NETWORK TRAFFIC</>}>
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trafficData}>
                              <defs>
                                  <linearGradient id="inbound" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#00f3ff" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="outbound" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#ff00ff" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#ff00ff" stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#00f3ff" strokeOpacity={0.1} vertical={false} />
                              <XAxis dataKey="time" hide />
                              <YAxis hide domain={[0, 100]} />
                              <RechartsTooltip 
                                contentStyle={{backgroundColor: '#020d18', borderColor: '#00f3ff', color: '#fff'}}
                                itemStyle={{color: '#fff', fontSize: '10px'}}
                              />
                              <Area type="monotone" dataKey="inbound" stroke="#00f3ff" strokeWidth={2} fill="url(#inbound)" isAnimationActive={false} />
                              <Area type="monotone" dataKey="outbound" stroke="#ff00ff" strokeWidth={2} fill="url(#outbound)" isAnimationActive={false} />
                          </AreaChart>
                      </ResponsiveContainer>
                      <div className="flex gap-4 absolute top-4 right-4">
                          <div className="flex items-center gap-2 text-[9px] text-[#00a8ff]"><div className="w-2 h-2 bg-[#00f3ff] rounded-full"></div> INBOUND</div>
                          <div className="flex items-center gap-2 text-[9px] text-[#ff00ff]"><div className="w-2 h-2 bg-[#ff00ff] rounded-full"></div> OUTBOUND</div>
                      </div>
                 </StarkPanel>

                 {/* Middle: Security Logs */}
                 <StarkPanel className="col-span-12 lg:col-span-4 h-[350px] flex flex-col" title={<><Terminal className="w-3 h-3"/> LIVE SECURITY LOG</>}>
                     <div className="flex-1 overflow-hidden relative">
                        <div className="absolute inset-0 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                             {securityLogs.map((log) => (
                                 <div key={log.id} className="flex gap-2 font-mono text-[9px] border-b border-[#00f3ff]/10 pb-1 mb-1 animate-in slide-in-from-left-2 fade-in">
                                     <span className="text-[#00a8ff] whitespace-nowrap">[{log.time}]</span>
                                     <span className={`${log.type === 'crit' ? 'text-[#ff4500] font-bold' : log.type === 'warn' ? 'text-yellow-400' : 'text-white/80'}`}>
                                         {log.type === 'crit' && 'CRITICAL :: '}
                                         {log.msg}
                                     </span>
                                 </div>
                             ))}
                        </div>
                     </div>
                 </StarkPanel>

                 {/* Bottom: Radar & Pie */}
                 <StarkPanel className="col-span-12 md:col-span-6 lg:col-span-4 h-[300px]" title={<><RadarIcon className="w-3 h-3"/> FORENSIC ENGINE PERFORMANCE</>}>
                     <ResponsiveContainer width="100%" height="100%">
                         <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                             <PolarGrid stroke="#00f3ff" strokeOpacity={0.2} />
                             <PolarAngleAxis dataKey="subject" tick={{ fill: '#00a8ff', fontSize: 9 }} />
                             <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                             <Radar name="Performance" dataKey="A" stroke="#00f3ff" strokeWidth={2} fill="#00f3ff" fillOpacity={0.3} />
                         </RadarChart>
                     </ResponsiveContainer>
                 </StarkPanel>

                 <StarkPanel className="col-span-12 md:col-span-6 lg:col-span-4 h-[300px]" title={<><Disc className="w-3 h-3"/> THREAT VECTOR DISTRIBUTION</>}>
                     <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                             <Pie
                                 data={[
                                     { name: 'Deepfake', value: 400 },
                                     { name: 'TTS', value: 300 },
                                     { name: 'VC', value: 300 },
                                     { name: 'Replay', value: 200 }
                                 ]}
                                 cx="50%" cy="50%" innerRadius={60} outerRadius={80}
                                 paddingAngle={5} dataKey="value"
                             >
                                 <Cell fill="#00f3ff" stroke="none" />
                                 <Cell fill="#ff00ff" stroke="none" />
                                 <Cell fill="#ff4500" stroke="none" />
                                 <Cell fill="#00a8ff" stroke="none" />
                             </Pie>
                             <RechartsTooltip contentStyle={{backgroundColor: '#020d18', borderColor: '#00f3ff', color: '#fff'}} itemStyle={{fontSize:'10px'}} />
                         </PieChart>
                     </ResponsiveContainer>
                     <div className="flex flex-wrap gap-4 justify-center mt-[-20px] text-[9px] font-bold">
                         <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00f3ff]"></span> DEEPFAKE</div>
                         <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ff00ff]"></span> TTS</div>
                         <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ff4500]"></span> VC</div>
                     </div>
                 </StarkPanel>
                 
                 {/* Geo Stats */}
                 <StarkPanel className="col-span-12 lg:col-span-4 h-[300px] space-y-4" title={<><MapPin className="w-3 h-3"/> REGIONAL NODE STATUS</>}>
                     {geoStats.map((stat, i) => (
                         <div key={i} className="space-y-1">
                             <div className="flex justify-between text-[10px] font-black text-[#00a8ff] tracking-widest">
                                 <span>{stat.name}</span>
                                 <span className="text-[#ff4500]">{stat.status}</span>
                             </div>
                             <div className="w-full h-2 bg-[#00f3ff]/10 rounded-full overflow-hidden">
                                 <div 
                                     className={`h-full transition-all duration-1000 ${stat.status === 'HIGH LOAD' ? 'bg-[#ff4500]' : 'bg-[#00f3ff]'}`} 
                                     style={{width: `${stat.val}%`}}
                                 ></div>
                             </div>
                         </div>
                     ))}
                     <div className="pt-4 mt-4 border-t border-[#00f3ff]/20">
                         <div className="flex items-center gap-3">
                             <Wifi className="w-4 h-4 text-[#00f3ff] animate-pulse" />
                             <span className="text-[10px] text-white font-mono">UPLINK_STABLE :: 4096 TB/s</span>
                         </div>
                     </div>
                 </StarkPanel>

             </div>
        )}

      </main>
    </div>
  );
};

export default App;
