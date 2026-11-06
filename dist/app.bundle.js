/* Browser bundle: avoids ES module MIME-type dependencies. */
(()=>{
'use strict';
const SCHEMA_VERSION = '1.0.0';
function features(events) {
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
class Recorder {
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
function csv(records){
 const cols=['schema_version','attempt_id','participant_id','session_id','session_uuid','keyboard','prompt_id','prompt','started_at','valid','invalid_reasons','duration_ms','code','event_index','down_ms','up_ms','hold_ms','down_down_ms','up_down_ms'];
 const esc=x=>'"'+String(x??'').replaceAll('"','""')+'"';
 return [cols.join(','),...records.flatMap(r=>r.features.map(f=>cols.map(k=>esc(k==='invalid_reasons'?r.invalid_reasons.join('|'):(f[k]??r[k]))).join(',')))].join('\r\n');
}

const uuid=()=>crypto.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const v=crypto.getRandomValues(new Uint8Array(1))[0]&15;return(c==='x'?v:(v&3)|8).toString(16);});
const $=id=>document.getElementById(id), KEY='typing-fingerprint-records-v1';
let records=[],active=null,timer=null,sessionUuid=uuid(),sessionKey='',storageReady=true;
try{records=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(records))throw Error();localStorage.setItem('tf-storage-check','1');localStorage.removeItem('tf-storage-check');}catch{storageReady=false;notify('Không đọc/lưu được dữ liệu trình duyệt. Bạn vẫn có thể thu và xuất file trong phiên này.');}
function notify(s){$('notice').textContent=s;$('notice').classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>$('notice').classList.remove('show'),6000);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(records));storageReady=true;}catch{storageReady=false;notify('Bộ nhớ trình duyệt không lưu được. Hãy xuất JSON ngay trước khi đóng trang.');}}
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function renderPrompt(){const text=$('typing').value,prompt=$('target').value;const frag=document.createDocumentFragment();[...prompt].forEach((c,i)=>{const s=document.createElement('span');s.textContent=c;if(i<text.length)s.className=text[i]===c?'done':'wrong';frag.append(s);});$('prompt').replaceChildren(frag);$('count').textContent=text.length+' / '+prompt.length;$('progress').style.width=Math.min(100,text.length/prompt.length*100)+'%';}
function update(){renderPrompt();if(!active)return;const f=features(active.events);const avg=f.length?Math.round(f.reduce((s,x)=>s+x.hold_ms,0)/f.length):'—';$('hold').innerHTML=avg+'<small> ms</small>';$('presses').textContent=active.events.filter(e=>e.type==='keydown').length;const bars=f.slice(-50).map(x=>{const el=document.createElement('div');el.className='bar';el.style.height=Math.max(3,Math.min(60,x.hold_ms/6))+'px';el.title=x.code+': '+Math.round(x.hold_ms)+' ms';return el;});if(bars.length)$('signal').replaceChildren(...bars);$('finish').disabled=$('typing').value!==active.meta.prompt||active.held.size>0;const invalid=active.reasons.size>0;$('state').textContent=invalid?'Lượt không hợp lệ':'Đang thu';$('state').className='badge '+(invalid?'invalid':'active');$('hint').textContent=invalid?'Lượt này có gián đoạn; hãy hủy và thu lại.':$('typing').value===active.meta.prompt?'Đã đúng câu. Nhấn Enter hoặc lưu lượt thu.':'Gõ đúng câu mẫu; Backspace được phép.';}
function invalidate(reason){if(!active)return;active.invalidate(reason);update();}
function end(complete){if(!active)return;const r=active.finish(performance.now(),$('typing').value,complete);records.push(r);persist();active=null;clearInterval(timer);$('typing').disabled=true;$('finish').disabled=true;$('cancel').disabled=true;[...$('setup').elements].forEach(e=>e.disabled=false);$('state').className='badge'+(r.valid?'':' invalid');$('state').textContent=r.valid?'Đã lưu':'Đã lưu · Không hợp lệ';$('hint').textContent=r.valid?'Đã lưu lượt thu. Bắt đầu lượt tiếp theo khi bạn sẵn sàng.':'Lượt không hợp lệ được giữ để kiểm tra chất lượng.';renderRecords();notify(r.valid?'Đã lưu lượt thu'+(storageReady?'.':' trong bộ nhớ tạm. Hãy xuất file.'):'Đã ghi nhận lượt không hợp lệ.');}
$('setup').addEventListener('submit',e=>{e.preventDefault();if(active)return;if(!$('consent').checked){notify('Cần đồng ý thu thập dữ liệu trước khi bắt đầu.');$('consent').focus();return;}const participant=$('participant').value.trim(),session=$('session').value.trim();if(!/^[A-Za-z0-9_-]{1,40}$/.test(participant)||!session){notify('Nhập mã người tham gia hợp lệ và mã buổi thu.');return;}const sk=participant+'|'+session+'|'+$('keyboard').value;if(sk!==sessionKey){sessionUuid=uuid();sessionKey=sk;}active=new Recorder({attempt_id:uuid(),participant_id:participant,session_id:session,session_uuid:sessionUuid,keyboard:$('keyboard').value,prompt_id:'phrase-'+($('target').selectedIndex+1),prompt:$('target').value,started_at:new Date().toISOString(),consent:{accepted:true,version:'1',accepted_at:new Date().toISOString()},environment:{user_agent:navigator.userAgent,language:navigator.language,time_origin_ms:performance.timeOrigin},timing:'performance.now; relative to first captured keydown'});[...$('setup').elements].forEach(x=>x.disabled=true);$('typing').disabled=false;$('typing').value='';$('typing').placeholder='Gõ câu mẫu tại đây…';$('typing').focus();$('cancel').disabled=false;$('elapsed').innerHTML='0.0<small> s</small>';$('signal').replaceChildren();update();timer=setInterval(()=>{if(active&&active.started!==null)$('elapsed').innerHTML=((performance.now()-active.started)/1000).toFixed(1)+'<small> s</small>';},100);});
$('typing').addEventListener('keydown',e=>{if(!active)return;if(e.key==='Tab'){invalidate('focus_navigation');return;}if(e.key==='Enter'){e.preventDefault();if(!e.repeat&&$('typing').value===active.meta.prompt&&active.held.size===0)end(true);return;}if(e.repeat)return;if(!e.isTrusted)invalidate('untrusted_event');if(e.isComposing||e.keyCode===229)invalidate('ime_composition');if(e.ctrlKey||e.metaKey||e.altKey)invalidate('modifier_shortcut');active.add('keydown',e.code||'Unidentified',performance.now());update();});
$('typing').addEventListener('keyup',e=>{if(!active||e.key==='Enter'||e.key==='Tab')return;active.add('keyup',e.code||'Unidentified',performance.now());update();});
$('typing').addEventListener('input',e=>{if(active){if(!e.isTrusted)invalidate('untrusted_input');if(!['insertText','deleteContentBackward','deleteContentForward'].includes(e.inputType))invalidate('unsupported_input');if(active.events.length===0)invalidate('input_without_keystrokes');}update();});
for(const type of ['paste','drop','cut'])$('typing').addEventListener(type,e=>{e.preventDefault();invalidate('clipboard_or_drop');notify('Lượt đã bị đánh dấu không hợp lệ do thao tác clipboard/kéo thả.');});
$('typing').addEventListener('compositionstart',()=>invalidate('ime_composition'));
$('typing').addEventListener('blur',()=>invalidate('focus_lost'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)invalidate('tab_hidden');});window.addEventListener('blur',()=>invalidate('window_blur'));
// Keep focus in the capture area until the finish/cancel click is handled.
for(const id of ['finish','cancel'])$(id).addEventListener('mousedown',e=>e.preventDefault());
$('finish').addEventListener('click',()=>{if(active&&$('typing').value===active.meta.prompt&&!active.held.size)end(true);});
$('cancel').addEventListener('click',()=>end(false));
$('target').addEventListener('change',()=>{if(!active){$('typing').value='';renderPrompt();}});
function renderRecords(){const body=$('rows');body.replaceChildren();$('total').textContent=records.length;$('empty').hidden=records.length>0;for(const r of [...records].reverse()){const tr=document.createElement('tr');const values=[r.participant_id+' / '+r.session_id,new Date(r.started_at).toLocaleString('vi-VN'),(r.duration_ms/1000).toFixed(2)+' s',String(r.summary.key_presses)];for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}const status=document.createElement('td'),tag=document.createElement('span');tag.className=r.valid?'ok':'bad';tag.textContent=r.valid?'Hợp lệ':'Không hợp lệ';status.append(tag);if(!r.valid){const why=document.createElement('small');why.textContent=r.invalid_reasons.join(', ');status.append(why);}tr.append(status);const action=document.createElement('td'),button=document.createElement('button');button.className='row-delete';button.textContent='×';button.setAttribute('aria-label','Xóa lượt '+r.participant_id+' '+r.started_at);button.disabled=!!active;button.onclick=()=>{if(active)return;if(confirm('Xóa lượt thu này khỏi trình duyệt?')){records=records.filter(x=>x.attempt_id!==r.attempt_id);persist();renderRecords();}};action.append(button);tr.append(action);body.append(tr);}$('json').disabled=!records.length;$('csv').disabled=!records.length;$('clear').disabled=!records.length||!!active;}
$('json').onclick=()=>download(JSON.stringify({schema_version:SCHEMA_VERSION,exported_at:new Date().toISOString(),records},null,2),'typing-fingerprint-'+new Date().toISOString().slice(0,10)+'.json','application/json');
$('csv').onclick=()=>{const f=records.reduce((s,r)=>s+r.features.length,0);if(!f){notify('Chưa có cặp nhấn/thả hoàn chỉnh. Hãy xuất JSON gốc.');return;}download('\uFEFF'+csv(records),'typing-features-'+new Date().toISOString().slice(0,10)+'.csv','text/csv;charset=utf-8');};
$('clear').onclick=()=>{if(!active&&confirm('Xóa toàn bộ '+records.length+' lượt trên trình duyệt này? Hãy xuất JSON trước khi xóa.')){records=[];persist();renderRecords();notify('Đã xóa các lượt thu trên trình duyệt.');}};
window.addEventListener('beforeunload',e=>{if(active||(!storageReady&&records.length)){e.preventDefault();e.returnValue='';}});
renderPrompt();renderRecords();

document.getElementById('start').disabled=false;
})();
