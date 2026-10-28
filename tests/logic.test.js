const assert = require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/logic.js'),'utf8');
const L=vm.runInNewContext(src+'\nTimeBoardLogic',{Date,Map,Number,String,Math,Array,Object});
const now=new Date(2026,9,28,15), nine=new Date(2026,9,28,9).getTime();
const plans=[{}, {dueDay:'2026-11-03'}, {dueWithTime:nine,timeEstimate:7200000}];
const deadlines=[{}, {deadlineDay:'2026-11-09'}, {deadlineWithTime:new Date(2026,10,9,10).getTime()}];
for(let i=0;i<3;i++)for(let j=0;j<3;j++){
  const r=L.classify({id:`case-${i}-${j}`,...plans[i],...deadlines[j]},null,now);
  assert.equal(r.lane,i===0?(['unscheduled','month','month'][j]):(['unscheduled','week','today'][i]));
  assert.equal(r.deadline.kind,['none','day','time'][j]);
}
const lane=(t)=>L.classify(t,null,now).lane;
assert.equal(lane({id:'no-date',deadlineDay:'2026-10-29'}),'week');
assert.equal(lane({id:'deadline-only',deadlineWithTime:new Date(2026,9,28,11).getTime()}),'today');
assert.equal(lane({id:'no-both'}),'unscheduled');
assert.equal(lane({id:'legacy-only',plannedAt:nine}),'unknown');
assert.equal(lane({id:'legacy-deadline',plannedAt:nine,deadlineDay:'2026-10-31'}),'week');
assert.equal(lane({id:'three-days',deadlineDay:'2026-10-31'}),'week');
assert.equal(L.classify({deadlineDay:'2026-10-31'},null,now).placementSource,'deadline');
assert.equal(L.classify({dueDay:'2026-11-06',deadlineDay:'2026-10-31'},null,now).placementSource,'plan');
assert.equal(lane({id:'invalid-day',dueDay:'2026-02-30'}),'unknown');
assert.equal(lane({id:'invalid-time',dueWithTime:123}),'unknown');
assert.equal(lane({id:'today',dueDay:'2026-10-28',deadlineDay:'2026-11-09'}),'today');
assert.equal(lane({id:'d7',dueDay:'2026-11-04'}),'week');
assert.equal(lane({id:'d8',dueDay:'2026-11-05'}),'month');
assert.equal(lane({id:'d30',dueDay:'2026-11-27'}),'month');
assert.equal(lane({id:'d31',dueDay:'2026-11-28'}),'future');
const old=L.classify({dueWithTime:nine,timeEstimate:7200000},null,now);
assert.equal(old.time.kind,'windowElapsed');
assert.equal(L.formatElapsed(old.time.ms,'zh'),'4小时');
assert.equal(L.timeState({timeEstimate:0},{day:'2026-10-28',startMs:nine},now).kind,'startElapsed');
const midnight=new Date(2026,9,28,0,0).getTime();
assert.equal(L.classify({dueWithTime:midnight,timeEstimate:3600000},null,now).time.kind,'windowElapsed');
assert.equal(L.deadlineState(L.deadlineFor({deadlineDay:'2026-10-28'}),now).kind,'today');
assert.equal(L.deadlineState(L.deadlineFor({deadlineDay:'2026-10-27'}),now).kind,'overdueDay');
assert.equal(L.deadlineState(L.deadlineFor({deadlineWithTime:new Date(2026,9,28,11).getTime()}),now).kind,'overdueExact');
assert.equal(L.conflicting({day:'2026-11-10',startMs:null},{day:'2026-11-09',at:null}),true);
assert.equal(L.conflicting({day:'2026-11-09',startMs:null},{day:'2026-11-09',at:null}),false);
const m=JSON.parse(fs.readFileSync(path.join(__dirname,'../manifest.json'),'utf8'));
assert.equal(m.version,'1.1.0');
assert.ok(!m.permissions.includes('getAppState'));
console.log('PASS: nine schedule/deadline combinations, deadline fallback without plan, dates +3 / +7 / +30, ambiguous/invalid values, midnight, overdue reminders');

// Risk window: 1 / 3 / 7 calendar days; inclusive boundaries; overdue and conflicts.
const dateAt = (d,h=0,m=0)=>new Date(2026,9,28+d,h,m).getTime();
for(const threshold of [1,3,7]){
  assert.equal(L.deadlineState(L.deadlineFor({deadlineDay:'2026-10-29'}),now,threshold).kind,'soonDay');
  assert.equal(L.deadlineState(L.deadlineFor({deadlineDay:new Date(2026,9,28+threshold).getFullYear()+'-'+String(new Date(2026,9,28+threshold).getMonth()+1).padStart(2,'0')+'-'+String(new Date(2026,9,28+threshold).getDate()).padStart(2,'0')}),now,threshold).kind,'soonDay');
  assert.equal(L.deadlineState(L.deadlineFor({deadlineWithTime:dateAt(threshold,23,59)}),now,threshold).kind,'soonExact');
  assert.equal(L.deadlineState(L.deadlineFor({deadlineWithTime:dateAt(threshold+1,0,0)}),now,threshold).kind,'future');
}
assert.equal(L.deadlineState(L.deadlineFor({deadlineDay:'2026-10-30'}),now,1).kind,'future');
assert.equal(L.deadlineState(L.deadlineFor({deadlineDay:'2026-10-31'}),now,3).kind,'soonDay');
assert.equal(L.deadlineState(L.deadlineFor({deadlineDay:'2026-11-01'}),now,3).kind,'future');
console.log('PASS: configurable 1/3/7 calendar-day risk windows, timed boundary and default behavior');
