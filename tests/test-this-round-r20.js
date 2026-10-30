// 第20轮验证：function 不是维度而是「按什么卖」；售卖空间/空间计划概念落地
// 覆盖：①售卖单元前三列=function（合并）/售卖空间（合并）/售卖单元 ②一个 function 某时刻只能在一个空间（effSpaceOfFn 推导）
// ③售卖空间 Tab（默认空间+空间维度度量+空间卡片）④空间计划三态+优先级+生效起止 ⑤SU 弹窗 fn→空间→度量 ⑥售卖计划区块2 筛选跨 fn 累积
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

// ===== 0. glm4 示例商品 mock 校验 =====
section('0. mock 数据');
ok(evalInPage('allProducts.some(p => p.code === "maas-online-text-glm4")'), '存在 online-text 示例商品 glm4');
ok(evalInPage('defaultSaleUnits["maas-online-text-glm4"].every(u => u.fn && u.spaceKey && !u.dim.includes("function"))'), 'glm4 售卖单元均有 fn/spaceKey 且 dim 不含 function');
ok(evalInPage('defaultSpaces["sp-a"] && defaultSpaces["sp-txt-std"] && defaultSpaces["sp-txt-lite"]'), '默认空间池 sp-a/sp-txt-std/sp-txt-lite 存在');

// ===== 1. 详情页售卖空间 Tab =====
section('1. 售卖空间 Tab');
window.openDetailByCode('maas-online-text-glm4');
ok(!!document.querySelector('.admin-tab[data-tab="space"]'), '详情页含「售卖空间」Tab 按钮');
window.eval('switchInnerTab("space")');
ok(!document.getElementById('inner-tab-space').classList.contains('hidden'), '售卖空间 Tab 面板可切换');
const mgmtTxt = document.getElementById('space-mgmt-container').textContent;
ok(mgmtTxt.includes('function: input') && mgmtTxt.includes('function: output') && mgmtTxt.includes('function: cache'), '空间管理区按 function 展示三卡');
ok(mgmtTxt.includes('当前生效空间') && mgmtTxt.includes('默认空间'), '每 fn 卡含当前生效空间与默认空间');
ok(mgmtTxt.includes('文本标准空间') && mgmtTxt.includes('文本轻量空间'), '空间卡片展示空间名');

