// 第23轮（第32轮口径适配）：售卖空间只管维度 + 列表按时刻过滤（每 fn 一行生效空间，5 列无操作列）
// 原第23轮的「设为默认/操作列/setSpaceActive」链路已在第32轮废除——生效空间完全由已发布空间计划仲裁
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const { window } = dom;
const alerts = [];
window.alert = m => alerts.push(String(m));
window.confirm = () => true;
const w = window;
const d = w.document;
let step = 0, fail = 0;
function ok(cond, msg) { step++; if (!cond) { fail++; console.log('FAIL[' + step + '] ' + msg); } }

// 1. 打开 glm4（浏览态）
w.eval('openDetailByCode("maas-online-text-glm4")');
// 2. 列表结构：5 列表头（第32轮删操作列）
const spHead = Array.from(d.querySelector('#space-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(JSON.stringify(spHead.slice(0,4)) === JSON.stringify(['Function','售卖空间','状态','空间维度']), '表头前4列=Function/售卖空间/状态/空间维度: ' + spHead.join('/'));
ok(spHead.length === 5 && spHead[4] === '售卖单元数', '共 5 列（第32轮删操作列）');
// 3. 行序（第32轮：每 fn 一行生效空间；fn 字典序 cache<input<output）
const rows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(rows.length === 3, '3 个空间行（每 fn 一行：sp5/sp2/sp4）');
ok(rows[0].cells[0].textContent.trim() === 'cache' && rows[0].cells[0].rowSpan === 1, '首行 cache（字典序）');
ok(rows[1].cells[0].textContent.trim() === 'input', '第二行 input（无 rowspan 合并，每 fn 一行）');
ok(rows[1].cells.length === 5, 'input 行 5 cells（无合并）');
ok(rows[2].cells[0].textContent.trim() === 'output', 'output 第三行');
ok(rows[0].cells[1].textContent.includes('售卖空间5') && rows[1].cells[1].textContent.includes('售卖空间2') && rows[2].cells[1].textContent.includes('售卖空间4'), '当前时刻 cache=sp5/input=sp2/output=sp4');
// 4. 状态列（第32轮：均生效中——常驻计划承载；含胜出计划标注）
ok(rows[0].textContent.includes('生效中') && rows[1].textContent.includes('生效中') && rows[2].textContent.includes('生效中'), 'sp5/sp2/sp4 均生效中');
ok(rows[1].cells[2].textContent.includes('计划「GLM4·常规售卖空间」生效'), 'input 行标注胜出计划=常规计划');
ok(rows[1].cells[2].textContent.includes('2026-11-11 起切换'), 'input 行含双11切换预告');
// 5. 无操作列/无默认机制（第32轮）
ok(!rows[0].innerHTML.includes('设为默认') && !rows[0].innerHTML.includes('设为生效'), '无设为默认/设为生效（默认机制已废）');
ok(w.eval('typeof setSpaceActive') === 'undefined', 'setSpaceActive 函数已删');
// 6. 时间切换后状态即时变化（11-15：双11接管 input→sp3）
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
const rows2 = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(rows2.length === 3, '11-15 仍 3 行（每 fn 一行）');
ok(rows2.some(r => (r.querySelector('div.font-mono') || {}).textContent === 'sp3'), '11-15 input 行空间=sp3（双11接管）');
ok(rows2.some(r => (r.querySelector('div.font-mono') || {}).textContent === 'sp2') === false, '11-15 sp2 不在列表（按时刻过滤）');
ok(rows2.filter(r => r.cells[2].textContent.includes('双11大促')).length === 1, 'sp3 行标注胜出计划=双11');
w.eval('timeFilter = null; renderSpaceTab()');
// 7. 浏览态：vtpm std（常驻计划 sp1 单行）
w.eval('backToList()');
w.eval('openDetailByCode("maas-product-vtpm-std")');
const vRows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(vRows.length === 1, 'vtpm 单行（sp1 常驻计划）');
ok(vRows[0].cells[0].textContent.trim() === '—' || vRows[0].cells[0].textContent.includes('—'), '无 fn 显示 —');
ok(vRows[0].textContent.includes('生效中'), 'sp1 生效中');
ok(vRows[0].cells[4].textContent.trim() === '3', 'sp1 售卖单元数=3（std mock su-1~3）');
// 8. 空间计划创建新空间后：未发布 → 不在售卖空间 Tab；发布且时段命中 → 生效
w.eval('startEdit()');
w.eval('openSpacePlanModal()');
const box8 = d.querySelector('.sp-fn-check[data-fn=""]');
box8.checked = true;
box8.dispatchEvent(new w.Event('change', { bubbles: true }));
d.querySelector('.sp-dim-check[data-fn=""][value="购买量区间"]').checked = true;
d.getElementById('sp-name').value = 'r31 vtpm 计划A';
d.getElementById('sp-priority').value = '200';
d.getElementById('sp-eff-start').value = '2026-11-01T00:00:00';
d.getElementById('sp-eff-end').value = '2027-11-01T00:00:00';
w.eval('confirmSpacePlan()');
ok(w.eval('spaceSeq') === 6, 'sp6 创建成功（计划保存即落地空间）');
ok(w.eval('spaces["sp6"].dims.length') === 1, 'sp6 单维度');
ok(w.eval('spaces["sp6"].measures') === undefined, '空间无 measures 字段（只管维度）');
let rows3 = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(rows3.length === 1 && rows3[0].textContent.includes('售卖空间1'), '计划A 待发布 → 不接管，列表仍仅 sp1（第32轮：纯计划仲裁）');
// 发布后接管：priority 200 > 常驻 100 → sp6 生效
w.eval('publishSpacePlan(1)');
ok(w.eval('currentSpaceOfFn("")') === 'sp6', '发布后 priority 200>100 → sp6 接管');
rows3 = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(rows3.length === 1 && rows3[0].textContent.includes('售卖空间6'), '列表显示 sp6（按时刻过滤）');
// 9. 重复维度集合不再拦截（第31轮口径：总是新建 sp7）
w.eval('openSpacePlanModal()');
const box9 = d.querySelector('.sp-fn-check[data-fn=""]');
box9.checked = true;
box9.dispatchEvent(new w.Event('change', { bubbles: true }));
['购买量区间', '购买周期'].forEach(dim => { d.querySelector('.sp-dim-check[data-fn=""][value="' + dim + '"]').checked = true; });
d.getElementById('sp-name').value = 'r31 vtpm 计划B';
w.eval('confirmSpacePlan()');
ok(w.eval('spaceSeq') === 7 && w.eval('spaces["sp7"].dims.length') === 2, '维度集合与 sp1 相同 → 不拦截，新建 sp7（总是新建）');
w.eval('closeModal("spaceplan")');
// 10. SU 弹窗：度量候选=全量（默认=生效空间 sp6）
w.eval('openSuConfirmModal()');
ok(d.getElementById('su-space-select').value === 'sp6', 'SU 默认=生效空间 sp6（计划A 已发布接管）');
ok(d.querySelectorAll('#su-confirm-body .su-leaf').length === 3, '度量候选=全量 3（非空间配置）');
w.eval('closeModal("su-confirm")');
// 11. 编辑度量功能已删
ok(!d.getElementById('modal-space-measure-edit'), '编辑度量弹窗已删');
ok(w.eval('typeof editSpaceMeasures') === 'undefined', 'editSpaceMeasures 函数已删');
ok(w.eval('typeof setFnSpace') === 'undefined', 'setFnSpace 已删（默认机制已废）');
ok(!d.getElementById('fn-space-cards'), 'fn 配置卡已删（合并进列表）');
// 12. snapshot 恢复（第32轮）：glm4 重进后常规/双11计划仍在，input 当前 sp2
w.eval('backToList()');
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(w.eval('spacePlans.length') === 2 && w.eval('spacePlanStatuses[0]') === 'published', '重进 glm4 恢复 2 份计划（常规+双11）');
ok(w.eval('currentSpaceOfFn("input")') === 'sp2', '快照恢复 input=sp2（常规计划仲裁）');
console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
