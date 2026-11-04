// 第45轮测试：①空fn必选 ②待发布空间可编辑 ③计划只选已发布空间 ④计费项等创建后即时入下拉 ⑤计划创建页单元信息=维度组合+function
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../prototype/admin-products.html'), 'utf8');

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name); } };

function boot() {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { console.log('JSDOM-ERR: ' + e.message + (e.detail ? ' :: ' + e.detail.message : '')); });
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: vc });
  dom.window.alert = () => {}; dom.window.confirm = () => true;
  return dom;
}

// ===== ① 空fn商品：弹窗必须渲染「—（无 function）」复选且可选 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-product-vtpm-std'); startEdit();`);
  window.eval(`openSpacePlanModal()`);
  const fnChecks = Array.from(doc.querySelectorAll('.sp-fn-check'));
  check('① 空fn商品弹窗渲染 1 个 fn 复选', fnChecks.length === 1);
  check('① 复选 data-fn=""', fnChecks[0] && fnChecks[0].dataset.fn === '');
  check('① 复选可勾选（非 disabled）', fnChecks[0] && !fnChecks[0].disabled);
  check('① 复选标签显示「—（无 function）」', doc.getElementById('sp-fnspaces').textContent.includes('无 function'));
  fnChecks[0].checked = true;
  fnChecks[0].dispatchEvent(new window.Event('change', { bubbles: true }));
  doc.getElementById('sp-name').value = 'r45-probe';
  doc.getElementById('sp-eff-start').value = '2026-11-05T00:00:00';
  doc.getElementById('sp-eff-end').value = '2026-11-10T00:00:00';
  const nBefore = window.eval(`Object.keys(spaces).length`);
  window.eval(`confirmSpacePlan()`);
  check('① 勾选「无 function」后可保存创建空间', window.eval(`Object.keys(spaces).length`) === nBefore + 1);
  // 不勾任何 fn 时拦截
  window.eval(`openSpacePlanModal()`);
  doc.getElementById('sp-name').value = 'r45-nofn';
  window.eval(`confirmSpacePlan()`);
  check('① 不勾 fn 拦截保存', !window.eval(`Object.values(spaces).some(sp => sp.name === 'r45-nofn')`));
  window.eval(`backToList()`);
}

// ===== ② 待发布空间可编辑 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-online-text-glm4'); startEdit();`);
  window.eval(`openSpacePlanModal()`);
  doc.querySelector('.sp-fn-check[data-fn="input"]').checked = true;
  doc.querySelector('.sp-fn-check[data-fn="cache"]').checked = true;
  doc.querySelector('.sp-measure-check[data-dim="输入token区间"][value="0～128K"]').checked = true;
  doc.getElementById('sp-name').value = 'r45-edit-me';
  doc.getElementById('sp-eff-start').value = '2026-11-01T00:00:00';
  doc.getElementById('sp-eff-end').value = '2026-12-01T00:00:00';
  window.eval(`confirmSpacePlan()`);
  const newKey = window.eval(`Object.keys(spaces).find(k => spaces[k].name === 'r45-edit-me')`);
  check('② 新建空间为待发布状态', newKey && window.eval(`spaces['${newKey}'].status`) === 'pending_publish');
  const cnt1 = window.eval(`saleUnits.filter(u => u.spaceKey === '${newKey}').length`);
  check('② 新空间叉乘生成单元（2fn×2组合=4）', cnt1 === 4);
  const ids1 = window.eval(`JSON.stringify(saleUnits.filter(u => u.spaceKey === '${newKey}').map(u => u.id).sort())`);
  window.eval(`openSpacePlanDetail('${newKey}')`);
  const editBtn = doc.querySelector('#spaceplan-detail-actions button[onclick*="editSpacePlan"]');
  check('② 待发布空间详情页有「修改」按钮', !!editBtn && editBtn.textContent.includes('修改'));
  editBtn.click();
  check('② 修改回填名称', doc.getElementById('sp-name').value === 'r45-edit-me');
  check('② 修改弹窗标题含「修改」', doc.getElementById('spaceplan-modal-title').textContent.includes('修改'));
  check('② 修改回填 fn 勾选', doc.querySelector('.sp-fn-check[data-fn="input"]').checked && doc.querySelector('.sp-fn-check[data-fn="cache"]').checked && !doc.querySelector('.sp-fn-check[data-fn="output"]').checked);
  check('② 修改回填度量勾选', doc.querySelector('.sp-measure-check[data-dim="输入token区间"][value="0～128K"]').checked);
  check('② 未勾选度量不回填', !doc.querySelector('.sp-measure-check[data-dim="输入token区间"][value="128K～1M"]').checked);
  doc.getElementById('sp-name').value = 'r45-edited!';
  doc.querySelector('.sp-fn-check[data-fn="output"]').checked = true;
  doc.querySelector('.sp-measure-check[data-dim="输出token区间"][value="0～4K"]').checked = true;
  window.eval(`confirmSpacePlan()`);
  check('② 编辑后原 key 不变（原地更新）', window.eval(`spaces['${newKey}'].name`) === 'r45-edited!');
  check('② 仍为待发布', window.eval(`spaces['${newKey}'].status`) === 'pending_publish');
  check('② 编辑后 fnDims 补充 output', window.eval(`Object.keys(spaces['${newKey}'].fnDims).sort().join()`) === 'cache,input,output');
  const cnt2 = window.eval(`saleUnits.filter(u => u.spaceKey === '${newKey}').length`);
  check('② 差量叉乘不删原单元（12=原4保留+新生8中重复幂等跳过）', cnt2 === 12);
  const ids2 = window.eval(`JSON.stringify(saleUnits.filter(u => u.spaceKey === '${newKey}').map(u => u.id).sort())`);
  check('② 原 4 个单元 id 保留未删', JSON.parse(ids2).filter(id => JSON.parse(ids1).includes(id)).length === 4);
  // 已发布空间编辑拦截
  const alerted = [];
  window.alert = m => alerted.push(m);
  window.eval(`editSpacePlan('sp1')`);
  check('② 已发布空间编辑被拦截', alerted.some(m => String(m).includes('仅待发布')));
  window.alert = () => {};
  // 创建模式弹窗标题复位
  window.eval(`openSpacePlanModal()`);
  check('② 创建模式标题复位', !doc.getElementById('spaceplan-modal-title').textContent.includes('修改'));
  window.eval(`backToList()`);
}

