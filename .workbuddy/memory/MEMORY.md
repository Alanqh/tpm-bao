# TPM 保障包项目长期笔记

## 项目概述
硅基流动（SiliconFlow）「预留 vTPM / 在线文本」商品管理前端原型（纯 HTML + Tailwind CDN + 内联 JS mock，静态可部署）。仓库根：`/Users/lqh/Documents/ChatGPT/TPM保障包/`，页面在 `prototype/` 下。已迭代至第34轮（main e85e5db / gh-pages f16f7fe，21 套 723 项 + smoke 37 全绿）。

## 第34轮（现行口径）：空间计划列表取消 rowspan 合并
- **renderSpacePlans 每行完整渲染 9 列**：删除 planSpanMap/_firstOfPlan/_planSpan 计算与 cell helper；状态/所属空间计划/优先级/起止 4 个计划级列改普通 td（用户嫌合并难看）。
- 排序逻辑不变（状态→effStart 降序→fn 字典序→空间 seq），同计划行仍自然连续。
- 售卖单元 Tab（fnSpan/spSpan）与售卖空间 Tab（showFn rowspan）的合并不动（第19/20/32轮口径）。

## 第33轮（现行口径）：删上架徽标 + 列表在售/禁售两 Tab
- 商品详情页右上角无上架状态标识（#detail-status 已删；refreshProductBadge 留空壳防调用点报错；productIsListed 留给 openPendingDetail 兼容入口）。
- 列表页 Tab=在售/禁售（默认在售），语义=售卖单元状态直查：在售 Tab=单元在售行；禁售 Tab=单元禁售行（无计划草稿/计划未生效/单元下架）。
- 售卖单元=纯前端草稿（显性化）：创建单元只写页面内 saleUnits，无售卖计划即禁售、入禁售 Tab、可删除；只有为其创建售卖计划（发布生效）才真正「落库」在售。
- 列表页标题下说明文字已删；「已上架售卖单元」类文案全改「本计划上架」口径；页面 UI 无「已上架/未上架/待上架」字样（仅剩 JS 历史注释）。
- 教训：改 Tab 名要主动 grep 全部测试断言。

## 第32轮（现行口径）：空间生效纯计划仲裁——默认空间机制废除
- **effectiveSpaceAt(fn,t)**：候选=published 且生效期内且 fnSpaces[fn] 空间存在的计划；仲裁 `(b.priority-a.priority)||(seqOf(b)-seqOf(a))`；无命中返回 `{key:'',source:'',plan:null}`（无 manual/默认回落）。currentSpaceOfFn=delegate 别名。
- 默认机制全删：defaultFnSpaceMap/fnSpaceMap/setSpaceActive/「默认」徽标/设为默认操作列；快照链路删 fnSpaceMap 字段。
- **renderSpaceTab 按查询时刻过滤**：每 fn 至多一行生效空间（胜出计划标注+未来切换预告 amber，只显日期+计划名）；无命中 fn 不展示；空表提示「该时刻无生效中的售卖空间」；表头 5 列。
- 预告真 bug 修复：原条件与 nextSpaceSwitchOfFn 过滤矛盾=死代码；改为有预告即挂当前生效行。
- mock 常驻计划：全商品补常规计划承接日常生效（vtpm ''→sp1 p100；glm4 常规 idx0 input→sp2/output→sp4/cache→sp5 p100 + 双11 idx1 input→sp3 p500 11-11~11-20）；pre 常驻计划 pending_publish（演示无生效→空表）。
- 踩坑：①计划名「双11大促·输入切换售卖空间3」含子串「售卖空间3」——按行内空间 key（cells[1]/div.font-mono）定位；②新计划默认时段 11-11~11-20 不含当前时点（2026-11-03），验证接管须显式填 effStart/effEnd/priority。

## 第31轮（现行口径）：售卖空间改为通过空间计划创建
- 创建路径重构：售卖空间由空间计划创建（不再手动批量创建）。弹窗每 fn 一行：勾选 fn + 维度复选组 `.sp-dim-check[data-fn]`（候选=dimensionOptions 全量）+「当前生效」提示。无 fn 商品单行 fn=''。
- spacePlan schema：`fnDims:{fn:[dims]}` + `fnSpaces:{fn:spaceKey}`。confirmSpacePlan 保存时**为每个勾选 fn 总是新建一个售卖空间**（不拦截重复、不合并）；修改时维度集合未变的 fn 沿用原空间、变了的重建；copySpacePlan 为副本每 fn 新建空间。
- 删除批量创建全链路（space-new-btn/modal-space-edit/openSpaceBulkModal/addSpaceRow/confirmSpaceBulk）。refreshEditControls 按钮数组只留 spaceplan-new-btn。售卖空间 Tab 头部仅剩时间点查询控件，空表引导走空间计划。
- 改名：「空间切换计划」统一为「空间计划」。
- 踩坑：①测试 forEach 内 return 不能中断外层——用变量传出再统一拦截；②弹窗模板漏 onchange 会导致勾选联动静默失效。

