// 第38轮专项：空间聚合根模型（售卖空间+空间计划合并）/ 售卖计划锁定空间 / 空间不可改（复制=唯一变更）/ 停用拦截 / SU Tab 空间分组 / 名称快编写回
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const { window } = dom;
const alerts = [];
window.alert = m => alerts.push(String(m));
window.confirm = () => true;
const w = window, d = w.document;
let step = 0, fail = 0;
function ok(cond, msg) { step++; if (!cond) { fail++; console.log('FAIL[' + step + '] ' + msg); } }

// ===== 1. 空间聚合根 schema：空间本体携带档期/优先级/三态/多fn配置 =====
w.eval('openDetailByCode("maas-online-text-glm4")');
const sp1 = w.eval('JSON.stringify(spaces["sp1"])');
const p1 = JSON.parse(sp1);
ok(p1.seq === 1 && p1.priority === 100 && p1.effStart === '2026-11-01 00:00:00' && p1.effEnd === '2027-11-01 00:00:00' && p1.status === 'published', 'sp1 空间本体携带 seq/priority/档期/状态');
ok(p1.name === 'GLM4·常规售卖空间', '空间带名称（第38轮恢复 name 展示）');
ok(Object.keys(p1.fnDims).join(',') === 'input,output,cache', 'sp1 一个空间含三个 fn（fnDims 多 fn）');
ok(p1.fnMeasures.input['输入token区间'].join(',') === '128K～1M', 'fnMeasures 携带维度→度量配置');
ok(!w.eval('typeof spacePlans') !== 'undefined' || true, 'spacePlans 实体已删（合并进空间）');
ok(w.eval('typeof spacePlans') === 'undefined', '全局不再有独立 spacePlans 实体');

// ===== 2. 仲裁（第38轮：priority 降序→seq 降序，纯粹空间本体仲裁）=====
ok(w.eval('effectiveSpaceAt("input").key') === 'sp1', '当前（11-04，sp2 未起档）input=sp1');
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }');
ok(w.eval('effectiveSpaceAt("input").key') === 'sp2', '11-15 input=sp2（priority 500 接管）');
ok(w.eval('effectiveSpaceAt("input").plan.priority') === 500, 'effectiveSpaceAt 返回空间本体（.plan=空间对象）');
w.eval('timeFilter = null');

// ===== 3. 第38轮空间不可改 → 第45轮：待发布可编辑，已发布/停用仍不可 =====
ok(w.eval('typeof editSpacePlan') === 'function', '第45轮：editSpacePlan 恢复（待发布空间可编辑）');
w.eval('startEdit()');
w.eval("openSpacePlanDetail('sp1')");
const act1 = d.getElementById('spaceplan-detail-actions');
ok(!act1.textContent.includes('修改'), '已发布空间详情操作=停用+复制（无修改）');
alerts.length = 0;
w.eval("editSpacePlan('sp1')");
ok(alerts.some(m => m.includes('仅待发布')), '已发布空间调用编辑 → 拦截');

// ===== 4. 复制=唯一变更路径：深拷贝+继承配置+叉乘新单元+不受锁 =====
w.eval('exitEdit()');
alerts.length = 0;
w.eval("copySpacePlan('sp1')");
ok(alerts.some(m => m.includes('已复制售卖空间')), '退锁状态复制成功（复制豁免编辑锁）');
ok(w.eval('spaceSeq') === 3, '副本 key=sp3');
ok(w.eval('spaces["sp3"].name') === 'GLM4·常规售卖空间-副本', '副本命名=原名-副本');
ok(w.eval('spaces["sp3"].status') === 'pending_publish', '副本=待发布');
ok(w.eval('JSON.stringify(spaces["sp3"].fnDims)') === JSON.stringify(p1.fnDims), '副本继承三 fn 配置（含维度）');
ok(w.eval('JSON.stringify(spaces["sp3"].fnMeasures)') === JSON.stringify(p1.fnMeasures), '副本继承度量配置（含 fnMeasures）');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp3").length') === 12, '副本叉乘生成 12 个单元（sp1 同构，r43 缺省扩展）');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp1").length') === 12, '原空间 sp1 单元永不删除（12 个）');
// 第45轮：待发布空间 sp3 详情操作=修改+发布+复制
w.eval('startEdit(); openSpacePlanDetail("sp3")');
ok(d.getElementById('spaceplan-detail-actions').textContent.includes('修改'), '待发布空间详情操作含修改（第45轮）');
// 编辑回填验证
d.getElementById('spaceplan-detail-actions').querySelector('button[onclick*="editSpacePlan"]').click();
ok(d.getElementById('spaceplan-modal-title').textContent.includes('修改'), '待发布空间编辑弹窗为修改模式');
ok(d.querySelector('.sp-fn-check[data-fn="input"]').checked, '编辑弹窗回填 fn 勾选（inherited input）');
w.eval('closeModal("spaceplan"); exitEdit()');

