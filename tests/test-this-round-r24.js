// 第24轮历史验证——第38轮口径重写：售卖计划锁定单空间（fn 复选筛选/空间筛已删）；
// 区块2 只展示所选空间内单元；时间范围 ⊆ 空间档期；保存强校验；修改页回填
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
const vis = () => Array.from(d.querySelectorAll('.plan-unit-row')).filter(r => !r.classList.contains('hidden')).map(r => r.querySelector('.plan-unit-check').value);
const chk = () => Array.from(d.querySelectorAll('.plan-unit-check:checked')).map(c => c.value);

// 1. 进入创建页：无旧筛选；须先选空间
w.eval('openDetailByCode("maas-online-text-glm4")');
w.eval('startEdit()');
w.eval('openPlanCreatePage()');
ok(d.querySelectorAll('.plan-filter-fn-check').length === 0, 'fn 复选组已删（第38轮锁空间）');
ok(d.getElementById('plan-filter-space') && d.getElementById('plan-filter-space').closest('#inner-tab-plan') !== null, '空间筛选下拉在售卖计划 Tab 工具条（第43轮），非创建页');
ok(d.getElementById('plan-units-charge-container').textContent.includes('请先选择售卖空间'), '未选空间单元区提示');
const sel = d.getElementById('plan-space-sel');
ok(sel && sel.options.length === 2, '创建页空间下拉 2 项（请选择+sp1，第48轮单空间）: ' + sel.options.length);
// 2. 选 sp1 → 只展示 sp1 内单元
sel.value = 'sp1';
sel.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(vis().sort().join(',') === 'su-1,su-2,su-3,su-4', '选 sp1 → 可见 4 单元（第48轮 per-fn）: ' + vis().join(','));
ok(chk().length === 4, '首次渲染默认全选（4）');
// 3. 时间范围软提示：计划时间超出 sp1 档期 → info 标红 + planTimeWithinSpace=false
d.getElementById('plan-name').value = 'r38 锁空间计划';
d.getElementById('plan-eff-start').value = '2026-11-12T00:00:00';
d.getElementById('plan-eff-end').value = '2028-12-15T00:00:00';
sel.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(w.eval('planTimeWithinSpace()') === false, '时间超 sp1 档期 → false');
ok(d.getElementById('plan-space-info').className.includes('text-red-500'), '超范围提示标红');
// 4. 保存强校验：超范围拦截
alerts.length = 0;
w.eval('confirmPlanCreate()');
ok(alerts.some(m => m.includes('生效范围')), '保存被拦截（时间超空间档期）: ' + (alerts[alerts.length-1] || '').slice(0, 30));
ok(w.eval('planRows.length') === 1, '计划未保存（仍 1 个）');
// 5. 时间收回档期内 → 保存成功
d.getElementById('plan-eff-end').value = '2027-10-31T00:00:00';
w.eval('confirmPlanCreate()');
const saved = w.eval('planRows[planRows.length-1]');
ok(saved && saved.name === 'r38 锁空间计划' && saved.spaceKey === 'sp1', '保存成功且锁定 sp1');
ok(JSON.stringify(saved.units) === JSON.stringify(['su-1','su-2','su-3','su-4']), 'units=sp1 内四单元: ' + saved.units.join(','));
// 6. 跨空间单元拦截（直接改数据模拟）：把 su-1 勾上（构造外部空间假单元）→ 保存拦截
w.eval('saleUnits.push({ id: "su-90", fn: "input", spaceKey: "sp-x", dim: "输入区间", measure: "0～128K" })');
w.eval('openPlanCreatePage()');
sel.value = 'sp1';
sel.dispatchEvent(new w.Event('change', { bubbles: true }));
d.getElementById('plan-name').value = 'r38 跨空间计划';
d.getElementById('plan-eff-start').value = '2026-11-12T00:00:00';
d.getElementById('plan-eff-end').value = '2027-10-31T00:00:00';
// 通过 DOM 注入一个非本空间单元勾选（绕过 UI 验证后端校验）
const box = d.createElement('input');
box.type = 'checkbox';
box.className = 'plan-unit-check';
box.value = 'su-90';
box.checked = true;
box.dataset.state = 'on';
d.getElementById('plan-units-charge-container').appendChild(box);
alerts.length = 0;
w.eval('confirmPlanCreate()');
ok(alerts.some(m => m.includes('不属于所选空间')), '跨空间单元保存被拦截: ' + (alerts[alerts.length-1] || '').slice(0, 30));
box.remove();
w.eval('saleUnits = saleUnits.filter(u => u.id !== "su-90")');
// 7. 修改入口：回填空间+勾选
const editIdx = w.eval('planRows.length-1');
w.eval('editPlanRow(' + editIdx + ')');
ok(d.getElementById('plan-space-sel').value === 'sp1', '修改页回填空间 sp1');
ok(chk().sort().join(',') === 'su-1,su-2,su-3,su-4', '修改页回填原计划勾选: ' + chk().join(','));
// 8. 未选空间拦截（清空下拉）
w.eval('openPlanCreatePage()');
d.getElementById('plan-name').value = 'r38 无空间计划';
d.getElementById('plan-eff-start').value = '2026-11-12T00:00:00';
d.getElementById('plan-eff-end').value = '2027-10-31T00:00:00';
alerts.length = 0;
w.eval('confirmPlanCreate()');
ok(alerts.some(m => m.includes('请选择售卖空间')), '未选空间保存被拦截');
console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
