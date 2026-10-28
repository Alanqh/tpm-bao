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

// std 打开详情拿锁，构造"新商品式"场景：清空售卖单元后测试创建
window.openDetailByCode('maas-product-vtpm-std');
window.startEdit();

// 场景1：全新（无已确认维度），只勾购买周期 30天 → 拦截（购买量区间漏选）
window.eval('saleUnits = [];');
window.openSuConfirmModal();
document.querySelector('.su-leaf[data-dim="购买周期"][data-measure="30天"]').checked = true;
alertMsg = '';
window.confirmSaleUnits();
ok(alertMsg.includes('购买量区间') && alertMsg.includes('至少需要选择一个度量'), '只勾购买周期 → 拦截并提示漏选维度: ' + alertMsg);
ok(window.eval('saleUnits.length') === 0, '售卖单元未生成');

// 场景2：两维各勾一个 → 成功（1×1=1 个单元）
alertMsg = '';
document.querySelector('.su-leaf[data-dim="购买量区间"][data-measure="1～100"]').checked = true;
window.confirmSaleUnits();
ok(alertMsg.includes('已创建售卖单元：1 个'), '两维各一 → 创建成功 1 个');
ok(window.eval('saleUnits.length') === 1 && window.eval('saleUnits[0].dim') === '购买量区间 + 购买周期', '生成二元售卖单元');

// 场景3：一个维度全空 → 拦截
window.eval('saleUnits = [];');
window.openSuConfirmModal();
alertMsg = '';
window.confirmSaleUnits();
ok(alertMsg.includes('请至少勾选一个度量'), '全部不勾 → 原提示拦截');

// 场景4：已有已确认维度（disabled checked 天然计入）——std 默认数据下，加勾另一维度单度量
window.eval('saleUnits = JSON.parse(JSON.stringify(defaultSaleUnits["maas-product-vtpm-std"]));');
window.openSuConfirmModal();
// su-1/su-2 涉及勾选都是 disabled；手动取消一个可选项再试：购买周期 90天 已确认，购买量区间 1～100 已确认
// 构造：取消勾选（jsdom 可改 DOM）购买量区间的 500+（未确认态才能操作——500+ 本来就没勾）
// 直接勾 购买量区间 500+ + 购买周期 90天（90天 disabled checked 已计入）→ 应成功 9 个（3+1 × 3）
document.querySelector('.su-leaf[data-dim="购买量区间"][data-measure="500+"]').checked = true;
alertMsg = '';
window.confirmSaleUnits();
ok(alertMsg.includes('已创建售卖单元'), '已确认维度 + 新增勾选 → 校验通过并创建（' + window.eval('saleUnits.length') + ' 个）');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
