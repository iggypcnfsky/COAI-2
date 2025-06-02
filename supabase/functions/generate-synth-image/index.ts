import { Runware } from "npm:@runware/sdk-js";
import { createClient } from "npm:@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400'
};

// Initialize Supabase client using environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://hiuinnexazfqhodamhgk.supabase.co';
const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseServiceRole) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required but not set');
}

const supabase = createClient(supabaseUrl, supabaseServiceRole || '');

// Storage bucket names
const SYNTH_IMAGES_BUCKET = 'synth-images';
const TEAM_IMAGES_BUCKET = 'team-images';

/**
 * Upload a base64 image to Supabase Storage
 * 
 * @param base64Data Base64 data part of the Data URL (without the prefix)
 * @param path Path within the bucket where to store the file
 * @param bucket Storage bucket name
 * @returns URL of the uploaded file or null if upload failed
 */
async function uploadBase64Image(base64Data, path, bucket) {
  try {
    // Remove any data URL prefix to get just the base64 data
    const cleanedBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    
    // Convert base64 to Uint8Array
    const binaryData = Uint8Array.from(atob(cleanedBase64), c => c.charCodeAt(0));
    
    // Upload to Supabase Storage
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .upload(path, binaryData, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('❌ Storage upload error:', error);
      return null;
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase
      .storage
      .from(bucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('❌ Error uploading to Supabase storage:', error);
    return null;
  }
}

/**
 * Ensure the specified bucket exists
 * 
 * @param bucketName Name of the bucket to check/create
 * @returns true if bucket exists or was created successfully
 */
async function ensureBucketExists(bucketName) {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return false;
    }
    
    // If bucket doesn't exist, create it
    if (!buckets.some(bucket => bucket.name === bucketName)) {
      console.log(`📦 Creating bucket: ${bucketName}`);
      const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });
      
      if (createError) {
        console.error(`❌ Error creating bucket ${bucketName}:`, createError);
        return false;
      }
      
      console.log(`✅ Bucket ${bucketName} created successfully`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error ensuring bucket exists:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { synthData, teamData, runwareApiKey, imageType } = await req.json();

    if (!runwareApiKey) {
      return new Response(JSON.stringify({
        error: 'Runware API key is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine image type and validate required data
    let prompt;
    let logName;
    let responseKey;
    let entityId;
    let storagePath;
    let bucketName;

    if (imageType === 'team' || teamData) {
      // Team image generation
      if (!teamData || !teamData.name) {
        return new Response(JSON.stringify({
          error: 'Team data with name is required for team image generation'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const teamType = teamData.teamType || 'team';
      const memberCount = teamData.members?.length || 3;
      
      prompt = `Professional group photo of ${teamData.name}, ${teamType === 'team' ? 'collaborative business team working together' : 'diverse group of professionals'}, ${memberCount} people, modern office setting, high quality photography, professional lighting, business attire, diverse ethnicity, team meeting scene`;
      logName = teamData.name;
      responseKey = 'teamImage';
      entityId = teamData.id || `team-${Date.now()}`;
      bucketName = TEAM_IMAGES_BUCKET;
      storagePath = `${entityId}.png`;
    } else {
      // Synth image generation
      if (!synthData || !synthData.name || !synthData.age || !synthData.role) {
        return new Response(JSON.stringify({
          error: 'Synth data with name, age, and role is required for synth image generation'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      prompt = `Professional portrait photo of ${synthData.name}, a ${synthData.age}-year-old ${synthData.role}, high quality photography, professional headshot, studio lighting, clean background, photorealistic, detailed face, business professional style`;
      logName = synthData.name;
      responseKey = 'profileImage';
      entityId = synthData.id || `synth-${Date.now()}`;
      bucketName = SYNTH_IMAGES_BUCKET;
      storagePath = `${entityId}.png`;
    }

    console.log(`🎨 [BACKGROUND IMAGE GEN] Starting ${imageType || 'synth'} image generation for: ${logName}`);
    console.log(`🖼️ Image prompt: ${prompt}`);

    // Initialize Runware SDK
    const runware = new Runware({ apiKey: runwareApiKey });

    // Generate image using SDK
    const images = await runware.requestImages({
      positivePrompt: prompt,
      negativePrompt: "low quality, blurry, distorted, cartoon, anime, illustration, text, watermark, signature, logo, bad anatomy, deformed, unprofessional, casual clothing",
      width: 1024,
      height: 1024,
      model: "runware:100@1",
      numberResults: 1,
      outputType: "base64Data",
      outputFormat: "PNG",
      steps: 25,
      CFGScale: 7,
      checkNSFW: true
    });

    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error('No images generated by Runware API');
    }

    const imageResult = images[0];
    
    if (!imageResult.imageBase64Data && !imageResult.imageURL) {
      throw new Error('No image data received from Runware API');
    }

    // Get the image data either from base64 or by fetching the URL
    let imageBase64;
    let imageDataUrl;
    
    if (imageResult.imageBase64Data) {
      imageBase64 = imageResult.imageBase64Data;
      imageDataUrl = `data:image/png;base64,${imageBase64}`;
    } else if (imageResult.imageURL) {
      // Fetch the image and convert to base64
      const imageResponse = await fetch(imageResult.imageURL);
      const imageArrayBuffer = await imageResponse.arrayBuffer();
      imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageArrayBuffer)));
      imageDataUrl = `data:image/png;base64,${imageBase64}`;
    } else {
      throw new Error('No valid image data available');
    }

    console.log(`✅ Successfully generated ${imageType || 'synth'} image for: ${logName}`);

    // Ensure bucket exists before uploading
    const bucketExists = await ensureBucketExists(bucketName);
    if (!bucketExists) {
      throw new Error(`Failed to ensure bucket ${bucketName} exists`);
    }

    // Upload image to Supabase Storage
    console.log(`📤 Uploading ${imageType || 'synth'} image to storage: ${storagePath}`);
    const publicUrl = await uploadBase64Image(imageDataUrl, storagePath, bucketName);
    
    if (!publicUrl) {
      throw new Error('Failed to upload image to storage');
    }
    
    console.log(`✅ Image successfully uploaded to ${bucketName}/${storagePath}`);
    
    // Build response based on image type
    const response = {
      success: true,
      [responseKey]: publicUrl, // Return the public URL instead of the base64 data
      dataUrl: imageDataUrl, // Also include the data URL for backward compatibility
      cost: imageResult.cost || 0,
      taskUUID: imageResult.taskUUID || null
    };

    // Add specific IDs based on type
    if (imageType === 'team' || teamData) {
      response.teamId = teamData.id || null;
      response.teamName = teamData.name;
    } else {
      response.synthId = synthData.id || null;
      response.synthName = synthData.name;
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in image generation:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to generate image',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