## 第29轮（现行口径）：空间计划交互对齐售卖计划
- 列表头部提示文案删除；新增按钮统一放列表左上角，未发起变更时置灰（refreshEditControls 按钮数组含 spaceplan-new-btn）。
- 命名：空间计划 Tab 表头「空间计划单元」；售卖计划侧「售卖计划单元」。
- 空间计划 Tab 9 列无行内操作（操作在详情页）；所属空间计划链接 openSpacePlanDetail(planIdx)；空表 colspan 9。
- #spaceplan-detail-view 独立详情页：标题+状态徽标+返回；基础信息；单元表 6 列；操作区 pending=修改+发布+复制 / published=停用+复制 / stopped=仅复制（复制不套 disCls，不受编辑锁限制）。copySpacePlan 深拷贝、名称+"-副本"（重名加序号）、push 为 pending_publish。
- 联动复位：publishSpacePlan/stopSpacePlan 末尾若详情页打开重渲；editSpacePlan 先 closeSpacePlanDetail；showDetailView 复位 currentSpacePlanDetailIdx；backToList 开头必须调 closeSpacePlanDetail()（真 bug 修复）。

## 第28轮（现行口径）：空间时间点查询 + 空间计划排序
- 售卖空间 Tab 时间点查询：#space-tf-point + querySpaceAt/resetSpaceAt + 紫色提示条；与售卖单元 Tab 共享 timeFilter；接管/预告/effectiveSpaceAt 均按查询时刻判定。
- 空间计划 Tab 排序：stRank{published:0,pending_publish:1,stopped:2} → effStart 降序 → fn 字典序 → 空间 seq。effStart 两种格式（mock 含秒 vs pcpVal 无秒）字符串比较分钟级精度不受影响。~~rowspan 计算放排序后~~（第34轮已取消合并）；pu-sp-N-M 的 M=fnSpaces 键序。

## 第27轮（历史）：空间计划独立 Tab
- Tab 序：售卖空间→空间计划→售卖单元→售卖计划→定价计划→折算→SLO；#inner-tab-spaceplan + #spaceplan-tbody。
- 平铺空间计划单元：每行=fn×售卖空间×空间计划。~~计划级列 rowspan 合并——第34轮已取消~~。

## 第26轮（历史）：空间计划独立实体（模型沿用至今）
- spacePlans 实体：{name,priority,effStart,effEnd,fnSpaces}；一条计划可指定多个 fn；三态复用 planStatusMeta；与售卖单元无关（空间是正交维度）。
- nextSpaceSwitchOfFn=t 后首个改变该 fn 空间的已发布计划。fnSpaces 仅存在于 spacePlan schema。售卖计划创建页保留「⚠ 非生效空间」标注。
- 教训：第25轮我推荐的路径 B 被用户试用后推翻——「研发心智模型」论据不敌「正交维度分开管」的运营直觉。

## 第24轮：售卖计划售卖单元筛选
- fn 筛选=复选组+全选框（全不勾=全部）；空间筛=两态 #plan-filter-space（''/'__ACTIVE__' 仅生效中）。超范围勾选自动取消（幂等不递归）；openPlanCreatePage/editPlanRow 调 planUnitsFilterReset()。

## 第23轮（现行口径）：售卖空间只管维度
- spaces[key]={seq,name:'售卖空间N',fn,dims}，无 measures；名称序号自增；key=sp{seq}，spaceSeq 跨 fn 连续。SU 弹窗：维度=空间 dims×度量=measureOptions 全量；pair 只增不减。
- mock：sp1('',购买量+周期)/sp2(input,两token)/sp3(input,输入token)/sp4(output,两token)/sp5(cache,输入token)；glm4 su-1/2@sp2、su-3@sp4、su-4@sp5。

## 核心业务概念
- 预留 vTPM 资源包：按「购买量（万 vTPM step）× 购买周期（天）」售卖；超量路由=超量限流（429）或超量路由 Serverless 二选一；折算系数三维度配 YAML 版本；SLO A类违约按累计违约分钟/月分档赔付。
- 关键实体链：商品 → 售卖空间（属 function，只管维度）→ fn 生效空间（纯空间计划仲裁）→ 售卖单元（纯前端草稿，有售卖计划才算真正创建）→ 售卖计划（七字段组）→ 空间计划 → 手动交付 → 资源包 → 监控。
- 后台菜单：预留vTPM管理挂「活动运营」；商品管理挂「商品定价中心」。

