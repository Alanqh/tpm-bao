// 第62轮测试：工作组管理页增强——Serverless 模型列表配置（未启用/全部/部分）
// + 生效模型列表（场景③：vTPM 包覆盖模型 ∪ Serverless 模型；同模型 vTPM 优先）+ 创建弹窗三态
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../prototype/admin-workgroups.html'), 'utf8');

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name); } };
function section(t) { console.log('\n== ' + t + ' =='); }
function boot() {
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: vc, pretendToBeVisual: true });
  dom.window.alert = () => {}; dom.window.confirm = () => true;
  return dom;
}

section('页面加载与语法');
const dom = boot();
const w = dom.window;
check('JS 无语法错误，页面可加载', !!w.document);

section('列表视图：Serverless 模型列表列');
// 选择 subject 智象科技
w.document.getElementById('wg-subject-select').value = 'sub_3x9a2b1c';
w.onSubjectFilterChange();
const tbody1 = w.document.getElementById('wg-tbody').innerHTML;
check('default 组（partial 1 个模型）显示「1 个模型」', tbody1.includes('1 个模型') && tbody1.includes('/proj-alpha/deepseek-v4.1'));
check('wg-marketing（all）显示「全部模型」', tbody1.includes('全部模型'));
check('wg-research（none）显示「未启用（空）」', tbody1.includes('未启用（空）'));
check('使用场景说明卡渲染（场景①②③）', w.document.body.innerHTML.includes('场景 ① 请求未指定工作组') && w.document.body.innerHTML.includes('场景 ② 指定工作组 + playground_name') && w.document.body.innerHTML.includes('场景 ③ 仅指定工作组'));

section('详情视图：Serverless 模型列表配置卡');
const subj = w.eval('subjects');
const mkt = subj['sub_3x9a2b1c'].workgroups.find(x => x.code === 'wg-marketing');
w.openWgDetail(mkt.id);
let slBox = w.document.getElementById('wg-sl-config-box').innerHTML;
check('wg-marketing 显示「全部模型」配置', slBox.includes('全部模型') && slBox.includes('平台全部 Serverless 模型'));
// 生效模型列表：all → 模型池 4 个（vTPM glm-4 已在池内，不新增行）
const effRows1 = w.document.getElementById('wg-eff-tbody').querySelectorAll('tr');
check('生效模型列表 = 全模型池 ∪ vTPM 模型（4 行，glm-4 重合）', effRows1.length === 4);
const glm4Row = Array.from(effRows1).find(tr => tr.textContent.includes('/proj-alpha/glm-4'));
check('glm-4 同模型 vTPM 优先', glm4Row && glm4Row.textContent.includes('vTPM 包') && glm4Row.textContent.includes('vTPM 包 × 1'));
check('glm-4 超量行为 = 超量路由 Serverless（按量计费）', glm4Row && glm4Row.textContent.includes('超量路由 Serverless（按量计费）'));

section('详情视图：default（partial）与 research（none）');
const dflt = subj['sub_3x9a2b1c'].workgroups.find(x => x.code === 'default');
w.openWgDetail(dflt.id);
slBox = w.document.getElementById('wg-sl-config-box').innerHTML;
check('default 显示「部分模型（1/4）」', slBox.includes('部分模型（1/4）'));
let effRows2 = w.document.getElementById('wg-eff-tbody').querySelectorAll('tr');
check('default 生效模型 = vTPM deepseek ∪ Serverless deepseek = 1 行', effRows2.length === 1);
const dsRow = effRows2[0];
check('deepseek vTPM 优先（default 为超量限流口径 → 429）', dsRow && dsRow.textContent.includes('vTPM 包') && dsRow.textContent.includes('超量限流（429）'));

const rnd = subj['sub_3x9a2b1c'].workgroups.find(x => x.code === 'wg-research');
w.openWgDetail(rnd.id);
slBox = w.document.getElementById('wg-sl-config-box').innerHTML;
check('research 显示「未启用（空）」', slBox.includes('未启用（空）'));
effRows2 = w.document.getElementById('wg-eff-tbody').querySelectorAll('tr');
check('research 无生效 vTPM、SL 为空 → 暂无生效模型', effRows2.length === 1 && effRows2[0].textContent.includes('暂无生效模型'));

