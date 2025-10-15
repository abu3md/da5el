const ADMIN_USER = "sam123#";
const allQuestions = [
    // ... (احتفظ بجميع أسئلتك هنا) ...
    { question: "ما هو الشيء الذي كلما أخذت منه كبر؟", answer: "الحفرة" },
    { question: "ما الشيء الذي يتكلم جميع لغات العالم؟", answer: "الصدى" },
    { question: "ما هو الشيء الذي إن دخل الماء لا يبتل؟", answer: "الظل" },
    { question: "ما هو الشيء الذي يُكتب ولا يُقرأ؟", answer: "القلم" }
];

// ******************************************************
// الإعداد لـ Socket.io (الربط بالخادم)
// ******************************************************

// الاتصال بالخادم. سيتم الاتصال تلقائياً بخادم Render الذي تشغل عليه الملف.
const socket = io();
let username = localStorage.getItem('current_user');

// ******************************************************
// وظائف لوحة الترتيب (Leaderboard Functions)
// ******************************************************

// دالة تحديث لوحة الترتيب بناءً على البيانات المستلمة من الخادم
function updatePlayerLeaderboardDisplay(players) {
    const listElement = document.getElementById('leaderboard-list');
    if (!listElement) return;

    listElement.innerHTML = '';
    if (players.length === 0) {
         listElement.innerHTML = '<li>جارٍ انتظار اللاعبين...</li>';
         return;
    }

    players.forEach((player, index) => {
        const rank = index + 1;
        const listItem = document.createElement('li');
        
        const isCurrentUser = (player.name === username);

        listItem.className = 'leaderboard-item' + 
                              (rank === 1 ? ' rank-1' : '') + 
                              (isCurrentUser ? ' current-player' : '');

        const status = player.progress >= allQuestions.length ? 'انتهى 🎉' : `سؤال ${player.progress + 1}/${allQuestions.length}`;
        const nameDisplay = isCurrentUser ? `${player.name} (أنت)` : player.name;

        listItem.innerHTML = `
            <span>#${rank} - ${nameDisplay}</span>
            <span>${status}</span>
        `;
        listElement.appendChild(listItem);
    });
}

// دالة تحديث لوحة الأدمن بناءً على البيانات المستلمة من الخادم
function updateAdminLeaderboardDisplay(players) {
    const listElement = document.getElementById('admin-list');
    if (!listElement) return;

    listElement.innerHTML = '';

    if (players.length === 0) {
         listElement.innerHTML = '<li class="leaderboard-item">لا يوجد لاعبون مسجلون.</li>';
         return;
    }

    players.forEach((player, index) => {
        const rank = index + 1;
        const listItem = document.createElement('li');
        listItem.className = 'leaderboard-item' + (rank === 1 ? ' rank-1' : '');

        const status = player.progress >= allQuestions.length ? 'انتهى 🎉' : `سؤال ${player.progress + 1}/${allQuestions.length}`;
        
        // الوقت والأخطاء تأتي من الخادم
        const timeDetail = player.time || 'N/A'; 
        const errors = player.errors || 0;

        listItem.innerHTML = `
            <span>#${rank} - ${player.name}</span>
            <span>${status}</span>
            <span class="admin-detail-item">الوقت: ${timeDetail} | أخطاء: ${errors}</span>
        `;
        listElement.appendChild(listItem);
    });
}

// ******************************************************
// استقبال تحديثات Socket.io
// ******************************************************

// الاستماع لتحديثات الترتيب
socket.on('leaderboardUpdate', (players) => {
    if (window.location.pathname.endsWith('player.html')) {
        updatePlayerLeaderboardDisplay(players);
    } else if (window.location.pathname.endsWith('admin.html')) {
        updateAdminLeaderboardDisplay(players);
    }
});

// الاستماع لإعلان الفائز العالمي
socket.on('globalWinner', (winnerName) => {
    if (window.location.pathname.endsWith('player.html')) {
        // إظهار رسالة الفائز العالمي لجميع اللاعبين
        document.getElementById('winner-name').textContent = winnerName;
        document.getElementById('global-winner').classList.remove('hidden');
        document.getElementById('quiz-area').classList.add('hidden');
        document.getElementById('win-message').classList.add('hidden');
    }
});

// ******************************************************
// وظائف منطق اللعبة
// ******************************************************

// 1. منطق تسجيل الدخول
function login() {
    // ... (الكود لم يتغير: يستخدم localStorage لتخزين 'current_user' فقط)
    const usernameInput = document.getElementById('usernameInput');
    const errorMessage = document.getElementById('error-message');
    const inputUsername = usernameInput.value.trim();

    errorMessage.textContent = ''; 

    if (inputUsername === '') {
        errorMessage.textContent = 'الرجاء إدخال اسم المستخدم.';
        return;
    }
    
    // حفظ اسم المستخدم فقط محلياً
    localStorage.setItem('current_user', inputUsername);
    username = inputUsername; // تحديث المتغير المحلي

    if (username === ADMIN_USER) {
        window.location.href = 'admin.html';
    } else {
        // **إرسال طلب الانضمام وتسجيل اللاعب الجديد للخادم**
        socket.emit('playerJoin', username);
        window.location.href = 'player.html';
    }
}

