#!/bin/bash

# 导航系统初始化脚本 - 强制覆盖版本
# 用法：./init_repo.sh [GitHub用户名]

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在正确的目录
if [ ! -d "navigation-system" ]; then
    echo -e "${RED}错误：找不到 navigation-system 目录${NC}"
    echo "请在包含 navigation-system 目录的父目录中运行此脚本"
    exit 1
fi

# 进入项目目录
echo "进入项目目录..."
cd navigation-system

# 获取GitHub用户名
if [ $# -eq 1 ]; then
    GITHUB_USERNAME="$1"
else
    read -p "请输入您的GitHub用户名: " GITHUB_USERNAME
fi

# 检查用户名是否为空
if [ -z "$GITHUB_USERNAME" ]; then
    echo -e "${RED}错误：GitHub用户名不能为空${NC}"
    exit 1
fi

echo "使用GitHub用户名: $GITHUB_USERNAME"

# 检查本地是否已有git仓库
if [ -d ".git" ]; then
    echo -e "${YELLOW}检测到已有本地git仓库${NC}"
    echo -e "${YELLOW}1. 保留本地仓库历史${NC}"
    echo -e "${YELLOW}2. 删除并重新初始化本地仓库${NC}"
    read -p "请选择 (1/2): " LOCAL_CHOICE
    
    if [ "$LOCAL_CHOICE" = "2" ]; then
        echo "删除本地git仓库..."
        rm -rf .git
        git init
    fi
else
    echo "初始化Git仓库..."
    git init
fi

# 添加所有文件
echo "添加所有文件到暂存区..."
git add .

# 提交更改
echo "提交更改..."
git commit -m "初始提交：创建导航系统"

# 远程仓库URL
REMOTE_URL="https://github.com/${GITHUB_USERNAME}/navigation-system.git"

# 检查是否已存在远程仓库配置
if git remote | grep -q origin; then
    echo -e "${YELLOW}检测到已配置远程仓库${NC}"
    CURRENT_URL=$(git remote get-url origin)
    echo "当前远程仓库URL: $CURRENT_URL"
    echo "新远程仓库URL: $REMOTE_URL"
    
    if [ "$CURRENT_URL" != "$REMOTE_URL" ]; then
        echo "更新远程仓库URL..."
        git remote set-url origin "$REMOTE_URL"
    fi
else
    echo "添加远程仓库: $REMOTE_URL"
    git remote add origin "$REMOTE_URL"
fi

# 尝试推送到远程仓库
echo "尝试推送到远程仓库..."
echo -e "${YELLOW}注意：如果远程仓库已有内容，将会被覆盖！${NC}"

# 检查是否可以连接到远程仓库
if git ls-remote "$REMOTE_URL" &> /dev/null; then
    echo -e "${YELLOW}检测到远程仓库已存在${NC}"
    echo -e "${YELLOW}选择推送方式：${NC}"
    echo "1. 强制推送（覆盖远程所有内容）"
    echo "2. 先拉取再推送（可能产生合并冲突）"
    echo "3. 取消操作"
    
    read -p "请选择 (1/2/3): " PUSH_CHOICE
    
    case $PUSH_CHOICE in
        1)
            echo -e "${RED}警告：这将强制覆盖远程仓库的所有内容！${NC}"
            read -p "确认强制推送？(输入yes继续): " CONFIRM
            if [ "$CONFIRM" = "yes" ]; then
                git branch -M main
                git push -f -u origin main
                echo -e "${GREEN}强制推送完成！远程仓库已被覆盖。${NC}"
            else
                echo "操作已取消。"
                exit 0
            fi
            ;;
        2)
            echo "尝试先拉取远程内容..."
            git branch -M main
            # 尝试拉取，如果有冲突会失败
            if git pull origin main --allow-unrelated-histories; then
                git push -u origin main
                echo -e "${GREEN}推送完成！${NC}"
            else
                echo -e "${RED}拉取失败，可能存在冲突。${NC}"
                echo "请手动解决冲突后运行：git push -u origin main"
                exit 1
            fi
            ;;
        3)
            echo "操作已取消。"
            exit 0
            ;;
        *)
            echo -e "${RED}无效选择，操作已取消。${NC}"
            exit 1
            ;;
    esac
else
    echo "远程仓库不存在或无法访问，尝试创建新仓库..."
    echo -e "${YELLOW}请确保已在GitHub上创建了名为 navigation-system 的仓库${NC}"
    read -p "是否继续？(yes/no): " CONTINUE
    
    if [ "$CONTINUE" = "yes" ]; then
        git branch -M main
        git push -u origin main
        echo -e "${GREEN}推送完成！${NC}"
    else
        echo "操作已取消。"
        exit 0
    fi
fi

echo ""
echo -e "${GREEN}✅ 完成！${NC}"
echo "仓库地址: $REMOTE_URL"
echo ""
echo -e "${YELLOW}重要提醒：${NC}"
echo "1. 如果使用了强制推送，远程仓库的历史记录已被覆盖"
echo "2. 请确保你有权覆盖远程仓库"
echo "3. 如果与其他协作者共享此仓库，请提前通知他们"