// 第13轮验证列表页平铺售卖单元——第49轮口径重写：四 Tab（maas已上架/maas未上架/vTPM已上架/vTPM未上架）
// 已上架=当前生效空间内在售单元；未上架=当前生效空间内未配置/禁售单元；SKU 第三列点击进详情；按 SKU+单元 ID 排序；无操作列
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
const rowsOf = (id) => Array.from(document.querySelectorAll('#' + id + '-tbody tr')).filter(r => r.cells[0] && /^su-/.test(r.cells[0].textContent.trim()));

// ===== 1. 列表结构：平铺售卖单元，14 列，SKU 位于第三列，无操作列 =====
section('1. 列表结构');
const lrows = rowsOf('vtpm-listed');
const prows = rowsOf('maas-listed');
const vrows = rowsOf('vtpm-unlisted');
ok(prows.length === 4, 'maas已上架 Tab 平铺 4 行（glm4 sp1 全部 4 单元在售）: ' + prows.length);
ok(lrows.length === 4, 'vTPM已上架 Tab 平铺 4 行（std 2 在售 + pro 2 在售）: ' + lrows.length);
ok(vrows.length === 6, 'vTPM未上架 Tab 平铺 6 行（pre 3 未配置 + pro 2 未配置 + std su-3 禁售）: ' + vrows.length);
const lhead = Array.from(document.querySelectorAll('#top-tab-maas-listed thead th')).map(th => th.textContent.trim());
ok(lhead.length === 9, 'maas已上架 Tab 表头 9 列（第56轮：+计费项标签）: ' + lhead.length);
ok(lhead[0] === '售卖单元' && lhead[1] === '状态' && lhead[2] === 'SKU', '前3列=售卖单元/状态/SKU（SKU 第三列）');
ok(!lhead.includes('操作'), '无操作列');
ok(lhead.includes('关联计费项') && lhead.includes('刊例价') && !lhead.includes('购买量step') && !lhead.includes('折算系数'), 'maas Tab 无 vTPM 专属列（第50轮）');
ok(!lhead.includes('商品code') && !lhead.includes('商品名称') && !lhead.includes('商品类型'), '旧商品列已删除');
const vhead = Array.from(document.querySelectorAll('#top-tab-vtpm-unlisted thead th')).map(th => th.textContent.trim());
ok(vhead.length === 15 && vhead[2] === 'SKU' && vhead.includes('折算系数') && vhead.includes('购买量step'), 'vTPM未上架 Tab 表头 15 列含 vTPM 专属列（第56轮+标签列；对照组）');
// maas 行 9 cells；vTPM 行 15 cells（第56轮：+计费项标签）
ok(prows.every(r => r.cells.length === 9), 'maas已上架 行 9 cells（第56轮）');
ok(vrows.every(r => r.cells.length === 15), 'vTPM未上架 行 15 cells');
// 类型归属：glm4（online-text）只出现在 maas 组；std/pro/pre（vTPM）只出现在 vTPM 组
ok(prows.every(r => r.cells[2].textContent.trim() === 'maas-online-text-glm4'), 'maas已上架 Tab 全部为 glm4 单元');
ok(!lrows.some(r => r.cells[2].textContent.trim() === 'maas-online-text-glm4'), 'glm4 不出现在 vTPM已上架 Tab');

