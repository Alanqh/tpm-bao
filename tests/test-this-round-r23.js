// 第23轮历史验证——第38轮口径重写：空间=聚合根（无 spacePlans）；列表全空间展示 9 列（不按时刻过滤）；发布/优先级仲裁
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

// 1. 打开 glm4（浏览态）
w.eval('openDetailByCode("maas-online-text-glm4")');
// 2. 列表结构：8 列表头（第40轮：删空间单元列，售卖空间居首）
const spHead = Array.from(d.querySelector('#space-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(JSON.stringify(spHead) === JSON.stringify(['售卖空间','状态','空间名称','Function','维度组合','售卖单元数','优先级','生效开始','生效结束']), '表头 9 列（第49轮生效起止拆两列）: ' + spHead.join('/'));
// 3. 行序（第39轮：排序=状态→优先级降序→创建时间逆序；第48轮：单空间 sp1，fn 按创建序 input/output/cache）
const rows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(rows.length === 3, '3 个空间行（第48轮：单空间 sp1×3fn）');
ok(rows[0].cells[0].textContent.trim() === 'sp1' && rows[0].cells[0].rowSpan === 3, 'sp1 空间列 rowspan=3');
ok(rows[0].cells[3].textContent.trim() === 'input' && rows[1].cells[0].textContent.trim() === 'output' && rows[2].cells[0].textContent.trim() === 'cache', 'sp1 三行按创建序 input/output/cache');
ok(!rows[0].textContent.includes('pu-sp-'), '第40轮已删空间单元列（无 pu-sp 编号）');
// 4. 状态列（第38轮：三态徽标 + 档期内/外标注）
ok(rows[0].textContent.includes('已发布'), 'sp1 首行已发布徽标（续行被 rowspan 合并无徽标）');
ok(rows[0].textContent.includes('生效期内'), '档期标注展示（sp1 档期内）');
// 5. 无操作列/无默认机制
ok(!rows[0].innerHTML.includes('设为默认') && !rows[0].innerHTML.includes('设为生效'), '无设为默认/设为生效');
ok(w.eval('typeof setSpaceActive') === 'undefined', 'setSpaceActive 函数已删');
// 6. 时间切换后档期标注（第48轮：单空间，11-15 仍生效期内）
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
const rows2 = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(rows2.length === 3, '11-15 仍 3 行（全空间展示不按时刻过滤）');
ok(rows2[0].textContent.includes('生效期内'), '11-15 sp1 行=生效期内');
w.eval('timeFilter = null; renderSpaceTab()');
// 7. 浏览态：vtpm std（常驻空间 sp1 单行）
w.eval('backToList()');
w.eval('openDetailByCode("maas-product-vtpm-std")');
const vRows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(vRows.length === 1, 'vtpm 单行（sp1 常驻空间）');
ok(vRows[0].cells[3].textContent.includes('—'), '无 fn 显示 —');
ok(vRows[0].textContent.includes('已发布'), 'sp1 已发布');
ok(vRows[0].cells[5].textContent.trim() === '3', 'sp1 售卖单元数=3（第48轮 std 纯叉乘 3 单元）');
// 8. 创建新空间：未发布 → 不参与仲裁；发布且高优先级 → 生效（第43轮两步：fn→直接勾度量）
w.eval('startEdit()');
w.eval('openSpacePlanModal()');
const box8 = d.querySelector('.sp-fn-check[data-fn=""]');
box8.checked = true;
box8.dispatchEvent(new w.Event('change', { bubbles: true }));
d.querySelector('.sp-measure-check[data-dim="购买量区间"][value="1～100"]').checked = true;
d.getElementById('sp-name').value = 'r38 vtpm 空间A';
d.getElementById('sp-priority').value = '200';
d.getElementById('sp-eff-start').value = '2026-11-01T00:00:00';
d.getElementById('sp-eff-end').value = '2027-11-01T00:00:00';
w.eval('confirmSpacePlan()');
ok(w.eval('spaceSeq') === 2, 'sp2 创建成功（保存即落地空间）');
ok(w.eval('spaces["sp2"].fnDims[""].length') === 1, 'sp2 单维度');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp2" && u.measure === "1～100").length') === 1, 'sp2 含 1～100 单元');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp2").length') === 1, 'sp2 纯叉乘 1 组合（1～100，无空组合）');
ok(w.eval('currentSpaceOfFn("")') === 'sp1', 'sp2 待发布 → 不接管，仍 sp1');
// 发布后接管：priority 200 > 常驻 100 → sp2 生效
w.eval('publishSpacePlan("sp2")');
ok(w.eval('currentSpaceOfFn("")') === 'sp2', '发布后 priority 200>100 → sp2 接管');
let rows3 = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(rows3.length === 2 && rows3[0].cells[0].textContent.trim() === 'sp2', '列表显示 sp2（排序在前：同 published，priority 200 > 100）');
// 9. 重复维度集合不再拦截（总是新建 sp3）；第48轮：勾1～100+30天 → 1×1=1 组合（纯叉乘）
w.eval('openSpacePlanModal()');
const box9 = d.querySelector('.sp-fn-check[data-fn=""]');
box9.checked = true;
box9.dispatchEvent(new w.Event('change', { bubbles: true }));
d.getElementById('sp-name').value = 'r38 vtpm 空间B';
d.getElementById('sp-eff-start').value = '2026-11-01T00:00:00';
d.getElementById('sp-eff-end').value = '2027-11-01T00:00:00';
d.querySelector('.sp-measure-check[data-dim="购买量区间"][value="1～100"]').checked = true;
d.querySelector('.sp-measure-check[data-dim="购买周期"][value="30天"]').checked = true;
w.eval('confirmSpacePlan()');
ok(w.eval('spaceSeq') === 3 && w.eval('spaces["sp3"].fnDims[""].length') === 2, '维度集合与 sp1 相同 → 不拦截，新建 sp3（总是新建）');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp3").length') === 1, 'sp3 纯叉乘 1 组合（1～100×30天，无空组合）');
w.eval('closeModal("spaceplan")');
// 10. SU 弹窗已删（第37轮）
ok(!d.getElementById('modal-su-confirm'), 'SU 弹窗已删');
ok(w.eval('typeof openSuConfirmModal') === 'undefined', 'openSuConfirmModal 已删');
// 11. 编辑度量/空间修改功能已删
ok(!d.getElementById('modal-space-measure-edit'), '编辑度量弹窗已删');
ok(w.eval('typeof editSpaceMeasures') === 'undefined', 'editSpaceMeasures 函数已删');
ok(w.eval('typeof setFnSpace') === 'undefined', 'setFnSpace 已删');
ok(w.eval('typeof editSpacePlan') === 'function', '第45轮：editSpacePlan 恢复（待发布空间可编辑）');
ok(!d.getElementById('fn-space-cards'), 'fn 配置卡已删');
// 12. snapshot 恢复（第38轮）：glm4 重进后空间/状态保持
w.eval('exitEdit(); backToList()');
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(w.eval('Object.keys(spaces).length') === 1 && w.eval('spaces["sp1"].status') === 'published', '重进 glm4 恢复 1 空间 mock 默认（第48轮；vtpm 编辑不影响 glm4）');
ok(w.eval('currentSpaceOfFn("input")') === 'sp1', '当前 input=sp1');
console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
