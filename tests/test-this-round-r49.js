// 第49轮测试：①列表四 Tab（商品类型 × 上架状态，只看当前生效空间）②SU Tab fn/组合列序调换与 rowspan
// ③多表「生效起止」拆两列（空间列表/计划 Tab/计划详情/空间详情字段区）④计划 Tab 空间筛选无「全部」
// ⑤折算/SLO 配置 Tab 仅 vTPM 商品显示 ⑥online-text 计划创建页隐藏 vTPM 专属区块且保存强制 unified
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../prototype/admin-products.html'), 'utf8');

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name); } };

function boot() {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { console.log('JSDOM-ERR: ' + e.message); });
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: vc });
  dom.window.alert = () => {}; dom.window.confirm = () => true;
  return dom;
}
const rowsOf = (doc, id) => Array.from(doc.querySelectorAll('#' + id + '-tbody tr')).filter(r => r.cells[0] && /^su-/.test(r.cells[0].textContent.trim()));

// ===== ① 列表四 Tab 划分与类型归属 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  const tabs = Array.from(doc.querySelectorAll('#list-view .admin-card .admin-tab')).map(b => b.getAttribute('data-tab'));
  check('① 四 Tab data-tab 序列', JSON.stringify(tabs) === JSON.stringify(['maas-listed', 'maas-unlisted', 'vtpm-listed', 'vtpm-unlisted']));
  check('① 四个 tbody 齐备', ['maas-listed', 'maas-unlisted', 'vtpm-listed', 'vtpm-unlisted'].every(id => !!doc.getElementById(id + '-tbody')));
  check('① maas已上架=5 行（glm4 全在售；第59轮五单元含—）', rowsOf(doc, 'maas-listed').length === 5);
  check('① maas未上架=0 行（空态占位）', rowsOf(doc, 'maas-unlisted').length === 0);
  check('① vTPM已上架=4 行（std 2 + pro 2）', rowsOf(doc, 'vtpm-listed').length === 4);
  check('① vTPM未上架=6 行（pre 3 未配置 + pro 2 未配置 + std su-3 禁售）', rowsOf(doc, 'vtpm-unlisted').length === 6);
  check('① glm4 只在 maas 组', rowsOf(doc, 'maas-listed').every(r => r.cells[2].textContent.trim() === 'maas-online-text-glm4'));
  check('① vTPM 组不含 glm4', !doc.getElementById('vtpm-listed-tbody').textContent.includes('glm4') && !doc.getElementById('vtpm-unlisted-tbody').textContent.includes('glm4'));
  // 未上架 Tab 状态枚举只含未配置/禁售
  check('① 未上架 Tab 状态∈{未配置,禁售}', rowsOf(doc, 'vtpm-unlisted').every(r => ['未配置', '禁售'].includes(r.cells[1].textContent.trim())));
  check('① 已上架 Tab 全部在售', rowsOf(doc, 'vtpm-listed').every(r => r.cells[1].textContent.trim() === '在售') && rowsOf(doc, 'maas-listed').every(r => r.cells[1].textContent.trim() === '在售'));
  // activeUnitsOfData：只统计当前生效空间
  const act = window.eval(`(() => { openDetailByCode('maas-product-vtpm-std'); const d = { spaces: JSON.parse(JSON.stringify(spaces)), units: saleUnits.map(u => ({...u})) }; backToList(); return activeUnitsOfData(d); })()`);
  check('① activeUnitsOfData(std)=生效空间 sp1 全部 3 单元', act.length === 3 && act.every(u => u.spaceKey === 'sp1'));
  // productTabGroup 归属
  check('① productTabGroup：vtpm 商品→vtpm 组', window.eval(`productTabGroup('maas-product-vtpm-std')`) === 'vtpm');
  check('① productTabGroup：online-text 商品→maas 组', window.eval(`productTabGroup('maas-online-text-glm4')`) === 'maas');
}

