// 第13轮验证：列表页直接平铺售卖单元（已上架 Tab=在售单元、未上架 Tab=禁售单元；SKU 第三列点击进详情；按 SKU+单元 ID 排序；无操作列）
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

// ===== 1. 列表结构：平铺售卖单元，14 列，SKU 位于第三列，无操作列 =====
section('1. 列表结构');
const lrows = Array.from(document.querySelectorAll('#listed-tbody tr'));
const prows = Array.from(document.querySelectorAll('#pending-tbody tr'));
ok(lrows.length === 8, '在售 Tab 平铺 8 行（第48轮：std 2 在售 + pro 2 在售 + glm4 4 单元全在售）: ' + lrows.length);
ok(prows.length === 1, '禁售 Tab 平铺 1 行（第48轮：仅 std su-3 真禁售；未配置不显示）: ' + prows.length);
const lhead = Array.from(document.querySelectorAll('#top-tab-listed thead th')).map(th => th.textContent.trim());
ok(lhead.length === 14, '已上架 Tab 表头 14 列: ' + lhead.length);
ok(lhead[0] === '售卖单元' && lhead[1] === '状态' && lhead[2] === 'SKU', '前3列=售卖单元/状态/SKU（SKU 第三列）');
ok(!lhead.includes('操作'), '无操作列');
ok(lhead.includes('关联计费项') && lhead.includes('刊例价') && lhead.includes('购买量step'), '列内容与详情页售卖单元 Tab 一致');
ok(!lhead.includes('商品code') && !lhead.includes('商品名称') && !lhead.includes('商品类型'), '旧商品列已删除');
const phead = Array.from(document.querySelectorAll('#top-tab-pending thead th')).map(th => th.textContent.trim());
ok(phead.length === 14 && phead[2] === 'SKU', '未上架 Tab 表头 14 列且含 SKU');

