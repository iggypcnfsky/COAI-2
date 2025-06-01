// Define allowed origins
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://localhost:5173',
  'https://localhost:5174',
  'https://localhost:3000'
];

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export function handleCors(req: Request) {
  const origin = req.headers.get('origin') || '';
  
  // If origin is in allowed list, set it specifically
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin
    };
  }
  
  // Otherwise return default cors headers
  return corsHeaders;
}