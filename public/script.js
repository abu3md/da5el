// =========================================================
// 1. الإعدادات والاتصال (تصحيح الاتصال للعمل على Render)
// =========================================================
const socket = io(); // الاتصال بدون تحديد localhost للعمل على Render

// المتغيرات الرئيسية للحالة (state)
let currentLoggedInUser = null;
let activePlayersData = [];
let gameTimerInterval = null;
let currentWordIndex = 0;
const gameWords = ["برمجة", "تطوير", "جافاسكريبت", "قاعدة", "بيانات", "خوارزمية", "واجهة", "مستخدم", "خادم", "شبكة", "إخراج", "أتمتة", "تطبيق", "سحابية", "خلفية"];
const gameTopics = ["انمي", "عامة", "العاب", "جغرافيا"]; // خانات العجلة

// =========================================================
// 2. العناصر الرئيسية في DOM (تم تحديث المعرفات بناءً على الملفات الجديدة)
// =========================================================

// الشاشات
const loginScreen = document.getElementById('login-screen');
const adminScreen = document.getElementById('admin-screen');
const playerScreen = document.getElementById('player-screen');
const spectatorScreen = document.getElementById('spectator-screen');

// الإدخال وزر الدخول
const usernameInput = document.getElementById('username-input'); // تم تصحيح المعرّف من 'username' إلى 'username-input'
const loginButton = document.getElementById('login-button');

// القوائم وعرض النقاط
const playerListAdmin = document.getElementById('player-list-admin'); // قائمة اللاعبين في شاشة المدير
const blueTeamList = document.getElementById('blue-team-list');
const redTeamList = document.getElementById('red-team-list');
const bluePointsSpan = document.getElementById('blue-team-points');
const redPointsSpan = document.getElementById('red-team-points');

// عناصر التحكم بالمدير (تم إضافتها من الملف الثاني)
const selectPlayerForPoints = document.getElementById('select-player-for-points');
const pointsAmountInput = document.getElementById('points-amount');
const addPointsButton = document.getElementById('add-points-button');
const subtractPointsButton = document.getElementById('subtract-points-button');
const startWordGameButton = document.getElementById('start-word-game-button');
const nextWordButton = document.getElementById('next-word-button'); // زر تخطي / كلمة أخرى

// عرض اللعبة (اللاعب)
const currentWordDisplayPlayer = document.getElementById('current-word-display-player');
const wheelImages = document.querySelectorAll('.image-wheel-container img'); // صور العجلة

// =========================================================
// 3. وظائف التحكم بالواجهة
// =========================================================

// وظيفة لتبديل الشاشات
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); // إزالة 'active' من الكل
    
    // التحقق من المعرّف وإضافة 'active'
    if (screenId === 'admin') adminScreen.classList.add('active');
    else if (screenId === 'spectator') spectatorScreen.classList.add('active');
    else if (screenId === 'player') playerScreen.classList.add('active');
    else loginScreen.classList.add('active'); // default to login
}

// تحديث القوائم وعرض النقاط (يشمل منطق عرض الفرق في شاشات اللاعبين والمشاهدين)
function updateLists(state) {
    activePlayersData = state.players; // حفظ الحالة
    
    // تنظيف قوائم الادمن والفرق
    playerListAdmin.innerHTML = '';
    blueTeamList.innerHTML = '';
    redTeamList.innerHTML = '';
    selectPlayerForPoints.innerHTML = '<option value="">اختر لاعبًا</option>';

    // تحديث نقاط الفرق
    bluePointsSpan.textContent = state.teams.blue || 0;
    redPointsSpan.textContent = state.teams.red || 0;

    state.players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = `${player.name} (نقاط: ${player.points || 0})`;

        if (player.role === 'admin' && currentLoggedInUser.role === 'admin') {
            document.getElementById('admin-name').textContent = player.name; // تحديث اسم المدير
        }

        if (player.role === 'player') {
            // منطق عرض قائمة الادمن (يظهر أزرار التوزيع)
            if (currentLoggedInUser && currentLoggedInUser.role === 'admin') {
                const adminLi = document.createElement('li');
                adminLi.innerHTML = `
                    <span class="player-info">${player.name} (${player.team ? (player.team === 'blue' ? 'أزرق' : 'أحمر') : 'بدون فريق'}) - النقاط: ${player.points || 0}</span>
                    <div class="team-buttons">
                        <button class="team-blue" onclick="assignTeam('${player.id}', 'blue')">فريق أزرق</button>
                        <button class="team-red" onclick="assignTeam('${player.id}', 'red')">فريق أحمر</button>
                    </div>
                `;
                playerListAdmin.appendChild(adminLi);
                
                // قائمة النقاط
                const optionPoint = document.createElement('option');
                optionPoint.value = player.id;
                optionPoint.textContent = player.name;
                selectPlayerForPoints.appendChild(optionPoint);
            }
            
            // منطق عرض قوائم الفرق (للاعبين والمشاهدين)
            if (player.team === 'blue') {
                blueTeamList.appendChild(li.cloneNode(true));
            } else if (player.team === 'red') {
                redTeamList.appendChild(li.cloneNode(true));
            }
        }
    });
}

