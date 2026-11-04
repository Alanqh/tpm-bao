// 第20/22/23轮历史验证——第38轮口径重写：空间=带档期+优先级+三态+多fn的聚合根（吸收原空间计划全部职责）
// ①售卖空间列表 9 列全空间展示 ②effectiveSpaceAt 纯空间仲裁 ③SU Tab 前三列合并 ④SU 创建链路已删
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

// ===== 0. glm4 示例商品 mock 校验（第38轮空间模型：fnDims/fnMeasures/档期/优先级/三态） =====
section('0. mock 数据');
ok(evalInPage('allProducts.some(p => p.code === "maas-online-text-glm4")'), '存在 online-text 示例商品 glm4');
ok(evalInPage('defaultSaleUnits["maas-online-text-glm4"].every(u => u.fn && u.spaceKey && !u.dim.includes("function"))'), 'glm4 售卖单元均有 fn/spaceKey 且 dim 不含 function');
ok(evalInPage('defaultSpaces["maas-online-text-glm4"]["sp1"] && Object.keys(defaultSpaces["maas-online-text-glm4"]["sp1"].fnDims).join(",") === "input,output,cache"'), 'sp1 一个空间含三个 fn（第38轮多fn）');
ok(evalInPage('defaultSpaces["maas-online-text-glm4"]["sp2"].fnDims.input.join(",") === "输入token区间" && defaultSpaces["maas-online-text-glm4"]["sp2"].priority === 500'), 'sp2 双11空间 input 单维 优先级500');
ok(evalInPage('defaultSpaces["maas-online-text-glm4"]["sp1"].fnMeasures.input["输入token区间"].length > 0'), 'sp1 带 fnMeasures 定义');
ok(evalInPage('typeof defaultSpacePlans === "undefined"'), 'defaultSpacePlans 实体已删（职责并入空间本体）');
ok(evalInPage('defaultPlans["maas-online-text-glm4"].every(p => p.spaceKey)'), 'glm4 售卖计划均锁定空间（spaceKey）');

// ===== 1. 售卖空间 Tab：第一个 Tab，默认打开 =====
section('1. 售卖空间 Tab');
window.openDetailByCode('maas-online-text-glm4');
const tabs = Array.from(document.querySelectorAll('#plan-tabs-card .admin-tab')).map(b => b.textContent.trim());
ok(tabs[0] === '售卖空间', '售卖空间是第一个 Tab');
ok(!tabs.includes('空间计划'), '「空间计划」Tab 已删（第38轮并入售卖空间）');
const activeTab = document.querySelector('#plan-tabs-card .admin-tab.active');
ok(activeTab && activeTab.textContent.trim() === '售卖空间', '进入详情默认打开售卖空间 Tab');
ok(!document.getElementById('spaceplan-create-btn'), '创建空间计划按钮已移除');
ok(!!document.getElementById('modal-spaceplan'), '空间弹窗存在（第38轮=创建售卖空间）');
ok(!!document.getElementById('spaceplan-new-btn'), '创建售卖空间按钮存在（列表左上）');
ok(!document.getElementById('space-new-btn'), '批量创建售卖空间按钮已删除');
ok(!document.getElementById('fn-space-cards'), 'fn 配置卡已删（第23轮合并进列表）');
ok(!!document.getElementById('space-tbody'), '含售卖空间列表表');

