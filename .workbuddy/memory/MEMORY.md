# TPM 保障包项目长期笔记

## 项目概述
硅基流动（SiliconFlow）「预留 vTPM / 在线文本」商品管理前端原型（纯 HTML + Tailwind CDN + 内联 JS mock，静态可部署）。仓库根：`/Users/lqh/Documents/ChatGPT/TPM保障包/`，页面在 `prototype/` 下。已迭代至第20轮（main e57dad5 / gh-pages 0f06f5c，全套 14 套 475 项测试全绿）。

## 核心业务概念
- **预留 vTPM 资源包**：按「购买量（万 vTPM step）× 购买周期（天）」售卖，生效期=开始日0点 ~ 开始日+周期+1天。超量路由：超量限流（429）或超量路由 Serverless（交付二选一）。折算系数按三维度（输入长度×cache命中率×输出长度）配 YAML 版本；SLO A类违约按累计违约分钟/月分档赔付。
- **关键实体链**：商品（SKU；**状态纯推导第11轮**：已上架=存在≥1在售售卖单元，不存字段）→ 售卖单元（维度笛卡尔积，dim/measure 用 ' + ' 拼接）→ 售卖计划（七字段组：计费/配额/库存/折算/SLO/payload/购买量，每组 unified/perUnit）→ 手动交付 → 资源包（P001…）→ 监控。
- 后台菜单：预留vTPM管理挂「活动运营」；商品管理挂「商品定价中心」。

## 第20轮（已完成）：function 升格售卖主体 + 售卖空间/空间计划
- **function 不是维度而是「按什么卖」**：dimensionOptions/productDimSpecs 剔除 function（measureOptions 保留 function: input/output/cache 候选）；fnPool() 按类型 hasFn 给候选；商品维度复选区无 function（hasFn 类型显示提示文案）。
- **售卖空间**：维度集合相同=同一空间（spaceDefsKeyOf 维度+度量均排序拼接去重）；defaultSpaces 全局池（sp-a=vtpm 标准空间A、sp-txt-std/sp-txt-lite=文本空间）；productSpaces()=类型兼容空间+已引用空间兜底。
- **售卖单元模型**：{id, fn, spaceKey, dim, measure}；fnOfUnit 直接读 u.fn（旧数据兼容拆 dim）；售卖单元 Tab **15 列**，前三列=function（rowspan）/售卖空间（rowspan）/售卖单元，排序 fn→spaceKey→id；vtpm 显示 —。
- **售卖空间 Tab（详情页第6个）**：空间管理（每 fn 卡：当前生效空间+默认空间+set 按钮；空间卡片=名称+维度:度量+单元数）+ 空间计划列表（8 列：spu-N-fn/状态/类型(生效中/未生效)/所属空间计划/Function/售卖空间/优先级/生效起止）。
- **effSpaceOfFn(fn)**：生效中已发布空间计划最高优先级 → 无则回退 defaultSpaceByFn；空间计划三态复用 planStatusMeta。
- **空间编辑弹窗**（#modal-space-edit）：名称+维度×度量勾选+指定 fn 默认空间（confirmSpaceEdit 去重拦截）；**空间计划弹窗**（#modal-spaceplan）：名称/优先级/生效起止+每 fn 目标空间（spu-fn-enable/spu-fn-space）；setDefaultSpaceOfFn 复用 spaceplan 弹窗。
- **创建售卖单元弹窗改版**：无 fn 商品=旧版直选维度（confirmedPairs 置灰只增不减）；含 fn 商品=先选 function→选售卖空间（默认 effSpaceOfFn）→按空间 dimsObj 勾度量；同 fn+空间已创建整组置灰+重复拦截；写回=替换该组并合并。
- **售卖计划区块2 筛选式**：plan-filter-fn/plan-filter-space 下拉只隐藏未勾选行（.plan-unit-row data-fn/data-space），已勾选行跨 function 累积始终展示；保存逻辑零改动；行内加售卖空间信息。
- **售卖计划 Tab 19 列 / 计划详情表 17 列**（售卖单元后加售卖空间列）。
- mock 新增第4商品 **maas-online-text-glm4**（input/output→sp-txt-std、cache→sp-txt-lite，无售卖计划=未上架）；defaultDefaultSpaceByFn/defaultSpacePlans/defaultSpacePlanStatuses 按商品 code；snapshot/productDataOf/computeUnitRowsOf 均透传 spaces/defaultSpaceByFn/spacePlans/spacePlanStatuses。
- 测试：test-this-round-r20.js（47 项）；全套 14 套 475 项全绿。

