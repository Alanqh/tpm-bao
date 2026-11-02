// 第15轮原验证「新增商品售卖维度勾选」——第22轮简化口径：
// ①新增商品无售卖维度字段 ②提交无维度校验 ③创建后默认进入「售卖空间」Tab（先创建售卖空间）
// ④批量创建空间=fn+维度+每维度度量（默认全选；同 fn 维度集合相同拦截）
// ⑤创建售卖单元按空间维度+空间配置的度量勾选（pair 只增不减）
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

// ===== 1. 弹窗结构（第21轮：无售卖维度勾选区） =====
section('1. 弹窗结构');
window.openProductModal();
ok(!document.getElementById('inp-dims'), '弹窗无 #inp-dims 勾选区（第21轮移除）');
ok(document.querySelectorAll('.product-dim-check').length === 0, '无 product-dim-check 复选框');
const labels = Array.from(document.querySelectorAll('#modal-product label.form-label')).map(l => l.textContent.trim());
ok(!labels.some(l => l.includes('售卖维度')), '字段清单无「售卖维度」');

// ===== 2. 提交无维度校验 =====
section('2. 提交');
alertMsg = '';
document.getElementById('inp-code').value = 'maas-product-vtpm-r21a';
document.getElementById('inp-name').value = 'r21 商品A';
window.submitProduct();
ok(alertMsg === '', '提交不拦截（无维度校验）: ' + alertMsg);
ok(evalInPage('currentProduct.code') === 'maas-product-vtpm-r21a', '商品创建成功');
ok(evalInPage('currentProduct.dims') === undefined, 'currentProduct 无 dims 字段');
// 创建后默认打开「售卖空间」Tab
const activeTab = document.querySelector('#plan-tabs-card .admin-tab.active');
ok(activeTab && activeTab.textContent.trim() === '售卖空间', '创建后默认进入「售卖空间」Tab（先建空间）');
const tabsOrder = Array.from(document.querySelectorAll('#plan-tabs-card .admin-tab')).map(b => b.textContent.trim());
ok(tabsOrder[0] === '售卖空间', '售卖空间为第一个 Tab');

// ===== 3. 新商品通过空间计划创建售卖空间（第31轮：fn 勾选+维度勾选，保存总是新建空间） =====
section('3. 空间计划创建售卖空间');
window.eval('startEdit()');
window.eval('openSpacePlanModal()');
ok(document.querySelectorAll('.sp-fn-check').length === 1, 'vtpm（无 fn 商品）弹窗单行 fn=""');
ok(document.querySelectorAll('.sp-dim-check').length === 4, '维度候选 4 个（dimensionOptions 全量）');
ok(document.querySelectorAll('.space-msr-check').length === 0, '弹窗无度量勾选区（空间只管维度）');
ok(!document.querySelector('.sp-fn-space'), '第31轮：无空间下拉（改为维度勾选）');
// 第一份计划：fn='' + 仅购买量区间 → 总是新建 sp6
const fnBoxA = document.querySelector('.sp-fn-check[data-fn=""]');
fnBoxA.checked = true;
fnBoxA.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-dim-check[data-fn=""]').forEach(c => { c.checked = c.value === '购买量区间'; });
document.getElementById('sp-name').value = 'r31 空间计划A';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存') && alertMsg.includes('待发布'), '计划保存成功（待发布）: ' + alertMsg.slice(0, 24));
ok(alertMsg.includes('已新建售卖空间'), '提示已新建售卖空间');
ok(evalInPage('Object.keys(spaces).some(k => spaces[k].seq === 6 && spaces[k].dims.join(",") === "购买量区间")'), '新空间（售卖空间6）序号自增+维度正确');
ok(evalInPage('spaces["sp6"].measures') === undefined, '空间无 measures 字段（空间只管维度）');
// 第二份计划：fn='' + 仅购买周期 → 新建 sp7
window.eval('openSpacePlanModal()');
const fnBoxB = document.querySelector('.sp-fn-check[data-fn=""]');
fnBoxB.checked = true;
fnBoxB.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-dim-check[data-fn=""]').forEach(c => { c.checked = c.value === '购买周期'; });
document.getElementById('sp-name').value = 'r31 空间计划B';
alertMsg = '';
window.confirmSpacePlan();
ok(evalInPage('Object.keys(spaces).some(k => spaces[k].seq === 7 && spaces[k].dims.join(",") === "购买周期")'), '第二份计划空间（售卖空间7）单维度');
ok(evalInPage('spacePlans.length') === 2, '两份空间计划');
// 重复维度集合不再拦截（第31轮口径：总是新建）
window.eval('openSpacePlanModal()');
const fnBoxC = document.querySelector('.sp-fn-check[data-fn=""]');
fnBoxC.checked = true;
fnBoxC.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-dim-check[data-fn=""]').forEach(c => { c.checked = c.value === '购买量区间'; });
document.getElementById('sp-name').value = 'r31 空间计划C';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已新建售卖空间') && evalInPage('Object.keys(spaces).some(k => spaces[k].seq === 8)'), '维度集合与已有空间相同 → 不拦截，总是新建（sp8）');
window.eval('closeModal("spaceplan")');
// 设为生效：sp6 设为 fn('') 生效空间 → SU 默认跟随；新空间默认未生效
ok(evalInPage('currentSpaceOfFn("")') === 'sp1', 'sp1 默认生效（seq 最早回退）');
window.eval('setSpaceActive("sp6")');
ok(evalInPage('currentSpaceOfFn("")') === 'sp6', 'setSpaceActive 后 sp6 生效');
window.eval('setSpaceActive("sp1")');
ok(evalInPage('currentSpaceOfFn("")') === 'sp1', '切回 sp1');

