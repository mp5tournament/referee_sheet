# 更适合中国宝宝的裁判表

中文osu裁判表，不用google表格套装的话应该是比较方便的方案了（对主办来说应该不算麻烦，但最好懂点码；配置好之后对裁判来说可能比google表格还更方便一些）。  
本项目中大概会更新最新一届MP5的队伍信息和图池等配置以供MP5裁判使用（[地址](https://mp5tournament.github.io/referee_sheet/)）。  
你也可以拿走给你自己的比赛用。

## 使用方法

可以直接把html文件下载下来，根据你的比赛需求修改好配置之后作为独立的单页面文件直接离线使用，也可以像本项目一样传到你的仓库里然后用[GitHub Pages](https://docs.github.com/zh/pages)之类的东西搞成在线裁判表。

## 配置方式

编辑html文件，搜索“锦标赛设置”以定位到设置部分，直接修改相关配置即可。
一般需要修改的配置如下：
### rounds：图池设置
每轮一个对象，对象名就是轮次名。里面的events表示
### teamData：队伍设置

### name：比赛名称
如“第二十届MP5杯”
### nickname：比赛简称
如“MP5S20”，会成为房间名的开头部分
### tbPickable：是否允许在一般选图时选TB
一般为false，如果为true的话选图的下拉菜单里会出现TB，但影响不大
### tbOnlyOne：是不是单TB
一般为false，如果是3TB之类的情况用true
### teamPlayingSize：每队上场人数
3v3就是3，4v4就是4
### poolMod：图池Mod
每个图池所要求的mod，会成为!MP MODS指令之后的内容，对于大部分比赛，就把DT里的FreeMod删掉就行，因为DT不让开别的Mod（但MP5让），其他一般不用改。
### poolSymbol：图池标志
用来好看的，一般不用改，如果有特殊图池的话可以自己加
