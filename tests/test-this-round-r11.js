// 第11轮原验证「商品状态推导化（已上架/未上架）」——第33轮口径重写：
// ①商品详情页不再展示上架状态徽标（#detail-status 已删）②列表页 Tab=在售/禁售（按售卖单元状态直查，默认在售）
// ③productIsListed 推导函数保留（openPendingDetail 兼容入口用）但不再驱动 UI
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('prototype/admin-products.html', 'utf8');
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

// ===== 1. 列表 Tab：在售/禁售（第33轮） =====
section('1. 列表 Tab');
const listedTxt = document.getElementById('listed-tbody').textContent;
const pendingTxt = document.getElementById('pending-tbody').textContent;
ok(listedTxt.includes('maas-product-vtpm-std') && listedTxt.includes('maas-product-vtpm-pro'), '在售 Tab 含 std/pro');
ok(!listedTxt.includes('maas-product-vtpm-pre'), '在售 Tab 不含 pre（计划待发布→单元禁售）');
ok(pendingTxt.includes('maas-product-vtpm-pre'), '禁售 Tab 含 pre');
ok(pendingTxt.includes('禁售') && !pendingTxt.includes('在售'), '禁售 Tab 单元状态=禁售');
ok(listedTxt.includes('在售'), '在售 Tab 含在售售卖单元');
const tabBtns = Array.from(document.querySelectorAll('.admin-tab[data-tab="listed"], .admin-tab[data-tab="pending"]')).map(b => b.textContent.trim());
ok(tabBtns.join(',') === '在售,禁售', 'Tab 名=在售/禁售（第33轮）：' + tabBtns.join(','));
ok(document.querySelector('.admin-tab[data-tab="listed"]').classList.contains('active'), '默认打开在售 Tab（第33轮）');
ok(!document.getElementById('top-tab-listed').classList.contains('hidden'), '在售 Tab 内容默认可见');
ok(document.getElementById('top-tab-pending').classList.contains('hidden'), '禁售 Tab 内容默认隐藏');
// 商品仍无 status/lifeStatus 假字段（第11轮口径保留）
ok(evalInPage('allProducts.every(p => p.status === undefined && p.lifeStatus === undefined)'), '商品对象无 status/lifeStatus 字段（纯推导）');

// ===== 2. 详情页无上架状态徽标（第33轮） =====
section('2. 详情页徽标（已删除）');
window.openDetailByCode('maas-product-vtpm-std');
ok(!document.getElementById('detail-status'), '#detail-status 元素已删（商品不展示上架状态标识）');
ok(evalInPage('typeof refreshProductBadge') === 'function', 'refreshProductBadge 函数保留（兼容调用点，元素缺失时静默）');
window.eval('refreshProductBadge()'); // 不应报错

// ===== 3. 编辑驱动单元状态变化 → 列表 Tab 联动（第13轮快照回写仍生效）=====
section('3. 状态变化联动');
window.openDetailByCode('maas-product-vtpm-pre');
window.startEdit();
window.eval('planRowStatuses[0] = "published"; renderPlan(); renderSaleUnits();');
window.backToList();
const listedTxt2 = document.getElementById('listed-tbody').textContent;
ok(listedTxt2.includes('maas-product-vtpm-pre'), 'pre 计划发布后 su-1 转在售 → 出现在在售 Tab');
ok(!Array.from(document.querySelectorAll('#pending-tbody tr')).some(r => r.cells[2] && r.cells[2].textContent.trim() === 'maas-product-vtpm-pre' && r.cells[0].textContent.trim() === 'su-1'), 'pre 的 su-1 不再出现在禁售 Tab（转在售）');

// ===== 4. productIsListed 推导函数仍可用（兼容入口） =====
section('4. productIsListed 兼容');
ok(evalInPage('productIsListed("maas-product-vtpm-std")') === true, 'std 存在在售单元 → true');
ok(evalInPage('productIsListed("maas-product-vtpm-xxx")') === false, '未知商品 → false');

// ===== 5. 新建商品（无单元无计划）→ 禁售 Tab 占位 =====
section('5. 新建商品');
window.openProductModal();
document.getElementById('inp-code').value = 'maas-product-vtpm-new1';
document.getElementById('inp-name').value = '徽标删除后新商品';
window.submitProduct();
ok(evalInPage('saleUnits.length') === 0 && evalInPage('planRows.length') === 0, '新建商品无单元无计划（前端草稿态）');
window.backToList();
ok(document.getElementById('pending-tbody').textContent.includes('maas-product-vtpm-new1'), '新建商品出现在禁售 Tab');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
