# TPM 保障包项目长期笔记

## 项目概述
硅基流动（SiliconFlow）「预留 vTPM / 在线文本」商品管理前端原型（纯 HTML + Tailwind CDN + 内联 JS mock，静态可部署）。仓库根：`/Users/lqh/Documents/ChatGPT/TPM保障包/`，页面在 `prototype/` 下。已迭代至第28轮（main 1c0bb23 / gh-pages c632369，19 套 686 项 + smoke-r26 32 项全绿）。

## 第28轮（现行口径）：售卖空间时间点查询 + 空间计划单元纯列表排序
- **售卖空间 Tab 时间点查询**：`#space-tf-point`（datetime-local）+ querySpaceAt/resetSpaceAt + 紫色提示条 `#space-tf-tip`（"正在查看 X 时点的空间情况"）；与售卖单元 Tab **共享 timeFilter**（syncSpaceTfPoint 在 renderSpaceTab 尾部同步正反两个方向）；接管/预告/effectiveSpaceAt 均按查询时刻判定。
- **空间计划 Tab = 纯空间计划单元列表**：删除第27轮的「未指定空间补尾行」——每个单元必有所属空间计划；无计划时空表占位「暂无空间计划单元」。
- **排序**：stRank{published:0, pending_publish:1, stopped:2} → effStart 降序 → fn 字典序 → 空间 seq。同状态组内 effStart 可能为不同格式（mock '2026-11-11 00:00:00' vs pcpVal 存的 '2026-12-10 00:00' 无秒）——字符串比较仅在同格式内进行，跨格式前缀比较不受秒影响（分钟级精度足够）。
- **rowspan 与排序的兼容**：排序键含状态+effStart（计划级），同计划的行必然连续；计划级 5 列（状态/所属空间计划/优先级/起止/操作）在首行 rowspan=N，其余 5 列（pu 编号/售卖空间/Function/维度/单元数）逐行渲染——**注意首行可能是该计划 fn 排序最小的行**（如 cache），pu-sp-N-M 的 M=fnSpaces 键序而非行序。
- 测试：新增 r28 专项 25 项；r27 九条断言适配（未指定删除/行序变化/pu-sp 首行可能非 -1）。。

## 第27轮（现行口径）：空间计划独立 Tab + 设为默认语义
- **新 Tab「空间计划」**：插在售卖空间之后（Tab 序：售卖空间→空间计划→售卖单元→售卖计划→定价计划→折算→SLO）；`#inner-tab-spaceplan` + `#spaceplan-tbody`。
- **平铺空间计划单元（同构售卖计划 Tab）**：每行=计划条目（fn × 售卖空间 × 空间计划）；10 列=计划单元(pu-sp-{plan}-{fn序})/状态徽标(所属计划级,)/所属空间计划(链接开弹窗,rowspan)/售卖空间/Function/空间维度/售卖单元数/优先级(rowspan)/生效起止(rowspan)/操作(rowspan: pending=修改+发布, published=停用, stopped=—)；同一空间计划多行前8列 rowspan 合并（planSpanMap+ _firstOfPlan/_planSpan）；**未被任何计划指定的空间也列出**（计划列=—，状态=未指定徽标）。rows 构建=spacePlans 展开按序 + productSpaces 未覆盖补尾（排序 fn→seq）。
- **售卖空间 Tab**：`「设为生效」→「设为默认」`（setSpaceActive 函数名不变）；fnSpaceMap 语义=**无空间计划接管时的默认空间**；默认行（currentSpaceOfFn===k）状态列加蓝色「默认」徽标+操作列=—；接管期仍可设默认（不显示「计划接管中」占位，改动只影响计划到期后的回落目标）；状态列仍保留时间点生效态+接管标注+未来预告。
- **空间切换计划区块从售卖空间 Tab 移除**（整个卡片迁至新 Tab 顶部按钮+说明）。
- 推导层无改动：effectiveSpaceAt/nextSpaceSwitchOfFn/currentSpaceOfFn/snapshot 链路原样。
- **测试口径断言（重要踩坑）**：行数/未指定数断言前先想清 productSpaces() 的过滤——glm4 只含 sp2~sp5（sp1 是 vtpm 的、fn 不在池内被滤掉）；textContent 断言 beware 计划名含空间名子串（「双11…切换售卖空间3」使 includes('pu-sp')式匹配误命中），优先用 bg-blue-50 类名或 pu-sp-N-N 定位；jsdom 循环跑批超过 ~150s 会被 SIGKILL（137），分批跑。

