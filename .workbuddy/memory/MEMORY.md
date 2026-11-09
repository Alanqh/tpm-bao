# TPM 保障包项目长期笔记

## 项目概述
硅基流动（SiliconFlow）「预留 vTPM / 在线文本」商品管理前端原型（纯 HTML + Tailwind CDN + 内联 JS mock，静态可部署）。仓库根：`/Users/lqh/Documents/ChatGPT/TPM保障包/`，页面在 `prototype/` 下。已迭代至第58轮（main b4f081a / gh-pages 3236b01，31 套 1285 项全绿）。

## 第58轮（现行）：空 fn（—）固定排在空间内首行
- renderSpaceTab 行排序：同空间内 `if (!a.f) return -1; if (!b.f) return 1;` 置于 fnDims 键序比较之前——空 fn（显示 —，如 vTPM 商品）无论创建勾选顺序如何均排空间首行，其余 fn 按键序。
- 注入 sp9（fnDims 键序 input→''→cache）验证：渲染序 —→input→cache；sp1 的 input/output/cache 与 vTPM std 的 —（单行）不受影响。31 套 1285 项全绿（无需测试适配，mock 空 fn 空间原本就在首位）。线上 md5 682c8dea697760165bbbe3c8afb59bda。

## 第57轮：删列表操作列 + 恢复计费项小复制按钮
- **①空间列表操作列删**：9→8 列（售卖空间/状态/空间名称/生效时间/失效时间/优先级/Function/维度组合）；renderSpaceTab 删操作 td、空态 colspan=8；空间级 rowspan 列仍 6 个。
- **②计划 Tab 操作列删**：21→20 th（末列=优先级）；renderPlan 删 planSpanMap/copyCell/prevPlanIdx 逻辑、空态 colspan=19。**copySpacePlan/copyPlanRow 函数保留**（详情页操作区复制入口仍在用）。
- **③恢复** renderUnitRow 计费项 code 旁 copyChargeCode 小按钮（第56轮误删——用户所指是操作列，非小按钮）。
- 测试适配 10 套 15 处：smoke-r26/plan-page/r19(21→20 cells)/r20/r23(表头 JSON 删操作)/r27(9→8)/r28(2 处)/r49(空间 8+计划 20 th，head[19]=优先级)/r51/r52（「列表行含复制按钮」→「无复制按钮」，rowspan 断言改空间级列）。31 套 1285 项全绿。线上 md5 282d00b7bfbd87202b7874ea458a1505。
- **教训：「复制按钮」有多个指向（列表页计费项 code 小按钮 / 列表操作列 / 详情操作区），改前先确认范围**；hidden th 仍计入 querySelectorAll 计数。

## 第56轮：列表页标签列 + 隐藏配额项 + 生效/失效文案统一
- **①列表页删计费项复制按钮**：renderUnitRow 计费项 td 的 copyChargeCode 小按钮删（charge code 纯文本展示）。
- **②计费项标签列**：四 Tab 表头「关联计费项」后插「计费项标签」列（maas 8→9、vtpm 14→15）；renderUnitRow 渲染 charge.tags 灰底小 tag；空态 colspan 9/15。详情页 SU Tab 未加。
- **③配额项列隐藏**：计划 Tab + 计划详情「配额项」th/td 加 col-quota 类，syncUnitListColumnsByType 统一 add('hidden')（两类商品都藏）；glm4 计划 Tab 隐藏列 7→8、std 对照隐藏 1。
- **④文案统一**：全部「生效开始/生效结束（含开始生效时间/结束生效时间）」→「生效时间/失效时间」——计划 Tab 表头、计划详情表头、空间创建页 label、计划创建页 label、空间详情 field()、4 处 alert 文案。
- 测试适配 8 套 25 处：plan-page(3)/su-dim-validate(1)/r13(5, cells 索引+1)/r19(1)/r29(1)/r49(13)/r51(1)。31 套 1285 项全绿。线上 md5 02ad5d2f73276ac06564891ed34cc997。
- 踩坑：sed 全局替换「关联计费项」表头会波及详情页 SU Tab（376 行）——批量替换后须逐处核对；r13 类列表页行断言因插列全部 cells 索引 +1。

