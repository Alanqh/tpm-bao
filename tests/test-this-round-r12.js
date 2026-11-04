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
section('3. 弹窗结构（第44轮：fn 与维度度量分离不嵌套，无维度 checkbox）');
window.openDetailByCode('maas-online-text-glm4');
window.startEdit();
window.openSpacePlanModal();
ok(document.querySelectorAll('.sp-fn-check').length === 3, '3 个 fn 复选行');
ok(document.querySelectorAll('.sp-dim-check').length === 0, '第43轮：维度复选已删（直接勾度量）');
ok(document.querySelectorAll('.sp-measure-check').length > 0, '度量复选存在');
// 第44轮：function 与维度度量分离（不嵌套）——度量始终可用，与 fn 勾选无关
const inBox = document.querySelector('.sp-fn-check[data-fn="input"]');
const inMeas = document.querySelector('.sp-measure-check[data-dim="输入token区间"][value="0～128K"]');
ok(!document.getElementById('sp-fnspaces').querySelector('.sp-measure-check'), 'fn 区块内无度量（不嵌套）');
ok(!document.getElementById('sp-dimmeas').querySelector('.sp-fn-check'), '度量区块内无 fn（不嵌套）');
ok(inMeas.disabled === false, '度量始终可用（不随 fn 禁用）');
// fn 勾选不影响度量状态
inMeas.checked = true;
inBox.checked = false;
inBox.dispatchEvent(new window.Event('change', { bubbles: true }));
ok(inMeas.checked === true && inMeas.disabled === false, '取消 fn 不清空度量（r44 分离语义）');
inBox.checked = true;

// ===== 4. 校验：第43轮未勾任何度量也可保存（全缺省组合合法） =====
section('4. 校验');
alertMsg = '';
document.getElementById('sp-name').value = 'r43 空间A（全缺省）';
document.getElementById('sp-priority').value = '50';
document.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
document.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
window.confirmSpacePlan();
ok(alertMsg.includes('已保存'), '未勾度量 → 保存成功（生成全缺省组合单元）: ' + alertMsg.slice(0, 30));

// ===== 5. 叉乘生成：输入1度量 × 输出2度量 = (1+1)×(2+1) = 9 组合 =====
section('5. 叉乘生成');
window.openSpacePlanModal();
const inBox2 = document.querySelector('.sp-fn-check[data-fn="input"]');
inBox2.checked = true;
inBox2.dispatchEvent(new window.Event('change', { bubbles: true }));
document.querySelector('.sp-measure-check[data-dim="输入token区间"][value="0～128K"]').checked = true;
document.querySelector('.sp-measure-check[data-dim="输出token区间"][value="0～4K"]').checked = true;
document.querySelector('.sp-measure-check[data-dim="输出token区间"][value="16K+"]').checked = true;
alertMsg = '';
const keyBefore = window.eval('spaceSeq');
document.getElementById('sp-name').value = 'r43 叉乘空间';
document.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
document.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
window.confirmSpacePlan();
const newKey = 'sp' + (keyBefore + 1);
ok(alertMsg.includes('已自动生成售卖单元 6 个'), '保存提示叉乘 6 个（(1+1)×(2+1) 含缺省）: ' + alertMsg.slice(-40));
ok(window.eval('spaces["' + newKey + '"] && spaces["' + newKey + '"].status') === 'pending_publish', '新空间待发布');
ok(window.eval('saleUnits.filter(u => u.spaceKey === "' + newKey + '").length') === 6, '新空间 6 组合单元（输入2×输出3）');
const dims = window.eval('JSON.stringify(saleUnits.filter(u => u.spaceKey === "' + newKey + '").map(u => u.dim + "=" + u.measure).sort())');
ok(dims.includes('输入token区间 + 输出token区间=0～128K + 0～4K') && dims.includes('输入token区间=0～128K') && dims.includes('输出token区间=0～4K') && dims.includes('"="'), '缺省组合齐备（含全缺省=""）: ' + dims.slice(0, 90));

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
// SU Tab 空间列（第39轮起第 1 列，空间层级在 Function 之上）带三态徽标 + code
const suSpaceCell = Array.from(document.querySelectorAll('#saleunit-tbody tr')).map(r => r.cells[0].textContent);
ok(suSpaceCell.some(t => t.includes('sp1') && t.includes('已发布')), 'SU 空间列展示空间 code + 三态徽标: ' + suSpaceCell[0]);

// ===== 8. 第38轮：售卖计划 Tab 与详情页带空间信息 =====
section('8. 退出与收尾');
window.eval('exitEdit(); backToList()');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