## 第26轮（历史）：空间切换计划独立实体（第27轮迁入专属 Tab，实体模型不变）

## 第24轮（现行口径）：售卖计划售卖单元筛选重设计
- **fn 筛选=复选组**：`.plan-filter-fn-check`（每 fn 一个）+ `.plan-filter-fn-all` 全选框（onPlanFnFilterToggleAll 联动；子框变化同步全选框 checked）；**全不勾=全部**（非全不显）。旧单选下拉 `#plan-filter-fn` 已删。
- **空间筛=两态**：`#plan-filter-space` 只有 ''（全部空间）/'__ACTIVE__'（仅生效中）；仅生效中=currentSpaceOfFn(行fn)===行spaceKey。旧逐空间下拉选项已删。
- **筛选变更→超范围勾选自动取消**：applyPlanUnitFilter 中行不匹配且已勾选→取消勾选+pruned=true→renderPlanCreatePage() 整体重渲（幂等不递归）；恢复筛选不恢复勾选。旧「已勾选跨 fn 累积保留」语义废除。
- **toggleAllPlanUnits 只作用于当前可见行**（visible.length>0 ? visible : 全部）。
- **入口重置**：openPlanCreatePage/editPlanRow 均调 planUnitsFilterReset()（置 planUnitsFilterNeedsReset=true，renderPlanUnitsCharge 消费后丢弃旧 fn 复选/空间筛回全量）；修改页勾选回填在 renderPlanCreatePage(true) 之后写 DOM，不受重置影响。
- renderPlanUnitsCharge 保留 prevFnChecks（fn 复选状态跨重渲）；无 fn 商品不显示 fn 复选组。

## 第26轮（历史）：空间切换计划独立实体（推翻第25轮路径B；第27轮迁入专属 Tab，模型不变）
- **设计决策反转**：用户试用第25轮后反馈「还是单独用一套控制售卖空间生效的计划更好」——售卖计划应纯粹管「卖什么怎么计费」，空间是正交维度。第21轮教训再认识：问题不在「独立实体」而在当时版本带空间计划单元子实体与单元状态纠缠；本轮轻量版=单实体无 units，仲裁只用时段+优先级。
- **spacePlans 实体**：`{name,priority,effStart,effEnd,fnSpaces:{fn:spaceKey}}`；**一条计划可同时指定多个 fn**（用户确认，非单 fn）；三态 `pending_publish/published/stopped`（复用 planStatusMeta 徽标）；无 units/与售卖单元无关。
- **effectiveSpaceAt(fn,t)**：数据源=spacePlans（published 且时段命中且 fnSpaces[fn] 有值且空间存在的最高优先级者接管，source='plan'）→ 回落 currentSpaceOfFn（source='manual'）；t 省略=timeFilter.point。nextSpaceSwitchOfFn(fn,t)=t 后首个改变该 fn 空间的已发布计划。
- **UI**：售卖空间 Tab 列表下方「空间切换计划」卡片（6 列：名称/优先级/生效起止/状态/各 function 生效空间/操作；pending=修改+发布，published=停用，stopped=—；canEdit 置灰）；modal-spaceplan 弹窗（名称/优先级/时段/每 fn 一行 `.sp-fn-check` 复选+`.sp-fn-space` 下拉（勾选启用）+当前生效空间提示）；「+ 新建空间切换计划」按钮 guardEdit 保护。
- **校验**：名称必填；至少勾一个 fn（「至少为一个 function 指定目标售卖空间」）；时段默认 2026-11-11~11-20（pcpVal 转 datetime-local 格式）。
- **fnSpaces 全链路**：仅存在于 spacePlan schema；planRows 已彻底清除（第25轮的创建页选择区 .plan-fnspace-select/confirm 校验/editingFnSpaces 回填/计划详情字段全删）；**保留**售卖计划创建页单元行「⚠ 非生效空间」标注（比 effectiveSpaceAt，不依赖 fnSpaces 字段）。
- **装载/快照**：openDetailByCode 装载 defaultSpacePlans/defaultSpacePlanStatuses+快照恢复；confirmProduct 置空；snapshotCurrentProduct/productDataOf 透传 spacePlans/spacePlanStatuses；startEdit/exitEdit/showDetailView 均调 renderSpacePlans()。
- **mock**：defaultSpacePlans 仅 glm4 一份「双11大促·输入切换售卖空间3」（published，input→sp3，priority 500，11-11~11-20）；glm4 售卖计划改为无 fnSpaces 版（双11 input 售卖计划 500 + 常规售卖）——单元在售状态与第25轮一致（r13 数字不变）。
- **测试**：r25 套件重写为独立实体口径 47 项；r20 两断言翻转（spaceplan/modal 元素从「已移除」改「存在」）；新增 tests/smoke-r26.js（32 项冒烟，可留作回归）；全套 18 套 633 项全绿。

