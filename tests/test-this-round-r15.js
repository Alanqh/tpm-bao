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

// ===== 3. 新商品先批量创建售卖空间（弹窗多行：fn + 维度 + 每维度度量） =====
section('3. 批量创建售卖空间');
window.eval('startEdit()');
window.eval('openSpaceBulkModal()');
ok(document.querySelectorAll('.space-row').length === 1, '弹窗默认 1 行');
ok(document.querySelectorAll('.space-dim-check').length === 4, '维度候选 4 个（dimensionOptions 全量）');
ok(document.querySelectorAll('.space-msr-check').length === 0, '未勾维度时不展示度量勾选区');
// 第一行：fn=—（vtpm 无 function）+ 仅购买量区间（fn='' 内与 sp1 两维度不同→不重复）
const rowA = document.querySelectorAll('.space-row')[0];
rowA.querySelectorAll('.space-dim-check').forEach(c => { c.checked = c.value === '购买量区间'; });
rowA.querySelector('.space-dim-check[value="购买量区间"]').dispatchEvent(new window.Event('change', { bubbles: true }));
ok(rowA.querySelectorAll('.space-msr-check').length === 3, '勾维度后展开度量勾选（默认全选 3 个）');
// 第一行取消勾 500+（部分度量创建）
rowA.querySelector('.space-msr-check[data-dim="购买量区间"][data-measure="500+"]').checked = false;
// 添加第二行：仅购买周期
window.eval('addSpaceRow()');
ok(document.querySelectorAll('.space-row').length === 2, '添加一行后共 2 行');
const rowB = document.querySelectorAll('.space-row')[1];
rowB.querySelector('.space-row-fn').value = '';
rowB.querySelectorAll('.space-dim-check').forEach(c => { c.checked = c.value === '购买周期'; });
rowB.querySelector('.space-dim-check[value="购买周期"]').dispatchEvent(new window.Event('change', { bubbles: true }));
alertMsg = '';
window.confirmSpaceBulk();
ok(alertMsg.includes('已创建 2 个售卖空间'), '批量创建 2 个: ' + alertMsg);
ok(evalInPage('Object.keys(spaces).some(k => spaces[k].seq === 6 && spaces[k].dims.join(",") === "购买量区间")'), '新空间（售卖空间6）序号自增+维度正确');
ok(evalInPage('Object.keys(spaces).some(k => spaces[k].seq === 7 && spaces[k].dims.join(",") === "购买周期")'), '第二行空间（售卖空间7）单维度');
ok(alertMsg.includes('售卖空间6') && alertMsg.includes('售卖空间7'), '名称按序号自增（售卖空间6/7）');
ok(evalInPage('spaces["sp6"].measures["购买量区间"].length') === 2, 'sp6 度量=弹窗勾选（取消 500+ 后 2 个）');
// 重复维度集合 → 拦截（sp6 与 fn='' 单购买量区间重复）
window.eval('openSpaceBulkModal()');
const rowDup = document.querySelectorAll('.space-row')[0];
rowDup.querySelectorAll('.space-dim-check').forEach(c => { c.checked = c.value === '购买量区间'; });
rowDup.querySelector('.space-dim-check[value="购买量区间"]').dispatchEvent(new window.Event('change', { bubbles: true }));
alertMsg = '';
window.confirmSpaceBulk();
ok(alertMsg.includes('已存在维度集合相同'), '同 fn 维度集合相同拦截: ' + alertMsg);
window.eval('closeModal("space-edit")');
// fn 当前空间配置：fn='' 切到 sp6 → SU 默认跟随
window.eval('setFnSpace("", "sp6")');
ok(evalInPage('currentSpaceOfFn("")') === 'sp6', '无 fn 商品当前空间切到 sp6');
window.eval('setFnSpace("", "")');
ok(evalInPage('currentSpaceOfFn("")') === 'sp1', '清配置回退 sp1（seq 最早）');

// ===== 4. 创建售卖单元：按空间维度 + 空间配置度量 + pair 只增不减 =====
section('4. 创建售卖单元');
window.openSuConfirmModal();
// vtpm 无 function → fn block 隐藏；空间下拉默认=fn('') 当前空间
ok(document.getElementById('su-fn-block').classList.contains('hidden'), '无 function 商品隐藏 fn 下拉');
ok(!!document.getElementById('su-space-select'), '显示售卖空间下拉');
ok(evalInPage('suSpaceSel') === 'sp1', '默认选中 fn 当前空间 sp1');
// 切换到新建的 sp6（单维度空间）
window.eval('document.getElementById("su-space-select").value = "sp6"; onSuSpaceChange();');
const suDimTitles = Array.from(document.querySelectorAll('#su-confirm-body p.text-xs.font-semibold')).map(p => p.textContent.trim());
ok(suDimTitles.join(',').includes('购买量区间') && !suDimTitles.join(',').includes('购买周期'), 'sp6 仅展示空间定义的维度（购买量区间）');
ok(document.querySelectorAll('#su-confirm-body .su-leaf').length === 2, '度量候选=空间配置的 2 个（非全量 3）');
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

// ===== 5. 只增不减 + 编辑度量扩展 =====
section('5. 只增不减');
window.openSuConfirmModal();
window.eval('document.getElementById("su-space-select").value = "sp6"; onSuSpaceChange();');
ok(evalInPage('suSpaceSel') === 'sp6', '切到 sp6');
const disabledCnt = document.querySelectorAll('#su-confirm-body input.su-leaf:checked[disabled]').length;
ok(disabledCnt === 1, '已确认 pair（1～100）置灰: ' + disabledCnt);
window.eval('closeModal("su-confirm")');
// 编辑度量：sp6 加回 500+（未被引用 → 可勾）
window.eval('editSpaceMeasures("sp6")');
document.querySelector('.sme-check[data-dim="购买量区间"][data-measure="1～100"]').disabled = false; // test hook: 解锁置灰项以便读取（真实交互中 1～100 被引用置灰）
document.querySelector('.sme-check[data-dim="购买量区间"][data-measure="500+"]').checked = true;
alertMsg = '';
window.confirmSpaceMeasureEdit();
ok(evalInPage('spaces["sp6"].measures["购买量区间"].length') === 3, '编辑度量加回 500+（共 3 个）');
// 重新开 SU 弹窗加勾 500+ → 组合扩展（1～100+500+ 两个单元）
window.openSuConfirmModal();
window.eval('document.getElementById("su-space-select").value = "sp6"; onSuSpaceChange();');
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