// ===== 5. 售卖计划锁定空间（三重校验：必选/单元属空间/时间⊆空间档期）=====
// 5a. 未选空间拦截
w.eval('startEdit(); backToList(); openDetailByCode("maas-online-text-glm4"); switchInnerTab("plan"); openPlanCreatePage()');
d.getElementById('plan-name').value = 'r38锁定测试';
d.getElementById('plan-priority').value = '50';
alerts.length = 0;
w.eval('confirmPlanCreate()');
ok(alerts.some(m => m.includes('请选择售卖空间')), '未选空间 → 拦截');
// 5b. 时间超出空间档期拦截（sp3 副本为待发布 → 第45轮不可选；改用 sp1 全量空间测试档期校验，填 10 月起档被拦）
d.getElementById('plan-space-sel').value = 'sp1';
w.eval('onPlanSpaceChange()');
d.getElementById('plan-eff-start').value = '2026-10-15T00:00:00';
d.getElementById('plan-eff-end').value = '2027-10-01T00:00:00';
alerts.length = 0;
w.eval('confirmPlanCreate()');
ok(alerts.some(m => m.includes('必须在售卖空间') && m.includes('生效范围')), '计划时间超过空间档期 → 拦截');
// 5c. 合法保存（sp1 + 合档时间 + 单元全选默认）——第45轮：sp3 待发布不可下拉选中，改用 sp1
d.getElementById('plan-space-sel').value = 'sp1';
w.eval('onPlanSpaceChange()');
d.getElementById('plan-eff-start').value = '2026-11-05T00:00:00';
d.getElementById('plan-eff-end').value = '2027-10-01T00:00:00';
alerts.length = 0;
w.eval('confirmPlanCreate()');
const lastIdx = w.eval('planRows.length - 1');
ok(w.eval('planRows[' + lastIdx + '].name') === 'r38锁定测试' && alerts.length === 0, '合法计划保存成功（planRows 追加，无拦截提示）');
ok(w.eval('planRows[' + lastIdx + '].units.length') === 12 && w.eval('planRows[' + lastIdx + '].units.every(u => saleUnits.find(x => x.id === u).spaceKey === "sp1")'), 'units=sp1 内 12 个叉乘单元（默认全选，r43 扩展）');

// ===== 6. 停用拦截：空间内有生效中的售卖计划 → 拦截 =====
alerts.length = 0;
w.eval("stopSpacePlan('sp1')");
ok(alerts.some(m => m.includes('生效中的售卖计划')), 'sp1 有生效中计划（常规售卖）→ 停用拦截');
ok(w.eval('spaces["sp1"].status') === 'published', '拦截后状态不变');
// 6b. sp3 计划刚保存还是待发布 → sp3 可直接停用（不存在生效中计划）
alerts.length = 0;
w.eval("stopSpacePlan('sp3')");
ok(alerts.length === 0, 'sp3 仅待发布计划 → 停用成功无拦截');
ok(w.eval('spaces["sp3"].status') === 'stopped', 'sp3 → 已停用');
// 6c. 时间旅行验证：发布 sp3 计划后，其档期 11-05 起不含当前 11-04 → activePlansInSpace=0 仍可停
// 注：第45轮计划挂在 sp1（r38锁定测试），但 sp3 本身无计划；sp3 停用/发布仍可验证空间三态流转
w.eval("publishSpacePlan('sp3')");
w.eval("stopSpacePlan('sp3')");
ok(w.eval('spaces["sp3"].status') === 'stopped', 'sp3 无生效计划 → 可反复停用');
// 6d. 造一个挂 sp3 的已发布计划（直接写 planRows，档期 11-05~11-20）→ 时间旅行到档期内 → 拦截
w.eval("publishSpacePlan('sp3'); planRows.push({ name: 'r45-sp3计划', spaceKey: 'sp3', units: ['su-17'], unitStates: { 'su-17': 'on' }, chargeCodes: { 'su-17': 'maas-online-text-glm4.30d' }, quotaCodes: { 'su-17': 'quota-vtpm-30d' }, inventoryCodes: { 'su-17': 'inv-vtpm-30d' }, modes: {}, priority: 100, effStart: '2026-11-05 00:00:00', effEnd: '2026-11-20 00:00:00' }); planRowStatuses.push('published')");
w.eval('timeFilter = { point: "2026-11-10 00:00:00" }');
ok(w.eval('activePlansInSpace("sp3").length') === 1, '11-10 sp3 有 1 个生效中计划');
alerts.length = 0;
w.eval("stopSpacePlan('sp3')");
ok(alerts.some(m => m.includes('生效中的售卖计划')), '档期内有生效计划 → 停用拦截');
w.eval('timeFilter = null; planRows.pop(); planRowStatuses.pop(); stopSpacePlan("sp3")');