## 历史轮要点（仍有效）
- 第12轮：商品与模型/Playground 解耦。第13轮：列表页按单元状态平铺两 Tab（第33轮起=在售/禁售）。第11轮 productIsListed 推导（第33轮起不驱动 UI）。
- 第16/18轮计划复制：三态均可复制（深拷贝→-副本→待发布）不受锁，copySpacePlan 继承。
- 第19/20轮：售卖单元 Tab 15 列（fn/空间 rowspan）；售卖计划 Tab 19 列/详情表 17 列。
- 已废弃：第15~18轮维度勾选；第20轮默认空间/自定义名称；第21轮旧空间计划实体；第22轮空间 measures/fn 配置卡；第25轮 path B；第27轮行内操作列（第29轮删）；第28轮前「未指定空间补尾行」；第30轮前售卖空间卡片；第31轮前批量创建空间；第32轮前手动默认空间；第33轮前上架徽标+已上架/未上架 Tab；**第34轮前空间计划列表 rowspan 合并**。

## 页面地图（prototype/）
- index.html 官网首页 / terms.html 购买须知 / wallet.html 前台充值（packages.html 跳转壳）/ monitor.html+monitor-component.html 前台+共用监控组件 / admin-monitor.html 后台监控。
- admin-packages.html 后台预留 vTPM 管理（第14轮手动交付弹窗；只能交付在售售卖单元）。
- admin-products.html 商品管理后台（主战场）。

## 商品后台实现要点（admin-products.html）
- **五视图同级切换**：#list-view / #detail-view / #plan-detail-view / #spaceplan-detail-view / #plan-create-view。
- 详情页 7 个 tab：售卖空间（默认）→空间计划→售卖单元→售卖计划→定价计划（占位）→折算→SLO。
- unitStatusOf：时间点取 timeFilter.point（未选=当前）；在售=生效中最高优先级计划 unitStates[uid]≠'off'。
- 计划三态：pending_publish/published/stopped（两类计划共用）。
- planRow schema：{name,priority,effStart,effEnd,units,unitStates,chargeCodes/quotaCodes/inventoryCodes,modes{7键},factor|factors,slo|slos,payloadId|payloads,minQty/maxQty/stepQty|qtys}；planFieldVal+PLAN_FIELDS 映射。
- draft 双存 planDraft{key:{unified,units{}}}；renderPlanCreateSections(skipCollect)——外部写完 draft 重渲必须传 true。**含 ${} 模板字符串用 Edit 工具改**。
- **编辑锁（第10轮）**：editLocks{code}（pro 由张三持锁）；canEdit/guardEdit/startEdit/exitEdit；护栏在 publish/stop/editPlanRow/confirmSaleUnits/removeSaleUnit/confirmPlanCreate/confirmSpacePlan（复制豁免）。
- backToList snapshotCurrentProduct 回写；openDetailByCode 统一入口。示例数据自洽：计划/状态按商品隔离；计费项前缀=商品code。

## 技术约定与部署
- 每页顶部深色「原型导航」栏；后台紫色主色 #7C3AED；管理员「吕」。数据全为页面内 JS mock。
- **部署（Pages legacy 从分支部署）**：gh-pages 分支=HTML 根直出+.nojekyll。流程：推 main → git worktree add gh-pages → rm+cp prototype/*.html → 推送 → sleep~105s → curl 验证线上 → worktree remove。URL：https://alanqh.github.io/tpm-bao/admin-products.html
- **测试（tests/，NODE_PATH=/Users/lqh/.workbuddy/binaries/node/workspace/node_modules）**：21 套全绿（第33轮口径共 723 项）+ smoke 37——plan-page(77)/this-round(31)/data-consistency(28)/r9..r13(25/32/18/30)/r14(50)/r15(38)/r16(29)/r18(28)/r19(33)/r20(74)/r22(27)/r23(36)/r24(16)/r25(51)/r27(31)/r28(24)/r29(39)/su-dim-validate(6)。
- **jsdom 踩坑汇总**：runScripts:'dangerously'；confirm/alert 打桩；页面顶层 const 用 window.eval 取；rowspan 合并行按"任意 cell 匹配"取行、cells 索引偏移；勾选联动须 dispatchEvent(change,{bubbles:true})；跨商品切换先 backToList()；筛选测试元素引用重渲后重查；**jsdom 跑批 >150s 被 SIGKILL(137) 分批跑**；断言 beware 计划名含空间名子串（用空间 key/pu-sp-N-N 定位）；行数断言先想清 productSpaces() 按 fnPool 过滤（glm4 无 sp1）。
- 语法校验：node -e 提取 `<script>` 用 new Function()。修页面后先跑全套找红再逐套改断言。
- 网络偶发 502：push 失败等 1-2 分钟重试；恢复检测=curl https://github.com
