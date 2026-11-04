# TPM 保障包项目长期笔记

## 项目概述
硅基流动（SiliconFlow）「预留 vTPM / 在线文本」商品管理前端原型（纯 HTML + Tailwind CDN + 内联 JS mock，静态可部署）。仓库根：`/Users/lqh/Documents/ChatGPT/TPM保障包/`，页面在 `prototype/` 下。已迭代至第47轮（main 8535df1 / gh-pages 6c01f54，26 套 976 项全绿）。

## 第47轮（现行）：创建售卖空间弹窗改回嵌套式 + 维度按商品类型过滤
- **背景**：第44轮「三 fn 共享一份勾选」会叉乘出大量跨 fn 重复的无用单元。用户要求改回嵌套式（先选 function，再给每个 function 单独选维度度量），并指出弹窗维度候选未按商品类型过滤的 bug。
- **嵌套式弹窗**：区块1 fn 复选 `.sp-fn-check`（onchange=renderSpFnCards 联动）；区块2 #sp-dimmeas 渲染每勾选 fn 的独立卡片 `[data-fncard=f]`，卡片内 `.sp-measure-check` 带 **data-fn**（选择器 `.sp-measure-check[data-fn="X"][data-dim=...][value=...]`）。未勾 fn 显「先勾选 function」提示；不选维度=0维 fn 合法。
- **勾选暂存 spMeasDraft**（fn→dim→[measure]）：renderSpFnCards 每次重渲前 snapshotSpMeasDraft 暂存在场勾选——取消 fn（卡片消失 DOM 状态丢）再勾回可恢复；openSpacePlanModal 创建模式清空暂存（防上一空间残留，真 bug 被测试抓出）；编辑模式以 space.fnMeasures 覆盖暂存。
- **维度候选按类型过滤**：renderSpFnCards 用 `productDimSpecs[currentProduct.type].dims`（vtpm=购买量区间/购买周期；online-text=输入区间/费用发生日/费用发生时间），不再用全量 dimensionOptions。旧测试用错维度（如 glm4 勾购买量区间）现选择器为 null。
- **confirmSpacePlan per-fn 收集**：`document.querySelectorAll('.sp-measure-check[data-fn="f"]:checked')` 逐 fn 收集 → fnDims[f]=Object.keys(meas)、fnMeasures[f]=meas 各自独立。
- **glm4 mock 重算（per-fn 差异化，用 jsdom 实调 genSaleUnitsForSpace 生成权威序列）**：sp1 input=三维各1度量(8组合 su-1~8)/output=输入区间1度量(2组合 su-9~10)/cache=0维(su-11) 共 11；sp2 input 输入三档=su-12(全缺省)/su-13(0～128K)/su-14(128K～1M)/su-15(1M+)。defaultPlans：双11计划 units=su-12~15，常规计划 units=su-1~11（全 on）。
- **新序列注意**：SU Tab 首行=全缺省段 cache/su-11（fn 字典序 cache<input<output）；sp1 空间列 rowspan=11；末行=输入区间 su-8/su-10 两行（组合「输入区间:128K～1M」rowspan=2 跨 input/output）。
- **测试**：新增 test-this-round-r47.js（46 项：①嵌套结构 ②类型过滤 ③per-fn 差异收集 ④编辑 per-fn 回填 ⑤mock 自洽 ⑥数量视图）；适配 13 套（r12 结构反转+选择器加 data-fn、r15 勾 fn 后断言、r18 glm4 维度换成输入区间+per-fn 计数、r20 八处、r22 sp6 per-fn、r24 units su-12~15、r13 31→18 行/32→19、r27 sp3 per-fn 勾选、r28/r29/su-25→su-12、r38 六处 24→11、smoke 24→11、r45 ②段重写 per-fn）。mock 自洽算法（r45/r47 末段）按 fnDims/fnMeasures 逐 fn 重算，天然兼容 per-fn。
- 踩坑：jsdom 勾 fn 后卡片才存在——测试须先 check+dispatchEvent(change) 再查 .sp-measure-check；Edit 工具改长行可能吞字符（r45 反引号丢失致 SyntaxError，用 node -e "new Function 读文件" 定位）。

