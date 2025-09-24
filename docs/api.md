# API 文档

> 基于架构文档与代码实现（Express + TTS 服务）梳理。
>
> 基础前缀：`/api/v1/tts`（除健康检查外）。

## 目录
- GET `/api/health` 健康检查
- GET `/api/v1/tts/engines` 查询可用 TTS 引擎与支持信息
- GET `/api/v1/tts/voiceList` 获取内置发音人列表
- POST `/api/v1/tts/generate` 直接生成音频（短文本）
- POST `/api/v1/tts/create` 创建异步生成任务
- GET `/api/v1/tts/task/:id` 查询任务状态
- GET `/api/v1/tts/task/stats` 查询任务统计
- GET `/api/v1/tts/download/:file` 下载生成的音频文件
- POST `/api/v1/tts/createStream` 流式生成音频（长文本）
- POST `/api/v1/tts/generateJson` 批量段落流式生成（JSON 列表）

---

## 健康检查
### GET `/api/health`
- **说明**：服务存活检查。
- **请求参数**：无
- **响应**：
```json
{
  "status": "ok"
}
```
- **状态码**：200 正常；503 异常

---

## 引擎信息
### GET `/api/v1/tts/engines`
- **说明**：列出已注册的 TTS 引擎、支持语言及可选音色。
- **请求参数**：无
- **响应示例**：
```json
[
  {
    "name": "edge-tts",
    "languages": ["zh-CN", "en-US"],
    "voices": [
      { "name": "zh-CN-XiaoxiaoNeural", "gender": "Female" }
    ]
  }
]
```
- **状态码**：200

---

## 发音人列表
### GET `/api/v1/tts/voiceList`
- **说明**：返回内置的 `voice.json` 列表。
- **响应封装**：
```json
{
  "code": 200,
  "success": true,
  "data": [
    {
      "Name": "zh-CN-XiaoxiaoNeural",
      "cnName": "晓晓",
      "Gender": "Female",
      "ContentCategories": ["General"],
      "VoicePersonalities": []
    }
  ]
}
```
- **状态码**：200；500 读取失败

---

## 直接生成（短文本）
### POST `/api/v1/tts/generate`
- **说明**：同步返回生成结果，适用于短文本。后端对文本长度有限制，超限请改用流式接口。
- **请求体（useLLM=false，Edge 模式）**：
```json
{
  "text": "你好，世界！",
  "voice": "zh-CN-XiaoxiaoNeural",
  "rate": "+0%",
  "pitch": "+0Hz",
  "volume": "+0%",
  "useLLM": false
}
```
- **请求体（useLLM=true，LLM 模式）**：
```json
{
  "text": "你好，世界！",
  "openaiBaseUrl": "https://api.openai.com/v1",
  "openaiKey": "sk-***",
  "openaiModel": "gpt-4o-mini",
  "useLLM": true
}
```
- 校验规则：
  - 通用：`text` 最少 5 字符；可配置 `LIMIT_TEXT_LENGTH` 上限
  - 直接生成 `/generate` 还受 `DIRECT_GEN_LIMIT` 限制，超限返回 400
  - LLM 模式若未传 `openaiBaseUrl/openaiKey/openaiModel`，可从环境变量 `OPENAI_BASE_URL/OPENAI_API_KEY/MODEL_NAME` 兜底
- **响应**：
```json
{
  "success": true,
  "code": 200,
  "data": {
    "audio": "/absolute/or/public/path/to/file.mp3",
    "file": "file.mp3",
    "srt": "file.srt",
    "size": 12345,
    "id": "task-or-file-id"
  }
}
```
- **状态码**：200；400 参数不合法；500 生成失败

---

