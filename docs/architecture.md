# 架构概述

## 技术原理

- 前端: Vue + element-plus 提供前端交互页面
- 后端: Express 提供静态页面、API 服务
- 语音合成: edge-tts 提供语音合成服务
- 部署: Node.js 提供本地部署方案

## 特色

- 一键部署到自己服务器或者电脑, 支持 Node.js 部署方式
- 简单易用的 WEB UI 页面
- 支持试听、支持语速、音调、音量等参数调整
- 支持字幕生成
- 长文本支持，可以将大型文本文件快速一键转换为语音(实现原理: 文本分片，后端实现为并发调用 edge-tts 服务，ffmpeg 拼接音频文件，根据角色和文本内容智能缓存音频文件，减少重复调用，提高效率)
- 支持MySQL管理
- 支持多账号管理及内容管理后台，方便长期创作的内容管理

## TODO

- 接入其他 TTS 引擎
- 更多语言支持
- 支持克隆语音

## 技术栈 🛠️

- **前端**  
  - Vue.js  
  - Element Plus  
- **后端**  
  - Express.js
  - @node-rs/jieba
  - franc  
  - mysql
- **语音合成**  
  - edge-tts  
  - ffmpeg
  - Other TTS engines
- **部署**  
  - Node.js  