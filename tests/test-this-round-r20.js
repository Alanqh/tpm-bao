// 第20/21轮验证：function 是「按什么卖」；售卖空间属于 function（只选维度；名称序号自增）；空间计划三态
// 第21轮改版：售卖空间=第一个 Tab；Tab 内一张表=空间计划单元（空间维度融入行内）；批量创建空间弹窗（多行 fn+维度）
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

// ===== 0. glm4 示例商品 mock 校验（第21轮空间模型） =====
section('0. mock 数据');
ok(evalInPage('allProducts.some(p => p.code === "maas-online-text-glm4")'), '存在 online-text 示例商品 glm4');
ok(evalInPage('defaultSaleUnits["maas-online-text-glm4"].every(u => u.fn && u.spaceKey && !u.dim.includes("function"))'), 'glm4 售卖单元均有 fn/spaceKey 且 dim 不含 function');
ok(evalInPage('defaultSpaces["sp2"].fn === "input" && defaultSpaces["sp4"].fn === "output" && defaultSpaces["sp5"].fn === "cache"'), '空间模型含 fn 归属（sp2=input/sp4=output/sp5=cache）');
ok(evalInPage('defaultSpaces["sp2"].dims.join(",") === "输入token区间,输出token区间"'), '空间只含维度（无度量）');

// ===== 1. 售卖空间 Tab：第一个 Tab，默认打开 =====
section('1. 售卖空间 Tab');
window.openDetailByCode('maas-online-text-glm4');
const tabs = Array.from(document.querySelectorAll('#plan-tabs-card .admin-tab')).map(b => b.textContent.trim());
ok(tabs[0] === '售卖空间', '售卖空间是第一个 Tab');
const activeTab = document.querySelector('#plan-tabs-card .admin-tab.active');
ok(activeTab && activeTab.textContent.trim() === '售卖空间', '进入详情默认打开售卖空间 Tab');
ok(!!document.getElementById('spaceplan-tbody'), 'Tab 内为空间计划单元表');
ok(!!document.getElementById('space-new-btn') && document.getElementById('space-new-btn').textContent.includes('批量创建'), '含批量创建售卖空间按钮');
ok(!!document.getElementById('spaceplan-create-btn') && document.getElementById('spaceplan-create-btn').textContent.includes('创建空间计划'), '含创建空间计划按钮（在售卖空间 Tab 内）');

