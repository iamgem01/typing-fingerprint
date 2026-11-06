export const SCHEMA_VERSION = '1.0.0';
export function features(events) {
  const held = new Map(), rows = [];
  for (const e of events) {
    if(e.type === 'keydown') { if(!held.has(e.code)) held.set(e.code,e); }
    if(e.type === 'keyup' && held.has(e.code)) {
      const down=held.get(e.code); held.delete(e.code);
      rows.push({code:e.code,down_ms:down.t_ms,up_ms:e.t_ms,hold_ms:e.t_ms-down.t_ms,event_index:down.index});
    }
  }
  rows.sort((a,b)=>a.down_ms-b.down_ms || a.event_index-b.event_index);
  return rows.map((r,i)=>({...r,down_down_ms:i? r.down_ms-rows[i-1].down_ms:null,up_down_ms:i? r.down_ms-rows[i-1].up_ms:null}));
}
export class Recorder {
  constructor(meta) {this.meta=meta;this.events=[];this.held=new Set();this.reasons=new Set();this.started=null;this.ended=null;}
  add(type,code,time) {
    if(this.started===null) this.started=time;
    if(type==='keydown') {if(this.held.has(code)) return;this.held.add(code);}
    if(type==='keyup') {if(!this.held.has(code))return;this.held.delete(code);}
    this.events.push({index:this.events.length,type,code,t_ms:Math.round((time-this.started)*1000)/1000});
  }
  invalidate(reason){this.reasons.add(reason);}
  finish(time,text,complete) {
    this.ended=time;
    if(this.held.size)this.invalidate('unreleased_keys');
    if(!complete)this.invalidate('cancelled');
    if(text!==this.meta.prompt)this.invalidate('text_mismatch');
    if(!this.events.length)this.invalidate('no_keystrokes');
    const f=features(this.events), duration=this.started===null?0:time-this.started;
    return {...this.meta,schema_version:SCHEMA_VERSION,finished_at:new Date().toISOString(),duration_ms:Math.round(duration*1000)/1000,valid:this.reasons.size===0,invalid_reasons:[...this.reasons],final_text:text,events:this.events,features:f,summary:{key_presses:this.events.filter(e=>e.type==='keydown').length,backspaces:this.events.filter(e=>e.type==='keydown'&&e.code==='Backspace').length,mean_hold_ms:f.length?f.reduce((s,x)=>s+x.hold_ms,0)/f.length:null}};
  }
}
export function csv(records){
 const cols=['schema_version','attempt_id','participant_id','session_id','session_uuid','keyboard','prompt_id','prompt','started_at','valid','invalid_reasons','duration_ms','code','event_index','down_ms','up_ms','hold_ms','down_down_ms','up_down_ms'];
 const esc=x=>'"'+String(x??'').replaceAll('"','""')+'"';
 return [cols.join(','),...records.flatMap(r=>r.features.map(f=>cols.map(k=>esc(k==='invalid_reasons'?r.invalid_reasons.join('|'):(f[k]??r[k]))).join(',')))].join('\r\n');
}
