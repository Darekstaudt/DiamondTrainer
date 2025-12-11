// Small numeric helpers used across app
const Utils = {
  dot: (a,b)=>{ let s=0; for(let i=0;i<a.length;i++) s+=a[i]*b[i]; return s; },
  add: (a,b)=>a.map((v,i)=>v+b[i]),
  scalarMul: (a,k)=>a.map(v=>v*k),
  mean: arr=>arr.reduce((s,v)=>s+v,0)/arr.length,
  clamp: (v,min,max)=>Math.max(min,Math.min(max,v)),
  // activations
  activation: {
    identity: {f: z=>z, df: z=>1, tex: '\\text{Identity}(z)=z'},
    sigmoid: {f: z=>1/(1+Math.exp(-z)), df: z=>{const s=1/(1+Math.exp(-z)); return s*(1-s)}, tex: '\\sigma(z)=\\frac{1}{1+e^{-z}}'},
    relu: {f: z=>Math.max(0,z), df: z=> z>0?1:0, tex: '\\mathrm{ReLU}(z)=\\max(0,z)'}
  },
  fmt: (n,prec=4)=>{ if(!isFinite(n)) return String(n); return Number.parseFloat(n).toFixed(prec); }
};

export default Utils;
