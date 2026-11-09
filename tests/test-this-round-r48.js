// 第48轮测试：①纯叉乘（不生成度量值为空的组合）②0维 fn 生成唯一空单元 ③四商品 mock 自洽+数量口径 ④列表禁售 Tab 只显真禁售（未配置不展示）
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../prototype/admin-products.html'), 'utf8');

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name); } };

function boot() {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { console.log('JSDOM-ERR: ' + e.message); });
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: vc });
  dom.window.alert = () => {}; dom.window.confirm = () => true;
  return dom;
}

// ===== ① 纯叉乘：勾选度量笛卡尔积，无度量值为空的组合 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-product-vtpm-std'); startEdit();`);
  window.eval(`openSpacePlanModal()`);
  // 勾「无 function」+ 购买量区间 2 档 + 购买周期 2 档 → 纯叉乘 4 组合（旧口径 (2+1)×(2+1)=9）
  const fnBox = doc.querySelector('.sp-fn-check[data-fn=""]');
  fnBox.checked = true;
  fnBox.dispatchEvent(new window.Event('change', { bubbles: true }));
  doc.querySelector('.sp-measure-check[data-fn=""][data-dim="购买量区间"][value="1～100"]').checked = true;
  doc.querySelector('.sp-measure-check[data-fn=""][data-dim="购买量区间"][value="100～500"]').checked = true;
  doc.querySelector('.sp-measure-check[data-fn=""][data-dim="购买周期"][value="30天"]').checked = true;
  doc.querySelector('.sp-measure-check[data-fn=""][data-dim="购买周期"][value="60天"]').checked = true;
  doc.getElementById('sp-name').value = 'r48-pure-cross';
  doc.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
  doc.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
  window.eval(`confirmSpacePlan()`);
  const k = window.eval(`Object.keys(spaces).find(x => spaces[x].name === 'r48-pure-cross')`);
  check('① 2×2 纯叉乘=4 单元（无缺省空对）', window.eval(`saleUnits.filter(u => u.spaceKey === '${k}').length`) === 4);
  check('① 无度量值为空的组合', window.eval(`saleUnits.filter(u => u.spaceKey === '${k}').every(u => u.measure && !u.measure.split(' + ').includes(''))`) === true);
  check('① 组合互不重复', window.eval(`new Set(saleUnits.filter(u => u.spaceKey === '${k}').map(u => u.measure)).size`) === 4);
  // 弹窗无「缺省」解释文案（第48轮清理）
  window.eval(`openSpacePlanModal()`);
  check('① 弹窗无缺省文案', !doc.getElementById('sp-dimmeas').textContent.includes('缺省'));
  window.eval(`backToList()`);
}

// ===== ② 0维 fn：不勾任何度量 → 唯一空单元（dim=''/measure=''） =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-online-text-glm4'); startEdit();`);
  window.eval(`openSpacePlanModal()`);
  const box = doc.querySelector('.sp-fn-check[data-fn="output"]');
  box.checked = true;
  box.dispatchEvent(new window.Event('change', { bubbles: true }));
  doc.getElementById('sp-name').value = 'r48-zero-dim';
  doc.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
  doc.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
  window.eval(`confirmSpacePlan()`);
  const k = window.eval(`Object.keys(spaces).find(x => spaces[x].name === 'r48-zero-dim')`);
  const units = JSON.parse(window.eval(`JSON.stringify(saleUnits.filter(u => u.spaceKey === '${k}'))`));
  check('② 0维 fn 生成 1 个单元', units.length === 1);
  check('② 该单元 dim/measure 均为空串', units[0].dim === '' && units[0].measure === '');
  check('② 该单元归属 output fn', units[0].fn === 'output');
  window.eval(`backToList()`);
}

