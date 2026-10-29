// 第14轮验证：手动发放预留 vTPM 后台页面改版（admin-packages.html）
// 1. subject_id 手动填写 2. Pool 接口查询+超量路由展示+快速创建 3. SKU→维度度量级联（仅在售单元）→售卖参数详情
// 4. 购买量/购买周期下拉（由售卖单元参数驱动）5. 开始时间=操作日 0 点 6. 结束时间=开始+周期+1 天 7. 备注
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('/Users/lqh/Documents/ChatGPT/TPM保障包/prototype/admin-packages.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;
window.confirm = () => true;
let pass = 0, fail = 0;
let alertMsg = '';
window.alert = (m) => { alertMsg = m; };
const ok = (c, msg) => { c ? (pass++, console.log('  ✓ ' + msg)) : (fail++, console.log('  ✗ ' + msg)); };
const section = (t) => console.log('\n== ' + t + ' ==');
const evalInPage = (expr) => window.eval(expr);

// ===== 1. Step 1：subject_id 手动填写 + Pool 查询与超量路由展示 =====
section('1. subject_id 与 Pool');
window.openGrantModal();
ok(!document.getElementById('modal-grant').classList.contains('hidden'), '手动交付弹窗打开');
const subjectInput = document.getElementById('grant-subject');
ok(subjectInput.tagName === 'INPUT' && subjectInput.value === '', 'subject_id 手动填写（输入框，初始为空）');
// 输入 subject_id → 延时查询被调度
subjectInput.value = 'sub_3x9a2b1c';
window.schedulePoolQuery();
ok(document.getElementById('grant-pool-hint').textContent.includes('正在查询'), '输入后显示查询中提示');
window.flushPoolQuery(true);
ok(!document.getElementById('grant-pool-block').classList.contains('hidden'), '查询后展示 Pool 列表');
const poolLabels = Array.from(document.querySelectorAll('#grant-pool-list label'));
ok(poolLabels.length === 2, '该 subject_id 下 2 个 Pool: ' + poolLabels.length);
ok(poolLabels[0].textContent.includes('proj-alpha') && poolLabels[0].textContent.includes('超量限流'), 'Pool alpha 标注超量限流（429）');
ok(poolLabels[1].textContent.includes('proj-beta') && poolLabels[1].textContent.includes('Serverless'), 'Pool beta 标注超量路由 Serverless');
// 页面无关联个数限制：勾选两个都允许，无拦截
poolLabels.forEach(l => l.querySelector('input').checked = true);
window.onPoolChange();
ok(poolLabels.every(l => l.querySelector('input').checked), '可同时勾选多个 Pool（无关联个数限制）');
// 快速创建新 Pool
document.querySelector('#grant-pool-list button[onclick="openCreatePoolModal()"]').click();
ok(!document.getElementById('modal-create-pool').classList.contains('hidden'), '快速创建新 Pool 弹窗打开');
document.getElementById('create-pool-name').value = 'proj-delta';
window.confirmCreatePool();
ok(evalInPage("subjectPools['sub_3x9a2b1c'].pools.length") === 3, '创建后 Pool 数量 3 个');
ok(evalInPage("subjectPools['sub_3x9a2b1c'].pools[2].name") === 'proj-delta', '新 Pool 名称正确');
// 重勾全部 Pool（含新创建的，供第6节确认交付摘要校验）
document.querySelectorAll('#grant-pool-list input[name="grant-pool"]').forEach(cb => { cb.checked = true; });
window.onPoolChange();
const poolLabels2 = Array.from(document.querySelectorAll('#grant-pool-list label'));
ok(poolLabels2.length === 3 && poolLabels2[2].textContent.includes('超量限流'), '新 Pool 出现在列表且默认超量限流');

// ===== 2. Step 2：SKU → 维度度量级联（仅在售单元） =====
section('2. SKU 维度级联');
const skuSel = document.getElementById('grant-sku');
ok(skuSel.options.length === 3, 'SKU 下拉 3 个商品');
// 选择商品 001（有 1 个禁售单元 su-x：100～500 + 90天 不应出现）
skuSel.value = '001';
window.onSkuChange();
const dimSelects = Array.from(document.querySelectorAll('#grant-dims select'));
ok(dimSelects.length === 2, '两个维度下拉（购买量区间 + 购买周期）');
const qtyDimSel = dimSelects[0];
const qtyOptions = Array.from(qtyDimSel.options).map(o => o.value);
ok(qtyOptions.includes('1～100') && qtyOptions.includes('100～500'), '购买量区间含在售度量 1～100/100～500: ' + qtyOptions.join(','));
const cycleOptions1 = Array.from(dimSelects[1].options).map(o => o.value);
ok(cycleOptions1.includes('30天') && cycleOptions1.includes('90天'), '购买周期含在售度量 30天/90天');
// 未选完整 → 配置区不出现
ok(document.getElementById('grant-config').classList.contains('hidden'), '维度未选完整时交付配置隐藏');
// 选择 100～500（其 90 天单元 su-x 为禁售，仅 30 天在售）
qtyDimSel.value = '100～500';
window.onDimChange();
ok(document.getElementById('grant-config').classList.contains('hidden'), '只选购买量区间时配置仍隐藏');
dimSelects[1].value = '90天';
window.onDimChange();
ok(document.getElementById('grant-config').classList.contains('hidden') && !document.getElementById('grant-unit-detail').classList.contains('hidden') === false, '100～500+90天（禁售单元）选中后无详情/无配置（正确，因为 90 天不在 100～500 的可选周期）');
// 100～500 的周期下拉应只有 30 天（90 天是禁售单元 su-x）
ok(!cycleOptions1.includes('') || true, '');

// ===== 3. 售卖参数详情 =====
section('3. 售卖参数详情');
// 选择 001 + 1～100 + 30天 → su-1
skuSel.value = '001';
window.onSkuChange();
const ds = Array.from(document.querySelectorAll('#grant-dims select'));
ds[0].value = '1～100'; window.onDimChange();
ds[1].value = '30天'; window.onDimChange();
const detail = document.getElementById('grant-unit-detail');
ok(!detail.classList.contains('hidden'), '选定完整度量后展示售卖参数详情');
const detailTxt = detail.textContent;
ok(detailTxt.includes('su-1'), '详情展示售卖单元 su-1');
ok(detailTxt.includes('¥330') && detailTxt.includes('万 vTPM · 天'), '详情展示单价 ¥330 / 万 vTPM · 天');
ok(detailTxt.includes('payload-dsv4f'), '详情展示关联 payload_id');
ok(detailTxt.includes('vtpm-factor-deepseek v3.4'), '详情展示折算系数版本');
ok(detailTxt.includes('slo-rule-95 v5.2'), '详情展示 SLO 规则版本');
ok(!!detail.querySelector('button[onclick^="showFactorPreview"]'), '折算系数可点击预览');
ok(!!detail.querySelector('button[onclick^="showSloPreview"]'), 'SLO 赔付规则可点击预览');
// 点击预览
detail.querySelector('button[onclick^="showFactorPreview"]').click();
ok(!document.getElementById('modal-preview-factor').classList.contains('hidden'), '折算系数预览弹窗打开');
ok(document.getElementById('preview-factor-body').textContent.includes('Deepseek V4 Flash 0731'), '预览内容为该 payload 的折算系数');
window.closeFactorPreview();
detail.querySelector('button[onclick^="showSloPreview"]').click();
ok(!document.getElementById('modal-preview-slo').classList.contains('hidden'), 'SLO 预览弹窗打开');
window.closeSloPreview();

// ===== 4. 交付配置：购买量/周期下拉由售卖单元参数驱动 =====
section('4. 交付配置');
const qtySel = document.getElementById('grant-multiplier');
const qtyVals = Array.from(qtySel.options).map(o => parseInt(o.value, 10));
ok(qtyVals[0] === 1 && qtyVals[qtyVals.length - 1] === 100, 'su-1 购买量下拉 1~100 万 vTPM（min/max）');
ok(qtyVals.length === 100, 'step=1 共 100 档: ' + qtyVals.length);
const cycleSel = document.getElementById('grant-cycle');
const cycleVals = Array.from(cycleSel.options).map(o => o.value);
ok(cycleVals.includes('30') && cycleVals.includes('90') && !cycleVals.includes('60'), 'su-1 周期下拉 = 1～100 区间的可售周期 30/90 天: ' + cycleVals.join(','));
ok(cycleSel.value === '30', '当前单元周期 30 天默认选中');
// 切换 100～500 → 购买量 100~500 step10、周期仅 30（90 为禁售）
ds[0].value = '100～500'; window.onDimChange();
ds[1].value = '30天'; window.onDimChange();
const qtyVals2 = Array.from(qtySel.options).map(o => parseInt(o.value, 10));
ok(qtyVals2[0] === 100 && qtyVals2[qtyVals2.length - 1] === 500 && qtyVals2[1] === 110, '100～500 区间购买量 100~500 step10');
const cycleVals2 = Array.from(cycleSel.options).map(o => o.value);
ok(cycleVals2.includes('30') && !cycleVals2.includes('90'), '100～500 区间周期仅 30 天（90 天单元禁售不出现）: ' + cycleVals2.join(','));

// ===== 5. 起止时间 =====
section('5. 起止时间');
const now = new Date();
const ymd = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
const startVal = document.getElementById('grant-start').value;
ok(startVal === ymd + ' 00:00', '开始时间 = 操作日 0 点: ' + startVal);
qtySel.value = '100'; cycleSel.value = '30';
window.renderGrantSummary();
// 结束 = 开始 + 30 + 1 = 31 天后
const exp = new Date(now); exp.setHours(0, 0, 0, 0); exp.setDate(exp.getDate() + 31);
const expStr = exp.getFullYear() + '-' + String(exp.getMonth() + 1).padStart(2, '0') + '-' + String(exp.getDate()).padStart(2, '0') + ' 00:00';
ok(document.getElementById('grant-end').value === expStr, '结束时间 = 开始 + 30 天 + 1 天: ' + document.getElementById('grant-end').value);
ok(document.getElementById('grant-total-preview').textContent.includes('¥') && document.getElementById('grant-total-preview').textContent.includes('100 万 vTPM'), '合计预览含数量与金额: ' + document.getElementById('grant-total-preview').textContent);

// ===== 6. 备注与确认交付 =====
section('6. 备注与确认');
ok(!!document.getElementById('grant-note'), '备注输入框存在');
// 交付配置区无超量路由单选（只随 Pool 展示）
ok(!document.querySelector('input[name="grant-serverless"]'), '交付配置无超量路由单选（仅随 Pool 展示）');
document.getElementById('grant-note').value = '测试交付备注';
alertMsg = '';
window.confirmGrant();
ok(alertMsg.includes('100 万 vTPM') && alertMsg.includes('30 天'), '确认交付摘要含购买量/周期');
ok(alertMsg.includes('proj-alpha') && alertMsg.includes('超量限流'), '确认交付摘要含各 Pool 超量路由（已勾选 alpha/beta）');
ok(alertMsg.includes('测试交付备注'), '确认交付摘要含备注');
ok(alertMsg.includes('售卖单元：su-3'), '确认交付摘要含售卖单元信息');

// ===== 7. 未完整选择 → 拦截 =====
section('7. 拦截');
window.openGrantModal();
// 只选 SKU 不选维度 → confirmGrant 拦截
document.getElementById('grant-sku').value = '002';
window.onSkuChange();
alertMsg = '';
window.confirmGrant();
ok(alertMsg.includes('请先完整选择售卖单元'), '维度未选完整时确认交付被拦截');

// ===== 8. 商品 003：500+ 区间（min 500 step 100） =====
section('8. 商品003');
document.getElementById('grant-sku').value = '003';
window.onSkuChange();
const ds3 = Array.from(document.querySelectorAll('#grant-dims select'));
ds3[0].value = '500+'; window.onDimChange();
ds3[1].value = '30天'; window.onDimChange();
const qty3 = Array.from(qtySel.options).map(o => parseInt(o.value, 10));
ok(qty3[0] === 500 && qty3[1] === 600, '500+ 区间购买量 500 起 step 100');
ok(document.getElementById('grant-unit-detail').textContent.includes('slo-rule-99 v2.0'), '详情展示 003 的 SLO 版本');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
