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
function changeAll(fatherNode,varName,text){
    text=esc(String(text))
    for(const node of fatherNode.getElementsByClassName('v_'+varName)) node.innerHTML=text
}
changeAll(document,'tournament',tournament.name)

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
function toggleAssist(panel,status){
    const hidden=panel.classList.toggle('hidden')
    status.textContent=hidden?'显示':'隐藏'
}
document.getElementById('show_assist_pool').onclick=function(){
    toggleAssist(assistPoolOut,document.getElementById('show_assist_pool_statu'))
}
document.getElementById('show_assist_player').onclick=function(){
    toggleAssist(assistPlayerOut,document.getElementById('show_assist_player_statu'))
}
const assistPoolLine=document.getElementsByClassName('assist_pool_line')[0]
const assistPlayerLine=document.getElementsByClassName('assist_player_line')[0]

// 复制命令
{
    const mouse={x:0,y:0}
    const box0=document.getElementsByClassName('tip-box')[0]
    document.addEventListener('click', function(event){
        mouse.x = event.clientX
        mouse.y = event.clientY
    })
    function copyText(x,y=null){
        const input = document.createElement('textarea')
        document.body.appendChild(input)
        input.value = y===null?(x.title||x.textContent):y
        input.select()
        document.execCommand('Copy')
        document.body.removeChild(input)

        setTimeout(function(){
            const box = box0.cloneNode(true)
            document.body.appendChild(box)
            box.style.left = mouse.x + 'px'
            box.style.top = mouse.y + 'px'
            box.style.display = 'block'
            box.style.opacity = 1
            setTimeout(function(){
                box.style.opacity = 0.75
                setTimeout(function(){
                    box.style.opacity = 0.5
                },40)
                setTimeout(function(){
                    box.style.opacity = 0.25
                },80)
                setTimeout(function(){
                    box.style.opacity = 0
                    document.body.removeChild(box)
                },120)
            },500)
        },10)
    }
}

// commands
{
    function loadPart(partName){
        let thisPart=document.getElementsByClassName(partName)[0]
        let commands=part[partName]
        let fatherNode=(partName=='general'?general:thisPart).getElementsByClassName('command')[0]
        for(const command of commands){
            if(command){
                let nc=document.createElement('a')
                fatherNode.appendChild(nc)
                nc.setAttribute('href','javascript:void(0)')
                nc.setAttribute('onclick','copyText(this)')
                nc.innerHTML=esc(command).replace(/{/g,'<span class="v_').replace(/}/g,'"></span>')
            }else if(partName=='general'){
                fatherNode.appendChild(document.createElement('hr'))
            }else{
                let nf=document.createElement('div')
                nf.setAttribute('class','step hidden')
                fatherNode.appendChild(nf)
                fatherNode=nf
            }
        }
        part[partName]=thisPart
    }
    for(const partName in part)loadPart(partName)
    if(tournament.tbOnlyOne)part.tb.getElementsByClassName('selectTB')[0].classList.add('hidden')
}


// configui
{
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
    c_red.select.onchange=function(){
        autoSelect(c_red)
    }
    c_blue.select.onchange=function(){
        autoSelect(c_blue)
    }

    c_button[0].onclick=function(){
        if(config){
            if(!confirm("修改设置将导致页面重新初始化，已填写的信息丢失，你确定要这么做吗？"))return
        }else{
            c_button[1].removeAttribute('disabled')
        }
        init()
        configui.classList.add('hidden')
    }
    c_button[1].onclick=function(){
        configui.classList.add('hidden')
    }
    document.getElementById('config').onclick=function(){configui.classList.remove('hidden')}

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
}

