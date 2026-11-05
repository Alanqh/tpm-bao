# TPM 保障包项目长期笔记

## 项目概述
硅基流动（SiliconFlow）「预留 vTPM / 在线文本」商品管理前端原型（纯 HTML + Tailwind CDN + 内联 JS mock，静态可部署）。仓库根：`/Users/lqh/Documents/ChatGPT/TPM保障包/`，页面在 `prototype/` 下。已迭代至第50轮（main e7681b5 / gh-pages e914d8a，28 套 1134 项全绿）。

## 第50轮（现行）：online-text 商品各列表隐藏折算系数及之后的 vTPM 专属列
- **列表页 maas 两 Tab**：表头删折算系数/SLO/payload/最小购买量/最大购买量/购买量step 7 列（14→8 列，末列=所选时间执行价）；renderUnitRow 按行商品组（productTabGroup!=='vtpm' 则不输出尾部 `${isVtpm?...:''}`）跳过输出；renderTopTab 空态 colspan 按组 14/8。
- **详情页三处 col-vtpm 显隐**：SU Tab（th/td 6 列）、售卖计划 Tab（7 列=库存项+折算及之后 6）、计划详情页（7 列）——`syncUnitListColumnsByType()`（showDetailView 进详情时调 + renderSaleUnits/renderPlan/renderPlanDetail 末尾各调一次，因重渲 innerHTML 新 td 无 hidden 类须重同步）；vTPM 商品全显示（对照组）。
- **用户确认口径**：售卖计划 Tab/计划详情页一并隐藏；计划表「库存项」列也隐藏（第49轮起 online-text 保存已不收集库存项）。
- 测试：r49 套件补⑦段（47→62 项：maas 8 列/行、vTPM 14 列、详情三处 hidden 计数、std 对照）；r13 适配（maas 表头 8 列断言+行 cells 数，39 项）。28 套 1134 项全绿。
- 部署：main e7681b5 / gh-pages e914d8a；线上 md5 0136ab5edcd1005b9c91fc8092e7dd40 一致，col-vtpm 42 处、syncUnitListColumnsByType 5 处命中。

## 第49轮（现行）：列表四 Tab + 生效起止拆列 + SU 列序调换 + 类型适配
- **①列表四 Tab**（商品类型 × 上架状态）：maas已上架/maas未上架/vTPM已上架/vTPM未上架（#maas-listed-tbody 等四 tbody + renderTopTab(group,listed,tbodyId)）；只统计各商品**当前时刻生效售卖空间**（activeUnitsOfData：published∧档期内 priority→seq 仲裁）内单元——在售→已上架，未配置/禁售→未上架；**无生效空间→商品从四 Tab 完全消失**（pre 停空间后不再计入未上架）；productTabGroup：type=maas-product-vtpm→vtpm 组，其余→maas 组。mock 基准：maas已上架 4（glm4）/maas未上架 0/vTPM已上架 4（std2+pro2）/vTPM未上架 6（pre3未配置+pro2未配置+std su-3禁售）。
- **②生效起止拆两列**：空间列表 8→9 列（生效开始/生效结束，列表「空间维度」列改「维度组合」per-fn 展示勾选度量）；售卖计划 Tab 19→20 列；计划详情 17→18 列；空间详情字段区拆「生效开始」「生效结束」。
- **③SU Tab 列序调换**：售卖空间→**Function**→维度:度量→售卖单元（fn 上调至组合之上）；rowspan 语义反转——fnSpan 判定不含 combo（空间内 fn 合并 rowspan），cbSpan 判定**加 fn 条件**（跨 fn 同组合不合并）。glm4 sp1：sp1 rowspan=4、input rowspan=2、output/cache 各自独立行。
- **④计划 Tab 空间筛选**：删「全部」选项——必须选定具体空间，默认=当前生效空间（无则首个）；空态文案「该售卖空间暂无计划单元」。
- **⑤折算/SLO Tab 仅 vTPM**：openDetailByCode 切换 #inner-tab-btn-factor-config/#inner-tab-btn-slo-config hidden（online-text 隐藏）。
- **⑥online-text 计划简化**：仅配置计费项+配额项——PLAN_VTPM_ONLY_SECTIONS=['plan-section-inventory','plan-section-factor-slo','plan-section-payload','plan-section-qty'] 隐藏；confirmPlanCreate modes 五键（inventory/factor/slo/payload/qty）强制 unified + 库存项免填；**collectDraftFromDOM 按类型跳过收集**（collectKeys=['charge','quota']+(vtpm?['inventory']:[])，factor/slo/payload/qty 仅 vtpm 收集）——否则隐藏区块 mock 残留值（inv-vtpm-60d）会污染保存结果（r49 测试抓出的真 bug）。
- **测试**：新增 test-this-round-r49.js（47 项①~⑥）；r11/r13 按四 Tab 语义重写（旧 #listed-tbody/#pending-tbody 引用改四 tbody；顶部 Tab 选择器须限定 `#list-view .admin-card .admin-tab`——内层 Tab 同类名）；r19（SU 列序/计划 20 列/详情 18 列）、r20（空间 9 列+首行 fn 居次+组合不跨 fn）、r23/r27/r28（空间 9 列）、r29（详情字段区拆分）、r48（④段改未上架 Tab 新口径，32 项）、plan-page（20 列+生效开始/结束）、smoke-r26（空间 9 列）。
- **踩坑**：jsdom datetime-local 丢秒（'2026-11-01T00:00' vs 档期 '...00:00:00' 字典序偏低致边界拦截）——测试时间选档期内远离边界的时刻；plan-page 旧套件因 std sp1 档期 10-01 起且默认计划档期不同才未触发。
- r11/r13 状态联动新口径：pre 停空间→vTPM未上架 Tab 从 6→3（pre 消失）；发布计划→已上架 4→5。

