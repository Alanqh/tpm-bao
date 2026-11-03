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
ok(evalInPage('defaultSpacePlans["maas-online-text-glm4"][0].fnSpaces.input === "sp2" && defaultSpacePlans["maas-online-text-glm4"][0].fnSpaces.output === "sp4" && defaultSpacePlans["maas-online-text-glm4"][0].fnSpaces.cache === "sp5"'), 'mock 常驻计划：input→sp2/output→sp4/cache→sp5（第32轮）');

// ===== 1. 售卖空间 Tab：第一个 Tab，默认打开；单一合并列表 =====
section('1. 售卖空间 Tab');
window.openDetailByCode('maas-online-text-glm4');
const tabs = Array.from(document.querySelectorAll('#plan-tabs-card .admin-tab')).map(b => b.textContent.trim());
ok(tabs[0] === '售卖空间', '售卖空间是第一个 Tab');
const activeTab = document.querySelector('#plan-tabs-card .admin-tab.active');
ok(activeTab && activeTab.textContent.trim() === '售卖空间', '进入详情默认打开售卖空间 Tab');
ok(!!document.getElementById('spaceplan-tbody'), '空间切换计划列表存在（第26轮：独立实体回归）');
ok(!document.getElementById('spaceplan-create-btn'), '创建空间计划按钮已移除');
ok(!!document.getElementById('modal-spaceplan'), '空间切换计划弹窗存在（第26轮：独立实体回归）');
ok(!!document.getElementById('spaceplan-new-btn'), '空间计划创建按钮存在（第31轮：唯一空间创建入口）');
ok(!document.getElementById('space-new-btn'), '第31轮：批量创建售卖空间按钮已删除（空间由空间计划创建）');
ok(!document.getElementById('fn-space-cards'), 'fn 配置卡已删（第23轮合并进列表）');
ok(!!document.getElementById('space-tbody'), '含售卖空间列表表');

