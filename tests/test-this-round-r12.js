// 第38轮验证：①编辑锁位于基本信息卡片之后、Tab 卡片之前 ②创建售卖空间（fn→维度→度量三层勾选 → 保存叉乘自动生成售卖单元）③基本信息卡片商品名称快捷编辑（contenteditable）④空间不可改：复制=唯一变更路径
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
window.backToList();

// ===== 2. 基本信息卡片商品名称快捷编辑（第38轮：contenteditable 就地编辑） =====
section('2. 基本信息名称快编（contenteditable）');
window.openDetailByCode('maas-product-vtpm-pre');
const infoBtn = document.getElementById('detail-info-name-edit-btn');
const infoName = document.getElementById('detail-info-name');
ok(!!infoBtn && !!infoName, '基本信息卡片名称旁有铅笔');
ok(infoName.textContent === 'vTPM 预留资源包（预）', '名称初始正确');
ok(!document.getElementById('detail-name-edit-wrap') && !document.getElementById('detail-name-input'), '无独立输入框（contenteditable 方案）');
window.openDetailNameEdit('info');
ok(infoName.getAttribute('contenteditable') === 'true', '点击铅笔 → 名称 span 就地可编辑');
ok(infoName.classList.contains('outline'), '编辑态描边');
infoName.textContent = '预商品·第38轮改名';
window.confirmDetailNameEdit();
ok(infoName.getAttribute('contenteditable') !== 'true', '确认后关闭编辑态');
ok(infoName.textContent === '预商品·第38轮改名', '保存后基本信息卡片同步新名称');
ok(document.getElementById('detail-title-name').textContent === '预商品·第38轮改名', '标题同步');
ok(window.eval('allProducts.find(p=>p.code==="maas-product-vtpm-pre").name') === '预商品·第38轮改名', '改名写回 allProducts');
// 取消：Esc 语义 → closeDetailNameEdit 恢复
window.openDetailNameEdit('info');
window.closeDetailNameEdit();
ok(infoName.getAttribute('contenteditable') !== 'true', '取消恢复非编辑态');
window.backToList();

// ===== 3. 创建售卖空间弹窗结构：fn+维度+度量三层勾选 =====
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
// 取消 fn → 维度+度量全清空禁用（第38轮 onSpFnCheck 新增联动）
inDim.checked = true;
inDim.dispatchEvent(new window.Event('change', { bubbles: true }));
inMeas.checked = true;
inBox.checked = false;
inBox.dispatchEvent(new window.Event('change', { bubbles: true }));
ok(inDim.checked === false && inMeas.checked === false, '取消 fn → 维度+度量全清空');
ok(inDim.disabled === true, '取消 fn → 维度禁用');
// 重新勾回继续后续测试
inBox.checked = true;
inBox.dispatchEvent(new window.Event('change', { bubbles: true }));
inDim.checked = true;
inDim.dispatchEvent(new window.Event('change', { bubbles: true }));

// ===== 4. 校验：勾维度不勾度量拦截 =====
section('4. 校验');
alertMsg = '';
document.getElementById('sp-name').value = 'r38 测试空间';
document.getElementById('sp-priority').value = '100';
window.confirmSpacePlan();
ok(alertMsg.includes('至少勾选一个度量'), '勾维度漏度量 → 拦截: ' + alertMsg);

// ===== 5. 叉乘生成：输入1度量 × 输出2度量 = 2 个单元（一个空间含一个 fn） =====
section('5. 叉乘生成');
document.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入token区间"][value="0～128K"]').checked = true;
const outDim = document.querySelector('.sp-dim-check[data-fn="input"][value="输出token区间"]');
outDim.checked = true;
outDim.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelector('.sp-measure-check[data-fn="input"][data-dim="输出token区间"][value="0～4K"]').checked = true;
document.querySelector('.sp-measure-check[data-fn="input"][data-dim="输出token区间"][value="16K+"]').checked = true;
alertMsg = '';
const keyBefore = window.eval('spaceSeq');
window.confirmSpacePlan();
const newKey = 'sp' + (keyBefore + 1);
ok(alertMsg.includes('已自动生成售卖单元 2 个'), '保存提示叉乘 2 个（输入1×输出2）: ' + alertMsg.slice(-30));
ok(window.eval('spaces["' + newKey + '"] && spaces["' + newKey + '"].status') === 'pending_publish', '新空间待发布');
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + newKey + '").length') === 2, '新空间 2 个单元');
const dims = window.eval('JSON.stringify(saleUnits.filter(u => u.spaceKey === "' + newKey + '").map(u => u.measure).sort())');
ok(dims.includes('0～128K + 0～4K') && dims.includes('0～128K + 16K+'), '笛卡尔积组合正确: ' + dims);

// ===== 6. 空间不可改：无修改入口；复制=唯一变更路径（新空间+同构单元，旧空间保留） =====
section('6. 空间不可改/复制');
ok(typeof window.editSpacePlan === 'undefined', 'editSpacePlan 函数已删（空间不可改）');
const spaceCnt = window.eval('Object.keys(spaces).length');
const unitsInOld = window.eval('saleUnits.filter(u => u.spaceKey === "' + newKey + '").length');
window.copySpacePlan(newKey);
ok(window.eval('Object.keys(spaces).length') === spaceCnt + 1, '复制 → 新建空间');
ok(alertMsg.includes('副本'), '复制提示含副本: ' + alertMsg.slice(-40));
const keys = window.eval('Object.keys(spaces).sort((a,b)=>spaces[a].seq-spaces[b].seq)');
const copyKey = keys[keys.length - 1];
ok(window.eval('spaces["' + copyKey + '"].status') === 'pending_publish', '副本空间待发布');
ok(window.eval('spaces["' + copyKey + '"].name.includes("副本")'), '副本名称含「副本」');
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + copyKey + '").length') === unitsInOld, '副本空间叉乘生成同数单元（' + unitsInOld + ' 个）');
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + newKey + '").length') === unitsInOld, '旧空间单元保留（不可删除）');

// ===== 7. SU Tab 纯只读 + 删除链路全删 =====
section('7. SU Tab 只读');
ok(!document.getElementById('su-create-btn'), '创建售卖单元按钮已删');
ok(!document.getElementById('modal-su-confirm'), 'SU 弹窗已删');
ok(typeof window.removeSaleUnit === 'undefined' && typeof window.confirmSaleUnits === 'undefined' && typeof window.openSuConfirmModal === 'undefined', 'removeSaleUnit/confirmSaleUnits/openSuConfirmModal 函数全删');
const suHead = Array.from(document.querySelectorAll('#inner-tab-saleunit thead th')).map(th => th.textContent.trim());
ok(suHead.length === 14, 'SU 表头 14 列（无操作列）');
// SU Tab 空间列（第2列）带三态徽标 + code
const suSpaceCell = Array.from(document.querySelectorAll('#saleunit-tbody tr')).map(r => r.cells[1].textContent);
ok(suSpaceCell.some(t => t.includes('sp1') && t.includes('已发布')), 'SU 空间列展示空间 code + 三态徽标: ' + suSpaceCell[0]);

// ===== 8. 第38轮：售卖计划 Tab 与详情页带空间信息 =====
section('8. 退出与收尾');
window.eval('exitEdit(); backToList()');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
