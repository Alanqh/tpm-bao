# TPM 保障包项目长期笔记

## 项目概述
硅基流动（SiliconFlow）「预留 vTPM / 在线文本」商品管理前端原型（纯 HTML + Tailwind CDN + 内联 JS mock，静态可部署）。仓库根：`/Users/lqh/Documents/ChatGPT/TPM保障包/`，页面在 `prototype/` 下。已迭代至第44轮（main f452fd1 / gh-pages 82e6a7c，24 套全绿）。

## 第44轮（现行口径）：fn 与维度度量值分离不嵌套 + mock 符合创建选项
- **弹窗分离式（修正第43轮嵌套）**：区块1「售卖 function」独立复选（#sp-fnspaces，.sp-fn-check 无 onchange）；区块2「维度度量值」全局一份（#sp-dimmeas，.sp-measure-check 只有 data-dim/value 无 data-fn、始终可用不禁用）；onSpFnCheck 联动函数已删（勾/取消 fn 不影响度量）。confirmSpacePlan：勾选 fn 共享同一份 meas 收集（checkedFns 循环赋同值 fnDims/fnMeasures）。
- **mock 全量自检通过**：四商品每个空间按「fnDims/fnMeasures 共享勾选+缺省叉乘」重算与 defaultSaleUnits 完全一致（std 8/pro 9/pre 8/glm4 16）。
- **glm4 sp1 重排**：三 fn 共享输入[128K～1M]+输出[0～4K] → 每 fn 4 组合×3=12（su-1~4 input / su-8~11 output / su-12~15 cache；sp2 su-5/6/7/16 不变）；SU Tab 全缺省段序=cache su-15/input su-4/output su-11；详情清单序 su-4/su-11/su-15 全缺省居首，末行 su-14（cache/输出0～4K）。
- 测试适配：批量删 `.sp-measure-check[data-fn="X"]` 选择器（用 python re 全套替换）；r12/r25 重写「不嵌套/度量始终可用/取消 fn 不清空」断言；r18/r20/r22/r27 共享度量组合数重算（input+output 两度量→每 fn 4）。

## 第43轮（现行口径）：两步创建+缺省完整叉乘+售卖单元三态+计划空间筛选
- **创建售卖空间两步**：①勾 function（.sp-fn-check）②每维度直接勾度量（.sp-measure-check，**.sp-dim-check 维度复选已删**）；勾 fn 启用度量，取消 fn 清空度量；不勾任何 fn 拦截；**未勾度量也可保存**（生成全缺省组合）。
- **缺省完整叉乘（genSaleUnitsForSpace 重写）**：每维度候选=勾选度量∪{缺省空对}，笛卡尔积全组合（**含全缺省**）；如 input 勾输入{0～128K}+输出{0～4K,16K+}→(1+1)×(2+1)=6；每组合×每勾选 fn 各一个售卖单元；组合排序 comboKey（dim+'||'+measure）字典序，组合内按 fnDims 键序（fnPool DOM 序）→id。
- **售卖单元三态（unitStatusOf）**：空间未生效/最高优先级计划 off→禁售红（bg-red-100 text-red-700）；无生效中计划覆盖→未配置灰（bg-slate-100 text-slate-400, unconf:true）；否则在售绿。列表 Tab 在售/禁售=直查（灰计入禁售 Tab 展示）。
- **售卖计划 Tab 空间筛选**：工具条 #plan-filter-space（onchange=onPlanSpaceFilter）；planSpaceFilter(null=未初始化)；syncPlanSpaceFilterOptions 首次定位 effectiveSpaceAtAll(当前时刻)；renderPlan 过滤 r.spaceKey!==fk 跳过；showDetailView 进入商品重置 null。默认 glm4 只显 sp1 计划。
- **SU Tab 列序（组合在 Function 之上）**：售卖空间/维度:度量/Function/售卖单元/状态…共 14 列；排序 spaceKey→comboKey→fn→id；spSpan(空间)>cbSpan(组合)>fnSpan(组合内换 fn 才起新 td)三层 rowspan。全缺省组合 comboKey='' 最小排最前。
- **空间详情页清单排序**：comboKey 字典序→fnDims 键序→id（全缺省三 fn 行居首）。
- **mock 单元重算**：std 8（su-1~3 原两维+su-4~7 单维+su-8 全缺省；su-7 计划 off 演示禁售红）/pro 9/pre 8/glm4 sp1 12+sp2 4（sp2 加 su-16 全缺省）；glm4 常规计划覆盖 sp1 全部 12 单元；std 30/60/90d 计划扩对应缺省单元。
- 踩坑：jsdom 下 switchInnerTab 不重渲表格——timeFilter 改后须显式调 renderSaleUnits()；confirmSpacePlan 成功后弹窗关闭，再来一轮须重新 openSpacePlanModal()；std 首行 su-8（全缺省 --）在售状态正常。

