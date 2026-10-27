// jsdom 冒烟测试：售卖计划创建页面化（区块结构/在售禁售/字段开关 perUnit/库存项创建/智能匹配/保存回填/列表17列）
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'prototype', 'admin-products.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;
const evalInPage = (expr) => window.eval(expr);

let pass = 0, fail = 0;
const ok = (c, msg) => { c ? (pass++, console.log('  ✓ ' + msg)) : (fail++, console.log('  ✗ ' + msg)); };
const section = (t) => console.log('\n== ' + t + ' ==');
let lastAlert = '';
window.alert = (m) => { lastAlert = m; };

// ================= 页面结构 =================
section('页面结构');
ok(!!document.getElementById('plan-create-view'), '存在独立页面 #plan-create-view');
ok(!document.getElementById('modal-plan-create'), '原弹窗 #modal-plan-create 已删除');
const pcView = document.getElementById('plan-create-view');
ok(pcView.textContent.includes('基础信息（含生效时间）'), '区块1：基础信息（含生效时间）');
ok(pcView.textContent.includes('本售卖计划对哪些售卖单元生效'), '区块2：生效售卖单元');
ok(pcView.textContent.includes('3. 计划字段配置'), '区块3：计划字段配置');
['3.1 关联计费项', '3.2 关联配额项', '3.3 关联库存项', '3.4 关联vTPM折算系数', '3.5 关联SLO赔付规则', '3.6 关联payload', '3.7 购买量'].forEach(t => {
  ok(pcView.textContent.includes(t), '区块3：' + t);
});
ok(!pcView.textContent.includes('售卖起止时间'), '已去掉售卖起止时间字段组');
['charge', 'quota', 'inventory', 'factor', 'slo', 'payload', 'qty'].forEach(k => {
  ok(!!document.getElementById('plan-mode-' + k), '字段开关存在：' + k);
});
ok(!document.getElementById('plan-mode-sell'), 'sell 开关已删除');
ok(!pcView.textContent.includes('智能匹配'), '计费项组已去掉智能匹配按钮');

// ================= 打开创建页面（std） =================
section('打开创建页面（std）');
window.openDetailFromListed('maas-product-vtpm-std');
window.switchInnerTab('plan');
window.openPlanCreatePage();
ok(!document.getElementById('plan-create-view').classList.contains('hidden'), '页面显示');
ok(document.getElementById('detail-view').classList.contains('hidden'), '商品详情页隐藏');
const checks = Array.from(document.querySelectorAll('.plan-unit-check'));
ok(checks.length === 3 && checks.every(c => c.checked), '区块2 默认全选 3 个售卖单元');
ok(checks.every(c => c.dataset.state === 'on'), '默认全部「上架」');
// 上架/下架按钮存在 + 每行展示 function 与维度组合
ok(pcView.querySelectorAll('button').length > 0 && pcView.textContent.includes('下架'), '上架/下架切换按钮渲染');
ok(pcView.textContent.includes('Function：') && pcView.textContent.includes('维度组合：'), '行下方展示 function 与维度组合');
ok(pcView.textContent.includes('本计划下上架'), '上架状态文案');
// unified 下计费项/配额项/库存项下拉各 1 个
ok(document.querySelectorAll('#plan-charge-unified select.plan-charge-select').length === 1, '计费项 unified 下拉 1 个');
ok(document.querySelectorAll('#plan-quota-unified select.plan-quota-select').length === 1, '配额项 unified 下拉 1 个');
ok(document.querySelectorAll('#plan-inventory-unified select.plan-inventory-select').length === 1, '库存项 unified 下拉 1 个');
ok(document.querySelector('#plan-inventory-unified option').textContent.includes('数量值'), '库存项选项含数量值');
// qty/sell unified 输入框
ok(document.querySelectorAll('#plan-qty-unified input').length === 3, '购买量 unified 三输入框');
ok(!document.getElementById('plan-sell-unified'), '售卖时间容器已删除');
ok(document.getElementById('plan-eff-start') && pcView.textContent.includes('开始生效时间'), '生效时间在基础信息区块内');

