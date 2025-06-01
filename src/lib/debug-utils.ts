/**
 * Safe debug logging utility
 * Prevents sensitive information from being logged in production
 */

interface DebugOptions {
  maskSensitive?: boolean;
  logLevel?: 'info' | 'warn' | 'error' | 'debug';
}

/**
 * Safe debug logger that only logs in development environment
 */
export const safeDebugLog = (message: string, data?: any, options: DebugOptions = {}) => {
  // Only log in development environment
  if (!import.meta.env.DEV) return;

  const { maskSensitive = true, logLevel = 'debug' } = options;
  
  // Mask sensitive data if needed
  let safeData = data;
  if (maskSensitive && data) {
    safeData = maskSensitiveData(data);
  }

  switch (logLevel) {
    case 'info':
      console.info(`[DEBUG] ${message}`, safeData);
      break;
    case 'warn':
      console.warn(`[DEBUG] ${message}`, safeData);
      break;
    case 'error':
      console.error(`[DEBUG] ${message}`, safeData);
      break;
    default:
      console.log(`[DEBUG] ${message}`, safeData);
  }
};

/**
 * Mask sensitive data in objects
 */
const maskSensitiveData = (data: any): any => {
  if (typeof data === 'string') {
    return maskString(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }
  
  if (typeof data === 'object' && data !== null) {
    const masked: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveKey(key)) {
        masked[key] = maskString(String(value));
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }
  
  return data;
};

/**
 * Check if a key contains sensitive information
 */
const isSensitiveKey = (key: string): boolean => {
  const sensitiveKeys = [
    'apikey', 'api_key', 'token', 'secret', 'password', 'auth',
    'authorization', 'supabase', 'openai', 'key'
  ];
  
  return sensitiveKeys.some(sensitive => 
    key.toLowerCase().includes(sensitive)
  );
};

/**
 * Mask string values while preserving some characters for debugging
 */
const maskString = (str: string): string => {
  if (!str || str.length < 8) return '***';
  
  const start = str.substring(0, 4);
  const end = str.substring(str.length - 4);
  return `${start}...${end}`;
};

/**
 * Production-safe error logging
 */
export const safeErrorLog = (error: Error | string, context?: string) => {
  const prefix = context ? `[${context}]` : '[ERROR]';
  
  if (import.meta.env.DEV) {
    console.error(`${prefix}`, error);
  } else {
    // In production, log minimal error info
    const message = error instanceof Error ? error.message : error;
    console.error(`${prefix} ${message}`);
  }
}; 