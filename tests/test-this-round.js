// jsdom 冒烟测试：admin-products.html 本轮改动（独立详情页 / 定价计划占位 / 弹窗合并区块 / 三列两列布局）
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'prototype', 'admin-products.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

// 顶层 let/const 不挂 window，用 eval 取
const evalInPage = (expr) => window.eval(expr);

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ ' + msg); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

const saleUnitsCount = () => evalInPage('saleUnits.length');

// 用 std 商品（listed 入口，含 3 个售卖单元 + 3 个售卖计划）
window.openDetailFromListed('maas-product-vtpm-std');

// ================= 1. 售卖计划详情 = 独立页面 =================
section('1. 售卖计划详情独立页面');
const dv = document.getElementById('detail-view');
const pdv = document.getElementById('plan-detail-view');
ok(dv && !dv.classList.contains('hidden'), '进入商品详情后 detail-view 可见');
ok(pdv && pdv.classList.contains('hidden'), 'plan-detail-view 初始隐藏');
ok(dv.contains(pdv) === false, 'plan-detail-view 不嵌套在 detail-view 内（独立页面）');
// 切到售卖计划 tab 并点「所属售卖计划」进入详情
window.switchInnerTab('plan');
ok(!document.getElementById('inner-tab-plan').classList.contains('hidden'), '售卖计划 Tab 切换成功');
const planLink = document.querySelector('#plan-tbody button[onclick^="openPlanDetail"]');
ok(!!planLink, '计划单元列表存在「所属售卖计划」可点击入口');
window.openPlanDetail(0);
ok(!pdv.classList.contains('hidden'), 'openPlanDetail 后独立详情页显示');
ok(dv.classList.contains('hidden'), 'openPlanDetail 后商品详情页隐藏');
const title = document.getElementById('plan-detail-title').textContent;
const prodName = evalInPage('currentProduct.name');
ok(title.includes('售卖计划详情') && title.includes(prodName) && title.includes('（'), '详情页标题含计划名+商品名上下文: ' + title);
ok(!!document.getElementById('plan-detail-tbody').querySelector('tr'), '详情页计划单元表格有数据');
ok(!!document.getElementById('plan-detail-actions').textContent.trim(), '详情页操作区有按钮');
const tabsCard = document.getElementById('plan-tabs-card');
ok(!!tabsCard && dv.contains(tabsCard), 'tabs 卡片仍在商品详情页内部');
window.closePlanDetail();
ok(pdv.classList.contains('hidden') && !dv.classList.contains('hidden'), '返回后独立详情页隐藏、商品详情页恢复');

// ================= 2. 定价计划占位：无表格 =================
section('2. 定价计划占位页面');
window.switchInnerTab('pricing');
const pricingTab = document.getElementById('inner-tab-pricing');
ok(!pricingTab.classList.contains('hidden'), '定价计划 Tab 可切换');
ok(!pricingTab.querySelector('table') && !pricingTab.querySelector('#pricing-tbody'), '定价计划 Tab 无表格');
ok(pricingTab.textContent.includes('占位'), '定价计划 Tab 仅占位文案');

// ================= 3. 创建售卖计划弹窗：合并区块 =================
section('3. 弹窗第2、3项合并');
ok(!document.getElementById('plan-units-container') && !document.getElementById('plan-charge-list'), '旧的 plan-units-container / plan-charge-list 已删除');
const merged = document.getElementById('plan-units-charge-container');
ok(!!merged, '合并区块 #plan-units-charge-container 存在');
window.openPlanCreateModal();
const modal = document.getElementById('modal-plan-create');
ok(!modal.classList.contains('hidden'), '创建售卖计划弹窗打开');
const rows = merged.querySelectorAll('div.flex.items-center');
ok(rows.length === saleUnitsCount(), '合并区块行数 = 售卖单元数（' + rows.length + '）');
ok(rows[0].querySelector('input.plan-unit-check') !== null, '每行含勾选框');
ok(rows[0].querySelector('select.plan-charge-select') !== null, '每行含计费项下拉');
ok(rows[0].querySelector('button[onclick^="openCreateBillingModal"]') !== null, '每行含去创建按钮');
const allChecked = Array.from(merged.querySelectorAll('.plan-unit-check')).every(c => c.checked);
ok(allChecked, '默认全部勾选');
// 取消勾选某行 → 该行下拉禁用且不进入 selectedPlanUnits
const cb = merged.querySelectorAll('.plan-unit-check')[0];
const cbVal = cb.value;
cb.checked = false;
cb.dispatchEvent(new window.Event('change', { bubbles: true }));
const firstRow = merged.querySelectorAll('div.flex.items-center')[0];
ok(!firstRow.querySelector('.plan-unit-check').checked, '取消勾选成功');
ok(firstRow.querySelector('select.plan-charge-select').disabled, '取消勾选后该行计费项下拉禁用');
const selUnits = window.selectedPlanUnits();
ok(!selUnits.includes(cbVal) && selUnits.length === saleUnitsCount() - 1, 'selectedPlanUnits 正确排除取消项');
// 重新勾选恢复
const cb2 = merged.querySelector('.plan-unit-check');
cb2.checked = true;
cb2.dispatchEvent(new window.Event('change', { bubbles: true }));
ok(!merged.querySelector('div.flex.items-center select').disabled, '重新勾选后下拉恢复可用');

