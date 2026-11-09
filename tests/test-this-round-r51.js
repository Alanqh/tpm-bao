// 第51轮验证：maas 列表紧凑化 / 计划列序调整 / 计费配额默认 perUnit / 优先级后置 / 去区块序号 / 标题铅笔删除
const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('/Users/lqh/Documents/ChatGPT/TPM保障包/prototype/admin-products.html', 'utf8');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name); }
}
function section(t) { console.log('\n== ' + t + ' =='); }
function boot() {
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
  dom.window.alert = () => {}; dom.window.confirm = () => true;
  return dom;
}

// ===== ① maas 售卖单元列表紧凑化 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  section('① maas 列表紧凑化');
  // 列表页两 maas Tab：compact-cells + min-width 1000
  ['maas-listed', 'maas-unlisted'].forEach(tab => {
    const panel = doc.getElementById('top-tab-' + tab);
    const table = panel.querySelector('table');
    check(tab + ' 表格 compact-cells 类', table.classList.contains('compact-cells'));
    check(tab + ' 表格 min-width 1000', table.className.includes('min-w-[1000px]'));
  });
  // vTPM 两 Tab 不紧凑（对照）
  ['vtpm-listed', 'vtpm-unlisted'].forEach(tab => {
    const table = doc.getElementById('top-tab-' + tab).querySelector('table');
    check(tab + ' 表格不紧凑（对照组）', !table.classList.contains('compact-cells') && table.className.includes('min-w-[1500px]'));
  });
  // 详情页 SU Tab：online-text 商品 → compact；vTPM 商品 → 不 compact
  window.eval('openDetailByCode("maas-online-text-glm4")');
  const suTable = doc.getElementById('saleunit-table');
  check('glm4 SU Tab 表 compact-cells + su-table', suTable.classList.contains('compact-cells') && suTable.classList.contains('su-table'));
  window.eval('backToList(); openDetailByCode("maas-product-vtpm-std")');
  check('std SU Tab 表不 compact（对照组）', !doc.getElementById('saleunit-table').classList.contains('compact-cells'));
  window.eval('backToList()');
}

