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
  currentProduct = { code: 'maas-online-text-demo', name: '在线文本演示', type: 'maas-online-text', dims: ['输入token区间', '输出token区间'] };
  currentConfigs = {}; planRowStatuses = [];
  spaces = { 'sp-x': { name: '演示空间X', dimsObj: { '输入token区间': ['0～128K'], '输出token区间': ['0～4K'] } } };
  defaultSpaceByFn = { input: { fn: 'input', spaceKey: 'sp-x' }, output: { fn: 'output', spaceKey: 'sp-x' } };
  spacePlans = []; spacePlanStatuses = [];
  saleUnits = [
    { id: 'su-1', fn: 'input', spaceKey: 'sp-x', dim: '输入token区间 + 输出token区间', measure: '0～128K + 0～4K' },
    { id: 'su-2', fn: 'output', spaceKey: 'sp-x', dim: '输入token区间 + 输出token区间', measure: '0～128K + 0～4K' }
  ];
  planRows = [{ name: '在线文本计划', units: ['su-1','su-2'], unitStates: {'su-1':'on','su-2':'on'}, chargeCodes: {}, quotaCodes: {}, inventoryCodes: {}, modes: {}, factor: 'x', slo: 'y', minQty: 1, maxQty: 2, stepQty: 3, payloadId: 'p1', priority: 100, effStart: '2026-10-01 00:00:00', effEnd: '2027-11-01 00:00:00' }];
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

// ===== 2. 售卖单元 Tab（第20轮：前三列=function（合并）/售卖空间（合并）/售卖单元） =====
section('2. 售卖单元 Tab');
let rows = Array.from(document.querySelectorAll('#saleunit-tbody tr'));
ok(rows.length === 2, '售卖单元 2 行');
const suRow = rows[0];
ok(suRow.cells[0].textContent.trim() === 'input' && suRow.cells[0].rowSpan === 1, 'su-1 第一列 Function=input（合并单元格）');
ok(suRow.cells[1].textContent.includes('演示空间X'), '第二列 售卖空间=演示空间X');
ok(suRow.cells[2].textContent.trim() === 'su-1', '第三列 售卖单元=su-1');
// su-2 fn 变化但空间相同 → 保留 fn td（rs1）、空间被合并
ok(rows[1].cells[0].textContent.trim() === 'output' && rows[1].cells[0].rowSpan >= 1, 'su-2 行 fn td=output');
ok(rows[1].cells[1].textContent.trim() === 'su-2', 'su-2 行空间列被合并：第二 td=su-2');
ok(!suRow.textContent.includes('function'), '维度:度量列不含 function');
ok(suRow.cells[4].textContent.includes('输入token区间') && suRow.cells[4].textContent.includes('输出token区间'), '第5列 维度:度量展示 token 区间');

// ===== 3. 售卖计划 Tab（第20轮 19 列：售卖单元→Function→售卖空间→维度:度量） =====
section('3. 售卖计划 Tab');
window.eval('switchInnerTab("plan"); renderPlan();');
const planHead = Array.from(document.querySelector('#plan-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(planHead[4] === '售卖单元' && planHead[5] === 'Function' && planHead[6] === '售卖空间' && planHead[7] === '维度:度量', '售卖单元后为 Function→售卖空间→维度:度量');
const planRowEl = document.querySelector('#plan-tbody tr');
ok(planRowEl.cells.length === 19, '计划单元行 19 列（第20轮加售卖空间列）');
ok(planRowEl.cells[4].textContent.trim() === 'su-1' && planRowEl.cells[5].textContent.trim() === 'input', '计划 Tab Function 列=input（第 6 列）');
ok(planRowEl.cells[6].textContent.includes('演示空间X'), '计划 Tab 售卖空间列（第 7 列）');

// ===== 4. 售卖计划详情页（第20轮 17 列） =====
section('4. 计划详情');
window.eval('openPlanDetail(0)');
const pdHead = Array.from(document.querySelector('#plan-detail-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(pdHead[1] === '售卖单元' && pdHead[2] === 'Function' && pdHead[3] === '售卖空间' && pdHead[4] === '维度:度量', '详情表：售卖单元→Function→售卖空间→维度:度量');
const pdRow = document.querySelector('#plan-detail-tbody tr');
ok(pdRow.cells.length === 17, '详情行 17 列（第20轮加售卖空间列）');
ok(pdRow.cells[2].textContent.trim() === 'input', '详情 Function 列=input');
ok(pdRow.cells[3].textContent.includes('演示空间X'), '详情 售卖空间列=演示空间X');

// ===== 5. 计划创建页区块2（第20轮：function筛选下拉 + 空间筛选 + fn/空间信息行） =====
section('5. 计划创建页');
window.eval('closePlanDetail(); startEdit(); openPlanCreatePage()');
const unitCards = Array.from(document.querySelectorAll('.plan-unit-check')).map(c => c.closest('div.plan-unit-row'));
ok(unitCards.length === 2, '区块2 渲染 2 个售卖单元');
const card1 = unitCards[0].textContent;
ok(card1.includes('input'), '区块2 su-1 Function=input');
ok(card1.includes('演示空间X'), '区块2 su-1 展示售卖空间');
ok(!card1.includes('维度组合：function'), '区块2 维度组合不含 function');
ok(document.querySelectorAll('.plan-filter-fn-check:not(.plan-filter-fn-all)').length === 2, '区块2 有 function 筛选复选组（第24轮多选，input/output）');
ok(!!document.getElementById('plan-filter-space'), '区块2 有售卖空间筛选下拉（第20轮）');

// ===== 6. vtpm 商品（无 function）不回归 =====
section('6. vtpm 回归');
window.eval('closePlanCreatePage(); exitEdit(); backToList()');
window.openDetailByCode('maas-product-vtpm-std');
rows = Array.from(document.querySelectorAll('#saleunit-tbody tr'));
ok(rows[0].cells[0].textContent.trim() === '—', 'vtpm 第一列 Function=—（无 function，合并单元格）');
ok(rows[0].cells[1].textContent.includes('售卖空间1'), 'vtpm 第二列 售卖空间=售卖空间1（第21轮序号名）');
ok(rows[0].cells[2].textContent.trim() === 'su-1', 'vtpm 第三列 售卖单元=su-1');
ok(rows[0].cells[4].textContent.includes('购买量区间') && rows[0].cells[4].textContent.includes('购买周期'), 'vtpm 维度:度量正常展示');
// vtpm 无 function → 创建售卖单元弹窗无 function 下拉
window.startEdit();
window.openSuConfirmModal();
ok(document.getElementById('su-fn-block').classList.contains('hidden'), 'vtpm 创建售卖单元弹窗隐藏 function 下拉');
window.eval('closeModal("su-confirm"); exitEdit();');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
