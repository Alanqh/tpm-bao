// 第26轮 冒烟：空间切换计划（独立实体）全链路
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

// 导出内部符号
w.eval(`
window.__T = {
  effectiveSpaceAt, nextSpaceSwitchOfFn, currentSpaceOfFn,
  get spacePlans(){return spacePlans}, get spacePlanStatuses(){return spacePlanStatuses},
  set spacePlans(v){spacePlans=v}, set spacePlanStatuses(v){spacePlanStatuses=v},
  get timeFilter(){return timeFilter}, set timeFilter(v){timeFilter=v},
  openDetailByCode, backToList, startEdit, exitEdit,
  renderSpaceTab, renderSpacePlans, openSpacePlanModal, confirmSpacePlan, publishSpacePlan, stopSpacePlan, editSpacePlan,
  setSpaceActive, closeModal, guardEdit,
  get planRowsSnapshot(){return planRowsSnapshot}, get alertMsgs(){return []}
};
`);
const T = w.__T;

// ===== 1. glm4 详情装载：双11计划存在且 published =====
T.openDetailByCode('maas-online-text-glm4');
ok(T.spacePlans.length === 1, 'glm4 装载 1 份空间切换计划，实得 ' + T.spacePlans.length);
ok(T.spacePlanStatuses[0] === 'published', '双11计划状态=published');
ok(T.spacePlans[0].fnSpaces && T.spacePlans[0].fnSpaces.input === 'sp3', '双11计划 input→sp3');

// ===== 2. 空间切换计划列表 DOM =====
let tbody = w.document.getElementById('spaceplan-tbody');
ok(tbody && tbody.querySelectorAll('tr').length >= 1, 'spaceplan-tbody 有数据行');
ok(tbody.textContent.includes('双11大促·输入切换售卖空间3'), '列表含双11名称');

// ===== 3. effectiveSpaceAt 时段接管 =====
const effMid = T.effectiveSpaceAt('input', '2026-11-15 12:00:00');
ok(effMid.key === 'sp3' && effMid.source === 'plan', '11-15 input 生效=sp3(plan)，实得 ' + JSON.stringify(effMid));
const effBefore = T.effectiveSpaceAt('input', '2026-11-01 12:00:00');
ok(effBefore.key === 'sp2' && effBefore.source === 'manual', '11-01 input 生效=sp2(manual)，实得 ' + JSON.stringify(effBefore));
const effAfter = T.effectiveSpaceAt('input', '2026-11-25 12:00:00');
ok(effAfter.key === 'sp2' && effAfter.source === 'manual', '11-25 input 回落=sp2(manual)，实得 ' + JSON.stringify(effAfter));

// ===== 4. nextSpaceSwitchOfFn =====
const nx = T.nextSpaceSwitchOfFn('input', '2026-11-01 12:00:00');
ok(nx && nx.name === '双11大促·输入切换售卖空间3', 'nextSpaceSwitch 11-01→双11计划');
ok(T.nextSpaceSwitchOfFn('input', '2026-11-25 12:00:00') === null, '11-25 后无切换');

// ===== 5. renderSpaceTab 接管标注（时间旅行 11-15）=====
T.timeFilter = { point: '2026-11-15 12:00:00' };
T.renderSpaceTab();
let spaceTbody = w.document.getElementById('space-tbody');
ok(spaceTbody.textContent.includes('计划「双11大促·输入切换售卖空间3」接管'), '11-15 空间Tab显示接管标注');
ok(spaceTbody.textContent.includes('计划接管中'), '11-15 接管期操作列=计划接管中');
// 恢复当前
T.timeFilter = null;
T.renderSpaceTab();
spaceTbody = w.document.getElementById('space-tbody');
ok(spaceTbody.textContent.includes('11-11') || spaceTbody.textContent.includes('起生效'), '当前时间显示未来切换预告');

// ===== 6. 创建→发布→停用 全流程（需持锁）=====
// 未持锁时新建按钮被 guardEdit 拦（alert）
alerts.length = 0;
T.openSpacePlanModal();
w.document.getElementById('sp-name').value = '测试计划A';
T.confirmSpacePlan();
ok(alerts.some(m => m.includes('编辑锁') || m.includes('编辑')), '未持锁 confirmSpacePlan 被 guardEdit 拦截: ' + JSON.stringify(alerts));

