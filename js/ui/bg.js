/* BRISKA — fondo animado (shader de nebulosa nocturna) */
(function (BR) {
  'use strict';
  const BG = {};
  let gl, prog, canvas, uni = {}, raf = 0, start = performance.now();
  let cur = [[0.05, 0.04, 0.13], [0.23, 0.11, 0.37], [0.75, 0.52, 0.23]];
  let target = cur.map((c) => c.slice());
  let quality = 'high', pulse = 0, spin = 0, dyn = 1, last = 0, slow = 0, fast = 0;

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec3 c1;uniform vec3 c2;uniform vec3 c3;uniform float pulse;uniform float spin;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
 float a=spin*0.15+t*0.006; mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));
 vec2 u=rot*uv;
 vec2 q=vec2(fbm(u*1.3+t*.025),fbm(u*1.3+vec2(5.2,1.3)-t*.02));
 vec2 w=vec2(fbm(u*1.3+3.*q+vec2(1.7,9.2)+t*.04),fbm(u*1.3+3.*q+vec2(8.3,2.8)-t*.03));
 float f=fbm(u*1.5+3.2*w);
 vec3 col=mix(c1,c2,clamp(f*f*2.4,0.,1.));
 col=mix(col,c3,clamp(length(w)*.85-.45,0.,1.)*(.55+pulse*.5));
 col+=c3*pow(f,5.)*1.2;
 float rr=length(uv*vec2(.85,1.));
 col*=.62+.5*smoothstep(1.25,.05,rr);
 vec2 gs=uv*38.;vec2 g=floor(gs);float h=hash(g);vec2 fo=fract(gs)-.5-(vec2(hash(g+3.1),hash(g+7.7))-.5)*.6;
 float sd=length(fo);
 col+=step(.93,h)*smoothstep(.09,.0,sd)*(.55+.45*sin(t*1.7+h*90.))*vec3(1.,.95,.85);
 gl_FragColor=vec4(col,1.);
}`;

  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

  BG.MOODS = {
    menu: ['#0d0a22', '#3b1d5c', '#c88a3a'],
    small: ['#07112a', '#14406a', '#3fb5c8'],
    big: ['#160c24', '#53305a', '#e09a3a'],
    shop: ['#1a0b14', '#5c2238', '#f0a948'],
    over: ['#120608', '#4a1018', '#a02030'],
    win: ['#0e0a1c', '#3a2a6a', '#ffd36e'],
  };
  BG.set = function (name, custom) {
    const m = custom || BG.MOODS[name] || BG.MOODS.menu;
    target = m.map(hex);
  };
  BG.bossColors = (col) => ['#12060c', mixHex(col, '#1a0a14', 0.55), col];
  function mixHex(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round((v * (1 - t) + B[i] * t) * 255).toString(16).padStart(2, '0')).join(''); }
  BG.pulse = (v) => { pulse = Math.min(1.5, pulse + (v || 0.6)); };
  BG.setQuality = (q) => { quality = q; resize(); if (canvas) canvas.style.display = q === 'off' ? 'none' : 'block'; };

  function resize() {
    if (!canvas) return;
    const s = (quality === 'high' ? 0.5 : 0.28) * dyn;
    canvas.width = Math.max(64, Math.floor(innerWidth * s));
    canvas.height = Math.max(64, Math.floor(innerHeight * s));
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (quality === 'off' || !gl || document.hidden) return;
    const dt = now - last;
    if (dt < 30) return; // ~30 fps: el fondo es lento
    last = now;
    // resolución dinámica según rendimiento
    if (dt > 55) { slow++; fast = 0; } else if (dt < 38) { fast++; slow = Math.max(0, slow - 1); }
    if (slow > 20 && dyn > 0.35) { dyn *= 0.8; slow = 0; resize(); }
    else if (fast > 240 && dyn < 1) { dyn = Math.min(1, dyn * 1.15); fast = 0; resize(); }
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cur[i][j] += (target[i][j] - cur[i][j]) * 0.03;
    pulse *= 0.95; spin += pulse * 0.02;
    gl.uniform2f(uni.r, canvas.width, canvas.height);
    gl.uniform1f(uni.t, (now - start) / 1000);
    gl.uniform3fv(uni.c1, cur[0]); gl.uniform3fv(uni.c2, cur[1]); gl.uniform3fv(uni.c3, cur[2]);
    gl.uniform1f(uni.pulse, pulse); gl.uniform1f(uni.spin, spin);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  BG.init = function (cv) {
    canvas = cv;
    try { gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false }) || cv.getContext('experimental-webgl'); } catch (e) { gl = null; }
    if (!gl) { cv.style.display = 'none'; return; }
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; cv.style.display = 'none'; return; }
    gl.useProgram(prog);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const k of ['r', 't', 'c1', 'c2', 'c3', 'pulse', 'spin']) uni[k] = gl.getUniformLocation(prog, k);
    addEventListener('resize', resize); resize();
    raf = requestAnimationFrame(frame);
  };
  BR.BG = BG;
})(globalThis.BR = globalThis.BR || {});
