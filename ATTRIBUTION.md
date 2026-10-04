# ATTRIBUTION.md — 素材来源与版权声明

## 宝可梦图片素材

- 来源仓库：[PokeAPI/sprites](https://github.com/PokeAPI/sprites)（仅使用其中
  `sprites/pokemon/other/official-artwork/` 目录的默认官方立绘）。
- 映射规则：全国图鉴 ID 直接对应文件名，例如 `#260` →
  `official-artwork/260.png`。
- 管线：`scripts/build-pokemon.mjs`（构建/下载脚本）→ 本地静态资源
  `public/pokemon/official-artwork/{id}.png` → 游戏内引用
  `/pokemon/official-artwork/{id}.png`。
- V0.1 仅收录全国图鉴 No.1–1025 基础形态；不包含 Mega 进化、超极巨化、
  地区形态、换装/特殊形态、闪光形态等多余立绘集合。

## 数值与名称数据

- 取自 [PokéAPI](https://pokeapi.co/)（`pokemon` / `pokemon-species` 接口），
  构建期生成 `data/pokemon.json`，运行时不再请求外部 API。
- 中文名来自 PokéAPI 的简体中文（`zh-hans`）名称，拼音由构建脚本生成。
- 分类线索取自同一物种接口的蛋组、身体形状、颜色、前置进化、其他形态和可切换形态字段，由 `scripts/build-clue-tags.mjs` 生成本地 `data/clue-tags.json`。
- 分类玩法参考用户提供的 [Pokennection](https://www.pokennection.com/) 思路；没有复制其题库或素材，标签来自 PokéAPI，中文提示词与筛选规则由本项目整理。

## 版权声明（重要）

- PokeAPI / PokeAPI/sprites 仓库本身的开源许可**不意味着**宝可梦美术资源
  的权利归属。所有 Pokémon 相关图片、名称与数据的权利属于其各自权利人。
- Pokémon © Nintendo / Creatures Inc. / GAME FREAK inc.
- 本项目为**非官方、非商业的粉丝派对游戏**，与 Nintendo、Game Freak、
  Creatures Inc.、The Pokémon Company 没有任何关联，也不声称拥有任何
  Pokémon 相关权利。图片仅在玩法需要的界面内展示。

新增游戏素材来源与逐文件校验见 data/batch-assets-manifest.json。103 组性别差异图片来源为神奇宝贝百科的性别差异列表及 HOME 素材；美洛耶塔舞步立绘来源为 PokeAPI/sprites official-artwork/10018.png。素材在本地托管。


本次新增音效由浏览器 Web Audio 的振荡器和噪声合成，没有下载或使用第三方音频录音。