T.startEdit();
T.openSpacePlanModal();
let modal = w.document.getElementById('modal-spaceplan');
ok(modal && !modal.classList.contains('hidden'), '弹窗打开');
// fn 复选：勾选 output，选 sp4
const spFnBoxes = modal.querySelectorAll('.sp-fn-check');
ok(spFnBoxes.length >= 2, '弹窗含多个 fn 复选，实得 ' + spFnBoxes.length);
const outputBox = Array.from(spFnBoxes).find(b => b.dataset.fn === 'output');
ok(!!outputBox, '存在 output fn 复选');
outputBox.checked = true;
outputBox.dispatchEvent(new w.Event('change', { bubbles: true }));
const outputSel = modal.querySelector('.sp-fn-space[data-fn="output"]');
ok(!!outputSel, 'output 下拉存在');
outputSel.value = 'sp4';
w.document.getElementById('sp-name').value = '测试计划A';
w.document.getElementById('sp-eff-start').value = '2026-12-01 00:00:00';
w.document.getElementById('sp-eff-end').value = '2026-12-10 00:00:00';
alerts.length = 0;
T.confirmSpacePlan();
ok(alerts.some(m => m.includes('测试计划A') && m.includes('待发布')), '保存成功提示待发布: ' + JSON.stringify(alerts));
ok(T.spacePlans.length === 2 && T.spacePlanStatuses[1] === 'pending_publish', '新增计划 pending_publish');

// 发布
T.publishSpacePlan(1);
ok(T.spacePlanStatuses[1] === 'published', '发布后 published');
ok(T.effectiveSpaceAt('output', '2026-12-05 00:00:00').key === 'sp4', '12-05 output 接管=sp4');
// 停用
T.stopSpacePlan(1);
ok(T.spacePlanStatuses[1] === 'stopped', '停用后 stopped');
ok(T.effectiveSpaceAt('output', '2026-12-05 00:00:00').source === 'manual', '停用后回落 manual');

// ===== 7. 修改回填 =====
T.editSpacePlan(1);
modal = w.document.getElementById('modal-spaceplan');
ok(w.document.getElementById('sp-name').value === '测试计划A', '修改回填名称');
const outBox2 = modal.querySelector('.sp-fn-check[data-fn="output"]');
ok(outBox2.checked === true, '修改回填 output 勾选');
ok(modal.querySelector('.sp-fn-space[data-fn="output"]').value === 'sp4', '修改回填 output=sp4');
// 至少一个 fn 校验：取消勾选后保存应拦截
outBox2.checked = false;
outBox2.dispatchEvent(new w.Event('change', { bubbles: true }));
alerts.length = 0;
T.confirmSpacePlan();
ok(alerts.some(m => m.includes('至少为一个 function')), '空 fn 拦截: ' + JSON.stringify(alerts));
w.eval('closeModal("spaceplan")');

// ===== 8. 快照透传：backToList → 重进 =====
T.backToList();
T.openDetailByCode('maas-online-text-glm4');
ok(T.spacePlans.length === 2, '快照恢复 2 份计划，实得 ' + T.spacePlans.length);
ok(T.spacePlanStatuses[1] === 'stopped', '快照恢复状态 stopped');

// ===== 9. 新建商品：空间切换计划为空 =====
w.eval(`openProductModal && 0`);
// 直接走 confirmProduct 太繁琐，验证 productDataOf 分支即可
T.backToList();
const dataNoSnap = w.eval(`(function(){ delete planRowsSnapshot['maas-product-vtpm-pre']; return JSON.stringify(productDataOf('maas-product-vtpm-pre').spacePlanStatuses); })()`);
ok(dataNoSnap === '[]', 'productDataOf 无快照商品 spacePlanStatuses=[]');
const glm4Snap = w.eval(`JSON.stringify(productDataOf('maas-online-text-glm4').spacePlans.map(r=>r.name))`);
ok(glm4Snap.includes('测试计划A'), 'productDataOf 快照含测试计划A: ' + glm4Snap);

console.log(`\n冒烟结果: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
