// 默认示例数据
const SAMPLE_DATA = `请输入32对哦~~🎊
abandon    放弃，抛弃
achieve    实现，达成
believe    相信，信任
challenge    挑战，质疑
develop    发展，开发
enhance    提高，增强
focus    集中，关注
generate    产生，生成
highlight    强调，突出
improve    改进，提高
journey    旅行，旅程
knowledge    知识，学问
language    语言，表达方式
manage    管理，控制
negotiate    谈判，协商
observe    观察，遵守
perform    表演，执行
quality    质量，品质`;

// 预定义的Excel文件名
const EXCEL_FILE_NAME = "vocabulary.xlsx";

// 音效对象及音效文件路径
const soundFiles = {
    click: 'sounds/click.mp3',
    correct: 'sounds/correct.mp3',
    incorrect: 'sounds/incorrect.mp3',
    hint: 'sounds/hint.mp3',
    shuffle: 'sounds/shuffle.mp3',
    win: 'sounds/win.mp3',
    gameover: 'sounds/gameover.mp3'
};

// 音效对象
const sounds = {
    click: null,
    correct: null,
    incorrect: null,
    hint: null,
    shuffle: null,
    win: null,
    gameover: null
};

// 游戏状态变量
let wordPairs = [];
let timeLimit = 60;
let timer;
let matchedPairs = 0;
let score = 0;
let combo = 0;
let maxCombo = 0;
let boardSize = 8;
let difficulty = 'normal';
let boardMatrix = [];
let firstSelection = null;
let connectors = [];
let isGameOver = false;
let hintUsed = 0;
let shuffleCount = 0;
let soundEnabled = true;
let excelData = {}; // 存储Excel数据
let isLoading = false; // 添加加载状态标志
let pathCache = {}; // 路径缓存，用于优化性能

// DOM元素
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const wordInput = document.getElementById('word-input');
const difficultySelect = document.getElementById('difficulty');
const boardSizeSelect = document.getElementById('board-size');
const startBtn = document.getElementById('start-btn');
const sampleBtn = document.getElementById('sample-btn');
const hintBtn = document.getElementById('hint-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const restartBtn = document.getElementById('restart-btn');
const nextLevelBtn = document.getElementById('next-level-btn');
const backBtn = document.getElementById('back-btn');
const gameBoard = document.getElementById('game-board');
const resultModal = document.getElementById('result-modal');
const playAgainBtn = document.getElementById('play-again-btn');
const menuBtn = document.getElementById('menu-btn');
const themeSelector = document.getElementById('theme-selector');
const customBgUpload = document.getElementById('custom-bg-upload');
const bgUpload = document.getElementById('bg-upload');
const loadingOverlay = document.getElementById('loading-overlay');
const chapterSelect = document.getElementById('chapter-select');
const randomCount = document.getElementById('random-count');
const errorToast = document.getElementById('error-toast');
const helpModal = document.getElementById('help-modal');

// 显示元素
const timeDisplay = document.getElementById('time');
const scoreDisplay = document.getElementById('score');
const comboDisplay = document.getElementById('combo');
const matchedPairsDisplay = document.getElementById('matched-pairs');
const totalPairsDisplay = document.getElementById('total-pairs');
const progressFill = document.getElementById('progress-fill');
const finalScoreDisplay = document.getElementById('final-score');
const timeLeftDisplay = document.getElementById('time-left');
const maxComboDisplay = document.getElementById('max-combo');
const resultTitle = document.getElementById('result-title');
const star1 = document.getElementById('star1');
const star2 = document.getElementById('star2');
const star3 = document.getElementById('star3');

// 预填充示例数据
wordInput.value = SAMPLE_DATA;

// 添加事件监听
startBtn.addEventListener('click', startGame);
sampleBtn.addEventListener('click', useSampleData);
shuffleBtn.addEventListener('click', () => shuffleBoard(false));
restartBtn.addEventListener('click', resetGame);
hintBtn.addEventListener('click', showHint);
backBtn.addEventListener('click', goBack);
playAgainBtn.addEventListener('click', resetGame);
menuBtn.addEventListener('click', goBack);
nextLevelBtn.addEventListener('click', goToNextLevel);

// 添加Excel文件上传处理器 - 放在事件监听区域附近
document.getElementById('excel-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        // 显示加载动画
        loadingOverlay.classList.add('active');
        loadingOverlay.querySelector('.loading-text').textContent = '正在解析Excel...';
        
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
                
                console.log("上传的Excel文件包含以下工作表:", workbook.SheetNames);
                
                // 清空现有数据
                excelData = {};
                
                // 处理每个工作表
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet);
                    
                    console.log(`工作表 ${sheetName} 数据行数: ${json.length}`);
                    
                    if (json.length === 0) {
                        console.warn(`工作表 ${sheetName} 没有数据，跳过`);
                        return;
                    }
                    
                    // 检查第一行数据的格式
                    const firstRow = json[0];
                    console.log("第一行数据:", firstRow);
                    
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
                        showErrorToast(`工作表 ${sheetName} 格式错误: 未找到单词或定义列`);
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
                        excelData[sheetName] = wordList;
                    }
                });
                
                // 检查是否成功解析了数据
                const totalSheets = Object.keys(excelData).length;
                if (totalSheets === 0) {
                    throw new Error("未能从Excel中提取有效数据，请检查文件格式");
                }
                
                // 更新章节选择器
                updateChapterSelector();
                
                loadingOverlay.classList.remove('active');
                showErrorToast(`成功加载了 ${totalSheets} 个工作表的单词数据!`, 3000);
                
                // 切换到章节选择器
                document.querySelector('input[name="data-source"][value="chapter"]').checked = true;
                document.getElementById('upload-selector').style.display = 'none';
                document.getElementById('chapter-selector').style.display = 'block';
                
            } catch (err) {
                console.error("Excel解析错误:", err);
                loadingOverlay.classList.remove('active');
                showErrorToast('Excel文件解析失败: ' + err.message);
            }
        };
        
        reader.onerror = function() {
            console.error("文件读取错误");
            loadingOverlay.classList.remove('active');
            showErrorToast('文件读取错误，请重试');
        };
        
        // 读取文件
        reader.readAsArrayBuffer(file);
    }
});

// 添加用于更新章节选择器的函数 - 放在辅助函数区域
function updateChapterSelector() {
    chapterSelect.innerHTML = '';
    
    Object.keys(excelData).forEach(chapter => {
        const option = document.createElement('option');
        option.value = chapter;
        option.textContent = chapter;
        chapterSelect.appendChild(option);
    });
    
    // 自动选择第一个章节
    if (chapterSelect.options.length > 0) {
        chapterSelect.selectedIndex = 0;
    }
}

// 增强错误提示函数 - 替换现有的showErrorToast函数
function showErrorToast(message, duration = 3000, type = 'error') {
    errorToast.textContent = message;
    errorToast.classList.add('active');
    
    // 根据消息类型设置不同的样式
    if (type === 'error') {
        errorToast.style.backgroundColor = 'rgba(231, 76, 60, 0.9)';
    } else if (type === 'success') {
        errorToast.style.backgroundColor = 'rgba(46, 204, 113, 0.9)';
    } else if (type === 'warning') {
        errorToast.style.backgroundColor = 'rgba(243, 156, 18, 0.9)';
    }
    
    setTimeout(() => {
        errorToast.classList.remove('active');
    }, duration);
}

// 处理数据源选择 - 更新现有的事件监听器
document.querySelectorAll('input[name="data-source"]').forEach(radio => {
    radio.addEventListener('change', function() {
        // 隐藏所有选择器
        document.getElementById('chapter-selector').style.display = 'none';
        document.getElementById('random-selector').style.display = 'none';
        document.getElementById('custom-input').style.display = 'none';
        document.getElementById('upload-selector').style.display = 'none';
        
        // 显示选中的选择器
        if (this.value === 'chapter') {
            document.getElementById('chapter-selector').style.display = 'block';
        } else if (this.value === 'random') {
            document.getElementById('random-selector').style.display = 'block';
        } else if (this.value === 'custom') {
            document.getElementById('custom-input').style.display = 'block';
        } else if (this.value === 'upload') {
            document.getElementById('upload-selector').style.display = 'block';
        }
    });
});

