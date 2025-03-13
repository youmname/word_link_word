// 音效系统

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

// 音效是否启用
let soundEnabled = true;

// 初始化音效系统
function initSounds() {
    console.log("初始化音效系统...");
    
    // 预加载音效
    for (const [name, path] of Object.entries(SOUND_FILES)) {
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
    
    // 创建音效控制按钮
    createSoundToggle();
}

// 创建音效开关按钮
function createSoundToggle() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    // 检查是否已存在音效按钮
    if (document.querySelector('.sound-toggle')) return;
    
    // 创建音效开关按钮
    const soundToggle = document.createElement('button');
    soundToggle.className = 'btn sound-toggle';
    soundToggle.innerHTML = '🔊';
    soundToggle.title = "音效开关";
    
    // 加载保存的音效设置
    soundEnabled = storageUtils.load('sound-enabled', true);
    soundToggle.innerHTML = soundEnabled ? '🔊' : '🔇';
    
    // 添加点击事件
    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.innerHTML = soundEnabled ? '🔊' : '🔇';
        
        // 保存设置
        storageUtils.save('sound-enabled', soundEnabled);
        
        // 播放点击音效（如果启用）
        if (soundEnabled) {
            playSound('click');
        }
    });
    
    container.appendChild(soundToggle);
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

// 测试所有音效
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
    
    // 确保音效已启用
    const originalState = soundEnabled;
    soundEnabled = true;
    
    // 开始测试
    playNext();
    
    // 测试完成后恢复原始状态
    setTimeout(() => {
        soundEnabled = originalState;
    }, soundTypes.length * 1000 + 100);
}

// 添加音效测试按钮（仅在开发环境中使用）
function addSoundTestButton() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    const testBtn = document.createElement('button');
    testBtn.className = 'btn';
    testBtn.textContent = '测试音效';
    testBtn.style.position = 'absolute';
    testBtn.style.top = '20px';
    testBtn.style.left = '20px';
    testBtn.style.zIndex = '1000';
    
    testBtn.addEventListener('click', () => {
        testSoundEffects();
    });
    
    container.appendChild(testBtn);
}