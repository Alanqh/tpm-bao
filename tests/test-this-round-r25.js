// 第26轮：空间切换计划（独立轻量实体）——spacePlans + effectiveSpaceAt + 空间Tab标注/接管 + 弹窗创建/发布/停用 + 快照
// 第25轮「售卖计划级 fnSpaces」已被本轮推翻：planRows 不再携带 fnSpaces，空间生效性由独立实体 spacePlans 控制
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

// ===== 1. mock 装载（第32轮）：glm4 常规计划（idx0，input/output/cache 三 fn）+ 双11切换计划（idx1，input→sp3 priority 500）=====
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(w.eval('spacePlans.length') === 2, 'glm4 装载 2 份空间计划（常规+双11）');
ok(w.eval('spacePlanStatuses[0]') === 'published' && w.eval('spacePlanStatuses[1]') === 'published', '两份计划均 published');
ok(JSON.stringify(w.eval('planRows[0].fnSpaces || null')) === 'null', '售卖计划已无 fnSpaces 字段（第26轮清除）');
ok(w.eval('planRows.length') === 2 && w.eval('planRowStatuses[0]') === 'published', 'glm4 售卖计划 mock 保留（双11+常规）');

// ===== 2. effectiveSpaceAt 推导（第32轮：纯计划仲裁，无 manual 回落） =====
ok(w.eval('effectiveSpaceAt("input").key') === 'sp2' && w.eval('effectiveSpaceAt("input").source') === 'plan', '当前(11-01后) input=sp2（常规计划，plan）');
ok(w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp3' && w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").source') === 'plan', '11-15 input=sp3（双11高优先级接管）');
ok(w.eval('effectiveSpaceAt("input","2026-11-25 00:00:00").key') === 'sp2' && w.eval('effectiveSpaceAt("input","2026-11-25 00:00:00").source') === 'plan', '11-25 双11到期 → 常规计划 sp2 恢复');
ok(w.eval('effectiveSpaceAt("output").key') === 'sp4' && w.eval('effectiveSpaceAt("output").source') === 'plan', 'output 由常规计划承载 → 一直 plan sp4');
ok(w.eval('effectiveSpaceAt("input","2026-11-11 00:00:00").source') === 'plan', '边界 11-11 00:00 起接管（含起点）');
ok(w.eval('effectiveSpaceAt("input","2026-11-20 00:00:00").source') === 'plan', '边界 11-20 00:00 仍接管（含终点）');
ok(w.eval('effectiveSpaceAt("input","2026-10-15 00:00:00").key') === '' && w.eval('effectiveSpaceAt("input","2026-10-15 00:00:00").source') === '', '10-15 早于常规计划生效 → key=\"\"（无 manual 回落，第32轮）');

// ===== 3. 优先级仲裁：再补一份同时段低优先级空间切换计划指定 input=sp2 → 高优先级（500）双11胜 =====
w.eval('spacePlans.push({name:"低优先级·保持sp2", priority:100, effStart:"2026-11-12 00:00:00", effEnd:"2026-11-18 00:00:00", fnSpaces:{input:"sp2"}}); spacePlanStatuses.push("published")');
ok(w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp3', '同时段多计划 → 高优先级（500>100）双11胜: ' + w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key'));
// 一条计划可多个 fn：同一优先级计划跨 fn（时段延至 11-25 验证 input 侧 400>常规100 胜出）
w.eval('spacePlans.push({name:"双fn·cache+input", priority:400, effStart:"2026-11-13 00:00:00", effEnd:"2026-11-25 12:00:00", fnSpaces:{cache:"sp5", input:"sp2"}}); spacePlanStatuses.push("published")');
ok(w.eval('effectiveSpaceAt("cache","2026-11-14 00:00:00").plan.name') === '双fn·cache+input', '一条计划接管 cache');
ok(w.eval('effectiveSpaceAt("input","2026-11-14 00:00:00").plan.name') === '双11大促·输入切换售卖空间3', '11-14 input 胜出=双11（500>400>100 多级仲裁）');
ok(w.eval('effectiveSpaceAt("input","2026-11-21 00:00:00").plan.name') === '双fn·cache+input', '11-21 双11过期后 input 由双fn计划接管（400>常规100）');
// 清理试验数据
w.eval('spacePlans.pop(); spacePlanStatuses.pop(); spacePlans.pop(); spacePlanStatuses.pop()');

