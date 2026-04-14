/**
 * faceid-bundle.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-contained Face ID widget — CSS + HTML + JS dalam satu file.
 *
 * CARA PAKAI:
 *   1. Embed satu tag <script> di mana saja dalam halaman:
 *
 *        <script src="faceid-bundle.js"></script>
 *
 *   2. Taruh elemen target di mana widget akan di-inject:
 *
 *        <div id="faceIdContainer"></div>
 *
 *      Atau biarkan bundle membuat container-nya sendiri jika belum ada.
 *
 *   3. (Opsional) Konfigurasi sebelum tag script:
 *
 *        <script>
 *          window.CFG = {
 *            ci3LoginUrl   : '/auth/process_login',
 *            dashboardUrl  : '/dashboard',
 *            debug         : false,
 *          };
 *        </script>
 *        <script src="faceid-bundle.js"></script>
 *
 * API publik (tersedia setelah bundle dimuat):
 *   window.initFaceId()  — mulai / restart widget
 *   window.stopFaceId()  — hentikan kamera & reset
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  "use strict";

  /* ══════════════════════════════════════════════════════════════
     1. INJECT CSS
  ══════════════════════════════════════════════════════════════ */
  const CSS = `
    #faceIdContainer {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.5rem 0 0.25rem;
      user-select: none;
      position: relative;
    }
    #fidStage {
      position: relative;
      width: 280px;
      height: 280px;
      flex-shrink: 0;
    }
    #fidCanvas {
      position: absolute;
      top: 0; left: 0;
      width: 280px; height: 280px;
      pointer-events: none;
      border-radius: 50%;
      z-index: 5;
    }
    #fidSvg {
      width: 280px; height: 280px;
      overflow: visible;
      filter: drop-shadow(0 0 8px rgba(55,138,221,0.15));
      transition: filter 0.5s ease;
      position: relative;
      z-index: 2;
      display: block;
    }
    #fidSvg.state-success { filter: drop-shadow(0 0 14px rgba(29,158,117,0.4)); }
    #fidSvg.state-error   { filter: drop-shadow(0 0 12px rgba(226,75,74,0.4)); }
    #fidStatus {
      font-size: 13px; font-weight: 500; letter-spacing: 0.3px;
      color: #888; margin-top: 0.85rem; text-align: center;
      min-height: 22px; transition: color 0.3s, opacity 0.3s;
    }
    #fidStatusIcon { display: inline-block; margin-right: 5px; font-size: 14px; }
    #fidScoreBar {
      width: 200px; height: 3px;
      background: rgba(0,0,0,.08);
      border-radius: 3px; margin-top: 10px;
      overflow: hidden; position: relative;
    }
    #fidScoreBarInner {
      height: 100%; width: 0%; border-radius: 3px;
      background: linear-gradient(90deg,#185FA5,#378ADD);
      transition: width 0.4s cubic-bezier(.22,.68,0,1.2), background 0.3s;
      position: relative;
    }
    #fidScoreBarInner::after {
      content: ''; position: absolute;
      right: 0; top: -1px; width: 4px; height: 5px;
      border-radius: 2px; background: inherit; filter: brightness(1.4);
    }
    #fidChallengeBadge {
      display: none; align-items: center; gap: 6px;
      background: rgba(55,138,221,0.08);
      border: 1px solid rgba(55,138,221,0.25);
      border-radius: 20px; padding: 4px 14px;
      margin-top: 8px; font-size: 12px; font-weight: 600;
      color: #378ADD; letter-spacing: 0.4px;
      transition: all 0.3s ease;
      animation: fid-badge-pulse 2s ease-in-out infinite;
    }
    #fidChallengeBadge.visible        { display: flex; }
    #fidChallengeBadge.challenge-warn {
      background: rgba(186,117,23,0.1);
      border-color: rgba(186,117,23,0.35); color: #BA7517;
    }
    #fidChallengeBadge.challenge-danger {
      background: rgba(226,75,74,0.1);
      border-color: rgba(226,75,74,0.35); color: #E24B4A;
    }

    @keyframes fid-badge-pulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:0.8; transform:scale(1.02); }
    }
    @keyframes fid-scan-v {
      0%   { transform:translateY(-90px); opacity:0.9; }
      100% { transform:translateY(90px);  opacity:0.25; }
    }
    @keyframes fid-pulse-ring {
      0%,100% { opacity:0.15; }
      50%      { opacity:0.5; }
    }
    @keyframes fid-pulse-ring-fast {
      0%,100% { opacity:0.2; }
      50%      { opacity:0.75; }
    }
    @keyframes fid-spin-arc {
      from { stroke-dashoffset: 0; }
      to   { stroke-dashoffset: -282; }
    }
    @keyframes fid-spin-arc-reverse {
      from { stroke-dashoffset: 0; }
      to   { stroke-dashoffset: 282; }
    }
    @keyframes fid-face-in {
      from { opacity:0; transform:scale(0.94); }
      to   { opacity:1; transform:scale(1); }
    }
    @keyframes fid-draw-check {
      from { stroke-dashoffset:46; }
      to   { stroke-dashoffset:0; }
    }
    @keyframes fid-glitch-flash {
      0%,100% { opacity:1; }
      25%      { opacity:0.3; }
      50%      { opacity:1; }
      75%      { opacity:0.5; }
    }
    @keyframes fid-dot-sparkle {
      0%,100% { opacity:0.35; }
      50%      { opacity:0.9; }
    }
    @keyframes fid-mesh-flicker {
      0%,100% { opacity:0.18; }
      50%      { opacity:0.38; }
    }
    @keyframes fid-face-breathe {
      0%,100% { transform:scale(1); }
      50%      { transform:scale(1.018); }
    }
  `;

  /* ══════════════════════════════════════════════════════════════
     2. HTML TEMPLATE
  ══════════════════════════════════════════════════════════════ */
  const HTML = `
    <div id="fidStage" style="position:relative;width:280px;height:280px;flex-shrink:0;">
      <canvas id="fidCanvas" width="280" height="280"
        style="position:absolute;top:0;left:0;width:280px;height:280px;pointer-events:none;border-radius:50%;z-index:5;"></canvas>

      <svg id="fidSvg" viewBox="-140 -140 280 280" xmlns="http://www.w3.org/2000/svg"
          style="position:relative;z-index:2;display:block;">
        <defs>
          <linearGradient id="fidScanGradV" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="#378ADD" stop-opacity="0"/>
            <stop offset="40%"  stop-color="#378ADD" stop-opacity="0.6"/>
            <stop offset="60%"  stop-color="#5BAFFF" stop-opacity="0.7"/>
            <stop offset="100%" stop-color="#378ADD" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="fidDataWipeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stop-color="#378ADD" stop-opacity="0"/>
            <stop offset="45%"  stop-color="#5BAFFF" stop-opacity="0.45"/>
            <stop offset="55%"  stop-color="#9DD8FF" stop-opacity="0.7"/>
            <stop offset="100%" stop-color="#378ADD" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="fidSuccessGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="#1D9E75" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#0ED99B" stop-opacity="0.6"/>
          </linearGradient>
          <radialGradient id="fidRingGlow" cx="50%" cy="50%" r="50%">
            <stop offset="60%"  stop-color="#378ADD" stop-opacity="0"/>
            <stop offset="100%" stop-color="#378ADD" stop-opacity="0.12"/>
          </radialGradient>
          <clipPath id="fidFaceOvalClip"><ellipse cx="0" cy="-5" rx="65" ry="79"/></clipPath>
          <clipPath id="fidFaceHClip">  <ellipse cx="0" cy="-5" rx="65" ry="79"/></clipPath>
          <filter id="fidGlowBlue" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="fidGlowGreen" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <!-- BG atmosphere -->
        <circle cx="0" cy="0" r="135" fill="url(#fidRingGlow)" opacity="0.6"/>

        <!-- Outer rings -->
        <circle id="fidOuterRing3" cx="0" cy="0" r="128" fill="none" stroke="#378ADD" stroke-width="0.4" stroke-dasharray="2 8" opacity="0.1"/>
        <circle id="fidOuterRing2" cx="0" cy="0" r="118" fill="none" stroke="#378ADD" stroke-width="0.5" stroke-dasharray="3 6" opacity="0.12"/>
        <circle id="fidOuterRing"  cx="0" cy="0" r="108" fill="none" stroke="#378ADD" stroke-width="1" opacity="0.2"/>

        <!-- Spin arcs -->
        <circle id="fidSpinArc"  cx="0" cy="0" r="108" fill="none" stroke="#378ADD" stroke-width="1.8" stroke-dasharray="55 227" opacity="0" style="transform-origin:center;"/>
        <circle id="fidSpinArc2" cx="0" cy="0" r="108" fill="none" stroke="#5BAFFF" stroke-width="1"   stroke-dasharray="25 257" opacity="0" style="transform-origin:center;"/>

        <!-- Calibration ring -->
        <circle id="fidCalibRing" cx="0" cy="0" r="108" fill="none" stroke="#378ADD" stroke-width="2.5"
          stroke-dasharray="0 678" stroke-linecap="round" opacity="0"
          style="transform-origin:center;transform:rotate(-90deg);"/>

        <!-- Corner brackets -->
        <g id="fidCorners" opacity="0">
          <polyline id="fidCornerTL" points="-96,-75 -108,-108 -75,-108" fill="none" stroke="#378ADD" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="60" stroke-dashoffset="60"/>
          <polyline id="fidCornerTR" points="96,-75 108,-108 75,-108"    fill="none" stroke="#378ADD" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="60" stroke-dashoffset="60"/>
          <polyline id="fidCornerBL" points="-96,75 -108,108 -75,108"   fill="none" stroke="#378ADD" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="60" stroke-dashoffset="60"/>
          <polyline id="fidCornerBR" points="96,75 108,108 75,108"      fill="none" stroke="#378ADD" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="60" stroke-dashoffset="60"/>
        </g>

        <!-- Mesh grid -->
        <g id="fidMeshGrid" opacity="0" clip-path="url(#fidFaceOvalClip)">
          <line x1="-65" y1="-65" x2="65" y2="-65" stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
          <line x1="-65" y1="-45" x2="65" y2="-45" stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
          <line x1="-65" y1="-25" x2="65" y2="-25" stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
          <line x1="-65" y1="-5"  x2="65" y2="-5"  stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
          <line x1="-65" y1="15"  x2="65" y2="15"  stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
          <line x1="-65" y1="35"  x2="65" y2="35"  stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
          <line x1="-65" y1="55"  x2="65" y2="55"  stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
          <line x1="-55" y1="-84" x2="-55" y2="74" stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
          <line x1="-35" y1="-84" x2="-35" y2="74" stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
          <line x1="-15" y1="-84" x2="-15" y2="74" stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
          <line x1="5"   y1="-84" x2="5"   y2="74" stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
          <line x1="25"  y1="-84" x2="25"  y2="74" stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
          <line x1="45"  y1="-84" x2="45"  y2="74" stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
          <line x1="65"  y1="-84" x2="65"  y2="74" stroke="#378ADD" stroke-width="0.3" opacity="0.3"/>
        </g>

        <!-- Static face contour -->
        <g id="fidFaceGroup" opacity="0" style="transform-origin:0 -5px;">
          <ellipse cx="0" cy="-5" rx="62" ry="76" fill="none" stroke="#378ADD" stroke-width="1.4" opacity="0.7" filter="url(#fidGlowBlue)"/>
          <path d="M-30,-47 Q0,-62 30,-47" fill="none" stroke="#378ADD" stroke-width="0.9" opacity="0.5"/>
          <path d="M-36,-30 Q-28,-34 -18,-30" fill="none" stroke="#378ADD" stroke-width="1.8" stroke-linecap="round" opacity="0.75"/>
          <path d="M18,-30 Q28,-34 36,-30"    fill="none" stroke="#378ADD" stroke-width="1.8" stroke-linecap="round" opacity="0.75"/>
          <ellipse cx="-25" cy="-18" rx="10" ry="6.5" fill="rgba(55,138,221,0.04)" stroke="#378ADD" stroke-width="1" opacity="0.55"/>
          <ellipse cx="25"  cy="-18" rx="10" ry="6.5" fill="rgba(55,138,221,0.04)" stroke="#378ADD" stroke-width="1" opacity="0.55"/>
          <circle cx="-25" cy="-18" r="4.5" fill="none" stroke="#5BAFFF" stroke-width="0.8" opacity="0.7"/>
          <circle cx="25"  cy="-18" r="4.5" fill="none" stroke="#5BAFFF" stroke-width="0.8" opacity="0.7"/>
          <circle cx="-25" cy="-18" r="2.5" fill="#378ADD" opacity="0.9"/>
          <circle cx="25"  cy="-18" r="2.5" fill="#378ADD" opacity="0.9"/>
          <circle cx="-25" cy="-18" r="1"   fill="#185FA5" opacity="0.95"/>
          <circle cx="25"  cy="-18" r="1"   fill="#185FA5" opacity="0.95"/>
          <circle cx="-23" cy="-20" r="1"   fill="white" opacity="0.6"/>
          <circle cx="27"  cy="-20" r="1"   fill="white" opacity="0.6"/>
          <line x1="0" y1="-15" x2="0" y2="-1" stroke="#378ADD" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
          <path d="M-8,1 Q-4,6 0,5 Q4,6 8,1" fill="none" stroke="#378ADD" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
          <path d="M-8,1 Q-10,-1 -8,-3" fill="none" stroke="#378ADD" stroke-width="0.9" stroke-linecap="round" opacity="0.45"/>
          <path d="M8,1 Q10,-1 8,-3"    fill="none" stroke="#378ADD" stroke-width="0.9" stroke-linecap="round" opacity="0.45"/>
          <path d="M-18,20 Q0,36 18,20" fill="none" stroke="#378ADD" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>
          <path d="M-10,22 Q0,27 10,22" fill="none" stroke="#378ADD" stroke-width="0.8" stroke-linecap="round" opacity="0.45"/>
          <line x1="-62" y1="-15" x2="-46" y2="-15" stroke="#378ADD" stroke-width="0.9" stroke-linecap="round" opacity="0.4"/>
          <line x1="62"  y1="-15" x2="46"  y2="-15" stroke="#378ADD" stroke-width="0.9" stroke-linecap="round" opacity="0.4"/>
          <path d="M-62,-20 Q-70,-12 -70,0 Q-70,12 -62,18" fill="none" stroke="#378ADD" stroke-width="0.8" opacity="0.3"/>
          <path d="M62,-20 Q70,-12 70,0 Q70,12 62,18"      fill="none" stroke="#378ADD" stroke-width="0.8" opacity="0.3"/>
          <path d="M-55,-42 Q-68,-8 -64,28" fill="none" stroke="#378ADD" stroke-width="0.7" opacity="0.22"/>
          <path d="M55,-42 Q68,-8 64,28"    fill="none" stroke="#378ADD" stroke-width="0.7" opacity="0.22"/>
          <path d="M-6,13 L0,18 L6,13" fill="none" stroke="#378ADD" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
          <path d="M-18,50 Q0,65 18,50" fill="none" stroke="#378ADD" stroke-width="0.8" stroke-linecap="round" opacity="0.35"/>
        </g>

        <!-- Landmark dots -->
        <g id="fidDotsGroup" opacity="0">
          <circle cx="-50" cy="-70" r="2.2" fill="#378ADD" opacity="0.55"/>
          <circle cx="0"   cy="-80" r="2"   fill="#378ADD" opacity="0.5"/>
          <circle cx="50"  cy="-70" r="2.2" fill="#378ADD" opacity="0.55"/>
          <circle cx="-64" cy="-12" r="2"   fill="#378ADD" opacity="0.4"/>
          <circle cx="64"  cy="-12" r="2"   fill="#378ADD" opacity="0.4"/>
          <circle cx="-58" cy="25"  r="1.8" fill="#378ADD" opacity="0.38"/>
          <circle cx="58"  cy="25"  r="1.8" fill="#378ADD" opacity="0.38"/>
          <circle cx="-28" cy="66"  r="2"   fill="#378ADD" opacity="0.45"/>
          <circle cx="0"   cy="76"  r="1.8" fill="#378ADD" opacity="0.4"/>
          <circle cx="28"  cy="66"  r="2"   fill="#378ADD" opacity="0.45"/>
          <circle cx="-37" cy="-18" r="1.5" fill="#5BAFFF" opacity="0.65"/>
          <circle cx="-13" cy="-18" r="1.5" fill="#5BAFFF" opacity="0.65"/>
          <circle cx="13"  cy="-18" r="1.5" fill="#5BAFFF" opacity="0.65"/>
          <circle cx="37"  cy="-18" r="1.5" fill="#5BAFFF" opacity="0.65"/>
          <circle cx="0"   cy="-18" r="1.5" fill="#378ADD" opacity="0.4"/>
          <circle cx="-18" cy="20"  r="1.8" fill="#5BAFFF" opacity="0.6"/>
          <circle cx="18"  cy="20"  r="1.8" fill="#5BAFFF" opacity="0.6"/>
          <circle cx="-27" cy="-32" r="1.5" fill="#378ADD" opacity="0.5"/>
          <circle cx="27"  cy="-32" r="1.5" fill="#378ADD" opacity="0.5"/>
        </g>

        <!-- Scan bar -->
        <rect id="fidScanBar"  x="-65" y="-90" width="130" height="28" fill="url(#fidScanGradV)" opacity="0" clip-path="url(#fidFaceOvalClip)"/>
        <line id="fidScanEdge" x1="-62" y1="-90" x2="62" y2="-90" stroke="#9DD8FF" stroke-width="0.8" opacity="0" clip-path="url(#fidFaceOvalClip)"/>

        <!-- Data wipe -->
        <rect id="fidDataWipe" x="-80" y="-84" width="24" height="158" fill="url(#fidDataWipeGrad)" opacity="0" clip-path="url(#fidFaceHClip)"/>

        <!-- Orbit dots (SVG fallback, replaced by canvas) -->
        <g id="fidOrbitGroup" opacity="0" style="transform-origin:center;"/>

        <!-- Success mark -->
        <g id="fidSuccessMark" opacity="0">
          <circle cx="0" cy="0" r="32" fill="rgba(29,158,117,0.08)" stroke="url(#fidSuccessGrad)" stroke-width="2" opacity="0.9"/>
          <polyline id="fidCheckPoly" points="-14,0 -4,12 16,-14" fill="none" stroke="#1D9E75" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="46" stroke-dashoffset="46"
            filter="url(#fidGlowGreen)"/>
          <text x="0" y="52" text-anchor="middle" font-family="system-ui,sans-serif"
            font-size="8" font-weight="600" letter-spacing="2" fill="#1D9E75" opacity="0">VERIFIED</text>
        </g>

        <!-- Reject flash -->
        <g id="fidRejectFlash" opacity="0" pointer-events="none">
          <ellipse cx="0" cy="-5" rx="62" ry="76" fill="none" stroke="#E24B4A" stroke-width="2" stroke-dasharray="8 4"/>
        </g>
      </svg>
    </div><!-- /#fidStage -->

    <p id="fidStatus">
      <span id="fidStatusIcon"></span>
      <span id="fidStatusText">Memuat…</span>
    </p>
    <div id="fidScoreBar"><div id="fidScoreBarInner"></div></div>
    <div id="fidChallengeBadge">
      <span id="fidChallengeIcon">👁</span>
      <span id="fidChallengeText">Kedipkan mata sekali</span>
    </div>
  `;

  /* ══════════════════════════════════════════════════════════════
     3. MOUNT: inject CSS + HTML ke DOM
  ══════════════════════════════════════════════════════════════ */
  function mount() {
    // Inject CSS sekali
    if (!document.getElementById("fid-bundle-style")) {
      const style = document.createElement("style");
      style.id = "fid-bundle-style";
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    // Cari atau buat #faceIdContainer
    let container = document.getElementById("faceIdContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "faceIdContainer";
      document.body.appendChild(container);
    }

    // Hindari inject ulang jika sudah ada fidStage
    if (!document.getElementById("fidStage")) {
      container.insertAdjacentHTML("beforeend", HTML);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     4. LOAD EXTERNAL DEPS (MediaPipe + Camera Utils)
  ══════════════════════════════════════════════════════════════ */
  const MP_VERSION  = "0.4.1633559619";
  const MP_CDN_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${MP_VERSION}`;
  const CAM_UTILS   = `https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js`;
  const FACE_MESH   = `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${MP_VERSION}/face_mesh.js`;
  const FACEAPI_CDN = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
  const FACEAPI_MODELS = (window.CFG && window.CFG.faceApiModels) || "assets/vendor/libs/faceapi/weights";

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src; s.crossOrigin = "anonymous";
      s.onload = resolve; s.onerror = () => reject(new Error("Gagal load: " + src));
      document.head.appendChild(s);
    });
  }

  async function loadDeps() {
    await loadScript(CAM_UTILS);
    await loadScript(FACE_MESH);
  }

  /* ══════════════════════════════════════════════════════════════
     5. CORE LOGIC  (sama persis dengan auth-faceid.js yang sudah
        dioptimasi, hanya ID SVG yang di-prefix "fid" agar aman)
  ══════════════════════════════════════════════════════════════ */
  const C = Object.assign({
    ci3LoginUrl        : "/auth/process_login",
    brightnessBoost    : true,
    debug              : false,
    zDepthMinStd       : 0.020,
    earVarMin          : 0.0006,
    earVarFrames       : 40,
    exprDeltaMin       : 0.015,
    exprDeltaFrames    : 20,
    challengeTimeoutMs : 15000,
    livenessScoreMin   : 0.55,
  }, window.CFG || {});

  const R_EYE    = [33,  159, 158, 133, 153, 145];
  const L_EYE    = [362, 380, 374, 263, 386, 385];
  const DEPTH_PTS = [1, 234, 454, 152, 10, 4, 263, 33, 287, 57];
  const CHALLENGE = { BLINK: "blink", SMILE: "smile", MOUTH_OPEN: "mouth_open" };

  const FACE_OVAL = [
    10,338,338,297,297,332,332,284,284,251,251,389,389,356,356,454,
    454,323,323,361,361,288,288,397,397,365,365,379,379,378,378,400,
    400,377,377,152,152,148,148,176,176,149,149,150,150,136,136,172,
    172,58,58,132,132,93,93,234,234,127,127,162,162,21,21,54,
    54,103,103,67,67,109,109,10
  ];
  const LEFT_EYE_CONN = [
    263,249,249,390,390,373,373,374,374,380,380,381,381,382,382,362,
    263,466,466,388,388,387,387,386,386,385,385,384,384,398,398,362
  ];
  const RIGHT_EYE_CONN = [
    33,7,7,163,163,144,144,145,145,153,153,154,154,155,155,133,
    33,246,246,161,161,160,160,159,159,158,158,157,157,173,173,133
  ];
  const LEFT_EYEBROW  = [276,283,283,282,282,295,295,285,300,293,293,334,334,296,296,336];
  const RIGHT_EYEBROW = [46,53,53,52,52,65,65,55,70,63,63,105,105,66,66,107];
  const NOSE_CONN     = [168,6,6,197,197,195,195,5,5,4,4,1,1,19,19,94,94,2,98,97,97,2,2,326,326,327,327,294,98,240,240,99,99,60,294,455,455,439,439,290];
  const LIPS_CONN     = [61,146,146,91,91,181,181,84,84,17,17,314,314,405,405,321,321,375,375,291,61,185,185,40,40,39,39,37,37,0,0,267,267,269,269,270,270,409,409,291,78,95,95,88,88,178,178,87,87,14,14,317,317,402,402,318,318,324,324,308,78,191,191,80,80,81,81,82,82,13,13,312,312,311,311,310,310,415,415,308];
  const IRISES        = [474,475,475,476,476,477,477,474,469,470,470,471,471,472,472,469];

  const ORBIT_DOTS = [
    { offset: 0,              size: 3,   color: "#378ADD", colorFade: "rgba(55,138,221,0)",  alpha: 0.75 },
    { offset: Math.PI * 0.67, size: 2.2, color: "#5BAFFF", colorFade: "rgba(91,175,255,0)",  alpha: 0.65 },
    { offset: Math.PI * 1.33, size: 1.8, color: "#9DD8FF", colorFade: "rgba(157,216,255,0)", alpha: 0.55 },
  ];

  let mpInitialized = false, faceApiLoaded = false;
  let submitting = false, liveOk = false, lastSnapshot = null;
  let videoEl, faceMesh, mpCamera, rafId;
  let capCanvas, capCtx;
  let earHistory = [], earBaseline = null, earSamples = [];
  let blinkCount = 0, earConsec = 0, earWasClosed = false;
  let zDepthHistory = [], exprHistory = [], exprDeltaPass = false, challengeExprDone = false;
  let currentChallenge = null, challengeTimer = null;
  let livenessScore = 0, frameCount = 0;
  let fidCanvas = null, fidCtx = null;
  let lastLandmarks = null, canvasAnimId = null;
  let scanLineY = 45, scanDir = 1, dataWipeX = -70;
  let glowPhase = 0, dotPhase = 0;
  let renderState = "idle";
  let lastEar = 0.25;
  let faceVisible = false, calibDone = false;
  let successAnimPhase = 0, successAnimId = null;
  let isSending = false, warmingUp = true;

  // DOM cache
  const _dom = {};
  const gid = id => document.getElementById(id);
  const dom = id => _dom[id] !== undefined ? _dom[id] : (_dom[id] = gid(id));

  // Selectors — prefix fid untuk SVG elements
  const statusTextEl   = () => dom("fidStatusText");
  const statusIconEl   = () => dom("fidStatusIcon");
  const statusEl       = () => dom("fidStatus");
  const errBox         = () => dom("formErrors");
  const greetEl        = () => dom("greeting");
  const svgFaceGroup   = () => dom("fidFaceGroup");
  const svgDotsGroup   = () => dom("fidDotsGroup");
  const svgSuccessMark = () => dom("fidSuccessMark");
  const svgCheckPoly   = () => dom("fidCheckPoly");
  const svgSpinArc     = () => dom("fidSpinArc");
  const svgSpinArc2    = () => dom("fidSpinArc2");
  const svgCalibRing   = () => dom("fidCalibRing");
  const svgCorners     = () => dom("fidCorners");
  const svgOuterRing   = () => dom("fidOuterRing");
  const svgMeshGrid    = () => dom("fidMeshGrid");
  const svgDataWipe    = () => dom("fidDataWipe");
  const svgOrbitGroup  = () => dom("fidOrbitGroup");
  const svgRejectFlash = () => dom("fidRejectFlash");
  const svgScanBar     = () => dom("fidScanBar");
  const svgSuccessText = () => { const sm = svgSuccessMark(); return sm ? sm.querySelector("text") : null; };
  const scoreBarInner  = () => dom("fidScoreBarInner");
  const challengeBadge = () => dom("fidChallengeBadge");
  const challengeIcon  = () => dom("fidChallengeIcon");
  const challengeText  = () => dom("fidChallengeText");
  const fidSvgEl       = () => dom("fidSvg");

  const svgShow = (el, opacity = 1, ms = 300) => {
    if (!el) return;
    el.style.transition = `opacity ${ms}ms ease`;
    el.style.opacity = String(opacity);
  };
  const svgHide = (el, ms = 200) => svgShow(el, 0, ms);

  /* ── Canvas init ──────────────────────────────── */
  function initCanvas() {
    fidCanvas = gid("fidCanvas");
    if (!fidCanvas) return;
    fidCtx = fidCanvas.getContext("2d");
    fidCanvas.width = 280;
    fidCanvas.height = 280;
  }

  /* ── Shared point buffer (zero-alloc hot path) ── */
  const _pt = { x: 0, y: 0, z: 0 };
  function lmToCanvas(lm) {
    _pt.x = 140 + (lm.x - 0.5) * -320;
    _pt.y = 140 + (lm.y - 0.5) *  320;
    _pt.z = lm.z;
    return _pt;
  }

  /* ── Draw helpers ────────────────────────────── */
  function drawConnections(lms, conns, color, lw, alpha = 1) {
    if (!fidCtx || !lms) return;
    const len = lms.length;
    fidCtx.globalAlpha = alpha;
    fidCtx.strokeStyle = color;
    fidCtx.lineWidth   = lw;
    fidCtx.lineCap = fidCtx.lineJoin = "round";
    fidCtx.beginPath();
    for (let i = 0; i < conns.length - 1; i += 2) {
      const ia = conns[i], ib = conns[i + 1];
      if (ia >= len || ib >= len) continue;
      const pa = lmToCanvas(lms[ia]);
      const ax = pa.x, ay = pa.y;
      const pb = lmToCanvas(lms[ib]);
      fidCtx.moveTo(ax, ay);
      fidCtx.lineTo(pb.x, pb.y);
    }
    fidCtx.stroke();
  }

  function drawDots(lms, indices, color, radius, alpha = 1) {
    if (!fidCtx || !lms) return;
    const len = lms.length;
    fidCtx.globalAlpha = alpha;
    fidCtx.fillStyle   = color;
    fidCtx.beginPath();
    indices.forEach(i => {
      if (i >= len) return;
      const p = lmToCanvas(lms[i]);
      const px = p.x, py = p.y;
      fidCtx.moveTo(px + radius, py);
      fidCtx.arc(px, py, radius, 0, Math.PI * 2);
    });
    fidCtx.fill();
  }

  function drawScanLine(y, alpha) {
    if (!fidCtx) return;
    fidCtx.save();
    const g = fidCtx.createLinearGradient(0, y - 20, 0, y + 20);
    g.addColorStop(0,   "rgba(55,138,221,0)");
    g.addColorStop(0.4, "rgba(55,138,221,0.5)");
    g.addColorStop(0.5, "rgba(91,175,255,0.75)");
    g.addColorStop(0.6, "rgba(55,138,221,0.5)");
    g.addColorStop(1,   "rgba(55,138,221,0)");
    fidCtx.globalAlpha = alpha;
    fidCtx.fillStyle = g;
    fidCtx.fillRect(30, y - 20, 220, 40);
    fidCtx.globalAlpha = alpha * 0.85;
    fidCtx.strokeStyle = "#9DD8FF";
    fidCtx.lineWidth = 1;
    fidCtx.shadowColor = "#5BAFFF";
    fidCtx.shadowBlur = 6;
    fidCtx.beginPath();
    fidCtx.moveTo(40, y); fidCtx.lineTo(240, y);
    fidCtx.stroke();
    fidCtx.restore();
  }

  function drawDataWipe(x, alpha) {
    if (!fidCtx) return;
    fidCtx.save();
    const g = fidCtx.createLinearGradient(x, 0, x + 30, 0);
    g.addColorStop(0,   "rgba(55,138,221,0)");
    g.addColorStop(0.4, "rgba(55,138,221,0.35)");
    g.addColorStop(0.6, "rgba(157,216,255,0.55)");
    g.addColorStop(1,   "rgba(55,138,221,0)");
    fidCtx.globalAlpha = alpha;
    fidCtx.fillStyle = g;
    fidCtx.fillRect(x, 50, 30, 180);
    fidCtx.restore();
  }

  function drawEyeGlow(lms, _ear, phase) {
    if (!fidCtx || !lms) return;
    const p468 = lmToCanvas(lms[468]); const ex1 = p468.x, ey1 = p468.y;
    const p473 = lmToCanvas(lms[473]); const ex2 = p473.x, ey2 = p473.y;
    const glowR = 14 + Math.sin(phase) * 2.5;
    const alpha = 0.22 + Math.sin(phase * 2) * 0.08;
    fidCtx.save();
    [[ex1,ey1],[ex2,ey2]].forEach(([px,py]) => {
      const g = fidCtx.createRadialGradient(px, py, 1.5, px, py, glowR);
      g.addColorStop(0,    `rgba(91,175,255,${(alpha*1.5).toFixed(2)})`);
      g.addColorStop(0.45, `rgba(55,138,221,${alpha.toFixed(2)})`);
      g.addColorStop(1,    "rgba(55,138,221,0)");
      fidCtx.fillStyle = g;
      fidCtx.globalAlpha = 1;
      fidCtx.beginPath();
      fidCtx.arc(px, py, glowR, 0, Math.PI * 2);
      fidCtx.fill();
    });
    fidCtx.restore();
  }

  function drawOrbitDots(phase) {
    if (!fidCtx) return;
    const cx = 140, cy = 140, r = 122;
    fidCtx.save();
    ORBIT_DOTS.forEach(d => {
      const angle = phase + d.offset;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const gr = d.size * 3.5;
      const grd = fidCtx.createRadialGradient(x, y, 0, x, y, gr);
      grd.addColorStop(0,   d.color + "BB");
      grd.addColorStop(0.6, d.color + "44");
      grd.addColorStop(1,   d.colorFade);
      fidCtx.globalAlpha = d.alpha;
      fidCtx.fillStyle = grd;
      fidCtx.beginPath(); fidCtx.arc(x, y, gr, 0, Math.PI * 2); fidCtx.fill();
      fidCtx.globalAlpha = Math.min(1, d.alpha * 1.3);
      fidCtx.fillStyle = d.color;
      fidCtx.beginPath(); fidCtx.arc(x, y, d.size, 0, Math.PI * 2); fidCtx.fill();
    });
    fidCtx.restore();
  }

  function drawSuccessOverlay(phase) {
    if (!fidCtx) return;
    const cx = 140, cy = 140;
    fidCtx.save();
    [1,2].forEach((_,i) => {
      const rr = 35 + (phase * 60) * (i + 1) * 0.5;
      const al = Math.max(0, 0.6 - phase * (i + 1) * 0.5);
      fidCtx.globalAlpha = al;
      fidCtx.strokeStyle = "#1D9E75";
      fidCtx.lineWidth = 1.5;
      fidCtx.beginPath(); fidCtx.arc(cx, cy, rr, 0, Math.PI * 2); fidCtx.stroke();
    });
    fidCtx.restore();
  }

  /* ── Main render loop ────────────────────────── */
  function renderCanvas() {
    if (!fidCtx || !fidCanvas) return;
    fidCtx.clearRect(0, 0, 280, 280);
    glowPhase += 0.06;
    dotPhase  += 0.028;

    const lms = lastLandmarks;
    const hasFace = lms && lms.length >= 468;

    if (renderState !== "idle") {
      fidCtx.save(); drawOrbitDots(dotPhase * 0.6); fidCtx.restore();
    }

    if (hasFace) {
      const fa = renderState === "success" ? 0.25 : 0.9;
      fidCtx.save();
      drawConnections(lms, FACE_OVAL,      "#378ADD", 1.2, fa * 0.65);
      drawConnections(lms, LEFT_EYE_CONN,  "#5BAFFF", 0.9, fa * 0.85);
      drawConnections(lms, RIGHT_EYE_CONN, "#5BAFFF", 0.9, fa * 0.85);
      drawConnections(lms, IRISES,         "#9DD8FF", 1.0, fa * 0.95);
      drawConnections(lms, LEFT_EYEBROW,   "#378ADD", 1.4, fa * 0.7);
      drawConnections(lms, RIGHT_EYEBROW,  "#378ADD", 1.4, fa * 0.7);
      drawConnections(lms, NOSE_CONN,      "#378ADD", 0.9, fa * 0.55);
      drawConnections(lms, LIPS_CONN,      "#5BAFFF", 1.0, fa * 0.75);
      fidCtx.restore();
      fidCtx.save();
      drawDots(lms, [1,4,152,234,454,10,263,33,61,291,468,473], "#9DD8FF", 2.2, fa * 0.8);
      fidCtx.restore();
      drawEyeGlow(lms, lastEar, glowPhase);
    }

    if (renderState === "scanning" || renderState === "challenge") {
      scanLineY += scanDir * 2.8;
      if (scanLineY > 235) { scanLineY = 235; scanDir = -1; }
      if (scanLineY <  45) { scanLineY =  45; scanDir =  1; }
      drawScanLine(scanLineY, hasFace ? 0.75 : 0.3);
    }

    if (renderState === "calibrating") {
      dataWipeX += 2.2;
      if (dataWipeX > 270) dataWipeX = -50;
      drawDataWipe(dataWipeX, 0.6);
    }

    canvasAnimId = requestAnimationFrame(renderCanvas);
  }

  function startCanvasLoop() { if (!canvasAnimId) renderCanvas(); }
  function stopCanvasLoop() {
    if (canvasAnimId) { cancelAnimationFrame(canvasAnimId); canvasAnimId = null; }
    if (fidCtx && fidCanvas) fidCtx.clearRect(0, 0, 280, 280);
    lastLandmarks = null;
  }

  /* ── SVG animation helpers ───────────────────── */
  function startSpinArc() {
    const el  = svgSpinArc();
    const el2 = svgSpinArc2();
    if (el)  { el.style.animation  = "fid-spin-arc 1.5s linear infinite"; el.style.transformOrigin = "center"; svgShow(el, 0.75); }
    if (el2) { el2.style.animation = "fid-spin-arc-reverse 2.2s linear infinite"; el2.style.transformOrigin = "center"; svgShow(el2, 0.5, 400); }
  }
  function stopSpinArc() {
    [svgSpinArc(), svgSpinArc2()].forEach(el => { if (!el) return; el.style.animation = "none"; svgHide(el); });
  }
  function pulseOuterRing(active = true, fast = false) {
    const el = svgOuterRing();
    if (!el) return;
    el.style.animation = active
      ? (fast ? "fid-pulse-ring-fast 0.7s ease-in-out infinite" : "fid-pulse-ring 2s ease-in-out infinite")
      : "none";
    if (!active) el.style.opacity = "0.2";
  }
  function updateCalibRing(pct) {
    const el = svgCalibRing(); if (!el) return;
    svgShow(el, 1, 200);
    const c = 2 * Math.PI * 108;
    const filled = c * (pct / 100);
    el.setAttribute("stroke-dasharray", `${filled.toFixed(1)} ${(c - filled).toFixed(1)}`);
  }
  function hideCalibRing() { svgHide(svgCalibRing(), 300); }

  function showCorners(color = "#378ADD") {
    const el = svgCorners(); if (!el) return;
    svgShow(el, 1, 200);
    el.querySelectorAll("polyline").forEach((p, i) => {
      p.setAttribute("stroke", color);
      p.style.transition = "none";
      p.style.strokeDashoffset = "60";
      setTimeout(() => {
        p.style.transition = "stroke-dashoffset 0.4s cubic-bezier(.22,.68,0,1.1)";
        p.style.strokeDashoffset = "0";
      }, i * 60);
    });
  }
  function setCornerColor(color) {
    const el = svgCorners(); if (!el) return;
    el.querySelectorAll("polyline").forEach(p => p.setAttribute("stroke", color));
  }
  function showMeshGrid() {
    const el = svgMeshGrid(); if (!el) return;
    el.style.animation = "fid-mesh-flicker 3s ease-in-out infinite";
    svgShow(el, 1, 600);
  }
  function hideMeshGrid() {
    const el = svgMeshGrid(); if (!el) return;
    el.style.animation = "none"; svgHide(el, 300);
  }
  function showLandmarkDots(opacity = 0.7) {
    const el = svgDotsGroup(); if (!el) return;
    const dots = el.querySelectorAll("circle");
    svgShow(el, 1, 0);
    dots.forEach((d, i) => {
      d.style.opacity = "0"; d.style.transition = "none";
      setTimeout(() => {
        d.style.transition = `opacity 0.3s ease ${i * 20}ms`;
        d.style.opacity = String(parseFloat(d.getAttribute("opacity") || 0.5) * opacity);
      }, 50 + i * 25);
      const delay = (i * 137.5) % 2000;
      d.style.animation = `fid-dot-sparkle ${1.5 + (i % 3) * 0.5}s ease-in-out ${delay}ms infinite`;
    });
  }
  function hideLandmarkDots() {
    const el = svgDotsGroup(); if (!el) return;
    el.querySelectorAll("circle").forEach(d => { d.style.animation = "none"; });
    svgHide(el, 300);
  }
  function hideStaticFaceContour() {
    const el = svgFaceGroup(); if (!el) return;
    el.style.animation = "none"; svgHide(el, 500);
  }

  /* ── Success / reject animations ────────────── */
  function showSuccessAnimation(cb) {
    renderState = "success";
    stopSpinArc(); hideMeshGrid();
    const ring = svgOuterRing();
    if (ring) { ring.style.stroke = "#1D9E75"; ring.style.animation = "none"; ring.style.opacity = "0.7"; }
    setCornerColor("#1D9E75");
    hideStaticFaceContour(); hideLandmarkDots();
    const sm = svgSuccessMark();
    if (sm) {
      svgShow(sm, 1, 400);
      setTimeout(() => {
        const cp = svgCheckPoly();
        if (cp) cp.style.animation = "fid-draw-check 0.6s cubic-bezier(.22,.68,0,1.2) forwards";
        const txt = svgSuccessText();
        if (txt) { txt.style.transition = "opacity 0.4s ease"; txt.style.opacity = "1"; }
      }, 350);
    }
    successAnimPhase = 0;
    const animRipple = () => {
      successAnimPhase = Math.min(successAnimPhase + 0.015, 1);
      if (fidCtx && fidCanvas) {
        fidCtx.clearRect(0, 0, 280, 280);
        drawSuccessOverlay(successAnimPhase);
        if (lastLandmarks) drawConnections(lastLandmarks, FACE_OVAL, "#1D9E75", 1.2, 0.3);
      }
      if (successAnimPhase < 1) successAnimId = requestAnimationFrame(animRipple);
    };
    animRipple();
    const svgEl = fidSvgEl();
    if (svgEl) svgEl.classList.add("state-success");
    setTimeout(() => cb && cb(), 900);
  }

  function showRejectFlash(duration = 600) {
    const el = svgRejectFlash(), svg = fidSvgEl();
    if (el) {
      el.style.animation = `fid-glitch-flash ${duration}ms ease`;
      svgShow(el, 1, 0);
      setTimeout(() => { el.style.animation = "none"; svgHide(el, 200); }, duration);
    }
    if (svg) {
      svg.classList.add("state-error");
      setTimeout(() => svg.classList.remove("state-error"), duration + 300);
    }
  }

  function resetSvgState() {
    renderState = "idle";
    Object.keys(_dom).forEach(k => delete _dom[k]);
    [svgFaceGroup(), svgScanBar(), svgDotsGroup(), svgSuccessMark(),
     svgCorners(), svgMeshGrid(), svgDataWipe(), svgOrbitGroup(),
     svgRejectFlash(), svgCalibRing(), svgSpinArc(), svgSpinArc2()
    ].forEach(el => {
      if (!el) return;
      el.style.transition = el.style.animation = "none";
      el.style.opacity = "0";
    });
    const cp = svgCheckPoly(); if (cp) { cp.style.animation = "none"; cp.style.strokeDashoffset = "46"; }
    const ring = svgOuterRing(); if (ring) { ring.style.animation = "none"; ring.style.opacity = "0.2"; ring.style.stroke = "#378ADD"; }
    const svg = fidSvgEl(); if (svg) svg.classList.remove("state-success","state-error");
    hideChallengeUi();
    if (successAnimId) { cancelAnimationFrame(successAnimId); successAnimId = null; }
    setTimeout(() => {
      const c = gid("fidCorners");
      if (c) c.querySelectorAll("polyline").forEach(p => {
        p.style.transition = "none"; p.style.strokeDashoffset = "60"; p.setAttribute("stroke","#378ADD");
      });
    }, 0);
  }

  /* ── UI helpers ──────────────────────────────── */
  function showChallengeUi(text, icon, cls = "") {
    const badge = challengeBadge(), ctxt = challengeText(), cicon = challengeIcon();
    if (!badge) return;
    if (ctxt)  ctxt.textContent  = text;
    if (cicon) cicon.textContent = icon;
    badge.className = "visible " + cls;
  }
  function hideChallengeUi() { const b = challengeBadge(); if (b) b.className = ""; }

  const setStatus = (html, color = "#6c757d", icon = "") => {
    const txtEl = statusTextEl(), iconEl = statusIconEl(), mainEl = statusEl();
    if (txtEl)  { txtEl.innerHTML = html; txtEl.style.color = color; }
    else if (mainEl) { mainEl.innerHTML = html; mainEl.style.color = color; }
    if (iconEl) iconEl.textContent = icon;
    if (mainEl) mainEl.style.color = color;
  };
  const showErr = msg => {
    const el = errBox(); if (!el) return;
    el.innerHTML = `<div class="alert alert-danger py-2 mb-2">${msg}</div>`;
    el.style.display = "block";
  };
  const clearErr = () => { const el = errBox(); if (el) { el.innerHTML = ""; el.style.display = "none"; } };
  const setGreeting = html => { const el = greetEl(); if (el) el.innerHTML = html; };

  function updateScoreBar(score) {
    const el = scoreBarInner(); if (!el) return;
    const pct = Math.min(100, Math.round(score * 100));
    el.style.width = pct + "%";
    el.style.background =
      pct >= 55 ? "linear-gradient(90deg,#0F7A5A,#1D9E75)" :
      pct >= 30 ? "linear-gradient(90deg,#8A5A00,#BA7517)" :
                  "linear-gradient(90deg,#A52020,#E24B4A)";
  }

  /* ── Face-api.js ─────────────────────────────── */
  function loadFaceApiScript() {
    return new Promise((resolve, reject) => {
      if (typeof faceapi !== "undefined") { resolve(); return; }
      const s = document.createElement("script");
      s.src = FACEAPI_CDN; s.crossOrigin = "anonymous";
      s.onload = resolve; s.onerror = () => reject(new Error("Gagal load face-api.js"));
      document.head.appendChild(s);
    });
  }
  async function initFaceApi() {
    if (faceApiLoaded) return;
    await loadFaceApiScript();
    await faceapi.nets.tinyFaceDetector.loadFromUri(FACEAPI_MODELS);
    await faceapi.nets.faceExpressionNet.loadFromUri(FACEAPI_MODELS);
    faceApiLoaded = true;
    if (C.debug) console.info("[FACEAPI] models loaded");
  }

  /* ── Challenge logic ─────────────────────────── */
  function pickChallenge() {
    const all = [CHALLENGE.BLINK, CHALLENGE.SMILE, CHALLENGE.MOUTH_OPEN];
    return all[Math.floor(Math.random() * all.length)];
  }
  function startChallenge() {
    blinkCount = 0; earConsec = 0; earWasClosed = false; challengeExprDone = false;
    currentChallenge = pickChallenge();
    renderState = "challenge";
    clearTimeout(challengeTimer);
    challengeTimer = setTimeout(() => {
      if (!liveOk) {
        setStatus("Waktu habis! Tantangan diulang…", "#dc3545", "⏱");
        showChallengeUi("Waktu habis, ulangi lagi", "⏱", "challenge-danger");
        setTimeout(() => { if (!liveOk) startChallenge(); }, 1500);
      }
    }, C.challengeTimeoutMs);
    const map = {
      [CHALLENGE.BLINK]:      { text:"Kedipkan mata sekali",  icon:"👁",  color:"#0d6efd" },
      [CHALLENGE.SMILE]:      { text:"Tersenyumlah sebentar", icon:"😊", color:"#0d6efd" },
      [CHALLENGE.MOUTH_OPEN]: { text:"Buka mulut sebentar",   icon:"😮", color:"#0d6efd" },
    };
    const m = map[currentChallenge] || { text:"Ikuti instruksi", icon:"ℹ️", color:"#0d6efd" };
    setStatus(m.text, m.color, m.icon);
    showChallengeUi(m.text, m.icon);
    pulseOuterRing(true, true);
    if (C.debug) console.info("[CHALLENGE]", currentChallenge);
  }

  /* ── Liveness checks ─────────────────────────── */
  const dist2D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function calcEAR(lms, idx) {
    const [p0,p1,p2,p3,p4,p5] = idx.map(i => lms[i]);
    return (dist2D(p1,p5) + dist2D(p2,p4)) / (2 * dist2D(p0,p3) + 1e-6);
  }
  const earThresh = () => earBaseline ? earBaseline * 0.78 : 0.20;

  function checkZDepth(lms) {
    const z = DEPTH_PTS.map(i => lms[i].z);
    const mean = z.reduce((a,b) => a+b,0) / z.length;
    const std  = Math.sqrt(z.reduce((a,b) => a+(b-mean)**2,0) / z.length);
    zDepthHistory.push(std);
    if (zDepthHistory.length > 30) zDepthHistory.shift();
    const avg = zDepthHistory.reduce((a,b) => a+b,0) / zDepthHistory.length;
    return { pass: avg >= C.zDepthMinStd, value: avg };
  }
  function checkEarVariance() {
    if (earHistory.length < C.earVarFrames) return { pass: true, value: null };
    const mean = earHistory.reduce((a,b) => a+b,0) / earHistory.length;
    const vari = earHistory.reduce((a,b) => a+(b-mean)**2,0) / earHistory.length;
    return { pass: vari >= C.earVarMin, value: vari };
  }
  async function runFaceApiCheck() {
    if (!faceApiLoaded || !videoEl || videoEl.readyState < 2) return null;
    try {
      const det = await faceapi
        .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
        .withFaceExpressions();
      return det ? det.expressions : null;
    } catch { return null; }
  }
  function checkExpressionDelta(expr) {
    if (!expr) return { pass: true, value: null };
    const vec = [expr.neutral, expr.happy, expr.surprised, expr.angry, expr.fearful];
    exprHistory.push(vec);
    if (exprHistory.length > C.exprDeltaFrames) exprHistory.shift();
    if (exprHistory.length < 5) return { pass: true, value: null };
    let total = 0;
    for (let i = 1; i < exprHistory.length; i++)
      total += exprHistory[i].reduce((s,v,j) => s + Math.abs(v - exprHistory[i-1][j]), 0);
    const avg = total / (exprHistory.length - 1);
    return { pass: avg >= C.exprDeltaMin, value: avg };
  }
  function checkChallengeExpression(expr) {
    if (!expr || challengeExprDone) return false;
    if (currentChallenge === CHALLENGE.SMILE      && expr.happy > 0.6)     return true;
    if (currentChallenge === CHALLENGE.MOUTH_OPEN && expr.surprised > 0.5) return true;
    return false;
  }
  function calcLivenessScore(zRes, varRes, exprRes) {
    let score = 0, total = 0;
    if (zRes.value   !== null) { score += Math.min(1, zRes.value   / C.zDepthMinStd) * 0.40; total += 0.40; }
    if (varRes.value !== null) { score += Math.min(1, varRes.value / C.earVarMin)    * 0.30; total += 0.30; }
    if (exprRes.value!== null) { score += Math.min(1, exprRes.value/ C.exprDeltaMin) * 0.30; total += 0.30; }
    return total > 0 ? score / total : 0.5;
  }

  /* ── onResults callback ──────────────────────── */
  async function onResults(results) {
    if (submitting || liveOk) return;
    frameCount++;
    lastSnapshot = captureJpeg(C.brightnessBoost);

    if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) {
      lastLandmarks = null;
      if (faceVisible) {
        faceVisible = false;
        hideStaticFaceContour(); hideLandmarkDots();
      }
      setStatus("Posisikan wajah di depan kamera…","#6c757d","📷");
      hideChallengeUi(); return;
    }

    const lms = results.multiFaceLandmarks[0];
    lastLandmarks = lms;

    if (!faceVisible) {
      faceVisible = true;
      showCorners(); showLandmarkDots(0.9);
      if (calibDone) renderState = "scanning";
    }

    const earAvg = (calcEAR(lms, R_EYE) + calcEAR(lms, L_EYE)) / 2;
    lastEar = earAvg;

    if (earBaseline === null) {
      earSamples.push(earAvg);
      const pct = Math.round((earSamples.length / 30) * 100);
      setStatus(`Kalibrasi… ${pct}%`, "#6c757d", "⚙️");
      renderState = "calibrating";
      updateCalibRing(pct); startSpinArc(); pulseOuterRing(true); showMeshGrid();
      if (earSamples.length >= 30) {
        const sorted = [...earSamples].sort((a,b) => a-b);
        earBaseline = sorted[Math.floor(sorted.length / 2)];
        calibDone = true;
        stopSpinArc(); hideCalibRing(); hideMeshGrid(); pulseOuterRing(false);
        renderState = "scanning";
        if (C.debug) console.info(`[EAR] baseline=${earBaseline.toFixed(3)}`);
        setStatus("Siap — ikuti instruksi berikut", "#0d6efd", "✅");
        startChallenge();
      }
      return;
    }

    earHistory.push(earAvg);
    if (earHistory.length > 60) earHistory.shift();

    const zRes   = checkZDepth(lms);
    const varRes = checkEarVariance();
    let exprRes  = { pass: true, value: null }, expr = null;
    if (faceApiLoaded && frameCount % 5 === 0) {
      expr    = await runFaceApiCheck();
      exprRes = checkExpressionDelta(expr);
      exprDeltaPass = exprRes.pass;
    }

    livenessScore = calcLivenessScore(zRes, varRes, exprRes);
    updateScoreBar(livenessScore);

    if (zDepthHistory.length >= 20 && !zRes.pass) {
      setStatus("Terdeteksi media 2D — gunakan wajah asli","#dc3545","⚠️");
      setCornerColor("#E24B4A"); showRejectFlash(400); return;
    }
    setCornerColor("#378ADD");

    const thresh = earThresh();
    if (currentChallenge === CHALLENGE.BLINK) {
      if (earAvg < thresh) { earConsec++; earWasClosed = true; }
      else {
        if (earWasClosed && earConsec >= 1) blinkCount++;
        earConsec = 0; earWasClosed = false;
      }
      if (blinkCount >= 1) onChallengeComplete();
    } else if (currentChallenge === CHALLENGE.SMILE || currentChallenge === CHALLENGE.MOUTH_OPEN) {
      if (expr && checkChallengeExpression(expr)) { challengeExprDone = true; onChallengeComplete(); }
    }
  }

  function onChallengeComplete() {
    clearTimeout(challengeTimer); hideChallengeUi();
    if (livenessScore < C.livenessScoreMin) {
      setStatus("Skor liveness rendah — ulangi tantangan","#dc3545","⚠️");
      showChallengeUi("Ulangi — skor terlalu rendah","⚠️","challenge-warn");
      setCornerColor("#BA7517");
      setTimeout(() => { if (!liveOk) startChallenge(); }, 2000); return;
    }
    liveOk = true;
    setStatus("Verifikasi berhasil, memproses…","#198754","✓");
    clearErr();
    showSuccessAnimation(() => submitLogin());
  }

  /* ── Capture & submit ────────────────────────── */
  function captureJpeg(boost = false, quality = 0.85) {
    if (!videoEl || videoEl.readyState < 2) return null;
    const w = videoEl.videoWidth || 640, h = videoEl.videoHeight || 480;
    if (!capCanvas) { capCanvas = document.createElement("canvas"); capCanvas.width = w; capCanvas.height = h; capCtx = capCanvas.getContext("2d"); }
    capCtx.filter = boost ? "brightness(1.4) contrast(1.15)" : "none";
    capCtx.drawImage(videoEl, 0, 0, w, h);
    return capCanvas.toDataURL("image/jpeg", quality);
  }

  const escHtml = s => String(s).replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

  function buildDetail(d) {
    if (!d || typeof d !== "object") return "";
    const p = [];
    if (d.confidence       != null) p.push(`Confidence: <b>${d.confidence}%</b>`);
    if (d.texture_score    != null) p.push(`Anti-spoof: ${d.texture_score}`);
    if (d.js_liveness_score!= null) p.push(`JS score: ${d.js_liveness_score}`);
    return p.length ? `<br><small class="text-muted">${p.join(" · ")}</small>` : "";
  }

  async function submitLogin() {
    if (submitting || !lastSnapshot) return;
    submitting = true;
    const username = (document.getElementById("username") || {value:""}).value.trim().toLowerCase();
    const payload = {
      image: lastSnapshot,
      skip_liveness: true,
      js_liveness_score: parseFloat(livenessScore.toFixed(4)),
      ...(username && { username }),
    };
    try {
      const res  = await fetch(C.ci3LoginUrl, { method:"POST", headers:{"Content-Type":"application/json","X-Requested-With":"XMLHttpRequest"}, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.csrf) document.querySelector(`input[name="${json.csrf.name}"]`)?.setAttribute("value", json.csrf.hash);
      handleResult(json);
    } catch (err) {
      submitting = false; resetSvgState();
      showErr("Koneksi ke server gagal: " + err.message);
      setStatus("Koneksi gagal, coba lagi","#dc3545","✗");
    }
  }

  function handleResult(json) {
    if (json.status) {
      const d = json.data || {};
      stopCamera();
      setGreeting(`Halo, ${d.full_name || d.username}! 👋`);
      setStatus("Login berhasil, mengalihkan…","#198754","✓");
      if (typeof showToast === "function") showToast({ title:"Berhasil", message:json.message, type:"success" });
      const url = (window.LOGIN_CONFIG && window.LOGIN_CONFIG.dashboardUrl) || d.redirect || "/dashboard";
      setTimeout(() => { window.location.href = url; }, 900); return;
    }
    submitting = false; liveOk = false;
    earBaseline = null; earSamples = []; earHistory = [];
    zDepthHistory = []; exprHistory = [];
    livenessScore = 0; calibDone = false; faceVisible = false;
    updateScoreBar(0); resetSvgState();
    const msg = json.message || "Verifikasi gagal.";
    showErr(`<strong>${escHtml(msg)}</strong>${buildDetail(json.data)}`);
    setStatus("Gagal — mencoba ulang…","#dc3545","✗");
    showRejectFlash(800);
    if (typeof showToast === "function") showToast({ title:"Gagal", message:msg, type:"danger" });
    setTimeout(() => { if (videoEl) { showCorners(); startSpinArc(); startChallenge(); } }, 2000);
  }

  /* ── MediaPipe init ──────────────────────────── */
  async function initMediaPipe() {
    if (typeof FaceMesh === "undefined") throw new Error("MediaPipe FaceMesh tidak ditemukan.");
    faceMesh = new FaceMesh({ locateFile: f => `${MP_CDN_BASE}/${f}` });
    faceMesh.setOptions({ maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5 });
    faceMesh.onResults(onResults);
    await faceMesh.initialize();
  }

  function isVideoReady(v) {
    return v != null && v.readyState >= 3 && v.videoWidth > 0 && v.videoHeight > 0 && v.currentTime > 0 && !v.paused && !v.ended;
  }

  async function sendFrame() {
    if (warmingUp || isSending || !faceMesh || !isVideoReady(videoEl)) return false;
    isSending = true;
    try { await faceMesh.send({ image: videoEl }); }
    catch (err) { if (C.debug) console.warn("[MP] send error:", err?.message || err); }
    finally { isSending = false; }
    return true;
  }

  function waitForVideoReady(v, ms = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const poll = () => {
        if (isVideoReady(v)) { resolve(); return; }
        if (Date.now() - start > ms) { reject(new Error("Video warmup timeout")); return; }
        setTimeout(poll, 50);
      };
      poll();
    });
  }

  async function startCamera() {
    isSending = false; warmingUp = true;
    videoEl = document.createElement("video");
    videoEl.autoplay = videoEl.playsInline = videoEl.muted = true;
    videoEl.width = 640; videoEl.height = 480;
    videoEl.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(videoEl);

    if (typeof Camera !== "undefined") {
      mpCamera = new Camera(videoEl, { onFrame: () => sendFrame(), width:640, height:480, facingMode:"user" });
      await mpCamera.start();
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ width:{ideal:640}, height:{ideal:480}, facingMode:"user" }, audio:false });
      videoEl.srcObject = stream;
      await new Promise(r => { videoEl.onloadedmetadata = r; });
      await videoEl.play();
      const loop = () => { rafId = requestAnimationFrame(loop); sendFrame(); };
      loop();
    }
    await waitForVideoReady(videoEl);
    warmingUp = false;
    if (C.debug) console.info("[CAM] warmup done", videoEl.videoWidth, "×", videoEl.videoHeight);
  }

  function stopCamera() {
    clearTimeout(challengeTimer);
    isSending = warmingUp = true;
    try { if (mpCamera) mpCamera.stop(); } catch (_) {}
    mpCamera = null;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (videoEl) { if (videoEl.srcObject) videoEl.srcObject.getTracks().forEach(t => t.stop()); videoEl.remove(); videoEl = null; }
    capCanvas = capCtx = null;
    stopCanvasLoop();
    setTimeout(() => { isSending = false; }, 200);
  }

  function resetState() {
    submitting = liveOk = false; lastSnapshot = null;
    earSamples = []; earBaseline = null; earHistory = [];
    blinkCount = earConsec = 0; earWasClosed = false;
    zDepthHistory = []; exprHistory = []; exprDeltaPass = challengeExprDone = false;
    currentChallenge = null; livenessScore = frameCount = 0;
    faceVisible = calibDone = false;
    lastLandmarks = null; lastEar = 0.25;
    isSending = false; warmingUp = true;
    clearTimeout(challengeTimer);
    updateScoreBar(0); resetSvgState(); clearErr();
    setStatus("", "#6c757d", "");
  }

  /* ══════════════════════════════════════════════════════════════
     6. PUBLIC API
  ══════════════════════════════════════════════════════════════ */
  window.initFaceId = async function () {
    mount();                     // pastikan DOM sudah ada
    resetState();
    initCanvas();
    setStatus("Memuat model…", "#6c757d", "⏳");
    startSpinArc();
    startCanvasLoop();
    renderState = "calibrating";
    try {
      await loadDeps();          // load MediaPipe scripts
      const tasks = [
        !mpInitialized ? initMediaPipe() : Promise.resolve(),
        initFaceApi(),
      ];
      await Promise.all(tasks);
      mpInitialized = true;
      await startCamera();
      setStatus("Arahkan wajah ke kamera", "#6c757d", "📷");
      pulseOuterRing(true);
    } catch (e) {
      stopSpinArc();
      showErr(`Gagal inisialisasi: ${e.message}`);
      setStatus("Gagal memuat. Refresh halaman.", "#dc3545", "✗");
      renderState = "idle";
    }
  };

  window.stopFaceId = function () {
    stopCamera(); resetState(); stopCanvasLoop();
  };

  /* ── Auto-init jika #faceIdContainer atau #fidSvg sudah ada ── */
  function autoInit() {
    if (document.getElementById("faceIdContainer") || document.getElementById("fidSvg")) {
      window.initFaceId();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }

})();