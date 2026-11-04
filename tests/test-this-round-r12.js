// 第37轮验证：①编辑锁位于基本信息卡片之后、Tab 卡片之前 ②空间计划创建时选维度+度量 → 保存叉乘自动生成售卖单元（SU 弹窗/创建按钮/删除链路全删）③基本信息卡片商品名称快捷编辑
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
const section = (t) => console.log('\n== ' + t + ' ==');
const evalInPage = (expr) => window.eval(expr);

// ===== 1. 编辑锁位置：基本信息卡片之后、Tab 卡片之前，居左 =====
section('1. 编辑锁位置');
window.openDetailByCode('maas-product-vtpm-std');
const bar = document.getElementById('edit-lock-bar');
ok(!!bar, '锁栏存在');
const prevCard = bar.previousElementSibling;
ok(prevCard && prevCard.classList.contains('admin-card') && prevCard.querySelector('#detail-info'), '锁栏紧邻其后=基本信息卡片（在其下方）');
const nextCard = bar.nextElementSibling;
ok(nextCard && nextCard.classList.contains('admin-card') && nextCard.querySelector('#plan-tabs-card, .admin-tab'), '锁栏之后是 Tab 卡片');
ok(bar.className.includes('justify-start'), '锁栏居左');

// ===== 2. 基本信息卡片商品名称快捷编辑 =====
section('2. 基本信息名称快编');
window.openDetailByCode('maas-product-vtpm-pre');
const infoBtn = document.getElementById('detail-info-name-edit-btn');
const infoName = document.getElementById('detail-info-name');
ok(!!infoBtn && !!infoName, '基本信息卡片名称旁有铅笔');
ok(infoName.textContent === 'vTPM 预留资源包（预）', '名称初始正确');
window.openDetailNameEdit('info');
const wrap = document.getElementById('detail-name-edit-wrap');
ok(!wrap.classList.contains('hidden'), '点击铅笔出现行内输入条');
ok(document.getElementById('detail-name-edit-btn').classList.contains('hidden') && infoBtn.classList.contains('hidden'), '两处铅笔均隐藏');
document.getElementById('detail-name-input').value = '预商品·第37轮改名';
window.confirmDetailNameEdit();
ok(infoName.textContent === '预商品·第37轮改名', '保存后基本信息卡片同步新名称');
ok(document.getElementById('detail-title').textContent.includes('预商品·第37轮改名'), '标题同步');
window.backToList();

// ===== 3. 空间计划弹窗结构：fn+维度+度量三层勾选 =====
section('3. 弹窗结构');
window.openDetailByCode('maas-online-text-glm4');
window.startEdit();
window.openSpacePlanModal();
ok(document.querySelectorAll('.sp-fn-check').length === 3, '3 个 fn 复选行');
ok(document.querySelectorAll('.sp-dim-check').length === 12, '维度复选 12 个（3 fn × 4 维度）');
ok(document.querySelectorAll('.sp-measure-check').length > 0, '度量复选存在');
// 未勾 fn 时维度+度量禁用
const inBox = document.querySelector('.sp-fn-check[data-fn="input"]');
const inDim = document.querySelector('.sp-dim-check[data-fn="input"][value="输入token区间"]');
const inMeas = document.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入token区间"][value="0～128K"]');
ok(inDim.disabled === true && inMeas.disabled === true, '未勾 fn 时维度/度量禁用');
// 勾 fn → 维度可用、度量仍禁用（维度未勾）
inBox.checked = true;
inBox.dispatchEvent(new window.Event('change', { bubbles: true }));
ok(inDim.disabled === false, '勾 fn 后维度可用');
ok(inMeas.disabled === true, '维度未勾时度量仍禁用');
// 勾维度 → 度量可用；取消维度 → 度量清空+禁用
inDim.checked = true;
inDim.dispatchEvent(new window.Event('change', { bubbles: true }));
ok(inMeas.disabled === false, '勾维度后度量可用');
inMeas.checked = true;
inDim.checked = false;
inDim.dispatchEvent(new window.Event('change', { bubbles: true }));
ok(inMeas.checked === false && inMeas.disabled === true, '取消维度 → 度量清空并禁用（联动回收）');
inDim.checked = true;
inDim.dispatchEvent(new window.Event('change', { bubbles: true }));

