// src/utils/protectPdf.ts

import { PDFDocument } from 'pdf-lib';

export interface ProtectionOptions {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
    fillingForms?: boolean;
    contentAccessibility?: boolean;
    documentAssembly?: boolean;
    degradedPrinting?: boolean;
  };
  encryptionLevel?: 'standard' | 'aes128' | 'aes256';
}

export interface UnprotectOptions {
  password: string;
}

export interface ProtectionResult {
  success: boolean;
  data?: Uint8Array;
  error?: string;
  encryptionLevel?: string;
  permissions?: {
    printing: boolean;
    modifying: boolean;
    copying: boolean;
    annotating: boolean;
    fillingForms: boolean;
    contentAccessibility: boolean;
    documentAssembly: boolean;
    degradedPrinting: boolean;
  };
  requiresServer?: boolean;
  processingTime?: number;
}

/**
 * Slice head and tail of buffer for efficient scanning
 */
function sliceHeadAndTail(buf: Uint8Array, len = 8192): string {
  const decoder = new TextDecoder('latin1');
  const head = decoder.decode(buf.subarray(0, Math.min(len, buf.length)));
  const tail = decoder.decode(buf.subarray(Math.max(0, buf.length - len)));
  return head + tail;
}

/**
 * Detect if a PDF is password protected by scanning for encryption markers
 * Scans both head and tail of file for better detection accuracy
 */
export async function isPdfProtected(pdfBytes: Uint8Array): Promise<{
  isProtected: boolean;
  encryptionLevel?: string;
  error?: string;
}> {
  try {
    // Validate PDF header first
    const decoder = new TextDecoder('latin1');
    const header = decoder.decode(pdfBytes.subarray(0, 8));
    if (!/^%PDF-/.test(header)) {
      return { isProtected: false, error: 'Not a valid PDF file' };
    }

    // Scan both head and tail for encryption markers (trailer is often at the end)
    const pdfText = sliceHeadAndTail(pdfBytes, 8192);
    
    // Look for encryption markers in the PDF structure
    const hasEncryptDict = /\/Encrypt\s+\d+\s+\d+\s+R/.test(pdfText);
    const hasSecurityHandler = /\/Filter\s*\/Standard\b/.test(pdfText);
    
    if (!hasEncryptDict && !hasSecurityHandler) {
      // Try loading with pdf-lib to double-check
      try {
        await PDFDocument.load(pdfBytes);
        return { isProtected: false };
      } catch (error) {
        // If pdf-lib fails to load, it might be encrypted
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
        if (errorMessage.includes('encrypt') || errorMessage.includes('password')) {
          return { 
            isProtected: true,
            encryptionLevel: 'unknown'
          };
        }
        // Other loading error
        return { 
          isProtected: false,
          error: 'Failed to analyze PDF structure'
        };
      }
    }

    // Conservative encryption level mapping - real determination needs full parse
    let encryptionLevel: 'standard' | 'aes128' | 'aes256' | 'unknown' = 'unknown';
    const vMatch = /\/V\s+(\d+)/.exec(pdfText);
    if (vMatch) {
      const v = Number(vMatch[1]);
      if (v === 1 || v === 2) {
        encryptionLevel = 'standard';
      } else if (v === 4) {
        // V=4 could be RC4 or AES-128 depending on /CF and /StmF - conservative guess
        encryptionLevel = 'aes128';
      } else if (v >= 5) {
        encryptionLevel = 'aes256';
      }
    }

    return {
      isProtected: true,
      encryptionLevel
    };

  } catch (error) {
    return {
      isProtected: false,
      error: error instanceof Error ? error.message : 'Failed to check PDF protection status'
    };
  }
}

/**
 * Client-side PDF protection - This is a stub that explains the limitation
 * and provides options for server-side processing
 */
export async function protectPdf(
  pdfBytes: Uint8Array,
  options: ProtectionOptions
): Promise<ProtectionResult> {
  // Validate inputs first
  if (!options.userPassword && !options.ownerPassword) {
    return {
      success: false,
      error: 'At least one password (user or owner) must be provided'
    };
  }

  // Check if PDF is already protected
  const protectionStatus = await isPdfProtected(pdfBytes);
  if (protectionStatus.isProtected) {
    return {
      success: false,
      error: 'PDF is already password protected. Please remove existing protection first.'
    };
  }

  // Validate that we can load the PDF
  try {
    await PDFDocument.load(pdfBytes);
  } catch (error) {
    return {
      success: false,
      error: 'Invalid or corrupted PDF file'
    };
  }

  // Reuse processing time estimator for consistency
  const { estimatedSeconds } = getEstimatedProcessingTime(pdfBytes.length, 'protect');
  
  return {
    success: false,
    error: 'PDF password protection requires server-side processing with specialized tools like qpdf or PDFtk. This feature will be available in our premium tier.',
    requiresServer: true,
    processingTime: estimatedSeconds
  };
}

/**
 * Client-side PDF unprotection - Limited to detection only
 * Real decryption requires proper cryptographic libraries
 */
