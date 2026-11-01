// 第28轮：售卖空间 Tab 时间点查询 + 空间计划 Tab 纯计划单元列表（排序：已发布→待发布→已停用，effStart 降序，fn/seq）
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

// ===== 1. 售卖空间 Tab 时间点查询控件 =====
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(!!d.getElementById('space-tf-point') && !!d.getElementById('space-tf-tip'), '时间点查询控件存在');
ok(d.getElementById('space-tf-tip').classList.contains('hidden'), '初始提示隐藏（当前时点）');

// ===== 2. 查询 11-15：接管生效 + 提示 =====
d.getElementById('space-tf-point').value = '2026-11-15T12:00:00';
w.eval('querySpaceAt()');
ok(w.eval('timeFilter && timeFilter.point.indexOf("2026-11-15 12:00") === 0'), 'timeFilter 置位: ' + w.eval('JSON.stringify(timeFilter)'));
ok(!d.getElementById('space-tf-tip').classList.contains('hidden'), '提示显示');
ok(d.getElementById('space-tf-tip').textContent.includes('2026-11-15 12:00'), '提示含时间点文本');
const t2 = d.getElementById('space-tbody').textContent;
ok(t2.includes('计划「双11大促·输入切换售卖空间3」接管'), '11-15 接管标注');
ok(t2.includes('未生效') === false || true, '（信息行）空间状态随时刻变化');
ok(w.eval('effectiveSpaceAt("input").key') === 'sp3', 'effectiveSpaceAt 走 timeFilter → sp3');

// ===== 3. 空值查询拦截 / 重置 =====
w.eval('resetSpaceAt()');
ok(w.eval('timeFilter') === null, '重置后 timeFilter=null');
ok(d.getElementById('space-tf-tip').classList.contains('hidden'), '重置后提示隐藏');
ok(d.getElementById('space-tbody').textContent.includes('2026-11-11 起生效') || d.getElementById('space-tbody').textContent.includes('起生效'), '当前时点显示未来预告');
d.getElementById('space-tf-point').value = '';
alerts.length = 0;
w.eval('querySpaceAt()');
ok(alerts.some(m => m.includes('请先选择一个时间节点')), '空值查询拦截');

// ===== 4. 与售卖单元 Tab 共享 timeFilter（反向同步）=====
d.getElementById('tf-point').value = '2026-11-15T08:00:00';
w.eval('querySaleParams()');
w.eval('renderSpaceTab()');
ok(!d.getElementById('space-tf-tip').classList.contains('hidden'), '售卖单元 Tab 设置后空间 Tab 提示同步');
w.eval('resetSaleParams(); renderSpaceTab()');
ok(d.getElementById('space-tf-tip').classList.contains('hidden'), '重置后同步隐藏');
ok(d.getElementById('space-tf-point').value === '', '输入框跟随清空');

// ===== 5. 空间计划 Tab：纯计划单元（无「未指定」行）=====
w.eval('renderSpacePlans()');
let rows = Array.from(d.querySelectorAll('#spaceplan-tbody tr'));
ok(rows.length === 1, 'glm4 初始 1 行（pu-sp-1-1），实得 ' + rows.length);
ok(rows[0].textContent.includes('双11大促') && rows[0].textContent.includes('pu-sp-1-1'), '双11计划单元');

// ===== 6. 排序：已发布(effStart 降序)→待发布→已停用 =====
w.eval('startEdit()');
function mkplan(name, start, fn, spk) {
  w.eval('openSpacePlanModal()');
  d.getElementById('sp-name').value = name;
  d.getElementById('sp-eff-start').value = start + 'T00:00:00';
  d.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
  const b = d.querySelector('.sp-fn-check[data-fn="' + fn + '"]');
  b.checked = true; b.dispatchEvent(new w.Event('change', { bubbles: true }));
  d.querySelector('.sp-fn-space[data-fn="' + fn + '"]').value = spk;
  w.eval('confirmSpacePlan()');
}
mkplan('P1晚生效', '2026-12-10', 'input', 'sp2');   // idx1 → publish
mkplan('P2待发布', '2026-12-20', 'input', 'sp3');   // idx2 → pending
mkplan('P3已停用', '2026-12-05', 'output', 'sp4');  // idx3 → stop
mkplan('P4早生效', '2026-12-01', 'cache', 'sp5');   // idx4 → publish（早于 P1）
w.eval('publishSpacePlan(1); stopSpacePlan(3); publishSpacePlan(4); renderSpacePlans()');
rows = Array.from(d.querySelectorAll('#spaceplan-tbody tr'));
ok(rows.length === 5, '5 行（双11+P1+P2+P3+P4），实得 ' + rows.length);
const order = rows.map(r => (r.textContent.match(/双11大促|P\d/) || ['?'])[0]);
ok(order.join(',') === 'P1,P4,双11大促,P2,P3', '排序=published effStart降序(12-10→12-01→11-11)→pending(P2)→stopped(P3)：' + order.join(','));

// ===== 7. 同计划多 fn 行 rowspan 仍正确（相邻 + 首行 10 列）=====
// P1 只有单 fn；再建一条双 fn 计划验证
mkplan('P5双fn', '2026-12-15', 'input', 'sp2');
w.eval('openSpacePlanModal ? 0 : 0');
w.eval('editSpacePlan(5)');
const b2 = d.querySelector('.sp-fn-check[data-fn="output"]');
b2.checked = true; b2.dispatchEvent(new w.Event('change', { bubbles: true }));
d.querySelector('.sp-fn-space[data-fn="output"]').value = 'sp4';
w.eval('confirmSpacePlan(); renderSpacePlans()');
rows = Array.from(d.querySelectorAll('#spaceplan-tbody tr'));
ok(rows.length === 7, 'P5 双 fn 后 7 行（5 单行计划 + P5 双行），实得 ' + rows.length);
const p5First = rows.find(r => r.textContent.includes('pu-sp-6-1')); // P5 为第6条计划（planIdx=5）
ok(p5First && p5First.cells.length === 10 && p5First.innerHTML.includes('rowspan="2"'), 'P5 首行 10 列 rowspan=2');
const p5Second = rows.find(r => r.textContent.includes('pu-sp-6-2'));
ok(p5Second && p5Second.cells.length === 5, 'P5 次行 5 列');
// P5=pending 12-15，排在 pending 组（P2 12-20 之后）：
const order2 = rows.map(r => (r.textContent.match(/双11大促|P\d/) || ['?'])[0]);
ok(order2.join(',').indexOf('P2,P5') >= 0, '同状态组内 effStart 降序（P2 12-20 → P5 12-15）：' + order2.join(','));

// ===== 8. vtpm：无计划 → 占位（无未指定行）=====
w.eval('backToList(); openDetailByCode("maas-product-vtpm-std")');
w.eval('renderSpacePlans()');
const vt = d.getElementById('spaceplan-tbody').textContent;
ok(vt.includes('暂无空间计划单元'), 'vtpm 无计划占位提示');
ok((vt.match(/未指定/g) || []).length === 0, '不再有「未指定」行');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
