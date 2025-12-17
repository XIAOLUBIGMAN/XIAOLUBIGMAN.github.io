#!/usr/bin/env node

/**
 * 导航系统关闭程序
 * 用于关闭占用端口的网站服务
 */

const { exec, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PLATFORM = os.platform();
const PORTS = [3000, 3001, 3002, 3003, 8080]; // 可能使用的端口

// 创建命令行界面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
╔══════════════════════════════════════════╗
║        导航系统关闭程序 v1.0            ║
║                                          ║
║  用于关闭导航系统占用的端口和进程        ║
╚══════════════════════════════════════════╝
`);

// 获取占用端口的进程信息
async function getPortProcesses(port) {
  return new Promise((resolve) => {
    if (PLATFORM === 'win32') {
      // Windows系统
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (error || !stdout) {
          resolve([]);
          return;
        }
        
        const processes = [];
        const lines = stdout.trim().split('\n');
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[parts.length - 1];
            const protocol = parts[0];
            const address = parts[1];
            
            if (pid && pid !== '0') {
              processes.push({
                pid: parseInt(pid),
                port: port,
                protocol: protocol,
                address: address
              });
            }
          }
        });
        
        resolve(processes);
      });
    } else {
      // macOS/Linux系统
      exec(`lsof -ti:${port} -sTCP:LISTEN`, (error, stdout) => {
        if (error || !stdout) {
          resolve([]);
          return;
        }
        
        const pids = stdout.trim().split('\n').filter(pid => pid);
        const processes = pids.map(pid => ({
          pid: parseInt(pid),
          port: port,
          protocol: 'TCP',
          address: `0.0.0.0:${port}`
        }));
        
        resolve(processes);
      });
    }
  });
}

// 获取进程详细信息
async function getProcessInfo(pid) {
  return new Promise((resolve) => {
    if (PLATFORM === 'win32') {
      exec(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, (error, stdout) => {
        if (error || !stdout || stdout.includes('信息: 没有运行的任务匹配')) {
          resolve({ pid, name: '未知进程', memory: '未知' });
          return;
        }
        
        const match = stdout.match(/"([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]+)"/);
        if (match) {
          resolve({
            pid: pid,
            name: match[1],
            session: match[2],
            sessionNum: match[3],
            memory: match[4],
            status: match[5]
          });
        } else {
          resolve({ pid, name: '未知进程', memory: '未知' });
        }
      });
    } else {
      exec(`ps -p ${pid} -o comm=`, (error, stdout) => {
        if (error || !stdout) {
          resolve({ pid, name: '未知进程' });
          return;
        }
        
        const name = stdout.trim();
        // 获取内存使用情况
        exec(`ps -p ${pid} -o rss=`, (error2, stdout2) => {
          const memory = stdout2 ? `${Math.round(parseInt(stdout2.trim()) / 1024)}MB` : '未知';
          resolve({ pid, name, memory });
        });
      });
    }
  });
}

// 终止进程
async function killProcess(pid) {
  return new Promise((resolve) => {
    console.log(`  正在终止进程 ${pid}...`);
    
    if (PLATFORM === 'win32') {
      exec(`taskkill /PID ${pid} /F /T`, (error) => {
        if (error) {
          console.log(`  ❌ 终止进程 ${pid} 失败`);
          resolve(false);
        } else {
          console.log(`  ✅ 已终止进程 ${pid}`);
          resolve(true);
        }
      });
    } else {
      exec(`kill -9 ${pid}`, (error) => {
        if (error) {
          console.log(`  ❌ 终止进程 ${pid} 失败`);
          resolve(false);
        } else {
          console.log(`  ✅ 已终止进程 ${pid}`);
          resolve(true);
        }
      });
    }
  });
}

// 显示端口占用情况
async function showPortStatus() {
  console.log('\n📊 正在检查端口占用情况...\n');
  
  let allProcesses = [];
  
  // 检查所有可能的端口
  for (const port of PORTS) {
    const processes = await getPortProcesses(port);
    if (processes.length > 0) {
      console.log(`端口 ${port} 被以下进程占用：`);
      
      for (const proc of processes) {
        const info = await getProcessInfo(proc.pid);
        console.log(`  🔸 PID: ${proc.pid}`);
        console.log(`     进程名: ${info.name}`);
        console.log(`     内存: ${info.memory}`);
        console.log(`     协议: ${proc.protocol}`);
        console.log(`     地址: ${proc.address}\n`);
        
        allProcesses.push({
          ...proc,
          ...info
        });
      }
    } else {
      console.log(`端口 ${port} 未被占用 ✓\n`);
    }
  }
  
  return allProcesses;
}

// 清理所有占用端口的进程
async function cleanAllPorts() {
  console.log('\n🧹 正在清理所有占用端口的进程...\n');
  
  let killedCount = 0;
  
  for (const port of PORTS) {
    const processes = await getPortProcesses(port);
    
    if (processes.length > 0) {
      console.log(`清理端口 ${port}:`);
      
      for (const proc of processes) {
        const info = await getProcessInfo(proc.pid);
        console.log(`  🔸 正在终止 ${info.name} (PID: ${proc.pid})`);
        
        const success = await killProcess(proc.pid);
        if (success) killedCount++;
      }
    }
  }
  
  console.log(`\n✅ 清理完成！共终止了 ${killedCount} 个进程。`);
}

// 选择性清理
async function selectiveClean() {
  const allProcesses = await showPortStatus();
  
  if (allProcesses.length === 0) {
    console.log('✅ 没有发现需要清理的进程！');
    rl.close();
    return;
  }
  
  rl.question('\n请选择操作：\n1. 清理所有进程\n2. 清理指定端口的进程\n3. 退出\n\n请输入选项 (1-3): ', async (answer) => {
    switch (answer.trim()) {
      case '1':
        await cleanAllPorts();
        rl.close();
        break;
        
      case '2':
        rl.question('\n请输入要清理的端口号（多个端口用逗号分隔，如: 3000,3001）: ', async (portsInput) => {
          const ports = portsInput.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
          
          if (ports.length === 0) {
            console.log('❌ 没有输入有效的端口号！');
            rl.close();
            return;
          }
          
          console.log(`\n正在清理端口: ${ports.join(', ')}`);
          let killedCount = 0;
          
          for (const port of ports) {
            const processes = await getPortProcesses(port);
            
            if (processes.length > 0) {
              console.log(`\n清理端口 ${port}:`);
              
              for (const proc of processes) {
                const info = await getProcessInfo(proc.pid);
                console.log(`  🔸 正在终止 ${info.name} (PID: ${proc.pid})`);
                
                const success = await killProcess(proc.pid);
                if (success) killedCount++;
              }
            } else {
              console.log(`\n端口 ${port} 未被占用，跳过清理。`);
            }
          }
          
          console.log(`\n✅ 清理完成！共终止了 ${killedCount} 个进程。`);
          rl.close();
        });
        break;
        
      case '3':
        console.log('👋 退出程序');
        rl.close();
        break;
        
      default:
        console.log('❌ 无效的选项，请重新运行程序。');
        rl.close();
        break;
    }
  });
}

// 主函数
async function main() {
  // 检查命令行参数
  const args = process.argv.slice(2);
  
  if (args.includes('--all') || args.includes('-a')) {
    // 自动清理所有
    await cleanAllPorts();
  } else if (args.includes('--status') || args.includes('-s')) {
    // 仅显示状态
    await showPortStatus();
    rl.close();
  } else if (args.includes('--help') || args.includes('-h')) {
    // 显示帮助
    showHelp();
    rl.close();
  } else {
    // 交互模式
    await selectiveClean();
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
使用方法:
  node stop.js [选项]

选项:
  -a, --all     自动清理所有占用端口的进程
  -s, --status  仅显示端口占用状态，不进行清理
  -h, --help    显示此帮助信息

示例:
  node stop.js                # 交互式清理
  node stop.js --all          # 自动清理所有
  node stop.js --status       # 仅查看状态
  
支持的端口: ${PORTS.join(', ')}
  `);
}

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n👋 程序被用户中断，退出...');
  rl.close();
  process.exit(0);
});

// 启动程序
main().catch(error => {
  console.error('❌ 程序运行出错:', error);
  rl.close();
  process.exit(1);
});