// 数据处理模块

// 全局变量，存储所有单词数据
let excelData = {};

// 加载单词数据（从服务器获取）
async function loadWordsData() {
    try {
        // 显示加载动画
        showLoading('正在加载数据...');
        
        // 从服务器获取所有单词数据
        const response = await fetch('/api/words');
        
        if (!response.ok) {
            throw new Error(`服务器响应错误: ${response.status}`);
        }
        
        // 解析JSON响应
        excelData = await response.json();
        
        console.log("单词数据加载成功!", excelData);
        
        // 更新章节选择器
        updateChapterSelector();
        
        // 隐藏加载动画
        hideLoading();
        
        return true;
    } catch (error) {
        console.error("单词数据加载失败:", error);
        
        // 如果从服务器加载失败，使用备用示例数据
        setupFallbackData();
        
        // 隐藏加载动画
        hideLoading();
        
        // 显示错误提示
        showErrorToast('无法从服务器加载数据，使用备用数据');
        
        return false;
    }
}

// 获取可用章节
async function getAvailableChapters() {
    try {
        const response = await fetch('/api/chapters');
        
        if (!response.ok) {
            throw new Error(`服务器响应错误: ${response.status}`);
        }
        
        const data = await response.json();
        return data.chapters || [];
    } catch (error) {
        console.error("获取章节列表失败:", error);
        return Object.keys(excelData);
    }
}

// 按章节获取单词数据
function loadWordsByChapter(chapter) {
    if (!excelData || !excelData[chapter] || excelData[chapter].length === 0) {
        showErrorToast('没有找到该章节的数据');
        return false;
    }
    
    wordPairs = [...excelData[chapter]];
    
    if (wordPairs.length < 2) {
        showErrorToast('该章节单词数量不足，请选择其他章节或数据源');
        return false;
    }
    
    // 打乱顺序
    wordPairs = shuffle(wordPairs);
    
    // 根据游戏板大小限制单词对数量
    const maxPairs = Math.floor((boardSize * boardSize) / 2);
    
    if (wordPairs.length > maxPairs) {
        wordPairs = wordPairs.slice(0, maxPairs);
    }
    
    return true;
}

// 随机获取单词数据
function loadRandomWords(count) {
    // 合并所有章节的数据
    let allWords = [];
    
    Object.values(excelData).forEach(chapterWords => {
        allWords = allWords.concat(chapterWords);
    });
    
    if (allWords.length === 0) {
        showErrorToast('没有找到单词数据');
        return false;
    }
    
    // 随机选择单词
    const shuffled = shuffle([...allWords]);
    wordPairs = shuffled.slice(0, Math.min(count, shuffled.length));
    
    if (wordPairs.length < 2) {
        showErrorToast('获取的单词数量不足，请调整数量或选择其他数据源');
        return false;
    }
    
    // 根据游戏板大小限制单词对数量
    const maxPairs = Math.floor((boardSize * boardSize) / 2);
    
    if (wordPairs.length > maxPairs) {
        wordPairs = wordPairs.slice(0, maxPairs);
    }
    
    return true;
}

// 解析自定义输入
function parseCustomInput(text) {
    const lines = text.trim().split('\n');
    const pairs = [];
    
    lines.forEach(line => {
        if (!line.trim()) return;
        
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
            const word = parts[0].trim();
            const definition = parts.slice(1).join(' ').trim();
            if (word && definition) {
                pairs.push({ word, definition });
            }
        }
    });
    
    return pairs;
}

// 处理Excel上传
// 注意：这是为了保留原先Excel处理的功能，但现在我们主要从JSON加载数据
function handleExcelUpload(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('未选择文件'));
            return;
        }
        
        showLoading('正在解析Excel...');
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {
                    type: 'array',
                    cellDates: true,
                    cellNF: true,
                    cellText: true
                });
                
                // 清空现有数据
                const uploadedData = {};
                
                // 处理每个工作表
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet);
                    
                    if (json.length === 0) {
                        console.warn(`工作表 ${sheetName} 没有数据，跳过`);
                        return;
                    }
                    
                    // 检查第一行数据的格式
                    const firstRow = json[0];
                    
                    // 找出表头列名
                    const wordColumnName = Object.keys(firstRow).find(key => 
                        key.toLowerCase().includes('单词') || key.toLowerCase().includes('word')
                    );
                    
                    const defColumnName = Object.keys(firstRow).find(key => 
                        key.toLowerCase().includes('定义') || key.toLowerCase().includes('definition') || 
                        key.toLowerCase().includes('def')
                    );
                    
                    if (!wordColumnName || !defColumnName) {
                        console.error(`工作表 ${sheetName} 缺少单词或定义列`);
                        return;
                    }
                    
                    // 提取单词和定义
                    const wordList = json.map(row => {
                        const word = (row[wordColumnName] || '').toString();
                        let definition = (row[defColumnName] || '').toString();
                        
                        // 处理HTML标签
                        definition = definition.replace(/<br>/g, ' ');
                        
                        return { word, definition };
                    }).filter(item => item.word && item.definition);
                    
                    if (wordList.length > 0) {
                        uploadedData[sheetName] = wordList;
                    }
                });
                
                // 检查是否成功解析了数据
                const totalSheets = Object.keys(uploadedData).length;
                if (totalSheets === 0) {
                    reject(new Error("未能从Excel中提取有效数据，请检查文件格式"));
                    return;
                }
                
                // 合并到全局数据
                excelData = {...excelData, ...uploadedData};
                
                // 更新章节选择器
                updateChapterSelector();
                
                hideLoading();
                showErrorToast(`成功加载了 ${totalSheets} 个工作表的单词数据!`, 3000);
                
                resolve(uploadedData);
                
            } catch (err) {
                console.error("Excel解析错误:", err);
                hideLoading();
                reject(err);
            }
        };
        
        reader.onerror = function() {
            hideLoading();
            reject(new Error("文件读取错误"));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// 设置备用数据（当加载失败时）
function setupFallbackData() {
    excelData = {
        "示例章节1": [
            { word: "abandon", definition: "放弃，抛弃" },
            { word: "achieve", definition: "实现，达成" },
            { word: "believe", definition: "相信，信任" },
            { word: "challenge", definition: "挑战，质疑" },
            { word: "develop", definition: "发展，开发" },
            { word: "enhance", definition: "提高，增强" },
            { word: "focus", definition: "集中，关注" },
            { word: "generate", definition: "产生，生成" }
        ],
        "示例章节2": [
            { word: "highlight", definition: "强调，突出" },
            { word: "improve", definition: "改进，提高" },
            { word: "journey", definition: "旅行，旅程" },
            { word: "knowledge", definition: "知识，学问" },
            { word: "language", definition: "语言，表达方式" },
            { word: "manage", definition: "管理，控制" },
            { word: "negotiate", definition: "谈判，协商" },
            { word: "observe", definition: "观察，遵守" }
        ]
    };
    
    updateChapterSelector();
}