## 第42轮（现行口径）：售卖单元任何时刻（含默认=当前时刻）只显唯一生效空间
- renderSaleUnits 去掉 timeFilter 条件分支：`at = timeFilter.point || 当前时间` → effectiveSpaceAtAll(at) 过滤；空间待发布/无生效 → 空态「当前时刻无生效中的售卖空间」。glm4 默认只显 sp1 4 单元；11-15 只显 sp2 3 单元；r38 语境同优先级后建 sp3 胜出。

## 第41轮（现行口径）：售卖单元 Tab 时间选择即时刷新
- 删「查询」「重置」按钮及 querySaleParams/resetSaleParams 函数；#tf-point 加 onchange=onSaleTimeChange(this.value)——有值→timeFilter={point}，清空→null（默认当前时刻），随后 renderSaleUnits()。timeFilter 消费方零改动。

## 第40轮（现行口径）：列表删空间单元列 + 详情页售卖单元清单 + SU Tab 唯一生效空间过滤
- **售卖空间列表 8 列**：删「空间单元」列（pu-sp-N-M 前缀界面清零），列序=售卖空间/状态/空间名称/Function/空间维度/售卖单元数/优先级/生效起止；空表 colspan=8。
- **空间详情页**：基本信息（code/名称/优先级/生效起止）+「售卖单元」清单表（3 列：售卖单元/Function/维度:度量），每单元一行，按 fnDims 创建序分组、组内 id 字典序。
- **SU Tab 时刻过滤（新 effectiveSpaceAtAll(t)）**：timeFilter.point 存在时只显全局唯一生效空间内单元——候选=published 且档期内全部空间，排序 priority 降序→seq 降序（同优先级后创建优先），无命中空态「该时刻无生效中的售卖空间」。与 effectiveSpaceAt(fn,t)（按 fn 仲裁）语义不同。
- 测试索引左移规律：原 cells[N]（N≥1）左移一位——售卖空间 cells[2]→cells[0]、Function cells[4]→cells[3]、单元数 cells[6]→cells[5]。

## 第39轮（部分被第40轮覆盖）：售卖空间列表纯列表化 + 新排序 + SU Tab 空间层级上调
- **售卖空间 Tab 无时间点查询**：#space-tf-point/#space-tf-tip/querySpaceAt/resetSpaceAt/syncSpaceTfPoint 全删；timeFilter 保留（售卖单元 Tab #tf-point 维护，函数层共用）。
- **列表排序**：空间间=状态→优先级降序→创建时间逆序（seq 降序）；空间内 fn 行=fnDims 键序（创建勾选序）（第40轮已删 pu-sp 编号列）。
- **SU Tab 层级**：售卖空间列在 Function 之上——表头 售卖空间|Function|售卖单元；排序 spaceKey→fn→id；spSpan=同空间全部行（跨 fn 最外层）、fnSpan=空间内同 fn；showFn 判定含 showSpace 短路（新空间必起新 fn td）。

## 第38轮（现行口径核心模型）：售卖空间+空间计划合并为空间聚合根 + 计划锁定空间
- **空间聚合根（重大语义变更）**：`spaces[k] = { seq, name, priority, effStart, effEnd, status(待发布|已发布|已停用), fnDims, fnMeasures }`——空间本体携带档期/优先级/三态/多 fn 配置；独立 spacePlans 实体/renderSpacePlans/editSpacePlan/#inner-tab-spaceplan 全删；售卖空间 Tab 9 列（空间级列 rowspan 按空间合并），pu-sp-N-M = seq + fn 在 fnDims 键序；SU Tab 空间列带三态徽标（按 fn 分段合并）。
- **售卖计划锁定空间**：planRows[i].spaceKey 唯一；创建页区块1 #plan-space-sel（注意 id 非 plan-space-select）必选；confirmPlanCreate 三重校验（必选空间/units 属该空间/时间 ⊆ 空间档期）；切换空间重置勾选（hasPrev 判 data-space）。
- **空间完全不可改**：无修改入口；任何变更=copySpacePlan 复制出待发布新空间（不受锁，深拷贝继承配置+seq 自增+逐 fn 叉乘新单元，原空间单元永不删除）；停用拦截=空间内有生效中的售卖计划（activePlansInSpace）时 alert 拒绝。
- **仲裁**：effectiveSpaceAt(fn,t) = fnDims 含 fn ∧ published ∧ 档期内 → (priority 降序→seq 降序)；返回 {key, source, plan:空间对象}。
- **名称快编**：contenteditable 就地编辑（openDetailNameEdit 点击铅笔后设 true+outline+focus；Enter 保存/Esc 取消/blur 延迟保存）；confirm 写回 currentProduct + allProducts（bug1：不写回则重进被 mock 覆盖）。
- **其余 3 真 bug**：openPlanCreatePage 创建模式须末尾 resetPlanDraft()+renderPlanCreateSections(true)（否则区块3 select null、真实浏览器无法创建）；productIsListed 须同步切换 spaces（unitStatusOf 校验空间档期）；mock 计划 effEnd 须 ⊆ 空间档期（std 60d/90d、pro 90d 收到 2027-11-01）。
- 踩坑：rowspan 续行 cells 不含空间级列（断言按首行或 su-id 分组）；保存成功无 alert（看 planRows 追加）；测试造的空间/计划结尾清理（delete spaces[k]+spaceSeq 复位）；单引号消息嵌 fn='' 断字符串。

