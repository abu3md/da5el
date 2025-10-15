const ADMIN_USER = "sam123#";

// قائمة الأسئلة والأجوبة الجديدة
const allQuestions = [
    {
        question: "رقم إذا ضربته في نفسه ثم أضفت إليه 8 كان الناتج 72، ما هو؟",
        answer: "8"
    },
    {
        question: "كم يوجد عنصر سائل في الجدول الدوري؟",
        answer: "2"
    },
    {
        question: "يسير بلا أرجل، ما هو؟",
        answer: "السحاب"
    },
    {
        question: "له ورق ولا يكتب، ما هو؟",
        answer: "الشجرة"
    },
    {
        question: "إذا شرب مات وإذا أكل عاش، ما هو؟",
        answer: "النار"
    },
    {
        question: "ما هي الدولة التي لديها أطول خط ساحلي في العالم؟",
        answer: "كندا"
    },
    {
        question: "ما هي عاصمة دولة فنلندا؟",
        answer: "هلسنكي"
    },
    {
        question: "ما هو المعدن السائل في درجة حرارة الغرفة؟",
        answer: "الزئبق"
    },
    {
        question: "ما هي المادة الأساسية في صناعة الزجاج؟",
        answer: "الرمل"
    },
    {
        question: "ما هو الغاز الأكثر وفرة في الغلاف الجوي للأرض؟",
        answer: "النيتروجين"
    },
    {
        question: "ما هي أصغر وحدة بناء في الكائن الحي؟",
        answer: "الخلية"
    },
    {
        question: "في أي عام انتهت الحرب العالمية الثانية؟",
        answer: "1945"
    },
    {
        question: "ما هي عاصمة كندا؟",
        answer: "أوتاوا"
    },
    {
        question: "كم عدد العظام في جسم الإنسان البالغ؟",
        answer: "206"
    },
    {
        question: "ما هي اللغة الرسمية في البرازيل؟",
        answer: "البرتغالية"
    },
    {
        question: "ما هو اسم عملية تبخر الماء من أوراق النبات؟",
        answer: "النتح"
    },
    {
        question: "ما هو المضيق الذي يفصل بين إسبانيا والمغرب؟",
        answer: "مضيق جبل طارق"
    },
    {
        question: "ما هو أقرب كوكب إلى الشمس؟",
        answer: "عطارد"
    }
];

// ... (بقية الكود الخاص بـ Socket.io ومنطق اللعبة) ...

// ******************************************************
// الإعداد لـ Socket.io (الربط بالخادم)
// ******************************************************

// الاتصال بالخادم. (يفترض أن يكون الخادم يعمل على نفس المنفذ/الرابط)
const socket = io();
let username = localStorage.getItem('current_user'); // نستخدم localStorage لحفظ الاسم فقط

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

// 1. منطق تسجيل الدخول (يعمل في login.html)
function login() {
    const usernameInput = document.getElementById('usernameInput');
    const errorMessage = document.getElementById('error-message');
    const inputUsername = usernameInput.value.trim();

    errorMessage.textContent = ''; 

    if (inputUsername === '') {
        errorMessage.textContent = 'الرجاء إدخال اسم المستخدم.';
        return;
    }
    
    // حفظ اسم المستخدم محلياً (هذا فقط لنتذكره في الجلسات التالية)
    localStorage.setItem('current_user', inputUsername);
    username = inputUsername; 

    if (username === ADMIN_USER) {
        window.location.href = 'admin.html';
    } else {
        // إرسال طلب الانضمام وتسجيل اللاعب الجديد للخادم
        socket.emit('playerJoin', username);
        window.location.href = 'player.html'; 
    }
}

// 2. منطق صفحة اللاعب (يعمل في player.html)
if (window.location.pathname.endsWith('player.html')) {
    document.addEventListener('DOMContentLoaded', initializePlayerPage);
}

function initializePlayerPage() {
    username = localStorage.getItem('current_user');

    if (!username || username === ADMIN_USER) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('displayName').textContent = username;
    
    // عند تحميل الصفحة، نطلب حالة اللاعب من الخادم
    socket.emit('requestPlayerStatus', username, (playerStatus) => {
        
        // إذا كان هناك فائز عالمي مُعلن، لا تعرض السؤال
        socket.emit('requestGlobalWinner'); // لضمان استقبال إعلان الفائز

        if (playerStatus.progress < allQuestions.length) {
            displayQuestion(playerStatus.progress);
            document.getElementById('quiz-area').classList.remove('hidden');
        } else {
            // اللاعب أنهى الأسئلة (لكن ليس هو الفائز العالمي بالضرورة)
            playerWins(username); 
        }
    });

    // نطلب آخر تحديث للوحة الترتيب عند التحميل
    socket.emit('requestLeaderboard');
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
    if (!username) return; 

    // نطلب التقدم الحالي من الخادم للتحقق من الإجابة
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

            // إرسال الإجابة الصحيحة للخادم لتحديث التقدم
            socket.emit('correctAnswer', username, () => {
                const nextIndex = currentQuestionIndex + 1;
                setTimeout(() => {
                    if (nextIndex < allQuestions.length) {
                        displayQuestion(nextIndex);
                    } else {
                        playerWins(username); 
                    }
                }, 1500);
            });

        } else {
            // إرسال الإجابة الخاطئة للخادم لتحديث عداد الأخطاء
            socket.emit('incorrectAnswer', username);
            
            feedbackElement.textContent = 'إجابة خاطئة. حاول مرة أخرى.';
            feedbackElement.classList.add('incorrect');
        }
    });
}

// معالجة فوز اللاعب (إرسال إعلان الفوز للخادم)
function playerWins(username) {
    document.getElementById('quiz-area').classList.add('hidden');
    document.getElementById('win-message').classList.remove('hidden');
    
    // إرسال رسالة الفوز للخادم ليُعلن الفائز عالمياً
    socket.emit('playerWinsGame', username);
}


// 3. منطق صفحة الأدمن (يعمل في admin.html)
if (window.location.pathname.endsWith('admin.html')) {
    document.addEventListener('DOMContentLoaded', initializeAdminPage);
}

function initializeAdminPage() {
    // نطلب آخر تحديث للوحة الترتيب عند التحميل
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
             alert('تم إرسال أمر إعادة التعيين للخادم. ستتم إعادة التحميل الآن.');
             window.location.reload();
        });
    }
}