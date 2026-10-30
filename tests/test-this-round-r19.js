// 第19轮验证：function 专门展示列（售卖单元/售卖计划/计划详情/计划创建页），维度:度量不含 function
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

// 构造 online-text 演示数据
window.eval(`
  currentProduct = { code: 'maas-online-text-demo', name: '在线文本演示', type: 'maas-online-text', dims: ['function', '输入token区间', '输出token区间'] };
  currentConfigs = {}; planRowStatuses = [];
  saleUnits = [
    { id: 'su-1', fn: '', dim: 'function + 输入token区间 + 输出token区间', measure: 'input + 0～128K + 0～4K' },
    { id: 'su-2', fn: '', dim: 'function + 输入token区间 + 输出token区间', measure: 'output + 0～128K + 0～4K' }
  ];
  planRows = [{ name: '在线文本计划', units: ['su-1','su-2'], unitStates: {'su-1':'on','su-2':'on'}, chargeCodes: {}, quotaCodes: {}, inventoryCodes: {}, modes: {}, factor: 'x', slo: 'y', minQty: 1, maxQty: 2, stepQty: 3, payloadId: 'p1', priority: 100, effStart: '2026-10-01 00:00:00', effEnd: '2027-11-01 00:00:00' }];
  planRowStatuses = ['published'];
  showDetailView();
`);

// ===== 1. fnOfUnit / formatDimMeasure 单元测试 =====
section('1. 拆分逻辑');
ok(evalInPage('fnOfUnit(saleUnits[0])') === 'input', 'fnOfUnit 从 dim 拆出 function 度量 input');
ok(evalInPage('fnOfUnit(saleUnits[1])') === 'output', 'fnOfUnit(output)');
const fmtTxt = evalInPage('formatDimMeasureText(saleUnits[0])');
ok(!fmtTxt.includes('function'), 'formatDimMeasureText 不含 function: ' + fmtTxt);
ok(fmtTxt.includes('输入token区间:0～128K') && fmtTxt.includes('输出token区间:0～4K'), '维度:度量=其余维度（token 区间）');
const fmtHtml = evalInPage('formatDimMeasure(saleUnits[0])');
ok(!String(fmtHtml).includes('function'), 'formatDimMeasure 不含 function');

// ===== 2. 售卖单元 Tab =====
section('2. 售卖单元 Tab');
let rows = Array.from(document.querySelectorAll('#saleunit-tbody tr'));
ok(rows.length === 2, '售卖单元 2 行');
const suRow = rows[0];
ok(suRow.cells[2].textContent.trim() === 'input', 'su-1 Function 列=input');
ok(rows[1].cells[2].textContent.trim() === 'output', 'su-2 Function 列=output');
ok(!suRow.cells[3].textContent.includes('function'), '维度:度量列不含 function');
ok(suRow.cells[3].textContent.includes('输入token区间') && suRow.cells[3].textContent.includes('输出token区间'), '维度:度量列展示 token 区间');

// ===== 3. 售卖计划 Tab（18 列） =====
section('3. 售卖计划 Tab');
window.eval('switchInnerTab("plan"); renderPlan();');
const planHead = Array.from(document.querySelector('#plan-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(planHead[4] === '售卖单元' && planHead[5] === 'Function' && planHead[6] === '维度:度量', '售卖单元后为 Function 列，再维度:度量');
const planRowEl = document.querySelector('#plan-tbody tr');
ok(planRowEl.cells.length === 18, '计划单元行 18 列');
ok(planRowEl.cells[4].textContent.trim() === 'su-1' && planRowEl.cells[5].textContent.trim() === 'input', '计划 Tab Function 列=input（第 6 列）');

// ===== 4. 售卖计划详情页（16 列） =====
section('4. 计划详情');
window.eval('openPlanDetail(0)');
const pdHead = Array.from(document.querySelector('#plan-detail-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(pdHead[1] === '售卖单元' && pdHead[2] === 'Function' && pdHead[3] === '维度:度量', '详情表：售卖单元→Function→维度:度量');
const pdRow = document.querySelector('#plan-detail-tbody tr');
ok(pdRow.cells.length === 16, '详情行 16 列');
ok(pdRow.cells[2].textContent.trim() === 'input', '详情 Function 列=input');

// ===== 5. 计划创建页区块2 =====
section('5. 计划创建页');
window.eval('closePlanDetail(); startEdit(); openPlanCreatePage()');
const unitCards = Array.from(document.querySelectorAll('.plan-unit-check')).map(c => c.closest('div.p-2'));
ok(unitCards.length === 2, '区块2 渲染 2 个售卖单元');
const card1 = unitCards[0].textContent;
ok(card1.includes('input'), '区块2 su-1 Function=input');
ok(!card1.includes('维度组合：function'), '区块2 维度组合不含 function');

// ===== 6. vtpm 商品（无 function）不回归 =====
section('6. vtpm 回归');
window.eval('closePlanCreatePage(); exitEdit(); backToList()');
window.openDetailByCode('maas-product-vtpm-std');
rows = Array.from(document.querySelectorAll('#saleunit-tbody tr'));
ok(rows[0].cells[2].textContent.trim() === '—', 'vtpm 售卖单元 Function 列=—（无 function 维度）');
ok(rows[0].cells[3].textContent.includes('购买量区间') && rows[0].cells[3].textContent.includes('购买周期'), 'vtpm 维度:度量正常展示');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
