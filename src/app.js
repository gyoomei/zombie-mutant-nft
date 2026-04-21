// Zombie Mutant NFT — Main App
// Flow: Farcaster pfp → AI img2img zombie transform → Preview → (NFT mint)

// ─── Config ───────────────────────────────────────────────
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
const MAX_GENERATIONS = 100;
const GEN_COUNT_KEY = 'zombie_mutant_gen_count';

// ─── Generation Counter (localStorage) ────────────────────
function getGenCount() {
  return parseInt(localStorage.getItem(GEN_COUNT_KEY) || '0', 10);
}
function incrementGenCount() {
  const count = getGenCount() + 1;
  localStorage.setItem(GEN_COUNT_KEY, count.toString());
  return count;
}
function getRemaining() {
  return MAX_GENERATIONS - getGenCount();
}

// ─── State ────────────────────────────────────────────────
const state = {
  sdk: null,
  context: null,
  pfpUrl: null,
  mutantUrl: null,
  step: 1,
};

// ─── DOM ──────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const els = {
  userCard: $('#user-card'),
  userAvatar: $('#user-avatar'),
  userName: $('#user-name'),
  userFid: $('#user-fid'),
  previewPlaceholder: $('#preview-placeholder'),
  previewImages: $('#preview-images'),
  imgOriginal: $('#img-original'),
  imgMutant: $('#img-mutant'),
  loading: $('#loading'),
  loadingText: $('#loading-text'),
  btnGenerate: $('#btn-generate'),
  btnMint: $('#btn-mint'),
  btnShare: $('#btn-share'),
  status: $('#status'),
};

// ─── Step indicator ───────────────────────────────────────
function setStep(n) {
  state.step = n;
  for (let i = 1; i <= 4; i++) {
    const el = $(`#step-${i}`);
    el.classList.remove('active', 'done');
    if (i < n) el.classList.add('done');
    if (i === n) el.classList.add('active');
  }
}

// ─── Status ───────────────────────────────────────────────
function setStatus(msg, type = '') {
  els.status.textContent = msg;
  els.status.className = 'status-bar' + (type ? ` ${type}` : '');
}

// ─── Loading ──────────────────────────────────────────────
function showLoading(msg = 'Loading...') {
  els.loadingText.textContent = msg;
  els.loading.classList.add('active');
  els.previewPlaceholder.style.display = 'none';
  els.previewImages.style.display = 'none';
}
function hideLoading() {
  els.loading.classList.remove('active');
}

// ─── Init Farcaster Context ───────────────────────────────
async function initFarcaster() {
  return new Promise((resolve) => {
    // If SDK already loaded
    if (window.__farcasterSdk) {
      resolve(window.__farcasterSdk);
      return;
    }

    // Wait for ready event
    window.addEventListener('farcaster:ready', (e) => resolve(e.detail), { once: true });
    window.addEventListener('farcaster:error', () => resolve(null), { once: true });

    // Timeout fallback
    setTimeout(() => resolve(null), 5000);
  });
}

// ─── Fetch Farcaster Context ──────────────────────────────
async function fetchContext(sdk) {
  try {
    const context = await sdk.context;
    return context;
  } catch (e) {
    console.warn('Failed to get context:', e);
    return null;
  }
}

// ─── Canvas Zombie Compositor ─────────────────────────────
// Ambil foto ASLI, tambah efek zombie via canvas
// 100% original preserved + horror effects on top

