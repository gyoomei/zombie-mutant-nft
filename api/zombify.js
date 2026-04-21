// /api/zombify.js
// Hybrid approach: Generate zombie overlay textures → Composite with original pfp
// Returns overlay assets for client-side canvas compositing

export const config = {
  maxDuration: 30,
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

    // Fetch original image and convert to base64
    const origResp = await fetch(pfpUrl);
    if (!origResp.ok) throw new Error('Failed to fetch pfp');
    const origBuffer = Buffer.from(await origResp.arrayBuffer());
    const origMime = origResp.headers.get('content-type') || 'image/jpeg';
    const origBase64 = origBuffer.toString('base64');

    // Generate zombie overlay textures (transparent-style horror effects)
    const overlays = {};

    // Blood splatter overlay
    const bloodResp = await fetch(
      'https://image.pollinations.ai/prompt/' +
      encodeURIComponent('blood splatter drops on transparent dark background, horror texture, scattered blood drops and streaks, dark red, visceral, overlay texture, isolated blood marks, dark moody') +
      '?width=512&height=512&nologo=true&seed=' + (Date.now() % 100000)
    );
    if (bloodResp.ok) {
      const buf = Buffer.from(await bloodResp.arrayBuffer());
      overlays.blood = `data:image/jpeg;base64,${buf.toString('base64')}`;
    }

    // Veins/cracks overlay
    const veinsResp = await fetch(
      'https://image.pollinations.ai/prompt/' +
      encodeURIComponent('dark veins and cracked skin texture on dark background, zombie decay pattern, greenish dark veins spreading, dried cracked dead skin, horror texture overlay, isolated pattern') +
      '?width=512&height=512&nologo=true&seed=' + ((Date.now() + 1) % 100000)
    );
    if (veinsResp.ok) {
      const buf = Buffer.from(await veinsResp.arrayBuffer());
      overlays.veins = `data:image/jpeg;base64,${buf.toString('base64')}`;
    }

    return res.status(200).json({
      success: true,
      original: `data:${origMime};base64,${origBase64}`,
      overlays,
      method: 'canvas-composite',
    });

  } catch (error) {
    console.error('Zombify error:', error);
    return res.status(500).json({ error: error.message, fallback: true });
  }
}
