const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保数据文件存在
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'navigation.json');

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 静态文件服务（Vercel 可能会自动处理）
app.use(express.static('public'));

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
  
  // 检查数据文件是否存在，如果不存在则创建默认数据
  try {
    await fs.access(DATA_FILE);
  } catch {
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
    await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
  }
}

// 读取导航数据
async function readNavigationData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// 保存导航数据
async function saveNavigationData(data) {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// API: 获取所有导航项
app.get('/api/navigation', async (req, res) => {
  try {
    const data = await readNavigationData();
    res.json(data);
  } catch (error) {
    console.error('读取数据失败:', error);
    res.status(500).json({ error: '读取数据失败' });
  }
});

// API: 添加导航项
app.post('/api/navigation', async (req, res) => {
  try {
    const data = await readNavigationData();
    const newItem = {
      id: Date.now(),
      ...req.body
    };
    
    data.push(newItem);
    await saveNavigationData(data);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('保存数据失败:', error);
    res.status(500).json({ error: '保存数据失败' });
  }
});

// API: 更新导航项
app.put('/api/navigation/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = await readNavigationData();
    const index = data.findIndex(item => item.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    data[index] = { ...data[index], ...req.body };
    await saveNavigationData(data);
    res.json(data[index]);
  } catch (error) {
    console.error('更新数据失败:', error);
    res.status(500).json({ error: '更新数据失败' });
  }
});

// API: 删除导航项
app.delete('/api/navigation/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let data = await readNavigationData();
    const initialLength = data.length;
    
    data = data.filter(item => item.id !== id);
    
    if (data.length === initialLength) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    await saveNavigationData(data);
    res.json({ success: true });
  } catch (error) {
    console.error('删除数据失败:', error);
    res.status(500).json({ error: '删除数据失败' });
  }
});

// 处理所有其他路由，返回前端页面
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 初始化并启动服务器
async function startServer() {
  await ensureDataDir();
  
  if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  }
}

startServer();

// 导出 app 供 Vercel 使用
module.exports = app;