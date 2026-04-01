# Halo 圣经插件

适用于 Halo 2.x 的圣经插件，提供：

- 系统 → 工具 → `圣经`：按旧约 / 新约、卷、章浏览经文，并支持多关键词模糊搜索。
- 插件设置页：配置经文源、前台悬浮图标、显示页面与排查信息。
- 文章编辑器扩展：在编辑器中搜索并插入经文，支持多关键词搜索。
- 前台主题悬浮入口：可在首页、文章页或指定路径显示，支持搜索与按卷章浏览。

当前项目统一以官方可解析的 `Halo 2.22.5` 插件平台版本进行构建，避免 GitHub Actions 在解析 `run.halo.tools.platform:plugin` 时拉取到不存在的版本。

## 当前结构

### 1. 系统工具页

经文管理已从插件内部独立出来，迁移到 Halo 控制台的：

`系统 → 工具 → 圣经`

这里可以：

- 顶部搜索经文；
- 按旧约 / 新约 → 卷 → 章浏览；
- 查看当前章节全部内容；
- 打开右侧编辑面板新增、修改、删除经文。

### 2. 插件设置页

插件详情页中保留：

- 经文源配置：远程 CSV 地址、内嵌 CSV 文本；
- 前台悬浮入口配置：是否启用、位置、图标、显示页面、路径包含 / 排除；
- 排查日志：当前加载来源、经文数量、章节数量、编辑持久化文件路径等。

### 3. 前台悬浮入口

插件会通过主题页脚处理器注入前台悬浮入口。

支持：

- 首页显示；
- 文章页显示；
- 全站显示；
- 自定义路径包含 / 排除；
- 默认使用插件 Logo，也可自定义图标地址。

### 4. 编辑器插入经文

文章编辑器工具栏中可直接打开“插入经文”弹窗：

- 支持多关键词模糊搜索，例如：`耶稣 血`
- 支持按卷章浏览后多选插入
- 插入格式为可直接用于正文展示的经文块

## 搜索规则

所有搜索统一支持“多关键词 AND 匹配”：

- 输入 `耶稣 血`
- 返回内容中同时包含 `耶稣` 和 `血` 的经文

## 数据来源

经文加载优先级：

1. 插件设置中的远程 CSV 地址
2. 插件设置中的内嵌 CSV 文本
3. 插件内置 `src/main/resources/bible/bible.csv`

经文编辑结果持久化到：

- `~/.halo/plugins/bible/edits.json`

插件基础设置持久化到：

- `~/.halo/plugins/bible/config.json`

## 前端资源

主题悬浮入口使用以下静态资源：

- `src/main/resources/bible/theme-bible-widget.js`
- `src/main/resources/bible/theme-bible-widget.css`

并通过：

- `src/main/resources/extensions/reverseproxy.yaml`

暴露为 `/plugins/bible/assets/**`

## 本地开发

### 环境要求

- JDK 21
- Node.js 18+
- Gradle（若项目未生成 wrapper）

### 构建前端

```bash
cd ui
npm install
npm run build
```

### 构建插件

```bash
gradle build
```

### 运行到 Halo 开发环境

在 Halo 的 `application-local.yaml` 中配置：

```yaml
halo:
  plugin:
    runtime-mode: development
    fixed-plugin-path:
      - /path/to/halo-plugin-bible-main
```

然后重启 Halo，在控制台启用插件即可。

## 上传 GitHub 与自动打包

仓库已包含两个工作流：

- `C:\Users\Administrator\Desktop\halo-plugin-bible-main\.github\workflows\build-plugin.yml`：推送到 `main` / `master`、PR、手动触发时构建 JAR 并上传为 Actions Artifact。
- `C:\Users\Administrator\Desktop\halo-plugin-bible-main\.github\workflows\release-plugin.yml`：在 GitHub Release 发布后自动构建，并把 JAR 上传到当前 Release 资产。

### 推荐发布流程

1. 在 GitHub 新建仓库，例如 `halo-plugin-bible`
2. 把当前项目整体上传到该仓库
3. 推送到 `main` 分支
4. 进入 GitHub 的 `Actions` 页面，等待 `Build Plugin` 执行完成
5. 在构建详情页的 `Artifacts` 下载 `plugin-bible-jar`

### 发布正式版本

1. 在仓库中创建标签，例如 `v1.1.0`
2. 在 GitHub 创建同名 Release 并点击发布
3. `Release Plugin` 会自动构建
4. 构建完成后，JAR 会自动挂到 Release 资产里

### 上传命令示例

如果你本地已经初始化 Git，可使用：

```bash
git init
git add .
git commit -m "feat: refactor bible plugin"
git branch -M main
git remote add origin https://github.com/iszkq/halo-plugin-bible.git
git push -u origin main
```

如果后续要发版：

```bash
git tag v1.1.0
git push origin main --tags
```
