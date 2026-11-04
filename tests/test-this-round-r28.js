// 第28轮（第39轮口径重写）：售卖空间 Tab 纯列表（无时间点查询）+ 排序（状态→优先级降序→创建时间逆序）+ 空间内 fn 创建序 + 仲裁与切换预告（函数层）
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

// ===== 1. 第39轮：时间点查询控件已删（纯列表）=====
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(!d.getElementById('space-tf-point') && !d.getElementById('space-tf-tip'), '时间点查询控件已删（纯列表）');
ok(w.eval('typeof querySpaceAt') === 'undefined' && w.eval('typeof resetSpaceAt') === 'undefined' && w.eval('typeof syncSpaceTfPoint') === 'undefined', 'querySpaceAt/resetSpaceAt/syncSpaceTfPoint 函数已删');

// ===== 2. 初始列表：4 行（sp2×input + sp1×input/output/cache），9 列表头 =====
const ths = d.querySelectorAll('#inner-tab-space thead th');
ok(ths.length === 8 && ths[0].textContent.trim() === '售卖空间', '售卖空间表头 8 列（第40轮删空间单元列；售卖空间居首），实得 ' + ths.length);
let rows = dataRows();
ok(rows.length === 4, 'glm4 初始 4 行（sp1 三 fn + sp2 一 fn），实得 ' + rows.length);
// 排序（第39轮）：同为 published → 优先级降序（sp2 500 > sp1 100）→ sp2 首行
ok(rows[0].cells[0] && rows[0].cells[0].textContent.trim() === 'sp2', 'sp2（优先级 500）排首行');
ok(rows[0].cells[3].textContent.trim() === 'input' && rows[0].cells[0].rowSpan === 1, 'sp2 行 fn=input 单行 rowspan=1');
// sp1 组内按创建序（fnDims 键序 input→output→cache）
const fnOfRow = r => r.cells.length === 3 ? r.cells[0].textContent.trim() : r.cells[3].textContent.trim();
const fnsSp1 = [fnOfRow(rows[1]), fnOfRow(rows[2]), fnOfRow(rows[3])];
ok(fnsSp1.join(',') === 'input,output,cache', 'sp1 三行按创建序 input→output→cache，实得 ' + fnsSp1.join(','));
ok(!d.getElementById('space-tbody').textContent.includes('pu-sp-'), '第40轮：列表无 pu-sp 编号');
ok(rows[1].cells.length === 8 && rows[2].cells.length === 3 && rows[3].cells.length === 3, 'sp1 首行 8 列带空间级列、两续行仅 3 列');
// 当前 11-04：sp2 生效期外（11-11 起）、sp1 生效期内
ok(rows[0].textContent.includes('生效期外'), 'sp2 生效期外（11-11 起档）');
ok(rows[1].textContent.includes('生效期内'), 'sp1 生效期内');

// ===== 3. 仲裁（第38轮保留：priority 降序→seq 降序）走 timeFilter 变量 =====
ok(w.eval('effectiveSpaceAt("input").key') === 'sp1', '当前（11-04，sp2 未起档）input=sp1');
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }');
ok(w.eval('effectiveSpaceAt("input").key') === 'sp2', '11-15 input=sp2（priority 500 接管）');
ok(w.eval('effectiveSpaceAt("output").key') === 'sp1' && w.eval('effectiveSpaceAt("cache").key') === 'sp1', '11-15 output/cache 仍=sp1（sp2 仅含 input）');
ok(w.eval('effectiveSpaceAt("input").plan.priority') === 500, 'effectiveSpaceAt 返回空间本体（.plan=空间对象）');
w.eval('timeFilter = null');

// ===== 4. 切换预告（函数层保留）=====
ok(w.eval('nextSpaceSwitchOfFn("input")') === 'sp2', '当前时点 input 下一切换预告=sp2（11-11 起接管）');
ok(w.eval('nextSpaceSwitchOfFn("output")') === null, 'output 无切换预告（sp2 不含 output）');

