const ADMIN_USER = "sam123#";

// قائمة الأسئلة والأجوبة (مفتاح السؤال: الإجابة الصحيحة)
const allQuestions = [
    {
        question: "ما هو الشيء الذي كلما أخذت منه كبر؟",
        answer: "الحفرة"
    },
    {
        question: "ما الشيء الذي يتكلم جميع لغات العالم؟",
        answer: "الصدى"
    },
    {
        question: "ما هو الشيء الذي إن دخل الماء لا يبتل؟",
        answer: "الظل"
    },
    {
        question: "ما هو الشيء الذي يُكتب ولا يُقرأ؟",
        answer: "القلم"
    }
];

// 1. منطق تسجيل الدخول
function login() {
    const usernameInput = document.getElementById('usernameInput');
    const errorMessage = document.getElementById('error-message');
    const username = usernameInput.value.trim();

    errorMessage.textContent = ''; // مسح أي رسالة سابقة

    if (username === '') {
        errorMessage.textContent = 'الرجاء إدخال اسم المستخدم.';
        return;
    }

    // حفظ اسم المستخدم في تخزين المتصفح ليتم استخدامه في الصفحات الأخرى
    localStorage.setItem('current_user', username);

    // التحقق من صلاحيات الأدمن
    if (username === ADMIN_USER) {
        window.location.href = 'admin.html';
    } else {
        // إذا كان لاعباً جديداً، ابدأه من السؤال الأول
        if (!localStorage.getItem('user_progress_' + username)) {
            localStorage.setItem('user_progress_' + username, 0); // حفظ في السؤال رقم 0
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

    if (!username) {
        // إعادة التوجيه لصفحة الدخول إذا لم يتم العثور على اسم مستخدم
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('displayName').textContent = username;

    // التحقق من حالة الفوز العالمية (بدون خادم، هذا للبيان فقط)
    const winner = localStorage.getItem('global_winner');
    if (winner) {
        document.getElementById('winner-name').textContent = winner;
        document.getElementById('global-winner').classList.remove('hidden');
        document.getElementById('quiz-area').classList.add('hidden');
        return;
    }

    // عرض السؤال الحالي
    if (currentQuestionIndex < allQuestions.length) {
        displayQuestion(currentQuestionIndex);
    } else {
        // اللاعب أنهى الأسئلة
        playerWins(username);
    }
}

function displayQuestion(index) {
    const questionElement = document.getElementById('currentQuestion');
    const feedbackElement = document.getElementById('feedback');
    const inputElement = document.getElementById('answerInput');

    // إظهار منطقة اللعبة وإخفاء رسالة الفوز
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

    // إذا كان اللاعب قد أنهى الأسئلة بالفعل
    if (currentQuestionIndex >= allQuestions.length) {
        return;
    }

    const userAnswer = document.getElementById('answerInput').value.trim();
    const feedbackElement = document.getElementById('feedback');
    const correctAnswer = allQuestions[currentQuestionIndex].answer;

    feedbackElement.classList.remove('correct', 'incorrect');

    // مقارنة الإجابة (تجاهل حالة الأحرف والمسافات الزائدة)
    if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
        feedbackElement.textContent = 'إجابة صحيحة! ننتقل للسؤال التالي.';
        feedbackElement.classList.add('correct');

        // تحديث تقدم اللاعب
        currentQuestionIndex++;
        localStorage.setItem('user_progress_' + username, currentQuestionIndex);

        // تأخير بسيط للانتقال للسؤال التالي
        setTimeout(() => {
            if (currentQuestionIndex < allQuestions.length) {
                displayQuestion(currentQuestionIndex);
            } else {
                playerWins(username); // اللاعب أنهى جميع الأسئلة
            }
        }, 1500);

    } else {
        feedbackElement.textContent = 'إجابة خاطئة. حاول مرة أخرى.';
        feedbackElement.classList.add('incorrect');
    }
}

// معالجة فوز اللاعب
function playerWins(username) {
    document.getElementById('quiz-area').classList.add('hidden');
    document.getElementById('win-message').classList.remove('hidden');

    // **التحدي هنا: بدون خادم، لا يمكن إبلاغ الآخرين فوراً.**
    // سنستخدم localStorage لتعيين فائز عالمي (وهو فائز فقط في متصفحه)
    if (!localStorage.getItem('global_winner')) {
        localStorage.setItem('global_winner', username);
        // يمكنك هنا عرض رسالة أكثر تأثيراً كونه أول من أنهى في هذه "الجلسة"
        console.log(`تم تعيين ${username} كفائز!`);
    } else {
         // إذا كان هناك فائز بالفعل
         document.getElementById('winner-name').textContent = localStorage.getItem('global_winner');
         document.getElementById('global-winner').classList.remove('hidden');
         document.getElementById('win-message').classList.add('hidden');
    }
}