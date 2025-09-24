// script.js
// يجب أن يكون الخادم (server.js) يعمل وأن يكون ملف socket.io.js مضافاً في index.html

// 1. إعداد الاتصال والثوابت
const SOCKET_SERVER_URL = 'http://localhost:3000'; 
const GAME_DURATION = 60; // 60 ثانية للعبة

// يرجى تغيير العنوان إذا لم يكن الخادم يعمل محلياً أو على نفس المنفذ
const socket = io(SOCKET_SERVER_URL); 

// حالة المستخدم واللعبة (يتم تحديثها من الخادم)
let currentLoggedInUser = null;
let currentRole = null;
let activePlayersData = []; 
let gameTimerInterval = null;
let gameTimeRemaining = 0;
let currentPlayerPlaying = null; 
let currentPlayerWordCount = 0; 
const gameWords = ["برمجة", "تطوير", "جافاسكريبت", "قاعدة", "بيانات", "خوارزمية", "واجهة", "مستخدم", "خادم", "شبكة", "إخراج", "أتمتة", "تطبيق", "سحابية", "خلفية"];
let currentWordIndex = 0;


// 2. العناصر الرئيسية في DOM (كما في الكود الأصلي)
const loginScreen = document.getElementById('login-screen');
const adminScreen = document.getElementById('admin-screen');
const playerScreen = document.getElementById('player-screen');
const spectatorScreen = document.getElementById('spectator-screen');

const usernameInput = document.getElementById('username-input');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');

const adminNameSpan = document.getElementById('admin-name');
const playerWelcome = document.getElementById('player-welcome');
const playerRoleInfo = document.getElementById('player-role-info');

// قوائم اللاعبين
const playerListAdmin = document.getElementById('player-list-admin');
const blueTeamList = document.getElementById('blue-team-list');
const redTeamList = document.getElementById('red-team-list');
const blueTeamListSpectator = document.getElementById('blue-team-list-spectator');
const redTeamListSpectator = document.getElementById('red-team-list-spectator');

// نقاط الفرق
const blueTeamPointsSpan = document.getElementById('blue-team-points');
const redTeamPointsSpan = document.getElementById('red-team-points');
const blueTeamPointsSpectatorSpan = document.getElementById('blue-team-points-spectator');
const redTeamPointsSpectatorSpan = document.getElementById('red-team-points-spectator');

// التحكم باللعبة (الادمن)
const startWordGameButton = document.getElementById('start-word-game-button');
const wordGameAdminControls = document.getElementById('word-game-admin-controls');
const currentPlayerForGameSpan = document.getElementById('current-player-for-game');
const currentWordDisplayAdmin = document.getElementById('current-word-display-admin');
const adminTimerDisplay = document.getElementById('admin-timer-display');
const nextWordButton = document.getElementById('next-word-button');
const endGameButton = document.getElementById('end-game-button');

// تعديل النقاط والطرد (الادمن)
const selectPlayerForPoints = document.getElementById('select-player-for-points');
const pointsAmountInput = document.getElementById('points-amount');
const addPointsButton = document.getElementById('add-points-button');
const subtractPointsButton = document.getElementById('subtract-points-button');
// يجب إضافة قائمة اختيار الطرد في HTML لتكون وظيفية بشكل كامل
const selectPlayerForKick = document.getElementById('select-player-for-kick'); 
const kickPlayerButton = document.getElementById('kick-player-button'); // يجب إضافة هذا الزر أيضاً

// عرض اللعبة (اللاعب)
const wordGamePlayerDisplay = document.getElementById('word-game-player-display');
const currentWordDisplayPlayer = document.getElementById('current-word-display-player');
const playerTimerDisplay = document.getElementById('player-timer-display');

// أزرار تسجيل الخروج
const logoutButtonAdmin = document.getElementById('logout-button-admin');
const logoutButtonPlayer = document.getElementById('logout-button-player');
const logoutButtonSpectator = document.getElementById('logout-button-spectator');


// =========================================================
// 3. وظائف التحكم بالواجهة (Rendering Functions)
// =========================================================

