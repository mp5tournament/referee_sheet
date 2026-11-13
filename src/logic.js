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
            if(!Array.isArray(bids)||!bids.length||bids.some(bid=>!/^\d+$/.test(String(bid))))
                throw new Error('图池配置格式错误：'+name)
        }
    }
    return raw
}

function buildPool(round,settings){
    const pool={}
    for(const mod in round.pool){
        const pickable=mod=='TB'
            ?[false,!!settings.tbPickable,true]
            :[true,true,false]
        round.pool[mod].forEach((bid,index)=>{
            const name=round.pool[mod].length>1?mod+(index+1):mod
            pool[name]={
                bid,
                mod:settings.poolMod[mod],
                symbol:settings.poolSymbol[mod],
                pickable,
            }
        })
    }
    return pool
}

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

function normalizeMatchLink(input){
    const id=String(input).split('/').filter(Boolean).at(-1)
    return id?'https://osu.ppy.sh/community/matches/'+id+'\n':''
}

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

function scoreAfter(previous,winner){
    return {
        sr:previous.sr+(winner=='red'?1:0),
        sb:previous.sb+(winner=='blue'?1:0),
    }
}

function turnAssignments(types,firstPick,redName,blueName){
    const firstPickOffset=firstPick=='red'?1:0
    return types.map((type,index)=>{
        if(type!='ban'&&type!='pick')return null
        const isBan=type=='ban'?1:0
        const blue=!!((index&1)^firstPickOffset^isBan)
        return {color:blue?'蓝队':'红队',team:blue?blueName:redName}
    })
}

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