## 第46轮（现行，编号已被第47轮取代）：示例数据维度体系改造
- **维度定义**：measureOptions={'购买量区间':[1～100,100～500,500+], '购买周期':[30/60/90天], 'function':[input,output,cache], '输入区间':[0～128K,128K～1M,1M+], '费用发生日':[周一至周五,周末], '费用发生时间':[2点～8点,其他时间段]}；productDimSpecs：vtpm={购买量区间,购买周期,hasFn:false}，online-text={输入区间,费用发生日,费用发生时间,hasFn:true}。**旧维度「输入token区间/输出token区间」已全站删除**。
- **mock 自洽纪律**：单元必须严格=「勾选集合∪缺省完整叉乘」——多造/漏造组合都会被 r45/r47 末段自洽复检抓住。
- glm4 具体单元编号已被第47轮重算取代（见上条目）。
- 文本批量替换技巧：测试文件用 `/usr/bin/sed -i '' -e 's/旧/新/g'`（-e 多表达式）；zsh 无 timeout 命令。

## 第45轮（现行）：空fn必选+待发布空间可编辑+计划选已发布空间+创建项即时入下拉+单元信息精简
- **①空fn必选**：无 fn 商品（vtpm 类）弹窗渲染「—（无 function）」复选（fnPool 空→[''] 渲染），勾选校验至少一个 fn。
- **②待发布空间可编辑（editSpacePlan 恢复）**：仅 pending_publish 可编辑；详情页操作区 pending=修改+发布+复制 / published=停用+复制 / stopped=仅复制。openSpacePlanModal(k) 编辑模式（editingSpaceKey；标题「修改售卖空间：名称」；回填名称/优先级/档期/fn 勾选（fnDims 键）/度量勾选（第47轮起 per-fn 按 fnMeasures[f] 回填））。confirmSpacePlan：editingSpaceKey 命中→Object.assign 原地更新；否则新建。差异叉乘走 genSaleUnitsForSpace 幂等（原单元永不删除）。已发布/停用调用拦截「仅待发布状态的空间可编辑」。
- **③计划只选已发布空间**：openPlanCreatePage/editPlanRow 空间下拉候选=published；editPlanRow 原空间已停用时保底附加。pre 演示空间 sp1 改 status:'published'。
- **④创建项即时入下拉（既有行为，测试固化）**：confirmCreateBilling/confirmItemCreate/confirmConfigEdit 末尾都 collectDraftFromDOM→写 draft→renderPlanCreateSections(true)。
- **⑤计划创建页单元行信息**：Function+维度组合，删「售卖空间」行。
- 踩坑：r38 测试第 6 段 sp3 发布后须 stopSpacePlan("sp3") 清理，否则第 7 段断言打红；DOMException{} 与 window.eval 顶层异常会被 runScripts 吞——VirtualConsole('jsdomError') 定位。

## 第43轮（现行）：两步创建+缺省完整叉乘+单元三态+计划空间筛选
- **两步创建**：①勾 fn（.sp-fn-check）②每维度直勾度量（**.sp-dim-check 维度复选已删**）；不勾 fn 拦截；未勾度量可保存（生成全缺省组合）。
- **缺省完整叉乘（genSaleUnitsForSpace）**：每维度候选=勾选度量∪{缺省空对}，笛卡尔积全组合（含全缺省）；如 input 勾输入{0～128K}+输出{0～4K,16K+}→(1+1)×(2+1)=6；每组合×每勾选 fn 各一单元；组合排序 comboKey 字典序，组合内 fnDims 键序（fnPool DOM 序）→id。
- **售卖单元三态（unitStatusOf）**：空间未生效/最高优先级计划 off→禁售红；无生效中计划覆盖→未配置灰（unconf:true）；否则在售绿。列表 Tab 在售/禁售=直查（灰计入禁售 Tab）。mock：std su-7 off 演禁售、su-8 演未配置；glm4 常规计划覆盖 sp1 全 12 单元演在售。
- **售卖计划 Tab 空间筛选**：#plan-filter-space（onchange=onPlanSpaceFilter）；planSpaceFilter=null 表示未初始化；syncPlanSpaceFilterOptions 首次定位 effectiveSpaceAtAll(当前时刻)；showDetailView 进入商品重置 null。默认 glm4 只显 sp1 计划。
- **SU Tab 列序**：售卖空间/维度:度量/Function/售卖单元/状态…共 14 列；排序 spaceKey→comboKey→fn→id；spSpan>cbSpan>fnSpan 三层 rowspan；全缺省组合 comboKey='' 排最前。
- **空间详情页清单排序**：comboKey 字典序→fnDims 键序→id。
- 踩坑：jsdom switchInnerTab 不重渲表格——timeFilter 变后须显式 renderSaleUnits()；confirmSpacePlan 成功后弹窗关闭，再来一轮须重新 openSpacePlanModal()。

