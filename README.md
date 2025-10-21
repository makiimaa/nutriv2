# 🍱 Nutrition4Kids

> Nền tảng dinh dưỡng AI cho trẻ em - Hỗ trợ trường học, giáo viên và phụ huynh quản lý bữa ăn, sức khỏe với gợi ý thông minh từ AI.

---

## ⚙️ Yêu cầu hệ thống

- **Git**
- **Node.js** (v18 trở lên)
- **pnpm** hoặc **npm**
- **Python** (3.10 trở lên)
- **MongoDB** (local hoặc MongoDB Atlas)
- **Expo CLI**: `npm install -g expo-cli`

---

## 📦 Clone dự án

```bash
git clone https://github.com/makiimaa/nutriv2.git
cd nutriv2
```

---

## 🔐 Cấu hình môi trường

Mỗi module có file `.env.example` mẫu. Copy và chỉnh sửa theo môi trường của bạn:

```bash
# Backend (NestJS)
cp backend/.env.example backend/.env

# Admin Web (Next.js)
cp web-admin/.env.example web-admin/.env

# Mobile App (Expo)
cp frontend/.env.example frontend/.env

# AI Backend (FastAPI)
cp be-py/.env.example be-py/.env
```

### Cấu hình cơ bản cần thiết:

**backend/.env**

```env
MONGODB_URI=mongodb://localhost:27017/nutrition4kids
JWT_SECRET=your_jwt_secret_key
PORT=3000
```

**web-admin/.env**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
PORT=3001
```

**be-py/.env**

```env
MONGODB_URI=mongodb://localhost:27017/nutrition4kids
AI_MODEL_PATH=./models
PORT=8001
```

---

## 🛠️ Cài đặt & Chạy

### 🔹 Backend (NestJS)

```bash
cd backend
npm install
# hoặc
pnpm install

# Chạy development mode
npm run start:dev
# hoặc
pnpm start:dev
```

→ Chạy tại: **http://localhost:3000**

### 🔹 Admin Web (Next.js)

```bash
cd web-admin
npm install
# hoặc
pnpm install

# Chạy development mode
PORT=3001 npm run dev
# hoặc
PORT=3001 pnpm dev
```

→ Chạy tại: **http://localhost:3001**

### 🔹 Mobile App (Expo)

```bash
cd frontend
npm install

# Chạy Expo
npx expo start
```

**Lựa chọn chạy:**

- Quét QR code bằng **Expo Go** app (iOS/Android)
- Nhấn `i` để mở **iOS Simulator**
- Nhấn `a` để mở **Android Emulator**
- Nhấn `w` để mở **Web browser**

> **⚠️ LƯU Ý QUAN TRỌNG:**  
> Thay đổi địa chỉ IP trong file `frontend/src/api/axiosClient.ts`:
>
> ```typescript
> // Thay 192.168.1.167 bằng IP máy của bạn
> baseURL: "http://192.168.1.167:3000";
> ```
>
> **Cách lấy IP máy:**
>
> - **Windows**: `ipconfig` → tìm IPv4 Address
> - **macOS/Linux**: `ifconfig` hoặc `ip addr show`

### 🔹 AI Backend (FastAPI)

```bash
cd be-py

# Tạo virtual environment (khuyến nghị)
python -m venv venv

# Kích hoạt virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt

# Chạy server
uvicorn app:app --reload --port 8001
```

→ API Docs tại: **http://localhost:8001/docs**

---

## 🗄️ Cài đặt MongoDB

### Local MongoDB:

```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb

# Windows: Tải từ https://www.mongodb.com/try/download/community
```

### Hoặc sử dụng MongoDB Atlas (Cloud):

1. Đăng ký tại: https://www.mongodb.com/cloud/atlas
2. Tạo cluster miễn phí
3. Lấy connection string và cập nhật vào `.env`

---

## 🚀 Khởi động toàn bộ hệ thống

Mở 4 terminal và chạy các lệnh sau:

```bash
# Terminal 1 - Backend
cd backend && pnpm start:dev

# Terminal 2 - Admin Web
cd web-admin && PORT=3001 pnpm dev

# Terminal 3 - Mobile App
cd frontend && npx expo start

# Terminal 4 - AI Backend
cd be-py && source venv/bin/activate && uvicorn app:app --reload --port 8001
```

---

## 📱 Kiểm tra hệ thống

- **Backend API**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3001
- **AI API Docs**: http://localhost:8001/docs
- **Mobile App**: Quét QR từ Expo CLI

---

## 🐛 Troubleshooting

### Lỗi kết nối MongoDB:

```bash
# Kiểm tra MongoDB đang chạy
# macOS/Linux:
brew services list | grep mongodb
# hoặc
sudo systemctl status mongodb

# Windows: Kiểm tra trong Services
```

### Lỗi port đã được sử dụng:

```bash
# Tìm process đang dùng port (ví dụ: 3000)
# macOS/Linux:
lsof -i :3000
# Windows:
netstat -ano | findstr :3000

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Expo không kết nối được:

- Đảm bảo máy tính và điện thoại cùng mạng WiFi
- Kiểm tra firewall không chặn port 19000-19001
- Thử tunnel mode: `npx expo start --tunnel`

---

## 📜 License

© Nutrition4Kids Team 2025
