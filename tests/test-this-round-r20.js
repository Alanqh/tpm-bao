// 第20/21/22轮验证：function 是「按什么卖」；售卖空间属于 function（创建时同时确定维度+每维度度量）
// 第22轮简化：移除空间计划/空间计划单元；fn→当前售卖空间直配（currentSpaceOfFn）；度量可增减（被引用置灰）、维度不可变
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

// ===== 0. glm4 示例商品 mock 校验（第22轮空间模型：维度+度量） =====
section('0. mock 数据');
ok(evalInPage('allProducts.some(p => p.code === "maas-online-text-glm4")'), '存在 online-text 示例商品 glm4');
ok(evalInPage('defaultSaleUnits["maas-online-text-glm4"].every(u => u.fn && u.spaceKey && !u.dim.includes("function"))'), 'glm4 售卖单元均有 fn/spaceKey 且 dim 不含 function');
ok(evalInPage('defaultSpaces["sp2"].fn === "input" && defaultSpaces["sp4"].fn === "output" && defaultSpaces["sp5"].fn === "cache"'), '空间模型含 fn 归属（sp2=input/sp4=output/sp5=cache）');
ok(evalInPage('defaultSpaces["sp2"].dims.join(",") === "输入token区间,输出token区间"'), '空间含维度集合');
ok(evalInPage('defaultSpaces["sp2"].measures["输入token区间"].length === 3'), '空间含每维度度量配置（sp2 输入token 3 个）');
ok(evalInPage('defaultFnSpaceMap["maas-online-text-glm4"]["input"] === "sp2"'), 'mock fnSpaceMap：input→sp2');

// ===== 1. 售卖空间 Tab：第一个 Tab，默认打开；fn 配置卡 + 空间列表 =====
section('1. 售卖空间 Tab');
window.openDetailByCode('maas-online-text-glm4');
const tabs = Array.from(document.querySelectorAll('#plan-tabs-card .admin-tab')).map(b => b.textContent.trim());
ok(tabs[0] === '售卖空间', '售卖空间是第一个 Tab');
const activeTab = document.querySelector('#plan-tabs-card .admin-tab.active');
ok(activeTab && activeTab.textContent.trim() === '售卖空间', '进入详情默认打开售卖空间 Tab');
ok(!document.getElementById('spaceplan-tbody'), '空间计划单元表已移除（第22轮）');
ok(!document.getElementById('spaceplan-create-btn'), '创建空间计划按钮已移除');
ok(!document.getElementById('modal-spaceplan'), '空间计划弹窗已移除');
ok(!!document.getElementById('space-new-btn') && document.getElementById('space-new-btn').textContent.includes('批量创建'), '含批量创建售卖空间按钮');
ok(!!document.getElementById('fn-space-cards'), '含 fn 当前空间配置卡容器');
ok(!!document.getElementById('space-tbody'), '含售卖空间列表表');