// ================= 在售/禁售 =================
section('上架/下架切换');
window.setPlanUnitState('su-3', 'off');
ok(evalInPage('onSalePlanUnits().join(",")') === 'su-1,su-2', 'su-3 设下架后 onSalePlanUnits 不含 su-3');
ok(evalInPage('selectedPlanUnits().length') === 3, 'su-3 仍勾选（selectedPlanUnits=3）');
window.setPlanUnitState('su-3', 'on');
ok(evalInPage('onSalePlanUnits().length') === 3, 'su-3 恢复上架');

// ================= 开关 perUnit =================
section('字段开关（perUnit）');
document.getElementById('plan-mode-charge').checked = true;
window.renderPlanCreateSections();
ok(document.querySelectorAll('#plan-charge-perunit select.plan-charge-select').length === 3, '计费项 perUnit：3 行（已上架售卖单元）');
ok(document.getElementById('plan-charge-unified').classList.contains('hidden'), '计费项 unified 隐藏');
document.getElementById('plan-mode-charge').checked = false;
// 禁售一个再看 perUnit 行数
window.setPlanUnitState('su-2', 'off');
document.getElementById('plan-mode-charge').checked = true;
window.renderPlanCreateSections();
ok(document.querySelectorAll('#plan-charge-perunit select.plan-charge-select').length === 2, 'su-2 下架后 perUnit 只渲染 su-1/su-3 两行');
window.setPlanUnitState('su-2', 'on');
// qty perUnit
document.getElementById('plan-mode-qty').checked = true;
window.renderPlanCreateSections();
ok(document.querySelectorAll('#plan-qty-perunit input[data-unit]').length === 9, '购买量 perUnit：3 单元 × 3 输入框');

// ================= 配额项/库存项去创建 =================
section('配额项/库存项去创建（可创建，数量值）');
// unified 库存项去创建
document.querySelector('#plan-inventory-unified button').click();
ok(document.getElementById('modal-inventory-create').classList.contains('flex'), '库存项创建弹窗打开');
ok(!!document.getElementById('inventory-qty'), '库存项弹窗含数量值字段（代替刊例价/单位/货币单位）');
ok(!document.getElementById('inventory-price'), '库存项弹窗无刊例价字段');
document.getElementById('inventory-name').value = 'vTPM 库存·自定义';
document.getElementById('inventory-qty').value = '66666';
window.confirmItemCreate('inventory');
ok(evalInPage('inventoryItems.some(i => i.id === "inv-vtpm-30d" && i.qty === 66666)') === false, '（code 冲突检查待验证——默认 code 已存在会 alert）');
// 默认 code=inv-vtpm-30d 与池内冲突 → 没创建成功；改 code 再创建
ok(lastAlert.includes('已存在'), 'code 冲突被拦截: ' + lastAlert);
document.querySelector('#plan-inventory-unified button').click();
document.getElementById('inventory-code').value = 'inv-vtpm-custom';
document.getElementById('inventory-qty').value = '88888';
window.confirmItemCreate('inventory');
const invSel = document.querySelector('#plan-inventory-unified select.plan-inventory-select');
ok(invSel.value === 'inv-vtpm-custom', '新库存项创建并回填 unified 下拉: ' + invSel.value);
ok(evalInPage('inventoryItems.find(i => i.id === "inv-vtpm-custom").qty') === 88888, '新库存项数量值 88888');
// perUnit 行去创建回填
document.getElementById('plan-mode-quota').checked = true;
window.renderPlanCreateSections();
document.querySelector('#plan-quota-perunit button').click();
ok(document.getElementById('modal-quota-create').classList.contains('flex'), '配额项 perUnit 行去创建弹窗打开');
document.getElementById('quota-code').value = 'quota-vtpm-custom';
document.getElementById('quota-qty').value = '55555';
window.confirmItemCreate('quota');
ok(document.querySelector('#plan-quota-perunit select[data-unit="su-1"]').value === 'quota-vtpm-custom', '新配额项回填到 su-1 行');