// 主题选择事件监听
themeSelector.addEventListener('change', function() {
    const theme = this.value;
    
    // 重置所有主题相关的类名和背景
    document.body.className = '';
    document.body.style.background = '';
    
    if (theme === 'custom') {
        customBgUpload.style.display = 'block';
        
        // 如果已经有保存的自定义背景，则应用它
        try {
            const customBg = localStorage.getItem('custom-background');
            if (customBg) {
                document.body.style.background = `url(${customBg})`;
                document.body.classList.add('theme-custom');
            }
        } catch (e) {
            showErrorToast('背景图片加载失败，请重新上传较小的图片');
        }
    } else {
        customBgUpload.style.display = 'none';
        document.body.classList.add('theme-' + theme);
        
        // 保存用户选择的主题
        localStorage.setItem('preferred-theme', theme);
    }
});


// 处理自定义背景上传
bgUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        // // 检查文件大小 (限制为2MB)
        // if (file.size > 2 * 1024 * 1024) {
        //     showErrorToast('图片太大，请选择小于2MB的图片');
        //     return;
        // }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                document.body.style.background = `url(${e.target.result})`;
                document.body.classList.add('theme-custom');
                
                // 尝试保存自定义背景
                try {
                    localStorage.setItem('custom-background', e.target.result);
                } catch (error) {
                    console.warn('图片太大，无法保存到localStorage', error);
                    showErrorToast('图片已应用，但太大无法保存。下次重新加载页面需重新上传。');
                }
            } catch (error) {
                console.error('应用背景失败', error);
                showErrorToast('背景应用失败，请尝试其他图片');
            }
        }
        reader.readAsDataURL(file);
    }
});

// 添加键盘事件监听
function initKeyboardShortcuts() {
    // 添加全局键盘事件监听
    document.addEventListener('keydown', handleKeyPress);
}

// 键盘事件处理函数
function handleKeyPress(event) {
    // 只有在游戏进行中才处理键盘事件
    if (gameScreen.style.display === 'none' || isGameOver || isLoading) {
        return;
    }
    
    // 根据按键进行不同操作
    switch (event.key.toLowerCase()) {
        case 't': // T键 - 提示
            showHint();
            break;
        case ' ': // 空格键 - 洗牌
            shuffleBoard(false);
            break;
        case 'escape': // ESC键 - 返回
            goBack();
            break;
        case 'r': // R键 - 重新开始
            resetGame();
            break;
    }
}


// 初始化
window.addEventListener('DOMContentLoaded', (event) => {
    // 加载Excel数据
    loadExcelData();
    
    // 加载保存的主题
    try {
        const savedTheme = localStorage.getItem('preferred-theme');
        if (savedTheme) {
            themeSelector.value = savedTheme;
            document.body.classList.add('theme-' + savedTheme);
            
            if (savedTheme === 'custom') {
                customBgUpload.style.display = 'block';
                // 加载保存的自定义背景
                const customBg = localStorage.getItem('custom-background');
                if (customBg) {
                    document.body.style.background = `url(${customBg})`;
                }
            }
        }
    } catch (e) {
        console.warn('主题加载失败', e);
    }
    
    // 修改Excel加载完成后的回调
    const originalLoadExcelData = loadExcelData;
    loadExcelData = function() {
        originalLoadExcelData();
        // 在Excel加载完成后初始化关卡系统
        setTimeout(() => {
            initLevelSystem();
        }, 1000); // 给一点时间确保Excel加载完成
    };

    document.querySelector('.container').classList.add('fade-in');
    
    // 初始化音效
    initSounds();

    
    // 创建帮助按钮
    createHelpButton();

    // 初始化键盘快捷键
    initKeyboardShortcuts();
    
    // 关闭帮助按钮事件监听
    document.getElementById('close-help-btn').addEventListener('click', function() {
        helpModal.classList.remove('active');
    });
});

function updateHelpModalWithShortcuts() {
    // 找到帮助模态框内容
    const helpContent = document.querySelector('#help-modal .modal-content');
    
    // 添加快捷键说明区域
    const shortcutsSection = document.createElement('div');
    // shortcutsSection.innerHTML = `
    //     <h3>键盘快捷键</h3>
    //     <ul>
    //         <li><strong>T 键</strong>：显示提示</li>
    //         <li><strong>空格键</strong>：重新洗牌</li>
    //         <li><strong>R 键</strong>：重新开始游戏</li>
    //         <li><strong>ESC 键</strong>：返回菜单</li>
    //     </ul>
    // `;
    
    // 插入到关闭按钮之前
    const closeButton = helpContent.querySelector('#close-help-btn');
    helpContent.insertBefore(shortcutsSection, closeButton);
}





// 创建帮助按钮
function createHelpButton() {
    const helpBtn = document.createElement('button');
    helpBtn.className = 'btn help-btn';
    helpBtn.innerHTML = '?';
    helpBtn.title = "查看游戏规则";
    
    helpBtn.addEventListener('click', () => {
        helpModal.classList.add('active');
    });
    
    document.querySelector('.container').appendChild(helpBtn);
    // 更新帮助对话框，添加快捷键信息
    updateHelpModalWithShortcuts();
}

// 显示错误提示
function showErrorToast(message, duration = 3000) {
    errorToast.textContent = message;
    errorToast.classList.add('active');
    
    setTimeout(() => {
        errorToast.classList.remove('active');
    }, duration);
}

