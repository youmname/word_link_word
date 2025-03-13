// 游戏核心逻辑

// 游戏状态变量
let guanqia = 1;                 // 当前关卡
let wordPairs = [];              // 单词对列表
let timeLimit = 60;              // 时间限制（秒）
let timer;                       // 计时器
let matchedPairs = 0;            // 已匹配的对数
let score = 0;                   // 当前分数
let combo = 0;                   // 连击数
let maxCombo = 0;                // 最大连击数
let boardSize = 8;               // 游戏板大小
let difficulty = 'normal';       // 游戏难度
let boardMatrix = [];            // 游戏板矩阵
let firstSelection = null;       // 第一次选择的卡片
let connectors = [];             // 连接线列表
let isGameOver = false;          // 游戏是否结束
let hintUsed = 0;                // 使用提示次数
let shuffleCount = 0;            // 洗牌次数
let isLoading = false;           // 是否正在加载中

// 游戏初始化
function initGame() {
    isGameOver = false;
    matchedPairs = 0;
    score = 0;
    combo = 0;
    maxCombo = 0;
    hintUsed = 0;
    shuffleCount = 0;
    clearPathCache(); // 重置路径缓存
    
    // 根据难度设置时间限制
    timeLimit = DIFFICULTY_SETTINGS[difficulty].timeLimit;
    
    startTimer();
    setupGameBoard();
    updateUI();

    // 初始化键盘快捷键
    cleanupKeyboardShortcuts(); // 先清除旧的监听器
    initKeyboardShortcuts();    // 再添加新的监听器
    
    // 检查初始游戏板是否有可连接的卡片
    setTimeout(() => {
        const hasMatch = checkForPossibleMatches();
        // 如果没有可连接的卡片，强制洗牌
        if (!hasMatch) {
            shuffleBoard(true);
        }
    }, 500);
}