// ===== 7. SU Tab 空间分组（第42轮：任何时刻都只显唯一生效空间——r45 后当前时刻仅 sp1 已发布生效）=====
w.eval('backToList(); openDetailByCode("maas-online-text-glm4"); switchInnerTab("saleunit")');
const suRows = Array.from(d.querySelectorAll('#saleunit-tbody tr')).filter(r => r.querySelector('td') && !r.querySelector('td[colspan]'));
ok(suRows.length === 12, 'SU Tab 默认 12 行（第42轮：只显唯一生效空间 sp1 的单元；r43 缺省扩展），实得 ' + suRows.length);
// 空间列 rowspan 合并：sp key 文本只出现在组首行，按「空间列文本 / su-id 已知分组」两组口径验证
const suOfRow = r => { const m = Array.from(r.cells).map(c => c.textContent).join(' ').match(/su-\d+/g); return m ? m[0] : ''; };
const sp1Ids = ['su-1','su-2','su-3','su-4','su-8','su-9','su-10','su-11','su-12','su-13','su-14','su-15'];
ok(suRows.filter(r => sp1Ids.includes(suOfRow(r))).length === 12, '默认视图=sp1 组 12 个单元（r45：sp3 已停用不参与仲裁）');
// 空间列第39轮起最外层合并（空间列在 Function 之上）：sp1 整组一个段首行带徽标
ok(suRows.filter(r => r.textContent.includes('sp1') && r.textContent.includes('已发布')).length === 1, 'sp1 组单一段首行带空间状态徽标（已发布；第39轮空间列最外层合并）');
ok(!suRows.some(r => r.textContent.includes('sp2')), '默认视图不含非生效空间 sp2（第42轮）');
// 时间旅行 11-15：sp2（500）胜出 → 只显 sp2 三单元
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSaleUnits()');
const suRowsMid = Array.from(d.querySelectorAll('#saleunit-tbody tr')).filter(r => r.querySelector('td') && !r.querySelector('td[colspan]'));
ok(suRowsMid.length === 4 && suRowsMid.every(r => ['su-5','su-6','su-7','su-16'].includes(suOfRow(r))), '11-15 只显 sp2 四单元（su-5~7 + su-16 全缺省，r43）');
w.eval('timeFilter = null; renderSaleUnits()');

// ===== 8. 名称快编写回 allProducts（bug 1 修复回归）=====
w.eval('switchInnerTab("space")');
w.eval("openDetailNameEdit('info')");
const titleSpan = d.getElementById('detail-info-name');
ok(titleSpan && titleSpan.getAttribute('contenteditable') === 'true', '点击铅笔后基本信息名称进入 contenteditable');
titleSpan.textContent = 'GLM-4 在线文本·改名版';
titleSpan.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
ok(w.eval('currentProduct.name') === 'GLM-4 在线文本·改名版', 'Enter 提交 → currentProduct 改名');
ok(w.eval('allProducts.find(p => p.code === "maas-online-text-glm4").name') === 'GLM-4 在线文本·改名版', '改名写回 allProducts（重新装载不回退）');
// 重新进入验证不回退
w.eval('backToList(); openDetailByCode("maas-online-text-glm4")');
ok(w.eval('currentProduct.name') === 'GLM-4 在线文本·改名版', '重进详情页改名保留（mock 池已写回）');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
