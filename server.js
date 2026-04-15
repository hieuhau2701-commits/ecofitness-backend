const express = require('express');
const cors = require('cors');
const speakeasy = require('speakeasy');

const app = express();
app.use(cors());
app.use(express.json());

// Lưu tạm Khóa bí mật (Trong thực tế sẽ lưu vào Database gắn với Email người dùng)
let tempSecret = null;

// API 1: Tạo Khóa bí mật cho người dùng mới đăng ký
app.get('/api/generate-secret', (req, res) => {
    const secret = speakeasy.generateSecret({ 
        name: 'EcoFitness' 
    });
    tempSecret = secret.base32; // Lưu lại để lát nữa kiểm tra
    res.json({ 
        secret: secret.base32,
        qrUrl: secret.otpauth_url 
    });
});

// API 2: Kiểm tra mã 6 số người dùng nhập vào
app.post('/api/verify', (req, res) => {
    const { token } = req.body;
    
    // Thuật toán kiểm tra mã dựa trên thời gian thực
    const verified = speakeasy.totp.verify({
        secret: tempSecret,
        encoding: 'base32',
        token: token,
        window: 1 // Cho phép sai số 30 giây (mã vừa qua hạn vẫn có thể chấp nhận)
    });

    if (verified) {
        res.json({ success: true, message: 'Mã chính xác!' });
    } else {
        res.json({ success: false, message: 'Mã sai hoặc đã hết hạn.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Máy chủ Backend đang chạy tại cổng ${PORT}`);
});