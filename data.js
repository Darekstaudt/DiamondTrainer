// Sample datasets and CSV parsing
const Data = (function(){
  const samples = {
    'Pitch-to-Hit': `pitch_speed,launch_angle,exit_velocity,hit\n92,25,95,1\n88,15,86,0\n95,30,102,1\n80,5,75,0\n100,40,110,1\n85,10,80,0\n90,20,92,1\n78,-2,70,0\n96,28,105,1\n89,18,88,0`,
    'ExitVelocity': `pitch_speed,launch_angle,exit_velocity\n92,25,95\n88,15,86\n95,30,102\n80,5,75\n100,40,110`
  };
  function list(){ return Object.keys(samples) }
  function get(name){ return parseCSV(samples[name]) }
  function parseCSV(text){
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map(s=>s.trim());
    const rows = lines.slice(1).map((line,ri)=>{
      const cols = line.split(',');
      const obj = {};
      cols.forEach((c,i)=>{ const v=parseFloat(c); obj[headers[i]] = Number.isNaN(v)?c:v });
      return obj;
    });
    return {headers,rows};
  }
  function parseUpload(file,cb){
    const r = new FileReader(); r.onload=()=>{ try{ cb(null,parseCSV(r.result)) }catch(e){ cb(e) } }; r.onerror=()=>cb(new Error('read error')); r.readAsText(file);
  }
  return {list,get,parseUpload,parseCSV};
})();

export default Data;
