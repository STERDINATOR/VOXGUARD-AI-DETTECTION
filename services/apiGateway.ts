
import { ApiRequest, ApiResponse, SupportedLanguage } from '../types';
import { analyzeVoiceBatch } from './geminiService';

/**
 * Middleware: Validate API Key
 * Checks for presence and minimum security complexity of the API Key.
 */
const validateApiKeyMiddleware = (key: string): boolean => {
  // In a production environment, this would validate against a database of issued keys.
  // For this simulation, we check that the key exists and has sufficient entropy (length).
  return !!key && key.trim().length >= 10;
};

/**
 * Cryptographic Signing Engine
 * Generates a SHA-256 signature for the response to ensure data integrity.
 */
const signResponse = async (response: Omit<ApiResponse, 'integrity'>): Promise<ApiResponse> => {
    const timestamp = new Date().toISOString();
    const secretKey = "VOXGUARD_SECURE_KERNEL_V1";
    
    // Create canonical string for signing
    const payload = JSON.stringify(response) + timestamp + secretKey;
    
    // Use Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Generate a short visual checksum for UI verification
    const checksum = signature.substring(0, 16).toUpperCase();

    return {
        ...response,
        integrity: {
            signature,
            timestamp,
            checksum,
            algorithm: 'SHA-256-HMAC-SIM'
        }
    };
};

/**
 * PRODUCTION API GATEWAY
 * STRICT ENFORCEMENT OF REST SPECIFICATION POST /api/voice-detection
 */
export const handleVoiceDetectionRequest = async (
  headerApiKey: string,
  payload: ApiRequest,
  systemApiKey: string
): Promise<ApiResponse> => {
  // 1. Security: Authentication Middleware
  if (!validateApiKeyMiddleware(headerApiKey)) {
     return await signResponse({ 
       status: 'error', 
       statusCode: 401,
       message: 'Unauthorized: Missing or invalid x-api-key' 
     });
  }
  
  // 2. Input Validation: Language Protocol
  const validLanguages: SupportedLanguage[] = ['Tamil', 'English', 'Hindi', 'Malayalam', 'Telugu'];
  if (!payload.language || !validLanguages.includes(payload.language)) {
    return await signResponse({ 
      status: 'error', 
      statusCode: 400,
      message: `Invalid Language. Supported: ${validLanguages.join(', ')}` 
    });
  }

  // 3. Input Validation: Format
  const normalizedFormat = payload.audioFormat?.toLowerCase().trim().replace(/^\./, '') || '';
  if (normalizedFormat !== 'mp3') {
    return await signResponse({ 
      status: 'error', 
      statusCode: 400,
      message: `Invalid format. API requires 'mp3'.` 
    });
  }

  // 4. Input Validation: Payload
  if (!payload.audioBase64 || payload.audioBase64.length < 100) {
    return await signResponse({ 
      status: 'error', 
      statusCode: 400,
      message: 'Malformed request body: Invalid audioBase64 string.' 
    });
  }

  // 5. Execution: Multi-Domain Analysis
  try {
    const forensicRes = await analyzeVoiceBatch([{
      id: 'req-' + Date.now(),
      language: payload.language,
      audioFormat: normalizedFormat,
      audioBase64: payload.audioBase64,
      fileName: `api_upload_${Date.now()}.mp3`
    }], 0.70, systemApiKey);

    const result = forensicRes.results[0];

    if (result.status === 'error') {
      return await signResponse({ status: 'error', statusCode: 500, message: result.explanation });
    }

    // 6. Response: Strict JSON Schema Compliance
    return await signResponse({
      status: 'success',
      statusCode: 200,
      language: result.language,
      classification: result.classification,
      confidenceScore: parseFloat(result.confidenceScore.toFixed(2)),
      explanation: result.explanation,
      meta: {
        forensicData: result.forensicData,
        domainAnalysis: result.domainAnalysis
      }
    });
  } catch (error: any) {
    return await signResponse({
      status: 'error',
      statusCode: 500,
      message: 'Internal Consensus Engine Failure: ' + (error.message || 'Unknown error')
    });
  }
};
