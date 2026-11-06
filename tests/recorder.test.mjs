import test from 'node:test';
import assert from 'node:assert/strict';
import {Recorder,csv} from '../dist/recorder.mjs';
test('overlapping keystrokes preserve negative release-to-press timing and ignore repeat',()=>{
 const r=new Recorder({prompt:'ab'});
 for(const [type,code,t] of [['keydown','KeyA',100],['keydown','KeyA',110],['keydown','KeyB',150],['keyup','KeyA',180],['keyup','KeyB',230]])r.add(type,code,t);
 const result=r.finish(240,'ab',true);
 assert.equal(result.valid,true);assert.equal(result.events.length,4);
 assert.deepEqual(result.features.map(f=>f.hold_ms),[80,80]);
 assert.equal(result.features[1].down_down_ms,50);assert.equal(result.features[1].up_down_ms,-30);
 assert.equal(csv([result]).split('\r\n').length,3);
});
test('invalid and incomplete attempts cannot be marked valid',()=>{
 const r=new Recorder({prompt:'ab'});r.add('keydown','KeyA',0);r.invalidate('tab_hidden');
 const result=r.finish(20,'a',false);assert.equal(result.valid,false);
 for(const reason of ['tab_hidden','unreleased_keys','cancelled','text_mismatch'])assert.ok(result.invalid_reasons.includes(reason));
});
test('empty attempts and unmatched keyups produce no biometric pairs',()=>{
 const r=new Recorder({prompt:''});r.add('keyup','KeyA',100);
 const result=r.finish(110,'',true);assert.equal(result.valid,false);assert.deepEqual(result.features,[]);
});
