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

// ================= 1. 创建售卖计划页面：不展示计费项详情（第8轮） =================
section('1. 创建售卖计划不展示计费详情');
window.switchInnerTab('plan');
window.openPlanCreatePage();
const pcView = document.getElementById('plan-create-view');
ok(!pcView.classList.contains('hidden'), '创建售卖计划页面打开');
// unified 行不再有计费详情容器
ok(!document.getElementById('plan-charge-detail-unified'), 'unified 行不再展示计费项详情');
// unified 下拉仍可切换计费项
const uSel = document.querySelector('#plan-charge-unified select.plan-charge-select');
uSel.value = 'maas-product-vtpm-std.60d';
ok(uSel.value === 'maas-product-vtpm-std.60d', 'unified 下拉可切换计费项');
// perUnit 模式：两行布局（第一行售卖单元信息，第二行下拉+去创建），无详情容器
document.getElementById('plan-mode-charge').checked = true;
window.renderPlanCreateSections();
const pBox = document.getElementById('plan-charge-perunit');
ok(pBox.querySelectorAll('[id^="plan-charge-detail-"]').length === 0, 'perUnit 行不再展示计费项详情');
const onSaleCnt = evalInPage('onSalePlanUnits().length');
ok(pBox.querySelectorAll('select.plan-charge-select').length === onSaleCnt, 'perUnit 每个已上架售卖单元一个下拉（' + onSaleCnt + ' 个）');
const firstUnitDiv = pBox.querySelector('div.bg-slate-50');
ok(!!firstUnitDiv && firstUnitDiv.textContent.includes('购买量'), 'perUnit 第一行展示售卖单元信息');
ok(!!firstUnitDiv && firstUnitDiv.querySelector('button') && firstUnitDiv.querySelector('button').textContent.includes('去创建'), 'perUnit 第二行含去创建按钮');
document.getElementById('plan-mode-charge').checked = false;
// 去创建计费项后回填（code 前缀须为当前商品 std），不再有详情行
window.renderPlanCreateSections();
window.openCreateBillingModal('');
document.getElementById('billing-code').value = 'maas-product-vtpm-std.smoke';
document.getElementById('billing-price').value = '0.0099';
window.confirmCreateBilling();
const afterSel = document.querySelector('#plan-charge-unified select.plan-charge-select');
ok(afterSel.value === 'maas-product-vtpm-std.smoke', '去创建后回填新计费项到 unified 行');
ok(!document.getElementById('plan-charge-detail-unified'), '回填后也不展示计费项详情');
window.closePlanCreatePage();

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
const priceCell = cells[7].textContent.trim();
const chargeCell = cells[6].textContent.trim();
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
ok(labels[1].startsWith('模型'), '第2个字段为模型（用于生成默认 code/名称）');
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
// 可手动改 → 提交用手改值（第15轮：需勾选售卖维度后提交）
document.getElementById('inp-name').value = 'GLM-4 专属包';
document.querySelectorAll('.product-dim-check').forEach(cb => { cb.checked = true; });
window.submitProduct();
ok(evalInPage('currentProduct.name') === 'GLM-4 专属包', '手改名称后提交生效');
ok(evalInPage('currentProduct.playground') === undefined, '第12轮：商品与模型/Playground 解耦，currentProduct 无 playground 字段');
ok(evalInPage('currentProduct.dims.length') === 2, '第15轮：提交的商品含售卖维度 dims（勾选两项）');
// 详情页基本信息不含关联 Playground
const infoText = document.getElementById('detail-info').textContent;
ok(!infoText.includes('Playground') && !infoText.includes('playground'), '详情页基本信息无 playground 展示');
// payload 下拉展示全量候选池（不限当前商品来源：6 项，标注来源模型）
const payloadHtml = evalInPage('payloadOptionsHTML("")');
const payloadCount = (String(payloadHtml).match(/<option/g) || []).length;
ok(payloadCount === 6, 'payload 下拉展示全量候选池 6 项: ' + payloadCount);
ok(String(payloadHtml).includes('DeepSeek-V4.1') && String(payloadHtml).includes('GLM-4') && String(payloadHtml).includes('Qwen2.5'), 'payload 选项标注来源模型');
ok(evalInPage('currentProduct.type') === 'maas-product-vtpm', '提交的商品类型正确');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