// 加载Excel数据
function loadExcelData() {
    // 显示加载动画
    loadingOverlay.classList.add('active');
    loadingOverlay.querySelector('.loading-text').textContent = '正在加载数据...';
    
    // 使用fetch获取本地Excel文件
    fetch(EXCEL_FILE_NAME)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch Excel file: ${response.status} ${response.statusText}`);
            }
            return response.arrayBuffer();
        })
        .then(data => {
            try {
                const workbook = XLSX.read(new Uint8Array(data), {type: 'array'});
                
                // 处理各章节数据
                excelData = {};
                
                // 假设每个sheet是一个章节
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet);
                    
                    // 假设Excel表格有"单词"和"定义"列
                    // 假设Excel表格有"单词"和"定义"列
                    const wordList = json.map(row => ({
                        word: row['单词'] || row['word'] || '',
                        definition: row['定义'] || row['definition'] || ''
                    })).filter(item => item.word && item.definition);

                    // 对定义中的HTML标记进行处理
                    wordList.forEach(item => {
                        // 将<br>替换为空格或其他分隔符
                        item.definition = item.definition.replace(/<br>/g, ' ');
                    });
                    
                    excelData[sheetName] = wordList;
                });
                
                // 更新章节选择器
                chapterSelect.innerHTML = '';
                
                Object.keys(excelData).forEach(chapter => {
                    const option = document.createElement('option');
                    option.value = chapter;
                    option.textContent = chapter;
                    chapterSelect.appendChild(option);
                });
                
                console.log("Excel数据加载成功!");
                loadingOverlay.classList.remove('active');
            } catch (err) {
                console.error("Excel解析错误:", err);
                // 如果Excel加载失败，使用内置示例数据
                setupFallbackData();
                loadingOverlay.classList.remove('active');
            }
        })
        .catch(error => {
            console.error("Excel加载错误:", error);
            // 如果Excel加载失败，使用内置示例数据
            setupFallbackData();
            loadingOverlay.classList.remove('active');
        });
        setTimeout(() => {
            initLevelSystem();
        }, 1000);
}

// 设置备用数据（当Excel文件不可用时）
function setupFallbackData() {
    // 创建一些示例章节数据
    excelData = {}
    
    // 更新章节选择器
    chapterSelect.innerHTML = '';
    
    Object.keys(excelData).forEach(chapter => {
        const option = document.createElement('option');
        option.value = chapter;
        option.textContent = chapter;
        chapterSelect.appendChild(option);
    });
}

// 初始化音效
function initSounds() {
  console.log("初始化本地音效...");
  
  // 预加载音效
  for (const [name, path] of Object.entries(soundFiles)) {
      sounds[name] = new Audio(path);
      
      // 添加加载失败事件监听
      sounds[name].addEventListener('error', function(e) {
          console.error(`音效 ${name} 加载失败:`, e);
      });
      
      // 添加加载成功事件监听
      sounds[name].addEventListener('canplaythrough', function() {
          console.log(`音效 ${name} 加载成功`);
      });
  }
  
  // 添加音效开关
  const soundToggle = document.createElement('button');
  soundToggle.className = 'btn sound-toggle';
  soundToggle.innerHTML = '🔊';
  soundToggle.title = "音效开关";
  
  soundToggle.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundToggle.innerHTML = soundEnabled ? '🔊' : '🔇';
      if (soundEnabled) {
          playSound('click');
      }
  });
  
  document.querySelector('.container').appendChild(soundToggle);
}

// 播放音效
function playSound(type) {
    if (!soundEnabled) return;
    
    const sound = sounds[type];
    if (!sound) {
        console.error(`音效 ${type} 不存在`);
        return;
    }
    
    try {
        // 确保音频重置到开始
        sound.currentTime = 0;
        sound.play().catch(e => {
            console.error(`播放音效 ${type} 失败:`, e);
        });
    } catch (e) {
        console.error(`播放音效出错:`, e);
    }
}


function testSoundEffects() {
console.log("测试所有音效...");
const soundTypes = Object.keys(sounds);

// 序列播放所有音效，每个间隔1秒
let index = 0;

function playNext() {
    if (index < soundTypes.length) {
        const type = soundTypes[index];
        console.log(`测试音效: ${type}`);
        playSound(type);
        index++;
        setTimeout(playNext, 1000);
    } else {
        console.log("所有音效测试完成");
    }
}

// 开始测试
playNext();
}

function addSoundTestButton() {
const testBtn = document.createElement('button');
testBtn.className = 'btn';
testBtn.textContent = '测试音效';
testBtn.style.position = 'absolute';
testBtn.style.top = '20px';
testBtn.style.left = '20px';
testBtn.style.zIndex = '1000';

testBtn.addEventListener('click', () => {
    // 测试顺序播放所有音效
    const soundTypes = Object.keys(soundFiles);
    let index = 0;
    
    function playNext() {
        if (index < soundTypes.length) {
            const type = soundTypes[index];
            console.log(`测试音效: ${type}`);
            playSound(type);
            alert(`正在播放音效: ${type}\n如果听不到声音，请检查音效文件是否存在`);
            index++;
            setTimeout(playNext, 1000);
        }
    }
    
    // 开始测试
    soundEnabled = true;
    playNext();
});

document.querySelector('.container').appendChild(testBtn);
}

// 使用示例数据
function useSampleData() {
    wordInput.value = SAMPLE_DATA;
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

// 从Excel按章节获取数据
function loadExcelDataByChapter(chapter) {
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

// 从Excel随机获取数据
function loadRandomExcelData(count) {
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

// 数据准备函数
function prepareWordData() {
    const dataSource = document.querySelector('input[name="data-source"]:checked').value;
    
    if (dataSource === 'custom') {
        // 使用用户输入的内容
        const pairs = parseCustomInput(wordInput.value);
        
        if (pairs.length < 2) {
            showErrorToast('请至少输入两组单词和定义！');
            return false;
        }
        
        wordPairs = pairs;
        
        // 打乱顺序
        wordPairs = shuffle(wordPairs);
        
        // 根据游戏板大小限制单词对数量
        const maxPairs = Math.floor((boardSize * boardSize) / 2);
        
        if (wordPairs.length > maxPairs) {
            wordPairs = wordPairs.slice(0, maxPairs);
        }
        
        return true;
    } else if (dataSource === 'chapter') {
        // 从Excel按章节加载数据
        const chapter = chapterSelect.value;
        return loadExcelDataByChapter(chapter);
    } else if (dataSource === 'random') {
        // 从Excel随机加载数据
        const count = parseInt(randomCount.value);
        return loadRandomExcelData(count);
    }
    
    return false;
}

// 开始游戏前的检查
function startGame() {
    // 准备单词数据
    if (!prepareWordData()) {
        return;
    }
    
    boardSize = parseInt(boardSizeSelect.value);
    difficulty = difficultySelect.value;
    
    // 根据难度设置时间
    switch (difficulty) {
        case 'easy':
            timeLimit = 180;
            break;
        case 'normal':
            timeLimit = 120;
            break;
        case 'hard':
            timeLimit = 90;
            break;
    }
    
    // 切换界面
    startScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    gameScreen.classList.add('screen-fade-in'); // 添加淡入动画
    
    // 初始化游戏
    initGame();
}

// Initialize game
function initGame() {
    isGameOver = false;
    matchedPairs = 0;
    score = 0;
    combo = 0;
    maxCombo = 0;
    hintUsed = 0;
    shuffleCount = 0;
    pathCache = {}; // Reset path cache

    // 初始化键盘快捷键
    initKeyboardShortcuts();
    
    // Reset time limit based on difficulty level
    switch (difficulty) {
        case 'easy':
            timeLimit = 180;
            break;
        case 'normal':
            timeLimit = 1120;
            break;
        case 'hard':
            timeLimit = 90;
            break;
    }
    
    startTimer();
    setupGameBoard();
    updateUI();
    
    // Check if initial board has connectable cards
    setTimeout(() => {
        const hasMatch = checkForPossibleMatches();
        // If no connectable cards, force shuffle
        if (!hasMatch) {
            shuffleBoard(true);
        }
    }, 500);
}

// 开始计时器
function startTimer() {
    clearInterval(timer);
    timeDisplay.textContent = timeLimit;
    
    timer = setInterval(() => {
        timeLimit--;
        timeDisplay.textContent = timeLimit;
        
        if (timeLimit <= 0) {
            clearInterval(timer);
            gameOver(false);
        }
    }, 1000);
}

// 更新UI
function updateUI() {
    scoreDisplay.textContent = score;
    comboDisplay.textContent = combo;
    matchedPairsDisplay.textContent = matchedPairs;
    totalPairsDisplay.textContent = wordPairs.length;
    
    // 更新进度条
    const progress = (matchedPairs / wordPairs.length) * 100;
    progressFill.style.width = `${progress}%`;
}

// 设置游戏板 - 使用明确的方块状态定义
function setupGameBoard() {
    gameBoard.innerHTML = '';
    gameBoard.style.display = 'grid';
    // 添加额外的行和列（上下左右各1行/列）用于路径连接
    gameBoard.style.gridTemplateColumns = `repeat(${boardSize + 2}, 100px)`;
    gameBoard.style.gridTemplateRows = `repeat(${boardSize + 2}, 100px)`;
    gameBoard.style.gap = '10px';
    
    // 初始化游戏板矩阵，包括外围的边界行/列
    boardMatrix = Array(boardSize + 2).fill().map(() => Array(boardSize + 2).fill(null));
    
    // 创建外围的空方块（上、下、左、右边界）
    for (let row = 0; row < boardSize + 2; row++) {
        for (let col = 0; col < boardSize + 2; col++) {
            // 只创建边界方块
            if (row === 0 || row === boardSize + 1 || col === 0 || col === boardSize + 1) {
                const emptyCard = document.createElement('div');
                emptyCard.className = 'card empty-card top-path-card'; // 为路径添加视觉提示
                emptyCard.dataset.row = row;
                emptyCard.dataset.col = col;
                
                // 设置网格位置
                emptyCard.style.gridRow = row + 1;
                emptyCard.style.gridColumn = col + 1;
                
                gameBoard.appendChild(emptyCard);
                
                // 更新游戏板矩阵 - 标记为空且可通行的方块
                boardMatrix[row][col] = {
                    element: emptyCard,
                    isEmpty: true,     // 这是一个空方块
                    matched: true,     // 标记为已匹配表示可以通行
                    id: null,          // 没有内容ID
                    type: null         // 没有类型
                };
            }
        }
    }
    
    // 创建实际的卡片
    const cards = [];
    
    // 创建单词和定义卡片对
    wordPairs.forEach(pair => {
        cards.push({
            type: 'word',
            content: pair.word,
            pairId: pair.word
        });
        
        cards.push({
            type: 'definition',
            content: pair.definition,
            pairId: pair.word
        });
    });
    
    // 打乱卡片顺序
    const shuffledCards = shuffle(cards);
    
    // 计算内部游戏板的空方块数量
    const totalCells = boardSize * boardSize;
    const emptyCardCount = totalCells - shuffledCards.length;
    
    // 为内部游戏板创建实际卡片和空方块（从边界偏移1位）
    for (let row = 1; row <= boardSize; row++) {
        for (let col = 1; col <= boardSize; col++) {
            const index = (row - 1) * boardSize + (col - 1);
            
            if (index < shuffledCards.length) {
                // 创建实际卡片
                const cardData = shuffledCards[index];
                const card = document.createElement('div');
                card.className = `card ${cardData.type}-card`;
                card.dataset.id = cardData.pairId;
                card.dataset.type = cardData.type;
                card.dataset.row = row;
                card.dataset.col = col;
                
                // 设置网格位置
                card.style.gridRow = row + 1;
                card.style.gridColumn = col + 1;
                
                const content = document.createElement('div');
                content.className = 'content';

                // 判断卡片类型：如果是定义卡片，使用innerHTML渲染HTML标签
                if (cardData.type === 'definition') {
                    // 使用innerHTML支持HTML标签，比如<br>
                    content.innerHTML = cardData.content;
                } else {
                    // 单词卡片仍然使用textContent
                    content.textContent = cardData.content;
                }

                card.appendChild(content);
                
                // 左键点击选择
                card.addEventListener('click', (e) => {
                    if (!isGameOver && !isLoading) {
                        selectCard(card);
                    }
                });
                
                // 右键点击取消选择
                card.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (!isLoading && card === firstSelection) {
                        firstSelection.classList.remove('selected');
                        firstSelection = null;
                    }
                });
                
                gameBoard.appendChild(card);
                
                // 更新游戏板矩阵 - 有内容且未匹配的方块
                boardMatrix[row][col] = {
                    element: card,
                    id: cardData.pairId,
                    type: cardData.type,
                    isEmpty: false,    // 不是空方块
                    matched: false      // 初始未匹配
                };
            } else {
                // 创建空方块 - 这些方块物理存在但视觉上是空的
                const emptyCard = document.createElement('div');
                emptyCard.className = 'card empty-card path-card';
                emptyCard.dataset.row = row;
                emptyCard.dataset.col = col;
                
                // 设置网格位置
                emptyCard.style.gridRow = row + 1;
                emptyCard.style.gridColumn = col + 1;
                
                gameBoard.appendChild(emptyCard);
                
                // 更新游戏板矩阵 - 标记为空方块
                boardMatrix[row][col] = {
                    element: emptyCard,
                    isEmpty: true,     // 这是一个空方块
                    matched: true,     // 标记为已匹配表示可以通行
                    id: null,          // 没有内容ID
                    type: null         // 没有类型
                };
            }
        }
    }
    
    // 清除已存在的连接线
    removeConnectors();
    
    // 清除路径缓存
    pathCache = {};
}
// 打乱数组
function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 选择卡片
// 修改选择卡片逻辑，使用新的最短路径算法
function selectCard(card) {
    // 已经匹配或选中的卡片不能再选
    if (card.classList.contains('matched')) {
        return;
    }
    
    // 如果点击的是已选中的卡片，取消选中
    if (card === firstSelection) {
        firstSelection.classList.remove('selected');
        firstSelection = null;
        return;
    }
    
    // 播放点击音效
    playSound('click');
    
    if (firstSelection) {
        // 第二次选择
        const isValid = isValidPair(firstSelection, card);
        
        if (isValid) {
            const firstRow = parseInt(firstSelection.dataset.row);
            const firstCol = parseInt(firstSelection.dataset.col);
            const secondRow = parseInt(card.dataset.row);
            const secondCol = parseInt(card.dataset.col);
            
            // 创建缓存键
            const cacheKey = `${firstRow},${firstCol}-${secondRow},${secondCol}`;
            const reverseCacheKey = `${secondRow},${secondCol}-${firstRow},${firstCol}`;
            
            // 先检查路径缓存
            let path = pathCache[cacheKey] || pathCache[reverseCacheKey];
            
            if (!path) {
                // 缓存中没有，使用最短路径算法
                path = findShortestPath(firstRow, firstCol, secondRow, secondCol);
                
                // 验证路径是否有效（最多2个拐点）
                if (path && !isValidPath(path)) {
                    path = null;
                }
                
                // 如果找到有效路径，存入缓存
                if (path) {
                    pathCache[cacheKey] = path;
                }
            }
            
            if (path) {
                // 匹配成功
                playSound('correct');
                
                // 显示连接线
                showConnectionPath(path);
                
                firstSelection.classList.add('correct');
                card.classList.add('correct');
                
                // 更新combo
                combo++;
                maxCombo = Math.max(maxCombo, combo);
                
                // 禁用交互，直到动画完成
                const selectedCards = [firstSelection, card];
                selectedCards.forEach(c => c.style.pointerEvents = 'none');
                
                setTimeout(() => {
                    // 移除连接线
                    removeConnectors();
                    
                    firstSelection.classList.add('matched');
                    card.classList.add('matched');
                    firstSelection.classList.remove('selected', 'correct');
                    card.classList.remove('correct');
                    
                    // 恢复交互
                    selectedCards.forEach(c => c.style.pointerEvents = '');
                    
                    // 明确更新匹配状态，而不仅仅是视觉样式
                    const firstRow = parseInt(firstSelection.dataset.row);
                    const firstCol = parseInt(firstSelection.dataset.col);
                    const secondRow = parseInt(card.dataset.row);
                    const secondCol = parseInt(card.dataset.col);
                    
                    // 确保 boardMatrix 中的匹配状态被正确更新
                    if (boardMatrix[firstRow][firstCol]) {
                        boardMatrix[firstRow][firstCol].matched = true;
                    }
                    
                    if (boardMatrix[secondRow][secondCol]) {
                        boardMatrix[secondRow][secondCol].matched = true;
                    }
                    
                    matchedPairs++;
                    updateScore(true);
                    
                    if (matchedPairs >= wordPairs.length) {
                        gameOver(true);
                    } else {
                        // 检查是否还有可连接的卡片
                        setTimeout(() => {
                            checkForPossibleMatches();
                        }, 300);
                    }
                    
                    firstSelection = null;
                }, 800);
            } else {
                // 无法连接
                playSound('incorrect');
                
                firstSelection.classList.add('incorrect');
                card.classList.add('incorrect');
                
                // 重置combo
                combo = 0;
                
                // 禁用交互，直到动画完成
                const selectedCards = [firstSelection, card];
                selectedCards.forEach(c => c.style.pointerEvents = 'none');
                
                setTimeout(() => {
                    firstSelection.classList.remove('incorrect', 'selected');
                    card.classList.remove('incorrect');
                    
                    // 恢复交互
                    selectedCards.forEach(c => c.style.pointerEvents = '');
                    
                    updateScore(false);
                    firstSelection = null;
                }, 500);
            }
        } else {
            // 匹配失败
            playSound('incorrect');
            
            firstSelection.classList.add('incorrect');
            card.classList.add('incorrect');
            
            // 重置combo
            combo = 0;
            
            // 禁用交互，直到动画完成
            const selectedCards = [firstSelection, card];
            selectedCards.forEach(c => c.style.pointerEvents = 'none');
            
            setTimeout(() => {
                firstSelection.classList.remove('incorrect', 'selected');
                card.classList.remove('incorrect');
                
                // 恢复交互
                selectedCards.forEach(c => c.style.pointerEvents = '');
                
                updateScore(false);
                firstSelection = null;
            }, 500);
        }
    } else {
        // 第一次选择
        firstSelection = card;
        firstSelection.classList.add('selected');
    }
}


// 增强版检查卡片匹配逻辑
function isValidPair(card1, card2) {
    // 检查ID是否相同且类型不同
    return card1.dataset.id === card2.dataset.id && 
            card1.dataset.type !== card2.dataset.type;
}



// 定义方块状态
// 0: 可通行方块 (空方块或已匹配方块)
// 1: 不可通行方块 (未匹配方块)

// 使用广度优先搜索(BFS)寻找两点间的最短路径
function findShortestPath(startRow, startCol, endRow, endCol) {
    // 如果起点和终点相同，返回null
    if (startRow === endRow && startCol === endCol) {
        return null;
    }
    
    // 创建表示方块状态的网格 (true表示可通行, false表示不可通行)
    const passableGrid = createPassableGrid();
    
    // 将起点和终点标记为可通行(以确保起点和终点被包含在路径计算中)
    passableGrid[startRow][startCol] = true;
    passableGrid[endRow][endCol] = true;
    
    // 方向数组: 上、右、下、左
    const dx = [0, 1, 0, -1];
    const dy = [-1, 0, 1, 0];
    
    // 路径队列
    const queue = [];
    // 已访问的单元格
    const visited = Array(boardSize + 2).fill().map(() => Array(boardSize + 2).fill(false));
    // 保存每个单元格的前驱，用于重建路径
    const parent = Array(boardSize + 2).fill().map(() => Array(boardSize + 2).fill().map(() => null));
    
    // 将起点加入队列
    queue.push({row: startRow, col: startCol});
    visited[startRow][startCol] = true;
    
    // BFS搜索
    while (queue.length > 0) {
        const current = queue.shift();
        
        // 如果到达终点
        if (current.row === endRow && current.col === endCol) {
            // 重建路径
            return reconstructPath(parent, startRow, startCol, endRow, endCol);
        }
        
        // 尝试四个方向
        for (let i = 0; i < 4; i++) {
            const nextRow = current.row + dy[i];
            const nextCol = current.col + dx[i];
            
            // 检查边界
            if (nextRow < 0 || nextRow >= boardSize + 2 || 
                nextCol < 0 || nextCol >= boardSize + 2) {
                continue;
            }
            
            // 如果该单元格可通行且未访问过
            if (passableGrid[nextRow][nextCol] && !visited[nextRow][nextCol]) {
                visited[nextRow][nextCol] = true;
                parent[nextRow][nextCol] = {row: current.row, col: current.col};
                queue.push({row: nextRow, col: nextCol});
            }
        }
    }
    
    // 如果没有找到路径，返回null
    return null;
}

// 创建表示方块状态的网格
function createPassableGrid() {
    const passableGrid = Array(boardSize + 2).fill().map(() => Array(boardSize + 2).fill(false));
    
    // 遍历所有方块
    for (let r = 0; r < boardSize + 2; r++) {
        for (let c = 0; c < boardSize + 2; c++) {
            const cell = boardMatrix[r][c];
            if (cell) {
                // 空方块或已匹配方块可以通行
                if (cell.isEmpty === true || cell.matched === true) {
                    passableGrid[r][c] = true;
                }
            }
        }
    }
    
    return passableGrid;
}

// 从parent数组重建路径
function reconstructPath(parent, startRow, startCol, endRow, endCol) {
    const path = [{row: endRow, col: endCol}];
    let current = {row: endRow, col: endCol};
    
    // 从终点回溯到起点
    while (!(current.row === startRow && current.col === startCol)) {
        current = parent[current.row][current.col];
        if (!current) break; // 安全检查
        path.unshift({row: current.row, col: current.col});
    }
    
    return path;
}

// 检查路径是否有效 (最多只能有两个拐点)
function isValidPath(path) {
    if (!path || path.length < 2) {
        return false;
    }
    
    // 计算方向变化次数
    let directionChanges = 0;
    let prevDirection = null;
    
    for (let i = 1; i < path.length; i++) {
        const current = path[i];
        const prev = path[i-1];
        
        // 确定当前方向
        let currentDirection;
        if (current.row === prev.row) {
            currentDirection = 'horizontal';
        } else {
            currentDirection = 'vertical';
        }
        
        // 检测方向变化
        if (prevDirection !== null && currentDirection !== prevDirection) {
            directionChanges++;
            
            // 如果超过2个拐点，则路径无效
            if (directionChanges > 2) {
                return false;
            }
        }
        
        prevDirection = currentDirection;
    }
    
    return true;
}




// Create passable grid - update range check to include the entire board with borders
function createPassableGrid(startRow, startCol, endRow, endCol) {
    const passableGrid = Array(boardSize + 2).fill().map(() => Array(boardSize + 2).fill(false));
    
    // Traverse each position
    for (let r = 0; r < boardSize + 2; r++) {
        for (let c = 0; c < boardSize + 2; c++) {
            // Start and end points must be marked as passable
            if ((r === startRow && c === startCol) || (r === endRow && c === endCol)) {
                passableGrid[r][c] = true;
                continue;
            }
            
            // Empty positions or matched cards can be passed through
            const cell = boardMatrix[r][c];
            if (cell && (cell.isEmpty === true || cell.matched === true)) {
                passableGrid[r][c] = true;
            }
            
            // Border cells are always passable
            if (r === 0 || r === boardSize + 1 || c === 0 || c === boardSize + 1) {
                passableGrid[r][c] = true;
            }
        }
    }
    
    return passableGrid;
}

// 优化的连接路径显示函数 - 使用Canvas绘制更流畅的连线
function showConnectionPath(path) {
    removeConnectors();
    
    // 获取游戏板的实际位置和尺寸
    const boardRect = gameBoard.getBoundingClientRect();
    
    // 创建Canvas元素
    const canvas = document.createElement('canvas');
    canvas.width = boardRect.width;
    canvas.height = boardRect.height;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '100';
    canvas.className = 'connector-canvas';
    
    // 获取绘图上下文
    const ctx = canvas.getContext('2d');
    
    // 计算卡片中心点位置
    const pathPoints = [];
    for (let i = 0; i < path.length; i++) {
        const point = path[i];
        const cell = boardMatrix[point.row]?.[point.col];
        
        let x, y;
        if (cell && cell.element) {
            const rect = cell.element.getBoundingClientRect();
            x = rect.left - boardRect.left + rect.width / 2;
            y = rect.top - boardRect.top + rect.height / 2;
        } else {
            // 如果在某些情况下找不到卡片，使用估计值
            x = point.col * 110 + 55;
            y = point.row * 110 + 55;
        }
        
        pathPoints.push({ x, y });
    }
    
    // 设置线条样式
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 添加线条动画
    let progress = 0;
    const animationSpeed = 0.03; // 动画速度
    
    function drawAnimatedLine() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制路径上的每个线段，基于当前进度
        ctx.beginPath();
        
        if (progress <= 0) {
            // 开始点
            ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
            ctx.arc(pathPoints[0].x, pathPoints[0].y, 4, 0, Math.PI * 2);
        } else {
            const segmentCount = pathPoints.length - 1;
            const fullSegments = Math.floor(progress * segmentCount);
            const partialSegment = (progress * segmentCount) - fullSegments;
            
            // 绘制完整段
            ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
            for (let i = 1; i <= fullSegments; i++) {
                ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
            }
            
            // 绘制部分段
            if (fullSegments < segmentCount) {
                const startX = pathPoints[fullSegments].x;
                const startY = pathPoints[fullSegments].y;
                const endX = pathPoints[fullSegments + 1].x;
                const endY = pathPoints[fullSegments + 1].y;
                
                const currentX = startX + (endX - startX) * partialSegment;
                const currentY = startY + (endY - startY) * partialSegment;
                
                ctx.lineTo(currentX, currentY);
            }
        }
        
        ctx.stroke();
        
        // 绘制拐点
        ctx.fillStyle = '#f39c12';
        for (let i = 1; i < pathPoints.length - 1; i++) {
            if (i / (pathPoints.length - 1) <= progress) {
                ctx.beginPath();
                ctx.arc(pathPoints[i].x, pathPoints[i].y, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        progress += animationSpeed;
        
        if (progress <= 1) {
            requestAnimationFrame(drawAnimatedLine);
        } else {
            // 最终完整绘制
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
            
            for (let i = 1; i < pathPoints.length; i++) {
                ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
            }
            
            ctx.stroke();
            
            // 绘制所有拐点
            ctx.fillStyle = '#f39c12';
            for (let i = 1; i < pathPoints.length - 1; i++) {
                ctx.beginPath();
                ctx.arc(pathPoints[i].x, pathPoints[i].y, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // 开始动画
    drawAnimatedLine();
    
    // 将Canvas添加到游戏板
    gameBoard.appendChild(canvas);
    connectors.push(canvas);
}

// 移除连接线
function removeConnectors() {
    connectors.forEach(connector => connector.remove());
    connectors = [];
}

// 检查是否有可能的匹配，带自动洗牌功能
// 更新检查可能匹配的功能，使用最短路径算法
function checkForPossibleMatches(autoShuffle = true) {
    if (isGameOver) return true;
    
    // 寻找所有未匹配的卡片
    const unmatchedCards = [];
    for (let r = 0; r < boardSize + 2; r++) {
        for (let c = 0; c < boardSize + 2; c++) {
            if (boardMatrix[r]?.[c] && !boardMatrix[r][c].matched && !boardMatrix[r][c].isEmpty) {
                unmatchedCards.push({
                    row: r,
                    col: c,
                    id: boardMatrix[r][c].id,
                    type: boardMatrix[r][c].type
                });
            }
        }
    }
    
    // 清除路径缓存，因为卡片位置可能已更改
    pathCache = {};
    
    // 检查每对卡片是否可以连接
    for (let i = 0; i < unmatchedCards.length; i++) {
        for (let j = i + 1; j < unmatchedCards.length; j++) {
            const card1 = unmatchedCards[i];
            const card2 = unmatchedCards[j];
            
            if (card1.id === card2.id && card1.type !== card2.type) {
                const path = findShortestPath(card1.row, card1.col, card2.row, card2.col);
                
                // 验证路径是否有效（最多2个拐点）
                if (path && isValidPath(path)) {
                    // 将有效路径添加到缓存
                    const cacheKey = `${card1.row},${card1.col}-${card2.row},${card2.col}`;
                    pathCache[cacheKey] = path;
                    
                    // 找到可连接的卡片，不需要洗牌
                    return true;
                }
            }
        }
    }
    
    // 没有找到可连接的卡片，需要洗牌
    if (unmatchedCards.length > 0 && autoShuffle) {
        console.log("没有可连接的卡片，需要洗牌");
        setTimeout(() => {
            shuffleBoard(true);
        }, 1000);
    }
    
    return false;
}

// 优化后的洗牌函数 - 使用Promise确保动画完成后再执行操作
function shuffleBoard(isAuto) {
    // 如果是游戏结束、没有未匹配的卡片或正在加载中，不洗牌
    if (isGameOver || matchedPairs >= wordPairs.length || isLoading) {
        return;
    }
    
    isLoading = true;
    shuffleCount++;
    
    // 显示加载动画
    loadingOverlay.classList.add('active');
    loadingOverlay.querySelector('.loading-text').textContent = '正在洗牌...';
    
    // 播放洗牌音效
    playSound('shuffle');
    
    // Collect all unmatched cards
    const unmatchedCardElements = [];
    const unmatchedCards = [];
    const emptyPositions = [];
    
    // Only shuffle inner board cards (not border cells)
    for (let r = 1; r <= boardSize; r++) {
        for (let c = 1; c <= boardSize; c++) {
            if (boardMatrix[r][c] && !boardMatrix[r][c].matched && !boardMatrix[r][c].isEmpty) {
                unmatchedCardElements.push(boardMatrix[r][c].element);
                unmatchedCards.push({
                    row: r,
                    col: c,
                    element: boardMatrix[r][c].element,
                    id: boardMatrix[r][c].id,
                    type: boardMatrix[r][c].type
                });
                // Mark position as empty
                boardMatrix[r][c] = null;
            } else if (!boardMatrix[r][c] || boardMatrix[r][c].isEmpty) {
                // Collect empty positions
                emptyPositions.push({ row: r, col: c });
            }
        }
    }
    
    // 取消当前选中状态
    if (firstSelection) {
        firstSelection.classList.remove('selected');
        firstSelection = null;
    }
    
    // 使用Promise控制动画流程
    return new Promise(resolve => {
        // 给所有卡片添加洗牌动画
        unmatchedCardElements.forEach(card => {
            card.classList.add('shuffling');
            // 禁用卡片交互
            card.style.pointerEvents = 'none';
        });
        
        // 等待洗牌动画完成（0.5秒）
        setTimeout(() => {
            if (unmatchedCards.length <= 1) {
                // 只有一张或没有卡片，不需要洗牌
                unmatchedCardElements.forEach(card => {
                    card.classList.remove('shuffling');
                    card.style.pointerEvents = '';
                });
                loadingOverlay.classList.remove('active');
                isLoading = false;
                resolve();
                return;
            }
            
            // 打乱卡片数组
            for (let i = unmatchedCards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [unmatchedCards[i], unmatchedCards[j]] = [unmatchedCards[j], unmatchedCards[i]];
            }
            
            // 所有可用位置（包括原来有卡片的位置和空位置）
            const availablePositions = [
                ...unmatchedCards.map(card => ({ row: card.row, col: card.col })),
                ...emptyPositions
            ];
            
            // 打乱可用位置
            for (let i = availablePositions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
            }
            
            // 重新分配卡片位置
            for (let i = 0; i < unmatchedCards.length; i++) {
                const card = unmatchedCards[i];
                const newPos = availablePositions[i];
                
                // 更新DOM元素的数据属性
                card.element.dataset.row = newPos.row;
                card.element.dataset.col = newPos.col;
                
                // 更新游戏矩阵
                boardMatrix[newPos.row][newPos.col] = {
                    element: card.element,
                    id: card.id,
                    type: card.type,
                    matched: false
                };
                
                // 确保之前的动画被清除
                card.element.style.animation = '';
                
                // 更新DOM元素的视觉位置
                card.element.style.gridRow = newPos.row + 1;  // 加1因为CSS网格从1开始
                card.element.style.gridColumn = newPos.col + 1;
            }
            
            // 再等待0.5秒后完成洗牌过程
            setTimeout(() => {
                // 移除加载指示器
                loadingOverlay.classList.remove('active');
                
                // 移除洗牌动画类并恢复交互
                unmatchedCardElements.forEach(card => {
                    card.classList.remove('shuffling');
                    card.style.pointerEvents = '';
                });
                
                // 如果是首次自动洗牌，不扣分
                if (isAuto && shuffleCount === 1) {
                    // 不扣分
                } else {
                    // 洗牌扣分
                    score = Math.max(0, score - 20);
                    updateUI();
                }
                
                // 清除路径缓存，因为卡片位置已更改
                pathCache = {};
                
// 检查是否有可连接的卡片
setTimeout(() => {
                    const hasMatch = checkForPossibleMatches(false); // 传入false参数表示不自动洗牌
                    
                    if (!hasMatch) {
                        // 如果没有可连接的卡片，再次洗牌
                        shuffleBoard(true);
                    }
                    
                    isLoading = false;
                    resolve();
                }, 600);
            }, 500);
        }, 500);
    });
}
        
// 修改提示功能，使用最短路径算法
function showHint() {
    if (isGameOver || isLoading) return;
    
    playSound('hint');
    
    // 寻找所有未匹配的卡片
    const unmatchedCards = [];
    for (let r = 0; r < boardSize + 2; r++) {
        for (let c = 0; c < boardSize + 2; c++) {
            if (boardMatrix[r][c] && !boardMatrix[r][c].matched && !boardMatrix[r][c].isEmpty) {
                unmatchedCards.push({
                    row: r,
                    col: c,
                    id: boardMatrix[r][c].id,
                    type: boardMatrix[r][c].type,
                    element: boardMatrix[r][c].element
                });
            }
        }
    }
    
    // 检查是否有可连接的卡片对
    let foundMatch = false;
    
    // 首先检查路径缓存
    for (const cacheKey in pathCache) {
        const [start, end] = cacheKey.split('-');
        const [startRow, startCol] = start.split(',').map(Number);
        const [endRow, endCol] = end.split(',').map(Number);
        
        // 确保这些位置仍有未匹配的卡片
        const startCard = boardMatrix[startRow]?.[startCol];
        const endCard = boardMatrix[endRow]?.[endCol];
        
        if (startCard && endCard && !startCard.matched && !endCard.matched && 
            !startCard.isEmpty && !endCard.isEmpty && 
            startCard.id === endCard.id && startCard.type !== endCard.type) {
            
            // 显示提示
            startCard.element.classList.add('hint');
            endCard.element.classList.add('hint');
            
            showConnectionPath(pathCache[cacheKey]);
            
            setTimeout(() => {
                startCard.element.classList.remove('hint');
                endCard.element.classList.remove('hint');
                removeConnectors();
            }, 1500);
            
            foundMatch = true;
            break;
        }
    }
    
    // 如果缓存中未找到，重新搜索
    if (!foundMatch) {
        for (let i = 0; i < unmatchedCards.length; i++) {
            for (let j = i + 1; j < unmatchedCards.length; j++) {
                const card1 = unmatchedCards[i];
                const card2 = unmatchedCards[j];
                
                if (card1.id === card2.id && card1.type !== card2.type) {
                    const path = findShortestPath(card1.row, card1.col, card2.row, card2.col);
                    
                    // 验证路径是否有效（最多2个拐点）
                    if (path && isValidPath(path)) {
                        // 添加到缓存
                        const cacheKey = `${card1.row},${card1.col}-${card2.row},${card2.col}`;
                        pathCache[cacheKey] = path;
                        
                        // 显示提示
                        card1.element.classList.add('hint');
                        card2.element.classList.add('hint');
                        
                        showConnectionPath(path);
                        
                        setTimeout(() => {
                            card1.element.classList.remove('hint');
                            card2.element.classList.remove('hint');
                            removeConnectors();
                        }, 1500);
                        
                        foundMatch = true;
                        break;
                    }
                }
            }
            if (foundMatch) break;
        }
    }
    
    // 如果没有可连接的卡片，建议洗牌
    if (!foundMatch) {
        showCustomModal("没有可连接的卡片", "将自动重新洗牌。", () => {
            shuffleBoard(true);
        });
    }
}

// 自定义模态框（替代alert）
function showCustomModal(title, message, onConfirm) {
    // 创建模态对话框元素
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.zIndex = '3000';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    
    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.margin = '20px 0';
    
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = '确定';
    button.addEventListener('click', () => {
        document.body.removeChild(modal);
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    });
    
    content.appendChild(titleEl);
    content.appendChild(messageEl);
    content.appendChild(button);
    modal.appendChild(content);
    
    document.body.appendChild(modal);
}

// 更新分数，增强了加分动画
function updateScore(isCorrect) {
    if (isCorrect) {
        // 匹配成功
        // 基础分 + 连击奖励 + 时间奖励
        const basePoints = 10;
        const comboBonus = combo * 5;
        const timeBonus = Math.floor(timeLimit / 10);
        
        const points = basePoints + comboBonus + timeBonus;
        score += points;
        
        // 显示加分动画 - 改进为显示在匹配的卡片位置
        showPointsAnimation(points);
    }
    
    updateUI();
}

// 增强的加分动画 - 从卡片位置飘出
function showPointsAnimation(points) {
    if (!firstSelection) return;
    
    // 获取匹配卡片的位置
    const rect = firstSelection.getBoundingClientRect();
    const gameRect = gameBoard.getBoundingClientRect();
    
    const pointsElement = document.createElement('div');
    pointsElement.textContent = `+${points}`;
    pointsElement.style.position = 'absolute';
    pointsElement.style.color = '#ffeb3b';
    pointsElement.style.fontWeight = 'bold';
    pointsElement.style.fontSize = '24px';
    pointsElement.style.top = `${rect.top - gameRect.top}px`;
    pointsElement.style.left = `${rect.left - gameRect.left + rect.width/2}px`;
    pointsElement.style.transform = 'translateX(-50%)';
    pointsElement.style.animation = 'pointsFade 1.5s forwards';
    pointsElement.style.zIndex = '1000';
    pointsElement.style.pointerEvents = 'none';
    pointsElement.style.textShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
    
    gameBoard.appendChild(pointsElement);
    
    setTimeout(() => {
        pointsElement.remove();
    }, 1500);
}

// 游戏结束
// 游戏结束
function gameOver(isWin) {
    clearInterval(timer);
    isGameOver = true;
    
    // 播放结束音效
    playSound(isWin ? 'win' : 'gameover');
    
    // 更新结果界面
    finalScoreDisplay.textContent = score;
    timeLeftDisplay.textContent = timeLimit;
    maxComboDisplay.textContent = maxCombo;
    
    // 计算星级
    const maxScore = wordPairs.length * 30; // 理想满分
    const percentage = score / maxScore;
    
    let stars = 0;
    if (percentage >= 0.3) stars = 1;
    if (percentage >= 0.6) stars = 2;
    if (percentage >= 0.8 || isWin) stars = 3;
    
    // 显示星星
    star1.classList.toggle('filled', stars >= 1);
    star2.classList.toggle('filled', stars >= 2);
    star3.classList.toggle('filled', stars >= 3);
    
    // 设置标题
    resultTitle.textContent = isWin ? "恭喜完成!" : "时间到!";
    
    
    // 添加这一行，直接调用更新关卡状态
    updateLevelCompletion(isWin);
    
    // 如果获胜，展示粒子效果
    if (isWin) {
        const chapters = Object.keys(excelData);
        const currentIndex = chapters.indexOf(levelData.currentLevel);
        
        // 如果不是最后一关
        if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
            const nextChapter = chapters[currentIndex + 1];
            // 显示下一关按钮
            nextLevelBtn.style.display = 'inline-block';
        } else {
            // 已是最后一关，隐藏下一关按钮
            nextLevelBtn.style.display = 'none';
        }
    } else {
        // 游戏失败，隐藏下一关按钮
        nextLevelBtn.style.display = 'none';
    }
    
    // 显示结果弹窗
    resultModal.classList.add('active');
}


function cleanupKeyboardShortcuts() {
    document.removeEventListener('keydown', handleKeyPress);
}

function goToNextLevel() {
  resultModal.classList.remove('active');
  clearInterval(timer);
  removeConnectors();
  
  const currentLevel = levelData.currentLevel;
  if (!currentLevel) {
      console.log("未找到当前关卡信息!");
      return;
  }
  
  // 获取所有章节/关卡
  const chapters = Object.keys(excelData);
  const currentIndex = chapters.indexOf(currentLevel);
  
  // 检查是否有下一关
  if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
      const nextChapter = chapters[currentIndex + 1];
      
      // 检查下一关是否已解锁
      if (levelData.levels[nextChapter] && levelData.levels[nextChapter].unlocked) {
          // 设置当前关卡为下一关
          levelData.currentLevel = nextChapter;
          saveLevelData();
          
          // 加载下一关的数据
          loadExcelDataByChapter(nextChapter);
          
          // 初始化游戏
          initGame();
          
          // 显示提示
          showErrorToast(`正在进入${nextChapter}...`, 2000, 'success');
      } else {
          showErrorToast('下一关尚未解锁!', 2000, 'warning');
          goBack(); // 返回主菜单
      }
  } else {
      showErrorToast('已经是最后一关!', 2000, 'warning');
      goBack(); // 返回主菜单
  }
}

// 创建胜利的彩花效果
function createConfetti() {
    const confettiCount = 150;
    const colors = ['#f39c12', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = `${Math.random() * 100}%`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = `${Math.random() * 10 + 5}px`;
        confetti.style.height = `${Math.random() * 10 + 5}px`;
        confetti.style.position = 'fixed';
        confetti.style.zIndex = '1001';
        confetti.style.opacity = '0';
        confetti.style.animation = `confetti-fall ${Math.random() * 3 + 2}s forwards`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

// Reset game
function resetGame() {
    nextLevelBtn.style.display = 'none';
    resultModal.classList.remove('active');
    clearInterval(timer);
    removeConnectors();
    
    // 移除键盘事件监听
    cleanupKeyboardShortcuts();


    // Add fade-in animation
    gameScreen.classList.remove('screen-fade-in');
    void gameScreen.offsetWidth; // Trigger reflow to reset animation
    gameScreen.classList.add('screen-fade-in');
    
    initGame();
}

// 返回主菜单
function goBack() {
    nextLevelBtn.style.display = 'none';
    resultModal.classList.remove('active');
    clearInterval(timer);
    removeConnectors();
    gameScreen.style.display = 'none';
    startScreen.style.display = 'block';
    
    // 移除键盘事件监听
    cleanupKeyboardShortcuts();

    // 添加淡入动画
    startScreen.classList.remove('screen-fade-in');
    void startScreen.offsetWidth; // 触发重排，重置动画
    startScreen.classList.add('screen-fade-in');
}

// 关卡的script
// 关卡数据结构
let levelData = {
    currentLevel: null,
    levels: {}
};


// 分页相关变量
let currentPage = 1;
let levelsPerPage = 10; // 每页显示6个关卡（3行2列）
let totalPages = 1;




// 初始化关卡系统
function initLevelSystem() {
    // 加载存档数据
    loadLevelData();
    
    // 获取所有章节作为关卡
    const chapters = Object.keys(excelData);
    
    // 计算总页数
    totalPages = Math.ceil(chapters.length / levelsPerPage);
    
    // 更新页码指示器
    updatePageIndicator();
    
    // 初始化分页按钮
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderLevelPage();
            updatePageIndicator();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderLevelPage();
            updatePageIndicator();
        }
    });
    
    // 渲染第一页
    renderLevelPage();
    
    // 更新"开始游戏"按钮事件，改为打开关卡选择界面
    document.getElementById('start-btn').removeEventListener('click', startGame);
    document.getElementById('start-btn').addEventListener('click', openLevelScreen);
    
    // 返回主菜单按钮事件
    document.getElementById('back-to-menu-btn').addEventListener('click', () => {
        document.getElementById('level-screen').style.display = 'none';
        startScreen.style.display = 'block';
        startScreen.classList.add('screen-fade-in');
    });
}


// 更新页码指示器
function updatePageIndicator() {
    const pageIndicator = document.getElementById('page-indicator');
    pageIndicator.textContent = `第 ${currentPage}/${totalPages} 页`;
    
    // 更新按钮状态
    document.getElementById('prev-page-btn').disabled = (currentPage <= 1);
    document.getElementById('next-page-btn').disabled = (currentPage >= totalPages);
}


// 渲染当前页的关卡
// 渲染当前页的关卡
function renderLevelPage() {
    const levelGrid = document.getElementById('level-grid');
    levelGrid.innerHTML = '';
    
    const chapters = Object.keys(excelData);
    const startIndex = (currentPage - 1) * levelsPerPage;
    const endIndex = Math.min(startIndex + levelsPerPage, chapters.length);
    
    // 添加当前页的关卡
    for (let i = startIndex; i < endIndex; i++) {
        const chapter = chapters[i];
        
        // 如果关卡数据中没有这一关，初始化它
        if (!levelData.levels[chapter]) {
            levelData.levels[chapter] = {
                unlocked: i === 0, // 只有第一关默认解锁
                completed: false,
                stars: 0,
                highScore: 0,
                bestTime: 0
            };
        }
        
        // 创建关卡项
        const levelItem = document.createElement('div');
        levelItem.className = 'level-item';
        if (!levelData.levels[chapter].unlocked) {
            levelItem.classList.add('locked');
        } else if (levelData.levels[chapter].completed) {
            levelItem.classList.add('completed');
        } else {
            levelItem.classList.add('available');
        }
        
        // 关卡内容
        levelItem.innerHTML = `
            <div class="level-name">${chapter}</div>
            <div class="level-stars">
                ${getStarsHTML(levelData.levels[chapter].stars)}
            </div>
            <div class="level-info">
                ${levelData.levels[chapter].completed 
                    ? `最高分: ${levelData.levels[chapter].highScore}` 
                    : levelData.levels[chapter].unlocked 
                        ? '点击开始' 
                        : '未解锁'}
            </div>
            <div class="progress-indicator" style="width: ${levelData.levels[chapter].completed ? '100%' : '0%'}"></div>
        `;
        
        // 关卡点击事件
        levelItem.addEventListener('click', () => {
            if (levelData.levels[chapter].unlocked) {
                // 设置当前关卡
                levelData.currentLevel = chapter;
                saveLevelData();
                
                // 加载这一章的数据
                loadExcelDataByChapter(chapter);
                
                // 设置难度和板大小
                boardSize = parseInt(boardSizeSelect.value);
                difficulty = difficultySelect.value;
                
                // 切换到游戏界面
                document.getElementById('level-screen').style.display = 'none';
                gameScreen.style.display = 'block';
                gameScreen.classList.add('screen-fade-in');
                
                // 初始化游戏
                initGame();
            } else {
                showErrorToast('需要先完成前一关才能解锁此关卡');
            }
        });
        
        levelGrid.appendChild(levelItem);
    }
    
    // 如果当前页的关卡数少于每页显示的最大数，添加空白占位
    for (let i = endIndex - startIndex; i < levelsPerPage; i++) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'level-item';
        emptyItem.style.visibility = 'hidden';
        emptyItem.style.pointerEvents = 'none';
        levelGrid.appendChild(emptyItem);
    }
    
    // 保存关卡数据
    saveLevelData();
}

// 打开关卡选择界面
// 打开关卡选择界面
function openLevelScreen() {
    // 准备单词数据 - 确保Excel数据已加载
    if (Object.keys(excelData).length === 0) {
        showErrorToast('没有可用的单词数据，请稍后再试');
        return;
    }
    
    // 重置为第一页
    currentPage = 1;
    renderLevelPage();
    updatePageIndicator();
    
    startScreen.style.display = 'none';
    document.getElementById('level-screen').style.display = 'block';
    document.getElementById('level-screen').classList.add('screen-fade-in');
}
// 获取星级HTML
function getStarsHTML(stars) {
    let html = '';
    for (let i = 1; i <= 3; i++) {
        html += `<span class="star ${i <= stars ? 'filled' : ''}">★</span>`;
    }
    return html;
}

// 更新关卡完成状态
function updateLevelCompletion(isWin) {
  const currentLevel = levelData.currentLevel;
  if (!currentLevel) {
      console.log("未找到当前关卡信息!");
      return;
  }
  
  console.log("更新关卡状态:", currentLevel, "是否获胜:", isWin);
  
  const levelInfo = levelData.levels[currentLevel];
  if (!levelInfo) {
      console.log("未找到当前关卡数据!");
      return;
  }
  
  // 如果赢了，标记为完成并解锁下一关
  if (isWin) {
      console.log("获胜，更新关卡完成状态");
      levelInfo.completed = true;
      
      // 更新最高分
      if (score > levelInfo.highScore) {
          levelInfo.highScore = score;
      }
      
      // 计算星级
      const maxScore = wordPairs.length * 30; // 理想满分
      const percentage = score / maxScore;
      
      let newStars = 0;
      if (percentage >= 0.3) newStars = 1;
      if (percentage >= 0.6) newStars = 2;
      if (percentage >= 0.8) newStars = 3;
      
      // 只更新更高的星级
      if (newStars > levelInfo.stars) {
          levelInfo.stars = newStars;
      }
      
      // 解锁下一关
      const chapters = Object.keys(excelData);
      const currentIndex = chapters.indexOf(currentLevel);
      console.log("当前关卡索引:", currentIndex, "总关卡数:", chapters.length);
      
      if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
          const nextChapter = chapters[currentIndex + 1];
          console.log("尝试解锁下一关:", nextChapter);
          
          if (levelData.levels[nextChapter]) {
              levelData.levels[nextChapter].unlocked = true;
              console.log("成功解锁下一关!");
          } else {
              // 如果下一关卡数据不存在，创建它
              levelData.levels[nextChapter] = {
                  unlocked: true,
                  completed: false,
                  stars: 0,
                  highScore: 0,
                  bestTime: 0
              };
              console.log("创建并解锁下一关!");
          }
      } else {
          console.log("已经是最后一关或无法找到当前关卡索引");
      }
  }
  
  // 保存关卡数据
  saveLevelData();
  console.log("关卡数据已保存:", levelData);
}

// 保存关卡数据
function saveLevelData() {
    try {
        localStorage.setItem('word-game-level-data', JSON.stringify(levelData));
        console.log("成功保存关卡数据");
    } catch (e) {
        console.error('保存关卡数据失败', e);
    }
}

// 加载关卡数据
function loadLevelData() {
    try {
        const savedData = localStorage.getItem('word-game-level-data');
        if (savedData) {
            levelData = JSON.parse(savedData);
            console.log("成功加载关卡数据:", levelData);
        } else {
            console.log("未找到保存的关卡数据，使用默认设置");
        }
    } catch (e) {
        console.error('加载关卡数据失败', e);
        levelData = {
            currentLevel: null,
            levels: {}
        };
    }
}

// 重置关卡数据（用于调试）
function resetLevelData() {
    levelData = {
        currentLevel: null,
        levels: {}
    };
    saveLevelData();
    initLevelSystem();
  }