## 第37轮（已并入第38轮聚合根模型）：编辑锁移至基本信息下方 + 售卖单元叉乘生成 + name 快编
- **编辑锁移位**：#edit-lock-bar 位于基本信息卡片**之后**、Tab 卡片之前独立行（justify-start 居左）；id 不变，renderEditLockBar 零改动。
- **售卖单元由空间计划叉乘生成**：确认时按「fn→维度→度量」完整叉乘自动生成该空间全部售卖单元（genSaleUnitsForSpace：0 维=唯一单元；幂等去重；' + ' 拼接）。勾维度必须至少勾一个度量；不勾维度=合法 0 维空间。第38轮起 fnDims/fnMeasures 挂在空间本体。
- **SU 链路删除**：#modal-su-confirm、#su-create-btn、全套创建/删除函数删除；SU Tab 纯只读 14 列；refreshEditControls 只管 plan-create-btn/spaceplan-new-btn。
- **基本信息名称快编**：#detail-info-name+铅笔，三函数支持 source('title'/'info')；不依赖编辑锁（第38轮改 contenteditable）。
- 空间弹窗三层勾选（fn→维度卡 [data-dimblock]→度量 [data-dimmeas]），禁用级联；jsdom 下 .sp-fn-check/.sp-dim-check 须 dispatch(change)。

## 第36轮（现行口径）：删解释性文案 + 编辑锁移位 + 商品名快编
- **解释性文案清理（约 30 处）**：各详情/创建页副标题 p、区块标题括注、弹窗 p 提示、title 悬停说明、下拉选项括注全删；空表提示精简。保留：mock 业务名括号、编辑锁徽标人名、—（不区分 function）、--（0 维度）等信息性内容。
- **编辑锁移位**：#edit-lock-bar 移至基本信息卡片之前独立行（第37轮修正为之后）；id 不变，renderEditLockBar 零改动。
- **商品名称快编**：标题旁铅笔按钮 → 行内输入+保存/取消（openDetailNameEdit/closeDetailNameEdit/confirmDetailNameEdit）；更新 currentProduct.name+标题+基本信息卡片；showDetailView 进入复位；不依赖编辑锁。

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
- 关键实体链：商品 → 售卖空间（属 function，只管维度+度量）→ fn 生效空间（纯空间计划仲裁）→ 售卖单元（第37轮起=空间计划确认时按维度×度量叉乘自动生成，永不删除）→ 售卖计划（七字段组）→ 空间计划 → 手动交付 → 资源包 → 监控。
- 后台菜单：预留vTPM管理挂「活动运营」；商品管理挂「商品定价中心」。

## 历史轮要点（仍有效）
- 第12轮：商品与模型/Playground 解耦。第13轮：列表页按单元状态平铺两 Tab（第33轮起=在售/禁售）。第11轮 productIsListed 推导（第33轮起不驱动 UI）。
- 第16/18轮计划复制：三态均可复制（深拷贝→-副本→待发布）不受锁，copySpacePlan 继承。
- 第19/20轮：售卖单元 Tab ~~15 列~~（第37轮起 14 列纯只读；fn/空间 rowspan 保留）；售卖计划 Tab 19 列/详情表 17 列。
- 已废弃：……第37轮前编辑锁在基本信息上方/手动 SU 创建弹窗与创建按钮/售卖单元删除链路/SU Tab 操作列；第38轮前独立空间计划实体（spacePlans/renderSpacePlans/#inner-tab-spaceplan/editSpacePlan 修改链路）/计划跨空间勾选单元/空间无名称（sp35~37 轮）/行内输入条式名称快编；第39轮前售卖空间 Tab 时间点查询（space-tf-*/querySpaceAt/resetSpaceAt/syncSpaceTfPoint）/列表排序 effStart 降序+fn 字典序/SU Tab Function 在空间之上的层级。

