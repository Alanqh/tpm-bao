// 冒烟（第38轮口径）：空间吸收空间计划——空间本体携带 档期/优先级/三态/多fn 配置；售卖计划锁定单空间且时间 ⊆ 空间档期
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '../prototype/admin-products.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const w = dom.window;

let pass = 0, fail = 0;
const alerts = [];
w.alert = (m) => alerts.push(String(m));
w.confirm = () => true;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }

w.eval(`
window.__T = {
  effectiveSpaceAt, nextSpaceSwitchOfFn, currentSpaceOfFn,
  get spaces(){return spaces}, get spaceSeq(){return spaceSeq},
  get timeFilter(){return timeFilter}, set timeFilter(v){timeFilter=v},
  get saleUnits(){return saleUnits},
  openDetailByCode, backToList, startEdit, exitEdit,
  renderSpaceTab, openSpacePlanModal, confirmSpacePlan, publishSpacePlan, stopSpacePlan, copySpacePlan,
  openSpacePlanDetail, closeSpacePlanDetail,
  get planRows(){return planRows}, get planRowStatuses(){return planRowStatuses},
  openPlanCreatePage, onPlanSpaceChange, planTimeWithinSpace, confirmPlanCreate, editPlanRow,
  openDetailNameEdit, closeDetailNameEdit, confirmDetailNameEdit,
  closeModal, guardEdit, activePlansInSpace
};
`);
const T = w.__T;

// ===== 1. glm4 装载：第48轮单空间（sp1 三 fn 常规）=====
T.openDetailByCode('maas-online-text-glm4');
ok(Object.keys(T.spaces).length === 1, 'glm4 装载 1 个售卖空间（第48轮简化），实得 ' + Object.keys(T.spaces).length);
ok(T.spaces.sp1.name === 'GLM4·常规售卖空间' && T.spaces.sp1.status === 'published', 'sp1 常规空间 published');

// ===== 2. 空间仲裁：effectiveSpaceAt（纯空间本体仲裁；单空间任意时刻均 sp1）=====
const effMid = T.effectiveSpaceAt('input', '2026-11-15 12:00:00');
ok(effMid.key === 'sp1' && effMid.source === 'plan', '11-15 input=sp1（第48轮单空间口径），实得 ' + JSON.stringify({ key: effMid.key, source: effMid.source }));
ok(T.effectiveSpaceAt('input', '2026-11-01 12:00:00').key === 'sp1', '11-01 input=sp1');
const effAfter = T.effectiveSpaceAt('input', '2026-11-25 12:00:00');
ok(effAfter.key === 'sp1', '11-25 input=sp1');
ok(T.effectiveSpaceAt('output', '2026-11-15 00:00:00').key === 'sp1', 'output=sp1');
ok(T.effectiveSpaceAt('cache', '2026-11-15 00:00:00').key === 'sp1', 'cache=sp1');

// ===== 3. 优先级 + seq 仲裁 =====
// 造一个 output 的新空间 sp3（同优先级 → 后建 seq 大胜出）
w.eval('spaceSeq = Math.max(spaceSeq, 3); spaces["sp3"] = { seq: 3, name: "裁决·晚建空间", priority: 100, effStart: "2026-11-14 00:00:00", effEnd: "2026-11-16 00:00:00", status: "published", fnDims: { output: ["输入区间"] }, fnMeasures: { output: { "输入区间": ["0～128K"] } } }');
const arb1 = T.effectiveSpaceAt('output', '2026-11-15 00:00:00');
ok(arb1.key === 'sp3' && arb1.plan.name === '裁决·晚建空间', '同优先级（100）→ 后建 sp3 胜出，实得 ' + JSON.stringify({ key: arb1.key, plan: arb1.plan && arb1.plan.name }));
// 高优先级胜出（input：造 priority 900）
w.eval('spaces["sp4"] = { seq: 4, name: "裁决·高优先级", priority: 900, effStart: "2026-11-14 00:00:00", effEnd: "2026-11-16 00:00:00", status: "published", fnDims: { input: ["输入区间"] }, fnMeasures: { input: { "输入区间": ["0～128K"] } } }');
const arb2 = T.effectiveSpaceAt('input', '2026-11-15 00:00:00');
ok(arb2.key === 'sp4' && arb2.plan.name === '裁决·高优先级', '优先级 900>500 → sp4 胜出（优先级先于 seq），实得 ' + (arb2.plan && arb2.plan.name));
w.eval('delete spaces["sp3"]; delete spaces["sp4"]');

// ===== 4. 无候选 → key='' =====
ok(T.effectiveSpaceAt('input', '2025-01-01 00:00:00').key === '', '2025 年早于一切空间档期 → 无生效空间');
ok(T.effectiveSpaceAt('nonexist', '2026-11-15 00:00:00').key === '', '未知 fn 无任何空间配置 → key=""');

// ===== 5. nextSpaceSwitchOfFn（第48轮单空间：无未来切换）=====
ok(T.nextSpaceSwitchOfFn('input', '2026-11-01 12:00:00') === null, '11-01 后无切换（单空间，实得 ' + T.nextSpaceSwitchOfFn('input', '2026-11-01 12:00:00') + '）');
ok(T.nextSpaceSwitchOfFn('input', '2026-11-25 12:00:00') === null, '11-25 后无切换');