## 第48轮：纯叉乘 + 示例数据简化（历史口径）
- genSaleUnitsForSpace 纯叉乘：组合=勾选度量笛卡尔积（无空对）；0维 fn 生成 dim=''/measure='' 唯一空单元。示例数据：std 3（su-3 off 禁售）/pro 4（30d 计划 published su-1/su-3 on，90d pending→su-2/su-4 未配置）/pre 3（全 pending→全未配置）/glm4 sp1 per-fn 4（input[0～128K,1M+]=2/output[1M+]=1/cache 0维=1）全 on 单计划。glm4 副本/新建空间 sp2 起。
- 第49轮起：列表 Tab 语义已变（四 Tab + 未配置计入未上架），第48轮「禁售 Tab 只显真禁售」口径仅存于 unitStatusOf 三态定义。

## 第47轮（现行）：创建售卖空间弹窗改回嵌套式 + 维度按商品类型过滤
- **嵌套式弹窗**：区块1 fn 复选 `.sp-fn-check`（onchange=renderSpFnCards）；区块2 #sp-dimmeas 渲染 per-fn 卡片 `[data-fncard=f]`，卡片内 `.sp-measure-check` 带 **data-fn**（选择器 `.sp-measure-check[data-fn="X"][data-dim=...][value=...]`）。
- **勾选暂存 spMeasDraft**（fn→dim→[measure]）：重渲前 snapshot 暂存，取消 fn 再勾回可恢复；openSpacePlanModal 创建模式清空暂存、编辑模式以空间 fnMeasures 覆盖。
- **维度候选按类型过滤**：renderSpFnCards 用 `productDimSpecs[currentProduct.type].dims`（vtpm=购买量区间/购买周期；online-text=输入区间/费用发生日/费用发生时间）。
- **confirmSpacePlan per-fn 收集**：`querySelectorAll('.sp-measure-check[data-fn="f"]:checked')` 逐 fn → fnDims/fnMeasures 各自独立。
- 踩坑：jsdom 勾 fn 后卡片才存在——先 check+dispatchEvent(change) 再查 .sp-measure-check；Edit 工具改长行可能吞字符（node -e "new Function 读文件" 定位）。

## 第46轮：维度体系（现行）
- measureOptions={'购买量区间':[1～100,100～500,500+],'购买周期':[30/60/90天],'function':[input,output,cache],'输入区间':[0～128K,128K～1M,1M+],'费用发生日':[周一至周五,周末],'费用发生时间':[2点～8点,其他时间段]}；productDimSpecs：vtpm={购买量区间,购买周期,hasFn:false}，online-text={输入区间,费用发生日,费用发生时间,hasFn:true}。旧维度「输入/输出token区间」已全站删除。
- mock 自洽纪律：单元必须严格=勾选集合纯叉乘（第48轮口径），多造/漏造被 r45/r47/r48 末段自洽复检抓住。

## 第45轮（现行）：空fn必选+待发布空间可编辑+计划选已发布空间+创建项即时入下拉
- 空fn商品弹窗渲染「—（无 function）」复选（fnPool 空→['']），勾选校验至少一个 fn。
- **待发布可编辑（editSpacePlan）**：仅 pending_publish；详情操作区 pending=修改+发布+复制 / published=停用+复制 / stopped=仅复制。openSpacePlanModal(k) 编辑模式（回填名称/优先级/档期/fn 勾选/度量勾选 per-fn）；confirmSpacePlan editingSpaceKey 命中→原地更新；差异叉乘幂等（原单元永不删）。已发布/停用编辑拦截「仅待发布」。
- 计划空间下拉候选=published；editPlanRow 原空间已停用保底附加。pre sp1 published。
- 计划创建页单元行=Function+维度组合（删售卖空间行）。
- 踩坑：r38 类测试发布 sp3 后须 stopSpacePlan 清理；DOMException 与 window.eval 顶层异常被 runScripts 吞——VirtualConsole('jsdomError') 定位。

