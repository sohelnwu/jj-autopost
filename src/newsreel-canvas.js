// ব্রাউজারের ভেতরে চলে: টিভি নিউজ চ্যানেলের মতো অ্যানিমেটেড রিলের প্রতিটা ফ্রেম আঁকে।
// ক্যামেরা স্থির — শুধু লেখা, বার, টিকার আর আলো নড়ে। কোথাও কোনো লিংক আঁকা হয় না।
(() => {
  const W = 1080, H = 1920;
  let S, cv, ctx;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
  const BN = '০১২৩৪৫৬৭৮৯';
  const bn = (n) => String(n).replace(/\d/g, (d) => BN[d]);
  const F = (w, s, fam = 'Hind') => `${w} ${s}px ${fam}`;

  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function hexA(hex, a) {
    const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function wrap(text, maxW) {
    const words = text.split(/\s+/).filter(Boolean); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }
  function fit(text, weight, maxW, maxH, big, small, lh) {
    for (let s = big; s >= small; s -= 2) { ctx.font = F(weight, s); const L = wrap(text, maxW); if (L.length * s * lh <= maxH) return { s, lines: L }; }
    ctx.font = F(weight, small); return { s: small, lines: wrap(text, maxW) };
  }

  // ---------- ব্যাকগ্রাউন্ড (স্থির ক্যামেরা, ধীরে চলা আলো) ----------
  function bg(t, cat) {
    const A = S.accent;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#050A18'); g.addColorStop(0.55, '#0A1430'); g.addColorStop(1, '#04070F');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const gx = W * 0.82 + Math.sin(t * 0.25) * 40, gy = H * 0.14;
    let rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.9); rg.addColorStop(0, hexA(A, 0.42)); rg.addColorStop(1, hexA(A, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    rg = ctx.createRadialGradient(0, H * 0.78, 0, 0, H * 0.78, W); rg.addColorStop(0, hexA(S.accent2, 0.45)); rg.addColorStop(1, hexA(S.accent2, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.5;
    if (cat === 'sports') { // মাঠের দাগ
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 4;
      ctx.strokeRect(70, 250, W - 140, 1150); ctx.beginPath(); ctx.moveTo(70, 825); ctx.lineTo(W - 70, 825); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, 825, 170, 0, Math.PI * 2); ctx.stroke();
    } else { // ঘুরতে থাকা গ্লোবের রেখা
      const cx = W * 0.8, cy = 520, r = 420; ctx.strokeStyle = 'rgba(147,197,253,0.10)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 7; i++) { const ph = ((i / 7) + t * 0.025) % 1; const rx = Math.abs(Math.cos(ph * Math.PI)) * r; ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(1, rx), r, 0, 0, Math.PI * 2); ctx.stroke(); }
      for (let k = -3; k <= 3; k++) { const yy = cy + (k / 4) * r, hw = Math.sqrt(Math.max(0, r * r - (yy - cy) ** 2)); ctx.beginPath(); ctx.moveTo(cx - hw, yy); ctx.lineTo(cx + hw, yy); ctx.stroke(); }
    }
    ctx.restore();
    // ধীরে সরে যাওয়া আলোর রেখা
    const sx = ((t * 120) % (W + 900)) - 450;
    const lg = ctx.createLinearGradient(sx - 200, 0, sx + 200, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.035)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
  }

  // ---------- উপরের ব্র্যান্ড বার ----------
  function topBar(t) {
    const y = 96;
    ctx.font = F(800, 46, 'Baloo');
    const a = S.brandA, b = S.brandB.toUpperCase();
    const wa = ctx.measureText(a).width + 34, wb = ctx.measureText(b).width + 40;
    rr(60, y, wa + wb, 74, 12); ctx.save(); ctx.clip();
    ctx.fillStyle = S.accent; ctx.fillRect(60, y, wa, 74); ctx.fillStyle = '#fff'; ctx.fillRect(60 + wa, y, wb, 74); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(a, 60 + 17, y + 41);
    ctx.fillStyle = '#0B1020'; ctx.fillText(b, 60 + wa + 20, y + 41);
    // LIVE
    const lx = W - 60 - 150; rr(lx, y + 10, 150, 54, 10); ctx.fillStyle = '#E11D2E'; ctx.fill();
    ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 3)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lx + 30, y + 37, 9, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.font = F(700, 30); ctx.fillText('লাইভ', lx + 50, y + 39);
    ctx.font = F(500, 28); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.textAlign = 'right'; ctx.fillText(S.date, W - 60, y + 104); ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  function progress(segIdx, segT) {
    const items = S.segments.filter((s) => s.kind === 'item'); if (items.length < 2) return;
    const cur = S.segments[segIdx]; const k = items.indexOf(cur);
    const gap = 10, w = (W - 120 - gap * (items.length - 1)) / items.length;
    items.forEach((s, i) => {
      rr(60 + i * (w + gap), 230, w, 8, 4); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
      const f = k < 0 ? (cur.kind === 'outro' ? 1 : 0) : i < k ? 1 : i === k ? segT : 0;
      if (f > 0) { rr(60 + i * (w + gap), 230, w * f, 8, 4); ctx.fillStyle = '#fff'; ctx.fill(); }
    });
  }

  function pill(x, y, text, fill, color, size = 38, center = false) {
    ctx.save(); ctx.textAlign = 'left';
    ctx.font = F(700, size); const w = ctx.measureText(text).width + 56;
    if (center) x = (W - w) / 2;
    rr(x, y, w, size + 30, 12); ctx.fillStyle = fill; ctx.fill();
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 28, y + (size + 30) / 2 + 3);
    ctx.restore();
    return w;
  }

  // শিরোনাম: শব্দে শব্দে ভেসে ওঠে (ভয়েসের সাথে মিলিয়ে)
  function headline(seg, segT, absT, y0, boxH) {
    const L = seg._L; const lh = 1.3; ctx.font = F(700, L.s);
    const total = seg._words; const shown = seg.revealStart != null
      ? total * clamp((absT - seg.revealStart) / Math.max(0.3, seg.revealEnd - seg.revealStart)) : total;
    let wi = 0; const hiUntil = seg._hiWords;
    const startY = y0 + Math.max(0, (boxH - L.lines.length * L.s * lh) / 2);
    L.lines.forEach((ln, i) => {
      const ly = startY + L.s * 0.95 + i * L.s * lh; let x = 60;
      for (const w of ln.split(' ')) {
        const a = clamp(shown - wi);
        if (a > 0) { ctx.save(); ctx.globalAlpha = ease(a); ctx.fillStyle = wi < hiUntil ? '#FFD23F' : '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 18; ctx.fillText(w, x, ly + (1 - ease(a)) * 26); ctx.restore(); }
        x += ctx.measureText(w + ' ').width; wi++;
      }
    });
    return startY + L.lines.length * L.s * lh;
  }

  function voiceStrip(fi, absT) {
    const y = 1250; const env = S.env || [];
    ctx.font = F(600, 30); ctx.fillStyle = 'rgba(255,255,255,0.85)';
    // মাইক্রোফোন চিহ্ন
    ctx.save(); ctx.translate(78, y + 6); ctx.fillStyle = S.accent; rr(-12, -26, 24, 40, 12); ctx.fill();
    ctx.strokeStyle = S.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 22, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); ctx.fillRect(-2, 20, 4, 14); ctx.restore();
    ctx.fillText(S.anchor, 120, y + 16);
    const bx = 120 + ctx.measureText(S.anchor).width + 30;
    for (let i = 0; i < 26; i++) {
      const e = env[Math.max(0, fi - (i % 5))] || 0; const h = 6 + e * 46 * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7 + absT * 9)));
      rr(bx + i * 14, y + 4 - h / 2, 8, h, 4); ctx.fillStyle = i % 3 ? 'rgba(255,255,255,0.75)' : hexA(S.accent, 0.95); ctx.fill();
    }
  }

  function lowerThird(tag, text) {
    const y = 1330, h = 92;
    ctx.font = F(700, 36); const tw = ctx.measureText(tag).width + 70;
    ctx.fillStyle = 'rgba(255,255,255,0.97)'; ctx.fillRect(0, y, W, h);
    ctx.fillStyle = S.accent; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(tw + 30, y); ctx.lineTo(tw, y + h); ctx.lineTo(0, y + h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(tag, 34, y + h / 2 + 3);
    ctx.font = F(600, 32); ctx.fillStyle = '#0B1020';
    let s = text; while (ctx.measureText(s).width > W - tw - 90 && s.length > 4) s = s.slice(0, -2);
    if (s !== text) s = s.trim() + '…';
    ctx.fillText(s, tw + 50, y + h / 2 + 3); ctx.textBaseline = 'alphabetic';
  }

  function ticker(absT) {
    const y = 1422, h = 58; ctx.fillStyle = '#03050C'; ctx.fillRect(0, y, W, h);
    ctx.font = F(500, 28); const txt = S.ticker; const tw = ctx.measureText(txt).width + 80;
    const off = (absT * 140) % tw; ctx.fillStyle = '#CBD5E1'; ctx.textBaseline = 'middle';
    for (let x = 230 - off; x < W; x += tw) ctx.fillText(txt, x, y + h / 2 + 3);
    ctx.fillStyle = S.accent; ctx.fillRect(0, y, 210, h); ctx.fillStyle = '#fff'; ctx.font = F(700, 30); ctx.fillText('শিরোনাম', 30, y + h / 2 + 3);
    ctx.textBaseline = 'alphabetic';
  }

  function drawSeg(seg, segT, absT, fi) {
    const enter = ease(segT * seg.dur / 0.45), leave = clamp((seg.dur - segT * seg.dur) / 0.3);
    const vis = Math.min(enter, leave);
    ctx.save(); ctx.globalAlpha = vis; ctx.translate((1 - enter) * 70, 0);
    if (seg.kind === 'intro') {
      if (S.breaking) {
        ctx.save(); ctx.translate(W / 2, 520); ctx.rotate(-0.06);
        ctx.fillStyle = '#E11D2E'; ctx.fillRect(-W, -90, W * 2, 180);
        ctx.fillStyle = '#fff'; ctx.fillRect(-W, 96, W * 2, 14);
        ctx.font = F(800, 120, 'Baloo'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = vis * (0.75 + 0.25 * Math.abs(Math.sin(absT * 5))); ctx.fillText('ব্রেকিং নিউজ', 0, 12); ctx.restore();
      } else {
        pill(0, 520, S.kicker, '#fff', S.accent, 40, true); ctx.textAlign = 'center';
        ctx.font = F(800, 132, 'Baloo'); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30;
        const L = seg._L; L.lines.forEach((l, i) => ctx.fillText(l, W / 2, 760 + i * 150)); ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFD23F'; rr(W / 2 - 100, 780 + L.lines.length * 150 - 60, 200, 12, 6); ctx.fill();
        ctx.font = F(500, 42); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(S.date, W / 2, 900 + L.lines.length * 150 - 60);
        ctx.textAlign = 'left';
      }
    } else if (seg.kind === 'item') {
      const w = pill(60, 300, seg.label, '#fff', S.accent, 36);
      if (seg.of > 1) { ctx.font = F(700, 38); ctx.fillStyle = '#FFD23F'; ctx.fillText(`${bn(seg.n)}/${bn(seg.of)}`, 60 + w + 22, 345); }
      ctx.fillStyle = '#FFD23F'; rr(60, 400, 140 * ease(segT * seg.dur / 0.8), 10, 5); ctx.fill();
      const endY = headline(seg, segT, absT, 430, 760);
      if (seg.source) {
        const a = clamp((absT - (seg.revealEnd || seg.start)) / 0.5);
        ctx.globalAlpha = vis * a; ctx.font = F(500, 34); ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText('সূত্র: ' + seg.source, 60, Math.min(endY + 70, 1220));
      }
    } else if (seg.kind === 'outro') {
      ctx.textAlign = 'center'; ctx.font = F(800, 96, 'Baloo'); ctx.fillStyle = '#fff'; ctx.fillText(S.outroTop, W / 2, 640);
      ctx.font = F(800, 120, 'Baloo'); const a = S.brandA, b = S.brandB.toUpperCase();
      const wa = ctx.measureText(a).width + 60, wb = ctx.measureText(b).width + 70, x0 = W / 2 - (wa + wb) / 2;
      rr(x0, 720, wa + wb, 170, 22); ctx.save(); ctx.clip(); ctx.fillStyle = S.accent; ctx.fillRect(x0, 720, wa, 170); ctx.fillStyle = '#fff'; ctx.fillRect(x0 + wa, 720, wb, 170); ctx.restore();
      ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(a, x0 + wa / 2, 812); ctx.fillStyle = '#0B1020'; ctx.fillText(b, x0 + wa + wb / 2, 812); ctx.textBaseline = 'alphabetic';
      ctx.font = F(500, 44); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(S.outroLine, W / 2, 990);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  window.setupReel = async (spec) => {
    S = spec; cv = document.getElementById('c'); ctx = cv.getContext('2d');
    await Promise.all(['700 80px Hind', '600 40px Hind', '500 40px Hind', '800 80px Baloo'].map((f) => document.fonts.load(f, 'বাংলা')));
    await document.fonts.ready;
    for (const seg of S.segments) {
      if (seg.kind === 'item') {
        seg._L = fit(seg.title, 700, W - 120, 740, 96, 54, 1.3);
        seg._words = seg.title.split(/\s+/).filter(Boolean).length;
        const ci = seg.title.search(/[:：]/);
        seg._hiWords = ci > 3 && ci < seg.title.length * 0.55 ? seg.title.slice(0, ci + 1).split(/\s+/).filter(Boolean).length : 0;
      } else if (seg.kind === 'intro') {
        ctx.font = F(800, 132, 'Baloo'); seg._L = { lines: wrap(S.title, W - 160) };
      }
    }
    return true;
  };

  window.drawFrames = (times, startFi) => times.map((t, k) => {
    const fi = startFi + k;
    let si = S.segments.findIndex((s) => t >= s.start && t < s.start + s.dur); if (si < 0) si = S.segments.length - 1;
    const seg = S.segments[si]; const segT = clamp((t - seg.start) / seg.dur);
    bg(t, seg.cat || S.cat);
    topBar(t); progress(si, segT);
    drawSeg(seg, segT, t, fi);
    voiceStrip(fi, t);
    lowerThird(seg.kind === 'item' ? (S.breaking ? 'ব্রেকিং' : seg.label) : S.breaking ? 'ব্রেকিং' : 'সংবাদ', seg.kind === 'item' && seg.source ? `${S.pageName} | সূত্র: ${seg.source}` : `${S.pageName} | ${S.date}`);
    ticker(t);
    if (t < 0.35) { ctx.fillStyle = `rgba(0,0,0,${1 - t / 0.35})`; ctx.fillRect(0, 0, W, H); }
    return cv.toDataURL('image/jpeg', 0.9);
  });
})();
