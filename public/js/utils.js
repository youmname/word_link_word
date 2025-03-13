// 通用工具函数

// 打乱数组（Fisher-Yates洗牌算法）
function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 显示加载遮罩
function showLoading(message = '正在加载...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.querySelector('.loading-text').textContent = message;
        loadingOverlay.classList.add('active');
    }
}

// 隐藏加载遮罩
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

// 显示错误提示
function showErrorToast(message, duration = 3000, type = 'error') {
    const errorToast = document.getElementById('error-toast');
    if (!errorToast) return;
    
    errorToast.textContent = message;
    
    // 根据消息类型设置不同的样式
    if (type === 'error') {
        errorToast.style.backgroundColor = 'rgba(231, 76, 60, 0.9)';
    } else if (type === 'success') {
        errorToast.style.backgroundColor = 'rgba(46, 204, 113, 0.9)';
    } else if (type === 'warning') {
        errorToast.style.backgroundColor = 'rgba(243, 156, 18, 0.9)';
    }
    
    errorToast.classList.add('active');
    
    setTimeout(() => {
        errorToast.classList.remove('active');
    }, duration);
}

// 显示自定义模态对话框
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

// 获取元素在指定容器内的绝对位置
function getElementPositionInContainer(element, container) {
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    return {
        left: elementRect.left - containerRect.left,
        top: elementRect.top - containerRect.top,
        width: elementRect.width,
        height: elementRect.height,
        centerX: elementRect.left - containerRect.left + elementRect.width / 2,
        centerY: elementRect.top - containerRect.top + elementRect.height / 2
    };
}

// 创建CSS动画
function createAnimation(element, keyframes, options) {
    return element.animate(keyframes, options);
}

// 防止按钮重复点击
function debounceButton(button, delay = 300) {
    if (button.disabled) return;
    
    button.disabled = true;
    setTimeout(() => {
        button.disabled = false;
    }, delay);
}

// 本地存储操作工具
const storageUtils = {
    // 保存数据到本地存储
    save: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`保存数据失败: ${e.message}`);
            return false;
        }
    },
    
    // 从本地存储加载数据
    load: function(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`加载数据失败: ${e.message}`);
            return defaultValue;
        }
    },
    
    // 从本地存储删除数据
    remove: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`删除数据失败: ${e.message}`);
            return false;
        }
    }
};