export async function unprotectPdf(
  pdfBytes: Uint8Array,
  options: UnprotectOptions
): Promise<ProtectionResult> {
  if (!options.password) {
    return {
      success: false,
      error: 'Password is required to remove PDF protection'
    };
  }

  // Check if PDF is actually protected
  const protectionStatus = await isPdfProtected(pdfBytes);
  if (!protectionStatus.isProtected) {
    return {
      success: false,
      error: 'PDF is not password protected'
    };
  }

  // For encrypted PDFs, we need proper decryption tools
  const { estimatedSeconds } = getEstimatedProcessingTime(pdfBytes.length, 'unprotect');
  
  return {
    success: false,
    error: 'PDF password removal requires server-side processing with specialized tools like qpdf or PDFtk. This feature will be available in our premium tier.',
    requiresServer: true,
    processingTime: estimatedSeconds,
    encryptionLevel: protectionStatus.encryptionLevel
  };
}

/**
 * Validate password strength for PDF protection
 */
export function validatePassword(password: string): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  suggestions: string[];
} {
  const suggestions: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    suggestions.push('Use at least 8 characters');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Character requirements feedback
  if (!/[A-Z]/.test(password)) suggestions.push('Include uppercase letters');
  if (!/[a-z]/.test(password)) suggestions.push('Include lowercase letters');
  if (!/[0-9]/.test(password)) suggestions.push('Include numbers');
  if (!/[^a-zA-Z0-9]/.test(password)) suggestions.push('Include special characters');

  // Common patterns check
  const commonPatterns = [
    /password/i,
    /admin/i,
    /user/i,
    /123456/,
    /qwerty/i,
    /111111/,
    /abc123/i,
    /password123/i
  ];
  
  if (commonPatterns.some(pattern => pattern.test(password))) {
    suggestions.push('Avoid common words and patterns');
    score -= 1;
  }

  // Sequential characters check
  if (/123|abc|xyz/i.test(password)) {
    suggestions.push('Avoid sequential characters');
    score -= 0.5;
  }

  const strength: 'weak' | 'medium' | 'strong' = 
    score >= 5 ? 'strong' : score >= 3 ? 'medium' : 'weak';

  return {
    isValid: score >= 2 && password.length >= 6,
    strength,
    suggestions
  };
}

/**
 * Get estimated processing time for server-side operations
 */
export function getEstimatedProcessingTime(fileSizeBytes: number, operation: 'protect' | 'unprotect'): {
  estimatedSeconds: number;
  recommendation: string;
} {
  const sizeMB = fileSizeBytes / (1024 * 1024);
  
  // Base processing time estimates
  let baseTime = operation === 'protect' ? 2 : 3; // Protection is typically faster
  let timePerMB = operation === 'protect' ? 1.5 : 2;
  
  const estimatedSeconds = Math.ceil(baseTime + (sizeMB * timePerMB));
  
  let recommendation = '';
  if (sizeMB > 50) {
    recommendation = 'Large file detected. Consider splitting into smaller PDFs for faster processing.';
  } else if (sizeMB > 10) {
    recommendation = 'Medium file size. Processing may take a few minutes.';
  } else {
    recommendation = 'Small file. Processing should complete quickly.';
  }
  
  return {
    estimatedSeconds,
    recommendation
  };
}

/**
 * Generate secure server processing payload
 * Note: Passwords are forwarded verbatim over TLS - ensure proper transport security
 */
export function createServerProcessingPayload(
  options: ProtectionOptions | UnprotectOptions,
  operation: 'protect' | 'unprotect'
): {
  operation: string;
  options: Record<string, any>;
  timestamp: number;
  warning?: string;
} {
  const sanitizedOptions = { ...options };
  
  // Add security metadata
  const payload = {
    operation,
    options: sanitizedOptions,
    timestamp: Date.now()
  };

  // Add security warning for password handling
  if ('userPassword' in options || 'ownerPassword' in options || 'password' in options) {
    payload.warning = 'Passwords transmitted over TLS - ensure secure transport';
  }
  
  return payload;
}

/**
 * Check if browser supports required features for PDF processing
 * Added TextDecoder compatibility check for different environments
 */
export function checkBrowserSupport(): {
  supported: boolean;
  missingFeatures: string[];
  recommendations: string[];
} {
  const missingFeatures: string[] = [];
  const recommendations: string[] = [];
  
  // Check for required APIs with environment compatibility
  if (typeof TextDecoder === 'undefined') {
    missingFeatures.push('TextDecoder API');
    recommendations.push('Update to a modern browser that supports TextDecoder');
  }
  
  if (typeof Uint8Array === 'undefined') {
    missingFeatures.push('Typed Arrays');
    recommendations.push('Update to a browser that supports modern JavaScript features');
  }
  
  // Check for Worker support (for future WASM implementation)
  if (typeof Worker === 'undefined') {
    missingFeatures.push('Web Workers');
    recommendations.push('Web Workers are needed for background processing. Consider updating your browser.');
  }
  
  // Check for WASM support (for future implementation)
  if (typeof WebAssembly === 'undefined') {
    missingFeatures.push('WebAssembly');
    recommendations.push('WebAssembly support is needed for advanced PDF processing features.');
  }
  
  return {
    supported: missingFeatures.length === 0,
    missingFeatures,
    recommendations
  };
}