// 第22轮→第23轮：空间只管维度（无 measures）；单一合并列表 + 状态列 + setSpaceActive；本套件聚焦：
// 弹窗内多行互相重复拦截、多行批量创建、跨 fn 可同维度集合、fnSpaceMap 显式配置/回退/SU 默认生效空间、快照恢复链路
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

// 1. mock 校验（第23轮口径：空间只有 fn+dims）
w.eval('openDetailByCode("maas-online-text-glm4")');
w.eval('startEdit()'); // 持有编辑锁（变更类操作需先发起变更）
ok(w.eval('spaces["sp2"].measures === undefined'), '空间无 measures 字段');
ok(w.eval('spaces["sp1"].dims.length') === 2 && w.eval('spaces["sp1"].fn') === '', 'sp1（vtpm）两维度 fn=""');
// 2. 详情列表（合并列表）
const spRows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(spRows.length === 4, '空间列表 4 行（sp2~sp5，sp1 属无 fn 不在池）');
ok(spRows[1].cells[3].textContent.includes('输入token区间 + 输出token区间'), '维度列展示 dims');
ok(spRows[2].cells[1].textContent.includes('未生效'), 'sp3 未生效');
// 3. currentSpaceOfFn（mock 配置优先）
ok(w.eval('currentSpaceOfFn("input")') === 'sp2', 'input 当前 sp2');
ok(w.eval('currentSpaceOfFn("output")') === 'sp4', 'output 当前 sp4');
ok(w.eval('currentSpaceOfFn("cache")') === 'sp5', 'cache 当前 sp5');
// 4. setSpaceActive 切换 + 回退
w.eval('setSpaceActive("sp3")');
ok(w.eval('currentSpaceOfFn("input")') === 'sp3', 'input 切到 sp3');
ok(alerts[alerts.length - 1].includes('生效售卖空间已切换'), '切换提示: ' + (alerts[alerts.length - 1] || '').slice(0, 18));
w.eval('fnSpaceMap["input"] = ""');
ok(w.eval('currentSpaceOfFn("input")') === 'sp2', '清配置回退 sp2（seq 最早）');
// 5. SU 弹窗：input 默认 sp2（生效空间）、度量=全量（3+3=6）
w.eval('openSuConfirmModal()');
d.getElementById('su-fn-select').value = 'input';
w.eval('onSuFnChange()');
ok(d.getElementById('su-space-select').value === 'sp2', 'SU 默认空间=生效空间 sp2');
ok(d.querySelectorAll('#su-confirm-body input.su-leaf').length === 6, 'SU 候选度量=全量 6');
// 6. 切 sp3：单维度仍全量 3
w.eval('document.getElementById("su-space-select").value = "sp3"; onSuSpaceChange()');
ok(d.querySelectorAll('#su-confirm-body input.su-leaf').length === 3, 'sp3 候选=全量单维度 3');
w.eval('closeModal("su-confirm")');
// 7. 批量创建：与已有 fn 空间维度集合相同 → 拦截
w.eval('openSpaceBulkModal()');
const row0 = d.querySelector('.space-row');
row0.querySelector('.space-row-fn').value = 'input';
['输入token区间', '输出token区间'].forEach(dm => {
  const c = row0.querySelector('.space-dim-check[value="' + dm + '"]');
  c.checked = true;
  c.dispatchEvent(new w.Event('change', { bubbles: true }));
});
w.eval('confirmSpaceBulk()');
ok(alerts[alerts.length - 1].includes('不可重复创建'), '重复维度集合被拦截: ' + (alerts[alerts.length - 1] || '').slice(0, 24));
// 8. 弹窗内多行互相重复 → 拦截（两行同为 cache+两 token 维度，均不与 sp5 重复）
w.eval('openSpaceBulkModal()');
w.eval('addSpaceRow()');
const rows8 = Array.from(d.querySelectorAll('.space-row'));
rows8.forEach(r => {
  r.querySelector('.space-row-fn').value = 'cache';
  ['输入token区间', '输出token区间'].forEach(dm => {
    r.querySelector('.space-dim-check[value="' + dm + '"]').checked = true;
  });
});
w.eval('confirmSpaceBulk()');
ok(alerts[alerts.length - 1].includes('多行 function 与维度集合相同'), '弹窗内两行互相重复拦截: ' + (alerts[alerts.length - 1] || '').slice(0, 20));
ok(w.eval('spaceSeq') === 5, '拦截未创建空间');
// 9. 跨 fn 可同维度集合：cache+两 token 维度（sp5=cache 仅输入token维度，不重复）→ 成功创建 sp6
const rowA = d.querySelectorAll('.space-row')[0];
const rowB = d.querySelectorAll('.space-row')[1];
rowA.querySelector('.space-row-fn').value = 'cache';
rowB.remove(); // 只留一行 cache+两维度
w.eval('confirmSpaceBulk()');
ok(alerts[alerts.length - 1].includes('已创建 1 个售卖空间'), 'cache+两 token 维度创建成功: ' + (alerts[alerts.length - 1] || '').slice(0, 18));
ok(w.eval('spaceSeq') === 6, 'spaceSeq=6');
ok(w.eval('spaces["sp6"].fn') === 'cache' && w.eval('spaces["sp6"].dims.length') === 2, 'sp6 fn=cache 两维度');
ok(w.eval('spaces["sp6"].measures') === undefined, '新空间无 measures（只管维度）');
// 10. 多行成功创建：sp7（output+购买量区间）+ sp8（input+购买周期）不同 fn 不同维度集合
w.eval('openSpaceBulkModal()');
w.eval('addSpaceRow()');
const r10a = d.querySelectorAll('.space-row')[0];
const r10b = d.querySelectorAll('.space-row')[1];
r10a.querySelector('.space-row-fn').value = 'output';
r10a.querySelector('.space-dim-check[value="购买量区间"]').checked = true;
r10b.querySelector('.space-row-fn').value = 'input';
r10b.querySelector('.space-dim-check[value="购买周期"]').checked = true;
w.eval('confirmSpaceBulk()');
ok(alerts[alerts.length - 1].includes('已创建 2 个售卖空间'), '两行一次性创建 2 个空间: ' + (alerts[alerts.length - 1] || '').slice(0, 18));
ok(w.eval('spaces["sp7"].name') === '售卖空间7' && w.eval('spaces["sp8"].name') === '售卖空间8', '名称连续自增 sp7/sp8');
// 11. 返回列表（快照 glm4 编辑结果）→ vtpm 商品：无 fn 单行生效
w.eval('backToList()');
w.eval('openDetailByCode("maas-product-vtpm-std")');
const vRows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(vRows.length === 1, 'vtpm 单行（sp1）');
ok(vRows[0].cells[0].textContent.includes('—'), 'Function 列显示 —');
ok(w.eval('currentSpaceOfFn("")') === 'sp1', 'vtpm 当前 sp1');
// 12. snapshot 链路：glm4 设为生效 sp3 后返回列表再进入，fnSpaceMap 恢复
w.eval('openDetailByCode("maas-online-text-glm4")');
w.eval('setSpaceActive("sp3")');
w.eval('backToList()');
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(w.eval('currentSpaceOfFn("input")') === 'sp3', '快照恢复 input→sp3（设为生效持久）');
// 13. 快照还含新建空间：sp6（cache 第二空间）在重进后存在且未生效
ok(w.eval('spaces["sp6"].fn') === 'cache', '快照恢复新建空间 sp6');
const rows13 = Array.from(d.querySelectorAll('#space-tbody tr'));
const sp6Row = rows13.find(r => r.textContent.includes('sp6'));
ok(!!sp6Row && sp6Row.textContent.includes('未生效'), 'sp6 重进后未生效（sp5 仍为 cache 生效）');
console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
