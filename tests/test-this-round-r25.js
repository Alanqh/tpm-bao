// 第26轮历史验证——第38轮口径重写：空间切换计划实体已删，空间=聚合根（档期/优先级/三态内嵌）
// 聚焦：effectiveSpaceAt 优先级/seq 仲裁、边界含端点、空间 Tab 全展示、发布/停用链路、快照透传
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

// ===== 1. mock 装载（第38轮）：glm4 sp1 常规三fn + sp2 双11空间 =====
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(w.eval('Object.keys(spaces).length') === 2, 'glm4 装载 2 个空间（sp1 常规/sp2 双11）');
ok(w.eval('typeof spacePlans === "undefined" && typeof spacePlanStatuses === "undefined"'), 'spacePlans/spacePlanStatuses 实体已删（第38轮）');
ok(w.eval('planRows.length') === 2 && w.eval('planRowStatuses[0]') === 'published', 'glm4 售卖计划 mock 保留（双11+常规，均锁空间）');
ok(w.eval('planRows.every(p => p.spaceKey && !p.fnSpaces)'), '售卖计划均带 spaceKey 且无 fnSpaces 字段');

// ===== 2. effectiveSpaceAt 推导（第38轮：纯空间本体仲裁） =====
ok(w.eval('effectiveSpaceAt("input").key') === 'sp1' && w.eval('effectiveSpaceAt("input").source') === 'plan', '当前(11-04) input=sp1（sp2 未到档期）');
ok(w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp2' && w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").source') === 'plan', '11-15 input=sp2（双11空间高优先级接管）');
ok(w.eval('effectiveSpaceAt("input","2026-11-25 00:00:00").key') === 'sp1', '11-25 双11空间过档期 → sp1 恢复');
ok(w.eval('effectiveSpaceAt("output").key') === 'sp1', 'output 由 sp1 承载（sp2 无 output）');
ok(w.eval('effectiveSpaceAt("input","2026-11-11 00:00:00").key') === 'sp2', '边界 11-11 00:00 起接管（含起点）');
ok(w.eval('effectiveSpaceAt("input","2026-11-20 00:00:00").key') === 'sp2', '边界 11-20 00:00 仍接管（含终点）');
ok(w.eval('effectiveSpaceAt("input","2026-10-15 00:00:00").key') === '' && w.eval('effectiveSpaceAt("input","2026-10-15 00:00:00").source') === '', '10-15 早于 sp1 档期 → key=""（无任何回落）');