// ===== 4. 切换预告 nextSpaceSwitchOfFn =====
const nx = w.eval('nextSpaceSwitchOfFn("input")');
ok(nx && nx.name === '双11大促·输入切换售卖空间3', '预告下一个切换=双11计划');
ok(w.eval('nextSpaceSwitchOfFn("output")') === null, 'output 无未来切换 → null');
ok(w.eval('nextSpaceSwitchOfFn("input","2026-11-25 00:00:00")') === null, '11-25 后 input 无切换');

// ===== 5. 空间 Tab（第32轮：按时刻过滤——仅显示该时刻生效空间行）=====
w.eval('renderSpaceTab()');
let rows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(rows.length === 3, '当前时刻 3 行（cache=sp5/input=sp2/output=sp4 各一行）');
const inputRowNow = rows.find(r => (r.querySelector('div.font-mono') || {}).textContent === 'sp2');
ok(inputRowNow && inputRowNow.textContent.includes('2026-11-11 起切换'), 'input 行（sp2）显示未来切换预告（sp3 将接管）');
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
rows = Array.from(d.querySelectorAll('#space-tbody tr'));
const sp3r = rows.find(r => (r.querySelector('div.font-mono') || {}).textContent === 'sp3');
ok(rows.length === 3 && !!sp3r, '11-15 时 3 行且 input 行=sp3');
ok(sp3r.textContent.includes('生效中') && sp3r.textContent.includes('计划「双11大促'), 'sp3 行生效中+胜出计划标注');
ok(rows.some(r => (r.querySelector('div.font-mono') || {}).textContent === 'sp2') === false, '11-15 时 sp2 不在列表（按时刻过滤）');
ok(rows.some(r => (r.querySelector('div.font-mono') || {}).textContent === 'sp4'), '11-15 时 output=sp4 仍在列表');
w.eval('timeFilter = null');

// ===== 6. 空间切换计划列表 DOM =====
w.eval('renderSpacePlans()');
const spTbody = d.getElementById('spaceplan-tbody');
ok(spTbody && spTbody.querySelectorAll('tr').length >= 1, 'spaceplan-tbody 有数据行');
ok(spTbody.textContent.includes('双11大促·输入切换售卖空间3'), '列表含双11计划名');
ok(spTbody.textContent.includes('已发布'), '列表状态徽标=已发布');
ok(spTbody.textContent.includes('input') && spTbody.textContent.includes('售卖空间3'), '列表展示 input→售卖空间3');

// ===== 7. 编辑锁保护 =====
alerts.length = 0;
w.eval('openSpacePlanModal()');
d.getElementById('sp-name').value = '未持锁计划';
w.eval('confirmSpacePlan()');
ok(alerts.some(m => m.includes('编辑') || m.includes('锁')), '未持锁保存被 guardEdit 拦截');
w.eval('closeModal("spaceplan")');

