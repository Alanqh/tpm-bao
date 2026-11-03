# TPM 保障包项目长期笔记

## 项目概述
硅基流动（SiliconFlow）「预留 vTPM / 在线文本」商品管理前端原型（纯 HTML + Tailwind CDN + 内联 JS mock，静态可部署）。仓库根：`/Users/lqh/Documents/ChatGPT/TPM保障包/`，页面在 `prototype/` 下。已迭代至第35轮（main 2a11004 / gh-pages 4a42fc5，21 套 + smoke 全绿）。

## 第35轮（现行口径）：0 维度空间 + code 唯一标识 + 状态列精简
- **0 维度售卖空间合法**：confirmSpacePlan 勾选 fn 不选维度可保存（fnDims[f]=[]）；SU 弹窗 0 维分支（renderSuZeroDimBody/confirmZeroDimUnit）——只能创建一个售卖单元（dim/measure 空串）；空 fn 拦截文案「至少勾选一个 function」。
- **空间无名称**：schema 去 name 字段，key（sp{N}）即唯一标识；所有展示点（售卖空间/空间计划 Tab 列表+详情、售卖单元 Tab、售卖计划 Tab+详情、SU 弹窗下拉、计划创建页、空间计划弹窗「当前生效」）只显 code；售卖单元 Tab 空间列=单 code 渲染。
- **状态列精简**：售卖空间 Tab 状态列只留「生效中」徽标——胜出计划标注与切换预告标注删除（nextSpaceSwitchOfFn 函数保留但 UI 不再引用）；空表提示精简。
- **维度展示**：空 dims 一律 `--`（各列表 + formatDimMeasure/Text）。
- 踩坑：r19 断言暴露售卖单元 Tab 空间列双渲染真 bug；r22 的 Object.keys(fnDims) 顺序=fnPool DOM 序（非勾选顺序）；r20 空_fn 拦截前要清 sp-name 残留。

## 第34轮（现行口径）：空间计划列表取消 rowspan 合并
- **renderSpacePlans 每行完整渲染 9 列**：删除 planSpanMap/_firstOfPlan/_planSpan 计算与 cell helper；状态/所属空间计划/优先级/起止 4 个计划级列改普通 td（用户嫌合并难看）。
- 排序逻辑不变（状态→effStart 降序→fn 字典序→空间 seq），同计划行仍自然连续。
- 售卖单元 Tab（fnSpan/spSpan）与售卖空间 Tab（showFn rowspan）的合并不动（第19/20/32轮口径）。

## 第33轮（现行口径）：删上架徽标 + 列表在售/禁售两 Tab
- 详情页右上角无上架状态标识（#detail-status 删；refreshProductBadge 留空壳；productIsListed 留兼容入口）。
- 列表 Tab=在售/禁售（默认在售）=售卖单元状态直查；售卖单元=纯前端草稿（有售卖计划发布生效才「落库」在售）。
- 页面 UI 无「已上架/未上架/待上架」字样。教训：改 Tab 名要主动 grep 全部测试断言。

## 第31/32轮（现行口径，细节见日志）
- 第31轮：售卖空间由空间计划创建（弹窗每 fn 一行=勾选 fn+维度复选组 .sp-dim-check[data-fn]；confirmSpacePlan 为每个勾选 fn 总是新建空间，修改时维度未变的 fn 沿用原空间；copySpacePlan 副本每 fn 新建）。删批量创建全链路；「空间切换计划」改名「空间计划」。
- 第32轮：effectiveSpaceAt(fn,t) 纯计划仲裁——候选=published 且生效期内且 fnSpaces[fn] 存在；排序 (优先级降序)||(seq 大优先)；无命中 {key:'',plan:null}（默认机制全删）。currentSpaceOfFn=delegate 别名。mock 全商品补常驻计划（vtpm ''→sp1 p100；glm4 常规 idx0 三 fn p100 + 双11 idx1 input→sp3 p500；pre pending_publish）。
- 踩坑：计划名「双11大促·输入切换售卖空间3」含子串「售卖空间3」——按行内空间 key/pu-sp-N-N 定位；新计划默认时段 11-11~11-20 不含当前时点（2026-11-03），验证接管须显式填时段+优先级。

## 第29轮（现行口径）：空间计划交互对齐售卖计划
- 列表头部提示文案删除；新增按钮统一列表左上角，未发起变更置灰（refreshEditControls 按钮数组含 spaceplan-new-btn）。
- 空间计划 Tab 9 列无行内操作（操作在详情页）；表头「空间计划单元」；空表 colspan 9。
- #spaceplan-detail-view 独立详情页：标题+状态徽标+返回；基础信息；单元表 6 列；操作区 pending=修改+发布+复制 / published=停用+复制 / stopped=仅复制（复制不套 disCls）。copySpacePlan 深拷贝、"-副本"、pending_publish。
- 联动复位：publish/stopSpacePlan 末尾重渲详情；editSpacePlan 先 closeSpacePlanDetail；showDetailView 复位 idx；backToList 开头必调 closeSpacePlanDetail()（真 bug 修复）。

