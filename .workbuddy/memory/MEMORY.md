# TPM 保障包项目长期笔记

## 项目概述
硅基流动（SiliconFlow）「预留 vTPM / 在线文本」商品管理前端原型（纯 HTML + Tailwind CDN + 内联 JS mock，静态可部署）。仓库根：`/Users/lqh/Documents/ChatGPT/TPM保障包/`，页面在 `prototype/` 下。已迭代至第31轮（main ea972c9 / gh-pages 99c91eb，20 套 706 项 + 冒烟 41 全绿）。

## 第31轮（现行口径）：售卖空间改为通过空间计划创建
- **创建路径重构**：售卖空间不再手动批量创建——由空间计划创建。弹窗每 fn 一行：勾选 fn + 维度复选组（`.sp-dim-check[data-fn]`，候选=dimensionOptions 全量）+「当前生效」提示。无 fn 商品单行 fn=''。
- **spacePlan schema**：新增 `fnDims:{fn:[dims]}`（维度定义）+ `fnSpaces:{fn:spaceKey}`（落地新空间 key）。confirmSpacePlan 保存时**为每个勾选 fn 总是新建一个售卖空间**（不拦截重复维度集合、不与已有空间合并）；修改时维度集合未变的 fn 沿用原空间（防每次保存增殖）、变了的重建。copySpacePlan 为副本每 fn 新建空间（不共享原空间）。
- **删除批量创建全链路**：space-new-btn / modal-space-edit / openSpaceBulkModal / addSpaceRow / confirmSpaceBulk / 去重拦截（spaceDefsKeyOf 保留但创建时不再用）。refreshEditControls 按钮数组移除 space-new-btn。售卖空间 Tab 头部仅剩时间点查询控件，空表引导走空间计划。
- **改名**：「空间切换计划」统一为「空间计划」（标题/弹窗/提示）。
- **推导层零改动**：effectiveSpaceAt/nextSpaceSwitchOfFn/currentSpaceOfFn 仍读 fnSpaces（新计划落地的新 key 照常接管）；mock defaultSpacePlans 补 fnDims 字段（双11 input→sp3，dims=[输入token区间]）。
- **测试适配**：smoke-r26 重写新交互 41 项；r15/r18/r20/r22/r23/r25/r27/r28 共 8 套创建流程断言改口径；r29 删 space-new-btn 断言（39 项）。
- 踩坑：①测试脚本 forEach 内 return 不能中断外层函数——用 dimAlert 变量传出再统一拦截；②弹窗模板 sp-fn-check 漏 onchange="onSpFnCheck(this)" 会导致勾选联动失效（页面无报错，测试才暴露）。

## 第29轮（现行口径）：空间计划交互对齐售卖计划
- **① 删 PM 提示文案 + 新增按钮统一**：售卖空间/空间计划 Tab 列表头部提示文案删除；新增按钮（`#space-new-btn` 批量创建售卖空间 / `#spaceplan-new-btn` 新建空间切换计划）统一放列表左上角，未发起变更时置灰（refreshEditControls 按钮数组纳入 spaceplan-new-btn；space-new-btn 原有）。**弹窗内表单引导文案保留**（新增商品弹窗 L696、批量创建售卖空间弹窗 L843、tooltip L1933 均不在删除范围）。
- **② 命名区分**：空间计划 Tab 表头「空间计划单元」；售卖计划 Tab 表头与 plan-detail-view「售卖计划单元」。
- **③ 空间计划 Tab 9 列无行内操作**：删操作列（原 10 列→9 列，min-w 900px）；所属空间计划链接改 `openSpacePlanDetail(planIdx)`；空表 colspan 9。
- **④ #spaceplan-detail-view 独立详情页**（插在 plan-detail-view 后）：标题+状态徽标+返回按钮；基础信息（名称/优先级/生效起止）；单元表 6 列（空间计划单元 pu-sp-{idx+1}-{fIdx}/售卖空间/Function/维度/单元数/起止），行序=Object.keys(fnSpaces) 键序；操作区：pending=修改+发布+复制 / published=停用+复制 / stopped=仅复制（**复制不套 disCls，修改/发布/停用套**）。
- **⑤ copySpacePlan**：对齐 copyPlanRow 第18轮口径——deep copy、名称+"-副本"（重名加序号）、push 为 pending_publish、三态可复制且**不受编辑锁限制**；连续复制产物为「-副本-副本」。
- **⑥ 联动与复位（踩坑修复）**：publishSpacePlan/stopSpacePlan 末尾若详情页打开则重渲；editSpacePlan 从详情页进修改先 closeSpacePlanDetail 回商品详情；showDetailView 复位 currentSpacePlanDetailIdx=-1；refreshEditControls 尾部详情页打开时重渲操作区；**backToList 开头必须调 closeSpacePlanDetail()**（否则从详情页直接返回列表视图残留——真 bug 修复）。
- **测试**：新增 r29 专项 39 项；r27 适配 2 处（10→9 列断言）+1 处（操作列断言改 openSpacePlanDetail 链接）；r28 适配 1 处（首行 9 列）。

