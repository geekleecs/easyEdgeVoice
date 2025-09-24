@echo off
echo 正在安装FFmpeg...

:: 检查是否已安装FFmpeg
ffmpeg -version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo FFmpeg已经安装并可用
    ffmpeg -version
    pause
    exit /b 0
)

echo FFmpeg未找到，正在安装...

:: 尝试使用winget安装
echo 尝试使用winget安装FFmpeg...
winget install ffmpeg
if %ERRORLEVEL% equ 0 (
    echo FFmpeg安装成功！
    echo 请重启命令行或重新启动应用程序以使用FFmpeg
    pause
    exit /b 0
)

:: 如果winget失败，尝试使用chocolatey
echo 尝试使用chocolatey安装FFmpeg...
choco install ffmpeg -y
if %ERRORLEVEL% equ 0 (
    echo FFmpeg安装成功！
    echo 请重启命令行或重新启动应用程序以使用FFmpeg
    pause
    exit /b 0
)

echo 自动安装失败，请手动安装FFmpeg：
echo 1. 访问 https://ffmpeg.org/download.html
echo 2. 下载Windows版本的FFmpeg
echo 3. 解压到 C:\ffmpeg\
echo 4. 将 C:\ffmpeg\bin 添加到系统PATH环境变量
echo 5. 重启命令行

pause
