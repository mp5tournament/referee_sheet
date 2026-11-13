/**
 * 判断图池 ID 是否为正整数形式。
 * @param {string|number} bid - 谱面 ID。
 * @returns {boolean} ID 格式无效时为 true。
 */
function isInvalidBid(bid){
    return !/^\d+$/.test(String(bid))
}

/**
 * 校验并返回比赛配置，供页面启动时使用。
 * @param {object} raw - 从 tournament.json 读取的配置对象。
 * @returns {object} 已通过格式校验的配置对象。
 * @throws {Error} 配置缺少必填项或字段格式无效时抛出。
 */
function normalizeTournament(raw){
    if(!raw||typeof raw.name!='string'||typeof raw.nickname!='string')
        throw new Error('比赛名称或简称缺失')
    if(!Array.isArray(raw.teamData)||!raw.rounds||!Object.keys(raw.rounds).length)
        throw new Error('队伍或轮次配置缺失')
    if(!Number.isInteger(raw.teamPlayingSize)||raw.teamPlayingSize<1)
        throw new Error('每队上场人数无效')
    for(const team of raw.teamData){
        if(!team||typeof team.name!='string'||typeof team.cap!='string'
            ||!Array.isArray(team.player))
            throw new Error('队伍配置格式错误')
    }
    for(const [name,round] of Object.entries(raw.rounds)){
        if(!/^[bpt]+$/.test(round.events)||!round.pool||!Object.keys(round.pool).length)
            throw new Error('轮次配置格式错误：'+name)
        for(const bids of Object.values(round.pool)){
            if(!Array.isArray(bids)||!bids.length||bids.some(isInvalidBid))
                throw new Error('图池配置格式错误：'+name)
        }
    }
    return raw
}

/**
 * 将轮次图池展开为带编号、Mod 和使用权限的谱面表。
 * @param {object} round - 包含 pool 的轮次配置。
 * @param {object} settings - 包含 TB 选图开关、Mod 和标志的比赛配置。
 * @returns {Object<string, object>} 以 NM1、TB 等位置名为键的谱面表。
 */
function buildPool(round,settings){
    const pool={}
    for(const mod in round.pool){
        const pickable=mod=='TB'
            ?[false,!!settings.tbPickable,true]
            :[true,true,false]
        for(let index=0;index<round.pool[mod].length;index++){
            const bid=round.pool[mod][index]
            const name=round.pool[mod].length>1?mod+(index+1):mod
            pool[name]={
                bid,
                mod:settings.poolMod[mod],
                symbol:settings.poolSymbol[mod],
                pickable,
            }
        }
    }
    return pool
}

/**
 * 根据轮次和双方队伍生成一场比赛的运行配置。
 * @param {object} settings - 完整的比赛配置。
 * @param {string} roundName - 所选轮次名称。
 * @param {object} red - 红队名称、队长和队员。
 * @param {object} blue - 蓝队名称、队长和队员。
 * @returns {object} 包含事件顺序、获胜局数和图池的比赛配置。
 */
function buildMatchConfig(settings,roundName,red,blue){
    const round=settings.rounds[roundName]
    const pool=buildPool(round,settings)
    const tb=pool.TB?.bid||pool.TB1?.bid||Object.values(pool)[0]?.bid||null
    return {
        round:roundName,red,blue,events:round.events,
        gamestowin:round.events.replaceAll('b','').length,
        pool,tb,
    }
}

/**
 * 将 MP 链接或 ID 转成比赛记录中的标准链接。
 * @param {string} input - 裁判输入的 MP 链接或 ID。
 * @returns {string} 带换行的标准链接；输入为空时返回空字符串。
 */
function normalizeMatchLink(input){
    const id=String(input).split('/').filter(Boolean).at(-1)
    return id?'https://osu.ppy.sh/community/matches/'+id+'\n':''
}

/**
 * 根据比赛事件生成可下载的记录文件名和正文。
 * @param {string} name - 比赛名称。
 * @param {object} match - 当前轮次和双方队伍配置。
 * @param {'red'|'blue'|null} firstPick - 先选方。
 * @param {string} matchLink - MP 链接或 ID。
 * @param {object[]} records - 包含类型、比分、选图和备注的事件快照。
 * @returns {{title:string,text:string}} 文件名主体与文本内容。
 */
function formatMatchRecord(name,match,firstPick,matchLink,records){
    const bans={红队:'🟥ban',蓝队:'🟦ban'}
    let picks=''
    let scoreRed=''
    let scoreBlue=''
    let startupNote=''
    for(const record of records){
        if(record.hidden)continue
        const note=record.note?'（'+record.note+'）':''
        if(record.type=='startup'){
            startupNote=note?note+'\n':''
        }else if(record.type=='ban'){
            bans[record.color]+=' '+(record.map=='0'?'空':record.map)+note
        }else if(record.type=='pick'){
            picks+=(record.win=='red'?'🟥':'🟦')+'|'
                +(record.color=='红队'?'🟥':'🟦')+' '+record.map+note+'\n'
        }else if(record.type=='tb'){
            picks+=(record.win=='red'?'🟥':'🟦')+'|🟩 '+record.map+note+'\n'
        }else if(record.type=='settle'){
            scoreRed=record.sr
            scoreBlue=record.sb
            picks+=(scoreRed>scoreBlue?'🟥'+match.red.name:'🟦'+match.blue.name)
                +'获胜！'+note+'\n'
        }
    }
    const banText=firstPick=='red'
        ?bans['蓝队']+'\n'+bans['红队']
        :bans['红队']+'\n'+bans['蓝队']
    const title=name+' '+match.round+' '+match.red.name+' vs '+match.blue.name
    const text=name+' '+match.round+' \n'
        +normalizeMatchLink(matchLink)+'\n'
        +match.red.name+' '+scoreRed+':'+scoreBlue+' '+match.blue.name+'\n'
        +startupNote+'\n'+banText+'\n\n胜|选\n'+picks
    return {title,text}
}

