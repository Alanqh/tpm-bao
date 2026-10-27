// jsdom 冒烟测试：本轮 3 项改动（计费项详情换行展示 / 刊例价无计费项为— / 新增商品选模型自动生成）
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'prototype', 'admin-products.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;
const evalInPage = (expr) => window.eval(expr);

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ ' + msg); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

window.openDetailFromListed('maas-product-vtpm-std');

// ================= 1. 创建售卖计划弹窗：计费项详情换行展示 =================
section('1. 计费项详情换行展示');
window.switchInnerTab('plan');
window.openPlanCreateModal();
const merged = document.getElementById('plan-units-charge-container');
const modal = document.getElementById('modal-plan-create');
ok(!modal.classList.contains('hidden'), '创建售卖计划弹窗打开');
// 每个售卖单元下方有计费详情容器
const details = merged.querySelectorAll('[id^="plan-charge-detail-"]');
ok(details.length === evalInPage('saleUnits.length'), '每个售卖单元有计费详情容器（' + details.length + ' 个）');
// 默认选中第一个计费项 → 详情行应含 code/名称/刊例价/单位/货币单位/标签
const firstDetail = document.getElementById('plan-charge-detail-su-1');
ok(firstDetail && firstDetail.textContent.includes('code：'), '详情行含 code 字段');
ok(firstDetail.textContent.includes('名称：'), '详情行含 名称 字段');
ok(firstDetail.textContent.includes('刊例价：'), '详情行含 刊例价 字段');
ok(firstDetail.textContent.includes('单位：'), '详情行含 单位 字段');
ok(firstDetail.textContent.includes('货币单位：'), '详情行含 货币单位 字段');
ok(firstDetail.textContent.includes('标签：'), '详情行含 标签 字段');
const chargeText = firstDetail.textContent;
ok(chargeText.includes('maas-product-vtpm-pre.30d'), '详情行展示所选计费项 code');
// 切换下拉 → 详情行实时刷新（su-1 从 .30d 换到 .60d）
const sel1 = merged.querySelector('select.plan-charge-select[data-unit="su-1"]');
sel1.value = 'maas-product-vtpm-pre.60d';
window.renderChargeDetail('su-1');
ok(document.getElementById('plan-charge-detail-su-1').textContent.includes('maas-product-vtpm-pre.60d'), '切换下拉后详情行实时刷新为 .60d');
// 取消勾选 → 重渲后下拉禁用，详情行保留
const cb = merged.querySelector('.plan-unit-check');
const cbVal = cb.value;
cb.checked = false;
cb.dispatchEvent(new window.Event('change', { bubbles: true }));
ok(document.querySelector('select.plan-charge-select[data-unit="' + cbVal + '"]').disabled, '取消勾选后下拉禁用');
ok(!!document.getElementById('plan-charge-detail-' + cbVal), '取消勾选后详情行保留');
// 去创建计费项后回填 → 详情行展示新计费项
window.closeModal('plan-create');
window.openPlanCreateModal();
window.openCreateBillingModal('su-1');
document.getElementById('billing-code').value = 'maas-product-vtpm-smoke.30d';
document.getElementById('billing-price').value = '0.0099';
window.confirmCreateBilling();
const afterSel = merged.querySelector('select.plan-charge-select[data-unit="su-1"]');
ok(afterSel.value === 'maas-product-vtpm-smoke.30d', '去创建后回填新计费项到该行');
ok(document.getElementById('plan-charge-detail-su-1').textContent.includes('maas-product-vtpm-smoke.30d'), '回填后详情行展示新计费项');
ok(document.getElementById('plan-charge-detail-su-1').textContent.includes('0.0099'), '详情行展示新计费项刊例价');
window.closeModal('plan-create');

