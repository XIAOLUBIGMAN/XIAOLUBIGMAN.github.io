#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 显示标题
show_title() {
    clear
    echo -e "${CYAN}"
    echo "  ___  ___  ___  _____  ___  _   _ "
    echo " | _ \/ __|/ __|_   _|/ __|| | | |"
    echo " |  _/\__ \\__ \ | |  \__ \| |_| |"
    echo " |_|  |___/|___/ |_|  |___/ \___/ "
    echo -e "${NC}"
    echo -e "${BLUE}=======================================${NC}"
}

# 显示菜单
show_menu() {
    show_title
    echo -e "${GREEN}        端口管理工具${NC}"
    echo -e "${BLUE}=======================================${NC}"
    echo -e " ${YELLOW}1${NC}) 交互式关闭（推荐）"
    echo -e "     ${GREEN}›${NC} 逐步确认关闭的端口"
    echo -e ""
    echo -e " ${YELLOW}2${NC}) 自动关闭所有占用端口"
    echo -e "     ${GREEN}›${NC} 强制关闭所有相关端口"
    echo -e ""
    echo -e " ${YELLOW}3${NC}) 仅查看端口状态"
    echo -e "     ${GREEN}›${NC} 查看端口占用情况"
    echo -e ""
    echo -e " ${YELLOW}4${NC}) 快速关闭"
    echo -e "     ${GREEN}›${NC} 使用快速关闭脚本"
    echo -e ""
    echo -e " ${YELLOW}5${NC}) 显示帮助信息"
    echo -e " ${YELLOW}6${NC}) 退出程序"
    echo -e "${BLUE}=======================================${NC}"
    echo -n -e "${CYAN}请输入选项 [1-6]: ${NC}"
}

# 检查Node.js是否可用
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: 未找到Node.js${NC}"
        echo "请确保Node.js已安装并添加到PATH"
        return 1
    fi
    return 0
}

# 检查文件是否存在
check_file() {
    if [ ! -f "$1" ]; then
        echo -e "${RED}错误: 文件 '$1' 不存在${NC}"
        echo "请确保脚本文件在当前目录"
        return 1
    fi
    return 0
}

# 执行命令
execute_command() {
    case $1 in
        1)
            echo -e "${GREEN}[1] 正在执行交互式关闭...${NC}"
            echo -e "${YELLOW}提示: 这将逐步询问要关闭的端口${NC}"
            echo -e "${BLUE}---------------------------------------${NC}"
            if check_node && check_file "stop.js"; then
                node stop.js
            fi
            ;;
        2)
            echo -e "${GREEN}[2] 正在自动关闭所有占用端口...${NC}"
            echo -e "${YELLOW}警告: 这将强制关闭所有相关端口${NC}"
            echo -e "${BLUE}---------------------------------------${NC}"
            if check_node && check_file "stop.js"; then
                node stop.js --all
            fi
            ;;
        3)
            echo -e "${GREEN}[3] 正在查看端口状态...${NC}"
            echo -e "${BLUE}---------------------------------------${NC}"
            if check_node && check_file "stop.js"; then
                node stop.js --status
            fi
            ;;
        4)
            echo -e "${GREEN}[4] 正在执行快速关闭...${NC}"
            echo -e "${BLUE}---------------------------------------${NC}"
            if check_node && check_file "quick-stop.js"; then
                node quick-stop.js
            fi
            ;;
        5)
            show_help
            ;;
        6)
            echo -e "${BLUE}感谢使用，再见！${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}错误: 无效选项 '$1'${NC}"
            echo -e "请输入 1-6 之间的数字"
            return 1
            ;;
    esac
}

# 显示帮助信息
show_help() {
    clear
    show_title
    echo -e "${GREEN}             帮助信息${NC}"
    echo -e "${BLUE}=======================================${NC}"
    echo -e "${YELLOW}选项说明:${NC}"
    echo -e "  ${GREEN}1${NC} 交互式关闭 - 逐步确认关闭，避免误操作"
    echo -e "  ${GREEN}2${NC} 自动关闭   - 强制关闭所有占用端口"
    echo -e "  ${GREEN}3${NC} 查看状态   - 仅查看端口占用情况"
    echo -e "  ${GREEN}4${NC} 快速关闭   - 使用快速关闭脚本"
    echo -e "  ${GREEN}5${NC} 帮助信息   - 显示此帮助信息"
    echo -e "  ${GREEN}6${NC} 退出程序   - 退出此工具"
    echo -e ""
    echo -e "${YELLOW}文件要求:${NC}"
    echo -e "  • stop.js       - 主关闭脚本"
    echo -e "  • quick-stop.js - 快速关闭脚本"
    echo -e ""
    echo -e "${YELLOW}运行要求:${NC}"
    echo -e "  • Node.js 需要已安装"
    echo -e "  • 脚本文件需要在当前目录"
    echo -e "${BLUE}=======================================${NC}"
    echo -n -e "${CYAN}按回车键返回主菜单...${NC}"
    read
}

# 主程序
main() {
    # 检查是否在终端中运行
    if [ ! -t 0 ]; then
        echo -e "${RED}错误: 请在终端中运行此脚本${NC}"
        exit 1
    fi

    # 捕获Ctrl+C
    trap 'echo -e "\n${BLUE}操作已取消${NC}"; exit 1' INT

    while true; do
        show_menu
        read -r choice
        
        # 检查输入是否为空
        if [ -z "$choice" ]; then
            echo -e "${RED}错误: 请输入选项${NC}"
            sleep 1
            continue
        fi
        
        # 执行命令
        execute_command "$choice"
        
        # 如果不是帮助或退出，询问是否继续
        if [[ "$choice" != "5" && "$choice" != "6" ]]; then
            echo -e "${BLUE}---------------------------------------${NC}"
            echo -n -e "${CYAN}是否继续操作？[Y/n]: ${NC}"
            read -r continue_choice
            
            case $continue_choice in
                [Nn]*)
                    echo -e "${BLUE}感谢使用，再见！${NC}"
                    exit 0
                    ;;
                *)
                    continue
                    ;;
            esac
        fi
    done
}

# 运行主程序
main