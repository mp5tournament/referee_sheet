// 命令设置
const part={
    startup:[
        `!MP MAKE ${tournament.nickname}: ({red}) vs ({blue})`,
        '!MP SET 2 3',
        '!MP MAP {tb_bid}',
        '!MP INVITE {red_cap}',
        '!MP INVITE {blue_cap}',
        '!MP ADDREF',
        `红队：{red}，1-${tournament.teamPlayingSize}楼；蓝队：{blue}，${tournament.teamPlayingSize+1}-${tournament.teamPlayingSize*2}楼`,
        '请双方队长roll点决定BP顺序，点大者选择先ban后pick或后ban先pick',
        '',
        '先选方为 {fp_t}，先ban方为 {fb_t}。',
    ],
    ban:[
        '请 {team} ban图',
        '!MP TIMER 90',
        '',
        '{team} ban {map}',
        '!MP MAP {bid}',
    ],
    pick:[
        '请 {team} 选图',
        '!MP TIMER 120',
        '',
        '!MP MAP {bid}',
        '!MP MODS {mod}',
        '!MP TIMER 120',
        '',
        '{red} {sr}:{sb} {blue}',
    ],
    tb:tournament.tbOnlyOne?[
        '双方均取得赛点，比赛即将进入TB。',
        '!MP MAP {bid}',
        '!MP MODS {mod}',
        '!MP TIMER 240',
        '',
        '{red} {sr}:{sb} {blue}',
    ]:[
        '双方均取得赛点，比赛即将进入TB。请双方分别私聊我想要ban的图。',
        '双方均取得赛点，比赛即将进入TB。',
        '',
        '!MP MAP {bid}',
        '!MP MODS {mod}',
        '!MP TIMER 240',
        '',
        '{red} {sr}:{sb} {blue}',
    ],
    settle:[
        '恭喜{team}获胜',
        '!MP CLOSE',
        '（请裁判别忘了填主表格哦）',
    ],
    general:[
        '!MP TIMER 120',
        '!MP TIMER 90',
        '!MP TIMER 60',
        '!MP SETTINGS',
        '!MP START 7',
        '!MP ABORT',
        '',
        '{red} 超时，自动使用第一次暂停。剩余一次暂停。',
        '{blue} 超时，自动使用第一次暂停。剩余一次暂停。',
        '{red} 再次超时，自动使用第二次暂停。该队暂停机会已用完，请勿再次超时。',
        '{blue} 再次超时，自动使用第二次暂停。该队暂停机会已用完，请勿再次超时。',
    ]
}

// 正文
/**
 * 更新指定容器内同名的命令占位符。
 * @param {ParentNode} fatherNode - 搜索占位符的根节点。
 * @param {string} varName - 不含 v_ 前缀的占位符名称。
 * @param {unknown} text - 要显示的值。
 * @returns {void}
 */
function changeAll(fatherNode,varName,text){
    text=esc(String(text))
    for(const node of fatherNode.getElementsByClassName('v_'+varName)) node.innerHTML=text
}
changeAll(document,'tournament',tournament.name)

/**
 * 转义用于 innerHTML 的文本，避免队名或备注被解释为标签。
 * @param {string} s - 原始文本。
 * @returns {string} 已转义的 HTML 文本。
 */
