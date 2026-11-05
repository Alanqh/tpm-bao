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
ok(evalInPage('defaultSpaces["maas-online-text-glm4"]["sp1"].fnMeasures.input["输入区间"].join(",") === "0～128K,1M+"'), 'sp1 带 fnMeasures 定义（第48轮：input 输入区间两档）');
ok(evalInPage('Object.keys(defaultSpaces["maas-online-text-glm4"]).length === 1'), '第48轮：glm4 仅一个空间 sp1（双11空间已删）');
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

// ===== 2. 空间列表渲染（第40轮：全空间展示 8 列；第34轮：每 fn 行完整渲染不合并） =====
section('2. 空间列表');
const spRows = Array.from(document.querySelectorAll('#space-tbody tr'));
ok(spRows.length === 3, '空间列表 3 行（sp1 三 fn 行，第48轮单空间），实得 ' + spRows.length);
const spHead = Array.from(document.querySelector('#space-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(spHead.length === 10 && spHead[0] === '售卖空间' && spHead[1] === '状态' && spHead[2] === '空间名称' && spHead[3] === 'Function' && spHead[4] === '维度组合' && spHead[7] === '生效开始' && spHead[8] === '生效结束' && spHead[9] === '操作', '空间列表 10 列（第49轮拆生效两列；第52轮加操作列）');
ok(!spHead.includes('空间单元'), '第40轮已删「空间单元」列');
ok(!spRows[0].textContent.includes('pu-sp-'), '无空间单元编号（pu-sp 已删）');
// 第34轮：每行完整渲染；第48轮单空间三 fn 行 input/output/cache
ok(spRows[0].cells[0].textContent.trim() === 'sp1' && spRows[0].cells[3].textContent.trim() === 'input', '首行 space=sp1 fn=input（fnDims 键序）');
ok(spRows[1].cells[0].textContent.trim() === 'output' && spRows[1].cells[2].textContent.trim() === '1', 'sp1 output 行单元数=1（第48轮：输入区间 1M+ 1 组合）');
ok(spRows[2].cells[0].textContent.trim() === 'cache' && spRows[2].cells[2].textContent.trim() === '1', 'sp1 cache 行单元数=1（0 维=唯一空单元）');

// ===== 3. effectiveSpaceAt（第38轮：纯空间本体仲裁；第48轮单空间任意时刻均 sp1） =====
section('3. 生效空间推导');
ok(evalInPage('currentSpaceOfFn("input")') === 'sp1', 'input 当前生效空间=sp1');
ok(evalInPage('currentSpaceOfFn("cache")') === 'sp1', 'cache 生效空间=sp1');
ok(evalInPage('effectiveSpaceAt("input","2026-11-15 00:00:00").key') === 'sp1' && evalInPage('effectiveSpaceAt("input","2026-11-15 00:00:00").source') === 'plan', '11-15 input=sp1（第48轮单空间口径）');
ok(evalInPage('effectiveSpaceAt("input","2026-11-25 00:00:00").key') === 'sp1', '11-25 input=sp1');
ok(evalInPage('effectiveSpaceAt("input","2026-11-15 00:00:00").plan.name') === 'GLM4·常规售卖空间', '胜出空间=GLM4 常规空间（priority 100）');

// ===== 4. 售卖单元 Tab（第43轮：列序=售卖空间/维度:度量组合/Function/售卖单元；组合层级在 fn 之上；第42轮：任何时刻只显唯一生效空间） =====
section('4. 售卖单元前三列');
window.eval('switchInnerTab("saleunit"); renderSaleUnits();');
const suRows = Array.from(document.querySelectorAll('#saleunit-tbody tr'));
// 第42轮：默认=当前时刻（11-04），单空间口径 → 只显 sp1 的 4 单元（第48轮：input 2+output 1+cache 1）
ok(suRows.length === 4, 'glm4 售卖单元默认 4 行（唯一生效空间 sp1，第48轮），实得 ' + suRows.length);
const suHead = Array.from(document.querySelector('#saleunit-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(suHead.length === 14 && suHead[0] === '售卖空间' && suHead[1] === 'Function' && suHead[2] === '维度:度量' && suHead[3] === '售卖单元', '售卖单元表头 14 列，前四列=售卖空间/Function/维度:度量/售卖单元（第49轮 fn 上调）');
const r0 = suRows[0].cells;
ok(r0[0].textContent.includes('sp1') && r0[0].rowSpan === 4 && r0[1].textContent.trim() === 'cache' && r0[2].textContent.trim() === '--' && r0[3].textContent.trim() === 'su-4', 'sp1 空间列 rowspan=4（第48轮 4 单元合并；首行=cache/0维组合--/su-4，第49轮 fn 居次）');
ok(!suRows.some(r => r.textContent.includes('sp2')), '默认视图不含 sp2（第48轮已删）');
// 时间旅行 11-15：单空间口径 → 仍显 sp1 四单元
window.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSaleUnits();');
const suRowsMid = Array.from(document.querySelectorAll('#saleunit-tbody tr'));
ok(suRowsMid.length === 4 && suRowsMid[0].cells[0].textContent.includes('sp1') && suRowsMid[0].cells[0].rowSpan === 4, '11-15 仍显 sp1 四单元（第48轮单空间）');
ok(suRowsMid[2].cells[0].textContent.includes('1M+') && suRowsMid[3].cells[0].textContent.trim() === 'output', '输入区间:1M+ 组合列在各自 fn 行内独立（第49轮：跨 fn 不合并，行3 首列=output fn）');
window.eval('timeFilter = null; renderSaleUnits();');

// ===== 5. SU 创建链路已删（第37轮） =====
section('5. SU 创建链路已删');
ok(!document.getElementById('modal-su-confirm'), 'SU 弹窗 #modal-su-confirm 已删除');
ok(evalInPage('typeof openSuConfirmModal') === 'undefined' && evalInPage('typeof confirmSaleUnits') === 'undefined', 'openSuConfirmModal/confirmSaleUnits 函数已删');

// ===== 6. 创建售卖空间：第43轮两步（①勾 fn ②直接勾度量，无维度复选）；组合=勾选度量∪缺省完整叉乘 =====
section('6. 创建售卖空间');
window.eval('switchInnerTab("space"); startEdit(); openSpacePlanModal()');
ok(document.querySelectorAll('.sp-fn-check').length === 3, '弹窗含 3 个 fn 复选（input/output/cache）');
ok(document.querySelectorAll('.sp-dim-check').length === 0, '第43轮：维度复选已删（直接勾度量）');
// 勾 output + 输入区间两个度量（第47轮：维度按商品类型过滤，glm4 无购买量区间）
const box6 = document.querySelector('.sp-fn-check[data-fn="output"]');
box6.checked = true;
box6.dispatchEvent(new window.Event('change', { bubbles: true }));
ok(document.querySelectorAll('.sp-measure-check[data-dim="购买量区间"]').length === 0, '第47轮：glm4 弹窗无购买量区间（按类型过滤）');
document.querySelectorAll('.sp-measure-check[data-fn="output"][data-dim="输入区间"]').forEach(c => { c.checked = ['0～128K', '1M+'].includes(c.value); });
document.getElementById('sp-name').value = 'r43 创建空间X';
document.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
document.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存') && alertMsg.includes('待发布'), 'output+输入区间[0～128K,1M+] 保存为待发布空间: ' + alertMsg.slice(0, 30));
ok(evalInPage('spaces["sp2"] && spaces["sp2"].fnDims.output.join(",")') === '输入区间', '新空间 sp2 fnDims.output=[输入区间]');
ok(evalInPage('spaces["sp2"].status') === 'pending_publish', 'sp2 待发布');
ok(evalInPage('spaceSeq') === 2, 'spaceSeq=2（跨 fn 连续编号）');
ok(alertMsg.includes('已自动生成售卖单元 2 个'), '纯叉乘生成 2 个单元（0～128K+1M+）: ' + alertMsg.slice(-40));
ok(evalInPage('saleUnits.filter(u => u.spaceKey === "sp2" && u.fn === "output").length') === 2, 'sp2 下 output 单元=2（0～128K/1M+）');
// 未勾任何度量也可保存（生成全缺省组合）
window.eval('openSpacePlanModal()');
const box6c = document.querySelector('.sp-fn-check[data-fn="input"]');
box6c.checked = true;
box6c.dispatchEvent(new window.Event('change', { bubbles: true }));
document.getElementById('sp-name').value = 'r43 创建空间Y';
document.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
document.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存'), '未勾度量也可保存（0维合法）: ' + alertMsg.slice(0, 30));
ok(evalInPage('spaceSeq') === 3 && evalInPage('spaces["sp3"].fnDims.input.length') === 0, 'sp3 落地为 0 维度空间');
ok(evalInPage('saleUnits.filter(u => u.spaceKey === "sp3" && u.dim === "" && u.measure === "").length') === 1, '0 维空间自动生成唯一单元（dim/measure 空串）');
// 不勾任何 fn 拦截
window.eval('openSpacePlanModal()');
document.getElementById('sp-name').value = 'r38 空fn空间';
document.querySelectorAll('.sp-fn-check').forEach(c => { c.checked = false; });
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('至少勾选一个 function'), '空 fn 拦截: ' + alertMsg);
// 第45轮：待发布空间 sp2 可编辑且编辑弹窗回填
window.eval('openSpacePlanModal("sp2")');
ok(document.getElementById('spaceplan-modal-title').textContent.includes('修改'), '第45轮：待发布空间弹窗为修改模式');
ok(document.querySelector('.sp-fn-check[data-fn="output"]').checked, '编辑模式回填 fn 勾选（output）');
ok(document.querySelector('.sp-measure-check[data-fn="output"][data-dim="输入区间"][value="0～128K"]').checked, '编辑模式回填度量勾选（第47轮 per-fn）');
window.eval('closeModal("spaceplan")');
// 已发布空间编辑拦截
alertMsg = '';
window.eval('editSpacePlan("sp1")');
ok(alertMsg.includes('仅待发布'), '第45轮：已发布空间编辑拦截: ' + alertMsg.slice(0, 20));
window.eval('closeModal("spaceplan")');

// ===== 7. 编辑度量功能已删除（第23轮） + 空间不可改（第38轮） =====
section('7. 不可改');
ok(!document.getElementById('modal-space-measure-edit'), '编辑度量弹窗已移除（第23轮）');
ok(evalInPage('typeof editSpaceMeasures') === 'undefined', 'editSpaceMeasures 函数已删');
ok(evalInPage('typeof confirmSpaceMeasureEdit') === 'undefined', 'confirmSpaceMeasureEdit 函数已删');
// 第45轮：待发布空间可编辑（editSpacePlan 恢复，仅 pending_publish）
ok(evalInPage('typeof editSpacePlan') === 'function', '第45轮：editSpacePlan 恢复（待发布空间可编辑）');
ok(evalInPage('spaces["sp1"].fnDims.input.join(",")') === '输入区间', 'sp1 input 维度集合不变（第48轮单维）');

// ===== 8. 售卖计划创建：锁空间 + 时间范围（第38轮；旧筛选已删） =====
section('8. 售卖计划创建');
window.eval('openPlanCreatePage()');
ok(document.querySelectorAll('.plan-filter-fn-check').length === 0, 'fn 复选筛选已删（第24轮机制废，改为锁空间）；plan-filter-space=售卖计划 Tab 工具条筛选（第43轮）');
const sel8 = document.getElementById('plan-space-sel');
ok(sel8 && sel8.options.length === 2, '第45轮：空间下拉候选 2（仅已发布 sp1 + 请选择；sp2/sp3 待发布被过滤）: ' + sel8.options.length);
// 选 sp1 → 区块2 只展示 sp1 内单元（第48轮 4 个）
sel8.value = 'sp1';
sel8.dispatchEvent(new window.Event('change', { bubbles: true }));
const vis8 = Array.from(document.querySelectorAll('.plan-unit-check')).map(c => c.value).sort();
ok(vis8.join(',') === 'su-1,su-2,su-3,su-4', '选 sp1 → 区块2 只展示 sp1 内 4 单元（第48轮）: ' + vis8.join(','));
// sp2/sp3 为待发布不在下拉 → 档期校验改用 sp1 验证
document.getElementById('plan-eff-start').value = '2026-11-12T00:00:00';
document.getElementById('plan-eff-end').value = '2026-11-19T00:00:00';
sel8.dispatchEvent(new window.Event('change', { bubbles: true }));
ok(document.getElementById('plan-space-info').textContent.includes('空间生效范围'), '空间档期提示展示');
ok(evalInPage('planTimeWithinSpace()') === true, '时间在 sp1 档期内 → true');

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