## 第25轮（已被第26轮推翻，仅推导函数沿用）
- **path B 已废**：planRow.fnSpaces 字段、创建页 fn 空间选择区（.plan-fnspace-select）、保存 confirm 校验、editingFnSpaces 回填、计划详情「生效售卖空间」字段——全部在第26轮删除。
- **沿用的产物**：effectiveSpaceAt/nextSpaceSwitchOfFn 推导框架、renderSpaceTab 可视化（接管标注/未来预告/时间旅行）、SU 弹窗默认空间挂 effectiveSpaceAt、「仅生效中」筛选语义（第25轮起改为 effectiveSpaceAt 命中）、glm4.30d/60d 计费项。
- 教训：我推荐路径 B 被用户试用后推翻——「研发心智模型」论据不敌「正交维度分开管」的运营直觉。

## 核心业务概念
- **预留 vTPM 资源包**：按「购买量（万 vTPM step）× 购买周期（天）」售卖，生效期=开始日0点 ~ 开始日+周期+1天。超量路由：超量限流（429）或超量路由 Serverless（交付二选一）。折算系数按三维度（输入长度×cache命中率×输出长度）配 YAML 版本；SLO A类违约按累计违约分钟/月分档赔付。
- **关键实体链**：商品（SKU；状态纯推导第11轮：已上架=存在≥1在售售卖单元）→ 售卖空间（属 function，**只管维度**）→ fn 生效空间（currentSpaceOfFn 手动 + effectiveSpaceAt 空间切换计划定时）→ 售卖单元（{id,fn,spaceKey,dim,measure}）→ 售卖计划（七字段组 unified/perUnit）→ 空间切换计划（独立实体，定时切换 fn 空间）→ 手动交付 → 资源包（P001…）→ 监控。创建商品 → 批量创建售卖空间（勾维度）→ 行内「设为生效」/空间切换计划定时切换 → 创建售卖单元（弹窗勾度量）→ 售卖计划。
- 后台菜单：预留vTPM管理挂「活动运营」；商品管理挂「商品定价中心」。

## 第23轮（现行口径）：售卖空间只管维度 + 合并列表
- **空间模型极简**：spaces[key]={seq,name:'售卖空间N',fn,dims:[...]}——**无 measures 字段**（第22轮的维度:度量列/编辑度量弹窗全部删除）；名称序号自增不可自定义；key=sp{seq}，spaceSeq 跨 fn 连续计数器。
- **创建校验**（不变）：空间身份=fn+维度集合排序（spaceDefsKeyOf）；同 fn 维度集合相同→拦截提交（alert 指明已有空间名）；弹窗内多行互相重复拦截；跨 fn 可同维度集合；空维度行拦截。批量创建弹窗=多行 .space-row（fn 下拉+维度复选，**无度量展开**）。
- **fn 生效空间**：currentSpaceOfFn(fn)=fnSpaceMap[fn] 显式配置优先 → 回退该 fn 最早空间（seq 升序）；defaultFnSpaceMap{code:{fn:spk}}（glm4: input→sp2/output→sp4/cache→sp5；vtpm: ''→sp1）。
- **setSpaceActive(spk)**（替代 setFnSpace，setFnSpace 已删）：行内按钮（第27轮起=「设为默认」），guardEdit 保护；写入 fnSpaceMap[f]=spk 后重渲 renderSpaceTab+renderSaleUnits；生效行操作列=—，未生效行=设为生效（未持锁显 🔒）。
- **售卖空间 Tab 单一合并列表**（fn 配置卡已删）：6 列=Function（fn 字典序分组 rowspan 合并，'' 显示 —）/售卖空间/状态（生效中绿/未生效灰，isEff=effMap[fn]===k）/空间维度（dims 用 + 连接）/售卖单元数/操作。排序：fn.localeCompare → seq 升序（故 cache 在 input 前、'' 在最后）。
- **SU 弹窗**：fn→空间（候选=fn 归属∪已引用兜底，默认=currentSpaceOfFn）→维度（=空间 dims）×**度量（=measureOptions 全量，非空间配置）**；pair 级只增不减（confirmedPairs 置灰）；confirmSaleUnits 笛卡尔积保留原 id。
- **锁状态联动**：startEdit/exitEdit 均需调 renderSpaceTab（第23轮修复 bug——操作列按钮随 canEdit 动态变化，否则持锁后仍显 🔒）。
- **新增商品弹窗**：无售卖维度区块；提示「创建商品后请先…批量创建售卖空间，再为各 function 配置当前售卖空间」。
- mock：sp1('',购买量+周期)/sp2(input,两token)/sp3(input,输入token)/sp4(output,两token)/sp5(cache,输入token)；glm4 su-1/2@sp2、su-3@sp4、su-4@sp5；vtpm→sp1。snapshot 链路透传 {spaces,spaceSeq,fnSpaceMap}。