## 第28轮（现行口径）：售卖空间时间点查询 + 空间计划单元排序
- **售卖空间 Tab 时间点查询**：`#space-tf-point`(datetime-local)+querySpaceAt/resetSpaceAt+紫色提示条 `#space-tf-tip`；与售卖单元 Tab 共享 timeFilter（syncSpaceTfPoint 挂 renderSpaceTab 尾部双向同步）；接管/预告/effectiveSpaceAt 均按查询时刻判定。
- **空间计划 Tab 排序**：stRank{published:0,pending_publish:1,stopped:2} → effStart 降序 → fn 字典序 → 空间 seq。effStart 两种格式（mock 含秒 vs pcpVal 无秒）字符串比较分钟级精度不受影响。rowspan 计算放排序后（排序键含计划级属性，同计划行必然连续）；计划级 5 列首行 rowspan=N，pu-sp-N-M 的 M=fnSpaces 键序而非行序。

## 第27轮（现行口径）：空间计划独立 Tab + 设为默认
- Tab 序：售卖空间→空间计划→售卖单元→售卖计划→定价计划→折算→SLO；`#inner-tab-spaceplan`+`#spaceplan-tbody`。
- 平铺空间计划单元：每行=fn×售卖空间×空间计划；计划级列（状态/所属空间计划/优先级/起止）rowspan 合并（planSpanMap+_firstOfPlan/_planSpan）。
- **设为生效→设为默认**（setSpaceActive 函数名不变）：fnSpaceMap 语义=无空间计划接管时的默认空间；默认行状态列加蓝色「默认」徽标；接管期仍可设默认。
- 推导层无改动：effectiveSpaceAt/nextSpaceSwitchOfFn/currentSpaceOfFn/snapshot 原样。

## 第24轮（现行口径）：售卖计划售卖单元筛选
- fn 筛选=复选组 `.plan-filter-fn-check`+全选框；**全不勾=全部**。空间筛=两态 `#plan-filter-space`（''/'__ACTIVE__' 仅生效中=effectiveSpaceAt 命中）。
- 筛选变更→超范围勾选自动取消（applyPlanUnitFilter 取消+pruned→renderPlanCreatePage 重渲幂等不递归）；toggleAllPlanUnits 只作用当前可见行；openPlanCreatePage/editPlanRow 调 planUnitsFilterReset()。

