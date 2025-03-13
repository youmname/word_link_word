// 用户界面处理

// 更新UI元素
function updateUI() {
    // 更新显示元素
    document.getElementById('score').textContent = score;
    document.getElementById('combo').textContent = combo;
    document.getElementById('matched-pairs').textContent = matchedPairs;
    document.getElementById('total-pairs').textContent = wordPairs.length;
    
    // 更新进度条
    const progress = (matchedPairs / wordPairs.length) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
}

// 更新章节选择器
function updateChapterSelector() {
    const chapterSelect = document.getElementById('chapter-select');
    if (!chapterSelect) return;
    
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

// 创建帮助按钮
function createHelpButton() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    // 检查是否已存在帮助按钮
    if (document.querySelector('.help-btn')) return;
    
    const helpBtn = document.createElement('button');
    helpBtn.className = 'btn help-btn';
    helpBtn.innerHTML = '?';
    helpBtn.title = "查看游戏规则";
    
    helpBtn.addEventListener('click', () => {
        document.getElementById('help-modal').classList.add('active');
    });
    
    container.appendChild(helpBtn);
    
    // 更新帮助对话框，添加快捷键信息
    updateHelpModalWithShortcuts();
}

// 更新帮助对话框内容
function updateHelpModalWithShortcuts() {
    // 关闭帮助按钮事件监听
    const closeHelpBtn = document.getElementById('close-help-btn');
    if (closeHelpBtn) {
        closeHelpBtn.addEventListener('click', function() {
            document.getElementById('help-modal').classList.remove('active');
        });
    }
}

// 初始化键盘快捷键
function initKeyboardShortcuts() {
    // 添加全局键盘事件监听
    document.addEventListener('keydown', handleKeyPress);
}

// 键盘事件处理函数
function handleKeyPress(event) {
    // 只有在游戏进行中才处理键盘事件
    if (document.getElementById('game-screen').style.display === 'none' || isGameOver || isLoading) {
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

// 初始化主题选择器
function initThemeSelector() {
    const themeSelector = document.getElementById('theme-selector');
    const customBgUpload = document.getElementById('custom-bg-upload');
    
    if (!themeSelector || !customBgUpload) return;
    
    // 加载保存的主题
    try {
        const savedTheme = storageUtils.load('preferred-theme', 'default');
        themeSelector.value = savedTheme;
        
        applyTheme(savedTheme);
        
        if (savedTheme === 'custom') {
            customBgUpload.style.display = 'block';
            // 加载保存的自定义背景
            const customBg = storageUtils.load('custom-background', null);
            if (customBg) {
                document.body.style.background = `url(${customBg})`;
            }
        }
    } catch (e) {
        console.warn('主题加载失败', e);
    }
    
    // 主题选择事件监听
    themeSelector.addEventListener('change', function() {
        const theme = this.value;
        applyTheme(theme);
        
        // 保存用户选择的主题
        storageUtils.save('preferred-theme', theme);
    });
    
    // 处理自定义背景上传
    const bgUpload = document.getElementById('bg-upload');
    if (bgUpload) {
        bgUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        document.body.style.background = `url(${e.target.result})`;
                        document.body.classList.add('theme-custom');
                        
                        // 尝试保存自定义背景
                        try {
                            storageUtils.save('custom-background', e.target.result);
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
    }
}

// 应用主题
function applyTheme(theme) {
    const customBgUpload = document.getElementById('custom-bg-upload');
    
    // 重置所有主题相关的类名和背景
    document.body.className = '';
    document.body.style.background = '';
    
    if (theme === 'custom') {
        if (customBgUpload) customBgUpload.style.display = 'block';
        
        // 如果已经有保存的自定义背景，则应用它
        try {
            const customBg = storageUtils.load('custom-background', null);
            if (customBg) {
                document.body.style.background = `url(${customBg})`;
                document.body.classList.add('theme-custom');
            }
        } catch (e) {
            showErrorToast('背景图片加载失败，请重新上传较小的图片');
        }
    } else {
        if (customBgUpload) customBgUpload.style.display = 'none';
        document.body.classList.add('theme-' + theme);
    }
}

// 初始化数据源选择器
function initDataSourceSelector() {
    // 处理数据源选择
    const radioButtons = document.querySelectorAll('input[name="data-source"]');
    if (radioButtons.length === 0) return;
    
    radioButtons.forEach(radio => {
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
    
    // 添加Excel文件上传处理器
    const excelUpload = document.getElementById('excel-upload');
    if (excelUpload) {
        excelUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                handleExcelUpload(file)
                    .then(uploadedData => {
                        // 切换到章节选择器
                        document.querySelector('input[name="data-source"][value="chapter"]').checked = true;
                        document.getElementById('upload-selector').style.display = 'none';
                        document.getElementById('chapter-selector').style.display = 'block';
                    })
                    .catch(error => {
                        showErrorToast('Excel文件解析失败: ' + error.message);
                    });
            }
        });
    }
    
    // 使用示例数据按钮
    const sampleBtn = document.getElementById('sample-btn');
    if (sampleBtn) {
        sampleBtn.addEventListener('click', () => {
            const wordInput = document.getElementById('word-input');
            if (wordInput) {
                wordInput.value = SAMPLE_DATA;
            }
        });
    }
}

// 初始化所有事件监听
function initEventListeners() {
    // 开始游戏按钮
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }
    
    // 洗牌按钮
    const shuffleBtn = document.getElementById('shuffle-btn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => shuffleBoard(false));
    }
    
    // 重新开始按钮
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', resetGame);
    }
    
    // 提示按钮
    const hintBtn = document.getElementById('hint-btn');
    if (hintBtn) {
        hintBtn.addEventListener('click', showHint);
    }
    
    // 返回按钮
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', goBack);
    }
    
    // 再玩一次按钮
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', resetGame);
    }
    
    // 返回菜单按钮
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', goBack);
    }
    
    // 下一关按钮
    const nextLevelBtn = document.getElementById('next-level-btn');
    if (nextLevelBtn) {
        nextLevelBtn.addEventListener('click', goToNextLevel);
    }
}