// وظيفة لعرض الشاشات
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// تحديث قائمة اللاعبين في شاشة الادمن (مُرسل إليها من الخادم)
function updateAdminPlayerList() {
    playerListAdmin.innerHTML = '';
    selectPlayerForPoints.innerHTML = '<option value="">اختر لاعبًا</option>';
    // افتراض وجود عنصر selectPlayerForKick في HTML
    if (selectPlayerForKick) selectPlayerForKick.innerHTML = '<option value="">اختر لاعبًا</option>'; 

    const playersToManage = activePlayersData.filter(p => p.role === 'player');

    playersToManage.forEach(player => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span class="player-info">${player.name} (${player.team ? (player.team === 'blue' ? 'أزرق' : 'أحمر') : 'بدون فريق'}) - النقاط: ${player.points}</span>
            <div class="team-buttons">
                <button class="blue-button" onclick="assignTeam('${player.id}', 'blue')">فريق أزرق</button>
                <button class="red-button" onclick="assignTeam('${player.id}', 'red')">فريق أحمر</button>
                <button class="kick-button" style="background-color: #6c757d;" onclick="kickPlayer('${player.id}')">طرد</button>
            </div>
        `;
        playerListAdmin.appendChild(listItem);

        // قوائم الاختيار للنقاط والطرد
        const optionPoint = document.createElement('option');
        optionPoint.value = player.id;
        optionPoint.textContent = player.name;
        selectPlayerForPoints.appendChild(optionPoint);
        
        if (selectPlayerForKick) {
            const optionKick = optionPoint.cloneNode(true);
            selectPlayerForKick.appendChild(optionKick);
        }
    });

    // تحديث قائمة اللاعبين للاختيار لبدء اللعبة
    updateGamePlayerSelect(playersToManage);
}

// تحديث عرض الفرق للاعبين والمشاهدين (مُرسل إليها من الخادم)
function updatePlayerTeamDisplays(players, teams) {
    blueTeamList.innerHTML = '';
    redTeamList.innerHTML = '';
    blueTeamListSpectator.innerHTML = '';
    redTeamListSpectator.innerHTML = '';

    players.forEach(player => {
        // إضافة فقط اللاعبين ذوي الدور 'player' إلى قوائم الفرق
        if (player.role === 'player') { 
            const listItem = document.createElement('li');
            // إظهار اسم اللاعب ونقاطه فقط
            listItem.textContent = `${player.name} (${player.points} نقطة)`;
            
            if (player.team === 'blue') {
                blueTeamList.appendChild(listItem.cloneNode(true));
                blueTeamListSpectator.appendChild(listItem);
            } else if (player.team === 'red') {
                redTeamList.appendChild(listItem.cloneNode(true));
                redTeamListSpectator.appendChild(listItem);
            }
        }
    });

    blueTeamPointsSpan.textContent = teams.blue;
    redTeamPointsSpan.textContent = teams.red;
    blueTeamPointsSpectatorSpan.textContent = teams.blue;
    redTeamPointsSpectatorSpan.textContent = teams.red;
}

// تحديث معلومات اللاعب الحالي إذا كان لاعبًا
function updateCurrentPlayerInfo(player) {
    if (currentRole === 'player') {
        playerWelcome.querySelector('span').textContent = player.name;
        playerRoleInfo.textContent = `دورك: لاعب | فريقك: ${player.team ? (player.team === 'blue' ? 'أزرق' : 'أحمر') : 'لم يتم التحديد'} | نقاطك: ${player.points}`;
    }
}

// تحديث قائمة اختيار اللاعب لبدء جولة الكلمات (للمدير)
function updateGamePlayerSelect(players) {
    // يمكن هنا عرض قائمة لاختيار لاعب معين لبدء الجولة يدوياً (ميزة إضافية)
    // لكن للاحتفاظ بالمنطق القديم: يتم الاختيار عشوائياً عند الضغط على الزر
}


// =========================================================
// 4. وظائف الإرسال إلى الخادم (Client to Server)
// =========================================================

// وظيفة الإرسال لتوزيع الفريق
window.assignTeam = (playerId, team) => {
    socket.emit('assignTeam', { playerId, team });
};

// وظيفة الإرسال للطرد
window.kickPlayer = (playerId) => {
    if (confirm('هل أنت متأكد من طرد هذا اللاعب؟')) {
        socket.emit('kickPlayer', playerId);
    }
};

// وظيفة تسجيل الخروج الموحدة
function logout() {
    // قطع الاتصال بـ Socket.IO (سيؤدي إلى حذف اللاعب من قائمة الخادم)
    socket.disconnect(); 
    
    currentLoggedInUser = null;
    currentRole = null;
    usernameInput.value = '';
    
    // إخفاء شاشات اللعبة والمحتوى
    wordGameAdminControls.style.display = 'none';
    startWordGameButton.style.display = 'block';
    wordGamePlayerDisplay.style.display = 'none';
    
    showScreen('login-screen');
    
    // إعادة الاتصال لتمكين تسجيل الدخول مرة أخرى
    // التأكد من أن السوكيت غير متصل قبل محاولة الاتصال
    if (!socket.connected) {
        socket.connect(); 
    }
}

// وظيفة بدء جولة الكلمات (يرسل الأمر للخادم)
function startWordGame() {
    const eligiblePlayers = activePlayersData.filter(p => p.team && p.role === 'player');
    if (eligiblePlayers.length === 0) {
        alert('لا يوجد لاعبون في الفرق لبدء اللعبة!');
        return;
    }

    // الاختيار العشوائي للاعب
    currentPlayerPlaying = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
    currentWordIndex = 0;
    currentPlayerWordCount = 0;
    
    // إرسال طلب بدء الجولة للخادم، ليعلم الجميع من يلعب
    socket.emit('requestStartGame', { playerId: currentPlayerPlaying.id });
}

// دالة الكلمة التالية (المدير يخبر الخادم، والخادم يخبر اللاعب)
function requestNextWord() {
    if (currentWordIndex < gameWords.length) {
        const word = gameWords[currentWordIndex];
        currentWordIndex++;
        currentPlayerWordCount++; // زيادة عداد الكلمات المكتملة
        socket.emit('nextWord', { word: word, index: currentWordIndex });
    } else {
        socket.emit('endGame');
    }
}

// دالة إنهاء الجولة (المدير يخبر الخادم)
function requestEndGame() {
    socket.emit('endGame');
}

// =========================================================
// 5. استقبال الأحداث من الخادم (Server to Client)
// =========================================================

// عند استلام تحديثات الحالة (اللاعبين والنقاط)
socket.on('updateState', (data) => {
    activePlayersData = data.players;
    const teams = data.teams;
    
    updateAdminPlayerList();
    updatePlayerTeamDisplays(activePlayersData, teams);
    
    // تحديث معلومات المستخدم الحالي إن كان مازال متصلاً
    if (currentLoggedInUser) {
        const updatedPlayer = activePlayersData.find(p => p.id === currentLoggedInUser.id);
        if (updatedPlayer) {
            currentLoggedInUser = updatedPlayer; 
            updateCurrentPlayerInfo(updatedPlayer);
        }
    }
});

// معالجة الطرد من الخادم
socket.on('kicked', (message) => {
    alert(message);
    logout(); 
});

// استقبال أمر بدء اللعبة من الخادم (لجميع المتصلين)
socket.on('gameStarted', (data) => {
    currentPlayerPlaying = data.playerId;
    
    // إظهار شاشة التحكم للمدير
    if (currentRole === 'admin') {
        currentPlayerForGameSpan.textContent = activePlayersData.find(p => p.id === data.playerId)?.name || 'غير معروف';
        wordGameAdminControls.style.display = 'block';
        startWordGameButton.style.display = 'none';
        
        // إعادة تعيين المؤقت وبدء العد التنازلي
        gameTimeRemaining = GAME_DURATION;
        adminTimerDisplay.textContent = gameTimeRemaining;
        
        // إرسال الكلمة الأولى فوراً
        currentWordIndex = 0;
        currentPlayerWordCount = 0;
        requestNextWord(); 

        // بدء المؤقت للمدير
        clearInterval(gameTimerInterval);
        gameTimerInterval = setInterval(() => {
            gameTimeRemaining--;
            adminTimerDisplay.textContent = gameTimeRemaining;
            
            if (gameTimeRemaining <= 0) {
                requestEndGame(); // إرسال طلب إنهاء الجولة
            }
        }, 1000);
    }
    
    // إظهار شاشة اللعبة للاعب الحالي
    if (currentLoggedInUser && currentLoggedInUser.id === data.playerId) {
        wordGamePlayerDisplay.style.display = 'block';
    }
});

// استقبال الكلمة الجديدة من الخادم (لجميع المتصلين)
socket.on('newWord', ({ word, index }) => {
    currentWordDisplayAdmin.textContent = word;
    currentWordDisplayPlayer.textContent = word;
    
    // تحديث المؤقت للاعبين إذا كانت الجولة بدأت بالفعل
    if (currentLoggedInUser && currentLoggedInUser.id === currentPlayerPlaying) {
        playerTimerDisplay.textContent = gameTimeRemaining;
    }
});

// استقبال أمر إنهاء اللعبة من الخادم
socket.on('gameEnded', (data) => {
    clearInterval(gameTimerInterval);
    gameTimerInterval = null;

    if (currentRole === 'admin') {
        alert(`جولة الكلمات انتهت! اللاعب ${activePlayersData.find(p => p.id === data.playerId)?.name || 'غير معروف'} أكمل ${data.wordCount} كلمات وحصل على ${data.pointsAdded} نقطة.`);
        wordGameAdminControls.style.display = 'none';
        startWordGameButton.style.display = 'block';
    }
    
    currentWordDisplayAdmin.textContent = '';
    currentWordDisplayPlayer.textContent = '';
    wordGamePlayerDisplay.style.display = 'none'; 
    currentPlayerPlaying = null;
});


// =========================================================
// 6. معالجات الأحداث (Event Listeners)
// =========================================================

// تسجيل الدخول
loginButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        socket.emit('login', username); 
    }
});

// استقبال نتيجة تسجيل الدخول من الخادم
socket.on('loginSuccess', (player) => {
    currentLoggedInUser = player;
    currentRole = player.role;
    usernameInput.value = '';
    loginError.textContent = '';
    
    if (currentRole === 'admin') {
        showScreen('admin-screen');
        adminNameSpan.textContent = player.name;
    } else if (currentRole === 'spectator') {
        showScreen('spectator-screen');
    } else {
        showScreen('player-screen');
        updateCurrentPlayerInfo(player);
    }
});

// معالج حدث تعديل النقاط (إرسال الأمر للخادم)
addPointsButton.addEventListener('click', () => {
    const playerId = selectPlayerForPoints.value;
    const amount = parseInt(pointsAmountInput.value);
    if (playerId && !isNaN(amount) && amount > 0) {
        socket.emit('updatePoints', { playerId, amount: amount });
        pointsAmountInput.value = '';
    } else {
        alert('الرجاء اختيار لاعب وإدخال قيمة نقاط موجبة.');
    }
});

subtractPointsButton.addEventListener('click', () => {
    const playerId = selectPlayerForPoints.value;
    const amount = parseInt(pointsAmountInput.value);
    if (playerId && !isNaN(amount) && amount > 0) {
        socket.emit('updatePoints', { playerId, amount: -amount });
        pointsAmountInput.value = '';
    } else {
        alert('الرجاء اختيار لاعب وإدخال قيمة نقاط موجبة.');
    }
});

// معالجات أحداث اللعبة (المدير)
startWordGameButton.addEventListener('click', startWordGame);
nextWordButton.addEventListener('click', requestNextWord);
endGameButton.addEventListener('click', requestEndGame);


// ربط أزرار تسجيل الخروج بالدالة الموحدة
document.querySelectorAll('[id^="logout-button"]').forEach(button => {
    button.addEventListener('click', logout);
});

// عند بدء الاتصال الأولي أو إعادة الاتصال
socket.on('connect', () => {
    // إذا كان المستخدم مسجلاً بالفعل، يتم إعادته إلى شاشة تسجيل الدخول
    // ويتم تحديث الحالة بواسطة 'updateState'
    if (!currentLoggedInUser) {
        showScreen('login-screen');
    } else {
         // محاولة إعادة تسجيل الدخول التلقائي في حال كان هناك اتصال سابق
         // لكن الأفضل هو أن يطلب المستخدم تسجيل الدخول مجدداً لضمان التزامن
         // أو عرض شاشة انتظار حتى يتم تحديث الحالة من الخادم
    }
});

// =========================================================
// 7. ملاحظة هامة
// =========================================================

// *ملاحظة:* لكي يعمل كود script.js هذا بشكل صحيح، يجب أن يكون لديك ملف خادم (server.js) يعمل
// ويجب أن يكون ملف index.html يحتوي على جميع عناصر DOM المشار إليها في هذا الكود.