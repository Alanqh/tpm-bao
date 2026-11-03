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
const t2Rows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(t2Rows.some(r => r.cells[1].textContent.trim() === 'sp3') && t2Rows.every(r => r.cells[1].textContent.trim() !== 'sp2'), '11-15 input 行=sp3（双11接管；第35轮删胜出计划标注，按行断言）');
ok(w.eval('effectiveSpaceAt("input").key') === 'sp3', 'effectiveSpaceAt 走 timeFilter → sp3');

// ===== 3. 空值查询拦截 / 重置 =====
w.eval('resetSpaceAt()');
ok(w.eval('timeFilter') === null, '重置后 timeFilter=null');
ok(d.getElementById('space-tf-tip').classList.contains('hidden'), '重置后提示隐藏');
ok(Array.from(d.querySelectorAll('#space-tbody tr')).every(r => !r.cells[2].textContent.includes('计划「')), '当前时点状态列只留徽标（第35轮：切换预告标注已删）');
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

// ===== 5. 空间计划 Tab：纯计划单元（第32轮：glm4 mock 含常规计划 3 单元 + 双11 1 单元）=====
w.eval('renderSpacePlans()');
let rows = Array.from(d.querySelectorAll('#spaceplan-tbody tr'));
ok(rows.length === 4, 'glm4 初始 4 行（常规 pu-sp-1-1~3 + 双11 pu-sp-2-1），实得 ' + rows.length);
ok(rows.some(r => r.textContent.includes('双11大促') && r.textContent.includes('pu-sp-2-1')), '双11计划单元（按 fnSpaces 键序 pu 号=计划 index+1）');

// ===== 6. 排序：已发布(effStart 降序)→待发布→已停用（第31轮：维度勾选创建，空间总是新建）=====
w.eval('startEdit()');
function mkplan(name, start, fn) {
  w.eval('openSpacePlanModal()');
  d.getElementById('sp-name').value = name;
  d.getElementById('sp-eff-start').value = start + 'T00:00:00';
  d.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
  const b = d.querySelector('.sp-fn-check[data-fn="' + fn + '"]');
  b.checked = true; b.dispatchEvent(new w.Event('change', { bubbles: true }));
  d.querySelector('.sp-dim-check[data-fn="' + fn + '"][value="输入token区间"]').checked = true;
  w.eval('confirmSpacePlan()');
}
mkplan('P1晚生效', '2026-12-10', 'input');   // idx2（常规0/双11 1 之后）→ publish
mkplan('P2待发布', '2026-12-20', 'input');   // idx3 → pending
mkplan('P3已停用', '2026-12-05', 'output');  // idx4 → stop
mkplan('P4早生效', '2026-12-01', 'cache');   // idx5 → publish（早于 P1）
w.eval('publishSpacePlan(2); stopSpacePlan(4); publishSpacePlan(5); renderSpacePlans()');
rows = Array.from(d.querySelectorAll('#spaceplan-tbody tr'));
ok(rows.length === 8, '8 行（常规3+双11+P1+P2+P3+P4），实得 ' + rows.length);
const order = rows.map(r => (r.textContent.match(/GLM4·常规|双11大促|P\d/) || ['?'])[0]);
ok(order.join(',').startsWith('P1,P4,双11大促,GLM4·常规') && order.join(',').endsWith('P2,P3'), '排序=published effStart降序(12-10→12-01→11-11→11-01)→pending(P2)→stopped(P3)：' + order.join(','));

// ===== 7. 同计划多 fn 行相邻且均 9 列（第34轮取消 rowspan 合并）=====
// P1 只有单 fn；再建一条双 fn 计划验证
mkplan('P5双fn', '2026-12-15', 'input');
w.eval('openSpacePlanModal ? 0 : 0');
w.eval('editSpacePlan(6)');
const b2 = d.querySelector('.sp-fn-check[data-fn="output"]');
b2.checked = true; b2.dispatchEvent(new w.Event('change', { bubbles: true }));
d.querySelector('.sp-dim-check[data-fn="output"][value="输入token区间"]').checked = true;
w.eval('confirmSpacePlan(); renderSpacePlans()');
rows = Array.from(d.querySelectorAll('#spaceplan-tbody tr'));
ok(rows.length === 10, 'P5 双 fn 后 10 行（常规3+双11+P1~P4 各1 + P5 双行），实得 ' + rows.length);
const p5First = rows.find(r => r.textContent.includes('pu-sp-7-1')); // P5 为第7条计划（planIdx=6）
ok(p5First && p5First.cells.length === 9 && !p5First.innerHTML.includes('rowspan'), 'P5 首行 9 列且无 rowspan（第34轮取消合并）');
const p5Second = rows.find(r => r.textContent.includes('pu-sp-7-2'));
ok(p5Second && p5Second.cells.length === 9 && !p5Second.innerHTML.includes('rowspan'), 'P5 次行也 9 列（每行完整渲染）');
// P5=pending 12-15，排在 pending 组（P2 12-20 之后）：
const order2 = rows.map(r => (r.textContent.match(/GLM4·常规|双11大促|P\d/) || ['?'])[0]);
ok(order2.join(',').indexOf('P2,P5') >= 0, '同状态组内 effStart 降序（P2 12-20 → P5 12-15）：' + order2.join(','));

// ===== 8. vtpm：常驻计划单行（第32轮 mock），无「未指定」行 =====
w.eval('backToList(); openDetailByCode("maas-product-vtpm-std")');
w.eval('renderSpacePlans()');
const vt = d.getElementById('spaceplan-tbody').textContent;
ok(vt.includes('标准·常驻售卖空间1'), 'vtpm 常驻计划单元（fn=""→sp1，第32轮 mock）');
ok((vt.match(/未指定/g) || []).length === 0, '不再有「未指定」行');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