## 现行功能口径（admin-products.html，截至第20轮）
- **第12轮**：商品与模型/Playground 解耦——模型仅用于自动生成默认 code/名称；payload 下拉展示全量候选池（6项，选项标注来源模型）；基本信息=类型/code/名称三项。
- **第13轮列表页**：商品列表不展示商品行，按单元状态平铺——已上架 Tab 只放「在售」单元、未上架 Tab 只放「禁售」单元（同一商品可两 Tab 分裂）。14 列（无操作列），SKU 第三列点击 openDetailByCode；排序=SKU 字典序+单元ID。mock：pro 仅 su-1 在售（su-2/3/4 禁售）、pre 全禁售。
- **第15~18轮售卖维度**：由商品类型决定——productDimSpecs：maas-product-vtpm={购买量区间,购买周期}（hasFn=false）；**maas-online-text={输入token区间,输出token区间}**（hasFn=true，第20轮 function 移出维度表）；维度/度量按类型扩容；提交至少勾1个；不勾选=没有该维度（创建售卖单元弹窗空态+拦截）；详情基本信息第4字段=售卖维度。
- **第16/18轮计划复制**：三状态均显示「复制」（深拷贝→名称-副本（重名追加 -副本2/3）→待发布）；**不受状态/编辑锁限制**（copyPlanRow 无 guardEdit，按钮在置灰容器外）；修改/发布/停用仍受锁。
- **第19轮 function 列 → 第20轮 fn 字段**：fnOfUnit 直接读 u.fn（无则兼容旧 dim 拆分）；formatDimMeasure 过滤 function 维度；列表页第 4 列=Function。

## 页面地图（prototype/）
- index.html 官网首页 / terms.html 购买须知 / wallet.html 前台充值（packages.html 跳转壳）/ monitor.html + monitor-component.html 前台+共用监控组件（iframe，mode=admin）/ admin-monitor.html 后台监控。
- admin-packages.html 后台预留 vTPM 管理：**第14轮手动交付弹窗**——subject_id 手动填写；Pool 展示超量路由徽标（可多个，quick-create 选路由单选）；SKU 只列已上架商品（std/pro，pre 不出现）；**只能交付在售售卖单元**（std 全 on；pro 仅 su-1；pre 全 off）——confirmGrant unit.status 拦截；售卖参数卡单价=选中周期计费项刊例价、payload_id 标模型、折算/SLO 版本预览按商品 code 取 configVersions 最新版；购买量下拉=单元 min/max/step（无周期下拉，周期随单元）；价格=单价×数量。P002=pro su-1（0.0062/30天）。chargeItems/configVersions/payloadModelMap 为 admin-products 镜像数据。
- admin-products.html 见上「现行功能口径」+「商品后台实现」。

