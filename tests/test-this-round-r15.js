// 第15轮原验证「新增商品售卖维度勾选」——第22轮简化口径：
// ①新增商品无售卖维度字段 ②提交无维度校验 ③创建后默认进入「售卖空间」Tab（先创建售卖空间）
// ④空间计划=fn+维度+每维度度量勾选（第37轮：保存时叉乘自动生成售卖单元）
// ⑤SU 弹窗已删（第37轮：重复创建空间即追加单元——同维度+度量集合不变沿用空间；改动即新建）
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('/Users/lqh/Documents/ChatGPT/TPM保障包/prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;
window.confirm = () => true;
let pass = 0, fail = 0;
let alertMsg = '';
window.alert = (m) => { alertMsg = m; };
const ok = (c, msg) => { c ? (pass++, console.log('  ✓ ' + msg)) : (fail++, console.log('  ✗ ' + msg)); };
const section = (t) => console.log('\n== ' + t + ' ==');
const evalInPage = (expr) => window.eval(expr);

// ===== 1. 弹窗结构（第21轮：无售卖维度勾选区） =====
section('1. 弹窗结构');
window.openProductModal();
ok(!document.getElementById('inp-dims'), '弹窗无 #inp-dims 勾选区（第21轮移除）');
ok(document.querySelectorAll('.product-dim-check').length === 0, '无 product-dim-check 复选框');
const labels = Array.from(document.querySelectorAll('#modal-product label.form-label')).map(l => l.textContent.trim());
ok(!labels.some(l => l.includes('售卖维度')), '字段清单无「售卖维度」');

// ===== 2. 提交无维度校验 =====
section('2. 提交');
alertMsg = '';
document.getElementById('inp-code').value = 'maas-product-vtpm-r21a';
document.getElementById('inp-name').value = 'r21 商品A';
window.submitProduct();
ok(alertMsg === '', '提交不拦截（无维度校验）: ' + alertMsg);
ok(evalInPage('currentProduct.code') === 'maas-product-vtpm-r21a', '商品创建成功');
ok(evalInPage('currentProduct.dims') === undefined, 'currentProduct 无 dims 字段');
// 创建后默认打开「售卖空间」Tab
const activeTab = document.querySelector('#plan-tabs-card .admin-tab.active');
ok(activeTab && activeTab.textContent.trim() === '售卖空间', '创建后默认进入「售卖空间」Tab（先建空间）');
const tabsOrder = Array.from(document.querySelectorAll('#plan-tabs-card .admin-tab')).map(b => b.textContent.trim());
ok(tabsOrder[0] === '售卖空间', '售卖空间为第一个 Tab');

// ===== 3. 新商品通过空间计划创建售卖空间（第31轮：fn 勾选+维度勾选，保存总是新建空间） =====
section('3. 空间计划创建售卖空间');
window.eval('startEdit()');
window.eval('openSpacePlanModal()');
ok(document.querySelectorAll('.sp-fn-check').length === 1, 'vtpm（无 fn 商品）弹窗单行 fn=""');
ok(document.querySelectorAll('.sp-dim-check').length === 4, '维度候选 4 个（dimensionOptions 全量）');
ok(document.querySelectorAll('.space-msr-check').length === 0, '弹窗无度量勾选区（空间只管维度）');
ok(!document.querySelector('.sp-fn-space'), '第31轮：无空间下拉（改为维度勾选）');
// 第一份计划：fn='' + 仅购买量区间 → 总是新建 sp6
const fnBoxA = document.querySelector('.sp-fn-check[data-fn=""]');
fnBoxA.checked = true;
fnBoxA.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-dim-check[data-fn=""]').forEach(c => { if (c.value === '购买量区间') { c.checked = true; c.dispatchEvent(new window.Event('change', { bubbles: true })); } });
document.querySelectorAll('.sp-measure-check[data-fn=""][data-dim="购买量区间"]').forEach(c => { c.checked = c.value === '1～100'; });
document.getElementById('sp-name').value = 'r31 空间计划A';
document.getElementById('sp-priority').value = '100';
document.getElementById('sp-eff-start').value = '2026-11-01T00:00:00';
document.getElementById('sp-eff-end').value = '2027-11-01T00:00:00';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存') && alertMsg.includes('待发布'), '计划保存成功（待发布）: ' + alertMsg.slice(0, 24));
ok(alertMsg.includes('已新建售卖空间'), '提示已新建售卖空间');
ok(evalInPage('Object.keys(spaces).some(k => spaces[k].seq === 6 && spaces[k].dims.join(",") === "购买量区间")'), '新空间（售卖空间6）序号自增+维度正确');
ok(evalInPage('spaces["sp6"].measures') === undefined, '空间无 measures 字段（空间只管维度）');
// 第二份计划：fn='' + 仅购买周期 → 新建 sp7
window.eval('openSpacePlanModal()');
const fnBoxB = document.querySelector('.sp-fn-check[data-fn=""]');
fnBoxB.checked = true;
fnBoxB.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-dim-check[data-fn=""]').forEach(c => { if (c.value === '购买周期') { c.checked = true; c.dispatchEvent(new window.Event('change', { bubbles: true })); } });
document.querySelectorAll('.sp-measure-check[data-fn=""][data-dim="购买周期"]').forEach(c => { c.checked = c.value === '30天'; });
document.getElementById('sp-name').value = 'r31 空间计划B';
alertMsg = '';
window.confirmSpacePlan();
ok(evalInPage('Object.keys(spaces).some(k => spaces[k].seq === 7 && spaces[k].dims.join(",") === "购买周期")'), '第二份计划空间（售卖空间7）单维度');
ok(evalInPage('spacePlans.length') === 2, '两份空间计划');
// 重复维度集合不再拦截（第31轮口径：总是新建）
window.eval('openSpacePlanModal()');
const fnBoxC = document.querySelector('.sp-fn-check[data-fn=""]');
fnBoxC.checked = true;
fnBoxC.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-dim-check[data-fn=""]').forEach(c => { if (c.value === '购买量区间') { c.checked = true; c.dispatchEvent(new window.Event('change', { bubbles: true })); } });
document.querySelectorAll('.sp-measure-check[data-fn=""][data-dim="购买量区间"]').forEach(c => { c.checked = c.value === '1～100'; });
document.getElementById('sp-name').value = 'r31 空间计划C';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已新建售卖空间') && evalInPage('Object.keys(spaces).some(k => spaces[k].seq === 8)'), '维度集合与已有空间相同 → 不拦截，总是新建（sp8）');
window.eval('closeModal("spaceplan")');
// 第32轮：默认机制已废——生效空间完全由已发布空间计划仲裁（未发布 → 无生效空间；发布后接管）
ok(evalInPage('currentSpaceOfFn("")') === '', '未发布任何计划 → fn("") 无生效空间（无默认回落）');
window.eval('publishSpacePlan(0)');
ok(evalInPage('currentSpaceOfFn("")') === 'sp6', '发布计划A后 sp6 生效（纯计划仲裁）');

// ===== 4. 空间计划叉乘自动生成售卖单元（第37轮；SU 弹窗已删） =====
section('4. 叉乘生成售卖单元');
ok(!document.getElementById('modal-su-confirm'), 'SU 弹窗已删除（第37轮）');
ok(!document.getElementById('su-create-btn'), 'SU Tab 创建按钮已删除');
// 计划A（sp6 购买量区间×1～100）保存时已自动生成 1 个单元
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp6").length') === 1, '计划A 保存时叉乘生成 1 个单元（sp6）');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp6")[0].dim') === '购买量区间', '单元 dim=购买量区间（单维度）');