function esc(s){
    s = s.replace(/&/g,"&amp;")
    s = s.replace(/</g,"&lt;")
    s = s.replace(/>/g,"&gt;")
    s = s.replace(/　/g,"&emsp;")
    s = s.replace(/\'/g,"&#39;")
    s = s.replace(/\"/g,"&quot;")
    return s
}
const main=document.getElementById('main')
const general=document.getElementById('general')
const assistPoolOut=document.getElementById('assist_pool_out')
const assistPool=document.getElementById('assist_pool')
const assistPlayerOut=document.getElementById('assist_player_out')
const assistPlayer=document.getElementById('assist_player')
const configui=document.getElementById('configui')
let config=null
/**
 * 切换辅助面板显隐并同步按钮文字。
 * @param {HTMLElement} panel - 要切换的面板。
 * @param {HTMLElement} status - 显示“显示”或“隐藏”的文字节点。
 * @returns {void}
 */
function toggleAssist(panel,status){
    const hidden=panel.classList.toggle('hidden')
    status.textContent=hidden?'显示':'隐藏'
}
/**
 * 切换图池指令面板。
 * @returns {void}
 */
document.getElementById('show_assist_pool').onclick=function togglePoolPanel(){
    toggleAssist(assistPoolOut,document.getElementById('show_assist_pool_statu'))
}
/**
 * 切换队员邀请面板。
 * @returns {void}
 */
document.getElementById('show_assist_player').onclick=function togglePlayerPanel(){
    toggleAssist(assistPlayerOut,document.getElementById('show_assist_player_statu'))
}
const assistPoolLine=document.getElementsByClassName('assist_pool_line')[0]
const assistPlayerLine=document.getElementsByClassName('assist_player_line')[0]

// 复制命令
const mouse={x:0,y:0}
const box0=document.getElementsByClassName('tip-box')[0]

/**
 * 保存最近一次点击坐标，用于定位复制提示。
 * @param {MouseEvent} event - 页面点击事件。
 * @returns {void}
 */
function recordClickPosition(event){
    mouse.x=event.clientX
    mouse.y=event.clientY
}
document.addEventListener('click',recordClickPosition)

/**
 * 设置复制提示的透明度，并在动画结束后移除节点。
 * @param {HTMLElement} box - 当前复制提示节点。
 * @param {number} opacity - 目标透明度。
 * @returns {void}
 */
function fadeCopyTip(box,opacity){
    box.style.opacity=opacity
    if(opacity===0)box.remove()
}

/**
 * 在最近一次点击的位置创建短暂的复制成功提示。
 * @returns {void}
 */
function showCopyTip(){
    const box=box0.cloneNode(true)
    document.body.appendChild(box)
    box.style.left=mouse.x+'px'
    box.style.top=mouse.y+'px'
    box.style.display='block'
    box.style.opacity=1
    for(const [delay,opacity] of [[500,0.75],[540,0.5],[580,0.25],[620,0]]){
        setTimeout(fadeCopyTip,delay,box,opacity)
    }
}

/**
 * 复制命令或指定文本，并显示成功提示。
 * @param {HTMLElement|null} x - 提供 title 或文本的命令节点。
 * @param {string|null} [y=null] - 显式指定的复制内容。
 * @returns {void}
 */
function copyText(x,y=null){
    const input=document.createElement('textarea')
    input.value=y===null?(x.title||x.textContent):y
    document.body.appendChild(input)
    input.select()
    document.execCommand('Copy')
    input.remove()
    setTimeout(showCopyTip,10)
}

// commands
/**
 * 把一条命令模板转换为可复制的链接。
 * @param {HTMLElement} container - 命令容器。
 * @param {string} command - 带占位符的命令模板。
 * @returns {void}
 */
function appendCommandLink(container,command){
    const link=document.createElement('a')
    link.setAttribute('href','javascript:void(0)')
    link.setAttribute('onclick','copyText(this)')
    link.innerHTML=esc(command).replace(/{/g,'<span class="v_').replace(/}/g,'"></span>')
    container.appendChild(link)
}

/**
 * 添加下一段命令的隐藏步骤容器。
 * @param {HTMLElement} container - 当前命令容器。
 * @returns {HTMLElement} 新的步骤容器。
 */
function appendCommandStep(container){
    const step=document.createElement('div')
    step.className='step hidden'
    container.appendChild(step)
    return step
}

/**
 * 从命令模板生成某个比赛阶段的可复制指令节点。
 * @param {string} partName - startup、ban、pick、tb、settle 或 general。
 * @returns {void}
 */
function loadPart(partName){
    const thisPart=document.getElementsByClassName(partName)[0]
    const commands=part[partName]
    let container=(partName=='general'?general:thisPart).getElementsByClassName('command')[0]
    for(const command of commands){
        if(command){
            appendCommandLink(container,command)
            continue
        }
        if(partName=='general')container.appendChild(document.createElement('hr'))
        else container=appendCommandStep(container)
    }
    part[partName]=thisPart
}
for(const partName in part)loadPart(partName)
if(tournament.tbOnlyOne)part.tb.getElementsByClassName('selectTB')[0].classList.add('hidden')

// configui
const c_red={
    select:configui.getElementsByTagName('select')[0],
    name:configui.getElementsByClassName('name')[0].getElementsByClassName('red')[0],
    cap:configui.getElementsByClassName('cap')[0].getElementsByClassName('red')[0],
    player:[],
}
const c_blue={
    select:configui.getElementsByTagName('select')[1],
    name:configui.getElementsByClassName('name')[0].getElementsByClassName('blue')[0],
    cap:configui.getElementsByClassName('cap')[0].getElementsByClassName('blue')[0],
    player:[],
}
const c_round=configui.getElementsByClassName('round')[0]
const c_button=configui.getElementsByTagName('button')
for (const i in tournament.teamData){
    const team=tournament.teamData[i]
    c_red.select.add(new Option(team.name,i))
    c_blue.select.add(new Option(team.name,i))
}
let last_round=''
for (const round in tournament.rounds){
    c_round.add(new Option(round,round))
    last_round=round
}
c_round.value=last_round

/**
 * 将队伍预设填入设置表单，空选择时恢复默认队名。
 * @param {object} team - 红队或蓝队的表单节点集合。
 * @returns {void}
 */
function autoSelect(team){
    let i=parseInt(team.select.value)
    if (!Number.isInteger(i) || i<0 || i>=tournament.teamData.length){
        team.name.value=team==c_red?'🟥红队':'🟦蓝队'
        team.cap.value=''
        team.player=[]
    }else{
        team.name.value=tournament.teamData[i].name
        team.cap.value=tournament.teamData[i].cap
        team.player=[tournament.teamData[i].cap,...tournament.teamData[i].player]
    }
}
/**
 * 应用红队预设。
 * @returns {void}
 */
c_red.select.onchange=function selectRedTeam(){
    autoSelect(c_red)
}
/**
 * 应用蓝队预设。
 * @returns {void}
 */
c_blue.select.onchange=function selectBlueTeam(){
    autoSelect(c_blue)
}

/**
 * 确认设置并重新初始化比赛流程。
 * @returns {void}
 */
c_button[0].onclick=function confirmConfig(){
    if(config){
        if(!confirm("修改设置将导致页面重新初始化，已填写的信息丢失，你确定要这么做吗？"))return
    }else{
        c_button[1].removeAttribute('disabled')
    }
    init()
    configui.classList.add('hidden')
}
/**
 * 关闭设置面板。
 * @returns {void}
 */
c_button[1].onclick=function cancelConfig(){
    configui.classList.add('hidden')
}
/**
 * 打开设置面板。
 * @returns {void}
 */
document.getElementById('config').onclick=function openConfig(){
    configui.classList.remove('hidden')
}

/**
 * 从设置表单重新生成当前比赛配置。
 * @returns {void}
 */
function reloadConfig(){
    config=buildMatchConfig(tournament,c_round.value,{
        name:c_red.name.value,
        cap:c_red.cap.value,
        player:[...c_red.player],
    },{
        name:c_blue.name.value,
        cap:c_blue.cap.value,
        player:[...c_blue.player],
    })
}

// 保存比赛记录
/**
 * 收集可见事件并下载比赛记录。
 * @returns {void}
 */
document.getElementById('export').onclick=function exportMatchRecord(){
    if(!config)return
    const records=[]
    for(const event of events)records.push({
        type:event.type,color:event.color,map:event.map,win:event.win,
        sr:event.sr,sb:event.sb,
        hidden:event.dom.classList.contains('hidden'),
        note:event.dom.getElementsByClassName('textarea')[0].textContent,
    })
    const matchLink=events[0].dom.getElementsByTagName('input')[0].value
    const {title,text}=formatMatchRecord(tournament.name,config,firstPick,matchLink,records)
    const blob=new Blob([text],{type:'text/plain;charset=utf-8'})
    const objectURL=URL.createObjectURL(blob)
    const anchor=document.createElement('a')
    anchor.href=objectURL
    anchor.download=title+'.txt'
    anchor.click()
    URL.revokeObjectURL(objectURL)
}

/**
 * 复制主表格需要的禁图摘要。
 * @returns {void}
 */
document.getElementById('copy_mainsheet_text').onclick=function copyMainSheetText(){
    if(!firstPick)return
    const bans=[]
    for(const event of events)if(event.type=='ban')bans.push({
        color:event.color,map:event.dom.querySelector('select.map').value,
        hidden:event.dom.classList.contains('hidden'),
    })
    copyText(null,formatMainSheetText(firstPick,bans))
}

let events=[]
let firstPick=null

/**
 * 判断一组步骤是否全部完成。
 * @param {boolean[]} x - 各步骤的完成状态。
 * @returns {boolean} 所有步骤都完成时为 true。
 */
function allTrue(x){
    for(const value of x)if(!value)return false
    return true
}

const firstPickRegulator=document.createElement('div')
firstPickRegulator.setAttribute('class','part hidden')

/**
 * 推进事件、跳转结算或隐藏尚未满足条件的后续事件。
 * @param {number|string} n - 当前事件索引。
 * @param {boolean} [finish=true] - 当前事件是否完成。
 * @param {boolean} [settle=false] - 是否已达到获胜局数。
 * @returns {void}
 */
function makeFinish(n,finish=true,settle=false){
    n=parseInt(n)
    const event=events[n]
    const l=events.length-1
    if(finish){
        event.finish=true
        if(settle){
            for(let i=n+1;i<l;i++)events[i].dom.classList.add('hidden')
            events[l].sr=events[n].sr
            events[l].sb=events[n].sb
            partOnChange(null,l)
        }else partOnChange(null,n+1)
    }else{
        event.finish=false
        for(let i=n+1;i<=l;i++)events[i].dom.classList.add('hidden')
    }
}

/**
 * 从某个事件的表单节点读取先选方、谱面和胜者。
 * @param {object} event - 包含类型和 DOM 节点的事件。
 * @param {object} settings - 包含 TB 模式的比赛设置。
 * @returns {object} 供事件计算使用的纯输入值。
 */
function readEventSelection(event,settings){
    const selects=event.dom.getElementsByTagName('select')
    if(event.type=='startup')return {firstPick:selects[0].value}
    if(event.type=='ban')return {map:selects[0].value}
    if(event.type=='pick')return {map:selects[0].value,win:selects[1].value}
    if(event.type=='tb')return {
        map:settings.tbOnlyOne?(selects[0].options[1]?.value||''):selects[0].value,
        win:selects[1].value,
    }
    return {}
}

/**
 * 找到触发控件所属的比赛事件索引。
 * @param {HTMLElement} node - 发生变化的控件。
 * @returns {number} 对应事件索引。
 */
function findEventIndex(node){
    while(!node.classList.contains('part'))node=node.parentNode
    for(let index=0;index<events.length;index++){
        if(events[index].dom==node)return index
    }
    return -1
}

/**
 * 离开已开始比赛页面时显示确认信息。
 * @returns {string} 浏览器使用的离开提示。
 */
function confirmLeavingMatch(){
    return '确认要退出吗？'
}

/**
 * 根据先选方移动占位节点，使页面顺序与比赛顺序一致。
 * @returns {void}
 */
function positionFirstPickRegulator(){
    if(firstPick=='red')main.insertBefore(firstPickRegulator,events[0].dom)
    else if(firstPickRegulator.parentNode==main)firstPickRegulator.remove()
}

/**
 * 为所有禁图和选图事件分配执行队伍。
 * @returns {void}
 */
function assignTurnTeams(){
    const types=[]
    for(const item of events)types.push(item.type)
    const assignments=turnAssignments(types,firstPick,config.red.name,config.blue.name)
    for(let index=0;index<events.length;index++){
        if(!assignments[index])continue
        events[index].color=assignments[index].color
        events[index].team=assignments[index].team
    }
}

/**
 * 应用先选方输入并更新后续禁选图顺序。
 * @param {{firstPick:string}} input - 赛前准备表单输入。
 * @returns {void}
 */
function applyStartupInput(input){
    window.onbeforeunload=confirmLeavingMatch
    firstPick=input.firstPick
    positionFirstPickRegulator()
    if(firstPick)assignTurnTeams()
}

/**
 * 把事件计算结果写入状态和页面步骤。
 * @param {object} event - 要更新的比赛事件。
 * @param {{state:object,values:object,steps:boolean[]}} result - 事件计算结果。
 * @returns {void}
 */
function renderCalculatedEvent(event,result){
    Object.assign(event,result.state)
    for(const key in result.values)changeAll(event.dom,key,result.values[key])
    for(let index=0;index<result.steps.length;index++){
        const nodeClass=event.dom.getElementsByClassName('step')[index].classList
        nodeClass.toggle('hidden',!result.steps[index])
    }
}

/**
 * 在事件输入变化后重算状态、更新指令并推进流程。
 * @param {HTMLElement|null} thisPart - 触发变化的表单节点；按索引调用时可为空。
 * @param {number|string|null} [n=null] - 可选的事件索引。
 * @returns {void}
 */
function partOnChange(thisPart,n=null){
    const index=n===null?findEventIndex(thisPart):Number(n)
    const event=events[index]
    event.dom.classList.remove('hidden')
    const input=readEventSelection(event,tournament)
    if(event.type=='startup')applyStartupInput(input)
    const result=calculateEvent(event,events[index-1],input,config,tournament)
    renderCalculatedEvent(event,result)
    if(event.type=='settle')return
    const settled=event.sr>=config.gamestowin||event.sb>=config.gamestowin
    makeFinish(index,allTrue(result.steps),settled)
}

/**
 * 克隆并加入一个比赛阶段，同时创建对应的状态记录。
 * @param {string} type - 要加入的事件类型。
 * @returns {void}
 */
function addEvent(type){
    const dom=part[type].cloneNode(true)
    main.appendChild(dom)
    events.push({dom,type,finish:false,sr:null,sb:null})
}

/**
 * 按可禁、可选和 TB 权限填充图池下拉框。
 * @returns {void}
 */
function populateMapOptions(){
    const ban=part.ban.querySelector('select.map')
    const pick=part.pick.querySelector('select.map')
    const tb=part.tb.querySelector('select.map')
    ban.replaceChildren(new Option('请选择',''),new Option('❌空ban',0))
    pick.replaceChildren(new Option('请选择',''))
    tb.replaceChildren(new Option('请选择',''))
    for(const map in config.pool){
        const item=config.pool[map]
        const label=item.symbol+map
        if(item.pickable[0])ban.add(new Option(label,map))
        if(item.pickable[1])pick.add(new Option(label,map))
        if(item.pickable[2])tb.add(new Option(label,map))
    }
}

/**
 * 将比赛轮次、队名和队长写入页面及命令模板。
 * @returns {void}
 */
function renderMatchHeader(){
    changeAll(document,'round',config.round)
    changeAll(document,'red',config.red.name)
    changeAll(document,'blue',config.blue.name)
    changeAll(document,'tb_bid',config.tb)
    changeAll(document,'red_cap',config.red.cap)
    changeAll(document,'blue_cap',config.blue.cap)
}

/**
 * 生成全部谱面的 MAP 和 MOD 辅助指令。
 * @returns {void}
 */
function renderPoolCommands(){
    assistPool.replaceChildren()
    for(const map in config.pool){
        const item=config.pool[map]
        const line=assistPoolLine.cloneNode(true)
        line.getElementsByClassName('pos')[0].textContent=item.symbol+map
        const mapLink=line.getElementsByClassName('map')[0]
        mapLink.setAttribute('href','javascript:void(0)')
        mapLink.setAttribute('onclick','copyText(this)')
        mapLink.setAttribute('title','!MP MAP '+item.bid)
        mapLink.textContent='MAP'
        const modLink=line.getElementsByClassName('mod')[0]
        modLink.setAttribute('href','javascript:void(0)')
        modLink.setAttribute('onclick','copyText(this)')
        modLink.setAttribute('title','!MP MODS '+item.mod)
        modLink.textContent='MOD'
        assistPool.appendChild(line)
    }
}

/**
 * 在辅助列表中增加一条队员邀请指令。
 * @param {string} player - osu! 玩家 ID。
 * @param {string} [pre=''] - 用于标识队伍的 HTML 前缀。
 * @returns {void}
 */
function addAssistPlayerLine(player,pre=''){
    const line=assistPlayerLine.cloneNode(true)
    const link=line.getElementsByTagName('a')[0]
    if(player){
        link.setAttribute('href','javascript:void(0)')
        link.setAttribute('onclick','copyText(this)')
        link.setAttribute('title','!MP INVITE '+player)
    }
    link.innerHTML=pre+esc(player)
    assistPlayer.appendChild(line)
}

/**
 * 按红蓝队名单重建队员邀请辅助指令。
 * @returns {void}
 */
function renderPlayerCommands(){
    assistPlayer.replaceChildren()
    for(const player of config.red.player)addAssistPlayerLine(player,'<span class="emoji">🟥</span>')
    for(const player of config.blue.player)addAssistPlayerLine(player,'<span class="emoji">🟦</span>')
}

/**
 * 清空旧比赛节点并按轮次顺序创建新事件。
 * @returns {void}
 */
function rebuildEvents(){
    events=[]
    main.replaceChildren()
    for(const type of eventTypesFromPattern(config.events))addEvent(type)
}

/**
 * 根据当前表单设置重建图池、辅助指令和比赛事件。
 * @returns {void}
 */
function init(){
    reloadConfig()
    populateMapOptions()
    renderMatchHeader()
    rebuildEvents()
    renderPoolCommands()
    renderPlayerCommands()
}