// ===== 2. 合并列表渲染（第32轮：按时刻过滤——每 fn 一行生效空间；5 列无操作列） =====
section('2. 合并空间列表');
const spRows = Array.from(document.querySelectorAll('#space-tbody tr'));
ok(spRows.length === 3, '空间列表 3 行（当前时刻每 fn 至多一行：sp2/sp4/sp5；第32轮按时刻过滤）');
const spHead = Array.from(document.querySelector('#space-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(spHead.length === 5 && spHead[0] === 'Function' && spHead[1] === '售卖空间' && spHead[2] === '状态' && spHead[3] === '空间维度', '空间列表 5 列（Function/售卖空间/状态/空间维度/售卖单元数；第32轮删操作列）');
ok(spRows[0].cells[0].textContent.trim() === 'cache', '首行 fn=cache（字典序分组在前）');
ok(spRows[0].cells.length === 5, '每行 5 cells（每 fn 一行无 rowspan 合并）');
ok(spRows[2].cells[0].textContent.trim() === 'output', 'output 独立行');
const inputRow2 = spRows[1].cells;
ok(inputRow2[1].textContent.trim() === 'sp2' && inputRow2[4].textContent.trim() === '2', 'sp2 行售卖单元数=2（第35轮：空间列只显 code）');
ok(inputRow2[3].textContent.includes('输入token区间 + 输出token区间'), '维度列展示维度集合（sp2 两 token 维度）');
ok(spRows[0].cells[2].textContent.includes('生效中') && spRows[1].cells[2].textContent.includes('生效中') && spRows[2].cells[2].textContent.includes('生效中'), 'sp5/sp2/sp4 状态=生效中（常驻计划承载）');
ok(spRows.every(r => !r.cells[2].textContent.includes('计划「') && !r.cells[2].textContent.includes('起切换')), '状态列只留徽标（第35轮：胜出计划/切换预告标注已删）');

// ===== 3. currentSpaceOfFn（第32轮：纯计划仲裁别名）与 effectiveSpaceAt =====
section('3. 生效空间推导');
ok(evalInPage('currentSpaceOfFn("input")') === 'sp2', 'input 生效空间=sp2（常驻计划仲裁）');
ok(evalInPage('currentSpaceOfFn("cache")') === 'sp5', 'cache 生效空间=sp5');
ok(evalInPage('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp3' && evalInPage('effectiveSpaceAt("input","2026-11-15 00:00:00").source') === 'plan', '11-15 双11计划接管 input→sp3');
ok(evalInPage('effectiveSpaceAt("input","2026-11-25 00:00:00").key') === 'sp2', '11-25 双11到期 → 常规计划 sp2 恢复');
ok(evalInPage('effectiveSpaceAt("input","2026-11-15 00:00:00").plan.name') === '双11大促·输入切换售卖空间3', '胜出计划=双11（priority 500>100）');

// ===== 4. 售卖单元 Tab 前三列合并（fn/空间/单元） =====
section('4. 售卖单元前三列');
window.eval('switchInnerTab("saleunit"); renderSaleUnits();');
const suRows = Array.from(document.querySelectorAll('#saleunit-tbody tr'));
ok(suRows.length === 4, 'glm4 售卖单元 4 行');
const r0 = suRows[0].cells;
ok(r0[0].textContent.trim() === 'cache' && r0[1].textContent.includes('sp5') && r0[2].textContent.trim() === 'su-4', '首行=cache/sp5/su-4（三列结构；第35轮空间列=code）');
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

// ===== 6. 空间计划创建空间（第31轮：fn 勾选+维度勾选；总是新建、不再拦截重复维度集合） =====
section('6. 空间计划创建售卖空间');
window.eval('openSpacePlanModal()');
ok(document.querySelectorAll('.sp-fn-check').length === 3, '弹窗含 3 个 fn 复选（input/output/cache）');
// 勾 output + 购买量区间（fn 内组合无碍，总是新建）
const box6 = document.querySelector('.sp-fn-check[data-fn="output"]');
box6.checked = true;
box6.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-dim-check[data-fn="output"]').forEach(c => { c.checked = c.value === '购买量区间'; });
ok(document.querySelectorAll('.sp-fn-check[data-fn="input"]:not(:checked)').length === 1, '未勾 fn 不参与');
document.getElementById('sp-name').value = 'r31 创建计划X';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存') && alertMsg.includes('已新建售卖空间'), 'output+购买量区间 保存并新建空间: ' + alertMsg.slice(0, 30));
ok(evalInPage('spaces["sp6"].fn === "output" && spaces["sp6"].dims.join(",") === "购买量区间"'), '新空间 sp6 fn=output/dims=[购买量区间]');
ok(evalInPage('spaces["sp6"].measures === undefined'), '新空间无 measures 字段（只管维度）');
ok(evalInPage('spaceSeq') === 6, 'spaceSeq=6（跨 fn 连续编号）');
// 维度集合与已有空间相同 → 不拦截（第31轮口径：总是新建）
window.eval('openSpacePlanModal()');
const box6b = document.querySelector('.sp-fn-check[data-fn="input"]');
box6b.checked = true;
box6b.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-dim-check[data-fn="input"]').forEach(c => { c.checked = ['输入token区间', '输出token区间'].includes(c.value); });
document.getElementById('sp-name').value = 'r31 创建计划Y';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已新建售卖空间') && evalInPage('spaceSeq') === 7, '同 fn 维度集合与 sp2 相同 → 不拦截，新建 sp7（总是新建口径）');
// 0 维度空间合法化（第35轮：fn 勾选但维度全不选 → 保存成功，落地 0 维空间）
window.eval('openSpacePlanModal()');
const box6c = document.querySelector('.sp-fn-check[data-fn="input"]');
box6c.checked = true;
box6c.dispatchEvent(new window.Event('change', { bubbles: true }));
document.getElementById('sp-name').value = 'r31 创建计划Z';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存') && alertMsg.includes('0 维度'), '0 维度空间正常保存（第35轮）: ' + alertMsg.slice(0, 40));
ok(evalInPage('spaceSeq') === 8 && evalInPage('spaces["sp8"].dims.length') === 0, 'sp8 落地为 0 维度空间');
// 不勾任何 fn 拦截（维度复选被禁用）
window.eval('openSpacePlanModal()');
document.getElementById('sp-name').value = 'r31 空fn计划';
document.querySelectorAll('.sp-fn-check').forEach(c => { c.checked = false; });
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('至少勾选一个 function'), '空 fn 拦截（第35轮文案）: ' + alertMsg);
window.eval('closeModal("spaceplan")');

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

// ===== 9. vtpm 商品回归（无 function：常驻计划 sp1 生效中）=====
section('9. vtpm 回归');
window.eval('closePlanCreatePage(); backToList()');
window.openDetailByCode('maas-product-vtpm-std');
window.eval('switchInnerTab("space")');
const vRows = Array.from(document.querySelectorAll('#space-tbody tr'));
ok(vRows.length === 1, '无 fn 商品空间列表单行（sp1 常驻计划）');
ok(vRows[0].cells[0].textContent.trim() === '—', 'Function 列显示 —（无 function）');
ok(vRows[0].cells[1].textContent.trim() === 'sp1', '当前空间=sp1（第35轮：空间列只显 code）');
ok(vRows[0].cells[2].textContent.includes('生效中'), 'sp1 状态=生效中');
ok(evalInPage('currentSpaceOfFn("")') === 'sp1', 'currentSpaceOfFn("")=sp1（常驻计划 fn=""→sp1）');
window.eval('backToList()');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
