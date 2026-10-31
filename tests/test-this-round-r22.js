// 第22轮：售卖空间简化——空间含维度+度量、fn 当前空间直配（currentSpaceOfFn/setFnSpace/快照恢复）、创建拦截、编辑度量、SU 候选=空间配置
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const { window } = dom;
const alerts = [];
window.alert = m => alerts.push(String(m));
window.confirm = () => true;
const w = window;
let step = 0, fail = 0;
function ok(cond, msg) { step++; if (!cond) { fail++; console.log('FAIL[' + step + '] ' + msg); } }

// 1. mock 校验（先进入详情装载 mock；用 std 商品装载 defaultSpaces）
w.eval('openDetailByCode("maas-online-text-glm4")');
w.eval('startEdit()'); // 持有编辑锁（变更类操作需先发起变更）
ok(w.eval('spaces["sp2"].measures["输入token区间"].length') === 3, 'sp2 输入token 3 measures');
ok(w.eval('spaces["sp1"].dims.length') === 2, 'sp1 dims 2');
// 2. 详情视图校验
ok(w.document.getElementById('fn-space-cards').textContent.includes('售卖空间2'), 'fn 卡显示售卖空间2');
ok(w.document.getElementById('space-tbody').querySelectorAll('tr').length === 4, '空间列表 4 行（sp2~sp5，sp1 属无 fn 不在池）');
ok(w.document.getElementById('space-tbody').textContent.includes('0～128K、128K～1M、1M+'), '维度:度量 列展示度量');
// 3. currentSpaceOfFn（mock 配置优先；已持有编辑锁）
ok(w.eval('currentSpaceOfFn("input")') === 'sp2', 'input 当前 sp2');
ok(w.eval('currentSpaceOfFn("output")') === 'sp4', 'output 当前 sp4');
ok(w.eval('currentSpaceOfFn("cache")') === 'sp5', 'cache 当前 sp5');
// 4. setFnSpace 切换 + 回退
w.eval('setFnSpace("input", "sp3")');
ok(w.eval('currentSpaceOfFn("input")') === 'sp3', 'input 切到 sp3');
w.eval('setFnSpace("input", "")');
ok(w.eval('currentSpaceOfFn("input")') === 'sp2', '清配置回退 sp2（seq 最早）');
// 5. SU 弹窗：input 默认 sp2、度量=空间配置（3+3=6）
w.eval('openSuConfirmModal()');
w.document.getElementById('su-fn-select').value = 'input';
w.eval('onSuFnChange()');
ok(w.document.getElementById('su-space-select').value === 'sp2', 'SU 默认空间 sp2');
ok(w.document.querySelectorAll('#su-confirm-body input.su-leaf').length === 6, 'SU 候选度量 6（空间配置）');
// 6. 切 sp3：单维度 3 度量
w.eval('document.getElementById("su-space-select").value = "sp3"; onSuSpaceChange()');
ok(w.document.querySelectorAll('#su-confirm-body input.su-leaf').length === 3, 'sp3 候选 3');
w.eval('closeModal("su-confirm")');
// 7. 批量创建：同 fn 相同维度集合 → 拦截提交
w.eval('openSpaceBulkModal()');
const row0 = w.document.querySelector('.space-row');
row0.querySelector('.space-row-fn').value = 'input';
['输入token区间', '输出token区间'].forEach(d => {
  const c = row0.querySelector('.space-dim-check[value="' + d + '"]');
  c.checked = true;
  c.dispatchEvent(new w.Event('change', { bubbles: true }));
});
w.eval('confirmSpaceBulk()');
ok(alerts[alerts.length - 1].includes('已存在维度集合相同'), '重复维度集合被拦截: ' + (alerts[alerts.length - 1] || '').slice(0, 24));
// 8. 换维度集合（cache fn + 两 token 维度，不与 sp5 重复）→ 创建成功 sp6，度量默认全选
row0.querySelector('.space-row-fn').value = 'cache';
row0.querySelector('.space-dim-check[value="输出token区间"]').dispatchEvent(new w.Event('change', { bubbles: true }));
w.eval('confirmSpaceBulk()');
ok(w.eval('spaceSeq') === 6, 'spaceSeq=6');
ok(w.eval('spaces["sp6"].dims.length') === 2, 'sp6 两维度');
ok(w.eval('spaces["sp6"].measures["输入token区间"].length') === 3, 'sp6 度量默认全选 3');
// 9. 弹窗内取消部分度量再创建 sp7（output fn + 购买量两维度，勾部分度量）
w.eval('openSpaceBulkModal()');
const row1 = w.document.querySelector('.space-row');
row1.querySelector('.space-row-fn').value = 'output';
['购买量区间', '购买周期'].forEach(d => {
  const c = row1.querySelector('.space-dim-check[value="' + d + '"]');
  c.checked = true;
  c.dispatchEvent(new w.Event('change', { bubbles: true }));
});
// 取消 500+ 和 90天
row1.querySelector('.space-msr-check[data-dim="购买量区间"][data-measure="500+"]').checked = false;
row1.querySelector('.space-msr-check[data-dim="购买周期"][data-measure="90天"]').checked = false;
w.eval('confirmSpaceBulk()');
ok(w.eval('spaceSeq') === 7, 'spaceSeq=7');
ok(JSON.stringify(w.eval('spaces["sp7"].measures["购买量区间"]')) === JSON.stringify(['1～100', '100～500']), 'sp7 部分度量');
// 10. 度量全不勾 → 拦截（input + 单输出token维度，非重复集合）
w.eval('openSpaceBulkModal()');
const row2 = w.document.querySelector('.space-row');
row2.querySelector('.space-row-fn').value = 'input';
const c2 = row2.querySelector('.space-dim-check[value="输出token区间"]');
c2.checked = true;
c2.dispatchEvent(new w.Event('change', { bubbles: true }));
row2.querySelectorAll('.space-msr-check').forEach(c => { c.checked = false; });
w.eval('confirmSpaceBulk()');
ok(alerts[alerts.length - 1].includes('至少勾选一个度量'), '空度量拦截');
w.eval('closeModal("space-edit")');
// 11. 编辑度量：sp2 移除「1M+」；被引用度量置灰
w.eval('editSpaceMeasures("sp2")');
const locked = w.document.querySelector('.sme-check[data-dim="输入token区间"][data-measure="128K～1M"]');
ok(locked && locked.disabled && locked.checked, '被引用 128K～1M 置灰');
const free = w.document.querySelector('.sme-check[data-dim="输入token区间"][data-measure="1M+"]');
ok(free && !free.disabled, '1M+ 可编辑');
free.checked = false;
w.eval('confirmSpaceMeasureEdit()');
ok(!w.eval('spaces["sp2"].measures["输入token区间"]').includes('1M+'), '1M+ 已移除');
// 12. SU 弹窗再开 input@sp2：候选=2+3=5
w.eval('openSuConfirmModal()');
w.document.getElementById('su-fn-select').value = 'input';
w.eval('onSuFnChange()');
ok(w.document.querySelectorAll('#su-confirm-body .su-leaf').length === 5, '度量移除后 SU 候选 5');
// disabled pair 仍是 3 个（su-1/su-2 展开去重）
ok(w.document.querySelectorAll('#su-confirm-body input.su-leaf:checked:disabled').length === 3, 'pair 置灰 3');
w.eval('closeModal("su-confirm")');
// 13. vtpm 商品：无 fn 单卡
w.eval('openDetailByCode("maas-product-vtpm-std")');
ok(w.document.getElementById('fn-space-cards').textContent.includes('—（无 function）'), 'vtpm 无 fn 单卡');
ok(w.eval('currentSpaceOfFn("")') === 'sp1', 'vtpm 当前 sp1');
// 14. snapshot 链路：glm4 编辑后返回列表再进入，fnSpaceMap 恢复
w.eval('openDetailByCode("maas-online-text-glm4")');
w.eval('setFnSpace("input", "sp3")');
w.eval('backToList()');
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(w.eval('currentSpaceOfFn("input")') === 'sp3', '快照恢复 input→sp3');
console.log('\n结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
