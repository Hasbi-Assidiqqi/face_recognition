/*!
 * FaceID SDK — Production-Ready Refactor
 * Architecture : Module UMD + Class-based + clean separation of concerns
 * Modules      : Config · DOM · Renderer · Liveness · Challenge · Camera · SDK
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else if (typeof define === "function" && define.amd) define(factory);
  else root.FaceIDSDK = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ═══════════════════════════════════════════════════════════════
     1. CONSTANTS
  ═══════════════════════════════════════════════════════════════ */
  const LANDMARK = Object.freeze({
    R_EYE    : [33,  159, 158, 133, 153, 145],
    L_EYE    : [362, 380, 374, 263, 386, 385],
    DEPTH_PTS: [1, 234, 454, 152, 10, 4, 263, 33, 287, 57],
    FACE_OVAL      : [10,338,338,297,297,332,332,284,284,251,251,389,389,356,356,454,454,323,323,361,361,288,288,397,397,365,365,379,379,378,378,400,400,377,377,152,152,148,148,176,176,149,149,150,150,136,136,172,172,58,58,132,132,93,93,234,234,127,127,162,162,21,21,54,54,103,103,67,67,109,109,10],
    LEFT_EYE_CONN  : [263,249,249,390,390,373,373,374,374,380,380,381,381,382,382,362,263,466,466,388,388,387,387,386,386,385,385,384,384,398,398,362],
    RIGHT_EYE_CONN : [33,7,7,163,163,144,144,145,145,153,153,154,154,155,155,133,33,246,246,161,161,160,160,159,159,158,158,157,157,173,173,133],
    LEFT_EYEBROW   : [276,283,283,282,282,295,295,285,300,293,293,334,334,296,296,336],
    RIGHT_EYEBROW  : [46,53,53,52,52,65,65,55,70,63,63,105,105,66,66,107],
    NOSE_CONN      : [168,6,6,197,197,195,195,5,5,4,4,1,1,19,19,94,94,2,98,97,97,2,2,326,326,327,327,294,98,240,240,99,99,60,294,455,455,439,439,290],
    LIPS_CONN      : [61,146,146,91,91,181,181,84,84,17,17,314,314,405,405,321,321,375,375,291,61,185,185,40,40,39,39,37,37,0,0,267,267,269,269,270,270,409,409,291,78,95,95,88,88,178,178,87,87,14,14,317,317,402,402,318,318,324,324,308,78,191,191,80,80,81,81,82,82,13,13,312,312,311,311,310,310,415,415,308],
    IRISES         : [474,475,475,476,476,477,477,474,469,470,470,471,471,472,472,469],
    KEY_DOTS       : [1,4,152,234,454,10,263,33,61,291,468,473],
  });

  const CHALLENGE = Object.freeze({ BLINK: "blink", SMILE: "smile", MOUTH_OPEN: "mouth_open" });

  const ORBIT_DOTS = Object.freeze([
    { offset: 0,             size: 3,   color: "#378ADD", colorFade: "rgba(55,138,221,0)",  alpha: 0.75 },
    { offset: Math.PI*0.67,  size: 2.2, color: "#5BAFFF", colorFade: "rgba(91,175,255,0)",  alpha: 0.65 },
    { offset: Math.PI*1.33,  size: 1.8, color: "#9DD8FF", colorFade: "rgba(157,216,255,0)", alpha: 0.55 },
  ]);

  /* ═══════════════════════════════════════════════════════════════
     2. DEFAULT CONFIG
  ═══════════════════════════════════════════════════════════════ */
  const DEFAULTS = Object.freeze({
    /* Layout */
    size                : 280,

    /* Colors */
    colorPrimary        : "#378ADD",
    colorPrimaryLight   : "#5BAFFF",
    colorPrimaryLighter : "#9DD8FF",
    colorSuccess        : "#1D9E75",
    colorSuccessLight   : "#0ED99B",
    colorWarning        : "#BA7517",
    colorDanger         : "#E24B4A",

    /* UI text (i18n-ready) */
    txtLoading          : "Memuat model…",
    txtCalibrating      : "Kalibrasi… {pct}%",
    txtReady            : "Siap — ikuti instruksi berikut",
    txtPointFace        : "Arahkan wajah ke kamera",
    txtPositionFace     : "Posisikan wajah di depan kamera…",
    txtSpoof2d          : "Terdeteksi media 2D — gunakan wajah asli",
    txtChallengeTimeout : "Waktu habis! Tantangan diulang…",
    txtChallengeRetry   : "Waktu habis, ulangi lagi",
    txtLowLiveness      : "Skor liveness rendah — ulangi tantangan",
    txtLowLivenessRetry : "Ulangi — skor terlalu rendah",
    txtVerified         : "Verifikasi berhasil, memproses…",
    txtLoginOk          : "Login berhasil, mengalihkan…",
    txtLoginFail        : "Gagal — mencoba ulang…",
    txtConnFail         : "Koneksi ke server gagal",
    txtInitFail         : "Gagal inisialisasi",
    txtRefreshPage      : "Gagal memuat. Refresh halaman.",
    txtFollowInstr      : "Ikuti instruksi",
    txtConnRetry        : "Koneksi gagal, coba lagi",
    txtBlink            : "Kedipkan mata sekali",
    txtSmile            : "Tersenyumlah sebentar",
    txtMouthOpen        : "Buka mulut sebentar",
    txtVerifiedBadge    : "VERIFIED",
    txtLoadingMediaPipe : "Memuat MediaPipe…",
    txtInitModel        : "Inisialisasi model…",
    txtOpenCamera       : "Membuka kamera…",

    /* Liveness thresholds */
    zDepthMinStd        : 0.020,
    earVarMin           : 0.0006,
    earVarFrames        : 40,
    exprDeltaMin        : 0.015,
    exprDeltaFrames     : 20,
    challengeTimeoutMs  : 15000,
    livenessScoreMin    : 0.55,
    earCalibFrames      : 30,

    /* Camera */
    videoWidth          : 640,
    videoHeight         : 480,
    videoFacingMode     : "user",

    /* Misc */
    brightnessBoost     : true,
    jpegQuality         : 0.85,
    debug               : false,
    loginUrl            : null,
    cdnBase             : null,
    cameraUtils         : null,
    faceMeshSrc         : null,
    faceApiSrc          : null,
    faceApiModels       : null,

    /* Retry */
    globalPollIntervalMs  : 80,
    globalTimeoutMs       : 15000,
    faceApiTimeoutMs      : 8000,
    cameraTimeoutMs       : 5000,
    mediaPipeRetryDelayMs : 1500,
    videoWarmupMs         : 10000,
    videoPollMs           : 50,

    /* Callbacks */
    onReady         : null,
    onSuccess       : null,
    onError         : null,
    onLivenessPass  : null,
  });

  /* ═══════════════════════════════════════════════════════════════
     3. CSS BUILDER
  ═══════════════════════════════════════════════════════════════ */
  function buildCSS(C) {
    const s  = C.size;
    const cp = C.colorPrimary;
    return `
#faceIdContainer {
  display:flex; flex-direction:column; align-items:center;
  padding:0.5rem 0 0.25rem; user-select:none; position:relative;
}
#fidStage { position:relative; width:${s}px; height:${s}px; flex-shrink:0; }
#fidCanvas {
  position:absolute; top:0; left:0;
  width:${s}px; height:${s}px;
  pointer-events:none; border-radius:50%; z-index:5;
}
#fidSvg {
  width:${s}px; height:${s}px; overflow:visible;
  filter:drop-shadow(0 0 8px rgba(55,138,221,0.15));
  transition:filter 0.5s ease; position:relative; z-index:2; display:block;
}
#fidSvg.state-success { filter:drop-shadow(0 0 14px rgba(29,158,117,0.4)); }
#fidSvg.state-error   { filter:drop-shadow(0 0 12px rgba(226,75,74,0.4)); }
#fidStatus {
  font-size:13px; font-weight:500; letter-spacing:0.3px;
  color:#888; margin-top:0.85rem; text-align:center;
  min-height:22px; transition:color 0.3s, opacity 0.3s;
}
#fidStatusIcon { display:inline-block; margin-right:5px; font-size:14px; }
#fidScoreRing  { filter:drop-shadow(0 0 6px rgba(55,138,221,0.4)); }
#fidChallengeBadge {
  display:none; align-items:center; gap:6px;
  background:rgba(55,138,221,0.08); border:1px solid rgba(55,138,221,0.25);
  border-radius:20px; padding:4px 14px; margin-top:8px;
  font-size:12px; font-weight:600; color:${cp}; letter-spacing:0.4px;
  transition:all 0.3s ease; animation:fid-badge-pulse 2s ease-in-out infinite;
}
#fidChallengeBadge.visible        { display:flex; }
#fidChallengeBadge.challenge-warn {
  background:rgba(186,117,23,0.1);
  border-color:rgba(186,117,23,0.35); color:${C.colorWarning};
}
#fidChallengeBadge.challenge-danger {
  background:rgba(226,75,74,0.1);
  border-color:rgba(226,75,74,0.35); color:${C.colorDanger};
}
@keyframes fid-badge-pulse      { 0%,100%{opacity:1;transform:scale(1)}    50%{opacity:.8;transform:scale(1.02)} }
@keyframes fid-scan-v           { 0%{transform:translateY(-90px);opacity:.9}100%{transform:translateY(90px);opacity:.25} }
@keyframes fid-pulse-ring       { 0%,100%{opacity:.15} 50%{opacity:.5} }
@keyframes fid-pulse-ring-fast  { 0%,100%{opacity:.2}  50%{opacity:.75} }
@keyframes fid-spin-arc         { from{stroke-dashoffset:0} to{stroke-dashoffset:-282} }
@keyframes fid-spin-arc-reverse { from{stroke-dashoffset:0} to{stroke-dashoffset:282} }
@keyframes fid-face-in          { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
@keyframes fid-draw-check       { from{stroke-dashoffset:46} to{stroke-dashoffset:0} }
@keyframes fid-glitch-flash     { 0%,100%{opacity:1} 25%{opacity:.3} 50%{opacity:1} 75%{opacity:.5} }
@keyframes fid-dot-sparkle      { 0%,100%{opacity:.35} 50%{opacity:.9} }
@keyframes fid-mesh-flicker     { 0%,100%{opacity:.18} 50%{opacity:.38} }
@keyframes fid-face-breathe     { 0%,100%{transform:scale(1)} 50%{transform:scale(1.018)} }
`;
  }

  /* ═══════════════════════════════════════════════════════════════
     4. SVG/HTML BUILDER
  ═══════════════════════════════════════════════════════════════ */
  function buildHTML(C) {
    const s   = C.size;
    const h   = s / 2;
    const sc  = s / 280;
    const cp  = C.colorPrimary;
    const cpl = C.colorPrimaryLight;
    const cs  = C.colorSuccess;
    const csl = C.colorSuccessLight;
    const cd  = C.colorDanger;
    const v   = (n) => (n * sc).toFixed(3);
    const r108 = v(108), r118 = v(118), r128 = v(128), r135 = v(135);
    const circ = (2 * Math.PI * 108 * sc).toFixed(1);

    return `
<div id="fidStage" style="position:relative;width:${s}px;height:${s}px;flex-shrink:0;">
  <canvas id="fidCanvas" width="${s}" height="${s}"
    style="position:absolute;top:0;left:0;width:${s}px;height:${s}px;pointer-events:none;border-radius:50%;z-index:5;"></canvas>

  <svg id="fidSvg" viewBox="-${h} -${h} ${s} ${s}" xmlns="http://www.w3.org/2000/svg"
      style="position:relative;z-index:2;display:block;">
    <defs>
      <linearGradient id="fidScanGradV" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="${cp}"  stop-opacity="0"/>
        <stop offset="40%"  stop-color="${cp}"  stop-opacity="0.6"/>
        <stop offset="60%"  stop-color="${cpl}" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="${cp}"  stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="fidDataWipeGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="${cp}"  stop-opacity="0"/>
        <stop offset="45%"  stop-color="${cpl}" stop-opacity="0.45"/>
        <stop offset="55%"  stop-color="${C.colorPrimaryLighter}" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="${cp}"  stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="fidSuccessGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="${cs}"  stop-opacity="0.9"/>
        <stop offset="100%" stop-color="${csl}" stop-opacity="0.6"/>
      </linearGradient>
      <radialGradient id="fidRingGlow" cx="50%" cy="50%" r="50%">
        <stop offset="60%"  stop-color="${cp}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${cp}" stop-opacity="0.12"/>
      </radialGradient>
      <clipPath id="fidFaceOvalClip"><ellipse cx="0" cy="${v(-5)}" rx="${v(65)}" ry="${v(79)}"/></clipPath>
      <clipPath id="fidFaceHClip">  <ellipse cx="0" cy="${v(-5)}" rx="${v(65)}" ry="${v(79)}"/></clipPath>
      <filter id="fidGlowBlue" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${v(2.5)}" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="fidGlowGreen" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${v(3)}" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <circle cx="0" cy="0" r="${r135}" fill="url(#fidRingGlow)" opacity="0.6"/>
    <circle id="fidOuterRing3" cx="0" cy="0" r="${r128}" fill="none" stroke="${cp}" stroke-width="${v(0.4)}" stroke-dasharray="${v(2)} ${v(8)}" opacity="0.1"/>
    <circle id="fidOuterRing2" cx="0" cy="0" r="${r118}" fill="none" stroke="${cp}" stroke-width="${v(0.5)}" stroke-dasharray="${v(3)} ${v(6)}" opacity="0.12"/>
    <circle id="fidOuterRing"  cx="0" cy="0" r="${r108}" fill="none" stroke="${cp}" stroke-width="${v(1)}" opacity="0.2"/>

    <circle id="fidSpinArc"  cx="0" cy="0" r="${r108}" fill="none" stroke="${cp}"  stroke-width="${v(1.8)}" stroke-dasharray="${v(55)} ${v(227)}" opacity="0" style="transform-origin:center;"/>
    <circle id="fidSpinArc2" cx="0" cy="0" r="${r108}" fill="none" stroke="${cpl}" stroke-width="${v(1)}"   stroke-dasharray="${v(25)} ${v(257)}" opacity="0" style="transform-origin:center;"/>

    <circle id="fidCalibRing" cx="${v(280)}" cy="0" r="${r108}" fill="none" stroke="${cp}" stroke-width="${v(2.5)}"
      stroke-dasharray="0 ${circ}" stroke-linecap="round" opacity="0"
      style="transform-origin:center;transform:rotate(-90deg);"/>

    <g id="fidCorners" opacity="0">
      <polyline id="fidCornerTL" points="${v(-96)},${v(-75)} ${v(-108)},${v(-108)} ${v(-75)},${v(-108)}" fill="none" stroke="${cp}" stroke-width="${v(2.2)}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${v(60)}" stroke-dashoffset="${v(60)}"/>
      <polyline id="fidCornerTR" points="${v(96)},${v(-75)}  ${v(108)},${v(-108)}  ${v(75)},${v(-108)}"  fill="none" stroke="${cp}" stroke-width="${v(2.2)}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${v(60)}" stroke-dashoffset="${v(60)}"/>
      <polyline id="fidCornerBL" points="${v(-96)},${v(75)}  ${v(-108)},${v(108)}  ${v(-75)},${v(108)}"  fill="none" stroke="${cp}" stroke-width="${v(2.2)}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${v(60)}" stroke-dashoffset="${v(60)}"/>
      <polyline id="fidCornerBR" points="${v(96)},${v(75)}   ${v(108)},${v(108)}   ${v(75)},${v(108)}"   fill="none" stroke="${cp}" stroke-width="${v(2.2)}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${v(60)}" stroke-dashoffset="${v(60)}"/>
    </g>

    <g id="fidMeshGrid" opacity="0" clip-path="url(#fidFaceOvalClip)">
      ${[-65,-45,-25,-5,15,35,55].map(y=>`<line x1="${v(-65)}" y1="${v(y)}" x2="${v(65)}" y2="${v(y)}" stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>`).join("")}
      ${[-55,-35,-15,5,25,45,65].map(x=>`<line x1="${v(x)}" y1="${v(-84)}" x2="${v(x)}" y2="${v(74)}" stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>`).join("")}
    </g>

    <g id="fidFaceGroup" opacity="0" style="transform-origin:0 ${v(-5)}px;">
      <ellipse cx="0" cy="${v(-5)}" rx="${v(62)}" ry="${v(76)}" fill="none" stroke="${cp}" stroke-width="${v(1.4)}" opacity="0.7" filter="url(#fidGlowBlue)"/>
      <path d="M${v(-30)},${v(-47)} Q0,${v(-62)} ${v(30)},${v(-47)}" fill="none" stroke="${cp}" stroke-width="${v(0.9)}" opacity="0.5"/>
      <path d="M${v(-36)},${v(-30)} Q${v(-28)},${v(-34)} ${v(-18)},${v(-30)}" fill="none" stroke="${cp}" stroke-width="${v(1.8)}" stroke-linecap="round" opacity="0.75"/>
      <path d="M${v(18)},${v(-30)} Q${v(28)},${v(-34)} ${v(36)},${v(-30)}"   fill="none" stroke="${cp}" stroke-width="${v(1.8)}" stroke-linecap="round" opacity="0.75"/>
      <ellipse cx="${v(-25)}" cy="${v(-18)}" rx="${v(10)}" ry="${v(6.5)}" fill="rgba(55,138,221,0.04)" stroke="${cp}" stroke-width="${v(1)}" opacity="0.55"/>
      <ellipse cx="${v(25)}"  cy="${v(-18)}" rx="${v(10)}" ry="${v(6.5)}" fill="rgba(55,138,221,0.04)" stroke="${cp}" stroke-width="${v(1)}" opacity="0.55"/>
      <circle cx="${v(-25)}" cy="${v(-18)}" r="${v(4.5)}" fill="none" stroke="${cpl}" stroke-width="${v(0.8)}" opacity="0.7"/>
      <circle cx="${v(25)}"  cy="${v(-18)}" r="${v(4.5)}" fill="none" stroke="${cpl}" stroke-width="${v(0.8)}" opacity="0.7"/>
      <circle cx="${v(-25)}" cy="${v(-18)}" r="${v(2.5)}" fill="${cp}" opacity="0.9"/>
      <circle cx="${v(25)}"  cy="${v(-18)}" r="${v(2.5)}" fill="${cp}" opacity="0.9"/>
      <circle cx="${v(-25)}" cy="${v(-18)}" r="${v(1)}"   fill="#185FA5" opacity="0.95"/>
      <circle cx="${v(25)}"  cy="${v(-18)}" r="${v(1)}"   fill="#185FA5" opacity="0.95"/>
      <circle cx="${v(-23)}" cy="${v(-20)}" r="${v(1)}"   fill="white" opacity="0.6"/>
      <circle cx="${v(27)}"  cy="${v(-20)}" r="${v(1)}"   fill="white" opacity="0.6"/>
      <line x1="0" y1="${v(-15)}" x2="0" y2="${v(-1)}" stroke="${cp}" stroke-width="${v(1)}" stroke-linecap="round" opacity="0.4"/>
      <path d="M${v(-8)},${v(1)} Q${v(-4)},${v(6)} 0,${v(5)} Q${v(4)},${v(6)} ${v(8)},${v(1)}" fill="none" stroke="${cp}" stroke-width="${v(1.2)}" stroke-linecap="round" opacity="0.6"/>
      <path d="M${v(-8)},${v(1)} Q${v(-10)},${v(-1)} ${v(-8)},${v(-3)}" fill="none" stroke="${cp}" stroke-width="${v(0.9)}" stroke-linecap="round" opacity="0.45"/>
      <path d="M${v(8)},${v(1)} Q${v(10)},${v(-1)} ${v(8)},${v(-3)}"   fill="none" stroke="${cp}" stroke-width="${v(0.9)}" stroke-linecap="round" opacity="0.45"/>
      <path d="M${v(-18)},${v(20)} Q0,${v(36)} ${v(18)},${v(20)}" fill="none" stroke="${cp}" stroke-width="${v(1.6)}" stroke-linecap="round" opacity="0.8"/>
      <path d="M${v(-10)},${v(22)} Q0,${v(27)} ${v(10)},${v(22)}" fill="none" stroke="${cp}" stroke-width="${v(0.8)}" stroke-linecap="round" opacity="0.45"/>
      <line x1="${v(-62)}" y1="${v(-15)}" x2="${v(-46)}" y2="${v(-15)}" stroke="${cp}" stroke-width="${v(0.9)}" stroke-linecap="round" opacity="0.4"/>
      <line x1="${v(62)}"  y1="${v(-15)}" x2="${v(46)}"  y2="${v(-15)}" stroke="${cp}" stroke-width="${v(0.9)}" stroke-linecap="round" opacity="0.4"/>
      <path d="M${v(-6)},${v(13)} L0,${v(18)} L${v(6)},${v(13)}" fill="none" stroke="${cp}" stroke-width="${v(0.8)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
      <path d="M${v(-18)},${v(50)} Q0,${v(65)} ${v(18)},${v(50)}" fill="none" stroke="${cp}" stroke-width="${v(0.8)}" stroke-linecap="round" opacity="0.35"/>
    </g>

    <g id="fidDotsGroup" opacity="0">
      <circle cx="${v(-50)}" cy="${v(-70)}" r="${v(2.2)}" fill="${cp}"  opacity="0.55"/>
      <circle cx="0"         cy="${v(-80)}" r="${v(2)}"   fill="${cp}"  opacity="0.5"/>
      <circle cx="${v(50)}"  cy="${v(-70)}" r="${v(2.2)}" fill="${cp}"  opacity="0.55"/>
      <circle cx="${v(-64)}" cy="${v(-12)}" r="${v(2)}"   fill="${cp}"  opacity="0.4"/>
      <circle cx="${v(64)}"  cy="${v(-12)}" r="${v(2)}"   fill="${cp}"  opacity="0.4"/>
      <circle cx="${v(-58)}" cy="${v(25)}"  r="${v(1.8)}" fill="${cp}"  opacity="0.38"/>
      <circle cx="${v(58)}"  cy="${v(25)}"  r="${v(1.8)}" fill="${cp}"  opacity="0.38"/>
      <circle cx="${v(-28)}" cy="${v(66)}"  r="${v(2)}"   fill="${cp}"  opacity="0.45"/>
      <circle cx="0"         cy="${v(76)}"  r="${v(1.8)}" fill="${cp}"  opacity="0.4"/>
      <circle cx="${v(28)}"  cy="${v(66)}"  r="${v(2)}"   fill="${cp}"  opacity="0.45"/>
      <circle cx="${v(-37)}" cy="${v(-18)}" r="${v(1.5)}" fill="${cpl}" opacity="0.65"/>
      <circle cx="${v(-13)}" cy="${v(-18)}" r="${v(1.5)}" fill="${cpl}" opacity="0.65"/>
      <circle cx="${v(13)}"  cy="${v(-18)}" r="${v(1.5)}" fill="${cpl}" opacity="0.65"/>
      <circle cx="${v(37)}"  cy="${v(-18)}" r="${v(1.5)}" fill="${cpl}" opacity="0.65"/>
      <circle cx="0"         cy="${v(-18)}" r="${v(1.5)}" fill="${cp}"  opacity="0.4"/>
      <circle cx="${v(-18)}" cy="${v(20)}"  r="${v(1.8)}" fill="${cpl}" opacity="0.6"/>
      <circle cx="${v(18)}"  cy="${v(20)}"  r="${v(1.8)}" fill="${cpl}" opacity="0.6"/>
      <circle cx="${v(-27)}" cy="${v(-32)}" r="${v(1.5)}" fill="${cp}"  opacity="0.5"/>
      <circle cx="${v(27)}"  cy="${v(-32)}" r="${v(1.5)}" fill="${cp}"  opacity="0.5"/>
    </g>

    <rect id="fidScanBar"  x="${v(-65)}" y="${v(-90)}" width="${v(130)}" height="${v(28)}" fill="url(#fidScanGradV)" opacity="0" clip-path="url(#fidFaceOvalClip)"/>
    <line id="fidScanEdge" x1="${v(-62)}" y1="${v(-90)}" x2="${v(62)}" y2="${v(-90)}" stroke="${C.colorPrimaryLighter}" stroke-width="${v(0.8)}" opacity="0" clip-path="url(#fidFaceOvalClip)"/>
    <rect id="fidDataWipe" x="${v(-80)}" y="${v(-84)}" width="${v(24)}" height="${v(158)}" fill="url(#fidDataWipeGrad)" opacity="0" clip-path="url(#fidFaceHClip)"/>

    <g id="fidOrbitGroup" opacity="0" style="transform-origin:center;"/>

    <g id="fidSuccessMark" opacity="0">
      <circle cx="0" cy="0" r="${v(32)}" fill="rgba(29,158,117,0.08)" stroke="url(#fidSuccessGrad)" stroke-width="${v(2)}" opacity="0.9"/>
      <polyline id="fidCheckPoly" points="${v(-14)},0 ${v(-4)},${v(12)} ${v(16)},${v(-14)}" fill="none" stroke="${cs}" stroke-width="${v(3)}"
        stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${v(46)}" stroke-dashoffset="${v(46)}"
        filter="url(#fidGlowGreen)"/>
      <text x="0" y="${v(52)}" text-anchor="middle" font-family="system-ui,sans-serif"
        font-size="${v(8)}" font-weight="600" letter-spacing="2" fill="${cs}" opacity="0">${C.txtVerifiedBadge}</text>
    </g>

    <g id="fidRejectFlash" opacity="0" pointer-events="none">
      <ellipse cx="0" cy="${v(-5)}" rx="${v(62)}" ry="${v(76)}" fill="none" stroke="${cd}" stroke-width="${v(2)}" stroke-dasharray="${v(8)} ${v(4)}"/>
    </g>

    <circle id="fidScoreRingBg" cx="0" cy="0" r="${r108}" fill="none" stroke="rgba(55,138,221,0.08)" stroke-width="${v(3)}"/>
    <circle id="fidScoreRing"   cx="280" cy="0" r="${r108}" fill="none" stroke="${cp}" stroke-width="${v(3)}"
      stroke-linecap="round" stroke-dasharray="0 ${circ}" transform="rotate(-90)"
      style="transform-origin:center; transition:stroke-dasharray 0.4s ease, stroke 0.3s;"/>
  </svg>
</div>

<div id="fidChallengeBadge">
  <span id="fidChallengeIcon"></span>
  <span id="fidChallengeText"></span>
</div>
`;
  }

  /* ═══════════════════════════════════════════════════════════════
     5. UTILITY HELPERS
  ═══════════════════════════════════════════════════════════════ */

  /** Resolve a URL: prefer explicit opt, then fallback value */
  function pickUrl(opt, fallback) {
    return opt || fallback;
  }

  /** Derive base path from current URL (2-segment prefix) */
  function deriveBasePath() {
    const pa = window.location.pathname.split("/");
    return `${window.location.origin}/${pa[1]}/${pa[2]}/`;
  }

  /** Build CDN paths from config options */
  function buildCdnPaths(options) {
    const DEFAULT_BASE = "https://hasbi-assidiqqi.github.io/face_recognition/faceapi";
    const LIB          = window.LIB_URL || {};
    const REDIRECT     = (typeof window.d !== "undefined" && window.d && window.d.redirect) ? window.d.redirect : null;
    const pick         = (a, b) => a || REDIRECT || b;

    return {
      MP_CDN_BASE    : pickUrl(options.cdnBase,       pick(LIB.faceApi,       `${DEFAULT_BASE}/js`)),
      CAM_UTILS_SRC  : pickUrl(options.cameraUtils,   pick(LIB.cameraUtils,   `${DEFAULT_BASE}/js/camera_utils.js`)),
      FACE_MESH_SRC  : pickUrl(options.faceMeshSrc,   pick(LIB.faceMesh,      `${DEFAULT_BASE}/js/face_mesh.js`)),
      FACEAPI_CDN    : pickUrl(options.faceApiSrc,    pick(LIB.faceApiMin,    `${DEFAULT_BASE}/js/face-api.min.js`)),
      FACEAPI_MODELS : pickUrl(options.faceApiModels, pick(LIB.faceApiModels, `${DEFAULT_BASE}/weights`)),
    };
  }

  /** HTML-escape a string */
  function escHtml(s) {
    const MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(s).replace(/[&<>"']/g, c => MAP[c]);
  }

  /** Interpolate {key} tokens in a string */
  function interpolate(template, vars = {}) {
    let s = template || "";
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
    return s;
  }

  /** Poll until a window global exists */
  function waitForGlobal(name, timeoutMs = 12000, intervalMs = 80) {
    return new Promise((resolve, reject) => {
      if (typeof window[name] !== "undefined") { resolve(window[name]); return; }
      const deadline = Date.now() + timeoutMs;
      const id = setInterval(() => {
        if (typeof window[name] !== "undefined") { clearInterval(id); resolve(window[name]); }
        else if (Date.now() > deadline)          { clearInterval(id); reject(new Error(`Global '${name}' not available after ${timeoutMs}ms`)); }
      }, intervalMs);
    });
  }

  /** Load a <script> tag exactly once; subsequent calls return the same promise */
  const _scriptCache = new Map();
  function loadScriptOnce(src) {
    if (_scriptCache.has(src)) return _scriptCache.get(src);
    const p = new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      if (!src.startsWith(window.location.origin) && !src.startsWith("/")) {
        el.crossOrigin = "anonymous";
      }
      el.onload  = resolve;
      el.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(el);
    });
    _scriptCache.set(src, p);
    return p;
  }

  /** Clamp a number between min and max */
  function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

  /* ═══════════════════════════════════════════════════════════════
     6. DOM MODULE
     Encapsulates all DOM queries and mutations for the widget.
  ═══════════════════════════════════════════════════════════════ */
  class DomManager {
    constructor() {
      this._cache = {};
    }

    /** Get element by ID with memoization */
    get(id) {
      if (this._cache[id] == null) this._cache[id] = document.getElementById(id);
      return this._cache[id];
    }

    /** Invalidate the entire cache (e.g. after re-mount) */
    invalidate() { this._cache = {}; }

    setOpacity(id, opacity, transitionMs = 300) {
      const el = this.get(id); if (!el) return;
      el.style.transition = `opacity ${transitionMs}ms ease`;
      el.style.opacity    = String(opacity);
    }

    show(id, opacity = 1, ms = 300) { this.setOpacity(id, opacity, ms); }
    hide(id, ms = 200)               { this.setOpacity(id, 0, ms); }

    setAttr(id, attr, value) { const el = this.get(id); if (el) el.setAttribute(attr, value); }

    setAnimation(id, value)  { const el = this.get(id); if (el) el.style.animation = value; }
    setStyle(id, prop, value){ const el = this.get(id); if (el) el.style[prop] = value; }

    addCls(id, cls)    { const el = this.get(id); if (el) el.classList.add(cls); }
    removeCls(id, cls) { const el = this.get(id); if (el) el.classList.remove(cls); }
    setCls(id, cls)    { const el = this.get(id); if (el) el.className = cls; }

    /** Query children of a cached element */
    queryAll(id, selector) {
      const el = this.get(id); return el ? Array.from(el.querySelectorAll(selector)) : [];
    }

    /** Mount CSS style tag (idempotent) */
    mountStyle(id, css) {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
      const tag = document.createElement("style");
      tag.id = id;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    /** Resolve or create the container element */
    resolveContainer(sel) {
      let container = null;
      if (typeof sel === "string") {
        container = sel === "#faceIdContainer"
          ? (document.getElementById("faceIdContainer") || null)
          : document.querySelector(sel);
      } else if (sel instanceof HTMLElement) {
        container = sel;
      }
      if (!container) {
        container    = document.createElement("div");
        container.id = "faceIdContainer";
        document.body.appendChild(container);
      } else if (!container.id) {
        container.id = "faceIdContainer";
      }
      return container;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     7. CANVAS RENDERER
     All canvas drawing operations isolated here.
  ═══════════════════════════════════════════════════════════════ */
  class CanvasRenderer {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} C  - config
     */
    constructor(ctx, C) {
      this.ctx = ctx;
      this.C   = C;
    }

    get sc()  { return this.C.size / 280; }
    get size() { return this.C.size; }

    /** Convert MediaPipe normalized landmark to canvas pixel coordinates */
    lmToCanvas(lm) {
      const { size, sc } = this;
      return {
        x: size / 2 + (lm.x - 0.5) * -320 * sc,
        y: size / 2 + (lm.y - 0.5) *  320 * sc,
        z: lm.z,
      };
    }

    connections(lms, conns, color, lw, alpha = 1) {
      const { ctx, sc } = this;
      if (!ctx || !lms) return;
      const len = lms.length;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth   = lw * sc;
      ctx.lineCap = ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i < conns.length - 1; i += 2) {
        const ia = conns[i], ib = conns[i + 1];
        if (ia >= len || ib >= len) continue;
        const pa = this.lmToCanvas(lms[ia]);
        const pb = this.lmToCanvas(lms[ib]);
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    dots(lms, indices, color, radius, alpha = 1) {
      const { ctx, sc } = this;
      if (!ctx || !lms) return;
      const len = lms.length;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const i of indices) {
        if (i >= len) continue;
        const p = this.lmToCanvas(lms[i]);
        ctx.moveTo(p.x + radius * sc, p.y);
        ctx.arc(p.x, p.y, radius * sc, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }

    scanLine(y, alpha) {
      const { ctx, sc, size, C } = this;
      if (!ctx) return;
      ctx.save();
      const g = ctx.createLinearGradient(0, y - 20*sc, 0, y + 20*sc);
      g.addColorStop(0,   "rgba(55,138,221,0)");
      g.addColorStop(0.4, "rgba(55,138,221,0.5)");
      g.addColorStop(0.5, "rgba(255,91,91,0.75)");
      g.addColorStop(0.6, "rgba(55,138,221,0.5)");
      g.addColorStop(1,   "rgba(55,138,221,0)");
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = g;
      ctx.fillRect(30*sc, y - 20*sc, size - 60*sc, 40*sc);
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = C.colorPrimaryLighter;
      ctx.lineWidth   = sc;
      ctx.shadowColor = C.colorPrimaryLight;
      ctx.shadowBlur  = 6 * sc;
      ctx.beginPath();
      ctx.moveTo(40*sc, y);
      ctx.lineTo(size - 40*sc, y);
      ctx.stroke();
      ctx.restore();
    }

    dataWipe(x, alpha) {
      const { ctx, sc, size } = this;
      if (!ctx) return;
      ctx.save();
      const g = ctx.createLinearGradient(x, 0, x + 30*sc, 0);
      g.addColorStop(0,   "rgba(55,138,221,0)");
      g.addColorStop(0.4, "rgba(55,138,221,0.35)");
      g.addColorStop(0.6, "rgba(157,216,255,0.55)");
      g.addColorStop(1,   "rgba(55,138,221,0)");
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = g;
      ctx.fillRect(x, 50*sc, 30*sc, size - 100*sc);
      ctx.restore();
    }

    eyeGlow(lms, phase) {
      const { ctx, sc } = this;
      if (!ctx || !lms || lms.length < 474) return;
      const p468 = this.lmToCanvas(lms[468]);
      const p473 = this.lmToCanvas(lms[473]);
      const glowR = (14 + Math.sin(phase) * 2.5) * sc;
      const alpha = 0.22 + Math.sin(phase * 2) * 0.08;
      ctx.save();
      for (const [px, py] of [[p468.x, p468.y], [p473.x, p473.y]]) {
        const g = ctx.createRadialGradient(px, py, 1.5*sc, px, py, glowR);
        g.addColorStop(0,    `rgba(91,175,255,${(alpha * 1.5).toFixed(2)})`);
        g.addColorStop(0.45, `rgba(55,138,221,${alpha.toFixed(2)})`);
        g.addColorStop(1,    "rgba(55,138,221,0)");
        ctx.fillStyle = g;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(px, py, glowR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    orbitDots(phase) {
      const { ctx, sc, size } = this;
      if (!ctx) return;
      const cx = size / 2, cy = size / 2, r = 122 * sc;
      ctx.save();
      for (const d of ORBIT_DOTS) {
        const angle = phase + d.offset;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        const gr = d.size * 3.5 * sc;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, gr);
        grd.addColorStop(0,   d.color + "BB");
        grd.addColorStop(0.6, d.color + "44");
        grd.addColorStop(1,   d.colorFade);
        ctx.globalAlpha = d.alpha;
        ctx.fillStyle   = grd;
        ctx.beginPath(); ctx.arc(x, y, gr, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = Math.min(1, d.alpha * 1.3);
        ctx.fillStyle   = d.color;
        ctx.beginPath(); ctx.arc(x, y, d.size * sc, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    successOverlay(phase) {
      const { ctx, sc, size, C } = this;
      if (!ctx) return;
      const cx = size / 2, cy = size / 2;
      ctx.save();
      for (let i = 0; i < 2; i++) {
        const rr = (35 + phase * 60 * (i + 1) * 0.5) * sc;
        const al = Math.max(0, 0.6 - phase * (i + 1) * 0.5);
        ctx.globalAlpha = al;
        ctx.strokeStyle = C.colorSuccess;
        ctx.lineWidth   = 1.5 * sc;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    clear() {
      const { ctx, size } = this;
      if (ctx) ctx.clearRect(0, 0, size, size);
    }

    faceMesh(lms, C, alpha = 0.9) {
      this.connections(lms, LANDMARK.FACE_OVAL,      C.colorPrimary,        1.2, alpha * 0.65);
      this.connections(lms, LANDMARK.LEFT_EYE_CONN,  C.colorPrimaryLight,   0.9, alpha * 0.85);
      this.connections(lms, LANDMARK.RIGHT_EYE_CONN, C.colorPrimaryLight,   0.9, alpha * 0.85);
      this.connections(lms, LANDMARK.IRISES,         C.colorPrimaryLighter, 1.0, alpha * 0.95);
      this.connections(lms, LANDMARK.LEFT_EYEBROW,   C.colorPrimary,        1.4, alpha * 0.7);
      this.connections(lms, LANDMARK.RIGHT_EYEBROW,  C.colorPrimary,        1.4, alpha * 0.7);
      this.connections(lms, LANDMARK.NOSE_CONN,      C.colorPrimary,        0.9, alpha * 0.55);
      this.connections(lms, LANDMARK.LIPS_CONN,      C.colorPrimaryLight,   1.0, alpha * 0.75);
      this.dots(lms, LANDMARK.KEY_DOTS, C.colorPrimaryLighter, 2.2, alpha * 0.8);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     8. LIVENESS MODULE
     Pure math — no DOM or side effects.
  ═══════════════════════════════════════════════════════════════ */
  class LivenessAnalyzer {
    constructor(C) {
      this.C = C;
      this.reset();
    }

    reset() {
      this.earSamples    = [];
      this.earBaseline   = null;
      this.earHistory    = [];
      this.zDepthHistory = [];
      this.exprHistory   = [];
      this.exprDeltaPass = false;
      this.score         = 0;
    }

    /** Euclidean distance (2D) between two landmark points */
    static dist2D(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

    /** Eye Aspect Ratio */
    calcEAR(lms, idx) {
      const [p0, p1, p2, p3, p4, p5] = idx.map(i => lms[i]);
      return (LivenessAnalyzer.dist2D(p1, p5) + LivenessAnalyzer.dist2D(p2, p4))
           / (2 * LivenessAnalyzer.dist2D(p0, p3) + 1e-6);
    }

    avgEAR(lms) {
      return (this.calcEAR(lms, LANDMARK.R_EYE) + this.calcEAR(lms, LANDMARK.L_EYE)) / 2;
    }

    earThreshold() { return this.earBaseline ? this.earBaseline * 0.78 : 0.20; }

    /** Collect calibration samples; returns baseline when ready or null */
    calibrate(earAvg) {
      const { C } = this;
      this.earSamples.push(earAvg);
      const pct = Math.round((this.earSamples.length / C.earCalibFrames) * 100);
      if (this.earSamples.length >= C.earCalibFrames) {
        const sorted = [...this.earSamples].sort((a, b) => a - b);
        this.earBaseline = sorted[Math.floor(sorted.length / 2)];
        return { done: true, pct: 100, baseline: this.earBaseline };
      }
      return { done: false, pct };
    }

    /** Push EAR value into rolling history */
    recordEAR(earAvg) {
      this.earHistory.push(earAvg);
      if (this.earHistory.length > 60) this.earHistory.shift();
    }

    checkZDepth(lms) {
      const z    = LANDMARK.DEPTH_PTS.map(i => lms[i].z);
      const mean = z.reduce((a, b) => a + b, 0) / z.length;
      const std  = Math.sqrt(z.reduce((a, b) => a + (b - mean) ** 2, 0) / z.length);
      this.zDepthHistory.push(std);
      if (this.zDepthHistory.length > 30) this.zDepthHistory.shift();
      const avg = this.zDepthHistory.reduce((a, b) => a + b, 0) / this.zDepthHistory.length;
      return { pass: avg >= this.C.zDepthMinStd, value: avg };
    }

    checkEARVariance() {
      const h = this.earHistory;
      if (h.length < this.C.earVarFrames) return { pass: true, value: null };
      const mean = h.reduce((a, b) => a + b, 0) / h.length;
      const vari = h.reduce((a, b) => a + (b - mean) ** 2, 0) / h.length;
      return { pass: vari >= this.C.earVarMin, value: vari };
    }

    checkExpressionDelta(expr) {
      if (!expr) return { pass: true, value: null };
      const { C } = this;
      const vec = [expr.neutral, expr.happy, expr.surprised, expr.angry, expr.fearful];
      this.exprHistory.push(vec);
      if (this.exprHistory.length > C.exprDeltaFrames) this.exprHistory.shift();
      if (this.exprHistory.length < 5) return { pass: true, value: null };
      let total = 0;
      for (let i = 1; i < this.exprHistory.length; i++) {
        total += this.exprHistory[i].reduce((s, v, j) => s + Math.abs(v - this.exprHistory[i-1][j]), 0);
      }
      const avg = total / (this.exprHistory.length - 1);
      return { pass: avg >= C.exprDeltaMin, value: avg };
    }

    calcScore(zRes, varRes, exprRes) {
      let score = 0, total = 0;
      if (zRes.value    !== null) { score += Math.min(1, zRes.value    / this.C.zDepthMinStd) * 0.40; total += 0.40; }
      if (varRes.value  !== null) { score += Math.min(1, varRes.value  / this.C.earVarMin)    * 0.30; total += 0.30; }
      if (exprRes.value !== null) { score += Math.min(1, exprRes.value / this.C.exprDeltaMin) * 0.30; total += 0.30; }
      this.score = total > 0 ? score / total : 0.5;
      return this.score;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     9. CHALLENGE MODULE
  ═══════════════════════════════════════════════════════════════ */
  class ChallengeManager {
    constructor(C) {
      this.C               = C;
      this.current         = null;
      this.blinkCount      = 0;
      this.earConsec       = 0;
      this.earWasClosed    = false;
      this.exprDone        = false;
      this._timer          = null;
      this._onTimeout      = null;
    }

    reset() {
      clearTimeout(this._timer);
      this.current      = null;
      this.blinkCount   = 0;
      this.earConsec    = 0;
      this.earWasClosed = false;
      this.exprDone     = false;
      this._timer       = null;
    }

    start(onTimeout) {
      this.reset();
      const all = [CHALLENGE.BLINK, CHALLENGE.SMILE, CHALLENGE.MOUTH_OPEN];
      this.current = all[Math.floor(Math.random() * all.length)];
      this._onTimeout = onTimeout;
      this._timer = setTimeout(() => {
        if (typeof onTimeout === "function") onTimeout(this.current);
      }, this.C.challengeTimeoutMs);
      return this.current;
    }

    clearTimer() { clearTimeout(this._timer); this._timer = null; }

    /** Returns true when a blink challenge is satisfied */
    checkBlink(earAvg, threshold) {
      if (earAvg < threshold) {
        this.earConsec++;
        this.earWasClosed = true;
      } else {
        if (this.earWasClosed && this.earConsec >= 1) this.blinkCount++;
        this.earConsec    = 0;
        this.earWasClosed = false;
      }
      return this.blinkCount >= 1;
    }

    /** Returns true when a smile/mouth_open challenge is satisfied */
    checkExpression(expr) {
      if (!expr || this.exprDone) return false;
      if (this.current === CHALLENGE.SMILE      && expr.happy     > 0.6) return true;
      if (this.current === CHALLENGE.MOUTH_OPEN && expr.surprised > 0.5) return true;
      return false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     10. CAMERA MODULE
  ═══════════════════════════════════════════════════════════════ */
  class CameraManager {
    constructor(C) {
      this.C         = C;
      this.videoEl   = null;
      this._rafId    = null;
      this._mpCamera = null;
      this.warmingUp = true;
      this.sending   = false;
    }

    get isReady() {
      const v = this.videoEl;
      return v != null && v.readyState >= 3 && v.videoWidth > 0 && v.videoHeight > 0
          && v.currentTime > 0 && !v.paused && !v.ended;
    }

    async start(onFrame) {
      const { C } = this;
      this.sending   = false;
      this.warmingUp = true;

      const video = document.createElement("video");
      video.autoplay    = true;
      video.playsInline = true;
      video.muted       = true;
      video.width       = C.videoWidth;
      video.height      = C.videoHeight;
      video.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;";
      document.body.appendChild(video);
      this.videoEl = video;

      if (typeof Camera !== "undefined") {
        this._mpCamera = new Camera(video, {
          onFrame : () => this._sendFrame(onFrame),
          width   : C.videoWidth,
          height  : C.videoHeight,
          facingMode: C.videoFacingMode,
        });
        await this._mpCamera.start();
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: C.videoWidth }, height: { ideal: C.videoHeight }, facingMode: C.videoFacingMode },
          audio: false,
        });
        video.srcObject = stream;
        await new Promise(r => { video.onloadedmetadata = r; });
        await video.play();
        const loop = () => { this._rafId = requestAnimationFrame(loop); this._sendFrame(onFrame); };
        loop();
      }

      await this._waitUntilReady();
      this.warmingUp = false;
    }

    async _waitUntilReady() {
      const { C } = this;
      return new Promise((resolve, reject) => {
        const deadline = Date.now() + C.videoWarmupMs;
        const id = setInterval(() => {
          if (this.isReady)          { clearInterval(id); resolve(); }
          else if (Date.now() > deadline) { clearInterval(id); reject(new Error("Video warmup timeout")); }
        }, C.videoPollMs);
      });
    }

    async _sendFrame(onFrame) {
      if (this.warmingUp || this.sending || !this.isReady) return;
      this.sending = true;
      try   { await onFrame(); }
      catch (e) { /* individual frame errors are non-fatal */ }
      finally   { this.sending = false; }
    }

    stop() {
      this.warmingUp = true;
      this.sending   = true;
      try { if (this._mpCamera) this._mpCamera.stop(); } catch (_) {}
      this._mpCamera = null;
      if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
      if (this.videoEl) {
        if (this.videoEl.srcObject) {
          this.videoEl.srcObject.getTracks().forEach(t => t.stop());
        }
        this.videoEl.remove();
        this.videoEl = null;
      }
      // Allow pending _sendFrame to finish before clearing flag
      setTimeout(() => { this.sending = false; }, 200);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     11. MAIN SDK CLASS
  ═══════════════════════════════════════════════════════════════ */
  class FaceIDSDK {
    /**
     * @param {string|HTMLElement|object} [containerOrOpts]
     * @param {object} [opts]
     */
    constructor(containerOrOpts, opts) {
      // --- Resolve container & options ---
      let containerSel = "#faceIdContainer";
      let options      = {};
      if (containerOrOpts) {
        if (typeof containerOrOpts === "string" || containerOrOpts instanceof HTMLElement) {
          containerSel = containerOrOpts;
          options      = opts || {};
        } else if (typeof containerOrOpts === "object") {
          options = containerOrOpts;
        }
      }
      this._containerSel = containerSel;

      // --- Build CDN paths ---
      this._cdn = buildCdnPaths(options);

      // --- Merge config: DEFAULTS ← window.CFG ← constructor options ---
      this.C = Object.assign(
        {},
        DEFAULTS,
        { loginUrl: `${deriveBasePath()}auth/process_login` },
        window.CFG || {},
        options
      );

      // --- Sub-modules ---
      this._dom       = new DomManager();
      this._liveness  = new LivenessAnalyzer(this.C);
      this._challenge = new ChallengeManager(this.C);
      this._camera    = new CameraManager(this.C);

      // --- SDK state ---
      this._mpInitialized   = false;
      this._faceApiLoaded   = false;
      this._faceMesh        = null;
      this._savedModule     = undefined;
      this._submitting      = false;
      this._liveOk          = false;
      this._lastSnapshot    = null;
      this._faceVisible     = false;
      this._calibDone       = false;
      this._frameCount      = 0;
      this._lastEar         = 0.25;
      this._lastLandmarks   = null;
      this._renderState     = "idle";

      // --- Canvas loop state ---
      this._canvasAnimId  = null;
      this._glowPhase     = 0;
      this._dotPhase      = 0;
      this._scanLineY     = 45;
      this._scanDir       = 1;
      this._dataWipeX     = -70;
      this._successAnimId    = null;
      this._successAnimPhase = 0;
      this._renderer         = null;   // CanvasRenderer — set after mount
    }

    /* ─── i18n helper ─── */
    _t(key, vars = {}) { return interpolate(this.C[key], vars); }

    _log(...args)  { if (this.C.debug) console.info("[FaceIDSDK]", ...args); }
    _warn(...args) { if (this.C.debug) console.warn("[FaceIDSDK]", ...args); }

    /* ─── Mount / Canvas init ─── */
    _mount() {
      this._dom.mountStyle("fid-bundle-style", buildCSS(this.C));
      const container = this._dom.resolveContainer(this._containerSel);
      const oldStage  = document.getElementById("fidStage");
      if (oldStage) oldStage.remove();
      container.insertAdjacentHTML("beforeend", buildHTML(this.C));
      this._dom.invalidate();
    }

    _initCanvas() {
      const canvas = this._dom.get("fidCanvas");
      if (!canvas) return;
      canvas.width  = this.C.size;
      canvas.height = this.C.size;
      const ctx     = canvas.getContext("2d");
      this._renderer = new CanvasRenderer(ctx, this.C);
    }

    /* ─── Canvas loop ─── */
    _renderCanvas() {
      const { _renderer: r, C } = this;
      if (!r) return;
      r.clear();
      this._glowPhase += 0.06;
      this._dotPhase  += 0.028;
      const lms     = this._lastLandmarks;
      const hasFace = lms && lms.length >= 468;

      if (this._renderState !== "idle") r.orbitDots(this._dotPhase * 0.6);

      if (hasFace) {
        const fa = this._renderState === "success" ? 0.25 : 0.9;
        r.faceMesh(lms, C, fa);
        r.eyeGlow(lms, this._glowPhase);
      }

      if (this._renderState === "scanning" || this._renderState === "challenge") {
        const sc = r.sc;
        this._scanLineY += this._scanDir * 2.8 * sc;
        const s = C.size;
        if (this._scanLineY > s - 45*sc) { this._scanLineY = s - 45*sc; this._scanDir = -1; }
        if (this._scanLineY < 45*sc)     { this._scanLineY = 45*sc;     this._scanDir =  1; }
        r.scanLine(this._scanLineY, hasFace ? 0.75 : 0.3);
      }

      if (this._renderState === "calibrating") {
        const sc = r.sc, s = C.size;
        this._dataWipeX += 2.2 * sc;
        if (this._dataWipeX > s - 10*sc) this._dataWipeX = -50 * sc;
        r.dataWipe(this._dataWipeX, 0.6);
      }

      this._canvasAnimId = requestAnimationFrame(() => this._renderCanvas());
    }

    _startCanvasLoop() { if (!this._canvasAnimId) this._renderCanvas(); }
    _stopCanvasLoop() {
      if (this._canvasAnimId) { cancelAnimationFrame(this._canvasAnimId); this._canvasAnimId = null; }
      if (this._renderer) this._renderer.clear();
      this._lastLandmarks = null;
    }

    /* ─── SVG helpers ─── */
    _svgShow(id, opacity = 1, ms = 300) { this._dom.show(id, opacity, ms); }
    _svgHide(id, ms = 200)              { this._dom.hide(id, ms); }

    _startSpinArc() {
      this._dom.setStyle("fidSpinArc",  "animation", "fid-spin-arc 1.5s linear infinite");
      this._dom.setStyle("fidSpinArc",  "transformOrigin", "center");
      this._svgShow("fidSpinArc", 0.75);
      this._dom.setStyle("fidSpinArc2", "animation", "fid-spin-arc-reverse 2.2s linear infinite");
      this._dom.setStyle("fidSpinArc2", "transformOrigin", "center");
      this._svgShow("fidSpinArc2", 0.5, 400);
    }

    _stopSpinArc() {
      for (const id of ["fidSpinArc", "fidSpinArc2"]) {
        this._dom.setAnimation(id, "none");
        this._svgHide(id);
      }
    }

    _pulseOuterRing(active = true, fast = false) {
      const anim = active
        ? (fast ? "fid-pulse-ring-fast 0.7s ease-in-out infinite" : "fid-pulse-ring 2s ease-in-out infinite")
        : "none";
      this._dom.setAnimation("fidOuterRing", anim);
      if (!active) this._dom.setStyle("fidOuterRing", "opacity", "0.2");
    }

    _updateCalibRing(pct) {
      const sc = this.C.size / 280;
      const c  = 2 * Math.PI * 108 * sc;
      const filled = c * (pct / 100);
      this._svgShow("fidCalibRing", 1, 200);
      this._dom.setAttr("fidCalibRing", "stroke-dasharray",
        `${filled.toFixed(1)} ${(c - filled).toFixed(1)}`);
    }

    _hideCalibRing() { this._svgHide("fidCalibRing", 300); }

    _showCorners(color) {
      const strokeColor = color || this.C.colorPrimary;
      const sc          = this.C.size / 280;
      this._svgShow("fidCorners", 1, 200);
      this._dom.queryAll("fidCorners", "polyline").forEach((p, i) => {
        p.setAttribute("stroke", strokeColor);
        p.style.transition       = "none";
        p.style.strokeDashoffset = String(60 * sc);
        setTimeout(() => {
          p.style.transition       = "stroke-dashoffset 0.4s cubic-bezier(.22,.68,0,1.1)";
          p.style.strokeDashoffset = "0";
        }, i * 60);
      });
    }

    _setCornerColor(color) {
      this._dom.queryAll("fidCorners", "polyline").forEach(p => p.setAttribute("stroke", color));
    }

    _showMeshGrid() {
      this._dom.setAnimation("fidMeshGrid", "fid-mesh-flicker 3s ease-in-out infinite");
      this._svgShow("fidMeshGrid", 1, 600);
    }

    _hideMeshGrid() {
      this._dom.setAnimation("fidMeshGrid", "none");
      this._svgHide("fidMeshGrid", 300);
    }

    _showLandmarkDots(opacity = 0.7) {
      this._svgShow("fidDotsGroup", 1, 0);
      this._dom.queryAll("fidDotsGroup", "circle").forEach((d, i) => {
        d.style.opacity    = "0";
        d.style.transition = "none";
        setTimeout(() => {
          d.style.transition = `opacity 0.3s ease ${i * 20}ms`;
          d.style.opacity    = String(parseFloat(d.getAttribute("opacity") || 0.5) * opacity);
        }, 50 + i * 25);
        const delay = (i * 137.5) % 2000;
        d.style.animation = `fid-dot-sparkle ${1.5 + (i % 3) * 0.5}s ease-in-out ${delay}ms infinite`;
      });
    }

    _hideLandmarkDots() {
      this._dom.queryAll("fidDotsGroup", "circle").forEach(d => { d.style.animation = "none"; });
      this._svgHide("fidDotsGroup", 300);
    }

    _hideStaticFaceContour() {
      this._dom.setAnimation("fidFaceGroup", "none");
      this._svgHide("fidFaceGroup", 500);
    }

    _showSuccessAnimation(cb) {
      this._renderState = "success";
      this._stopSpinArc();
      this._hideMeshGrid();

      this._dom.setStyle("fidOuterRing", "stroke", this.C.colorSuccess);
      this._dom.setAnimation("fidOuterRing", "none");
      this._dom.setStyle("fidOuterRing", "opacity", "0.7");
      this._setCornerColor(this.C.colorSuccess);
      this._hideStaticFaceContour();
      this._hideLandmarkDots();

      this._svgShow("fidSuccessMark", 1, 400);
      setTimeout(() => {
        const cp = this._dom.get("fidCheckPoly");
        if (cp) cp.style.animation = "fid-draw-check 0.6s cubic-bezier(.22,.68,0,1.2) forwards";
        const txt = this._dom.get("fidSuccessMark")?.querySelector("text");
        if (txt) { txt.style.transition = "opacity 0.4s ease"; txt.style.opacity = "1"; }
      }, 350);

      this._successAnimPhase = 0;
      const animRipple = () => {
        this._successAnimPhase = Math.min(this._successAnimPhase + 0.015, 1);
        if (this._renderer) {
          this._renderer.clear();
          this._renderer.successOverlay(this._successAnimPhase);
          if (this._lastLandmarks) {
            this._renderer.connections(this._lastLandmarks, LANDMARK.FACE_OVAL, this.C.colorSuccess, 1.2, 0.3);
          }
        }
        if (this._successAnimPhase < 1) this._successAnimId = requestAnimationFrame(animRipple);
      };
      animRipple();

      this._dom.addCls("fidSvg", "state-success");
      setTimeout(() => cb && cb(), 900);
    }

    _showRejectFlash(duration = 600) {
      const el = this._dom.get("fidRejectFlash");
      if (el) {
        el.style.animation = `fid-glitch-flash ${duration}ms ease`;
        this._svgShow("fidRejectFlash", 1, 0);
        setTimeout(() => { el.style.animation = "none"; this._svgHide("fidRejectFlash", 200); }, duration);
      }
      this._dom.addCls("fidSvg", "state-error");
      setTimeout(() => this._dom.removeCls("fidSvg", "state-error"), duration + 300);
    }

    _resetSvgState() {
      this._renderState = "idle";
      this._dom.invalidate();

      const ids = [
        "fidFaceGroup","fidScanBar","fidDotsGroup","fidSuccessMark",
        "fidCorners","fidMeshGrid","fidDataWipe","fidOrbitGroup",
        "fidRejectFlash","fidCalibRing","fidSpinArc","fidSpinArc2",
      ];
      for (const id of ids) {
        const el = this._dom.get(id);
        if (!el) continue;
        el.style.transition = el.style.animation = "none";
        el.style.opacity    = "0";
      }

      const cp = this._dom.get("fidCheckPoly");
      if (cp) { cp.style.animation = "none"; cp.style.strokeDashoffset = String(46 * (this.C.size / 280)); }

      this._dom.setAnimation("fidOuterRing", "none");
      this._dom.setStyle("fidOuterRing", "opacity", "0.2");
      this._dom.setStyle("fidOuterRing", "stroke", this.C.colorPrimary);

      this._dom.removeCls("fidSvg", "state-success");
      this._dom.removeCls("fidSvg", "state-error");
      this._hideChallengeUi();

      if (this._successAnimId) { cancelAnimationFrame(this._successAnimId); this._successAnimId = null; }

      const sc = this.C.size / 280;
      setTimeout(() => {
        this._dom.queryAll("fidCorners", "polyline").forEach(p => {
          p.style.transition       = "none";
          p.style.strokeDashoffset = String(60 * sc);
          p.setAttribute("stroke", this.C.colorPrimary);
        });
      }, 0);
    }

    /* ─── Challenge UI ─── */
    _showChallengeUi(text, icon, cls = "") {
      const badge = this._dom.get("fidChallengeBadge");
      if (!badge) return;
      const ctxt  = this._dom.get("fidChallengeText");
      const cicon = this._dom.get("fidChallengeIcon");
      if (ctxt)  ctxt.textContent  = text;
      if (cicon) cicon.textContent = icon;
      badge.className = "visible " + cls;
    }

    _hideChallengeUi() {
      const b = this._dom.get("fidChallengeBadge");
      if (b) b.className = "";
    }

    /* ─── Status / Error / Greeting ─── */
    _setStatus(html, color = "#6c757d", icon = "") {
      const txtEl  = this._dom.get("fidStatusText");
      const iconEl = this._dom.get("fidStatusIcon");
      const mainEl = this._dom.get("fidStatus");
      if (txtEl)       { txtEl.innerHTML = html;  txtEl.style.color  = color; }
      else if (mainEl) { mainEl.innerHTML = html; }
      if (iconEl) iconEl.textContent = icon;
      if (mainEl) mainEl.style.color = color;
    }

    _showErr(msg) {
      const el = this._dom.get("formErrors");
      if (!el) return;
      el.innerHTML     = `<div class="alert alert-danger py-2 mb-2">${msg}</div>`;
      el.style.display = "block";
    }

    _clearErr() {
      const el = this._dom.get("formErrors");
      if (el) { el.innerHTML = ""; el.style.display = "none"; }
    }

    _setGreeting(html) {
      const el = this._dom.get("greeting");
      if (el) el.innerHTML = html;
    }

    /* ─── Score ring ─── */
    _updateScoreRing(score) {
      const el = this._dom.get("fidScoreRing");
      if (!el) return;
      const sc   = this.C.size / 280;
      const pct  = clamp(score, 0, 1);
      const circ = 2 * Math.PI * 108 * sc;
      el.setAttribute("stroke-dasharray", `${circ * pct} ${circ * (1 - pct)}`);
      const { C } = this;
      if      (pct >= C.livenessScoreMin) el.setAttribute("stroke", C.colorSuccess);
      else if (pct >= 0.3)               el.setAttribute("stroke", C.colorWarning);
      else                               el.setAttribute("stroke", C.colorDanger);
    }

    /* ─── Dependency loading ─── */

    /**
     * Backup window.Module (Emscripten WASM conflict prevention),
     * then load camera_utils → face_mesh → await FaceMesh global.
     */
    async _loadDeps() {
      // Backup & clear window.Module to prevent Emscripten conflicts
      this._savedModule = window.Module;
      window.Module     = {};
      this._log("window.Module backed up");

      await loadScriptOnce(this._cdn.CAM_UTILS_SRC);
      this._log("camera_utils.js loaded");

      // Camera global is optional in some MediaPipe versions
      await waitForGlobal("Camera", this.C.cameraTimeoutMs, this.C.globalPollIntervalMs)
        .catch(() => this._warn("Camera global not available — continuing"));

      await loadScriptOnce(this._cdn.FACE_MESH_SRC);
      this._log("face_mesh.js loaded");

      await waitForGlobal("FaceMesh", this.C.globalTimeoutMs, this.C.globalPollIntervalMs);
      this._log("window.FaceMesh available ✓");
    }

    /**
     * Initialize MediaPipe FaceMesh with one retry on failure.
     * Restores window.Module after WASM initialization.
     */
    async _initMediaPipe() {
      const FM = window.FaceMesh;
      if (!FM) throw new Error("MediaPipe FaceMesh not found after script load.");

      if (this._mpInitialized && this._faceMesh) {
        this._log("MediaPipe already initialized — skipping");
        return;
      }

      if (this._faceMesh) {
        try { this._faceMesh.close(); } catch (_) {}
        this._faceMesh = null;
      }

      const tryInit = async (attempt) => {
        this._log(`MediaPipe init attempt ${attempt}…`);
        const fm = new FM({ locateFile: f => `${this._cdn.MP_CDN_BASE}/${f}` });
        fm.setOptions({
          maxNumFaces             : 1,
          refineLandmarks         : true,
          minDetectionConfidence  : 0.5,
          minTrackingConfidence   : 0.5,
        });
        fm.onResults(r => this._onResults(r));
        await fm.initialize(); // WASM accesses window.Module here
        return fm;
      };

      let lastErr = null;

      try {
        this._faceMesh = await tryInit(1);
        this._log("FaceMesh initialized ✓");
      } catch (e1) {
        lastErr = e1;
        this._warn(`Attempt 1 failed: ${e1.message} — retrying in ${this.C.mediaPipeRetryDelayMs}ms`);
        await new Promise(r => setTimeout(r, this.C.mediaPipeRetryDelayMs));
        try {
          this._faceMesh = await tryInit(2);
          this._log("FaceMesh initialized on retry ✓");
          lastErr = null;
        } catch (e2) {
          lastErr = e2;
        }
      }

      // Restore window.Module — WASM is done with it
      if (this._savedModule !== undefined) {
        window.Module     = this._savedModule;
        this._savedModule = undefined;
        this._log("window.Module restored");
      } else {
        delete window.Module;
      }

      if (lastErr) throw new Error(`FaceMesh init failed after 2 attempts: ${lastErr.message}`);
    }

    async _loadFaceApiScript() {
      if (typeof faceapi !== "undefined") return;
      await loadScriptOnce(this._cdn.FACEAPI_CDN);
      await waitForGlobal("faceapi", this.C.faceApiTimeoutMs, this.C.globalPollIntervalMs);
    }

    async _initFaceApi() {
      if (this._faceApiLoaded) return;
      await this._loadFaceApiScript();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(this._cdn.FACEAPI_MODELS),
        faceapi.nets.faceExpressionNet.loadFromUri(this._cdn.FACEAPI_MODELS),
      ]);
      this._faceApiLoaded = true;
      this._log("face-api models loaded ✓");
    }

    /* ─── Camera frame dispatch ─── */
    async _sendFrame() {
      if (!this._faceMesh || !this._camera.isReady) return;
      try { await this._faceMesh.send({ image: this._camera.videoEl }); }
      catch (e) { this._warn("faceMesh.send error:", e?.message || e); }
    }

    /* ─── face-api expression check ─── */
    async _runFaceApiCheck() {
      if (!this._faceApiLoaded || !this._camera.videoEl || this._camera.videoEl.readyState < 2) return null;
      try {
        const det = await faceapi
          .detectSingleFace(this._camera.videoEl, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
          .withFaceExpressions();
        return det ? det.expressions : null;
      } catch { return null; }
    }

    /* ─── Capture JPEG ─── */
    _captureJpeg(boost = false) {
      const v = this._camera.videoEl;
      if (!v || v.readyState < 2) return null;
      const w = v.videoWidth  || this.C.videoWidth;
      const h = v.videoHeight || this.C.videoHeight;
      if (!this._capCanvas) {
        this._capCanvas       = document.createElement("canvas");
        this._capCanvas.width = w;
        this._capCanvas.height= h;
        this._capCtx          = this._capCanvas.getContext("2d");
      }
      this._capCtx.filter = boost ? "brightness(1.4) contrast(1.15)" : "none";
      this._capCtx.drawImage(v, 0, 0, w, h);
      return this._capCanvas.toDataURL("image/jpeg", this.C.jpegQuality);
    }

    /* ─── Full state reset ─── */
    _resetState() {
      this._submitting    = false;
      this._liveOk        = false;
      this._lastSnapshot  = null;
      this._faceVisible   = false;
      this._calibDone     = false;
      this._frameCount    = 0;
      this._lastEar       = 0.25;
      this._lastLandmarks = null;
      this._capCanvas     = null;
      this._capCtx        = null;

      const sc = this.C.size / 280;
      this._scanLineY  = 45 * sc;
      this._scanDir    = 1;
      this._dataWipeX  = -70 * sc;

      this._liveness.reset();
      this._challenge.reset();
      this._updateScoreRing(0);
      this._resetSvgState();
      this._clearErr();
      this._setStatus("", "#6c757d", "");
    }

    /* ─── Challenge flow ─── */
    _startChallenge() {
      const type = this._challenge.start((_type) => {
        if (!this._liveOk) {
          this._setStatus(this._t("txtChallengeTimeout"), "#dc3545", "⏱");
          this._showChallengeUi(this._t("txtChallengeRetry"), "⏱", "challenge-danger");
          setTimeout(() => { if (!this._liveOk) this._startChallenge(); }, 1500);
        }
      });

      const CHALLENGE_MAP = {
        [CHALLENGE.BLINK]      : { text: this._t("txtBlink"),      icon: "👁",  color: "#0d6efd" },
        [CHALLENGE.SMILE]      : { text: this._t("txtSmile"),      icon: "😊", color: "#0d6efd" },
        [CHALLENGE.MOUTH_OPEN] : { text: this._t("txtMouthOpen"),  icon: "😮", color: "#0d6efd" },
      };
      const m = CHALLENGE_MAP[type] || { text: this._t("txtFollowInstr"), icon: "ℹ️", color: "#0d6efd" };

      this._setStatus(m.text, m.color, m.icon);
      this._showChallengeUi(m.text, m.icon);
      this._pulseOuterRing(true, true);
      this._renderState = "challenge";
      this._log("Challenge started:", type);
    }

    /* ─── Submit ─── */
    // async _submitLogin() {
    //   if (this._submitting || !this._lastSnapshot) return;

    //   if (this.C.onLivenessPass && !this.C.loginUrl) {
    //     this.C.onLivenessPass(this._liveness.score, this._lastSnapshot);
    //     return;
    //   }

    //   this._submitting = true;
    //   const username   = (document.getElementById("username") || { value: "" }).value.trim().toLowerCase();
    //   const payload    = {
    //     image             : this._lastSnapshot,
    //     skip_liveness     : true,
    //     js_liveness_score : parseFloat(this._liveness.score.toFixed(4)),
    //     ...(username && { username }),
    //   };

    //   try {
    //     const res  = await fetch(this.C.loginUrl, {
    //       method  : "POST",
    //       headers : { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
    //       body    : JSON.stringify(payload),
    //     });
    //     if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    //     const json = await res.json();
    //     if (json.csrf) {
    //       document.querySelector(`input[name="${json.csrf.name}"]`)?.setAttribute("value", json.csrf.hash);
    //     }
    //     this._handleResult(json);
    //   } catch (err) {
    //     this._submitting = false;
    //     this._resetSvgState();
    //     this._showErr(`${this._t("txtConnFail")}: ${escHtml(err.message)}`);
    //     this._setStatus(this._t("txtConnRetry"), "#dc3545", "✗");
    //     if (this.C.onError) this.C.onError(err.message);
    //   }
    // }

    async _submitLogin() {
      if (this._submitting || !this._lastSnapshot) return;

      // Custom liveness callback (no server)
      if (this.C.onLivenessPass && !this.C.loginUrl) {
        this.C.onLivenessPass(this._liveness.score, this._lastSnapshot);
        return;
      }

      this._submitting = true;
      const username   = (document.getElementById("username") || { value: "" }).value.trim().toLowerCase();
      const payload    = {
        image             : this._lastSnapshot,
        skip_liveness     : true,
        js_liveness_score : parseFloat(this._liveness.score.toFixed(4)),
        ...(username && { username }),
      };

      try {
        const res  = await fetch(this.C.loginUrl, {
          method  : "POST",
          headers : { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body    : JSON.stringify(payload),
        });
        // Baca JSON terlebih dahulu — server bisa mengembalikan HTTP 4xx/5xx
        // dengan body JSON berisi pesan bisnis yang valid (bukan crash sungguhan).
        let json;
        try {
          json = await res.json();
        } catch (_) {
          // Hanya throw jika response bukan JSON sama sekali (network error, dll)
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        // Update CSRF token if provided
        if (json.csrf) {
          document.querySelector(`input[name="${json.csrf.name}"]`)?.setAttribute("value", json.csrf.hash);
        }
        this._handleResult(json);
      } catch (err) {
        this._submitting = false;
        this._resetSvgState();
        this._showErr(`${this._t("txtConnFail")}: ${escHtml(err.message)}`);
        this._setStatus(this._t("txtConnRetry"), "#dc3545", "✗");
        if (this.C.onError) this.C.onError(err.message);
      }
    }

    _buildResultDetail(d) {
      if (!d || typeof d !== "object") return "";
      const parts = [];
      if (d.confidence        != null) parts.push(`Confidence: <b>${d.confidence}%</b>`);
      if (d.texture_score     != null) parts.push(`Anti-spoof: ${d.texture_score}`);
      if (d.js_liveness_score != null) parts.push(`JS score: ${d.js_liveness_score}`);
      return parts.length ? `<br><small class="text-muted">${parts.join(" · ")}</small>` : "";
    }

    _handleResult(json) {
      if (json.status) {
        const d = json.data || {};
        this._camera.stop();
        this._setGreeting(`Halo, ${d.full_name || d.username}! 👋`);
        this._setStatus(this._t("txtLoginOk"), "#198754", "✓");
        if (typeof showToast === "function") showToast({ title: "Berhasil", message: json.message, type: "success" });
        if (this.C.onSuccess) this.C.onSuccess(d);
        const url = (window.LOGIN_CONFIG && window.LOGIN_CONFIG.dashboardUrl) || d.redirect || "/dashboard";
        setTimeout(() => { window.location.href = url; }, 900);
        return;
      }

      // Login failed — reset liveness state but keep camera running
      this._submitting = false;
      this._liveOk     = false;
      this._liveness.reset();
      this._calibDone  = false;
      this._faceVisible= false;
      this._updateScoreRing(0);
      this._resetSvgState();

      const msg = json.message || "Verifikasi gagal.";
      this._showErr(`<strong>${escHtml(msg)}</strong>${this._buildResultDetail(json.data)}`);
      this._setStatus(this._t("txtLoginFail"), "#dc3545", "✗");
      this._showRejectFlash(800);
      if (typeof showToast === "function") showToast({ title: "Gagal", message: msg, type: "danger" });
      if (this.C.onError) this.C.onError(msg, json.data);

      setTimeout(() => {
        if (this._camera.videoEl) {
          this._showCorners();
          this._startSpinArc();
          this._startChallenge();
        }
      }, 2000);
    }

    /* ─── MediaPipe onResults ─── */
    async _onResults(results) {
      if (this._submitting || this._liveOk) return;
      this._frameCount++;
      this._lastSnapshot = this._captureJpeg(this.C.brightnessBoost);

      if (!results.multiFaceLandmarks?.length) {
        this._lastLandmarks = null;
        if (this._faceVisible) {
          this._faceVisible = false;
          this._hideStaticFaceContour();
          this._hideLandmarkDots();
        }
        this._setStatus(this._t("txtPositionFace"), "#6c757d", "📷");
        this._hideChallengeUi();
        return;
      }

      const lms = results.multiFaceLandmarks[0];
      this._lastLandmarks = lms;

      if (!this._faceVisible) {
        this._faceVisible = true;
        this._showCorners();
        this._showLandmarkDots(0.9);
        if (this._calibDone) this._renderState = "scanning";
      }

      const earAvg   = this._liveness.avgEAR(lms);
      this._lastEar  = earAvg;

      // ── Calibration phase ──
      if (this._liveness.earBaseline === null) {
        const calib = this._liveness.calibrate(earAvg);
        this._setStatus(this._t("txtCalibrating", { pct: calib.pct }), "#6c757d", "⚙️");
        this._renderState = "calibrating";
        this._updateCalibRing(calib.pct);
        this._startSpinArc();
        this._pulseOuterRing(true);
        this._showMeshGrid();

        if (calib.done) {
          this._calibDone = true;
          this._stopSpinArc();
          this._hideCalibRing();
          this._hideMeshGrid();
          this._pulseOuterRing(false);
          this._renderState = "scanning";
          this._log(`EAR baseline = ${calib.baseline.toFixed(3)}`);
          this._setStatus(this._t("txtReady"), "#0d6efd", "✅");
          this._startChallenge();
        }
        return;
      }

      // ── Liveness checks ──
      this._liveness.recordEAR(earAvg);
      const zRes   = this._liveness.checkZDepth(lms);
      const varRes = this._liveness.checkEARVariance();

      let exprRes = { pass: true, value: null }, expr = null;
      if (this._faceApiLoaded && this._frameCount % 5 === 0) {
        expr    = await this._runFaceApiCheck();
        exprRes = this._liveness.checkExpressionDelta(expr);
      }

      const score = this._liveness.calcScore(zRes, varRes, exprRes);
      this._updateScoreRing(score);

      // 2D spoof detection
      if (this._liveness.zDepthHistory.length >= 20 && !zRes.pass) {
        this._setStatus(this._t("txtSpoof2d"), "#dc3545", "⚠️");
        this._setCornerColor(this.C.colorDanger);
        this._showRejectFlash(400);
        return;
      }
      this._setCornerColor(this.C.colorPrimary);

      // ── Challenge evaluation ──
      const thresh = this._liveness.earThreshold();
      const ch     = this._challenge;

      if (ch.current === CHALLENGE.BLINK) {
        if (ch.checkBlink(earAvg, thresh)) this._onChallengeComplete();
      } else if (ch.current === CHALLENGE.SMILE || ch.current === CHALLENGE.MOUTH_OPEN) {
        if (expr && ch.checkExpression(expr)) {
          ch.exprDone = true;
          this._onChallengeComplete();
        }
      }
    }

    /* ─── Challenge complete ─── */
    _onChallengeComplete() {
      this._challenge.clearTimer();
      this._hideChallengeUi();

      if (this._liveness.score < this.C.livenessScoreMin) {
        this._setStatus(this._t("txtLowLiveness"), "#dc3545", "⚠️");
        this._showChallengeUi(this._t("txtLowLivenessRetry"), "⚠️", "challenge-warn");
        this._setCornerColor(this.C.colorWarning);
        setTimeout(() => { if (!this._liveOk) this._startChallenge(); }, 2000);
        return;
      }

      this._liveOk = true;
      this._setStatus(this._t("txtVerified"), "#198754", "✓");
      this._clearErr();
      this._showSuccessAnimation(() => this._submitLogin());
    }

    /* ═══════════════════════════════════════
       PUBLIC API
    ═══════════════════════════════════════ */

    async init() {
      this._mount();
      this._resetState();
      this._initCanvas();
      this._setStatus(this._t("txtLoading"), "#6c757d", "⏳");
      this._startSpinArc();
      this._startCanvasLoop();
      this._renderState = "calibrating";

      try {
        this._setStatus(this._t("txtLoadingMediaPipe"), "#6c757d", "⏳");
        await this._loadDeps();

        this._setStatus(this._t("txtInitModel"), "#6c757d", "⚙️");
        const needMP = !this._mpInitialized || !this._faceMesh;
        await Promise.all([
          needMP ? this._initMediaPipe() : Promise.resolve(),
          this._initFaceApi(),
        ]);
        this._mpInitialized = true;

        this._setStatus(this._t("txtOpenCamera"), "#6c757d", "📸");
        await this._camera.start(() => this._sendFrame());

        this._setStatus(this._t("txtPointFace"), "#6c757d", "📷");
        this._pulseOuterRing(true);
        if (this.C.onReady) this.C.onReady();

      } catch (e) {
        this._stopSpinArc();
        const short = e.message ? e.message.split("\n")[0].slice(0, 120) : String(e);
        this._showErr(`${escHtml(this._t("txtInitFail"))}: ${escHtml(short)}`);
        this._setStatus(this._t("txtRefreshPage"), "#dc3545", "✗");
        this._renderState   = "idle";
        this._mpInitialized = false;
        this._faceMesh      = null;
        this._log("init error:", e);
        if (this.C.onError) this.C.onError(short);
      }
    }

    stop() {
      this._camera.stop();
      this._resetState();
      this._stopCanvasLoop();
    }

    async restart() {
      this.stop();
      await this.init();
    }

    /** Update config options at runtime (does not trigger re-mount) */
    configure(opts = {}) {
      Object.assign(this.C, opts);
      // Propagate to sub-modules
      this._liveness.C  = this.C;
      this._challenge.C = this.C;
      this._camera.C    = this.C;
      if (this._renderer) this._renderer.C = this.C;
      return this;
    }

    /** Read-only snapshot of current SDK state */
    get state() {
      return Object.freeze({
        renderState   : this._renderState,
        faceVisible   : this._faceVisible,
        calibDone     : this._calibDone,
        livenessScore : this._liveness.score,
        challenge     : this._challenge.current,
        liveOk        : this._liveOk,
      });
    }

    /** Last captured JPEG data URL */
    get snapshot() { return this._lastSnapshot; }
  }

  /* ═══════════════════════════════════════════════════════════════
     12. BACKWARD-COMPATIBLE AUTO-INIT
  ═══════════════════════════════════════════════════════════════ */
  function autoInit() {
    if (document.getElementById("faceIdContainer") || document.getElementById("fidSvg")) {
      const inst        = new FaceIDSDK("#faceIdContainer");
      window.initFaceId = () => inst.init();
      window.stopFaceId = () => inst.stop();
      inst.init();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }

  window.FaceIDSDK = FaceIDSDK;
  return FaceIDSDK;
});