## 第28轮（现行口径）：空间时间点查询 + 空间计划排序
- 售卖空间 Tab 时间点查询：#space-tf-point + querySpaceAt/resetSpaceAt + 紫色提示条；与售卖单元 Tab 共享 timeFilter；接管/预告/effectiveSpaceAt 均按查询时刻判定。
- 空间计划 Tab 排序：stRank{published:0,pending_publish:1,stopped:2} → effStart 降序 → fn 字典序 → 空间 seq。effStart 两种格式（mock 含秒 vs pcpVal 无秒）字符串比较分钟级精度不受影响。~~rowspan 计算放排序后~~（第34轮已取消合并）；pu-sp-N-M 的 M=fnSpaces 键序。

## 第24/26/27轮（历史）
- 第24轮：售卖计划售卖单元筛选——fn 复选组+全选框（全不勾=全部）；空间筛两态 #plan-filter-space（''/'__ACTIVE__' 仅生效中）；超范围勾选自动取消（幂等不递归）。
- 第26轮：spacePlans 实体 {name,priority,effStart,effEnd,fnSpaces}；一条计划多 fn；三态复用 planStatusMeta；空间是正交维度（第25轮 path B 被用户推翻）。nextSpaceSwitchOfFn 函数保留（第35轮起 UI 不再引用）。
- 第27轮：空间计划独立 Tab（#inner-tab-spaceplan+#spaceplan-tbody，Tab 序第2位）；每行=fn×售卖空间×空间计划。

## 第23轮（现行口径）：售卖空间只管维度
- spaces[key]={seq,fn,dims}，无 name/measures（第35轮起 code 即标识）；key=sp{seq}，spaceSeq 跨 fn 连续。维度可为空=0 维度空间（只能建一个售卖单元）。SU 弹窗：维度=空间 dims×度量=measureOptions 全量；pair 只增不减。
- mock：sp1('',购买量+周期)/sp2(input,两token)/sp3(input,输入token)/sp4(output,两token)/sp5(cache,输入token)；glm4 su-1/2@sp2、su-3@sp4、su-4@sp5。

## 核心业务概念
- 预留 vTPM 资源包：按「购买量（万 vTPM step）× 购买周期（天）」售卖；超量路由=超量限流（429）或超量路由 Serverless 二选一；折算系数三维度配 YAML 版本；SLO A类违约按累计违约分钟/月分档赔付。
- 关键实体链：商品 → 售卖空间（属 function，只管维度）→ fn 生效空间（纯空间计划仲裁）→ 售卖单元（纯前端草稿，有售卖计划才算真正创建）→ 售卖计划（七字段组）→ 空间计划 → 手动交付 → 资源包 → 监控。
- 后台菜单：预留vTPM管理挂「活动运营」；商品管理挂「商品定价中心」。

## 历史轮要点（仍有效）
- 第12轮：商品与模型/Playground 解耦。第13轮：列表页按单元状态平铺两 Tab（第33轮起=在售/禁售）。第11轮 productIsListed 推导（第33轮起不驱动 UI）。
- 第16/18轮计划复制：三态均可复制（深拷贝→-副本→待发布）不受锁，copySpacePlan 继承。
- 第19/20轮：售卖单元 Tab 15 列（fn/空间 rowspan）；售卖计划 Tab 19 列/详情表 17 列。
- 已废弃：第15~18轮维度勾选；第20轮默认空间/自定义名称；第21轮旧空间计划实体；第22轮空间 measures/fn 配置卡；第25轮 path B；第27轮行内操作列（第29轮删）；第28轮前「未指定空间补尾行」；第30轮前售卖空间卡片；第31轮前批量创建空间；第32轮前手动默认空间；第33轮前上架徽标+已上架/未上架 Tab；第34轮前空间计划列表 rowspan 合并；第35轮前空间名称/至少一维拦截/状态列计划标注。

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
- **测试（tests/，NODE_PATH=/Users/lqh/.workbuddy/binaries/node/workspace/node_modules）**：21 套 + smoke 全绿（第35轮口径；项数以各套最新输出为准）——plan-page(77)/this-round(31)/data-consistency(28)/r9..r13(25/32/18/30)/r14(50)/r15(38)/r16(29)/r18(28)/r19(33)/r20(74)/r22(28)/r23(34)/r24(16)/r25(51)/r27(31)/r28(24)/r29(39)/su-dim-validate(6)。
- **jsdom 踩坑汇总**：runScripts:'dangerously'；confirm/alert 打桩；页面顶层 const 用 window.eval 取；rowspan 合并行按"任意 cell 匹配"取行、cells 索引偏移；勾选联动须 dispatchEvent(change,{bubbles:true})；跨商品切换先 backToList()；筛选测试元素引用重渲后重查；**jsdom 跑批 >150s 被 SIGKILL(137) 分批跑**；断言 beware 计划名含空间名子串（用空间 key/pu-sp-N-N 定位）；行数断言先想清 productSpaces() 按 fnPool 过滤（glm4 无 sp1）。
- 语法校验：node -e 提取 `<script>` 用 new Function()。修页面后先跑全套找红再逐套改断言。
- 网络偶发 502：push 失败等 1-2 分钟重试；恢复检测=curl https://github.com
