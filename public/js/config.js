// 游戏配置和常量

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

// 音效文件路径配置
const SOUND_FILES = {
    click: 'sounds/click.mp3',
    correct: 'sounds/correct.mp3',
    incorrect: 'sounds/incorrect.mp3',
    hint: 'sounds/hint.mp3',
    shuffle: 'sounds/shuffle.mp3',
    win: 'sounds/win.mp3',
    gameover: 'sounds/gameover.mp3'
};

// 游戏难度配置
const DIFFICULTY_SETTINGS = {
    easy: {
        timeLimit: 180,
        hintPenalty: 5,
        shufflePenalty: 10
    },
    normal: {
        timeLimit: 120,
        hintPenalty: 10,
        shufflePenalty: 20
    },
    hard: {
        timeLimit: 90,
        hintPenalty: 15,
        shufflePenalty: 30
    }
};

// 分数配置
const SCORE_SETTINGS = {
    basePoints: 10,     // 基础分数
    comboMultiplier: 5, // 连击倍率
    timeBonus: 0.1,     // 时间奖励系数
    starThresholds: [0.3, 0.6, 0.8] // 星级阈值（百分比）
};

// API配置
const API_ENDPOINTS = {
    allWords: '/api/words',
    chapters: '/api/chapters',
    wordsByChapter: (chapter) => `/api/words?chapter=${chapter}`
};