# 裁判表测试

测试按功能分为三个文件：

- `config.test.js`：图池、队伍预设、比赛配置及文本转义。
- `edge.test.js`：切换轮次、比分回算、多 TB 与未配置时的导出。
- `flow.test.js`：禁图、选图、比分、结算和重新初始化。
- `logic.test.js`：独立验证图池、事件顺序、比分和文本格式函数。
- `output.test.js`：命令模板、辅助面板、主表格文本和比赛记录导出。

在仓库根目录运行：

```powershell
npm test
```

测试框架使用 Node.js 内置的 `node:test` 和 Google Chrome 的 DevTools Protocol，无需安装 npm 包。需要 Node.js 22 或更新版本，以及 Google Chrome。测试会启动本地服务器和无界面的 Chrome，加载项目页面及 JSON 配置。

如果 Chrome 不在常见安装路径，可设置 `CHROME_PATH` 指向 `chrome.exe` 后运行同一命令。
