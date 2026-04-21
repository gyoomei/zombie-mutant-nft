// /api/zombify.js
// Serverless Function — Transform pfp jadi zombie mutant pakai img2img
// Menggunakan Pollinations.ai img2img (free, no API key)

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

    const zombiePrompt = [
      'zombie mutant transformation, undead horror version of this character, ',
      'rotting decaying flesh, exposed bones and tendons, ',
      'glowing fiery red eyes with dark hollow sockets, ',
      'dark green-grey decayed skin patches, ',
      'blood splatter and deep wounds, torn ripped clothing, ',
      'dark moody horror lighting with green fog, dramatic shadows, ',
      'horror digital art, highly detailed, visceral, ',
      'same character identity and composition as original, ',
      'dark background, horror NFT collectible art style, ',
      'must be recognizably the same character but undead',
    ].join('');

    // Pollinations.ai img2img (POST with image field)
    const pollinationsResponse = await fetch('https://image.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: zombiePrompt,
        image: pfpUrl,
        width: 512,
        height: 512,
        nologo: true,
        seed: Date.now() % 100000,
      }),
    });

    if (!pollinationsResponse.ok) {
      throw new Error(`Pollinations.ai error: ${pollinationsResponse.status}`);
    }

    // Get image as buffer and convert to base64
    const imageBuffer = Buffer.from(await pollinationsResponse.arrayBuffer());
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return res.status(200).json({
      success: true,
      imageUrl: dataUrl,
      method: 'img2img-pollinations',
    });
  } catch (error) {
    console.error('Zombify error:', error);
    return res.status(500).json({
      error: error.message,
      fallback: true,
    });
  }
}
