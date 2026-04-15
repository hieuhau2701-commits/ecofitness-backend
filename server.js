const express = require('express');
const cors = require('cors');
const speakeasy = require('speakeasy');
const fs = require('fs'); // Thêm thư viện File System có sẵn của Node.js

const app = express();
app.use(cors());
app.use(express.json());

// Hàm đọc dữ liệu từ file JSON
const loadDatabase = () => {
    try {
        const data = fs.readFileSync('database.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Nếu file chưa tồn tại thì trả về mảng rỗng
        return []; 
    }
};

// Hàm lưu dữ liệu vào file JSON
const saveDatabase = (data) => {
    fs.writeFileSync('database.json', JSON.stringify(data, null, 4));
};

app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    let users = loadDatabase(); // Đọc database hiện tại

    if (users.find(u => u.email === email)) {
        return res.json({ success: false, message: 'Email này đã được đăng ký!' });
    }

    const secret = speakeasy.generateSecret({ name: `EcoFitness (${email})` });
    
    // Thêm người dùng mới
    users.push({ email, password, secret: secret.base32 });
    
    // Ghi đè lại vào file để lưu vĩnh viễn
    saveDatabase(users); 

    res.json({ success: true, qrUrl: secret.otpauth_url });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    let users = loadDatabase();

    const user = users.find(u => u.email === email);
    if (!user || user.password !== password) {
        return res.json({ success: false, message: 'Sai email hoặc mật khẩu!' });
    }
    res.json({ success: true, message: 'Mật khẩu đúng, chuyển sang nhập mã 2FA' });
});

app.post('/api/verify', (req, res) => {
    const { email, token } = req.body;
    let users = loadDatabase();
    
    const user = users.find(u => u.email === email);
    if (!user) return res.json({ success: false, message: 'Lỗi không tìm thấy tài khoản.' });

    const verified = speakeasy.totp.verify({
        secret: user.secret,
        encoding: 'base32',
        token: token,
        window: 1
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