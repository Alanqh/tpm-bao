# TPM 保障包项目长期笔记

## 项目概述
硅基流动（SiliconFlow）「预留 vTPM / 在线文本」商品管理前端原型（纯 HTML + Tailwind CDN + 内联 JS mock，静态可部署）。仓库根：`/Users/lqh/Documents/ChatGPT/TPM保障包/`，页面在 `prototype/` 下。已迭代至第22轮（main 88b15aa，全套 15 套 527 项测试全绿）。

## 核心业务概念
- **预留 vTPM 资源包**：按「购买量（万 vTPM step）× 购买周期（天）」售卖，生效期=开始日0点 ~ 开始日+周期+1天。超量路由：超量限流（429）或超量路由 Serverless（交付二选一）。折算系数按三维度（输入长度×cache命中率×输出长度）配 YAML 版本；SLO A类违约按累计违约分钟/月分档赔付。
- **关键实体链**：商品（SKU；状态纯推导第11轮：已上架=存在≥1在售售卖单元）→ 售卖空间（属 function，维度+每维度度量）→ fn 当前空间直配 → 售卖单元（{id,fn,spaceKey,dim,measure}）→ 售卖计划（七字段组 unified/perUnit）→ 手动交付 → 资源包（P001…）→ 监控。创建商品 → 批量创建售卖空间（勾维度+度量）→ 配 fn 当前空间 → 创建售卖单元 → 售卖计划。
- 后台菜单：预留vTPM管理挂「活动运营」；商品管理挂「商品定价中心」。

## 第22轮（现行口径）：售卖空间简化
- **移除空间计划全套**：spacePlans/spacePlanStatuses/defaultSpacePlans/modal-spaceplan/openSpacePlanModal/confirmSpacePlan/publishSpacePlan/stopSpacePlan/effSpaceOfFn 均已删除——暂不考虑 fn 售卖空间的定时上下架。
- **fn→当前售卖空间直配**：defaultFnSpaceMap{code:{fn:spk}}（glm4: input→sp2/output→sp4/cache→sp5；vtpm 三商品: ''→sp1）+ fnSpaceMap 运行时副本；**currentSpaceOfFn(fn)**=显式配置优先 → 未配置回退该 fn 最早空间（seq 升序）；setFnSpace(fn,spk) 受 guardEdit，清空选择=回退。
- **空间模型**：spaces[key]={seq,name:'售卖空间N',fn,dims,measures:{dim:[...]}}——创建时同时确定维度集合与每维度勾选的度量（默认全选）；**维度不可变**（增减维度只能新建空间）；**度量可增减**（编辑度量弹窗，被售卖单元引用的 dim|measure 置灰不可删，每维度至少保留 1 个）；名称序号自增不可自定义；key=sp{seq}，spaceSeq 全局计数器。
- **创建校验**：空间身份=fn+维度集合排序（spaceDefsKeyOf，度量不参与身份）；同 fn 下维度集合相同 → **拦截提交**（alert 指明已存在空间名，提示走编辑度量或新建不同维度空间）；弹窗内多行互相重复同样拦截；跨 fn 可同维度集合。
- **售卖空间 Tab 双区块**：上=#fn-space-cards（每 fn 配置卡：当前空间+下拉配置，未配置显示「回退最早空间」提示；无 fn 商品单卡 fn=''）；下=#space-tbody 空间列表 **6 列**（售卖空间/Function/空间维度/维度:度量（度量集合）/售卖单元数/操作-编辑度量）；顶部=批量创建售卖空间按钮。
- **批量创建弹窗**：多行 .space-row（fn 下拉+维度复选，勾维度→展开该维度度量勾选默认全选，re-render 保留已勾）；空维度/空度量拦截。
- **SU 弹窗**：fn→空间（候选=fn 归属∪已引用兜底，**默认=currentSpaceOfFn**）→维度（=空间 dims）×**度量（=空间配置 measures，非全量）**；pair 级只增不减（confirmedPairs 按 dim|measure 展开置灰，新 pair 可勾追加）；confirmSaleUnits 笛卡尔积保留原 id 替换该 fn+空间组。
- **新增商品弹窗**：无售卖维度区块；提示「创建商品后请先…批量创建售卖空间，再为各 function 配置当前售卖空间」。
- mock：sp1('',购买量+周期)/sp2(input,两token)/sp3(input,输入token)/sp4(output,两token)/sp5(cache,输入token)，度量全选；glm4 su-1/2@sp2、su-3@sp4、su-4@sp5；vtpm→sp1。snapshot 链路透传 {spaces,spaceSeq,fnSpaceMap}。

## 历史轮要点（仍有效）
- **第12轮**：商品与模型/Playground 解耦；基本信息=类型/code/名称三项。
- **第13轮列表页**：按单元状态平铺（已上架 Tab=在售单元、未上架 Tab=禁售单元，同一商品可两 Tab 分裂）；14 列无操作列，SKU 第三列点击 openDetailByCode；列表页第 4 列=Function。
- **第16/18轮计划复制**：三状态均显示「复制」（深拷贝→名称-副本→待发布）；不受状态/编辑锁限制；修改/发布/停用仍受锁。
- **第19/20轮**：fnOfUnit 直接读 u.fn；formatDimMeasure 过滤 function 维度；售卖单元 Tab 15 列（前三列=function rowspan/售卖空间 rowspan/售卖单元，排序 fn→spaceKey→id）；售卖计划 Tab 19 列/计划详情表 17 列；售卖计划区块2 筛选式（plan-filter-fn/space 只隐藏未勾选行，已勾选跨 fn 累积）。
- 早期已废弃：第15~18轮商品售卖维度勾选（productDimSpecs/dims 字段）；第20轮 defaultSpaceByFn/空间自定义名称；**第21轮 空间计划/空间计划单元/effSpaceOfFn（第22轮删除）**；第21轮「空间只选维度」（第22轮改为同时勾度量）。

