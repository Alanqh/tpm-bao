// jsdom 行为测试：本轮改动——弹窗配额项下拉入行 / 按周期智能匹配 / 全选切换 / 状态第2列 / 配额项一一对应 / 重编号1-13
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

// 屏蔽 alert
let lastAlert = '';
window.alert = (m) => { lastAlert = m; };

// ================= 弹窗重编号 1-13 / 占位配额项删除 =================
section('弹窗结构（重编号 1-13，删占位配额项）');
ok(!document.getElementById('plan-quota'), '原占位 #plan-quota 已删除');
const labels = Array.from(document.querySelectorAll('#modal-plan-create label.form-label')).map(l => l.textContent.trim());
ok(labels.length === 13, '字段共 13 个: ' + labels.length);
ok(labels[0].startsWith('1.'), '第 1 项 = 名称');
ok(labels[1].startsWith('2.') && labels[1].includes('计费项/配额项'), '第 2 项 = 关联售卖单元及各自计费项/配额项');
ok(labels[2].startsWith('3.') && labels[2].includes('折算系数'), '第 3 项 = 折算系数');
ok(labels[11].startsWith('12.') && labels[11].includes('开始生效'), '第 12 项 = 生效开始');
ok(labels[12].startsWith('13.') && labels[12].includes('结束生效'), '第 13 项 = 生效结束');
ok(!!document.querySelector('#modal-plan-create .bg-white.max-w-3xl'), '弹窗已加宽 max-w-3xl');
const modalHtml = document.getElementById('modal-plan-create').innerHTML;
ok(modalHtml.includes('smartMatchCharges()'), '存在「按周期智能匹配」按钮');
ok(modalHtml.includes('toggleAllPlanUnits()'), '存在「全选/全不选」按钮');

// ================= 弹窗：每行配额项下拉 + 默认全选 =================
section('合并区块：配额项下拉入行（std 商品）');
window.openDetailFromListed('maas-product-vtpm-std');
window.switchInnerTab('plan');
window.openPlanCreateModal();
const box = document.getElementById('plan-units-charge-container');
const checks = Array.from(box.querySelectorAll('.plan-unit-check'));
const chargeSels = Array.from(box.querySelectorAll('select.plan-charge-select'));
const quotaSels = Array.from(box.querySelectorAll('select.plan-quota-select'));
ok(checks.length === 3 && checks.every(c => c.checked), '默认全选 3 个售卖单元');
ok(chargeSels.length === 3, '每行各 1 个计费项下拉');
ok(quotaSels.length === 3, '每行各 1 个配额项下拉（与售卖单元一一对应）');
const quotaOptions = quotaSels[0].querySelectorAll('option').length;
ok(quotaOptions === 3, '配额项下拉含 3 个选项（30d/60d/90d）');
ok(chargeSels.every(s => !s.disabled) && quotaSels.every(s => !s.disabled), '选中行下拉可用');

// 取消勾选 → 该行两个下拉禁用 + 半透明
checks[0].checked = false;
window.renderPlanUnitsCharge();
const checks2 = Array.from(document.querySelectorAll('#plan-units-charge-container .plan-unit-check'));
const chargeSel0 = document.querySelector('#plan-units-charge-container select.plan-charge-select[data-unit="su-1"]');
const quotaSel0 = document.querySelector('#plan-units-charge-container select.plan-quota-select[data-unit="su-1"]');
ok(!checks2[0].checked, 'su-1 取消勾选生效');
ok(chargeSel0.disabled && quotaSel0.disabled, '取消勾选行：计费项/配额项下拉均禁用');

// 重渲保留：重新勾选 su-1，改选 su-2 的配额项为 90d，重渲后保留
checks2[0].checked = true;
window.renderPlanUnitsCharge();
const quotaSel2 = document.querySelector('#plan-units-charge-container select.plan-quota-select[data-unit="su-2"]');
quotaSel2.value = 'quota-vtpm-90d';
window.renderPlanUnitsCharge();
const quotaSel2b = document.querySelector('#plan-units-charge-container select.plan-quota-select[data-unit="su-2"]');
ok(quotaSel2b.value === 'quota-vtpm-90d', '重渲后配额项选择被保留（quota-vtpm-90d）');
const chargeSel2b = document.querySelector('#plan-units-charge-container select.plan-charge-select[data-unit="su-2"]');
const chargeBefore = chargeSel2b.value;
chargeSel2b.value = 'maas-product-vtpm-std.90d';
window.renderPlanUnitsCharge();
const chargeSel2c = document.querySelector('#plan-units-charge-container select.plan-charge-select[data-unit="su-2"]');
ok(chargeSel2c.value === 'maas-product-vtpm-std.90d', '重渲后计费项选择被保留');
const detail2 = document.getElementById('plan-charge-detail-su-2');
ok(detail2 && detail2.textContent.includes('maas-product-vtpm-std.90d'), '计费项详情行随选择刷新');

