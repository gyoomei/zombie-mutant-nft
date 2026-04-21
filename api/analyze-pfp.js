// /api/analyze-pfp.js
// Vercel Serverless Function — Analisis pfp Farcaster pakai AI vision (free)
// Menggunakan Pollinations.ai OpenAI-compatible endpoint

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
    const { pfpUrl, username, displayName } = req.body;

    if (!pfpUrl) {
      return res.status(400).json({ error: 'pfpUrl is required' });
    }

    // Step 1: Analyze pfp with vision AI
    const description = await analyzeImage(pfpUrl, displayName || username);

    // Step 2: Build zombie prompt from description
    const zombiePrompt = buildZombiePrompt(description, displayName || username);

    return res.status(200).json({
      description,
      zombiePrompt,
      imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(zombiePrompt)}?width=512&height=512&nologo=true&seed=${Date.now()}`,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ─── Vision Analysis (Pollinations.ai — free, no key) ────
async function analyzeImage(imageUrl, name) {
  const response = await fetch('https://text.pollinations.ai/openai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This is a Farcaster user's profile picture (@${name}). Describe this image in EXTREME DETAIL for AI image generation. Focus on:
1. Character type (human, animal, robot, etc.)
2. EXACT colors (fur, skin, clothing)
3. Clothing and accessories (hat, glasses, jacket, etc.)
4. Facial features (eyes, nose, mouth, expression)
5. Art style (cartoon, realistic, pixel, etc.)
6. Background details
7. Any unique distinguishing features

Be very specific with colors and details. Output ONLY the description, no preamble.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Vision API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'A character portrait';
}

// ─── Build Zombie Prompt ──────────────────────────────────
function buildZombiePrompt(originalDescription, name) {
  return (
    `ZOMBIE MUTANT version of this exact character: ${originalDescription}. ` +
    `Transform into undead horror: rotting decaying flesh, exposed bones and tendons, ` +
    `glowing fiery red eyes with dark hollow sockets, dark green-grey decayed skin patches, ` +
    `blood splatter and wounds, torn and ripped clothing, ` +
    `dark moody horror lighting with green fog, dramatic shadows, ` +
    `horror digital art, highly detailed, visceral, same composition and framing as original, ` +
    `dark background, horror NFT collectible art style, ` +
    `the zombie version should still be recognizably the same character but undead`
  );
}