// ===== 2. fn 配置卡 + 空间列表渲染 =====
section('2. fn 配置与空间列表');
const fnCards = Array.from(document.querySelectorAll('#fn-space-cards > div'));
ok(fnCards.length === 3, 'fn 配置卡 3 张（input/output/cache）');
ok(fnCards.some(c => c.textContent.includes('input') && c.textContent.includes('售卖空间2')), 'input 卡显示当前空间售卖空间2');
ok(fnCards.some(c => c.textContent.includes('cache') && c.textContent.includes('售卖空间5')), 'cache 卡显示售卖空间5');
ok(fnCards.every(c => c.querySelector('select')), '每张卡含当前空间下拉');
const spRows = Array.from(document.querySelectorAll('#space-tbody tr'));
ok(spRows.length === 4, '空间列表 4 行（sp2/sp3/sp4/sp5；sp1 属无 fn 不在池）');
ok(spRows.every(r => r.textContent.includes('0～128K')), '维度:度量 列展示度量集合');
ok(spRows.some(r => r.textContent.includes('售卖空间2') && r.textContent.includes('2')), '售卖空间2 行含售卖单元数');
const spHead = Array.from(document.querySelector('#space-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(spHead.length === 6 && spHead[0] === '售卖空间' && spHead[1] === 'Function' && spHead[2] === '空间维度' && spHead[3].includes('维度:度量'), '空间列表 6 列（售卖空间/Function/空间维度/维度:度量/售卖单元数/操作）');

// ===== 3. currentSpaceOfFn（配置优先 → 回退 fn 最早空间） =====
section('3. 当前空间推导');
ok(evalInPage('currentSpaceOfFn("input")') === 'sp2', 'input 当前空间=sp2（mock 配置）');
ok(evalInPage('currentSpaceOfFn("cache")') === 'sp5', 'cache 当前空间=sp5');
window.eval('startEdit()');
// 清配置 → 回退 fn 最早空间
window.eval('setFnSpace("input", "")');
ok(evalInPage('currentSpaceOfFn("input")') === 'sp2', '清配置回退 input 最早空间 sp2');
// 显式切 sp3
window.eval('setFnSpace("input", "sp3")');
ok(evalInPage('currentSpaceOfFn("input")') === 'sp3', '显式配置 input→sp3');
window.eval('setFnSpace("input", "sp2")');

// ===== 4. 售卖单元 Tab 前三列合并（fn/空间/单元） =====
section('4. 售卖单元前三列');
window.eval('switchInnerTab("saleunit"); renderSaleUnits();');
const suRows = Array.from(document.querySelectorAll('#saleunit-tbody tr'));
ok(suRows.length === 4, 'glm4 售卖单元 4 行');
const r0 = suRows[0].cells;
ok(r0[0].textContent.trim() === 'cache' && r0[1].textContent.includes('售卖空间5') && r0[2].textContent.trim() === 'su-4', '首行=cache/售卖空间5/su-4（三列结构）');
const inputRow = suRows[1].cells;
ok(inputRow[0].textContent.trim() === 'input' && inputRow[0].rowSpan === 2, 'input fn td rowspan=2（合并）');
ok(suRows[2].cells[0].textContent.trim() === 'su-2', 'input 第二行（su-2）空间列被合并');
ok(suRows[3].cells[0].textContent.trim() === 'output', 'output 独立 fn td（新合并组）');
const suHead = Array.from(document.querySelector('#saleunit-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(suHead.length === 15 && suHead[0] === 'Function' && suHead[1] === '售卖空间' && suHead[2] === '售卖单元', '售卖单元表头 15 列，前三列=Function/售卖空间/售卖单元');

// ===== 5. SU 弹窗：fn→空间→度量（度量=空间配置；pair 只增不减） =====
section('5. SU 弹窗');
window.openSuConfirmModal();
document.getElementById('su-fn-select').value = 'input';
window.onSuFnChange();
ok(document.getElementById('su-confirm-body').textContent.includes('已创建 2 个售卖单元'), 'input+sp2 已创建组提示（只增不减）');
const disabledCnt5 = document.querySelectorAll('#su-confirm-body input.su-leaf:checked:disabled').length;
ok(disabledCnt5 === 3, '已确认 pair（输入128K～1M、输出0～4K、输出16K+去重后3个）置灰: ' + disabledCnt5);
ok(document.querySelectorAll('#su-confirm-body .su-leaf').length === 6, '度量候选=空间配置（3+3=6，第22轮非全量）');
const opts5 = Array.from(document.getElementById('su-space-select').options).map(o => o.value);
ok(opts5.join(',').includes('sp2') && opts5.join(',').includes('sp3'), '空间下拉含 input 名下空间（sp2/sp3）');
// 换空间到 sp3（input 第二空间，无单元）→ 无置灰、度量=sp3 配置
window.eval('document.getElementById("su-space-select").value = "sp3"; onSuSpaceChange();');
ok(document.querySelectorAll('#su-confirm-body input.su-leaf:disabled').length === 0, '切到 sp3（未创建组）后度量可勾');
ok(document.querySelectorAll('#su-confirm-body .su-leaf').length === 3, 'sp3 度量候选=其配置（单维度 3 个）');
const dimTitle5 = Array.from(document.querySelectorAll('#su-confirm-body p.text-xs.font-semibold')).map(p => p.textContent.trim());
ok(dimTitle5.join(',') === '输入token区间', 'sp3 仅展示空间定义的维度（输入token区间）');
window.eval('closeModal("su-confirm")');

// ===== 6. 批量创建空间：fn+维度+度量；同 fn 维度集合相同拦截；名称自增 =====
section('6. 批量创建售卖空间');
window.eval('openSpaceBulkModal()');
ok(document.querySelectorAll('.space-row').length === 1, '弹窗默认 1 行');
// 行1：output + 购买量区间（fn 内唯一组合 → 成功）
document.querySelectorAll('.space-row')[0].querySelector('.space-row-fn').value = 'output';
document.querySelectorAll('.space-row')[0].querySelectorAll('.space-dim-check').forEach(c => { c.checked = c.value === '购买量区间'; });
document.querySelectorAll('.space-row')[0].querySelector('.space-dim-check[value="购买量区间"]').dispatchEvent(new window.Event('change', { bubbles: true }));
ok(document.querySelectorAll('.space-row')[0].querySelectorAll('.space-msr-check').length === 3, '勾维度后展开度量（默认全选 3）');
// 行2：input + 输入token区间+输出token区间（与 sp2 重复 → 整体拦截）
window.eval('addSpaceRow()');
document.querySelectorAll('.space-row')[1].querySelector('.space-row-fn').value = 'input';
document.querySelectorAll('.space-row')[1].querySelectorAll('.space-dim-check').forEach(c => { c.checked = ['输入token区间', '输出token区间'].includes(c.value); });
document.querySelectorAll('.space-row')[1].querySelector('.space-dim-check[value="输入token区间"]').dispatchEvent(new window.Event('change', { bubbles: true }));
alertMsg = '';
window.confirmSpaceBulk();
ok(alertMsg.includes('已存在维度集合相同'), '同 fn 维度集合相同 → 拦截提交（第22轮不再静默跳过）: ' + alertMsg.slice(0, 24));
ok(evalInPage('spaceSeq') === 5, '拦截时未创建任何空间');
// 删除重复行后提交 → 创建 sp6
document.querySelectorAll('.space-row')[1].remove();
alertMsg = '';
window.confirmSpaceBulk();
ok(alertMsg.includes('已创建 1 个售卖空间'), 'output+购买量区间 创建成功: ' + alertMsg.slice(0, 20));
ok(alertMsg.includes('售卖空间6'), '名称自增=售卖空间6');
ok(evalInPage('spaces["sp6"].fn === "output" && spaces["sp6"].dims.join(",") === "购买量区间"'), '新空间 fn=output/dims=[购买量区间]');
ok(evalInPage('spaces["sp6"].measures["购买量区间"].length') === 3, '新空间度量=勾选集合（默认全选 3）');
ok(evalInPage('spaceSeq') === 6, 'spaceSeq=6（跨 fn 连续编号）');
// 行为空维度拦截
window.eval('openSpaceBulkModal()');
alertMsg = '';
window.confirmSpaceBulk();
ok(alertMsg.includes('至少勾选一个维度'), '空维度行拦截: ' + alertMsg);
window.eval('closeModal("space-edit")');

// ===== 7. 编辑度量：可增减；被引用置灰；维度不可变 =====
section('7. 编辑度量');
window.eval('editSpaceMeasures("sp2")');
ok(document.getElementById('space-measure-edit-title').textContent.includes('售卖空间2'), '编辑弹窗标题含空间名');
const lockedM = document.querySelector('.sme-check[data-dim="输入token区间"][data-measure="128K～1M"]');
ok(lockedM && lockedM.disabled && lockedM.checked, '被 su-1 引用的 128K～1M 置灰不可删');
const freeM = document.querySelector('.sme-check[data-dim="输入token区间"][data-measure="1M+"]');
ok(freeM && !freeM.disabled && freeM.checked, '未被引用的 1M+ 可编辑');
freeM.checked = false;
alertMsg = '';
window.confirmSpaceMeasureEdit();
ok(!evalInPage('spaces["sp2"].measures["输入token区间"]').includes('1M+') && evalInPage('spaces["sp2"].measures["输入token区间"].length') === 2, '1M+ 移除成功（2 个度量）');
ok(evalInPage('spaces["sp2"].dims.length') === 2, '维度不变');
// 无引用空间（sp3：input 第二空间，无售卖单元）全部取消 → 拦截
window.eval('editSpaceMeasures("sp3")');
ok(document.querySelectorAll('.sme-check:disabled').length === 0, 'sp3 无引用度量（全部可编辑）');
document.querySelectorAll('.sme-check:not([disabled])').forEach(c => { c.checked = false; });
alertMsg = '';
window.confirmSpaceMeasureEdit();
ok(alertMsg.includes('至少保留一个度量'), '维度度量全空拦截: ' + alertMsg);
window.eval('closeModal("space-measure-edit")');
ok(evalInPage('spaces["sp3"].measures["输入token区间"].length') === 3, '拦截时配置未变（仍 3 个）');

// ===== 8. 售卖计划区块2：筛选 + 跨 fn 累积勾选 =====
section('8. 售卖计划区块2');
window.eval('openPlanCreatePage()');
ok(!!document.getElementById('plan-filter-fn') && !!document.getElementById('plan-filter-space'), '区块2 含 function/空间筛选下拉');
const allUnitRows = Array.from(document.querySelectorAll('.plan-unit-row'));
ok(allUnitRows.length === 4, '全量售卖单元 4 行');
window.toggleAllPlanUnits(); // 全选→全不选
document.querySelector('.plan-unit-check[value="su-1"]').checked = true;
document.getElementById('plan-filter-fn').value = 'input';
window.applyPlanUnitFilter();
const visibleRows = Array.from(document.querySelectorAll('.plan-unit-row')).filter(r => !r.classList.contains('hidden'));
ok(visibleRows.length === 2, '筛选 input 后可见 2 行（未勾选的 input su-2 + 已勾选 su-1）: ' + visibleRows.length);
document.getElementById('plan-filter-fn').value = 'output';
window.applyPlanUnitFilter();
const visibleRows2 = Array.from(document.querySelectorAll('.plan-unit-row')).filter(r => !r.classList.contains('hidden'));
ok(visibleRows2.length === 2, '切到 output 筛选：已勾选 su-1 + output 的 su-3 可见: ' + visibleRows2.length);
ok(visibleRows2.some(r => r.textContent.includes('su-1')), '已勾选的 su-1 不受筛选影响（跨 function 累积）');
document.querySelector('.plan-unit-check[value="su-3"]').checked = true;
ok(window.eval('Array.from(document.querySelectorAll(".plan-unit-check:checked")).length') === 2, '跨 fn 已累积勾选 2 个售卖单元');

// ===== 9. vtpm 商品回归（无 function：单配置卡 fn=''） =====
section('9. vtpm 回归');
window.eval('closePlanCreatePage(); backToList()');
window.openDetailByCode('maas-product-vtpm-std');
window.eval('switchInnerTab("space")');
const vCards = Array.from(document.querySelectorAll('#fn-space-cards > div'));
ok(vCards.length === 1, '无 fn 商品=单张配置卡');
ok(vCards[0].textContent.includes('—（无 function）'), 'fn 显示 —（无 function）');
ok(vCards[0].textContent.includes('售卖空间1'), '当前空间=售卖空间1');
ok(evalInPage('currentSpaceOfFn("")') === 'sp1', 'currentSpaceOfFn("")=sp1（mock 配置）');
const vRows = Array.from(document.querySelectorAll('#space-tbody tr'));
ok(vRows.length === 1 && vRows[0].textContent.includes('售卖空间1'), '空间列表仅 sp1（fn="" 归属）');
// 切当前空间 vtpm：清配置 → 回退 sp1（唯一）
window.eval('startEdit(); setFnSpace("", "")');
ok(evalInPage('currentSpaceOfFn("")') === 'sp1', '清配置回退 sp1（fn 空串最早空间）');
window.eval('backToList()');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
