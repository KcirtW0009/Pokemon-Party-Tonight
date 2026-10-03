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

## 版权声明（重要）

- PokeAPI / PokeAPI/sprites 仓库本身的开源许可**不意味着**宝可梦美术资源
  的权利归属。所有 Pokémon 相关图片、名称与数据的权利属于其各自权利人。
- Pokémon © Nintendo / Creatures Inc. / GAME FREAK inc.
- 本项目为**非官方、非商业的粉丝派对游戏**，与 Nintendo、Game Freak、
  Creatures Inc.、The Pokémon Company 没有任何关联，也不声称拥有任何
  Pokémon 相关权利。图片仅在玩法需要的界面内展示。
