# EasyEdgeVoice Backend

基于 Express + TypeScript + MySQL 构建的企业级文本转语音服务后端。

## 技术架构

### 核心特性
- **模块化设计**：API -> Service -> Utils 分层架构
- **依赖注入**：自定义容器管理服务依赖
- **事件驱动**：基于 EventEmitter 的异步处理
- **数据验证**：使用 Zod 进行请求参数验证
- **日志系统**：Winston 结构化日志记录
- **健康检查**：生产环境就绪的健康监控
- **数据库支持**：可选的 MySQL 数据持久化

### 项目结构
```
src/
├── controllers/     # 控制器层
├── services/       # 业务逻辑层
├── middleware/     # 中间件
├── routes/         # 路由定义
├── tts/           # TTS引擎管理
├── storage/       # 存储抽象层
└── utils/         # 工具函数
```


### 安装依赖
```bash
pnpm install
```

### 环境配置
创建 `.env` 文件：
```env
# 基础配置
HOST=0.0.0.0
PORT=3000
NODE_ENV=development

# TTS配置
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your_api_key
MODEL_NAME=gpt-4o-mini

# 数据库配置（可选）
ENABLE_MYSQL=false
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=easyedgevoice
```

### 启动开发服务器
```bash
# 开发模式
pnpm dev

# 生产模式
pnpm build
pnpm start
```

## 数据库初始化

### 自动初始化
当 `ENABLE_MYSQL=true` 时，服务启动会自动创建数据库和表结构。

### 手动初始化
```bash
# 执行初始化脚本
mysql -u root -p < ../../scripts/sql/init_database.sql
```

### 默认管理员账号
- 用户名：`admin`
- 密码：`admin123`

## API 文档

详细的 API 文档请参考：[docs/api.md](../../docs/api.md)

## 部署说明

### 生产环境部署
```bash
# 构建项目
pnpm build

# 启动服务
pnpm start
```