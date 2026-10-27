// jsdom 行为测试：字段拆分——字段2 计费项 / 字段3 配额项（两个并列区块、操作类似、勾选联动）+ 智能匹配/全选回归 + 编号 1-14
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

const chargeBox = () => document.getElementById('plan-units-charge-container');
const quotaBox = () => document.getElementById('plan-units-quota-container');
const qSel = (uid) => document.querySelector(`#plan-units-quota-container select.plan-quota-select[data-unit="${uid}"]`);
const cSel = (uid) => document.querySelector(`#plan-units-charge-container select.plan-charge-select[data-unit="${uid}"]`);

// ================= 弹窗结构：拆分两区块 + 编号 1-14 =================
section('弹窗结构（字段2 计费项 / 字段3 配额项，编号 1-14）');
ok(!!document.getElementById('plan-units-quota-container'), '存在独立的配额项区块 #plan-units-quota-container');
const labels = Array.from(document.querySelectorAll('#modal-plan-create label.form-label')).map(l => l.textContent.trim());
ok(labels.length === 14, '字段共 14 个: ' + labels.length);
ok(labels[1].startsWith('2.') && labels[1].includes('计费项'), '第 2 项 = 关联售卖单元及各自计费项');
ok(labels[2].startsWith('3.') && labels[2].includes('配额项'), '第 3 项 = 关联售卖单元及各自配额项');
ok(labels[3].startsWith('4.') && labels[3].includes('折算系数'), '第 4 项 = 折算系数');
ok(labels[13].startsWith('14.') && labels[13].includes('结束生效'), '第 14 项 = 生效结束');
const modalHtml = document.getElementById('modal-plan-create').innerHTML;
ok(modalHtml.includes('smartMatchCharges()'), '「按周期智能匹配」按钮保留');
ok(modalHtml.includes('toggleAllPlanUnits()'), '「全选/全不选」按钮保留');
const chargeFieldHtml = labels[1] ? null : null; // 标签检查已覆盖

// ================= std：两个区块初始渲染 =================
section('两区块初始渲染（std 商品）');
window.openDetailFromListed('maas-product-vtpm-std');
window.switchInnerTab('plan');
window.openPlanCreateModal();
ok(chargeBox().querySelectorAll('.plan-unit-check').length === 3, '字段2：3 个勾选框（售卖单元）');
ok(chargeBox().querySelectorAll('select.plan-charge-select').length === 3, '字段2：3 个计费项下拉');
ok(!quotaBox().querySelector('.plan-unit-check'), '字段3：无勾选框（不可改勾选）');
ok(quotaBox().querySelectorAll('select.plan-quota-select').length === 3, '字段3：3 个配额项下拉（= 勾选的售卖单元数）');
ok(qSel('su-1') && !qSel('su-1').disabled, '字段3：su-1 配额项下拉可用');
ok(qSel('su-1').querySelectorAll('option').length === 3, '配额项下拉 3 个选项');

// ================= 勾选联动 =================
section('勾选联动（字段2 改勾选 → 字段3 行集变化）');
// 取消 su-1 → 字段3 只剩 su-2/su-3
const check1 = chargeBox().querySelector('.plan-unit-check[value="su-1"]');
check1.checked = false;
window.renderPlanUnitsCharge();
ok(qSel('su-1') === null, '取消勾选 su-1 后字段3 不再渲染 su-1 行');
ok(!!qSel('su-2') && !!qSel('su-3'), '字段3 仍渲染 su-2/su-3');
// 此时 su-1/su-3 已取消勾选（非全选）→ 第一次 toggle 变全选，再 toggle 全不选
window.toggleAllPlanUnits();
ok(evalInPage('selectedPlanUnits().length') === 3, '非全选状态 → 第一次全选（3 个）');
window.toggleAllPlanUnits();
ok(evalInPage('selectedPlanUnits().length') === 0, '全选状态 → 第二次全不选（0 个）');
ok(quotaBox().textContent.includes('尚未勾选售卖单元'), '字段3 显示「尚未勾选售卖单元」提示: ' + quotaBox().textContent.trim().slice(0, 24));
// 再全选恢复
window.toggleAllPlanUnits();
ok(!!qSel('su-1') && !!qSel('su-2') && !!qSel('su-3'), '全选后字段3 恢复 3 行');

