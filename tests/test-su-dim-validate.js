// 第37轮：空间计划创建弹窗的维度/度量校验 + 叉乘生成售卖单元（原 SU 弹窗校验的转译版）
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('/Users/lqh/Documents/ChatGPT/TPM保障包/prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;
window.confirm = () => true;
let pass = 0, fail = 0, alertMsg = '';
window.alert = (m) => { alertMsg = m; };
const ok = (c, msg) => { c ? (pass++, console.log('  ✓ ' + msg)) : (fail++, console.log('  ✗ ' + msg)); };

// std 持锁后测试空间计划创建的校验与叉乘
window.openDetailByCode('maas-product-vtpm-std');
window.startEdit();

// 场景1：勾 fn('')+两维度、只勾购买周期 30天 → 拦截（购买量区间漏选度量）
window.openSpacePlanModal();
const fnBox = document.querySelector('.sp-fn-check[data-fn=""]');
fnBox.checked = true;
fnBox.dispatchEvent(new window.Event('change', { bubbles: true }));
['购买量区间', '购买周期'].forEach(dim => {
  const dc = document.querySelector('.sp-dim-check[data-fn=""][value="' + dim + '"]');
  dc.checked = true;
  dc.dispatchEvent(new window.Event('change', { bubbles: true }));
});
document.querySelector('.sp-measure-check[data-fn=""][data-dim="购买周期"][value="30天"]').checked = true;
document.getElementById('sp-name').value = '校验计划甲';
const suCount0 = window.eval('saleUnits.length');
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('购买量区间') && alertMsg.includes('至少勾选一个度量'), '勾维度漏选度量 → 拦截并提示: ' + alertMsg);
ok(window.eval('saleUnits.length') === suCount0, '售卖单元未生成');

// 场景2：补勾购买量区间 1～100 → 成功（1×1=1 个单元叉乘生成）
document.querySelector('.sp-measure-check[data-fn=""][data-dim="购买量区间"][value="1～100"]').checked = true;
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存') && alertMsg.includes('已自动生成售卖单元 1 个'), '两维各一 → 叉乘 1 个: ' + alertMsg.slice(-30));
const newKey = window.eval('spacePlans[spacePlans.length-1].fnSpaces[""]');
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + newKey + '").length') === 1, '新空间下 1 个单元');
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + newKey + '")[0].dim') === '购买量区间 + 购买周期', '生成二元售卖单元（dim 顺序=勾选维度序）');

// 场景3：fn 不勾 → 拦截（至少勾选一个 function）
window.openSpacePlanModal();
document.getElementById('sp-name').value = '校验计划乙';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('至少勾选一个 function'), '不勾任何 fn → 拦截: ' + alertMsg);

// 场景4：0 维度（fn 勾选+维度不选）→ 生成唯一单元（第35/37轮）
window.openSpacePlanModal();
const fnBox4 = document.querySelector('.sp-fn-check[data-fn=""]');
fnBox4.checked = true;
fnBox4.dispatchEvent(new window.Event('change', { bubbles: true }));
document.getElementById('sp-name').value = '校验计划丙';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('0 维度') && alertMsg.includes('已自动生成售卖单元 1 个'), '0 维度空间 → 唯一单元自动生成: ' + alertMsg.slice(-40));

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
