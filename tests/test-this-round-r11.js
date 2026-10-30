// 第11轮验证：商品状态推导化（已上架=存在至少一个在售售卖单元）
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

// ===== 1. 初始列表：std 已上架、pro 已上架（su-1 在售）、pre 未上架 =====
section('1. 初始列表推导');
const listedTxt = document.getElementById('listed-tbody').textContent;
const pendingTxt = document.getElementById('pending-tbody').textContent;
ok(listedTxt.includes('maas-product-vtpm-std') && listedTxt.includes('maas-product-vtpm-pro'), '已上架 Tab 含 std/pro（第13轮：SKU 列）');
ok(!listedTxt.includes('maas-product-vtpm-pre'), '已上架 Tab 不含 pre');
ok(pendingTxt.includes('maas-product-vtpm-pre'), '未上架 Tab 含 pre（SKU 列）');
ok(pendingTxt.includes('禁售') && !pendingTxt.includes('在售'), '未上架 Tab 单元状态=禁售');
ok(listedTxt.includes('在售'), '已上架 Tab 含在售售卖单元（第13轮：列表平铺售卖单元）');
// Tab 文案
ok(document.querySelector('.admin-tab[data-tab="pending"]').textContent === '未上架', 'Tab 名=未上架（原待上架）');
// 无 status 假字段
ok(window.eval('allProducts.every(p => p.status === undefined && p.lifeStatus === undefined)'), '商品对象无 status/lifeStatus 字段');

// ===== 2. 详情页徽标推导 =====
section('2. 详情页徽标');
window.openDetailByCode('maas-product-vtpm-std');
ok(document.getElementById('detail-status').textContent === '已上架', 'std 详情徽标=已上架');
window.backToList();
window.openDetailByCode('maas-product-vtpm-pre');
ok(document.getElementById('detail-status').textContent === '未上架', 'pre 详情徽标=未上架');

// ===== 3. 编辑驱动状态变化：pre 发布计划 → 商品变已上架 =====
section('3. 发布→上架');
window.startEdit();
window.eval('planRowStatuses[0] = "published"; renderPlan(); renderSaleUnits(); refreshProductBadge();');
ok(document.getElementById('detail-status').textContent === '已上架', '发布计划并生效后 pre 徽标=已上架');
// 返回列表 → 移入已上架 Tab（快照回写）
window.backToList();
const listedTxt2 = document.getElementById('listed-tbody').textContent;
ok(listedTxt2.includes('maas-product-vtpm-pre'), '返回列表后 pre 移入已上架 Tab');
ok(!Array.from(document.querySelectorAll('#pending-tbody tr')).some(r => r.cells[2] && r.cells[2].textContent.trim() === 'maas-product-vtpm-pre' && r.cells[0].textContent.trim() === 'su-1'), '第13轮：pre 的 su-1 不再出现在未上架 Tab（转在售）');

// ===== 4. 停用全部生效计划 → 商品回未上架 =====
section('4. 停用→未上架');
window.openDetailByCode('maas-product-vtpm-std');
window.startEdit();
// std 3 个计划全部停用 → 无在售单元
window.stopPlanRow(0); window.stopPlanRow(1); window.stopPlanRow(2);
ok(document.getElementById('detail-status').textContent === '未上架', '全部计划停用后 std 徽标=未上架');
window.backToList();
const listedTxt3 = document.getElementById('listed-tbody').textContent;
ok(!listedTxt3.includes('maas-product-vtpm-std'), '返回列表后 std 移出已上架 Tab');
ok(document.getElementById('pending-tbody').textContent.includes('maas-product-vtpm-std'), 'std 进入未上架 Tab');

// ===== 5. 重新发布恢复 =====
section('5. 恢复');
window.openDetailByCode('maas-product-vtpm-std');
window.startEdit();
window.publishPlanRow(0);
ok(document.getElementById('detail-status').textContent === '已上架', '重新发布计划后 std 恢复已上架');

// ===== 6. 最高优先级口径：下架的最高优先级计划压制上架计划 =====
section('6. 最高优先级口径');
window.backToList();
window.openDetailByCode('maas-product-vtpm-std');
window.startEdit();
// 恢复全部计划生效（第4节停用了1/2，第5节只恢复了0）
window.publishPlanRow(1); window.publishPlanRow(2);
ok(document.getElementById('detail-status').textContent === '已上架', '三个计划全部生效 → 已上架');
// 构造：su-1 追加一个更高优先级（999）但下架的计划 → su-1 被压制禁售
window.eval(`
  (function(){
    planRows.push(JSON.parse(JSON.stringify(planRows[0])));
    const i = planRows.length - 1;
    planRows[i].name = 'vTPM 预留·标准·压制';
    planRows[i].units = ['su-1'];
    planRows[i].unitStates = { 'su-1': 'off' };
    planRows[i].priority = 999;
    planRowStatuses.push('published');
    renderPlan(); renderSaleUnits(); refreshProductBadge();
  })()
`);
// 第20轮：售卖单元前三列=function（合并）/售卖空间（合并）/售卖单元，su-1 首行完整呈现
const su1Row = Array.from(document.querySelectorAll('#saleunit-tbody tr')).find(r => Array.from(r.cells).some(c => c.textContent.trim() === 'su-1'));
ok(Array.from(su1Row.cells).some(c => c.textContent.trim() === '禁售'), 'su-1 被最高优先级下架计划压制 → 单元禁售');
ok(document.getElementById('detail-status').textContent === '已上架', 'su-1 被压制但 su-2/su-3 仍在售 → 商品仍已上架');
// 所有计划单元均下架 → 商品未上架（即使计划已发布且生效）
window.eval(`
  (function(){
    planRows.forEach(r => { Object.keys(r.unitStates || {}).forEach(k => { r.unitStates[k] = 'off'; }); });
    renderSaleUnits(); refreshProductBadge();
  })()
`);
ok(document.getElementById('detail-status').textContent === '未上架', '所有计划单元均下架 → 商品未上架（即使计划已发布且生效）');

// ===== 7. 新建商品：未上架 → 无计划 =====
section('7. 新建商品');
window.backToList();
window.openProductModal();
document.getElementById('inp-code').value = 'maas-product-vtpm-new1';
document.getElementById('inp-name').value = '新建商品测试';
document.querySelectorAll('.product-dim-check').forEach(cb => { cb.checked = true; });
window.submitProduct();
ok(document.getElementById('detail-status').textContent === '未上架', '新建商品详情页徽标=未上架');
window.backToList();
ok(document.getElementById('pending-tbody').textContent.includes('maas-product-vtpm-new1'), '新建商品出现在未上架 Tab');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