## 历史轮要点（仍有效）
- **第12轮**：商品与模型/Playground 解耦；基本信息=类型/code/名称三项。
- **第13轮列表页**：按单元状态平铺（已上架 Tab=在售单元、未上架 Tab=禁售单元，同一商品可两 Tab 分裂）；14 列无操作列，SKU 第三列点击 openDetailByCode；列表页第 4 列=Function。
- **第16/18轮计划复制**：三状态均显示「复制」（深拷贝→名称-副本→待发布）；不受状态/编辑锁限制；修改/发布/停用仍受锁。
- **第19/20轮**：fnOfUnit 直接读 u.fn；formatDimMeasure 过滤 function 维度；售卖单元 Tab 15 列（前三列=function rowspan/售卖空间 rowspan/售卖单元，排序 fn→spaceKey→id）；售卖计划 Tab 19 列/计划详情表 17 列；售卖计划区块2 筛选式（plan-filter-fn/space 只隐藏未勾选行，已勾选跨 fn 累积）。
- **第22轮**：删空间计划全套（spacePlans/modal-spaceplan/effSpaceOfFn 等）；空间身份校验/弹窗多行互斥拦截/currentSpaceOfFn 显式优先回退最早/snapshot 透传均在该轮奠定（第23轮沿用）。
- **第20轮旧版区块2筛选**（fn 单选下拉+逐空间下拉+已勾选跨 fn 累积）已被第24轮替换。
- 早期已废弃：第15~18轮商品售卖维度勾选（productDimSpecs/dims 字段）；第20轮 defaultSpaceByFn/空间自定义名称；第21轮 空间计划/空间计划单元/effSpaceOfFn；**第22轮空间 measures 字段/编辑度量弹窗/fn 配置卡/setFnSpace（第23轮删除）**。

## 页面地图（prototype/）
- index.html 官网首页 / terms.html 购买须知 / wallet.html 前台充值（packages.html 跳转壳）/ monitor.html + monitor-component.html 前台+共用监控组件（iframe，mode=admin）/ admin-monitor.html 后台监控。
- admin-packages.html 后台预留 vTPM 管理：第14轮手动交付弹窗——subject_id 手动填写；SKU 只列已上架商品；只能交付在售售卖单元（confirmGrant 拦截）；价格=单价×数量。chargeItems/configVersions/payloadModelMap 为 admin-products 镜像数据。
- admin-products.html 见上。