// ===== 2. 空间计划单元表：fn×计划展开 + 空间维度融入行内 =====
section('2. 空间计划单元表');
const spRows = Array.from(document.querySelectorAll('#spaceplan-tbody tr'));
ok(spRows.length === 3, '空间计划单元 3 行（input/output/cache）: ' + spRows.length);
ok(spRows.every(r => r.textContent.includes('已发布')), 'mock 空间计划全部已发布');
ok(spRows[0].textContent.includes('input') && spRows[0].textContent.includes('售卖空间2'), 'spu-1-input → 售卖空间2');
ok(spRows.some(r => r.textContent.includes('cache') && r.textContent.includes('售卖空间5')), 'cache → 售卖空间5');
ok(spRows.every(r => r.textContent.includes('输入token区间')), '每行内嵌空间维度信息');
const spHead = Array.from(document.querySelector('#spaceplan-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(spHead[0] === '空间计划单元' && spHead[4] === 'Function' && spHead[5] === '售卖空间' && spHead[6] === '空间维度', '列表列：…/Function/售卖空间/空间维度/…（第21轮加空间维度列）');

// ===== 3. effSpaceOfFn 推导（生效计划最高优先级 → 回退该 fn 最早空间） =====
section('3. 生效空间推导');
ok(evalInPage('effSpaceOfFn("input")') === 'sp2', 'input 生效空间=sp2（空间计划指定）');
ok(evalInPage('effSpaceOfFn("cache")') === 'sp5', 'cache 生效空间=sp5');
// 停用全部空间计划 → 回退各自 fn 最早空间（sp2 是 input 最早、sp4 是 output 最早、sp5 是 cache 唯一）
window.eval('startEdit()');
window.eval('spacePlanStatuses = spacePlanStatuses.map(() => "stopped"); renderSpaceTab();');
ok(evalInPage('effSpaceOfFn("input")') === 'sp2', '计划全停用后 input 回退 fn 最早空间 sp2');
ok(evalInPage('effSpaceOfFn("cache")') === 'sp5', '计划全停用后 cache 回退 sp5（唯一空间）');
ok(evalInPage('effSpaceOfFn("output")') === 'sp4', 'output 回退 sp4');

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

// ===== 5. SU 弹窗：fn→空间→度量（空间只定维度；度量=全量池；pair 只增不减） =====
section('5. SU 弹窗');
window.openSuConfirmModal();
document.getElementById('su-fn-select').value = 'input';
window.onSuFnChange();
ok(document.getElementById('su-confirm-body').textContent.includes('已创建 2 个售卖单元'), 'input+sp2 已创建组提示（只增不减）');
const disabledCnt5 = document.querySelectorAll('#su-confirm-body input.su-leaf:checked:disabled').length;
ok(disabledCnt5 === 3, '已确认 pair（输入128K～1M、输出0～4K、输出16K+去重后3个）置灰: ' + disabledCnt5);
const opts5 = Array.from(document.getElementById('su-space-select').options).map(o => o.value);
ok(opts5.join(',').includes('sp2') && opts5.join(',').includes('sp3'), '空间下拉含 input 名下空间（sp2/sp3）');
// 换空间到 sp3（input 第二空间，无单元）→ 无置灰
window.eval('document.getElementById("su-space-select").value = "sp3"; onSuSpaceChange();');
ok(document.querySelectorAll('#su-confirm-body input.su-leaf:disabled').length === 0, '切到 sp3（未创建组）后度量可勾');
const dimTitle5 = Array.from(document.querySelectorAll('#su-confirm-body p.text-xs.font-semibold')).map(p => p.textContent.trim());
ok(dimTitle5.join(',') === '输入token区间', 'sp3 仅展示空间定义的维度（输入token区间）');
window.eval('closeModal("su-confirm")');

// ===== 6. 批量创建空间：多行 fn+维度；fn 内去重；名称自增 =====
section('6. 批量创建售卖空间');
window.eval('openSpaceBulkModal()');
ok(document.querySelectorAll('.space-row').length === 1, '弹窗默认 1 行');
// 行1：output + 购买量区间（fn 内唯一组合 → 成功）
document.querySelectorAll('.space-row')[0].querySelector('.space-row-fn').value = 'output';
document.querySelectorAll('.space-row')[0].querySelectorAll('.space-dim-check').forEach(c => { c.checked = c.value === '购买量区间'; });
// 行2：input + 输入token区间+输出token区间（与 sp2 重复 → 跳过）
window.eval('addSpaceRow()');
document.querySelectorAll('.space-row')[1].querySelector('.space-row-fn').value = 'input';
document.querySelectorAll('.space-row')[1].querySelectorAll('.space-dim-check').forEach(c => { c.checked = ['输入token区间', '输出token区间'].includes(c.value); });
alertMsg = '';
window.confirmSpaceBulk();
ok(alertMsg.includes('已创建 1 个售卖空间') && alertMsg.includes('跳过 1 个'), '1 成功 + 1 去重跳过: ' + alertMsg.slice(0, 30) + '…');
ok(alertMsg.includes('售卖空间6'), '名称自增=售卖空间6');
ok(evalInPage('spaces["sp6"].fn === "output" && spaces["sp6"].dims.join(",") === "购买量区间"'), '新空间 fn=output/dims=[购买量区间]');
ok(evalInPage('spaceSeq') === 6, 'spaceSeq=6（跨 fn 连续编号）');
// 行为空维度拦截
window.eval('openSpaceBulkModal()');
alertMsg = '';
window.confirmSpaceBulk();
ok(alertMsg.includes('至少勾选一个维度'), '空维度行拦截: ' + alertMsg);
window.eval('closeModal("space-edit")');

// ===== 7. 空间计划：创建/发布/停用/优先级 =====
section('7. 空间计划');
window.eval('openSpacePlanModal()');
document.getElementById('spu-name').value = '测试空间计划·input迁移';
document.getElementById('spu-priority').value = '999';
document.getElementById('spu-eff-start').value = '2026-10-01T00:00:00';
document.getElementById('spu-eff-end').value = '2027-11-01T00:00:00';
// 仅纳入 input → 目标空间 sp3
document.querySelectorAll('.spu-fn-enable').forEach(c => { c.checked = c.dataset.fn === 'input'; });
document.querySelector('.spu-fn-space[data-fn="input"]').value = 'sp3';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存'), '空间计划创建成功（待发布）');
ok(evalInPage('spacePlans[spacePlans.length-1].name') === '测试空间计划·input迁移', '新空间计划入列');
ok(evalInPage('spacePlanStatuses[spacePlanStatuses.length-1]') === 'pending_publish', '新空间计划=待发布');
// 发布后优先级 999 → input 生效空间切到 sp3（一个 fn 某时刻只在一个空间）
window.eval('publishSpacePlan(spacePlans.length - 1)');
ok(evalInPage('effSpaceOfFn("input")') === 'sp3', '高优先级空间计划发布后 input 生效空间=sp3');
// 停用 → 回退 fn 最早空间（input 最早=sp2）
window.eval('stopSpacePlan(spacePlans.length - 1)');
ok(evalInPage('effSpaceOfFn("input")') === 'sp2', '停用后回退 input 最早空间 sp2');

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

// ===== 9. vtpm 商品回归（无 function；回退空态展示） =====
section('9. vtpm 回归');
window.eval('closePlanCreatePage(); exitEdit(); backToList()');
window.openDetailByCode('maas-product-vtpm-std');
window.eval('switchInnerTab("space")');
const vRows = Array.from(document.querySelectorAll('#spaceplan-tbody tr'));
ok(vRows.length === 1 && vRows[0].textContent.includes('回退'), 'vtpm 无空间计划 → 回退行（fn=@ 回退 售卖空间1）');
ok(vRows[0].textContent.includes('售卖空间1') && vRows[0].textContent.includes('购买量区间 + 购买周期'), '回退行内嵌空间名+维度');
// vtpm 建空间计划（无 fn：单单元）
window.eval('startEdit(); openSpacePlanModal()');
ok(!!document.querySelector('.spu-fn-space[data-fn=""]'), '无 fn 商品空间计划=单单元（fn 空）');
ok(document.querySelectorAll('.spu-fn-enable').length === 1, '一个隐藏 enable（恒选中）');
document.getElementById('spu-name').value = 'vtpm空间计划A';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存'), '无 fn 商品创建空间计划成功');
ok(evalInPage('spacePlans[spacePlans.length-1].fnSpaceMap[""]') === 'sp1', 'fnSpaceMap 含空 fn → sp1');
window.eval('backToList()');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
