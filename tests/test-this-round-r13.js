// 第13轮验证：列表页不再展示商品行，直接平铺售卖单元（SKU 第三列点击进详情；按 SKU+售卖单元 ID 排序；保留删除按钮）
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

// ===== 1. 列表结构：平铺售卖单元，15 列，SKU 位于第三列 =====
section('1. 列表结构');
const lrows = Array.from(document.querySelectorAll('#listed-tbody tr'));
const prows = Array.from(document.querySelectorAll('#pending-tbody tr'));
ok(lrows.length === 7, '已上架 Tab 平铺 7 行（std 3 + pro 4）: ' + lrows.length);
ok(prows.length === 3, '未上架 Tab 平铺 3 行（pre 3 个单元）: ' + prows.length);
// 表头 15 列 + SKU 在第三位
const lhead = Array.from(document.querySelectorAll('#top-tab-listed thead th')).map(th => th.textContent.trim());
ok(lhead.length === 15, '已上架 Tab 表头 15 列: ' + lhead.length);
ok(lhead[0] === '售卖单元' && lhead[1] === '状态' && lhead[2] === 'SKU', '前3列=售卖单元/状态/SKU（SKU 第三列）');
ok(lhead.includes('关联计费项') && lhead.includes('刊例价') && lhead.includes('购买量step') && lhead[lhead.length - 1] === '操作', '列内容与详情页售卖单元 Tab 一致 + 操作列');
// 不再有商品行（商品code/商品名称/商品类型 列不存在）
ok(!lhead.includes('商品code') && !lhead.includes('商品名称') && !lhead.includes('商品类型'), '旧商品列已删除');

// ===== 2. 排序：按 SKU + 售卖单元 ID =====
section('2. 排序');
const lKeys = lrows.map(r => r.cells[2].textContent.trim() + '|' + r.cells[0].textContent.trim());
const lSorted = lKeys.slice().sort((a, b) => {
  const [sa, ua] = a.split('|'); const [sb, ub] = b.split('|');
  return sa.localeCompare(sb) || ua.localeCompare(ub);
});
ok(JSON.stringify(lKeys) === JSON.stringify(lSorted), '已上架 Tab 按 SKU+单元ID 排序: ' + JSON.stringify(lKeys));
const lSkus = lrows.map(r => r.cells[2].textContent.trim());
ok(lSkus[0].startsWith('maas-product-vtpm-pro') && lSkus[lSkus.length - 1].startsWith('maas-product-vtpm-std'), 'pro 排在 std 前（SKU 字典序）');