async function zombifyWithCanvas(originalUrl, overlayUrls = {}) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 512;
    canvas.width = size;
    canvas.height = size;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Draw original image
      ctx.drawImage(img, 0, 0, size, size);

      // Layer 1: Green tint overlay (decayed skin)
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(40, 80, 40, 0.35)';
      ctx.fillRect(0, 0, size, size);

      // Layer 2: Dark desaturation
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, size, size);

      // Layer 3: Red glow in center (zombie eye effect)
      ctx.globalCompositeOperation = 'screen';
      const glow = ctx.createRadialGradient(size/2, size/2, 20, size/2, size/2, 200);
      glow.addColorStop(0, 'rgba(200, 30, 30, 0.4)');
      glow.addColorStop(0.3, 'rgba(150, 20, 20, 0.15)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      // Layer 4: Dark vignette (creepy edges)
      ctx.globalCompositeOperation = 'multiply';
      const vignette = ctx.createRadialGradient(size/2, size/2, 80, size/2, size/2, size/1.5);
      vignette.addColorStop(0, 'rgba(255, 255, 255, 1)');
      vignette.addColorStop(0.7, 'rgba(100, 100, 100, 0.8)');
      vignette.addColorStop(1, 'rgba(20, 20, 20, 0.9)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, size, size);

      // Layer 5: Noise/grain texture
      ctx.globalCompositeOperation = 'overlay';
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const brightness = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
        ctx.fillStyle = brightness;
        ctx.fillRect(x, y, 1, 1);
      }

      // Layer 6: Random blood drops
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 2 + Math.random() * 8;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${120 + Math.random()*60}, ${Math.random()*20}, ${Math.random()*10}, ${0.4 + Math.random()*0.4})`;
        ctx.fill();
      }

      // Layer 7: Overlay texture (blood splatter from API)
      if (overlayUrls.blood) {
        const bloodImg = new Image();
        bloodImg.crossOrigin = 'anonymous';
        bloodImg.onload = () => {
          ctx.globalCompositeOperation = 'overlay';
          ctx.globalAlpha = 0.3;
          ctx.drawImage(bloodImg, 0, 0, size, size);
          ctx.globalAlpha = 1;
          finish();
        };
        bloodImg.onerror = () => finish();
        bloodImg.src = overlayUrls.blood;
      } else {
        finish();
      }

      function finish() {
        ctx.globalCompositeOperation = 'source-over';
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      }
    };
    img.onerror = () => reject(new Error('Failed to load original image'));
    img.src = originalUrl;
  });
}

// ─── Generate Mutant (xAI Grok API + limit 100) ──────────
async function generateMutant(pfpUrl, username, displayName) {
  const name = displayName || username || 'character';

  // Check limit
  if (getRemaining() <= 0) {
    throw new Error('Generation limit reached (100 max). Come back later!');
  }

  // Primary: Grok API
  try {
    const response = await fetch('/api/generate-mutant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pfpUrl, username, displayName }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.imageUrl) {
        incrementGenCount();
        return { original: pfpUrl, zombie: data.imageUrl };
      }
    }

    // If limit reached on server
    if (response.status === 429) {
      const data = await response.json();
      throw new Error(data.error || 'Generation limit reached');
    }
  } catch (e) {
    if (e.message.includes('limit')) throw e;
    console.warn('Grok API failed, using fallback:', e.message);
  }

  // Fallback: Pollinations.ai (canvas compositing)
  incrementGenCount();
  return generateMutantFallback(pfpUrl, name);
}

// ─── Fallback: Canvas compositing ─────────────────────────
async function generateMutantFallback(pfpUrl, name) {
  if (pfpUrl) {
    try {
      const resp = await fetch('/api/zombify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pfpUrl }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.original) {
          const zombie = await zombifyWithCanvas(data.original, data.overlays || {});
          return { original: data.original, zombie };
        }
      }
    } catch (e) {
      console.warn('Canvas fallback failed:', e.message);
    }
  }
  // Last resort: text-to-image
  const prompt = encodeURIComponent(
    `zombie mutant portrait of ${name}, undead horror, rotting flesh, glowing red eyes, dark green skin, blood splatter, dark moody lighting, horror art, highly detailed, dark background`
  );
  const url = `${POLLINATIONS_BASE}/${prompt}?width=512&height=512&nologo=true&seed=${Date.now()}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ original: pfpUrl, zombie: url });
    img.onerror = () => reject(new Error('Generation failed'));
    img.src = url;
    setTimeout(() => reject(new Error('Timeout')), 30000);
  });
}

// ─── Share on Farcaster ──────────────────────────────────
async function shareOnFarcaster() {
  if (!state.sdk) return;

  const text = `I just turned myself into a Zombie Mutant! 🧟💀\n\nGenerated with AI from my Farcaster pfp.\n\n#ZombieMutantNFT #Farcaster`;

  try {
    await state.sdk.actions.composeCast({
      text,
      embeds: state.mutantUrl ? [state.mutantUrl] : [],
    });
  } catch (e) {
    // Fallback: clipboard + warpcast deep link
    const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
    window.open(warpcastUrl, '_blank');
  }
}