// ===== ② 售卖计划列序调整（售卖空间提前 + 生效起止紧随所属售卖计划 + 优先级置末）=====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  section('② 售卖计划列序');
  window.eval('openDetailByCode("maas-product-vtpm-std"); switchInnerTab("plan"); renderPlan()');
  const head = Array.from(doc.querySelector('#plan-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
  check('计划 Tab 表头 20 列（第57轮：操作列已删）', head.length === 20);
  check('售卖空间列在所属售卖计划之前（第 4/5 列）', head[3] === '售卖空间' && head[4] === '所属售卖计划');
  check('生效/失效时间紧随所属售卖计划（第 6/7 列，第56轮改名）', head[5] === '生效时间' && head[6] === '失效时间');
  check('售卖单元→Function→维度:度量（第 8/9/10 列）', head[7] === '售卖单元' && head[8] === 'Function' && head[9] === '维度:度量');
  check('优先级为末列（第 20 列；第57轮操作列已删）', head[19] === '优先级' && head[20] === undefined);
  const row = doc.querySelector('#plan-tbody tr');
  check('行 td 顺序：售卖空间(td4)=sp1 / 所属售卖计划(td5)=计划名', row.cells[3].textContent.trim() === 'sp1' && row.cells[4].textContent.trim().length > 0);
  // 计划详情页一致
  window.eval('openPlanDetail(0)');
  const pdHead = Array.from(doc.querySelector('#plan-detail-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
  check('详情页售卖空间列第 2 位（售卖计划单元之后、售卖单元之前）', pdHead[1] === '售卖空间' && pdHead[2] === '售卖单元');
  const pdRow = doc.querySelector('#plan-detail-tbody tr');
  check('详情行 td2=sp1', pdRow.cells[1].textContent.trim() === 'sp1');
  window.eval('closePlanDetail(); backToList()');
}

// ===== ③ 计费项/配额项默认按售卖单元配置 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  section('③ 默认 perUnit');
  window.eval('openDetailByCode("maas-product-vtpm-std"); startEdit(); openPlanCreatePage()');
  check('创建模式计费项默认 perUnit', doc.getElementById('plan-mode-charge').checked === true);
  check('创建模式配额项默认 perUnit', doc.getElementById('plan-mode-quota').checked === true);
  check('创建模式库存项默认 unified', doc.getElementById('plan-mode-inventory').checked === false);
  check('创建模式 qty 默认 unified', doc.getElementById('plan-mode-qty').checked === false);
  // 选空间后 perUnit 行渲染（onPlanSpaceChange 整页重渲）
  doc.getElementById('plan-space-sel').value = 'sp1';
  window.eval('onPlanSpaceChange()');
  check('选空间后计费项 perUnit 行渲染（3 单元 3 下拉）', doc.querySelectorAll('#plan-charge-perunit select.plan-charge-select').length === 3);
  check('选空间后配额项 perUnit 行渲染（3 单元 3 下拉）', doc.querySelectorAll('#plan-quota-perunit select.plan-quota-select').length === 3);
  check('计费项 unified 容器隐藏', doc.getElementById('plan-charge-unified').classList.contains('hidden'));
  // 默认 perUnit 保存成功（glm4 online-text）
  window.eval('closePlanCreatePage(); backToList(); openDetailByCode("maas-online-text-glm4"); startEdit(); openPlanCreatePage()');
  doc.getElementById('plan-space-sel').value = 'sp1';
  window.eval('onPlanSpaceChange()');
  doc.getElementById('plan-name').value = 'r51 默认perUnit计划';
  // 第52轮：生效开始须晚于当前时刻 10 分钟 → 用远期时间
  doc.getElementById('plan-eff-start').value = '2026-12-01T00:00:00';
  doc.getElementById('plan-eff-end').value = '2026-12-31T00:00:00';
  window.eval('confirmPlanCreate()');
  const saved = window.eval('planRows[planRows.length-1]');
  check('online-text 默认 perUnit 保存成功', saved && saved.name === 'r51 默认perUnit计划' && saved.spaceKey === 'sp1');
  check('保存 modes.charge=perUnit / quota=perUnit（online-text 仅计费配额）', saved.modes.charge === 'perUnit' && saved.modes.quota === 'perUnit');
  check('保存 chargeCodes 按单元 map（5 键，第59轮五单元）', Object.keys(saved.chargeCodes || {}).length === 5);
  // 编辑模式仍回填 r.modes（旧 unified 计划编辑后开关=unified）
  window.eval('closePlanCreatePage(); backToList()');
}

// ===== ④ 基础信息优先级后置 + ⑤ 去区块序号 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  section('④⑤ 基础信息字段序 + 去序号');
  const view = doc.getElementById('plan-create-view');
  check('基础信息区存在（无「1.」前缀）', view.textContent.includes('基础信息') && !view.textContent.includes('1. 基础信息'));
  const fields = ['plan-space-sel', 'plan-name', 'plan-eff-start', 'plan-eff-end', 'plan-priority'].map(id => {
    const el = doc.getElementById(id);
    return el ? el.closest('div.grid > div, .grid > div') || el.parentElement : null;
  });
  check('五个字段容器均存在', fields.every(Boolean));
  const idx = el => Array.prototype.indexOf.call(el.parentElement.children, el);
  check('优先级在结束生效时间之后（字段序：空间→名称→开始→结束→优先级）',
    idx(fields[0]) < idx(fields[1]) && idx(fields[1]) < idx(fields[2]) && idx(fields[2]) < idx(fields[3]) && idx(fields[3]) < idx(fields[4]));
  check('生成售卖单元区无「2.」前缀', !view.textContent.includes('2. 本售卖计划'));
  check('计划字段配置区无「3.」前缀', !view.textContent.includes('3. 计划字段配置'));
  ['3.1 关联计费项', '3.2 关联配额项', '3.3 关联库存项', '3.4 ', '3.5 ', '3.6 ', '3.7 '].forEach(t => {
    check('无「' + t + '」编号前缀', !view.textContent.includes(t));
  });
  // 未选空间提示（进入创建页后填充）无区块编号
  window.eval('openDetailByCode("maas-product-vtpm-std"); startEdit(); openPlanCreatePage()');
  check('未选空间提示无区块编号（请先选择售卖空间）', view.textContent.includes('请先选择售卖空间') && !view.textContent.includes('请先在区块1'));
  window.eval('closePlanCreatePage(); backToList()');
}

// ===== ⑥ 商品名称编辑仅详情页基本信息卡 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  section('⑥ 标题铅笔删除');
  check('标题旁铅笔已删（#detail-name-edit-btn 不存在）', !doc.getElementById('detail-name-edit-btn'));
  window.eval('openDetailByCode("maas-product-vtpm-std")');
  check('详情页标题 span 仍在（名称展示）', !!doc.getElementById('detail-title-name'));
  check('基本信息卡铅笔保留（#detail-info-name-edit-btn）', !!doc.getElementById('detail-info-name-edit-btn'));
  // 基本信息卡入口可用
  window.eval('openDetailNameEdit("info")');
  const infoSpan = doc.getElementById('detail-info-name');
  check('info 入口 contenteditable 正常', infoSpan.getAttribute('contenteditable') === 'true');
  window.eval('closeDetailNameEdit()');
  window.eval('backToList()');
}

console.log('\n第51轮: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
