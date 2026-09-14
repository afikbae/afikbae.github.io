/* Synthetic examples from the pole parameterization (#eq6) and two-mode PSD (#eq24); no measured data. */
(() => {
  function poleModel(fn, zeta) {
    const wn = 2 * Math.PI * fn;
    return { alpha: zeta * wn, wd: wn * Math.sqrt(1 - zeta * zeta), wn };
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
  if (typeof module !== 'undefined') module.exports = { poleModel, modalWeight, spectrum };
  if (typeof document === 'undefined') return;
  const el = id => document.getElementById(id);
  const value = id => Number(el(id).value);
  const line = (x1, y1, x2, y2, cls = 'axis') => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const text = (x, y, content, anchor = 'start') => `<text x="${x}" y="${y}" text-anchor="${anchor}">${content}</text>`;
  const curve = (points, cls) => `<path class="${cls}" d="${points.map(([x,y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}"/>`;
  function drawPoles() {
    const fn = value('pole-frequency'), z = value('pole-damping') / 100;
    const { alpha, wd } = poleModel(fn, z);
    el('pole-frequency-value').textContent = `${fn.toFixed(1)} Hz`;
    el('pole-damping-value').textContent = `${(100*z).toFixed(1)}%`;
    const px = x => 208 + x * 24, py = y => 117 - y * 3;
    let svg = text(20, 18, 'Pole plane (s⁻¹)') + text(290, 18, 'Free-response component');
    svg += line(40,117,232,117) + line(208,28,208,204);
    svg += text(43,137,'−6') + text(214,137,'0') + text(188,218,'Re(λ)');
    svg += text(215,37,'Im(λ)');
    for (const w of [wd, -wd]) {
      const x = px(-alpha), y = py(w);
      svg += line(x-4,y-4,x+4,y+4,'primary') + line(x-4,y+4,x+4,y-4,'primary');
    }
    svg += line(290,117,640,117) + line(290,35,290,199);
    for (let t=0;t<=4;t++) svg += line(290+t*87.5,40,290+t*87.5,198,'grid') + text(290+t*87.5,218,t,'middle');
    svg += text(465,234,'Time (s)','middle') + text(281,49,'1','end') + text(281,195,'−1','end');
    const p=[], env=[];
    for (let i=0;i<=500;i++) {
      const t=4*i/500, x=290+350*i/500, a=Math.exp(-alpha*t);
      p.push([x,117-74*a*Math.cos(wd*t)]); env.push([x,117-74*a]);
    }
    svg += curve(env,'secondary') + curve(p,'primary');
    el('pole-chart').innerHTML = svg;
    el('pole-readout').textContent = `λ = −${alpha.toFixed(3)} ± j${wd.toFixed(3)} s⁻¹ · Damped frequency ${(wd/(2*Math.PI)).toFixed(3)} Hz · Envelope falls to 1/e in ${(1/alpha).toFixed(2)} s. Dashed curve: exponential envelope.`;
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
