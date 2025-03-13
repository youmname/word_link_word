// 关卡系统

// 关卡数据结构
let levelData = {
    currentLevel: null,
    levels: {}
};

// 分页相关变量
let currentPage = 1;
let levelsPerPage = 10; // 每页显示的关卡数量
let totalPages = 1;

// 初始化关卡系统
function initLevelSystem() {
    // 加载存档数据
    loadLevelData();
    
    // 获取所有章节作为关卡
    getAvailableChapters()
        .then(chapters => {
            // 计算总页数
            totalPages = Math.ceil(chapters.length / levelsPerPage);
            
            // 更新页码指示器
            updatePageIndicator();
            
            // 初始化分页按钮
            initPaginationButtons();
            
            // 渲染第一页
            renderLevelPage();
            
            // 更新"开始游戏"按钮事件，改为打开关卡选择界面
            updateStartButton();
            
            // 返回主菜单按钮事件
            const backToMenuBtn = document.getElementById('back-to-menu-btn');
            if (backToMenuBtn) {
                backToMenuBtn.addEventListener('click', () => {
                    document.getElementById('level-screen').style.display = 'none';
                    document.getElementById('start-screen').style.display = 'block';
                    document.getElementById('start-screen').classList.add('screen-fade-in');
                });
            }
        })
        .catch(error => {
            console.error("初始化关卡系统失败:", error);
        });
}

// 初始化分页按钮
function initPaginationButtons() {
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderLevelPage();
                updatePageIndicator();
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderLevelPage();
                updatePageIndicator();
            }
        });
    }
}

// 更新开始游戏按钮
function updateStartButton() {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        // 移除原有的事件监听器
        const newStartBtn = startBtn.cloneNode(true);
        startBtn.parentNode.replaceChild(newStartBtn, startBtn);
        
        // 添加新的事件监听器
        newStartBtn.addEventListener('click', openLevelScreen);
    }
}

// 更新页码指示器
function updatePageIndicator() {
    const pageIndicator = document.getElementById('page-indicator');
    if (pageIndicator) {
        pageIndicator.textContent = `第 ${currentPage}/${totalPages} 页`;
    }
    
    // 更新按钮状态
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    
    if (prevPageBtn) {
        prevPageBtn.disabled = (currentPage <= 1);
    }
    
    if (nextPageBtn) {
        nextPageBtn.disabled = (currentPage >= totalPages);
    }
}

// 渲染当前页的关卡
async function renderLevelPage() {
    const levelGrid = document.getElementById('level-grid');
    if (!levelGrid) return;
    
    levelGrid.innerHTML = '';
    
    try {
        const chapters = await getAvailableChapters();
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
                    loadWordsByChapter(chapter);
                    
                    // 设置难度和板大小
                    boardSize = parseInt(document.getElementById('board-size').value);
                    difficulty = document.getElementById('difficulty').value;
                    
                    // 切换到游戏界面
                    document.getElementById('level-screen').style.display = 'none';
                    document.getElementById('game-screen').style.display = 'block';
                    document.getElementById('game-screen').classList.add('screen-fade-in');
                    
                    // 初始化游戏
                    initGame();
                } else {
                    showErrorToast('需要先完成前一关才能解锁此关卡');
                }
            });
            
            levelGrid.appendChild(levelItem);
        }
        
        // 保存关卡数据
        saveLevelData();
        
    } catch (error) {
        console.error("渲染关卡页面失败:", error);
        showErrorToast("加载关卡数据失败");
    }
}

// 获取星级HTML
function getStarsHTML(stars) {
    let html = '';
    for (let i = 1; i <= 3; i++) {
        html += `<span class="star ${i <= stars ? 'filled' : ''}">★</span>`;
    }
    return html;
}

// 打开关卡选择界面
function openLevelScreen() {
    // 准备单词数据 - 确保数据已加载
    if (Object.keys(excelData).length === 0) {
        showErrorToast('没有可用的单词数据，请稍后再试');
        return;
    }
    
    // 重置为第一页
    currentPage = 1;
    renderLevelPage();
    updatePageIndicator();
    
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('level-screen').style.display = 'block';
    document.getElementById('level-screen').classList.add('screen-fade-in');
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
        if (percentage >= SCORE_SETTINGS.starThresholds[0]) newStars = 1;
        if (percentage >= SCORE_SETTINGS.starThresholds[1]) newStars = 2;
        if (percentage >= SCORE_SETTINGS.starThresholds[2]) newStars = 3;
        
        // 只更新更高的星级
        if (newStars > levelInfo.stars) {
            levelInfo.stars = newStars;
        }
        
        // 立即解锁下一关，使用现有的excelData
        const chapters = Object.keys(excelData);
        const currentIndex = chapters.indexOf(currentLevel);
        
        console.log("当前关卡索引:", currentIndex, "总章节数:", chapters.length);
        
        if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
            const nextChapter = chapters[currentIndex + 1];
            console.log("下一关:", nextChapter);
            
            if (levelData.levels[nextChapter]) {
                levelData.levels[nextChapter].unlocked = true;
                console.log("下一关已存在，已解锁");
            } else {
                // 如果下一关卡数据不存在，创建它
                levelData.levels[nextChapter] = {
                    unlocked: true,
                    completed: false,
                    stars: 0,
                    highScore: 0,
                    bestTime: 0
                };
                console.log("下一关不存在，已创建并解锁");
            }
        } else {
            console.log("没有下一关或无法确定当前关卡位置");
        }
    }
    
    // 保存关卡数据
    saveLevelData();
    console.log("关卡数据已保存，当前状态:", levelData);
}

// 保存关卡数据
function saveLevelData() {
    storageUtils.save('word-game-level-data', levelData);
}

// 加载关卡数据
function loadLevelData() {
    const savedData = storageUtils.load('word-game-level-data', null);
    if (savedData) {
        levelData = savedData;
        console.log("成功加载关卡数据:", levelData);
    } else {
        console.log("未找到保存的关卡数据，使用默认设置");
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