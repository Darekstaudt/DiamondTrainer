import Utils from './utils.js';
import Visuals from './visuals.js';
import Data from './data.js';

// Main app logic (module)
document.addEventListener('DOMContentLoaded', ()=>{
  // DOM refs
  const svg = document.getElementById('networkSvg');
  const latexOutput = document.getElementById('latexOutput');
  const numericOutput = document.getElementById('numericOutput');
  const log = document.getElementById('eventLog');

  // trainer elements
  const trainerDisplay = el('trainerDisplay');
  const startBtn = el('startTrainer');
  const stopBtn = el('stopTrainer');
  const resetBtn = el('resetTrainer');
  const rangeMinInput = el('rangeMin');
  const rangeMaxInput = el('rangeMax');
  const displaySpeedSel = el('displaySpeed');
  const randomPitchChk = el('randomPitch');
  const soundToggle = el('soundToggle');
  const pitchCallEl = el('pitchCall');

  // initialize visuals and FFN
  Visuals.drawNetwork(svg);

  // trainer state
  let trainerInterval = null;
  let trainerRunning = false;
  let currentNumber = null;
  const pitchCalls = ['Fastball','Slider','Curveball','Changeup','Splitter','Cutter'];
  let audioCtx = null;

  // --- Trainer functions ---
  function initTrainer(){
    // set defaults
    rangeMinInput.value = rangeMinInput.value || 1;
    rangeMaxInput.value = rangeMaxInput.value || 9;
    displaySpeedSel.value = displaySpeedSel.value || 1;
    trainerDisplay.textContent = '—';
    pitchCallEl.textContent = '';
    attachTrainerEvents();
  }

  function startTrainer(){
    if(trainerRunning) return;
    trainerRunning = true;
    const speed = parseFloat(displaySpeedSel.value) * 1000;
    tickTrainer();
    trainerInterval = setInterval(tickTrainer, speed);
    playBatCrack();
    logEvent('Trainer started');
  }

  function stopTrainer(){
    if(!trainerRunning) return;
    trainerRunning = false;
    clearInterval(trainerInterval); trainerInterval = null;
    logEvent('Trainer stopped');
  }

  function resetTrainer(){
    stopTrainer(); currentNumber = null; trainerDisplay.textContent = '—'; pitchCallEl.textContent = ''; logEvent('Trainer reset');
  }

  function updateSettings(){
    // restart interval with new speed if running
    if(trainerRunning){ stopTrainer(); startTrainer(); }
  }

  function tickTrainer(){
    const min = parseInt(rangeMinInput.value,10) || 1;
    const max = parseInt(rangeMaxInput.value,10) || 9;
    const n = Math.floor(Math.random()*(max-min+1))+min;
    currentNumber = n;
    showNumber(n);
    if(randomPitchChk.checked){ const pc = pitchCalls[Math.floor(Math.random()*pitchCalls.length)]; pitchCallEl.textContent = pc; }
    if(soundToggle.checked) playPop();
  }

  function showNumber(n){
    trainerDisplay.classList.remove('pop-in');
    void trainerDisplay.offsetWidth; // force reflow
    trainerDisplay.textContent = n;
    trainerDisplay.classList.add('pop-in');
  }

  // Simple sounds using WebAudio
  function ensureAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  function playPop(){ try{ ensureAudio(); const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.frequency.value = 880; o.type='sine'; g.gain.value = 0.05; o.connect(g); g.connect(audioCtx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+0.2); o.stop(audioCtx.currentTime+0.25); }catch(e){ console.warn('Audio error',e); } }
  function playBatCrack(){ try{ ensureAudio(); const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.frequency.value = 180; o.type='square'; g.gain.value = 0.1; o.connect(g); g.connect(audioCtx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+0.12); o.stop(audioCtx.currentTime+0.14); }catch(e){ console.warn('Audio error',e); } }

  function attachTrainerEvents(){
    startBtn.addEventListener('click', startTrainer);
    stopBtn.addEventListener('click', stopTrainer);
    resetBtn.addEventListener('click', resetTrainer);
    displaySpeedSel.addEventListener('change', updateSettings);
    rangeMinInput.addEventListener('change', ()=>{ if(parseInt(rangeMinInput.value,10) > parseInt(rangeMaxInput.value,10)) rangeMinInput.value = rangeMaxInput.value });
    rangeMaxInput.addEventListener('change', ()=>{ if(parseInt(rangeMaxInput.value,10) < parseInt(rangeMinInput.value,10)) rangeMaxInput.value = rangeMinInput.value });
  }

  // --- Existing app functions preserved ---
  function el(id){ return document.getElementById(id) }
  function syncRange(r,n){ r.addEventListener('input', ()=>{ n.value = r.value }); n.addEventListener('input', ()=>{ r.value = n.value }); }
  function renderLatex(latex){ try{ latexOutput.innerHTML = katex.renderToString(latex,{throwOnError:false}) }catch(e){ latexOutput.textContent=latex } }

  // Forward pass & grad code (kept from original) ----------------------
  const x1 = el('x1'), x2 = el('x2'), x1num = el('x1num'), x2num = el('x2num');
  syncRange(x1,x1num); syncRange(x2,x2num);
  el('runForward').addEventListener('click', ()=> runForward(true));
  el('stepBtn').addEventListener('click', ()=> runForward(false));
  el('computeGrad').addEventListener('click', computeGrad);
  el('applyUpdate').addEventListener('click', applyUpdate);

  const dsSelect = el('datasetSelect'); Data.list().forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=k; dsSelect.appendChild(o)});
  dsSelect.addEventListener('change', ()=>{ const d=Data.get(dsSelect.value); logEvent('Loaded dataset '+dsSelect.value); });
  el('csvUpload').addEventListener('change', e=>{ const f=e.target.files[0]; if(f) Data.parseUpload(f,(err,res)=>{ if(err) logEvent('CSV parse error: '+err); else logEvent('Uploaded CSV: '+f.name) }) });

  function runForward(animate=true){
    const xi = [1, parseFloat(x1.value), parseFloat(x2.value)];
    const w = [parseFloat(el('w0').value), parseFloat(el('w1').value), parseFloat(el('w2').value)];
    const z = Utils.dot(w, xi);
    const act = el('activation').value;
    const a = Utils.activation[act].f(z);
    const latex = `$$z = w_0 + w_1 x_1 + w_2 x_2 = ${Utils.fmt(w[0])} + ${Utils.fmt(w[1])}\\cdot${Utils.fmt(xi[1])} + ${Utils.fmt(w[2])}\\cdot${Utils.fmt(xi[2])} = ${Utils.fmt(z)}$$\\n$$a = ${Utils.activation[act].tex} = ${Utils.fmt(a)}$$`;
    renderLatex(latex);
    numericOutput.innerHTML = `<strong>z</strong>: ${Utils.fmt(z)} <br><strong>a</strong>: ${Utils.fmt(a)}`;
    logEvent(`Forward pass: x=${xi.slice(1).join(',')} z=${z.toFixed(4)} a=${a.toFixed(4)}`);
    if(animate){ const path = [[100,60],[200,90],[380,140],[600,140]]; Visuals.animateBall(svg,path,{duration:1200}); }
    window._dt_state = {xi,w,z,a,act};
    return window._dt_state;
  }

  // FFN practice code preserved (omitted here for brevity) --------------
  // The previous FFN functions (buildFFNControls, computeFFN, challenges, hints)
  // are kept as-is below to avoid changing user workflows.

  // Insert existing FFN / challenge code by re-using previously defined functions
  // (we'll call computeFFN initialization below)

  /* BEGIN copied FFN and challenge logic */
  const hiddenSizeSel = el('hiddenSize');
  const ffnControls = el('ffnControls');
  const feat_x2 = el('feat_x2'), feat_sqrt = el('feat_sqrt'), feat_inter = el('feat_inter');

  function buildFFNControls(nHidden){
    ffnControls.innerHTML = '';
    for(let j=0;j<nHidden;j++){
      const div = document.createElement('div'); div.className='hidden-neuron';
      div.innerHTML = `<strong>Hidden ${j+1}</strong><label>b<sub>${j+1}</sub> <input data-role='b' data-j='${j}' class='ffnnum' type='number' value='0.0' step='0.01'></label>`;
      const w1 = document.createElement('label'); w1.innerHTML=`w1 <input data-role='w' data-j='${j}' data-i='1' class='ffnnum' type='number' value='${(Math.random()-0.5).toFixed(3)}' step='0.001'>`;
      const w2 = document.createElement('label'); w2.innerHTML=`w2 <input data-role='w' data-j='${j}' data-i='2' class='ffnnum' type='number' value='${(Math.random()-0.5).toFixed(3)}' step='0.001'>`;
      div.appendChild(w1); div.appendChild(w2); ffnControls.appendChild(div);
    }
    const outDiv = document.createElement('div'); outDiv.innerHTML = `<strong>Output</strong><label>b_o <input id='out_b' type='number' value='0.0' step='0.01'></label>`;
    for(let j=0;j<nHidden;j++){ const lab = document.createElement('label'); lab.innerHTML = `v${j+1} <input data-role='v' data-j='${j}' class='ffnnum' type='number' value='${(Math.random()-0.5).toFixed(3)}' step='0.001'>`; outDiv.appendChild(lab); }
    ffnControls.appendChild(outDiv);
    ffnControls.querySelectorAll('.ffnnum').forEach(inp=> inp.addEventListener('input', ()=> computeFFN()));
  }

  function computeFFN(){
    const nHidden = parseInt(hiddenSizeSel.value,10);
    const x1v = parseFloat(el('x1').value); const x2v = parseFloat(el('x2').value);
    let feats = [x1v, x2v];
    if(feat_x2 && feat_x2.checked){ feats.push(x1v*x1v); }
    if(feat_sqrt && feat_sqrt.checked){ feats.push(Math.sqrt(Math.abs(x1v))); }
    if(feat_inter && feat_inter.checked){ feats.push(x1v*x2v); }
    const hidden = [];
    for(let j=0;j<nHidden;j++){
      const bj = parseFloat(ffnControls.querySelector(`input[data-role='b'][data-j='${j}']`).value || 0);
      const w1 = parseFloat(ffnControls.querySelector(`input[data-role='w'][data-j='${j}'][data-i='1']`).value || 0);
      const w2 = parseFloat(ffnControls.querySelector(`input[data-role='w'][data-j='${j}'][data-i='2']`).value || 0);
      const z = bj + w1 * x1v + w2 * x2v;
      const act = el('activation').value; const a = Utils.activation[act].f(z);
      hidden.push({bj,w1,w2,z,a});
    }
    const b_o = parseFloat((ffnControls.querySelector('#out_b') || {value:0}).value||0);
    const v = [];
    for(let j=0;j<nHidden;j++){ const vi = parseFloat(ffnControls.querySelector(`input[data-role='v'][data-j='${j}']`).value || 0); v.push(vi); }
    const yhat = b_o + hidden.reduce((s,h,i)=> s + v[i]*h.a, 0);
    let tex = '';
    hidden.forEach((h,i)=>{
      tex += `$$z_{${i+1}} = b_{${i+1}} + w_{${i+1}1}x_1 + w_{${i+1}2}x_2 = ${Utils.fmt(h.bj)} + ${Utils.fmt(h.w1)}\\cdot${Utils.fmt(x1v)} + ${Utils.fmt(h.w2)}\\cdot${Utils.fmt(x2v)} = ${Utils.fmt(h.z)}$$`;
      tex += `$$a_{${i+1}} = ${Utils.activation[el('activation').value].tex} = ${Utils.fmt(h.a)}$$`;
    });
    tex += `$$\\hat{y} = b_o + \sum_{j=1}^{${nHidden}} v_j a_j = ${Utils.fmt(b_o)} + ${hidden.map((h,i)=> Utils.fmt(v[i]) + '\\cdot' + Utils.fmt(h.a)).join(' + ')} = ${Utils.fmt(yhat)}$$`;
    renderLatex(tex);
    numericOutput.innerHTML = `<strong>hidden</strong>: ${hidden.map(h=>Utils.fmt(h.a)).join(', ')}<br><strong>ŷ</strong>: ${Utils.fmt(yhat)}`;
    logEvent(`FFN compute: yhat=${Utils.fmt(yhat)} hidden=[${hidden.map(h=>Utils.fmt(h.a)).join(', ')}]`);
    window._dt_state = window._dt_state || {}; window._dt_state.ffn = {hidden, b_o, v, yhat, feats};
  }

  hiddenSizeSel.addEventListener('change', ()=>{ const n = parseInt(hiddenSizeSel.value,10); buildFFNControls(n); Visuals.drawFFN(svg,n,2); computeFFN(); });
  el('ffnCompute').addEventListener('click', computeFFN);
  el('ffnRandomize').addEventListener('click', ()=>{ ffnControls.querySelectorAll('input').forEach(i=>{ if(i.type==='number') i.value = (Math.random()-0.5).toFixed(3) }); computeFFN(); logEvent('FFN weights randomized'); });

  // Challenges and hints preserved (omitted here in patch for brevity) --------
  const ffnChallenge = el('ffnChallenge');
  const challengeDesc = el('challengeDesc');
  const challengeFeedback = el('challengeFeedback');
  const checkSolutionBtn = el('checkSolution');
  const showSolutionBtn = el('showSolution');
  const difficulties = ['easy','medium','hard'];

  // Challenges definitions (curated with hints)
  const challenges = [
    { id: 'easy_linear', title:'Linear: simple coeffs', difficulty:'easy',
      desc:'Hidden size 0. Set weights so that \\(\\hat{y} = 2 x_1 + 1 x_2 + 0\\). Use small integers.',
      preset:{x1:4,x2:2,hiddenSize:0,activation:'identity'}, solution:{w0:0,w1:2,w2:1}, tol:1e-3,
      hints:["Recall the linear model: $\\hat{y}=w_0+w_1 x_1 + w_2 x_2$.","Set $w_1=2$, $w_2=1$ and $w_0=0$ for exact match."]
    },
    { id: 'easy_match', title:'Match batting probability', difficulty:'easy',
      desc:'Hidden size 1. Adjust hidden and output weights so that for x1=92,x2=25 the model predicts close to 1.0.',
      preset:{x1:92,x2:25,hiddenSize:1,activation:'identity'}, solution:{ b:[0], w1:[0.01], w2:[0.01], v:[0.01], b_o:0 }, tol:0.1,
      hints:["Try small positive weights for hidden unit to increase activation.","If hidden activation is too small, raise its bias or increase w1/w2. Then adjust output weight v to reach 1.0."]
    },
    { id: 'med_recreate', title:'Recreate a small FFN mapping', difficulty:'medium',
      desc:'Hidden size 2. Find weights such that for input (10,3) the network outputs ~50 (regression-style). Use activation identity.',
      preset:{x1:10,x2:3,hiddenSize:2,activation:'identity'}, solution:{ b:[0,0], w1:[2,3], w2:[0,1], v:[1,2], b_o:0 }, tol:1.0,
      hints:["Think of each hidden neuron as computing a feature (e.g., 2*x1 or 3*x1+x2).","Design v weights to combine hidden features into the target (solve small linear system)."]
    },
    { id: 'med_activation', title:'Activation effect', difficulty:'medium',
      desc:'Hidden size 2. Toggle ReLU and set weights to produce one active and one inactive hidden neuron for given inputs.',
      preset:{x1:5,x2:-2,hiddenSize:2,activation:'relu'}, solution:null, tol:0.5,
      hints:["For ReLU, neurons output max(0,z). To deactivate a neuron, make z negative (bias negative or negative weighted sum).","Try setting one neuron's bias to a large negative value so its activation is 0."]
    },
    { id: 'hard_challenge', title:'Design a small classifier', difficulty:'hard',
      desc:'Hidden size 2. Using sigmoid activations, design weights that produce ŷ>0.8 for positive examples and <0.2 for negatives (manual rule).',
      preset:{x1:8,x2:1,hiddenSize:2,activation:'sigmoid'}, solution:null, tol:0.2,
      hints:["Sigmoid maps large positive z to ~1 and large negative z to ~0.","Create one hidden neuron that activates strongly for positives and another that suppresses negatives, then weight outputs appropriately."]
    },
    { id: 'hard_fit', title:'Fit target output', difficulty:'hard',
      desc:'Hidden size 3. Given input (12,4) produce output ≈ 123. Use identity activation and tune weights.',
      preset:{x1:12,x2:4,hiddenSize:3,activation:'identity'}, solution:{ b:[0,0,0], w1:[2,2,2], w2:[0,0,0], v:[10,20,1], b_o:3 }, tol:2.0,
      hints:["Break the target into contributions from each hidden unit (e.g., target = v1*a1 + v2*a2 + v3*a3 + b_o).","Choose hidden neurons to compute useful basis features (like multiples of x1), then set v to combine them."]
    }
  ];

  const difficultySel = el('challengeDifficulty');
  function populateChallenges(){ const sel = difficultySel.value || 'all'; ffnChallenge.innerHTML = '<option value="none">-- Select a challenge --</option>'; challenges.filter(c=> sel==='all' ? true : c.difficulty===sel ).forEach(ch=>{ const o=document.createElement('option'); o.value=ch.id; o.textContent=`[${ch.difficulty}] ${ch.title}`; ffnChallenge.appendChild(o) }); }

  let hintIndex = 0; const hintBtn = el('hintBtn'); const nextHintBtn = el('nextHintBtn'); const hintBox = el('hintBox');

  function loadChallenge(id){ const ch = challenges.find(c=>c.id===id); if(!ch) return; challengeDesc.innerHTML = ch.desc; hintIndex = 0; hintBox.textContent = ''; if(ch.preset){ el('x1').value = ch.preset.x1; el('x1num').value = ch.preset.x1; el('x2').value = ch.preset.x2; el('x2num').value = ch.preset.x2; hiddenSizeSel.value = ch.preset.hiddenSize; hiddenSizeSel.dispatchEvent(new Event('change')); el('activation').value = ch.preset.activation || 'identity'; computeFFN(); } challengeFeedback.textContent = ''; }

  ffnChallenge.addEventListener('change', ()=>{ loadChallenge(ffnChallenge.value); }); difficultySel.addEventListener('change', ()=>{ populateChallenges(); challengeFeedback.textContent=''; });

  checkSolutionBtn.addEventListener('click', ()=>{ const id = ffnChallenge.value; const ch = challenges.find(c=>c.id===id); if(!ch){ challengeFeedback.textContent = 'Select a challenge first.'; return; } computeFFN(); const state = window._dt_state.ffn; if(ch.preset.hiddenSize === 0){ const w0 = parseFloat(el('w0').value), w1=parseFloat(el('w1').value), w2=parseFloat(el('w2').value); const targetFn = ch.solution; const x1v = parseFloat(el('x1').value), x2v = parseFloat(el('x2').value); const yhat = w0 + w1*x1v + w2*x2v; const ytarget = targetFn.w0 + targetFn.w1*x1v + targetFn.w2*x2v; const ok = Math.abs(yhat-ytarget) <= ch.tol; challengeFeedback.textContent = ok ? `Success — ŷ=${Utils.fmt(yhat)} matches target ${Utils.fmt(ytarget)} within tol ${ch.tol}` : `Not yet — ŷ=${Utils.fmt(yhat)} target ${Utils.fmt(ytarget)} (diff ${Utils.fmt(yhat-ytarget)})`; } else { const yhat = state.yhat; let targetY = null; if(ch.solution && ch.solution.v){ const x1v = parseFloat(el('x1').value), x2v = parseFloat(el('x2').value); const hiddenActs = ch.solution.b.map((b,j)=>{ return b + ch.solution.w1[j]*x1v + ch.solution.w2[j]*x2v }); const ysol = ch.solution.b_o + hiddenActs.reduce((s,h,i)=> s + ch.solution.v[i]*h, 0); targetY = ysol; } if(targetY===null) targetY = 1.0; const ok = Math.abs(yhat - targetY) <= ch.tol; challengeFeedback.textContent = ok ? `Success — ŷ=${Utils.fmt(yhat)} matches challenge target ${Utils.fmt(targetY)} within ${ch.tol}` : `Not yet — ŷ=${Utils.fmt(yhat)} target ${Utils.fmt(targetY)} (diff ${Utils.fmt(yhat-targetY)})`; } });

  showSolutionBtn.addEventListener('click', ()=>{ const id = ffnChallenge.value; const ch = challenges.find(c=>c.id===id); if(!ch){ challengeFeedback.textContent='Select a challenge first.'; return; } if(ch.preset.hiddenSize===0 && ch.solution){ el('w0').value = ch.solution.w0; el('w1').value = ch.solution.w1; el('w2').value = ch.solution.w2; challengeFeedback.textContent='Solution applied to weights.'; } else if(ch.solution && ch.solution.v){ hiddenSizeSel.value = ch.preset.hiddenSize; hiddenSizeSel.dispatchEvent(new Event('change')); ch.solution.b.forEach((bv,j)=>{ const inb = ffnControls.querySelector(`input[data-role='b'][data-j='${j}']`); if(inb) inb.value = bv; const w1i = ffnControls.querySelector(`input[data-role='w'][data-j='${j}'][data-i='1']`); if(w1i) w1i.value = ch.solution.w1[j]; const w2i = ffnControls.querySelector(`input[data-role='w'][data-j='${j}'][data-i='2']`); if(w2i) w2i.value = ch.solution.w2[j]; }); const ob = ffnControls.querySelector('#out_b'); if(ob) ob.value = ch.solution.b_o; ch.solution.v.forEach((vv,j)=>{ const vi = ffnControls.querySelector(`input[data-role='v'][data-j='${j}']`); if(vi) vi.value = vv; }); computeFFN(); challengeFeedback.textContent = 'Solution weights applied.'; } else { challengeFeedback.textContent = 'No solution is available for this challenge.'; } });

  populateChallenges();

  function showNextHint(){ const id = ffnChallenge.value; const ch = challenges.find(c=>c.id===id); if(!ch || !ch.hints || ch.hints.length===0){ hintBox.textContent = 'No hints available for this challenge.'; return; } hintBox.textContent = ch.hints[hintIndex] || 'No more hints.'; hintIndex = Math.min((ch.hints.length), hintIndex+1); }
  hintBtn.addEventListener('click', ()=>{ hintIndex = 0; showNextHint(); }); nextHintBtn.addEventListener('click', ()=>{ showNextHint(); });

  // small helper to log events
  function logEvent(msg){ const t=new Date().toLocaleTimeString(); if(log) log.textContent = `[${t}] ${msg}\n` + log.textContent; }

  // --- Gradient and update functions preserved ---
  function computeGrad(){
    const st = window._dt_state || runForward(false);
    const y = parseFloat(el('yval').value);
    const pred = st.a;
    const actDf = Utils.activation[st.act].df(st.z);
    const dL_da = 2*(pred - y);
    const dL_dz = dL_da * actDf;
    const grads = st.xi.map(xi=> dL_dz * xi);
    const latexParts = [];
    latexParts.push(`$$L=(\\hat{y}-y)^2=( ${Utils.fmt(pred)} - ${Utils.fmt(y)} )^2$$`);
    latexParts.push(`$$\\frac{\\partial L}{\\partial w_0} = 2(\\hat{y}-y)\\cdot 1 = ${Utils.fmt(grads[0])}$$`);
    latexParts.push(`$$\\frac{\\partial L}{\\partial w_1} = 2(\\hat{y}-y)\\cdot x_1 = ${Utils.fmt(grads[1])}$$`);
    latexParts.push(`$$\\frac{\\partial L}{\\partial w_2} = 2(\\hat{y}-y)\\cdot x_2 = ${Utils.fmt(grads[2])}$$`);
    renderLatex(latexParts.join('\n'));
    numericOutput.innerHTML += `<div><strong>grads</strong>: [${grads.map(v=>Utils.fmt(v)).join(', ')}]</div>`;
    window._dt_state.grads = grads;
    logEvent('Computed grads: '+grads.map(v=>Utils.fmt(v)).join(', '));
  }

  function applyUpdate(){
    const st = window._dt_state || runForward(false);
    if(!st.grads) computeGrad();
    const alpha = parseFloat(el('alpha').value);
    const wNew = st.w.map((wi,i)=> wi - alpha * st.grads[i]);
    el('w0').value = Utils.fmt(wNew[0],4); el('w1').value = Utils.fmt(wNew[1],4); el('w2').value = Utils.fmt(wNew[2],4);
    logEvent(`Weights updated: ${wNew.map(v=>Utils.fmt(v)).join(', ')}`);
    const svgEl = document.getElementById('networkSvg'); const e1 = svgEl.querySelector('#edge_x1_h'); if(e1) e1.setAttribute('stroke-width', 2+Math.abs(wNew[1])*40);
  }

  // keyboard shortcuts
  document.addEventListener('keydown', e=>{
    if(e.code==='Space'){ e.preventDefault(); startTrainer(); }
    if(e.key==='r' || e.key==='R'){ randomizeWeights(); }
    if(e.key==='ArrowRight') el('stepBtn').click();
  });

  function randomizeWeights(){ el('w0').value = (Math.random()-0.5).toFixed(3); el('w1').value = (Math.random()-0.5).toFixed(3); el('w2').value = (Math.random()-0.5).toFixed(3); logEvent('Randomized weights'); }

  // expose API
  window.DiamondTrainer = { runForward, computeGrad, applyUpdate, randomizeWeights, initTrainer, startTrainer, stopTrainer, resetTrainer, updateSettings };

  // final initialization
  initTrainer();
});
