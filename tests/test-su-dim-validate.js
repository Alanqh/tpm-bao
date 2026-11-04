// 第37/38轮：售卖空间创建弹窗的维度/度量校验 + 叉乘生成售卖单元（空间聚合根口径）
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

// std 持锁后测试售卖空间创建的校验与叉乘
window.openDetailByCode('maas-product-vtpm-std');
window.startEdit();

// 场景1：空名称 → 拦截
window.openSpacePlanModal();
const fnBox = document.querySelector('.sp-fn-check[data-fn=""]');
fnBox.checked = true;
fnBox.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelector('.sp-measure-check[data-fn=""][data-dim="购买量区间"][value="1～100"]').checked = true;
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('请填写空间名称'), '空名称 → 拦截: ' + alertMsg);

// 场景2：新弹窗——勾 fn('')，购买量区间勾选但漏选度量，购买周期勾 30天 → 拦截（购买量区间漏选度量）
window.openSpacePlanModal();
const fnBox2 = document.querySelector('.sp-fn-check[data-fn=""]');
fnBox2.checked = true;
fnBox2.dispatchEvent(new window.Event('change', { bubbles: true }));
document.getElementById('sp-name').value = '校验空间甲';
const dcA = document.querySelector('.sp-dim-check[data-fn=""][value="购买量区间"]');
dcA.checked = true;
dcA.dispatchEvent(new window.Event('change', { bubbles: true }));
const dcB = document.querySelector('.sp-dim-check[data-fn=""][value="购买周期"]');
dcB.checked = true;
dcB.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelector('.sp-measure-check[data-fn=""][data-dim="购买周期"][value="30天"]').checked = true;
const suCount0 = window.eval('saleUnits.length');
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('购买量区间') && alertMsg.includes('至少勾选一个度量'), '勾维度漏选度量 → 拦截并提示: ' + alertMsg);
ok(window.eval('saleUnits.length') === suCount0, '售卖单元未生成');

// 场景3：补勾购买量区间 1～100 → 成功（1×1=1 个单元叉乘生成）
document.querySelector('.sp-measure-check[data-fn=""][data-dim="购买量区间"][value="1～100"]').checked = true;
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存') && alertMsg.includes('已自动生成售卖单元 1 个'), '两维各一 → 叉乘 1 个: ' + alertMsg.slice(-30));
const newKey = window.eval('"sp" + spaceSeq'); // 最新创建的空间 key
ok(window.eval('spaces["' + newKey + '"].name') === '校验空间甲', '新空间入 spaces（聚合根）');
ok(window.eval('spaces["' + newKey + '"].fnDims[""].join(",")') === '购买量区间,购买周期', '空间携带 fnDims 配置');
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + newKey + '").length') === 1, '新空间下 1 个单元');
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + newKey + '")[0].dim') === '购买量区间 + 购买周期', '生成二元售卖单元（dim 顺序=勾选维度序）');

// 场景4：fn 不勾 → 拦截（至少勾选一个 function）
window.openSpacePlanModal();
document.getElementById('sp-name').value = '校验空间乙';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('至少勾选一个 function'), '不勾任何 fn → 拦截: ' + alertMsg);

// 场景5：effStart > effEnd → 拦截
window.openSpacePlanModal();
document.getElementById('sp-name').value = '校验空间丙';
document.getElementById('sp-eff-start').value = '2026-12-10T00:00:00';
document.getElementById('sp-eff-end').value = '2026-12-01T00:00:00';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('生效开始不能晚于生效结束'), '起止倒置 → 拦截: ' + alertMsg);

// 场景6：0 维度（fn 勾选+维度不选）→ 生成唯一单元（第35/37轮）
window.openSpacePlanModal();
const fnBox6 = document.querySelector('.sp-fn-check[data-fn=""]');
fnBox6.checked = true;
fnBox6.dispatchEvent(new window.Event('change', { bubbles: true }));
document.getElementById('sp-name').value = '校验空间丁';
alertMsg = '';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存（待发布）') && alertMsg.includes('已自动生成售卖单元 1 个'), '0 维度空间 → 唯一单元自动生成: ' + alertMsg.slice(-40));
const k6 = window.eval('"sp" + spaceSeq');
ok(window.eval('spaces["' + k6 + '"].status') === 'pending_publish', '新空间=待发布');
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + k6 + '").length') === 1, '0 维度空间 1 个单元');
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + k6 + '")[0].dim') === '', '0 维度单元 dim/measure 空串');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
