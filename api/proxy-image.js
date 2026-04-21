// /api/proxy-image.js
// Download image from URL (Vercel IP can access xAI CDN)

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl required' });

    const resp = await fetch(imageUrl);
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
    
    const buf = Buffer.from(await resp.arrayBuffer());
    const b64 = `data:image/jpeg;base64,${buf.toString('base64')}`;

    return res.status(200).json({ success: true, image: b64, size: buf.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