// وظيفة محاكاة عجلة الاختيار وتحديد الموضوع
function selectRandomTopic() {
    // 1. محاكاة الإضاءة المنظمة
    let currentIndex = 0;
    const highlightInterval = setInterval(() => {
        // إطفاء الكل
        wheelImages.forEach(img => img.style.border = 'none');
        
        // إضاءة العنصر الحالي (إضافة تأثير مرئي خفيف)
        wheelImages[currentIndex].style.border = '3px solid yellow';
        
        currentIndex = (currentIndex + 1) % wheelImages.length;
    }, 100); // إضاءة كل 100 ملي ثانية

    // 2. إيقاف الإضاءة واختيار الموضوع بعد فترة
    setTimeout(() => {
        clearInterval(highlightInterval);
        
        // اختيار عشوائي للموضوع
        const randomIndex = Math.floor(Math.random() * gameTopics.length);
        const selectedTopic = gameTopics[randomIndex];
        const selectedImage = wheelImages[randomIndex];
        
        // إضاءة الموضوع المختار فقط
        wheelImages.forEach(img => img.style.border = 'none');
        selectedImage.style.border = '3px solid #00ff00'; // إضاءة خضراء للمختار
        
        // إرسال الموضوع للخادم لبدء الجولة
        socket.emit('topicSelected', selectedTopic);
        
        // بعد فترة، إطفاء الإضاءة وظهور الكلمة (الخادم سيعالج هذا)
        setTimeout(() => {
             wheelImages.forEach(img => img.style.border = 'none');
             // الخادم سيبدأ إرسال الكلمة
        }, 1500); 

    }, 3000); // تستمر العجلة بالدوران لمدة 3 ثواني
}

// =========================================================
// 4. معالجات الأحداث (Event Listeners)
// =========================================================

// تسجيل الدخول
loginButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        socket.emit('login', username);
    }
});

// تعيين الفريق (تُستدعى من أزرار شاشة المدير)
window.assignTeam = (playerId, team) => {
    socket.emit('assignTeam', { playerId, team });
};

// تعديل النقاط
addPointsButton.addEventListener('click', () => {
    const playerId = selectPlayerForPoints.value;
    const amount = parseInt(pointsAmountInput.value);
    if (playerId && !isNaN(amount) && amount > 0) {
        socket.emit('updatePoints', { playerId, amount: amount });
        pointsAmountInput.value = '';
    } else {
        alert('اختر لاعبًا وأدخل قيمة نقاط موجبة.');
    }
});

subtractPointsButton.addEventListener('click', () => {
    const playerId = selectPlayerForPoints.value;
    const amount = parseInt(pointsAmountInput.value);
    if (playerId && !isNaN(amount) && amount > 0) {
        socket.emit('updatePoints', { playerId, amount: -amount });
        pointsAmountInput.value = '';
    } else {
        alert('اختر لاعبًا وأدخل قيمة نقاط موجبة.');
    }
});

// بدء اللعبة (المدير)
startWordGameButton.addEventListener('click', () => {
    // المدير يختار اللاعب، ثم يدور العجلة
    const eligiblePlayers = activePlayersData.filter(p => p.team && p.role === 'player');
    if (eligiblePlayers.length === 0) return alert('لا يوجد لاعبون في الفرق!');
    
    // هنا يجب أن يتم اختيار اللاعب، لكن لتبسيط المنطق، سنختار عشوائيًا ونبدأ العجلة
    const randomPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
    socket.emit('playerSelected', randomPlayer.id); // إخبار الخادم باللاعب الذي سيلعب
    
    selectRandomTopic(); // تدوير العجلة لاختيار الموضوع
});

// تخطي / كلمة أخرى (المدير)
nextWordButton.addEventListener('click', () => {
    socket.emit('nextWord'); // الخادم سيتولى عملية إضافة النقطة واختيار الكلمة التالية
});

// =========================================================
// 5. استقبال الأحداث من الخادم (Server to Client)
// =========================================================

// عند استلام تحديثات الحالة (اللاعبين والنقاط)
socket.on('updateState', (state) => {
    updateLists(state);
});

// رد السيرفر عند النجاح
socket.on('loginSuccess', (playerData) => {
    currentLoggedInUser = playerData; // حفظ بيانات المستخدم الحالي
    
    if (playerData.role === 'admin') {
        showScreen('admin');
    } else if (playerData.role === 'spectator') {
        showScreen('spectator');
    } else {
        showScreen('player');
    }
});

// رد السيرفر عند الخطأ
socket.on('loginError', (msg) => {
    alert("❌ خطأ: " + msg);
    showScreen('login');
});

// استقبال الكلمة الجديدة (تظهر للاعب الحالي والمدير)
socket.on('newWord', ({ word, topic }) => {
    // تحديث شاشة المدير واللاعب الذي تم اختياره
    if (currentLoggedInUser.role === 'admin') {
        document.getElementById('current-word-display-admin').textContent = word;
        document.getElementById('selected-topic-display').textContent = topic;
    } 
    
    if (currentLoggedInUser.isTurn) { // يجب أن يحدد الخادم من دوره
        currentWordDisplayPlayer.textContent = word;
        document.getElementById('player-topic-info').textContent = topic;
        // هنا يجب أن يبدأ مؤقت الـ 60 ثانية (يُفضل إدارته بالكامل من الخادم)
    }
});

// معالجات تسجيل الخروج (إعادة التوصيل بعد قطع الاتصال)
document.querySelectorAll('[id$="-button-admin"], [id$="-button-player"], [id$="-button-spectator"]').forEach(button => {
    button.addEventListener('click', () => {
        socket.emit('logout'); // إخبار الخادم بتسجيل الخروج
        socket.disconnect();
        currentLoggedInUser = null;
        showScreen('login');
        setTimeout(() => socket.connect(), 100); // إعادة محاولة الاتصال للدخول مجدداً
    });
});