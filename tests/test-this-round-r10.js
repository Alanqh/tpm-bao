// 第10轮验证：编辑锁（发起变更/退出变更/他人持锁提示/置灰/护栏）
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('/Users/lqh/Documents/ChatGPT/TPM保障包/prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;
window.confirm = () => true; // 打桩：退出变更确认框自动确认
let pass = 0, fail = 0;
let alertMsg = '';
window.alert = (m) => { alertMsg = m; };
const ok = (c, msg) => { c ? (pass++, console.log('  ✓ ' + msg)) : (fail++, console.log('  ✗ ' + msg)); };
const section = (t) => console.log('\n== ' + t + ' ==');

// ===== 1. std：进入详情页默认浏览态，变更按钮置灰 =====
section('1. 默认浏览态（无锁）');
window.openDetailFromListed('maas-product-vtpm-std');
const suBtn = document.getElementById('su-create-btn');
const planBtn = document.getElementById('plan-create-btn');
ok(suBtn.disabled === true, '创建售卖单元按钮置灰');
ok(planBtn.disabled === true, '创建售卖计划按钮置灰');
ok(suBtn.classList.contains('opacity-40'), '置灰样式 opacity-40');
const bar = document.getElementById('edit-lock-bar');
ok(bar.textContent.includes('发起变更'), '锁栏显示「发起变更」按钮');
// 删除按钮置灰（std 无可删单元；用 pre 商品验证可删单元）
// 护栏：直接调用操作被拦截
alertMsg = '';
window.publishPlanRow(0);
ok(alertMsg.includes('发起变更'), '无锁时 publishPlanRow 被拦截并提示');
ok(window.eval('planRowStatuses[0]') === 'published', '实际状态未变（published 本来就是）');
alertMsg = '';
window.stopPlanRow(0);
ok(alertMsg.includes('发起变更') && window.eval('planRowStatuses[0]') === 'published', '无锁时 stopPlanRow 被拦截');
alertMsg = '';
window.removeSaleUnit('su-1');
ok(alertMsg.length > 0, '无锁时 removeSaleUnit 被拦截');

// ===== 2. 发起变更：进入编辑态 =====
section('2. 发起变更');
window.startEdit();
ok(window.eval('editMode') === 'owner', 'editMode=owner');
ok(suBtn.disabled === false && planBtn.disabled === false, '创建按钮恢复可用');
ok(!suBtn.classList.contains('opacity-40'), '置灰样式移除');
ok(bar.textContent.includes('编辑中') && bar.textContent.includes('退出变更'), '锁栏显示 编辑中+退出变更');
ok(bar.textContent.includes('lvqing01'), '编辑中徽标含持锁人 passport');

// ===== 3. 编辑态下操作放行 =====
section('3. 编辑态操作');
// 创建售卖计划入口可进
window.openPlanCreatePage();
ok(!document.getElementById('plan-create-view').classList.contains('hidden'), '可打开创建售卖计划页面');
window.closePlanCreatePage();
// 发布已有待发布计划：先把计划0改待发布再发布
window.eval('planRowStatuses[0] = "pending_publish"; renderPlan();');
window.openPlanDetail(0);
ok(document.getElementById('plan-detail-actions').textContent.includes('发布'), '详情页操作区有发布按钮');
window.publishPlanRow(0);
ok(window.eval('planRowStatuses[0]') === 'published', '编辑态下发布成功');
// 操作区未置灰
ok(!document.getElementById('plan-detail-actions').querySelector('div').className.includes('opacity-40'), '编辑态操作区不置灰');
window.closePlanDetail();

// ===== 4. 退出变更释放锁 =====
section('4. 退出变更');
window.exitEdit();
ok(window.eval('editMode') === false, 'editMode=false');
ok(window.eval('editLocks["maas-product-vtpm-std"]') === null, '锁已释放');
ok(suBtn.disabled === true, '退出后按钮再次置灰');
ok(bar.textContent.includes('发起变更'), '锁栏恢复「发起变更」');

// ===== 5. 他人持锁：pro 由张三编辑 =====
section('5. 他人持锁提示');
window.backToList();
window.openDetailFromListed('maas-product-vtpm-pro');
ok(window.eval('editMode') === false, '他人持锁时为浏览态');
ok(bar.textContent.includes('张三') && bar.textContent.includes('zhangsan01') && bar.textContent.includes('正在编辑'), '显示「当前由 张三（zhangsan01）正在编辑」');
ok(!bar.textContent.includes('发起变更'), '他人持锁时不显示发起变更按钮');
ok(suBtn.disabled === true && planBtn.disabled === true, '变更按钮仍置灰');
// 已发布计划详情页操作区置灰（第18轮：复制按钮豁免置灰——置灰块为容器内首个 div）
window.openPlanDetail(0);
const actDiv = document.getElementById('plan-detail-actions').querySelector('div.pointer-events-none');
ok(actDiv && actDiv.className.includes('opacity-40') && actDiv.className.includes('pointer-events-none'), '详情页操作区置灰（修改/停用；复制豁免在外）');
window.closePlanDetail();
// 发起变更被拦截
window.startEdit();
ok(window.eval('editMode') === false, '他人持锁时发起变更失败');
ok(typeof alertMsg === 'string', '发起变更被拦截提示');
// 发布操作被拦截并提示持锁人
alertMsg = '';
window.publishPlanRow(0);
ok(alertMsg.includes('张三') && alertMsg.includes('zhangsan01'), '发布被拦截并提示持锁人: ' + alertMsg);

// ===== 6. pre：可删除售卖单元的置灰/恢复 =====
section('6. 删除售卖单元随锁切换');
window.backToList();
window.openPendingDetail(0);
// su-3 无计划关联可删除，但无锁 → 置灰
const delCell = Array.from(document.querySelectorAll('#saleunit-tbody tr')).find(r => r.cells[0].textContent.trim() === 'su-3');
ok(delCell.textContent.includes('🔒'), '无锁时删除按钮置灰（🔒）');
window.startEdit();
const delCell2 = Array.from(document.querySelectorAll('#saleunit-tbody tr')).find(r => r.cells[0].textContent.trim() === 'su-3');
ok(delCell2.textContent.includes('删除') && !delCell2.textContent.includes('🔒'), '持锁后删除按钮恢复');
window.removeSaleUnit('su-3');
ok(window.eval('saleUnits.length') === 2, '持锁后删除 su-3 成功（剩余 2 个: ' + window.eval('saleUnits.map(u=>u.id).join(",")') + '）');
window.exitEdit();

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
