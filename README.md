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

安装 Node.js 22 或更新版本，在项目目录运行：

```sh
npm start
```

打开终端显示的地址（默认是 `http://127.0.0.1:4173/`）。项目也可以部署到 [GitHub Pages](https://docs.github.com/zh/pages) 等静态网站服务。页面会从同一站点读取比赛配置，因此请通过本地服务器或部署地址访问。

运行 Chrome 测试：

```sh
npm test
```

## ⚙️配置方式

编辑 `config/tournament.json`。页面加载时会检查配置格式；格式错误会显示在页面上。

### rounds：图池设置
每轮一个对象，对象名是轮次名。`events` 表示禁图、选图及 TB 顺序：每个 `b` 表示双方各禁一图，每个 `p` 表示双方各选一图，`t` 表示 TB。例如 1 ban BO9 为 `bppppt`。`pool` 按 NM、HD、HR、DT、FM、CA、TB 等类别列出谱面 ID 数组。

### teamData：队伍设置
每支队伍是一个对象：`name` 为队名，`cap` 为队长 ID，`player` 为其他队员 ID 数组。队长会自动加入邀请指令列表。

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

## 项目结构

- `config/tournament.json`：比赛数据和规则。
- `src/logic.js`：图池、比分、事件顺序及记录文本计算。
- `src/app.js`：页面显示和用户操作。
- `src/bootstrap.js`：读取并校验配置后启动页面。
- `scripts/serve.js`：本地静态服务器。
- `unittest/`：Chrome 测试。