// ===== 2. Tab 按单元状态过滤（第49轮：已上架=在售；未上架=未配置+禁售） =====
section('2. 按单元状态过滤');
ok(lrows.every(r => r.cells[1].textContent.trim() === '在售'), 'vTPM已上架 Tab 全部为在售单元');
ok(vrows.every(r => ['未配置', '禁售'].includes(r.cells[1].textContent.trim())), 'vTPM未上架 Tab 全部为未配置/禁售单元');
// std su-3（90天计划 off）出现在 vTPM未上架 Tab 且状态禁售
const stdSu3p = vrows.find(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-std' && r.cells[0].textContent.trim() === 'su-3');
ok(!!stdSu3p && stdSu3p.cells[1].textContent.trim() === '禁售', 'std 的禁售单元 su-3 出现在 vTPM未上架 Tab 且状态=禁售');
// pre（全部未配置）出现在 vTPM未上架 Tab（第49轮：未配置计入未上架）
ok(vrows.filter(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pre').length === 3, 'pre 三单元未配置 → 全部出现在 vTPM未上架 Tab（第49轮）');
ok(!lrows.some(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pre'), 'pre 不出现在 vTPM已上架 Tab');
// pro su-1/su-3（30天计划 on）出现在 vTPM已上架 Tab
ok(lrows.filter(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pro').length === 2, 'pro 的在售单元 su-1/su-3 出现在 vTPM已上架 Tab');
ok(vrows.filter(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pro' && ['su-2', 'su-4'].includes(r.cells[0].textContent.trim())).length === 2, 'pro 未配置单元 su-2/su-4 出现在 vTPM未上架 Tab');

// ===== 3. 排序：按 SKU + 售卖单元 ID =====
section('3. 排序');
const lKeys = lrows.map(r => r.cells[2].textContent.trim() + '|' + r.cells[0].textContent.trim());
const lSorted = lKeys.slice().sort((a, b) => {
  const [sa, ua] = a.split('|'); const [sb, ub] = b.split('|');
  return sa.localeCompare(sb) || ua.localeCompare(ub);
});
ok(JSON.stringify(lKeys) === JSON.stringify(lSorted), 'vTPM已上架 Tab 按 SKU+单元ID 排序: ' + JSON.stringify(lKeys));

// ===== 4. 未上架行展示口径（对齐详情页：关联配置全 —） =====
section('4. 未上架行口径');
ok(vrows.every(r => r.cells[5].textContent.trim() === '—'), '未上架行关联计费项显示 —');
ok(vrows.every(r => r.cells[11].textContent.trim() === '—'), '未上架行 payload 显示 —');
const stdSu1 = lrows.find(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-std' && r.cells[0].textContent.trim() === 'su-1');
ok(stdSu1.cells[5].textContent.includes('maas-product-vtpm-std.30d'), '在售行关联计费项展示: ' + stdSu1.cells[5].textContent.trim());
ok(stdSu1.cells[10].textContent.includes('slo-rule-95'), '在售行 SLO 展示');
ok(stdSu1.cells[7].textContent.trim() !== '—', '在售行刊例价展示');

// ===== 5. SKU 列点击进入商品详情 =====
section('5. SKU 跳转');
const skuBtn = stdSu1.cells[2].querySelector('button');
ok(!!skuBtn && skuBtn.textContent.includes('maas-product-vtpm-std'), 'SKU 列为可点击按钮');
skuBtn.click();
ok(!document.getElementById('detail-view').classList.contains('hidden'), '点击 SKU 进入商品详情页');
ok(evalInPage('currentProduct.code') === 'maas-product-vtpm-std', '详情页打开正确的商品');
window.backToList();

// ===== 6. 详情页操作后列表实时刷新（单元状态驱动 Tab 归属；第49轮：无生效空间→商品消失） =====
section('6. 状态变化联动');
window.openDetailByCode('maas-product-vtpm-pre');
window.startEdit();
// 发布计划（空间默认已发布）→ su-1 在售
window.eval('planRowStatuses[0] = "published"; renderSaleUnits(); refreshProductBadge();');
window.backToList();
let vl2 = rowsOf('vtpm-listed');
ok(vl2.length === 5, '发布计划后 pre su-1 在售 → vTPM已上架 Tab 5 行: ' + vl2.length);
ok(vl2.some(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pre' && r.cells[0].textContent.trim() === 'su-1'), 'pre su-1 在 vTPM已上架 Tab');
// 停用空间+计划待发布 → pre 无生效空间 → 三单元从 Tab 消失（第49轮：只看当前生效空间）
window.openDetailByCode('maas-product-vtpm-pre');
window.startEdit();
window.eval('planRowStatuses[0] = "pending_publish"; spaces["sp1"].status = "stopped"; renderSaleUnits(); refreshProductBadge();');
window.backToList();
vl2 = rowsOf('vtpm-listed');
let vu2 = rowsOf('vtpm-unlisted');
ok(vl2.length === 4, '空间停用后 pre 无生效空间 → vTPM已上架 Tab 回 4 行: ' + vl2.length);
ok(vu2.length === 3, '第49轮：空间停用 → pre 三单元完全消失 → vTPM未上架 Tab 3 行（pro×2 + std su-3）: ' + vu2.length);
// 复原：重新发布空间（计划已发布）→ pre su-1 转在售，su-2/su-3 未配置 → 未上架
window.openDetailByCode('maas-product-vtpm-pre');
window.startEdit();
window.eval('planRowStatuses[0] = "published"; publishSpacePlan("sp1"); renderSaleUnits(); refreshProductBadge();');
window.backToList();
vl2 = rowsOf('vtpm-listed');
vu2 = rowsOf('vtpm-unlisted');
ok(vl2.length === 5, '空间+计划均发布后 pre su-1 转在售 → vTPM已上架 Tab 5 行: ' + vl2.length);
ok(vu2.length === 5, 'vTPM未上架 Tab 5 行（pre su-2/su-3 未配置 + pro×2 + std su-3）: ' + vu2.length);
ok(vu2.filter(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pre').every(r => r.cells[1].textContent.trim() === '未配置'), 'pre 留在未上架的 su-2/su-3 状态=未配置');

// ===== 7. 无售卖单元的商品 → 不出现在任何 Tab（第48轮占位行已删） =====
section('7. 空态占位');
window.openProductModal();
document.getElementById('inp-code').value = 'maas-product-vtpm-new13';
document.getElementById('inp-name').value = '空商品测试';
window.submitProduct();
window.backToList();
const vTxt = document.getElementById('vtpm-unlisted-tbody').textContent;
const mTxt = document.getElementById('maas-unlisted-tbody').textContent;
ok(!vTxt.includes('maas-product-vtpm-new13'), '空商品不出现在 vTPM未上架 Tab');
ok(!mTxt.includes('该商品暂无售卖单元'), '无「该商品暂无售卖单元」占位文案');
// 新商品可从列表右上「新增商品」以外路径进入：直接 code 打开
window.openDetailByCode('maas-product-vtpm-new13');
ok(evalInPage('currentProduct.code') === 'maas-product-vtpm-new13', '可按 code 进入空商品详情页');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
