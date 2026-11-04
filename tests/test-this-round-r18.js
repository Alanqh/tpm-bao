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
// 新商品：通过「创建售卖空间」建空间（第38轮：一个空间可含多个 fn）
window.eval('startEdit()');
// 空间一：input（输出token区间×0～4K）+ output（输入token区间×0～128K）——多 fn 共一空间
window.eval('openSpacePlanModal()');
let boxIn = document.querySelector('.sp-fn-check[data-fn="input"]');
boxIn.checked = true;
boxIn.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-measure-check[data-dim="输出token区间"]').forEach(c => { c.checked = c.value === '0～4K'; });
let boxOut = document.querySelector('.sp-fn-check[data-fn="output"]');
boxOut.checked = true;
boxOut.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-measure-check[data-dim="输入token区间"]').forEach(c => { c.checked = c.value === '0～128K'; });
document.getElementById('sp-name').value = 'r38 空间一';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存'), '空间一保存成功: ' + alertMsg.slice(0, 20));
// 空间二：input（购买量区间×1～100）
window.eval('openSpacePlanModal()');
boxIn = document.querySelector('.sp-fn-check[data-fn="input"]');
boxIn.checked = true;
boxIn.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-measure-check[data-dim="购买量区间"]').forEach(c => { c.checked = c.value === '1～100'; });
document.getElementById('sp-name').value = 'r38 空间二';
window.confirmSpacePlan();
ok(evalInPage('spaceSeq') === 2, 'spaceSeq=2（空间一/二，跨 function 连续编号）');
ok(evalInPage('Object.keys(spaces["sp1"].fnDims).join(",")') === 'input,output', '空间一含 input+output 两个 fn（第38轮多 fn 共一空间）');
ok(evalInPage('spaces["sp2"].fnDims["input"].join(",")') === '购买量区间', '空间二 input 单维度（r44：勾购买量区间的度量）');

// ===== 3. online-text：SU 弹窗已删（第37轮）——售卖单元改由空间叉乘生成 =====
section('3. 叉乘生成售卖单元（第38轮）');
window.eval('startEdit()');
ok(!document.getElementById('modal-su-confirm'), 'SU 弹窗已删除');
ok(!document.getElementById('su-create-btn'), 'SU Tab 创建按钮已删除');
// 空间一保存时逐 fn 叉乘（r44：两 fn 共享同一份度量勾选 输入{0～128K}+输出{0～4K} → 每 fn (1+1)×(1+1)=4），同属 sp1
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp1").length') === 8, '空间一（input+output）生成 8 单元（每 fn 4 组合，共享度量勾选）');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp1" && u.fn==="input").length') === 4, 'sp1 input 单元 4 个');
const suIn = evalInPage('saleUnits.find(u=>u.spaceKey==="sp1" && u.fn==="input" && u.dim === "输出token区间")');
ok(!!suIn, '售卖单元 dim 不含 function（input 有 dim=输出token区间 单元）');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp1" && u.fn==="output").length') === 4, 'sp1 output 单元 4 个');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp2").length') === 2, '空间二（input+购买量区间×1～100）生成 2 单元（含全缺省）');

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
