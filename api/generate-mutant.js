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
              { type: 'text', text: 'Describe this character in detail: species/gender, hair/fur color, face features, skin/fur, clothing, expression, art style, background color. Be specific about every visual element so an artist could recreate it.' }
            ]}]
          })
        });
        if (vr.ok) { const d = await vr.json(); desc = d.choices?.[0]?.message?.content || ''; }
      } catch (e) { console.warn('Vision:', e.message); }
    }

    // Step 2: Random accessories (pick 3)
    const accessories = [
      { item: "burning cigarette hanging from mouth corner with toxic green smoke trail rising up", pos: "in mouth" },
      { item: "rusty battle axe strapped to back, blade dripping blood", pos: "on back" },
      { item: "broken sword with glowing green runes resting on shoulder like a samurai", pos: "on shoulder" },
      { item: "rusty chain with skull pendant draped over shoulder", pos: "on shoulder" },
      { item: "machete tucked in waist belt, dripping zombie blood", pos: "on waist" },
      { item: "spiked mace hanging from back, covered in green slime", pos: "on back" },
      { item: "barbed wire wrapped around arm, cutting into skin", pos: "on arm" },
      { item: "biohazard symbol glowing on chest", pos: "on chest" },
    ];
    // Shuffle and pick 3
    const shuffled = accessories.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 3);
    const accLines = picked.map(a => `- ${a.item} (${a.pos})`).join('\n');

    // Step 3: Generate with positioned accessories
    const prompt = desc
      ? `ZOMBIE MUTANT NFT CHARACTER:\nKeep EXACT same character: ${desc.substring(0,300)}.\nZOMBIFY: green decayed patches on skin/fur, GLOWING RED eyes with dark hollow sockets, cracked skin showing sharp zombie teeth, torn ears, green slime dripping from mouth.\n\nEXACT ACCESSORY PLACEMENT:\n${accLines}\n\nEach accessory must be at its specific position. Show them clearly.\nSame hand-drawn 2D cartoon style, bold black outlines. NOT photorealistic.\nDark background with green zombie fog at bottom.\nNFT collectible art, square composition.`
      : `ZOMBIE MUTANT NFT CHARACTER: "${name}".\nZOMBIFY: green decayed skin, GLOWING RED eyes with dark hollow sockets, sharp zombie teeth, torn ears, green slime.\n\nEXACT ACCESSORY PLACEMENT:\n${accLines}\n\nSame 2D cartoon style, bold outlines. NOT photorealistic.\nDark background with green fog. NFT collectible art.`;

    const gr = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'grok-imagine-image', prompt, n: 1 })
    });
    if (!gr.ok) throw new Error(`Grok ${gr.status}: ${await gr.text()}`);

    const gd = await gr.json();
    const imgUrl = gd.data?.[0]?.url;
    if (!imgUrl) throw new Error('No image');

    // Step 4: Download and return base64
    const imgResp = await fetch(imgUrl);
    if (!imgResp.ok) throw new Error('Download failed');
    const buf = Buffer.from(await imgResp.arrayBuffer());
    const b64 = `data:image/jpeg;base64,${buf.toString('base64')}`;

    return res.status(200).json({
      success: true,
      imageUrl: b64,
      method: 'grok-vision+imagine',
      accessories: picked.map(a => a.item),
      remaining: MAX_GENERATIONS - globalCount,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
