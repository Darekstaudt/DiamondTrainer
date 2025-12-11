// Simple SVG visuals and lightweight animation helpers
const Visuals = (function(){
  function drawNetwork(svg){
    // legacy single-hidden drawing for backward compatibility
    return drawFFN(svg,1,2);
  }

  function drawFFN(svg, nHidden=1, nInputs=2){
    svg.innerHTML = '';
    const ns = 'http://www.w3.org/2000/svg';
    const padding = 60;
    const width = 760; const height = 320;
    const inputX = 120; const hiddenX = 360; const outX = 620;
    const inputs = [];
    for(let i=0;i<nInputs;i++){
      const y = padding + i*( (height - 2*padding)/(Math.max(1,nInputs-1)) );
      const c = createCircle(inputX,y,'#fff'); c.setAttribute('id',`node_x${i+1}`);
      svg.appendChild(c); inputs.push([inputX,y]);
    }
    const hidden = [];
    for(let j=0;j<nHidden;j++){
      const y = padding + j*( (height - 2*padding)/(Math.max(1,nHidden-1)) );
      const c = createCircle(hiddenX,y,'#fff'); c.setAttribute('id',`node_h${j+1}`);
      svg.appendChild(c); hidden.push([hiddenX,y]);
    }
    const outY = height/2; const out = createCircle(outX,outY,'#fff'); out.setAttribute('id','node_out'); svg.appendChild(out);

    // edges
    for(let i=0;i<nInputs;i++){
      for(let j=0;j<nHidden;j++){
        const id = `edge_x${i+1}_h${j+1}`;
        svg.appendChild(createLine(inputs[i][0]+30,inputs[i][1], hidden[j][0]-30, hidden[j][1], id));
      }
    }
    for(let j=0;j<nHidden;j++){
      const id = `edge_h${j+1}_out`;
      svg.appendChild(createLine(hidden[j][0]+30,hidden[j][1], outX-30,outY, id));
    }

    // ball
    const ball = document.createElementNS(ns,'circle'); ball.setAttribute('r',10); ball.setAttribute('fill','#D7263D'); ball.setAttribute('id','animBall'); ball.setAttribute('cx',inputX-20); ball.setAttribute('cy',padding-20);
    svg.appendChild(ball);

    function createCircle(x,y,fill){ const c=document.createElementNS(ns,'circle'); c.setAttribute('cx',x); c.setAttribute('cy',y); c.setAttribute('r',28); c.setAttribute('fill',fill); c.setAttribute('stroke','#999'); return c }
    function createLine(x1,y1,x2,y2,id){ const l=document.createElementNS(ns,'line'); l.setAttribute('x1',x1); l.setAttribute('y1',y1); l.setAttribute('x2',x2); l.setAttribute('y2',y2); l.setAttribute('stroke','#bbb'); l.setAttribute('stroke-width',3); if(id) l.setAttribute('id',id); return l }

    return {inputs,hidden,out:[outX,outY]};
  }

  function animateBall(svg, pathPts=[], options={duration:1200}){
    const ball = svg.querySelector('#animBall'); if(!ball) return;
    const total = pathPts.length; if(total<2) return;
    const start = performance.now();
    const dur = options.duration;
    function tick(now){
      const t = Utils.clamp((now-start)/dur,0,1);
      const idx = Math.floor((total-1)*t);
      const frac = (total-1)*t - idx;
      const [x1,y1] = pathPts[idx];
      const [x2,y2] = pathPts[Math.min(idx+1,total-1)];
      const cx = x1 + (x2-x1)*frac;
      const cy = y1 + (y2-y1)*frac;
      ball.setAttribute('cx',cx); ball.setAttribute('cy',cy);
      if(t<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  return { drawNetwork, animateBall };
})();

export default Visuals;
