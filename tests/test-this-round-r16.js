// 第16轮验证：①售卖维度非必选（未勾选按全量维度兜底）②售卖计划复制操作（admin-products.html）
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

// ===== 1. 新增商品不再勾选售卖维度（第21轮） =====
section('1. 新增商品无售卖维度字段');
window.openProductModal();
ok(!document.getElementById('inp-dims'), '弹窗无 #inp-dims 勾选区（第21轮移除）');
ok(document.querySelectorAll('.product-dim-check').length === 0, '无售卖维度复选框');
alertMsg = '';
document.getElementById('inp-code').value = 'maas-product-vtpm-r16';
document.getElementById('inp-name').value = '无维度商品';
window.submitProduct();
ok(alertMsg === '', '直接提交不拦截（无维度校验）');
ok(evalInPage('currentProduct.dims') === undefined, 'currentProduct 无 dims 字段');

// 第52轮：复制不再直接落库——打开创建页预填（需编辑锁），保存才入库
// helper：持锁状态下复制 idx 并在创建页内保存（生效时间改为合法值）
function copyAndSave(idx) {
  window.copyPlanRow(idx);
  const fsEl = document.getElementById('plan-eff-start');
  const feEl = document.getElementById('plan-eff-end');
  fsEl.value = '2026-11-06T12:00:00';
  feEl.value = '2026-12-31T00:00:00';
  window.eval('confirmPlanCreate()');
  return evalInPage('planRows.length') - 1;
}

// ===== 2. 复制：待发布计划 =====
section('2. 复制待发布计划');
window.backToList();
window.openDetailByCode('maas-product-vtpm-pre');
window.eval('startEdit()');
// pre 计划 0 = 待发布
ok(evalInPage('planRowStatuses[0]') === 'pending_publish', 'pre 计划0为待发布');
const rowsBefore = evalInPage('planRows.length');
const copyIdx = copyAndSave(0);
ok(evalInPage('planRows.length') === rowsBefore + 1, '计划数 +1（保存后落库）');
ok(evalInPage(`planRows[${copyIdx}].name`) === evalInPage('planRows[0].name') + '-副本', '副本名称=原名-副本');
ok(evalInPage(`planRowStatuses[${copyIdx}]`) === 'pending_publish', '副本状态=待发布');
ok(evalInPage(`JSON.stringify(planRows[${copyIdx}].chargeCodes)`) === evalInPage('JSON.stringify(planRows[0].chargeCodes)'), '计费项配置完整拷贝');
ok(evalInPage(`JSON.stringify(planRows[${copyIdx}].unitStates)`) === evalInPage('JSON.stringify(planRows[0].unitStates)'), 'unitStates 完整拷贝');
ok(evalInPage(`planRows[${copyIdx}].priority`) === evalInPage('planRows[0].priority'), '优先级拷贝');
ok(evalInPage(`planRows[${copyIdx}].spaceKey`) === evalInPage('planRows[0].spaceKey'), '所属空间拷贝');
// 深拷贝验证：修改副本不影响原计划
window.eval(`planRows[${copyIdx}].priority = 999`);
ok(evalInPage('planRows[0].priority') !== 999, '深拷贝：改副本不影响原件');

// ===== 3. 复制：已发布计划 =====
section('3. 复制已发布计划');
window.backToList();
window.openDetailByCode('maas-product-vtpm-std');
window.eval('startEdit()');
ok(evalInPage('planRowStatuses[0]') === 'published', 'std 计划0为已发布');
const stdBefore = evalInPage('planRows.length');
const c2 = copyAndSave(0);
ok(evalInPage('planRows.length') === stdBefore + 1, '已发布计划可复制（+1）');
ok(evalInPage(`planRowStatuses[${c2}]`) === 'pending_publish', '副本状态仍=待发布（不继承已发布）');

// ===== 4. 复制：已停用计划 + 详情页按钮 =====
section('4. 已停用计划与按钮');
window.eval('stopPlanRow(0)');
ok(evalInPage('planRowStatuses[0]') === 'stopped', 'std 计划0已停用');
window.openPlanDetail(0);
const actions = document.getElementById('plan-detail-actions').textContent;
ok(actions.includes('复制') && !actions.includes('发布') && !actions.includes('停用'), '已停用计划操作区仅剩「复制」: ' + actions.trim());
const copyBtn = document.querySelector('#plan-detail-actions button[onclick^="copyPlanRow"]');
ok(!!copyBtn, '操作区含复制按钮');
copyBtn.click(); // 打开创建页预填（编辑态已持有）
ok(!document.getElementById('plan-create-view').classList.contains('hidden'), '已停用计划复制打开创建页（预填）');
ok(document.getElementById('plan-name').value.includes('-副本'), '预填副本名');
window.eval('closePlanCreatePage()'); // 取消——摘除临时副本
ok(evalInPage('planRowStatuses.length') === evalInPage('planRows.length'), '状态数组与计划同步');
// 待发布副本计划操作区也含复制
window.openPlanDetail(stdBefore);
const actCopy = document.getElementById('plan-detail-actions').textContent;
ok(actCopy.includes('复制') && actCopy.includes('发布'), '待发布操作区=修改+复制+发布: ' + actCopy.trim());
// 已发布计划操作区=修改+复制+停用
window.openPlanDetail(1);
const actPub = document.getElementById('plan-detail-actions').textContent;
ok(actPub.includes('复制') && actPub.includes('停用') && !actPub.includes('发布'), '已发布操作区=修改+复制+停用');

// ===== 5. 副本重名自动加序号 =====
section('5. 重名序号');
window.closePlanDetail();
const base = evalInPage('planRows[0].name');
const beforeCnt = evalInPage('planRows.length');
const priorCopies = evalInPage(`planRows.filter(r => r.name.startsWith('${base}-副本')).length`);
const c3 = copyAndSave(0); // 对同一原件再次复制 → 与既有副本序列重名 → 追加下一序号
ok(evalInPage('planRows.length') === beforeCnt + 1, '再次复制 +1（保存后）');
const expectName = `${base}-副本${priorCopies + 1}`;
ok(evalInPage(`planRows[${c3}].name`) === expectName, '重名副本自动加序号: ' + evalInPage(`planRows[${c3}].name`) + '（期望 ' + expectName + '）');

// ===== 6. 复制需编辑锁（第52轮口径：复制打开编辑页） =====
section('6. 编辑锁');
window.closePlanDetail();
window.eval('exitEdit()');
alertMsg = '';
const cntNoLock = evalInPage('planRows.length');
window.copyPlanRow(0);
ok(alertMsg.includes('发起变更'), '未持有编辑锁时复制被拦截（第52轮：需先发起变更）');
ok(evalInPage('planRows.length') === cntNoLock, '拦截后计划数不变');
alertMsg = '';
window.editPlanRow(0);
ok(alertMsg.includes('发起变更') || alertMsg.includes('正在编辑') || alertMsg === '', '修改仍受编辑锁保护（guardEdit 不变）');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
