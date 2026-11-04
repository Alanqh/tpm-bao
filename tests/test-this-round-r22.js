// 第22/23轮历史验证——第38轮口径重写：空间=聚合根（fnDims/fnMeasures/档期/优先级/三态），无 spacePlans 实体
// 聚焦：弹窗校验、多 fn 共空间、跨 fn 同维度集合、快照恢复链路、优先级仲裁
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('/Users/lqh/Documents/ChatGPT/TPM保障包/prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const { window } = dom;
const alerts = [];
window.alert = m => alerts.push(String(m));
window.confirm = () => true;
const w = window;
const d = w.document;
let step = 0, fail = 0;
function ok(cond, msg) { step++; if (!cond) { fail++; console.log('FAIL[' + step + '] ' + msg); } }

// 1. mock 校验（第38轮：glm4 sp1 三fn一空间 + sp2 双11空间）
w.eval('openDetailByCode("maas-online-text-glm4")');
ok(w.eval('Object.keys(spaces).length') === 2, 'glm4 两空间（sp1 常规/sp2 双11）');
ok(w.eval('spaces["sp1"].fnMeasures !== undefined && spaces["sp1"].measures === undefined'), '空间有 fnMeasures 无旧 measures 字段');
ok(w.eval('spaces["sp1"].status') === 'published' && w.eval('spaces["sp2"].priority') === 500, 'sp1 published / sp2 优先级500');
// 2. 详情列表（第38轮：全空间展示，sp1 三行 + sp2 一行）
const spRows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(spRows.length === 4, '空间列表 4 行（sp1×3fn + sp2×1）');
ok(spRows.some(r => r.textContent.includes('输入区间 + 费用发生日 + 费用发生时间')), '维度列展示 dims');
// 3. currentSpaceOfFn（第38轮：纯空间仲裁）
ok(w.eval('currentSpaceOfFn("input")') === 'sp1', 'input 当前 sp1（sp2 未到档期）');
ok(w.eval('currentSpaceOfFn("output")') === 'sp1', 'output 当前 sp1');
ok(w.eval('currentSpaceOfFn("cache")') === 'sp1', 'cache 当前 sp1');
// 4. 时间旅行 11-15：双11空间（priority 500）接管 input→sp2
w.eval('timeFilter = { point: "2026-11-15 00:00:00" }; renderSpaceTab()');
ok(w.eval('currentSpaceOfFn("input")') === 'sp2', '11-15 双11空间接管 input→sp2（priority 500>100）');
const midRows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(midRows.length === 4 && midRows.some(r => r.cells[0] && r.cells[0].textContent.trim() === 'sp2' && r.textContent.includes('生效期内')), '11-15 列表 sp2 行显示生效期内');
w.eval('timeFilter = null; renderSpaceTab()');
// 5. SU 创建链路已删（第37轮）
ok(!d.getElementById('modal-su-confirm'), 'SU 弹窗已删除');
ok(w.eval('typeof openSuConfirmModal') === 'undefined', 'openSuConfirmModal 函数已删');
// 7. r43 两步弹窗：勾 fn 后直接勾度量（无维度复选）；未勾度量也可保存（生成全缺省组合）
w.eval('startEdit()');
w.eval('openSpacePlanModal()');
let box7 = d.querySelector('.sp-fn-check[data-fn="input"]');
box7.checked = true;
box7.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(!d.querySelector('.sp-dim-check'), '第43轮：维度复选已删');
ok(d.querySelector('.sp-measure-check[data-dim="输入区间"][value="0～128K"]') && !d.querySelector('.sp-measure-check[data-dim="输入区间"][value="0～128K"]').disabled, '勾 fn 后度量直接可勾');
d.getElementById('sp-name').value = 'r43 空间甲（零维）';
d.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
w.eval('confirmSpacePlan()');
ok(alerts[alerts.length - 1].includes('已保存'), '未勾度量也可保存（r43 全缺省）: ' + (alerts[alerts.length - 1] || '').slice(0, 24));
ok(w.eval('spaceSeq') === 3, '新建 sp3（input 零维）');
ok(w.eval('spaces["sp3"].fnDims.input.length') === 0, 'sp3 input fnDims 空（未勾度量）');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp3").length') === 1, 'sp3 仅 1 全缺省单元');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp3")[0].dim') === '', 'sp3 单元 dim=空（全缺省）');
// 7b. 两维度度量全勾 → (3+1)×(2+1)=12 组合（含缺省交叉与全缺省）
w.eval('openSpacePlanModal()');
box7 = d.querySelector('.sp-fn-check[data-fn="input"]');
box7.checked = true;
box7.dispatchEvent(new w.Event('change', { bubbles: true }));
['输入区间', '费用发生日'].forEach(dd => {
  d.querySelectorAll('.sp-measure-check[data-dim="' + dd + '"]').forEach(c => { c.checked = true; });
});
d.getElementById('sp-name').value = 'r43 空间乙（全勾）';
d.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
w.eval('confirmSpacePlan()');
ok(w.eval('spaceSeq') === 4, '新建 sp4（input 输入区间3档×费用发生日2档全勾）');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp4").length') === 12, 'sp4 叉乘 12 单元（(3+1)×(2+1) 含缺省）');
// 8. 独立空间：cache + 两维度各一度量（跨 fn 可同维度集合）→ sp5，(1+1)×(1+1)=4 组合
w.eval('openSpacePlanModal()');
const box8 = d.querySelector('.sp-fn-check[data-fn="cache"]');
box8.checked = true;
box8.dispatchEvent(new w.Event('change', { bubbles: true }));
d.querySelectorAll('.sp-measure-check[data-dim="输入区间"]').forEach(c => { c.checked = c.value === '0～128K'; });
d.querySelectorAll('.sp-measure-check[data-dim="费用发生日"]').forEach(c => { c.checked = c.value === '周一至周五'; });
d.getElementById('sp-name').value = 'r43 空间丙';
d.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
w.eval('confirmSpacePlan()');
ok(w.eval('spaces["sp5"].fnDims.cache.length') === 2, 'sp5 fnDims.cache 两维度（跨 fn 同集合允许）');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp5").length') === 4, 'sp5 叉乘 4 组合（0～128K×周一至周五/单缺省/交叉缺省/全缺省）');
// 8b. 多 fn 共空间（第47轮嵌套式：output/input 各自卡片独立勾选）→ 一个空间 sp6，每 fn 2 组合
w.eval('openSpacePlanModal()');
const boxOut9 = d.querySelector('.sp-fn-check[data-fn="output"]');
boxOut9.checked = true;
boxOut9.dispatchEvent(new w.Event('change', { bubbles: true }));
d.querySelector('.sp-measure-check[data-fn="output"][data-dim="输入区间"][value="1M+"]').checked = true;
const boxIn9 = d.querySelector('.sp-fn-check[data-fn="input"]');
boxIn9.checked = true;
boxIn9.dispatchEvent(new w.Event('change', { bubbles: true }));
d.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入区间"][value="0～128K"]').checked = true;
d.getElementById('sp-name').value = 'r43 空间丁（多fn）';
d.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
d.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
w.eval('confirmSpacePlan()');
ok(alerts[alerts.length - 1].includes('sp6'), '多 fn 共一个空间 sp6: ' + (alerts[alerts.length - 1] || '').slice(0, 40));
ok(w.eval('Object.keys(spaces["sp6"].fnDims).join(",")') === 'input,output', 'sp6 含 input+output 两 fn（键序=fnPool DOM 序）');
ok(d.querySelector === d.querySelector && w.eval('spaces["sp6"].fnMeasures.output["输入区间"].join()') === '1M+' && w.eval('spaces["sp6"].fnMeasures.input["输入区间"].join()') === '0～128K', 'sp6 两 fn 度量各自独立（output=1M+ / input=0～128K）');
ok(w.eval('saleUnits.filter(u => u.spaceKey === "sp6").length') === 4, 'sp6 每 fn (1+1)=2 组合，共 4（per-fn 配置）');
// 11. 返回列表（快照 glm4 编辑结果）→ vtpm 商品：无 fn 单行生效
w.eval('exitEdit(); backToList()');
w.eval('openDetailByCode("maas-product-vtpm-std")');
const vRows = Array.from(d.querySelectorAll('#space-tbody tr'));
ok(vRows.length === 1, 'vtpm 单行（sp1 常驻空间）');
ok(vRows[0].cells[3].textContent.includes('—'), 'Function 列显示 —');
ok(w.eval('currentSpaceOfFn("")') === 'sp1', 'vtpm 当前 sp1');
// 12. snapshot 链路（第38轮）：glm4 新建空间后返回列表再进入，spaces/spaceSeq 恢复
w.eval('openDetailByCode("maas-online-text-glm4")');
const spCntBefore = w.eval('Object.keys(spaces).length');
ok(spCntBefore === 6, '快照恢复 6 个空间（sp1/sp2 + 新建 sp3/sp4/sp5/sp6），实得 ' + spCntBefore);
ok(w.eval('spaces["sp6"].name') === 'r43 空间丁（多fn）', '快照恢复空间名称');
ok(w.eval('spaces["sp6"].status') === 'pending_publish', '快照恢复空间三态');
// 13. publishSpacePlan(sp6)：priority 0 低于 sp1 100 → 不接管
w.eval('startEdit()');
w.eval('publishSpacePlan("sp6")');
ok(w.eval('currentSpaceOfFn("input")') === 'sp1', 'sp6 发布后 priority 默认 0 < sp1 100 → 不接管（优先级仲裁）');
w.eval('exitEdit(); backToList()');
console.log('结果: ' + step + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