// ===== 2. Tab 按单元状态过滤（第48轮：在售 Tab=在售；禁售 Tab=真禁售，未配置不显示） =====
section('2. 按单元状态过滤');
ok(lrows.every(r => r.cells[1].textContent.trim() === '在售'), '在售 Tab 全部为在售单元');
ok(prows.every(r => r.cells[1].textContent.trim() === '禁售'), '禁售 Tab 全部为禁售单元（第48轮：未配置不显示）');
// std su-3（90天计划 off）出现在禁售 Tab
const stdSu3p = prows.find(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-std' && r.cells[0].textContent.trim() === 'su-3');
ok(!!stdSu3p, 'std 的禁售单元 su-3 出现在禁售 Tab');
// pre（全部未配置）不出现在禁售 Tab
ok(!prows.some(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pre'), 'pre 全部未配置 → 不出现在禁售 Tab（第48轮）');
ok(!lrows.some(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pre'), 'pre 不出现在在售 Tab');
// pro su-3（30天计划 on）出现在在售 Tab
ok(!!lrows.find(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pro' && r.cells[0].textContent.trim() === 'su-3'), 'pro 的在售单元 su-3 出现在在售 Tab');
ok(!lrows.some(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pro' && ['su-2', 'su-4'].includes(r.cells[0].textContent.trim())), 'pro 未配置单元不出现在在售 Tab');

// ===== 3. 排序：按 SKU + 售卖单元 ID =====
section('3. 排序');
const lKeys = lrows.map(r => r.cells[2].textContent.trim() + '|' + r.cells[0].textContent.trim());
const lSorted = lKeys.slice().sort((a, b) => {
  const [sa, ua] = a.split('|'); const [sb, ub] = b.split('|');
  return sa.localeCompare(sb) || ua.localeCompare(ub);
});
ok(JSON.stringify(lKeys) === JSON.stringify(lSorted), '在售 Tab 按 SKU+单元ID 排序: ' + JSON.stringify(lKeys));

// ===== 4. 禁售行展示口径（对齐详情页：关联配置全 —） =====
section('4. 禁售行口径');
ok(prows.every(r => r.cells[5].textContent.trim() === '—'), '禁售行关联计费项显示 —');
ok(prows.every(r => r.cells[10].textContent.trim() === '—'), '禁售行 payload 显示 —');
const stdSu1 = lrows.find(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-std' && r.cells[0].textContent.trim() === 'su-1');
ok(stdSu1.cells[5].textContent.includes('maas-product-vtpm-std.30d'), '在售行关联计费项展示: ' + stdSu1.cells[5].textContent.trim());
ok(stdSu1.cells[9].textContent.includes('slo-rule-95'), '在售行 SLO 展示');
ok(stdSu1.cells[6].textContent.trim() !== '—', '在售行刊例价展示');

// ===== 5. SKU 列点击进入商品详情 =====
section('5. SKU 跳转');
const skuBtn = stdSu1.cells[2].querySelector('button');
ok(!!skuBtn && skuBtn.textContent.includes('maas-product-vtpm-std'), 'SKU 列为可点击按钮');
skuBtn.click();
ok(!document.getElementById('detail-view').classList.contains('hidden'), '点击 SKU 进入商品详情页');
ok(evalInPage('currentProduct.code') === 'maas-product-vtpm-std', '详情页打开正确的商品');
window.backToList();

// ===== 6. 详情页操作后列表实时刷新（单元状态驱动 Tab 归属） =====
section('6. 状态变化联动');
window.openDetailByCode('maas-product-vtpm-pre');
window.startEdit();
// 第45轮：pre 空间默认已发布——只发计划（计划发布→在售+档期内）→ su-1 在售
window.eval('planRowStatuses[0] = "published"; renderSaleUnits(); refreshProductBadge();');
window.backToList();
let lrows2 = Array.from(document.querySelectorAll('#listed-tbody tr'));
ok(lrows2.length === 9, '第45轮：pre 空间默认已发布 → 发计划后 su-1 在售 → 在售 Tab 9 行: ' + lrows2.length);
// 停用空间+计划待发布 → su-3 禁售（第48轮：计入禁售 Tab）、su-1/su-2 未配置不显示
window.openDetailByCode('maas-product-vtpm-pre');
window.startEdit();
window.eval('planRowStatuses[0] = "pending_publish"; spaces["sp1"].status = "stopped"; renderSaleUnits(); refreshProductBadge();');
window.backToList();
lrows2 = Array.from(document.querySelectorAll('#listed-tbody tr'));
let prows2 = Array.from(document.querySelectorAll('#pending-tbody tr'));
ok(lrows2.length === 8, '空间停用后 su-1 未配置 → 在售 Tab 回 8 行: ' + lrows2.length);
ok(prows2.length === 4, '第48轮：空间停用 → pre 三单元升级禁售（红）→ 禁售 Tab 4 行（std su-3 + pre×3）: ' + prows2.length);
// 复原：重新发布空间（计划已发布）→ pre 三单元回在售
window.openDetailByCode('maas-product-vtpm-pre');
window.startEdit();
window.eval('planRowStatuses[0] = "published"; publishSpacePlan("sp1"); renderSaleUnits(); refreshProductBadge();');
window.backToList();
lrows2 = Array.from(document.querySelectorAll('#listed-tbody tr'));
prows2 = Array.from(document.querySelectorAll('#pending-tbody tr'));
ok(lrows2.length === 9, '空间+计划均发布后 pre su-1 转在售（su-2/su-3 无计划仍未配置）→ 在售 Tab 9 行: ' + lrows2.length);
ok(prows2.length === 1, '禁售 Tab 剩 1 行（仅 std su-3）：' + prows2.length);

// ===== 7. 无售卖单元的商品 → 不再显示禁售占位行（第48轮） =====
section('7. 空态占位');
window.openProductModal();
document.getElementById('inp-code').value = 'maas-product-vtpm-new13';
document.getElementById('inp-name').value = '空商品测试';
window.submitProduct();
window.backToList();
const pTxt = document.getElementById('pending-tbody').textContent;
ok(!pTxt.includes('maas-product-vtpm-new13'), '第48轮：空商品不出现在禁售 Tab（占位行已删）');
ok(!pTxt.includes('该商品暂无售卖单元'), '第48轮：无「该商品暂无售卖单元」占位文案');
// 新商品可从列表右上「新增商品」以外路径进入：直接 code 打开
window.openDetailByCode('maas-product-vtpm-new13');
ok(evalInPage('currentProduct.code') === 'maas-product-vtpm-new13', '可按 code 进入空商品详情页');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
