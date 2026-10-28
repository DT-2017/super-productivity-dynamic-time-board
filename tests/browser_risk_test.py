from pathlib import Path
from playwright.sync_api import sync_playwright
p=Path(__file__).resolve().parents[1]/'index.html'
saved={'data':None}
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':1560,'height':980},locale='en-US',timezone_id='Asia/Tokyo')
    ctx.expose_binding('readPref',lambda source:saved['data'])
    ctx.expose_binding('writePref',lambda source,v:saved.update(data=v))
    ctx.add_init_script("""(() => {
      const now=new Date();const pad=n=>String(n).padStart(2,'0');
      const day=i=>{const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
      const timed=(i,h,m)=>new Date(now.getFullYear(),now.getMonth(),now.getDate()+i,h,m).getTime();
      window.PluginAPI={
        getTasks:async()=>[
          {id:'overdue',title:'Overdue alert',projectId:'a',deadlineDay:day(-1)},
          {id:'dueToday',title:'Today alert',projectId:'a',deadlineDay:day(0)},
          {id:'due2',title:'Day2 alert',projectId:'a',deadlineDay:day(2)},
          {id:'due3',title:'Day3 alert',projectId:'a',deadlineWithTime:timed(3,23,59)},
          {id:'due4',title:'Day4 alert',projectId:'a',deadlineWithTime:timed(4,0,0)},
          {id:'due7',title:'Day7 alert',projectId:'a',deadlineDay:day(7)},
          {id:'conflict',title:'Plan after distant deadline',projectId:'a',dueDay:day(20),deadlineDay:day(15)},
          {id:'undated',title:'Unscheduled and no deadline',projectId:'a'},
          {id:'done',title:'Completed should stay hidden',projectId:'a',deadlineDay:day(1),isDone:true},
        ],
        getAllProjects:async()=>[{id:'a',title:'Research'}],
        loadSyncedData:async()=>await window.readPref(),
        persistDataSynced:async(s)=>await window.writePref(s),
      }
    })();""")
    page=ctx.new_page()
    errors=[]
    page.on('pageerror',lambda ex:errors.append(str(ex)))
    page.goto('about:blank');page.set_content(p.read_text('utf-8'));page.wait_for_timeout(500)
    assert page.locator('#riskDays').input_value()=='3'
    def risk_titles():return page.locator('#alerts .task-title').all_text_contents()
    def rc():return page.locator('#alerts .count').inner_text()
    assert rc()=='5',(rc(),risk_titles()) # overdue, today, day2, day3, conflict
    assert 'Day3 alert' in risk_titles() and 'Day4 alert' not in risk_titles()
    assert 'Plan after distant deadline' in risk_titles()
    assert page.locator('#unscheduled .count').inner_text()=='1'
    old_board=page.locator('.lane .task-title').all_text_contents()
    page.locator('#riskDays').select_option('1');page.wait_for_timeout(180)
    assert rc()=='3',(rc(),risk_titles()) # overdue, today, conflict
    assert 'Day2 alert' not in risk_titles()
    assert old_board==page.locator('.lane .task-title').all_text_contents(),'Risk setting changed lane'
    page.locator('#riskDays').select_option('7');page.wait_for_timeout(200)
    assert rc()=='7',(rc(),risk_titles())
    assert 'Day7 alert' in risk_titles()
    assert 'Day4 alert' in risk_titles()
    page.locator('#language').select_option('zh');page.wait_for_timeout(120)
    assert '提前提醒' in page.locator('#alerts').inner_text()
    page.locator('#riskDays').select_option('3');page.wait_for_timeout(120)
    page.locator('#toggleHelp').click();page.wait_for_timeout(120)
    assert '未来3个自然日' in page.locator('#alerts .hint').inner_text()
    assert saved['data'] and '"riskDays":3' in saved['data'] and '"lang":"zh"' in saved['data'],saved
    # Controls should not have pushed the top toolbar into an extra row.
    a=page.locator('.actions #language').bounding_box();b=page.locator('.actions #project').bounding_box();c=page.locator('.actions #reload').bounding_box();d=page.locator('.actions #toggleHelp').bounding_box()
    assert max(z['y'] for z in [a,b,c,d])-min(z['y'] for z in [a,b,c,d])<3
    page.screenshot(path=str(p.parent/'preview_zh.png'),full_page=True)
    # simulate closing/reopening the plugin
    page.goto('about:blank');page.set_content(p.read_text('utf-8'));page.wait_for_timeout(300)
    assert page.locator('#language').input_value()=='zh'
    assert page.locator('#riskDays').input_value()=='3'
    assert rc()=='5'
    # exact-time expiry uses clock even when calendar day is today
    s=page.evaluate("""(() => {const n = new Date(2026,9,28,15,0);return [TimeBoardLogic.deadlineState({day:'2026-10-28',at:new Date(2026,9,28,11,0).getTime(),kind:'time'},n,3).kind,TimeBoardLogic.deadlineState({day:'2026-10-31',at:new Date(2026,9,31,23,59).getTime(),kind:'time'},n,3).kind,TimeBoardLogic.deadlineState({day:'2026-11-01',at:new Date(2026,10,1,0).getTime(),kind:'time'},n,3).kind]})()""")
    assert s==['overdueExact','soonExact','future'],s
    assert not errors,errors
    print('PASS: risk default 3; thresholds 1/3/7; timed exact boundaries; conflict persists; lane unaffected; prefs persisted; bilingual; help; toolbar; no JS errors')
    browser.close()