// ================= 2. 售卖单元刊例价来自关联计费项，无则 — =================
section('2. 售卖单元刊例价');
window.switchInnerTab('saleunit');
window.renderSaleUnits();
const suRows = document.querySelectorAll('#saleunit-tbody tr');
ok(suRows.length === evalInPage('saleUnits.length'), '售卖单元行数正确（' + suRows.length + '）');
// std：su-1 关联 .30d（defaultPlan[0] chargeCodes su-1 → 0.0084）
const su1Row = Array.from(suRows).find(r => r.textContent.includes('su-1'));
ok(su1Row.textContent.includes('0.0084'), 'su-1 刊例价来自关联计费项（0.0084）');
// 无计费项场景：临时清空 chargeCodes 并重渲
window.eval(`
  (function(){
    window.__backupPlanRows = JSON.parse(JSON.stringify(planRows));
    planRows.forEach(r => { r.chargeCodes = {}; });
    renderSaleUnits();
  })()
`);
const su1Row2 = Array.from(document.querySelectorAll('#saleunit-tbody tr')).find(r => r.textContent.includes('su-1'));
const cells = su1Row2.querySelectorAll('td');
const priceCell = cells[5].textContent.trim();
const chargeCell = cells[4].textContent.trim();
ok(priceCell === '—', '无关联计费项时刊例价显示 —（实际: ' + priceCell + '）');
ok(chargeCell === '—', '无关联计费项时关联计费项显示 —（实际: ' + chargeCell + '）');
// 待发布计划的计费项也能取到（回退逻辑）：恢复后 su-1 恢复刊例价
window.eval('planRows = JSON.parse(JSON.stringify(window.__backupPlanRows)); renderSaleUnits();');
const su1Row3 = Array.from(document.querySelectorAll('#saleunit-tbody tr')).find(r => r.textContent.includes('su-1'));
ok(su1Row3.textContent.includes('0.0084'), '恢复后 su-1 刊例价恢复（回退逻辑可取待发布计划计费项）');

// ================= 3. 新增商品：先类型后模型，自动生成 code/名称 =================
section('3. 新增商品自动生成');
window.openProductModal();
const prodModal = document.getElementById('modal-product');
ok(!prodModal.classList.contains('hidden'), '新增商品弹窗打开');
// 字段顺序：商品类型 → 模型 → code → 名称
const labels = Array.from(prodModal.querySelectorAll('label.form-label')).map(l => l.textContent.trim());
ok(labels[0] === '商品类型', '第1个字段为商品类型');
ok(labels[1].startsWith('模型'), '第2个字段为模型（对应关联 Playground）');
ok(labels[2].startsWith('商品code'), '第3个字段为商品code');
ok(labels[3].startsWith('商品名称'), '第4个字段为商品名称');
// 模型下拉展示模型名（含 playground）
const pgOpts = Array.from(document.querySelectorAll('#inp-playground option'));
ok(pgOpts.length === 3 && pgOpts[0].textContent.includes('DeepSeek-V4.1') && pgOpts[0].textContent.includes('pg-deepseek-v4.1'), '模型下拉含模型名+playground: ' + pgOpts[0].textContent);
// 选模型后自动生成 code/名称
ok(document.getElementById('inp-code').value === 'maas-product-vtpm-deepseekv41', '自动生成商品code: ' + document.getElementById('inp-code').value);
ok(document.getElementById('inp-name').value === 'DeepSeek-V4.1 预留vTPM包', '自动生成商品名称: ' + document.getElementById('inp-name').value);
// 切换模型 → 重新生成
document.getElementById('inp-playground').value = 'pg-glm-4';
document.getElementById('inp-playground').dispatchEvent(new window.Event('change', { bubbles: true }));
ok(document.getElementById('inp-code').value === 'maas-product-vtpm-glm4', '切换模型后 code 更新: ' + document.getElementById('inp-code').value);
ok(document.getElementById('inp-name').value === 'GLM-4 预留vTPM包', '切换模型后名称更新: ' + document.getElementById('inp-name').value);
// 可手动改 → 提交用手改值
document.getElementById('inp-name').value = 'GLM-4 专属包';
window.submitProduct();
ok(evalInPage('currentProduct.name') === 'GLM-4 专属包', '手改名称后提交生效');
ok(evalInPage('currentProduct.playground') === 'pg-glm-4', '提交的 playground 为所选模型对应值');
ok(evalInPage('currentProduct.type') === 'maas-product-vtpm', '提交的商品类型正确');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
