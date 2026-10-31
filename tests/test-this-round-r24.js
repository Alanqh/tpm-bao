// 第24轮：售卖计划区块2筛选重设计——fn 复选组（多选/全选）+ 空间筛（全部/仅生效中）+ 筛选变更取消超出范围的勾选
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
const vis = () => Array.from(d.querySelectorAll('.plan-unit-row')).filter(r => !r.classList.contains('hidden')).map(r => r.querySelector('.plan-unit-check').value);
const chk = () => Array.from(d.querySelectorAll('.plan-unit-check:checked')).map(c => c.value);
const fnBoxes = () => Array.from(d.querySelectorAll('.plan-filter-fn-check:not(.plan-filter-fn-all)'));

// 1. 进入创建页：筛选重置（fn 全不勾=全部、空间=全部空间）
w.eval('openDetailByCode("maas-online-text-glm4")');
w.eval('startEdit()');
w.eval('openPlanCreatePage()');
ok(vis().length === 4, '进入创建页全部可见（4）');
ok(d.getElementById('plan-filter-space').value === '', '空间筛默认=全部空间');
ok(fnBoxes().length === 3, 'fn 复选组 3 个（input/output/cache）');
ok(!!d.querySelector('.plan-filter-fn-all'), '存在全选框');
// 2. 直接改数据：su-1 挪到 sp3（input 的未生效空间）→ 重进创建页后筛「仅生效中」应滤掉 su-1
w.eval('closePlanCreatePage()');
w.eval('saleUnits.find(u => u.id === "su-1").spaceKey = "sp3"');
ok(w.eval('currentSpaceOfFn("input")') === 'sp2', 'input 生效空间仍 sp2（su-1 现在在未生效空间 sp3）');
w.eval('openPlanCreatePage()');
d.getElementById('plan-filter-space').value = '__ACTIVE__';
w.eval('applyPlanUnitFilter()');
ok(!vis().includes('su-1') && vis().length === 3, '仅生效中滤掉 sp3 的 su-1: ' + vis().join(','));
ok(!chk().includes('su-1'), 'su-1 的勾选被自动取消');
// 3. 恢复全部空间 → su-1 可见但仍不勾（取消不自动恢复）
d.getElementById('plan-filter-space').value = '';
w.eval('applyPlanUnitFilter()');
ok(vis().length === 4, '全部空间恢复 4 行可见');
ok(!chk().includes('su-1'), 'su-1 不自动恢复勾选（需手动重勾）');
// 4. fn 多选：cache+input → 可见 su-1/su-4（+su-2 若在 sp2）
fnBoxes().forEach(c => { c.checked = ['cache', 'input'].includes(c.value); });
w.eval('applyPlanUnitFilter()');
ok(vis().sort().join(',') === 'su-1,su-2,su-4', 'fn 勾 cache+input 多选可见 3 行: ' + vis().join(','));
// 5. 全选框联动：勾上→子框全选全可见；取消→子框全清（空选=不过滤）
d.querySelector('.plan-filter-fn-all').checked = true;
w.eval('onPlanFnFilterToggleAll(document.querySelector(".plan-filter-fn-all"))');
ok(fnBoxes().every(c => c.checked) && vis().length === 4, '全选框联动全 fn 全可见');
d.querySelector('.plan-filter-fn-all').checked = false;
w.eval('onPlanFnFilterToggleAll(document.querySelector(".plan-filter-fn-all"))');
ok(fnBoxes().every(c => !c.checked) && vis().length === 4, '取消全选=全部（空选=不过滤）');
// 6. 保存链路：筛选 output 后保存 → 计划 units 只含范围内单元（glm4 无既有计费项，先 mock 一个）
fnBoxes().forEach(c => { c.checked = c.value === 'output'; });
w.eval('applyPlanUnitFilter()');
ok(vis().length === 1 && vis()[0] === 'su-3', 'fn=output 可见仅 su-3');
w.eval('chargeItems.push({code:"maas-online-text-glm4.out30d", name:"GLM4输出包30天", price:0.0500, unit:"万vTPM·天", currency:"CNY"})');
w.eval('renderPlanCreateSections(true)');
d.querySelector('#plan-charge-unified select').value = 'maas-online-text-glm4.out30d';
d.querySelector('.plan-unit-check[value="su-3"]').checked = true; // 前步筛选已把 su-3 勾选清掉，重新勾上
d.getElementById('plan-name').value = '筛后计划';
w.eval('confirmPlanCreate()');
const saved = w.eval('planRows[planRows.length-1]');
ok(saved && saved.name === '筛后计划' && JSON.stringify(saved.units) === JSON.stringify(['su-3']), '保存的计划 units=筛选后勾选的 su-3');
// 7. 修改入口：筛选重置 + 原计划勾选回填且不被取消（su-3 output 在全部筛选下可见）
const editIdx = w.eval('planRows.length-1');
w.eval('editPlanRow(' + editIdx + ')');
ok(chk().length === 1 && chk()[0] === 'su-3', '修改页回填原计划勾选（su-3）: ' + chk().join(','));
ok(vis().length === 4, '修改页筛选已重置（默认全部可见，已勾选不被取消）');
console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