// ===== ③ 计划创建页空间下拉只列已发布空间 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-online-text-glm4'); startEdit();`);
  const mkSpace = (name) => {
    window.eval(`openSpacePlanModal()`);
    doc.querySelector('.sp-fn-check[data-fn="input"]').checked = true;
    doc.getElementById('sp-name').value = name;
    doc.getElementById('sp-eff-start').value = '2026-11-01T00:00:00';
    doc.getElementById('sp-eff-end').value = '2026-12-01T00:00:00';
    window.eval(`confirmSpacePlan()`);
    return window.eval(`Object.keys(spaces).find(k => spaces[k].name === '${name}')`);
  };
  const pendKey = mkSpace('r45-pending');
  const stoppedKey = mkSpace('r45-stopped');
  window.eval(`spaces['${stoppedKey}'].status = 'stopped'`);
  window.eval(`openPlanCreatePage()`);
  const opts = Array.from(doc.getElementById('plan-space-sel').options).map(o => o.value);
  check('③ 下拉含已发布 sp1/sp2', opts.includes('sp1') && opts.includes('sp2'));
  check('③ 下拉不含待发布空间', !opts.includes(pendKey));
  check('③ 下拉不含已停用空间', !opts.includes(stoppedKey));
  check('③ 下拉选项不再显示空间状态括注', Array.from(doc.getElementById('plan-space-sel').options).every(o => !o.textContent.includes('已发布') && !o.textContent.includes('待发布')));
  // 编辑模式保底：引用已停用空间的待发布计划
  window.eval(`planRows.push({ name: 'r45-plan', spaceKey: '${stoppedKey}', units: [], unitStates: {}, chargeCodes: {}, quotaCodes: {}, inventoryCodes: {}, modes: {}, priority: 1, effStart: '2026-11-01 00:00:00', effEnd: '2026-11-10 00:00:00' }); planRowStatuses.push('pending_publish');`);
  const idx = window.eval(`planRows.length - 1`);
  window.eval(`editPlanRow(${idx})`);
  const opts2 = Array.from(doc.getElementById('plan-space-sel').options).map(o => o.value);
  check('③ 编辑模式保底附加原空间', opts2.includes(stoppedKey));
  check('③ 编辑模式回填选中原空间', doc.getElementById('plan-space-sel').value === stoppedKey);
  window.eval(`backToList()`);
}