// ===== 6. 售卖空间 Tab：全空间展示（不再按时刻过滤；档期徽标按查询时刻）=====
T.renderSpaceTab();
let rows = w.document.querySelectorAll('#space-tbody tr');
ok(rows.length === 3, '全空间展示 3 行（sp1 三 fn，第34轮不合并），实得 ' + rows.length);
let tabTxt = w.document.getElementById('space-tbody').textContent;
ok(tabTxt.includes('sp1') && !tabTxt.includes('sp2'), '列表展示 sp1（第48轮无 sp2）');
ok(tabTxt.includes('GLM4·常规售卖空间'), '列表展示空间名称');
const ths = w.document.querySelectorAll('#inner-tab-space thead th');
ok(ths.length === 10, '售卖空间表头 10 列（第49轮生效起止拆两列；第52轮末列加操作），实得 ' + ths.length);
// 时间旅行 11-15：档期徽标（sp1 生效期内）
T.timeFilter = { point: '2026-11-15 12:00:00' };
T.renderSpaceTab();
tabTxt = w.document.getElementById('space-tbody').textContent;
ok(tabTxt.includes('生效期内'), '11-15 时 sp1 显示「生效期内」徽标');
T.timeFilter = null;
T.renderSpaceTab();

// ===== 7. 创建空间链路：弹窗 → 叉乘 → 待发布 → 发布 → 停用（有生效计划拦截）=====
T.startEdit();
const seqBefore = T.spaceSeq;
T.openSpacePlanModal();
const modal = w.document.getElementById('modal-spaceplan');
const fnBox = modal.querySelector('.sp-fn-check[data-fn="output"]');
fnBox.checked = true;
fnBox.dispatchEvent(new w.Event('change', { bubbles: true }));
const measBox = modal.querySelector('.sp-measure-check[data-fn="output"][data-dim="输入区间"][value="1M+"]');
if (measBox) measBox.checked = true;
if (measBox) measBox.checked = true;
w.document.getElementById('sp-name').value = '测试空间A';
w.document.getElementById('sp-priority').value = '150';
w.document.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
w.document.getElementById('sp-eff-end').value = '2026-12-10T00:00:00';
alerts.length = 0;
T.confirmSpacePlan();
const newKey = 'sp' + (seqBefore + 1);
ok(!!T.spaces[newKey], '保存新建空间 ' + newKey);
ok(T.spaces[newKey].status === 'pending_publish' && T.spaces[newKey].priority === 150, '新空间待发布 优先级150');
// 同优先级比较：新空间 150 > 常规 sp1 100
ok(T.effectiveSpaceAt('output', '2026-12-05 00:00:00').key === 'sp1', '待发布不参与仲裁（12-05 仍 sp1）');
ok(T.saleUnits.some(u => u.spaceKey === newKey && u.dim === '输入区间' && u.measure === '1M+'), '新空间自动叉乘生成售卖单元（输入区间×1M+）');
T.publishSpacePlan(newKey);
ok(T.effectiveSpaceAt('output', '2026-12-05 00:00:00').key === newKey, '发布后 12-05 output=' + newKey + '（150>100 高优先级胜出）');
// 停用拦截：先造一个该空间内生效中的售卖计划（时间旅行到空间档期内，activePlansInSpace 按查询时刻判定）
w.eval(`planRows.push({name:'拦截测试计划', spaceKey:'${newKey}', units:[], unitStates:{}, modes:{}, effStart:'2026-12-02 00:00:00', effEnd:'2026-12-08 00:00:00', priority:100}); planRowStatuses.push('published')`);
T.timeFilter = { point: '2026-12-05 00:00:00' };
ok(T.activePlansInSpace(newKey).length === 1, '空间内生效中计划 1 个');
alerts.length = 0;
T.stopSpacePlan(newKey);
ok(T.spaces[newKey].status !== 'stopped' && alerts.some(m => m.includes('请先停用')), '有生效计划时停用被拦截（提示先停用计划）');
// 停掉计划后再停空间 → 成功
w.eval(`planRowStatuses[planRowStatuses.length-1] = 'stopped'`);
T.stopSpacePlan(newKey);
ok(T.spaces[newKey].status === 'stopped' && T.effectiveSpaceAt('output', '2026-12-05 00:00:00').key === 'sp1', '计划停用后空间可停用 → 12-05 output 回落 sp1');
T.timeFilter = null;

