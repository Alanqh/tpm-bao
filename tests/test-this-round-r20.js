// 第20/21/22/23轮验证：function 是「按什么卖」；售卖空间属于 function（只管维度，第23轮）
// 第23轮：空间无 measures 字段；fn 配置卡合并进单一列表（Function 列 rowspan + 状态列 + 行内设为生效 setSpaceActive）；SU 度量候选=全量
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

// ===== 0. glm4 示例商品 mock 校验（第23轮空间模型：只管维度） =====
section('0. mock 数据');
ok(evalInPage('allProducts.some(p => p.code === "maas-online-text-glm4")'), '存在 online-text 示例商品 glm4');
ok(evalInPage('defaultSaleUnits["maas-online-text-glm4"].every(u => u.fn && u.spaceKey && !u.dim.includes("function"))'), 'glm4 售卖单元均有 fn/spaceKey 且 dim 不含 function');
ok(evalInPage('defaultSpaces["sp2"].fn === "input" && defaultSpaces["sp4"].fn === "output" && defaultSpaces["sp5"].fn === "cache"'), '空间模型含 fn 归属（sp2=input/sp4=output/sp5=cache）');
ok(evalInPage('defaultSpaces["sp2"].dims.join(",") === "输入token区间,输出token区间"'), '空间含维度集合');
ok(evalInPage('defaultSpaces["sp2"].measures === undefined'), '空间无 measures 字段（第23轮只管维度）');
ok(evalInPage('defaultFnSpaceMap["maas-online-text-glm4"]["input"] === "sp2"'), 'mock fnSpaceMap：input→sp2');

// ===== 1. 售卖空间 Tab：第一个 Tab，默认打开；单一合并列表 =====
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
ok(!document.getElementById('fn-space-cards'), 'fn 配置卡已删（第23轮合并进列表）');
ok(!!document.getElementById('space-tbody'), '含售卖空间列表表');

