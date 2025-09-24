-- EasyEdgeVoice 数据库初始化脚本
-- 支持幂等性，可重复执行

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `easyedgevoice` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `easyedgevoice`;

-- 创建用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `last_login` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 创建TTS记录表
CREATE TABLE IF NOT EXISTS `tts_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` VARCHAR(64) NULL COMMENT '任务ID',
  `engine` VARCHAR(32) NULL COMMENT 'TTS引擎',
  `voice` VARCHAR(64) NULL COMMENT '声音模型',
  `rate` VARCHAR(16) NULL COMMENT '语速',
  `pitch` VARCHAR(16) NULL COMMENT '音调',
  `volume` VARCHAR(16) NULL COMMENT '音量',
  `use_llm` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否使用LLM',
  `text` MEDIUMTEXT NULL COMMENT '原始文本',
  `text_hash` CHAR(64) NOT NULL COMMENT '文本哈希',
  `text_len` INT NOT NULL COMMENT '文本长度',
  `language` VARCHAR(16) NULL COMMENT '语言',
  `status` VARCHAR(16) NOT NULL DEFAULT 'pending' COMMENT '状态',
  `error_message` TEXT NULL COMMENT '错误信息',
  `file_name` VARCHAR(255) NULL COMMENT '音频文件名',
  `srt_file` VARCHAR(255) NULL COMMENT '字幕文件名',
  `file_size` INT NULL COMMENT '文件大小(字节)',
  `duration_ms` INT NULL COMMENT '音频时长(毫秒)',
  `latency_ms` INT NULL COMMENT '生成延迟(毫秒)',
  `requester_ip` VARCHAR(45) NULL COMMENT '请求IP',
  `user_id` INT UNSIGNED NULL COMMENT '用户ID',
  `username` VARCHAR(50) NULL COMMENT '用户名',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status` (`status`),
  KEY `idx_text_hash` (`text_hash`),
  KEY `idx_engine_voice` (`engine`, `voice`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_username` (`username`),
  KEY `idx_task_id` (`task_id`),
  CONSTRAINT `fk_tts_records_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 插入默认管理员用户 (密码: admin123)
INSERT INTO `users` (`username`, `password_hash`, `email`, `role`) 
VALUES ('admin', '$2a$10$mcPFQ2IEjAQXHYVWjmvC0eez5GkeaBAmspKc6tDZue0Em7ySzg5BO', 'admin@easyedgevoice.com', 'admin')
ON DUPLICATE KEY UPDATE `username` = `username`;

-- 显示初始化完成信息
SELECT 'EasyEdgeVoice 数据库初始化完成！' AS message;
SELECT '默认管理员账号: admin / admin123' AS admin_info;