## 第55轮：空间列表列序微调
- **9 列新序**：售卖空间code（普通展示 font-mono 非链接）→ 状态 → 空间名称（**跳转详情页按钮移到此列**，openSpacePlanDetail+箭头 icon）→ 生效时间（含档期内/外徽标）→ 失效时间 → 优先级 → Function（cells[6]）→ 维度组合 → 操作（复制，rowspan）。**删除「售卖单元数」列**；空间级 rowspan 合并列=7 个；续行仅 2 cells（fn+维度组合）。
- 测试适配 8 套：smoke-r26/r20/r22/r23（表头 JSON+cells[6]+删单元数断言→改「列已删」断言）/r27/r28（fnOfRow 续行 2 列）/r29（详情链接查找改按空间名称 GLM4·常规售卖空间）/r49（表头 9 列 spHead[3]/[4]=生效/失效）。
- **r38 跨日 flaky 修复**：测试时间写死 2026-11-06T12:00:00，当日 11:51 距其不足 10 分钟触发「生效开始须晚于当前+10min」拦截 → 推远至 2026-12-06T12:00:00。**教训：测试里的「未来时间」要用远未来，避免靠近当前时间窗口（±10min 校验）**。
- 31 套 1285 项全绿（第55轮口径）。线上 md5 885cc212682b54a0e0baf6a6e7209a77。

## 第54轮：空间复制须持锁 + 创建页布局修复
- **①复制受锁**：copySpacePlan 前置 `if (!canEdit()) { alert('请先…发起变更…再复制'); return; }`（复制=创建操作，对齐 copyPlanRow）。
- **②布局**：第53轮 spaceplan-create-view 误插在 `<main>` 外（跑到侧边栏导航旁）→ 移入 main 内 spaceplan-detail-view 之后；布局=标准视图（h3 标题行+返回商品详情/保存售卖空间按钮+admin-card 分区块：基础信息/售卖 function/维度度量各一张卡）。
- 测试：r29/r38 退锁复制旧断言（预填打开）→ 改拦截断言；r53 补未持锁拦截（23 项）。31 套 1233 项全绿。线上 md5 27f73786d6edcf4e22c85f752b74c8b6。


## 第53轮：空间创建页面化 + 默认时间本地时区
- **①页面化**：#modal-spaceplan 弹窗删 → #spaceplan-create-view 完整视图（第54轮修正位置=main 内）。openSpacePlanModal 保留函数名（兼容测试），内部切视图（隐藏 detail/plan-detail/spaceplan-detail/plan-create 四视图）；closeSpacePlanPage 取消/保存后回 detail-view；showDetailView 复位 spaceplan-create-view。**closeModal('spaceplan') 转发 closeSpacePlanPage**（历史调用兼容）。
- **②本地时区**：nowLocalStr/nextHalfHourStr 原用 toISOString()=UTC 串（比 GMT+8 本地慢 8 小时→用户看到默认时间非当前时刻）→ 手动本地拼串。confirmPlanCreate earliest 同步改本地拼串+**空格口径**（'T' 口径与 pcpVal 空格口径字典序比较同日恒小——第52轮同型真 bug 第二次踩）。
- 测试：12 套 sed 批量替换（modal-spaceplan→spaceplan-create-view、spaceplan-modal-title→spaceplan-form-title、closeModal('spaceplan')→closeSpacePlanPage()）；r52 断言 toISOString→本地拼串；r53 套件（第54轮 23 项）。
- 踩坑：jsdom alert 无输出时先 dump alert 文本定位；宿主与 jsdom 同时区（断言本地拼串直接比）。**教训：新增视图 div 必须插在 `<main>` 内**（第54轮 bug 源）。

## 第52轮：创建默认时间 + 失焦/提交校验 + confirm + 列表页复制（预填不直接保存）
- **①空间默认时间**：openSpacePlanModal 创建模式 sp-eff-start=nowLocalStr()（第53轮起本地口径）、sp-eff-end='2099-12-31T23:59:59'；编辑模式回填原值。**②计划默认时间**：plan-eff-start=nextHalfHourStr()、plan-eff-end 留空。
- **③失焦校验 onPlanTimeBlur**（两 input onblur）：超空间档期红边+alert。**④提交校验**：新计划/复制（isCopyModeNow）生效开始须晚于当前+10 分钟（earliest=空格口径+本地时区）；修改旧计划不受限。
- **⑤confirm**：publish/stop 四函数前置 confirm——jsdom 测试须 `window.confirm=()=>true`。
- **⑥复制改预填**：空间列表 9→10 列、计划 Tab 20→21 列（末列操作，rowspan=行数）；copySpacePlan=spaceCopyPrefill 一次性预填（第53轮起预填到页面）；copyPlanRow 须持锁+临时副本 planCopyFromIdx→editPlanRowForCopy 回填（生效开始清空）；confirm/close 摘临时副本。
- 测试：适配 r49/r51/smoke-r26/plan-page/data-consistency；r52 套件 48 项（第53轮断言已本地化）。线上 md5 478b36a8…（第52轮版）。