// ================= 4. 弹窗布局：三列 / 两列 =================
section('4. 弹窗布局');
const labels = Array.from(modal.querySelectorAll('label.form-label')).map(l => l.textContent.trim());
ok(labels[0].startsWith('1.') && labels[0].includes('售卖计划名称'), '第1项为售卖计划名称');
ok(labels[1].startsWith('2.') && labels[1].includes('关联售卖单元及各自计费项'), '第2项为合并区块（关联售卖单元及各自计费项）');
ok(labels[2].startsWith('3.') && labels[3].startsWith('4.') && labels[4].startsWith('5.'), '后续编号 3/4/5 顺延');
const modalBody = modal.querySelector('div.p-5.grid');
const grid3 = modalBody.querySelector('div.grid.grid-cols-3');
ok(!!grid3, '存在 grid-cols-3 三列区块');
const threeInputs = grid3 ? grid3.querySelectorAll('input') : [];
ok(threeInputs.length === 3, '三列区块含 3 个输入框');
const grid3Labels = grid3 ? Array.from(grid3.querySelectorAll('label')).map(l => l.textContent.replace(/^\d+\.\s*/, '')) : [];
ok(grid3Labels.includes('最小购买量（万 vTPM）') && grid3Labels.includes('最大购买量（万 vTPM）') && grid3Labels.includes('购买量step（万 vTPM）'), '三列 = 最小/最大购买量 + step');
const grids2 = modalBody.querySelectorAll('div.grid.grid-cols-2');
ok(grids2.length === 2, '存在 2 个 grid-cols-2 两列区块');
const g2a = grids2[0] ? Array.from(grids2[0].querySelectorAll('label')).map(l => l.textContent.replace(/^\d+\.\s*/, '')) : [];
const g2b = grids2[1] ? Array.from(grids2[1].querySelectorAll('label')).map(l => l.textContent.replace(/^\d+\.\s*/, '')) : [];
ok(g2a.includes('开始售卖时间') && g2a.includes('结束售卖时间'), '两列区块A = 开始/结束售卖时间');
ok(g2b.includes('售卖计划开始生效时间') && g2b.includes('售卖计划结束生效时间'), '两列区块B = 开始/结束生效时间');
// 编号完整性：1-14
const allNums = labels.map(l => parseInt((l.match(/^(\d+)\./) || [])[1])).filter(n => !isNaN(n));
ok(allNums.length === 14 && allNums.every((n, i) => n === i + 1), '字段编号 1-14 连续无跳号');

// ================= 5. 创建售卖计划全链路（合并区块下） =================
section('5. 创建/修改售卖计划全链路');
document.getElementById('plan-name').value = '冒烟·合并区块计划';
window.confirmPlanCreate();
const newRow = evalInPage('planRows[planRows.length - 1]');
ok(newRow && newRow.name === '冒烟·合并区块计划', 'confirmPlanCreate 新增成功');
const curUnits = evalInPage('planRows[planRows.length - 1].units');
const curCodes = evalInPage('planRows[planRows.length - 1].chargeCodes');
ok(curUnits.length === saleUnitsCount() && Object.keys(curCodes).every(k => curCodes[k]), '新增行的 units 与 chargeCodes 完整');
// 修改回填（编辑第 1 个计划，其 units = ['su-1']，不勾选其它）
const firstPlan = evalInPage('planRows[0]');
window.editPlanRow(0);
ok(document.getElementById('plan-name').value === firstPlan.name, '修改模式回填名称');
const checkedInModal = Array.from(merged.querySelectorAll('.plan-unit-check:checked')).map(c => c.value);
ok(JSON.stringify(checkedInModal) === JSON.stringify(firstPlan.units), '修改模式回填勾选 = 原 units');
const selFirst = merged.querySelector('select.plan-charge-select[data-unit="' + firstPlan.units[0] + '"]');
ok(selFirst && selFirst.value === firstPlan.chargeCodes[firstPlan.units[0]], '修改模式回填计费项下拉');
// 未勾选行的下拉禁用
const unchecked = Array.from(merged.querySelectorAll('.plan-unit-check')).find(c => !c.checked);
if (unchecked) {
  const uSel = merged.querySelector('select.plan-charge-select[data-unit="' + unchecked.value + '"]');
  ok(uSel && uSel.disabled, '修改模式：未勾选行下拉禁用');
} else {
  ok(true, '（该计划勾选了全部单元，跳过未勾选行断言）');
}
window.closeModal('plan-create');

// ================= 6. 回归：售卖单元确认弹窗只增不减 =================
section('6. 回归：售卖单元确认弹窗');
window.switchInnerTab('saleunit');
window.openSuConfirmModal();
const disabledChecked = document.querySelectorAll('#su-confirm-body input.su-leaf:checked[disabled]');
ok(disabledChecked.length > 0, '已确认度量 checked+disabled（只增不减）');
window.closeModal('su-confirm');

// ================= 7. 回归：售卖单元表格关键列 =================
section('7. 回归：售卖单元表格');
const suThead = Array.from(document.querySelectorAll('#inner-tab-saleunit thead th')).map(t => t.textContent.trim());
ok(suThead.includes('所选时间执行价'), '售卖单元含「所选时间执行价」列');
ok(!suThead.some(t => t.includes('生效起止')), '售卖单元不含「生效起止」列');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
