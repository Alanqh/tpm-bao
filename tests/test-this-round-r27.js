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

// ===== 2. 售卖空间 Tab 平铺：glm4 初始 4 行（sp1 pu-sp-1-1~3 + sp2 pu-sp-2-1）=====
let rows = Array.from(d.querySelectorAll('#space-tbody tr')).filter(r => r.querySelector('td') && !r.querySelector('td[colspan]'));
ok(rows.length === 4, '初始 4 行（sp1×3fn + sp2×1），实得 ' + rows.length);
const txt = d.getElementById('space-tbody').textContent;
ok(txt.includes('pu-sp-1-') && txt.includes('pu-sp-2-'), '空间单元 ID pu-sp-N-M');
ok(txt.includes('双11大促·输入售卖空间'), '双11空间条目（空间名称）');
ok(txt.includes('GLM4·常规售卖空间'), '常规空间条目');
ok(txt.includes('已发布'), '状态徽标');
ok(txt.includes('input'), 'Function 列=input');
const firstHead = rows[0];
ok(firstHead.cells.length === 9, '空间行 9 列（空间单元/状态/售卖空间/空间名称/Function/维度/单元数/优先级/起止）');
ok(firstHead.cells[4].textContent.trim() === 'input', 'Function 列=input');

// ===== 3. 排序与 rowspan（第38轮：状态→effStart 降序→seq→fn；空间级列合并）=====
ok(rows[0].cells[2].textContent.trim() === 'sp2', '首行 sp2（published，effStart 11-11 > 11-01 降序在前）');
ok(rows[1].cells[2].textContent.trim() === 'sp1' && rows[1].cells[2].rowSpan === 3, 'sp1 空间列 rowspan=3');
ok(rows[1].cells[4].textContent.trim() === 'cache', 'sp1 首行 fn=cache（字典序）');

// ===== 4. 空间详情页（第38轮：标题+三态+字段+单元表；无修改）=====
w.eval('openSpacePlanDetail("sp1")');
ok(!d.getElementById('spaceplan-detail-view').classList.contains('hidden'), '详情页打开');
ok(d.getElementById('spaceplan-detail-title').textContent.includes('GLM4·常规售卖空间'), '标题含空间名');
ok(d.getElementById('spaceplan-detail-actions').textContent.includes('停用'), 'published 空间操作区=停用+复制');
ok(!d.getElementById('spaceplan-detail-actions').textContent.includes('修改'), '无「修改」（空间不可改）');
const dtRows = Array.from(d.querySelectorAll('#spaceplan-detail-tbody tr'));
ok(dtRows.length === 3, '详情单元表 3 行（sp1 三 fn）');
ok(dtRows[0].textContent.trim().startsWith('pu-sp-1-1'), '单元编号 pu-sp-1-1 起');
w.eval('closeSpacePlanDetail()');

// ===== 5. 纯空间仲裁（第38轮）=====
w.eval('startEdit()');
ok(w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp2', '11-15 双11空间（priority 500）接管 input→sp2');
ok(w.eval('effectiveSpaceAt("input","2026-11-25 00:00:00").key') === 'sp1', '11-25 双11空间到期 → 常规 sp1 回落');
ok(w.eval('effectiveSpaceAt("input","2026-10-15 00:00:00").key') === '', '10-15 无生效空间 → key=""');
w.eval('exitEdit()');

// ===== 6. 时间点查询（档期徽标变化）=====
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
const st2Rows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(st2Rows[0].textContent.includes('生效期内'), '11-15 sp2 行=生效期内');
w.eval('timeFilter = null; renderSpaceTab()');

// ===== 7. 创建多 fn 空间 → 平铺 rowspan 合并（第38轮：多 fn 共空间）=====
w.eval('startEdit(); openSpacePlanModal()');
d.getElementById('sp-name').value = 'r38双fn空间';
d.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-05T00:00:00';
// 三个 fn 全勾 + 各选一个维度一个度量
Array.from(d.querySelectorAll('#modal-spaceplan .sp-fn-check')).forEach(b => { b.checked = true; b.dispatchEvent(new w.Event('change', { bubbles: true })); });
let db = d.querySelector('.sp-dim-check[data-fn="input"][value="输入token区间"]'); db.checked = true; db.dispatchEvent(new w.Event('change', { bubbles: true }));
db = d.querySelector('.sp-dim-check[data-fn="output"][value="输出token区间"]'); db.checked = true; db.dispatchEvent(new w.Event('change', { bubbles: true }));
db = d.querySelector('.sp-dim-check[data-fn="cache"][value="输入token区间"]'); db.checked = true; db.dispatchEvent(new w.Event('change', { bubbles: true }));
d.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入token区间"][value="0～128K"]').checked = true;
d.querySelector('.sp-measure-check[data-fn="output"][data-dim="输出token区间"][value="0～4K"]').checked = true;
d.querySelector('.sp-measure-check[data-fn="cache"][data-dim="输入token区间"][value="0～128K"]').checked = true;
w.eval('confirmSpacePlan()');
rows = Array.from(d.querySelectorAll('#space-tbody tr')).filter(r => r.querySelector('td') && !r.querySelector('td[colspan]'));
ok(rows.length === 7, '新空间加入后 7 行（sp1×3 + sp2×1 + sp3×3），实得 ' + rows.length);
const sp3First = rows.find(r => r.cells.length >= 9 && r.cells[2] && r.cells[2].textContent.trim() === 'sp3');
const sp3Idx = rows.indexOf(sp3First);
ok(!!sp3First && rows[sp3Idx+1] && rows[sp3Idx+2] && rows[sp3Idx+1].cells.length === 3 && rows[sp3Idx+2].cells.length === 3,
  'sp3 三 fn 行（首行 9 列带空间级列，两续行仅 fn/维度/单元数 3 列）');
ok(sp3First.cells[2].rowSpan === 3 && sp3First.cells[4].textContent.trim() === 'cache', 'sp3 空间列 rowspan=3（fn 字典序 cache 首）');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp3").length') === 3, 'sp3 逐 fn 叉乘共 3 单元');

// ===== 8. vtpm 商品：常驻空间单行=====
w.eval('exitEdit(); backToList(); openDetailByCode("maas-product-vtpm-std")');
const vt = d.getElementById('space-tbody').textContent;
ok(vt.includes('标准·常驻售卖空间'), 'vtpm 常驻空间（名称展示）');
ok((vt.match(/未指定/g) || []).length === 0, '无「未指定」行');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