// ===== 8. 空间复制（第52轮：复制不直接保存，打开创建弹窗预填，保存才落库）=====
const unitsBeforeCopy = T.saleUnits.filter(u => u.spaceKey === newKey).length;
const seqBefore2 = T.spaceSeq;
T.copySpacePlan(newKey);
const copyKey = 'sp' + (seqBefore2 + 1);
const spModal = w.document.getElementById('modal-spaceplan');
ok(!T.spaces[copyKey], '复制后未直接落库（无 ' + copyKey + '）');
ok(spModal && !spModal.classList.contains('hidden'), '复制打开创建弹窗');
ok(w.document.getElementById('spaceplan-modal-title').textContent.includes('复制自'), '弹窗标题含「复制自」');
ok(w.document.getElementById('sp-name').value.includes('副本'), '弹窗预填名称含「副本」');
// 保存才落库
T.confirmSpacePlan();
ok(!!T.spaces[copyKey] && T.spaces[copyKey].status === 'pending_publish', '保存后新空间 ' + copyKey + ' 待发布');
ok(T.spaces[copyKey].name.includes('副本'), '副本名称含「副本」');
ok(T.saleUnits.filter(u => u.spaceKey === copyKey).length === unitsBeforeCopy, '副本空间叉乘生成同数售卖单元（' + unitsBeforeCopy + ' 个）');

// ===== 9. 快照透传 =====
T.backToList();
T.openDetailByCode('maas-online-text-glm4');
ok(T.spaces[newKey] && T.spaces[newKey].status === 'stopped', '快照恢复：新空间 stopped');
ok(T.spaces[copyKey] && T.spaces[copyKey].status === 'pending_publish', '快照恢复：副本空间待发布');

// ===== 10. 售卖计划锁定空间 + 时间范围校验 =====
// glm4 常规计划（idx0）锁定 sp1：时间在 sp1 档期内
const p0 = T.planRows[0];
ok(p0.spaceKey === 'sp1' && p0.effStart >= T.spaces.sp1.effStart && p0.effEnd <= T.spaces.sp1.effEnd, '常规计划锁定 sp1 且时间 ⊆ sp1 档期');
ok(p0.units.length === 4 && p0.units.every(u => T.saleUnits.find(s => s.id === u).spaceKey === 'sp1'), '常规计划 4 单元均在 sp1 内（第48轮）');
// 创建计划：不选空间 → 拦截（需编辑态）
T.startEdit();
T.openPlanCreatePage();
w.document.getElementById('plan-name').value = '测试计划X';
w.document.getElementById('plan-eff-start').value = '2026-11-12T00:00:00';
w.document.getElementById('plan-eff-end').value = '2026-11-19T00:00:00';
alerts.length = 0;
T.confirmPlanCreate();
ok(alerts.some(m => m.includes('请选择售卖空间')), '不选空间保存被拦截');
// 选 sp1 但时间超范围 → 拦截（sp1 档期至 2027-11-01，填 2027-12-31 超界）
const sel = w.document.getElementById('plan-space-sel');
sel.value = 'sp1';
sel.dispatchEvent(new w.Event('change', { bubbles: true }));
w.document.getElementById('plan-eff-end').value = '2027-12-31T00:00:00';
alerts.length = 0;
T.confirmPlanCreate();
ok(alerts.some(m => m.includes('生效范围')), '时间超空间档期保存被拦截');
ok(!T.planTimeWithinSpace(), 'planTimeWithinSpace 超界=false');
// 时间收回档期内 → 保存成功（默认全勾 sp1 内单元 su-1~4）
w.document.getElementById('plan-eff-end').value = '2026-11-19T00:00:00';
alerts.length = 0;
T.confirmPlanCreate();
const created = T.planRows[T.planRows.length - 1];
ok(alerts.length === 0 && created && created.name === '测试计划X', '档期内计划保存成功');
ok(created.spaceKey === 'sp1' && created.units.every(u => T.saleUnits.find(s => s.id === u).spaceKey === 'sp1'), '新计划锁定 sp1 且单元均属 sp1');

// ===== 11. 名称快编（contenteditable）=====
T.openDetailByCode('maas-product-vtpm-std');
const titleEl = w.document.getElementById('detail-title-name');
const infoEl = w.document.getElementById('detail-info-name');
T.openDetailNameEdit('title');
ok(titleEl.getAttribute('contenteditable') === 'true', '快编打开：标题 span contenteditable=true');
titleEl.textContent = '改名测试商品';
titleEl.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
// jsdom 下 onkeydown 以属性方式挂载，Enter 触发同步 confirm
ok(titleEl.getAttribute('contenteditable') !== 'true', 'Enter 后关闭编辑态');
ok(w.eval('currentProduct.name') === '改名测试商品', 'currentProduct.name 已更新');
ok(infoEl.textContent === '改名测试商品', '基本信息卡片名称同步');
// 快照透传
T.backToList();
T.openDetailByCode('maas-product-vtpm-std');
ok(w.eval('currentProduct.name') === '改名测试商品', '快照恢复：名称持久化');

// ===== 12. vtpm 商品：常驻空间 fn=''→sp1 =====
ok(T.effectiveSpaceAt('', '2026-11-01 00:00:00').key === 'sp1', 'vtpm std 当前生效=sp1（常驻空间）');
T.exitEdit();
T.renderSpaceTab();
ok(w.document.getElementById('space-tbody').textContent.includes('sp1'), 'vtpm 列表显示 sp1（code）');
T.renderSpaceTab();

console.log(`\n冒烟结果: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
