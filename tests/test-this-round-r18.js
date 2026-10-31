// 第18/20/21轮验证：①新增商品无售卖维度勾选（第21轮移除；空间创建时才选维度）②复制按钮始终可操作（不受状态/编辑锁限制）③online-text 建售卖单元（fn→空间→度量）
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

// ===== 1. 新增商品无售卖维度（第21轮） =====
section('1. 新增商品无售卖维度');
const typeSel = document.getElementById('inp-type');
ok(typeSel.options.length === 2 && Array.from(typeSel.options).some(o => o.value === 'maas-online-text'), '商品类型含 maas-product-vtpm / maas-online-text');
window.openProductModal();
ok(document.querySelectorAll('.product-dim-check').length === 0, '无售卖维度复选框（第21轮移除）');
ok(!document.getElementById('inp-dims'), '弹窗无 #inp-dims 区块');

// ===== 2. 创建商品后先进售卖空间 Tab =====
section('2. 创建商品');
alertMsg = '';
document.getElementById('inp-type').value = 'maas-online-text';
window.onTypeChange();
document.getElementById('inp-code').value = 'maas-online-text-r21c';
document.getElementById('inp-name').value = 'r21 在线文本包';
window.submitProduct();
ok(alertMsg === '', '提交不拦截（无维度校验）');
ok(evalInPage('currentProduct.code') === 'maas-online-text-r21c', 'online-text 商品创建成功');
ok(evalInPage('currentProduct.dims') === undefined, '商品无 dims 字段（第21轮）');
ok(evalInPage('currentProduct.type') === 'maas-online-text', '商品类型= maas-online-text');
const activeTab2 = document.querySelector('#plan-tabs-card .admin-tab.active');
ok(activeTab2 && activeTab2.textContent.trim() === '售卖空间', '创建后默认打开「售卖空间」Tab');
// 新商品：批量创建空间（input fn 两个空间 + output 一个；创建时勾维度→度量默认全选）
window.eval('startEdit(); openSpaceBulkModal()');
document.querySelectorAll('.space-row')[0].querySelector('.space-row-fn').value = 'input';
document.querySelectorAll('.space-row')[0].querySelectorAll('.space-dim-check').forEach(c => { c.checked = c.value === '输出token区间'; });
document.querySelectorAll('.space-row')[0].querySelector('.space-dim-check[value="输出token区间"]').dispatchEvent(new window.Event('change', { bubbles: true }));
window.eval('addSpaceRow()');
document.querySelectorAll('.space-row')[1].querySelector('.space-row-fn').value = 'input';
document.querySelectorAll('.space-row')[1].querySelectorAll('.space-dim-check').forEach(c => { c.checked = c.value === '购买量区间'; });
document.querySelectorAll('.space-row')[1].querySelector('.space-dim-check[value="购买量区间"]').dispatchEvent(new window.Event('change', { bubbles: true }));
window.eval('addSpaceRow()');
document.querySelectorAll('.space-row')[2].querySelector('.space-row-fn').value = 'output';
document.querySelectorAll('.space-row')[2].querySelectorAll('.space-dim-check').forEach(c => { c.checked = c.value === '输入token区间'; });
document.querySelectorAll('.space-row')[2].querySelector('.space-dim-check[value="输入token区间"]').dispatchEvent(new window.Event('change', { bubbles: true }));
alertMsg = '';
window.confirmSpaceBulk();
ok(alertMsg.includes('已创建 3 个售卖空间'), '批量创建 3 个（input×2 + output×1）: ' + alertMsg);
ok(evalInPage('spaceSeq') === 8, 'spaceSeq=8（售卖空间6/7/8，跨 function 连续编号）');
ok(evalInPage('spaces["sp6"].measures["输出token区间"].length') === 3, 'sp6 度量默认全选（3 个）');
// output 空间与 input 空间维度集合相同 → 允许（不同 fn 可同维度）
ok(evalInPage('spaces["sp2"].fn === "input" && spaces["sp4"].fn === "output" && spaces["sp2"].dims.join(",") === spaces["sp4"].dims.join(",")'), '不同 function 的空间维度可相同（mock sp2/sp4 同维度集合各自独立）');

// ===== 3. online-text 建售卖单元（第20轮：先选 function → 空间 → 度量） =====
section('3. 建售卖单元');
window.eval('startEdit()');
window.openSuConfirmModal();
ok(!document.getElementById('su-fn-block').classList.contains('hidden'), '含 function 商品显示 function 下拉');
const fnOpts = Array.from(document.getElementById('su-fn-select').options).map(o => o.value);
ok(fnOpts.join(',') === ',input,output,cache', 'function 选项=—/input/output/cache: ' + fnOpts.join(','));
// 未选 function → 提示
let bodyTxt = document.getElementById('su-confirm-body').textContent;
ok(bodyTxt.includes('请先选择 function'), '未选 function 时提示先选');
// 选 input → 出现空间选择行（全局空间池：input 名下 sp2/sp3/sp6/sp7）
document.getElementById('su-fn-select').value = 'input';
window.onSuFnChange();
ok(!document.getElementById('su-space-line').classList.contains('hidden'), '选 function 后出现售卖空间行');
ok(!!document.getElementById('su-space-select'), '售卖空间下拉存在');
// 勾两个维度的度量创建
document.querySelector('#su-confirm-body input[data-dim="输入token区间"][data-measure="0～128K"]').checked = true;
document.querySelector('#su-confirm-body input[data-dim="输出token区间"][data-measure="0～4K"]').checked = true;
alertMsg = '';
window.confirmSaleUnits();
ok(alertMsg.includes('已创建售卖单元'), 'fn+空间 组创建成功');
ok(evalInPage('saleUnits[0].fn') === 'input', '售卖单元 fn=input');
ok(evalInPage('saleUnits[0].dim') === '输入token区间 + 输出token区间', '售卖单元 dim 不含 function');

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
