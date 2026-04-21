// /api/zombify.js
// 2-Step Pipeline: Generate zombie texture → Blend with original pfp
// Semua gratis, no API key

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { pfpUrl } = req.body;
    if (!pfpUrl) return res.status(400).json({ error: 'pfpUrl required' });

    // Step 1: Fetch original image
    const origResp = await fetch(pfpUrl);
    if (!origResp.ok) throw new Error('Failed to fetch pfp');
    const origBuffer = Buffer.from(await origResp.arrayBuffer());
    const origBase64 = origBuffer.toString('base64');
    const origMime = origResp.headers.get('content-type') || 'image/jpeg';

    // Step 2: Generate zombie OVERLAY texture (not replacement)
    // This creates an overlay that preserves the original character
    const overlayPrompt = [
      'zombie mutation overlay texture on transparent background, ',
      'subtle green decayed skin tint patches, ',
      'glowing red eye effect circles, ',
      'blood splatter drops and scratches, ',
      'cracked dried skin texture overlay, ',
      'dark vein lines, subtle horror effects, ',
      'semi-transparent horror texture layer, ',
      'same proportions as original portrait, ',
      'horror effect overlay only, keep original character visible',
    ].join('');

    // Step 3: Generate zombie version with img2img (low-ish transformation)
    const zombiePrompt = [
      'EXACT SAME CHARACTER as input image but with subtle zombie mutation, ',
      'keep ALL original details: same face shape, same clothing, same accessories, ',
      'same colors, same pose, same background composition, ',
      'ONLY ADD: subtle green-tinged decayed skin patches, ',
      'small glowing red eye highlights, ',
      'minor blood splatter marks, ',
      'slight dark veins under skin, ',
      'torn edges on clothing, ',
      'subtle horror atmosphere lighting, ',
      'DO NOT CHANGE the character identity or features, ',
      'portrait photo, highly detailed, same as original',
    ].join('');

    const zombieResp = await fetch('https://image.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: zombiePrompt,
        image: `data:${origMime};base64,${origBase64}`,
        width: 512,
        height: 512,
        nologo: true,
        seed: Date.now() % 100000,
      }),
    });

    if (!zombieResp.ok) throw new Error(`Generation failed: ${zombieResp.status}`);

    const zombieBuffer = Buffer.from(await zombieResp.arrayBuffer());
    const zombieBase64 = zombieBuffer.toString('base64');

    // Step 4: Return BOTH — original and zombie
    // Frontend can show side-by-side or blend
    return res.status(200).json({
      success: true,
      original: `data:${origMime};base64,${origBase64}`,
      zombie: `data:image/jpeg;base64,${zombieBase64}`,
      method: 'img2img-preserve',
    });

  } catch (error) {
    console.error('Zombify error:', error);
    return res.status(500).json({ error: error.message, fallback: true });
  }
}
