// 主入口文件

// 当DOM加载完成后执行初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化音效系统
    initSounds();
    
    // 初始化UI组件
    initThemeSelector();
    initDataSourceSelector();
    createHelpButton();
    
    // 初始化所有事件监听
    initEventListeners();

    // 初始化键盘快捷键
    initKeyboardShortcuts();
    
    // 加载单词数据
    loadWordsData().then(() => {
        // 在单词数据加载完成后初始化关卡系统
        setTimeout(() => {
            initLevelSystem();
        }, 500);
    });
    
    // 为主界面添加淡入动画
    document.querySelector('.container').classList.add('fade-in');
});

// 如果是开发环境，可以添加测试功能
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.addEventListener('load', () => {
        // 添加音效测试按钮（仅开发环境）
        addSoundTestButton();
        
        // 添加调试函数到全局作用域
        window.debugGame = {
            resetLevelData: resetLevelData,
            testSoundEffects: testSoundEffects
        };
        
        console.log('调试模式已启用，可以使用window.debugGame对象访问调试功能');
    });
}