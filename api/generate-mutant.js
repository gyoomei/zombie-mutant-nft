// /api/generate-mutant.js
// Serverless Function — Generate zombie mutant pakai xAI Grok API
// Limit: 100 generations
// Returns base64 image (xAI URLs expire quickly)

export const config = {
  maxDuration: 30,
};

// In-memory counter (resets on deploy, but serves as server-side check)
let globalCount = 0;
const MAX_GENERATIONS = 100;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { pfpUrl, username, displayName } = req.body;

    // Check generation limit
    globalCount++;
    if (globalCount > MAX_GENERATIONS) {
      return res.status(429).json({
        error: 'Generation limit reached',
        limit: MAX_GENERATIONS,
        used: globalCount - 1,
      });
    }

    // Get API key from env (server-side only, not exposed to client)
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'XAI_API_KEY not configured' });
    }

    // Build zombie prompt based on user info
    const name = displayName || username || 'character';
    const zombiePrompt = [
      `Zombie mutant portrait of ${name}, a Farcaster user, `,
      `undead horror transformation, rotting decaying flesh with green tint, `,
      `exposed bones and torn tendons, glowing fiery red eyes with dark hollow sockets, `,
      `dark green-grey decayed skin patches, blood splatter and deep wounds, `,
      `torn ripped dark clothing, dark moody horror lighting with green fog, `,
      `dramatic shadows, highly detailed horror digital art, `,
      `dark background with subtle embers, horror NFT collectible art style, `,
      `portrait composition, 4K quality, visceral and menacing`,
    ].join('');

    // Call xAI Grok Image API
    const grokResponse = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-imagine-image',
        prompt: zombiePrompt,
        n: 1,
      }),
    });

    if (!grokResponse.ok) {
      const errText = await grokResponse.text();
      throw new Error(`Grok API error (${grokResponse.status}): ${errText}`);
    }

    const grokData = await grokResponse.json();
    const imageUrl = grokData.data?.[0]?.url;
    const mimeType = grokData.data?.[0]?.mime_type || 'image/jpeg';

    if (!imageUrl) {
      throw new Error('No image URL in Grok response');
    }

    // Download image immediately (xAI URLs expire quickly)
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      throw new Error('Failed to download generated image');
    }
    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
    const base64 = imgBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return res.status(200).json({
      success: true,
      imageUrl: dataUrl,
      method: 'grok-imagine',
      limit: MAX_GENERATIONS,
      used: globalCount,
      remaining: MAX_GENERATIONS - globalCount,
    });

  } catch (error) {
    console.error('Generate error:', error);
    return res.status(500).json({ error: error.message });
  }
}