// ===== ④ 计费项等创建后即时出现在下拉 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-product-vtpm-std'); startEdit();`);
  window.eval(`openPlanCreatePage()`);
  doc.getElementById('plan-space-sel').value = 'sp1';
  doc.getElementById('plan-space-sel').dispatchEvent(new window.Event('change', { bubbles: true }));
  window.eval(`openCreateBillingModal('')`);
  doc.getElementById('billing-code').value = 'maas-product-vtpm-std.r45';
  doc.getElementById('billing-price').value = '0.5';
  window.eval(`confirmCreateBilling()`);
  let sel = doc.querySelector('#plan-charge-unified select');
  check('④ 新计费项出现在下拉且选中', sel && sel.value === 'maas-product-vtpm-std.r45');
  window.eval(`openItemCreateModal('quota', '')`);
  doc.getElementById('quota-code').value = 'quota-r45';
  window.eval(`confirmItemCreate('quota')`);
  sel = doc.querySelector('#plan-quota-unified select');
  check('④ 新配额项出现在下拉且选中', sel && sel.value === 'quota-r45');
  window.eval(`openItemCreateModal('inventory', '')`);
  doc.getElementById('inventory-code').value = 'inv-r45';
  window.eval(`confirmItemCreate('inventory')`);
  sel = doc.querySelector('#plan-inventory-unified select');
  check('④ 新库存项出现在下拉且选中', sel && sel.value === 'inv-r45');
  const cfgBtn = doc.querySelector('#plan-factor-unified button[onclick*="openConfigCreate"]');
  if (cfgBtn) {
    cfgBtn.click();
    doc.getElementById('config-name').value = 'r45-factor';
    doc.getElementById('config-yaml').value = 'k: v';
    window.eval(`confirmConfigEdit()`);
    sel = doc.querySelector('#plan-factor-unified select');
    check('④ 新折算版本出现在下拉', sel && Array.from(sel.options).some(o => o.value.includes('r45-factor')));
  } else {
    window.eval(`openConfigUpdate('factor')`);
    window.eval(`confirmConfigEdit()`);
    sel = doc.querySelector('#plan-factor-unified select');
    check('④ 折算版本更新同步到下拉', !!sel && sel.options.length >= 1);
  }
  const modeEl = doc.getElementById('plan-mode-charge');
  modeEl.checked = true;
  modeEl.dispatchEvent(new window.Event('change', { bubbles: true }));
  const perSel = doc.querySelector('#plan-charge-perunit select');
  check('④ perUnit 行计费项下拉含新计费项', perSel && Array.from(perSel.options).some(o => o.value === 'maas-product-vtpm-std.r45'));
  window.eval(`backToList()`);
}

// ===== ⑤ 计划创建页售卖单元行信息=维度组合+function（无售卖空间） =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-online-text-glm4'); startEdit();`);
  window.eval(`openPlanCreatePage()`);
  doc.getElementById('plan-space-sel').value = 'sp1';
  doc.getElementById('plan-space-sel').dispatchEvent(new window.Event('change', { bubbles: true }));
  const row = doc.querySelector('.plan-unit-row');
  const info = row.querySelector('.mt-1\\.5, div.mt-1\\.5') || row.children[1];
  check('⑤ 行信息含 Function', info.textContent.includes('Function'));
  check('⑤ 行信息含维度组合', info.textContent.includes('维度组合'));
  check('⑤ 行信息不含售卖空间', !info.textContent.includes('售卖空间'));
  check('⑤ 行信息含维度度量值（128K～1M）', info.textContent.includes('128K～1M'));
  window.eval(`backToList()`);
}

// ===== mock 自洽复检（第44轮口径不受影响）=====
{
  const dom = boot(); const { window } = dom;
  ['maas-product-vtpm-std', 'maas-product-vtpm-pro', 'maas-product-vtpm-pre', 'maas-online-text-glm4'].forEach(code => {
    window.eval(`openDetailByCode('${code}')`);
    const ok = window.eval(`(() => {
      const res = Object.keys(spaces).map(k => {
        const sp = spaces[k];
        const expects = [];
        Object.keys(sp.fnDims || {}).forEach(f => {
          const dims = sp.fnDims[f] || [];
          const mea = (sp.fnMeasures || {})[f] || {};
          let combos = [[]];
          dims.forEach(d => {
            const next = [];
            const vals = (mea[d] || []).map(m => ({ dim: d, measure: m })).concat([{ dim: '', measure: '' }]);
            combos.forEach(c => vals.forEach(v => next.push([...c, v])));
            combos = next;
          });
          combos.map(combo => {
            const pairs = dims.map(d => combo.find(p => p.dim === d)).filter(p => p && p.measure);
            return { dim: pairs.map(p => p.dim).join(' + '), measure: pairs.map(p => p.measure).join(' + '), f: f || '' };
          }).forEach(cmb => expects.push(cmb));
        });
        expects.sort((a, b) => ((a.dim + '||' + a.measure) < (b.dim + '||' + b.measure) ? -1 : (a.dim + '||' + a.measure) > (b.dim + '||' + b.measure) ? 1 : (a.f < b.f ? -1 : a.f > b.f ? 1 : 0)));
        const actual = saleUnits.filter(u => u.spaceKey === k)
          .map(u => ({ dim: u.dim, measure: u.measure, f: u.fn || '' }))
          .sort((a, b) => ((a.dim + '||' + a.measure) < (b.dim + '||' + b.measure) ? -1 : (a.dim + '||' + a.measure) > (b.dim + '||' + b.measure) ? 1 : (a.f < b.f ? -1 : a.f > b.f ? 1 : 0)));
        return JSON.stringify(expects) === JSON.stringify(actual);
      });
      return res.every(x => x);
    })()`);
    check('mock 自洽 ' + code, ok === true);
    window.eval(`backToList()`);
  });
}

console.log('第45轮: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail > 0 ? 1 : 0);
