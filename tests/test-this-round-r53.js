// 第53轮测试：①创建售卖空间由弹窗改完整页面（#spaceplan-create-view 视图切换/取消返回/保存回详情/
// 编辑与复制也走页面/标题 spaceplan-form-title/closeModal('spaceplan') 转发兼容）
// ②默认时间改本地时区口径（nowLocalStr/nextHalfHourStr 不再用 toISOString=UTC；earliest 同步本地+空格口径）
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../prototype/admin-products.html'), 'utf8');

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name); } };
function section(t) { console.log('\n== ' + t + ' =='); }
function boot() {
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: vc, pretendToBeVisual: true });
  dom.window.alert = () => {}; dom.window.confirm = () => true;
  return dom;
}
// 本地时刻串（与页面同口径）
const localMin = () => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); };
const localMin2 = (ms) => { const d = new Date(Date.now() + ms); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); };

// ===== ① 空间创建页面化 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  section('① 空间创建页面化');
  check('① 弹窗 DOM 已删（#modal-spaceplan 不存在）', !doc.getElementById('modal-spaceplan'));
  check('① 页面视图 #spaceplan-create-view 存在且初始隐藏', !!doc.getElementById('spaceplan-create-view') && doc.getElementById('spaceplan-create-view').classList.contains('hidden'));
  window.eval(`openDetailByCode('maas-product-vtpm-std'); startEdit()`);
  window.eval(`openSpacePlanModal()`);
  check('① 打开创建页：视图显示', !doc.getElementById('spaceplan-create-view').classList.contains('hidden'));
  check('① 打开创建页：商品详情隐藏', doc.getElementById('detail-view').classList.contains('hidden'));
  check('① 标题=创建售卖空间', doc.getElementById('spaceplan-form-title').textContent === '创建售卖空间');
  check('① 页面含基础信息/售卖 function/维度度量三区块', doc.getElementById('spaceplan-create-view').textContent.includes('基础信息') && doc.getElementById('spaceplan-create-view').textContent.includes('售卖 function') && doc.getElementById('spaceplan-create-view').textContent.includes('各 function 的维度度量值'));
  // 取消 → 返回详情
  window.eval(`closeSpacePlanPage()`);
  check('① 取消：页面关闭、详情恢复', doc.getElementById('spaceplan-create-view').classList.contains('hidden') && !doc.getElementById('detail-view').classList.contains('hidden'));
  // closeModal('spaceplan') 转发兼容
  window.eval(`openSpacePlanModal(); closeModal('spaceplan')`);
  check('① closeModal("spaceplan") 转发关闭页面', doc.getElementById('spaceplan-create-view').classList.contains('hidden'));
  // 编辑模式（待发布空间）：先造一个
  window.eval(`
    spaceSeq = Math.max(spaceSeq, 8);
    spaces["sp8"] = { seq: 8, name: "r53-待发布空间", priority: 80, effStart: "2026-11-01 00:00:00", effEnd: "2027-11-01 00:00:00", status: "pending_publish", fnDims: {}, fnMeasures: {} };
  `);
  window.eval(`editSpacePlan('sp8')`);
  check('① 编辑（待发布）走页面且标题含修改', !doc.getElementById('spaceplan-create-view').classList.contains('hidden') && doc.getElementById('spaceplan-form-title').textContent.includes('修改售卖空间：r53-待发布空间'));
  window.eval(`closeSpacePlanPage()`);
  // 已发布空间编辑拦截（弹 alert，页面不开）
  window.eval(`editSpacePlan('sp1')`);
  check('① 已发布空间编辑仍拦截', doc.getElementById('spaceplan-create-view').classList.contains('hidden'));
  // 创建保存 → 落库 + 回详情
  window.eval(`openSpacePlanModal()`);
  doc.getElementById('sp-name').value = 'r53-新空间';
  doc.getElementById('sp-priority').value = '99';
  const fnBox = doc.querySelector('.sp-fn-check');
  fnBox.checked = true; fnBox.dispatchEvent(new window.Event('change', { bubbles: true }));
  const mb = doc.querySelector('.sp-measure-check[value="1～100"]'); if (mb) mb.checked = true;
  const mb2 = doc.querySelector('.sp-measure-check[value="30天"]'); if (mb2) mb2.checked = true;
  window.eval(`confirmSpacePlan()`);
  const spN = window.eval('spaces["sp' + window.eval('spaceSeq') + '"]');
  check('① 保存落库新空间', window.eval('Object.values(spaces).some(s => s.name === "r53-新空间" && s.status === "pending_publish")'));
  check('① 保存后回详情页（页面关闭）', doc.getElementById('spaceplan-create-view').classList.contains('hidden') && !doc.getElementById('detail-view').classList.contains('hidden'));
  // 复制 → 预填页面
  window.eval(`copySpacePlan('sp1')`);
  check('① 复制打开创建页（预填）', !doc.getElementById('spaceplan-create-view').classList.contains('hidden'));
  check('① 复制标题含「复制自」', doc.getElementById('spaceplan-form-title').textContent.includes('复制自'));
  window.eval(`closeSpacePlanPage(); exitEdit(); backToList()`);
}

