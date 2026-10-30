// 第18轮验证：①售卖维度由商品类型决定（maas-online-text 含 function 必选）②维度至少勾 1 个 ③复制按钮始终可操作（不受状态/编辑锁限制）
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('/Users/lqh/Documents/ChatGPT/TPM保障包/prototype/admin-products.html', 'utf8');
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

// ===== 1. 商品类型与售卖维度联动 =====
section('1. 类型驱动售卖维度');
const typeSel = document.getElementById('inp-type');
ok(typeSel.options.length === 2 && Array.from(typeSel.options).some(o => o.value === 'maas-online-text'), '商品类型含 maas-product-vtpm / maas-online-text');
window.openProductModal();
let checks = Array.from(document.querySelectorAll('.product-dim-check'));
ok(checks.map(c => c.value).join(',') === '购买量区间,购买周期', 'vtpm 类型维度=购买量区间+购买周期（无 function）');
ok(checks.every(c => !c.disabled), 'vtpm 维度均可自由勾选');
// 切 online-text
document.getElementById('inp-type').value = 'maas-online-text';
window.onTypeChange();
checks = Array.from(document.querySelectorAll('.product-dim-check'));
ok(checks.map(c => c.value).join(',') === 'function,输入token区间,输出token区间', 'online-text 维度=function+输入token区间+输出token区间');
const fnCheck = checks.find(c => c.value === 'function');
ok(fnCheck && fnCheck.disabled && fnCheck.checked, 'function 必选：disabled+checked');
ok(checks.filter(c => c.value !== 'function').every(c => !c.disabled && !c.checked), '其余维度自由勾选且默认不勾');
// 切回 vtpm → function 消失
document.getElementById('inp-type').value = 'maas-product-vtpm';
window.onTypeChange();
checks = Array.from(document.querySelectorAll('.product-dim-check'));
ok(!checks.some(c => c.value === 'function'), '切回 vtpm 后 function 维度消失');
ok(checks.every(c => !c.disabled), 'vtpm 无必选维度');

// ===== 2. 至少勾 1 个 =====
section('2. 至少勾1个');
document.getElementById('inp-type').value = 'maas-product-vtpm';
window.onTypeChange();
alertMsg = '';
document.getElementById('inp-code').value = 'maas-product-vtpm-r18a';
window.submitProduct();
ok(alertMsg.includes('至少勾选一个售卖维度'), 'vtpm 不勾任何维度提交拦截: ' + alertMsg);
ok(evalInPage('currentProduct') === null || evalInPage('currentProduct.code') !== 'maas-product-vtpm-r18a', '拦截后未创建');
// online-text：function 已强选 → 直接提交成功
document.getElementById('inp-type').value = 'maas-online-text';
window.onTypeChange();
alertMsg = '';
document.getElementById('inp-code').value = 'maas-online-text-r18';
document.getElementById('inp-name').value = 'r18 在线文本包';
window.submitProduct();
ok(alertMsg === '', 'online-text 未手勾其他维度（function 已强选）提交不拦截');
ok(evalInPage('currentProduct.code') === 'maas-online-text-r18', 'online-text 商品创建成功');
ok(evalInPage('currentProduct.dims.join(",")') === 'function', 'dims=[function]（自动生成默认 code/名称）');
ok(evalInPage('currentProduct.type') === 'maas-online-text', '商品类型= maas-online-text');

// ===== 3. online-text 建售卖单元 =====
section('3. 建售卖单元');
window.eval('startEdit()');
window.openSuConfirmModal();
let dimsShown = Array.from(document.querySelectorAll('#su-confirm-body p.text-xs.font-semibold')).map(p => p.textContent.trim()).join(',');
ok(dimsShown === 'function', '售卖单元弹窗只展示 function（dims 内）: ' + dimsShown);
const fnMeasures = Array.from(document.querySelectorAll('#su-confirm-body input[data-dim="function"]')).map(c => c.dataset.measure);
ok(fnMeasures.join(',') === 'input,output,cache', 'function 度量=input/output/cache: ' + fnMeasures.join(','));
// 勾 input + 补选其他维度再建
document.querySelector('#su-confirm-body input[data-dim="function"][data-measure="input"]').checked = true;
alertMsg = '';
window.confirmSaleUnits();
ok(alertMsg.includes('已创建售卖单元'), '单 function 维度创建成功（无需其他维度）');
ok(evalInPage('saleUnits[0].dim') === 'function' && evalInPage('saleUnits[0].measure') === 'input', '售卖单元= function·input');

// ===== 4. 复制不受状态影响 =====
section('4. 复制不受状态影响');
// 用 std（三计划：published）
window.backToList();
window.openDetailByCode('maas-product-vtpm-std');
// 4.1 浏览态（无编辑锁）复制
const cnt0 = evalInPage('planRows.length');
alertMsg = '';
window.copyPlanRow(0);
ok(alertMsg.includes('已复制'), '浏览态（无锁）复制成功: ' + alertMsg.slice(0, 24) + '…');
ok(evalInPage('planRows.length') === cnt0 + 1, '无锁复制计划数 +1');
// 4.2 三种状态操作区都有可点的复制按钮
window.openPlanDetail(0); // published
let actionsHtml = document.getElementById('plan-detail-actions').innerHTML;
ok(actionsHtml.includes('copyPlanRow'), '已发布计划操作区含复制按钮');
const noLockGrey = actionsHtml.includes('pointer-events-none');
ok(noLockGrey, '浏览态修改/停用按钮置灰（pointer-events-none）');
const greyBlock = (actionsHtml.match(/class="flex flex-wrap items-center gap-2 pointer-events-none opacity-40">[\s\S]*?<\/div>/) || [''])[0];
ok(!greyBlock.includes('copyPlanRow'), '复制按钮在置灰容器之外（不受锁限制）');
// 待发布（刚复制的副本）
window.openPlanDetail(3); // 副本=待发布
ok(document.getElementById('plan-detail-actions').innerHTML.includes('copyPlanRow'), '待发布计划操作区含复制按钮');
// 已停用
window.eval('startEdit()');
window.eval('stopPlanRow(0)');
window.openPlanDetail(0);
const stoppedActions = document.getElementById('plan-detail-actions');
ok(stoppedActions.textContent.includes('复制'), '已停用计划操作区含复制按钮');
// 停用后浏览态复制仍可
window.eval('exitEdit()');
alertMsg = '';
const cnt1 = evalInPage('planRows.length');
window.copyPlanRow(0);
ok(evalInPage('planRows.length') === cnt1 + 1, '已停用+浏览态复制仍成功');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
