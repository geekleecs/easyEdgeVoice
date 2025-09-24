#!/bin/bash

echo "正在安装FFmpeg..."

# 检查是否已安装FFmpeg
if command -v ffmpeg &> /dev/null; then
    echo "FFmpeg已经安装并可用"
    ffmpeg -version
    exit 0
fi

echo "FFmpeg未找到，正在安装..."

# 检测操作系统
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux系统
    if command -v apt-get &> /dev/null; then
        echo "使用apt-get安装FFmpeg..."
        sudo apt-get update
        sudo apt-get install -y ffmpeg
    elif command -v yum &> /dev/null; then
        echo "使用yum安装FFmpeg..."
        sudo yum install -y ffmpeg
    elif command -v dnf &> /dev/null; then
        echo "使用dnf安装FFmpeg..."
        sudo dnf install -y ffmpeg
    else
        echo "未找到支持的包管理器，请手动安装FFmpeg"
        exit 1
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS系统
    if command -v brew &> /dev/null; then
        echo "使用Homebrew安装FFmpeg..."
        brew install ffmpeg
    else
        echo "请先安装Homebrew，然后运行: brew install ffmpeg"
        exit 1
    fi
else
    echo "不支持的操作系统，请手动安装FFmpeg"
    exit 1
fi

# 验证安装
if command -v ffmpeg &> /dev/null; then
    echo "FFmpeg安装成功！"
    ffmpeg -version
else
    echo "FFmpeg安装失败，请手动安装"
    exit 1
fi


