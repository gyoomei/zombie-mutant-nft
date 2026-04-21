// /api/generate-mutant.js
// 2-Step Flow:
// 1. grok-4-fast-non-reasoning → analyze pfp, extract features
// 2. grok-imagine-image-pro → generate 2D zombie preserving original features
// Limit: 100 generations. Returns base64 image.

export const config = {
  maxDuration: 60,
};

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

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'XAI_API_KEY not configured' });
    }

    const name = displayName || username || 'character';

    // ─── Step 1: Analyze PFP with Vision ───
    let pfpDescription = '';
    if (pfpUrl) {
      try {
        const visionResp = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'grok-4-fast-non-reasoning',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: { url: pfpUrl },
                  },
                  {
                    type: 'text',
                    text: `Describe this profile picture in 2-3 sentences. Focus ONLY on:
- Art style (2D cartoon/anime/pixel/vector/realistic?)
- Main colors
- Key facial features (hair, eyes, expression)
- Any accessories or background elements
Be concise. This description will be used to create a zombie version that looks exactly like this.`,
                  },
                ],
              },
            ],
          }),
        });

        if (visionResp.ok) {
          const visionData = await visionResp.json();
          pfpDescription = visionData.choices?.[0]?.message?.content || '';
          console.log('PFP description:', pfpDescription);
        }
      } catch (e) {
        console.warn('Vision analysis failed:', e.message);
      }
    }

    // ─── Step 2: Build Zombie Prompt ───
    // Preserve original style + add zombie effects
    let zombiePrompt;

    if (pfpDescription) {
      zombiePrompt = [
        `A zombie mutant version of this character: "${pfpDescription}"`,
        `Transform into undead zombie: green-tinted decayed skin, glowing red eyes,`,
        `dark hollow eye sockets, subtle rot patches, minor blood drops,`,
        `dark moody background with green fog.`,
        `CRITICAL: Keep the EXACT SAME art style as the original (${pfpDescription.includes('3D') ? '3D' : '2D flat cartoon'}).`,
        `CRITICAL: Keep the same face shape, features, pose, and colors.`,
        `Do NOT make it photorealistic or hyper-detailed.`,
        `Style: flat 2D illustration, clean lines, same proportions as original.`,
        `Horror NFT collectible art, portrait composition.`,
      ].join(' ');
    } else {
      // Fallback if no pfp or vision failed
      zombiePrompt = [
        `2D cartoon zombie mutant portrait of "${name}".`,
        `Flat illustration style, NOT photorealistic.`,
        `Green-tinted skin, glowing red eyes, dark eye sockets,`,
        `subtle decay patches, blood drops.`,
        `Dark moody background with green fog.`,
        `Clean lines, simple shading, horror art style.`,
        `Portrait composition, NFT collectible.`,
      ].join(' ');
    }

    console.log('Zombie prompt:', zombiePrompt.substring(0, 200) + '...');

    // ─── Step 3: Generate Zombie Image ───
    const genResp = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-imagine-image-pro',
        prompt: zombiePrompt,
        n: 1,
      }),
    });

    if (!genResp.ok) {
      const errText = await genResp.text();
      throw new Error(`Grok image error (${genResp.status}): ${errText}`);
    }

    const genData = await genResp.json();
    const imageUrl = genData.data?.[0]?.url;
    const mimeType = genData.data?.[0]?.mime_type || 'image/jpeg';

    if (!imageUrl) {
      throw new Error('No image in Grok response');
    }

    // Download immediately (xAI URLs expire)
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error('Failed to download image');
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
    const base64 = imgBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return res.status(200).json({
      success: true,
      imageUrl: dataUrl,
      pfpDescription,
      method: 'grok-vision+imagine',
      limit: MAX_GENERATIONS,
      used: globalCount,
      remaining: MAX_GENERATIONS - globalCount,
    });

  } catch (error) {
    console.error('Generate error:', error);
    return res.status(500).json({ error: error.message });
  }
}