// ===== 5. 幂等与变化（第37轮：维度+度量集合不变→沿用空间不重复生成；变化→新建空间重新叉乘） =====
section('5. 保存幂等/变化新建');
// 5a. 修改计划A：维度+度量不变 → 沿用 sp6，无新增单元
window.eval('editSpacePlan(0)');
alertMsg = '';
window.confirmSpacePlan();
ok(evalInPage('Object.keys(spaces).length') === 8, '维度+度量不变 → 沿用原空间（不新增，共 8 个空间）');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp6").length') === 1, 'sp6 单元仍 1 个（幂等不重复生成）');
// 5b. 修改计划A：加勾度量 500+ → 变化 → 新建空间并叉乘（sp6 旧单元保留=不可删，新空间 2 个单元）
window.eval('editSpacePlan(0)');
document.querySelector('.sp-measure-check[data-fn=""][data-dim="购买量区间"][value="500+"]').checked = true;
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已新建售卖空间'), '度量变化 → 新建空间: ' + alertMsg.slice(0, 30));
ok(evalInPage('Object.keys(spaces).length') === 9, '新空间落地（共 9 个，sp9）');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp6").length') === 1, '旧空间 sp6 单元保留（不可删除）');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp9").length') === 2, '新空间 sp9 叉乘 2 个单元（1～100+500+）');

// ===== 6. 既有商品（std）流程不回归 =====
section('6. 既有商品');
window.eval('backToList()');
window.openDetailByCode('maas-product-vtpm-std');
ok(evalInPage('currentProduct.dims') === undefined, 'std 商品无 dims（第21轮统一）');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp1").length') === 3, 'std mock 单元 3 个（sp1，由常驻计划叉乘口径对齐）');

// ===== 7. 新建商品入列（无 dims） =====
section('7. 列表入列');
window.eval('backToList()');
window.openProductModal();
document.getElementById('inp-code').value = 'maas-product-vtpm-r21b';
document.getElementById('inp-name').value = 'r21 商品B';
window.submitProduct();
window.backToList();
ok(evalInPage('allProducts.find(p=>p.code==="maas-product-vtpm-r21b")') !== undefined, '新建商品入列 allProducts');
ok(evalInPage('allProducts.find(p=>p.code==="maas-product-vtpm-r21b").dims') === undefined, '入列商品无 dims 字段');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
