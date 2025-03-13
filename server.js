// 导入必要的模块
const express = require('express');
const path = require('path');
const fs = require('fs');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// API路由：获取单词数据
app.get('/api/words', (req, res) => {
  const chapter = req.query.chapter || 'all';
  
  try {
    // 读取JSON数据文件
    const rawData = fs.readFileSync(path.join(__dirname, 'data', 'words.json'));
    const wordsData = JSON.parse(rawData);
    
    if (chapter === 'all') {
      // 返回所有章节
      res.json(wordsData);
    } else if (wordsData[chapter]) {
      // 返回特定章节
      res.json({ [chapter]: wordsData[chapter] });
    } else {
      res.status(404).json({ error: '未找到指定章节' });
    }
  } catch (error) {
    console.error('读取单词数据出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// API路由：获取可用章节
app.get('/api/chapters', (req, res) => {
  try {
    const rawData = fs.readFileSync(path.join(__dirname, 'data', 'words.json'));
    const wordsData = JSON.parse(rawData);
    
    const chapters = Object.keys(wordsData);
    res.json({ chapters });
  } catch (error) {
    console.error('读取章节数据出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器已启动，正在监听端口 ${PORT}`);
  console.log(`请访问: http://localhost:${PORT}`);
});