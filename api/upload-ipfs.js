// /api/upload-ipfs.js
// Upload image + metadata to IPFS via Pinata JWT
// Returns tokenURI for NFT minting

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, name, description } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    const pinataJwt = process.env.PINATA_JWT;
    if (!pinataJwt) {
      return res.status(500).json({ error: 'PINATA_JWT not configured' });
    }

    // ─── Step 1: Upload image to IPFS ───
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const imageFormData = new FormData();
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
    imageFormData.append('file', imageBlob, `${name || 'zombie-mutant'}.jpg`);
    imageFormData.append('pinataMetadata', JSON.stringify({
      name: `${name || 'Zombie Mutant'} - Image`,
    }));

    const imageUploadResp = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${pinataJwt}` },
      body: imageFormData,
    });

    if (!imageUploadResp.ok) {
      const err = await imageUploadResp.text();
      throw new Error(`Image upload failed: ${err}`);
    }

    const imageData = await imageUploadResp.json();
    const imageIpfsHash = imageData.IpfsHash;
    const imageIpfsUri = `ipfs://${imageIpfsHash}`;

    // ─── Step 2: Upload metadata JSON to IPFS ───
    const metadata = {
      name: name || 'Zombie Mutant NFT',
      description: description || 'AI-generated zombie mutant NFT from Farcaster profile picture.',
      image: imageIpfsUri,
      attributes: [
        { trait_type: 'Generation', value: 'AI' },
        { trait_type: 'Style', value: '2D Cartoon Zombie' },
        { trait_type: 'Chain', value: 'Base' },
      ],
      external_url: 'https://zombie-mutant-nft.vercel.app',
    };

    const metadataResp = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pinataJwt}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: { name: `${name || 'Zombie Mutant'} - Metadata` },
      }),
    });

    if (!metadataResp.ok) {
      const err = await metadataResp.text();
      throw new Error(`Metadata upload failed: ${err}`);
    }

    const metadataData = await metadataResp.json();
    const metadataIpfsHash = metadataData.IpfsHash;
    const tokenUri = `ipfs://${metadataIpfsHash}`;

    return res.status(200).json({
      success: true,
      imageUri: imageIpfsUri,
      imageGateway: `https://gateway.pinata.cloud/ipfs/${imageIpfsHash}`,
      tokenUri,
      metadataGateway: `https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`,
    });

  } catch (error) {
    console.error('IPFS upload error:', error);
    return res.status(500).json({ error: error.message });
  }
}
