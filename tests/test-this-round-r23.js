// 第23轮：售卖空间只管维度 + 单一合并列表（Function 列 rowspan + 状态列 生效中/未生效 + 设为生效按钮）
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const { window } = dom;
const alerts = [];
window.alert = m => alerts.push(String(m));
window.confirm = () => true;
const w = window;
const d = w.document;
let step = 0, fail = 0;
function ok(cond, msg) { step++; if (!cond) { fail++; console.log('FAIL[' + step + '] ' + msg); } }

// 1. 打开 glm4 + 持锁
w.eval('openDetailByCode("maas-online-text-glm4")');
w.eval('startEdit()');
// 2. 列表结构：6 列表头
const spHead = Array.from(d.querySelector('#space-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
ok(JSON.stringify(spHead.slice(0,4)) === JSON.stringify(['Function','售卖空间','状态','空间维度']), '表头前4列=Function/售卖空间/状态/空间维度: ' + spHead.join('/'));
ok(spHead.length === 6 && spHead[4] === '售卖单元数' && spHead[5] === '操作', '共 6 列');
// 3. 行序与 rowspan：fn 分组按字典序（cache < input < o），同 fn 连续
const rows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(rows.length === 4, '4 个空间行');
ok(rows[0].cells[0].textContent.trim() === 'cache' && rows[0].cells[0].rowSpan === 1, '首行 cache（字典序）');
const inputTd = rows[1].cells[0];
ok(inputTd.textContent.trim() === 'input' && inputTd.rowSpan === 2, 'input rowspan=2（sp2+sp3 合并）');
ok(rows[2].cells.length === 5, 'input 第二行（sp3）无 fn 列（合并后 5 cells）');
ok(rows[3].cells[0].textContent.trim() === 'output' && rows[3].cells[0].rowSpan === 1, 'output 独立 fn td');
// 4. 状态列：sp5/sp2/sp4 生效中（各 fn 配置）、sp3 未生效
ok(rows[0].textContent.includes('生效中'), 'sp5（cache）生效中');
ok(rows[1].textContent.includes('生效中'), 'sp2（input）生效中');
ok(rows[2].textContent.includes('未生效'), 'sp3（input 第二空间）未生效');
ok(rows[3].textContent.includes('生效中'), 'sp4（output）生效中');
// 5. 操作列：生效中显 —，未生效显「设为生效」
ok(rows[0].cells[rows[0].cells.length-1].textContent.trim() === '—', '生效行操作=—');
ok(rows[2].cells[rows[2].cells.length-1].textContent.includes('设为生效'), '未生效行=设为生效按钮');
// 6. setSpaceActive：sp3 设为生效 → 切换
w.eval('setSpaceActive("sp3")');
ok(w.eval('currentSpaceOfFn("input")') === 'sp3', 'input 生效空间切到 sp3');
const rows2 = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(rows2[2].textContent.includes('生效中') && rows2[1].textContent.includes('未生效'), '切换后状态对调');
// 7. 未持锁时按钮置灰：vtpm std（浏览态）
w.eval('backToList()');
w.eval('openDetailByCode("maas-product-vtpm-std")');
const vRows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(vRows.length === 1, 'vtpm 单行（sp1）');
ok(vRows[0].cells[0].textContent.trim() === '—' || vRows[0].cells[0].textContent.includes('—'), '无 fn 显示 —');
ok(vRows[0].textContent.includes('生效中'), 'sp1 生效中');
ok(vRows[0].cells[vRows[0].cells.length-1].textContent.includes('🔒') || vRows[0].cells[vRows[0].cells.length-1].textContent.trim() === '—', '浏览态无操作（唯一空间）');
// 8. 创建新空间后未生效 + 可设为生效
w.eval('startEdit()');
w.eval('openSpaceBulkModal()');
const row0 = d.querySelector('.space-row');
row0.querySelector('.space-row-fn').value = '';
['购买量区间'].forEach(dim => { row0.querySelector('.space-dim-check[value="' + dim + '"]').checked = true; });
w.eval('confirmSpaceBulk()');
ok(w.eval('spaceSeq') === 6, 'sp6 创建成功');
ok(w.eval('spaces["sp6"].dims.length') === 1, 'sp6 单维度');
ok(w.eval('spaces["sp6"].measures') === undefined, '空间无 measures 字段（只管维度）');
const rows3 = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(rows3.length === 2, 'vtpm 2 行（sp1 生效 + sp6 未生效）');
ok(rows3[1].textContent.includes('未生效'), '新空间 sp6 未生效');
ok(rows3[1].textContent.includes('设为生效'), 'sp6 有设为生效按钮');
// 9. 重复维度集合拦截（fn='' + 两维度=sp1 重复）
w.eval('openSpaceBulkModal()');
const rowD = d.querySelector('.space-row');
['购买量区间', '购买周期'].forEach(dim => { rowD.querySelector('.space-dim-check[value="' + dim + '"]').checked = true; });
w.eval('confirmSpaceBulk()');
ok(alerts[alerts.length-1].includes('不可重复创建'), '重复拦截: ' + alerts[alerts.length-1].slice(0,20));
w.eval('closeModal("space-edit")');
// 10. 切换 sp6 为生效
w.eval('setSpaceActive("sp6")');
ok(w.eval('currentSpaceOfFn("")') === 'sp6', 'vtpm 生效空间切到 sp6');
// 11. SU 弹窗：度量候选=全量（fn='' 无 fn 下拉默认 sp6 生效空间）
w.eval('openSuConfirmModal()');
ok(d.getElementById('su-space-select').value === 'sp6', 'SU 默认=生效空间 sp6');
ok(d.querySelectorAll('#su-confirm-body .su-leaf').length === 3, '度量候选=全量 3（非空间配置）');
w.eval('closeModal("su-confirm")');
// 12. 编辑度量功能已删
ok(!d.getElementById('modal-space-measure-edit'), '编辑度量弹窗已删');
ok(w.eval('typeof editSpaceMeasures') === 'undefined', 'editSpaceMeasures 函数已删');
ok(w.eval('typeof setFnSpace') === 'undefined', 'setFnSpace 已删（改 setSpaceActive）');
ok(!d.getElementById('fn-space-cards'), 'fn 配置卡已删（合并进列表）');
// 13. snapshot 恢复：glm4 input→sp3 配置在重进后保留
w.eval('backToList()');
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(w.eval('currentSpaceOfFn("input")') === 'sp3', '快照恢复 input→sp3（设为生效持久）');
console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
