// 第52轮测试：①空间创建默认时间（开始=当前、结束=2099 末）②计划创建默认时间（开始=下一整 30 分钟、结束留空）
// ③计划时间失焦校验（须在空间档期内，越界红边+提示）④提交校验（生效开始晚于当前+10 分钟）
// ⑤发布/停用四函数弹窗 confirm ⑥复制：列表页按钮+复制不直接保存（空间=弹窗预填/计划=编辑页预填），保存才落库
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../prototype/admin-products.html'), 'utf8');

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name); } };
function section(t) { console.log('\n== ' + t + ' =='); }
let lastConfirmMsg = '';
function boot(opts) {
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: vc, pretendToBeVisual: true });
  dom.window.alert = () => {}; dom.window.confirm = () => true;
  return dom;
}
// 独立 boot：confirm 记录调用
function bootConfirmSpy() {
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: vc, pretendToBeVisual: true });
  dom.window.alert = () => {}; dom.window.confirm = (m) => { lastConfirmMsg = String(m); return true; };
  return dom;
}

// ===== ① 创建售卖空间默认时间 =====
{
  const dom = bootConfirmSpy(); const { window } = dom; const doc = window.document;
  section('① 空间创建默认时间');
  window.eval(`openDetailByCode('maas-product-vtpm-std'); startEdit();`);
  const confirmCalls = [];
  const rawConfirm = dom.window.confirm;
  dom.window.confirm = (m) => { confirmCalls.push(String(m)); return true; };
  window.eval(`openSpacePlanModal(null)`);
  // 第53轮：nowLocalStr 改本地时区口径（原 toISOString=UTC 比本地慢时差）→ 断言用本地拼串
  const dd = new Date(); const pp = n => String(n).padStart(2, '0');
  const now = dd.getFullYear() + '-' + pp(dd.getMonth() + 1) + '-' + pp(dd.getDate()) + 'T' + pp(dd.getHours()) + ':' + pp(dd.getMinutes());
  check('① 创建弹窗默认生效开始≈当前时刻（分钟级，本地时区）', doc.getElementById('sp-eff-start').value.slice(0, 16) === now);
  check('① 创建弹窗默认生效结束=2099-12-31T23:59:59', doc.getElementById('sp-eff-end').value === '2099-12-31T23:59:59');
  // 静态 HTML 不再有写死的 value
  const sHtml = html;
  check('① 静态 sp-eff-start 无写死 value', !/id="sp-eff-start"[^>]*value=/.test(sHtml) && !/value="[^"]*"[^>]*id="sp-eff-start"/.test(sHtml));
  // 编辑模式回填原值（sp1：2026-10-01 ~ 2027-11-01）
  window.eval(`closeSpacePlanPage(); openSpacePlanModal('sp1')`);
  check('① 编辑模式回填原档期开始', doc.getElementById('sp-eff-start').value.startsWith('2026-10-01T'));
  check('① 编辑模式回填原档期结束', doc.getElementById('sp-eff-end').value.startsWith('2027-11-01T'));
  window.eval(`closeSpacePlanPage(); exitEdit(); backToList()`);
}

// ===== ② 创建售卖计划默认时间 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  section('② 计划创建默认时间');
  window.eval(`openDetailByCode('maas-product-vtpm-std'); startEdit(); openPlanCreatePage()`);
  const half = window.eval('nextHalfHourStr()');
  // 校验 helper 本身：下一整 30 分钟
  check('② nextHalfHourStr 分钟数∈{00,30}', /T\d{2}:(00|30):00$/.test(half));
  // jsdom datetime-local 丢秒（秒=空截断）→ 分钟级比较
  check('② 默认生效开始=下一整 30 分钟', doc.getElementById('plan-eff-start').value === half.slice(0, 16));
  check('② 默认生效结束为空（手动填写）', doc.getElementById('plan-eff-end').value === '');
  // 静态无写死默认值
  check('② 静态 plan-eff-start 无写死 value', !/id="plan-eff-start"[^>]*value=/.test(html));
  check('② 静态 plan-eff-end 无写死 value', !/id="plan-eff-end"[^>]*value=/.test(html));
  // 重新打开（关闭再开）仍重置为当前下一整 30 分钟
  window.eval(`closePlanCreatePage(); openPlanCreatePage()`);
  check('② 重开创建页默认时间重置', doc.getElementById('plan-eff-start').value === window.eval('nextHalfHourStr()').slice(0, 16) && doc.getElementById('plan-eff-end').value === '');
  window.eval(`closePlanCreatePage(); exitEdit(); backToList()`);
}

