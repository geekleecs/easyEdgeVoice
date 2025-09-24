#!/bin/bash

# EasyEdgeVoice 数据库初始化脚本
# 用于自动创建数据库和表结构

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 MySQL 是否可用
check_mysql() {
    if ! command -v mysql &> /dev/null; then
        print_error "MySQL 客户端未安装，请先安装 MySQL"
        exit 1
    fi
}

# 读取环境变量
read_env() {
    if [ -f ".env" ]; then
        source .env
    elif [ -f "packages/backend/.env" ]; then
        source packages/backend/.env
    fi
    
    # 设置默认值
    MYSQL_HOST=${MYSQL_HOST:-127.0.0.1}
    MYSQL_PORT=${MYSQL_PORT:-3306}
    MYSQL_USER=${MYSQL_USER:-root}
    MYSQL_DATABASE=${MYSQL_DATABASE:-easyedgevoice}
}

# 提示用户输入密码
get_password() {
    if [ -z "$MYSQL_PASSWORD" ]; then
        echo -n "请输入 MySQL 密码: "
        read -s MYSQL_PASSWORD
        echo
    fi
}

# 测试数据库连接
test_connection() {
    print_info "测试数据库连接..."
    if mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1;" &> /dev/null; then
        print_info "数据库连接成功"
    else
        print_error "数据库连接失败，请检查配置"
        exit 1
    fi
}

# 执行数据库初始化
init_database() {
    print_info "开始初始化数据库..."
    
    local sql_file="scripts/sql/init_database.sql"
    
    if [ ! -f "$sql_file" ]; then
        print_error "SQL 文件不存在: $sql_file"
        exit 1
    fi
    
    if mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" < "$sql_file"; then
        print_info "数据库初始化完成"
        print_info "默认管理员账号: admin / admin123"
    else
        print_error "数据库初始化失败"
        exit 1
    fi
}

# 主函数
main() {
    print_info "EasyEdgeVoice 数据库初始化脚本"
    echo
    
    check_mysql
    read_env
    get_password
    test_connection
    init_database
    
    print_info "初始化完成！"
}

# 运行主函数
main "$@"