## 第51轮：maas 紧凑化 + 计划列序 + 默认 perUnit + 杂项（现行）
- **①紧凑化**：列表页 maas 两 Tab table=min-w-[1000px]+compact-cells；详情 SU Tab su-table 类，syncUnitListColumnsByType toggle compact-cells（online-text=1000/vTPM=1600）。CSS：`table.compact-cells th,td{padding:.3rem 0}`。
- **②计划列序**：计划 Tab（第52轮 21 列）=售卖计划单元/状态/类型/**售卖空间(4)/所属售卖计划(5)/生效开始(6)/生效结束(7)**/售卖单元/Function/维度:度量/计费/配额/库存/折算/SLO/payload/量×3/优先级(20)/操作(21)；计划详情页售卖空间列第 2 位。
- **③默认 perUnit**：openPlanCreatePage 开关复位——charge/quota 默认 checked，其余五键 unified；编辑回填 r.modes。第51轮真 bug：onPlanSpaceChange 原只 renderPlanUnitsCharge→perUnit 行不渲染；修复=改调 renderPlanCreatePage() 整页重渲（先 collectDraftFromDOM）。
- **④优先级后置**（空间→名称→起→止→优先级）。**⑤区块序号全删**+「请先选择售卖空间」。**⑥标题旁铅笔删**（info 入口仍在）。
- 踩坑：plan-create-view 静态 HTML 单元区空容器；confirmDetailNameEdit 空名分支 source 复位。

## 第50轮：online-text 各列表隐藏 vTPM 专属列
- 列表页 maas 两 Tab 14→8 列（删折算系数/SLO/payload/购买量×3，末列=所选时间执行价）；renderUnitRow 按 productTabGroup 跳过尾部输出。详情三处 col-vtpm 显隐（SU Tab 6 列/售卖计划 Tab 7/计划详情 7）——syncUnitListColumnsByType()（showDetailView+三 render 末尾）。vTPM 商品全显（对照）。

## 第49轮（现行）：列表四 Tab + 生效起止拆列 + SU 列序调换 + 类型适配
- **①列表四 Tab**（类型×上架状态，#maas-listed-tbody 等四 tbody+renderTopTab(group,listed,tbodyId)）；只统计当前生效空间（published∧档期内 priority→seq 仲裁）内单元；无生效空间→商品消失。mock 基准：maas已上架 4（glm4）/maas未上架 0/vTPM已上架 4/vTPM未上架 6。productTabGroup：type=maas-product-vtpm→vtpm 组。
- **②生效起止拆两列**：空间列表 8→9 列（第52轮+操作=10）；计划 Tab 19→20（51 轮起生效列 6/7 位；52 轮+操作=21）；计划详情 17→18；空间详情字段区拆两栏。
- **③SU Tab 列序**：空间→Function→维度:度量→售卖单元；fnSpan 不含 combo（fn 合并），cbSpan 加 fn 条件（跨 fn 不合并）。
- **④计划 Tab 空间筛选**无「全部」，默认当前生效空间。**⑤折算/SLO Tab 仅 vTPM**。**⑥online-text 计划简化**：仅计费+配额；PLAN_VTPM_ONLY_SECTIONS 隐藏；modes 五键强制 unified；collectDraftFromDOM 按类型跳过（collectKeys=['charge','quota']+(vtpm?['inventory']:[])）。
- 踩坑：jsdom datetime-local 丢秒→测试时间避边界；顶部 Tab 选择器限定 `#list-view .admin-card .admin-tab`。

## 第48轮：纯叉乘 + 示例数据简化
- genSaleUnitsForSpace 纯叉乘（勾选度量笛卡尔积）；0维 fn 生成唯一空单元。std 3/pro 4/pre 3/glm4 sp1 per-fn 4（input 2/output 1/cache 0维 1）。

## 第47轮（现行）：创建售卖空间弹窗嵌套式 + 维度按类型过滤
- 区块1 fn 复选 .sp-fn-check（onchange=renderSpFnCards）；区块2 #sp-dimmeas per-fn 卡片，.sp-measure-check 带 data-fn。勾选暂存 spMeasDraft（fn→dim→[measure]）。维度候选=productDimSpecs[type].dims（vtpm=购买量区间/购买周期；online-text=输入区间/费用发生日/费用发生时间）。confirmSpacePlan per-fn 收集。
- 踩坑：jsdom 勾 fn 后卡片才存在（先 check+dispatchEvent(change)）；Edit 工具改长行可能吞字符。