## 页面地图（prototype/）
- index.html 官网首页 / terms.html 购买须知 / wallet.html 前台充值（packages.html 跳转壳）/ monitor.html+monitor-component.html 前台+共用监控组件 / admin-monitor.html 后台监控。
- admin-packages.html 后台预留 vTPM 管理（第14轮手动交付弹窗；只能交付在售售卖单元）。
- admin-products.html 商品管理后台（主战场）。

## 商品后台实现要点（admin-products.html）
- **五视图同级切换**：#list-view / #detail-view / #plan-detail-view / #spaceplan-detail-view / #plan-create-view。
- 详情页 6 个 tab（第38轮合并）：售卖空间（默认，含原空间计划）→售卖单元→售卖计划→定价计划（占位）→折算→SLO。
- unitStatusOf：时间点取 timeFilter.point（未选=当前）；在售=空间+计划双发布且档期内，最高优先级计划 unitStates[uid]≠'off'；productIsListed 须同步切换 spaces。
- 空间/计划共用三态：pending_publish/published/stopped（planStatusMeta）。
- planRow schema：{name,spaceKey,priority,effStart,effEnd,units,unitStates,chargeCodes/quotaCodes/inventoryCodes,modes{7键},factor|factors,slo|slos,payloadId|payloads,minQty/maxQty/stepQty|qtys}；planFieldVal+PLAN_FIELDS 映射。
- draft 双存 planDraft{key:{unified,units{}}}；renderPlanCreateSections(skipCollect)——外部写完 draft 重渲必须传 true；openPlanCreatePage 末尾 resetPlanDraft()+renderPlanCreateSections(true)（勿删，否则区块3空）。**含 ${} 模板字符串用 Edit 工具改**。
- **编辑锁（第10轮）**：editLocks{code}（pro 由张三持锁）；canEdit/guardEdit/startEdit/exitEdit；护栏在 publish/stop/publishPlanRow/stopPlanRow/editPlanRow/confirmPlanCreate/confirmSpacePlan（复制豁免）。
- backToList snapshotCurrentProduct 回写；openDetailByCode 统一入口。示例数据自洽：计划/空间/状态按商品隔离；计费项前缀=商品code；mock 计划档期 ⊆ 空间档期。

## 技术约定与部署
- 每页顶部深色「原型导航」栏；后台紫色主色 #7C3AED；管理员「吕」。数据全为页面内 JS mock。
- **部署（Pages legacy 从分支部署）**：gh-pages 分支=HTML 根直出+.nojekyll。流程：推 main → git worktree add gh-pages → rm+cp prototype/*.html → 推送 → sleep~105s → curl 验证线上 → worktree remove。URL：https://alanqh.github.io/tpm-bao/admin-products.html
- **测试（tests/，NODE_PATH=/Users/lqh/.workbuddy/binaries/node/workspace/node_modules）**：24 套全绿（第44轮口径）——this-round(31)/r38(39)/smoke-r26(46)/plan-page(78)/data-consistency(29)/su-dim-validate(13)/r9(26)/r10(51)/r11(19)/r12(38)/r13(32)/r14(50)/r15(38)/r16(29)/r18(27)/r19(38)/r20(69)/r22(33)/r23(34)/r24(18)/r25(49)/r27(33)/r28(33)/r29(45)。第44轮适配要点：.sp-measure-check 选择器一律无 data-fn；弹窗断言「fn 区块内无度量/度量区块内无 fn/度量始终可用」；多 fn 共享度量组合数=每 fn (n₁+1)×(n₂+1)…；glm4 SU 全缺省段=su-15/su-4/su-11（fn 序=fnDims 键序）。
- **jsdom 踩坑汇总**：runScripts:'dangerously'；confirm/alert 打桩；页面顶层 const 用 window.eval 取；rowspan 合并行按"任意 cell 匹配"取行、cells 索引偏移（第38轮：空间级列只首行有，续行 cells 少）；勾选联动须 dispatchEvent(change,{bubbles:true})；跨商品切换先 backToList()；筛选测试元素引用重渲后重查；**jsdom 跑批 >150s 被 SIGKILL(137) 分批跑**；断言 beware 计划名含空间名子串；测试造的空间/计划结尾清理（delete+游标复位）；保存成功路径无 alert（断言数据变化）。
- 语法校验：node -e 提取 `<script>` 用 new Function()。修页面后先跑全套找红再逐套改断言。
- 网络偶发 502：push 失败等 1-2 分钟重试；恢复检测=curl https://github.com
