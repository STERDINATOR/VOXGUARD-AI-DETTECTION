
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { DetectionResult, AudioItem, BatchApiResponse, SupportedLanguage, Classification, LiveAnalysisResult } from "../types";

/**
 * Standard IANA MIME type mapping.
 */
const getMimeType = (format: string): string | null => {
  const f = format.toLowerCase().trim().replace(/^\./, '');
  switch (f) {
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'flac': return 'audio/flac';
    case 'webm': return 'audio/webm';
    default: return 'audio/mpeg';
  }
};

/**
 * Base64 Encoding - Manual implementation as per SDK guidelines.
 */
export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Base64 Decoding - Manual implementation as per SDK guidelines.
 */
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Helper: Write String to DataView
 */
const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Helper: Create WAV Header
 * Gemini TTS returns raw PCM (24kHz, Mono, 16-bit). Browsers need a WAV header to play it.
 */
const createWavHeader = (sampleRate: number, numChannels: number, bitsPerSample: number, dataLength: number): Uint8Array => {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true); // File size
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); // ByteRate
  view.setUint16(32, numChannels * (bitsPerSample / 8), true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true); // Subchunk2Size

  return new Uint8Array(buffer);
};

/**
 * Decodes raw PCM bytes into an AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Retry Operation Wrapper with Exponential Backoff
 */
