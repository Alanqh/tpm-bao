// 冒烟（第32轮口径）：空间生效纯计划仲裁——已发布生效期内计划创建的空间；多计划按优先级降序→创建时间后创建优先；无计划无生效空间；列表按时刻过滤
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '../prototype/admin-products.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const w = dom.window;

let pass = 0, fail = 0;
const alerts = [];
w.alert = (m) => alerts.push(String(m));
w.confirm = () => true;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }

w.eval(`
window.__T = {
  effectiveSpaceAt, nextSpaceSwitchOfFn, currentSpaceOfFn,
  get spacePlans(){return spacePlans}, get spacePlanStatuses(){return spacePlanStatuses},
  get spaceSeq(){return spaceSeq}, get spaces(){return spaces},
  get timeFilter(){return timeFilter}, set timeFilter(v){timeFilter=v},
  openDetailByCode, backToList, startEdit, exitEdit,
  renderSpaceTab, renderSpacePlans, openSpacePlanModal, confirmSpacePlan, publishSpacePlan, stopSpacePlan, editSpacePlan, copySpacePlan,
  closeModal, guardEdit
};
`);
const T = w.__T;

// ===== 1. glm4 装载：常规 + 双11 两份计划均 published =====
T.openDetailByCode('maas-online-text-glm4');
ok(T.spacePlans.length === 2, 'glm4 装载 2 份空间计划（常规+双11），实得 ' + T.spacePlans.length);
ok(T.spacePlans[0].name === 'GLM4·常规售卖空间' && T.spacePlans[0].fnSpaces.input === 'sp2', '常规计划 input→sp2');
ok(T.spacePlans[1].fnSpaces.input === 'sp3' && T.spacePlans[1].priority === 500, '双11计划 input→sp3 优先级500');

// ===== 2. 纯计划仲裁：effectiveSpaceAt（无 manual 回落）=====
const effMid = T.effectiveSpaceAt('input', '2026-11-15 12:00:00');
ok(effMid.key === 'sp3' && effMid.source === 'plan', '11-15 input=sp3（双11 高优先级接管），实得 ' + JSON.stringify({ key: effMid.key, source: effMid.source }));
ok(T.effectiveSpaceAt('input', '2026-11-01 12:00:00').key === 'sp2', '11-01 input=sp2（常规计划生效中）');
ok(T.effectiveSpaceAt('input', '2026-11-01 12:00:00').source === 'plan', '11-01 source=plan（常规计划，非 manual 回落）');
const effAfter = T.effectiveSpaceAt('input', '2026-11-25 12:00:00');
ok(effAfter.key === 'sp2' && effAfter.source === 'plan', '11-25 双11到期 → 由常规计划继续生效 sp2（仍是 plan）');
ok(T.effectiveSpaceAt('output', '2026-11-15 00:00:00').key === 'sp4', 'output=sp4（常规计划，双11未指定 output）');
ok(T.effectiveSpaceAt('cache', '2026-11-15 00:00:00').key === 'sp5', 'cache=sp5（常规计划）');