// ─── App Init ─────────────────────────────────────────────
async function init() {
  setStatus('Connecting to Farcaster...');

  // 1. Init Farcaster SDK
  const sdk = await initFarcaster();
  state.sdk = sdk;

  if (!sdk) {
    setStatus('Open this in Farcaster to get started!', 'error');
    // Enable demo mode for testing outside Farcaster
    els.btnGenerate.disabled = false;
    setStatus(`Demo mode — ${getRemaining()}/100 generations left`);

    // Set demo user data for testing
    state.context = {
      user: { fid: 0, username: 'demo_user', displayName: 'Demo User', pfpUrl: '' }
    };
    els.userName.textContent = 'Demo User';
    els.userFid.textContent = 'Demo Mode — not in Farcaster';
    els.userCard.style.display = 'flex';
    els.previewPlaceholder.textContent = 'Click Generate to test zombie mutant generation 🧟';
    return;
  }

  // 2. Get user context
  const context = await fetchContext(sdk);
  state.context = context;

  if (!context?.user) {
    setStatus('Could not read Farcaster profile', 'error');
    return;
  }

  const { fid, username, displayName, pfpUrl } = context.user;
  state.pfpUrl = pfpUrl;

  // 3. Show user card
  if (pfpUrl) {
    els.userAvatar.src = pfpUrl;
    els.userName.textContent = displayName || username || `User ${fid}`;
    els.userFid.textContent = `FID: ${fid}${username ? ` · @${username}` : ''}`;
    els.userCard.style.display = 'flex';

    // Show original image in preview
    els.imgOriginal.src = pfpUrl;
    els.previewPlaceholder.style.display = 'none';
    els.previewImages.style.display = 'flex';

    // Enable generate button
    els.btnGenerate.disabled = false;
    setStep(2);
    const remaining = getRemaining();
    setStatus(`Ready — ${remaining}/100 generations left`);
  } else {
    setStatus('No profile picture found', 'error');
  }
}

// ─── Event Listeners ──────────────────────────────────────
els.btnGenerate.addEventListener('click', async () => {
  const username = state.context?.user?.username || '';
  const displayName = state.context?.user?.displayName || '';

  // ─── Payment check: $0.1 (0.00005 ETH) before generate ───
  const GENERATE_PRICE = '0.00005'; // ETH ≈ $0.1
  const OWNER_WALLET = '0x92C82520907b6Cfe61E363fe0E9f6B7c82fC7D59';

  els.btnGenerate.disabled = true;
  setStatus('Connecting wallet for payment...');

  try {
    // Get provider
    let provider;
    if (state.sdk?.wallet?.getEthereumProvider) {
      provider = await state.sdk.wallet.getEthereumProvider();
    } else if (window.ethereum) {
      provider = window.ethereum;
    } else {
      throw new Error('No wallet found. Open in Farcaster.');
    }

    // Request accounts
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const userAddress = accounts[0];

    // Send $0.1 payment to owner
    setStatus(`Pay ${GENERATE_PRICE} ETH (~$0.1) to generate...`);
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();

    const tx = await signer.sendTransaction({
      to: OWNER_WALLET,
      value: ethers.parseEther(GENERATE_PRICE),
    });

    setStatus(`Payment sent! Waiting confirmation...`);
    await tx.wait();
    setStatus('Payment confirmed! Generating mutant...');

  } catch (e) {
    els.btnGenerate.disabled = false;
    setStatus(`Payment failed: ${e.message}`, 'error');
    return;
  }

  // ─── Continue with generation ───
  setStep(3);
  showLoading('Transforming your pfp...');

  try {
    const result = await generateMutant(
      state.context?.user?.pfpUrl || '',
      username,
      displayName
    );
    state.mutantUrl = result.zombie;

    // Show result
    hideLoading();
    // Show original pfp if available
    if (result.original) {
      els.imgOriginal.src = result.original;
    }
    els.imgMutant.src = result.zombie;
    els.previewImages.style.display = 'flex';

    // Show action buttons
    els.btnGenerate.style.display = 'none';
    els.btnMint.style.display = 'block';
    els.btnShare.style.display = 'block';

    setStep(4);
    const remaining = getRemaining();
    setStatus(`Mutant created! 🧟 ${remaining}/100 left`, 'success');
  } catch (e) {
    hideLoading();
    els.previewPlaceholder.style.display = 'block';
    els.previewPlaceholder.textContent = `❌ Error: ${e.message}`;
    els.btnGenerate.disabled = false;
    setStep(2);
    setStatus(`Failed: ${e.message}`, 'error');
  }
});