// ===== 8. 创建→保存（待发布不接管）→发布（接管）→停用（回落）=====
w.eval('startEdit()');
w.eval('openSpacePlanModal()');
alerts.length = 0;
w.eval('confirmSpacePlan()');
ok(alerts.some(m => m.includes('请填写')), '空名称拦截');
let modal = d.getElementById('modal-spaceplan');
const boxes = modal.querySelectorAll('.sp-fn-check');
ok(boxes.length >= 3, '弹窗按商品 function 渲染复选行，实得 ' + boxes.length);
// 至少一个 fn 校验：名称填了但不勾 fn
d.getElementById('sp-name').value = 'r26测试计划';
alerts.length = 0;
w.eval('confirmSpacePlan()');
ok(alerts.some(m => m.includes('至少为一个 function')), '未勾任何 fn 拦截');
// 勾 input + 维度=输入token区间（第31轮：维度勾选，保存时新建空间），时段 12-01~12-10
const inBox = modal.querySelector('.sp-fn-check[data-fn="input"]');
inBox.checked = true;
inBox.dispatchEvent(new w.Event('change', { bubbles: true }));
const inDimWrap = modal.querySelector('[data-fndims="input"]');
ok(inDimWrap && !inDimWrap.classList.contains('opacity-50'), '勾选后维度区启用');
modal.querySelector('.sp-dim-check[data-fn="input"][value="输入token区间"]').checked = true;
d.getElementById('sp-priority').value = '300';
d.getElementById('sp-eff-start').value = '2026-12-01 00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-10 00:00:00';
alerts.length = 0;
w.eval('confirmSpacePlan()');
ok(alerts.some(m => m.includes('r26测试计划') && m.includes('待发布')), '保存成功提示（待发布）: ' + JSON.stringify(alerts.slice(-1)));
const r26Idx = w.eval('spacePlans.length - 1');
ok(w.eval('spacePlanStatuses[' + r26Idx + ']') === 'pending_publish', '新计划=pending_publish');
const r26Key = w.eval('spacePlans[' + r26Idx + '].fnSpaces.input');
ok(r26Key === 'sp6', '落库 fnSpaces.input=sp6（第31轮：保存即新建空间，不引用已有 sp3）');
ok(w.eval('effectiveSpaceAt("input","2026-12-05 00:00:00").key') === 'sp2', '待发布不接管（常规计划继续 sp2）');
// 发布 → 接管（priority 300 > 常规 100）
w.eval('publishSpacePlan(' + r26Idx + ')');
ok(w.eval('spacePlanStatuses[' + r26Idx + ']') === 'published', '发布后=published');
ok(w.eval('effectiveSpaceAt("input","2026-12-05 00:00:00").key') === r26Key && w.eval('effectiveSpaceAt("input","2026-12-05 00:00:00").source') === 'plan', '发布后 12-05 input 接管=' + r26Key);
// 停用 → 回落常规计划
w.eval('stopSpacePlan(' + r26Idx + ')');
ok(w.eval('spacePlanStatuses[' + r26Idx + ']') === 'stopped', '停用后=stopped');
ok(w.eval('effectiveSpaceAt("input","2026-12-05 00:00:00").key') === 'sp2', '停用后 12-05 input 回落常规计划 sp2（第32轮：无 manual）');

// ===== 9. 修改回填（维度复选勾选状态）=====
w.eval('editSpacePlan(' + r26Idx + ')');
modal = d.getElementById('modal-spaceplan');
ok(d.getElementById('sp-name').value === 'r26测试计划', '回填名称');
ok(modal.querySelector('.sp-fn-check[data-fn="input"]').checked === true, '回填 input 勾选');
const r26Dims = Array.from(modal.querySelectorAll('.sp-dim-check[data-fn="input"]:checked')).map(c => c.value);
ok(r26Dims.join() === '输入token区间', '回填维度勾选=[输入token区间]');
ok(d.getElementById('sp-eff-start').value.indexOf('2026-12-01') === 0, '回填时段');
w.eval('closeModal("spaceplan")');

// ===== 10. 停用态操作（平铺行内仍可见状态徽标）；快照透传 =====
w.eval('renderSpacePlans()');
const stoppedRow = Array.from(spTbody.querySelectorAll('tr')).find(r => r.textContent.includes('pu-sp-3-1'));
ok(stoppedRow && stoppedRow.textContent.includes('已停用'), 'pu-sp-3-1 行状态=已停用（r26测试计划 planIdx=2，第32轮 mock 常规计划占 idx0）');
w.eval('backToList(); openDetailByCode("maas-online-text-glm4")');
ok(w.eval('spacePlans.length') === 3 && w.eval('spacePlans[2].name') === 'r26测试计划', '快照恢复空间切换计划（常规+双11+r26）');
ok(w.eval('spacePlanStatuses[2]') === 'stopped', '快照恢复状态=stopped');

// ===== 11. SU 弹窗默认空间挂 effectiveSpaceAt（11-15 input→sp3）=====
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
w.eval('openSuConfirmModal()');
d.getElementById('su-fn-select').value = 'input';
w.eval('onSuFnChange()');
ok(d.getElementById('su-space-select').value === 'sp3', 'SU 弹窗默认空间=effectiveSpaceAt（11-15 → sp3）');
w.eval('closeModal("su-confirm"); timeFilter = null');

// ===== 12. 快照透传（第32轮：glm4 mock 含常规+双11，r26 计划停用后仍在快照） =====
w.eval('backToList()');
ok(w.eval('planRowsSnapshot["maas-online-text-glm4"].spacePlans.length') === 3, 'snapshotCurrentProduct 透传 spacePlans（常规+双11+r26）');
ok(w.eval('productDataOf("maas-product-vtpm-std").spacePlans.length') === 1, 'productDataOf vtpm 含常驻计划 1 份（第32轮 mock）');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
