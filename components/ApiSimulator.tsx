
import React, { useState } from 'react';
import { ApiRequest, ApiResponse } from '../types';
import { Terminal, Play, ShieldCheck, Server } from 'lucide-react';

interface Props {
  request: ApiRequest | null;
  response: ApiResponse | null;
}

const ApiSimulator: React.FC<Props> = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const execute = async () => {
      setLoading(true);
      setLogs(['> INITIATING HANDSHAKE...', '> CONNECTING TO SECURE GATEWAY...', '> UPLOADING PAYLOAD...']);
      await new Promise(r => setTimeout(r, 800));
      setLogs(p => [...p, '> ANALYZING SPECTRAL DATA...', '> VERIFYING SIGNATURES...']);
      await new Promise(r => setTimeout(r, 800));
      setLogs(p => [...p, '> SUCCESS: THREAT IDENTIFIED.']);
      setLoading(false);
  };

  return (
    <div className="h-full bg-[#020d18] border border-[#00f3ff]/30 p-6 font-mono text-xs flex flex-col relative overflow-hidden">
        {/* CRT Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
        
        <div className="flex items-center justify-between mb-4 border-b border-[#00f3ff]/20 pb-2">
            <span className="text-[#00f3ff] font-bold">TERMINAL_ACCESS_V4</span>
            <span className="text-[#00a8ff]">PORT: 443 [SECURE]</span>
        </div>

        <div className="flex-1 space-y-2 text-[#00f3ff] opacity-80 overflow-hidden">
            <div className="text-[#00a8ff]">// WAITING FOR COMMAND...</div>
            {logs.map((l, i) => <div key={i}>{l}</div>)}
            {loading && <div className="animate-pulse">_</div>}
        </div>

        <button onClick={execute} disabled={loading} className="mt-4 w-full py-3 border border-[#00f3ff] text-[#00f3ff] hover:bg-[#00f3ff] hover:text-black transition-colors font-bold tracking-widest flex items-center justify-center gap-2">
             <Play className="w-4 h-4"/> EXECUTE PROTOCOL
        </button>
    </div>
  );
};

export default ApiSimulator;