## 第41/42轮（现行）：SU Tab 时间即时刷新 + 任何时刻只显唯一生效空间
- 第41轮：#tf-point 加 onchange=onSaleTimeChange——有值→timeFilter={point}，清空→null（默认当前）。查询/重置按钮已删；timeFilter 消费方零改动。
- 第42轮：renderSaleUnits 无条件 `at = timeFilter.point || 当前时间` → effectiveSpaceAtAll(at) 过滤；无生效空间→空态。glm4 默认只显 sp1 单元；11-15 只显 sp2 单元。

## 第40轮（现行）：空间列表 8 列 + 空间详情页 + effectiveSpaceAtAll
- **售卖空间列表 8 列**：售卖空间/状态/空间名称/Function/空间维度/售卖单元数/优先级/生效起止（pu-sp-N-M 界面清零）；空表 colspan=8。列表排序：状态→优先级降序→创建时间逆序（seq 降序）；空间内 fn 行=fnDims 键序。
- **空间详情页**：基本信息（code/名称/优先级/生效起止）+售卖单元清单（3 列：售卖单元/Function/维度:度量）。
- **effectiveSpaceAtAll(t)**：候选=published 且档期内全部空间，排序 priority 降序→seq 降序；与 effectiveSpaceAt(fn,t)（按 fn 仲裁）语义不同，SU Tab 时刻过滤用前者。
- 测试索引左移：原 cells[N]（N≥1）左移一位。

## 第38~39轮（现行核心模型）：空间聚合根 + 计划锁定空间
- **空间聚合根**：`spaces[k] = { seq, name, priority, effStart, effEnd, status(待发布|已发布|已停用), fnDims, fnMeasures }`——空间本体携带档期/优先级/三态/多 fn 配置；独立 spacePlans 实体全删（第39轮售卖空间 Tab 时间点查询 space-tf-* 也删）。详情页 6 tab：售卖空间（默认）→售卖单元→售卖计划→定价计划（占位）→折算→SLO。
- **售卖计划锁定空间**：planRows[i].spaceKey 唯一；创建页 #plan-space-sel（非 plan-space-select）必选；confirmPlanCreate 三重校验（必选空间/units 属该空间/时间 ⊆ 空间档期）；切换空间重置勾选。
- **空间完全不可改**：任何变更=copySpacePlan 复制待发布新空间（不受锁，深拷贝继承配置+seq 自增+逐 fn 叉乘新单元，原空间单元永不删除）；停用拦截=空间内有生效中售卖计划（activePlansInSpace）。
- **仲裁**：effectiveSpaceAt(fn,t) = fnDims 含 fn ∧ published ∧ 档期内 → priority 降序→seq 降序；返回 {key, source, plan}。
- **名称快编**：contenteditable 就地编辑（Enter 保存/Esc 取消/blur 延迟保存）；confirm 必须写回 currentProduct + allProducts（否则重进被 mock 覆盖）。#edit-lock-bar 位于基本信息卡片之后、Tab 卡片之前。
- 真 bug 教训：openPlanCreatePage 创建模式末尾必须 resetPlanDraft()+renderPlanCreateSections(true)（否则区块3 select null）；productIsListed 须同步切换 spaces；mock 计划 effEnd 须 ⊆ 空间档期。
- 踩坑：rowspan 续行 cells 不含空间级列；测试造的空间/计划结尾清理（delete+游标复位）；单引号消息嵌 fn='' 断字符串。

