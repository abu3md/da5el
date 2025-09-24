// server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// إعداد المسارات
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
// إعداد Socket.IO لقبول الاتصالات من أي مصدر (cors)
const io = new Server(httpServer, {
    cors: {
        origin: "*", // السماح بالاتصال من أي مكان (للتجربة)
        methods: ["GET", "POST"]
    }
});

// متغيرات حالة الخادم
let activePlayers = {}; // { socketId: { id: userId, name: '...', role: '...', team: '...', points: 0, socketId: '...' } }
let teams = { blue: 0, red: 0 };
const ADMIN_PASSWORD = 'Sam@123';
const SPECTATOR_PASSWORD = 'Sam@321';

// لتشغيل الملفات الساكنة (HTML, CSS, JS)
app.use(express.static(join(__dirname, 'public')));

// عند اتصال عميل جديد (متصفح جديد)
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // إرسال الحالة الحالية للموقع فورًا للعميل الجديد
    socket.emit('updateState', { players: Object.values(activePlayers), teams });

    // 1. معالجة محاولة تسجيل الدخول
    socket.on('login', (username) => {
        const trimmedUsername = username.trim();
        let role;

        // التحقق من الدور
        if (trimmedUsername === ADMIN_PASSWORD) {
            role = 'admin';
        } else if (trimmedUsername === SPECTATOR_PASSWORD) {
            role = 'spectator';
        } else {
            role = 'player';
        }

        // إنشاء أو تحديث بيانات اللاعب
        const player = {
            id: socket.id, // استخدام socket.id كمعرف مؤقت للاعب النشط
            name: (role === 'admin' ? 'المسؤول' : role === 'spectator' ? 'المشاهد' : trimmedUsername),
            role: role,
            team: null,
            points: 0,
            socketId: socket.id
        };

        activePlayers[socket.id] = player;
        
        // إخبار العميل بنجاح تسجيل الدخول ودوره
        socket.emit('loginSuccess', player);

        // إرسال تحديث قائمة اللاعبين للجميع (خاصةً المدير والمشاهد)
        io.emit('updateState', { players: Object.values(activePlayers), teams });
        
        console.log(`Player ${player.name} (${role}) logged in.`);
    });

    // 2. معالجة توزيع الفرق (خاص بالمدير)
    socket.on('assignTeam', ({ playerId, team }) => {
        // يجب إضافة تحقق هنا للتأكد من أن المرسل هو المدير
        if (activePlayers[socket.id]?.role !== 'admin') return;

        const targetPlayer = Object.values(activePlayers).find(p => p.id === playerId);
        if (targetPlayer) {
            targetPlayer.team = team;
            // يجب إعادة حساب النقاط بعد كل تحديث
            updateTeamsPoints();
            io.emit('updateState', { players: Object.values(activePlayers), teams });
        }
    });

    // 3. معالجة تعديل النقاط (خاص بالمدير)
    socket.on('updatePoints', ({ playerId, amount }) => {
        if (activePlayers[socket.id]?.role !== 'admin') return;
        
        const targetPlayer = Object.values(activePlayers).find(p => p.id === playerId);
        if (targetPlayer) {
            targetPlayer.points = Math.max(0, targetPlayer.points + amount);
            updateTeamsPoints();
            io.emit('updateState', { players: Object.values(activePlayers), teams });
        }
    });
    
    // 4. طرد اللاعب (جديد - خاص بالمدير)
    socket.on('kickPlayer', (playerId) => {
        if (activePlayers[socket.id]?.role !== 'admin') return;

        const targetSocketId = Object.values(activePlayers).find(p => p.id === playerId)?.socketId;
        if (targetSocketId) {
            // استخدام io.sockets.sockets.get() للحصول على كائن السوكيت وطرد المستخدم
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
                targetSocket.emit('kicked', 'لقد تم طردك من اللعبة بواسطة المدير.');
                targetSocket.disconnect(true);
            }
        }
        // بعد الطرد سيتم معالجة حذف اللاعب في حدث 'disconnect'
    });
    
    // 5. إدارة جولة الكلمات (لتبسيط الأمر، سيتم تحديث حالة اللعبة من الخادم)
    // (يجب أن تكون هذه الآلية أكثر تعقيداً في الواقع، لكنها تعمل كمثال)
    socket.on('startGame', (data) => {
        if (activePlayers[socket.id]?.role !== 'admin') return;
        // إرسال أمر بدء اللعبة للاعب المستهدف
        io.to(data.playerId).emit('startWordGame', data.word);
    });

    // عند فصل الاتصال (إغلاق المتصفح أو الطرد)
    socket.on('disconnect', () => {
        const disconnectedPlayer = activePlayers[socket.id];
        if (disconnectedPlayer) {
            delete activePlayers[socket.id];
            updateTeamsPoints();
            console.log(`User disconnected: ${disconnectedPlayer.name} (${socket.id})`);
        }
        // إرسال تحديث للحالة بعد خروج اللاعب
        io.emit('updateState', { players: Object.values(activePlayers), teams });
    });
});

// وظيفة مساعدة لإعادة حساب نقاط الفرق
function updateTeamsPoints() {
    let bluePoints = 0;
    let redPoints = 0;
    Object.values(activePlayers).forEach(p => {
        if (p.team === 'blue') bluePoints += p.points;
        if (p.team === 'red') redPoints += p.points;
    });
    teams = { blue: bluePoints, red: redPoints };
}

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});

// ملاحظة: لتبسيط الكود، يجب أن تحفظ هذا الملف في مجلد منفصل عن ملفات الموقع الساكنة (HTML/CSS/JS)
// أو قم بتعديل مسار `express.static` ليتناسب مع هيكل مجلدك.