## 第46轮：维度体系（现行）
- measureOptions={'购买量区间':[1～100,100～500,500+],'购买周期':[30/60/90天],'function':[input,output,cache],'输入区间':[0～128K,128K～1M,1M+],'费用发生日':[周一至周五,周末],'费用发生时间':[2点～8点,其他时间段]}；productDimSpecs：vtpm={购买量区间,购买周期},online-text={输入区间,费用发生日,费用发生时间,hasFn:true}。mock 自洽=严格纯叉乘。

## 第45轮（现行）：待发布空间可编辑 + 计划选已发布空间
- editSpacePlan 仅 pending_publish；详情操作区 pending=修改+发布+复制/published=停用+复制/stopped=仅复制；差异叉乘幂等。计划空间下拉候选=published；editPlanRow 原空间停用保底附加。空 fn 商品弹窗「—（无 function）」。
- 踩坑：r38 类测试发布空间后须 stopSpacePlan 清理；window.eval 顶层异常被吞用 VirtualConsole('jsdomError')。

## 第38~43轮核心模型（现行）
- **空间聚合根**：`spaces[k]={seq,name,priority,effStart,effEnd,status,fnDims,fnMeasures}`；详情 6 tab。**售卖计划锁定空间**：三重校验（必选/units 属空间/时间⊆档期）。**仲裁**：effectiveSpaceAt(fn,t)=published∧档期内∧fnDims 含 fn→priority→seq。**unitStatusOf 三态**：禁售红/未配置灰/在售绿。**SU Tab** 只读、时刻过滤、spSpan>cbSpan>fnSpan。**第43轮两步创建**：勾 fn→每维度勾度量。
- 真 bug 教训：openPlanCreatePage 创建模式末尾 resetPlanDraft()+renderPlanCreateSections(true)；productIsListed 同步切换 spaces；名称快编写回 currentProduct+allProducts。
- 踩坑：rowspan 续行 cells 索引偏移；switchInnerTab 不重渲须显式 render；第37轮编辑锁护栏（第52轮起复制也须持锁）。

## 第12~36轮历史要点
- 空间详情交互：列表无行内操作（操作在详情页→第52轮加复制按钮）；backToList 开头 closeSpacePlanDetail()。0维空间合法；空 dims `--`。第37轮 SU 叉乘自动生成（手动链路删）。第24轮计划 fn 复选筛选。第16/18轮计划三态可复制（→第52轮改须持锁+预填）。

## 核心业务概念
- 预留 vTPM 资源包：按「购买量（万 vTPM step）× 购买周期（天）」售卖；超量路由=限流或 Serverless 二选一；折算系数三维度配 YAML；SLO A类违约按分钟/月分档赔付。
- 实体链：商品 → 售卖空间 → fn 生效空间（仲裁）→ 售卖单元（叉乘）→ 售卖计划（七字段组）→ 手动交付 → 资源包 → 监控。
- 后台菜单：预留vTPM管理挂「活动运营」；商品管理挂「商品定价中心」。

## 页面地图（prototype/）
index.html 官网 / terms.html 购买须知 / wallet.html 前台充值（packages.html 跳转壳）/ monitor.html+monitor-component.html 前台+共用监控 / admin-monitor.html 后台监控 / admin-packages.html 后台手动交付 / admin-products.html 商品管理后台（主战场）。

## admin-products.html 实现要点
- 五视图同级切换：#list-view / #detail-view / #plan-detail-view / #spaceplan-detail-view / #plan-create-view。
- 空间/计划共用三态：pending_publish/published/stopped（planStatusMeta）。
- planRow schema：{name,spaceKey,priority,effStart,effEnd,units,unitStates,chargeCodes/quotaCodes/inventoryCodes,modes{7键},factor|factors,slo|slos,payloadId|payloads,minQty/maxQty/stepQty|qtys}。
- draft 双存 planDraft{key:{unified,units{}}}；renderPlanCreateSections(skipCollect)——外部写 draft 后重渲传 true。含 ${} 模板字符串行用 Edit 改须当心。
- 编辑锁（第10轮）：editLocks{code}（pro 张三持锁）；canEdit/guardEdit/startEdit/exitEdit。
- backToList snapshotCurrentProduct 回写；openDetailByCode 统一入口；计费项前缀=商品code。

