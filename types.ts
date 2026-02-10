
export type SupportedLanguage = 'Tamil' | 'English' | 'Hindi' | 'Malayalam' | 'Telugu' | 'Auto';
export type AudioFormat = 'mp3' | 'wav' | 'flac' | string;
export type Classification = 'AI_GENERATED' | 'HUMAN' | 'UNCERTAIN';
export type SpamStatus = 'SAFE' | 'SUSPICIOUS' | 'SPAM';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ApiRequest {
  language: SupportedLanguage;
  audioFormat: AudioFormat;
  audioBase64: string;
}

export interface VoiceProfile {
  ageEstimate: {
    range: string; // e.g., "30-40"
    confidence: number;
  };
  gender: 'MALE' | 'FEMALE' | 'ANDROGYNOUS';
  tonalType: 'SOFT' | 'NEUTRAL' | 'HARSH' | 'BREATHY' | 'RESONANT';
}

export interface EmotionalSignature {
  primary: 'NEUTRAL' | 'CALM' | 'STRESSED' | 'ANGRY' | 'SAD' | 'EXCITED';
  driftScore: number; // 0-100, how much emotion shifts
  analysis?: string;
}

export interface SyntheticOrigin {
  isProbabilistic: boolean;
  likelihood: {
    neuralVocoder: number; // 0-100
    concatenative: number; // 0-100
    humanoid: number; // 0-100
  };
}

export interface RiskAssessment {
  level: RiskLevel;
  category: ('IMPERSONATION' | 'FRAUD' | 'SOCIAL_ENG' | 'DISINFORMATION' | 'BENIGN')[];
  score: number; // 0-100
}

export interface ForensicData {
  // Engine 1 & 2: Identity
  profile: VoiceProfile;
  
  // Engine 3: Emotion
  emotional: EmotionalSignature;

  // Engine 4: Cognitive
  cognitive: {
    entropyScore: number; // 0-100 (Hesitation/Pauses)
    scriptedLikelihood: number; // 0-100
    analysis?: string;
  };

  // Engine 5: Origin
  origin: SyntheticOrigin;

  // Engine 6: Biomechanics
  biomechanics: {
    plausibilityScore: number; // 0-100
    anomalies: string[];
    analysis?: string;
  };

  // Engine 7: Reversibility
  technical: {
    reversibilityScore: number; // 0-100
    artifacts: string[];
    analysis?: string;
  };

  // Engine 8: Silence
  silence: {
    uniformityScore: number; // 0-100 (High = AI)
  };

  // Engine 10: Threat
  risk: RiskAssessment;

  integrity: {
    hash: string;
    verdict: string;
  };
}

export interface ApiResponse {
  status: 'success' | 'error';
  statusCode?: number;
  language?: SupportedLanguage;
  classification?: Classification;
  confidenceScore?: number;
  explanation?: string;
  message?: string;
  meta?: {
    forensicData?: ForensicData;
    domainAnalysis?: DomainAnalysis;
  };
  integrity?: {
    signature: string;
    timestamp: string;
    checksum: string;
    algorithm: string;
  };
}

export interface DomainAnalysis {
  timeDomain: string;
  frequencyDomain: string;
  phaseDomain: string;
  prosody: string;
}

export interface BatchApiRequest {
  threshold: number;
  items: AudioItem[];
}

export interface BatchApiResponse {
  status: 'success' | 'error';
  results: DetectionResult[];
}

export interface DetectionResult {
  status: 'success' | 'error';
  language: SupportedLanguage;
  audioFormat: string;
  classification: Classification;
  confidenceScore: number;
  explanation: string;
  fileName: string;
  timestamp: string;
  spectralMarkers?: string[];
  suspectedAlgorithm?: string;
  scamLikelihood?: number; // 0-100
  riskLevel?: RiskLevel;
  intentAnalysis?: string;
  forensicData?: ForensicData;
  domainAnalysis?: DomainAnalysis;
}

export interface LiveAnalysisResult {
  summaryPoints: string[];
  suspiciousKeywords: { 
    word: string; 
    riskLevel: RiskLevel;
    category: 'PHISHING' | 'SOCIAL_ENG' | 'FRAUD' | 'COERCION' | 'UNKNOWN';
  }[];
}

export interface AudioItem {
  id: string;
  language: SupportedLanguage;
  audioFormat: string;
  audioBase64: string;
  fileName: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'FORENSIC_AGENT';
  apiKey: string;
  plan: 'FREE' | 'DEVELOPER' | 'PRO' | 'ENTERPRISE';
  usage: {
    scansToday: number;
    scansTotal: number;
    limit: number;
  };
}
