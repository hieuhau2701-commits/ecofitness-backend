const express = require('express');
const cors = require('cors');
const speakeasy = require('speakeasy');
const mongoose = require('mongoose'); // Import thư viện MongoDB

const app = express();
app.use(cors());
app.use(express.json());

// 1. KẾT NỐI MONGODB ATLAS
// LƯU Ý: Thay chuỗi dưới đây bằng chuỗi bạn vừa Copy ở Bước 1 (nhớ điền đúng mật khẩu)
const mongoURI = 'mongodb+srv://vhieu:<db_password>@database.4ezmvs9.mongodb.net/?appName=database';

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Đã kết nối thành công với MongoDB Atlas!'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// 2. TẠO "KHUÔN MẪU" DỮ LIỆU (SCHEMA) CHO NGƯỜI DÙNG
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    secret: { type: String, required: true }, // Mã bí mật của Authenticator
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// 3. API ĐĂNG KÝ
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Kiểm tra xem email đã tồn tại trong DB chưa
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: 'Email này đã được đăng ký!' });
        }

        // Tạo mã Authenticator
        const secret = speakeasy.generateSecret({ name: `EcoFitness (${email})` });
        
        // Lưu thẳng vào MongoDB
        const newUser = new User({
            email,
            password, // (Thực tế nên mã hóa password trước khi lưu)
            secret: secret.base32
        });
        await newUser.save();

        res.json({ success: true, qrUrl: secret.otpauth_url });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Lỗi hệ thống khi đăng ký.' });
    }
});

// 4. API ĐĂNG NHẬP
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Tìm user trong MongoDB
        const user = await User.findOne({ email });
        
        if (!user || user.password !== password) {
            return res.json({ success: false, message: 'Sai email hoặc mật khẩu!' });
        }
        res.json({ success: true, message: 'Đăng nhập thành công, chuyển sang 2FA' });
    } catch (error) {
        res.json({ success: false, message: 'Lỗi hệ thống khi đăng nhập.' });
    }
});

// 5. API XÁC MINH 2FA
app.post('/api/verify', async (req, res) => {
    try {
        const { email, token } = req.body;
        
        // Lấy lại user từ MongoDB để lấy mã Secret của họ
        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, message: 'Lỗi không tìm thấy tài khoản.' });

        // Chấm điểm mã 6 số
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
    } catch (error) {
        res.json({ success: false, message: 'Lỗi hệ thống khi xác minh mã.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Máy chủ Backend đang chạy tại cổng ${PORT}`);
});