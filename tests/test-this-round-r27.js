// 第27轮历史验证——第38轮口径重写：空间计划 Tab 已删；售卖空间 Tab=空间×fn 平铺（9列）+ 空间详情页 + 多fn空间
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('/Users/lqh/Documents/ChatGPT/TPM保障包/prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const { window } = dom;
const alerts = [];
window.alert = m => alerts.push(String(m));
window.confirm = () => true;
const w = window;
const d = w.document;
let step = 0, fail = 0;
function ok(cond, msg) { step++; if (!cond) { fail++; console.log('FAIL[' + step + '] ' + msg); } }

// ===== 1. Tab 顺序（第38轮：无空间计划 Tab）=====
w.eval('openDetailByCode("maas-online-text-glm4")');
const tabs = Array.from(d.querySelectorAll('#plan-tabs-card .admin-tab[data-tab]')).map(b => b.dataset.tab);
ok(tabs.join(',') === 'space,saleunit,plan,pricing,factor-config,slo-config', 'Tab 顺序（空间计划 Tab 已删）: ' + tabs.join(','));
ok(d.querySelector('#plan-tabs-card .admin-tab[data-tab="space"]').classList.contains('active'), '默认打开售卖空间 Tab');
ok(!d.getElementById('inner-tab-spaceplan'), '空间计划 Tab 容器已删');

// ===== 2. 售卖空间 Tab 平铺：glm4 初始 3 行（第40轮：8 列无空间单元列；第48轮：单空间）=====
let rows = Array.from(d.querySelectorAll('#space-tbody tr')).filter(r => r.querySelector('td') && !r.querySelector('td[colspan]'));
ok(rows.length === 3, '初始 3 行（sp1×3fn，第48轮单空间），实得 ' + rows.length);
const txt = d.getElementById('space-tbody').textContent;
ok(!txt.includes('pu-sp-'), '第40轮：空间单元列已删（无 pu-sp 编号）');
ok(!txt.includes('双11大促'), '第48轮：双11空间已删');
ok(txt.includes('GLM4·常规售卖空间'), '常规空间条目');
ok(txt.includes('已发布'), '状态徽标');
ok(txt.includes('input'), 'Function 列=input');
const firstHead = rows[0];
ok(firstHead.cells.length === 9, '空间行 9 列（第49轮生效起止拆两列：售卖空间/状态/空间名称/Function/维度组合/单元数/优先级/生效开始/生效结束）');
ok(firstHead.cells[3].textContent.trim() === 'input', 'Function 列=input（第4列）');

// ===== 3. 排序与 rowspan（第40轮：状态→优先级降序→创建时间逆序；空间内 fn 行按创建序）=====
ok(rows[0].cells[0].textContent.trim() === 'sp1' && rows[0].cells[0].rowSpan === 3, 'sp1 空间列 rowspan=3');
ok(rows[0].cells[3].textContent.trim() === 'input', 'sp1 首行 fn=input（创建时勾选序）');

// ===== 4. 空间详情页（第40轮：基本信息 + 售卖单元清单；无修改）=====
w.eval('openSpacePlanDetail("sp1")');
ok(!d.getElementById('spaceplan-detail-view').classList.contains('hidden'), '详情页打开');
ok(d.getElementById('spaceplan-detail-title').textContent.includes('GLM4·常规售卖空间'), '标题含空间名');
ok(d.getElementById('spaceplan-detail-actions').textContent.includes('停用'), 'published 空间操作区=停用+复制');
ok(!d.getElementById('spaceplan-detail-actions').textContent.includes('修改'), '无「修改」（空间不可改）');
const dtThs = Array.from(d.querySelector('#spaceplan-detail-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(dtThs.join('/') === '售卖单元/Function/维度:度量', '详情单元表 3 列（售卖单元/Function/维度:度量）: ' + dtThs.join('/'));
const dtRows = Array.from(d.querySelectorAll('#spaceplan-detail-tbody tr'));
ok(dtRows.length === 4, '详情单元表 4 行（sp1 全部售卖单元，第48轮 per-fn 纯叉乘）');
ok(dtRows[0].textContent.includes('su-4') && dtRows[0].textContent.trim().endsWith('--'), '首行=su-4 cache 0维（--，组合序空串最前）');
ok(dtRows.some(r => r.textContent.includes('su-1') && r.textContent.includes('input')), 'su-1/input 在清单中');
ok(dtRows[3].textContent.includes('su-3') && dtRows[3].textContent.includes('1M+'), '末行=su-3（output/输入区间:1M+）');
w.eval('closeSpacePlanDetail()');

// ===== 5. 纯空间仲裁（第38轮；第48轮：单空间无切换）=====
w.eval('startEdit()');
ok(w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp1', '11-15 无双11空间 → input 仍 sp1');
ok(w.eval('effectiveSpaceAt("input","2026-11-25 00:00:00").key') === 'sp1', '11-25 input 仍 sp1');
ok(w.eval('effectiveSpaceAt("input","2026-10-15 00:00:00").key') === '', '10-15 无生效空间 → key=""');
w.eval('exitEdit()');

// ===== 6. 时间点查询（档期徽标）=====
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
const st2Rows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(st2Rows[0].textContent.includes('生效期内'), '11-15 sp1 行=生效期内');
w.eval('timeFilter = null; renderSpaceTab()');

// ===== 7. 创建多 fn 空间 → 平铺 rowspan 合并（第38轮：多 fn 共空间）=====
w.eval('startEdit(); openSpacePlanModal()');
d.getElementById('sp-name').value = 'r38双fn空间';
d.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-05T00:00:00';
// 第47轮：三个 fn 全勾（各渲染独立卡片）+ 每 fn 卡片勾选同样两维度度量（输入0～128K + 费用发生日周一至周五 → 第48轮纯叉乘每 fn 1×1=1 组合）
Array.from(d.querySelectorAll('#modal-spaceplan .sp-fn-check')).forEach(b => { b.checked = true; b.dispatchEvent(new w.Event('change', { bubbles: true })); });
['input', 'output', 'cache'].forEach(f => {
  d.querySelector('.sp-measure-check[data-fn="' + f + '"][data-dim="输入区间"][value="0～128K"]').checked = true;
  d.querySelector('.sp-measure-check[data-fn="' + f + '"][data-dim="费用发生日"][value="周一至周五"]').checked = true;
});
w.eval('confirmSpacePlan()');
rows = Array.from(d.querySelectorAll('#space-tbody tr')).filter(r => r.querySelector('td') && !r.querySelector('td[colspan]'));
ok(rows.length === 6, '新空间加入后 6 行（sp1×3 + sp2×3，第48轮单空间基数），实得 ' + rows.length);
const sp3First = rows.find(r => r.cells.length >= 8 && r.cells[0] && r.cells[0].textContent.trim() === 'sp2');
const sp3Idx = rows.indexOf(sp3First);
ok(!!sp3First && rows[sp3Idx+1] && rows[sp3Idx+2] && rows[sp3Idx+1].cells.length === 3 && rows[sp3Idx+2].cells.length === 3,
  'sp2 三 fn 行（首行 8 列带空间级列，两续行仅 fn/维度/单元数 3 列）');
ok(sp3First.cells[0].rowSpan === 3 && sp3First.cells[3].textContent.trim() === 'input', 'sp2 空间列 rowspan=3（首行 fn=input，创建时勾选序 input→output→cache）');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp2").length') === 3, 'sp2 每 fn 1 组合（纯叉乘）×3 fn 共 3 单元（第48轮）');

// ===== 8. vtpm 商品：常驻空间单行=====
w.eval('exitEdit(); backToList(); openDetailByCode("maas-product-vtpm-std")');
const vt = d.getElementById('space-tbody').textContent;
ok(vt.includes('标准·常驻售卖空间'), 'vtpm 常驻空间（名称展示）');
ok((vt.match(/未指定/g) || []).length === 0, '无「未指定」行');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
