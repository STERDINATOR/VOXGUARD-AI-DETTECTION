
import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  analyser?: AnalyserNode | null;
  audioContext?: AudioContext | null;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, analyser, audioContext }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize Audio Source and connect to Visualizer
  useEffect(() => {
    if (audioRef.current && audioContext && analyser && !sourceRef.current) {
        try {
            sourceRef.current = audioContext.createMediaElementSource(audioRef.current);
            sourceRef.current.connect(analyser);
            // We rely on the App.tsx to connect the analyser to the destination (speakers)
            // But if it doesn't, we might need to connect source -> destination as well.
            // Assuming App.tsx structure: Analyser -> Destination.
            // So Source -> Analyser -> Destination chain is complete.
        } catch (e) {
            console.error("Audio Routing Error", e);
        }
    }
  }, [audioContext, analyser, src]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Resume context if suspended (browser policy)
        if (audioContext?.state === 'suspended') {
            audioContext.resume();
        }
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      audioRef.current.muted = newMuted;
    }
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-[#020d18] border border-[#00f3ff]/30 p-4 rounded-lg flex flex-col gap-4 shadow-[0_0_20px_rgba(0,243,255,0.1)] relative overflow-hidden group">
      {/* Background Tech Details */}
      <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none">
          <div className="flex gap-1">
              <div className="w-1 h-1 bg-[#00f3ff] rounded-full animate-ping"></div>
              <div className="text-[8px] font-mono text-[#00f3ff]">AUDIO_BUFFER_ACTIVE</div>
          </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Row 1: Playback & Time */}
      <div className="flex items-center justify-between">
        <button 
            onClick={togglePlay}
            className="w-10 h-10 rounded-full border border-[#00f3ff] flex items-center justify-center text-[#00f3ff] hover:bg-[#00f3ff] hover:text-black transition-all shadow-[0_0_10px_rgba(0,243,255,0.3)]"
        >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>
        
        <div className="font-mono text-[#00f3ff] text-xs tracking-widest">
            {formatTime(currentTime)} <span className="opacity-50">/</span> {formatTime(duration)}
        </div>
      </div>

      {/* Row 2: Seek Bar */}
      <div className="relative w-full h-4 flex items-center group/seek">
          <div className="absolute w-full h-1 bg-[#00f3ff]/20 rounded-full overflow-hidden">
              <div 
                  className="h-full bg-[#00f3ff] shadow-[0_0_10px_#00f3ff]" 
                  style={{ width: `${(currentTime / duration) * 100}%` }}
              ></div>
          </div>
          <input 
              type="range" 
              min="0" 
              max={duration || 0} 
              value={currentTime} 
              onChange={handleSeek}
              className="absolute w-full h-full opacity-0 cursor-pointer z-10"
          />
          {/* Thumb Indicator (Visual only, follows progress) */}
          <div 
              className="absolute h-3 w-1 bg-white pointer-events-none transition-all"
              style={{ left: `${(currentTime / duration) * 100}%` }}
          ></div>
      </div>

      {/* Row 3: Volume & Meta */}
      <div className="flex items-center gap-4">
          <button onClick={toggleMute} className="text-[#00f3ff] hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="w-24 relative h-1 bg-[#00f3ff]/20 rounded-full group/vol">
               <div className="absolute h-full bg-[#00f3ff]" style={{ width: `${isMuted ? 0 : volume * 100}%` }}></div>
               <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               />
          </div>
          <div className="ml-auto text-[8px] text-[#00a8ff] font-mono">
              OUTPUT_GAIN: {Math.round(volume * 100)}%
          </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