// ===== 3. 状态与禁售行展示（对齐详情页口径） =====
section('3. 状态展示');
const pRows = prows; // pre 的 3 个单元全禁售
ok(pRows.every(r => r.cells[1].textContent.trim() === '禁售'), '未上架 Tab 单元全部禁售');
ok(pRows.every(r => r.cells[5].textContent.trim() === '—'), '禁售行关联计费项显示 —');
ok(pRows.every(r => r.cells[10].textContent.trim() === '—'), '禁售行 payload 显示 —');
const stdRows = lrows.filter(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-std');
ok(stdRows.length === 3 && stdRows.every(r => r.cells[1].textContent.trim() === '在售'), 'std 3 个单元在售');
const stdSu1 = stdRows.find(r => r.cells[0].textContent.trim() === 'su-1');
ok(stdSu1.cells[5].textContent.includes('maas-product-vtpm-std.30d'), '在售行关联计费项展示: ' + stdSu1.cells[5].textContent.trim());
ok(stdSu1.cells[9].textContent.includes('slo-rule-95'), '在售行 SLO 展示');
ok(stdSu1.cells[6].textContent.trim() !== '—', '在售行刊例价展示');

// ===== 4. SKU 列点击进入商品详情 =====
section('4. SKU 跳转');
const skuBtn = stdSu1.cells[2].querySelector('button');
ok(!!skuBtn && skuBtn.textContent.includes('maas-product-vtpm-std'), 'SKU 列为可点击按钮');
skuBtn.click();
ok(!document.getElementById('detail-view').classList.contains('hidden'), '点击 SKU 进入商品详情页');
ok(evalInPage('currentProduct.code') === 'maas-product-vtpm-std', '详情页打开正确的商品');
window.backToList();

// ===== 5. 删除按钮：锁链路 =====
section('5. 删除锁链路');
// 5.1 有关联计划的单元不可删 → 操作列 —（std 3 行全部有计划；pro su-1/su-2 有计划）
const withPlanRows = lrows.filter(r =>
  (r.cells[2].textContent.trim() === 'maas-product-vtpm-std')
  || (r.cells[2].textContent.trim() === 'maas-product-vtpm-pro' && ['su-1', 'su-2'].includes(r.cells[0].textContent.trim())));
ok(withPlanRows.length === 5 && withPlanRows.every(r => r.cells[14].textContent.trim() === '—'), '有关联计划的 5 个单元操作列显示 —');
// 5.2 pre 的 su-2/su-3 无关联计划（只有 su-1 挂了计划）→ 可删除
const preSu2 = prows.find(r => r.cells[0].textContent.trim() === 'su-2');
const delBtn = preSu2.cells[14].querySelector('button');
ok(!!delBtn, '无关联计划单元显示删除按钮');
// 5.3 pro 由张三持锁 → pro 行删除置灰（pro 4 行中 su-3/su-4 无计划）
const proSu3 = lrows.find(r => r.cells[2].textContent.trim() === 'maas-product-vtpm-pro' && r.cells[0].textContent.trim() === 'su-3');
ok(proSu3.cells[14].textContent.includes('🔒') && (proSu3.cells[14].querySelector('[title]') || {}).title.includes('张三'), '他人持锁商品的无计划单元删除置灰+锁提示（title 含持锁人）');
ok(!proSu3.cells[14].querySelector('button'), '置灰行无可点击按钮');
// 5.4 点击删除 → 自动抢锁 → 删除成功 → 快照回写
delBtn.click();
ok(alertMsg === '', '无锁商品删除无拦截提示: ' + alertMsg);
const newProws = Array.from(document.querySelectorAll('#pending-tbody tr'));
ok(newProws.length === 2, '删除后 pre 剩 2 个单元: ' + newProws.length);
ok(evalInPage("planRowsSnapshot['maas-product-vtpm-pre'].saleUnits.length") === 2, '删除结果已回写快照');
ok(evalInPage("editLocks['maas-product-vtpm-pre'] && editLocks['maas-product-vtpm-pre'].passport") === 'lvqing01', '删除时自动抢锁（当前用户持锁）');

// ===== 6. 删除后数据一致性：进详情页看到快照 =====
section('6. 删除后一致性');
window.openDetailByCode('maas-product-vtpm-pre');
const suRows = Array.from(document.querySelectorAll('#saleunit-tbody tr'));
ok(suRows.length === 2, '详情页售卖单元 = 快照 2 个');
window.backToList();

// ===== 7. 有关联计划单元从列表删除 → 拦截 =====
section('7. 拦截校验');
// pre 的 su-1 有关联计划（即使从详情页没先进入）
alertMsg = '';
window.removeSaleUnitFromList('maas-product-vtpm-pre', 'su-1');
ok(alertMsg.includes('已关联售卖计划'), '有关联计划的单元删除被拦截');
// pro 张三持锁 → 拦截并提示持锁人
alertMsg = '';
window.removeSaleUnitFromList('maas-product-vtpm-pro', 'su-4');
ok(alertMsg.includes('张三') && alertMsg.includes('zhangsan01'), '他人持锁商品删除被拦截并提示持锁人');

// ===== 8. 无售卖单元的商品 → 占位行 =====
section('8. 空态占位');
// 新建商品（无计划无售卖单元）→ 未上架 Tab 占位行
window.openProductModal();
document.getElementById('inp-code').value = 'maas-product-vtpm-new13';
document.getElementById('inp-name').value = '空商品测试';
window.submitProduct();
window.backToList();
const pTxt = document.getElementById('pending-tbody').textContent;
ok(pTxt.includes('maas-product-vtpm-new13'), '空商品 SKU 出现在未上架 Tab');
ok(pTxt.includes('该商品暂无售卖单元'), '无单元商品显示占位行');
const placeholderRow = Array.from(document.querySelectorAll('#pending-tbody tr')).find(r => r.textContent.includes('maas-product-vtpm-new13'));
ok(placeholderRow.cells[1].textContent.trim() === '禁售', '占位行状态=禁售');
ok(!!placeholderRow.cells[2].querySelector('button'), '占位行 SKU 列可点击进详情');
placeholderRow.cells[2].querySelector('button').click();
ok(evalInPage('currentProduct.code') === 'maas-product-vtpm-new13', '占位行点击进入正确详情页');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