## 第36/37轮（现行）：文案清理 + SU 叉乘生成 + 编辑锁移位
- 解释性文案清理（副标题 p、括注、弹窗提示、title 悬停、下拉括注全删）；保留信息性内容（mock 业务名括号、—、--）。
- 第37轮：售卖单元由空间确认时叉乘自动生成（genSaleUnitsForSpace），SU 手动创建/删除链路全删，SU Tab 纯只读 14 列；refreshEditControls 只管 plan-create-btn/spaceplan-new-btn。
- 商品名/基本信息名快编不依赖编辑锁；#detail-info-name+铅笔，支持 source('title'/'info')。

## 第33/35轮（现行）：0 维空间 + code 标识 + 在售/禁售 Tab
- 0 维度空间合法（fnDims[f]=[]，只能有一个售卖单元）；空 fn 拦截「至少勾选一个 function」；空 dims 展示 `--`。
- 空间 key（sp{N}）即唯一标识（第38轮起 schema 已含 name，展示仍以 code 为主）。
- 列表 Tab=在售/禁售（默认在售）=售卖单元状态直查；详情页右上角无上架徽标；UI 无「已上架/未上架」字样。教训：改 Tab 名要 grep 全部测试断言。
- 售卖空间 Tab 状态列只留「生效中」徽标（nextSpaceSwitchOfFn 保留但 UI 不引用）。

## 第34轮（现行）：空间列表取消 rowspan 合并
renderSpacePlans 每行完整渲染（用户嫌合并难看）；排序：状态→effStart 降序→fn 字典序→空间 seq。SU Tab 与售卖空间 Tab 的 fn rowspan 合并保留。

## 第29轮（现行）：空间详情交互对齐售卖计划
列表无行内操作（操作在详情页）；新增按钮列表左上角，未发起变更置灰；#spaceplan-detail-view 独立详情页（标题+状态徽标+返回；基础信息；单元表；操作区 pending=修改+发布+复制 / published=停用+复制 / stopped=仅复制，复制不套 disCls）；backToList 开头必调 closeSpacePlanDetail()。

## 第24/26/27/31/32轮（历史要点）
- 第24轮：售卖计划 fn 复选组筛选（全不勾=全部）。第26/27轮：独立 spacePlans 实体（第38轮已并入空间聚合根）。第31轮：售卖空间由弹窗创建（第38轮起直接建空间）。
- 第32轮：effectiveSpaceAt 纯计划仲裁；mock 全商品补常驻计划。踩坑：计划名含子串「售卖空间3」断言按行内 key 定位；双11计划默认时段 11-11~11-20 不含当前时点（2026-11-03），验证接管须显式填时段+优先级。

## 核心业务概念
- 预留 vTPM 资源包：按「购买量（万 vTPM step）× 购买周期（天）」售卖；超量路由=超量限流（429）或超量路由 Serverless 二选一；折算系数三维度配 YAML 版本；SLO A类违约按累计违约分钟/月分档赔付。
- 关键实体链：商品 → 售卖空间（fn+维度+度量）→ fn 生效空间（仲裁）→ 售卖单元（叉乘自动生成，永不删除）→ 售卖计划（七字段组）→ 手动交付 → 资源包 → 监控。
- 后台菜单：预留vTPM管理挂「活动运营」；商品管理挂「商品定价中心」。

## 页面地图（prototype/）
- index.html 官网首页 / terms.html 购买须知 / wallet.html 前台充值（packages.html 跳转壳）/ monitor.html+monitor-component.html 前台+共用监控组件 / admin-monitor.html 后台监控。
- admin-packages.html 后台预留 vTPM 管理（手动交付弹窗；只能交付在售售卖单元）。
- admin-products.html 商品管理后台（主战场）。

