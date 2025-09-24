<template>
  <div class="about-container">
    <!-- Header Section -->
    <header class="header">
      <h1 class="title">EasyEdgeVoice</h1>
      <p class="subtitle">Smart TTS Management Solution / TTS语音合成管理工具</p>
    </header>

    <!-- Intro Section -->
    <section class="intro">
      <div class="intro-content">
        <el-icon :size="40" class="intro-icon"><ChatDotRound /></el-icon>
        <h2>项目简介</h2>
        <p>
          EasyEdgeVoice
          是一个开源语音合成工具，致力于将文本轻松转换为自然流畅的语音输出，支持多用户管理。
          
        </p>
        <p>特别适合短视频语音配音、合成及字幕，长篇文章的有声化生成及管理需求。</p>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <h2 class="section-title">核心功能</h2>
      <el-row :gutter="20" class="feature-list">
        <el-col :xs="24" :sm="12" :md="8">
          <div class="feature-item">
            <el-icon :size="30"><Reading /></el-icon>
            <h3>多角色文本转语音</h3>
            <p>一键将文本转换为语音，支持多角色选择与切换</p>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8">
          <div class="feature-item">
            <el-icon :size="30"><Microphone /></el-icon>
            <h3>自定义设置</h3>
            <p>自由调整语速与音调</p>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8">
          <div class="feature-item">
            <el-icon :size="30"><Setting /></el-icon>
            <h3>多用户后台管理</h3>
            <p>分工明确，数据安全，管理便捷</p>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- Team Section -->
    <section class="team">
      <h2 class="section-title">关于</h2>
      <div class="team-content">
        <el-icon :size="40" class="team-icon"><User /></el-icon>
        <p>EasyEdgeVoice项目基于EasyVoice开源项目开发，旨在提供更简单高效的语音合成与管理体验。</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import {
  ChatDotRound,
  Reading,
  Microphone,
  Setting,
  User,
} from "@element-plus/icons-vue";
import { Github } from "lucide-vue-next";

const goToAuthorGitHub = () => {
  window.open("https://github.com/geekleecs", "_blank");
};

const goToProjectGitHub = () => {
  window.open("https://github.com/geekleecs/easyEdgeVoice", "_blank");
};
</script>

<style scoped>
.about-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 0 20px;
  font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif;
  color: #333;
}

/* Header */
.header {
  text-align: center;
  padding: 60px 0;
}
.title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #1a1a1a;
}
.subtitle {
  font-size: 20px;
  color: #666;
}

/* Intro */
.intro {
  max-width: 1200px;
  margin: 0 auto 60px;
}
.intro-content {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: 30px;
  text-align: center;
  backdrop-filter: blur(10px);
}
.intro-icon {
  color: #007aff;
  margin-bottom: 20px;
}
.intro-content h2 {
  font-size: 24px;
  margin-bottom: 15px;
  color: #1a1a1a;
}
.intro-content p {
  font-size: 16px;
  color: #666;
}

/* Features */
.features {
  max-width: 1200px;
  margin: 0 auto 60px;
}
.section-title {
  font-size: 32px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 40px;
  color: #1a1a1a;
}
.feature-list {
  text-align: center;
}
.feature-item {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  transition: transform 0.3s ease;
}
.feature-item:hover {
  transform: translateY(-5px);
}
.feature-item .el-icon {
  color: #007aff;
  margin-bottom: 10px;
}
.feature-item h3 {
  font-size: 18px;
  margin-bottom: 10px;
  color: #1a1a1a;
}
.feature-item p {
  font-size: 14px;
  color: #666;
}

/* Team */
.team {
  max-width: 1200px;
  margin: 0 auto 60px;
}
.team-content {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: 30px;
  text-align: center;
  backdrop-filter: blur(10px);
}
.team-icon {
  color: #007aff;
  margin-bottom: 20px;
}
.team-content p {
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
}
.links .el-button {
  margin: 0 10px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .title {
    font-size: 36px;
  }
  .subtitle {
    font-size: 16px;
  }
  .section-title {
    font-size: 24px;
  }
  .intro-content {
    padding: 20px;
  }
  .feature-item {
    margin-bottom: 15px;
  }
}
</style>