## 商品后台实现要点（admin-products.html）
- **四视图同级切换**：#list-view / #detail-view / #plan-detail-view / #plan-create-view（计划创建/修改独立页面）。
- 详情页 6 个 tab 顺序：**售卖空间（第一个，默认打开；合并列表）**→ 售卖单元 → 售卖计划 → 定价计划（占位）→ vTPM 折算系数配置 → SLO 赔付规则配置。
- **unitStatusOf**：时间点取 timeFilter.point（未选=当前）；在售=生效中（published 且 effStart≤now≤effEnd）最高优先级计划 unitStates[uid]≠'off'。mock effStart 已提前至 2026-10-01。
- 计划状态三态：pending_publish 待发布 / published 已发布 / stopped 已停用（售卖计划+空间切换计划共用）。
- 售卖计划 schema（planRow）：{name,priority,effStart,effEnd,units,unitStates,chargeCodes/quotaCodes/inventoryCodes,modes{7键},factor|factors,slo|slos,payloadId|payloads,minQty/maxQty/stepQty|qtys}。planFieldVal(r,uid,field)+PLAN_FIELDS 映射。
- **draft 双存**：planDraft{key:{unified,units{}}}；renderPlanCreateSections(skipCollect)——外部写完 draft 重渲必须传 true（第6轮教训）。**含 ${} 模板字符串用 Edit 工具改**（Python 整段替换易失配）。
- 三池：chargeItems（price/unit/currency）+ quotaItems/inventoryItems（qty）；计费项按商品前缀过滤。
- **编辑锁（第10轮）**：editLocks{code}（pro 由张三持锁）；canEdit/guardEdit/startEdit/exitEdit（**start/exitEdit 均调 renderSpaceTab**）；置灰容器 pointer-events-none+opacity-40；护栏在 publish/stop/editPlanRow/confirmSaleUnits/removeSaleUnit/confirmPlanCreate/setSpaceActive/confirmSpaceBulk（复制豁免）。
- **第11轮**：productIsListed 推导；backToList snapshotCurrentProduct 回写；openDetailByCode 统一入口。
- 新增商品弹窗：类型→模型→code/名称自动生成可改；online-text 默认名「模型名 在线文本包」。
- **示例数据自洽**：计划/状态按商品隔离；计费项前缀=商品code；payload 属该商品 playground；折算/SLO 版本在 defaultConfigs。

## 技术约定与部署
- 每页顶部深色「原型导航」栏；后台紫色主色 #7C3AED；管理员「吕」。数据全为页面内 JS mock。
- **部署（Pages legacy 从分支部署，不用 Actions）**：gh-pages 分支=HTML 根目录直出 + .nojekyll（绝不镜像 prototype/ 结构）。流程：推 main → git worktree add gh-pages → 拷 prototype/*.html 到根 → 推送 → sleep~105s → curl 验证线上 → worktree remove。
- **测试（tests/，NODE_PATH=/Users/lqh/.workbuddy/binaries/node/workspace/node_modules）**：19 套 661 项全绿——plan-page(77)/this-round(31)/data-consistency(28)/r9(25)/r10(32)/r11(22)/r13(30)/r14(50)/r15(38)/r16(29)/r18(28)/r19(33)/r20(78)/r22(29)/r23(34)/r24(16)/r25(47·r26口径)/r27(28·新增)/su-dim-validate(6)；另有 smoke-r26.js(32) 冒烟。jsdom runScripts:'dangerously'；window.confirm/alert 打桩；页面顶层 const 不挂 window 用 window.eval 取；eval 里函数调用写 fn().length 非 fn.length；详情页售卖单元行因 rowspan 合并须按"任意 cell 匹配"取行；勾选联动须 dispatchEvent(new window.Event('change',{bubbles:true})) 而非只改 checked；**合并列表行内 rowspan 导致 cells 索引偏移**（无 fn 列的行状态列=cells[1]）；**跨商品切换测试必须先 backToList()**（否则 snapshot 不触发、编辑丢失）；**筛选交互测试的元素引用必须在每次 applyPlanUnitFilter/renderPlanCreatePage 后重新查询**（prune 重渲使旧引用游离）；**空间切换计划弹窗下拉只能取该 fn 空间池内的 option**（给 output 设 sp2 会静默失败——jsdom 不校验但 value 不落库）；sp-eff-start 回填值经 pcpVal 转 datetime-local 格式（'T' 分隔）。
- 语法校验：node -e 提取 `<script>` 用 new Function()。
- 修页面后测试同步：先跑全套找红，逐套按新口径改断言；口径根本性失效时整套重写（r22/r23 即重写 r20/r15/r22）。
- 网络偶发 502（代理 CONNECT tunnel failed）：push 失败等 1-2 分钟重试即可恢复；恢复检测=轮询 `curl https://github.com` 状态码 200。
