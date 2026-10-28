/* Dynamic Time Board v1.1.0 - pure, read-only classification logic.
 * Scheduling fields: dueWithTime/dueDay exposed by the official Task API.
 * Deadline fields: deadlineWithTime/deadlineDay; control the lane ONLY when no task schedule is available.
 * Risk warning window is user-configurable (1 / 3 / 7 local calendar days; default 3).
 * getAppState() explicitly omits planner.days; do not assert Planner membership.
 * The no-date bucket means "neither readable task schedule nor deadline"; deadlines can be fallback placements.
 * A standalone plannedAt is ambiguous and stays in the separate unknown bucket.
 */
const TimeBoardLogic = (() => {
  'use strict';
  const pad = n => String(n).padStart(2,'0');
  const key = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const dateOnly = v => {
    if(typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    const [y,m,d] = v.split('-').map(Number);
    const x = new Date(y,m-1,d);
    return x.getFullYear()===y && x.getMonth()===m-1 && x.getDate()===d ? v : null;
  };
  const stamp = v => {
    if(typeof v !== 'number' || !Number.isFinite(v) || v < 946684800000 || v > 4102444800000) return null;
    return v;
  };
  const addDays = (date,days) => key(new Date(date.getFullYear(),date.getMonth(),date.getDate()+days));
  const fromLocalDay = v => {const d=dateOnly(v);if(!d)return null;const [y,m,day]=d.split('-').map(Number);return new Date(y,m-1,day);};
  function planFor(task) {
    // dueWithTime and dueDay describe task scheduling, NOT deadline fields.
    // dueWithTime can be exactly 00:00, which is still a valid scheduled time.
    const hasTimed=task?.dueWithTime!=null && task.dueWithTime!=='';
    const hasDay=task?.dueDay!=null && task.dueDay!=='';
    const ts=stamp(task?.dueWithTime);
    if(ts!==null) return {day:key(new Date(ts)),startMs:ts,source:'timed',kind:'scheduled'};
    const day=dateOnly(task?.dueDay);
    if(day) return {day,startMs:null,source:'day',kind:'scheduled'};
    // Invalid nonempty scheduling data must never be silently labeled unscheduled.
    if(hasTimed || hasDay) return {day:null,startMs:null,source:'invalid',kind:'unknown'};
    // plannedAt alone is not authoritative: it does not guarantee Planner membership.
    if(task?.plannedAt!=null && task.plannedAt!=='' && task.plannedAt!==0)
      return {day:null,startMs:null,source:'legacy',kind:'unknown'};
    // Accurate, narrow statement: the Task API exposes no planned day/time.
    // We cannot inspect independent Planner days through the official PluginAppState.
    return {day:null,startMs:null,source:'none',kind:'unscheduled'};
  }
  function lane(plan,today){if(!plan.day)return plan.kind;const d=key(today);if(plan.day<=d)return 'today';if(plan.day<=addDays(today,7))return 'week';if(plan.day<=addDays(today,30))return 'month';return 'future';}
  function deadlineFor(task){const ts=stamp(task?.deadlineWithTime);const d=ts!==null?key(new Date(ts)):dateOnly(task?.deadlineDay);return {day:d,at:ts,kind:ts!==null?'time':d?'day':'none'};}
  const daysBetween = (start,end) => {
    const a=fromLocalDay(start),b=fromLocalDay(end);
    return a&&b?Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000):null;
  };
  function timeState(task,plan,now){
    if(plan.startMs===null)return {kind:plan.day&&plan.day<key(now)?'missedDay':'none',ms:null,days:plan.day?daysBetween(plan.day,key(now)):null};
    const estimate=task?.timeEstimate;
    const validEstimate=typeof estimate==='number'&&Number.isFinite(estimate)&&estimate>0;
    const end=plan.startMs+(validEstimate?estimate:0);
    if(now.getTime()<plan.startMs)return {kind:'beforeStart',ms:plan.startMs-now.getTime()};
    if(validEstimate && now.getTime()<=end)return {kind:'inWindow',ms:end-now.getTime()};
    if(!validEstimate)return {kind:'startElapsed',ms:now.getTime()-plan.startMs};
    return {kind:'windowElapsed',ms:now.getTime()-end};
  }
  function deadlineState(deadline,now,riskDays=3){
    if(deadline.kind==='none')return {kind:'none'};
    // Risk windows are calendar-based. For timed deadlines we still use the exact
    // timestamp to detect overdue status and display a precise countdown.
    const dayDistance=daysBetween(key(now),deadline.day);
    const windowDays=[1,3,7].includes(riskDays)?riskDays:3;
    if(deadline.at!==null){
      const diff=deadline.at-now.getTime();
      if(diff<0)return {kind:'overdueExact',ms:-diff};
      if(dayDistance!==null && dayDistance<=windowDays)return {kind:'soonExact',ms:diff};
      return {kind:'future'};
    }
    if(dayDistance<0)return {kind:'overdueDay',days:-dayDistance};
    if(dayDistance===0)return {kind:'today'};
    if(dayDistance<=windowDays)return {kind:'soonDay',days:dayDistance};
    return {kind:'future'};
  }
  function conflicting(plan,deadline){
    if(!plan.day||!deadline.day)return false;
    if(plan.startMs!==null && deadline.at!==null) return plan.startMs>deadline.at;
    // Date-only deadline lasts through the end of the calendar day.
    return plan.day>deadline.day;
  }
  function formatElapsed(ms,language){
    const mins=Math.max(1,Math.floor(Math.max(0,ms)/60000));
    const d=Math.floor(mins/1440),h=Math.floor((mins%1440)/60),m=mins%60;
    return language==='zh'?[d?`${d}天`:'',h?`${h}小时`:'',!d&&(!h||m)?`${m}分钟`:''].filter(Boolean).join(''):[d?`${d}d`:'',h?`${h}h`:'',!d&&(!h||m)?`${m}m`:''].filter(Boolean).join(' ');
  }
  const clock=ts=>{const d=new Date(ts);return `${pad(d.getHours())}:${pad(d.getMinutes())}`;};
  function planLabel(plan,task){if(!plan.day)return null;if(plan.startMs===null)return plan.day;const estimate=task.timeEstimate;const end=typeof estimate==='number'&&estimate>0?plan.startMs+estimate:null;return `${plan.day} ${clock(plan.startMs)}${end===null?'':`–${key(new Date(end))===plan.day?clock(end):`${key(new Date(end))} ${clock(end)}`}`}`;}
  function classify(task,planner,now,riskDays=3){
    const plan=planFor(task),deadline=deadlineFor(task);
    // A scheduled date always wins. When absent, a deadline is only a *placement fallback*,
    // never misrepresented as a task plan or as a scheduled execution time.
    let placementSource='none',placementDay=null,placementAt=null,placementLane='unscheduled';
    if(plan.day){placementSource='plan';placementDay=plan.day;placementAt=plan.startMs;placementLane=lane(plan,now);}
    else if(deadline.day){placementSource='deadline';placementDay=deadline.day;placementAt=deadline.at;
      placementLane=lane({day:deadline.day,kind:'scheduled'},now);}
    else if(plan.kind==='unknown'){placementSource='unknown';placementLane='unknown';}
    return {plan,deadline,placementSource,placementDay,placementAt,lane:placementLane,
      time:timeState(task,plan,now),risk:deadlineState(deadline,now,riskDays),conflict:conflicting(plan,deadline)};
  }
  return {key,dateOnly,stamp,addDays,planFor,lane,deadlineFor,daysBetween,timeState,deadlineState,conflicting,formatElapsed,planLabel,classify};
})();