// ===== 3. 优先级 + 创建时间仲裁 =====
// 先造一个 output 的新空间 sp6（第31轮口径：空间由计划创建——此处直接造空间模拟）
w.eval('spaceSeq = Math.max(spaceSeq, 6); spaces["sp6"] = { seq: 6, name: "售卖空间6", fn: "output", dims: ["输入token区间"] }');
// 同优先级两份生效计划 → 后创建（空间 seq 大）优先
w.eval('spacePlans.push({name:"仲裁·同优先级晚建", priority:100, effStart:"2026-11-14 00:00:00", effEnd:"2026-11-16 00:00:00", fnDims:{output:["输入token区间"]}, fnSpaces:{output:"sp6"}}); spacePlanStatuses.push("pending_publish")');
ok(T.effectiveSpaceAt('output', '2026-11-15 00:00:00').key === 'sp4', '待发布计划不参与仲裁');
w.eval('spacePlanStatuses[2] = "published"');
const arb1 = T.effectiveSpaceAt('output', '2026-11-15 00:00:00');
ok(arb1.key === 'sp6' && arb1.plan.name === '仲裁·同优先级晚建', '同优先级（100）→ 后创建 sp6 胜出，实得 ' + JSON.stringify({ key: arb1.key, plan: arb1.plan && arb1.plan.name }));
// 高优先级胜出（input：双11 500 vs 新计划 900）
w.eval('spacePlans.push({name:"仲裁·高优先级", priority:900, effStart:"2026-11-14 00:00:00", effEnd:"2026-11-16 00:00:00", fnDims:{input:["输入token区间"]}, fnSpaces:{input:"sp2"}}); spacePlanStatuses.push("published")');
const arb2 = T.effectiveSpaceAt('input', '2026-11-15 00:00:00');
ok(arb2.key === 'sp2' && arb2.plan.name === '仲裁·高优先级', '优先级 900>500 → 高优先级计划胜出（优先级先于创建时间比较），实得 ' + (arb2.plan && arb2.plan.name));
// 清理
w.eval('spacePlans.pop(); spacePlanStatuses.pop(); spacePlans.pop(); spacePlanStatuses.pop(); delete spaces["sp6"]');

// ===== 4. 无生效计划 → key=''（不回退最早空间）=====
const regular = JSON.parse(JSON.stringify(T.spacePlans[0]));
w.eval('spacePlans.splice(0, 1); spacePlanStatuses.splice(0, 1)'); // 删常规计划
ok(T.effectiveSpaceAt('output', '2026-11-16 00:00:00').key === '', '常规计划删除后 output 无生效空间（key=""，非回退最早空间）');
ok(T.effectiveSpaceAt('input', '2026-11-25 00:00:00').key === '', 'input 双11到期且无常规 → 无生效空间');
// 原地恢复（避免污染快照）
w.eval('spacePlans.unshift(' + JSON.stringify(regular) + '); spacePlanStatuses.unshift("published")');
ok(T.spacePlans.length === 2 && T.effectiveSpaceAt('output', '2026-11-16 00:00:00').key === 'sp4', '恢复常规计划后 output=sp4');

// ===== 5. nextSpaceSwitchOfFn =====
const nx = T.nextSpaceSwitchOfFn('input', '2026-11-01 12:00:00');
ok(nx && nx.name === '双11大促·输入切换售卖空间3', '11-01 预告下一切换=双11');
ok(T.nextSpaceSwitchOfFn('input', '2026-11-25 12:00:00') === null, '11-25 后无切换');

// ===== 6. 售卖空间 Tab：按时刻过滤（每 fn 至多一行；无生效 fn 不展示）=====
T.renderSpaceTab();
let rows = w.document.querySelectorAll('#space-tbody tr');
ok(rows.length === 3, '当前时刻 3 行（input=sp2/output=sp4/cache=sp5 各一行），实得 ' + rows.length);
let tabTxt = w.document.getElementById('space-tbody').textContent;
ok(Array.from(rows).some(r => r.cells[1].textContent.trim() === 'sp2') && Array.from(rows).every(r => r.cells[1].textContent.trim() !== 'sp3'), '当前时刻 input=sp2（sp3 未来才生效不在列表；第35轮空间列只显 code）');
ok(!tabTxt.includes('设为默认') && !tabTxt.includes('默认'), '第32轮：无默认徽标/设为默认（默认机制已废）');
const ths = w.document.querySelectorAll('#inner-tab-space thead th');
ok(ths.length === 5, '售卖空间表头 5 列（删操作列），实得 ' + ths.length);
// 时间旅行 11-15：input→sp3
T.timeFilter = { point: '2026-11-15 12:00:00' };
T.renderSpaceTab();
rows = w.document.querySelectorAll('#space-tbody tr');
tabTxt = w.document.getElementById('space-tbody').textContent;
ok(Array.from(rows).some(r => r.cells[1].textContent.includes('sp3')) && Array.from(rows).every(r => !r.cells[1].textContent.includes('sp2')), '11-15 时 input=sp3（sp2 按时刻过滤不在列表）');
ok(Array.from(rows).every(r => !r.cells[2].textContent.includes('计划「')), '状态列只留徽标（第35轮：胜出计划标注已删）');
ok(Array.from(rows).some(r => r.cells[1].textContent.trim() === 'sp4') && Array.from(rows).some(r => r.cells[1].textContent.trim() === 'sp5'), '11-15 output=sp4/cache=sp5 仍在列表');
T.timeFilter = null;
T.renderSpaceTab();