// ===== 5. 售卖单元 Tab 仍保留时间查询（第39轮只删空间 Tab 的；第41轮删查询/重置按钮改为 onchange 即时刷新）=====
ok(!!d.getElementById('tf-point'), '售卖单元 Tab 时间查询控件仍在（共享 timeFilter）');
w.eval('switchInnerTab("saleunit")');
ok(!!d.getElementById('tf-point') && !d.getElementById('space-tf-point'), '空间 Tab 无查询、单元 Tab 有查询');
ok(w.eval('typeof onSaleTimeChange') === 'function' && w.eval('typeof querySaleParams') === 'undefined' && w.eval('typeof resetSaleParams') === 'undefined', '第41轮：查询/重置按钮已删，onSaleTimeChange 即时刷新');
// onchange 即时刷新验证：选 2026-09-01（生效期之前）→ 无生效空间空态
w.eval(`
  (function(){
    const inp = document.getElementById('tf-point');
    inp.value = '2026-09-01T12:00';
    inp.dispatchEvent(new window.Event('change', { bubbles: true }));
  })()
`);
ok(d.getElementById('saleunit-tbody').textContent.includes('当前时刻无生效中的售卖空间'), 'onchange 选 2026-09-01 → 空态（无需点查询）');
// 清空 → 回当前时刻全部单元
w.eval(`
  (function(){
    const inp = document.getElementById('tf-point');
    inp.value = '';
    inp.dispatchEvent(new window.Event('change', { bubbles: true }));
  })()
`);
ok(d.querySelectorAll('#saleunit-tbody tr').length === 11, '清空时间 → 立即恢复当前时刻唯一生效空间 sp1 的 11 行（第47轮 per-fn；第42轮默认也过滤）');
w.eval('switchInnerTab("space")');

// ===== 6. 排序专项：优先级降序 → 创建时间逆序（seq 降序）=====
w.eval('startEdit()');
// 建一个高优先级新空间（priority 900, pending_publish）
w.eval('openSpacePlanModal()');
d.getElementById('sp-name').value = 'r39高优空间';
d.getElementById('sp-priority').value = '900';
d.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
const b0 = d.querySelector('.sp-fn-check[data-fn="input"]');
b0.checked = true; b0.dispatchEvent(new w.Event('change', { bubbles: true }));
d.querySelector('.sp-measure-check[data-dim="输入区间"][value="0～128K"]').checked = true;
w.eval('confirmSpacePlan()');
rows = dataRows();
ok(rows.length === 5, '新增空间后 5 行，实得 ' + rows.length);
// 状态组：published（sp2/sp1）在前，pending（sp3 新建）在后
ok(rows[0].cells[0].textContent.trim() === 'sp2' && rows[1].cells[0].textContent.trim() === 'sp1', 'published 组在前（sp2 优先级高）');
ok(rows[4].cells[0].textContent.trim() === 'sp3' && rows[4].cells[1].textContent.trim() === '待发布', '新建空间 sp3 排末尾（pending 组）');
// 再建一个 pending 且优先级 800 的空间 → 仍排在 pending 组内最前（优先级降序）
w.eval('openSpacePlanModal()');
d.getElementById('sp-name').value = 'r39次优空间';
d.getElementById('sp-priority').value = '800';
d.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
const b1 = d.querySelector('.sp-fn-check[data-fn="input"]');
b1.checked = true; b1.dispatchEvent(new w.Event('change', { bubbles: true }));
d.querySelector('.sp-measure-check[data-dim="输入区间"][value="0～128K"]').checked = true;
w.eval('confirmSpacePlan()');
rows = dataRows();
ok(rows.length === 6, '再增 1 行共 6 行');
ok(rows[4].cells[0].textContent.trim() === 'sp3' && rows[5].cells[0].textContent.trim() === 'sp4', 'pending 组内优先级降序（sp3 900 > sp4 800）');
// 停用 sp3 → stopped 组排最后
w.eval('stopSpacePlan("sp3")');
rows = dataRows();
ok(rows[5].cells[0].textContent.trim() === 'sp3' && rows[5].cells[1].textContent.trim() === '已停用', '停用后 sp3 落到 stopped 组末尾');
// 发布 sp4 → 优先级 800 > sp1 100，但 < sp2 500 → published 组内第二
w.eval('publishSpacePlan("sp4")');
rows = dataRows();
ok(rows[0].cells[0].textContent.trim() === 'sp4' && rows[1].cells[0].textContent.trim() === 'sp2' && rows[2].cells[0].textContent.trim() === 'sp1',
  '发布 sp4 后 published 组=sp4(800)→sp2(500)→sp1(100)（优先级降序），实得 ' + rows.map(r => (r.cells[0] || { textContent: '' }).textContent.trim()).join(','));
// 清理：删除测试造的空间恢复现场
w.eval('delete spaces["sp3"]; delete spaces["sp4"]; saleUnits = saleUnits.filter(u => u.spaceKey !== "sp3" && u.spaceKey !== "sp4"); spaceSeq = 2; renderSpaceTab(); renderSaleUnits();');
w.eval('exitEdit()');
ok(dataRows().length === 4, '清理后回到 4 行');

// ===== 7. vtpm：常驻空间单行 =====
w.eval('backToList(); openDetailByCode("maas-product-vtpm-std")');
rows = dataRows();
ok(rows.length === 1 && rows[0].cells[0].textContent.trim() === 'sp1', 'vtpm 常驻空间单行');
ok(rows[0].cells[3].textContent.trim() === '—', 'fn 空串单元 Function 列=—（不区分 function）');
ok((d.getElementById('space-tbody').textContent.match(/未指定/g) || []).length === 0, '无「未指定」行');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
