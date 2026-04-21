// /api/zombify.js
// Serverless Function — Transform pfp jadi zombie mutant pakai img2img
// Menggunakan HuggingFace Inference API (free tier, no API key)

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pfpUrl } = req.body;

    if (!pfpUrl) {
      return res.status(400).json({ error: 'pfpUrl is required' });
    }

    // Fetch the original image
    const imageResponse = await fetch(pfpUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch profile picture');
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Zombie transformation prompt
    const zombiePrompt = [
      'zombie mutant transformation of this character, ',
      'undead horror, rotting decaying flesh, exposed bones, ',
      'glowing fiery red eyes, dark green-grey decayed skin, ',
      'blood splatter and wounds, torn ripped clothing, ',
      'dark moody horror lighting, green fog atmosphere, ',
      'horror digital art, highly detailed, visceral, ',
      'same character composition and pose as original, ',
      'dark background, horror NFT collectible art style',
    ].join('');

    const negativePrompt = [
      'blurry, low quality, deformed, ugly, ',
      'different composition, different character, ',
      'bright cheerful, cartoon, cute',
    ].join('');

    // Try multiple HuggingFace models (free tier)
    let result;

    // Model 1: SD img2img
    result = await tryHuggingFaceImg2Img(
      'stabilityai/stable-diffusion-2-1',
      imageBuffer,
      zombiePrompt,
      negativePrompt
    );

    if (!result) {
      // Model 2: SDXL refiner
      result = await tryHuggingFaceImg2Img(
        'stabilityai/stable-diffusion-xl-refiner-1.0',
        imageBuffer,
        zombiePrompt,
        negativePrompt
      );
    }

    if (!result) {
      throw new Error('All img2img models unavailable');
    }

    // Convert to base64 data URL for frontend
    const base64 = result.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return res.status(200).json({
      success: true,
      imageUrl: dataUrl,
      method: 'img2img',
    });
  } catch (error) {
    console.error('Zombify error:', error);
    return res.status(500).json({
      error: error.message,
      fallback: true,
    });
  }
}

// ─── HuggingFace Inference API (free, no key) ────────────
async function tryHuggingFaceImg2Img(modelId, imageBuffer, prompt, negativePrompt) {
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${modelId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            image: imageBuffer.toString('base64'),
            negative_prompt: negativePrompt,
            strength: 0.75,
            guidance_scale: 7.5,
            num_inference_steps: 30,
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn(`HuggingFace ${modelId}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');

    // If model is loading, we get JSON with estimated_time
    if (contentType?.includes('application/json')) {
      const json = await response.json();
      if (json.estimated_time) {
        // Wait and retry
        await new Promise((r) => setTimeout(r, json.estimated_time * 1000));
        return tryHuggingFaceImg2Img(modelId, imageBuffer, prompt, negativePrompt);
      }
      console.warn('Unexpected JSON response:', json);
      return null;
    }

    // Success — returns image binary
    return Buffer.from(await response.arrayBuffer());
  } catch (e) {
    console.warn(`HuggingFace ${modelId} error:`, e.message);
    return null;
  }
}