## 第26轮（历史）：空间切换计划独立实体（推翻第25轮路径B；模型沿用至今）
- **spacePlans 实体**：`{name,priority,effStart,effEnd,fnSpaces:{fn:spaceKey}}`；一条计划可指定多个 fn；三态复用 planStatusMeta；无 units/与售卖单元无关。售卖计划纯管「卖什么怎么计费」，空间是正交维度。
- **effectiveSpaceAt(fn,t)**：published 且时段命中且 fnSpaces[fn] 有值且空间存在的最高优先级者接管（source='plan'）→ 回落 currentSpaceOfFn（source='manual'）；t 省略=timeFilter.point。nextSpaceSwitchOfFn=t 后首个改变该 fn 空间的已发布计划。
- **fnSpaces 仅存在于 spacePlan schema**；planRows 无 fnSpaces（第25轮 path B 已废，仅推导框架沿用）。售卖计划创建页保留「⚠ 非生效空间」标注（比 effectiveSpaceAt）。
- 装载/快照：openDetailByCode/snapshotCurrentProduct/productDataOf 透传 spacePlans/spacePlanStatuses；startEdit/exitEdit/showDetailView 调 renderSpacePlans。mock：defaultSpacePlans 仅 glm4「双11大促·输入切换售卖空间3」（published，input→sp3）。
- 教训：第25轮我推荐路径 B 被用户试用后推翻——「研发心智模型」论据不敌「正交维度分开管」的运营直觉。

## 核心业务概念
- **预留 vTPM 资源包**：按「购买量（万 vTPM step）× 购买周期（天）」售卖，生效期=开始日0点~开始日+周期+1天。超量路由：超量限流（429）或超量路由 Serverless（二选一）。折算系数按三维度配 YAML 版本；SLO A类违约按累计违约分钟/月分档赔付。
- **关键实体链**：商品（已上架=存在≥1在售售卖单元，纯推导）→ 售卖空间（属 function，只管维度）→ fn 生效空间（默认+空间计划定时）→ 售卖单元 {id,fn,spaceKey,dim,measure} → 售卖计划（七字段组）→ 空间切换计划 → 手动交付 → 资源包 → 监控。
- 后台菜单：预留vTPM管理挂「活动运营」；商品管理挂「商品定价中心」。

## 第23轮（现行口径）：售卖空间只管维度
- spaces[key]={seq,name:'售卖空间N',fn,dims:[...]}，无 measures 字段；名称序号自增；key=sp{seq}，spaceSeq 跨 fn 连续。
- 创建校验：空间身份=fn+维度集合排序（spaceDefsKeyOf），同 fn 集合相同拦截；跨 fn 可同集合。
- currentSpaceOfFn(fn)=fnSpaceMap[fn] 显式优先→回退最早空间；defaultFnSpaceMap（glm4: input→sp2/output→sp4/cache→sp5；vtpm: ''→sp1）。
- 售卖空间 Tab 合并列表 6 列（Function rowspan/售卖空间/状态/维度/单元数/操作），排序 fn.localeCompare→seq。SU 弹窗：维度=空间 dims×度量=measureOptions 全量；pair 只增不减。
- mock：sp1('',购买量+周期)/sp2(input,两token)/sp3(input,输入token)/sp4(output,两token)/sp5(cache,输入token)；glm4 su-1/2@sp2、su-3@sp4、su-4@sp5。

## 历史轮要点（仍有效）
- 第12轮：商品与模型/Playground 解耦，基本信息三项。第13轮：列表页按单元状态平铺两 Tab；SKU 第三列点击 openDetailByCode。
- 第16/18轮计划复制：三态均可复制（深拷贝→-副本→待发布）不受锁。**第29轮 copySpacePlan 继承此口径。**
- 第19/20轮：售卖单元 Tab 15 列（fn/空间 rowspan）；售卖计划 Tab 19 列/详情表 17 列。
- 已废弃：第15~18轮商品售卖维度勾选；第20轮 defaultSpaceByFn/空间自定义名称；第21轮旧空间计划实体；第22轮空间 measures/编辑度量弹窗/fn 配置卡/setFnSpace；第25轮 path B；第27轮空间计划行内操作列（第29轮删）；第28轮前「未指定空间补尾行」（已删）。

## 页面地图（prototype/）
- index.html 官网首页 / terms.html 购买须知 / wallet.html 前台充值（packages.html 跳转壳）/ monitor.html+monitor-component.html 前台+共用监控组件 / admin-monitor.html 后台监控。
- admin-packages.html 后台预留 vTPM 管理（第14轮手动交付弹窗；只能交付在售售卖单元）。
- admin-products.html 商品管理后台（主战场，详见各轮区块）。

