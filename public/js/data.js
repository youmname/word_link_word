// 修改这里的BASE_URL为您的服务器地址
// const API_BASE_URL = 'http://175.24.181.59:3000/api';
const API_BASE_URL = 'https://cors-anywhere.herokuapp.com/http://175.24.181.59:3000/api';

// 加载单词数据（从服务器获取）
async function loadWordsData() {
    try {
        // 显示加载动画
        showLoading('正在加载数据...');
        
        // 获取所有章节
        const chaptersResponse = await fetch(`${API_BASE_URL}/chapters`);
        
        if (!chaptersResponse.ok) {
            throw new Error(`获取章节失败: ${chaptersResponse.status}`);
        }
        
        const chaptersData = await chaptersResponse.json();
        
        // 初始化excelData对象
        excelData = {};
        
        // 获取每个章节的单词
        for (const chapterObj of chaptersData) {
            const chapterNum = chapterObj.chapter;
            const chapterKey = `第${chapterNum}章`;
            
            const wordsResponse = await fetch(`${API_BASE_URL}/chapters/${chapterNum}`);
            
            if (!wordsResponse.ok) {
                console.error(`获取第${chapterNum}章单词失败: ${wordsResponse.status}`);
                continue;
            }
            
            const wordsData = await wordsResponse.json();
            
            // 转换为应用需要的格式
            excelData[chapterKey] = wordsData.map(item => ({
                word: item.word,
                definition: item.definition
            }));
        }
        
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
        const response = await fetch(`${API_BASE_URL}/chapters`);
        
        if (!response.ok) {
            throw new Error(`获取章节失败: ${response.status}`);
        }
        
        const chaptersData = await response.json();
        
        // 转换为应用需要的格式
        return chaptersData.map(item => `第${item.chapter}章`);
    } catch (error) {
        console.error("获取章节列表失败:", error);
        return Object.keys(excelData);
    }
}

// 从API获取随机单词
async function fetchRandomWords(count, chapter = null) {
    try {
        let url = `${API_BASE_URL}/words/random?count=${count}`;
        if (chapter !== null) {
            // 从"第X章"格式中提取数字
            const chapterNum = parseInt(chapter.match(/\d+/)[0]);
            url += `&chapter=${chapterNum}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`获取随机单词失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 转换为应用需要的格式
        return data.map(item => ({
            word: item.word,
            definition: item.definition
        }));
    } catch (error) {
        console.error("获取随机单词失败:", error);
        return [];
    }
}