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
ok(lrows.length === 4, '已上架 Tab 平铺 4 行（std 3 在售 + pro su-1 在售）: ' + lrows.length);
ok(prows.length === 6, '未上架 Tab 平铺 6 行（pre 3 + pro su-2/3/4 禁售）: ' + prows.length);
const lhead = Array.from(document.querySelectorAll('#top-tab-listed thead th')).map(th => th.textContent.trim());
ok(lhead.length === 14, '已上架 Tab 表头 14 列: ' + lhead.length);
ok(lhead[0] === '售卖单元' && lhead[1] === '状态' && lhead[2] === 'SKU', '前3列=售卖单元/状态/SKU（SKU 第三列）');
ok(!lhead.includes('操作'), '无操作列');
ok(lhead.includes('关联计费项') && lhead.includes('刊例价') && lhead.includes('购买量step'), '列内容与详情页售卖单元 Tab 一致');
ok(!lhead.includes('商品code') && !lhead.includes('商品名称') && !lhead.includes('商品类型'), '旧商品列已删除');
const phead = Array.from(document.querySelectorAll('#top-tab-pending thead th')).map(th => th.textContent.trim());
ok(phead.length === 14 && phead[2] === 'SKU', '未上架 Tab 表头 14 列且含 SKU');

// ===== 2. Tab 按单元状态过滤：已上架=在售、未上架=禁售 =====
section('2. 按单元状态过滤');
ok(lrows.every(r => r.cells[1].textContent.trim() === '在售'), '已上架 Tab 全部为在售单元');
ok(prows.every(r => r.cells[1].textContent.trim() === '禁售'), '未上架 Tab 全部为禁售单元');
// pro su-3/su-4（无计划→禁售）出现在未上架 Tab
const proSu3 = prows.find(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pro' && r.cells[0].textContent.trim() === 'su-3');
ok(!!proSu3, 'pro 的禁售单元 su-3 出现在未上架 Tab');
ok(!lrows.some(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pro' && ['su-3', 'su-4'].includes(r.cells[0].textContent.trim())), 'pro 的禁售单元不出现在已上架 Tab');

// ===== 3. 排序：按 SKU + 售卖单元 ID =====
section('3. 排序');
const lKeys = lrows.map(r => r.cells[2].textContent.trim() + '|' + r.cells[0].textContent.trim());
const lSorted = lKeys.slice().sort((a, b) => {
  const [sa, ua] = a.split('|'); const [sb, ub] = b.split('|');
  return sa.localeCompare(sb) || ua.localeCompare(ub);
});
ok(JSON.stringify(lKeys) === JSON.stringify(lSorted), '已上架 Tab 按 SKU+单元ID 排序: ' + JSON.stringify(lKeys));
const pKeys = prows.map(r => r.cells[2].textContent.trim() + '|' + (r.cells[0].textContent.trim() === '—' ? '' : r.cells[0].textContent.trim()));
const pSorted = pKeys.slice().sort((a, b) => {
  const [sa, ua] = a.split('|'); const [sb, ub] = b.split('|');
  return sa.localeCompare(sb) || ua.localeCompare(ub);
});
ok(JSON.stringify(pKeys) === JSON.stringify(pSorted), '未上架 Tab 按 SKU+单元ID 排序: ' + JSON.stringify(pKeys));

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
window.eval('planRowStatuses[0] = "published"; renderSaleUnits(); refreshProductBadge();');
window.backToList();
const lrows2 = Array.from(document.querySelectorAll('#listed-tbody tr'));
const prows2 = Array.from(document.querySelectorAll('#pending-tbody tr'));
ok(lrows2.length === 5, 'pre 计划发布后 su-1 转在售 → 已上架 Tab 5 行: ' + lrows2.length);
ok(prows2.length === 5, '未上架 Tab 剩 5 行（pre su-2/su-3 仍禁售）：' + prows2.length);

// ===== 7. 无售卖单元的商品 → 占位行（未上架 Tab） =====
section('7. 空态占位');
window.openProductModal();
document.getElementById('inp-code').value = 'maas-product-vtpm-new13';
document.getElementById('inp-name').value = '空商品测试';
document.querySelectorAll('.product-dim-check').forEach(cb => { cb.checked = true; });
window.submitProduct();
window.backToList();
const pTxt = document.getElementById('pending-tbody').textContent;
ok(pTxt.includes('maas-product-vtpm-new13'), '空商品 SKU 出现在未上架 Tab');
ok(pTxt.includes('该商品暂无售卖单元'), '无单元商品显示占位行');
const placeholderRow = Array.from(document.querySelectorAll('#pending-tbody tr')).find(r => r.textContent.includes('maas-product-vtpm-new13'));
ok(placeholderRow.cells[1].textContent.trim() === '禁售', '占位行状态=禁售');
ok(!!placeholderRow.cells[2].querySelector('button'), '占位行 SKU 列可点击进详情');
ok(placeholderRow.cells.length === 4, '占位行 4 个单元格（colspan 合并列）');
placeholderRow.cells[2].querySelector('button').click();
ok(evalInPage('currentProduct.code') === 'maas-product-vtpm-new13', '占位行点击进入正确详情页');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
