const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// الإعداد الأساسي
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// **********************************************
// قاعدة البيانات الوهمية (تخزين بيانات اللاعبين)
// **********************************************
let players = {}; 
let globalWinner = null;
const NUM_QUESTIONS = 4; // عدد الأسئلة الكلي (تأكد من مطابقته لكود JS)

// دالة فرز اللاعبين (الأعلى تقدماً، الأقل أخطاءً، الأسرع وقتاً)
function getSortedLeaderboard() {
    const leaderboard = Object.values(players).map(p => ({
        name: p.name,
        progress: p.progress,
        errors: p.errors,
        isWinner: p.isWinner,
        time: p.isWinner ? formatTime(p.endTime - p.startTime) : null // الوقت الآن يُحسب
    }));

    leaderboard.sort((a, b) => {
        if (a.isWinner && !b.isWinner) return -1;
        if (!a.isWinner && b.isWinner) return 1;
        if (b.progress !== a.progress) return b.progress - a.progress;
        if (a.errors !== b.errors) return a.errors - b.errors;
        return 0;
    });
    return leaderboard;
}

function formatTime(ms) {
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

// توجيه الصفحة الرئيسية وبقية صفحات اللعبة
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

    // ... (جميع وظائف socket.on و socket.emit من الكود السابق) ...

    socket.on('playerJoin', (username) => {
        if (!players[username]) {
            players[username] = {
                name: username, progress: 0, errors: 0, 
                startTime: Date.now(), endTime: null, isWinner: false
            };
        }
        players[username].socketId = socket.id;
        broadcastLeaderboard();
    });

    socket.on('requestPlayerStatus', (username, callback) => {
        const player = players[username] || { progress: 0, errors: 0, isWinner: false };
        callback(player);
    });
    
    socket.on('requestLeaderboard', () => {
        broadcastLeaderboard();
        if (globalWinner) {
            socket.emit('globalWinner', globalWinner.name);
        }
    });

    socket.on('correctAnswer', (username, callback) => {
        const player = players[username];
        if (player && player.progress < NUM_QUESTIONS) {
            player.progress++;
            if (player.progress === NUM_QUESTIONS) {
                player.isWinner = true;
                player.endTime = Date.now();
            }
            broadcastLeaderboard(); 
            callback();
        }
    });

    socket.on('incorrectAnswer', (username) => {
        const player = players[username];
        if (player && player.progress < NUM_QUESTIONS) {
            player.errors++;
            broadcastLeaderboard();
        }
    });

    socket.on('playerWinsGame', (username) => {
        if (!globalWinner) {
            globalWinner = players[username];
            globalWinner.isWinner = true;
            globalWinner.endTime = Date.now();
            io.emit('globalWinner', username);
            broadcastLeaderboard();
        }
    });

    socket.on('adminResetGame', (callback) => {
        players = {};
        globalWinner = null;
        io.emit('globalWinner', null);
        broadcastLeaderboard();
        callback();
    });
    
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// **********************************************
// تشغيل الخادم
// **********************************************
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});