// 2. منطق صفحة اللاعب
if (window.location.pathname.endsWith('player.html')) {
    document.addEventListener('DOMContentLoaded', initializePlayerPage);
}

function initializePlayerPage() {
    // ... (الكود لم يتغير: التحقق من اسم المستخدم والفائز)

    if (!username || username === ADMIN_USER) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('displayName').textContent = username;
    
    // **بدلاً من التحقق من localStorage، نطلب الحالة من الخادم**
    socket.emit('requestPlayerStatus', username, (playerStatus) => {
        if (playerStatus.isWinner) {
             socket.emit('requestGlobalWinner'); // لضمان عرض الفائز
             return;
        }

        if (playerStatus.progress < allQuestions.length) {
            displayQuestion(playerStatus.progress);
            document.getElementById('quiz-area').classList.remove('hidden');
        } else {
            playerWins(username); // إذا كان تقدمه مكتملًا
        }
    });

    // نطلب آخر تحديث للوحة الترتيب عند التحميل
    socket.emit('requestLeaderboard');
}

function displayQuestion(index) {
    // ... (الكود لم يتغير)
    const questionElement = document.getElementById('currentQuestion');
    const feedbackElement = document.getElementById('feedback');
    const inputElement = document.getElementById('answerInput');

    document.getElementById('quiz-area').classList.remove('hidden'); 
    document.getElementById('win-message').classList.add('hidden');
    
    questionElement.textContent = `السؤال رقم ${index + 1}: ${allQuestions[index].question}`;
    feedbackElement.textContent = '';
    inputElement.value = '';
    inputElement.focus();
}

function checkAnswer() {
    if (!username) return; 

    // **نطلب التقدم الحالي من الخادم للتحقق من الإجابة**
    socket.emit('requestPlayerStatus', username, (playerStatus) => {
        let currentQuestionIndex = playerStatus.progress;
        
        if (currentQuestionIndex >= allQuestions.length) {
            return;
        }

        const userAnswer = document.getElementById('answerInput').value.trim();
        const feedbackElement = document.getElementById('feedback');
        const correctAnswer = allQuestions[currentQuestionIndex].answer;

        feedbackElement.classList.remove('correct', 'incorrect');

        if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
            feedbackElement.textContent = 'إجابة صحيحة! ننتقل للسؤال التالي.';
            feedbackElement.classList.add('correct');

            // **إرسال الإجابة الصحيحة للخادم لتحديث التقدم**
            socket.emit('correctAnswer', username, () => {
                const nextIndex = currentQuestionIndex + 1;
                setTimeout(() => {
                    if (nextIndex < allQuestions.length) {
                        displayQuestion(nextIndex);
                    } else {
                        playerWins(username); 
                    }
                    // التحديث سيأتي من الخادم عبر 'leaderboardUpdate'
                }, 1500);
            });

        } else {
            // **إرسال الإجابة الخاطئة للخادم لتحديث عداد الأخطاء**
            socket.emit('incorrectAnswer', username);
            
            feedbackElement.textContent = 'إجابة خاطئة. حاول مرة أخرى.';
            feedbackElement.classList.add('incorrect');
            
            // التحديث سيأتي من الخادم عبر 'leaderboardUpdate'
        }
    });
}

// معالجة فوز اللاعب (إرسال إعلان الفوز للخادم)
function playerWins(username) {
    document.getElementById('quiz-area').classList.add('hidden');
    document.getElementById('win-message').classList.remove('hidden');
    
    // **إرسال رسالة الفوز للخادم ليُعلن الفائز عالمياً**
    socket.emit('playerWinsGame', username);
}


// 3. منطق صفحة الأدمن
if (window.location.pathname.endsWith('admin.html')) {
    document.addEventListener('DOMContentLoaded', initializeAdminPage);
}

function initializeAdminPage() {
    // **نطلب آخر تحديث للوحة الترتيب عند التحميل**
    socket.emit('requestLeaderboard');
    
    // إضافة زر إعادة التعيين (الذي سيُرسل أمرًا للخادم)
    const container = document.querySelector('.container');
    const resetButton = document.createElement('button');
    resetButton.textContent = 'إعادة تعيين اللعبة (إرسال أمر للخادم)';
    resetButton.onclick = resetGameOnServer;
    resetButton.style.marginTop = '20px';
    container.appendChild(resetButton);
}

// وظيفة إعادة تعيين اللعبة (إرسال أمر للخادم)
function resetGameOnServer() {
    if (confirm('هل أنت متأكد من رغبتك في إعادة تعيين اللعبة؟ سيتم مسح تقدم جميع اللاعبين على الخادم.')) {
        socket.emit('adminResetGame', () => {
             alert('تم إرسال أمر إعادة التعيين للخادم. قد تحتاج لإنعاش الصفحة.');
             window.location.reload();
        });
    }
}