// ===== ② 默认时间本地时区口径 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  section('② 默认时间本地口径');
  const now = window.eval('nowLocalStr()');
  check('② nowLocalStr 与宿主本地时刻一致（分钟级）', now.slice(0, 16) === localMin());
  check('② nowLocalStr 不再是 UTC（含 T 结构 + 秒）', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(now));
  const half = window.eval('nextHalfHourStr()');
  check('② nextHalfHourStr=本地下一整 30 分钟（分钟∈{00,30}）', /T\d{2}:(00|30):00$/.test(half) && half.slice(0, 16) >= now.slice(0, 16));
  // 空间默认开始=当前（本地）
  window.eval(`openDetailByCode('maas-product-vtpm-std'); startEdit(); openSpacePlanModal()`);
  check('② 空间默认生效开始≈当前本地时刻（分钟级）', doc.getElementById('sp-eff-start').value.slice(0, 16) === localMin());
  check('② 空间默认生效结束=2099-12-31T23:59:59', doc.getElementById('sp-eff-end').value === '2099-12-31T23:59:59');
  window.eval(`closeSpacePlanPage()`);
  // 计划默认开始=下一整 30 分钟（本地）
  window.eval(`openPlanCreatePage()`);
  check('② 计划默认生效开始=本地下一整 30 分钟', doc.getElementById('plan-eff-start').value === half.slice(0, 16));
  window.eval(`closePlanCreatePage()`);
  // 10 分钟校验：本地+20 分钟可保存（早前 UTC 口径时 earliest 比真实时间早 8h → +20min 被误拦）
  doc.getElementById('plan-space-sel').value = 'sp1';
  window.eval('onPlanSpaceChange()');
  doc.getElementById('plan-name').value = 'r53-本地口径计划';
  doc.getElementById('plan-eff-start').value = localMin2(20 * 60 * 1000);
  doc.getElementById('plan-eff-end').value = '2026-12-31T00:00';
  let alertMsg = '';
  dom.window.alert = (m) => { alertMsg = String(m); };
  window.eval('confirmPlanCreate()');
  check('② 本地+20分钟保存成功（10 分钟校验不再 UTC 错位）', alertMsg === '' && window.eval('planRows[planRows.length-1].name') === 'r53-本地口径计划');
  // 本地+5 分钟被拦截（说明校验仍生效，而非被绕过）
  window.eval(`closePlanCreatePage(); openPlanCreatePage()`);
  doc.getElementById('plan-space-sel').value = 'sp1';
  window.eval('onPlanSpaceChange()');
  doc.getElementById('plan-name').value = 'r53-应拦截';
  doc.getElementById('plan-eff-start').value = localMin2(5 * 60 * 1000);
  doc.getElementById('plan-eff-end').value = '2026-12-31T00:00';
  alertMsg = '';
  window.eval('confirmPlanCreate()');
  check('② 本地+5分钟仍被拦截（校验保持）', alertMsg.includes('10 分钟'));
  window.eval(`closePlanCreatePage(); exitEdit(); backToList()`);
}

console.log('\n第53轮: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