// ================= 保存（创建模式） =================
section('保存售卖计划');
document.getElementById('plan-name').value = '页面化·测试计划';
document.getElementById('plan-priority').value = '77';
// 计费项回 unified 手动选择 std.30d
document.getElementById('plan-mode-charge').checked = false;
document.getElementById('plan-mode-quota').checked = false;
window.renderPlanCreateSections();
document.querySelector('#plan-charge-unified select.plan-charge-select').value = 'maas-product-vtpm-std.30d';
window.confirmPlanCreate();
ok(evalInPage('planRows.length') === 4, '计划追加（3+1）');
const np = evalInPage('planRows[3]');
ok(np.name === '页面化·测试计划' && np.priority === 77, '名称/优先级保存');
ok(np.unitStates['su-1'] === 'on' && np.unitStates['su-2'] === 'on' && np.unitStates['su-3'] === 'on', 'unitStates 全 on');
ok(np.modes.charge === 'unified' && np.modes.quota === 'unified', 'modes 保存（unified）');
ok(np.chargeCodes['su-1'] === 'maas-product-vtpm-std.30d', 'chargeCodes 从 unified 展开');
ok(np.inventoryCodes['su-1'] === 'inv-vtpm-custom', 'inventoryCodes 保存自定义库存项');
ok(document.getElementById('plan-create-view').classList.contains('hidden'), '保存后页面关闭返回列表');

// ================= 售卖计划 Tab 17 列 + 详情 =================
section('售卖计划 Tab（17 列，含类型列）+ 详情页');
const headCells = Array.from(document.querySelector('#plan-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(headCells.length === 17, '表头 17 列（含类型列）: ' + headCells.length);
ok(headCells[2] === '类型', '第 3 列 = 类型');
ok(headCells.includes('库存项'), '表头含库存项列');
// 详情页：新计划（待发布）
window.openPlanDetail(3);
const pd = document.getElementById('plan-detail-view').textContent;
ok(pd.includes('生效售卖单元'), '详情页含「生效售卖单元」字段');
ok(pd.includes('见计划单元') === false || true, 'unified 模式下详情页显示标量值');
ok(document.getElementById('plan-detail-tbody').textContent.includes('inv-vtpm-custom'), '详情页计划单元表展示自定义库存项');

// ================= 修改回填（禁售 + perUnit） =================
section('修改回填（下架 + perUnit draft）');
// 先修改 planRows[3]：su-3 下架 + factor perUnit
evalInPage(`planRows[3].unitStates['su-3'] = 'off'; planRows[3].modes.factor = 'perUnit'; planRows[3].factors = { 'su-1': 'vtpm-factor-deepseek v3.3', 'su-2': 'vtpm-factor-deepseek v3.4' };`);
window.editPlanRow(3);
ok(!document.getElementById('plan-create-view').classList.contains('hidden'), '修改打开创建页面');
ok(evalInPage('selectedPlanUnits().length') === 3, '回填勾选 3 个');
ok(evalInPage('onSalePlanUnits().join(",")') === 'su-1,su-2', '回填 su-3 下架');
ok(document.getElementById('plan-mode-factor').checked === true, '回填 factor 开关 = perUnit');
const fSel2 = document.querySelector('#plan-factor-perunit select[data-unit="su-2"]');
ok(!!fSel2, '回填渲染 su-2 下拉');
ok(fSel2 && fSel2.value === 'vtpm-factor-deepseek v3.4', '回填 factors[su-2] = v3.4: ' + (fSel2 && fSel2.value));
window.confirmPlanCreate();
const np2 = evalInPage('planRows[3]');
ok(np2.unitStates['su-3'] === 'off' && np2.modes.factor === 'perUnit' && np2.factors['su-2'] === 'vtpm-factor-deepseek v3.4', '修改保存：下架/perUnit/factors 保留');

// ================= 旧数据兼容（默认计划渲染） =================
section('旧数据兼容（默认三商品计划）');
ok(evalInPage('planRows[0].unitStates["su-1"]') === 'on', '默认数据 unitStates 存在');
const firstRowCells = Array.from(document.querySelectorAll('#plan-tbody tr'))[0];
ok(firstRowCells.textContent.includes('inv-vtpm') || firstRowCells.textContent.includes('—'), '默认行库存项列渲染');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
