# 第二批游戏

依据 `second-patch-games.md` 实现七款新游戏，大厅共 11 款。开发与测试使用 **http://localhost:3100**。

## 用户确认的规则

- 新竞技游戏完成整场后，原始成绩排名转换为房间积分：100 / 50 / 25。并列采用竞赛排名，例如 1、1、3。合作驾驶不计分。
- 属性炸弹自定义任意正整数局数；找茬自定义 1–103 题，单场不重复。后续游戏未明确固定局数时默认提供自定义。
- 树果 3–10 轮、雷弹 4–12 轮、记忆 6 / 9 / 27 对遵循文档的显式配置。
- 三人墙棋局数为 3 的倍数；两人、四人允许任意正整数。
- 驾驶固定三张地图，60 / 90 / 120 / 180 秒；超时进入下一张，整场结束后返回大厅重新开局。

## 协议和权威状态

沿用 Socket.IO `game-action`，新增游戏必须传递 `meta: { roomId, matchId, roundId, turnId, actionId }` 和 `action`。重复 actionId 的相同请求返回原结果，不再次修改；同编号不同内容拒绝。服务端先处理超时再校验阶段。

新游戏快照包含 revision、serverTime、局/回合编号、原始 points 和最终 gains。每次广播 revision 增加，客户端忽略旧版本。开局锁定参与名单，晚加入者可以旁观，不能操作。重连使用已有私密 sessionToken。

驾驶 `input` 还包括递增 inputSeq；雷弹 `press / release / cancel` 包括 possessionId。驾驶服务器以 50ms 固定步长模拟、20Hz 广播，客户端 rAF 插值。真实按键映射永不下发。薄墙碰撞细分处理、卡顿追赶最多 100ms。

属性炸弹 / 树果 / 墙棋不足两名可参与的在线玩家时暂停最多 30 秒；驾驶全员离线时暂停。恢复时移动时间基准。雷弹不会因为持有者离线而停止爆炸。

## 素材

`data/gender-wiki.json`：神奇宝贝百科列表中的 103 组物种/形态雌雄图片，均下载本地并人工查看核对图。使用同一 HOME 渲染素材家族，保留图片原始画布。少数原图为 192px，多数为 512px；均为正方形，在同尺寸格子中等比例显示。部分物种的性别本身改变整体外形。

`data/batch-assets-manifest.json`：239 张素材的原始页面、下载地址、归属、用途、本地路径、尺寸与 SHA-256。找茬素材置于 `assets/gender-wiki`，不暴露雄雌文件路径；每格随机匿名地址，正确位置只在揭晓时公开。所有在线参与者预加载完成后才开始题目计时，失败停止比赛并保留已完成题分。

来源：[神奇宝贝百科性别差异列表](https://wiki.52poke.com/zh-hans/拥有性别差异的宝可梦列表)、[文柚果](https://wiki.52poke.com/zh-hans/文柚果)、[PokéAPI sprites](https://github.com/PokeAPI/sprites)。宝可梦图片归 Nintendo / Creatures / GAME FREAK；本项目为非官方粉丝项目，代码许可不授予图片商业授权。

## 检查

`npm run test:logic`：已有四款规则回归和第二批规则/隐藏信息/时间/棋盘/碰撞测试。

`npm run test:batch`：独立启动 3100 端口的生产测试服务（PPT_FAST），三个真实 Socket.IO 客户端连续开七款并结算，验证成绩一致、旁观、重复/过期请求、房主迁移与重连。请先停开发服务器。

`npm run smoke`：已有四款，2 / 3 / 8 人实际联机回归。

`node scripts/validate-batch-assets.mjs`：验证素材完整与核验后的哈希；`node scripts/build-batch-manifest.mjs` 仅在重新核验素材后更新清单。

房间仍保存在服务器内存，重启清空房间。长期持久化和公网弱网/真实手机设备压力测试不在本次实测范围。
