// 第29轮（第38轮口径重写）：售卖空间详情页（从售卖空间 Tab 空间 code 进入）+ 三态操作区（发布/停用/复制）+ 空间完全不可改 + 复制不受锁 + PM 提示文案
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

function dataRows() {
  return Array.from(d.querySelectorAll('#space-tbody tr')).filter(r => r.querySelector('td') && !r.querySelector('td[colspan]'));
}

// ===== 1. PM 提示文案已删（第36轮口径延续）=====
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(!d.getElementById('inner-tab-space').innerHTML.includes('售卖空间属于 function'), '售卖空间 Tab 提示文案已删');

// ===== 2. 创建按钮在列表左上角 + 未发起变更置灰（refreshEditControls 管 spaceplan-new-btn）=====
ok(!d.getElementById('space-new-btn'), '旧「批量创建」按钮已删（第31轮）');
ok(d.getElementById('spaceplan-new-btn'), '售卖空间 Tab 创建按钮存在（沿用 id）');
const firstChildSp = d.querySelector('#inner-tab-space > div');
ok(firstChildSp && firstChildSp.querySelector('#spaceplan-new-btn'), '创建按钮在 Tab 顶部第一行容器');
ok(d.getElementById('spaceplan-new-btn').textContent.includes('创建售卖空间'), '按钮文案=创建售卖空间');
ok(d.getElementById('spaceplan-new-btn').disabled, '浏览态：按钮 disabled');
ok(d.getElementById('spaceplan-new-btn').classList.contains('opacity-40'), '浏览态置灰样式');
w.eval('startEdit()');
ok(!d.getElementById('spaceplan-new-btn').disabled, '持锁后恢复可用');

// ===== 3. 空间计划 Tab 已合并（第38轮）：无独立 Tab/tbody，行内无操作按钮 =====
ok(!d.getElementById('inner-tab-spaceplan') && !d.getElementById('spaceplan-tbody'), '第38轮：独立空间计划 Tab 已删（合并进售卖空间）');
ok(!d.getElementById('space-tbody').innerHTML.includes('publishSpacePlan('), '列表行内无发布按钮');
ok(!d.getElementById('space-tbody').innerHTML.includes('stopSpacePlan('), '列表行内无停用按钮');
ok(!d.getElementById('space-tbody').innerHTML.includes('editSpacePlan('), '第38轮：列表行内无修改入口（空间不可改）');

// ===== 4. 详情入口：空间名称 = 进详情链接（第55轮：跳转从 code 移到空间名称）=====
const btn = Array.from(d.querySelectorAll('#space-tbody button')).find(b => b.textContent.includes('GLM4·常规售卖空间'));
ok(btn && btn.getAttribute('onclick').includes("openSpacePlanDetail('sp1')"), '空间名称列=详情链接 openSpacePlanDetail(sp1)');

// ===== 5. 详情页：已发布（sp1，第48轮单空间）→ 停用+复制 =====
w.eval("openSpacePlanDetail('sp1')");
ok(!d.getElementById('spaceplan-detail-view').classList.contains('hidden'), '详情页打开');
ok(d.getElementById('spaceplan-detail-title').textContent.includes('GLM4·常规售卖空间'), '标题含空间名');
ok(d.getElementById('spaceplan-detail-status').textContent === '已发布', '状态=已发布');
let act = d.getElementById('spaceplan-detail-actions');
ok(act.textContent.includes('停用') && act.textContent.includes('复制'), '已发布操作=停用+复制');
ok(!act.innerHTML.includes('editSpacePlan'), '第38轮：无修改操作（空间完全不可改，变更=复制新建）');
const fields = d.getElementById('spaceplan-detail-fields').textContent;
ok(fields.includes('sp1') && fields.includes('GLM4·常规售卖空间') && fields.includes('100') && fields.includes('生效时间') && fields.includes('失效时间') && fields.includes('2026-11-01 00:00:00') && fields.includes('2027-11-01 00:00:00'), '字段区：code/名称/优先级/生效时间+失效时间（第56轮改名）');
const dtRows = d.querySelectorAll('#spaceplan-detail-tbody tr');
ok(dtRows.length === 4 && dtRows[0].textContent.includes('su-4') && dtRows[0].textContent.trim().endsWith('--') && dtRows[3].textContent.includes('su-3') && !dtRows[0].textContent.includes('pu-sp-'), '详情售卖单元清单（第48轮：4 单元=cache 0维 su-4 居首 + input×2 + output；组合序空串最前，无 pu-sp 编号）');

// ===== 6. 停用拦截：空间内有生效中的售卖计划时不允许停用 =====
alerts.length = 0;
w.eval("stopSpacePlan('sp1')");
ok(alerts.some(m => m.includes('生效中的售卖计划')), 'sp1 有生效计划 → 停用被拦截：' + (alerts[0] || '(无提示)'));
// 造一个无计划的新空间 sp2（第48轮：原双11空间已删，用新建空间演练停用/复制链路）
w.eval('openSpacePlanModal()');
const nb = d.querySelector('.sp-fn-check[data-fn="input"]');
nb.checked = true; nb.dispatchEvent(new w.Event('change', { bubbles: true }));
d.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入区间"][value="0～128K"]').checked = true;
d.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入区间"][value="1M+"]').checked = true;
d.getElementById('sp-name').value = 'r48演练空间';
d.getElementById('sp-priority').value = '500';
d.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
w.eval('confirmSpacePlan()');
ok(w.eval('spaces["sp1"].status') === 'published', 'sp1 状态未变');