// ===== 2. 空间列表渲染（第40轮：全空间展示 8 列，删空间单元列；空间级列 rowspan 合并） =====
section('2. 空间列表');
const spRows = Array.from(document.querySelectorAll('#space-tbody tr'));
ok(spRows.length === 4, '空间列表 4 行（sp1 三 fn 行 + sp2 一行），实得 ' + spRows.length);
const spHead = Array.from(document.querySelector('#space-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(spHead.length === 8 && spHead[0] === '售卖空间' && spHead[1] === '状态' && spHead[2] === '空间名称' && spHead[3] === 'Function' && spHead[4] === '空间维度', '空间列表 8 列（售卖空间/状态/空间名称/Function/空间维度/售卖单元数/优先级/生效起止）');
ok(!spHead.includes('空间单元'), '第40轮已删「空间单元」列');
// 排序（第39轮）：状态→优先级降序→创建时间逆序；sp2（500）> sp1（100）→ sp2 在前
const firstCells = spRows[0].cells;
ok(firstCells[0] && firstCells[0].textContent.trim() === 'sp2', '首行空间=sp2（published 按优先级降序在前）');
ok(!spRows[0].textContent.includes('pu-sp-'), '无空间单元编号（pu-sp 已删）');
// sp1 三行 fn 序（第39轮）：fnDims 键序=创建时勾选序 input/output/cache；首行空间列 rowspan=3
const sp1First = spRows[1].cells;
ok(sp1First[0] && sp1First[0].textContent.trim() === 'sp1' && sp1First[0].rowSpan === 3, 'sp1 空间列 rowspan=3（三 fn 行合并）');
ok(sp1First[3].textContent.trim() === 'input', 'sp1 首 fn 行=input（创建时勾选序）');
ok(spRows[2].cells[0].textContent.trim() === 'output' && spRows[2].cells[2].textContent.trim() === '1', 'sp1 output 行单元数=1');
ok(spRows[3].cells[0].textContent.trim() === 'cache' && spRows[3].cells[2].textContent.trim() === '1', 'sp1 cache 行单元数=1');

// ===== 3. effectiveSpaceAt（第38轮：纯空间本体仲裁） =====
section('3. 生效空间推导');
ok(evalInPage('currentSpaceOfFn("input")') === 'sp1', 'input 当前生效空间=sp1（当前时刻 sp2 未到档期）');
ok(evalInPage('currentSpaceOfFn("cache")') === 'sp1', 'cache 生效空间=sp1');
ok(evalInPage('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp2' && evalInPage('effectiveSpaceAt("input","2026-11-15 00:00:00").source') === 'plan', '11-15 双11空间接管 input→sp2（priority 500>100）');
ok(evalInPage('effectiveSpaceAt("input","2026-11-25 00:00:00").key') === 'sp1', '11-25 双11空间过档期 → sp1 恢复');
ok(evalInPage('effectiveSpaceAt("input","2026-11-15 00:00:00").plan.name') === '双11大促·输入售卖空间', '胜出空间=双11（priority 500）');

// ===== 4. 售卖单元 Tab 前三列合并（第39轮：售卖空间/Function/售卖单元——空间层级在 fn 之上） =====
section('4. 售卖单元前三列');
window.eval('switchInnerTab("saleunit"); renderSaleUnits();');
const suRows = Array.from(document.querySelectorAll('#saleunit-tbody tr'));
ok(suRows.length === 7, 'glm4 售卖单元 7 行，实得 ' + suRows.length);
const suHead = Array.from(document.querySelector('#saleunit-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(suHead.length === 14 && suHead[0] === '售卖空间' && suHead[1] === 'Function' && suHead[2] === '售卖单元', '售卖单元表头 14 列，前三列=售卖空间/Function/售卖单元（第39轮空间居首）');
const r0 = suRows[0].cells;
ok(r0[0].textContent.includes('sp1') && r0[0].rowSpan === 4 && r0[1].textContent.trim() === 'cache' && r0[2].textContent.trim() === 'su-4', 'sp1 空间列 rowspan=4（sp1 全部 4 单元跨 fn 合并；首行=sp1/cache/su-4）');
ok(suRows[1].cells[0].textContent.trim() === 'input' && suRows[1].cells[0].rowSpan === 2, 'sp1 组内 input fn td rowspan=2');
ok(suRows[3].cells[0].trim === undefined && suRows[3].cells[0].textContent.trim() === 'output', 'sp1 组内 output 独立 fn td');
const sp2Idx = suRows.findIndex(r => r.textContent.includes('sp2'));
ok(sp2Idx === 4 && suRows[4].cells[0].textContent.includes('sp2') && suRows[4].cells[0].rowSpan === 3, 'sp2 空间列 rowspan=3（整组独立，含三态徽标）');
ok(suRows[4].cells[1].textContent.trim() === 'input' && suRows[4].cells[1].rowSpan === 3, 'sp2 组内 input fn td rowspan=3');

// ===== 5. SU 创建链路已删（第37轮） =====
section('5. SU 创建链路已删');
ok(!document.getElementById('modal-su-confirm'), 'SU 弹窗 #modal-su-confirm 已删除');
ok(evalInPage('typeof openSuConfirmModal') === 'undefined' && evalInPage('typeof confirmSaleUnits') === 'undefined', 'openSuConfirmModal/confirmSaleUnits 函数已删');

// ===== 6. 创建售卖空间：fn→维度→度量勾选 + 叉乘（第38轮：总是新建空间） =====
section('6. 创建售卖空间');
window.eval('switchInnerTab("space"); startEdit(); openSpacePlanModal()');
ok(document.querySelectorAll('.sp-fn-check').length === 3, '弹窗含 3 个 fn 复选（input/output/cache）');
// 勾 output + 购买量区间 + 两个度量
const box6 = document.querySelector('.sp-fn-check[data-fn="output"]');
box6.checked = true;
box6.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelectorAll('.sp-dim-check[data-fn="output"]').forEach(c => { c.checked = c.value === '购买量区间'; c.dispatchEvent(new window.Event('change', { bubbles: true })); });
document.querySelectorAll('.sp-measure-check[data-fn="output"][data-dim="购买量区间"]').forEach(c => { c.checked = ['1～100', '500+'].includes(c.value); });
// 校验：勾维度不勾度量 → 拦截
const measAll = document.querySelectorAll('.sp-measure-check[data-fn="output"][data-dim="购买量区间"]');
const prevChecked = Array.from(measAll).map(c => c.checked);
measAll.forEach(c => { c.checked = false; });
document.getElementById('sp-name').value = 'r38 创建空间X';
document.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
document.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('至少勾选一个度量'), '勾维度不勾度量 → 拦截: ' + alertMsg);
measAll.forEach((c, i) => { c.checked = prevChecked[i]; });
document.getElementById('sp-name').value = 'r38 创建空间X';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存') && alertMsg.includes('待发布'), 'output+购买量区间 保存为待发布空间: ' + alertMsg.slice(0, 30));
ok(evalInPage('spaces["sp3"] && spaces["sp3"].fnDims.output.join(",")') === '购买量区间', '新空间 sp3 fnDims.output=[购买量区间]');
ok(evalInPage('spaces["sp3"].status') === 'pending_publish', 'sp3 待发布');
ok(evalInPage('spaceSeq') === 3, 'spaceSeq=3（跨 fn 连续编号）');
ok(alertMsg.includes('已自动生成售卖单元 2 个'), '叉乘生成 2 个单元: ' + alertMsg.slice(-40));
ok(evalInPage('saleUnits.filter(u => u.spaceKey === "sp3" && u.fn === "output").length') === 2, 'sp3 下 output 单元=2（度量1～100/500+）');
// 0 维度空间合法（fn 勾选但维度全不选 → 保存成功，唯一单元）
window.eval('openSpacePlanModal()');
const box6c = document.querySelector('.sp-fn-check[data-fn="input"]');
box6c.checked = true;
box6c.dispatchEvent(new window.Event('change', { bubbles: true }));
document.getElementById('sp-name').value = 'r38 创建空间Y';
document.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
document.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存'), '0 维度空间正常保存: ' + alertMsg.slice(0, 30));
ok(evalInPage('spaceSeq') === 4 && evalInPage('spaces["sp4"].fnDims.input.length') === 0, 'sp4 落地为 0 维度空间');
ok(evalInPage('saleUnits.filter(u => u.spaceKey === "sp4" && u.dim === "" && u.measure === "").length') === 1, '0 维空间自动生成唯一单元（dim/measure 空串）');
// 不勾任何 fn 拦截
window.eval('openSpacePlanModal()');
document.getElementById('sp-name').value = 'r38 空fn空间';
document.querySelectorAll('.sp-fn-check').forEach(c => { c.checked = false; });
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('至少勾选一个 function'), '空 fn 拦截: ' + alertMsg);
window.eval('closeModal("spaceplan")');

// ===== 7. 编辑度量功能已删除（第23轮） + 空间不可改（第38轮） =====
section('7. 不可改');
ok(!document.getElementById('modal-space-measure-edit'), '编辑度量弹窗已移除（第23轮）');
ok(evalInPage('typeof editSpaceMeasures') === 'undefined', 'editSpaceMeasures 函数已删');
ok(evalInPage('typeof editSpacePlan') === 'undefined', 'editSpacePlan 函数已删（第38轮：空间不可改）');
ok(evalInPage('typeof confirmSpaceMeasureEdit') === 'undefined', 'confirmSpaceMeasureEdit 函数已删');
ok(evalInPage('spaces["sp1"].fnDims.input.length') === 2, 'sp1 input 维度集合不变（2 个）');

// ===== 8. 售卖计划创建：锁空间 + 时间范围（第38轮；旧筛选已删） =====
section('8. 售卖计划创建');
window.eval('openPlanCreatePage()');
ok(!document.getElementById('plan-filter-space') && document.querySelectorAll('.plan-filter-fn-check').length === 0, 'fn 复选筛选/空间筛选已删（第24轮机制废，改为锁空间）');
const sel8 = document.getElementById('plan-space-sel');
ok(sel8 && sel8.options.length === 5, '空间下拉候选 5（sp1~sp4 + 请选择）: ' + sel8.options.length);
// 选 sp1 → 区块2 只展示 sp1 内单元（su-1~su-4）
sel8.value = 'sp1';
sel8.dispatchEvent(new window.Event('change', { bubbles: true }));
const vis8 = Array.from(document.querySelectorAll('.plan-unit-check')).map(c => c.value).sort();
ok(vis8.join(',') === 'su-1,su-2,su-3,su-4', '选 sp1 → 区块2 只展示 sp1 内四单元: ' + vis8.join(','));
// 选 sp2 → 切换为双11空间单元（已勾选状态保留逻辑按新空间重渲）
sel8.value = 'sp2';
sel8.dispatchEvent(new window.Event('change', { bubbles: true }));
const vis8b = Array.from(document.querySelectorAll('.plan-unit-check')).map(c => c.value).sort();
ok(vis8b.join(',') === 'su-5,su-6,su-7', '切 sp2 → 区块2 展示双11空间三单元: ' + vis8b.join(','));
// 时间范围提示
document.getElementById('plan-eff-start').value = '2026-11-12T00:00:00';
document.getElementById('plan-eff-end').value = '2026-11-19T00:00:00';
sel8.dispatchEvent(new window.Event('change', { bubbles: true }));
ok(document.getElementById('plan-space-info').textContent.includes('空间生效范围'), '空间档期提示展示');
ok(evalInPage('planTimeWithinSpace()') === true, '时间在 sp2 档期内 → true');

// ===== 9. vtpm 商品回归（无 function：常驻空间 sp1 生效中） =====
section('9. vtpm 回归');
window.eval('closePlanCreatePage(); exitEdit(); backToList()');
window.openDetailByCode('maas-product-vtpm-std');
window.eval('switchInnerTab("space")');
const vRows = Array.from(document.querySelectorAll('#space-tbody tr'));
ok(vRows.length === 1, '无 fn 商品空间列表单行（sp1 常驻空间）');
ok(vRows[0].cells[3].textContent.trim() === '—', 'Function 列显示 —（无 function）');
ok(vRows[0].cells[1].textContent.includes('已发布'), 'sp1 状态徽标=已发布');
ok(vRows[0].cells[0].textContent.trim() === 'sp1', '空间列=sp1');
ok(evalInPage('currentSpaceOfFn("")') === 'sp1', 'currentSpaceOfFn("")=sp1（fn=""→sp1）');
window.eval('backToList()');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