section('修改模型列表弹窗');
// default 不允许修改（先重开弹窗读提示）
w.openWgDetail(dflt.id);
w.openSlEditModal();
let errEl = w.document.getElementById('sl-edit-error');
check('default 弹窗提示不可修改', !errEl.classList.contains('hidden') && errEl.textContent.includes('default'));
w.confirmSlEdit();
check('default 保存被拦截（slMode 不变）', subj['sub_3x9a2b1c'].workgroups.find(x => x.code === 'default').slMode === 'partial');

// wg-research: 改为部分模型并勾选 2 个
w.openWgDetail(rnd.id);
w.openSlEditModal();
w.eval(`document.querySelector('input[name="sl-edit-mode"][value="partial"]').checked = true; onSlModeRadioChange();
  document.querySelector('input[name="sl-edit-res"][value="/proj-alpha/deepseek-v4.1"]').checked = true;
  document.querySelector('input[name="sl-edit-res"][value="/proj-beta/kimi-k2"]').checked = true;`);
w.confirmSlEdit();
check('research 保存为 partial（2 个模型）', rnd.slMode === 'partial' && rnd.slModels.length === 2 && rnd.slModels.includes('/proj-beta/kimi-k2'));
let effRows3 = w.document.getElementById('wg-eff-tbody').querySelectorAll('tr');
check('research 生效模型列表刷新为 2 行（纯 Serverless）', effRows3.length === 2 && Array.from(effRows3).every(tr => tr.textContent.includes('Serverless（无 vTPM 覆盖）')));

// 校验：partial 未勾选任何模型 → 报错
w.openSlEditModal();
w.eval(`document.querySelector('input[name="sl-edit-mode"][value="partial"]').checked = true; onSlModeRadioChange();
  document.querySelectorAll('input[name="sl-edit-res"]').forEach(cb => cb.checked = false);`);
w.confirmSlEdit();
check('partial 零勾选被拦截', !w.document.getElementById('sl-edit-error').classList.contains('hidden') && rnd.slModels.length === 2);

section('创建工作组：Serverless 模型列表三态');
w.backToList();
w.openCreateWgModal();
check('创建弹窗含 Serverless 模型列表三态', !!w.document.querySelector('input[name="create-wg-slmode"][value="none"]') && !!w.document.querySelector('input[name="create-wg-slmode"][value="all"]') && !!w.document.querySelector('input[name="create-wg-slmode"][value="partial"]'));
w.eval(`document.getElementById('create-wg-code').value = 'wg-test-sl';
  document.getElementById('create-wg-note').value = '测试';
  document.querySelector('input[name="create-wg-route"][value="limit"]').checked = true;
  document.querySelector('input[name="create-wg-slmode"][value="all"]').checked = true;`);
w.confirmCreateWg();
const created = subj['sub_3x9a2b1c'].workgroups.find(x => x.code === 'wg-test-sl');
check('新建组 slMode=all 落库', !!created && created.slMode === 'all' && Array.isArray(created.slModels) && created.slModels.length === 0);

section('解绑联动刷新');
w.openWgDetail(created.id);
// 手动塞一个 vTPM 资源再解绑，验证生效模型表联动
w.eval(`subjects['sub_3x9a2b1c'].workgroups.find(x => x.id === '${created.id}').resources.push({ type: 'vtpm', id: 'P999', name: 'test', model: '/proj-alpha/glm-4', spec: 's', period: 'p', status: '生效中', statusCls: 'x' });
  openWgDetail('${created.id}');`);
let effBefore = w.document.getElementById('wg-eff-tbody').querySelectorAll('tr').length;
check('all + vTPM glm-4 → 生效模型 = 4（全模型池已含 glm-4）', effBefore === 4);
w.eval(`openUnbindModal(0); confirmUnbind();`);
let effAfter = w.document.getElementById('wg-eff-tbody').querySelectorAll('tr').length;
const slBoxAfter = w.document.getElementById('wg-sl-config-box').innerHTML;
check('解绑后 SL 配置卡与生效模型表联动刷新', effAfter === 4 && slBoxAfter.includes('全部模型'));

section('导航同步');
const files = ['index.html', 'terms.html', 'wallet.html', 'admin-packages.html', 'admin-products.html'];
files.forEach(f => {
  const c = fs.readFileSync(path.join(__dirname, '../prototype/', f), 'utf8');
  check(f + ' 导航含工作组入口', c.includes('admin-workgroups.html'));
});

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
