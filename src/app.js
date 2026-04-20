// Zombie Mutant NFT — Main App
// Flow: Farcaster pfp → AI img2img zombie transform → Preview → (NFT mint)

// ─── Config ───────────────────────────────────────────────
// Pollinations.ai — totally free, no API key needed
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';

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

// ─── Generate Mutant (Pollinations.ai — free, no API key) ──
async function generateMutant(username, displayName) {
  const name = displayName || username || 'character';
  const prompt = encodeURIComponent(
    `zombie mutant portrait of ${name}, a Farcaster user, ` +
    `undead horror style, rotting flesh, exposed bones, glowing red eyes, ` +
    `dark green decaying skin, blood splatter, torn clothing, ` +
    `dark moody lighting, horror art, highly detailed, ` +
    `cartoon style, circular portrait frame, dark background, ` +
    `same composition as a profile picture avatar`
  );

  const url = `${POLLINATIONS_BASE}/${prompt}?width=512&height=512&nologo=true&seed=${Date.now()}`;

  // Pollinations returns the image directly
  // We just need to verify it loads
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error('Failed to generate image'));
    img.src = url;

    // Timeout after 30s
    setTimeout(() => reject(new Error('Generation timed out')), 30000);
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
    setStatus('Demo mode — click Generate to test the flow');

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
    setStatus('Ready — tap Generate to become a mutant 🧟');
  } else {
    setStatus('No profile picture found', 'error');
  }
}

// ─── Event Listeners ──────────────────────────────────────
els.btnGenerate.addEventListener('click', async () => {
  const username = state.context?.user?.username || '';
  const displayName = state.context?.user?.displayName || '';

  els.btnGenerate.disabled = true;
  setStep(3);
  showLoading('Summoning the undead...');
  setStatus('Generating your zombie mutant...');

  try {
    const mutantUrl = await generateMutant(username, displayName);
    state.mutantUrl = mutantUrl;

    // Show result
    hideLoading();
    els.imgMutant.src = mutantUrl;
    els.previewImages.style.display = 'flex';

    // Show action buttons
    els.btnGenerate.style.display = 'none';
    els.btnMint.style.display = 'block';
    els.btnShare.style.display = 'block';

    setStep(4);
    setStatus('Mutant created! 🧟 Mint as NFT or share it.', 'success');
  } catch (e) {
    hideLoading();
    els.previewPlaceholder.style.display = 'block';
    els.previewPlaceholder.textContent = `❌ Error: ${e.message}`;
    els.btnGenerate.disabled = false;
    setStep(2);
    setStatus(`Failed: ${e.message}`, 'error');
  }
});

els.btnMint.addEventListener('click', async () => {
  setStatus('NFT minting coming soon! 🚧');
  // TODO: Integrate Thirdweb / Crossmint for minting
});

els.btnShare.addEventListener('click', async () => {
  await shareOnFarcaster();
});

// ─── Boot ─────────────────────────────────────────────────
init();
