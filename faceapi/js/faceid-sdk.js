(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else if (typeof define === "function" && define.amd) define(factory);
  else root.FaceIDSDK = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ═══════════════════════════════════════
     LANDMARK CONSTANTS
  ═══════════════════════════════════════ */
  const R_EYE     = [33,  159, 158, 133, 153, 145];
  const L_EYE     = [362, 380, 374, 263, 386, 385];
  const DEPTH_PTS = [1, 234, 454, 152, 10, 4, 263, 33, 287, 57];
  const CHALLENGE = { BLINK:"blink", SMILE:"smile", MOUTH_OPEN:"mouth_open" };

  const FACE_OVAL      = [10,338,338,297,297,332,332,284,284,251,251,389,389,356,356,454,454,323,323,361,361,288,288,397,397,365,365,379,379,378,378,400,400,377,377,152,152,148,148,176,176,149,149,150,150,136,136,172,172,58,58,132,132,93,93,234,234,127,127,162,162,21,21,54,54,103,103,67,67,109,109,10];
  const LEFT_EYE_CONN  = [263,249,249,390,390,373,373,374,374,380,380,381,381,382,382,362,263,466,466,388,388,387,387,386,386,385,385,384,384,398,398,362];
  const RIGHT_EYE_CONN = [33,7,7,163,163,144,144,145,145,153,153,154,154,155,155,133,33,246,246,161,161,160,160,159,159,158,158,157,157,173,173,133];
  const LEFT_EYEBROW   = [276,283,283,282,282,295,295,285,300,293,293,334,334,296,296,336];
  const RIGHT_EYEBROW  = [46,53,53,52,52,65,65,55,70,63,63,105,105,66,66,107];
  const NOSE_CONN      = [168,6,6,197,197,195,195,5,5,4,4,1,1,19,19,94,94,2,98,97,97,2,2,326,326,327,327,294,98,240,240,99,99,60,294,455,455,439,439,290];
  const LIPS_CONN      = [61,146,146,91,91,181,181,84,84,17,17,314,314,405,405,321,321,375,375,291,61,185,185,40,40,39,39,37,37,0,0,267,267,269,269,270,270,409,409,291,78,95,95,88,88,178,178,87,87,14,14,317,317,402,402,318,318,324,324,308,78,191,191,80,80,81,81,82,82,13,13,312,312,311,311,310,310,415,415,308];
  const IRISES         = [474,475,475,476,476,477,477,474,469,470,470,471,471,472,472,469];

  const ORBIT_DOTS = [
    { offset:0,             size:3,   color:"#378ADD", colorFade:"rgba(55,138,221,0)",  alpha:0.75 },
    { offset:Math.PI*0.67,  size:2.2, color:"#5BAFFF", colorFade:"rgba(91,175,255,0)",  alpha:0.65 },
    { offset:Math.PI*1.33,  size:1.8, color:"#9DD8FF", colorFade:"rgba(157,216,255,0)", alpha:0.55 },
  ];

  /* ═══════════════════════════════════════
     CONFIG DEFAULTS
  ═══════════════════════════════════════ */
  const DEFAULTS = {
    /* Ukuran widget */
    size               : 280,   // lebar & tinggi widget (px)

    /* Warna utama (CSS color string) */
    colorPrimary       : "#378ADD",
    colorPrimaryLight  : "#5BAFFF",
    colorPrimaryLighter: "#9DD8FF",
    colorSuccess       : "#1D9E75",
    colorSuccessLight  : "#0ED99B",
    colorWarning       : "#BA7517",
    colorDanger        : "#E24B4A",

    /* Teks UI */
    txtLoading         : "Memuat model…",
    txtCalibrating     : "Kalibrasi… {pct}%",
    txtReady           : "Siap — ikuti instruksi berikut",
    txtPointFace       : "Arahkan wajah ke kamera",
    txtPositionFace    : "Posisikan wajah di depan kamera…",
    txtSpoof2d         : "Terdeteksi media 2D — gunakan wajah asli",
    txtChallengeTimeout: "Waktu habis! Tantangan diulang…",
    txtChallengeRetry  : "Waktu habis, ulangi lagi",
    txtLowLiveness     : "Skor liveness rendah — ulangi tantangan",
    txtLowLivenessRetry: "Ulangi — skor terlalu rendah",
    txtVerified        : "Verifikasi berhasil, memproses…",
    txtLoginOk         : "Login berhasil, mengalihkan…",
    txtLoginFail       : "Gagal — mencoba ulang…",
    txtConnFail        : "Koneksi ke server gagal",
    txtInitFail        : "Gagal inisialisasi",
    txtRefreshPage     : "Gagal memuat. Refresh halaman.",
    txtFollowInstr     : "Ikuti instruksi",
    txtConnRetry       : "Koneksi gagal, coba lagi",
    txtBlink           : "Kedipkan mata sekali",
    txtSmile           : "Tersenyumlah sebentar",
    txtMouthOpen       : "Buka mulut sebentar",
    txtVerifiedBadge   : "VERIFIED",

    /* Liveness thresholds */
    zDepthMinStd       : 0.020,
    earVarMin          : 0.0006,
    earVarFrames       : 40,
    exprDeltaMin       : 0.015,
    exprDeltaFrames    : 20,
    challengeTimeoutMs : 15000,
    livenessScoreMin   : 0.55,

    /* Misc */
    brightnessBoost    : true,
    debug              : false,
    loginUrl           : null,   // akan di-set di constructor dari pathArray

    /* Callbacks */
    onReady            : null,
    onSuccess          : null,
    onError            : null,
    onLivenessPass     : null,
  };

  /* ─── CSS builder (dinamis berdasarkan size & warna) ─── */
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
@keyframes fid-badge-pulse       { 0%,100%{opacity:1;transform:scale(1)}    50%{opacity:.8;transform:scale(1.02)} }
@keyframes fid-scan-v            { 0%{transform:translateY(-90px);opacity:.9}100%{transform:translateY(90px);opacity:.25} }
@keyframes fid-pulse-ring        { 0%,100%{opacity:.15} 50%{opacity:.5} }
@keyframes fid-pulse-ring-fast   { 0%,100%{opacity:.2}  50%{opacity:.75} }
@keyframes fid-spin-arc          { from{stroke-dashoffset:0} to{stroke-dashoffset:-282} }
@keyframes fid-spin-arc-reverse  { from{stroke-dashoffset:0} to{stroke-dashoffset:282} }
@keyframes fid-face-in           { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
@keyframes fid-draw-check        { from{stroke-dashoffset:46} to{stroke-dashoffset:0} }
@keyframes fid-glitch-flash      { 0%,100%{opacity:1} 25%{opacity:.3} 50%{opacity:1} 75%{opacity:.5} }
@keyframes fid-dot-sparkle       { 0%,100%{opacity:.35} 50%{opacity:.9} }
@keyframes fid-mesh-flicker      { 0%,100%{opacity:.18} 50%{opacity:.38} }
@keyframes fid-face-breathe      { 0%,100%{transform:scale(1)} 50%{transform:scale(1.018)} }
`;
  }

  /* ─── HTML/SVG builder (dinamis: size & warna) ─── */
  function buildHTML(C) {
    const s   = C.size;
    const h   = s / 2;           // half-size → viewBox offset
    const sc  = s / 280;         // scale factor vs baseline 280
    const cp  = C.colorPrimary;
    const cpl = C.colorPrimaryLight;
    const cs  = C.colorSuccess;
    const csl = C.colorSuccessLight;
    const cd  = C.colorDanger;

    /* Semua koordinat SVG di-scale dari baseline 280px */
    const v = (n) => (n * sc).toFixed(3);   // scaled value
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
      <line x1="${v(-65)}" y1="${v(-65)}" x2="${v(65)}" y2="${v(-65)}" stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
      <line x1="${v(-65)}" y1="${v(-45)}" x2="${v(65)}" y2="${v(-45)}" stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
      <line x1="${v(-65)}" y1="${v(-25)}" x2="${v(65)}" y2="${v(-25)}" stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
      <line x1="${v(-65)}" y1="${v(-5)}"  x2="${v(65)}" y2="${v(-5)}"  stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
      <line x1="${v(-65)}" y1="${v(15)}"  x2="${v(65)}" y2="${v(15)}"  stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
      <line x1="${v(-65)}" y1="${v(35)}"  x2="${v(65)}" y2="${v(35)}"  stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
      <line x1="${v(-65)}" y1="${v(55)}"  x2="${v(65)}" y2="${v(55)}"  stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
      <line x1="${v(-55)}" y1="${v(-84)}" x2="${v(-55)}" y2="${v(74)}" stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
      <line x1="${v(-35)}" y1="${v(-84)}" x2="${v(-35)}" y2="${v(74)}" stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
      <line x1="${v(-15)}" y1="${v(-84)}" x2="${v(-15)}" y2="${v(74)}" stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
      <line x1="${v(5)}"   y1="${v(-84)}" x2="${v(5)}"   y2="${v(74)}" stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
      <line x1="${v(25)}"  y1="${v(-84)}" x2="${v(25)}"  y2="${v(74)}" stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
      <line x1="${v(45)}"  y1="${v(-84)}" x2="${v(45)}"  y2="${v(74)}" stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
      <line x1="${v(65)}"  y1="${v(-84)}" x2="${v(65)}"  y2="${v(74)}" stroke="${cp}" stroke-width="${v(0.3)}" opacity="0.3"/>
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
      <path d="M${v(-62)},${v(-20)} Q${v(-70)},${v(-12)} ${v(-70)},0 Q${v(-70)},${v(12)} ${v(-62)},${v(18)}" fill="none" stroke="${cp}" stroke-width="${v(0.8)}" opacity="0.3"/>
      <path d="M${v(62)},${v(-20)} Q${v(70)},${v(-12)} ${v(70)},0 Q${v(70)},${v(12)} ${v(62)},${v(18)}"      fill="none" stroke="${cp}" stroke-width="${v(0.8)}" opacity="0.3"/>
      <path d="M${v(-55)},${v(-42)} Q${v(-68)},${v(-8)} ${v(-64)},${v(28)}" fill="none" stroke="${cp}" stroke-width="${v(0.7)}" opacity="0.22"/>
      <path d="M${v(55)},${v(-42)} Q${v(68)},${v(-8)} ${v(64)},${v(28)}"    fill="none" stroke="${cp}" stroke-width="${v(0.7)}" opacity="0.22"/>
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

  /* ═══════════════════════════════════════
     MAIN CLASS
  ═══════════════════════════════════════ */
  class FaceIDSDK {
    /**
     * @param {string|HTMLElement|object} [containerOrOpts]
     * @param {object} [opts]
     */
    constructor(containerOrOpts, opts) {
      let containerSel = "#faceIdContainer";
      let options = {};
      if (containerOrOpts) {
        if (typeof containerOrOpts === "string" || containerOrOpts instanceof HTMLElement) {
          containerSel = containerOrOpts;
          options = opts || {};
        } else if (typeof containerOrOpts === "object") {
          options = containerOrOpts;
        }
      }
      this._containerSel = containerSel;

      /* Build loginUrl default */
      const pa   = window.location.pathname.split("/");
      const base = window.location.origin + "/" + pa[1] + "/" + pa[2] + "/";

      /* CDN paths (identik dengan aslinya) */
      const DEFAULT_BASE    = "https://hasbi-assidiqqi.github.io/face_recognition/faceapi";
    //   const DEFAULT_BASE    = "assets/vendor/libs/faceapi";
      const LIB             = window.LIB_URL || {};
      const REDIRECT        = (typeof window.d !== "undefined" && window.d && window.d.redirect) ? window.d.redirect : null;
      const pick            = (a, b) => a || REDIRECT || b;

      this._MP_CDN_BASE    = pick(LIB.faceApi,       `${DEFAULT_BASE}/js`);
      this._CAM_UTILS_SRC  = pick(LIB.cameraUtils,   `${DEFAULT_BASE}/js/camera_utils.js`);
      this._FACE_MESH_SRC  = pick(LIB.faceMesh,      `${DEFAULT_BASE}/js/face_mesh.js`);
      this._FACEAPI_CDN    = pick(LIB.faceApiMin,    `${DEFAULT_BASE}/js/face-api.min.js`);
      this._FACEAPI_MODELS = pick(LIB.faceApiModels, `${DEFAULT_BASE}/weights`);

      /* Merge: DEFAULTS ← window.CFG ← constructor options */
      this.C = Object.assign(
        {},
        DEFAULTS,
        { loginUrl: base + "/auth/process_login" },
        window.CFG || {},
        options
      );

      /* Override CDN dari options jika ada */
      if (options.cdnBase)    this._MP_CDN_BASE    = options.cdnBase;
      if (options.cameraUtils)this._CAM_UTILS_SRC  = options.cameraUtils;
      if (options.faceMeshSrc)this._FACE_MESH_SRC  = options.faceMeshSrc;
      if (options.faceApiSrc) this._FACEAPI_CDN    = options.faceApiSrc;
      if (options.faceApiModels) this._FACEAPI_MODELS = options.faceApiModels;

      /* State */
      this._mpInitialized     = false;
      this._faceApiLoaded     = false;
      this._submitting        = false;
      this._liveOk            = false;
      this._lastSnapshot      = null;
      this._videoEl           = null;
      this._faceMesh          = null;
      this._mpCamera          = null;
      this._rafId             = null;
      this._capCanvas         = null;
      this._capCtx            = null;
      this._earHistory        = [];
      this._earBaseline       = null;
      this._earSamples        = [];
      this._blinkCount        = 0;
      this._earConsec         = 0;
      this._earWasClosed      = false;
      this._zDepthHistory     = [];
      this._exprHistory       = [];
      this._exprDeltaPass     = false;
      this._challengeExprDone = false;
      this._currentChallenge  = null;
      this._challengeTimer    = null;
      this._livenessScore     = 0;
      this._frameCount        = 0;
      this._fidCanvas         = null;
      this._fidCtx            = null;
      this._lastLandmarks     = null;
      this._canvasAnimId      = null;
      this._scanLineY         = 45;
      this._scanDir           = 1;
      this._dataWipeX         = -70;
      this._glowPhase         = 0;
      this._dotPhase          = 0;
      this._renderState       = "idle";
      this._lastEar           = 0.25;
      this._faceVisible       = false;
      this._calibDone         = false;
      this._successAnimPhase  = 0;
      this._successAnimId     = null;
      this._isSending         = false;
      this._warmingUp         = true;
      this.__dom              = {};
    }

    /* ─── helpers ─── */
    _gid(id) { return document.getElementById(id); }
    _dom(id) { return this.__dom[id] !== undefined ? this.__dom[id] : (this.__dom[id] = this._gid(id)); }
    _t(key, vars = {}) {
      let s = this.C[key] || "";
      Object.entries(vars).forEach(([k,v]) => { s = s.replace("{"+k+"}", v); });
      return s;
    }

    _statusTextEl()   { return this._dom("fidStatusText"); }
    _statusIconEl()   { return this._dom("fidStatusIcon"); }
    _statusEl()       { return this._dom("fidStatus"); }
    _errBox()         { return this._dom("formErrors"); }
    _greetEl()        { return this._dom("greeting"); }
    _svgFaceGroup()   { return this._dom("fidFaceGroup"); }
    _svgDotsGroup()   { return this._dom("fidDotsGroup"); }
    _svgSuccessMark() { return this._dom("fidSuccessMark"); }
    _svgCheckPoly()   { return this._dom("fidCheckPoly"); }
    _svgSpinArc()     { return this._dom("fidSpinArc"); }
    _svgSpinArc2()    { return this._dom("fidSpinArc2"); }
    _svgCalibRing()   { return this._dom("fidCalibRing"); }
    _svgCorners()     { return this._dom("fidCorners"); }
    _svgOuterRing()   { return this._dom("fidOuterRing"); }
    _svgMeshGrid()    { return this._dom("fidMeshGrid"); }
    _svgDataWipe()    { return this._dom("fidDataWipe"); }
    _svgOrbitGroup()  { return this._dom("fidOrbitGroup"); }
    _svgRejectFlash() { return this._dom("fidRejectFlash"); }
    _svgScanBar()     { return this._dom("fidScanBar"); }
    _svgSuccessText() { const sm = this._svgSuccessMark(); return sm ? sm.querySelector("text") : null; }
    _challengeBadge() { return this._dom("fidChallengeBadge"); }
    _challengeIcon()  { return this._dom("fidChallengeIcon"); }
    _challengeText()  { return this._dom("fidChallengeText"); }
    _fidSvgEl()       { return this._dom("fidSvg"); }

    _svgShow(el, opacity = 1, ms = 300) {
      if (!el) return;
      el.style.transition = `opacity ${ms}ms ease`;
      el.style.opacity    = String(opacity);
    }
    _svgHide(el, ms = 200) { this._svgShow(el, 0, ms); }

    /* ─── mount ─── */
    _mount() {
      const styleId = "fid-bundle-style";
      let style = this._gid(styleId);
      if (style) style.remove();   // re-inject sehingga warna/ukuran update
      style = document.createElement("style");
      style.id = styleId;
      style.textContent = buildCSS(this.C);
      document.head.appendChild(style);

      let container = null;
      if (typeof this._containerSel === "string") {
        container = this._containerSel === "#faceIdContainer"
          ? (this._gid("faceIdContainer") || null)
          : document.querySelector(this._containerSel);
      } else if (this._containerSel instanceof HTMLElement) {
        container = this._containerSel;
      }
      if (!container) {
        container    = document.createElement("div");
        container.id = "faceIdContainer";
        document.body.appendChild(container);
      } else if (!container.id) {
        container.id = "faceIdContainer";
      }

      // Rebuild HTML (agar ukuran & warna baru diterapkan)
      const oldStage = this._gid("fidStage");
      if (oldStage) oldStage.remove();
      container.insertAdjacentHTML("beforeend", buildHTML(this.C));
      this.__dom = {};
    }

    /* ─── canvas ─── */
    _initCanvas() {
      this._fidCanvas = this._gid("fidCanvas");
      if (!this._fidCanvas) return;
      this._fidCtx           = this._fidCanvas.getContext("2d");
      this._fidCanvas.width  = this.C.size;
      this._fidCanvas.height = this.C.size;
    }

    /* Scale factor vs baseline 280 */
    get _sc() { return this.C.size / 280; }

    _lmToCanvas(lm) {
      const s = this.C.size, sc = this._sc;
      return {
        x: s/2 + (lm.x - 0.5) * -320 * sc,
        y: s/2 + (lm.y - 0.5) *  320 * sc,
        z: lm.z,
      };
    }

    _drawConnections(lms, conns, color, lw, alpha = 1) {
      const ctx = this._fidCtx; if (!ctx || !lms) return;
      const len = lms.length;
      ctx.globalAlpha = alpha; ctx.strokeStyle = color;
      ctx.lineWidth   = lw * this._sc; ctx.lineCap = ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i < conns.length - 1; i += 2) {
        const ia = conns[i], ib = conns[i+1];
        if (ia >= len || ib >= len) continue;
        const pa = this._lmToCanvas(lms[ia]);
        const pb = this._lmToCanvas(lms[ib]);
        ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
      }
      ctx.stroke();
    }

    _drawDots(lms, indices, color, radius, alpha = 1) {
      const ctx = this._fidCtx; if (!ctx || !lms) return;
      const len = lms.length, sc = this._sc;
      ctx.globalAlpha = alpha; ctx.fillStyle = color;
      ctx.beginPath();
      indices.forEach(i => {
        if (i >= len) return;
        const p = this._lmToCanvas(lms[i]);
        ctx.moveTo(p.x + radius*sc, p.y);
        ctx.arc(p.x, p.y, radius*sc, 0, Math.PI*2);
      });
      ctx.fill();
    }

    _drawScanLine(y, alpha) {
      const ctx = this._fidCtx, sc = this._sc, s = this.C.size;
      if (!ctx) return;
      ctx.save();
      const g = ctx.createLinearGradient(0, y-20*sc, 0, y+20*sc);
      g.addColorStop(0,   "rgba(55,138,221,0)");
      g.addColorStop(0.4, "rgba(55,138,221,0.5)");
      g.addColorStop(0.5, "rgba(255, 91, 91, 0.75)");
      g.addColorStop(0.6, "rgba(55,138,221,0.5)");
      g.addColorStop(1,   "rgba(55,138,221,0)");
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = g;
      ctx.fillRect(30*sc, y-20*sc, (s-60*sc), 40*sc);
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = this.C.colorPrimaryLighter;
      ctx.lineWidth   = sc;
      ctx.shadowColor = this.C.colorPrimaryLight;
      ctx.shadowBlur  = 6*sc;
      ctx.beginPath();
      ctx.moveTo(40*sc, y); ctx.lineTo(s-40*sc, y);
      ctx.stroke();
      ctx.restore();
    }

    _drawDataWipe(x, alpha) {
      const ctx = this._fidCtx, sc = this._sc, s = this.C.size;
      if (!ctx) return;
      ctx.save();
      const g = ctx.createLinearGradient(x, 0, x+30*sc, 0);
      g.addColorStop(0,   "rgba(55,138,221,0)");
      g.addColorStop(0.4, "rgba(55,138,221,0.35)");
      g.addColorStop(0.6, "rgba(157,216,255,0.55)");
      g.addColorStop(1,   "rgba(55,138,221,0)");
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = g;
      ctx.fillRect(x, 50*sc, 30*sc, s-100*sc);
      ctx.restore();
    }

    _drawEyeGlow(lms, _ear, phase) {
      const ctx = this._fidCtx, sc = this._sc;
      if (!ctx || !lms || lms.length < 474) return;
      const p468  = this._lmToCanvas(lms[468]);
      const p473  = this._lmToCanvas(lms[473]);
      const glowR = (14+Math.sin(phase)*2.5)*sc;
      const alpha = 0.22+Math.sin(phase*2)*0.08;
      ctx.save();
      [[p468.x,p468.y],[p473.x,p473.y]].forEach(([px,py]) => {
        const g = ctx.createRadialGradient(px,py,1.5*sc,px,py,glowR);
        g.addColorStop(0,    `rgba(91,175,255,${(alpha*1.5).toFixed(2)})`);
        g.addColorStop(0.45, `rgba(55,138,221,${alpha.toFixed(2)})`);
        g.addColorStop(1,    "rgba(55,138,221,0)");
        ctx.fillStyle = g; ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(px,py,glowR,0,Math.PI*2); ctx.fill();
      });
      ctx.restore();
    }

    _drawOrbitDots(phase) {
      const ctx = this._fidCtx, sc = this._sc, s = this.C.size;
      if (!ctx) return;
      const cx = s/2, cy = s/2, r = 122*sc;
      ctx.save();
      ORBIT_DOTS.forEach(d => {
        const angle = phase+d.offset, x = cx+Math.cos(angle)*r, y = cy+Math.sin(angle)*r;
        const gr = d.size*3.5*sc;
        const grd = ctx.createRadialGradient(x,y,0,x,y,gr);
        grd.addColorStop(0,   d.color+"BB");
        grd.addColorStop(0.6, d.color+"44");
        grd.addColorStop(1,   d.colorFade);
        ctx.globalAlpha = d.alpha;
        ctx.fillStyle   = grd;
        ctx.beginPath(); ctx.arc(x,y,gr,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha = Math.min(1,d.alpha*1.3);
        ctx.fillStyle   = d.color;
        ctx.beginPath(); ctx.arc(x,y,d.size*sc,0,Math.PI*2); ctx.fill();
      });
      ctx.restore();
    }

    _drawSuccessOverlay(phase) {
      const ctx = this._fidCtx, sc = this._sc, s = this.C.size;
      if (!ctx) return;
      const cx = s/2, cy = s/2;
      ctx.save();
      [1,2].forEach((_,i) => {
        const rr = (35+(phase*60)*(i+1)*0.5)*sc;
        const al = Math.max(0, 0.6-phase*(i+1)*0.5);
        ctx.globalAlpha = al;
        ctx.strokeStyle = this.C.colorSuccess;
        ctx.lineWidth   = 1.5*sc;
        ctx.beginPath(); ctx.arc(cx,cy,rr,0,Math.PI*2); ctx.stroke();
      });
      ctx.restore();
    }

    _renderCanvas() {
      const ctx = this._fidCtx, canvas = this._fidCanvas, s = this.C.size;
      if (!ctx || !canvas) return;
      ctx.clearRect(0,0,s,s);
      this._glowPhase += 0.06;
      this._dotPhase  += 0.028;
      const lms     = this._lastLandmarks;
      const hasFace = lms && lms.length >= 468;
      const cp = this.C.colorPrimary, cpl = this.C.colorPrimaryLight, cpll = this.C.colorPrimaryLighter;

      if (this._renderState !== "idle") {
        ctx.save(); this._drawOrbitDots(this._dotPhase*0.6); ctx.restore();
      }
      if (hasFace) {
        const fa = this._renderState === "success" ? 0.25 : 0.9;
        ctx.save();
        this._drawConnections(lms, FACE_OVAL,      cp,   1.2, fa*0.65);
        this._drawConnections(lms, LEFT_EYE_CONN,  cpl,  0.9, fa*0.85);
        this._drawConnections(lms, RIGHT_EYE_CONN, cpl,  0.9, fa*0.85);
        this._drawConnections(lms, IRISES,          cpll, 1.0, fa*0.95);
        this._drawConnections(lms, LEFT_EYEBROW,   cp,   1.4, fa*0.7);
        this._drawConnections(lms, RIGHT_EYEBROW,  cp,   1.4, fa*0.7);
        this._drawConnections(lms, NOSE_CONN,      cp,   0.9, fa*0.55);
        this._drawConnections(lms, LIPS_CONN,      cpl,  1.0, fa*0.75);
        ctx.restore();
        ctx.save();
        this._drawDots(lms,[1,4,152,234,454,10,263,33,61,291,468,473],cpll,2.2,fa*0.8);
        ctx.restore();
        this._drawEyeGlow(lms,this._lastEar,this._glowPhase);
      }
      if (this._renderState === "scanning" || this._renderState === "challenge") {
        const sc = this._sc;
        this._scanLineY += this._scanDir*2.8*sc;
        if (this._scanLineY > s-45*sc) { this._scanLineY = s-45*sc; this._scanDir = -1; }
        if (this._scanLineY < 45*sc)   { this._scanLineY = 45*sc;   this._scanDir =  1; }
        this._drawScanLine(this._scanLineY, hasFace ? 0.75 : 0.3);
      }
      if (this._renderState === "calibrating") {
        const sc = this._sc;
        this._dataWipeX += 2.2*sc;
        if (this._dataWipeX > s-10*sc) this._dataWipeX = -50*sc;
        this._drawDataWipe(this._dataWipeX, 0.6);
      }
      this._canvasAnimId = requestAnimationFrame(() => this._renderCanvas());
    }

    _startCanvasLoop() { if (!this._canvasAnimId) this._renderCanvas(); }
    _stopCanvasLoop() {
      if (this._canvasAnimId) { cancelAnimationFrame(this._canvasAnimId); this._canvasAnimId = null; }
      if (this._fidCtx && this._fidCanvas) this._fidCtx.clearRect(0,0,this.C.size,this.C.size);
      this._lastLandmarks = null;
    }

    /* ─── SVG animations ─── */
    _startSpinArc() {
      const el = this._svgSpinArc(), el2 = this._svgSpinArc2();
      if (el)  { el.style.animation  = "fid-spin-arc 1.5s linear infinite"; el.style.transformOrigin = "center"; this._svgShow(el,0.75); }
      if (el2) { el2.style.animation = "fid-spin-arc-reverse 2.2s linear infinite"; el2.style.transformOrigin = "center"; this._svgShow(el2,0.5,400); }
    }
    _stopSpinArc() {
      [this._svgSpinArc(),this._svgSpinArc2()].forEach(el => { if(!el) return; el.style.animation="none"; this._svgHide(el); });
    }
    _pulseOuterRing(active=true, fast=false) {
      const el = this._svgOuterRing(); if (!el) return;
      el.style.animation = active ? (fast ? "fid-pulse-ring-fast 0.7s ease-in-out infinite" : "fid-pulse-ring 2s ease-in-out infinite") : "none";
      if (!active) el.style.opacity = "0.2";
    }
    _updateCalibRing(pct) {
      const el = this._svgCalibRing(); if (!el) return;
      this._svgShow(el,1,200);
      const sc = this._sc;
      const c  = 2*Math.PI*108*sc, filled = c*(pct/100);
      el.setAttribute("stroke-dasharray", `${filled.toFixed(1)} ${(c-filled).toFixed(1)}`);
    }
    _hideCalibRing() { this._svgHide(this._svgCalibRing(),300); }

    _showCorners(color) {
      color = color || this.C.colorPrimary;
      const el = this._svgCorners(); if (!el) return;
      this._svgShow(el,1,200);
      const sc = this._sc;
      el.querySelectorAll("polyline").forEach((p,i) => {
        p.setAttribute("stroke",color);
        p.style.transition = "none";
        p.style.strokeDashoffset = String(60*sc);
        setTimeout(() => {
          p.style.transition       = "stroke-dashoffset 0.4s cubic-bezier(.22,.68,0,1.1)";
          p.style.strokeDashoffset = "0";
        }, i*60);
      });
    }
    _setCornerColor(color) {
      const el = this._svgCorners(); if (!el) return;
      el.querySelectorAll("polyline").forEach(p => p.setAttribute("stroke",color));
    }
    _showMeshGrid() {
      const el = this._svgMeshGrid(); if (!el) return;
      el.style.animation = "fid-mesh-flicker 3s ease-in-out infinite";
      this._svgShow(el,1,600);
    }
    _hideMeshGrid() {
      const el = this._svgMeshGrid(); if (!el) return;
      el.style.animation = "none"; this._svgHide(el,300);
    }
    _showLandmarkDots(opacity=0.7) {
      const el = this._svgDotsGroup(); if (!el) return;
      const dots = el.querySelectorAll("circle");
      this._svgShow(el,1,0);
      dots.forEach((d,i) => {
        d.style.opacity = "0"; d.style.transition = "none";
        setTimeout(() => {
          d.style.transition = `opacity 0.3s ease ${i*20}ms`;
          d.style.opacity    = String(parseFloat(d.getAttribute("opacity")||0.5)*opacity);
        }, 50+i*25);
        const delay = (i*137.5)%2000;
        d.style.animation = `fid-dot-sparkle ${1.5+(i%3)*0.5}s ease-in-out ${delay}ms infinite`;
      });
    }
    _hideLandmarkDots() {
      const el = this._svgDotsGroup(); if (!el) return;
      el.querySelectorAll("circle").forEach(d => { d.style.animation="none"; });
      this._svgHide(el,300);
    }
    _hideStaticFaceContour() {
      const el = this._svgFaceGroup(); if (!el) return;
      el.style.animation = "none"; this._svgHide(el,500);
    }

    _showSuccessAnimation(cb) {
      this._renderState = "success";
      this._stopSpinArc(); this._hideMeshGrid();
      const ring = this._svgOuterRing();
      if (ring) { ring.style.stroke=this.C.colorSuccess; ring.style.animation="none"; ring.style.opacity="0.7"; }
      this._setCornerColor(this.C.colorSuccess);
      this._hideStaticFaceContour(); this._hideLandmarkDots();
      const sm = this._svgSuccessMark();
      if (sm) {
        this._svgShow(sm,1,400);
        setTimeout(() => {
          const cp = this._svgCheckPoly();
          if (cp) cp.style.animation = "fid-draw-check 0.6s cubic-bezier(.22,.68,0,1.2) forwards";
          const txt = this._svgSuccessText();
          if (txt) { txt.style.transition="opacity 0.4s ease"; txt.style.opacity="1"; }
        },350);
      }
      this._successAnimPhase = 0;
      const animRipple = () => {
        this._successAnimPhase = Math.min(this._successAnimPhase+0.015,1);
        if (this._fidCtx && this._fidCanvas) {
          this._fidCtx.clearRect(0,0,this.C.size,this.C.size);
          this._drawSuccessOverlay(this._successAnimPhase);
          if (this._lastLandmarks) this._drawConnections(this._lastLandmarks,FACE_OVAL,this.C.colorSuccess,1.2,0.3);
        }
        if (this._successAnimPhase < 1) this._successAnimId = requestAnimationFrame(animRipple);
      };
      animRipple();
      const svgEl = this._fidSvgEl();
      if (svgEl) svgEl.classList.add("state-success");
      setTimeout(() => cb && cb(), 900);
    }

    _showRejectFlash(duration=600) {
      const el = this._svgRejectFlash(), svg = this._fidSvgEl();
      if (el) {
        el.style.animation = `fid-glitch-flash ${duration}ms ease`;
        this._svgShow(el,1,0);
        setTimeout(() => { el.style.animation="none"; this._svgHide(el,200); }, duration);
      }
      if (svg) {
        svg.classList.add("state-error");
        setTimeout(() => svg.classList.remove("state-error"), duration+300);
      }
    }

    _resetSvgState() {
      this._renderState = "idle";
      Object.keys(this.__dom).forEach(k => delete this.__dom[k]);
      [this._svgFaceGroup(),this._svgScanBar(),this._svgDotsGroup(),this._svgSuccessMark(),
       this._svgCorners(),this._svgMeshGrid(),this._svgDataWipe(),this._svgOrbitGroup(),
       this._svgRejectFlash(),this._svgCalibRing(),this._svgSpinArc(),this._svgSpinArc2()
      ].forEach(el => { if(!el) return; el.style.transition=el.style.animation="none"; el.style.opacity="0"; });
      const cp2 = this._svgCheckPoly();
      if (cp2) { cp2.style.animation="none"; cp2.style.strokeDashoffset=String(46*this._sc); }
      const ring = this._svgOuterRing();
      if (ring) { ring.style.animation="none"; ring.style.opacity="0.2"; ring.style.stroke=this.C.colorPrimary; }
      const svg = this._fidSvgEl();
      if (svg) svg.classList.remove("state-success","state-error");
      this._hideChallengeUi();
      if (this._successAnimId) { cancelAnimationFrame(this._successAnimId); this._successAnimId=null; }
      setTimeout(() => {
        const c = this._gid("fidCorners");
        if (c) c.querySelectorAll("polyline").forEach(p => {
          p.style.transition="none";
          p.style.strokeDashoffset=String(60*this._sc);
          p.setAttribute("stroke",this.C.colorPrimary);
        });
      },0);
    }

    /* ─── Challenge UI ─── */
    _showChallengeUi(text,icon,cls="") {
      const badge=this._challengeBadge(),ctxt=this._challengeText(),cicon=this._challengeIcon();
      if (!badge) return;
      if (ctxt)  ctxt.textContent=text;
      if (cicon) cicon.textContent=icon;
      badge.className="visible "+cls;
    }
    _hideChallengeUi() { const b=this._challengeBadge(); if(b) b.className=""; }

    /* ─── Status / Error / Greeting ─── */
    _setStatus(html,color="#6c757d",icon="") {
      const txtEl=this._statusTextEl(),iconEl=this._statusIconEl(),mainEl=this._statusEl();
      if (txtEl)       { txtEl.innerHTML=html;  txtEl.style.color=color; }
      else if (mainEl) { mainEl.innerHTML=html; mainEl.style.color=color; }
      if (iconEl) iconEl.textContent=icon;
      if (mainEl) mainEl.style.color=color;
    }
    _showErr(msg) {
      const el=this._errBox(); if(!el) return;
      el.innerHTML=`<div class="alert alert-danger py-2 mb-2">${msg}</div>`;
      el.style.display="block";
    }
    _clearErr() { const el=this._errBox(); if(el){el.innerHTML="";el.style.display="none";} }
    _setGreeting(html) { const el=this._greetEl(); if(el) el.innerHTML=html; }

    /* ─── Score Ring ─── */
    _updateScoreRing(score) {
      const el=this._gid("fidScoreRing"); if(!el) return;
      const sc   = this._sc;
      const pct  = Math.min(1,Math.max(0,score));
      const circ = 2*Math.PI*108*sc;
      el.setAttribute("stroke-dasharray",`${circ*pct} ${circ*(1-pct)}`);
      if      (pct>=this.C.livenessScoreMin) el.setAttribute("stroke",this.C.colorSuccess);
      else if (pct>=0.3)                     el.setAttribute("stroke",this.C.colorWarning);
      else                                   el.setAttribute("stroke",this.C.colorDanger);
    }

    /* ─── Script loader ─── */
    _loadScript(src) {
      return new Promise((resolve,reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s=document.createElement("script");
        s.src=src; s.crossOrigin="anonymous";
        s.onload=resolve;
        s.onerror=()=>reject(new Error("Gagal load: "+src));
        document.head.appendChild(s);
      });
    }

    /* ─────────────────────────────────────────────────────────
       _waitForGlobal — poll sampai window[name] tersedia
    ───────────────────────────────────────────────────────── */
    _waitForGlobal(name, timeoutMs = 12000) {
      return new Promise((resolve, reject) => {
        if (typeof window[name] !== "undefined") { resolve(window[name]); return; }
        const start = Date.now();
        const poll  = () => {
          if (typeof window[name] !== "undefined") { resolve(window[name]); return; }
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Global '${name}' tidak tersedia setelah ${timeoutMs}ms`)); return;
          }
          setTimeout(poll, 80);
        };
        poll();
      });
    }

    /* ─────────────────────────────────────────────────────────
       _loadScript — load <script> sekali, skip jika sudah ada
    ───────────────────────────────────────────────────────── */
    // (override dari atas — lebih ketat: cek src exact + cek sudah resolved)
    _loadScriptOnce(src) {
      // Jika script sudah ada DAN sudah di-execute (punya global yg diharapkan), skip
      const existing = document.querySelector(`script[data-fid-src="${src}"]`);
      if (existing) return existing._fidReady || Promise.resolve();

      return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.setAttribute("data-fid-src", src);
        s.src = src;
        // JANGAN pakai crossOrigin untuk file lokal (localhost) — bisa sebabkan CORS abort
        if (!src.startsWith(window.location.origin) && !src.startsWith("/")) {
          s.crossOrigin = "anonymous";
        }
        const p = new Promise((res, rej) => {
          s.onload  = () => res();
          s.onerror = () => rej(new Error("Gagal load script: " + src));
        });
        s._fidReady = p;
        document.head.appendChild(s);
        p.then(resolve, reject);
      });
    }

    /* ─────────────────────────────────────────────────────────
       _loadDeps — urutan ketat + isolasi window.Module
       
       ROOT CAUSE error WASM "Module.arguments has been replaced":
       MediaPipe Emscripten WASM menggunakan window.Module sebagai
       config saat initialize() dipanggil — BUKAN saat script diload.
       Jika window.Module sudah berisi object dari Emscripten lain
       (mis. asm.js plugin), properti .arguments-nya menyebabkan abort.
       
       FIX:
       1. Simpan referensi module lama ke this._savedModule (bukan var lokal)
          agar bisa di-restore setelah initialize() selesai di _initMediaPipe.
       2. Set window.Module = {} (object kosong), BUKAN undefined —
          Emscripten butuh object untuk assign properti internal.
       Restore dilakukan di _initMediaPipe setelah fm.initialize() selesai.
    ───────────────────────────────────────────────────────── */
    async _loadDeps() {
      const dbg = this.C.debug;

      // 1. Backup window.Module ke instance property agar bisa di-restore
      //    setelah fm.initialize() selesai di _initMediaPipe.
      this._savedModule = window.Module;
      // Set ke object kosong — JANGAN undefined.
      // Emscripten perlu assign ke object; undefined akan throw saat akses property.
      window.Module = {};
      if (dbg) console.info("[SDK] window.Module di-backup, set ke {} kosong");

      // 2. Load camera_utils.js
      await this._loadScriptOnce(this._CAM_UTILS_SRC);
      if (dbg) console.info("[SDK] camera_utils.js loaded");
      // Camera global opsional — tidak wajib ada di semua versi MediaPipe
      await this._waitForGlobal("Camera", 5000).catch(() => {
        if (dbg) console.warn("[SDK] Camera global opsional — tidak tersedia, lanjut");
      });

      // 3. Load face_mesh.js (mendaftarkan WASM loader, belum compile)
      await this._loadScriptOnce(this._FACE_MESH_SRC);
      if (dbg) console.info("[SDK] face_mesh.js loaded");

      // 4. Tunggu FaceMesh global — script butuh tick untuk assign window.FaceMesh
      await this._waitForGlobal("FaceMesh", 15000);
      if (dbg) console.info("[SDK] window.FaceMesh tersedia ✓");

      // CATATAN: window.Module TIDAK di-restore di sini.
      // Restore dilakukan di _initMediaPipe setelah fm.initialize() selesai,
      // karena WASM Emscripten mengakses window.Module pada saat initialize().
    }

    /* ─────────────────────────────────────────────────────────
       _initMediaPipe — guard double-init + retry sekali jika
       initialize() gagal karena WASM belum siap.
       Setelah initialize() selesai, restore window.Module yang
       di-backup di _loadDeps (WASM sudah selesai menggunakannya).
    ───────────────────────────────────────────────────────── */
    async _initMediaPipe() {
      const FM = window.FaceMesh;
      if (!FM) throw new Error("MediaPipe FaceMesh tidak ditemukan setelah load.");

      // Jika sudah pernah init dan masih valid, skip
      if (this._mpInitialized && this._faceMesh) {
        if (this.C.debug) console.info("[MediaPipe] sudah ter-init, skip");
        return;
      }

      // Bersihkan instance lama jika ada
      if (this._faceMesh) {
        try { this._faceMesh.close(); } catch (_) {}
        this._faceMesh = null;
      }

      const tryInit = async (attempt) => {
        if (this.C.debug) console.info(`[MediaPipe] init attempt ${attempt}…`);
        const fm = new FM({ locateFile: f => `${this._MP_CDN_BASE}/${f}` });
        fm.setOptions({
          maxNumFaces         : 1,
          refineLandmarks     : true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence : 0.5,
        });
        fm.onResults(r => this._onResults(r));

        // initialize() memuat & compile WASM — mengakses window.Module di sini.
        // window.Module sengaja dibiarkan sebagai {} kosong dari _loadDeps
        // agar tidak terpengaruh Module dari library Emscripten lain.
        await fm.initialize();
        return fm;
      };

      let lastErr;

      // Attempt 1
      try {
        this._faceMesh = await tryInit(1);
        if (this.C.debug) console.info("[MediaPipe] FaceMesh initialized ✓");
      } catch (e1) {
        lastErr = e1;
        if (this.C.debug) console.warn("[MediaPipe] attempt 1 gagal:", e1.message, "— retry dalam 1.5s…");

        // Tunggu 1.5 detik lalu retry (beri waktu WASM selesai compile)
        await new Promise(r => setTimeout(r, 1500));

        // Attempt 2
        try {
          this._faceMesh = await tryInit(2);
          if (this.C.debug) console.info("[MediaPipe] FaceMesh initialized on retry ✓");
          lastErr = null;
        } catch (e2) {
          lastErr = e2;
        }
      }

      // Restore window.Module sekarang — WASM sudah selesai initialize()
      // (baik sukses maupun gagal, kita tetap restore agar tidak bocor)
      if (this._savedModule !== undefined) {
        window.Module = this._savedModule;
        this._savedModule = undefined;
        if (this.C.debug) console.info("[SDK] window.Module di-restore setelah initialize()");
      } else {
        // Tidak ada backup (tidak ada Module sebelumnya) — hapus object sementara
        delete window.Module;
      }

      if (lastErr) {
        throw new Error("MediaPipe FaceMesh gagal initialize setelah 2 percobaan: " + lastErr.message);
      }
    }

    /* ─────────────────────────────────────────────────────────
       face-api loader
    ───────────────────────────────────────────────────────── */
    async _loadFaceApiScript() {
      if (typeof faceapi !== "undefined") return;
      await this._loadScriptOnce(this._FACEAPI_CDN);
      await this._waitForGlobal("faceapi", 8000);
    }
    async _initFaceApi() {
      if (this._faceApiLoaded) return;
      await this._loadFaceApiScript();
      await faceapi.nets.tinyFaceDetector.loadFromUri(this._FACEAPI_MODELS);
      await faceapi.nets.faceExpressionNet.loadFromUri(this._FACEAPI_MODELS);
      this._faceApiLoaded = true;
      if (this.C.debug) console.info("[FACEAPI] models loaded ✓");
    }

    _isVideoReady(v) {
      return v!=null && v.readyState>=3 && v.videoWidth>0 && v.videoHeight>0
        && v.currentTime>0 && !v.paused && !v.ended;
    }

    async _sendFrame() {
      if (this._warmingUp||this._isSending||!this._faceMesh||!this._isVideoReady(this._videoEl)) return false;
      this._isSending = true;
      try { await this._faceMesh.send({ image: this._videoEl }); }
      catch(err) { if(this.C.debug) console.warn("[MP] send error:",err?.message||err); }
      finally { this._isSending = false; }
      return true;
    }

    _waitForVideoReady(v, ms=10000) {
      return new Promise((resolve,reject) => {
        const start=Date.now();
        const poll=()=>{
          if (this._isVideoReady(v)) { resolve(); return; }
          if (Date.now()-start>ms) { reject(new Error("Video warmup timeout")); return; }
          setTimeout(poll,50);
        };
        poll();
      });
    }

    async _startCamera() {
      this._isSending=false; this._warmingUp=true;
      const videoEl=document.createElement("video");
      videoEl.autoplay=videoEl.playsInline=videoEl.muted=true;
      videoEl.width=640; videoEl.height=480;
      videoEl.style.cssText="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;";
      document.body.appendChild(videoEl);
      this._videoEl = videoEl;

      if (typeof Camera !== "undefined") {
        this._mpCamera = new Camera(videoEl, { onFrame:()=>this._sendFrame(), width:640, height:480, facingMode:"user" });
        await this._mpCamera.start();
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video:{ width:{ideal:640}, height:{ideal:480}, facingMode:"user" }, audio:false,
        });
        videoEl.srcObject = stream;
        await new Promise(r => { videoEl.onloadedmetadata=r; });
        await videoEl.play();
        const loop = () => { this._rafId=requestAnimationFrame(loop); this._sendFrame(); };
        loop();
      }
      await this._waitForVideoReady(videoEl);
      this._warmingUp = false;
      if (this.C.debug) console.info("[CAM] warmup done",videoEl.videoWidth,"×",videoEl.videoHeight);
    }

    _stopCamera() {
      clearTimeout(this._challengeTimer);
      this._isSending=this._warmingUp=true;
      try { if(this._mpCamera) this._mpCamera.stop(); } catch(_) {}
      this._mpCamera = null;
      if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId=null; }
      if (this._videoEl) {
        if (this._videoEl.srcObject) this._videoEl.srcObject.getTracks().forEach(t=>t.stop());
        this._videoEl.remove(); this._videoEl=null;
      }
      this._capCanvas=this._capCtx=null;
      this._stopCanvasLoop();
      setTimeout(()=>{ this._isSending=false; },200);
    }

    /* ─── State reset ─── */
    _resetState() {
      this._submitting=this._liveOk=false; this._lastSnapshot=null;
      this._earSamples=[]; this._earBaseline=null; this._earHistory=[];
      this._blinkCount=this._earConsec=0; this._earWasClosed=false;
      this._zDepthHistory=[]; this._exprHistory=[];
      this._exprDeltaPass=this._challengeExprDone=false;
      this._currentChallenge=null; this._livenessScore=this._frameCount=0;
      this._faceVisible=this._calibDone=false;
      this._lastLandmarks=null; this._lastEar=0.25;
      this._isSending=false; this._warmingUp=true;
      this._scanLineY=45*this._sc; this._scanDir=1; this._dataWipeX=-70*this._sc;
      clearTimeout(this._challengeTimer);
      this._updateScoreRing(0); this._resetSvgState(); this._clearErr();
      this._setStatus("","#6c757d","");
    }

    /* ─── Challenge ─── */
    _pickChallenge() {
      const all=[CHALLENGE.BLINK,CHALLENGE.SMILE,CHALLENGE.MOUTH_OPEN];
      return all[Math.floor(Math.random()*all.length)];
    }
    _startChallenge() {
      this._blinkCount=0; this._earConsec=0; this._earWasClosed=false; this._challengeExprDone=false;
      this._currentChallenge=this._pickChallenge();
      this._renderState="challenge";
      clearTimeout(this._challengeTimer);
      this._challengeTimer = setTimeout(()=>{
        if (!this._liveOk) {
          this._setStatus(this._t("txtChallengeTimeout"),"#dc3545","⏱");
          this._showChallengeUi(this._t("txtChallengeRetry"),"⏱","challenge-danger");
          setTimeout(()=>{ if(!this._liveOk) this._startChallenge(); },1500);
        }
      }, this.C.challengeTimeoutMs);
      const map = {
        [CHALLENGE.BLINK]:      { text:this._t("txtBlink"),      icon:"👁",  color:"#0d6efd" },
        [CHALLENGE.SMILE]:      { text:this._t("txtSmile"),      icon:"😊", color:"#0d6efd" },
        [CHALLENGE.MOUTH_OPEN]: { text:this._t("txtMouthOpen"),  icon:"😮", color:"#0d6efd" },
      };
      const m = map[this._currentChallenge] || { text:this._t("txtFollowInstr"), icon:"ℹ️", color:"#0d6efd" };
      this._setStatus(m.text,m.color,m.icon);
      this._showChallengeUi(m.text,m.icon);
      this._pulseOuterRing(true,true);
      if (this.C.debug) console.info("[CHALLENGE]",this._currentChallenge);
    }

    /* ─── Liveness math ─── */
    _dist2D(a,b) { return Math.hypot(a.x-b.x,a.y-b.y); }
    _calcEAR(lms,idx) {
      const [p0,p1,p2,p3,p4,p5]=idx.map(i=>lms[i]);
      return (this._dist2D(p1,p5)+this._dist2D(p2,p4))/(2*this._dist2D(p0,p3)+1e-6);
    }
    _earThresh() { return this._earBaseline ? this._earBaseline*0.78 : 0.20; }

    _checkZDepth(lms) {
      const z=DEPTH_PTS.map(i=>lms[i].z);
      const mean=z.reduce((a,b)=>a+b,0)/z.length;
      const std=Math.sqrt(z.reduce((a,b)=>a+(b-mean)**2,0)/z.length);
      this._zDepthHistory.push(std);
      if(this._zDepthHistory.length>30) this._zDepthHistory.shift();
      const avg=this._zDepthHistory.reduce((a,b)=>a+b,0)/this._zDepthHistory.length;
      return { pass:avg>=this.C.zDepthMinStd, value:avg };
    }
    _checkEarVariance() {
      const h=this._earHistory;
      if(h.length<this.C.earVarFrames) return { pass:true,value:null };
      const mean=h.reduce((a,b)=>a+b,0)/h.length;
      const vari=h.reduce((a,b)=>a+(b-mean)**2,0)/h.length;
      return { pass:vari>=this.C.earVarMin, value:vari };
    }
    async _runFaceApiCheck() {
      if(!this._faceApiLoaded||!this._videoEl||this._videoEl.readyState<2) return null;
      try {
        const det=await faceapi
          .detectSingleFace(this._videoEl,new faceapi.TinyFaceDetectorOptions({scoreThreshold:0.4}))
          .withFaceExpressions();
        return det ? det.expressions : null;
      } catch { return null; }
    }
    _checkExpressionDelta(expr) {
      if(!expr) return { pass:true,value:null };
      const vec=[expr.neutral,expr.happy,expr.surprised,expr.angry,expr.fearful];
      this._exprHistory.push(vec);
      if(this._exprHistory.length>this.C.exprDeltaFrames) this._exprHistory.shift();
      if(this._exprHistory.length<5) return { pass:true,value:null };
      let total=0;
      for(let i=1;i<this._exprHistory.length;i++)
        total+=this._exprHistory[i].reduce((s,v,j)=>s+Math.abs(v-this._exprHistory[i-1][j]),0);
      const avg=total/(this._exprHistory.length-1);
      return { pass:avg>=this.C.exprDeltaMin, value:avg };
    }
    _checkChallengeExpression(expr) {
      if(!expr||this._challengeExprDone) return false;
      if(this._currentChallenge===CHALLENGE.SMILE      && expr.happy>0.6)     return true;
      if(this._currentChallenge===CHALLENGE.MOUTH_OPEN && expr.surprised>0.5) return true;
      return false;
    }
    _calcLivenessScore(zRes,varRes,exprRes) {
      let score=0,total=0;
      if(zRes.value   !==null){score+=Math.min(1,zRes.value   /this.C.zDepthMinStd)*0.40;total+=0.40;}
      if(varRes.value !==null){score+=Math.min(1,varRes.value /this.C.earVarMin)   *0.30;total+=0.30;}
      if(exprRes.value!==null){score+=Math.min(1,exprRes.value/this.C.exprDeltaMin)*0.30;total+=0.30;}
      return total>0 ? score/total : 0.5;
    }

    /* ─── captureJpeg ─── */
    _captureJpeg(boost=false,quality=0.85) {
      const v=this._videoEl;
      if(!v||v.readyState<2) return null;
      const w=v.videoWidth||640,h=v.videoHeight||480;
      if(!this._capCanvas){
        this._capCanvas=document.createElement("canvas");
        this._capCanvas.width=w; this._capCanvas.height=h;
        this._capCtx=this._capCanvas.getContext("2d");
      }
      this._capCtx.filter=boost?"brightness(1.4) contrast(1.15)":"none";
      this._capCtx.drawImage(v,0,0,w,h);
      return this._capCanvas.toDataURL("image/jpeg",quality);
    }

    /* ─── escHtml & buildDetail ─── */
    _escHtml(s) { return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]); }
    _buildDetail(d) {
      if(!d||typeof d!=="object") return "";
      const p=[];
      if(d.confidence       !=null) p.push(`Confidence: <b>${d.confidence}%</b>`);
      if(d.texture_score    !=null) p.push(`Anti-spoof: ${d.texture_score}`);
      if(d.js_liveness_score!=null) p.push(`JS score: ${d.js_liveness_score}`);
      return p.length ? `<br><small class="text-muted">${p.join(" · ")}</small>` : "";
    }

    /* ─── Submit ─── */
    async _submitLogin() {
      if(this._submitting||!this._lastSnapshot) return;
      if(this.C.onLivenessPass && !this.C.loginUrl) {
        this.C.onLivenessPass(this._livenessScore,this._lastSnapshot); return;
      }
      this._submitting=true;
      const username=(this._gid("username")||{value:""}).value.trim().toLowerCase();
      const payload={
        image             : this._lastSnapshot,
        skip_liveness     : true,
        js_liveness_score : parseFloat(this._livenessScore.toFixed(4)),
        ...(username && { username }),
      };
      try {
        const res  = await fetch(this.C.loginUrl,{
          method:"POST",
          headers:{"Content-Type":"application/json","X-Requested-With":"XMLHttpRequest"},
          body:JSON.stringify(payload),
        });
        const json = await res.json();
        if(json.csrf) document.querySelector(`input[name="${json.csrf.name}"]`)?.setAttribute("value",json.csrf.hash);
        this._handleResult(json);
      } catch(err) {
        this._submitting=false; this._resetSvgState();
        this._showErr(this._t("txtConnFail")+": "+err.message);
        this._setStatus(this._t("txtConnRetry"),"#dc3545","✗");
        if(this.C.onError) this.C.onError(err.message);
      }
    }

    /* ─── handleResult ─── */
    _handleResult(json) {
      if(json.status){
        const d=json.data||{};
        this._stopCamera();
        this._setGreeting(`Halo, ${d.full_name||d.username}! 👋`);
        this._setStatus(this._t("txtLoginOk"),"#198754","✓");
        if(typeof showToast==="function") showToast({title:"Berhasil",message:json.message,type:"success"});
        if(this.C.onSuccess) this.C.onSuccess(d);
        const url=(window.LOGIN_CONFIG&&window.LOGIN_CONFIG.dashboardUrl)||d.redirect||"/dashboard";
        setTimeout(()=>{ window.location.href=url; },900);
        return;
      }
      this._submitting=false; this._liveOk=false;
      this._earBaseline=null; this._earSamples=[]; this._earHistory=[];
      this._zDepthHistory=[]; this._exprHistory=[];
      this._livenessScore=0; this._calibDone=false; this._faceVisible=false;
      this._updateScoreRing(0); this._resetSvgState();
      const msg=json.message||"Verifikasi gagal.";
      this._showErr(`<strong>${this._escHtml(msg)}</strong>${this._buildDetail(json.data)}`);
      this._setStatus(this._t("txtLoginFail"),"#dc3545","✗");
      this._showRejectFlash(800);
      if(typeof showToast==="function") showToast({title:"Gagal",message:msg,type:"danger"});
      if(this.C.onError) this.C.onError(msg,json.data);
      setTimeout(()=>{ if(this._videoEl){ this._showCorners(); this._startSpinArc(); this._startChallenge(); } },2000);
    }

    /* ─── onResults ─── */
    async _onResults(results) {
      if(this._submitting||this._liveOk) return;
      this._frameCount++;
      this._lastSnapshot=this._captureJpeg(this.C.brightnessBoost);
      if(!results.multiFaceLandmarks||!results.multiFaceLandmarks.length){
        this._lastLandmarks=null;
        if(this._faceVisible){
          this._faceVisible=false;
          this._hideStaticFaceContour(); this._hideLandmarkDots();
        }
        this._setStatus(this._t("txtPositionFace"),"#6c757d","📷");
        this._hideChallengeUi(); return;
      }
      const lms=results.multiFaceLandmarks[0];
      this._lastLandmarks=lms;
      if(!this._faceVisible){
        this._faceVisible=true;
        this._showCorners(); this._showLandmarkDots(0.9);
        if(this._calibDone) this._renderState="scanning";
      }
      const earAvg=(this._calcEAR(lms,R_EYE)+this._calcEAR(lms,L_EYE))/2;
      this._lastEar=earAvg;
      if(this._earBaseline===null){
        this._earSamples.push(earAvg);
        const pct=Math.round((this._earSamples.length/30)*100);
        this._setStatus(this._t("txtCalibrating",{pct}),"#6c757d","⚙️");
        this._renderState="calibrating";
        this._updateCalibRing(pct); this._startSpinArc(); this._pulseOuterRing(true); this._showMeshGrid();
        if(this._earSamples.length>=30){
          const sorted=[...this._earSamples].sort((a,b)=>a-b);
          this._earBaseline=sorted[Math.floor(sorted.length/2)];
          this._calibDone=true;
          this._stopSpinArc(); this._hideCalibRing(); this._hideMeshGrid(); this._pulseOuterRing(false);
          this._renderState="scanning";
          if(this.C.debug) console.info(`[EAR] baseline=${this._earBaseline.toFixed(3)}`);
          this._setStatus(this._t("txtReady"),"#0d6efd","✅");
          this._startChallenge();
        }
        return;
      }
      this._earHistory.push(earAvg);
      if(this._earHistory.length>60) this._earHistory.shift();
      const zRes  =this._checkZDepth(lms);
      const varRes=this._checkEarVariance();
      let exprRes={pass:true,value:null},expr=null;
      if(this._faceApiLoaded&&this._frameCount%5===0){
        expr=await this._runFaceApiCheck();
        exprRes=this._checkExpressionDelta(expr);
        this._exprDeltaPass=exprRes.pass;
      }
      this._livenessScore=this._calcLivenessScore(zRes,varRes,exprRes);
      this._updateScoreRing(this._livenessScore);
      if(this._zDepthHistory.length>=20&&!zRes.pass){
        this._setStatus(this._t("txtSpoof2d"),"#dc3545","⚠️");
        this._setCornerColor(this.C.colorDanger); this._showRejectFlash(400); return;
      }
      this._setCornerColor(this.C.colorPrimary);
      const thresh=this._earThresh();
      if(this._currentChallenge===CHALLENGE.BLINK){
        if(earAvg<thresh){ this._earConsec++; this._earWasClosed=true; }
        else{
          if(this._earWasClosed&&this._earConsec>=1) this._blinkCount++;
          this._earConsec=0; this._earWasClosed=false;
        }
        if(this._blinkCount>=1) this._onChallengeComplete();
      } else if(this._currentChallenge===CHALLENGE.SMILE||this._currentChallenge===CHALLENGE.MOUTH_OPEN){
        if(expr&&this._checkChallengeExpression(expr)){ this._challengeExprDone=true; this._onChallengeComplete(); }
      }
    }

    /* ─── onChallengeComplete ─── */
    _onChallengeComplete() {
      clearTimeout(this._challengeTimer); this._hideChallengeUi();
      if(this._livenessScore<this.C.livenessScoreMin){
        this._setStatus(this._t("txtLowLiveness"),"#dc3545","⚠️");
        this._showChallengeUi(this._t("txtLowLivenessRetry"),"⚠️","challenge-warn");
        this._setCornerColor(this.C.colorWarning);
        setTimeout(()=>{ if(!this._liveOk) this._startChallenge(); },2000); return;
      }
      this._liveOk=true;
      this._setStatus(this._t("txtVerified"),"#198754","✓");
      this._clearErr();
      this._showSuccessAnimation(()=>this._submitLogin());
    }

    /* ═══════════════════════════════════════
       PUBLIC API
    ═══════════════════════════════════════ */

    async init() {
      this._mount();
      this._resetState();
      this._initCanvas();
      this._setStatus(this._t("txtLoading"),"#6c757d","⏳");
      this._startSpinArc();
      this._startCanvasLoop();
      this._renderState="calibrating";
      try {
        // Step 1: Load & tunggu semua deps (camera_utils → face_mesh → FaceMesh global)
        this._setStatus("Memuat MediaPipe…","#6c757d","⏳");
        await this._loadDeps();

        // Step 2: Init MediaPipe + face-api paralel
        // needMP = true jika belum pernah init ATAU instance sebelumnya crash
        this._setStatus("Inisialisasi model…","#6c757d","⚙️");
        const needMP = !this._mpInitialized || !this._faceMesh;
        await Promise.all([
          needMP ? this._initMediaPipe() : Promise.resolve(),
          this._initFaceApi(),
        ]);
        this._mpInitialized = true;

        // Step 3: Buka kamera
        this._setStatus("Membuka kamera…","#6c757d","📸");
        await this._startCamera();

        this._setStatus(this._t("txtPointFace"),"#6c757d","📷");
        this._pulseOuterRing(true);
        if (this.C.onReady) this.C.onReady();

      } catch(e) {
        this._stopSpinArc();
        // Potong error message agar tidak tampil stack trace panjang di UI
        const short = e.message ? e.message.split("\n")[0].slice(0, 120) : String(e);
        this._showErr(`${this._t("txtInitFail")}: ${short}`);
        this._setStatus(this._t("txtRefreshPage"),"#dc3545","✗");
        this._renderState = "idle";
        // Reset agar restart() bisa coba ulang dari awal
        this._mpInitialized = false;
        this._faceMesh = null;
        if (this.C.debug) console.error("[SDK] init error:",e);
        if (this.C.onError) this.C.onError(short);
      }
    }

    stop() { this._stopCamera(); this._resetState(); this._stopCanvasLoop(); }
    async restart() { this.stop(); await this.init(); }

    /** Update config (warna, ukuran, teks, URL) lalu re-mount */
    configure(opts={}) {
      Object.assign(this.C, opts);
      return this;
    }

    get state() {
      return {
        renderState   : this._renderState,
        faceVisible   : this._faceVisible,
        calibDone     : this._calibDone,
        livenessScore : this._livenessScore,
        challenge     : this._currentChallenge,
        liveOk        : this._liveOk,
      };
    }
    get snapshot() { return this._lastSnapshot; }
  }

  /* ═══════════════════════════════════════
     BACKWARD-COMPATIBLE AUTO-INIT
  ═══════════════════════════════════════ */
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

  return FaceIDSDK;
});