// ===== 2. 合并列表渲染：fn 分组 rowspan + 状态列 + 操作列 =====
section('2. 合并空间列表');
const spRows = Array.from(document.querySelectorAll('#space-tbody tr'));
ok(spRows.length === 4, '空间列表 4 行（sp2/sp3/sp4/sp5；sp1 属无 fn 不在池）');
const spHead = Array.from(document.querySelector('#space-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(spHead.length === 6 && spHead[0] === 'Function' && spHead[1] === '售卖空间' && spHead[2] === '状态' && spHead[3] === '空间维度', '空间列表 6 列（Function/售卖空间/状态/空间维度/售卖单元数/操作）');
ok(spRows[0].cells[0].textContent.trim() === 'cache', '首行 fn=cache（字典序分组在前）');
ok(spRows[1].cells[0].textContent.trim() === 'input' && spRows[1].cells[0].rowSpan === 2, 'input fn td rowspan=2（sp2+sp3 合并）');
ok(spRows[2].cells.length === 5, 'input 第二行（sp3）无 fn 列（合并后 5 cells）');
ok(spRows[3].cells[0].textContent.trim() === 'output', 'output 独立 fn td（新合并组）');
ok(spRows[1].cells[1].textContent.includes('售卖空间2') && spRows[1].cells[4].textContent.trim() === '2', '售卖空间2 行售卖单元数=2');
ok(spRows[1].cells[3].textContent.includes('输入token区间 + 输出token区间'), '维度列展示维度集合（sp2 两 token 维度）');
ok(spRows[0].cells[2].textContent.includes('生效中') && spRows[1].cells[2].textContent.includes('生效中') && spRows[3].cells[2].textContent.includes('生效中'), 'sp5/sp2/sp4 状态=生效中（mock 配置）');
ok(spRows[2].cells[1].textContent.includes('未生效'), 'sp3（input 第二空间）=未生效');
ok(spRows[0].cells[5].textContent.trim() === '—' && spRows[1].cells[5].textContent.trim() === '—', '生效中行操作=—');
ok(spRows[2].cells[4].textContent.includes('设为生效'), '未生效行显示设为生效（浏览态 🔒）');

// ===== 3. currentSpaceOfFn（配置优先 → 回退最早）与 setSpaceActive =====
section('3. 生效空间推导与切换');
ok(evalInPage('currentSpaceOfFn("input")') === 'sp2', 'input 生效空间=sp2（mock 配置）');
ok(evalInPage('currentSpaceOfFn("cache")') === 'sp5', 'cache 生效空间=sp5');
window.eval('startEdit()');
// 清除显式配置 → 回退 input 最早空间
window.eval('fnSpaceMap["input"] = ""');
ok(evalInPage('currentSpaceOfFn("input")') === 'sp2', '清配置回退 input 最早空间 sp2');
// 设为生效：切 sp3 → 再切回 sp2
window.eval('setSpaceActive("sp3")');
ok(evalInPage('currentSpaceOfFn("input")') === 'sp3', 'setSpaceActive 切 input→sp3');
window.eval('setSpaceActive("sp2")');
ok(evalInPage('currentSpaceOfFn("input")') === 'sp2', 'setSpaceActive 切回 sp2');
// 未持锁：setSpaceActive 被 guardEdit 拦截
window.eval('exitEdit()');
alertMsg = '';
window.eval('setSpaceActive("sp3")');
ok(evalInPage('currentSpaceOfFn("input")') === 'sp2' && alertMsg.includes('变更'), '未持锁设为生效被拦截（guardEdit）');

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

// ===== 5. SU 弹窗：fn→空间（默认=生效空间）→ 度量（候选=全量；pair 只增不减） =====
section('5. SU 弹窗');
window.eval('startEdit()');
window.openSuConfirmModal();
document.getElementById('su-fn-select').value = 'input';
window.onSuFnChange();
ok(document.getElementById('su-confirm-body').textContent.includes('已创建 2 个售卖单元'), 'input+sp2 已创建组提示（只增不减）');
const disabledCnt5 = document.querySelectorAll('#su-confirm-body input.su-leaf:checked:disabled').length;
ok(disabledCnt5 === 3, '已确认 pair（输入128K～1M、输出0～4K、输出16K+去重后3个）置灰: ' + disabledCnt5);
ok(document.querySelectorAll('#su-confirm-body .su-leaf').length === 6, '度量候选=全量（输入3+输出3=6；空间只管维度）');
const opts5 = Array.from(document.getElementById('su-space-select').options).map(o => o.value);
ok(opts5.join(',').includes('sp2') && opts5.join(',').includes('sp3'), '空间下拉含 input 名下空间（sp2/sp3）');
// 换空间到 sp3（input 第二空间，无单元）→ 无置灰、度量=全量单维度
window.eval('document.getElementById("su-space-select").value = "sp3"; onSuSpaceChange();');
ok(document.querySelectorAll('#su-confirm-body input.su-leaf:disabled').length === 0, '切到 sp3（未创建组）后度量可勾');
ok(document.querySelectorAll('#su-confirm-body .su-leaf').length === 3, 'sp3 度量候选=全量单维度 3 个');
const dimTitle5 = Array.from(document.querySelectorAll('#su-confirm-body p.text-xs.font-semibold')).map(p => p.textContent.trim());
ok(dimTitle5.join(',') === '输入token区间', 'sp3 仅展示空间定义的维度（输入token区间）');
window.eval('closeModal("su-confirm")');

// ===== 6. 批量创建空间：fn+维度；同 fn 维度集合相同拦截；名称自增 =====
section('6. 批量创建售卖空间');
window.eval('openSpaceBulkModal()');
ok(document.querySelectorAll('.space-row').length === 1, '弹窗默认 1 行');
// 行1：output + 购买量区间（fn 内唯一组合 → 成功）
document.querySelectorAll('.space-row')[0].querySelector('.space-row-fn').value = 'output';
document.querySelectorAll('.space-row')[0].querySelectorAll('.space-dim-check').forEach(c => { c.checked = c.value === '购买量区间'; });
ok(document.querySelectorAll('.space-row')[0].querySelectorAll('.space-msr-check').length === 0, '创建弹窗只勾维度（无度量勾选，第23轮）');
// 行2：input + 输入token区间+输出token区间（与 sp2 重复 → 整体拦截）
window.eval('addSpaceRow()');
document.querySelectorAll('.space-row')[1].querySelector('.space-row-fn').value = 'input';
document.querySelectorAll('.space-row')[1].querySelectorAll('.space-dim-check').forEach(c => { c.checked = ['输入token区间', '输出token区间'].includes(c.value); });
alertMsg = '';
window.confirmSpaceBulk();
ok(alertMsg.includes('不可重复创建'), '同 fn 维度集合相同 → 拦截提交: ' + alertMsg.slice(0, 24));
ok(evalInPage('spaceSeq') === 5, '拦截时未创建任何空间');
// 删除重复行后提交 → 创建 sp6
document.querySelectorAll('.space-row')[1].remove();
alertMsg = '';
window.confirmSpaceBulk();
ok(alertMsg.includes('已创建 1 个售卖空间'), 'output+购买量区间 创建成功: ' + alertMsg.slice(0, 20));
ok(alertMsg.includes('售卖空间6'), '名称自增=售卖空间6');
ok(evalInPage('spaces["sp6"].fn === "output" && spaces["sp6"].dims.join(",") === "购买量区间"'), '新空间 fn=output/dims=[购买量区间]');
ok(evalInPage('spaces["sp6"].measures === undefined'), '新空间无 measures 字段（只管维度）');
ok(evalInPage('spaceSeq') === 6, 'spaceSeq=6（跨 fn 连续编号）');
// 行为空维度拦截
window.eval('openSpaceBulkModal()');
alertMsg = '';
window.confirmSpaceBulk();
ok(alertMsg.includes('至少勾选一个维度'), '空维度行拦截: ' + alertMsg);
window.eval('closeModal("space-edit")');

// ===== 7. 编辑度量功能已删除（第23轮） =====
section('7. 编辑度量（已删除）');
ok(!document.getElementById('modal-space-measure-edit'), '编辑度量弹窗已移除（第23轮）');
ok(evalInPage('typeof editSpaceMeasures') === 'undefined', 'editSpaceMeasures 函数已删');
ok(evalInPage('typeof confirmSpaceMeasureEdit') === 'undefined', 'confirmSpaceMeasureEdit 函数已删');
ok(evalInPage('spaces["sp2"].dims.length') === 2, 'sp2 维度集合不变（2 个）');

// ===== 8. 售卖计划区块2：fn 多选筛选 + 空间筛（全部/仅生效中）+ 超范围勾选自动取消（第24轮） =====
section('8. 售卖计划区块2');
window.eval('openPlanCreatePage()');
const fnBoxes8 = () => Array.from(document.querySelectorAll('.plan-filter-fn-check:not(.plan-filter-fn-all)'));
ok(fnBoxes8().length === 3 && !!document.querySelector('.plan-filter-fn-all'), 'function 复选组 3 个 + 全选框（第24轮）');
ok(!!document.getElementById('plan-filter-space'), '含售卖空间筛选下拉（全部空间/仅生效中）');
const allUnitRows = Array.from(document.querySelectorAll('.plan-unit-row'));
ok(allUnitRows.length === 4, '全量售卖单元 4 行');
const vis8 = () => Array.from(document.querySelectorAll('.plan-unit-row')).filter(r => !r.classList.contains('hidden')).map(r => r.querySelector('.plan-unit-check').value);
const chk8 = () => Array.from(document.querySelectorAll('.plan-unit-check:checked')).map(c => c.value);
ok(vis8().length === 4, '进入创建页筛选重置=全部可见');
// T1: 只勾 cache+output fn → 可见 su-3/su-4，input 的已勾选被取消（applyPlanUnitFilter 重渲后须重新查询 fn 复选框）
fnBoxes8().forEach(c => { c.checked = ['cache', 'output'].includes(c.value); });
window.applyPlanUnitFilter();
ok(vis8().sort().join(',') === 'su-3,su-4', 'fn 勾 cache+output 可见 su-3/su-4: ' + vis8().join(','));
ok(chk8().sort().join(',') === 'su-3,su-4', '超范围勾选自动取消（su-1/su-2 被清）: ' + chk8().join(','));
// fn 全不勾（=全部）→ 4 行恢复可见，已取消的勾选不恢复
fnBoxes8().forEach(c => { c.checked = false; });
window.applyPlanUnitFilter();
ok(vis8().length === 4 && chk8().sort().join(',') === 'su-3,su-4', 'fn 清空=全部可见；已取消的勾选不恢复');
// T2: 勾回 su-1（input），再筛 fn=output → su-1 被取消
document.querySelector('.plan-unit-check[value="su-1"]').checked = true;
fnBoxes8().forEach(c => { c.checked = c.value === 'output'; });
window.applyPlanUnitFilter();
ok(vis8().join(',') === 'su-3' && chk8().join(',') === 'su-3', '切 fn=output 后 su-1（input）已勾选被取消: ' + chk8().join(','));
// T3: 空间筛=仅生效中（fn 全部）：mock 四单元均在生成效空间（sp2/sp4/sp5）→ 全命中
fnBoxes8().forEach(c => { c.checked = false; });
document.getElementById('plan-filter-space').value = '__ACTIVE__';
window.applyPlanUnitFilter();
ok(vis8().length === 4, '仅生效中：mock 单元均在生成效空间: ' + vis8().length);
// T5: 全选/全不选只作用于当前可见行
document.getElementById('plan-filter-space').value = '';
fnBoxes8().forEach(c => { c.checked = c.value === 'input'; });
window.applyPlanUnitFilter(); // 可见 su-1/su-2，其余已勾选被取消
document.querySelector('.plan-unit-check[value="su-1"]').checked = false;
window.eval('renderPlanCreatePage()');
window.eval('toggleAllPlanUnits()');
ok(chk8().sort().join(',') === 'su-1,su-2', '全选只作用于可见行（input 2 个全选）: ' + chk8().join(','));
window.eval('toggleAllPlanUnits()');
ok(chk8().length === 0, '再点全不选清空可见行勾选');
// T6: 全选框联动
fnBoxes8().forEach(c => { c.checked = false; });
window.applyPlanUnitFilter();
document.querySelector('.plan-filter-fn-all').checked = true;
window.onPlanFnFilterToggleAll(document.querySelector('.plan-filter-fn-all'));
ok(fnBoxes8().every(c => c.checked), '全选框勾上→fn 子框全选');
ok(vis8().length === 4, '全选后全部可见');

// ===== 9. vtpm 商品回归（无 function：单一空间 sp1 生效中） =====
section('9. vtpm 回归');
window.eval('closePlanCreatePage(); backToList()');
window.openDetailByCode('maas-product-vtpm-std');
window.eval('switchInnerTab("space")');
const vRows = Array.from(document.querySelectorAll('#space-tbody tr'));
ok(vRows.length === 1, '无 fn 商品空间列表单行（sp1）');
ok(vRows[0].cells[0].textContent.trim() === '—', 'Function 列显示 —（无 function）');
ok(vRows[0].textContent.includes('售卖空间1'), '当前空间=售卖空间1');
ok(vRows[0].cells[2].textContent.includes('生效中'), 'sp1 状态=生效中');
ok(vRows[0].cells[5].textContent.trim() === '—', '唯一空间操作列=—（无第二空间可切换）');
ok(evalInPage('currentSpaceOfFn("")') === 'sp1', 'currentSpaceOfFn("")=sp1（mock 配置）');
window.eval('backToList()');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
