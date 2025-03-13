// 路径寻找算法

// 路径缓存，用于优化性能
let pathCache = {};

// 清除路径缓存
function clearPathCache() {
    pathCache = {};
}

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

// 寻找有效路径（带缓存）
function findValidPath(card1Row, card1Col, card2Row, card2Col) {
    // 创建缓存键
    const cacheKey = `${card1Row},${card1Col}-${card2Row},${card2Col}`;
    const reverseCacheKey = `${card2Row},${card2Col}-${card1Row},${card1Col}`;
    
    // 先检查路径缓存
    let path = pathCache[cacheKey] || pathCache[reverseCacheKey];
    
    if (path) {
        return path;
    }
    
    // 缓存中没有，使用最短路径算法
    path = findShortestPath(card1Row, card1Col, card2Row, card2Col);
    
    // 验证路径是否有效（最多2个拐点）
    if (path && isValidPath(path)) {
        // 如果找到有效路径，存入缓存
        pathCache[cacheKey] = path;
        return path;
    }
    
    return null;
}

// 显示连接路径动画
function showConnectionPath(path) {
    removeConnectors();
    
    // 获取游戏板的实际位置和尺寸
    const gameBoard = document.getElementById('game-board');
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

// 检查是否有可能的匹配
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
    clearPathCache();
    
    // 检查每对卡片是否可以连接
    for (let i = 0; i < unmatchedCards.length; i++) {
        for (let j = i + 1; j < unmatchedCards.length; j++) {
            const card1 = unmatchedCards[i];
            const card2 = unmatchedCards[j];
            
            if (card1.id === card2.id && card1.type !== card2.type) {
                const path = findValidPath(card1.row, card1.col, card2.row, card2.col);
                
                if (path) {
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