// ===== 2. 空间计划列表（三态+优先级+生效起止） =====
section('2. 空间计划');
const spRows = Array.from(document.querySelectorAll('#spaceplan-tbody tr'));
// glm4 mock：2 已发布计划 → input+output(计划1) + cache(计划2) = 3 个空间计划单元
ok(spRows.length === 3, '空间计划单元 3 行（input/output/cache）: ' + spRows.length);
ok(spRows.every(r => r.textContent.includes('已发布')), 'mock 空间计划全部已发布');
ok(spRows[0].textContent.includes('input') && spRows[0].textContent.includes('文本标准空间'), 'spu-1-input → 文本标准空间');
ok(spRows.some(r => r.textContent.includes('cache') && r.textContent.includes('文本轻量空间')), 'cache → 文本轻量空间');
const spHead = Array.from(document.querySelector('#spaceplan-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(spHead[0] === '空间计划单元' && spHead[4] === 'Function' && spHead[5] === '售卖空间', '空间计划列表列：空间计划单元/状态/类型/所属空间计划/Function/售卖空间…');

// ===== 3. effSpaceOfFn 推导（一个 function 某时刻只能在一个空间；生效计划优先级>默认空间） =====
section('3. 生效空间推导');
ok(evalInPage('effSpaceOfFn("input")') === 'sp-txt-std', 'input 生效空间=sp-txt-std（空间计划指定）');
ok(evalInPage('effSpaceOfFn("cache")') === 'sp-txt-lite', 'cache 生效空间=sp-txt-lite');
// 停用全部空间计划 → 回退默认空间
window.eval('startEdit()');
window.eval('spacePlanStatuses = spacePlanStatuses.map(() => "stopped"); renderSpaceTab();');
ok(evalInPage('effSpaceOfFn("input")') === 'sp-txt-std', '计划全停用后 input 回退默认空间 sp-txt-std');
ok(evalInPage('effSpaceOfFn("cache")') === 'sp-txt-lite', '计划全停用后 cache 回退默认空间 sp-txt-lite');

// ===== 4. 售卖单元 Tab 前三列合并 =====
section('4. 售卖单元前三列');
window.eval('switchInnerTab("saleunit"); renderSaleUnits();');
const suRows = Array.from(document.querySelectorAll('#saleunit-tbody tr'));
ok(suRows.length === 4, 'glm4 售卖单元 4 行');
// 排序：cache(sp-txt-lite)&input/output(sp-txt-std)；fn 字典序 cache<input<output
// 首行 fn=cache（rs=1，仅一个 cache 单元），space td 命中
const r0 = suRows[0].cells;
ok(r0[0].textContent.trim() === 'cache' && r0[1].textContent.includes('文本轻量空间') && r0[2].textContent.trim() === 'su-4', '首行=cache/文本轻量空间/su-4（三列结构）');
// input 组 2 行：fn td rowspan=2；第二行空间被合并
const inputRow = suRows[1].cells;
ok(inputRow[0].textContent.trim() === 'input' && inputRow[0].rowSpan === 2, 'input fn td rowspan=2（合并）');
ok(suRows[2].cells[0].textContent.trim() === 'su-2', 'input 第二行（su-2）空间列被合并');
ok(suRows[3].cells[0].textContent.trim() === 'output', 'output 独立 fn td（新合并组）');
// su 表头 15 列
const suHead = Array.from(document.querySelector('#saleunit-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(suHead.length === 15 && suHead[0] === 'Function' && suHead[1] === '售卖空间' && suHead[2] === '售卖单元' && suHead[3] === '状态', '售卖单元表头 15 列，前四列=Function/售卖空间/售卖单元/状态');

// ===== 5. SU 弹窗：fn→空间→度量；一个 fn+空间只能有一组 =====
section('5. SU 弹窗');
window.openSuConfirmModal();
document.getElementById('su-fn-select').value = 'input';
window.onSuFnChange();
ok(document.getElementById('su-confirm-body').textContent.includes('已创建 2 个售卖单元'), 'input+sp-txt-std 已创建组提示');
// 已创建组全 disabled
const disabledCnt = document.querySelectorAll('#su-confirm-body input.su-leaf:checked:disabled').length;
const totalCnt = document.querySelectorAll('#su-confirm-body input.su-leaf').length;
ok(totalCnt > 0 && disabledCnt === totalCnt, '该 fn+空间 组已创建 → 全部度量置灰（' + disabledCnt + '/' + totalCnt + '）');
// 换空间到 sp-txt-lite → 可勾
document.getElementById('su-space-select').value = 'sp-txt-lite';
window.onSuSpaceChange();
ok(document.querySelectorAll('#su-confirm-body input.su-leaf:disabled').length === 0, '切换到未创建组的空间后度量可勾');
// 直接重复创建拦截
document.getElementById('su-space-select').value = 'sp-txt-std';
window.onSuSpaceChange();
alertMsg = '';
window.confirmSaleUnits();
ok(alertMsg.includes('已存在售卖单元'), '同 fn 同空间重复创建拦截: ' + alertMsg.slice(0, 20) + '…');
window.eval('closeModal("su-confirm")');

// ===== 6. 空间管理操作：新建空间（维度集合去重）+ 默认空间设置 =====
section('6. 空间管理操作');
// 6.1 先新建「中量空间」（0～128K + 16K+，与现有空间维度集合不同）
window.eval('openSpaceEdit()');
document.getElementById('space-edit-name').value = '中量空间';
document.querySelectorAll('#space-edit-dims .space-dim-check').forEach(c => {
  c.checked = (['0～128K', '16K+'].includes(c.value));
});
alertMsg = '';
window.confirmSpaceEdit();
ok(alertMsg.includes('已保存'), '新建空间成功: ' + alertMsg.slice(0, 20));
ok(evalInPage('Object.values(spaces).some(s => s.name === "中量空间")'), '新空间入池');
// 6.2 维度集合与 sp-txt-std 完全相同 → 拦截
window.eval('openSpaceEdit()');
document.getElementById('space-edit-name').value = '重复维度测试空间';
document.querySelectorAll('#space-edit-dims .space-dim-check').forEach(c => {
  if (['0～128K', '128K～1M', '1M+', '0～4K', '4K～16K', '16K+'].includes(c.value)) c.checked = true;
});
alertMsg = '';
window.confirmSpaceEdit();
ok(alertMsg.includes('维度集合相同'), '维度集合相同空间拦截（同维度=同一空间）: ' + alertMsg.slice(0, 24) + '…');
// 默认空间设置（cache → 超轻量空间）
window.eval('setDefaultSpaceOfFn("cache")');
document.getElementById('spu-default-select').value = evalInPage('Object.keys(spaces).find(k => spaces[k].name === "中量空间")');
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已设置默认售卖空间'), '默认空间设置成功');
ok(evalInPage('defaultSpaceByFn["cache"].spaceKey') === evalInPage('Object.keys(spaces).find(k => spaces[k].name === "中量空间")'), 'cache 默认空间已更新');

// ===== 7. 空间计划：创建/发布/优先级 =====
section('7. 空间计划');
window.eval('openSpacePlanModal()');
document.getElementById('spu-name').value = '测试空间计划·cache迁移';
document.getElementById('spu-priority').value = '999';
document.getElementById('spu-eff-start').value = '2026-10-01T00:00:00';
document.getElementById('spu-eff-end').value = '2027-11-01T00:00:00';
// 仅纳入 cache → 超轻量空间
document.querySelectorAll('.spu-fn-enable').forEach(c => { c.checked = c.dataset.fn === 'cache'; });
const liteK = evalInPage('Object.keys(spaces).find(k => spaces[k].name === "中量空间")');
document.querySelector('.spu-fn-space[data-fn="cache"]').value = liteK;
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存'), '空间计划创建成功（待发布）');
ok(evalInPage('spacePlans[spacePlans.length-1].name') === '测试空间计划·cache迁移', '新空间计划入列');
ok(evalInPage('spacePlanStatuses[spacePlanStatuses.length-1]') === 'pending_publish', '新空间计划=待发布');
// 发布后优先级 999 → cache 生效空间切到超轻量空间（一个 fn 某时刻只在一个空间）
window.eval('publishSpacePlan(spacePlans.length - 1)');
ok(evalInPage('effSpaceOfFn("cache")') === liteK, '高优先级空间计划发布后 cache 生效空间=超轻量空间');
// 停用 → 回退默认空间（第6步已把默认设为超轻量空间，改默认回 sp-txt-lite 再验证）
window.eval('defaultSpaceByFn["cache"] = { fn: "cache", spaceKey: "sp-txt-lite" };');
window.eval('stopSpacePlan(spacePlans.length - 1)');
ok(evalInPage('effSpaceOfFn("cache")') === 'sp-txt-lite', '停用后回退默认空间 sp-txt-lite');

// ===== 8. 售卖计划区块2：筛选 + 跨 fn 累积勾选 =====
section('8. 售卖计划区块2');
window.eval('openPlanCreatePage()');
ok(!!document.getElementById('plan-filter-fn') && !!document.getElementById('plan-filter-space'), '区块2 含 function/空间筛选下拉');
const allUnitRows = Array.from(document.querySelectorAll('.plan-unit-row'));
ok(allUnitRows.length === 4, '全量售卖单元 4 行');
// 首渲染默认全选 → 先全不选（toggle 切换），保留目标勾选
window.toggleAllPlanUnits(); // 全选→全不选
document.querySelector('.plan-unit-check[value="su-1"]').checked = true;
// 筛选 fn=input → 未勾选行仅 input 可见（su-2），已勾选 su-1 仍可见
document.getElementById('plan-filter-fn').value = 'input';
window.applyPlanUnitFilter();
const visibleRows = Array.from(document.querySelectorAll('.plan-unit-row')).filter(r => !r.classList.contains('hidden'));
ok(visibleRows.length === 2, '筛选 input 后可见 2 行（未勾选的 input su-2 + 已勾选 su-1）: ' + visibleRows.length);
// 切筛选 fn=output → su-1（已勾选）+ su-3（未勾选 output）可见，su-2 隐藏（跨 fn 累积）
document.getElementById('plan-filter-fn').value = 'output';
window.applyPlanUnitFilter();
const visibleRows2 = Array.from(document.querySelectorAll('.plan-unit-row')).filter(r => !r.classList.contains('hidden'));
ok(visibleRows2.length === 2, '切到 output 筛选：已勾选 su-1 + output 的 su-3 可见: ' + visibleRows2.length);
ok(visibleRows2.some(r => r.textContent.includes('su-1')), '已勾选的 su-1 不受筛选影响（跨 function 累积）');
// 勾选 su-3（output）→ 两 fn 各一单元进入计划
document.querySelector('.plan-unit-check[value="su-3"]').checked = true;
ok(window.eval('Array.from(document.querySelectorAll(".plan-unit-check:checked")).length') === 2, '跨 fn 已累积勾选 2 个售卖单元');

// ===== 9. vtpm 商品回归（无 function） =====
section('9. vtpm 回归');
window.eval('closePlanCreatePage(); exitEdit(); backToList()');
window.openDetailByCode('maas-product-vtpm-std');
window.eval('switchInnerTab("space")');
const vtMgmt = document.getElementById('space-mgmt-container').textContent;
ok(vtMgmt.includes('该商品类型不含 function'), 'vtpm 空间管理提示不含 function');
ok(vtMgmt.includes('标准空间A'), 'vtpm 展示标准空间A卡片');
window.eval('renderSpaceTab()');
ok(document.querySelectorAll('#spaceplan-tbody tr').length === 1 && document.querySelector('#spaceplan-tbody').textContent.includes('暂无'), 'vtpm 无空间计划（空态）');
window.eval('switchInnerTab("saleunit")');
const vRows = document.querySelectorAll('#saleunit-tbody tr');
ok(vRows[0].cells[0].textContent.trim() === '—', 'vtpm Function 列=—');
// 销毁场景收尾
console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
