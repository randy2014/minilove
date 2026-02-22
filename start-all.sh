#!/bin/bash

echo "🚀 启动 MiniLove 项目..."
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查端口占用
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}✓${NC} $service 已运行在端口 $port"
        return 0
    else
        echo -e "${RED}✗${NC} $service 未运行在端口 $port"
        return 1
    fi
}

# 检查服务状态
check_service() {
    local url=$1
    local name=$2
    if curl -s --head --request GET "$url" | grep "200 OK" > /dev/null; then
        echo -e "${GREEN}✓${NC} $name 服务正常"
        return 0
    else
        echo -e "${RED}✗${NC} $name 服务异常"
        return 1
    fi
}

# 显示服务信息
show_info() {
    echo -e "\n${BLUE}📊 MiniLove 项目信息${NC}"
    echo "========================================"
    echo -e "${YELLOW}后端API服务${NC}"
    echo "  URL: http://localhost:3000"
    echo "  健康检查: http://localhost:3000/health"
    echo "  API文档: http://localhost:3000/api-docs"
    echo ""
    echo -e "${YELLOW}测试账户${NC}"
    echo "  免费会员: test_user / test123"
    echo "  高级会员: premium_user / test123"
    echo ""
    echo -e "${YELLOW}前端演示${NC}"
    echo "  演示页面: frontend-simple/index.html"
    echo "  建议使用现代浏览器打开"
    echo ""
    echo -e "${YELLOW}GitHub仓库${NC}"
    echo "  https://github.com/randy2014/minilove"
    echo "========================================"
}

# 菜单选项
show_menu() {
    echo -e "\n${BLUE}🔧 操作菜单${NC}"
    echo "========================================"
    echo "1. 启动后端API服务"
    echo "2. 检查服务状态"
    echo "3. 测试API连接"
    echo "4. 查看API文档"
    echo "5. 打开前端演示"
    echo "6. 部署Docker环境"
    echo "7. 停止所有服务"
    echo "8. 退出"
    echo "========================================"
    echo -n "请选择操作 (1-8): "
}

# 启动后端服务
start_backend() {
    echo -e "\n${YELLOW}启动后端API服务...${NC}"
    cd backend
    if [ ! -f "src/simple-app.js" ]; then
        echo -e "${RED}错误: 找不到后端应用文件${NC}"
        return 1
    fi
    
    # 检查是否已运行
    if check_port 3000 "后端API服务"; then
        echo -e "${YELLOW}服务已在运行，跳过启动${NC}"
        return 0
    fi
    
    # 在后台启动服务
    node src/simple-app.js &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    
    # 等待服务启动
    echo -n "等待服务启动"
    for i in {1..10}; do
        if check_port 3000 "后端API服务"; then
            echo -e "\n${GREEN}后端API服务启动成功！${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
    done
    
    echo -e "\n${RED}后端服务启动超时${NC}"
    return 1
}