// ===== 4. 校验：勾维度不勾度量拦截 =====
section('4. 校验');
alertMsg = '';
document.getElementById('sp-name').value = 'r37 测试计划';
const preAlertName = document.getElementById('sp-name').value;
window.confirmSpacePlan();
ok(alertMsg.includes('至少勾选一个度量'), '勾维度漏度量 → 拦截: ' + alertMsg);

// ===== 5. 叉乘生成：输入1度量 × 输出2度量 = 2 个单元 =====
section('5. 叉乘生成');
document.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入token区间"][value="0～128K"]').checked = true;
const outDim = document.querySelector('.sp-dim-check[data-fn="input"][value="输出token区间"]');
outDim.checked = true;
outDim.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelector('.sp-measure-check[data-fn="input"][data-dim="输出token区间"][value="0～4K"]').checked = true;
document.querySelector('.sp-measure-check[data-fn="input"][data-dim="输出token区间"][value="16K+"]').checked = true;
alertMsg = '';
window.confirmSpacePlan();
const planIdx = window.eval('spacePlans.length - 1');
const newKey = window.eval('spacePlans[' + planIdx + '].fnSpaces.input');
ok(alertMsg.includes('已自动生成售卖单元 2 个'), '保存提示叉乘 2 个（输入1×输出2）: ' + alertMsg.slice(-30));
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + newKey + '").length') === 2, '新空间 2 个单元');
const dims = window.eval('JSON.stringify(saleUnits.filter(u => u.spaceKey === "' + newKey + '").map(u => u.measure).sort())');
ok(dims.includes('0～128K + 0～4K') && dims.includes('0～128K + 16K+'), '笛卡尔积组合正确: ' + dims);

// ===== 6. 修改计划：集合不变沿用空间；变化新建空间（旧单元保留） =====
section('6. 修改幂等/变化');
const spaceCnt = window.eval('Object.keys(spaces).length');
window.eval('editSpacePlan(' + planIdx + ')');
window.confirmSpacePlan();
ok(window.eval('Object.keys(spaces).length') === spaceCnt, '维度+度量不变 → 沿用空间（不增殖）');
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + newKey + '").length') === 2, '单元幂等（仍 2 个）');
window.eval('editSpacePlan(' + planIdx + ')');
document.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入token区间"][value="128K～1M"]').checked = true;
window.confirmSpacePlan();
ok(window.eval('Object.keys(spaces).length') === spaceCnt + 1, '度量变化 → 新建空间');
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + newKey + '").length') === 2, '旧空间单元保留（不可删除）');
const newKey2 = window.eval('spacePlans[' + planIdx + '].fnSpaces.input');
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + newKey2 + '").length') === 4, '新空间叉乘 4 个（输入2×输出2）');

// ===== 7. SU Tab 纯只读 + 删除链路全删 =====
section('7. SU Tab 只读');
ok(!document.getElementById('su-create-btn'), '创建售卖单元按钮已删');
ok(!document.getElementById('modal-su-confirm'), 'SU 弹窗已删');
ok(typeof window.removeSaleUnit === 'undefined' && typeof window.confirmSaleUnits === 'undefined' && typeof window.openSuConfirmModal === 'undefined', 'removeSaleUnit/confirmSaleUnits/openSuConfirmModal 函数全删');
const suHead = Array.from(document.querySelectorAll('#inner-tab-saleunit thead th')).map(th => th.textContent.trim());
ok(suHead.length === 14, 'SU 表头 14 列（无操作列）');
window.eval('exitEdit(); backToList()');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
