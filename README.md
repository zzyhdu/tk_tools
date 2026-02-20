# 智能打包计算器

基于 React + Vite + Tailwind CSS 的外箱尺寸推荐工具，支持根据单个商品尺寸和打包数量，计算最接近正方体的排列方案。

## 在线地址

https://tk-tools.vercel.app/

## 本地运行

```bash
npm install
npm run dev
```

## 测试

```bash
npm test
```

## 构建

```bash
npm run build
```

## 发布到 Vercel

### 方式 1：网页导入（推荐）

1. 把当前项目推送到 GitHub/GitLab/Bitbucket。
2. 打开 Vercel，新建项目并选择该仓库。
3. Framework 选择 `Vite`（通常自动识别）。
4. 保持默认构建设置（仓库里已包含 `vercel.json`）。
5. 点击 Deploy。

### 方式 2：CLI

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

首次执行 `vercel` 时按提示选择：
- Project Name: 自定义
- Framework: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
