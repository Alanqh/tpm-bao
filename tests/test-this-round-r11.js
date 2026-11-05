// 第11轮原验证「商品状态推导化」——第49轮口径重写：
// ①列表页四 Tab=maas已上架/maas未上架/vTPM已上架/vTPM未上架（商品类型 × 上架状态）
// ②只统计各商品当前时刻生效售卖空间内单元：在售→已上架；未配置/禁售→未上架；无生效空间→不出现
// ③productIsListed 推导函数保留（兼容入口）但不再驱动 UI
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
const rowsOf = (id) => Array.from(document.querySelectorAll('#' + id + '-tbody tr')).filter(r => r.cells[0] && /^su-/.test(r.cells[0].textContent.trim()));

// ===== 1. 列表四 Tab（第49轮：类型 × 上架状态） =====
section('1. 列表四 Tab');
const tabBtns = Array.from(document.querySelectorAll('#list-view .admin-card .admin-tab')).map(b => b.textContent.trim());
ok(tabBtns.join(',') === 'maas已上架,maas未上架,vTPM已上架,vTPM未上架', 'Tab 名=maas已上架/maas未上架/vTPM已上架/vTPM未上架（第49轮）：' + tabBtns.join(','));
ok(document.querySelector('.admin-tab[data-tab="maas-listed"]').classList.contains('active'), '默认打开 maas已上架 Tab');
ok(!document.getElementById('top-tab-maas-listed').classList.contains('hidden'), 'maas已上架 Tab 内容默认可见');
ok(document.getElementById('top-tab-maas-unlisted').classList.contains('hidden'), 'maas未上架 Tab 内容默认隐藏');
ok(document.getElementById('top-tab-vtpm-listed').classList.contains('hidden'), 'vTPM已上架 Tab 内容默认隐藏');
ok(document.getElementById('top-tab-vtpm-unlisted').classList.contains('hidden'), 'vTPM未上架 Tab 内容默认隐藏');
// 切换 Tab
window.switchTopTab('vtpm-unlisted');
ok(!document.getElementById('top-tab-vtpm-unlisted').classList.contains('hidden'), 'switchTopTab 切出 vTPM未上架 内容');
ok(document.querySelector('.admin-tab[data-tab="vtpm-unlisted"]').classList.contains('active'), 'vTPM未上架 按钮激活');
window.switchTopTab('maas-listed');

const vilTxt = document.getElementById('vtpm-listed-tbody').textContent;
const vulTxt = document.getElementById('vtpm-unlisted-tbody').textContent;
const malTxt = document.getElementById('maas-listed-tbody').textContent;
const mulTxt = document.getElementById('maas-unlisted-tbody').textContent;
ok(vilTxt.includes('maas-product-vtpm-std') && vilTxt.includes('maas-product-vtpm-pro'), 'vTPM已上架 Tab 含 std/pro');
ok(!vilTxt.includes('maas-product-vtpm-pre'), 'pre（计划待发布→单元未配置）不在 vTPM已上架 Tab');
ok(!vilTxt.includes('maas-online-text-glm4'), 'glm4（online-text 类型）不在 vTPM 组 Tab');
ok(!vulTxt.includes('maas-online-text-glm4'), 'glm4 不在 vTPM未上架 Tab');
ok(vulTxt.includes('maas-product-vtpm-pre'), 'pre 未配置单元出现在 vTPM未上架 Tab（第49轮：未配置计入未上架）');
ok(vulTxt.includes('禁售'), 'vTPM未上架 Tab 含禁售单元（std su-3）');
ok(malTxt.includes('maas-online-text-glm4') && malTxt.includes('在售'), 'maas已上架 Tab 含 glm4 在售单元');
ok(mulTxt.includes('暂无未上架售卖单元'), 'maas未上架 Tab 空态（glm4 全部在售）');
// 商品仍无 status/lifeStatus 假字段（第11轮口径保留）
ok(evalInPage('allProducts.every(p => p.status === undefined && p.lifeStatus === undefined)'), '商品对象无 status/lifeStatus 字段（纯推导）');

