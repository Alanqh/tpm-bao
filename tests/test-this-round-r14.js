// 第14轮修正验证：手动发放预留 vTPM 页面（admin-packages.html）
// ①创建 pool 选超量路由 ②数据与 admin-products 一致（std/pro/pre + 计费项价为单价）③单价=选中周期刊例价
// ④详情卡无售卖单元行 ⑤购买量按 min/max/step、无周期下拉、价格=单价×数量 ⑥弹窗加宽 ⑦列表/详情页数据对齐
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

// ===== 0. 静态结构：弹窗宽度 / 列表页数据对齐 =====
section('0. 结构');
const grantModal = document.querySelector('#modal-grant > div');
ok(grantModal.className.includes('max-w-4xl'), '弹窗宽度 max-w-4xl（更宽）');
const p1row = Array.from(document.querySelectorAll('#tab-sold tbody tr'))[0];
ok(p1row.textContent.includes('maas-product-vtpm-std') && p1row.textContent.includes('vTPM 预留资源包（标准）'), '列表 P001 行对齐 admin-products 商品');
ok(p1row.textContent.includes('3,000 万 vTPM'), '列表 P001 购买量 3000 万 vTPM');

// ===== 1. Step 1：Pool 查询 + 创建时选超量路由 =====
section('1. Pool 与路由选择');
window.openGrantModal();
const subjectInput = document.getElementById('grant-subject');
subjectInput.value = 'sub_3x9a2b1c';
window.flushPoolQuery(true);
ok(document.querySelectorAll('#grant-pool-list label').length === 2, '查询到 2 个 Pool');
// 创建新 Pool：选 serverless
document.querySelector('#grant-pool-list button[onclick="openCreatePoolModal()"]').click();
const routeRadios = document.querySelectorAll('input[name="create-pool-route"]');
ok(routeRadios.length === 2 && routeRadios[0].value === 'limit' && routeRadios[1].value === 'serverless', '创建 Pool 弹窗含超量路由单选（limit/serverless）');
routeRadios[1].checked = true;
document.getElementById('create-pool-name').value = 'proj-delta';
window.confirmCreatePool();
ok(evalInPage("subjectPools['sub_3x9a2b1c'].pools[2].route") === 'serverless', '新 Pool 超量路由=所选 serverless');
ok(document.querySelectorAll('#grant-pool-list label')[2].textContent.includes('Serverless'), '列表中新 Pool 展示 Serverless 徽标');

// ===== 2. Step 2：数据与 admin-products 一致 =====
section('2. 数据一致性');
const skuSel = document.getElementById('grant-sku');
ok(skuSel.options.length === 3, 'SKU 下拉 3 个商品（std/pro/pre）');
ok(skuSel.options[0].textContent.includes('vTPM 预留资源包（标准）'), 'SKU 名称与 admin-products 一致：标准');
// std：两个维度下拉
skuSel.value = '001';
window.onSkuChange();
let ds = Array.from(document.querySelectorAll('#grant-dims select'));
ok(ds.length === 2, 'std 两维度下拉');
const qtyMeasures = Array.from(ds[0].options).map(o => o.value).filter(Boolean);
ok(qtyMeasures.join(',') === '1～100', 'std 购买量区间只有 1～100（与 admin-products 的 std 单元一致）: ' + qtyMeasures.join(','));
const cycMeasures = Array.from(ds[1].options).map(o => o.value).filter(Boolean);
ok(cycMeasures.join(',') === '30天,60天,90天', 'std 周期 30/60/90 天: ' + cycMeasures.join(','));
// pro：1～100 + 500+，30/90 天
skuSel.value = '002'; window.onSkuChange();
ds = Array.from(document.querySelectorAll('#grant-dims select'));
ok(Array.from(ds[0].options).map(o => o.value).filter(Boolean).join(',') === '1～100,500+', 'pro 购买量区间 1～100/500+');
ok(Array.from(ds[1].options).map(o => o.value).filter(Boolean).join(',') === '30天,90天', 'pro 周期 30/90 天');

// ===== 3. 售卖参数详情（单价=选中周期刊例价；无售卖单元行） =====
section('3. 参数详情');
skuSel.value = '001'; window.onSkuChange();
ds = Array.from(document.querySelectorAll('#grant-dims select'));
ds[0].value = '1～100'; window.onDimChange();
ds[1].value = '30天'; window.onDimChange();
const detail = document.getElementById('grant-unit-detail');
const dTxt = detail.textContent;
ok(dTxt.includes('单价（30天周期）') && dTxt.includes('0.0084'), '单价=std.30d 刊例价 0.0084 / 万 vTPM');
ok(dTxt.includes('maas-product-vtpm-std.30d'), '详情展示计费项 code');
ok(dTxt.includes('payload-vtpm-001'), 'payload 与 admin-products std.30d 计划一致（payload-vtpm-001）');
ok(dTxt.includes('vtpm-factor-deepseek v3.4') && dTxt.includes('slo-rule-95 v5.2'), '折算/SLO 版本与 admin-products 一致');
ok(!dTxt.includes('售卖单元'), '不再展示售卖单元信息');
ok(!dTxt.includes('su-1'), '无 su-id 展示');
// 切 60 天 → 单价变化 0.0077
ds[1].value = '60天'; window.onDimChange();
ok(detail.textContent.includes('0.0077') && detail.textContent.includes('60天周期'), '切 60 天周期单价=0.0077（随周期变化的刊例价）');
// 预览弹窗（YAML 版本格式，与 admin-products 的 defaultConfigs 一致）
detail.querySelector('button[onclick^="showFactorPreview"]').click();
ok(!document.getElementById('modal-preview-factor').classList.contains('hidden'), '折算预览弹窗打开');
const factorPreview = document.getElementById('preview-factor-body').textContent;
ok(factorPreview.includes('vtpm-factor-deepseek v3.4') && factorPreview.includes('deepseek-reasoner'), '预览为 v3.4 版本 YAML（与 admin-products 最新版一致）');
window.closeFactorPreview();

