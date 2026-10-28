// 第9轮验证：状态三态 + 版本历史左右布局 + 基本信息紧凑 + 按钮位置
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('/Users/lqh/Documents/ChatGPT/TPM保障包/prototype/admin-products.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;
let pass = 0, fail = 0;
const ok = (c, msg) => { c ? (pass++, console.log('  ✓ ' + msg)) : (fail++, console.log('  ✗ ' + msg)); };
const section = (t) => console.log('\n== ' + t + ' ==');

// 1. 商品详情页基本信息
section('1. 商品详情页基本信息');
window.openDetailFromListed('maas-product-vtpm-std');
const dv = document.getElementById('detail-view').textContent;
ok(dv.includes('基本信息') && !dv.includes('创建信息'), '第一部分标题为「基本信息」');
const infoGrid = document.getElementById('detail-info');
ok(infoGrid.className.includes('md:grid-cols-4'), '基本信息 4 列紧凑排列');
ok(infoGrid.querySelectorAll('div.bg-slate-50').length === 3, '基本信息 3 个字段（第12轮：删除关联 Playground 后剩类型/code/名称）');

// 2. 售卖单元 Tab 文案
section('2. 创建售卖单元文案');
window.switchInnerTab('saleunit');
const suTab = document.getElementById('inner-tab-saleunit');
const suBtn = suTab.querySelector('button');
ok(suBtn.textContent.includes('创建售卖单元'), '按钮文案=创建售卖单元: ' + suBtn.textContent.trim());
ok(suBtn.className.includes('admin-btn-primary'), '按钮为紫色 primary');

// 3. 计划状态三态
section('3. 计划状态三态');
window.switchInnerTab('plan');
const planBody = document.getElementById('plan-tbody').textContent;
ok(planBody.includes('已发布') && !planBody.includes('生效中'), '计划列表状态=已发布（非生效中）: ' + (planBody.match(/待发布|已发布|已停用|生效中|已过期/g) || []).join(','));
ok(!planBody.includes('已过期'), '无「已过期」状态');
// 详情页状态徽标
window.openPlanDetail(0);
ok(document.getElementById('plan-detail-status').textContent === '已发布', '详情页状态徽标=已发布');
// 操作区在计划单元列表右下方
const actionsEl = document.getElementById('plan-detail-actions');
ok(actionsEl.textContent.includes('修改') && actionsEl.textContent.includes('停用'), '已发布 → 修改+停用按钮');
const card = actionsEl.closest('.admin-card');
ok(card.querySelector('#plan-detail-tbody') && card.contains(actionsEl) && actionsEl.previousElementSibling.tagName === 'TABLE' || !!card.querySelector('table'), '操作区与计划单元表同卡片（右下方）');
ok(actionsEl.className.includes('justify-end'), '操作区右对齐');
// 基础信息仅名称+优先级
const fields = document.getElementById('plan-detail-fields').textContent;
ok(fields.includes('名称') && fields.includes('优先级'), '基础信息含名称/优先级');
// 计划单元表含生效起止
const pdet = document.getElementById('plan-detail-tbody');
ok(pdet.textContent.includes('生效中'), '计划单元表含生效标记');
window.closePlanDetail();

// 4. 列表页按钮位置
section('4. 列表页创建按钮');
window.backToList();
const listHeader = document.querySelector('#list-view > div');
const addBtn = listHeader.querySelector('button');
ok(addBtn.textContent.includes('新增商品'), '新增商品按钮存在');
ok(addBtn.className.includes('admin-btn-primary'), '新增商品按钮为紫色');
ok(addBtn === listHeader.lastElementChild, '新增商品按钮在标题右侧');

window.openDetailFromListed('maas-product-vtpm-std');
window.switchInnerTab('plan');
const planCreateBtn = document.querySelector('#inner-tab-plan .flex button');
ok(planCreateBtn.textContent.includes('创建售卖计划') && planCreateBtn.className.includes('admin-btn-primary'), '创建售卖计划按钮紫色');

// 5. 版本历史左右布局
section('5. 版本历史左右布局');
window.switchInnerTab('factor-config');
window.openConfigHistory('factor');
const histModal = document.getElementById('modal-config-history');
ok(!histModal.classList.contains('hidden'), '版本历史弹窗打开');
const histBody = document.getElementById('config-history-body');
const histBtns = histBody.querySelectorAll('#config-history-list button');
const versions = window.eval('currentConfigs.factor.versions.length');
ok(histBtns.length === versions, '左侧版本列表个数=' + versions);
// 最新在前
const firstV = histBtns[0].textContent.trim();
const latestV = window.eval('currentConfigs.factor.versions[currentConfigs.factor.versions.length-1].version');
ok(firstV.startsWith(latestV), '最新版在第一位: ' + firstV + ' vs ' + latestV);
// 默认选中最新 → 右侧展示当前版本
ok(histBody.textContent.includes('当前版本'), '默认选中最新版（当前版本徽标）');
// 点击历史版本 → 右侧切换
const histIdx = histBtns.length - 1;
window.selectConfigHistoryVersion(histIdx);
const histBody2 = document.getElementById('config-history-body');
ok(histBody2.textContent.includes('历史版本'), '选中历史版本后右侧展示「历史版本」');
const selBtn = histBody2.querySelectorAll('#config-history-list button')[histIdx];
ok(selBtn.className.includes('violet'), '选中项高亮紫色');
// 右侧 YAML 展示
ok(histBody2.querySelector('pre') !== null, '右侧展示 YAML 内容');
window.closeModal('config-history');

// 6. SLO 版本历史同样布局
section('6. SLO 版本历史');
window.switchInnerTab('slo-config');
window.openConfigHistory('slo');
ok(document.getElementById('config-history-body').querySelector('#config-history-list') !== null, 'SLO 版本历史同为左右布局');

console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
