// 第29轮：①PM 提示文案删除+按钮左上角统一置灰；②售卖计划单元/空间计划单元命名区分；③空间计划详情页+复制/停用对齐售卖计划
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const { window } = dom;
const alerts = [];
window.alert = m => alerts.push(String(m));
window.confirm = () => true;
const w = window, d = w.document;
let step = 0, fail = 0;
function ok(cond, msg) { step++; if (!cond) { fail++; console.log('FAIL[' + step + '] ' + msg); } }

// ===== 1. PM 提示文案已删 =====
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(!d.getElementById('inner-tab-space').innerHTML.includes('售卖空间属于 function'), '售卖空间 Tab 提示文案已删');
ok(!d.getElementById('inner-tab-spaceplan').innerHTML.includes('同售卖计划与售卖单元'), '空间计划 Tab 提示文案已删');

// ===== 2. 按钮在列表左上角 + 未发起变更统一置灰（第31轮：space-new-btn 已删——售卖空间由空间计划创建） =====
ok(!d.getElementById('space-new-btn'), '第31轮：售卖空间 Tab 批量创建按钮已删除');
ok(d.getElementById('spaceplan-new-btn'), '空间计划新增按钮存在');
const firstChildSp = d.querySelector('#inner-tab-spaceplan > div');
ok(firstChildSp && firstChildSp.querySelector('#spaceplan-new-btn'), '空间计划 Tab 新增按钮在顶部第一行容器');
ok(d.getElementById('spaceplan-new-btn').disabled, '浏览态：按钮 disabled');
ok(d.getElementById('spaceplan-new-btn').classList.contains('opacity-40'), '浏览态置灰样式');
w.eval('startEdit()');
ok(!d.getElementById('spaceplan-new-btn').disabled, '持锁后恢复可用');

// ===== 3. 计划单元命名区分 =====
ok(d.getElementById('inner-tab-plan').innerHTML.includes('售卖计划单元'), '售卖计划 Tab 表头=售卖计划单元');
ok(d.getElementById('plan-detail-view').innerHTML.includes('售卖计划单元'), '售卖计划详情页=售卖计划单元');
ok(d.getElementById('inner-tab-spaceplan').innerHTML.includes('空间计划单元'), '空间计划 Tab 表头=空间计划单元');
ok(d.getElementById('spaceplan-detail-view').innerHTML.includes('空间计划单元'), '空间计划详情页=空间计划单元');
// 售卖计划创建页旧文案不含歧义（「计划单元」泛称保留在创建页说明里可接受，但 Tab 表头必须区分）——验证创建页无硬断言

// ===== 4. 空间计划列表：无操作列（9 列），所属计划=进详情链接 =====
w.eval('renderSpacePlans()');
const ths = d.querySelectorAll('#inner-tab-spaceplan thead th');
ok(ths.length === 9, '空间计划表头 9 列（删操作列），实得 ' + ths.length);
ok(!d.getElementById('spaceplan-tbody').innerHTML.includes('publishSpacePlan('), '列表行内无发布按钮');
ok(!d.getElementById('spaceplan-tbody').innerHTML.includes('stopSpacePlan(') || false, '列表行内无停用按钮');
const nameBtn = Array.from(d.querySelectorAll('#spaceplan-tbody button')).find(b => b.textContent.includes('双11大促'));
ok(nameBtn && nameBtn.getAttribute('onclick').includes('openSpacePlanDetail(1)'), '所属空间计划=详情链接（双11为 idx1，第32轮 mock 常规计划占 idx0）');

