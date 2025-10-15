const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// **********************************************
// الإعدادات الثابتة
// **********************************************

// **القيمة المطلوبة:** عدد الأسئلة الإجمالي في اللعبة.
const NUM_QUESTIONS = 18; 

// الإعداد الأساسي
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// **********************************************
// قاعدة البيانات الوهمية (تخزين حالة اللعبة)
// **********************************************
let players = {}; // { 'username': { name, progress, errors, startTime, endTime, isWinner, socketId } }
let globalWinner = null;


// دالة فرز اللاعبين (الأعلى تقدماً، الأقل أخطاءً، الأسرع وقتاً)
function getSortedLeaderboard() {
    const leaderboard = Object.values(players).map(p => ({
        name: p.name,
        progress: p.progress,
        errors: p.errors,
        isWinner: p.isWinner,
        // عرض الوقت فقط إذا كان اللاعب قد أنهى اللعبة (أصبح فائزاً)
        time: p.isWinner ? formatTime(p.endTime - p.startTime) : null 
    }));

    leaderboard.sort((a, b) => {
        // الفائزون أولاً
        if (a.isWinner && !b.isWinner) return -1;
        if (!a.isWinner && b.isWinner) return 1;

        // حسب التقدم (الأعلى أولاً)
        if (b.progress !== a.progress) return b.progress - a.progress;

        // حسب الأخطاء (الأقل أولاً)
        if (a.errors !== b.errors) return a.errors - b.errors;

        // لا نقوم بالفرز الزمني إلا إذا كانا فائزين أو هناك منطق زمني إضافي
        return 0;
    });

    return leaderboard;
}

function formatTime(ms) {
    // دالة لتحويل الميلي ثانية إلى تنسيق MM:SS
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function broadcastLeaderboard() {
    const sortedList = getSortedLeaderboard();
    io.emit('leaderboardUpdate', sortedList);
}

// **********************************************
// إعداد مسارات Express (لخدمة الملفات الثابتة)
// **********************************************

// لخدمة الملفات الثابتة من مجلد 'public'
app.use(express.static(path.join(__dirname, 'public')));

// توجيه الصفحات
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/player.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player.html'));
});
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// **********************************************
// منطق Socket.io (التعامل مع التحديثات اللحظية)
// **********************************************

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // 1. تسجيل انضمام اللاعب (من login.js)
    socket.on('playerJoin', (username) => {
        if (!players[username]) {
            players[username] = {
                name: username,
                progress: 0,
                errors: 0,
                startTime: Date.now(),
                endTime: null,
                isWinner: false
            };
        }
        players[username].socketId = socket.id;
        console.log(`Player registered: ${username}`);
        broadcastLeaderboard();
    });

    // 2. طلب حالة اللاعب الفردية
    socket.on('requestPlayerStatus', (username, callback) => {
        const player = players[username] || { progress: 0, errors: 0, isWinner: false };
        callback(player); // إرسال حالة اللاعب كاستجابة فورية
    });
    
    // 3. طلب قائمة الترتيب والفائز العالمي
    socket.on('requestLeaderboard', () => {
        broadcastLeaderboard();
    });
    
    // 3.1 طلب الفائز العالمي (للتأكد عند التحميل)
    socket.on('requestGlobalWinner', () => {
        if (globalWinner) {
            socket.emit('globalWinner', globalWinner.name);
        }
    });

    // 4. معالجة الإجابة الصحيحة
    socket.on('correctAnswer', (username, callback) => {
        const player = players[username];
        if (player && player.progress < NUM_QUESTIONS) {
            player.progress++;
            
            // تحقق مما إذا كان اللاعب قد أنهى جميع الأسئلة
            if (player.progress === NUM_QUESTIONS) {
                player.isWinner = true;
                player.endTime = Date.now();
            }
            
            broadcastLeaderboard(); // إرسال تحديث للجميع
            callback();
        }
    });

    // 5. معالجة الإجابة الخاطئة
    socket.on('incorrectAnswer', (username) => {
        const player = players[username];
        if (player && player.progress < NUM_QUESTIONS) {
            player.errors++;
            broadcastLeaderboard(); // إرسال تحديث للجميع
        }
    });

    // 6. إعلان الفوز باللعبة
    socket.on('playerWinsGame', (username) => {
        // يسمح بالاعلان مرة واحدة فقط
        if (!globalWinner) {
            globalWinner = players[username];
            // تأكيد حالة الفوز والوقت النهائي
            if (!globalWinner.isWinner) {
                 globalWinner.isWinner = true;
                 globalWinner.endTime = Date.now();
            }

            io.emit('globalWinner', username); // إرسال إعلان الفائز لجميع الأجهزة
            broadcastLeaderboard();
        }
    });

    // 7. أمر إعادة التعيين من الأدمن
    socket.on('adminResetGame', (callback) => {
        players = {}; // تفريغ بيانات اللاعبين
        globalWinner = null;
        io.emit('globalWinner', null); // إزالة إعلان الفائز
        broadcastLeaderboard();
        callback();
        console.log("Game successfully reset by admin.");
    });

    // 8. عند قطع الاتصال
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// **********************************************
// تشغيل الخادم
// **********************************************
// Render سيستخدم قيمة PORT من بيئة التشغيل
const PORT = process.env.PORT || 3000; 
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});