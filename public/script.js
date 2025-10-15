const ADMIN_USER = "sam123#";
const GLOBAL_STORAGE_KEY = 'quiz_game_global_data';

// قائمة الأسئلة والأجوبة
const allQuestions = [
    { question: "ما هو الشيء الذي كلما أخذت منه كبر؟", answer: "الحفرة" },
    { question: "ما الشيء الذي يتكلم جميع لغات العالم؟", answer: "الصدى" },
    { question: "ما هو الشيء الذي إن دخل الماء لا يبتل؟", answer: "الظل" },
    { question: "ما هو الشيء الذي يُكتب ولا يُقرأ؟", answer: "القلم" }
];

// ******************************************************
// وظائف تخزين البيانات الوهمية (Local Data Simulation)
// ******************************************************

// هذه الوظيفة تحاكي جلب جميع بيانات اللاعبين المحفوظة في localStorage
// (هذه هي النقطة التي يجب أن تستبدلها بجلب البيانات من الخادم الفعلي)
function getAllPlayersDataLocally() {
    const players = [];
    // نستخدم keySet وهمي هنا لأننا لا نستطيع الوصول إلى جميع المفاتيح عبر localStorage في المتصفحات المختلفة.
    // في بيئة حقيقية، سيقوم الخادم بإرسال هذه القائمة.
    
    // لغرض العرض، سنقوم فقط بإرجاع بيانات اللاعب الحالي (إذا كانت موجودة)
    const currentUser = localStorage.getItem('current_user');
    
    // إنشاء مجموعة مفاتيح وهمية تمثل اللاعبين السابقين الذين دخلوا من هذا المتصفح
    const localUsernames = new Set();
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('user_progress_')) {
            localUsernames.add(key.replace('user_progress_', ''));
        }
    }
    
    localUsernames.forEach(name => {
         if (name !== ADMIN_USER) {
             const progress = parseInt(localStorage.getItem('user_progress_' + name) || 0);
             players.push({
                 name: name,
                 progress: progress,
                 errors: parseInt(localStorage.getItem('user_errors_' + name) || 0),
                 time: "N/A",
                 isFinished: progress >= allQuestions.length
             });
         }
    });

    // فرز اللاعبين (بناءً على تقدمهم في هذا المتصفح فقط)
    players.sort((a, b) => {
        if (a.isFinished && !b.isFinished) return -1;
        if (!a.isFinished && b.isFinished) return 1;
        if (b.progress !== a.progress) return b.progress - a.progress;
        return a.errors - b.errors;
    });

    return players;
}


// وظيفة لتحديث لوحة الترتيب للاعب (عرض مختصر)
function updatePlayerLeaderboard() {
    const listElement = document.getElementById('leaderboard-list');
    if (!listElement) return;

    // الآن نستخدم البيانات المحلية (التي تمثل اللاعبين الذين دخلوا من هذا المتصفح)
    const players = getAllPlayersDataLocally();
    listElement.innerHTML = ''; 
    
    if (players.length === 0) {
         listElement.innerHTML = '<li>لا يوجد لاعبون مسجلون بعد.</li>';
         return;
    }

    players.forEach((player, index) => {
        const rank = index + 1;
        const listItem = document.createElement('li');
        
        // تمييز اللاعب الحالي
        const currentUser = localStorage.getItem('current_user');
        const isCurrentUser = (player.name === currentUser);

        listItem.className = 'leaderboard-item' + (rank === 1 ? ' rank-1' : '') + (isCurrentUser ? ' current-player' : '');

        const status = player.isFinished ? 'انتهى 🎉' : `سؤال ${player.progress + 1}/${allQuestions.length}`;
        const nameDisplay = isCurrentUser ? `${player.name} (أنت)` : player.name;

        listItem.innerHTML = `
            <span>#${rank} - ${nameDisplay}</span>
            <span>${status}</span>
        `;
        listElement.appendChild(listItem);
    });
}

// وظيفة لتحديث لوحة الأدمن (عرض تفصيلي)
function updateAdminLeaderboard() {
    const listElement = document.getElementById('admin-list');
    if (!listElement) return;

    // جلب كل البيانات المحلية
    const players = getAllPlayersDataLocally();
    listElement.innerHTML = ''; 

    if (players.length === 0) {
         listElement.innerHTML = '<li class="leaderboard-item">لا يوجد بيانات لاعبين مسجلة محلياً.</li>';
         return;
    }

    players.forEach((player, index) => {
        const rank = index + 1;
        const listItem = document.createElement('li');
        listItem.className = 'leaderboard-item' + (rank === 1 ? ' rank-1' : '');

        const status = player.isFinished ? 'انتهى 🎉' : `سؤال ${player.progress + 1}/${allQuestions.length}`;
        const timeDetail = 'N/A'; // لا يمكن تتبع الوقت بدقة بدون خادم
        
        listItem.innerHTML = `
            <span>#${rank} - ${player.name}</span>
            <span>${status}</span>
            <span class="admin-detail-item">الوقت: ${timeDetail} | أخطاء: ${player.errors}</span>
        `;
        listElement.appendChild(listItem);
    });
}


