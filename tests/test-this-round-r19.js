// 第19/20轮验证：function 专门展示列（不再放维度:度量），第20轮起 fn 为独立字段（非维度），前三列=function/售卖空间/售卖单元
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('/Users/lqh/Documents/ChatGPT/TPM保障包/prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;
window.confirm = () => true;
let pass = 0, fail = 0;
window.alert = () => {};
const ok = (c, msg) => { c ? (pass++, console.log('  ✓ ' + msg)) : (fail++, console.log('  ✗ ' + msg)); };
const section = (t) => console.log('\n== ' + t + ' ==');
const evalInPage = (expr) => window.eval(expr);

// 构建 online-text 演示数据（第20轮 schema：fn=独立字段，spaceKey=归属空间）
window.eval(`
  currentProduct = { code: 'maas-online-text-demo', name: '在线文本演示', type: 'maas-online-text' };
  currentConfigs = {};
  // 第38轮 schema：空间本体携带 档期/优先级/三态/fnDims/fnMeasures（fn→维度→度量）
  spaces = { 'sp-x': { seq: 1, name: '演示空间X', priority: 100, effStart: '2026-10-01 00:00:00', effEnd: '2027-11-01 00:00:00', status: 'published', fnDims: { input: ['输入token区间', '输出token区间'], output: ['输入token区间', '输出token区间'] }, fnMeasures: { input: { '输入token区间': ['0～128K'], '输出token区间': ['0～4K'] }, output: { '输入token区间': ['0～128K'], '输出token区间': ['0～4K'] } } } };
  spaceSeq = 1;
  saleUnits = [
    { id: 'su-1', fn: 'input', spaceKey: 'sp-x', dim: '输入token区间 + 输出token区间', measure: '0～128K + 0～4K' },
    { id: 'su-2', fn: 'output', spaceKey: 'sp-x', dim: '输入token区间 + 输出token区间', measure: '0～128K + 0～4K' }
  ];
  planRows = [{ name: '在线文本计划', spaceKey: 'sp-x', units: ['su-1','su-2'], unitStates: {'su-1':'on','su-2':'on'}, chargeCodes: {}, quotaCodes: {}, inventoryCodes: {}, modes: {}, factor: 'x', slo: 'y', minQty: 1, maxQty: 2, stepQty: 3, payloadId: 'p1', priority: 100, effStart: '2026-10-01 00:00:00', effEnd: '2027-11-01 00:00:00' }];
  planRowStatuses = ['published'];
  showDetailView();
`);

// ===== 1. fnOfUnit / formatDimMeasure（第20轮：fn 独立字段） =====
section('1. 取值逻辑');
ok(evalInPage('fnOfUnit(saleUnits[0])') === 'input', 'fnOfUnit 读取 u.fn=input');
ok(evalInPage('fnOfUnit(saleUnits[1])') === 'output', 'fnOfUnit(output)');
ok(evalInPage('fnPool().join(",")') === 'input,output,cache', 'fnPool=按类型给 input/output/cache');
const fmtTxt = evalInPage('formatDimMeasureText(saleUnits[0])');
ok(!fmtTxt.includes('function'), 'formatDimMeasureText 不含 function: ' + fmtTxt);
ok(fmtTxt.includes('输入token区间:0～128K') && fmtTxt.includes('输出token区间:0～4K'), '维度:度量=维度字段（token 区间）');
const fmtHtml = evalInPage('formatDimMeasure(saleUnits[0])');
ok(!String(fmtHtml).includes('function'), 'formatDimMeasure 不含 function');

// ===== 2. 售卖单元 Tab（第43轮：列序=售卖空间/维度:度量组合/Function/售卖单元；组合在 fn 之上）=====
section('2. 售卖单元 Tab');
let rows = Array.from(document.querySelectorAll('#saleunit-tbody tr'));
ok(rows.length === 2, '售卖单元 2 行');
const suRow = rows[0];
ok(suRow.cells[0].textContent.trim().startsWith('sp-x') && suRow.cells[0].textContent.includes('已发布'), '第一列 售卖空间=sp-x+三态徽标（第39轮空间列居首）: ' + suRow.cells[0].textContent.trim());
ok(suRow.cells[0].rowSpan === 2, 'sp-x 空间列 rowspan=2（最外层合并）');
ok(suRow.cells[1].textContent.includes('输入token区间') && suRow.cells[1].textContent.includes('输出token区间') && suRow.cells[1].rowSpan === 2, '第二列 维度:度量组合（同组合跨 fn 合并 rowspan=2）');
ok(suRow.cells[2].textContent.trim() === 'input', '第三列 Function=input');
ok(suRow.cells[3].textContent.trim() === 'su-1', '第四列 售卖单元=su-1');
// su-2 fn 变化但空间/组合相同 → 空间+组合被合并，fn td 新起
ok(rows[1].cells[0].textContent.trim() === 'output', 'su-2 行 fn td=output（空间/组合列被合并）');
ok(rows[1].cells[1].textContent.trim() === 'su-2', 'su-2 行第二 td=su-2');
ok(!suRow.textContent.includes('function'), '维度:度量列不含 function');

// ===== 3. 售卖计划 Tab（第20轮 19 列：售卖单元→Function→售卖空间→维度:度量） =====
section('3. 售卖计划 Tab');
window.eval('switchInnerTab("plan"); renderPlan();');
const planHead = Array.from(document.querySelector('#plan-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(planHead[4] === '售卖单元' && planHead[5] === 'Function' && planHead[6] === '售卖空间' && planHead[7] === '维度:度量', '售卖单元后为 Function→售卖空间→维度:度量');
const planRowEl = document.querySelector('#plan-tbody tr');
ok(planRowEl.cells.length === 19, '计划单元行 19 列（第20轮加售卖空间列）');
ok(planRowEl.cells[4].textContent.trim() === 'su-1' && planRowEl.cells[5].textContent.trim() === 'input', '计划 Tab Function 列=input（第 6 列）');
ok(planRowEl.cells[6].textContent.trim() === 'sp-x', '计划 Tab 售卖空间列（第 7 列；第35轮=code）');

// ===== 4. 售卖计划详情页（第20轮 17 列） =====
section('4. 计划详情');
window.eval('openPlanDetail(0)');
const pdHead = Array.from(document.querySelector('#plan-detail-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(pdHead[1] === '售卖单元' && pdHead[2] === 'Function' && pdHead[3] === '售卖空间' && pdHead[4] === '维度:度量', '详情表：售卖单元→Function→售卖空间→维度:度量');
const pdRow = document.querySelector('#plan-detail-tbody tr');
ok(pdRow.cells.length === 17, '详情行 17 列（第20轮加售卖空间列）');
ok(pdRow.cells[2].textContent.trim() === 'input', '详情 Function 列=input');
ok(pdRow.cells[3].textContent.trim() === 'sp-x', '详情 售卖空间列=sp-x（第35轮=code）');

// ===== 5. 计划创建页区块1/2（第38轮：计划锁定单空间——区块1 空间下拉，区块2 只展示所选空间内单元；旧筛选已删） =====
section('5. 计划创建页');
window.eval('closePlanDetail(); startEdit(); openPlanCreatePage()');
ok(document.querySelectorAll('.plan-filter-fn-check').length === 0, '第38轮：fn 复选筛选已删（改为区块1 锁定空间）');
const spaceSel = document.getElementById('plan-space-sel');
ok(!!spaceSel, '区块1 有售卖空间下拉（第38轮）');
ok(spaceSel.options.length === 2 && spaceSel.options[1].value === 'sp-x', '空间下拉候选含 sp-x（1 个空间）');
// 未选空间 → 区块2 提示
ok(document.getElementById('plan-units-charge-container').textContent.includes('请先在区块1选择售卖空间'), '未选空间时区块2 提示先选空间');
// 选中空间 → 区块2 只展示该空间内单元
spaceSel.value = 'sp-x';
spaceSel.dispatchEvent(new window.Event('change', { bubbles: true }));
const unitCards = Array.from(document.querySelectorAll('.plan-unit-check')).map(c => c.closest('div.plan-unit-row'));
ok(unitCards.length === 2, '选中 sp-x 后区块2 渲染 2 个售卖单元');
const card1 = unitCards[0].textContent;
ok(card1.includes('input'), '区块2 su-1 Function=input');
ok(!card1.includes('sp-x'), '第45轮：区块2 su-1 不展示售卖空间（只显维度组合+function）');
ok(!card1.includes('维度组合：function'), '区块2 维度组合不含 function');
ok(document.getElementById('plan-space-info').textContent.includes('空间生效范围'), '区块1 空间档期提示展示');

// ===== 6. vtpm 商品（无 function）不回归 =====
section('6. vtpm 回归');
window.eval('closePlanCreatePage(); exitEdit(); backToList()');
window.openDetailByCode('maas-product-vtpm-std');
rows = Array.from(document.querySelectorAll('#saleunit-tbody tr'));
ok(rows[0].cells[0].textContent.trim().startsWith('sp1'), 'vtpm 第一列 售卖空间=sp1（+三态徽标，第39轮空间列居首）');
ok(rows[0].cells[3].textContent.trim() === 'su-1' && rows[0].cells[1].textContent.trim() !== '--', 'vtpm 首行=su-1（第48轮：无空组合，首行即勾选组合）');
const su1Row = rows.find(r => Array.from(r.cells).some(c => c.textContent.trim() === 'su-1'));
ok(su1Row && su1Row.textContent.includes('购买量区间') && su1Row.textContent.includes('购买周期'), 'vtpm 维度:度量组合正常展示（第43轮组合列居次）');
ok(rows[0].cells[2].textContent.trim() === '—', 'vtpm 第三列 Function=—（无 function）');
// vtpm 无 function（第37轮：SU 弹窗已删——售卖单元由空间计划叉乘生成）
ok(!document.getElementById('modal-su-confirm'), 'SU 弹窗已删除（第37轮）');
ok(typeof window.openSuConfirmModal === 'undefined', 'openSuConfirmModal 函数已删');
window.eval('exitEdit();');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