// ===== 4. 创建售卖单元：按空间维度 + 全量度量 + pair 只增不减 =====
section('4. 创建售卖单元');
window.openSuConfirmModal();
// vtpm 无 function → fn block 隐藏；空间下拉默认=fn('') 生效空间
ok(document.getElementById('su-fn-block').classList.contains('hidden'), '无 function 商品隐藏 fn 下拉');
ok(!!document.getElementById('su-space-select'), '显示售卖空间下拉');
ok(evalInPage('suSpaceSel') === 'sp1', '默认选中 fn 生效空间 sp1');
// 切换到新建的 sp6（单维度空间）
window.eval('document.getElementById("su-space-select").value = "sp6"; onSuSpaceChange();');
const suDimTitles = Array.from(document.querySelectorAll('#su-confirm-body p.text-xs.font-semibold')).map(p => p.textContent.trim());
ok(suDimTitles.join(',').includes('购买量区间') && !suDimTitles.join(',').includes('购买周期'), 'sp6 仅展示空间定义的维度（购买量区间）');
ok(document.querySelectorAll('#su-confirm-body .su-leaf').length === 3, '度量候选=全量 3 个（第23轮空间不管度量）');
// 不勾任何度量 → 拦截
document.querySelectorAll('#su-confirm-body .su-leaf').forEach(c => { c.checked = false; });
alertMsg = '';
window.confirmSaleUnits();
ok(alertMsg.includes('请至少勾选一个度量'), '不勾度量拦截: ' + alertMsg);
// 勾 1～100 创建（单维度）
document.querySelector('.su-leaf[data-dim="购买量区间"][data-measure="1～100"]').checked = true;
alertMsg = '';
window.confirmSaleUnits();
ok(alertMsg.includes('已创建售卖单元：1 个'), '单维单度量 → 创建 1 个');
ok(evalInPage('saleUnits[0].spaceKey') === 'sp6' && evalInPage('saleUnits[0].dim') === '购买量区间', '单元挂 sp6 + 单维购买量区间');

// ===== 5. 只增不减（直接加勾全量候选中的新度量） =====
section('5. 只增不减');
window.openSuConfirmModal();
window.eval('document.getElementById("su-space-select").value = "sp6"; onSuSpaceChange();');
ok(evalInPage('suSpaceSel') === 'sp6', '切到 sp6');
const disabledCnt = document.querySelectorAll('#su-confirm-body input.su-leaf:checked[disabled]').length;
ok(disabledCnt === 1, '已确认 pair（1～100）置灰: ' + disabledCnt);
// 加勾 500+ → 组合扩展（1～100+500+ 两个单元）
document.querySelector('.su-leaf[data-dim="购买量区间"][data-measure="500+"]').checked = true;
alertMsg = '';
window.confirmSaleUnits();
ok(alertMsg.includes('已创建售卖单元：2 个'), '追加勾选扩展为 2 个（1～100/500+）');
ok(evalInPage('saleUnits.filter(u=>u.spaceKey==="sp6").length') === 2, '同组单元数=2');

// ===== 6. 既有商品（std）流程不回归 =====
section('6. 既有商品');
window.eval('backToList()');
window.openDetailByCode('maas-product-vtpm-std');
ok(evalInPage('currentProduct.dims') === undefined, 'std 商品无 dims（第21轮统一）');
window.eval('startEdit()');
window.openSuConfirmModal();
const suDimTitles2 = Array.from(document.querySelectorAll('#su-confirm-body p.text-xs.font-semibold')).map(p => p.textContent.trim());
ok(suDimTitles2.join(',').includes('购买量区间') && suDimTitles2.join(',').includes('购买周期'), 'std（sp1 两维度）弹窗仍展示两个维度');
const disabledCnt2 = document.querySelectorAll('#su-confirm-body input.su-leaf:checked[disabled]').length;
ok(disabledCnt2 > 0, 'std 已确认 pair 置灰（只增不减）');

// ===== 7. 新建商品入列（无 dims） =====
section('7. 列表入列');
window.eval('backToList()');
window.openProductModal();
document.getElementById('inp-code').value = 'maas-product-vtpm-r21b';
document.getElementById('inp-name').value = 'r21 商品B';
window.submitProduct();
window.backToList();
ok(evalInPage('allProducts.find(p=>p.code==="maas-product-vtpm-r21b")') !== undefined, '新建商品入列 allProducts');
ok(evalInPage('allProducts.find(p=>p.code==="maas-product-vtpm-r21b").dims') === undefined, '入列商品无 dims 字段');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
