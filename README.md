# TPM 保障包原型

本仓库包含 TPM 保障包相关的前端 HTML 原型，使用纯 HTML + Tailwind CSS 构建，可直接部署为静态站点。

## 在线访问

部署后访问地址：

```
https://<你的 GitHub 用户名>.github.io/<仓库名>/
```

例如：`https://lqh.github.io/tpm-bao/`。

## 本地预览

在项目根目录执行：

```bash
cd prototype
python3 -m http.server 8080
```

然后打开 `http://localhost:8080` 即可预览。

## 目录说明

- `prototype/`：所有原型页面
  - `index.html`：官网首页
  - `purchase.html`：购买意向问卷
  - `terms.html`：购买须知文档
  - `dashboard.html`：前台资源包管理
  - `usage.html`：前台资源包监控
  - `admin-inventory.html`：后台资源包管理
  - `admin-usage.html`：后台资源包监控
  - `admin-records.html`：后台记录（已不在导航中）

## 部署到 GitHub Pages

### 首次部署

1. 在 GitHub 上新建一个公开仓库，例如 `tpm-bao`。
2. 添加远程仓库地址：

   ```bash
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   ```

3. 提交并推送代码：

   ```bash
   git add .
   git commit -m "init prototype"
   git push -u origin main
   ```

4. 打开 GitHub 仓库页面，进入 **Settings > Pages**。
5. Source 选择 **GitHub Actions**。
6. 等待 Actions 运行完成，即可通过 `https://<你的用户名>.github.io/<仓库名>/` 访问。

### 更新发布

本地修改 HTML 后，只需：

```bash
git add .
git commit -m "update prototype"
git push
```

GitHub Actions 会自动重新部署，通常 1-2 分钟内生效。

## 其他部署方式

- **飞书妙搭**：适合国内快速分享，但需逐页上传，不便版本管理。
- **魔搭社区**：更适合模型/Notebook 演示，静态 HTML 部署较重。
- **GitHub Pages**：推荐方案，免费、自动部署、与 Git 工作流无缝衔接。