// ===== ③ 计划时间失焦校验（超空间档期 → 红边 + 提示） =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  section('③ 失焦校验');
  let alertMsg = '';
  dom.window.alert = (m) => { alertMsg = String(m); };
  window.eval(`openDetailByCode('maas-product-vtpm-std'); startEdit(); openPlanCreatePage()`);
  doc.getElementById('plan-space-sel').value = 'sp1';
  window.eval('onPlanSpaceChange()');
  // std sp1 档期 2026-10-01 ~ 2027-11-01：生效结束填 2028-01-01 越界
  doc.getElementById('plan-eff-end').value = '2028-01-01T00:00:00';
  alertMsg = '';
  window.eval('onPlanTimeBlur()');
  check('③ 失焦越界触发 alert 提示档期范围', alertMsg.includes('生效范围') && alertMsg.includes('sp1'));
  const sEl = doc.getElementById('plan-eff-start'); const eEl = doc.getElementById('plan-eff-end');
  check('③ 越界红边（border-red-500 + ring）', eEl.classList.contains('border-red-500') && sEl.classList.contains('ring-1'));
  // 收回档期内 → 红边清除无提示
  doc.getElementById('plan-eff-end').value = '2026-12-31T00:00:00';
  alertMsg = '';
  window.eval('onPlanTimeBlur()');
  check('③ 收回档期内红边清除、无提示', !eEl.classList.contains('border-red-500') && alertMsg === '');
  // 生效开始早于空间档期开始（2026-09-01 < 2026-10-01）→ 越界
  doc.getElementById('plan-eff-start').value = '2026-09-01T00:00:00';
  alertMsg = '';
  window.eval('onPlanTimeBlur()');
  check('③ 生效开始早于空间开始也判越界', alertMsg.includes('生效范围') && sEl.classList.contains('border-red-500'));
  // 两个 input 均挂 onblur
  check('③ 两个时间 input 均绑定 onblur=onPlanTimeBlur', /id="plan-eff-start"[^>]*onblur="onPlanTimeBlur\(\)"/.test(html) && /id="plan-eff-end"[^>]*onblur="onPlanTimeBlur\(\)"/.test(html));
  window.eval(`closePlanCreatePage(); exitEdit(); backToList()`);
}