// 保存比赛记录
document.getElementById('export').onclick=function(){
    if(!config)return
    const records=events.map(event=>({
        type:event.type,color:event.color,map:event.map,win:event.win,
        sr:event.sr,sb:event.sb,
        hidden:event.dom.classList.contains('hidden'),
        note:event.dom.getElementsByClassName('textarea')[0].textContent,
    }))
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

document.getElementById('copy_mainsheet_text').onclick=function(){
    if(!firstPick)return
    const bans=events.filter(event=>event.type=='ban').map(event=>({
        color:event.color,map:event.dom.querySelector('select.map').value,
        hidden:event.dom.classList.contains('hidden'),
    }))
    copyText(null,formatMainSheetText(firstPick,bans))
}

let events=[]
let firstPick=null

function allTrue(x){
    for(const value of x)if(!value)return false
    return true
}

const firstPickRegulator=document.createElement('div')
firstPickRegulator.setAttribute('class','part hidden')

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

function partOnChange(thisPart,n=null){
    if(n===null){
        while(!thisPart.classList.contains('part'))thisPart=thisPart.parentNode
        n=events.findIndex(item=>item.dom==thisPart)
    }
    n=Number(n)
    const event=events[n]
    event.dom.classList.remove('hidden')
    const input=readEventSelection(event,tournament)

    if(event.type=='startup'){
        window.onbeforeunload=function(){return '确认要退出吗？'}
        firstPick=input.firstPick
        try{
            if(firstPick=='red')main.insertBefore(firstPickRegulator,event.dom)
            if(firstPick=='blue')main.removeChild(firstPickRegulator)
        }catch{}
        if(firstPick){
            const assignments=turnAssignments(
                events.map(item=>item.type),firstPick,config.red.name,config.blue.name
            )
            for(const i in events){
                if(!assignments[i])continue
                events[i].color=assignments[i].color
                events[i].team=assignments[i].team
            }
        }
    }

    const result=calculateEvent(event,events[n-1],input,config,tournament)
    Object.assign(event,result.state)
    for(const key in result.values)changeAll(event.dom,key,result.values[key])
    result.steps.forEach((complete,index)=>{
        const nodeClass=event.dom.getElementsByClassName('step')[index].classList
        nodeClass.toggle('hidden',!complete)
    })
    if(event.type!='settle'){
        const settled=event.sr>=config.gamestowin||event.sb>=config.gamestowin
        makeFinish(n,allTrue(result.steps),settled)
    }
}

function addEvent(type){
    const dom=part[type].cloneNode(true)
    main.appendChild(dom)
    events.push({dom,type,finish:false,sr:null,sb:null})
}

function init(){
    reloadConfig()

    {
        const b=part.ban.querySelector('select.map')
        const p=part.pick.querySelector('select.map')
        const t=part.tb.querySelector('select.map')
        b.innerHTML=''
        p.innerHTML=''
        t.innerHTML=''
        b.add(new Option('请选择',''))
        b.add(new Option('❌空ban',0))
        p.add(new Option('请选择',''))
        t.add(new Option('请选择',''))
        for(const map in config.pool){
            if(config.pool[map].pickable[0])b.add(new Option(config.pool[map].symbol+map,map))
            if(config.pool[map].pickable[1])p.add(new Option(config.pool[map].symbol+map,map))
            if(config.pool[map].pickable[2])t.add(new Option(config.pool[map].symbol+map,map))
        }
    }

    changeAll(document,'round',config.round)
    changeAll(document,'red',config.red.name)
    changeAll(document,'blue',config.blue.name)
    changeAll(document,'tb_bid',config.tb)
    changeAll(document,'red_cap',config.red.cap)
    changeAll(document,'blue_cap',config.blue.cap)

    events=[]
    while(main.firstChild)main.removeChild(main.firstChild)

    assistPool.innerHTML=''
    for(const map in config.pool){
        let nl=assistPoolLine.cloneNode(true)

        let ncPos=nl.getElementsByClassName('pos')[0]
        ncPos.innerHTML=`${config.pool[map].symbol}${map}`
        let ncMap=nl.getElementsByClassName('map')[0]
        ncMap.setAttribute('href','javascript:void(0)')
        ncMap.setAttribute('onclick','copyText(this)')
        ncMap.setAttribute('title',`!MP MAP ${config.pool[map].bid}`)
        ncMap.innerHTML='MAP'
        let ncMod=nl.getElementsByClassName('mod')[0]
        ncMod.setAttribute('href','javascript:void(0)')
        ncMod.setAttribute('onclick','copyText(this)')
        ncMod.setAttribute('title',`!MP MODS ${config.pool[map].mod}`)
        ncMod.innerHTML='MOD'

        assistPool.appendChild(nl)
    }

    assistPlayer.innerHTML=''
    function addAssistPlayerLine(player,pre=''){
        let nl=assistPlayerLine.cloneNode(true)
        let ncA=nl.getElementsByTagName('a')[0]
        if(player){
            ncA.setAttribute('href','javascript:void(0)')
            ncA.setAttribute('onclick','copyText(this)')
            ncA.setAttribute('title', `!MP INVITE ${player}`)
        }
        ncA.innerHTML=pre+player
        assistPlayer.appendChild(nl)
    }
    for(const player of config.red.player)addAssistPlayerLine(player,'<span class="emoji">🟥</span>')
    for(const player of config.blue.player)addAssistPlayerLine(player,'<span class="emoji">🟦</span>')

    for(const type of eventTypesFromPattern(config.events))addEvent(type)
}
