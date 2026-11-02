// 第26轮 冒烟：空间计划（独立实体；第31轮口径：空间计划创建售卖空间）全链路
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
  get spaceSeq(){return spaceSeq},
  get timeFilter(){return timeFilter}, set timeFilter(v){timeFilter=v},
  get spaces(){return spaces},
  openDetailByCode, backToList, startEdit, exitEdit,
  renderSpaceTab, renderSpacePlans, openSpacePlanModal, confirmSpacePlan, publishSpacePlan, stopSpacePlan, editSpacePlan, copySpacePlan,
  setSpaceActive, closeModal, guardEdit,
  get planRowsSnapshot(){return planRowsSnapshot}, get alertMsgs(){return []}
};
`);
const T = w.__T;

// ===== 1. glm4 详情装载：双11计划存在且 published（mock 带 fnDims+fnSpaces）=====
T.openDetailByCode('maas-online-text-glm4');
ok(T.spacePlans.length === 1, 'glm4 装载 1 份空间计划，实得 ' + T.spacePlans.length);
ok(T.spacePlanStatuses[0] === 'published', '双11计划状态=published');
ok(T.spacePlans[0].fnSpaces && T.spacePlans[0].fnSpaces.input === 'sp3', '双11计划 input→sp3');
ok(Array.isArray(T.spacePlans[0].fnDims && T.spacePlans[0].fnDims.input) && T.spacePlans[0].fnDims.input.join() === '输入token区间', '双11计划 fnDims.input=[输入token区间]');

// ===== 2. 空间计划列表 DOM =====
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
// 恢复当前
T.timeFilter = null;
T.renderSpaceTab();
spaceTbody = w.document.getElementById('space-tbody');
ok(spaceTbody.textContent.includes('11-11') || spaceTbody.textContent.includes('起生效'), '当前时间显示未来切换预告');

// ===== 6. 创建→发布→停用 全流程（第31轮口径：勾选 fn+维度，保存总是新建空间）=====
// 未持锁时保存被 guardEdit 拦
alerts.length = 0;
T.openSpacePlanModal();
w.document.getElementById('sp-name').value = '测试计划A';
T.confirmSpacePlan();
ok(alerts.some(m => m.includes('编辑锁') || m.includes('编辑')), '未持锁 confirmSpacePlan 被 guardEdit 拦截: ' + JSON.stringify(alerts));

T.startEdit();
const seqBefore = T.spaceSeq; // 5（sp1~sp5）
T.openSpacePlanModal();
let modal = w.document.getElementById('modal-spaceplan');
ok(modal && !modal.classList.contains('hidden'), '弹窗打开');
// 第31轮：fn 复选 + 维度复选组（不再有空间下拉）
ok(!modal.querySelector('.sp-fn-space'), '第31轮：弹窗无空间下拉（改为维度复选）');
const spFnBoxes = modal.querySelectorAll('.sp-fn-check');
ok(spFnBoxes.length >= 3, '弹窗含 3 个 fn 复选（input/output/cache），实得 ' + spFnBoxes.length);
const outputBox = Array.from(spFnBoxes).find(b => b.dataset.fn === 'output');
ok(!!outputBox, '存在 output fn 复选');
outputBox.checked = true;
outputBox.dispatchEvent(new w.Event('change', { bubbles: true }));
// 勾选两个维度
const dimBoxes = Array.from(modal.querySelectorAll('.sp-dim-check[data-fn="output"]'));
ok(dimBoxes.length === 4, 'output 行含 4 个维度复选（第20轮起 function 非维度），实得 ' + dimBoxes.length);
dimBoxes.find(c => c.value === '输入token区间').checked = true;
dimBoxes.find(c => c.value === '输出token区间').checked = true;
w.document.getElementById('sp-name').value = '测试计划A';
w.document.getElementById('sp-eff-start').value = '2026-12-01 00:00:00';
w.document.getElementById('sp-eff-end').value = '2026-12-10 00:00:00';
alerts.length = 0;
T.confirmSpacePlan();
ok(alerts.some(m => m.includes('测试计划A') && m.includes('待发布')), '保存成功提示待发布: ' + JSON.stringify(alerts));
ok(T.spacePlans.length === 2 && T.spacePlanStatuses[1] === 'pending_publish', '新增计划 pending_publish');
// 总是新建空间：sp6（不与已有 sp4 共享）
const newKey = T.spacePlans[1].fnSpaces.output;
ok(newKey === 'sp' + (seqBefore + 1), '保存为 output 新建空间 sp' + (seqBefore + 1) + '，实得 ' + newKey);
ok(T.spaces[newKey] && T.spaces[newKey].dims.join() === '输入token区间,输出token区间', '新空间 dims=[输入token区间,输出token区间]');

// 发布
T.publishSpacePlan(1);
ok(T.spacePlanStatuses[1] === 'published', '发布后 published');
ok(T.effectiveSpaceAt('output', '2026-12-05 00:00:00').key === newKey, '12-05 output 接管=' + newKey + '（新建空间）');
// 停用
T.stopSpacePlan(1);
ok(T.spacePlanStatuses[1] === 'stopped', '停用后 stopped');
ok(T.effectiveSpaceAt('output', '2026-12-05 00:00:00').source === 'manual', '停用后回落 manual');

// ===== 7. 修改回填（维度复选勾选状态）=====
T.editSpacePlan(1);
modal = w.document.getElementById('modal-spaceplan');
ok(w.document.getElementById('sp-name').value === '测试计划A', '修改回填名称');
const outBox2 = modal.querySelector('.sp-fn-check[data-fn="output"]');
ok(outBox2.checked === true, '修改回填 output 勾选');
const dimChecked = Array.from(modal.querySelectorAll('.sp-dim-check[data-fn="output"]:checked')).map(c => c.value);
ok(dimChecked.join() === '输入token区间,输出token区间', '修改回填维度勾选');
// 维度全不选保存应拦截
modal.querySelectorAll('.sp-dim-check[data-fn="output"]').forEach(c => { c.checked = false; });
alerts.length = 0;
T.confirmSpacePlan();
ok(alerts.some(m => m.includes('至少选择一个维度')), '空维度拦截: ' + JSON.stringify(alerts));
// 取消 fn 勾选保存应拦截（至少一个 fn）
outBox2.checked = false;
outBox2.dispatchEvent(new w.Event('change', { bubbles: true }));
alerts.length = 0;
T.confirmSpacePlan();
ok(alerts.some(m => m.includes('至少为一个 function') || m.includes('至少一个')), '空 fn 拦截: ' + JSON.stringify(alerts));
// 修改时维度不变 → 沿用原空间不新建
outBox2.checked = true;
outBox2.dispatchEvent(new w.Event('change', { bubbles: true }));
modal.querySelectorAll('.sp-dim-check[data-fn="output"]').forEach(c => {
  c.checked = (c.value === '输入token区间' || c.value === '输出token区间');
});
const seqBefore2 = T.spaceSeq;
w.document.getElementById('sp-name').value = '测试计划A-改名';
alerts.length = 0;
T.confirmSpacePlan();
ok(T.spaceSeq === seqBefore2, '修改时维度集合未变 → 不新建空间（沿用 ' + newKey + '）');
ok(T.spacePlans[1].name === '测试计划A-改名' && T.spacePlans[1].fnSpaces.output === newKey, '改名后沿用原空间');
w.eval('closeModal("spaceplan")');

// ===== 8. 复制计划：副本不共享原空间（第31轮口径）=====
const seqBefore3 = T.spaceSeq;
T.copySpacePlan(1);
ok(T.spacePlans.length === 3 && T.spacePlanStatuses[2] === 'pending_publish', '复制副本待发布');
const copyKey = T.spacePlans[2].fnSpaces.output;
ok(copyKey !== newKey && copyKey === 'sp' + (seqBefore3 + 1), '副本为 output 新建空间（不共享 ' + newKey + '），实得 ' + copyKey);
ok(T.spaces[copyKey] && T.spaces[copyKey].dims.join() === '输入token区间,输出token区间', '副本新空间维度同原计划');

// ===== 9. 快照透传：backToList → 重进 =====
T.backToList();
T.openDetailByCode('maas-online-text-glm4');
ok(T.spacePlans.length === 3, '快照恢复 3 份计划，实得 ' + T.spacePlans.length);
ok(T.spacePlanStatuses[1] === 'stopped', '快照恢复状态 stopped');

// ===== 10. 新建商品/无快照商品 =====
T.backToList();
const dataNoSnap = w.eval(`(function(){ delete planRowsSnapshot['maas-product-vtpm-pre']; return JSON.stringify(productDataOf('maas-product-vtpm-pre').spacePlanStatuses); })()`);
ok(dataNoSnap === '[]', 'productDataOf 无快照商品 spacePlanStatuses=[]');
const glm4Snap = w.eval(`JSON.stringify(productDataOf('maas-online-text-glm4').spacePlans.map(r=>r.name))`);
ok(glm4Snap.includes('测试计划A-改名'), 'productDataOf 快照含测试计划A-改名: ' + glm4Snap);

console.log(`\n冒烟结果: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