## 第38~43轮核心模型（现行）
- **空间聚合根**：`spaces[k]={seq,name,priority,effStart,effEnd,status(待发布|已发布|已停用),fnDims,fnMeasures}`；详情页 6 tab：售卖空间→售卖单元→售卖计划→定价计划→折算→SLO。
- **售卖计划锁定空间**：planRows[i].spaceKey 唯一；confirmPlanCreate 三重校验（必选空间/units 属该空间/时间 ⊆ 空间档期）。mock 计划档期 ⊆ 空间档期。
- **仲裁**：effectiveSpaceAt(fn,t)= published ∧ 档期内 ∧ fnDims 含 fn → priority 降序→seq 降序；effectiveSpaceAtAll(t) 不分 fn（SU Tab 时刻过滤用）。
- **售卖单元三态（unitStatusOf）**：空间未生效/最高优先级计划 off→禁售红；无生效中计划覆盖→未配置灰（unconf）；否则在售绿。列表在售/禁售 Tab=直查（**第48轮起禁售 Tab 不含未配置**）。
- **SU Tab**（14 列，只读）：任何时刻只显唯一生效空间单元（timeFilter.point||当前）；排序 spaceKey→comboKey→fn→id；spSpan>cbSpan>fnSpan 三层 rowspan；第41轮 #tf-point onchange 即时刷新。
- **空间列表 8 列**（每 fn 行完整渲染不合并，第34轮）；空间详情页（基本信息+单元清单）。
- **第43轮两步创建**：①勾 fn ②每维度直勾度量（.sp-dim-check 已删）；不勾 fn 拦截；未勾度量=0维合法。
- **售卖计划 Tab 空间筛选**：#plan-filter-space 首次定位 effectiveSpaceAtAll(当前)。
- 真 bug 教训：openPlanCreatePage 创建模式末尾必须 resetPlanDraft()+renderPlanCreateSections(true)；productIsListed 须同步切换 spaces；名称快编 confirm 必须写回 currentProduct+allProducts。
- 踩坑：rowspan 续行 cells 不含空间级列；测试造的空间/计划结尾清理；switchInnerTab 不重渲表格须显式 renderSaleUnits()。

## 第29~36轮要点（现行）
- 空间详情交互：列表无行内操作（操作在详情页）；新增按钮未发起变更置灰；backToList 开头必调 closeSpacePlanDetail()。
- 0维空间合法（fnDims[f]=[] 只能有一个单元）；空 fn 拦截；空 dims 展示 `--`。列表 Tab=在售/禁售（默认在售）；UI 无「已上架」字样。
- 第37轮：SU 由空间确认时叉乘自动生成（手动创建/删除链路全删）；编辑锁护栏在 publish/stop/publishPlanRow/stopPlanRow/editPlanRow/confirmPlanCreate/confirmSpacePlan（复制豁免）。
- 文案清理：解释性副标题/括注/title 悬停全删；标题名快编 contenteditable 不依赖编辑锁。
- 第24轮：售卖计划 fn 复选组筛选（全不勾=全部）。第12轮：商品与模型解耦。第16/18轮：计划三态均可复制（-副本→待发布）不受锁。

## 核心业务概念
- 预留 vTPM 资源包：按「购买量（万 vTPM step）× 购买周期（天）」售卖；超量路由=超量限流（429）或路由 Serverless 二选一；折算系数三维度配 YAML；SLO A类违约按累计违约分钟/月分档赔付。
- 实体链：商品 → 售卖空间（fn+维度+度量）→ fn 生效空间（仲裁）→ 售卖单元（叉乘生成，永不删除）→ 售卖计划（七字段组）→ 手动交付 → 资源包 → 监控。
- 后台菜单：预留vTPM管理挂「活动运营」；商品管理挂「商品定价中心」。

## 页面地图（prototype/）
index.html 官网首页 / terms.html 购买须知 / wallet.html 前台充值（packages.html 跳转壳）/ monitor.html+monitor-component.html 前台+共用监控组件 / admin-monitor.html 后台监控 / admin-packages.html 后台预留 vTPM 管理（手动交付）/ admin-products.html 商品管理后台（主战场）。