## 商品后台实现要点（admin-products.html）
- **五视图同级切换**：#list-view / #detail-view / #plan-detail-view / #spaceplan-detail-view（第29轮新增）/ #plan-create-view。
- 详情页 7 个 tab：售卖空间（默认）→空间计划（第27轮插入）→售卖单元→售卖计划→定价计划（占位）→折算→SLO。
- unitStatusOf：时间点取 timeFilter.point（未选=当前）；在售=生效中最高优先级计划 unitStates[uid]≠'off'。
- 计划三态：pending_publish/published/stopped（售卖计划+空间切换计划共用）。
- planRow schema：{name,priority,effStart,effEnd,units,unitStates,chargeCodes/quotaCodes/inventoryCodes,modes{7键},factor|factors,slo|slos,payloadId|payloads,minQty/maxQty/stepQty|qtys}；planFieldVal+PLAN_FIELDS 映射。
- draft 双存 planDraft{key:{unified,units{}}}；renderPlanCreateSections(skipCollect)——外部写完 draft 重渲必须传 true。**含 ${} 模板字符串用 Edit 工具改**。
- **编辑锁（第10轮）**：editLocks{code}（pro 由张三持锁）；canEdit/guardEdit/startEdit/exitEdit（start/exitEdit 均调 renderSpaceTab）；置灰容器 pointer-events-none+opacity-40；护栏在 publish/stop/editPlanRow/confirmSaleUnits/removeSaleUnit/confirmPlanCreate/setSpaceActive/confirmSpaceBulk（复制豁免）。
- 第11轮：productIsListed 推导；backToList snapshotCurrentProduct 回写；openDetailByCode 统一入口。
- 示例数据自洽：计划/状态按商品隔离；计费项前缀=商品code；折算/SLO 版本在 defaultConfigs。

## 技术约定与部署
- 每页顶部深色「原型导航」栏；后台紫色主色 #7C3AED；管理员「吕」。数据全为页面内 JS mock。
- **部署（Pages legacy 从分支部署）**：gh-pages 分支=HTML 根目录直出+.nojekyll。流程：推 main → git worktree add gh-pages → rm+cp prototype/*.html 到根 → 推送 → sleep~105s → curl 验证线上 → worktree remove。线上 URL：https://alanqh.github.io/tpm-bao/admin-products.html
- **测试（tests/，NODE_PATH=/Users/lqh/.workbuddy/binaries/node/workspace/node_modules）**：20 套全绿——plan-page(77)/this-round(31)/data-consistency(28)/r9..r13(25/32/22/30)/r14(50)/r15(38)/r16(29)/r18(28)/r19(33)/r20(78)/r22(29)/r23(34)/r24(16)/r25(47)/r27(28·r29适配)/r28(25·r29适配)/r29(39·新增)/su-dim-validate(6)；另有 smoke-r26(32)。
- **jsdom 踩坑汇总**：runScripts:'dangerously'；confirm/alert 打桩；页面顶层 const 用 window.eval 取；eval 里调用写 fn().length；rowspan 合并行按"任意 cell 匹配"取行、cells 索引偏移（无 fn 列行状态列=cells[1]）；勾选联动须 dispatchEvent(new Event('change',{bubbles:true}))；跨商品切换测试先 backToList()；筛选测试元素引用每次重渲后重查（prune 使旧引用游离）；空间计划弹窗下拉只能取该 fn 空间池 option；**jsdom 循环跑批 >150s 被 SIGKILL(137)，分批跑**；断言 beware 计划名含空间名子串（用 bg-blue-50 或 pu-sp-N-N 定位）；行数断言先想清 productSpaces() 按 fnPool 过滤（glm4 无 sp1）。
- 语法校验：node -e 提取 `<script>` 用 new Function()。修页面后先跑全套找红再逐套改断言；口径根本失效则整套重写。
- 网络偶发 502：push 失败等 1-2 分钟重试；恢复检测=curl https://github.com 状态码。