async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, delay = 3000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Robustly extract error message even from JSON objects
    let msg = '';
    try {
        msg = JSON.stringify(error);
    } catch {
        msg = error?.message || String(error);
    }
    
    // Check for Rate Limit / Quota signals AND transient network/server errors
    if (maxRetries > 0 && (
        msg.includes('429') || 
        msg.includes('RESOURCE_EXHAUSTED') || 
        msg.includes('quota') ||
        msg.includes('xhr error') ||
        msg.includes('Rpc failed') || 
        msg.includes('503') || 
        msg.includes('500')
    )) {
      const nextDelay = delay * 2;
      console.warn(`[System] Transient Error Detected. Retrying in ${delay}ms... (${maxRetries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryOperation(operation, maxRetries - 1, nextDelay);
    }
    throw error;
  }
}

/**
 * Centralized Error Handler for Gemini API
 */
const handleGeminiError = (error: any) => {
  console.error("Gemini API Error:", error);
  let msg = '';
  try {
      msg = JSON.stringify(error);
  } catch {
      msg = error?.message || String(error);
  }

  if (msg.includes('input token count exceeds')) {
      throw new Error("INPUT LIMIT EXCEEDED: The content size (audio or text) exceeds the neural model's context window (8192 tokens). Please try shorter audio clips or less text.");
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
    throw new Error("SYSTEM OVERLOAD: API QUOTA EXCEEDED. PLEASE ATTEMPT LATER.");
  }
  if (msg.includes('xhr error') || msg.includes('Rpc failed')) {
     throw new Error("CONNECTION FAILURE: Unable to contact Neural Engine. Please check your network.");
  }
  throw new Error("NEURAL ENGINE FAILURE: " + (error?.message || "Unknown Error"));
};

/**
 * Standard Language Detection Protocol.
 */
export const detectLanguage = async (audioBase64: string, format: string, apiKey?: string): Promise<SupportedLanguage | null> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const mimeType = getMimeType(format) || 'audio/mpeg';
  const validLanguages: SupportedLanguage[] = ['Tamil', 'English', 'Hindi', 'Malayalam', 'Telugu'];

  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ inlineData: { mimeType, data: audioBase64 } }, { text: "Identify the language." }] },
      config: { systemInstruction: `Identify the primary language from: ${validLanguages.join(', ')}. Return ONLY the language name.` }
    }));
    const detected = response.text?.trim() as SupportedLanguage;
    return validLanguages.includes(detected) ? detected : null;
  } catch (error) {
    // Silent fail for auto-detect to allow fallback
    console.warn("Language detection failed, defaulting to Auto");
    return null; 
  }
};

/**
 * Batch Analysis using Gemini 3 Flash for high-throughput forensic reasoning.
 * IMPLEMENTS: The 10-Engine Forensic Intelligence Architecture.
 */
export const analyzeVoiceBatch = async (items: AudioItem[], threshold: number, apiKey?: string): Promise<BatchApiResponse> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const results: DetectionResult[] = [];

  try {
    const audioParts = items.flatMap((item, index) => [
      { inlineData: { mimeType: getMimeType(item.audioFormat) || 'audio/mpeg', data: item.audioBase64 } },
      { text: `[Sample ${index}] Source: ${item.fileName}. Language: ${item.language === 'Auto' ? 'DETECT_FROM_AUDIO' : item.language}.` }
    ]);

    const systemInstruction = `You are the Principal Forensic AI System. You operate as an ensemble of 10 specialized neural engines.
    
    TARGET LANGUAGES: Tamil, English, Hindi, Malayalam, Telugu.
    
    CRITICAL INSTRUCTION: If Language is 'DETECT_FROM_AUDIO', you MUST identify the language first and return it in the 'language' field of the response.

    EXECUTE THE FOLLOWING 10 ENGINES ON THE AUDIO SIGNAL:

    1. 👤 VOICE AGE ESTIMATION ENGINE:
       - Analyze pitch variability and formant spacing. Estimate biological age range.
    
    2. 🎭 VOICE TYPE CLASSIFICATION:
       - Classify gender, resonance, and tonal quality (Soft, Harsh, Breathy).

    3. 🌊 EMOTION DETECTION ENGINE:
       - Detect primary emotion (Neutral, Stress, etc.). 
       - Calculate "Drift Metric": Humans shift emotion; AI is often statically neutral.

    4. 🧠 COGNITIVE LOAD & INTENT:
       - Measure hesitation entropy. 
       - High entropy = Human thinking. Low entropy/Perfect fluency = Scripted/AI.

    5. 🔮 ORIGIN INFERENCE (PROBABILISTIC):
       - Estimate likelihood of Neural Vocoder vs Concatenative vs Humanoid.

    6. 🧬 BIOMECHANICAL FEASIBILITY:
       - Check breath continuity. Does the speaker breathe?
       - Assign a Plausibility Score (0-100).

    7. 🔄 TEMPORAL REVERSIBILITY:
       - Perform a mental time-reversal check. AI speech often has higher symmetry than human speech.

    8. 🔇 SILENCE INTELLIGENCE:
       - Analyze background noise uniformity. AI silence is often mathematically perfect (High Uniformity).

    9. 📉 FATIGUE DRIFT:
       - Check for micro-fatigue in pitch over time.

    10. 🛡️ THREAT & RISK ASSESSMENT:
       - Combine all signals. Is this Deepfake Impersonation? Fraud?

    🔍 DOMAIN ANALYSIS INSTRUCTIONS:
    - timeDomain: Analyze signal duration, amplitude dynamic range (variations in loudness), and any temporal anomalies (unnatural gating, rigid cadence, zero-crossing irregularities).
    - frequencyDomain: Analyze spectral bandwidth and harmonic distribution.
    - phaseDomain: Check for phase inversion or vocoder discontinuities.
    - prosody: Analyze rhythm, stress, and intonation patterns.

    ⚖️ ARBITRATION & DECISION:
    - If Biomechanics < 50% OR Silence Uniformity > 90%, bias heavily towards AI.
    - Confidence Score must reflect the agreement ratio of all engines.

    OUTPUT:
    Return a strictly typed JSON array matching the provided schema.`;

    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [
          ...audioParts, 
          { text: "Activate Forensic Engines. Report telemetry." }
        ] 
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              language: { type: Type.STRING, enum: ['Tamil', 'English', 'Hindi', 'Malayalam', 'Telugu'] },
              classification: { type: Type.STRING, enum: ['AI_GENERATED', 'HUMAN', 'UNCERTAIN'] },
              confidenceScore: { type: Type.NUMBER },
              explanation: { type: Type.STRING },
              spectralMarkers: { type: Type.ARRAY, items: { type: Type.STRING } },
              suspectedAlgorithm: { type: Type.STRING },
              scamLikelihood: { type: Type.NUMBER },
              riskLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
              intentAnalysis: { type: Type.STRING },
              
              // DEEP FORENSIC DATA BLOCK
              forensicData: {
                type: Type.OBJECT,
                properties: {
                  profile: {
                    type: Type.OBJECT,
                    properties: {
                      ageEstimate: { 
                        type: Type.OBJECT,
                        properties: { range: { type: Type.STRING }, confidence: { type: Type.NUMBER } } 
                      },
                      gender: { type: Type.STRING, enum: ['MALE', 'FEMALE', 'ANDROGYNOUS'] },
                      tonalType: { type: Type.STRING, enum: ['SOFT', 'NEUTRAL', 'HARSH', 'BREATHY', 'RESONANT'] }
                    }
                  },
                  emotional: {
                    type: Type.OBJECT,
                    properties: {
                      primary: { type: Type.STRING, enum: ['NEUTRAL', 'CALM', 'STRESSED', 'ANGRY', 'SAD', 'EXCITED'] },
                      driftScore: { type: Type.NUMBER },
                      analysis: { type: Type.STRING }
                    }
                  },
                  cognitive: {
                    type: Type.OBJECT,
                    properties: {
                      entropyScore: { type: Type.NUMBER },
                      scriptedLikelihood: { type: Type.NUMBER },
                      analysis: { type: Type.STRING }
                    }
                  },
                  origin: {
                    type: Type.OBJECT,
                    properties: {
                      isProbabilistic: { type: Type.BOOLEAN },
                      likelihood: {
                        type: Type.OBJECT,
                        properties: {
                          neuralVocoder: { type: Type.NUMBER },
                          concatenative: { type: Type.NUMBER },
                          humanoid: { type: Type.NUMBER }
                        }
                      }
                    }
                  },
                  biomechanics: { 
                     type: Type.OBJECT, 
                     properties: {
                        plausibilityScore: { type: Type.NUMBER },
                        anomalies: { type: Type.ARRAY, items: { type: Type.STRING } },
                        analysis: { type: Type.STRING }
                     }
                  },
                  technical: { 
                     type: Type.OBJECT, 
                     properties: {
                        artifacts: { type: Type.ARRAY, items: { type: Type.STRING } },
                        reversibilityScore: { type: Type.NUMBER },
                        analysis: { type: Type.STRING }
                     }
                  },
                  silence: {
                    type: Type.OBJECT,
                    properties: { uniformityScore: { type: Type.NUMBER } }
                  },
                  risk: {
                    type: Type.OBJECT,
                    properties: {
                      level: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                      category: { type: Type.ARRAY, items: { type: Type.STRING, enum: ['IMPERSONATION', 'FRAUD', 'SOCIAL_ENG', 'DISINFORMATION', 'BENIGN'] } },
                      score: { type: Type.NUMBER }
                    }
                  },
                  integrity: { 
                     type: Type.OBJECT, 
                     properties: {
                        hash: { type: Type.STRING },
                        verdict: { type: Type.STRING }
                     }
                  },
                },
                required: ["profile", "emotional", "cognitive", "origin", "biomechanics", "technical", "silence", "risk", "integrity"]
              },
              // Legacy
              domainAnalysis: {
                type: Type.OBJECT,
                properties: {
                  timeDomain: { type: Type.STRING },
                  frequencyDomain: { type: Type.STRING },
                  phaseDomain: { type: Type.STRING },
                  prosody: { type: Type.STRING },
                }
              }
            },
            required: ["language", "classification", "confidenceScore", "explanation", "spectralMarkers", "suspectedAlgorithm", "scamLikelihood", "riskLevel", "intentAnalysis", "forensicData"],
          }
        }
      }
    }));

    const parsed = JSON.parse(response.text || "[]");
    parsed.forEach((res: any, i: number) => {
      results.push({
        status: 'success',
        language: res.language || items[i].language, // Use detected language or fallback
        audioFormat: items[i].audioFormat,
        classification: res.confidenceScore < threshold ? 'UNCERTAIN' : (res.classification as Classification),
        confidenceScore: res.confidenceScore,
        explanation: res.explanation,
        fileName: items[i].fileName,
        timestamp: new Date().toISOString(),
        spectralMarkers: res.spectralMarkers || [],
        suspectedAlgorithm: res.suspectedAlgorithm || "Unknown",
        scamLikelihood: res.scamLikelihood || 0,
        riskLevel: res.riskLevel || 'LOW',
        intentAnalysis: res.intentAnalysis || "No malicious intent detected.",
        forensicData: res.forensicData,
        domainAnalysis: res.domainAnalysis || { 
          timeDomain: "Signal duration analysis pending...", frequencyDomain: "N/A", phaseDomain: "N/A", prosody: "N/A" 
        }
      });
    });
  } catch (error: any) {
    handleGeminiError(error);
  }
  return { status: 'success', results };
};

/**
 * Real-time Transcript Analysis for Live Intercept.
 */
export const analyzeTranscript = async (text: string, apiKey?: string): Promise<LiveAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  try {
     const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: [{ text: `Analyze this live call segment: "${text}". Extract key discussion points and suspicious keywords related to fraud. Categorize keywords into PHISHING, SOCIAL_ENG, FRAUD, COERCION.` }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summaryPoints: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING } 
                    },
                    suspiciousKeywords: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                word: { type: Type.STRING },
                                riskLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                                category: { type: Type.STRING, enum: ['PHISHING', 'SOCIAL_ENG', 'FRAUD', 'COERCION', 'UNKNOWN'] }
                            }
                        }
                    }
                }
            }
        }
     }));
     return JSON.parse(response.text || "{}") as LiveAnalysisResult;
  } catch (e) {
      // Non-critical background task, just log
      console.error("Live Analysis Error", e);
      return { summaryPoints: [], suspiciousKeywords: [] };
  }
}

/**
 * Translates text to a target language.
 */
export const translateText = async (text: string, targetLanguage: string, apiKey?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: `Translate the following text to ${targetLanguage}. Return ONLY the translated text, no preamble or markdown.\n\nText: "${text}"` }] }
    }));
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Translation Error", error);
    throw new Error("Translation failed.");
  }
};

/**
 * High-quality Text-to-Speech generation with granular tuning.
 * Handles large input by chunking text to respect model token limits.
 * NOW RETURNS WAV FORMATTED AUDIO for direct browser playback.
 */
export const generateSpeech = async (
  text: string, 
  voiceName: string = 'Kore',
  pitch: number = 1.0,
  speed: number = 1.0,
  tone: string = 'Neutral',
  apiKey?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  
  if (text.length > 1000000) {
      throw new Error("TEXT LENGTH EXCEEDED: Please limit input to 1,000,000 characters for neural synthesis.");
  }

  // Model constraint: ~8192 tokens. Safe chunk size ~3000 characters.
  const CHUNK_SIZE = 3000;
  
  // Helper to chunk text
  const getChunks = (input: string, size: number): string[] => {
      const chunks: string[] = [];
      let index = 0;
      while (index < input.length) {
          let endIndex = Math.min(index + size, input.length);
          if (endIndex < input.length) {
              const lastPunct = input.lastIndexOf('.', endIndex);
              const lastQuestion = input.lastIndexOf('?', endIndex);
              const lastExclaim = input.lastIndexOf('!', endIndex);
              const breakPoint = Math.max(lastPunct, lastQuestion, lastExclaim);
              
              if (breakPoint > index + (size * 0.5)) {
                  endIndex = breakPoint + 1;
              } else {
                  const lastSpace = input.lastIndexOf(' ', endIndex);
                  if (lastSpace > index) endIndex = lastSpace + 1;
              }
          }
          chunks.push(input.substring(index, endIndex).trim());
          index = endIndex;
      }
      return chunks.filter(c => c.length > 0);
  };

  const textChunks = getChunks(text, CHUNK_SIZE);
  const audioParts: Uint8Array[] = [];

  try {
    // Sequential execution to ensure order
    for (const chunk of textChunks) {
        const instructedText = `Say this in a ${tone} tone, with a pitch scale of ${pitch} and speaking speed of ${speed}x: "${chunk}"`;
        
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: instructedText }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { 
                    voiceConfig: { 
                        prebuiltVoiceConfig: { voiceName } 
                    } 
                }
            }
        }));
        
        const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (data) {
            audioParts.push(decode(data));
        }
    }
    
    if (audioParts.length === 0) throw new Error("TTS failed to generate any audio data.");

    // Stitch Audio Buffers
    const totalLength = audioParts.reduce((acc, part) => acc + part.length, 0);
    const combinedPcm = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of audioParts) {
        combinedPcm.set(part, offset);
        offset += part.length;
    }

    // Add WAV Header
    // PCM (16-bit, 24kHz, Mono)
    const wavHeader = createWavHeader(24000, 1, 16, combinedPcm.length);
    const wavFile = new Uint8Array(wavHeader.length + combinedPcm.length);
    wavFile.set(wavHeader);
    wavFile.set(combinedPcm, wavHeader.length);
    
    return encode(wavFile);
  } catch (error) {
      handleGeminiError(error);
      return ""; // Unreachable
  }
};