// ===== 7. 无生效计划时刻 → 空表提示 =====
T.timeFilter = { point: '2025-01-01 00:00:00' };
T.renderSpaceTab();
ok(w.document.getElementById('space-tbody').textContent.includes('该时刻无生效中的售卖空间'), '任意 fn 均无生效计划 → 空表提示（2025 年早于一切计划）');
T.timeFilter = null;
T.renderSpaceTab();

// ===== 8. 空间计划创建→发布→生效（第31轮创建链路不回归）=====
T.startEdit();
const seqBefore = T.spaceSeq;
T.openSpacePlanModal();
let modal = w.document.getElementById('modal-spaceplan');
const box = modal.querySelector('.sp-fn-check[data-fn="output"]');
box.checked = true;
box.dispatchEvent(new w.Event('change', { bubbles: true }));
modal.querySelectorAll('.sp-dim-check[data-fn="output"]').forEach(c => { c.checked = c.value === '输入token区间'; });
w.document.getElementById('sp-name').value = '测试计划A';
w.document.getElementById('sp-priority').value = '100';
w.document.getElementById('sp-eff-start').value = '2026-12-01 00:00:00';
w.document.getElementById('sp-eff-end').value = '2026-12-10 00:00:00';
alerts.length = 0;
T.confirmSpacePlan();
const newKey = T.spacePlans[2].fnSpaces.output;
ok(newKey === 'sp' + (seqBefore + 1), '保存为 output 新建空间 ' + newKey);
ok(T.spacePlanStatuses[2] === 'pending_publish', '新计划待发布');
ok(T.effectiveSpaceAt('output', '2026-12-05 00:00:00').key === 'sp4', '待发布不参与仲裁（12-05 仍 sp4）');
T.publishSpacePlan(2);
ok(T.effectiveSpaceAt('output', '2026-12-05 00:00:00').key === newKey, '发布后 12-05 output=' + newKey + '（同优先级 100，后创建胜出）');
T.stopSpacePlan(2);
ok(T.effectiveSpaceAt('output', '2026-12-05 00:00:00').key === 'sp4', '停用后回落常规计划 sp4');

// ===== 9. 快照透传 =====
T.backToList();
T.openDetailByCode('maas-online-text-glm4');
ok(T.spacePlans.length === 3, '快照恢复 3 份计划，实得 ' + T.spacePlans.length);
ok(T.spacePlanStatuses[2] === 'stopped', '快照恢复状态 stopped');

// ===== 10. vtpm 商品：常驻计划 fn=''→sp1 =====
T.backToList();
T.openDetailByCode('maas-product-vtpm-std');
ok(T.spacePlans.length === 1 && T.spacePlans[0].fnSpaces[''] === 'sp1' && T.spacePlanStatuses[0] === 'published', 'vtpm std 常驻计划 fn=""→sp1 published');
ok(T.effectiveSpaceAt('', '2026-11-01 00:00:00').key === 'sp1', 'vtpm 当前生效=sp1（常驻计划）');
T.renderSpaceTab();
ok(w.document.getElementById('space-tbody').textContent.includes('sp1'), 'vtpm 列表显示 sp1（code）');
// pre：常驻计划待发布 → 无生效空间
T.backToList();
T.openDetailByCode('maas-product-vtpm-pre');
ok(T.effectiveSpaceAt('', '2026-11-01 00:00:00').key === '', 'pre 常驻计划待发布 → 无生效空间');
T.renderSpaceTab();
ok(w.document.getElementById('space-tbody').textContent.includes('该时刻无生效中的售卖空间'), 'pre 列表空表提示');

console.log(`\n冒烟结果: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
