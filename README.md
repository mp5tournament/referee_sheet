# 更适合中国宝宝的裁判表

中文osu裁判表，不用google表格套装的话应该是比较方便的方案了（主办如果懂点码的话配置起来应该不算麻烦；配置好之后对裁判来说非常方便，可能比google表格还更方便一些）。  
本项目中大概会更新最新一届MP5的队伍信息和图池等配置以供MP5裁判使用（[裁判使用的发布版](https://mp5tournament.github.io/referee_sheet/)）。  
你也可以拿走给你自己的比赛用。

## 🔗相关项目

|代码仓库|在线发布版|
|-|-|
|[📦裁判表](https://github.com/mp5tournament/referee_sheet)|[✅裁判表](https://mp5tournament.github.io/referee_sheet/)|
|[📦直播配置生成器](https://github.com/mp5tournament/streaming_config)|[✅直播配置生成器](https://mp5tournament.github.io/streaming_config/)|
|[📦图池表生成器](https://github.com/mp5tournament/map_pool_sheet)|[✅图池表生成器](https://mp5tournament.github.io/map_pool_sheet/)|


## 📄使用方法

可以直接把html文件下载下来，根据你的比赛需求修改好配置之后作为独立的单页面文件直接离线使用，也可以像本项目一样传到你的仓库里然后用[GitHub Pages](https://docs.github.com/zh/pages)之类的东西搞成在线裁判表。

## ⚙️配置方式

编辑html文件，搜索"锦标赛设置"以定位到设置部分，直接修改相关配置即可。
可以修改的配置如下：
### rounds：图池设置
每轮一个对象，对象名就是轮次名。  
events表示bo数和ban数以及bp事件顺序，每个b表示双方各一ban，每个p表示双方各一pick，t表示tb。例如1ban bo9为"bppppt"，2ban bo11为"bbpppppt"，如果第二个ban在第一轮选图后的话，则为"bpbppppt"。  
pool表示图池，里面的数字是bid，格式照抄就行。  
### teamData：队伍设置
队伍名、队长id、队员id（但队员id其实没用）。队伍名和队长id会出现在相关的指令中（比如邀请队长的命令、报比分时的语句）。  
格式照抄就行，注意每行内不同项的分隔符是/t，也就是说那几行直接从表格里复制一般就没问题。
### name：比赛名称
如"第二十届MP5杯"。
### nickname：比赛简称
如"MP5S20"，会成为房间名的开头部分。
### tbPickable：是否允许在一般选图时选TB
一般为false，如果为true的话选图的下拉菜单里会出现TB。
### tbOnlyOne：是不是单TB
一般为true，如果是3TB之类的情况用false。
### teamPlayingSize：每队上场人数
3v3就是3，4v4就是4。
### poolMod：图池Mod
每个图池所要求的mod，会成为!MP MODS指令之后的内容，一般不用改。
### poolSymbol：图池标志
用来好看的，一般不用改，如果有特殊图池的话可以自己加。
