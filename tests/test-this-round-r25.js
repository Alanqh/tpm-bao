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

// ===== 1. mock 装载：glm4 双11空间切换计划（published，11-11~11-20，input→sp3，priority 500）=====
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(w.eval('spacePlans.length') === 1, 'glm4 装载 1 份空间切换计划');
ok(w.eval('spacePlanStatuses[0]') === 'published', '双11计划状态=published');
ok(JSON.stringify(w.eval('planRows[0].fnSpaces || null')) === 'null', '售卖计划已无 fnSpaces 字段（第26轮清除）');
ok(w.eval('planRows.length') === 2 && w.eval('planRowStatuses[0]') === 'published', 'glm4 售卖计划 mock 保留（双11+常规）');

// ===== 2. effectiveSpaceAt 推导 =====
ok(w.eval('effectiveSpaceAt("input").key') === 'sp2' && w.eval('effectiveSpaceAt("input").source') === 'manual', '当前(11-01后) input=sp2（manual，双11未到期）');
ok(w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp3' && w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").source') === 'plan', '11-15 input=sp3（plan 接管）');
ok(w.eval('effectiveSpaceAt("input","2026-11-25 00:00:00").key') === 'sp2' && w.eval('effectiveSpaceAt("input","2026-11-25 00:00:00").source') === 'manual', '11-25 双11过期 → 回落 manual sp2');
ok(w.eval('effectiveSpaceAt("output").key') === 'sp4' && w.eval('effectiveSpaceAt("output").source') === 'manual', 'output 无计划指定 → 一直 manual sp4');
ok(w.eval('effectiveSpaceAt("input","2026-11-11 00:00:00").source') === 'plan', '边界 11-11 00:00 起接管（含起点）');
ok(w.eval('effectiveSpaceAt("input","2026-11-20 00:00:00").source') === 'plan', '边界 11-20 00:00 仍接管（含终点）');

// ===== 3. 优先级仲裁：补一份同时段低优先级空间切换计划指定 input=sp2 → 高优先级（500）双11胜 =====
w.eval('spacePlans.push({name:"低优先级·保持sp2", priority:100, effStart:"2026-11-12 00:00:00", effEnd:"2026-11-18 00:00:00", fnSpaces:{input:"sp2"}}); spacePlanStatuses.push("published")');
ok(w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp3', '同时段双计划 → 高优先级（500>100）双11胜: ' + w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key'));
// 一条计划可多个 fn：同一优先级计划跨 fn
w.eval('spacePlans.push({name:"双fn·cache+output", priority:400, effStart:"2026-11-13 00:00:00", effEnd:"2026-11-16 00:00:00", fnSpaces:{cache:"sp5", output:"sp2"}}); spacePlanStatuses.push("published")');
ok(w.eval('effectiveSpaceAt("cache","2026-11-14 00:00:00").plan.name') === '双fn·cache+output', '一条计划接管 cache');
ok(w.eval('effectiveSpaceAt("output","2026-11-14 00:00:00").plan.name') === '双fn·cache+output', '同一条计划接管 output（一计划多 fn）');
// 清理试验数据
w.eval('spacePlans.pop(); spacePlanStatuses.pop(); spacePlans.pop(); spacePlanStatuses.pop()');

// ===== 4. 切换预告 nextSpaceSwitchOfFn =====
const nx = w.eval('nextSpaceSwitchOfFn("input")');
ok(nx && nx.name === '双11大促·输入切换售卖空间3', '预告下一个切换=双11计划');
ok(w.eval('nextSpaceSwitchOfFn("output")') === null, 'output 无未来切换 → null');
ok(w.eval('nextSpaceSwitchOfFn("input","2026-11-25 00:00:00")') === null, '11-25 后 input 无切换');