// ===== 7. 停用成功路径：新建 sp2 无生效计划 → 可停用 =====
w.eval("closeSpacePlanDetail(); openSpacePlanDetail('sp2')");
alerts.length = 0;
w.eval("stopSpacePlan('sp2')");
ok(w.eval('spaces["sp2"].status') === 'stopped', 'sp2 无生效计划 → 停用成功');
ok(d.getElementById('spaceplan-detail-status').textContent === '已停用', '详情页停用后状态实时更新');
act = d.getElementById('spaceplan-detail-actions');
ok(!act.textContent.includes('修改') && !act.textContent.includes('停用') && !act.textContent.includes('发布'), '已停用操作=仅复制');
act && ok(act.textContent.includes('复制'), '已停用保留复制');
// 恢复：重新发布 sp2
w.eval("publishSpacePlan('sp2')");
ok(d.getElementById('spaceplan-detail-status').textContent === '已发布', '重新发布后状态回已发布');

// ===== 8. 复制：预填弹窗（第52轮：不直接保存，保存才落库） =====
// 8a. 持锁状态复制（当前已 startEdit）
alerts.length = 0;
w.eval("copySpacePlan('sp2')");
ok(!d.getElementById('spaceplan-create-view').classList.contains('hidden'), '复制打开创建弹窗（预填，不直接落库）');
ok(d.getElementById('spaceplan-form-title').textContent.includes('复制自'), '弹窗标题含「复制自」');
ok(d.getElementById('sp-name').value === 'r48演练空间-副本', '预填名称=原名-副本');
ok(d.getElementById('sp-eff-start').value.startsWith('2026-12-01'), '预填档期继承');
ok(w.eval('spaces["sp3"]') === undefined, '未保存前不新建空间');
// 保存 → 落库
w.eval('confirmSpacePlan()');
ok(w.eval('spaceSeq') === 3 && w.eval('spaces["sp3"] && spaces["sp3"].name') === 'r48演练空间-副本', '副本空间 sp3 入列（-副本命名，保存后）');
ok(w.eval('spaces["sp3"].status') === 'pending_publish', '副本=待发布');
ok(w.eval('spaces["sp3"].priority') === 500 && w.eval('spaces["sp3"].effStart').startsWith('2026-12-01'), '副本继承优先级/档期');
ok(w.eval('spaces["sp3"].fnDims["input"].join(",")') === '输入区间', '副本继承 fn 配置');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp3").length') === 2, '副本叉乘生成 2 售卖单元（2 勾选组合，第48轮无空组合）');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp2").length') === 2, '原空间 sp2 单元保留（2 个，永不删除）');

// 8b. 退锁后复制被拦截（第54轮：复制=创建操作，须持锁）
w.eval('exitEdit()');
alerts.length = 0;
w.eval("copySpacePlan('sp3')");
ok(alerts.some(m => m.includes('发起变更')), '退锁后复制被拦截（第54轮：复制须持锁）');
ok(w.eval('spaces["sp4"]') === undefined, '未持锁复制不产生新空间');
ok(d.getElementById('spaceplan-create-view').classList.contains('hidden'), '未持锁复制不打开创建页');
w.eval('closeSpacePlanPage()');

// ===== 9. 待发布详情页：发布+复制（未持锁置灰）=====
w.eval("openSpacePlanDetail('sp3')");
act = d.getElementById('spaceplan-detail-actions');
ok(act.textContent.includes('发布') && act.textContent.includes('复制'), '待发布操作=发布+复制（第38轮无修改）');
ok(act.innerHTML.includes('opacity-40'), '未持锁：发布置灰（复制不置灰）');
w.eval('startEdit()');
ok(!d.getElementById('spaceplan-detail-actions').innerHTML.includes('opacity-40'), '持锁后置灰解除');
// 发布并验证状态联动
w.eval("publishSpacePlan('sp3')");
ok(d.getElementById('spaceplan-detail-status').textContent === '已发布', '详情页发布后状态实时更新');
act = d.getElementById('spaceplan-detail-actions');
ok(act.textContent.includes('停用') && !act.textContent.includes('发布'), '发布后操作切换为停用+复制');
// 再停用回清理现场
w.eval("stopSpacePlan('sp3')");

// ===== 10. 返回详情页复位 =====
ok(!d.getElementById('spaceplan-detail-view').classList.contains('hidden'), '详情页仍打开');
w.eval('backToList()');
ok(d.getElementById('spaceplan-detail-view').classList.contains('hidden'), '返回列表时详情页复位');
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(d.getElementById('spaceplan-detail-view').classList.contains('hidden') && !d.getElementById('detail-view').classList.contains('hidden'), '重进详情页正常');
// 清理 sp3 恢复 mock 现场
w.eval('delete spaces["sp2"]; delete spaces["sp3"]; saleUnits = saleUnits.filter(u => u.spaceKey !== "sp2" && u.spaceKey !== "sp3"); spaceSeq = 1; renderSpaceTab(); renderSaleUnits();');
ok(dataRows().length === 3, '清理后回到 3 行（第48轮单空间 sp1×3）');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