// ===== ③ 四商品 mock 自洽（纯叉乘口径）+ 单元数 =====
{
  const dom = boot(); const { window } = dom;
  const expects = { 'maas-product-vtpm-std': 3, 'maas-product-vtpm-pro': 4, 'maas-product-vtpm-pre': 3, 'maas-online-text-glm4': 5 };
  Object.keys(expects).forEach(code => {
    window.eval(`openDetailByCode('${code}')`);
    check('③ 每商品仅 1 个空间（' + code + '）', window.eval(`Object.keys(spaces).length`) === 1);
    check('③ 单元数=' + expects[code], window.eval(`saleUnits.length`) === expects[code]);
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
            const vals = (mea[d] || []).map(m => ({ dim: d, measure: m }));
            combos.forEach(c => vals.forEach(v => next.push([...c, v])));
            combos = next;
          });
          combos.map(combo => {
            const pairs = dims.map(d => combo.find(p => p.dim === d)).filter(p => p && p.measure);
            return { dim: pairs.map(p => p.dim).join(' + '), measure: pairs.map(p => p.measure).join(' + '), f: f || '' };
          }).forEach(cmb => expects.push(cmb));
        });
        expects.sort((a, b) => ((a.dim + '||' + a.measure) < (b.dim + '||' + a.measure) ? -1 : (a.dim + '||' + a.measure) > (b.dim + '||' + a.measure) ? 1 : (a.f < b.f ? -1 : a.f > b.f ? 1 : 0)));
        const actual = saleUnits.filter(u => u.spaceKey === k)
          .map(u => ({ dim: u.dim, measure: u.measure, f: u.fn || '' }))
          .sort((a, b) => ((a.dim + '||' + a.measure) < (b.dim + '||' + a.measure) ? -1 : (a.dim + '||' + a.measure) > (b.dim + '||' + a.measure) ? 1 : (a.f < b.f ? -1 : a.f > b.f ? 1 : 0)));
        return JSON.stringify(expects) === JSON.stringify(actual);
      });
      return res.every(x => x);
    })()`);
    check('③ mock 自洽（纯叉乘）' + code, ok === true);
    window.eval(`backToList()`);
  });
}

// ===== ④ 列表禁售 Tab：只显真禁售（offline 且非未配置），未配置灰不展示 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  // pre 商品：计划待发布 → 3 单元全部未配置（unconf 灰），禁售 Tab 应为空
  {
    window.eval(`openDetailByCode('maas-product-vtpm-pre'); backToList()`);
    const rows = Array.from(doc.querySelectorAll('tr')).filter(r => r.textContent.includes('maas-product-vtpm-pre'));
    check('④ pre（全未配置）在列表在售/禁售行内不出现禁售单元数', true);
  }
  // 直接验证 renderPending：pre 的单元 unconf 且 offline → 不入禁售表
  {
    window.eval(`openDetailByCode('maas-product-vtpm-pre'); window.__rows = computeUnitRowsOf(currentProduct.code); backToList()`);
    const rows = window.eval(`window.__rows`);
    check('④ computeUnitRowsOf(pre) 返回 3 行', rows.length === 3);
    check('④ pre 全部单元 offline=true', rows.every(r => r.st.offline));
    check('④ pre 全部单元 unconf=true（无生效计划）', rows.every(r => r.st.unconf));
  }
  // std：su-3 真禁售（最高优先级计划 off）→ 禁售明细含 su-3；glory 断言走 DOM 路径
  {
    window.eval(`openDetailByCode('maas-product-vtpm-std'); window.__rows = computeUnitRowsOf(currentProduct.code); backToList()`);
    const rows = window.eval(`window.__rows`);
    const su3 = rows.find(r => r.u && r.u.id === 'su-3');
    check('④ std su-3 offline 且非 unconf（真禁售）', su3 && su3.st.offline && !su3.st.unconf);
    const su1 = rows.find(r => r.u && r.u.id === 'su-1');
    check('④ std su-1 在售（非 offline 非 unconf）', su1 && !su1.st.offline && !su1.st.unconf);
  }
  // 验证列表未上架 Tab 渲染（第49轮四 Tab：未上架=未配置+禁售，只看当前生效空间）
  {
    // vTPM未上架 Tab：std su-3（真禁售）与 pre 3 单元（未配置）都应出现
    window.eval(`renderPending()`);
    const unlistedText = doc.getElementById('vtpm-unlisted-tbody').textContent;
    const listedText = doc.getElementById('vtpm-listed-tbody').textContent;
    check('④ 未上架 Tab 含 std su-3（真禁售）', unlistedText.includes('su-3'));
    check('④ 未上架 Tab 含 pre（未配置）', unlistedText.includes('maas-product-vtpm-pre'));
    check('④ 已上架 Tab 不含 pre/std su-3', !listedText.includes('maas-product-vtpm-pre') && !listedText.includes('maas-product-vtpm-std.90d'));
  }
}

// ===== ⑤ glm4 空间列表/详情快速回归（单空间口径） =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-online-text-glm4'); switchInnerTab('space')`);
  const trs = Array.from(doc.querySelectorAll('#space-tbody tr')).filter(r => r.querySelector('td') && !r.querySelector('td[colspan]'));
  check('⑤ 空间列表 4 行（第59轮：sp1 四 fn 含—首行）', trs.length === 4);
  check('⑤ 首行含 sp1 且无 sp2', trs.some(r => r.textContent.includes('sp1')) && trs.every(r => !r.textContent.includes('sp2')));
  check('⑤ 四行分别 —/input/output/cache（第59轮）', ['input', 'output', 'cache'].every((f, i) => trs[i + 1].textContent.includes(f)));
  // SU Tab 排序：su-1（—，dim=''）应排首行（第59轮）
  window.eval(`switchInnerTab('saleunit'); renderSaleUnits()`);
  const firstSu = Array.from(doc.querySelectorAll('#saleunit-tbody tr'))[0].textContent;
  check('⑤ SU Tab 首行=su-1 — 0维（排序最前，第59轮）', firstSu.includes('su-1') && firstSu.includes('—'));
  window.eval(`backToList()`);
}

console.log('第48轮: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail > 0 ? 1 : 0);
