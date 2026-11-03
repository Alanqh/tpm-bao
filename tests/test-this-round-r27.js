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

// ===== 2. 空间计划 Tab 平铺：glm4 初始 4 行（常规 pu-sp-1-1~3 + 双11 pu-sp-2-1；第32轮 mock 加常规计划）=====
w.eval('renderSpacePlans()');
let rows = Array.from(d.querySelectorAll('#spaceplan-tbody tr')).filter(r => r.querySelector('td') && !r.querySelector('td[colspan]'));
ok(rows.length === 4, '初始 4 行（常规 3 单元 + 双11 1 单元），实得 ' + rows.length);
const txt = d.getElementById('spaceplan-tbody').textContent;
ok(txt.includes('pu-sp-1-1') && txt.includes('pu-sp-2-1'), '计划单元 ID pu-sp-1-1/pu-sp-2-1（同构 planUnitId）');
ok(txt.includes('双11大促·输入切换售卖空间3') && txt.includes('售卖空间3'), '双11条目：计划名+目标空间');
ok(txt.includes('GLM4·常规售卖空间'), '常规计划条目');
ok(txt.includes('已发布'), '状态徽标');
ok(txt.includes('input'), 'Function 列=input');
ok((txt.match(/未指定/g) || []).length === 0, '无「未指定」行（每个单元必有所属计划，第28轮口径）');
ok(txt.includes('sp3'), '目标空间 sp3 列出');
const head = rows.find(r => r.textContent.includes('pu-sp-2-1'));
ok(head.cells.length === 9, '计前行 9 列（空间计划单元/状态/所属空间计划/售卖空间/Function/维度/单元数/优先级/起止——第29轮删操作列）');
ok(head.cells[4].textContent.trim() === 'input', 'Function 列=input');
ok(head.cells[3].textContent.includes('售卖空间3'), '售卖空间列=空间3');

// ===== 3. 售卖空间 Tab（第32轮：按时刻过滤，每 fn 一行生效空间，无默认徽标/设为默认）=====
w.eval('renderSpaceTab()');
const spaceTxt = d.getElementById('space-tbody').textContent;
ok(spaceTxt.includes('设为默认') === false && spaceTxt.includes('设为生效') === false, '第32轮：无设为默认/设为生效（默认机制已废）');
ok(spaceTxt.includes('默认') === false, '无默认徽标');
const effRows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(effRows.length === 3, '3 个 fn 各一行生效空间（sp2/sp4/sp5），实得 ' + effRows.length);
ok(effRows.every(r => /售卖空间[245]/.test(r.textContent)), '生效行=sp2/sp4/sp5（常规计划承载）');
ok(effRows.every(r => r.cells[2].textContent.includes('生效中')), '均生效中');

// ===== 4. 纯计划仲裁：priority 降序（双11 500 > 常规 100 在 11-15 接管） =====
w.eval('startEdit()');
ok(w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp3', '11-15 双11（priority 500）接管 input→sp3');
ok(w.eval('effectiveSpaceAt("input","2026-11-25 00:00:00").key') === 'sp2', '11-25 双11到期 → 常规计划回落 sp2（第32轮：无手动默认）');
ok(w.eval('effectiveSpaceAt("input","2026-10-15 00:00:00").key') === '', '10-15 无生效计划 → key=\"\"（无默认回落）');

// ===== 5. 接管时刻空间 Tab 列表切换（11-15 input 行=sp3 不再显示 sp2）=====
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
const st2 = d.getElementById('space-tbody').textContent;
ok(st2.includes('计划「双11大促·输入切换售卖空间3」生效'), '11-15 生效标注（胜出计划=双11）');
w.eval('timeFilter = null; renderSpaceTab()');

// ===== 6. 创建多 fn 计划 → 平铺 rowspan 合并（第31轮：维度勾选，保存为每 fn 新建空间）=====
w.eval('timeFilter = null; startEdit(); openSpacePlanModal()');
d.getElementById('sp-name').value = 'r27双fn计划';
d.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-05T00:00:00';
// 三个 fn 全勾 + 各选一个维度（input→输入token、output→输出token、cache→输入token）
Array.from(d.querySelectorAll('#modal-spaceplan .sp-fn-check')).forEach(b => { b.checked = true; b.dispatchEvent(new w.Event('change', { bubbles: true })); });
d.querySelector('.sp-dim-check[data-fn="input"][value="输入token区间"]').checked = true;
d.querySelector('.sp-dim-check[data-fn="output"][value="输出token区间"]').checked = true;
d.querySelector('.sp-dim-check[data-fn="cache"][value="输入token区间"]').checked = true;
w.eval('confirmSpacePlan()');
w.eval('renderSpacePlans()');
rows = Array.from(d.querySelectorAll('#spaceplan-tbody tr')).filter(r => r.querySelector('td') && !r.querySelector('td[colspan]'));
ok(rows.length === 7, '双fn计划加入后 7 行（常规3+双11 1 + 新计划 3），实得 ' + rows.length);
// 第28轮排序：pending 组内按 fn 字典序（cache<input），pu-sp-3-3（cache/新空间）为该计划首行（9列+rowspan=3），pu-sp-3-1/2 为后续行（5列）
const first = rows.find(r => r.textContent.includes('pu-sp-3-3'));
ok(first && first.cells.length === 9 && first.innerHTML.includes('rowspan="3"'), '计划行首条（cache）9 列 + rowspan=3');
const sub = rows.filter(r => /pu-sp-3-[12]/.test(r.textContent));
ok(sub.length === 2 && sub.every(r => r.cells.length === 5), '后续行 5 列（计划单元/售卖空间/Function/维度/单元数）');
ok((d.getElementById('spaceplan-tbody').textContent.match(/未指定/g) || []).length === 0, '全程无未指定行');

// ===== 7. 新 Tab 顶部按钮 + 操作迁详情页（第29轮）=====
ok(d.getElementById('spaceplan-new-btn') && d.getElementById('spaceplan-new-btn').textContent.includes('创建空间计划'), '「创建空间计划」按钮在空间计划 Tab 顶部');
const firstRow2 = rows.find(r => r.textContent.includes('pu-sp-3-3')); // 该计划首行（携带计划级 td）
ok(firstRow2.innerHTML.includes('openSpacePlanDetail(2)'), '所属空间计划=进详情页链接（行内操作已删）');

// ===== 8. vtpm 商品：常驻计划单行（第32轮 mock）=====
w.eval('backToList(); openDetailByCode("maas-product-vtpm-std")');
w.eval('renderSpacePlans()');
const vt = d.getElementById('spaceplan-tbody').textContent;
ok(vt.includes('标准·常驻售卖空间1'), 'vtpm 常驻计划单元（fn=""→sp1，第32轮）');
ok((vt.match(/未指定/g) || []).length === 0, '无「未指定」行');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
