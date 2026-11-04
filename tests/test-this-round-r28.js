// 第28轮（第38轮口径重写）：售卖空间 Tab 时间点查询 + 空间列表排序（状态→effStart 降序→seq→fn 字典序）+ 仲裁与切换预告
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

// ===== 1. 时间点查询控件存在 + 初始提示隐藏 =====
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(!!d.getElementById('space-tf-point') && !!d.getElementById('space-tf-tip'), '时间点查询控件存在');
ok(d.getElementById('space-tf-tip').classList.contains('hidden'), '初始提示隐藏（当前时点）');

// ===== 2. 初始列表：4 行（sp2×input + sp1×cache/input/output），9 列表头 =====
const ths = d.querySelectorAll('#inner-tab-space thead th');
ok(ths.length === 9, '售卖空间表头 9 列，实得 ' + ths.length);
let rows = dataRows();
ok(rows.length === 4, 'glm4 初始 4 行（sp1 三 fn + sp2 一 fn），实得 ' + rows.length);
// 排序：同为 published → effStart 降序（sp2 11-11 > sp1 11-01）→ sp2 首行；sp1 组内 fn 字典序 cache/input/output
ok(rows[0].cells[2] && rows[0].cells[2].textContent.trim() === 'sp2', 'sp2（effStart 11-11 更晚）排首行');
ok(rows[0].cells[4].textContent.trim() === 'input' && rows[0].cells[2].rowSpan === 1, 'sp2 行 fn=input 单行 rowspan=1');
const fnOfRow = r => r.cells.length === 3 ? r.cells[0].textContent.trim() : r.cells[4].textContent.trim();
const fnsSp1 = [fnOfRow(rows[1]), fnOfRow(rows[2]), fnOfRow(rows[3])];
ok(fnsSp1.join(',') === 'cache,input,output', 'sp1 三行 fn 字典序 cache→input→output，实得 ' + fnsSp1.join(','));
ok(rows[1].cells.length === 9 && rows[2].cells.length === 3 && rows[3].cells.length === 3, 'sp1 首行 9 列带空间级列、两续行仅 3 列');
// 当前 11-04：sp2 生效期外（11-11 起）、sp1 生效期内
ok(rows[0].textContent.includes('生效期外'), '当前时点 sp2 生效期外');
ok(rows[1].textContent.includes('生效期内'), 'sp1 生效期内（2026-11-01~2027-11-01）');

// ===== 3. 查询 11-15：sp2 生效期内 + 提示 + timeFilter 置位 =====
d.getElementById('space-tf-point').value = '2026-11-15T12:00:00';
w.eval('querySpaceAt()');
ok(w.eval('timeFilter && timeFilter.point.indexOf("2026-11-15 12:00") === 0'), 'timeFilter 置位: ' + w.eval('JSON.stringify(timeFilter)'));
ok(!d.getElementById('space-tf-tip').classList.contains('hidden'), '提示显示');
ok(d.getElementById('space-tf-tip').textContent.includes('2026-11-15 12:00'), '提示含时间点文本');
rows = dataRows();
ok(rows[0].textContent.includes('生效期内'), '11-15 时点 sp2 生效期内（双11档期 11-11~11-20）');

// ===== 4. 仲裁（第38轮：priority 降序→seq 降序）与切换预告 =====
ok(w.eval('effectiveSpaceAt("input").key') === 'sp2', '11-15 input 生效空间=sp2（priority 500 > sp1 100）');
ok(w.eval('effectiveSpaceAt("output").key') === 'sp1' && w.eval('effectiveSpaceAt("cache").key') === 'sp1', '11-15 output/cache 仍=sp1（sp2 仅含 input）');

// ===== 5. 切换预告：当前时点下一个改变 input 空间的已发布空间 =====
w.eval('resetSpaceAt()');
ok(w.eval('timeFilter') === null, '重置后 timeFilter=null');
ok(d.getElementById('space-tf-tip').classList.contains('hidden'), '重置后提示隐藏');
ok(w.eval('nextSpaceSwitchOfFn("input")') === 'sp2', '当前时点 input 下一切换预告=sp2（11-11 起接管）');
ok(w.eval('nextSpaceSwitchOfFn("output")') === null, 'output 无切换预告（sp2 不含 output）');

// ===== 6. 空值查询拦截 =====
d.getElementById('space-tf-point').value = '';
alerts.length = 0;
w.eval('querySpaceAt()');
ok(alerts.some(m => m.includes('请先选择一个时间节点')), '空值查询拦截');
ok(w.eval('timeFilter') === null, '空值查询不置位');

// ===== 7. 与售卖单元 Tab 共享 timeFilter（反向同步）=====
d.getElementById('tf-point').value = '2026-11-15T08:00:00';
w.eval('querySaleParams()');
w.eval('renderSpaceTab()');
ok(!d.getElementById('space-tf-tip').classList.contains('hidden'), '售卖单元 Tab 设置后空间 Tab 提示同步');
w.eval('resetSaleParams(); renderSpaceTab()');
ok(d.getElementById('space-tf-tip').classList.contains('hidden'), '重置后同步隐藏');
ok(d.getElementById('space-tf-point').value === '', '输入框跟随清空');

// ===== 8. 停用空间后排序落到已停用组（状态→effStart 的状态优先级验证）=====
w.eval('startEdit()');
w.eval('stopSpacePlan("sp2")'); // sp2 档期 11-11~11-20，当前 11-04 无生效计划 → 可停用
rows = dataRows();
ok(rows.length === 4, '停用不删行，仍 4 行');
ok(rows[3].cells[2] && rows[3].cells[2].textContent.trim() === 'sp2', '已停用 sp2 排到末尾（状态优先于 effStart）');
ok(rows[3].cells[1].textContent.trim() === '已停用', 'sp2 状态徽标=已停用');
ok(rows[0].cells[2].textContent.trim() === 'sp1' && rows[0].cells[1].textContent.trim() === '已发布', '已发布的 sp1 组升为首位');
w.eval('publishSpacePlan("sp2")'); // 恢复现场
rows = dataRows();
ok(rows[0].cells[2].textContent.trim() === 'sp2' && rows[0].cells[1].textContent.trim() === '已发布', '重新发布后 sp2 回到首行（published+effStart 降序）');
w.eval('exitEdit()');

// ===== 9. vtpm：常驻空间单行 + 时间查询无副作用 =====
w.eval('backToList(); openDetailByCode("maas-product-vtpm-std")');
rows = dataRows();
ok(rows.length === 1 && rows[0].cells[2].textContent.trim() === 'sp1', 'vtpm 常驻空间单行');
ok(rows[0].cells[4].textContent.trim() === '—', 'fn 空串单元 Function 列=—（不区分 function）');
ok((d.getElementById('space-tbody').textContent.match(/未指定/g) || []).length === 0, '无「未指定」行');

console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