// ===== ② SU Tab 列序调换（Function 在维度:度量之上）与 rowspan 语义 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-online-text-glm4'); switchInnerTab('saleunit'); renderSaleUnits()`);
  const head = Array.from(doc.querySelector('#saleunit-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
  check('② SU 表头：售卖空间→Function→维度:度量→售卖单元', head[0] === '售卖空间' && head[1] === 'Function' && head[2] === '维度:度量' && head[3] === '售卖单元');
  const rows = Array.from(doc.querySelectorAll('#saleunit-tbody tr'));
  check('② SU Tab 5 行（第59轮含—空单元）', rows.length === 5);
  check('② 首行=su-1 — 0维（第59轮组合序空串最前）', rows[0].textContent.includes('su-1') && rows[0].textContent.includes('—'));
  // fn 列在空间列内合并（第59轮编号）：input 组=su-2/su-3，首行 su-2 fn td rowspan=2，su-3 行无 fn td
  const inputRow = rows.find(r => r.textContent.includes('su-2'));
  const fnTd = Array.from(inputRow.cells).find(c => c.textContent.trim() === 'input');
  check('② input 组首行（su-2）fn td rowspan=2（空间内 fn 合并）', fnTd && fnTd.rowSpan === 2);
  const su3Row0 = rows.find(r => r.textContent.includes('su-3'));
  check('② su-3 行无 fn td（被 input rowspan 覆盖），组合 td=输入区间:1M+', !Array.from(su3Row0.cells).some(c => c.textContent.trim() === 'input') && Array.from(su3Row0.cells).some(c => c.textContent.includes('1M+') && !c.textContent.includes('glm4')));
  // 跨 fn 同组合不合并（第49轮回调）：su-3(input/1M+) 与 su-4(output/1M+) 组合相同但 fn 不同 → 各自独立组合 td
  const su4Row = rows.find(r => r.textContent.includes('su-4'));
  check('② su-4 行 output td 新起 + 组合 td 独立（跨 fn 不合并）', Array.from(su4Row.cells).some(c => c.textContent.trim() === 'output') && Array.from(su4Row.cells).some(c => c.textContent.includes('1M+') && !c.textContent.includes('glm4')));
}

// ===== ③ 多表生效起止拆两列 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  // 空间列表：表头 9 列 + 拆列
  window.eval(`openDetailByCode('maas-product-vtpm-std'); switchInnerTab('space')`);
  const spHead = Array.from(doc.querySelector('#space-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
  check('③ 空间列表表头 8 列（第57轮：操作列已删；code/状态/名称/生效时间/失效时间/优先级/Function/维度组合）', spHead.length === 8 && spHead[3] === '生效时间' && spHead[4] === '失效时间');
  const spRow = Array.from(doc.querySelectorAll('#space-tbody tr')).find(r => r.querySelector('td') && !r.querySelector('td[colspan]') && r.textContent.includes('sp1'));
  const spRowTxt = spRow.textContent;
  check('③ 空间行分别展示 effStart/effEnd（std sp1=2026-10-01/2027-11-01）', spRowTxt.includes('2026-10-01 00:00:00') && spRowTxt.includes('2027-11-01 00:00:00'));
  // 空间详情字段区拆分
  window.eval(`openSpacePlanDetail('sp1')`);
  const fields = doc.getElementById('spaceplan-detail-fields').textContent;
  check('③ 空间详情字段区含生效时间/失效时间（第56轮改名）', fields.includes('生效时间') && fields.includes('失效时间'));
  check('③ 空间详情字段区无「生效起止」合并文案', !fields.includes('生效起止'));
  window.eval(`closeSpacePlanDetail()`);
  // 售卖计划 Tab 20 列拆分
  window.eval(`switchInnerTab('plan'); renderPlan()`);
  const planHead = Array.from(doc.querySelector('#plan-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
  check('③ 计划 Tab 表头 20 列（第57轮：操作列已删；生效时间/失效时间第 6/7；配额项隐藏）', planHead.length === 20 && planHead[5] === '生效时间' && planHead[6] === '失效时间' && planHead[19] === '优先级');
  // 计划详情 18 列拆分
  window.eval(`openPlanDetail(0)`);
  const pdHead = Array.from(doc.querySelector('#plan-detail-tbody').closest('table').querySelectorAll('thead th')).map(t => t.textContent.trim());
  check('③ 计划详情表头含生效时间/失效时间（第56轮改名）', pdHead.includes('生效时间') && pdHead.includes('失效时间'));
  window.eval(`closePlanDetail(); backToList()`);
}

// ===== ④ 计划 Tab 空间筛选：无「全部」选项，必须选定具体空间 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-product-vtpm-std'); switchInnerTab('plan'); renderPlan()`);
  const sel = doc.getElementById('plan-filter-space');
  check('④ 筛选下拉存在', !!sel);
  const opts = Array.from(sel.options).map(o => o.value);
  check('④ 无「全部」空值选项', !opts.includes(''));
  check('④ 选项=spaces 全部 key', opts.length === Object.keys(window.eval('JSON.parse(JSON.stringify(spaces))')).length && opts.every(k => k.startsWith('sp')));
  check('④ 默认定位当前生效空间', sel.value === window.eval(`effectiveSpaceAtAll(new Date().toISOString().slice(0, 19).replace('T', ' '))`));
  // onPlanSpaceFilter('') 兜底=首个空间
  window.eval(`onPlanSpaceFilter('')`);
  check('④ onPlanSpaceFilter 空值兜底首个空间', doc.getElementById('plan-filter-space').value === Object.keys(window.eval('JSON.parse(JSON.stringify(spaces))'))[0]);
  // 计划行全部属于所选空间
  const spaceVal = doc.getElementById('plan-filter-space').value;
  const planRowsData = JSON.parse(window.eval(`JSON.stringify(planRows.filter(r => r.spaceKey === ${JSON.stringify(spaceVal)}))`));
  const rendered = Array.from(doc.querySelectorAll('#plan-tbody tr')).filter(r => r.querySelector('td'));
  check('④ 渲染行数=该空间计划数×单元数', rendered.length === planRowsData.reduce((s, r) => s + r.units.length, 0));
  check('④ 空态文案含「该售卖空间」', doc.getElementById('plan-tbody').textContent.includes('该售卖空间') || rendered.length > 0);
  window.eval(`backToList()`);
}

// ===== ⑤ 折算系数/SLO 配置 Tab 仅 vTPM 商品显示 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  // vTPM 商品：两 Tab 可见
  window.eval(`openDetailByCode('maas-product-vtpm-std')`);
  check('⑤ vTPM 商品：折算系数 Tab 可见', !doc.getElementById('inner-tab-btn-factor-config').classList.contains('hidden'));
  check('⑤ vTPM 商品：SLO Tab 可见', !doc.getElementById('inner-tab-btn-slo-config').classList.contains('hidden'));
  window.eval(`backToList()`);
  // online-text 商品：两 Tab 隐藏
  window.eval(`openDetailByCode('maas-online-text-glm4')`);
  check('⑤ online-text 商品：折算系数 Tab 隐藏', doc.getElementById('inner-tab-btn-factor-config').classList.contains('hidden'));
  check('⑤ online-text 商品：SLO Tab 隐藏', doc.getElementById('inner-tab-btn-slo-config').classList.contains('hidden'));
  window.eval(`backToList()`);
}

// ===== ⑥ online-text 计划创建页：vTPM 专属区块隐藏 + 保存强制 unified =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-online-text-glm4'); startEdit(); openPlanCreatePage()`);
  // glm4 唯一空间 sp1 已发布 → 下拉可选
  const spaceSel = doc.getElementById('plan-space-sel');
  spaceSel.value = 'sp1';
  spaceSel.dispatchEvent(new window.Event('change', { bubbles: true }));
  // 库存/折算SLO/payload/购买量区块隐藏
  check('⑥ online-text：库存区块隐藏', doc.getElementById('plan-section-inventory').classList.contains('hidden'));
  check('⑥ online-text：折算SLO区块隐藏', doc.getElementById('plan-section-factor-slo').classList.contains('hidden'));
  check('⑥ online-text：payload区块隐藏', doc.getElementById('plan-section-payload').classList.contains('hidden'));
  check('⑥ online-text：购买量区块隐藏', doc.getElementById('plan-section-qty').classList.contains('hidden'));
  // vTPM 商品对照：区块可见
  window.eval(`closePlanCreatePage(); exitEdit(); backToList()`);
  window.eval(`openDetailByCode('maas-product-vtpm-std'); startEdit(); openPlanCreatePage()`);
  check('⑥ vTPM：库存区块可见', !doc.getElementById('plan-section-inventory').classList.contains('hidden'));
  check('⑥ vTPM：折算SLO区块可见', !doc.getElementById('plan-section-factor-slo').classList.contains('hidden'));
  check('⑥ vTPM：payload区块可见', !doc.getElementById('plan-section-payload').classList.contains('hidden'));
  check('⑥ vTPM：购买量区块可见', !doc.getElementById('plan-section-qty').classList.contains('hidden'));
  // online-text 保存链路：modes 强制 unified + 库存项免填
  window.eval(`closePlanCreatePage(); exitEdit(); backToList()`);
  window.eval(`openDetailByCode('maas-online-text-glm4'); startEdit(); openPlanCreatePage()`);
  const sel2 = doc.getElementById('plan-space-sel');
  sel2.value = 'sp1';
  sel2.dispatchEvent(new window.Event('change', { bubbles: true }));
  // 勾全部 4 单元并关联计费项+配额项
  doc.querySelectorAll('.plan-unit-check').forEach(c => { c.checked = true; });
  // 计费项/配额项逐单元下拉（unified 模式默认值即可）
  doc.getElementById('plan-name').value = 'r49-ot-plan';
  // jsdom datetime-local 会丢秒（'00:00' vs 档期 '00:00:00' 字典序偏低）→ 选档期内远离边界且晚于当前+10分钟的时刻（第52轮：生效开始须晚于当前时刻 10 分钟）
  doc.getElementById('plan-eff-start').value = '2026-12-01T00:00';
  doc.getElementById('plan-eff-end').value = '2026-12-31T00:00';
  const okSave = window.eval(`(() => {
    try { confirmPlanCreate(); return true; } catch (e) { return 'ERR:' + e.message; }
  })()`);
  check('⑥ online-text 保存不报错（库存免填）', okSave === true);
  const newRow = JSON.parse(window.eval(`JSON.stringify(planRows[planRows.length - 1])`));
  check('⑥ 保存后 modes 五键均 unified（inventory/factor/slo/payload/qty）', ['inventory', 'factor', 'slo', 'payload', 'qty'].every(k => newRow.modes && newRow.modes[k] === 'unified'));
  check('⑥ 库存项可为空（无 inventoryCodes）', !newRow.inventoryCodes || Object.keys(newRow.inventoryCodes).length === 0);
  window.eval(`closePlanCreatePage(); exitEdit(); backToList()`);
}

// ===== ⑦ 第50轮：online-text（maas）各列表隐藏折算系数及之后的 vTPM 专属列 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  // 列表页 maas 两 Tab：表头只到「所选时间执行价」=9 列（第56轮+计费项标签）；行 9 cells
  const mh = Array.from(doc.querySelectorAll('#top-tab-maas-listed thead th')).map(th => th.textContent.trim());
  check('⑦ maas已上架 Tab 表头 9 列（末列=所选时间执行价；第56轮+标签列）', mh.length === 9 && mh[mh.length - 1] === '所选时间执行价' && mh.includes('计费项标签'));
  check('⑦ maas Tab 表头无折算系数/SLO/payload/购买量', !mh.some(t => ['折算系数', 'SLO', 'payload', '最小购买量', '最大购买量', '购买量step'].includes(t)));
  const muTab = Array.from(doc.querySelector('#top-tab-maas-unlisted thead').querySelectorAll('th'));
  check('⑦ maas未上架 Tab 表头同样 9 列', muTab.length === 9);
  const mrows = Array.from(doc.querySelectorAll('#maas-listed-tbody tr')).filter(r => r.cells[0] && /^su-/.test(r.cells[0].textContent.trim()));
  check('⑦ maas 行 9 cells（尾部 vTPM 列不输出；第56轮+标签；第59轮 5 行）', mrows.length === 5 && mrows.every(r => r.cells.length === 9));
  // vTPM 两 Tab 对照：15 列（第56轮+标签列）
  const vh = Array.from(doc.querySelectorAll('#top-tab-vtpm-listed thead th')).map(th => th.textContent.trim());
  check('⑦ vTPM Tab 表头 15 列（含折算系数；第56轮+标签列）', vh.length === 15 && vh.includes('折算系数'));
  const vrowsTab = Array.from(doc.querySelectorAll('#vtpm-listed-tbody tr')).filter(r => r.cells[0] && /^su-/.test(r.cells[0].textContent.trim()));
  check('⑦ vTPM 行 15 cells', vrowsTab.length === 4 && vrowsTab.every(r => r.cells.length === 15));
  // 详情页三处：SU Tab / 售卖计划 Tab / 计划详情——col-vtpm th+td 同步 hidden
  window.eval(`openDetailByCode('maas-online-text-glm4'); switchInnerTab('saleunit'); renderSaleUnits()`);
  const suHead = Array.from(doc.querySelector('#saleunit-tbody').closest('table').querySelectorAll('thead th'));
  check('⑦ glm4 SU Tab：6 个 vTPM 专属 th 隐藏', suHead.filter(t => t.classList.contains('hidden')).length === 6);
  const suRow = Array.from(doc.querySelectorAll('#saleunit-tbody tr'))[0];
  check('⑦ glm4 SU 行：6 个 vTPM 专属 td 隐藏', Array.from(suRow.cells).filter(c => c.classList.contains('hidden')).length === 6);
  check('⑦ glm4 SU 可见末列=所选时间执行价', suHead.filter(t => !t.classList.contains('hidden')).map(t => t.textContent.trim()).pop() === '所选时间执行价');
  window.eval(`switchInnerTab('plan'); renderPlan()`);
  const planHead = Array.from(doc.querySelector('#plan-tbody').closest('table').querySelectorAll('thead th'));
  check('⑦ glm4 计划 Tab：8 个隐藏 th（配额项第56轮+库存项+折算及之后6列）', planHead.filter(t => t.classList.contains('hidden')).length === 8);
  const planRow = Array.from(doc.querySelectorAll('#plan-tbody tr')).filter(r => r.cells.length > 3)[0];
  check('⑦ glm4 计划行：8 个隐藏 td（第56轮+配额项）', planRow && Array.from(planRow.cells).filter(c => c.classList.contains('hidden')).length === 8);
  window.eval(`openPlanDetail(0)`);
  const pdHead = Array.from(doc.querySelector('#plan-detail-tbody').closest('table').querySelectorAll('thead th'));
  check('⑦ glm4 计划详情：8 个隐藏 th（配额项第56轮+库存项+折算及之后6列）', pdHead.filter(t => t.classList.contains('hidden')).length === 8);
  const pdRow = Array.from(doc.querySelectorAll('#plan-detail-tbody tr')).filter(r => r.cells.length > 3)[0];
  check('⑦ glm4 计划详情行：8 个隐藏 td（第56轮+配额项）', pdRow && Array.from(pdRow.cells).filter(c => c.classList.contains('hidden')).length === 8);
  window.eval(`closePlanDetail(); backToList()`);
  // vTPM 商品对照：全显示
  window.eval(`openDetailByCode('maas-product-vtpm-std'); switchInnerTab('saleunit'); renderSaleUnits()`);
  const stdHead = Array.from(doc.querySelector('#saleunit-tbody').closest('table').querySelectorAll('thead th'));
  check('⑦ std SU Tab：无隐藏列（对照组）', stdHead.filter(t => t.classList.contains('hidden')).length === 0);
  window.eval(`switchInnerTab('plan'); renderPlan()`);
  const stdPlanHead = Array.from(doc.querySelector('#plan-tbody').closest('table').querySelectorAll('thead th'));
  check('⑦ std 计划 Tab：仅配额项隐藏（第56轮；对照组 vTPM 列全显）', stdPlanHead.filter(t => t.classList.contains('hidden')).length === 1);
  window.eval(`backToList()`);
}

console.log('第49轮: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail > 0 ? 1 : 0);
