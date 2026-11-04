// 第47轮测试：①弹窗嵌套式（fn 复选联动渲染 per-fn 卡片，度量带 data-fn）②维度候选按商品类型过滤 ③per-fn 差异化配置收集 ④mock 自洽（glm4 per-fn 差异：input 8/output 2/cache 1 + sp2 4）
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

// ===== ① 嵌套式弹窗结构：fn 复选 onchange=renderSpFnCards，勾选联动渲染 per-fn 卡片 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-online-text-glm4'); startEdit();`);
  window.eval(`openSpacePlanModal()`);
  const fnChecks = Array.from(doc.querySelectorAll('.sp-fn-check'));
  check('① 3 个 fn 复选（input/output/cache）', fnChecks.length === 3);
  check('① fn 复选带 onchange 联动', fnChecks.every(c => (c.getAttribute('onchange') || '').includes('renderSpFnCards')));
  check('① 未勾 fn 时区块2 提示先勾选', doc.getElementById('sp-dimmeas').textContent.includes('先勾选'));
  // 勾 input → 出现 input 卡片，内含 online-text 三维
  const inBox = doc.querySelector('.sp-fn-check[data-fn="input"]');
  inBox.checked = true;
  inBox.dispatchEvent(new window.Event('change', { bubbles: true }));
  const cards = doc.querySelectorAll('[data-fncard]');
  check('① 勾 input → 1 张 fn 卡片', cards.length === 1 && cards[0].dataset.fncard === 'input');
  const dims = Array.from(doc.querySelectorAll('[data-fncard="input"] [data-dimblock]')).map(x => x.dataset.dimblock);
  check('① input 卡片维度候选=输入区间/费用发生日/费用发生时间', dims.join(',') === '输入区间,费用发生日,费用发生时间');
  const meas = doc.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入区间"][value="0～128K"]');
  check('① 度量复选带 data-fn（嵌套式）', !!meas && meas.dataset.fn === 'input');
  // 勾第二 fn → 卡片增量，此前勾选保留
  meas.checked = true;
  const outBox = doc.querySelector('.sp-fn-check[data-fn="output"]');
  outBox.checked = true;
  outBox.dispatchEvent(new window.Event('change', { bubbles: true }));
  check('① 勾 output → 2 张卡片', doc.querySelectorAll('[data-fncard]').length === 2);
  check('① 重渲后 input 已勾度量保留', doc.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入区间"][value="0～128K"]').checked === true);
  check('② output 卡片独立未勾', doc.querySelectorAll('.sp-measure-check[data-fn="output"]:checked').length === 0);
  // 取消 output → 卡片移除；再勾回 → 暂存恢复（无勾选）
  outBox.checked = false;
  outBox.dispatchEvent(new window.Event('change', { bubbles: true }));
  check('① 取消 output → 卡片移除', doc.querySelectorAll('[data-fncard]').length === 1);
  outBox.checked = true;
  outBox.dispatchEvent(new window.Event('change', { bubbles: true }));
  check('① 再勾 output → 卡片恢复', doc.querySelectorAll('[data-fncard]').length === 2);
  // 取消再勾 input：度量勾选通过 spMeasDraft 恢复
  inBox.checked = false;
  inBox.dispatchEvent(new window.Event('change', { bubbles: true }));
  inBox.checked = true;
  inBox.dispatchEvent(new window.Event('change', { bubbles: true }));
  check('① 取消再勾 fn → 已勾度量经暂存恢复', doc.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入区间"][value="0～128K"]').checked === true);
  window.eval(`backToList()`);
}

// ===== ③ per-fn 差异化收集：不同 fn 勾不同维度 → fnDims/fnMeasures 各自独立 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-online-text-glm4'); startEdit();`);
  window.eval(`openSpacePlanModal()`);
  // input：三维各一度量 → 8 组合；output：输入区间一档 → 2；cache：0 维 → 1
  ['input', 'output', 'cache'].forEach(f => {
    const box = doc.querySelector('.sp-fn-check[data-fn="' + f + '"]');
    box.checked = true;
    box.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  doc.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入区间"][value="128K～1M"]').checked = true;
  doc.querySelector('.sp-measure-check[data-fn="input"][data-dim="费用发生日"][value="周一至周五"]').checked = true;
  doc.querySelector('.sp-measure-check[data-fn="input"][data-dim="费用发生时间"][value="2点～8点"]').checked = true;
  doc.querySelector('.sp-measure-check[data-fn="output"][data-dim="输入区间"][value="1M+"]').checked = true;
  doc.getElementById('sp-name').value = 'r47-perfn';
  doc.getElementById('sp-eff-start').value = '2026-12-01T00:00:00';
  doc.getElementById('sp-eff-end').value = '2026-12-31T00:00:00';
  window.eval(`confirmSpacePlan()`);
  const k = window.eval(`Object.keys(spaces).find(x => spaces[x].name === 'r47-perfn')`);
  check('③ 空间创建成功', !!k);
  check('③ input fnDims=三维', window.eval(`spaces['${k}'].fnDims.input.join()`) === '输入区间,费用发生日,费用发生时间');
  check('③ output fnDims=一维', window.eval(`spaces['${k}'].fnDims.output.join()`) === '输入区间');
  check('③ cache 0维（fnDims 空数组）', window.eval(`spaces['${k}'].fnDims.cache.length`) === 0);
  check('③ output 度量独立（1M+，不随 input）', window.eval(`spaces['${k}'].fnMeasures.output['输入区间'].join()`) === '1M+');
  const cnts = window.eval(`({
    input: saleUnits.filter(u => u.spaceKey === '${k}' && u.fn === 'input').length,
    output: saleUnits.filter(u => u.spaceKey === '${k}' && u.fn === 'output').length,
    cache: saleUnits.filter(u => u.spaceKey === '${k}' && u.fn === 'cache').length
  })`);
  check('③ input 1 组合（1×1×1 纯叉乘，无缺省空对）', cnts.input === 1);
  check('③ output 1 组合', cnts.output === 1);
  check('③ cache 0维=1 空单元', cnts.cache === 1);
  check('③ 空间总单元 3（1+1+1，无跨 fn 重复叉乘）', window.eval(`saleUnits.filter(u => u.spaceKey === '${k}').length`) === 3);
  window.eval(`backToList()`);
}

// ===== ② 维度候选按商品类型过滤 =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  // vtpm 商品：弹窗只显 购买量区间/购买周期，不显 online-text 三维
  window.eval(`openDetailByCode('maas-product-vtpm-std'); startEdit(); openSpacePlanModal()`);
  doc.querySelector('.sp-fn-check[data-fn=""]').checked = true;
  window.eval(`renderSpFnCards()`);
  const dims = Array.from(doc.querySelectorAll('#sp-dimmeas [data-dimblock]')).map(x => x.dataset.dimblock);
  check('② vtpm 弹窗维度=购买量区间/购买周期', dims.join(',') === '购买量区间,购买周期');
  check('② vtpm 弹窗无输入区间', !dims.includes('输入区间'));
  check('② vtpm 弹窗无费用发生日/时间', !dims.includes('费用发生日') && !dims.includes('费用发生时间'));
  check('② vtpm 单卡片（无 function）', doc.querySelectorAll('[data-fncard]').length === 1 && doc.querySelector('[data-fncard]').dataset.fncard === '');
  window.eval(`backToList()`);
  // online-text 商品：只显三维，不显 vtpm 两维
  const dom2 = boot(); const w2 = dom2.window; const d2 = w2.document;
  w2.eval(`openDetailByCode('maas-online-text-glm4'); startEdit(); openSpacePlanModal()`);
  d2.querySelector('.sp-fn-check[data-fn="input"]').checked = true;
  d2.querySelector('.sp-fn-check[data-fn="input"]').dispatchEvent(new w2.Event('change', { bubbles: true }));
  const dims2 = Array.from(d2.querySelectorAll('#sp-dimmeas [data-dimblock]')).map(x => x.dataset.dimblock);
  check('② online-text 弹窗无购买量区间', !dims2.includes('购买量区间'));
  check('② online-text 弹窗无购买周期', !dims2.includes('购买周期'));
  check('② online-text 弹窗维度=三维', dims2.join(',') === '输入区间,费用发生日,费用发生时间');
  w2.eval(`backToList()`);
}

// ===== ④ 编辑模式 per-fn 回填（glm4 sp1 差异化配置） =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-online-text-glm4'); startEdit();`);
  window.eval(`openSpacePlanModal('sp1')`);
  check('④ 三 fn 勾选回填', ['input', 'output', 'cache'].every(f => doc.querySelector('.sp-fn-check[data-fn="' + f + '"]').checked === true));
  check('④ 三张 fn 卡片渲染', doc.querySelectorAll('[data-fncard]').length === 3);
  // input 卡片回填输入区间两档（第48轮口径：sp1 input 仅输入区间维度）
  check('④ input 回填 0～128K', doc.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入区间"][value="0～128K"]').checked === true);
  check('④ input 回填 1M+', doc.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入区间"][value="1M+"]').checked === true);
  check('④ input 未勾档位不回填', doc.querySelector('.sp-measure-check[data-fn="input"][data-dim="输入区间"][value="128K～1M"]').checked === false);
  // output 卡片只回填输入区间一档；cache 卡片全空（0维）
  check('④ output 回填 1M+（不随 input 双档，per-fn 独立）', doc.querySelector('.sp-measure-check[data-fn="output"][data-dim="输入区间"][value="1M+"]').checked === true);
  check('④ output 未勾 input 档位（per-fn 独立）', doc.querySelector('.sp-measure-check[data-fn="output"][data-dim="输入区间"][value="0～128K"]').checked === false);
  check('④ cache 卡片全未勾（0维 fn）', doc.querySelectorAll('.sp-measure-check[data-fn="cache"]:checked').length === 0);
  window.eval(`backToList()`);
}

// ===== ⑤ mock 自洽复检（第47轮 per-fn 口径：逐 fn 完整叉乘对照实际单元集合） =====
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
            const vals = (mea[d] || []).map(m => ({ dim: d, measure: m }));
            combos.forEach(c => vals.forEach(v => next.push([...c, v])));
            combos = next;
          });
          combos.map(combo => {
            const pairs = dims.map(d => combo.find(p => p.dim === d)).filter(p => p && p.measure);
            return { dim: pairs.map(p => p.dim).join(' + '), measure: pairs.map(p => p.measure).join(' + '), f: f || '' };
          }).forEach(cmb => expects.push(cmb));
        });
        expects.sort((a, b) => ((a.dim + '||' + a.measure) < (b.dim + '||' + a.measure) ? -1 : (a.dim + '||' + a.measure) > (b.dim + '||' + b.measure) ? 1 : (a.f < b.f ? -1 : a.f > b.f ? 1 : 0)));
        const actual = saleUnits.filter(u => u.spaceKey === k)
          .map(u => ({ dim: u.dim, measure: u.measure, f: u.fn || '' }))
          .sort((a, b) => ((a.dim + '||' + a.measure) < (b.dim + '||' + a.measure) ? -1 : (a.dim + '||' + a.measure) > (b.dim + '||' + b.measure) ? 1 : (a.f < b.f ? -1 : a.f > b.f ? 1 : 0)));
        return JSON.stringify(expects) === JSON.stringify(actual);
      });
      return res.every(x => x);
    })()`);
    check('mock 自洽 ' + code, ok === true);
    window.eval(`backToList()`);
  });
}

// ===== ⑥ glm4 mock 数量与售卖单元视图（第48轮：单空间 sp1 = input 2/output 1/cache 1 共 4） =====
{
  const dom = boot(); const { window } = dom; const doc = window.document;
  window.eval(`openDetailByCode('maas-online-text-glm4')`);
  check('⑥ sp1 4 单元', window.eval(`saleUnits.filter(u => u.spaceKey === 'sp1').length`) === 4);
  check('⑥ 无 sp2（第48轮删双11空间）', window.eval(`saleUnits.filter(u => u.spaceKey === 'sp2').length`) === 0);
  check('⑥ sp1 input 2 / output 1 / cache 1', window.eval(`['input','output','cache'].map(f => saleUnits.filter(u => u.spaceKey === 'sp1' && u.fn === f).length).join()`) === '2,1,1');
  check('⑥ glm4 售卖单元数据共 4', window.eval(`saleUnits.length`) === 4);
  window.eval(`switchInnerTab('saleunit'); renderSaleUnits()`);
  const rows = Array.from(doc.querySelectorAll('#saleunit-tbody tr'));
  check('⑥ SU Tab 默认 4 行（当前时刻唯一生效空间 sp1）', rows.length === 4);
  window.eval(`backToList()`);
}

console.log('第47轮: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail > 0 ? 1 : 0);
