// 第15轮验证：新增商品弹窗「售卖维度」勾选字段（admin-products.html）
// ①弹窗展示全量可选维度 ②至少勾选一个拦截 ③勾选结果写入商品 dims
// ④创建售卖单元弹窗只展示已勾选维度的度量组 ⑤详情页基本信息展示售卖维度 ⑥既有商品（全维度）不受影响
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

// ===== 1. 弹窗结构 =====
section('1. 弹窗结构');
window.openProductModal();
const dimChecks = Array.from(document.querySelectorAll('.product-dim-check'));
ok(dimChecks.length === 2, '售卖维度勾选项 2 个（dimensionOptions 全量）');
ok(dimChecks.map(c => c.value).join(',') === '购买量区间,购买周期', '维度全集=购买量区间/购买周期');
ok(dimChecks.every(c => !c.checked), '默认不勾选');
ok(!!document.getElementById('inp-dims'), '弹窗含 #inp-dims 勾选区');
// 提示文案
const dimsBlock = document.getElementById('inp-dims');
ok(dimsBlock.closest('div').nextElementSibling && dimsBlock.closest('div').nextElementSibling.textContent.includes('不勾选则默认全部维度'), '含「不勾选则默认全部维度」提示（第16轮非必选）');

// ===== 2. 非必选（第16轮修订：未勾选允许提交，dims=[] 按全量维度兜底） =====
section('2. 非必选');
alertMsg = '';
document.getElementById('inp-code').value = 'maas-product-vtpm-r15a';
document.getElementById('inp-name').value = '维度兜底测试';
window.submitProduct();
ok(alertMsg === '', '未勾选维度时提交不拦截（非必选）');
ok(evalInPage('currentProduct.code') === 'maas-product-vtpm-r15a', '未勾选也能创建成功并进入详情页');
ok(evalInPage('currentProduct.dims.length') === 0, 'currentProduct.dims=[]（未勾选）');
ok(evalInPage('productDims().join(",")') === '购买量区间,购买周期', 'productDims() 兜底=全量维度');
// 详情页基本信息展示「全部维度（未指定）」
ok(document.getElementById('detail-info').textContent.includes('全部维度'), '详情页未勾选时展示「全部维度（未指定）」');

// ===== 3. 勾选提交 → dims 写入 =====
section('3. 勾选提交');
window.backToList();
window.openProductModal();
// 仅勾「购买周期」单维度
document.querySelectorAll('.product-dim-check').forEach(c => { c.checked = c.value === '购买周期'; });
document.getElementById('inp-code').value = 'maas-product-vtpm-r15a';
document.getElementById('inp-name').value = '维度拦截测试';
window.submitProduct();
ok(evalInPage('currentProduct.code') === 'maas-product-vtpm-r15a', '勾选后创建成功并进入详情页');
ok(evalInPage('currentProduct.dims.join(",")') === '购买周期', 'currentProduct.dims=[购买周期]（单维度）');
ok(!document.getElementById('detail-view').classList.contains('hidden'), '创建后直接进入详情页');
// 详情页基本信息展示售卖维度
const infoTxt = document.getElementById('detail-info').textContent;
ok(infoTxt.includes('售卖维度') && infoTxt.includes('购买周期'), '详情页基本信息展示售卖维度');

// ===== 4. 创建售卖单元弹窗 → 只展示勾选维度 =====
section('4. 维度范围联动');
window.eval('startEdit()');
window.openSuConfirmModal();
const suDimTitles = Array.from(document.querySelectorAll('#su-confirm-body p.text-xs.font-semibold')).map(p => p.textContent.replace(/^[^\u4e00-\u9fa5]+/, ''));
ok(suDimTitles.length === 1, '创建售卖单元弹窗只展示 1 个维度（商品 dims 内）');
ok(suDimTitles[0].includes('购买周期') || suDimTitles.join(',').includes('购买周期'), '展示的维度=购买周期: ' + suDimTitles.join(','));
ok(!suDimTitles.join(',').includes('购买量区间'), '未勾选的「购买量区间」不出现');
// 勾选 30天 → 创建
document.querySelector('#su-confirm-body input[type="checkbox"][data-measure="30天"]').checked = true;
alertMsg = '';
window.confirmSaleUnits();
ok(alertMsg.includes('已创建售卖单元'), '单维度商品创建售卖单元成功: ' + alertMsg);
ok(evalInPage('saleUnits.length') === 1, '生成 1 个售卖单元');
ok(evalInPage('saleUnits[0].dim') === '购买周期', '售卖单元 dim=购买周期（单维度组合）');

// ===== 5. 既有商品（全维度）不受影响 =====
section('5. 既有商品');
window.backToList();
window.openDetailByCode('maas-product-vtpm-std');
ok(evalInPage('currentProduct.dims.length') === 2, 'std 商品 dims=2（全维度，向后兼容）');
window.openSuConfirmModal();
const suDimTitles2 = Array.from(document.querySelectorAll('#su-confirm-body p.text-xs.font-semibold')).map(p => p.textContent.trim());
ok(suDimTitles2.join(',').includes('购买量区间') && suDimTitles2.join(',').includes('购买周期'), 'std 创建售卖单元弹窗仍展示两个维度');

// ===== 6. 新建商品入列带 dims =====
section('6. 列表入列');
window.openProductModal();
document.getElementById('inp-code').value = 'maas-product-vtpm-r15b';
document.getElementById('inp-name').value = '轮15商品B';
document.querySelectorAll('.product-dim-check').forEach(c => { c.checked = c.value === '购买量区间'; });
window.submitProduct();
window.backToList();
ok(evalInPage('allProducts.find(p=>p.code==="maas-product-vtpm-r15b")') !== undefined, '新建商品入列 allProducts');
ok(evalInPage('allProducts.find(p=>p.code==="maas-product-vtpm-r15b").dims.join(",")') === '购买量区间', '入列商品携带 dims=[购买量区间]');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