// ******************************************************
// وظائف منطق اللعبة (Game Logic)
// ******************************************************

// 1. منطق تسجيل الدخول
function login() {
    const usernameInput = document.getElementById('usernameInput');
    const errorMessage = document.getElementById('error-message');
    const username = usernameInput.value.trim();

    errorMessage.textContent = ''; 

    if (username === '') {
        errorMessage.textContent = 'الرجاء إدخال اسم المستخدم.';
        return;
    }

    localStorage.setItem('current_user', username);

    if (username === ADMIN_USER) {
        window.location.href = 'admin.html';
    } else {
        if (!localStorage.getItem('user_progress_' + username)) {
            localStorage.setItem('user_progress_' + username, 0); 
            localStorage.setItem('user_errors_' + username, 0); 
        }
        window.location.href = 'player.html';
    }
}

// 2. منطق صفحة اللاعب
if (window.location.pathname.endsWith('player.html')) {
    document.addEventListener('DOMContentLoaded', initializePlayerPage);
}

function initializePlayerPage() {
    const username = localStorage.getItem('current_user');
    const currentQuestionIndex = parseInt(localStorage.getItem('user_progress_' + username) || 0);

    if (!username || username === ADMIN_USER) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('displayName').textContent = username;

    const globalData = JSON.parse(localStorage.getItem(GLOBAL_STORAGE_KEY) || '{}');
    const winner = globalData.winner;

    if (winner) {
        document.getElementById('winner-name').textContent = winner;
        document.getElementById('global-winner').classList.remove('hidden');
        document.getElementById('quiz-area').classList.add('hidden');
        document.getElementById('win-message').classList.add('hidden'); 
        return;
    }

    if (currentQuestionIndex < allQuestions.length) {
        displayQuestion(currentQuestionIndex);
        
        const quizArea = document.getElementById('quiz-area');
        if (quizArea) {
             quizArea.classList.remove('hidden');
        }
        
    } else {
        playerWins(username);
    }
    
    updatePlayerLeaderboard(); 
}

function displayQuestion(index) {
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
    const username = localStorage.getItem('current_user');
    let currentQuestionIndex = parseInt(localStorage.getItem('user_progress_' + username) || 0);

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

        currentQuestionIndex++;
        localStorage.setItem('user_progress_' + username, currentQuestionIndex);

        setTimeout(() => {
            if (currentQuestionIndex < allQuestions.length) {
                displayQuestion(currentQuestionIndex);
            } else {
                playerWins(username); 
            }
            updatePlayerLeaderboard(); 
        }, 1500);

    } else {
        let errors = parseInt(localStorage.getItem('user_errors_' + username) || 0);
        errors++;
        localStorage.setItem('user_errors_' + username, errors);
        
        feedbackElement.textContent = 'إجابة خاطئة. حاول مرة أخرى.';
        feedbackElement.classList.add('incorrect');
        
        updatePlayerLeaderboard(); 
    }
}

// معالجة فوز اللاعب
function playerWins(username) {
    document.getElementById('quiz-area').classList.add('hidden');
    
    const globalData = JSON.parse(localStorage.getItem(GLOBAL_STORAGE_KEY) || '{}');
    
    if (!globalData.winner) {
        globalData.winner = username;
        localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(globalData));
        document.getElementById('win-message').classList.remove('hidden');
    } else {
         document.getElementById('winner-name').textContent = globalData.winner;
         document.getElementById('global-winner').classList.remove('hidden');
    }
}


// 3. منطق صفحة الأدمن
if (window.location.pathname.endsWith('admin.html')) {
    document.addEventListener('DOMContentLoaded', initializeAdminPage);
}

function initializeAdminPage() {
    updateAdminLeaderboard();
    
    // إضافة زر إعادة التعيين
    const container = document.querySelector('.container');
    const resetButton = document.createElement('button');
    resetButton.textContent = 'إعادة تعيين اللعبة (لجميع اللاعبين محلياً)';
    resetButton.onclick = resetGameLocally;
    resetButton.style.marginTop = '20px';
    container.appendChild(resetButton);
}

// وظيفة إعادة تعيين اللعبة (تنظيف البيانات من هذا المتصفح فقط)
function resetGameLocally() {
    if (confirm('هل أنت متأكد من رغبتك في إعادة تعيين اللعبة؟ سيتم مسح تقدم جميع اللاعبين في هذا المتصفح.')) {
        // إزالة بيانات تقدم اللاعبين
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('user_progress_') || key.startsWith('user_errors_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // إزالة الفائز العالمي
        localStorage.removeItem(GLOBAL_STORAGE_KEY);
        
        alert('تمت إعادة تعيين اللعبة بنجاح (محلياً).');
        window.location.reload();
    }
}