## 商品后台实现要点（admin-products.html）
- **五视图同级切换**：#list-view / #detail-view / #plan-detail-view / #spaceplan-detail-view / #plan-create-view。
- unitStatusOf：时间点取 timeFilter.point（未选=当前）；在售=空间+计划双发布且档期内，最高优先级计划 unitStates[uid]≠'off'。
- 空间/计划共用三态：pending_publish/published/stopped（planStatusMeta）。
- planRow schema：{name,spaceKey,priority,effStart,effEnd,units,unitStates,chargeCodes/quotaCodes/inventoryCodes,modes{7键},factor|factors,slo|slos,payloadId|payloads,minQty/maxQty/stepQty|qtys}；planFieldVal+PLAN_FIELDS 映射。
- draft 双存 planDraft{key:{unified,units{}}}；renderPlanCreateSections(skipCollect)——外部写完 draft 重渲必须传 true。**含 ${} 模板字符串用 Edit 工具改**。
- **编辑锁（第10轮）**：editLocks{code}（pro 由张三持锁）；canEdit/guardEdit/startEdit/exitEdit；护栏在 publish/stop/publishPlanRow/stopPlanRow/editPlanRow/confirmPlanCreate/confirmSpacePlan（复制豁免）。
- backToList snapshotCurrentProduct 回写；openDetailByCode 统一入口。示例数据自洽：计划/空间/状态按商品隔离；计费项前缀=商品code；mock 计划档期 ⊆ 空间档期。
- 第12轮：商品与模型/Playground 解耦。第16/18轮：计划三态均可复制（深拷贝→-副本→待发布）不受锁。

## 已废弃链路（防止复建）
**第44~46轮的「fn 与度量分离共享勾选」弹窗（.sp-measure-check 无 data-fn、fn 复选无 onchange）——第47轮已改回嵌套式**；第37轮前编辑锁在基本信息上方/手动 SU 创建弹窗/.sp-dim-check 维度复选；第38轮前独立空间计划实体/计划跨空间勾选单元；**第45轮前「空间完全不可改」口径（现=待发布可编辑原地更新，编辑弹窗=创建弹窗复用）**/计划下拉含待发布停用空间/计划页单元信息含售卖空间；第39轮前售卖空间 Tab 时间点查询；第40轮前 pu-sp-N-M 界面前缀；第33轮前「已上架」文案。

## 技术约定与部署
- 每页顶部深色「原型导航」栏；后台紫色主色 #7C3AED；管理员「吕」。数据全为页面内 JS mock。
- **部署（Pages legacy 从分支部署）**：gh-pages 分支=HTML 根直出+.nojekyll。流程：推 main → git worktree add gh-pages → rm+cp prototype/*.html → 推送 → sleep~105s → curl 验证线上 md5 → worktree remove。URL：https://alanqh.github.io/tpm-bao/admin-products.html
- **测试（tests/，NODE_PATH=/Users/lqh/.workbuddy/binaries/node/workspace/node_modules，r11/r28/r38 须从仓库根目录跑其余任意）**：26 套全绿（第47轮口径，976 项）——this-round(31)/r9(26)/r10(51)/r11(19)/r12(39)/r13(33)/r14(50)/r15(39)/r16(29)/r18(28)/r19(38)/r20(74)/r22(34)/r23(34)/r24(18)/r25(49)/r27(33)/r28(33)/r29(45)/r38(43)/r45(40)/r47(46) + smoke-r26(46)/plan-page(78)/data-consistency(30)/su-dim-validate(13)。第47轮适配要点：.sp-measure-check 选择器一律带 data-fn；glm4 sp1=11 单元（SU Tab rowspan=11、列表已上架 18 行、计划 units su-1~11）、sp2=su-12~15（su-12 全缺省居首）、详情清单末行=输出 su-10/输入 su-8；创建/编辑弹窗须先勾 fn（check+dispatchEvent change）再操作度量。
- **jsdom 踩坑汇总**：runScripts:'dangerously'；confirm/alert 打桩；页面顶层 const 用 window.eval 取；rowspan 合并行 cells 索引偏移（空间级列只首行有）；勾选联动须 dispatchEvent(change,{bubbles:true})；跨商品切换先 backToList()；筛选元素重渲后重查；跑批 >150s 被 SIGKILL(137) 分批跑；保存成功路径无 alert（断言数据变化）。
- 语法校验：node -e 提取 `<script>` 用 new Function()。修页面后先跑全套找红再逐套改断言。
- 网络偶发 502：push 失败等 1-2 分钟重试；恢复检测=curl https://github.com