// ===== 3. 优先级/seq 仲裁：造空间验证 =====
w.eval('spaces["sp3"] = { seq: 3, name: "低优先级·保持sp1配置", priority: 100, effStart: "2026-11-12 00:00:00", effEnd: "2026-11-18 00:00:00", status: "published", fnDims: { input: ["输入token区间"] }, fnMeasures: {} }; spaceSeq = Math.max(spaceSeq, 3)');
ok(w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp2', '同时段多空间 → 高优先级（500>100）双11 sp2 胜: ' + w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key'));
// seq 仲裁：同优先级后建胜
w.eval('spaces["sp4"] = { seq: 4, name: "同优先级·晚建", priority: 500, effStart: "2026-11-14 00:00:00", effEnd: "2026-11-16 00:00:00", status: "published", fnDims: { input: ["输入token区间"] }, fnMeasures: {} }; spaceSeq = 4');
ok(w.eval('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp4', '同优先级 500 → 后建 sp4 胜（seq 大优先）');
ok(w.eval('effectiveSpaceAt("input","2026-11-17 00:00:00").key') === 'sp2', '11-17 sp4 过档期 → sp2 继续');
w.eval('delete spaces["sp3"]; delete spaces["sp4"]; spaceSeq = 2');

// ===== 4. 切换预告 nextSpaceSwitchOfFn =====
const nx = w.eval('nextSpaceSwitchOfFn("input")');
ok(nx === 'sp2', '预告下一个切换=sp2（双11空间）');
ok(w.eval('nextSpaceSwitchOfFn("output")') === null, 'output 无未来切换 → null');
ok(w.eval('nextSpaceSwitchOfFn("input","2026-11-25 00:00:00")') === null, '11-25 后 input 无切换');

// ===== 5. 空间 Tab（第38轮：全空间展示不按时刻过滤；档期徽标按查询时刻） =====
w.eval('renderSpaceTab()');
let rows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(rows.length === 4, '4 行（sp1×3fn + sp2×1）');
ok(rows.every(r => !r.textContent.includes('起切换')), '无切换预告文案（第35轮删）');
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
rows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(rows.length === 4, '11-15 时仍 4 行（全空间展示）');
const sp2r = rows.find(r => r.cells[2] && r.cells[2].textContent.trim() === 'sp2');
ok(sp2r && sp2r.textContent.includes('生效期内'), '11-15 sp2 行=生效期内（接管中）');
w.eval('timeFilter = null; renderSpaceTab()');

// ===== 6. 空间计划列表 DOM 已删（第38轮：无独立 Tab） =====
ok(!d.getElementById('inner-tab-spaceplan'), '空间计划 Tab 容器已删');
ok(!d.getElementById('spaceplan-tbody') || d.getElementById('space-tbody'), '旧 spaceplan-tbody 不再用于空间计划（售卖空间 Tab 用 space-tbody）');
ok(w.eval('typeof renderSpacePlans') === 'undefined', 'renderSpacePlans 函数已删');

// ===== 7. 编辑锁保护 =====
alerts.length = 0;
w.eval('openSpacePlanModal()');
d.getElementById('sp-name').value = '未持锁空间';
d.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-10T00:00:00';
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
// 至少一个 fn 校验
d.getElementById('sp-name').value = 'r38测试空间';
d.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-10T00:00:00';
alerts.length = 0;
w.eval('confirmSpacePlan()');
ok(alerts.some(m => m.includes('至少勾选一个 function')), '未勾任何 fn 拦截');
// 勾 input + 维度 + 度量，时段 12-01~12-10
const inBox = modal.querySelector('.sp-fn-check[data-fn="input"]');
inBox.checked = true;
inBox.dispatchEvent(new w.Event('change', { bubbles: true }));
const inDimWrap = modal.querySelector('[data-fndims="input"]');
ok(inDimWrap && !inDimWrap.classList.contains('opacity-50'), '勾选后维度区启用');
const dimBox = modal.querySelector('.sp-dim-check[data-fn="input"][value="输入token区间"]');
dimBox.checked = true;
dimBox.dispatchEvent(new w.Event('change', { bubbles: true }));
modal.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入token区间"][value="0～128K"]').checked = true;
d.getElementById('sp-priority').value = '300';
 alerts.length = 0;
w.eval('confirmSpacePlan()');
ok(alerts.some(m => m.includes('r38测试空间') && m.includes('待发布')), '保存成功提示（待发布）: ' + JSON.stringify(alerts.slice(-1)));
ok(w.eval('spaces["sp3"] && spaces["sp3"].status') === 'pending_publish', '新空间 sp3=pending_publish');
ok(w.eval('effectiveSpaceAt("input","2026-12-05 00:00:00").key') === 'sp1', '待发布不接管（sp1 继续）');
// 发布 → 接管（priority 300 > sp1 100）
w.eval('publishSpacePlan("sp3")');
ok(w.eval('spaces["sp3"].status') === 'published', '发布后=published');
ok(w.eval('effectiveSpaceAt("input","2026-12-05 00:00:00").key') === 'sp3' && w.eval('effectiveSpaceAt("input","2026-12-05 00:00:00").source') === 'plan', '发布后 12-05 input 接管=sp3');
// 停用 → 回落 sp1
w.eval('stopSpacePlan("sp3")');
ok(w.eval('spaces["sp3"].status') === 'stopped', '停用后=stopped');
ok(w.eval('effectiveSpaceAt("input","2026-12-05 00:00:00").key') === 'sp1', '停用后 12-05 input 回落 sp1');

// ===== 9. 空间详情页（第38轮：无修改按钮；复制不受锁） =====
w.eval('openSpacePlanDetail("sp3")');
ok(!d.getElementById('spaceplan-detail-view').classList.contains('hidden'), '空间详情页打开');
ok(d.getElementById('spaceplan-detail-title').textContent.includes('r38测试空间'), '详情标题含空间名');
ok(!d.getElementById('spaceplan-detail-actions').textContent.includes('修改'), '操作区无「修改」（空间不可改）');
ok(d.getElementById('spaceplan-detail-actions').textContent.includes('复制'), '操作区含「复制」');
w.eval('closeSpacePlanDetail()');

// ===== 10. 快照透传 =====
w.eval('exitEdit(); backToList(); openDetailByCode("maas-online-text-glm4")');
ok(w.eval('Object.keys(spaces).length') === 3 && w.eval('spaces["sp3"].name') === 'r38测试空间', '快照恢复空间（sp1/sp2/sp3）');
ok(w.eval('spaces["sp3"].status') === 'stopped', '快照恢复状态=stopped');
ok(w.eval('Object.keys(planRowsSnapshot["maas-online-text-glm4"].spaces).length') === 3, 'snapshotCurrentProduct 透传 spaces');

// ===== 11. SU 弹窗已删（第37轮） =====
ok(!d.getElementById('modal-su-confirm'), 'SU 弹窗已删除');
ok(w.eval('typeof openSuConfirmModal') === 'undefined', 'openSuConfirmModal 函数已删');
w.eval('timeFilter = null; renderSpaceTab()');

// ===== 12. productDataOf 兼容（第38轮：spaces 字段） =====
w.eval('backToList()');
ok(w.eval('productDataOf("maas-product-vtpm-std").spaces !== undefined'), 'productDataOf 含 spaces 字段');
ok(w.eval('Object.keys(productDataOf("maas-product-vtpm-std").spaces).length') === 1, 'vtpm std 含常驻空间 1 个');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
