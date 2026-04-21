// /api/generate-mutant.js
// Returns base64 image (Vercel IP can download from xAI CDN)

export const config = { maxDuration: 60 };

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
    globalCount++;
    if (globalCount > MAX_GENERATIONS) {
      return res.status(429).json({ error: 'Generation limit reached' });
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'XAI_API_KEY not configured' });

    const name = displayName || username || 'character';

    // Step 1: Vision analyze
    let desc = '';
    if (pfpUrl) {
      try {
        const vr = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'grok-4-fast-non-reasoning',
            messages: [{ role: 'user', content: [
              { type: 'image_url', image_url: { url: pfpUrl } },
              { type: 'text', text: 'In 2 sentences: art style, colors, facial features. Be concise.' }
            ]}]
          })
        });
        if (vr.ok) { const d = await vr.json(); desc = d.choices?.[0]?.message?.content || ''; }
      } catch (e) { console.warn('Vision:', e.message); }
    }

    // Step 2: Generate
    const prompt = desc
      ? `Zombie mutant: "${desc.substring(0,200)}". Green decayed skin, red glowing eyes, dark sockets, rot, blood. Keep EXACT 2D flat cartoon style. NOT photorealistic. Bold outlines. Dark horror bg. NFT art.`
      : `2D cartoon zombie "${name}". Green skin, red eyes, dark sockets. Flat cartoon, NOT realistic. Bold outlines. Dark bg.`;

    const gr = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'grok-imagine-image', prompt, n: 1 })
    });
    if (!gr.ok) throw new Error(`Grok ${gr.status}: ${await gr.text()}`);

    const gd = await gr.json();
    const imgUrl = gd.data?.[0]?.url;
    if (!imgUrl) throw new Error('No image');

    // Step 3: Download and return base64 (Vercel IP can access xAI CDN)
    const imgResp = await fetch(imgUrl);
    if (!imgResp.ok) throw new Error('Download failed');
    const buf = Buffer.from(await imgResp.arrayBuffer());
    const b64 = `data:image/jpeg;base64,${buf.toString('base64')}`;

    return res.status(200).json({
      success: true,
      imageUrl: b64,
      method: 'grok-vision+imagine',
      remaining: MAX_GENERATIONS - globalCount,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