## 创建任务（异步）
### POST `/api/v1/tts/create`
- **说明**：创建异步任务，立即返回任务信息；后端异步生成完成后可通过查询任务获取结果。
- **请求体**：与 `/generate` 相同的 Edge/LLM 规则与字段。
- **响应**：
```json
{
  "success": true,
  "code": 200,
  "data": {
    "id": "task_123",
    "status": "pending|running|success|failed",
    "progress": 0,
    "message": "",
    "result": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 查询任务
### GET `/api/v1/tts/task/:id`
- **说明**：查询指定任务的执行与结果。
- **响应**：
```json
{
  "success": true,
  "code": 200,
  "data": {
    "id": "task_123",
    "status": "success",
    "progress": 100,
    "message": "",
    "result": {
      "audio": "/path/to/file.mp3",
      "file": "file.mp3",
      "srt": "file.srt"
    }
  }
}
```
- **不存在**：404 `{ success: false, code: 404, message: "Task not found" }`

---

## 任务统计
### GET `/api/v1/tts/task/stats`
- **说明**：返回任务管理器的统计数据（内部字段，供监控/调试）。
- **响应**：
```json
{
  "success": true,
  "code": 200,
  "data": { "total": 10, "running": 1, "success": 8, "failed": 1 }
}
```
- **不存在**：404

---

## 下载音频
### GET `/api/v1/tts/download/:file`
- **说明**：下载生成的音频文件，仅允许在白名单扩展名内（参考服务端 `ALLOWED_EXTENSIONS`）。
- **路径参数**：`file` 目标文件名（服务端会做 `basename` 安全处理）
- **响应**：二进制文件流；异常时返回 JSON：
```json
{
  "error": "Failed to download file",
  "message": "Invalid file type"
}
```
- **状态码**：200 成功；400 非法文件名/类型；404 文件不存在；500 其他错误

---

## 流式生成（长文本）
### POST `/api/v1/tts/createStream`
- **说明**：创建并直接开始返回音频流，适合长文本；前端需以 `fetch`/流方式处理。
- **请求体**：与 `/generate` 相同的 Edge/LLM 字段与规则。
- **请求参数**：可选 `?mock=1` 返回内置演示音频流（调试用）。
- **响应**：
  - 正常：`audio/mpeg` 等音频流
  - 发生错误时：返回 JSON（`application/json`），结构与 `ResponseWrapper` 一致
  - 响应头：可能包含 `x-generate-tts-type`（供前端识别）

---

## 批量 JSON 段落流式生成
### POST `/api/v1/tts/generateJson`
- **说明**：传入段落数组（每项包含文本与音色参数），服务端合并任务并以流方式返回，适合带多角色/多段落的长文场景。
- **请求体**：
```json
{
  "data": [
    { "text": "第一段文本", "voice": "zh-CN-XiaoxiaoNeural", "rate": "", "pitch": "", "volume": "" },
    { "text": "第二段文本", "voice": "zh-CN-YunxiNeural" }
  ]
}
```
- 校验：`data` 为非空数组；拼接后的总长度也受 `LIMIT_TEXT_LENGTH` 限制
- **响应**：音频流或 JSON 错误

---

## 通用说明
- **请求与响应封装**：
  - 成功：`{ success: true, code: 200, data: ... }`
  - 失败：`{ success: false, code: 4xx/5xx, message?: string, errors?: any }`
- **文本与参数归一化**：服务端会将空/零值标准化为 `+0%`、`+0Hz` 等；`text` 会 `trim()`
- **长度限制**：
  - 全局最大长度：`LIMIT_TEXT_LENGTH`（超出返回 400）
  - 同步生成接口 `/generate` 限制：`DIRECT_GEN_LIMIT`（超出返回 400，建议改用流式）
- **环境变量兜底（LLM 模式）**：`OPENAI_BASE_URL`、`OPENAI_API_KEY`、`MODEL_NAME`
- **下载白名单**：仅允许 `ALLOWED_EXTENSIONS` 中的扩展名

---

## 前端使用示例
- 获取发音人：
```ts
import { getVoiceList } from '@/api/tts'
const { data } = await getVoiceList()
```
- 直接生成：
```ts
import { generateTTS } from '@/api/tts'
const res = await generateTTS({ text: '你好世界！', voice: 'zh-CN-XiaoxiaoNeural' })
const url = `/api/v1/tts/download/${res.data.file}`
```
- 流式生成：
```ts
import { createTaskStream } from '@/api/tts'
const streamOrJson = await createTaskStream({ id: 'ignored-by-server' /* 实际传 TTS 字段 */ })
```

---

## 错误码与消息
- 200：成功
- 400：参数校验失败/文本超长/非法下载请求
- 404：任务不存在/文件不存在
- 500：服务器内部错误
- 503：健康检查失败