/**
 * 生成主表格需要的先选方及双方禁图制表符文本。
 * @param {'red'|'blue'} firstPick - 先选方。
 * @param {object[]} bans - 包含队伍、谱面和隐藏状态的禁图事件。
 * @returns {string} 可直接粘贴到主表格的一行文本。
 */
function formatMainSheetText(firstPick,bans){
    const red=[]
    const blue=[]
    for(const ban of bans){
        if(ban.hidden||!ban.map)continue
        if(ban.color=='蓝队')blue.push(ban.map)
        else red.push(ban.map)
    }
    return (firstPick=='red'?'红队':'蓝队')+'\t'+red.join(' ')+'\t'+blue.join(' ')
}

/**
 * 将轮次事件简写展开为逐步执行的事件类型列表。
 * @param {string} pattern - 由 b、p、t 组成的轮次事件顺序。
 * @returns {string[]} 含赛前准备与结算的完整事件类型列表。
 */
function eventTypesFromPattern(pattern){
    const types=['startup']
    for(const marker of pattern){
        if(marker=='b')types.push('ban','ban')
        else if(marker=='p')types.push('pick','pick')
        else if(marker=='t')types.push('tb')
    }
    types.push('settle')
    return types
}

/**
 * 根据上一事件的比分和本局胜者计算新比分。
 * @param {{sr:number,sb:number}} previous - 上一事件的红蓝队比分。
 * @param {'red'|'blue'|''} winner - 本局胜者；空值表示尚未选定。
 * @returns {{sr:number,sb:number}} 新比分，不修改输入对象。
 */
function scoreAfter(previous,winner){
    return {
        sr:previous.sr+(winner=='red'?1:0),
        sb:previous.sb+(winner=='blue'?1:0),
    }
}

/**
 * 根据先选方确定每次禁图和选图的执行队伍。
 * @param {string[]} types - 完整事件类型列表。
 * @param {'red'|'blue'} firstPick - 先选方。
 * @param {string} redName - 红队名称。
 * @param {string} blueName - 蓝队名称。
 * @returns {(object|null)[]} 与事件列表同位置的队伍分配结果。
 */
function turnAssignments(types,firstPick,redName,blueName){
    const firstPickOffset=firstPick=='red'?1:0
    const assignments=[]
    for(let index=0;index<types.length;index++){
        const type=types[index]
        if(type!='ban'&&type!='pick'){
            assignments.push(null)
            continue
        }
        const isBan=type=='ban'?1:0
        const blue=!!((index&1)^firstPickOffset^isBan)
        assignments.push({color:blue?'蓝队':'红队',team:blue?blueName:redName})
    }
    return assignments
}

/**
 * 计算单个事件的比分、命令占位符和完成条件。
 * @param {object} event - 当前事件类型及已分配队伍。
 * @param {object|undefined} previous - 前一事件；赛前准备时为空。
 * @param {object} input - 从页面读取的先选方、谱面或胜者。
 * @param {object} match - 当前比赛配置及图池。
 * @param {object} settings - 包含 TB 模式的比赛设置。
 * @returns {{state:object,values:object,steps:boolean[]}} 状态更新、显示值和步骤完成情况。
 */
function calculateEvent(event,previous,input,match,settings){
    const values={}
    let steps=[]
    const state={}
    if(event.type=='startup'){
        state.sr=0
        state.sb=0
        if(input.firstPick){
            const firstBan=input.firstPick=='red'?'blue':'red'
            values.fp_t=match[input.firstPick].name
                +'（'+(input.firstPick=='red'?'红队':'蓝队')+'）'
            values.fb_t=match[firstBan].name
                +'（'+(firstBan=='red'?'红队':'蓝队')+'）'
        }
        steps=[input.firstPick!='']
    }else if(event.type=='ban'){
        state.sr=previous.sr
        state.sb=previous.sb
        state.map=input.map
        values.color=event.color
        values.team=event.team
        values.map=input.map
        if(input.map)values.bid=input.map=='0'?'空':match.pool[input.map].bid
        steps=[input.map!='']
    }else if(event.type=='pick'||event.type=='tb'){
        Object.assign(state,scoreAfter(previous,input.win))
        state.map=input.map
        state.win=input.win
        values.map=input.map
        values.win=input.win
        values.sr=state.sr
        values.sb=state.sb
        if(event.type=='pick'){
            values.color=event.color
            values.team=event.team
        }
        if(input.map){
            values.bid=match.pool[input.map].bid
            values.mod=match.pool[input.map].mod
        }
        steps=event.type=='tb'&&settings.tbOnlyOne
            ?[input.win!='']
            :[input.map!='',input.win!='']
    }else if(event.type=='settle'){
        values.team=event.sr>event.sb?match.red.name:match.blue.name
    }
    return {state,values,steps}
}
