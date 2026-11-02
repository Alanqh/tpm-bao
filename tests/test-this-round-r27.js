// 第27轮：空间计划独立 Tab（平铺空间计划单元，同构售卖计划 Tab）+ 设为默认语义
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const { window } = dom;
const alerts = [];
window.alert = m => alerts.push(String(m));
window.confirm = () => true;
const w = window, d = w.document;
let step = 0, fail = 0;
function ok(cond, msg) { step++; if (!cond) { fail++; console.log('FAIL[' + step + '] ' + msg); } }

// ===== 1. Tab 结构：空间计划为第二个 Tab，默认打开售卖空间 =====
w.eval('openDetailByCode("maas-online-text-glm4")');
const tabs = Array.from(d.querySelectorAll('#plan-tabs-card .admin-tab[data-tab]')).map(b => b.dataset.tab);
ok(tabs.join(',') === 'space,spaceplan,saleunit,plan,pricing,factor-config,slo-config', 'Tab 顺序：售卖空间,空间计划,售卖单元,…… 实得 ' + tabs.join(','));
ok(d.querySelector('#plan-tabs-card .admin-tab[data-tab="space"]').classList.contains('active'), '默认打开售卖空间 Tab');
ok(d.getElementById('inner-tab-spaceplan').classList.contains('hidden'), '空间计划 Tab 初始隐藏');

// ===== 2. 空间计划 Tab 平铺：glm4 初始 1 行（双11 pu-sp-1-1；第28轮起纯计划单元，无未指定行）=====
w.eval('renderSpacePlans()');
let rows = Array.from(d.querySelectorAll('#spaceplan-tbody tr')).filter(r => r.querySelector('td') && !r.querySelector('td[colspan]'));
ok(rows.length === 1, '初始 1 行（双11计划单元），实得 ' + rows.length);
const txt = d.getElementById('spaceplan-tbody').textContent;
ok(txt.includes('pu-sp-1-1'), '计划单元 ID pu-sp-1-1（同构 planUnitId）');
ok(txt.includes('双11大促·输入切换售卖空间3') && txt.includes('售卖空间3'), '双11条目：计划名+目标空间');
ok(txt.includes('已发布'), '双11状态徽标');
ok((txt.match(/未指定/g) || []).length === 0, '无「未指定」行（每个单元必有所属计划，第28轮口径）');
ok(txt.includes('sp3'), '目标空间 sp3 列出');
const head = rows[0];
ok(head.cells.length === 9, '计前行 9 列（空间计划单元/状态/所属空间计划/售卖空间/Function/维度/单元数/优先级/起止——第29轮删操作列）');
ok(head.cells[4].textContent.trim() === 'input', 'Function 列=input');
ok(head.cells[3].textContent.includes('售卖空间3'), '售卖空间列=空间3');

// ===== 3. 售卖空间 Tab：默认徽标 + 设为默认（旧设为生效已移除）=====
w.eval('renderSpaceTab()');
const spaceTxt = d.getElementById('space-tbody').textContent;
ok(spaceTxt.includes('设为默认'), '非默认行操作=设为默认');
ok(spaceTxt.includes('设为生效') === false, '「设为生效」文案已移除');
const badged = Array.from(d.querySelectorAll('#space-tbody tr')).filter(r => r.innerHTML.includes('bg-blue-50 text-blue-600'));
ok(badged.length === 3, '3 个 fn 各一行有默认徽标（sp2/sp4/sp5），实得 ' + badged.length);
ok(badged.every(r => /售卖空间[245]/.test(r.textContent)), '徽标行=sp2/sp4/sp5（默认空间）');

// ===== 4. setSpaceActive 语义=设默认：fnSpaceMap 变化 + 提示文案 =====
w.eval('startEdit()');
alerts.length = 0;
w.eval('setSpaceActive("sp3")');
ok(w.eval('currentSpaceOfFn("input")') === 'sp3', 'fnSpaceMap.input=sp3');
ok(alerts.some(m => m.includes('默认生效售卖空间已设为')), '提示「默认生效售卖空间已设为」: ' + alerts.slice(-1));
// 切默认后空间计划接管不受影响（双11 11-11 起仍接管 input→sp3；用 12 月验证回落目标已变）
ok(w.eval('effectiveSpaceAt("input","2026-11-25 00:00:00").key') === 'sp3', '计划到期后回落到新默认 sp3');
// 恢复
w.eval('setSpaceActive("sp2")');

// ===== 5. 计划接管期内默认行仍标默认、仍可设默认 =====
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
const st2 = d.getElementById('space-tbody').textContent;
ok(st2.includes('计划「双11大促·输入切换售卖空间3」接管'), '11-15 接管标注');
ok(st2.includes('设为默认'), '接管期非默认行仍可设默认（第27轮：接管不影响默认配置）');

// ===== 6. 创建多 fn 计划 → 平铺 rowspan 合并 =====
w.eval('timeFilter = null; openSpacePlanModal()');
d.getElementById('sp-name').value = 'r27双fn计划';
d.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-05T00:00:00';
Array.from(d.querySelectorAll('#modal-spaceplan .sp-fn-check')).forEach(b => { b.checked = true; b.dispatchEvent(new w.Event('change', { bubbles: true })); });
d.querySelector('.sp-fn-space[data-fn="input"]').value = 'sp3';
d.querySelector('.sp-fn-space[data-fn="output"]').value = 'sp4';
d.querySelector('.sp-fn-space[data-fn="cache"]').value = 'sp5';
w.eval('confirmSpacePlan()');
w.eval('renderSpacePlans()');
rows = Array.from(d.querySelectorAll('#spaceplan-tbody tr')).filter(r => r.querySelector('td') && !r.querySelector('td[colspan]'));
ok(rows.length === 4, '双fn计划加入后 4 行（双11 1 行 + 新计划 3 条目），实得 ' + rows.length);
// 第28轮排序：pending 组内按 fn 字典序（cache<input），pu-sp-2-3（cache/sp5）为该计划首行（10列+rowspan=3），pu-sp-2-1/2 为后续行（5列）
const first = rows.find(r => r.textContent.includes('pu-sp-2-3'));
ok(first && first.cells.length === 9 && first.innerHTML.includes('rowspan="3"'), '计划行首条（cache）9 列 + rowspan=3');
const sub = rows.filter(r => /pu-sp-2-[12]/.test(r.textContent));
ok(sub.length === 2 && sub.every(r => r.cells.length === 5), '后续行 5 列（计划单元/售卖空间/Function/维度/单元数）');
ok((d.getElementById('spaceplan-tbody').textContent.match(/未指定/g) || []).length === 0, '全程无未指定行');

// ===== 7. 新 Tab 顶部按钮 + 操作迁详情页（第29轮）=====
ok(d.getElementById('spaceplan-new-btn') && d.getElementById('spaceplan-new-btn').textContent.includes('创建空间计划'), '「创建空间计划」按钮在空间计划 Tab 顶部');
const firstRow2 = rows.find(r => r.textContent.includes('pu-sp-2-3')); // 该计划首行（携带计划级 td）
ok(firstRow2.innerHTML.includes('openSpacePlanDetail(1)'), '所属空间计划=进详情页链接（行内操作已删）');

// ===== 8. vtpm 商品：无 fn 无计划 → 仅 sp1 未指定行 =====
w.eval('backToList(); openDetailByCode("maas-product-vtpm-std")');
w.eval('renderSpacePlans()');
const vt = d.getElementById('spaceplan-tbody').textContent;
ok(vt.includes('暂无空间计划单元'), 'vtpm：无计划占位提示（第28轮纯计划单元口径）');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