// ===== 5. 空间 Tab 标注 =====
w.eval('renderSpaceTab()');
let rows = Array.from(d.querySelectorAll('#space-tbody tr'));
let sp3r = rows.find(r => r.textContent.includes('sp3'));
ok(sp3r && sp3r.textContent.includes('11-11') && sp3r.textContent.includes('双11大促'), 'sp3 未生效行显示未来切换预告（含日期+计划名）');
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
rows = Array.from(d.querySelectorAll('#space-tbody tr'));
sp3r = rows.find(r => r.textContent.includes('sp3'));
const sp2r = rows.find(r => r.textContent.includes('sp2'));
ok(sp3r.textContent.includes('生效中') && sp3r.textContent.includes('计划「双11大促'), '11-15 时 sp3 生效中+计划接管标注');
ok(sp2r.textContent.includes('未生效') && sp2r.textContent.includes('计划接管中'), '11-15 时 sp2 input 行未生效+操作列=计划接管中（禁手动）');
ok(sp2r.textContent.includes('设为生效') === false, '接管期操作列不含「设为生效」');
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
// 勾 input → 选 sp3，时段 12-01~12-10（不动 output——其空间池仅 sp4）
const inBox = modal.querySelector('.sp-fn-check[data-fn="input"]');
inBox.checked = true;
inBox.dispatchEvent(new w.Event('change', { bubbles: true }));
const inSel = modal.querySelector('.sp-fn-space[data-fn="input"]');
ok(inSel && !inSel.disabled, '勾选后下拉启用');
inSel.value = 'sp3';
d.getElementById('sp-priority').value = '300';
d.getElementById('sp-eff-start').value = '2026-12-01 00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-10 00:00:00';
alerts.length = 0;
w.eval('confirmSpacePlan()');
ok(alerts.some(m => m.includes('r26测试计划') && m.includes('待发布')), '保存成功提示（待发布）: ' + JSON.stringify(alerts.slice(-1)));
const r26Idx = w.eval('spacePlans.length - 1');
ok(w.eval('spacePlanStatuses[' + r26Idx + ']') === 'pending_publish', '新计划=pending_publish');
ok(JSON.stringify(w.eval('spacePlans[' + r26Idx + '].fnSpaces')) === JSON.stringify({ input: 'sp3' }), '落库 fnSpaces={input:sp3}');
ok(w.eval('effectiveSpaceAt("input","2026-12-05 00:00:00").source') === 'manual', '待发布不接管');
// 发布 → 接管
w.eval('publishSpacePlan(' + r26Idx + ')');
ok(w.eval('spacePlanStatuses[' + r26Idx + ']') === 'published', '发布后=published');
ok(w.eval('effectiveSpaceAt("input","2026-12-05 00:00:00").key') === 'sp3' && w.eval('effectiveSpaceAt("input","2026-12-05 00:00:00").source') === 'plan', '发布后 12-05 input 接管=sp3');
// 停用 → 回落
w.eval('stopSpacePlan(' + r26Idx + ')');
ok(w.eval('spacePlanStatuses[' + r26Idx + ']') === 'stopped', '停用后=stopped');
ok(w.eval('effectiveSpaceAt("input","2026-12-05 00:00:00").source') === 'manual', '停用后 12-05 input 回落 manual（sp2）');

// ===== 9. 修改回填 =====
w.eval('editSpacePlan(' + r26Idx + ')');
modal = d.getElementById('modal-spaceplan');
ok(d.getElementById('sp-name').value === 'r26测试计划', '回填名称');
ok(modal.querySelector('.sp-fn-check[data-fn="input"]').checked === true, '回填 input 勾选');
ok(modal.querySelector('.sp-fn-space[data-fn="input"]').value === 'sp3', '回填 input=sp3');
ok(d.getElementById('sp-eff-start').value.indexOf('2026-12-01') === 0, '回填时段');
w.eval('closeModal("spaceplan")');

// ===== 10. 停用态操作列=— ；快照透传 =====
w.eval('renderSpacePlans()');
const lastRow = spTbody.querySelectorAll('tr')[spTbody.querySelectorAll('tr').length - 1];
ok(lastRow && lastRow.textContent.includes('已停用'), '列表状态=已停用');
w.eval('backToList(); openDetailByCode("maas-online-text-glm4")');
ok(w.eval('spacePlans.length') === 2 && w.eval('spacePlans[1].name') === 'r26测试计划', '快照恢复空间切换计划');
ok(w.eval('spacePlanStatuses[1]') === 'stopped', '快照恢复状态=stopped');

// ===== 11. SU 弹窗默认空间挂 effectiveSpaceAt（11-15 input→sp3）=====
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
w.eval('openSuConfirmModal()');
d.getElementById('su-fn-select').value = 'input';
w.eval('onSuFnChange()');
ok(d.getElementById('su-space-select').value === 'sp3', 'SU 弹窗默认空间=effectiveSpaceAt（11-15 → sp3）');
w.eval('closeModal("su-confirm"); timeFilter = null');

// ===== 12. 新建商品：spacePlans 归零 =====
w.eval('backToList()');
ok(w.eval('planRowsSnapshot["maas-online-text-glm4"].spacePlans.length') === 2, 'snapshotCurrentProduct 透传 spacePlans');
ok(JSON.stringify(w.eval('productDataOf("maas-product-vtpm-std").spacePlans')) === '[]' || w.eval('productDataOf("maas-product-vtpm-std").spacePlans.length') === 0, 'productDataOf vtpm 无空间切换计划');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