// ─── NFT Minting ──────────────────────────────────────
async function mintNFT() {
  if (!state.mutantUrl) {
    setStatus('Generate a mutant first!', 'error');
    return;
  }

  // Contract address (deployed on Base)
  const CONTRACT_ADDRESS = '0x80A10b9Ce904Ba7BC7bc8478698DC2E759E0AD39';
  const CONTRACT_ABI = [
    "function mint(address to, string uri) payable returns (uint256)",
    "function totalMinted() view returns (uint256)",
    "function mintPrice() view returns (uint256)",
  ];
  const MINT_PRICE = '0.001'; // ETH

  els.btnMint.disabled = true;
  setStatus('Connecting wallet...');
  setStep(3);

  try {
    // 1. Get provider from Farcaster SDK
    let provider;
    if (state.sdk?.wallet?.getEthereumProvider) {
      provider = await state.sdk.wallet.getEthereumProvider();
    } else if (window.ethereum) {
      provider = window.ethereum;
    } else {
      throw new Error('No wallet found. Open in Farcaster or use a wallet browser.');
    }

    // 2. Request accounts
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const userAddress = accounts[0];
    setStatus(`Wallet: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`);

    // 3. Upload image to IPFS
    setStatus('Uploading to IPFS...');
    const ipfsResp = await fetch('/api/upload-ipfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: state.mutantUrl,
        name: `Zombie Mutant #${Date.now()}`,
        description: `Zombie mutant NFT generated from @${state.context?.user?.username || 'user'}'s Farcaster profile picture.`,
      }),
    });

    if (!ipfsResp.ok) {
      const err = await ipfsResp.json();
      throw new Error(err.error || 'IPFS upload failed');
    }

    const ipfsData = await ipfsResp.json();
    setStatus('Minting NFT on Base...');

    // 4. Encode mint function call
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // 5. Send mint transaction
    const tx = await contract.mint(userAddress, ipfsData.tokenUri, {
      value: ethers.parseEther(MINT_PRICE),
    });

    setStatus(`Transaction sent: ${tx.hash.slice(0,10)}...`);
    const receipt = await tx.wait();

    // 6. Get token ID from event
    const mintEvent = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === 'NFTMinted';
      } catch { return false; }
    });

    let tokenId = '?';
    if (mintEvent) {
      const parsed = contract.interface.parseLog(mintEvent);
      tokenId = parsed.args.tokenId.toString();
    }

    setStep(4);
    setStatus(`NFT Minted! Token #${tokenId} 🧟🎉`, 'success');

    // Show mint result
    els.btnMint.textContent = 'Minted! ✅';
    els.btnMint.disabled = true;

    // Share option
    if (state.sdk?.actions?.composeCast) {
      const shareText = `I just minted Zombie Mutant #${tokenId}! 🧟💀\n\nAI-generated zombie NFT from my Farcaster pfp on Base.\n\nhttps://basescan.org/tx/${tx.hash}\n\n#ZombieMutantNFT #Base #Farcaster`;
      setTimeout(() => {
        state.sdk.actions.composeCast({ text: shareText });
      }, 2000);
    }

  } catch (e) {
    console.error('Mint error:', e);
    els.btnMint.disabled = false;
    setStep(2);
    setStatus(`Mint failed: ${e.message}`, 'error');
  }
}

els.btnMint.addEventListener('click', mintNFT);

els.btnShare.addEventListener('click', async () => {
  await shareOnFarcaster();
});

// ─── Boot ─────────────────────────────────────────────────
init();
