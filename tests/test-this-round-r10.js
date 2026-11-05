// 第10轮验证：编辑锁（发起变更/退出变更/他人持锁提示/置灰/护栏）
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('/Users/lqh/Documents/ChatGPT/TPM保障包/prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;
window.confirm = () => true; // 打桩：退出变更确认框自动确认
let pass = 0, fail = 0;
let alertMsg = '';
window.alert = (m) => { alertMsg = m; };
const ok = (c, msg) => { c ? (pass++, console.log('  ✓ ' + msg)) : (fail++, console.log('  ✗ ' + msg)); };
const section = (t) => console.log('\n== ' + t + ' ==');

// ===== 1. std：进入详情页默认浏览态，变更按钮置灰 =====
section('1. 默认浏览态（无锁）');
window.openDetailFromListed('maas-product-vtpm-std');
const suBtn = document.getElementById('plan-create-btn');
const planBtn = document.getElementById('spaceplan-new-btn');
ok(suBtn.disabled === true, '创建售卖计划按钮置灰');
ok(planBtn.disabled === true, '创建空间计划按钮置灰');
ok(suBtn.classList.contains('opacity-40'), '置灰样式 opacity-40');
const bar = document.getElementById('edit-lock-bar');
ok(bar.textContent.includes('发起变更'), '锁栏显示「发起变更」按钮');
// 第37轮：编辑锁位于基本信息卡片之后、Tab 卡片之前，居左
const firstCard = bar.parentElement.querySelector('.admin-card');
ok(!!firstCard && (firstCard.compareDocumentPosition(bar) & window.Node.DOCUMENT_POSITION_FOLLOWING), '锁栏在基本信息卡片之后');
ok(bar.nextElementSibling && bar.nextElementSibling.classList.contains('admin-card'), '锁栏之后是 Tab 卡片');
ok(bar.previousElementSibling && bar.previousElementSibling.classList.contains('admin-card'), '锁栏之前是基本信息卡片');
ok(bar.className.includes('justify-start'), '锁栏居左（justify-start）');
// 第37轮：售卖单元不可删除（由空间计划叉乘生成）；操作入口统一为计划/空间计划
ok(typeof window.removeSaleUnit === 'undefined', 'removeSaleUnit 函数已删除（售卖单元一律不可删）');
// 护栏：直接调用操作被拦截
alertMsg = '';
window.publishPlanRow(0);
ok(alertMsg.includes('发起变更'), '无锁时 publishPlanRow 被拦截并提示');
ok(window.eval('planRowStatuses[0]') === 'published', '实际状态未变（published 本来就是）');
alertMsg = '';
window.stopPlanRow(0);
ok(alertMsg.includes('发起变更') && window.eval('planRowStatuses[0]') === 'published', '无锁时 stopPlanRow 被拦截');

// ===== 2. 发起变更：进入编辑态 =====
section('2. 发起变更');
window.startEdit();
ok(window.eval('editMode') === 'owner', 'editMode=owner');
ok(suBtn.disabled === false && planBtn.disabled === false, '创建按钮恢复可用');
ok(!suBtn.classList.contains('opacity-40'), '置灰样式移除');
ok(bar.textContent.includes('编辑中') && bar.textContent.includes('退出变更'), '锁栏显示 编辑中+退出变更');
ok(bar.textContent.includes('lvqing01'), '编辑中徽标含持锁人 passport');

// ===== 3. 编辑态下操作放行 =====
section('3. 编辑态操作');
// 创建售卖计划入口可进
window.openPlanCreatePage();
ok(!document.getElementById('plan-create-view').classList.contains('hidden'), '可打开创建售卖计划页面');
window.closePlanCreatePage();
// 空间计划弹窗可开（第37轮：售卖单元由此叉乘生成）
window.startEdit();
window.openSpacePlanModal();
ok(!document.getElementById('spaceplan-create-view').classList.contains('hidden'), '可打开创建空间计划弹窗');
window.eval('closeSpacePlanPage()');
// 发布已有待发布计划：先把计划0改待发布再发布
window.eval('planRowStatuses[0] = "pending_publish"; renderPlan();');
window.openPlanDetail(0);
ok(document.getElementById('plan-detail-actions').textContent.includes('发布'), '详情页操作区有发布按钮');
window.publishPlanRow(0);
ok(window.eval('planRowStatuses[0]') === 'published', '编辑态下发布成功');
// 操作区未置灰
ok(!document.getElementById('plan-detail-actions').querySelector('div').className.includes('opacity-40'), '编辑态操作区不置灰');
window.closePlanDetail();

// ===== 4. 退出变更释放锁 =====
section('4. 退出变更');
window.exitEdit();
ok(window.eval('editMode') === false, 'editMode=false');
ok(window.eval('editLocks["maas-product-vtpm-std"]') === null, '锁已释放');
ok(suBtn.disabled === true, '退出后按钮再次置灰');
ok(bar.textContent.includes('发起变更'), '锁栏恢复「发起变更」');

// ===== 5. 他人持锁：pro 由张三编辑 =====
section('5. 他人持锁提示');
window.backToList();
window.openDetailFromListed('maas-product-vtpm-pro');
ok(window.eval('editMode') === false, '他人持锁时为浏览态');
ok(bar.textContent.includes('张三') && bar.textContent.includes('zhangsan01') && bar.textContent.includes('正在编辑'), '显示「当前由 张三（zhangsan01）正在编辑」');
ok(!bar.textContent.includes('发起变更'), '他人持锁时不显示发起变更按钮');
ok(suBtn.disabled === true && planBtn.disabled === true, '变更按钮仍置灰');
// 已发布计划详情页操作区置灰（第18轮：复制按钮豁免置灰——置灰块为容器内首个 div）
window.openPlanDetail(0);
const actDiv = document.getElementById('plan-detail-actions').querySelector('div.pointer-events-none');
ok(actDiv && actDiv.className.includes('opacity-40') && actDiv.className.includes('pointer-events-none'), '详情页操作区置灰（修改/停用；复制豁免在外）');
window.closePlanDetail();
// 发起变更被拦截
window.startEdit();
ok(window.eval('editMode') === false, '他人持锁时发起变更失败');
ok(typeof alertMsg === 'string', '发起变更被拦截提示');
// 发布操作被拦截并提示持锁人
alertMsg = '';
window.publishPlanRow(0);
ok(alertMsg.includes('张三') && alertMsg.includes('zhangsan01'), '发布被拦截并提示持锁人: ' + alertMsg);

// ===== 6. 第37轮：售卖单元不可删除（SU Tab 无删除按钮，函数已删） =====
section('6. 售卖单元不可删除（第37轮）');
window.backToList();
window.openPendingDetail(0);
ok(!document.getElementById('su-create-btn'), 'SU Tab「创建售卖单元」按钮已删除');
const suHead = Array.from(document.querySelectorAll('#inner-tab-saleunit thead th')).map(th => th.textContent.trim());
ok(suHead.length === 14 && !suHead.includes('操作'), 'SU 表头 14 列（操作列已删），实得 ' + suHead.length);
// 第42轮：默认时刻只显唯一生效空间——pre 空间待发布 → 空态行；空态行同样无删除入口
const delCell = Array.from(document.querySelectorAll('#saleunit-tbody tr'))[0];
ok(delCell && !delCell.textContent.includes('删除') && !delCell.textContent.includes('🔒'), '售卖单元行无删除入口（pre 默认空态行，第42轮）');

// ===== 7. 第38轮：商品名称快速编辑（contenteditable 就地编辑，无独立输入框，无需编辑锁） =====
section('7. 商品名称快速编辑（第38轮 contenteditable）');
window.backToList();
window.openDetailByCode('maas-product-vtpm-pre');
const editBtn = document.getElementById('detail-name-edit-btn');
const titleSpan = document.getElementById('detail-title-name');
const infoSpan = document.getElementById('detail-info-name');
const infoEditBtn = document.getElementById('detail-info-name-edit-btn');
ok(!editBtn, '标题旁铅笔已删（第51轮：仅详情页基本信息卡入口）');
ok(!!titleSpan && !!infoSpan && !!infoEditBtn, '标题 span + 基本信息卡片铅笔存在');
ok(!document.getElementById('detail-name-edit-wrap') && !document.getElementById('detail-name-input'), '旧输入条/输入框已删除（contenteditable 方案）');
ok(titleSpan.getAttribute('contenteditable') !== 'true', '初始非编辑态（无 contenteditable）');
// 打开编辑：就地 contenteditable + 描边（第51轮：仅基本信息卡片入口）
window.openDetailNameEdit('info');
ok(infoSpan.getAttribute('contenteditable') === 'true', '点击基本信息卡铅笔 → info span contenteditable=true');
ok(infoSpan.classList.contains('outline'), '编辑态描边样式');
// 空名拦截
infoSpan.textContent = '';
window.confirmDetailNameEdit();
ok(alertMsg.includes('不能为空'), '空名称拦截');
// 空名拦截会关闭编辑态（source 复位），需重新打开
window.openDetailNameEdit('info');
infoSpan.textContent = '预发布商品改名版';
window.confirmDetailNameEdit();
ok(infoSpan.getAttribute('contenteditable') !== 'true', '确认后关闭编辑态');
ok(infoSpan.textContent === '预发布商品改名版' && window.eval('currentProduct.name') === '预发布商品改名版', '保存后 currentProduct.name 已更新（无需编辑锁）');
ok(titleSpan.textContent === '预发布商品改名版', '标题名称同步（两处共享）');
ok(window.eval('allProducts.find(p=>p.code==="maas-product-vtpm-pre").name') === '预发布商品改名版', '改名写回 allProducts（重新进入详情不回退）');
// 基本信息卡片入口再次编辑
window.openDetailNameEdit('info');
ok(infoSpan.getAttribute('contenteditable') === 'true' && titleSpan.getAttribute('contenteditable') !== 'true', '从基本信息卡片进入编辑（仅 info span 可编辑）');
window.closeDetailNameEdit();
ok(infoSpan.getAttribute('contenteditable') !== 'true', '取消恢复非编辑态');
window.openDetailNameEdit('info');
infoSpan.textContent = '预发布商品二次改名';
window.confirmDetailNameEdit();
ok(document.getElementById('detail-info-name').textContent === '预发布商品二次改名' && titleSpan.textContent === '预发布商品二次改名', '保存后两处名称同步');
// 改名不回退（backToList → 重新进入）
window.backToList();
window.openDetailByCode('maas-product-vtpm-pre');
ok(window.eval('currentProduct.name') === '预发布商品二次改名', '重新进入详情名称保持（写回 allProducts）');
window.backToList();

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