## 已废弃链路（防止复建）
第44~46轮「fn 与度量分离共享勾选」弹窗→47轮嵌套式；第37轮前手动 SU；第38轮前独立空间计划实体/跨空间勾选；第45轮前「空间完全不可改」；第39轮前空间 Tab 时间点查询；第40轮前 pu-sp-N-M 前缀；第33轮前「已上架」文案；第47轮前「缺省完整叉乘」；第48轮前 glm4 sp2 双11 mock；第49轮前列表两 Tab/「空间维度」「生效起止」合并列/SU 组合列在 fn 之上/计划筛选「全部」/online-text 显示折算 SLO Tab；第51轮前：计划 Tab 生效两列在表尾/空间列第 7 位/详情空间列第 4 位/计费配额默认 unified/优先级第 3 位/区块编号/标题铅笔/onPlanSpaceChange 只重渲单元区；**第52轮前：空间列表 9 列、计划 Tab 20 列（现=10/21 含操作列）、计划默认生效时间写死（现=下一整 30 分钟）、失效默认 2099（计划现=留空；空间仍=2099）、发布停用无 confirm、详情页复制（现=列表页复制按钮）、复制直接落库（现=预填编辑态保存才落库）、复制豁免编辑锁（现=须持锁）**；**第53轮前：空间创建/编辑/复制用弹窗 #modal-spaceplan（现=#spaceplan-create-view 完整页面）、默认时间与 earliest 用 toISOString UTC 口径（现=本地时区拼串，earliest 空格口径）**；**第54轮前：空间复制不受编辑锁（现=copySpacePlan 前置 canEdit，须持锁）**；**第55轮前：空间列表 10 列（现=9）、Function 列.cells[3]（现=.cells[6]）、详情跳转在 space code 上（现=空间名称列）、有「售卖单元数」列（现=删）、续行 3 cells（现=2）**；**第56轮前：列表页计费项 code 旁有复制按钮（现=删）、列表无计费项标签列（现=有，maas 9/vtpm 15）、计划 Tab/计划详情展示配额项列（现=隐藏 col-quota）、生效文案为「生效开始/生效结束」（现=生效时间/失效时间）**；**第57轮前：空间列表 9 列/计划 Tab 21 列含末列「操作」（现=8/20，操作列删）、复制入口在列表操作列（现=收敛至详情页操作区）、列表页计费项 code 旁无小复制按钮（现=恢复）**；**第58轮前：空 fn（—）按 fnDims 键序排序（现=固定排空间内首行）**。

## 技术约定与部署
- 每页顶部深色「原型导航」栏；后台紫色主色 #7C3AED；管理员「吕」。数据全 JS mock。
- **部署（Pages legacy 分支部署）**：gh-pages=HTML 根直出+.nojekyll。推 main → `git worktree add ../tpm-bao-ghpages gh-pages` → rm+cp prototype/*.html → add/commit/push → sleep~105s → curl 验证 md5 → worktree remove。URL：https://alanqh.github.io/tpm-bao/admin-products.html
- **测试（tests/，NODE_PATH=/Users/lqh/.workbuddy/binaries/node/workspace/node_modules；统一从仓库根目录跑）**：31 套全绿（第55轮口径，1285 项）——this-round(31)/r9(26)/r10(52)/r11(30)/r12(43)/r13(39)/r14(49)/r15(41)/r16(29)/r18(34)/r19(39)/r20(68)/r22(35)/r23(33)/r24(16)/r25(47)/r27(32)/r28(31)/r29(50)/r38(44)/r45(40)/r47(45)/r48(32)/r49(62)/r51(43)/r52(48)/r53(23)/smoke-r26(49)/plan-page(79)/data-consistency(30)/su-dim-validate(13)。第55轮断言口径：空间列表 9 列（code/状态/名称/生效时间/失效时间/优先级/Function/维度组合/操作）、fn 列=cells[6]、续行 2 cells、详情链接=空间名称列按钮；r38 测试时间已用远未来（2026-12-06）防跨日 flaky。
- **jsdom 踩坑汇总**：runScripts:'dangerously'；confirm/alert 打桩；页面顶层 const 用 window.eval 取；rowspan 合并行 cells 索引偏移；勾选联动 dispatchEvent(change,{bubbles:true})；跨商品切换先 backToList()；保存成功无 alert（断言数据变化）；datetime-local 丢秒（默认值/断言用分钟级）；跑批 >150s 被杀分批跑。
- 语法校验：node -e 提取 `<script>` 用 new Function()。修页面后先跑全套找红再逐套改断言。
- 网络偶发 502：push 失败等 1-2 分钟重试。文本批量替换：`/usr/bin/sed -i '' -e 's/旧/新/g'`。