## 商品后台实现要点（admin-products.html）
- **四视图同级切换**：#list-view（列表）/ #detail-view（详情）/ #plan-detail-view（计划详情）/ #plan-create-view（计划创建/修改，独立页面）。
- 详情页 5 个 tab（#plan-tabs-card）：售卖单元 / 售卖计划（计划单元列表）/ 定价计划（占位）/ vTPM 折算系数配置 / SLO 赔付规则配置。
- 售卖单元 Tab 14 列：售卖单元/状态（两态在售/禁售）/Function/维度:度量/关联计费项+复制/刊例价/执行价/折算/SLO/payload/最小/最大/step/操作；禁售行计费项等显 —。
- **unitStatusOf（第8/9轮）**：时间点取 timeFilter.point（未选=当前）；在售=生效中（published 且 effStart≤now≤effEnd）最高优先级计划 unitStates[uid]≠'off'。mock effStart 已提前至 2026-10-01。
- 计划状态三态：pending_publish 待发布 / published 已发布（文案）/ stopped 已停用；是否生效由 effStart/effEnd 决定不与状态耦合。
- 售卖计划 schema（planRow）：{name,priority,effStart,effEnd,units,unitStates{uid:on/off},chargeCodes/quotaCodes/inventoryCodes{uid:code},modes{7键:unified|perUnit},factor|factors,slo|slos,payloadId|payloads,minQty/maxQty/stepQty|qtys{uid:{min,max,step}}}。planFieldVal(r,uid,field)+PLAN_FIELDS 映射。
- **draft 双存**：planDraft{key:{unified,units{}}}；collectDraftFromDOM 收 DOM；renderPlanCreateSections(skipCollect)——外部写完 draft 重渲必须传 true（第6轮教训）。**含 ${} 模板字符串用 Edit 工具改**（Python 整段替换易失配）。
- 三池：chargeItems（price/unit/currency）+ quotaItems/inventoryItems（qty）；计费项按商品前缀过滤；配额/库存可去创建（code 后缀 NNd）。
- 创建售卖单元弹窗 #modal-su-confirm：按 productDims() 渲染度量复选（已勾 checked+disabled 只增不减）；confirmSaleUnits 笛卡尔积保留 id。
- **编辑锁（第10轮）**：editLocks{code: null|{holder,passport,since}}（pro 由张三持锁）；canEdit/guardEdit/startEdit/exitEdit/renderEditLockBar；置灰容器 div.pointer-events-none+opacity-40；护栏在 publish/stop/editPlanRow/confirmSaleUnits/removeSaleUnit/confirmPlanCreate（复制豁免）。
- **第11轮**：productIsListed 推导；refreshProductBadge 实时刷新；backToList snapshotCurrentProduct 回写 planRowsSnapshot；openDetailByCode 统一入口。
- 新增商品弹窗：类型→模型→code/名称自动生成可改；online-text 默认名「模型名 在线文本包」。
- **示例数据自洽**：计划/状态按商品隔离；计费项前缀=商品code；库存 inv-vtpm-NNd、配额 quota-vtpm-NNd；payload 属该商品 playground；折算/SLO 版本在 defaultConfigs。

## 技术约定与部署
- 每页顶部深色「原型导航」栏；后台紫色主色 #7C3AED；管理员「吕」。数据全为页面内 JS mock。
- **部署（Pages legacy 从分支部署，不用 Actions）**：gh-pages 分支=**HTML 根目录直出 + .nojekyll**（绝不镜像 prototype/ 结构）。流程：推 main → git worktree add gh-pages → 拷 prototype/*.html 到根（保留 .nojekyll）→ 推送 → sleep~105s → curl 验证线上 → worktree remove。
- **测试（tests/，NODE_PATH=/Users/lqh/.workbuddy/binaries/node/workspace/node_modules，node 22.22.2）**：14 套 475 项全绿——plan-page(77)/this-round(31)/data-consistency(28)/r9(25)/r10(32)/r11(22)/r13(30)/r14(50)/r15(27)/r16(29)/r18(31)/r19(33)/r20(47)/su-dim-validate(6)。jsdom runScripts:'dangerously'；window.confirm/alert 打桩；页面顶层 const 不挂 window 用 window.eval 取；eval 里函数调用写 fn().length 非 fn.length（arity）；详情页售卖单元行因 rowspan 合并须按"任意 cell 匹配"取行。
- 语法校验：node -e 提取 `<script>` 用 new Function()。