// ================= 字段3 保留选择 + 智能匹配跨区块 =================
section('字段3 选择保留 + 智能匹配（跨区块回填）');
qSel('su-2').value = 'quota-vtpm-90d';
// 触发字段2重渲（勾选变化）→ 字段3 保留 su-2 = 90d
const check3 = chargeBox().querySelector('.plan-unit-check[value="su-3"]');
check3.checked = false;
window.renderPlanUnitsCharge();
ok(qSel('su-2') && qSel('su-2').value === 'quota-vtpm-90d', '字段3 重渲后保留已选配额项（su-2=90d）');
// 重渲后 DOM 已替换，重新查询再勾回 su-3
const check3b = chargeBox().querySelector('.plan-unit-check[value="su-3"]');
check3b.checked = true;
window.renderPlanUnitsCharge();
ok(!!qSel('su-3'), '重新勾选 su-3 后字段3 恢复该行');
// 智能匹配（先把 su-1 计费项拨乱）
cSel('su-1').value = 'maas-product-vtpm-std.90d';
window.smartMatchCharges();
ok(cSel('su-1').value === 'maas-product-vtpm-std.30d', '智能匹配 su-1 计费项 → std.30d');
ok(cSel('su-2').value === 'maas-product-vtpm-std.60d', '智能匹配 su-2 计费项 → std.60d');
ok(cSel('su-3').value === 'maas-product-vtpm-std.90d', '智能匹配 su-3 计费项 → std.90d');
ok(qSel('su-1').value === 'quota-vtpm-30d' && qSel('su-3').value === 'quota-vtpm-90d', '智能匹配跨区块回填配额项');
ok(lastAlert.includes('完成 3'), '匹配成功提示: ' + lastAlert);
// su-2 计费项匹配 60d，但其配额项保留用户手选的 90d（智能匹配也会覆盖为 60d——验证覆盖）
ok(qSel('su-2').value === 'quota-vtpm-60d', '智能匹配覆盖 su-2 配额项 → 60d（以周期为准）');

// ================= 创建计划：两区块收集 =================
section('创建计划（两区块分别收集 chargeCodes/quotaCodes）');
document.getElementById('plan-name').value = '测试·拆分版计划';
window.confirmPlanCreate();
ok(evalInPage('planRows.length') === 4, '计划追加成功（3+1）');
const newRow = evalInPage('planRows[3]');
ok(newRow.chargeCodes['su-1'] === 'maas-product-vtpm-std.30d', 'chargeCodes 来自字段2');
ok(newRow.quotaCodes['su-3'] === 'quota-vtpm-90d', 'quotaCodes 来自字段3');
ok(Object.keys(newRow.quotaCodes).length === 3, 'quotaCodes 收集 3 个售卖单元');

// ================= 修改计划回填（跨两个区块） =================
section('修改计划回填（仅前 3 个 unit 中 su-1）');
// 新计划含 su-1/2/3（全选）。把第4个计划改成只挂 su-1（模拟回填 r.units 子集）
evalInPage('planRows[3].units = ["su-1"]');
window.editPlanRow(3);
ok(evalInPage('selectedPlanUnits().join(",")') === 'su-1', '回填勾选 = r.units（仅 su-1）');
ok(quotaBox().querySelectorAll('select.plan-quota-select').length === 1, '字段3 联动只渲染 1 行（su-1）');
ok(cSel('su-1').value === newRow.chargeCodes['su-1'], '回填计费项: ' + cSel('su-1').value);
ok(qSel('su-1').value === newRow.quotaCodes['su-1'], '回填配额项: ' + qSel('su-1').value);
// 改 su-1 配额项后确认 → 覆盖且 units 保持
qSel('su-1').value = 'quota-vtpm-60d';
window.confirmPlanCreate();
ok(evalInPage('planRows[3].quotaCodes["su-1"]') === 'quota-vtpm-60d', '修改后 quotaCodes 覆盖');
ok(evalInPage('JSON.stringify(planRows[3].units)') === JSON.stringify(['su-1']), '修改后 units 保持 su-1');
ok(evalInPage('planRows.length') === 4, '修改模式不新增行');

// ================= 去创建回填（新计费项进字段2 options） =================
section('去创建计费项（回填到字段2）');
window.openPlanCreateModal();
ok(chargeBox().querySelectorAll('select.plan-charge-select').length === 3, '重开弹窗默认全选 3 行');
window.closeModal('plan-create');

// ================= 售卖计划 Tab / 详情页（回归） =================
section('售卖计划 Tab 状态第2列 + 配额项列（16列，回归）');
const planTable = document.querySelector('#plan-tbody').closest('table');
const headCells = Array.from(planTable.querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(headCells[1] === '状态', '表头第 2 列 = 状态');
ok(headCells[6] === '配额项', '表头第 7 列 = 配额项');
ok(headCells.length === 16, '表头共 16 列');
ok(Array.from(document.querySelectorAll('#plan-tbody tr')).some(r => r.textContent.includes('quota-vtpm-90d')), '计划单元行展示配额项');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