// ===== 2. 详情页无上架状态徽标（第33轮） =====
section('2. 详情页徽标（已删除）');
window.openDetailByCode('maas-product-vtpm-std');
ok(!document.getElementById('detail-status'), '#detail-status 元素已删（商品不展示上架状态标识）');
ok(evalInPage('typeof refreshProductBadge') === 'function', 'refreshProductBadge 函数保留（兼容调用点，元素缺失时静默）');
window.eval('refreshProductBadge()'); // 不应报错

// ===== 3. 编辑驱动单元状态变化 → 列表 Tab 联动（第49轮口径：无生效空间的商品从四 Tab 消失） =====
section('3. 状态变化联动');
// 第45轮起 pre 空间默认已发布：发布计划 → su-1 在售
window.openDetailByCode('maas-product-vtpm-pre');
window.startEdit();
window.eval('planRowStatuses[0] = "published"; renderPlan(); renderSaleUnits();');
window.eval('exitEdit()');
window.backToList();
let vil1 = rowsOf('vtpm-listed');
ok(vil1.some(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pre' && r.cells[0].textContent.trim() === 'su-1'), '发布计划后 pre su-1 在售 → 出现在 vTPM已上架 Tab');
ok(!rowsOf('vtpm-unlisted').some(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pre' && r.cells[0].textContent.trim() === 'su-1'), 'pre su-1 不再出现在 vTPM未上架 Tab');
// 停用空间+计划待发布 → pre 无生效空间 → 整个商品从四 Tab 消失（第49轮：只看当前生效空间内单元）
window.openDetailByCode('maas-product-vtpm-pre');
window.startEdit();
window.eval('planRowStatuses[0] = "pending_publish"; spaces["sp1"].status = "stopped"; renderPlan(); renderSaleUnits();');
window.eval('exitEdit()');
window.backToList();
ok(!document.getElementById('vtpm-listed-tbody').textContent.includes('maas-product-vtpm-pre'), '第49轮：空间停用 → pre 无生效空间 → 不在 vTPM已上架 Tab');
ok(!document.getElementById('vtpm-unlisted-tbody').textContent.includes('maas-product-vtpm-pre'), '第49轮：空间停用 → pre 无生效空间 → 也不在 vTPM未上架 Tab（完全消失）');
// 空间重新发布（计划已发布）→ su-1 转在售，su-2/su-3 未配置 → 未上架
window.openDetailByCode('maas-product-vtpm-pre');
window.startEdit();
window.eval('publishSpacePlan("sp1"); planRowStatuses[0] = "published"; renderPlan(); renderSaleUnits();');
window.eval('exitEdit()');
window.backToList();
const vilTxt2 = document.getElementById('vtpm-listed-tbody').textContent;
const vulRows2 = rowsOf('vtpm-unlisted');
ok(vilTxt2.includes('maas-product-vtpm-pre'), '空间+计划均发布后 pre su-1 转在售 → 出现在 vTPM已上架 Tab');
ok(vulRows2.some(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pre' && r.cells[0].textContent.trim() === 'su-2' && r.cells[1].textContent.trim() === '未配置'), 'pre su-2 未配置 → 留在 vTPM未上架 Tab');

// ===== 4. productIsListed 推导函数仍可用（兼容入口） =====
section('4. productIsListed 兼容');
ok(evalInPage('productIsListed("maas-product-vtpm-std")') === true, 'std 存在在售单元 → true');
ok(evalInPage('productIsListed("maas-product-vtpm-xxx")') === false, '未知商品 → false');

// ===== 5. 新建商品（无单元无计划）→ 不出现在任何 Tab =====
section('5. 新建商品');
window.openProductModal();
document.getElementById('inp-code').value = 'maas-product-vtpm-new1';
document.getElementById('inp-name').value = '徽标删除后新商品';
window.submitProduct();
ok(evalInPage('saleUnits.length') === 0 && evalInPage('planRows.length') === 0, '新建商品无单元无计划（前端草稿态）');
window.backToList();
ok(!document.getElementById('vtpm-unlisted-tbody').textContent.includes('maas-product-vtpm-new1'), '无售卖单元的商品不出现在 vTPM未上架 Tab');
ok(!document.getElementById('maas-unlisted-tbody').textContent.includes('maas-product-vtpm-new1'), '无售卖单元的商品不出现在 maas未上架 Tab');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
