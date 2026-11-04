// 第15轮原验证「新增商品售卖维度勾选」——第38轮简化口径：
// ①新增商品无售卖维度字段 ②提交无维度校验 ③创建后默认进入「售卖空间」Tab
// ④创建售卖空间=名称/优先级/生效期+fn→维度→度量三层勾选，保存=新建空间+叉乘生成售卖单元
// ⑤空间完全不可改：无修改入口，变更=复制新建；SU 弹窗已删
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
ok(!tabsOrder.includes('空间计划'), '第38轮：「空间计划」Tab 已删（职责并入售卖空间）');

// ===== 3. 新商品通过「创建售卖空间」建空间（第38轮：保存=新建空间+逐fn叉乘） =====
section('3. 创建售卖空间');
window.eval('startEdit()');
window.eval('openSpacePlanModal()');
ok(document.querySelectorAll('.sp-fn-check').length === 1, 'vtpm（无 fn 商品）弹窗单行 fn=""');
ok(document.querySelectorAll('.sp-dim-check').length === 0, '第43轮：维度复选已删（fn→度量两步）');
ok(document.querySelectorAll('.sp-measure-check').length > 0, '弹窗度量复选存在（第43轮两步直勾）');
ok(!document.querySelector('.sp-fn-space'), '无空间下拉（维度勾选模式）');
// 空间A：fn='' + 仅购买量区间×1～100
const fnBoxA = document.querySelector('.sp-fn-check[data-fn=""]');
fnBoxA.checked = true;
fnBoxA.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-measure-check[data-dim="购买量区间"]').forEach(c => { c.checked = c.value === '1～100'; });
document.getElementById('sp-name').value = 'r38 空间A';
document.getElementById('sp-priority').value = '100';
document.getElementById('sp-eff-start').value = '2026-11-01T00:00:00';
document.getElementById('sp-eff-end').value = '2027-11-01T00:00:00';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存') && alertMsg.includes('待发布'), '空间保存成功（待发布）: ' + alertMsg.slice(0, 24));
ok(alertMsg.includes('已自动生成售卖单元 2 个'), '提示叉乘 2 个单元（1～100 + 全缺省）: ' + alertMsg.slice(-30));
ok(evalInPage('spaces["sp1"] && spaces["sp1"].fnDims[""].join(",")') === '购买量区间', '新空间 sp1 fn="" 维度=购买量区间');
ok(evalInPage('spaces["sp1"].priority') === 100, '空间优先级 100 落地');
ok(evalInPage('spaces["sp1"].fnMeasures') !== undefined, '空间带 fnMeasures（fn→维度→度量定义）');
// 空间B：fn='' + 仅购买周期×30天 → 第二个空间
window.eval('openSpacePlanModal()');
const fnBoxB = document.querySelector('.sp-fn-check[data-fn=""]');
fnBoxB.checked = true;
fnBoxB.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-measure-check[data-dim="购买周期"]').forEach(c => { c.checked = c.value === '30天'; });
document.getElementById('sp-name').value = 'r38 空间B';
alertMsg = '';
window.confirmSpacePlan();
ok(evalInPage('spaces["sp2"] && spaces["sp2"].fnDims[""].join(",")') === '购买周期', '第二空间 sp2 单维度');
ok(evalInPage('Object.keys(spaces).length') === 2, '两个空间');
// 第38轮：空间完全不可改——editSpacePlan 已删，重复创建即新建
ok(typeof window.editSpacePlan === 'undefined', '无修改空间函数（空间不可改，变更=复制新建）');
window.eval('openSpacePlanModal()');
const fnBoxC = document.querySelector('.sp-fn-check[data-fn=""]');
fnBoxC.checked = true;
fnBoxC.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-measure-check[data-dim="购买量区间"]').forEach(c => { c.checked = c.value === '1～100'; });
document.getElementById('sp-name').value = 'r38 空间C';
alertMsg = '';
window.confirmSpacePlan();
ok(evalInPage('Object.keys(spaces).length') === 3 && evalInPage('spaces["sp3"]') !== undefined, '维度集合与已有空间相同 → 不拦截，总是新建（sp3）');
window.eval('closeModal("spaceplan")');
// 未发布 → 无生效空间；发布 sp1 后接管
ok(evalInPage('currentSpaceOfFn("")') === '', '未发布任何空间 → fn("") 无生效空间');
window.eval('publishSpacePlan("sp1")');
ok(evalInPage('currentSpaceOfFn("")') === 'sp1', '发布空间A后 sp1 生效');

// ===== 4. 空间叉乘自动生成售卖单元（第37/38轮；SU 弹窗已删） =====
section('4. 叉乘生成售卖单元');
ok(!document.getElementById('modal-su-confirm'), 'SU 弹窗已删除（第37轮）');
ok(!document.getElementById('su-create-btn'), 'SU Tab 创建按钮已删除');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp1").length') === 2, '空间A 叉乘 2 单元（1～100 + 全缺省，r43）');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp1").some(u => u.dim === "购买量区间")', '含 dim=购买量区间 单元（组合序全缺省在前）') === true || evalInPage('saleUnits.filter(u=>u.spaceKey==="sp1").map(u=>u.dim).join("|")') === ',购买量区间', '单元 dims=全缺省+购买量区间: ' + evalInPage('saleUnits.filter(u=>u.spaceKey==="sp1").map(u=>u.dim).join("|")'));

// ===== 5. 复制=唯一变更路径（第38轮：空间不可改） =====
section('5. 复制空间');
const sp1Units = evalInPage('saleUnits.filter(u=>u.spaceKey==="sp1").length');
alertMsg = '';
window.copySpacePlan('sp1');
ok(alertMsg.includes('副本'), '复制提示含副本');
ok(evalInPage('spaces["sp4"] && spaces["sp4"].status') === 'pending_publish', '副本空间 sp4 待发布');
ok(evalInPage('Object.keys(spaces).length') === 4, '共 4 个空间（不增殖原空间）');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp4").length') === sp1Units, '副本空间叉乘生成 ' + sp1Units + ' 个单元（同构）');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp1").length') === sp1Units, '原空间 sp1 单元保留（不可删除）');

// ===== 6. 既有商品（std）流程不回归 =====
section('6. 既有商品');
window.eval('backToList()');
window.openDetailByCode('maas-product-vtpm-std');
ok(evalInPage('currentProduct.dims') === undefined, 'std 商品无 dims（第21轮统一）');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp1").length') === 8, 'std mock 单元 8 个（sp1，r43 缺省扩展）');
ok(evalInPage('spaces["sp1"].status') === 'published', 'std 常驻空间 published');

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