// ===== ④ 提交校验：生效开始须晚于当前时刻 10 分钟 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  section('④ 10 分钟提交校验');
  let alertMsg = '';
  dom.window.alert = (m) => { alertMsg = String(m); };
  window.eval(`openDetailByCode('maas-product-vtpm-std'); startEdit(); openPlanCreatePage()`);
  doc.getElementById('plan-space-sel').value = 'sp1';
  window.eval('onPlanSpaceChange()');
  doc.getElementById('plan-name').value = 'r52-十分钟校验计划';
  // 全部单元默认已勾选；计费/配额 perUnit 默认值即可
  const mk = (start, end) => {
    doc.getElementById('plan-eff-start').value = start;
    doc.getElementById('plan-eff-end').value = end;
    alertMsg = '';
    const before = window.eval('planRows.length');
    window.eval('confirmPlanCreate()');
    return { ok: alertMsg === '' && window.eval('planRows.length') === before + 1, msg: alertMsg };
  };
  // 第53轮：earliest 已改本地时区口径 → 测试时间也用本地拼串（原 toISOString=UTC 恒早被误判）
  const localStr = (ms) => { const d2 = new Date(Date.now() + ms); const p2 = n => String(n).padStart(2, '0'); return d2.getFullYear() + '-' + p2(d2.getMonth() + 1) + '-' + p2(d2.getDate()) + 'T' + p2(d2.getHours()) + ':' + p2(d2.getMinutes()); };
  // 生效开始=当前-1 小时 → 拦截
  const r1 = mk(localStr(-60 * 60 * 1000), '2026-12-31T00:00');
  check('④ 生效开始早于当前被拦截', !r1.ok && r1.msg.includes('10 分钟'));
  // 生效开始=当前+5 分钟 → 仍拦截
  const near = localStr(5 * 60 * 1000);
  const r2 = mk(near, '2026-12-31T00:00');
  check('④ 生效开始=当前+5分钟被拦截', !r2.ok && r2.msg.includes('10 分钟'));
  // 生效开始=当前+20 分钟 → 通过（第52轮真 bug 修复：earliest 统一空格口径比较，同日时间不再恒被拦截）
  const far = localStr(20 * 60 * 1000);
  const r3 = mk(far, '2026-12-31T00:00');
  check('④ 生效开始=当前+20分钟保存成功', r3.ok);
  const savedStart = window.eval(`planRows[planRows.length-1].effStart`);
  check('④ 保存的生效开始=提交值（分钟级，jsdom 丢秒）', savedStart === far.replace('T', ' '));
  // 修改旧计划不受 10 分钟限制（编辑 mock 既有计划；jsdom 丢秒 → 时间选档期内远离边界时刻）
  window.eval(`closePlanCreatePage()`);
  const savedCount = window.eval('planRows.length');
  window.eval(`editPlanRow(0)`);
  doc.getElementById('plan-eff-start').value = '2026-10-02T00:00';
  doc.getElementById('plan-eff-end').value = '2027-10-31T00:00';
  alertMsg = '';
  window.eval('confirmPlanCreate()');
  check('④ 修改旧计划（生效开始在过去）不被 10 分钟拦截', alertMsg === '' && window.eval('planRows.length') === savedCount);
  window.eval(`closePlanCreatePage(); exitEdit(); backToList()`);
}

// ===== ⑤ 发布/停用弹窗 confirm =====
{
  const dom = bootConfirmSpy(); const { window } = dom; const doc = window.document;
  section('⑤ 发布/停用 confirm');
  window.eval(`openDetailByCode('maas-product-vtpm-pro')`);
  // pro 默认由张三持锁（第10轮）→ 清锁后发起变更
  window.eval(`editLocks['maas-product-vtpm-pro'] = null; startEdit()`);
  // pro：sp1 published（可停用）；plan1 pending（可发布）→ 发布后可停用
  lastConfirmMsg = '';
  window.eval(`publishPlanRow(1)`);
  check('⑤ 发布售卖计划触发 confirm（文案含计划名）', lastConfirmMsg.includes('发布') && window.eval('planRowStatuses[1]') === 'published');
  lastConfirmMsg = '';
  window.eval(`stopPlanRow(1)`);
  check('⑤ 停用售卖计划触发 confirm', lastConfirmMsg.includes('停用') && window.eval('planRowStatuses[1]') === 'stopped');
  // 空间发布/停用（std pre 空间须创建…… 直接用 pro sp2：先造一个待发布空间）
  window.eval(`
    spaceSeq = Math.max(spaceSeq, 9);
    spaces["sp9"] = { seq: 9, name: "r52-确认测试空间", priority: 50, effStart: "2026-11-01 00:00:00", effEnd: "2027-11-01 00:00:00", status: "pending_publish", fnDims: {}, fnMeasures: {} };
    renderSpaceTab();
  `);
  lastConfirmMsg = '';
  window.eval(`publishSpacePlan('sp9')`);
  check('⑤ 发布售卖空间触发 confirm（文案含空间名+key）', lastConfirmMsg.includes('r52-确认测试空间') && lastConfirmMsg.includes('sp9') && window.eval('spaces["sp9"].status') === 'published');
  lastConfirmMsg = '';
  window.eval(`stopSpacePlan('sp9')`);
  check('⑤ 停用售卖空间触发 confirm', lastConfirmMsg.includes('停用') && window.eval('spaces["sp9"].status') === 'stopped');
  // confirm 返回 false → 不执行
  dom.window.confirm = () => false;
  window.eval(`spaces["sp9"].status = 'pending_publish'`);
  window.eval(`publishSpacePlan('sp9')`);
  check('⑤ confirm 取消 → 空间保持待发布', window.eval('spaces["sp9"].status') === 'pending_publish');
  window.eval(`exitEdit(); backToList()`);
}

