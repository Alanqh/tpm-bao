// jsdom 行为测试：数据重构后各商品详情独立性 + 状态四级 + 计费项下拉过滤
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
const rowOf = (id) => Array.from(document.querySelectorAll('#saleunit-tbody tr')).find(r => r.cells[0].textContent.trim() === id);
const statusOf = (id) => { const r = rowOf(id); return r ? r.cells[1].textContent.trim() : '(无行)'; };

// ================= std：3 个已发布计划 → 全部在售 =================
section('std 商品（3 计划全部已发布）');
window.openDetailFromListed('maas-product-vtpm-std');
ok(evalInPage('planRows.length') === 3, 'std 挂载 3 个售卖计划');
ok(evalInPage('planRows.every(r => Object.values(r.chargeCodes).every(c => c.startsWith("maas-product-vtpm-std.")))'), 'std 的计费项前缀全部为 std');
ok(statusOf('su-1') === '在售' && statusOf('su-2') === '在售' && statusOf('su-3') === '在售', 'std su-1/2/3 全部在售');
ok(rowOf('su-1').textContent.includes('maas-product-vtpm-std.30d'), 'su-1 关计费项 std.30d');
ok(rowOf('su-1').textContent.includes('0.0084'), 'su-1 刊例价 0.0084');

// ================= pro：1 已发布 + 1 待发布 + 2 未配置 =================
section('pro 商品（published/pending_publish/未配置 三态）');
window.backToList();
window.openDetailFromListed('maas-product-vtpm-pro');
ok(evalInPage('planRows.length') === 2, 'pro 挂载 2 个售卖计划');
ok(statusOf('su-1') === '在售', 'pro su-1 在售（已发布计划）');
ok(statusOf('su-2') === '待发布', 'pro su-2 待发布（仅待发布计划）: ' + statusOf('su-2'));
ok(statusOf('su-3') === '未配置' && statusOf('su-4') === '未配置', 'pro su-3/su-4 未配置');
// 未配置行有删除按钮；有计划行没有
ok(rowOf('su-3').textContent.includes('删除'), '未配置 su-3 可删除');
ok(!rowOf('su-1').textContent.includes('删除') && !rowOf('su-2').textContent.includes('删除'), '已配置 su-1/su-2 不可删除');
// su-2 待发布也有计费项/刊例价
ok(rowOf('su-2').textContent.includes('maas-product-vtpm-pro.90d'), '待发布 su-2 也能看到关联计费项');
ok(rowOf('su-2').textContent.includes('0.0058'), '待发布 su-2 刊例价 0.0058');
// payload 归属
ok(evalInPage('planRows.every(r => r.payloadId.startsWith("payload-glm-"))'), 'pro 计划 payload 全部属于 glm playground');

// 发布 pro 的第二个计划（详情页发布）→ su-2 变在售
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
ok(statusOf('su-1') === '待发布', 'pre su-1 待发布');
ok(statusOf('su-2') === '未配置', 'pre su-2 未配置');

// ================= 计费项下拉按商品过滤 =================
section('计费项下拉过滤');
window.switchInnerTab('plan');
window.openPlanCreatePage();
const optCodes = Array.from(document.querySelectorAll('#plan-charge-unified select.plan-charge-select option')).map(o => o.value).filter(v => v);
ok(optCodes.every(c => c.startsWith('maas-product-vtpm-pre.')), 'pre 页面计费项下拉只含 pre 前缀（共 ' + optCodes.length + ' 项）: ' + optCodes.join(', '));
ok(optCodes.includes('maas-product-vtpm-pre.30d'), 'pre.30d 在候选中');
// std 打开时只含 std
window.closePlanCreatePage();
window.backToList();
window.openDetailFromListed('maas-product-vtpm-std');
window.switchInnerTab('plan');
window.openPlanCreatePage();
const optCodes2 = Array.from(document.querySelectorAll('#plan-charge-unified select.plan-charge-select option')).map(o => o.value).filter(v => v);
ok(optCodes2.every(c => c.startsWith('maas-product-vtpm-std.')), 'std 页面计费项下拉只含 std 前缀（共 ' + optCodes2.length + ' 项）');
window.closePlanCreatePage();

// ================= 停用回归 =================
section('停用/过期状态');
window.openPlanDetail(0);
window.stopPlanRow(0);
const allStopped = evalInPage('planRowStatuses.join(",")');
// std 三个计划：0 被停用，1/2 仍已发布 → su-1 无已发布计划但有待发布？不，statuses=[stopped,published,published]，su-1 只有计划0（停用）→ 已停售
ok(statusOf('su-1') === '已停售', '停用后 su-1 已停售（仅有停用计划）: ' + statusOf('su-1') + ' | ' + allStopped);
ok(statusOf('su-2') === '在售' && statusOf('su-3') === '在售', 'su-2/su-3 仍正常（其他计划仍已发布）');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