// ===== 5. 详情页：已发布（双11）→ 停用+复制 =====
w.eval('openSpacePlanDetail(1)');
ok(!d.getElementById('spaceplan-detail-view').classList.contains('hidden'), '详情页打开');
ok(d.getElementById('spaceplan-detail-title').textContent.includes('双11大促'), '标题含计划名');
ok(d.getElementById('spaceplan-detail-status').textContent === '已发布', '状态=已发布');
let act = d.getElementById('spaceplan-detail-actions');
ok(act.textContent.includes('停用') && act.textContent.includes('复制'), '已发布操作=停用+复制');
ok(!act.innerHTML.includes('editSpacePlan'), '已发布无修改（对齐售卖计划：发布后不可改）');
const dtRows = d.querySelectorAll('#spaceplan-detail-tbody tr');
ok(dtRows.length === 1 && dtRows[0].textContent.includes('pu-sp-2-1') && dtRows[0].textContent.includes('售卖空间3'), '详情页空间计划单元行（pu-sp-2-1）');

// ===== 6. 复制：生成待发布副本，不受锁限制 =====
alerts.length = 0;
w.eval('copySpacePlan(1)');
ok(alerts.some(m => m.includes('已复制空间计划')), '复制提示');
ok(w.eval('spacePlans.length') === 3 && w.eval('spacePlans[2].name') === '双11大促·输入切换售卖空间3-副本', '副本入列（-副本命名）');
ok(w.eval('spacePlanStatuses[2]') === 'pending_publish', '副本=待发布');
w.eval('exitEdit()');
alerts.length = 0;
w.eval('copySpacePlan(2)');
ok(alerts.some(m => m.includes('已复制')), '退锁后复制不受限');
ok(w.eval('spacePlans.length') === 4 && w.eval('spacePlans[3].name') === '双11大促·输入切换售卖空间3-副本-副本', '连续复制按源名+副本命名（同 copyPlanRow 逻辑）');

// ===== 7. 详情页：待发布 → 修改+发布+复制（未持锁置灰）=====
w.eval('openSpacePlanDetail(2)');
act = d.getElementById('spaceplan-detail-actions');
ok(act.textContent.includes('修改') && act.textContent.includes('发布') && act.textContent.includes('复制'), '待发布操作=修改+发布+复制');
ok(act.innerHTML.includes('opacity-40'), '未持锁：修改/发布置灰（复制不置灰）');
w.eval('startEdit()');
ok(!d.getElementById('spaceplan-detail-actions').innerHTML.includes('opacity-40'), '持锁后置灰解除（refreshEditControls 重渲）');
// 发布并验证状态联动
w.eval('publishSpacePlan(2)');
ok(d.getElementById('spaceplan-detail-status').textContent === '已发布', '详情页发布后状态实时更新');
act = d.getElementById('spaceplan-detail-actions');
ok(act.textContent.includes('停用') && !act.textContent.includes('发布</button>'), '发布后操作切换为停用+复制');
// 停用
w.eval('stopSpacePlan(2)');
ok(d.getElementById('spaceplan-detail-status').textContent === '已停用', '停用后状态更新');
act = d.getElementById('spaceplan-detail-actions');
ok(act.textContent.trim() === '复制' || (act.textContent.includes('复制') && !act.textContent.includes('修改') && !act.textContent.includes('停用')), '已停用操作=仅复制');

// ===== 8. 从详情页修改 → 关闭详情+开弹窗 =====
w.eval('openSpacePlanDetail(1)');
w.eval('editSpacePlan(1)');
ok(d.getElementById('spaceplan-detail-view').classList.contains('hidden'), '修改时详情页关闭');
ok(!d.getElementById('modal-spaceplan').classList.contains('hidden'), '修改弹窗打开');
ok(d.getElementById('sp-name').value === '双11大促·输入切换售卖空间3', '弹窗回填名称');
w.eval('closeModal("spaceplan")');

// ===== 9. 关闭详情页返回 + showDetailView 复位 =====
w.eval('openSpacePlanDetail(1)');
w.eval('backToList()');
ok(d.getElementById('spaceplan-detail-view').classList.contains('hidden'), '返回列表时详情页复位');
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(d.getElementById('spaceplan-detail-view').classList.contains('hidden') && !d.getElementById('detail-view').classList.contains('hidden'), '重进详情页正常');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
