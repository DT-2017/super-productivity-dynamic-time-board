(()=>{'use strict';
const L=TimeBoardLogic;
const translations={
 en:{title:'Dynamic Time Board',summary:'Planned dates first; deadlines are a fallback when no plan is set.',today:'Today',week:'Next 7 Days',month:'Days 8–30',future:'Beyond 30 Days',todayHint:'Today + unfinished earlier plans',weekHint:'Tomorrow through day 7',monthHint:'Day 8 through day 30',futureHint:'Day 31 onward',all:'All Projects',refresh:'Refresh Tasks',showHelp:'Show Help',hideHelp:'Hide Help',lang:'Language',project:'Project',noPlans:'No Plan or Deadline',unverified:'Schedule Unverified',risk:'Deadline Alerts',riskHint:'Overdue and due-today tasks, deadlines within the next {days} local calendar day(s), plus plans scheduled after their deadlines. The window counts today as day 0 and includes day {days}. Timed deadlines use the exact clock for overdue status. Alerts never move tasks.',noPlanHint:'Neither a task schedule nor a deadline was found in readable task fields. Deadline-only tasks appear in the dated columns with a fallback label.',unknownHint:'A standalone plannedAt or invalid schedule field needs review. With no deadline, these tasks are shown here rather than treated as unscheduled.',noData:'No tasks',expand:'Expand',collapse:'Collapse',planned:'Planned',deadline:'Deadline',noDeadline:'No deadline',inbox:'Inbox',loading:'Loading tasks…',readError:'Could not read tasks: {error}',apiMissing:'PluginAPI.getTasks is unavailable',status:'{total} tasks read · {shown} incomplete top-level tasks · Refreshed {at}',asOf:'Today: {day} · Rolling calendar-day windows · Local time',planLate:'Planned day passed {days}d ago — reschedule',startPast:'Scheduled start passed by {elapsed}',windowPast:'Past estimated end by {elapsed}',inWindow:'Within estimated time window',beforeStart:'Scheduled to start in {elapsed}',dueToday:'Deadline today',dueTomorrow:'Deadline tomorrow',dueIn:'Deadline in {days} days',dueLate:'Deadline overdue by {days} days',dueLateTime:'Deadline overdue by {elapsed}',dueSoonTime:'Deadline in {elapsed}',conflict:'Plan after deadline',estimateNote:'Time-window status uses task time estimate; it is not a formal deadline.',dataLimited:'Some Planner-only scheduling cannot be verified with the plugin API. Deadline fallback does not mean an execution plan exists.',planSource:'Planner',taskSource:'Task schedule',legacySource:'PlannedAt only (unverified)',fallback:'No execution plan · grouped by deadline',prefsUnavailable:'Preference storage unavailable; language or expansion may reset when reopening.',dayOnly:'Date-only plan',countText:'tasks',unknownLegacy:'Schedule information is ambiguous',riskWindow:'Alert ahead',riskDays1:'1 day',riskDays3:'3 days',riskDays7:'7 days'},
 zh:{title:'动态时间规划看板',summary:'计划日期优先；没有计划日期时，按截止日期暂时归类。',today:'今天',week:'未来7天',month:'未来8–30天',future:'30天以后',todayHint:'今天计划及过去未完成的计划',weekHint:'明天至第7天',monthHint:'第8天至第30天',futureHint:'第31天及以后',all:'所有项目',refresh:'刷新任务',showHelp:'显示说明',hideHelp:'隐藏说明',lang:'语言',project:'项目',noPlans:'无计划及截止日期',unverified:'计划状态待确认',risk:'截止风险提醒',riskHint:'显示已逾期、今天截止、未来{days}个自然日内截止（今天为第0天，包含第{days}天），以及计划安排晚于截止期限的任务。带具体时刻的任务按实际时刻判断是否逾期；提醒不改变任务所在列。',noPlanHint:'未找到可读取的计划日期或截止日期。仅有截止日期的任务已按截止日期进入上方时间列，并标注“未计划”。',unknownHint:'仅有 plannedAt 或存在无效的排程字段，且没有有效截止日期时，暂时单列核实。',noData:'暂无任务',expand:'展开',collapse:'收起',planned:'计划',deadline:'截止',noDeadline:'无截止',inbox:'收集箱',loading:'正在读取任务…',readError:'读取任务失败：{error}',apiMissing:'当前未提供 PluginAPI.getTasks',status:'读取 {total} 项任务 · 显示 {shown} 项未完成的顶层任务 · 更新于 {at}',asOf:'今天：{day} · 滚动日历日 · 本地时间',planLate:'计划日期已过 {days} 天，待重排',startPast:'计划开始已过 {elapsed}',windowPast:'超过预计结束时间 {elapsed}',inWindow:'处于预计执行时段',beforeStart:'距离计划开始还有 {elapsed}',dueToday:'今天截止',dueTomorrow:'明天截止',dueIn:'距离截止还有 {days} 天',dueLate:'截止已逾期 {days} 天',dueLateTime:'截止逾期 {elapsed}',dueSoonTime:'距离截止还有 {elapsed}',conflict:'计划晚于截止期限',estimateNote:'执行时段根据预计工时推算，不等于正式截止期限。',dataLimited:'插件无法核实全部 Planner 独立排程；按截止日期归类不代表已经设置计划执行时间。',planSource:'Planner',taskSource:'任务排程',legacySource:'仅有 plannedAt（待确认）',fallback:'未安排执行 · 按截止日期归类',prefsUnavailable:'偏好设置保存不可用，重新打开后语言或折叠状态可能重置。',dayOnly:'仅计划日期',countText:'项任务',unknownLegacy:'排程信息存在歧义',riskWindow:'提前提醒',riskDays1:'1天',riskDays3:'3天',riskDays7:'7天'}
};
let showHelp=false,riskDays=3,lang='en',tasks=[],projects=[],selectedProject='all',busy=false,lastDay='',lastAt=null;
const PREF_KEY='dynamic-time-board-v1';let preferenceSaveError=false;
const expanded={risk:true,unscheduled:true,unknown:false};
async function savePreferences(){
  if(typeof window.PluginAPI?.persistDataSynced!=='function'){preferenceSaveError=true;return;}
  try{await PluginAPI.persistDataSynced(JSON.stringify({schema:1,lang,showHelp,riskDays,expanded:{...expanded},selectedProject}));preferenceSaveError=false;}
  catch(err){preferenceSaveError=true;console.warn('[Time Board] Cannot save preferences:',err);}
}
async function loadPreferences(){
  if(typeof window.PluginAPI?.loadSyncedData!=='function')return;
  try{const raw=await PluginAPI.loadSyncedData();if(!raw)return;
    const saved=JSON.parse(raw);if(!saved || saved.schema!==1)return;
    if(saved.lang==='en'||saved.lang==='zh')lang=saved.lang;
    if(typeof saved.showHelp==='boolean')showHelp=saved.showHelp;
    if([1,3,7].includes(saved.riskDays))riskDays=saved.riskDays;
    for(const k of ['risk','unscheduled','unknown'])if(typeof saved.expanded?.[k]==='boolean')expanded[k]=saved.expanded[k];
    if(typeof saved.selectedProject==='string')selectedProject=saved.selectedProject;
  }catch(err){console.warn('[Time Board] Cannot load preferences:',err);}
}
const $=id=>document.getElementById(id);
const t=k=>(translations[lang]||translations.en)[k]||k;
const sub=(template,args)=>template.replace(/\{(\w+)\}/g,(_,k)=>String(args[k]??''));
const node=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el;};
function syncHelp(){
 document.body.classList.toggle('show-help',showHelp);
 const btn=$('toggleHelp');btn.textContent=t(showHelp?'hideHelp':'showHelp');btn.setAttribute('aria-pressed',String(showHelp));
 btn.title=t(showHelp?'hideHelp':'showHelp');
}
const styles={today:['#faebea','#eecdc9','#a44c43'],week:['#fcf2df','#efddb7','#8d6921'],month:['#e8f1f9','#ccdfeb','#39758a'],future:['#f0f1f2','#e0e3e6','#66707c']};
function deadlineMessage(r){switch(r.kind){case 'overdueDay':return sub(t('dueLate'),{days:r.days});case 'overdueExact':return sub(t('dueLateTime'),{elapsed:L.formatElapsed(r.ms,lang)});case 'today':return t('dueToday');case 'soonDay':return r.days===1?t('dueTomorrow'):sub(t('dueIn'),{days:r.days});case 'soonExact':return sub(t('dueSoonTime'),{elapsed:L.formatElapsed(r.ms,lang)});default:return null;}}
function timeMessage(r){switch(r.kind){case 'missedDay':return sub(t('planLate'),{days:r.days});case 'windowElapsed':return sub(t('windowPast'),{elapsed:L.formatElapsed(r.ms,lang)});case 'startElapsed':return sub(t('startPast'),{elapsed:L.formatElapsed(r.ms,lang)});case 'inWindow':return t('inWindow');case 'beforeStart':return sub(t('beforeStart'),{elapsed:L.formatElapsed(r.ms,lang)});default:return null;}}
function clockLabel(timestamp){
 const date=new Date(timestamp);const pad=n=>String(n).padStart(2,'0');
 return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function dateTimeRow(kind,day,at,estimate){
 const row=node('div','meta-row');
 row.append(node('span','meta-label',t(kind)+':'));
 row.append(node('span','meta-day',day));
 if(at!==null && at!==undefined){
  const start=clockLabel(at);
  const end=kind==='planned'&&typeof estimate==='number'&&Number.isFinite(estimate)&&estimate>0?at+estimate:null;
  if(end!==null){
   const endDay=L.key(new Date(end));
   if(endDay===day) row.append(node('span','meta-time',start+'–'+clockLabel(end)));
   else{
    row.append(node('span','meta-time',start));
    row.append(node('span','meta-separator','→'));
    row.append(node('span','meta-day',endDay));
    row.append(node('span','meta-time',clockLabel(end)));
   }
  }else row.append(node('span','meta-time',start));
 }
 return row;
}
function card(record,forRisk=false){const {task,result:r}=record;
 const el=node('article','task');
 const heading=node('div','task-heading');
 heading.append(node('div','task-title',task.title||'(Untitled)'));
 const project=projects.find(x=>String(x.id)===String(task.projectId));
 if(project){
  const name=project.title||String(project.id);
  const tag=node('span','project-tag',name);
  tag.title=name;tag.setAttribute('aria-label',t('project')+': '+name);
  heading.append(tag);
 }
 el.append(heading);
 const meta=node('div','task-meta');
 if(r.plan.day)meta.append(dateTimeRow('planned',r.plan.day,r.plan.startMs,task.timeEstimate));
 if(r.deadline.day)meta.append(dateTimeRow('deadline',r.deadline.day,r.deadline.at,null));
 if(!r.plan.day&&r.plan.source==='legacy')meta.append(node('div','meta-legacy',t('legacySource')));
 if(meta.children.length)el.append(meta);
 const badges=node('div','badges');const timeText=timeMessage(r.time),dueText=deadlineMessage(r.risk);
 if(r.placementSource==='deadline')badges.append(node('span','pill caution',t('fallback')));
 if(timeText && !forRisk)badges.append(node('span',r.time.kind==='windowElapsed'||r.time.kind==='missedDay'?'pill caution':'pill neutral',timeText));
 if(dueText)badges.append(node('span',r.risk.kind.startsWith('overdue')?'pill danger':'pill attention',dueText));
 if(r.conflict)badges.append(node('span','pill danger',t('conflict')));
 if(badges.children.length)el.append(badges);
 return el;}
function headerLine(title,count){const head=node('div','section-title');head.append(node('span','',title),node('span','count',String(count)));return head;}
function panel(title,hint,items,styleKey){const sec=node('section','lane');const [bg,border,ink]=styles[styleKey];sec.style.setProperty('--bg',bg);sec.style.setProperty('--border',border);sec.style.setProperty('--ink',ink);sec.append(headerLine(t(title),items.length),node('p','hint help-detail',t(hint)));sec.title=t(hint);
 if(!items.length)sec.append(node('div','empty',t('noData')));
 items.forEach(r=>sec.append(card(r)));return sec;}
function updateToggle(button,items,isHidden){
 items.classList.toggle('hidden',isHidden);
 button.textContent=t(isHidden?'expand':'collapse');
 button.setAttribute('aria-expanded',String(!isHidden));
}
// All three auxiliary sections use the same expand/collapse semantics.
// A zero-item section displays its empty message and has no inert button.
function sectionList(root,title,hint,items,sectionKey,options={}){
 const isRisk=Boolean(options.isRisk);
 root.replaceChildren();
 const bar=node('div',isRisk?'alert-title':'unscheduled-head');
 bar.append(headerLine(t(title),items.length));
 const btn=node('button','small-btn');
 btn.type='button';
 btn.hidden=items.length===0;
 const content=node('div',isRisk?'risk-items':'bottom-items');
 content.id='timeboard-items-'+sectionKey;
 btn.setAttribute('aria-controls',content.id);
 if(isRisk){
  const controls=node('div','risk-controls');
  const riskLabel=node('label','risk-window-control');
  riskLabel.append(node('span','',t('riskWindow')));
  const select=node('select','');select.id='riskDays';
  select.setAttribute('aria-label',t('riskWindow'));
  for(const days of [1,3,7]){const opt=node('option','',t('riskDays'+days));opt.value=String(days);select.append(opt);}
  select.value=String(riskDays);
  select.addEventListener('change',()=>{
   const days=Number(select.value);
   if(![1,3,7].includes(days))return;
   riskDays=days;render();void savePreferences();
  });
  riskLabel.append(select);controls.append(riskLabel,btn);bar.append(controls);
 }else bar.append(btn);
 const helpText=isRisk?sub(t(hint),{days:riskDays}):t(hint);
 root.append(bar,node('p','hint help-detail',helpText));bar.title=helpText;
 items.forEach(item=>content.append(card(item,isRisk)));
 if(!items.length)content.append(node('p','empty',t('noData')));
 root.append(content);
 updateToggle(btn,content,items.length>0&&!expanded[sectionKey]);
 btn.addEventListener('click',()=>{
  expanded[sectionKey]=!expanded[sectionKey];
  updateToggle(btn,content,!expanded[sectionKey]);
  void savePreferences();
 });
}
function render(){const now=new Date(),p=$('project').value;
 const active=tasks.filter(x=>x&&!x.isDone&&!x.parentId&&(p==='all'||String(x.projectId)===p));
 const lists={today:[],week:[],month:[],future:[],unscheduled:[],unknown:[]};const risks=[];
 for(const task of active){const result=L.classify(task,null,now,riskDays),record={task,result};if(!lists[result.lane])lists.unknown.push(record);else lists[result.lane].push(record);
  if(['overdueDay','overdueExact','today','soonDay','soonExact'].includes(result.risk.kind)||result.conflict)risks.push(record);
 }
 const sortText=(a,b)=>String(a.task.title||'').localeCompare(String(b.task.title||''),lang==='zh'?'zh-CN':'en');
 for(const k of ['today','week','month','future']) lists[k].sort((a,b)=>a.result.placementDay.localeCompare(b.result.placementDay)||((a.result.placementAt??Infinity)-(b.result.placementAt??Infinity))||sortText(a,b));
 const deadlineSort=(a,b)=>(a.result.deadline.day||'9999-12-31').localeCompare(b.result.deadline.day||'9999-12-31')||sortText(a,b);
 lists.unscheduled.sort(deadlineSort);lists.unknown.sort(deadlineSort);risks.sort((a,b)=>{const ar=a.result.risk.kind.startsWith('overdue')?0:a.result.conflict?1:2,br=b.result.risk.kind.startsWith('overdue')?0:b.result.conflict?1:2;return ar-br||deadlineSort(a,b);});
 const board=$('board');board.replaceChildren(panel('today','todayHint',lists.today,'today'),panel('week','weekHint',lists.week,'week'),panel('month','monthHint',lists.month,'month'),panel('future','futureHint',lists.future,'future'));
 sectionList($('unscheduled'),'noPlans','noPlanHint',lists.unscheduled,'unscheduled');
 const unknown=$('unknown');unknown.classList.toggle('hidden',lists.unknown.length===0);if(lists.unknown.length)sectionList(unknown,'unverified','unknownHint',lists.unknown,'unknown');
 sectionList($('alerts'),'risk','riskHint',risks,'risk',{isRisk:true});
 $('date').textContent=sub(t('asOf'),{day:L.key(now)});$('status').textContent=sub(t('status'),{total:tasks.length,shown:active.length,at:(lastAt||now).toLocaleTimeString(lang==='zh'?'zh-CN':'en-US')});lastDay=L.key(now);
 if(preferenceSaveError){$('warning').textContent=t('prefsUnavailable');$('warning').classList.remove('hidden');}else $('warning').classList.add('hidden');
}
async function reload(){if(busy)return;busy=true;$('reload').disabled=true;
 try{if(!window.PluginAPI||typeof PluginAPI.getTasks!=='function')throw new Error(t('apiMissing'));
  const values=await Promise.allSettled([PluginAPI.getTasks(),typeof PluginAPI.getAllProjects==='function'?PluginAPI.getAllProjects():Promise.resolve([])]);
  if(values[0].status!=='fulfilled'||!Array.isArray(values[0].value))throw new Error(values[0].status==='rejected'?String(values[0].reason):'getTasks returned invalid data');
  tasks=values[0].value;projects=values[1].status==='fulfilled'&&Array.isArray(values[1].value)?values[1].value:[];lastAt=new Date();
  const sel=$('project');sel.replaceChildren(node('option','',t('all')));sel.options[0].value='all';for(const proj of projects){const opt=node('option','',proj.title||String(proj.id));opt.value=String(proj.id);sel.append(opt);}sel.value=[...sel.options].some(x=>x.value===selectedProject)?selectedProject:'all';selectedProject=sel.value;
  $('error').classList.add('hidden');render();
 }catch(err){$('error').textContent=sub(t('readError'),{error:String(err.message||err)});$('error').classList.remove('hidden');}finally{busy=false;$('reload').disabled=false;}}
function language(next){lang=next==='zh'?'zh':'en';syncHelp();document.documentElement.lang=lang==='zh'?'zh-CN':'en';$('language').value=lang;$('pageTitle').textContent=t('title');$('summary').textContent=t('summary');$('reload').textContent=t('refresh');$('estimateNote').textContent=t('estimateNote')+' '+t('dataLimited');$('project').setAttribute('aria-label',t('project'));$('language').setAttribute('aria-label',t('lang'));if($('project').options.length)$('project').options[0].textContent=t('all');render();}
$('language').addEventListener('change',e=>{language(e.target.value);void savePreferences();});
$('project').addEventListener('change',()=>{selectedProject=$('project').value;render();void savePreferences();});
$('reload').addEventListener('click',reload);
$('toggleHelp').addEventListener('click',()=>{showHelp=!showHelp;syncHelp();void savePreferences();});
// A first-time install defaults to English for international review.
// Returning users get their explicit choice back from the plugin's synced preference data.
(async()=>{await loadPreferences();language(lang);await reload();})();
// Update time-based badges more often than task data, including across midnight.
setInterval(()=>{if(!document.hidden)render();},60000);
setInterval(()=>{if(!document.hidden)reload();},180000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)reload();});
})();
