// jsdom 行为测试：数据重构后各商品详情独立性 + 售卖单元两态状态（第8轮语义）+ 计费项下拉过滤
// 第8轮状态定义：在售 = 该时刻【生效中】的最高优先级计划单元类型为【上架】；禁售 = 无生效中计划或最高优先级为【下架】（禁售查不出额外信息）
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'prototype', 'admin-products.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;
const evalInPage = (expr) => window.eval(expr);

let pass = 0, fail = 0;
const ok = (c, msg) => { c ? (pass++, console.log('  ✓ ' + msg)) : (fail++, console.log('  ✗ ' + msg)); };
const section = (t) => console.log('\n== ' + t + ' ==');
// 第20轮：售卖单元详情行前三列=function（合并）/售卖空间（合并）/售卖单元，su-1 为首行完整呈现
const rowOf = (id) => Array.from(document.querySelectorAll('#saleunit-tbody tr')).find(r => Array.from(r.cells).some(c => c.textContent.trim() === id));
const statusOf = (id) => { const r = rowOf(id); return r ? Array.from(r.cells).find(c => ['在售','禁售'].includes(c.textContent.trim())).textContent.trim() : '(无行)'; };

// ================= std：3 个生效中计划 → 全部在售 =================
section('std 商品（3 计划全部生效中）');
window.openDetailFromListed('maas-product-vtpm-std');
ok(evalInPage('planRows.length') === 3, 'std 挂载 3 个售卖计划');
ok(evalInPage('planRows.every(r => Object.values(r.chargeCodes).every(c => c.startsWith("maas-product-vtpm-std.")))'), 'std 的计费项前缀全部为 std');
ok(statusOf('su-1') === '在售' && statusOf('su-2') === '在售' && statusOf('su-3') === '在售', 'std su-1/2/3 全部在售');
ok(rowOf('su-1').textContent.includes('maas-product-vtpm-std.30d'), 'su-1 关联计费项 std.30d');
ok(rowOf('su-1').textContent.includes('0.0084'), 'su-1 刊例价 0.0084');

// ================= pro：1 生效中 + 1 待发布 + 2 未配置（两态下后三者全为禁售） =================
section('pro 商品（生效中/待发布/未配置 → 两态）');
window.backToList();
window.openDetailFromListed('maas-product-vtpm-pro');
ok(evalInPage('planRows.length') === 2, 'pro 挂载 2 个售卖计划');
ok(statusOf('su-1') === '在售', 'pro su-1 在售（生效中计划且上架）');
ok(statusOf('su-2') === '禁售', 'pro su-2 禁售（仅待发布计划，无生效中计划）: ' + statusOf('su-2'));
ok(statusOf('su-3') === '禁售' && statusOf('su-4') === '禁售', 'pro su-3/su-4 禁售（未配置，无任何计划）');
// 禁售行查不出额外信息：关联计费项/刊例价显示 —
const su2Row = rowOf('su-2');
ok(su2Row.textContent.includes('—') && !su2Row.textContent.includes('maas-product-vtpm-pro.90d'), '禁售 su-2 不展示关联计费项（—）');
ok(!su2Row.textContent.includes('0.0058'), '禁售 su-2 不展示刊例价');
// payload 归属
ok(evalInPage('planRows.every(r => r.payloadId.startsWith("payload-glm-"))'), 'pro 计划 payload 全部属于 glm playground');

// 发布 pro 的第二个计划（详情页发布）→ su-2 变在售
// 第10轮编辑锁：pro 默认由张三持锁——测试模拟张三退出后由当前用户发起变更
window.eval('editLocks["maas-product-vtpm-pro"] = null;');
window.startEdit();
window.openPlanDetail(1);
const actBtns = document.getElementById('plan-detail-actions').textContent;
ok(actBtns.includes('发布'), 'pro 第2个计划（待发布）详情有发布按钮');
window.publishPlanRow(1);
ok(statusOf('su-2') === '在售', '发布后 su-2 变在售');