// ===== ⑥ 复制：列表页按钮 + 预填不直接保存 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  section('⑥ 空间复制（列表页按钮 → 弹窗预填）');
  window.eval(`openDetailByCode('maas-product-vtpm-std'); switchInnerTab('space'); renderSpaceTab()`);
  // 第57轮：列表操作列已删——行内无复制按钮（复制入口=详情页操作区）；函数链路照走
  const spRow = Array.from(doc.querySelectorAll('#space-tbody tr')).find(r => r.textContent.includes('sp1') && r.querySelector('button'));
  check('⑥ 空间列表行无复制按钮（第57轮：操作列已删；剩余按钮=空间名称跳转）', !spRow || !spRow.textContent.includes('复制'));
  const spaceCount = window.eval('Object.keys(spaces).length');
  // std sp1 单 fn 但 1 行（第34轮每 fn 完整渲染）；操作列在本行。rowspan 合并用 glm4 对照（3 fn → rowspan=3）
  window.eval(`backToList(); openDetailByCode('maas-online-text-glm4'); switchInnerTab('space'); renderSpaceTab()`);
  const glm4Rows = Array.from(doc.querySelectorAll('#space-tbody tr')).filter(r => r.cells.length >= 3);
  const firstBtnCell = Array.from(glm4Rows[0].cells).find(c => c.querySelector('button'));
  // 第57轮：操作列已删；第59轮四 fn——glm4 四行空间级 6 列 rowspan 合并（名称跳转按钮在首行），续行仅 2 cells
  check('⑥ 空间级列 rowspan 合并（glm4 sp1 四 fn → rowspan=4，续行 2 cells 无按钮）', glm4Rows[0].cells[0].rowSpan === 4 && glm4Rows.slice(1).every(r => r.cells.length === 2 && !Array.from(r.cells).some(c => c.querySelector('button'))));
  window.eval(`backToList(); openDetailByCode('maas-product-vtpm-std'); renderSpaceTab()`);
  // 复制 → 不直接落库，弹窗预填
  window.eval(`startEdit(); copySpacePlan('sp1')`);
  check('⑥ 复制后空间数不变（1）', window.eval('Object.keys(spaces).length') === spaceCount);
  const modal = doc.getElementById('spaceplan-create-view');
  check('⑥ 复制打开创建弹窗', modal && !modal.classList.contains('hidden'));
  check('⑥ 弹窗标题=创建售卖空间（复制自 标准·常驻售卖空间）', doc.getElementById('spaceplan-form-title').textContent === '创建售卖空间（复制自 标准·常驻售卖空间）');
  check('⑥ 预填名称=标准·常驻售卖空间-副本', doc.getElementById('sp-name').value === '标准·常驻售卖空间-副本');
  check('⑥ 预填档期=源空间档期', doc.getElementById('sp-eff-start').value.startsWith('2026-10-01T') && doc.getElementById('sp-eff-end').value.startsWith('2027-11-01T'));
  const fnChecked = Array.from(doc.querySelectorAll('.sp-fn-check:checked')).map(c => c.dataset.fn);
  check('⑥ 预填 fn 勾选=源空间 fn', fnChecked.length === 1 && fnChecked[0] === '');
  const measChecked = Array.from(doc.querySelectorAll('.sp-measure-check:checked')).length;
  check('⑥ 预填维度度量勾选=源空间（std sp1：购买量区间 1 + 购买周期 3 = 4 度量）', measChecked === 4);
  // 保存才落库
  window.eval(`confirmSpacePlan()`);
  const sp2 = window.eval('spaces["sp2"]');
  check('⑥ 保存落库 sp2 待发布', !!sp2 && sp2.status === 'pending_publish' && sp2.name === '标准·常驻售卖空间-副本');
  check('⑥ 副本单元=源叉乘（3）', window.eval(`saleUnits.filter(u => u.spaceKey === 'sp2').length`) === 3);
  // 清理：删副本恢复 mock
  window.eval(`delete spaces['sp2']; spaceSeq = 1; saleUnits = saleUnits.filter(u => u.spaceKey !== 'sp2'); renderSpaceTab()`);
  window.eval(`exitEdit(); backToList()`);
}
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  section('⑥ 计划复制（列表页按钮 → 编辑页预填）');
  window.eval(`openDetailByCode('maas-product-vtpm-std'); switchInnerTab('plan'); renderPlan()`);
  // 第57轮：列表操作列已删——计划行内无复制按钮；函数链路照走（window.eval 直接调函数）
  const planRow = Array.from(doc.querySelectorAll('#plan-tbody tr')).find(r => r.textContent.includes('复制'));
  check('⑥ 计划列表行无复制按钮（第57轮：操作列已删）', !planRow);
  const cnt = window.eval('planRows.length');
  // 未持锁复制 → 拦截
  let alertMsg = '';
  dom.window.alert = (m) => { alertMsg = String(m); };
  window.eval(`copyPlanRow(0)`);
  check('⑥ 未持锁复制被拦截', alertMsg.includes('发起变更'));
  // 持锁复制 → 打开创建页（复制自），不保存副本
  window.eval(`startEdit()`);
  window.eval(`copyPlanRow(0)`);
  check('⑥ 复制打开计划创建页', !doc.getElementById('plan-create-view').classList.contains('hidden'));
  check('⑥ 创建页标题=创建售卖计划（复制自 …）', doc.getElementById('plan-create-page-title').textContent.includes('复制自'));
  check('⑥ 复制后计划数为原数+临时副本（+1）', window.eval('planRows.length') === cnt + 1);
  check('⑥ 预填名称=原名-副本', doc.getElementById('plan-name').value.includes('副本'));
  check('⑥ 预填生效开始为空（手动填）', doc.getElementById('plan-eff-start').value === '');
  check('⑥ 预填空间=源空间 sp1', doc.getElementById('plan-space-sel').value === 'sp1');
  // 取消 → 摘除临时副本，不落库
  window.eval(`closePlanCreatePage()`);
  check('⑥ 取消后计划数复原', window.eval('planRows.length') === cnt && doc.getElementById('plan-create-view').classList.contains('hidden'));
  // 再复制并保存 → 落库（替换临时副本为新计划，总数 +1）
  window.eval(`copyPlanRow(0)`);
  doc.getElementById('plan-eff-start').value = new Date(Date.now() + 20 * 60 * 1000).toISOString().slice(0, 16);
  doc.getElementById('plan-eff-end').value = '2026-12-31T00:00';
  window.eval(`confirmPlanCreate()`);
  check('⑥ 保存后计划数+1', window.eval('planRows.length') === cnt + 1);
  const saved = window.eval('planRows[planRows.length-1]');
  check('⑥ 保存副本为待发布且名含-副本', window.eval('planRowStatuses[planRowStatuses.length-1]') === 'pending_publish' && saved.name.includes('副本'));
  window.eval(`exitEdit(); backToList()`);
}

console.log('\n第52轮: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
