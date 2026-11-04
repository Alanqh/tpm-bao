// 第22轮→第23轮：空间只管维度（无 measures）；单一合并列表 + 状态列 + setSpaceActive；本套件聚焦：
// 弹窗内多行互相重复拦截、多行批量创建、跨 fn 可同维度集合、fnSpaceMap 显式配置/回退/SU 默认生效空间、快照恢复链路
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

// 1. mock 校验（第23轮口径：空间只有 fn+dims；第32轮：常规计划承载默认生效）
w.eval('openDetailByCode("maas-online-text-glm4")');
w.eval('startEdit()'); // 持有编辑锁（变更类操作需先发起变更）
ok(w.eval('spaces["sp2"].measures === undefined'), '空间无 measures 字段');
ok(w.eval('spaces["sp1"].dims.length') === 2 && w.eval('spaces["sp1"].fn') === '', 'sp1（vtpm）两维度 fn=""');
// 2. 详情列表（第32轮：按时刻过滤，每 fn 一行生效空间）
const spRows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(spRows.length === 3, '空间列表 3 行（当前时刻每 fn 至多一行：input=sp2/output=sp4/cache=sp5）');
ok(spRows.some(r => r.cells[3].textContent.includes('输入token区间 + 输出token区间')), '维度列展示 dims');
ok(w.eval('spacePlans.filter(r => r.fnSpaces && r.fnSpaces.input).length') === 2, 'input 有两份计划（常规+双11）指向不同空间');
// 3. currentSpaceOfFn（第32轮：纯计划仲裁）
ok(w.eval('currentSpaceOfFn("input")') === 'sp2', 'input 当前 sp2');
ok(w.eval('currentSpaceOfFn("output")') === 'sp4', 'output 当前 sp4');
ok(w.eval('currentSpaceOfFn("cache")') === 'sp5', 'cache 当前 sp5');
// 4. 时间旅行 11-15：双11高优先级接管 input→sp3；默认机制已废（第32轮）
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
ok(w.eval('currentSpaceOfFn("input")') === 'sp3', '11-15 双11计划接管 input→sp3（纯计划仲裁）');
const midRows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(midRows.length === 3 && midRows.some(r => r.cells[1].textContent.includes('sp3')), '11-15 列表 input 行=sp3');
w.eval('timeFilter = null; renderSpaceTab()');
// 5. SU 弹窗已删（第37轮：售卖单元由空间计划叉乘生成；保留 effectiveSpaceAt 链路断言）
ok(!d.getElementById('modal-su-confirm'), 'SU 弹窗已删除（第37轮）');
ok(w.eval('typeof openSuConfirmModal') === 'undefined', 'openSuConfirmModal 函数已删');
// 7. 空间计划创建（第31轮+第37轮）：与已有 fn 空间维度集合相同 → 不拦截（总是新建）；维度勾选后须勾度量
w.eval('openSpacePlanModal()');
let box7 = d.querySelector('.sp-fn-check[data-fn="input"]');
box7.checked = true;
box7.dispatchEvent(new w.Event('change', { bubbles: true }));
['输入token区间', '输出token区间'].forEach(dm => {
  d.querySelector('.sp-dim-check[data-fn="input"][value="' + dm + '"]').checked = true;
});
d.getElementById('sp-name').value = 'r31 计划甲';
w.eval('confirmSpacePlan()');
ok(alerts[alerts.length - 1].includes('至少勾选一个度量'), '勾维度不勾度量拦截（第37轮）: ' + (alerts[alerts.length - 1] || '').slice(0, 30));
d.querySelectorAll('.sp-measure-check[data-fn="input"]').forEach(c => { c.checked = true; });
w.eval('confirmSpacePlan()');
ok(alerts[alerts.length - 1].includes('已新建售卖空间'), '重复维度集合不拦截（总是新建口径）: ' + (alerts[alerts.length - 1] || '').slice(0, 24));
ok(w.eval('spaceSeq') === 6, '新建 sp6（input 两 token 维度）');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp6").length') === 9, 'sp6 叉乘 9 单元（度量全勾 3×3）');
// 8. 一份计划多 fn：cache+两 token 维度（跨 fn 可同维度集合）→ sp7
w.eval('openSpacePlanModal()');
const box8 = d.querySelector('.sp-fn-check[data-fn="cache"]');
box8.checked = true;
box8.dispatchEvent(new w.Event('change', { bubbles: true }));
['输入token区间', '输出token区间'].forEach(dm => {
  d.querySelector('.sp-dim-check[data-fn="cache"][value="' + dm + '"]').checked = true;
});
d.querySelectorAll('.sp-measure-check[data-fn="cache"][data-dim="输入token区间"]').forEach(c => { c.checked = c.value === '0～128K'; });
d.querySelectorAll('.sp-measure-check[data-fn="cache"][data-dim="输出token区间"]').forEach(c => { c.checked = c.value === '0～4K'; });
d.getElementById('sp-name').value = 'r31 计划乙';
w.eval('confirmSpacePlan()');
ok(w.eval('spaces["sp7"].fn') === 'cache' && w.eval('spaces["sp7"].dims.length') === 2, 'sp7 fn=cache 两维度（跨 fn 同集合允许）');
ok(w.eval('spaces["sp7"].measures') === undefined, '新空间无 measures（只管维度）');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp7").length') === 1, 'sp7 叉乘 1 单元（输入0～128K×输出0～4K）');
// 8b. 多 fn 单计划：output+购买量区间、input+购买周期 → sp8/sp9 一次创建
w.eval('openSpacePlanModal()');
const boxOut9 = d.querySelector('.sp-fn-check[data-fn="output"]');
boxOut9.checked = true;
boxOut9.dispatchEvent(new w.Event('change', { bubbles: true }));
d.querySelector('.sp-dim-check[data-fn="output"][value="购买量区间"]').checked = true;
d.querySelector('.sp-measure-check[data-fn="output"][data-dim="购买量区间"][value="1～100"]').checked = true;
const boxIn9 = d.querySelector('.sp-fn-check[data-fn="input"]');
boxIn9.checked = true;
boxIn9.dispatchEvent(new w.Event('change', { bubbles: true }));
d.querySelector('.sp-dim-check[data-fn="input"][value="购买周期"]').checked = true;
d.querySelector('.sp-measure-check[data-fn="input"][data-dim="购买周期"][value="30天"]').checked = true;
d.getElementById('sp-name').value = 'r31 计划丙';
w.eval('confirmSpacePlan()');
ok(alerts[alerts.length - 1].includes('已新建售卖空间：sp8') && alerts[alerts.length - 1].includes('sp9'), '一份计划两 fn 各建一空间（第35轮 alert 用 code）: ' + (alerts[alerts.length - 1] || '').slice(0, 40));
ok(w.eval('spaces["sp8"].name === undefined && spaces["sp9"].name === undefined') , '第35轮：空间无 name 字段（code 即标识）');
ok(w.eval('spaces["sp8"].fn') === 'input' && w.eval('spaces["sp9"].fn') === 'output', 'sp8/sp9 归属正确（按 fnPool DOM 序：input 在前）');
// 11. 返回列表（快照 glm4 编辑结果）→ vtpm 商品：无 fn 单行生效
w.eval('backToList()');
w.eval('openDetailByCode("maas-product-vtpm-std")');
const vRows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(vRows.length === 1, 'vtpm 单行（sp1 常驻计划）');
ok(vRows[0].cells[0].textContent.includes('—'), 'Function 列显示 —');
ok(w.eval('currentSpaceOfFn("")') === 'sp1', 'vtpm 当前 sp1');
// 12. snapshot 链路（第32轮）：glm4 新建计划发布后返回列表再进入，spacePlans/fnSpaces 恢复
w.eval('openDetailByCode("maas-online-text-glm4")');
const spIdxBefore = w.eval('spacePlans.length');
w.eval('publishSpacePlan(' + (spIdxBefore - 1) + ')'); // 发布 r31 计划丙（output sp8 / input sp9，默认时段 11-11~11-20 生效期内）
ok(w.eval('currentSpaceOfFn("output")') === 'sp4', '计划丙 priority 0 < 常规 100 → 不接管，output 仍 sp4（优先级仲裁）');
w.eval('backToList()');
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(w.eval('spacePlans.length') === spIdxBefore && w.eval('spacePlans[spacePlans.length-1].name') === 'r31 计划丙', '快照恢复空间计划数量与名称');
ok(w.eval('currentSpaceOfFn("input")') === 'sp2', '重进后 input 仍 sp2（常规计划 priority 100 胜过 priority 0 计划丙）');
// 13. 快照还含新建空间：sp7（cache 第二空间，r31 计划乙）在重进后存在（第32轮：仅出现在计划单元列表，售卖空间 Tab 只显示生效空间行）
ok(w.eval('spaces["sp7"].fn') === 'cache', '快照恢复新建空间 sp7');
w.eval('renderSpacePlans()');
const rows13 = Array.from(d.querySelectorAll('#spaceplan-tbody tr'));
const sp7Row = rows13.find(r => r.textContent.includes('sp7'));
ok(!!sp7Row && sp7Row.textContent.includes('待发布'), 'sp7 经计划乙（待发布）出现在空间计划 Tab 列表');
console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
