// /api/deploy-nft.js
// Deploy NFT Drop contract via Thirdweb API

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const THIRDWEB_SECRET = process.env.THIRDWEB_SECRET_KEY;
    const THIRDWEB_CLIENT_ID = process.env.THIRDWEB_CLIENT_ID;

    if (!THIRDWEB_SECRET || !THIRDWEB_CLIENT_ID) {
      return res.status(500).json({ error: 'Thirdweb keys not configured' });
    }

    // Step 1: Check available chains
    const chainsResp = await fetch('https://api.thirdweb.com/v1/chains', {
      headers: { 'x-secret-key': THIRDWEB_SECRET },
    });
    const chains = await chainsResp.json();
    console.log('Chains:', chains.length || 'N/A');

    // Step 2: Deploy NFT Drop on Base (chainId 8453)
    const deployResp = await fetch('https://api.thirdweb.com/v1/contracts/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': THIRDWEB_SECRET,
      },
      body: JSON.stringify({
        chainId: 8453, // Base mainnet
        contractType: 'nft-drop',
        contractMetadata: {
          name: 'Zombie Mutant NFT',
          symbol: 'ZOMBIE',
          description: 'AI-generated zombie mutant NFTs from Farcaster profile pictures',
          image: 'https://zombie-mutant-nft.vercel.app/icon.png',
          external_link: 'https://zombie-mutant-nft.vercel.app',
          seller_fee_basis_points: 500, // 5% royalty
          fee_recipient: req.body.walletAddress || '0x0000000000000000000000000000000000000000',
          primary_sale_recipient: req.body.walletAddress || '0x0000000000000000000000000000000000000000',
        },
      }),
    });

    if (!deployResp.ok) {
      const err = await deployResp.text();
      return res.status(deployResp.status).json({ error: `Deploy failed: ${err}` });
    }

    const deployData = await deployResp.json();

    return res.status(200).json({
      success: true,
      contractAddress: deployData.result?.address || deployData.address,
      transactionHash: deployData.result?.transactionHash || deployData.transactionHash,
      data: deployData,
    });

  } catch (error) {
    console.error('Deploy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
