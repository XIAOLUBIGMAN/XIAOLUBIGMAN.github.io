const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');

const app = express();
const PORT = process.env.PORT || config.port;

// 内存中的会话存储（简单实现）
const sessions = {};

// 简单的会话管理
function createSession() {
  const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  sessions[sessionId] = {
    loggedIn: true,
    createdAt: Date.now()
  };
  
  // 清理过期会话
  cleanupSessions();
  
  return sessionId;
}

function validateSession(sessionId) {
  const session = sessions[sessionId];
  if (!session) return false;
  
  // 检查是否过期（30分钟）
  const isExpired = Date.now() - session.createdAt > config.sessionTimeout * 60 * 1000;
  if (isExpired) {
    delete sessions[sessionId];
    return false;
  }
  
  return session.loggedIn;
}

function cleanupSessions() {
  const now = Date.now();
  for (const [sessionId, session] of Object.entries(sessions)) {
    if (now - session.createdAt > config.sessionTimeout * 60 * 1000) {
      delete sessions[sessionId];
    }
  }
}

// 中间件
app.use(express.json()); // 内置的JSON解析，无需body-parser
app.use(express.static('public')); // 静态文件服务

// 文件路径
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'navigation.json');

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // 如果数据文件不存在，创建默认数据
  if (!fs.existsSync(DATA_FILE)) {
    const defaultData = [
      {
        "id": 1,
        "name": "Google",
        "url": "https://google.com",
        "icon": "🔍",
        "category": "搜索"
      },
      {
        "id": 2,
        "name": "GitHub",
        "url": "https://github.com",
        "icon": "🐙",
        "category": "开发"
      },
      {
        "id": 3,
        "name": "知乎",
        "url": "https://zhihu.com",
        "icon": "📚",
        "category": "学习"
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
  }
}

// 读取导航数据
function readNavigationData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// 保存导航数据
function saveNavigationData(data) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 认证中间件
function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  
  if (validateSession(sessionId)) {
    next();
  } else {
    res.status(401).json({ error: '未授权，请先登录' });
  }
}

// 登录API
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  if (password === config.adminPassword) {
    const sessionId = createSession();
    res.json({ 
      success: true, 
      sessionId,
      message: '登录成功'
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: '密码错误' 
    });
  }
});

// 登出API
app.post('/api/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId && sessions[sessionId]) {
    delete sessions[sessionId];
  }
  res.json({ success: true, message: '已登出' });
});

// 检查登录状态
app.get('/api/check-auth', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const isValid = validateSession(sessionId);
  res.json({ loggedIn: isValid });
});

// API: 获取所有导航项（公开）
app.get('/api/navigation', (req, res) => {
  try {
    const data = readNavigationData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '读取数据失败' });
  }
});

// API: 获取分类列表（公开）
app.get('/api/categories', (req, res) => {
  try {
    const data = readNavigationData();
    const categories = [...new Set(data.map(item => item.category))];
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: '读取数据失败' });
  }
});

// 以下API需要认证
app.post('/api/navigation', requireAuth, (req, res) => {
  try {
    const data = readNavigationData();
    const newItem = {
      id: Date.now(),
      ...req.body
    };
    
    data.push(newItem);
    saveNavigationData(data);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: '保存数据失败' });
  }
});

app.put('/api/navigation/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = readNavigationData();
    const index = data.findIndex(item => item.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    data[index] = { ...data[index], ...req.body };
    saveNavigationData(data);
    res.json(data[index]);
  } catch (error) {
    res.status(500).json({ error: '更新数据失败' });
  }
});

app.delete('/api/navigation/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let data = readNavigationData();
    const initialLength = data.length;
    
    data = data.filter(item => item.id !== id);
    
    if (data.length === initialLength) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    saveNavigationData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除数据失败' });
  }
});

// 默认路由 - 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
function startServer() {
  ensureDataDir();
  
  app.listen(PORT, () => {
    console.log(`导航系统已启动`);
    console.log(`首页: http://localhost:${PORT}`);
    console.log(`后台登录: http://localhost:${PORT}/login.html`);
    console.log(`后台密码: ${config.adminPassword}`);
    console.log(`数据文件: ${DATA_FILE}`);
  });
}

startServer();