// ================= 按周期智能匹配 =================
section('按周期智能匹配（std）');
// 先把 su-1/su-3 的计费项都拨乱（su-1 默认第1项30d → 手动换成错位的 90d）
const c1 = document.querySelector('#plan-units-charge-container select.plan-charge-select[data-unit="su-1"]');
c1.value = 'maas-product-vtpm-std.90d';
window.smartMatchCharges();
const c1b = document.querySelector('#plan-units-charge-container select.plan-charge-select[data-unit="su-1"]');
const c2b = document.querySelector('#plan-units-charge-container select.plan-charge-select[data-unit="su-2"]');
const c3b = document.querySelector('#plan-units-charge-container select.plan-charge-select[data-unit="su-3"]');
const q1b = document.querySelector('#plan-units-charge-container select.plan-quota-select[data-unit="su-1"]');
const q2b = document.querySelector('#plan-units-charge-container select.plan-quota-select[data-unit="su-2"]');
const q3b = document.querySelector('#plan-units-charge-container select.plan-quota-select[data-unit="su-3"]');
ok(c1b.value === 'maas-product-vtpm-std.30d', '智能匹配后 su-1（30天）→ std.30d');
ok(c2b.value === 'maas-product-vtpm-std.60d', '智能匹配后 su-2（60天）→ std.60d');
ok(c3b.value === 'maas-product-vtpm-std.90d', '智能匹配后 su-3（90天）→ std.90d');
ok(q1b.value === 'quota-vtpm-30d' && q2b.value === 'quota-vtpm-60d' && q3b.value === 'quota-vtpm-90d', '配额项同步按周期匹配（q30/q60/q90）');
ok(!lastAlert.includes('未匹配'), '无未匹配提示');

// 未勾选任何售卖单元时提示
const allChecks = Array.from(document.querySelectorAll('#plan-units-charge-container .plan-unit-check'));
allChecks.forEach(c => c.checked = false);
window.renderPlanUnitsCharge();
lastAlert = '';
window.smartMatchCharges();
ok(lastAlert.includes('请先勾选'), '空选择时提示「请先勾选至少一个售卖单元」: ' + lastAlert);

// ================= 全选/全不选 =================
section('全选/全不选');
window.toggleAllPlanUnits();
ok(Array.from(document.querySelectorAll('#plan-units-charge-container .plan-unit-check')).every(c => c.checked), '全不选状态 → 点击后全部勾选');
window.toggleAllPlanUnits();
ok(Array.from(document.querySelectorAll('#plan-units-charge-container .plan-unit-check')).every(c => !c.checked), '全选状态 → 点击后全部取消');
// 恢复全选
window.toggleAllPlanUnits();
window.closeModal('plan-create');

// ================= 创建计划：quotaCodes 一并收集 =================
section('创建计划：quotaCodes 收集');
document.getElementById('plan-name').value = '测试·配额项计划';
window.renderPlanUnitsCharge();
// 全选状态；保留当前下拉值（每个 unit 前3个 charge select，取默认）
window.confirmPlanCreate();
ok(evalInPage('planRows.length') === 4, '计划追加成功（3+1）');
const newRow = evalInPage('planRows[3]');
ok(newRow.quotaCodes && Object.keys(newRow.quotaCodes).length === 3, 'quotaCodes 收集到 3 个售卖单元的映射');
ok(newRow.quotaCodes['su-1'] && newRow.quotaCodes['su-2'] && newRow.quotaCodes['su-3'], 'su-1/su-2/su-3 均有关联配额项: ' + JSON.stringify(newRow.quotaCodes));
ok(newRow.chargeCodes['su-1'] === 'maas-product-vtpm-std.30d', 'su-1 计费项保留智能匹配结果');

// 售卖计划 tab 每行渲染：状态在第2列 + 配额项列
section('售卖计划 Tab：状态第2列 + 配额项列（16列）');
window.switchInnerTab('plan');
const planTable = document.querySelector('#plan-tbody').closest('table');
const headCells = Array.from(planTable.querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(headCells[1] === '状态', '表头第 2 列 = 状态: ' + headCells[1]);
ok(headCells.includes('配额项'), '表头含「配额项」列（第 ' + (headCells.indexOf('配额项') + 1) + ' 列）');
ok(headCells.length === 16, '表头共 16 列: ' + headCells.length);
const planRowsEl = Array.from(document.querySelectorAll('#plan-tbody tr'));
ok(planRowsEl.length === 6, '计划单元表 6 行（原 3 个计划各 1 unit + 新计划 3 unit）: ' + planRowsEl.length);
const firstRowCells = Array.from(planRowsEl[0].cells).map(c => c.textContent.trim());
ok(['待发布', '已发布', '已停用', '待生效'].includes(firstRowCells[1]), '第 2 列单元格是状态徽标: ' + firstRowCells[1]);
ok(planRowsEl.some(r => r.textContent.includes('quota-vtpm-30d')), '计划单元行展示配额项 id');
ok(planRowsEl.some(r => r.textContent.includes('quota-vtpm-90d')), '新计划行展示 su-3 的 quota-vtpm-90d');

// ================= 修改计划回填配额项 =================
section('修改计划：回填计费项/配额项（仅待发布可改）');
// 新建的计划是 pending_publish（idx=3），单 su-1？不——全选了 3 个 unit。找含 su-1 的待发布计划 = idx 3
window.editPlanRow(3);
const ec1 = document.querySelector('#plan-units-charge-container select.plan-charge-select[data-unit="su-1"]');
const eq1 = document.querySelector('#plan-units-charge-container select.plan-quota-select[data-unit="su-1"]');
ok(ec1 && ec1.value === newRow.chargeCodes['su-1'], '回填计费项: ' + (ec1 && ec1.value));
ok(eq1 && eq1.value === newRow.quotaCodes['su-1'], '回填配额项: ' + (eq1 && eq1.value));
// 改配额项后确认 → 覆盖
eq1.value = 'quota-vtpm-60d';
window.confirmPlanCreate();
const updated = evalInPage('planRows[3].quotaCodes["su-1"]');
ok(updated !== newRow.quotaCodes['su-1'], '修改后 quotaCodes 已覆盖: su-1 → ' + updated + '（原 ' + newRow.quotaCodes['su-1'] + '）');
ok(evalInPage('planRows.length') === 4, '修改模式不新增行（仍 4 个）');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