# 测试API连接
test_api() {
    echo -e "\n${YELLOW}测试API连接...${NC}"
    
    # 测试健康检查
    echo -n "健康检查: "
    HEALTH=$(curl -s http://localhost:3000/health || echo "FAIL")
    if [ "$HEALTH" != "FAIL" ]; then
        echo -e "${GREEN}正常${NC}"
    else
        echo -e "${RED}失败${NC}"
    fi
    
    # 测试登录
    echo -n "登录API测试: "
    LOGIN_RESULT=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -d '{"username":"test_user","password":"test123"}' || echo "FAIL")
    
    if echo "$LOGIN_RESULT" | grep -q "token"; then
        echo -e "${GREEN}成功${NC}"
        echo "  返回token: $(echo $LOGIN_RESULT | grep -o '"token":"[^"]*' | cut -d'"' -f4 | head -c 20)..."
    else
        echo -e "${RED}失败${NC}"
        echo "  错误信息: $LOGIN_RESULT"
    fi
    
    # 测试获取帖子
    echo -n "获取帖子API: "
    POSTS=$(curl -s http://localhost:3000/api/v1/posts || echo "FAIL")
    if [ "$POSTS" != "FAIL" ] && echo "$POSTS" | grep -q "posts"; then
        echo -e "${GREEN}成功${NC}"
    else
        echo -e "${RED}失败${NC}"
    fi
}

# 停止服务
stop_services() {
    echo -e "\n${YELLOW}停止所有服务...${NC}"
    
    if [ -f "backend.pid" ]; then
        BACKEND_PID=$(cat backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID
            echo -e "${GREEN}✓ 后端服务已停止${NC}"
        fi
        rm -f backend.pid
    fi
    
    # 检查是否还有在运行的Node进程
    PIDS=$(lsof -ti:3000,8080 2>/dev/null)
    if [ ! -z "$PIDS" ]; then
        echo "$PIDS" | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✓ 清理端口占用${NC}"
    fi
    
    echo -e "${GREEN}所有服务已停止${NC}"
}

# 部署Docker
deploy_docker() {
    echo -e "\n${YELLOW}部署Docker环境...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: 未找到Docker${NC}"
        echo "请先安装Docker: https://docs.docker.com/get-docker/"
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}错误: 未找到docker-compose${NC}"
        echo "请先安装docker-compose: https://docs.docker.com/compose/install/"
        return 1
    fi
    
    echo "1. 使用开发环境 (包含热重载)"
    echo "2. 使用生产环境 (优化配置)"
    echo -n "请选择环境 (1-2): "
    read choice
    
    case $choice in
        1)
            echo "启动开发环境..."
            docker-compose -f docker-compose.yml up -d
            ;;
        2)
            echo "启动生产环境..."
            docker-compose -f deployment/docker-compose.prod.yml up -d
            ;;
        *)
            echo -e "${RED}无效选择${NC}"
            return 1
            ;;
    esac
    
    echo -e "\n${GREEN}Docker部署启动中...${NC}"
    echo "使用以下命令查看日志:"
    echo "  docker-compose logs -f"
    echo ""
    echo "使用以下命令停止:"
    echo "  docker-compose down"
}

# 主函数
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}    MiniLove 项目启动脚本              ${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    # 检查当前目录
    if [ ! -f "PROJECT_STATUS.md" ]; then
        echo -e "${RED}错误: 请在MiniLove项目根目录运行此脚本${NC}"
        exit 1
    fi
    
    # 显示初始信息
    show_info
    
    while true; do
        show_menu
        read choice
        
        case $choice in
            1)
                start_backend
                ;;
            2)
                echo -e "\n${YELLOW}检查服务状态...${NC}"
                check_port 3000 "后端API服务"
                check_service "http://localhost:3000/health" "后端健康检查"
                ;;
            3)
                test_api
                ;;
            4)
                echo -e "\n${YELLOW}打开API文档...${NC}"
                if check_port 3000 "后端API服务"; then
                    echo "API文档地址: http://localhost:3000/api-docs"
                    echo "正在尝试打开..."
                    if command -v xdg-open &> /dev/null; then
                        xdg-open "http://localhost:3000/api-docs"
                    elif command -v open &> /dev/null; then
                        open "http://localhost:3000/api-docs"
                    else
                        echo "请手动访问: http://localhost:3000/api-docs"
                    fi
                else
                    echo -e "${RED}后端服务未运行${NC}"
                fi
                ;;
            5)
                echo -e "\n${YELLOW}打开前端演示...${NC}"
                if [ -f "frontend-simple/index.html" ]; then
                    echo "演示文件: frontend-simple/index.html"
                    echo "正在尝试打开..."
                    if command -v xdg-open &> /dev/null; then
                        xdg-open "frontend-simple/index.html"
                    elif command -v open &> /dev/null; then
                        open "frontend-simple/index.html"
                    else
                        echo "请手动打开: frontend-simple/index.html"
                    fi
                else
                    echo -e "${RED}前端演示文件不存在${NC}"
                fi
                ;;
            6)
                deploy_docker
                ;;
            7)
                stop_services
                ;;
            8)
                echo -e "\n${GREEN}再见！${NC}"
                stop_services
                exit 0
                ;;
            *)
                echo -e "${RED}无效选择，请重新输入${NC}"
                ;;
        esac
        
        echo ""
        echo "按回车键继续..."
        read
    done
}

# 运行主函数
main