// 开始计时器
function startTimer() {
    clearInterval(timer);
    const timeDisplay = document.getElementById('time');
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

// 设置游戏板
function setupGameBoard() {
    const gameBoard = document.getElementById('game-board');
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
}

// 选择卡片
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
            
            // 查找两卡片间的有效路径
            const path = findValidPath(firstRow, firstCol, secondRow, secondCol);
            
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

// 检查卡片是否匹配
function isValidPair(card1, card2) {
    // 检查ID是否相同且类型不同
    return card1.dataset.id === card2.dataset.id && 
           card1.dataset.type !== card2.dataset.type;
}

// 洗牌游戏板
function shuffleBoard(isAuto) {
    // 如果是游戏结束、没有未匹配的卡片或正在加载中，不洗牌
    if (isGameOver || matchedPairs >= wordPairs.length || isLoading) {
        return;
    }
    
    isLoading = true;
    shuffleCount++;
    
    // 显示加载动画
    showLoading('正在洗牌...');
    
    // 播放洗牌音效
    playSound('shuffle');
    
    // 收集所有未匹配的卡片
    const unmatchedCardElements = [];
    const unmatchedCards = [];
    const emptyPositions = [];
    
    // 只洗牌内部的卡片（不包含边界）
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
                // 标记位置为空
                boardMatrix[r][c] = null;
            } else if (!boardMatrix[r][c] || boardMatrix[r][c].isEmpty) {
                // 收集空位置
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
                hideLoading();
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
                    matched: false,
                    isEmpty: false
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
                hideLoading();
                
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
                    score = Math.max(0, score - DIFFICULTY_SETTINGS[difficulty].shufflePenalty);
                    updateUI();
                }
                
                // 清除路径缓存，因为卡片位置已更改
                clearPathCache();
                
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

// 显示提示
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
                    const path = findValidPath(card1.row, card1.col, card2.row, card2.col);
                    
                    if (path) {
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
    
    // 使用提示扣分
    if (foundMatch) {
        hintUsed++;
        score = Math.max(0, score - DIFFICULTY_SETTINGS[difficulty].hintPenalty);
        updateUI();
    }
    
    // 如果没有可连接的卡片，建议洗牌
    if (!foundMatch) {
        showCustomModal("没有可连接的卡片", "将自动重新洗牌。", () => {
            shuffleBoard(true);
        });
    }
}

// 更新分数
function updateScore(isCorrect) {
    if (isCorrect) {
        // 匹配成功
        // 基础分 + 连击奖励 + 时间奖励
        const basePoints = SCORE_SETTINGS.basePoints;
        const comboBonus = combo * SCORE_SETTINGS.comboMultiplier;
        const timeBonus = Math.floor(timeLimit * SCORE_SETTINGS.timeBonus);
        
        const points = basePoints + comboBonus + timeBonus;
        score += points;
        
        // 显示加分动画
        showPointsAnimation(points);
    }
    
    updateUI();
}

// 加分动画
function showPointsAnimation(points) {
    if (!firstSelection) return;
    
    const gameBoard = document.getElementById('game-board');
    
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
function gameOver(isWin) {
    clearInterval(timer);
    isGameOver = true;
    
    // 播放结束音效
    playSound(isWin ? 'win' : 'gameover');
    
    // 更新结果界面
    const finalScoreDisplay = document.getElementById('final-score');
    const timeLeftDisplay = document.getElementById('time-left');
    const maxComboDisplay = document.getElementById('max-combo');
    const resultTitle = document.getElementById('result-title');
    const star1 = document.getElementById('star1');
    const star2 = document.getElementById('star2');
    const star3 = document.getElementById('star3');
    const nextLevelBtn = document.getElementById('next-level-btn');
    
    finalScoreDisplay.textContent = score;
    timeLeftDisplay.textContent = timeLimit;
    maxComboDisplay.textContent = maxCombo;
    
    // 计算星级
    const maxScore = wordPairs.length * 30; // 理想满分
    const percentage = score / maxScore;
    
    let stars = 0;
    if (percentage >= SCORE_SETTINGS.starThresholds[0]) stars = 1;
    if (percentage >= SCORE_SETTINGS.starThresholds[1]) stars = 2;
    if (percentage >= SCORE_SETTINGS.starThresholds[2] || isWin) stars = 3;
    
    // 显示星星
    star1.classList.toggle('filled', stars >= 1);
    star2.classList.toggle('filled', stars >= 2);
    star3.classList.toggle('filled', stars >= 3);
    
    // 设置标题
    resultTitle.textContent = isWin ? "恭喜完成!" : "时间到!";
    
    // 更新关卡状态
    updateLevelCompletion(isWin);
    
    // 显示下一关按钮（如果适用）
    if (isWin) {
        console.log("游戏胜利，检查下一关是否可用");
        const isNextAvailable = isNextLevelAvailable();
        console.log("下一关是否可用:", isNextAvailable);
        
        if (isNextAvailable) {
            nextLevelBtn.style.display = 'inline-block';
            console.log("已设置下一关按钮为可见");
        } else {
            nextLevelBtn.style.display = 'none';
            console.log("已设置下一关按钮为隐藏 - 无下一关");
        }
    } else {
        nextLevelBtn.style.display = 'none';
        console.log("游戏失败，隐藏下一关按钮");
    }
    
    // 显示结果弹窗
    const resultModal = document.getElementById('result-modal');
    resultModal.classList.add('active');
    
    // 如果获胜，显示庆祝特效
    if (isWin) {
        createConfetti();
    }
}

// 检查是否有下一关可用
function isNextLevelAvailable() {
    const currentLevel = levelData.currentLevel;
    if (!currentLevel) return false;
    
    const chapters = Object.keys(excelData);
    const currentIndex = chapters.indexOf(currentLevel);
    
    return (currentIndex >= 0 && currentIndex < chapters.length - 1 && 
            levelData.levels[chapters[currentIndex + 1]]?.unlocked);
}

// 创建彩花效果
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

// 重置游戏
function resetGame() {
    const resultModal = document.getElementById('result-modal');
    const nextLevelBtn = document.getElementById('next-level-btn');
    
    nextLevelBtn.style.display = 'none';
    resultModal.classList.remove('active');
    clearInterval(timer);
    removeConnectors();
    
    // 移除键盘事件监听
    cleanupKeyboardShortcuts();

    // 添加淡入动画
    const gameScreen = document.getElementById('game-screen');
    gameScreen.classList.remove('screen-fade-in');
    void gameScreen.offsetWidth; // 触发重排，重置动画
    gameScreen.classList.add('screen-fade-in');
    
    initGame();
}

// 返回主菜单
function goBack() {
    const resultModal = document.getElementById('result-modal');
    const nextLevelBtn = document.getElementById('next-level-btn');
    const gameScreen = document.getElementById('game-screen');
    const startScreen = document.getElementById('start-screen');
    
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

// 进入下一关
function goToNextLevel() {
    const resultModal = document.getElementById('result-modal');
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
            loadWordsByChapter(nextChapter);
            
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

// 准备游戏数据
function prepareWordData() {
    const dataSource = document.querySelector('input[name="data-source"]:checked').value;
    
    if (dataSource === 'custom') {
        // 使用用户输入的内容
        const wordInput = document.getElementById('word-input');
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
        // 从服务器按章节加载数据
        const chapter = document.getElementById('chapter-select').value;
        return loadWordsByChapter(chapter);
    } else if (dataSource === 'random') {
        // 随机加载数据
        const count = parseInt(document.getElementById('random-count').value);
        return loadRandomWords(count);
    }
    
    return false;
}

// 清理键盘快捷键
function cleanupKeyboardShortcuts() {
    document.removeEventListener('keydown', handleKeyPress);
}

// 开始游戏前的检查
function startGame() {
    // 准备单词数据
    if (!prepareWordData()) {
        return;
    }
    
    boardSize = parseInt(document.getElementById('board-size').value);
    difficulty = document.getElementById('difficulty').value;
    
    // 根据难度设置时间
    timeLimit = DIFFICULTY_SETTINGS[difficulty].timeLimit;
    
    // 切换界面
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('game-screen').classList.add('screen-fade-in'); // 添加淡入动画
    
    // 初始化键盘快捷键
    initKeyboardShortcuts();

    // 初始化游戏
    initGame();
}