/* Synthetic examples from the pole parameterization (#eq6) and two-mode PSD (#eq24); no measured data. */
(() => {
  function poleModel(fn, zeta) {
    const wn = 2 * Math.PI * fn, alpha = zeta * wn;
    const wd = wn * Math.sqrt(Math.max(0, 1 - zeta * zeta));
    const beta = wn * Math.sqrt(Math.max(0, zeta * zeta - 1));
    const slow = zeta > 1 ? -wn / (zeta + Math.sqrt(zeta * zeta - 1)) : -alpha;
    return { alpha, wd, wn, beta, slow, fast: -alpha - beta, zeta };
  }
  // Unit displacement released from rest, valid in all three damping regimes.
  function freeResponse(t, model) {
    const { alpha, wd, wn, beta, slow, fast, zeta } = model;
    if (zeta < 1) {
      const x = wd * t;
      const sinc = Math.abs(x) < 1e-6 ? 1 - x*x/6 : Math.sin(x)/x;
      return Math.exp(-alpha*t) * (Math.cos(x) + alpha*t*sinc);
    }
    if (zeta === 1) return (1 + wn*t)*Math.exp(-wn*t);
    return (-fast*Math.exp(slow*t) + slow*Math.exp(fast*t))/(2*beta);
  }
  function modalWeight(f, fn, zeta) {
    const r = f / fn;
    return 1 / ((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
  }
  function spectrum(f, gap, angle, zeta) {
    const beta = angle * Math.PI / 180;
    const c = Math.cos(beta), s = Math.sin(beta);
    const d1 = modalWeight(f, 3, zeta), d2 = modalWeight(f, 3 + gap, zeta);
    const a = d1 + d2 * c * c, b = d2 * c * s, d = d2 * s * s;
    const delta = Math.hypot(a - d, 2 * b);
    const s1 = (a + d + delta) / 2;
    // Determinant/s1 avoids cancellation when the second eigenvalue is small.
    const s2 = d1 * d2 * s * s / s1;
    const theta = Math.atan2(2 * b, a - d) / 2;
    return { s1, s2, a, b, d, theta, mac1: Math.cos(theta) ** 2,
      mac2: Math.cos(theta - beta) ** 2, degenerate: delta / (a + d) < 1e-10 };
  }
  if (typeof module !== 'undefined') module.exports = { poleModel, freeResponse, modalWeight, spectrum };
  if (typeof document === 'undefined') return;
  const el = id => document.getElementById(id);
  const value = id => Number(el(id).value);
  const line = (x1, y1, x2, y2, cls = 'axis') => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const text = (x, y, content, anchor = 'start') => `<text x="${x}" y="${y}" text-anchor="${anchor}">${content}</text>`;
  const curve = (points, cls) => `<path class="${cls}" d="${points.map(([x,y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}"/>`;
  function drawPoles() {
    const fn = value('pole-frequency'), z = value('pole-damping') / 100;
    const model = poleModel(fn, z);
    const { alpha, wd, wn, slow, fast } = model;
    el('pole-frequency-value').textContent = `${fn.toFixed(1)} Hz`;
    el('pole-damping-value').textContent = `${(100*z).toFixed(1)}%`;
    const extent = Math.max(wn, -fast) * 1.12;
    const px = x => 224 + x * 170 / extent, py = y => 117 - y * 80 / extent;
    let svg = text(20, 18, 'Pole plane (s⁻¹)') + text(290, 18, 'Displacement: release from rest');
    svg += line(40,117,244,117) + line(224,28,224,204);
    svg += text(45,137,`−${extent.toFixed(1)}`) + text(230,137,'0') + text(183,218,'Re(λ)');
    svg += text(230,37,'Im(λ)');
    const poles = z < 1 ? [[-alpha,wd],[-alpha,-wd]] : [[slow,0],[fast,0]];
    for (const [re, im] of poles) {
      const x = px(re), y = py(im);
      svg += line(x-4,y-4,x+4,y+4,'primary') + line(x-4,y+4,x+4,y-4,'primary');
    }
    if (z === 1) svg += text(px(-wn),99,'double root','middle');
    svg += line(290,117,640,117) + line(290,35,290,199);
    for (let t=0;t<=4;t++) svg += line(290+t*87.5,40,290+t*87.5,198,'grid') + text(290+t*87.5,218,t,'middle');
    svg += text(465,234,'Time (s)','middle') + text(281,49,'1','end') + text(281,195,'−1','end');
    const points=[];
    for (let i=0;i<=800;i++) points.push([290+350*i/800,117-74*freeResponse(4*i/800,model)]);
    svg += curve(points,'primary');
    el('pole-chart').innerHTML = svg;
    el('pole-readout').textContent = z < 1
      ? `Underdamped · λ = −${alpha.toFixed(3)} ± j${wd.toFixed(3)} s⁻¹ · Damped frequency ${(wd/(2*Math.PI)).toFixed(3)} Hz.`
      : z === 1
        ? `Critically damped · Double root λ = −${wn.toFixed(3)} s⁻¹ · No oscillation.`
        : `Overdamped · Real poles λ₁ = ${slow.toFixed(3)}, λ₂ = ${fast.toFixed(3)} s⁻¹ · No oscillation. The slower decay has time constant ${(-1/slow).toFixed(2)} s.`;
  }

  function drawMix() {
    const gap=value('mode-gap'), angle=value('mode-angle'), z=value('mode-damping')/100, probe=value('probe');
    el('mode-gap-value').textContent=`${gap.toFixed(2)} Hz`;
    el('mode-angle-value').textContent=`${angle}°`;
    el('mode-damping-value').textContent=`${(z*100).toFixed(1)}%`;
    el('probe-value').textContent=`${probe.toFixed(2)} Hz`;
    const x=f=>56+(f-2.4)/2.6*582, y=s=>236-(Math.log10(s)+2)/7*200;
    let svg=text(56,19,'PSD singular value (log scale, arbitrary units)');
    for(let k=-2;k<=5;k++) {
      const yy=y(10**k);
      svg+=line(56,yy,638,yy,'grid')+text(46,yy+4,`10${['⁻²','⁻¹','⁰','¹','²','³','⁴','⁵'][k+2]}`,'end');
    }
    for(const f of [2.4,3,3.5,4,4.5,5]) svg+=text(x(f),258,f.toFixed(1),'middle');
    svg+=text(347,283,'Frequency (Hz)','middle');
    const first=[],second=[];
    for(let i=0;i<=780;i++) {
      const f=2.4+2.6*i/780, m=spectrum(f,gap,angle,z);
      first.push([x(f),y(m.s1)]); second.push([x(f),y(m.s2)]);
    }
    svg+=curve(first,'primary')+curve(second,'secondary')+line(x(probe),30,x(probe),236,'cursor');
    el('mix-chart').innerHTML=svg;
    const m=spectrum(probe,gap,angle,z);
    const prefix=`At ${probe.toFixed(2)} Hz: s₁/s₂ = ${(m.s1/m.s2).toFixed(2)}. `;
    el('mix-readout').textContent=prefix+(m.degenerate ?
      'Equal singular values: the singular-vector basis is not unique, so no unique MAC is reported.' :
      `First vector MAC with physical mode 1: ${m.mac1.toFixed(3)}; with mode 2: ${m.mac2.toFixed(3)}. `+
      (Math.max(m.mac1,m.mac2)<0.95 ? 'The leading vector mixes the physical shapes.' : 'The leading vector is close to one physical shape.'));
  }
  for(const id of ['pole-frequency','pole-damping']) el(id).addEventListener('input',drawPoles);
  for(const id of ['mode-gap','mode-angle','mode-damping','probe']) el(id).addEventListener('input',drawMix);
  drawPoles(); drawMix();
})();