## 页面地图（prototype/）
- index.html 官网首页 / terms.html 购买须知 / wallet.html 前台充值（packages.html 跳转壳）/ monitor.html + monitor-component.html 前台+共用监控组件（iframe，mode=admin）/ admin-monitor.html 后台监控。
- admin-packages.html 后台预留 vTPM 管理：第14轮手动交付弹窗——subject_id 手动填写；SKU 只列已上架商品；只能交付在售售卖单元（confirmGrant 拦截）；价格=单价×数量。chargeItems/configVersions/payloadModelMap 为 admin-products 镜像数据。
- admin-products.html 见上。

## 商品后台实现要点（admin-products.html）
- **四视图同级切换**：#list-view / #detail-view / #plan-detail-view / #plan-create-view（计划创建/修改独立页面）。
- 详情页 6 个 tab 顺序：**售卖空间（第一个，默认打开；fn 配置卡+空间列表）**→ 售卖单元 → 售卖计划 → 定价计划（占位）→ vTPM 折算系数配置 → SLO 赔付规则配置。
- **unitStatusOf**：时间点取 timeFilter.point（未选=当前）；在售=生效中（published 且 effStart≤now≤effEnd）最高优先级计划 unitStates[uid]≠'off'。mock effStart 已提前至 2026-10-01。
- 计划状态三态：pending_publish 待发布 / published 已发布 / stopped 已停用（售卖计划用；空间计划已删）。
- 售卖计划 schema（planRow）：{name,priority,effStart,effEnd,units,unitStates,chargeCodes/quotaCodes/inventoryCodes,modes{7键},factor|factors,slo|slos,payloadId|payloads,minQty/maxQty/stepQty|qtys}。planFieldVal(r,uid,field)+PLAN_FIELDS 映射。
- **draft 双存**：planDraft{key:{unified,units{}}}；renderPlanCreateSections(skipCollect)——外部写完 draft 重渲必须传 true（第6轮教训）。**含 ${} 模板字符串用 Edit 工具改**（Python 整段替换易失配）。
- 三池：chargeItems（price/unit/currency）+ quotaItems/inventoryItems（qty）；计费项按商品前缀过滤。
- **编辑锁（第10轮）**：editLocks{code}（pro 由张三持锁）；canEdit/guardEdit/startEdit/exitEdit；置灰容器 pointer-events-none+opacity-40；护栏在 publish/stop/editPlanRow/confirmSaleUnits/removeSaleUnit/confirmPlanCreate/setFnSpace/confirmSpaceBulk/confirmSpaceMeasureEdit（复制豁免）。
- **第11轮**：productIsListed 推导；backToList snapshotCurrentProduct 回写；openDetailByCode 统一入口。
- 新增商品弹窗：类型→模型→code/名称自动生成可改；online-text 默认名「模型名 在线文本包」。
- **示例数据自洽**：计划/状态按商品隔离；计费项前缀=商品code；payload 属该商品 playground；折算/SLO 版本在 defaultConfigs。

## 技术约定与部署
- 每页顶部深色「原型导航」栏；后台紫色主色 #7C3AED；管理员「吕」。数据全为页面内 JS mock。
- **部署（Pages legacy 从分支部署，不用 Actions）**：gh-pages 分支=HTML 根目录直出 + .nojekyll（绝不镜像 prototype/ 结构）。流程：推 main → git worktree add gh-pages → 拷 prototype/*.html 到根 → 推送 → sleep~105s → curl 验证线上 → worktree remove。
- **测试（tests/，NODE_PATH=/Users/lqh/.workbuddy/binaries/node/workspace/node_modules）**：15 套 527 项全绿——plan-page(77)/this-round(31)/data-consistency(28)/r9(25)/r10(32)/r11(22)/r13(30)/r14(50)/r15(39)/r16(29)/r18(28)/r19(33)/r20(69)/r21→r22(28)/su-dim-validate(6)。jsdom runScripts:'dangerously'；window.confirm/alert 打桩；页面顶层 const 不挂 window 用 window.eval 取；eval 里函数调用写 fn().length 非 fn.length；详情页售卖单元行因 rowspan 合并须按"任意 cell 匹配"取行；勾选联动须 dispatchEvent(new window.Event('change',{bubbles:true})) 而非只改 checked。
- 语法校验：node -e 提取 `<script>` 用 new Function()。
- 修页面后测试同步：先跑全套找红，逐套按新口径改断言；口径根本性失效时整套重写（r22 即重写 r20/r15）。
- 网络偶发 502（代理 CONNECT tunnel failed）：push 失败等 1-2 分钟重试即可恢复。