## admin-products.html 实现要点
- 五视图同级切换：#list-view / #detail-view / #plan-detail-view / #spaceplan-detail-view / #plan-create-view。
- 空间/计划共用三态：pending_publish/published/stopped（planStatusMeta）。
- planRow schema：{name,spaceKey,priority,effStart,effEnd,units,unitStates,chargeCodes/quotaCodes/inventoryCodes,modes{7键},factor|factors,slo|slos,payloadId|payloads,minQty/maxQty/stepQty|qtys}；planFieldVal+PLAN_FIELDS。
- draft 双存 planDraft{key:{unified,units{}}}；renderPlanCreateSections(skipCollect)——外部写完 draft 重渲必须传 true。含 ${} 模板字符串用 Edit 工具改。
- 编辑锁（第10轮）：editLocks{code}（pro 由张三持锁）；canEdit/guardEdit/startEdit/exitEdit。
- backToList snapshotCurrentProduct 回写；openDetailByCode 统一入口；示例数据按商品隔离；计费项前缀=商品code。

## 已废弃链路（防止复建）
第44~46轮「fn 与度量分离共享勾选」弹窗——第47轮改回嵌套式；第37轮前手动 SU 创建/编辑锁在基本信息上方/.sp-dim-check；第38轮前独立空间计划实体/计划跨空间勾选单元；第45轮前「空间完全不可改」（现=待发布可编辑原地更新）；第39轮前售卖空间 Tab 时间点查询；第40轮前 pu-sp-N-M 界面前缀；第33轮前「已上架」文案；**第47轮前「缺省完整叉乘」（∪空对组合）——第48轮改纯叉乘**；第48轮前 glm4 sp2 双11空间/双11计划/多空间 mock；**第49轮前列表两 Tab（在售/禁售 + #listed-tbody/#pending-tbody、「空间维度」「生效起止」合并列、SU Tab 组合列在 fn 之上跨 fn 合并 rowspan、计划空间筛选「全部」选项、全部商品显示折算/SLO Tab、online-text 计划页含库存/折算SLO/payload/购买量区块**。

## 技术约定与部署
- 每页顶部深色「原型导航」栏；后台紫色主色 #7C3AED；管理员「吕」。数据全为页面内 JS mock。
- **部署（Pages legacy 从分支部署）**：gh-pages=HTML 根直出+.nojekyll。流程：推 main → `git worktree add ../tpm-bao-ghpages gh-pages` → rm+cp prototype/*.html → add/commit/push → sleep~105s → curl 验证线上 md5 → `git worktree remove ../tpm-bao-ghpages`。URL：https://alanqh.github.io/tpm-bao/admin-products.html
- **测试（tests/，NODE_PATH=/Users/lqh/.workbuddy/binaries/node/workspace/node_modules，r11/r28/r38 须从仓库根目录跑其余任意）**：28 套全绿（第49轮口径，1119 项）——this-round(31)/r9(26)/r10(51)/r11(30)/r12(39)/r13(37)/r14(49)/r15(39)/r16(29)/r18(28)/r19(39)/r20(68)/r22(35)/r23(33)/r24(16)/r25(47)/r27(32)/r28(31)/r29(45)/r38(42)/r45(40)/r47(45)/r48(32)/r49(47)/smoke-r26(45)/plan-page(78)/data-consistency(30)/su-dim-validate(13)。第49轮断言口径：列表四 tbody（maas-listed 等）；std/pro/pre 各 3/4/3 单元；glm4 sp1=4；空间列表 9 列/计划 Tab 20 列/计划详情 18 列；SU Tab fn 列居次（跨 fn 组合不合并）；计划保存测试时间选档期内远离边界时刻（jsdom 丢秒）。
- **jsdom 踩坑汇总**：runScripts:'dangerously'；confirm/alert 打桩；页面顶层 const 用 window.eval 取；rowspan 合并行 cells 索引偏移（空间级列只首行有，续行同类列同样左移）；勾选联动 dispatchEvent(change,{bubbles:true})；跨商品切换先 backToList()；筛选元素重渲后重查；跑批 >150s 被 SIGKILL(137) 分批跑；保存成功路径无 alert（断言数据变化）；自洽复检算法（r45/r47/r48 末段）须与 genSaleUnitsForSpace 同步（第48轮=纯叉乘无空对）。
- 语法校验：node -e 提取 `<script>` 用 new Function()。修页面后先跑全套找红再逐套改断言。
- 网络偶发 502/remote error：push 失败等 1-2 分钟重试；恢复检测=curl https://github.com。
- 文本批量替换：`/usr/bin/sed -i '' -e 's/旧/新/g'`（macOS -e 多表达式）；zsh 无 timeout 命令。
