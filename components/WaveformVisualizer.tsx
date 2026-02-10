
import React, { useEffect, useRef } from 'react';

interface Props {
  analyser: AnalyserNode | null;
  isActive: boolean;
  color?: string;
  pulseIntensity?: number; // 0 to 100
  aiScore?: number;
  humanScore?: number;
  verdict?: string;
  previewParams?: {
    pitch: number;
    speed: number;
    tone: string;
  };
}

const WaveformVisualizer: React.FC<Props> = ({ 
  analyser, 
  isActive, 
  color = '#00f3ff', 
  pulseIntensity = 0,
  aiScore = 0,
  humanScore = 0,
  verdict = 'IDLE',
  previewParams
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pulseRef = useRef(0);
  const ringsRef = useRef<{ radius: number; opacity: number }[]>([]);
  
  // Use a ref to hold the latest props. 
  // This allows the animation loop to read the most current values (like rapid slider changes) 
  // without triggering a full re-render/effect cleanup of the canvas loop.
  const propsRef = useRef({ isActive, color, pulseIntensity, aiScore, humanScore, verdict, previewParams });

  useEffect(() => {
    propsRef.current = { isActive, color, pulseIntensity, aiScore, humanScore, verdict, previewParams };
  }, [isActive, color, pulseIntensity, aiScore, humanScore, verdict, previewParams]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      animationId = requestAnimationFrame(render);
      
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      
      // Access latest values from ref
      const { isActive, color, pulseIntensity, aiScore, humanScore, verdict, previewParams } = propsRef.current;

      // Cyberpunk background cleanup with slight trail effect
      ctx.fillStyle = 'rgba(5, 5, 5, 0.3)';
      ctx.fillRect(0, 0, width, height);

      // Pulse calculation
      if (pulseIntensity > 0) {
        pulseRef.current = (pulseRef.current + 0.05 + (pulseIntensity / 1000)) % (Math.PI * 2);
        
        if (Math.random() < (pulseIntensity / 500)) {
          ringsRef.current.push({ radius: 0, opacity: 1 });
        }
      }

      // Draw Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Handle Preview Mode (Simulation)
      if (!isActive && previewParams) {
         const { pitch, speed, tone } = previewParams;
         const time = Date.now() / 1000;
         
         // Tone Visual Configuration
         let waveColor = '#00f3ff';
         let jitter = 0; // noise factor
         let layers = 2; // number of wave layers
         let thickness = 2;

         if (tone === 'Authoritative') {
            waveColor = '#ef4444'; // Red
            thickness = 3;
         } else if (tone === 'Whisper') {
            waveColor = '#94a3b8'; // Slate
            jitter = 0.5; // high noise
            thickness = 1;
            layers = 3;
         } else if (tone === 'Energetic') {
            waveColor = '#facc15'; // Yellow
            jitter = 0.1;
         } else if (tone === 'Deep') {
            waveColor = '#a855f7'; // Purple
            thickness = 3;
            layers = 1;
         }
         
         const baseFreq = 0.015 * speed * (tone === 'Deep' ? 0.6 : 1.2);
         const baseAmp = (height / 3.5) * (pitch > 1.5 ? 1.3 : pitch); 

         // Render Simulation Layers
         for (let l = 0; l < layers; l++) {
           ctx.beginPath();
           ctx.strokeStyle = waveColor;
           ctx.lineWidth = thickness;
           ctx.shadowBlur = 15;
           ctx.shadowColor = waveColor;
           ctx.globalAlpha = 1 - (l * 0.4); // fade out secondary layers

           for (let x = 0; x < width; x++) {
              let normalizedX = x * baseFreq;
              
              // Movement speed based on 'speed' param
              let moveSpeed = time * (speed * 6);
              // Offset layers
              let layerOffset = l * (Math.PI / 3);

              // Primary Carrier Wave
              let y = Math.sin(normalizedX + moveSpeed + layerOffset);
              
              // Tone-specific modulation
              if (tone === 'Authoritative') {
                 // Square-ish wave for authority
                 y = Math.sign(y) * Math.pow(Math.abs(y), 0.7);
              } else if (tone === 'Energetic') {
                 // Add higher freq component
                 y += Math.sin(normalizedX * 2 + moveSpeed * 1.5) * 0.4;
              }

              // Apply Amplitude (Pitch)
              y *= baseAmp;

              // Apply Jitter (Noise for Whisper/Breathy tones)
              if (jitter > 0) {
                 y += (Math.random() - 0.5) * jitter * baseAmp * 0.8;
              }

              // Center
              y += height / 2;

              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
           }
           ctx.stroke();
         }
         
         ctx.globalAlpha = 1.0;
         ctx.shadowBlur = 0;

         // Parameter HUD Overlay
         const hudX = 20;
         const hudBottom = height - 20;
         
         ctx.font = '9px "Orbitron", sans-serif';
         ctx.fillStyle = waveColor;
         ctx.textAlign = 'left';
         
         // Scanline/Box effect for HUD
         ctx.strokeStyle = `${waveColor}44`;
         ctx.strokeRect(hudX - 10, hudBottom - 60, 140, 70);
         
         ctx.fillStyle = `${waveColor}aa`;
         ctx.fillText(`SIMULATION_MODE`, hudX, hudBottom - 45);
         
         ctx.fillStyle = waveColor;
         ctx.fillText(`PITCH:  ${(pitch * 100).toFixed(0)}%`, hudX, hudBottom - 30);
         // Draw bar for pitch
         ctx.fillRect(hudX + 60, hudBottom - 36, (pitch / 2) * 50, 4);
         
         ctx.fillText(`SPEED:  ${(speed * 100).toFixed(0)}%`, hudX, hudBottom - 15);
         // Draw bar for speed
         ctx.fillRect(hudX + 60, hudBottom - 21, (speed / 2) * 50, 4);
         
         ctx.fillText(`TONE:   ${tone.toUpperCase()}`, hudX, hudBottom);

         // Skip standard processing
         return; 
      }

      // Standard Real-time Visualization Logic (Active Analysis)
      if (pulseIntensity > 50) {
        ctx.save();
        ringsRef.current = ringsRef.current.filter(r => r.opacity > 0.01);
        ringsRef.current.forEach(ring => {
          ring.radius += 2 + (pulseIntensity / 25);
          ring.opacity *= 0.96;
          
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, ring.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `${color}${Math.floor(ring.opacity * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        if (Math.random() < (pulseIntensity / 200)) {
          const gx = Math.random() * width;
          ctx.fillStyle = `${color}44`;
          ctx.fillRect(gx, 0, 2, height);
        }
        ctx.restore();
      }

      if (isActive && aiScore > 5) {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        const intensity = aiScore / 100;
        const pulseSpeed = Date.now() / (200 - (intensity * 100));
        const beat = Math.sin(pulseSpeed) * (10 * intensity); 
        const coreRadius = (20 * intensity) + 10 + beat;
        
        const gradient = ctx.createRadialGradient(0, 0, coreRadius * 0.2, 0, 0, coreRadius + 30);
        gradient.addColorStop(0, `${color}ff`);
        gradient.addColorStop(0.4, `${color}66`);
        gradient.addColorStop(1, `${color}00`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.arc(0, 0, coreRadius + 40, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = `${color}ee`;
        ctx.beginPath(); ctx.arc(0, 0, Math.max(0, coreRadius - 5), 0, Math.PI * 2); ctx.fill();

        if (aiScore > 25) {
           const rotationSpeed = Date.now() / (1000 - (aiScore * 8));
           ctx.rotate(rotationSpeed);
           ctx.strokeStyle = color; ctx.lineWidth = 2 + (intensity * 2); ctx.setLineDash([15, 10]);
           ctx.beginPath(); ctx.arc(0, 0, coreRadius + 20, 0, Math.PI * 2); ctx.stroke();
           
           ctx.rotate(-rotationSpeed * 1.5); ctx.setLineDash([5, 15]);
           ctx.beginPath(); ctx.arc(0, 0, coreRadius + 35, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }

      // HUD Layer
      if (isActive) {
        ctx.save();
        const hudY = 40;
        ctx.font = '900 12px "Orbitron", sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'right';
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.fillText(`VERDICT: ${verdict.toUpperCase()}`, width - 30, hudY);

        ctx.font = '900 54px "JetBrains Mono", monospace';
        const aiColor = aiScore > 60 ? '#ff00ff' : color;
        ctx.fillStyle = aiColor;
        ctx.shadowColor = aiColor;
        ctx.fillText(`${aiScore}%`, width - 30, hudY + 55);
        
        ctx.font = '900 10px "Orbitron", sans-serif';
        ctx.fillStyle = aiColor;
        ctx.globalAlpha = 0.7;
        ctx.fillText('NEURAL_SYNTH_SCORE', width - 30, hudY + 70);
        ctx.globalAlpha = 1.0;

        ctx.font = '900 28px "JetBrains Mono", monospace';
        ctx.fillStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.fillText(`${humanScore}%`, width - 30, hudY + 110);
        
        ctx.font = '900 8px "Orbitron", sans-serif';
        ctx.fillStyle = '#00f3ff';
        ctx.globalAlpha = 0.6;
        ctx.fillText('BIOMETRIC_HUMAN_MATCH', width - 30, hudY + 120);
        ctx.globalAlpha = 1.0;

        const meterWidth = 160;
        const meterX = width - 30 - meterWidth;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(meterX, hudY + 80, meterWidth, 4);
        ctx.fillStyle = aiColor;
        ctx.fillRect(meterX, hudY + 80, (aiScore / 100) * meterWidth, 4);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(meterX, hudY + 130, meterWidth, 4);
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(meterX, hudY + 130, (humanScore / 100) * meterWidth, 4);
        ctx.restore();
      }

      if (isActive && analyser) {
        const freqBufferLength = analyser.frequencyBinCount;
        const freqDataArray = new Uint8Array(freqBufferLength);
        analyser.getByteFrequencyData(freqDataArray);

        const barWidth = (width / freqBufferLength) * 2.5;
        let barX = 0;

        for (let i = 0; i < freqBufferLength; i++) {
          let val = freqDataArray[i];
          // Noise Gate: Filter out low-level background noise
          if (val < 10) val = 0;

          const barHeight = (val / 255) * (height / 2.5);
          
          if (val > 0) {
            ctx.fillStyle = `${color}${Math.floor((val/255) * 40).toString(16).padStart(2, '0')}`;
            ctx.fillRect(barX, height - barHeight, barWidth - 1, barHeight);
          }
          barX += barWidth;
        }

        const timeBufferLength = analyser.fftSize;
        const timeDataArray = new Uint8Array(timeBufferLength);
        analyser.getByteTimeDomainData(timeDataArray);

        ctx.save();
        ctx.shadowBlur = 10 + (pulseIntensity / 5);
        ctx.shadowColor = color;
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        const sliceWidth = width / timeBufferLength;
        let tx = 0;

        for (let i = 0; i < timeBufferLength; i++) {
          const v = timeDataArray[i] / 128.0;
          const ty = (v * height) / 2;
          if (i === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
          tx += sliceWidth;
        }
        ctx.stroke();
        ctx.restore();
      } else if (!isActive && !previewParams) {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = `${color}33`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (!previewParams || isActive) {
        ctx.shadowBlur = 0;
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillStyle = `${color}aa`;
        ctx.textAlign = 'left';
        ctx.fillText(`SYS_STATE: ${isActive ? 'MONITORING' : 'IDLE'}`, 20, 30);
        ctx.fillText(`BUFFER_FEED: ${isActive ? 'ONLINE' : 'CLOSED'}`, 20, 42);
        
        ctx.strokeStyle = `${color}33`;
        ctx.lineWidth = 1;
        ctx.strokeRect(15, 15, width - 30, height - 30);
      }
    };

    render();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [analyser]);

  return (
    <div className="w-full h-full relative group">
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair block" />
      <div className="absolute inset-0 pointer-events-none border border-white/5 group-hover:border-[#00f3ff]/20 transition-colors duration-500"></div>
    </div>
  );
};

export default WaveformVisualizer;