// ===== 4. 交付配置（购买量 min/max/step；无周期下拉；价格=单价×数量；起止时间） =====
section('4. 交付配置');
ok(!document.getElementById('grant-cycle'), '无购买周期下拉（周期随售卖单元）');
const qtySel = document.getElementById('grant-multiplier');
const qtyVals = Array.from(qtySel.options).map(o => parseInt(o.value, 10));
ok(qtyVals[0] === 100 && qtyVals[1] === 600 && qtyVals[2] === 1100 && qtyVals[qtyVals.length - 1] <= 10000 && qtyVals[qtyVals.length - 1] > 9500, 'std.60d 购买量 100 起 step500（min/max/step 与配置一致，末档 ' + qtyVals[qtyVals.length - 1] + ' ≤10000）');
ok(document.getElementById('grant-qty-range').textContent.includes('100') && document.getElementById('grant-qty-range').textContent.includes('10,000') && document.getElementById('grant-qty-range').textContent.includes('500'), '购买量范围提示行');
// 价格 = 单价 × 数量
qtySel.value = '100'; window.renderGrantSummary();
const preview = document.getElementById('grant-total-preview').textContent;
ok(preview.includes('0.0077') && preview.includes('100') && preview.includes('77'), '价格预览=0.0077×100=¥77: ' + preview);
// 起止：60 天周期 → 结束 = 开始 + 61
const now = new Date();
const exp = new Date(now); exp.setHours(0, 0, 0, 0); exp.setDate(exp.getDate() + 61);
const expStr = exp.getFullYear() + '-' + String(exp.getMonth() + 1).padStart(2, '0') + '-' + String(exp.getDate()).padStart(2, '0') + ' 00:00';
ok(document.getElementById('grant-end').value === expStr, '结束时间=开始+60天+1天: ' + document.getElementById('grant-end').value);
// su-3（90 天）购买量 1000~50000 step1000
ds[1].value = '90天'; window.onDimChange();
const qty90 = Array.from(qtySel.options).map(o => parseInt(o.value, 10));
ok(qty90[0] === 1000 && qty90[qty90.length - 1] === 50000 && qty90[1] === 2000, 'std.90d 购买量 1000~50000 step1000');
ok(detail.textContent.includes('0.0075'), '90 天单价 0.0075');

// ===== 5. 确认交付摘要 =====
section('5. 确认交付');
qtySel.value = '1000';
document.getElementById('grant-note').value = '一致性修正备注';
// 勾选 pool
document.querySelectorAll('#grant-pool-list input[name="grant-pool"]').forEach(cb => { cb.checked = true; });
alertMsg = '';
window.confirmGrant();
ok(alertMsg.includes('0.0075') && alertMsg.includes('90 天'), '摘要含单价与周期');
ok(alertMsg.includes('1,000 万 vTPM'), '摘要含购买量 1000 万 vTPM');
ok(alertMsg.includes('7.5'), '摘要费用=0.0075×1000=¥7.5');
ok(alertMsg.includes('proj-delta') && alertMsg.includes('Serverless'), '摘要含各 Pool 超量路由');

// ===== 6. 详情页（列表联动） =====
section('6. 详情页');
window.showDetail('P001');
const dbody = document.getElementById('detail-body').textContent;
ok(dbody.includes('vTPM 预留资源包（标准）') && dbody.includes('maas-product-vtpm-std'), '详情含商品与 code');
ok(dbody.includes('3,000 万 vTPM / 30 天'), '详情购买量/周期');
ok(dbody.includes('0.0084') && dbody.includes('maas-product-vtpm-std.30d'), '详情单价=刊例价口径');
ok(dbody.includes('超量限流'), '详情 Pool 含超量路由徽标');
ok(dbody.includes('1～100 / 30天'), '详情售卖单元维度:度量');
window.showDetail('P002');
ok(document.getElementById('detail-body').textContent.includes('超量路由 Serverless'), 'P002 详情 Pool 路由=Serverless');

// ===== 7. 空态与未完整选择拦截 =====
section('7. 拦截');
window.openGrantModal();
document.getElementById('grant-sku').value = '002';
window.onSkuChange();
alertMsg = '';
window.confirmGrant();
ok(alertMsg.includes('请先完整选择'), '维度未选完整时拦截');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