// ================= pre：待上架商品，仅待发布计划 =================
section('pre 商品（待上架，仅待发布）');
window.closePlanDetail();
window.backToList();
window.openPendingDetail(0);
ok(evalInPage('planRows.length') === 1, 'pre 挂载 1 个售卖计划');
ok(statusOf('su-1') === '禁售', 'pre su-1 禁售（仅待发布计划，无生效中）');
ok(statusOf('su-2') === '禁售', 'pre su-2 禁售（未配置）');

// ================= 计费项下拉按商品过滤 =================
section('计费项下拉过滤');
// 第10轮：需持锁才能打开创建页（pre 上一段已 startEdit？pre 打开时锁已释放，重新发起）
window.eval('editLocks["maas-product-vtpm-pre"] = null;');
window.startEdit();
window.switchInnerTab('plan');
window.openPlanCreatePage();
const optCodes = Array.from(document.querySelectorAll('#plan-charge-unified select.plan-charge-select option')).map(o => o.value).filter(v => v);
ok(optCodes.every(c => c.startsWith('maas-product-vtpm-pre.')), 'pre 页面计费项下拉只含 pre 前缀（共 ' + optCodes.length + ' 项）: ' + optCodes.join(', '));
ok(optCodes.includes('maas-product-vtpm-pre.30d'), 'pre.30d 在候选中');
// std 打开时只含 std（第10轮：需先发起变更拿锁）
window.closePlanCreatePage();
window.backToList();
window.openDetailFromListed('maas-product-vtpm-std');
window.startEdit();
window.switchInnerTab('plan');
window.openPlanCreatePage();
const optCodes2 = Array.from(document.querySelectorAll('#plan-charge-unified select.plan-charge-select option')).map(o => o.value).filter(v => v);
ok(optCodes2.every(c => c.startsWith('maas-product-vtpm-std.')), 'std 页面计费项下拉只含 std 前缀（共 ' + optCodes2.length + ' 项）');
window.closePlanCreatePage();

// ================= 停用回归（两态：停用后无生效中计划 → 禁售） =================
section('停用回归（两态）');
window.openPlanDetail(0);
window.stopPlanRow(0);
const allStopped = evalInPage('planRowStatuses.join(",")');
// std 三个计划：0 被停用，1/2 仍生效中 → su-1 无生效中计划 → 禁售
ok(statusOf('su-1') === '禁售', '停用后 su-1 禁售（仅有停用计划，无生效中）: ' + statusOf('su-1') + ' | ' + allStopped);
ok(statusOf('su-2') === '在售' && statusOf('su-3') === '在售', 'su-2/su-3 仍在售（其他计划仍生效中）');

// ================= 两态判定：最高优先级下架 → 禁售（时间点查询） =================
section('两态判定（最高优先级下架）');
// 修改：把 su-2 的生效中计划单元改为下架 → su-2 禁售，其余不受影响
window.eval(`
  (function(){
    planRows[1].unitStates['su-2'] = 'off';
    renderSaleUnits();
  })()
`);
ok(statusOf('su-2') === '禁售', '生效中最高优先级计划单元下架 → su-2 禁售: ' + statusOf('su-2'));
ok(statusOf('su-1') === '禁售' && statusOf('su-3') === '在售', 'su-1 仍禁售（前面停用）、su-3 仍在售');
// 恢复上架 → su-2 回到在售
window.eval(`
  (function(){
    planRows[1].unitStates['su-2'] = 'on';
    renderSaleUnits();
  })()
`);
ok(statusOf('su-2') === '在售', '恢复上架后 su-2 重新在售');

// 时间点查询：mock 生效期 2026-10-01 起 → 查 2026-09-01 时无一生效 → 全部禁售
window.eval(`
  (function(){
    document.getElementById('tf-point').value = '2026-09-01T12:00';
    querySaleParams();
  })()
`);
ok(statusOf('su-1') === '禁售' && statusOf('su-2') === '禁售' && statusOf('su-3') === '禁售', '查询 2026-09-01（生效期之前）全部禁售');
// 复位时间点 → su-2/su-3 回到在售，su-1 因只剩停用计划仍禁售
window.eval(`
  (function(){
    resetSaleParams();
  })()
`);
ok(statusOf('su-2') === '在售' && statusOf('su-3') === '在售', '复位时间点后 su-2/su-3 在售');
ok(statusOf('su-1') === '禁售', 'su-1 仍禁售（计划已停用）');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
