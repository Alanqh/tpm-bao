// 第25轮：售卖计划级 fn 生效空间定时切换（路径B）——fnSpaces 字段 + effectiveSpaceAt 推导 + 空间Tab标注/接管 + 校验
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const { window } = dom;
const alerts = [];
let confirmMsgs = [];
window.alert = m => alerts.push(String(m));
window.confirm = m => { confirmMsgs.push(String(m)); return true; };
const w = window;
const d = w.document;
let step = 0, fail = 0;
function ok(cond, msg) { step++; if (!cond) { fail++; console.log('FAIL[' + step + '] ' + msg); } }

// 1. mock：双11大促计划（published，11-11~11-20，fnSpaces.input=sp3，priority 500）
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(w.eval('planRows.length') === 2 && w.eval('planRowStatuses[0]') === 'published', 'glm4 有两份已发布计划（第25轮 mock）');
ok(JSON.stringify(w.eval('planRows[0].fnSpaces')) === JSON.stringify({ input: 'sp3' }), '双11计划 fnSpaces={input:sp3}');
ok(w.eval('planRows[1].fnSpaces') === undefined || JSON.stringify(w.eval('planRows[1].fnSpaces')) === '{}', '常规计划无 fnSpaces 指定');
ok(w.eval('chargeItems.some(c => c.code === "maas-online-text-glm4.30d")'), 'glm4 前缀计费项已补（30d）');
// 2. effectiveSpaceAt 推导（当前 2026-11-01：双11计划未到期 → 手动配置 sp2 生效）
ok(w.eval('effectiveSpaceAt("input").key') === 'sp2' && w.eval('effectiveSpaceAt("input").source') === 'manual', '当前 input=sp2（manual，计划未到期）');
ok(w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp3' && w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").source') === 'plan', '11-15 input=sp3（plan 接管）');
ok(w.eval('effectiveSpaceAt("input","2026-11-25 00:00:00").key') === 'sp2' && w.eval('effectiveSpaceAt("input","2026-11-25 00:00:00").source') === 'manual', '11-25 双11过期 → 回落 manual sp2');
ok(w.eval('effectiveSpaceAt("output").key') === 'sp4' && w.eval('effectiveSpaceAt("output").source') === 'manual', 'output 无计划指定 → 一直 manual sp4');
ok(w.eval('effectiveSpaceAt("input","2026-11-11 00:00:00").source') === 'plan', '边界 11-11 00:00 起接管（含起点）');
ok(w.eval('effectiveSpaceAt("input","2026-11-20 00:00:00").source') === 'plan', '边界 11-20 00:00 仍接管（含终点）');
// 3. 优先级仲裁：补一份同时段低优先级计划指定 input=sp2 → 高优先级（500）的双11计划仍胜
w.eval('planRows.push({name:"低优先级·保持sp2", units:["su-1"], unitStates:{"su-1":"on"}, chargeCodes:{"su-1":"maas-online-text-glm4.30d"}, quotaCodes:{"su-1":"quota-vtpm-30d"}, inventoryCodes:{"su-1":"inv-vtpm-30d"}, modes:{charge:"unified",quota:"unified",inventory:"unified",factor:"unified",slo:"unified",payload:"unified",qty:"unified"}, factor:"x", slo:"x", payloadId:"", minQty:100, maxQty:10000, stepQty:100, priority:100, fnSpaces:{input:"sp2"}, effStart:"2026-11-12 00:00:00", effEnd:"2026-11-18 00:00:00"}); planRowStatuses.push("published")');
ok(w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp3', '同时段双计划 → 高优先级（500>100）双11计划胜: ' + w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key'));
// 4. 切换预告：当前时刻之后最近的 fn 空间变化
const nx = w.eval('nextSpaceSwitchOfFn("input")');
ok(nx && nx.name === '双11大促·输入切换售卖空间3', '预告下一个切换=双11计划');
ok(w.eval('nextSpaceSwitchOfFn("output")') === null, 'output 无未来切换 → null');
// 5. 空间 Tab 标注：sp3 未生效行显示未来切换预告；时间旅行后对调
w.eval('renderSpaceTab()');
let rows = Array.from(d.querySelectorAll('#space-tbody tr'));
let sp3r = rows.find(r => r.textContent.includes('sp3'));
ok(sp3r && sp3r.textContent.includes('11-11 起生效') && sp3r.textContent.includes('双11大促'), 'sp3 行显示定时切换预告');
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
rows = Array.from(d.querySelectorAll('#space-tbody tr'));
sp3r = rows.find(r => r.textContent.includes('sp3'));
const sp2r = rows.find(r => r.textContent.includes('sp2'));
ok(sp3r.textContent.includes('生效中') && sp3r.textContent.includes('计划「双11大促'), '11-15 时 sp3 生效中+计划指定标注');
ok(sp2r.textContent.includes('未生效') && sp2r.textContent.includes('计划接管中'), '11-15 时 sp2 未生效+操作列=计划接管中（禁手动）');
w.eval('timeFilter = null');
// 6. 创建页 fnSpaces 区：默认不指定；选择后保存 → fnSpaces 落库；不匹配单元触发 confirm
w.eval('startEdit()');
w.eval('openPlanCreatePage()');
const sels = Array.from(d.querySelectorAll('.plan-fnspace-select'));
ok(sels.length === 3 && sels.every(s => s.value === ''), '创建页 fnSpaces 3 个下拉默认=不指定');
sels.find(s => s.dataset.fn === 'input').value = 'sp3';
w.eval('confirmPlanCreate()'); // 无名称 → 应被名称校验拦截
ok(alerts[alerts.length - 1].includes('请填写售卖计划名称'), '空名称先被拦截');
d.getElementById('plan-name').value = 'r25切换计划';
// units 默认全勾（su-1/su-2 在 sp2 ≠ 计划 sp3 → confirm）
confirmMsgs = [];
w.eval('confirmPlanCreate()');
ok(confirmMsgs.some(m => m.includes('su-1') && m.includes('sp2空间相关') === false && m.includes('确定保存吗')), '不匹配单元触发确认弹窗: ' + (confirmMsgs[0] || '').slice(0, 40));
const sv = w.eval('planRows[planRows.length-1]');
ok(sv && sv.name === 'r25切换计划' && JSON.stringify(sv.fnSpaces) === JSON.stringify({ input: 'sp3' }), '保存 fnSpaces={input:sp3}');
// 7. 待发布不接管；发布后接管（effStart 默认 2026-11-01 已覆盖当前时刻）
ok(w.eval('effectiveSpaceAt("input").key') === 'sp2', '待发布计划不接管（仍 sp2）');
const r25Idx = w.eval('planRows.length-1');
w.eval('publishPlanRow(' + r25Idx + ')');
ok(w.eval('effectiveSpaceAt("input").key') === 'sp3' && w.eval('effectiveSpaceAt("input").source') === 'plan', '发布后接管 input=sp3（priority 0 vs 双11 500，但双11未到期，仅该计划在效）');
// 8. 停用后回落 manual
w.eval('stopPlanRow(' + r25Idx + ')');
ok(w.eval('effectiveSpaceAt("input").key') === 'sp2' && w.eval('effectiveSpaceAt("input").source') === 'manual', '停用后回落 manual sp2');
// 9. 修改回填 + 「仅生效中」筛选挂 effectiveSpaceAt
w.eval('editPlanRow(0)'); // 双11计划（fnSpaces={input:sp3}）
const back = Array.from(d.querySelectorAll('.plan-fnspace-select')).find(s => s.dataset.fn === 'input');
ok(back && back.value === 'sp3', '修改页回填 fnSpaces.input=sp3');
w.eval('closePlanCreatePage()');
// 10. 计划详情展示 fnSpaces
w.eval('openPlanDetail(0)');
const pdTxt = d.getElementById('plan-detail-fields').textContent;
ok(pdTxt.includes('生效售卖空间') && pdTxt.includes('售卖空间3'), '计划详情展示「生效售卖空间」字段');
w.eval('closePlanDetail()');
// 11. SU 弹窗默认空间挂 effectiveSpaceAt（11-15 时刻 input→sp3）
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
w.eval('openSuConfirmModal()');
d.getElementById('su-fn-select').value = 'input';
w.eval('onSuFnChange()');
ok(d.getElementById('su-space-select').value === 'sp3', 'SU 弹窗默认空间=effectiveSpaceAt（11-15 → sp3）');
w.eval('closeModal("su-confirm"); timeFilter = null');
// 12. vtpm 商品不受影响（无计划 fnSpaces → 全 manual）
w.eval('backToList(); openDetailByCode("maas-product-vtpm-std")');
ok(w.eval('effectiveSpaceAt("").key') === 'sp1' && w.eval('effectiveSpaceAt("").source') === 'manual', 'vtpm 无 fnSpaces 计划 → manual sp1');
console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
