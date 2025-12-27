const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Конфигурация
const JWT_SECRET = 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Middleware для проверки авторизации
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный токен' });
        }
        req.user = user;
        next();
    });
};

// Middleware для проверки роли
const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }
        
        next();
    };
};

// Инициализация базы данных
const db = new sqlite3.Database('./car_rental.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err.message);
    } else {
        console.log('Подключено к базе данных car_rental.db');
        initDatabase();
        startConfirmationChecker();
    }
});

async function initDatabase() {
    console.log('Инициализация базы данных...');
    
    db.serialize(() => {
        // Создаем таблицу пользователей
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Создаем таблицу классов автомобилей
        db.run(`CREATE TABLE IF NOT EXISTS car_classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            base_daily_price REAL NOT NULL
        )`);
        
        // Создаем таблицу автомобилей
        db.run(`CREATE TABLE IF NOT EXISTS cars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model TEXT NOT NULL,
            class_id INTEGER,
            license_plate TEXT UNIQUE,
            year INTEGER,
            color TEXT,
            features TEXT,
            daily_price REAL NOT NULL,
            available BOOLEAN DEFAULT 1,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (class_id) REFERENCES car_classes(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )`);
        
        // Создаем таблицу бронирований
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            client_name TEXT NOT NULL,
            client_phone TEXT NOT NULL,
            client_email TEXT NOT NULL,
            car_id INTEGER,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            status TEXT DEFAULT 'waiting',
            confirmation_code TEXT,
            confirmation_sent_at DATETIME,
            confirmed_at DATETIME,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (car_id) REFERENCES cars(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Вставляем начальные данные
        const carClasses = [
            ['economy', 80],       
            ['comfort', 120],       
            ['business', 200],     
            ['suv', 150]           
        ];
        
        const insertClass = db.prepare("INSERT OR IGNORE INTO car_classes (name, base_daily_price) VALUES (?, ?)");
        carClasses.forEach(cls => {
            insertClass.run(cls);
        });
        insertClass.finalize();

        // Вставляем автомобили
        const cars = [
            ['Toyota Corolla', 1, '1234 AB-1', 2022, 'Белый', 'Кондиционер, Bluetooth', 85],
            ['Hyundai Solaris', 1, '5678 BC-1', 2021, 'Серый', 'Кондиционер, парктроник', 82],
            ['Kia Rio', 1, '9012 CD-1', 2023, 'Красный', 'Климат-контроль, камера', 90],
            ['Renault Logan', 1, '3456 DE-2', 2022, 'Серебристый', 'ЭУР, ABS', 78],
            ['Lada Vesta', 1, '7890 EF-2', 2023, 'Черный', 'Кондиционер, подогрев сидений', 75],
            ['Skoda Fabia', 1, '1234 GH-2', 2022, 'Синий', 'Климат-контроль, мультимедиа', 88],
            ['Nissan Almera', 1, '5678 IJ-2', 2021, 'Белый', 'Кондиционер, камера заднего вида', 80],
            ['Volkswagen Polo', 1, '9012 KL-2', 2023, 'Серый', 'Панорамная крыша, парктроник', 92],
            ['Volkswagen Passat', 2, '3456 MN-1', 2022, 'Черный', 'Кожаный салон, подогрев сидений', 130],
            ['Skoda Octavia', 2, '7890 OP-1', 2023, 'Синий', 'Панорамная крыша, ксенон', 140],
            ['Toyota Camry', 2, '1234 QR-1', 2022, 'Белый', 'Кожа, климат-контроль', 135],
            ['Mazda 6', 2, '5678 ST-1', 2023, 'Красный', 'Кожаный салон, BOSE аудио', 145],
            ['Ford Mondeo', 2, '9012 UV-1', 2022, 'Синий', 'Парктроник, камера 360', 125],
            ['Kia Optima', 2, '3456 WX-1', 2021, 'Черный', 'Вентиляция сидений, подогрев руля', 138],
            ['Hyundai Sonata', 2, '7890 YZ-1', 2023, 'Серебристый', 'Панорамная крыша, камера', 142],
            ['Subaru Legacy', 2, '1234 AA-2', 2022, 'Белый', 'Полный привод, климат-контроль', 155],
            ['Mercedes E-Class', 3, '5678 BB-1', 2023, 'Черный', 'Память сидений, массаж', 220],
            ['BMW 5 Series', 3, '9012 CC-1', 2022, 'Серый', 'Парктроник, камера 360', 210],
            ['Audi A6', 3, '3456 DD-1', 2023, 'Синий', 'Полный привод, премиум аудио', 230],
            ['Lexus ES', 3, '7890 EE-1', 2022, 'Белый', 'Марк Левенсон аудио, кожа', 240],
            ['Jaguar XF', 3, '1234 FF-1', 2023, 'Красный', 'Кожаный салон, массаж сидений', 250],
            ['Volvo S90', 3, '5678 GG-1', 2022, 'Черный', 'Панорамная крыша, система безопасности', 235],
            ['Genesis G80', 3, '9012 HH-1', 2023, 'Серебристый', 'Премиум аудио, адаптивный круиз', 245],
            ['Cadillac CT5', 3, '3456 II-1', 2022, 'Синий', 'Массаж сидений, ночное видение', 260],
            ['Toyota RAV4', 4, '7890 JJ-1', 2022, 'Белый', 'Полный привод, круиз-контроль', 160],
            ['Honda CR-V', 4, '1234 KK-1', 2023, 'Красный', 'Парктроник, камера', 155],
            ['Nissan X-Trail', 4, '5678 LL-1', 2022, 'Черный', 'Климат-контроль, подогрев руля', 165],
            ['Mazda CX-5', 4, '9012 MM-1', 2023, 'Серый', 'Кожаный салон, камера 360', 170],
            ['Ford Explorer', 4, '3456 NN-1', 2022, 'Синий', 'Третий ряд сидений, парктроник', 180],
            ['Hyundai Tucson', 4, '7890 OO-1', 2023, 'Белый', 'Панорамная крыша, Apple CarPlay', 158],
            ['Kia Sportage', 4, '1234 PP-1', 2022, 'Красный', 'Вентиляция сидений, подогрев руля', 162],
            ['Volkswagen Tiguan', 4, '5678 QQ-1', 2023, 'Черный', 'Цифровая приборная панель, кожа', 175]
        ];
        
        const insertCar = db.prepare("INSERT OR IGNORE INTO cars (model, class_id, license_plate, year, color, features, daily_price) VALUES (?, ?, ?, ?, ?, ?, ?)");
        cars.forEach(car => {
            insertCar.run(car);
        });
        insertCar.finalize();

        console.log('База данных инициализирована');
    });
    
    // Создаем администратора после инициализации таблиц
    await createAdminUser();
}

// Настройка почтового транспорта
let transporter;
const setupEmailTransporter = async () => {
    try {
        const emailConfig = {
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: 'confirmationsc94@gmail.com',
                pass: 'awnf ziqy juzz dtea'
            }
        };
        
        transporter = nodemailer.createTransport(emailConfig);
        
        transporter.verify((error, success) => {
            if (error) {
                console.error('Ошибка подключения к Gmail:', error.message);
                
                transporter = {
                    sendMail: async () => {
                        console.log('Email отправлен (заглушка)');
                        return { messageId: 'test-gmail-id' };
                    }
                };
            } else {
                console.log('Gmail SMTP настроен успешно!');
            }
        });
        
    } catch (error) {
        console.error('Ошибка настройки Gmail:', error);
        transporter = {
            sendMail: async () => {
                console.log('Email отправлен (заглушка)');
                return { messageId: 'test-message-id' };
            }
        };
    }
};

setupEmailTransporter();

// Вспомогательные функции
function generateConfirmationCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function sendConfirmationEmail(clientEmail, clientName, confirmationCode, bookingDetails) {
    try {
        const mailOptions = {
            from: '"Автопрокат" <confirmationsc94@gmail.com>',
            to: clientEmail,
            subject: 'Подтверждение бронирования автомобиля',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #2c3e50; text-align: center;">Подтверждение бронирования</h2>
                    
                    <p>Уважаемый(ая) <strong>${clientName}</strong>,</p>
                    
                    <p>Ваше бронирование автомобиля создано и ожидает подтверждения.</p>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #34495e; margin-top: 0;">Детали бронирования:</h3>
                        <p><strong>Автомобиль:</strong> ${bookingDetails.carModel}</p>
                        <p><strong>Период аренды:</strong> ${bookingDetails.startDate} - ${bookingDetails.endDate}</p>
                        <p><strong>Продолжительность:</strong> ${bookingDetails.duration} дней</p>
                        <p><strong>Сумма:</strong> ${bookingDetails.totalPrice} BYN</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <h3 style="color: #e74c3c;">Код подтверждения:</h3>
                        <div style="font-size: 32px; font-weight: bold; color: #2c3e50; letter-spacing: 5px; background: #ecf0f1; padding: 15px; border-radius: 5px;">
                            ${confirmationCode}
                        </div>
                    </div>
                    
                    <p>Для подтверждения бронирования введите этот код в форме на сайте в течение <strong>5 минут</strong>.</p>
                    
                    <p style="color: #7f8c8d; font-size: 12px; text-align: center; margin-top: 30px;">
                        Если вы не создавали это бронирование, проигнорируйте это письмо.<br>
                        <small>Это письмо отправлено автоматически, пожалуйста, не отвечайте на него.</small>
                    </p>
                </div>
            `
        };

        let info = await transporter.sendMail(mailOptions);
        console.log('Письмо отправлено:', clientEmail);
        
        return true;
    } catch (error) {
        console.error('Ошибка отправки письма:', error);
        return false;
    }
}

function checkExpiredBookings() {
    const query = `UPDATE bookings SET status = 'rejected' WHERE status = 'waiting' AND expires_at < datetime('now')`;
    
    db.run(query, function(err) {
        if (err) {
            console.error('Ошибка проверки просроченных бронирований:', err);
        } else if (this.changes > 0) {
            console.log(`Автоматически отклонено ${this.changes} просроченных бронирований`);
        }
    });
}

function startConfirmationChecker() {
    setInterval(checkExpiredBookings, 30000);
    console.log('Запущен проверщик просроченных бронирований');
}

// =============================================
// СОЗДАНИЕ АДМИНИСТРАТОРА
// =============================================

async function createAdminUser() {
    return new Promise((resolve, reject) => {
        const adminEmail = 'admin@example.com';
        
        // Проверяем, существует ли уже администратор
        db.get('SELECT id FROM users WHERE email = ?', [adminEmail], async (err, row) => {
            if (err) {
                console.error('Ошибка проверки администратора:', err);
                reject(err);
                return;
            }
            
            if (row) {
                console.log('Администратор уже существует');
                resolve();
                return;
            }
            
            // Создаем хеш пароля
            try {
                const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
                
                db.run(
                    'INSERT INTO users (email, password, name, phone, role) VALUES (?, ?, ?, ?, ?)',
                    [adminEmail, hashedPassword, 'Администратор', '+375291234567', 'admin'],
                    function(err) {
                        if (err) {
                            console.error('Ошибка создания администратора:', err);
                            reject(err);
                        } else {
                            console.log('Администратор успешно создан:');
                            console.log('   Email: admin@example.com');
                            console.log('   Пароль: admin123');
                            resolve();
                        }
                    }
                );
            } catch (error) {
                console.error('Ошибка хеширования пароля:', error);
                reject(error);
            }
        });
    });
}

// =============================================
// API ENDPOINTS - ПУБЛИЧНЫЕ (для гостей)
// =============================================

// 1. Проверка свободных автомобилей (публичный доступ)
app.post('/api/available-cars', (req, res) => {
    try {
        const { date } = req.body;
        
        if (!date) {
            return res.status(400).json({ error: 'Дата обязательна' });
        }
        
        const query = `
            SELECT 
                c.*,
                cc.name as class_name,
                cc.base_daily_price
            FROM cars c
            LEFT JOIN car_classes cc ON c.class_id = cc.id
            WHERE c.available = 1
            AND c.id NOT IN (
                SELECT b.car_id 
                FROM bookings b 
                WHERE b.status IN ('waiting', 'confirmed')
                AND ? BETWEEN b.start_date AND b.end_date
            )
            ORDER BY cc.id, c.daily_price
        `;
        
        db.all(query, [date], (err, rows) => {
            if (err) {
                console.error('Ошибка поиска свободных автомобилей:', err);
                return res.status(500).json({ error: err.message });
            }
            
            const groupedByClass = {};
            rows.forEach(car => {
                if (!groupedByClass[car.class_name]) {
                    groupedByClass[car.class_name] = {
                        class_name: car.class_name,
                        base_price: car.base_daily_price,
                        cars: []
                    };
                }
                groupedByClass[car.class_name].cars.push(car);
            });
            
            const response = {
                success: true,
                date: date,
                total_available: rows.length,
                by_class: Object.values(groupedByClass),
                all_cars: rows
            };
            
            res.json(response);
        });
        
    } catch (error) {
        console.error('Ошибка в available-cars:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// 2. Аутентификация и регистрация
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name, phone } = req.body;
        
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, пароль и имя обязательны' });
        }
        
        // Проверяем, не пытается ли зарегистрироваться с email администратора
        if (email === 'admin@example.com') {
            return res.status(400).json({ error: 'Этот email зарезервирован для администратора' });
        }
        
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                console.error('Ошибка проверки email:', err);
                return res.status(500).json({ error: 'Ошибка БД' });
            }
            
            if (row) {
                return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
            }
            
            try {
                const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
                
                db.run(
                    'INSERT INTO users (email, password, name, phone, role) VALUES (?, ?, ?, ?, ?)',
                    [email, hashedPassword, name, phone || '', 'user'],
                    function(err) {
                        if (err) {
                            console.error('Ошибка создания пользователя:', err);
                            return res.status(500).json({ error: 'Ошибка создания пользователя' });
                        }
                        
                        const userId = this.lastID;
                        const token = jwt.sign(
                            { id: userId, email, name, role: 'user' },
                            JWT_SECRET,
                            { expiresIn: '7d' }
                        );
                        
                        res.status(201).json({
                            success: true,
                            message: 'Регистрация успешна',
                            user: { 
                                id: userId, 
                                email, 
                                name, 
                                phone: phone || '', 
                                role: 'user' 
                            },
                            token
                        });
                    }
                );
            } catch (hashError) {
                console.error('Ошибка хеширования пароля:', hashError);
                res.status(500).json({ error: 'Ошибка обработки пароля' });
            }
        });
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }
        
        console.log('Попытка входа для email:', email);
        
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error('Ошибка БД при входе:', err);
                return res.status(500).json({ error: 'Ошибка БД' });
            }
            
            if (!user) {
                console.log('Пользователь не найден:', email);
                return res.status(401).json({ error: 'Неверный email или пароль' });
            }
            
            console.log('Найден пользователь:', user.email, 'роль:', user.role);
            
            try {
                const validPassword = await bcrypt.compare(password, user.password);
                
                if (!validPassword) {
                    console.log('Неверный пароль для:', email);
                    return res.status(401).json({ error: 'Неверный email или пароль' });
                }
                
                console.log('Пароль верный для:', email);
                
                const token = jwt.sign(
                    { 
                        id: user.id, 
                        email: user.email, 
                        name: user.name, 
                        role: user.role 
                    },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );
                
                res.json({
                    success: true,
                    message: 'Авторизация успешна',
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        phone: user.phone || '',
                        role: user.role
                    },
                    token
                });
                
            } catch (bcryptError) {
                console.error('Ошибка сравнения пароля:', bcryptError);
                return res.status(500).json({ error: 'Ошибка проверки пароля' });
            }
        });
        
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// =============================================
// API ENDPOINTS - ТОЛЬКО ДЛЯ АВТОРИЗОВАННЫХ
// =============================================

// 1. Профиль пользователя
app.get('/api/profile', authenticateToken, (req, res) => {
    try {
        db.get(
            'SELECT id, email, name, phone, role, created_at FROM users WHERE id = ?',
            [req.user.id],
            (err, user) => {
                if (err) {
                    console.error('Ошибка получения профиля:', err);
                    return res.status(500).json({ error: 'Ошибка БД' });
                }
                
                if (!user) {
                    return res.status(404).json({ error: 'Пользователь не найден' });
                }
                
                res.json({
                    success: true,
                    user
                });
            }
        );
        
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// 2. Бронирование автомобилей
app.post('/api/bookings', authenticateToken, async (req, res) => {
    try {
        console.log('Создание бронирования для пользователя:', req.user.id);
        
        const { client_name, client_phone, client_email, car_id, start_date, duration } = req.body;
        
        // Проверяем соответствие данных пользователя
        if (client_email !== req.user.email) {
            return res.status(400).json({ error: 'Email должен совпадать с email из вашего профиля' });
        }
        
        const missingFields = [];
        if (!client_name || client_name.trim() === '') missingFields.push('client_name');
        if (!client_phone || client_phone.trim() === '') missingFields.push('client_phone');
        if (!client_email || client_email.trim() === '') missingFields.push('client_email');
        if (!car_id) missingFields.push('car_id');
        if (!start_date || start_date.trim() === '') missingFields.push('start_date');
        if (!duration) missingFields.push('duration');
        
        if (missingFields.length > 0) {
            console.error('Отсутствуют поля:', missingFields);
            return res.status(400).json({ 
                error: 'Все поля обязательны', 
                missing_fields: missingFields 
            });
        }

        const carId = parseInt(car_id);
        const durationDays = parseInt(duration);

        if (isNaN(carId)) {
            return res.status(400).json({ error: 'Неверный формат car_id' });
        }

        if (isNaN(durationDays) || durationDays < 1) {
            return res.status(400).json({ error: 'Неверная продолжительность аренды' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const startDateObj = new Date(start_date);
        startDateObj.setHours(0, 0, 0, 0);
        
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + 30);

        if (startDateObj < minDate) {
            const minDateStr = minDate.toISOString().split('T')[0];
            return res.status(400).json({ 
                error: `Бронирование возможно только с ${minDateStr} (через 30 дней от сегодняшней даты)` 
            });
        }

        db.get(`SELECT c.*, cc.name as class_name FROM cars c LEFT JOIN car_classes cc ON c.class_id = cc.id WHERE c.id = ?`, [carId], async (err, car) => {
            if (err) {
                console.error('Ошибка проверки автомобиля:', err);
                return res.status(500).json({ error: 'Ошибка проверки автомобиля' });
            }
            
            if (!car) {
                return res.status(404).json({ error: 'Автомобиль не найден' });
            }

            const endDate = new Date(start_date);
            endDate.setDate(endDate.getDate() + durationDays);
            const end_date = endDate.toISOString().split('T')[0];
            
            const checkQuery = `SELECT COUNT(*) as count FROM bookings WHERE car_id = ? AND status IN ('waiting', 'confirmed') AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))`;
            
            db.get(checkQuery, [carId, start_date, start_date, end_date, end_date, start_date, end_date], async (err, result) => {
                if (err) {
                    console.error('Ошибка проверки доступности:', err);
                    return res.status(500).json({ error: 'Ошибка проверки доступности автомобиля' });
                }
                
                if (result && result.count > 0) {
                    return res.status(400).json({ error: 'Автомобиль уже забронирован на выбранные даты' });
                }

                const confirmationCode = generateConfirmationCode();
                const totalPrice = car.daily_price * durationDays;

                const insertQuery = `INSERT INTO bookings (user_id, client_name, client_phone, client_email, car_id, start_date, end_date, status, confirmation_code, confirmation_sent_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', ?, datetime('now'), datetime('now', '+5 minutes'))`;
                
                db.run(insertQuery, [req.user.id, client_name.trim(), client_phone.trim(), client_email.trim(), carId, start_date, end_date, confirmationCode], async function(err) {
                    if (err) {
                        console.error('Ошибка сохранения бронирования:', err);
                        return res.status(500).json({ error: 'Ошибка сохранения бронирования: ' + err.message });
                    }
                    
                    const bookingId = this.lastID;
                    
                    const bookingDetails = {
                        carModel: car.model,
                        startDate: start_date,
                        endDate: end_date,
                        duration: durationDays,
                        totalPrice: totalPrice
                    };
                    
                    const emailSent = await sendConfirmationEmail(
                        client_email, 
                        client_name, 
                        confirmationCode, 
                        bookingDetails
                    );
                    
                    console.log('Бронирование создано, ID:', bookingId);
                    
                    res.status(201).json({ 
                        id: bookingId, 
                        message: 'Бронирование создано. Проверьте вашу почту для подтверждения.',
                        status: 'waiting',
                        details: { 
                            client_name, 
                            car_id: carId, 
                            car_model: car.model,
                            start_date, 
                            end_date,
                            duration: durationDays,
                            daily_price: car.daily_price,
                            total_price: totalPrice
                        },
                        email_sent: emailSent,
                        note: 'У вас есть 5 минут для подтверждения бронирования.',
                        booking_id: bookingId,
                        confirmation_code: confirmationCode
                    });
                });
            });
        });
    } catch (error) {
        console.error('Ошибка в обработке бронирования:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// 3. Мои бронирования
app.get('/api/my-bookings', authenticateToken, (req, res) => {
    try {
        const query = `
            SELECT b.*, c.model as car_model, cc.name as class_name, c.daily_price 
            FROM bookings b 
            LEFT JOIN cars c ON b.car_id = c.id 
            LEFT JOIN car_classes cc ON c.class_id = cc.id 
            WHERE b.user_id = ? 
            ORDER BY b.created_at DESC
        `;
        
        db.all(query, [req.user.id], (err, rows) => {
            if (err) {
                console.error('Ошибка получения бронирований:', err);
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                success: true,
                bookings: rows,
                total_count: rows.length
            });
        });
        
    } catch (error) {
        console.error('Ошибка получения моих бронирований:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// 4. Подтверждение бронирования
app.post('/api/confirm-booking', authenticateToken, (req, res) => {
    const { booking_id, confirmation_code } = req.body;
    
    console.log('Подтверждение бронирования:', { booking_id, confirmation_code, user_id: req.user.id });
    
    if (!booking_id || !confirmation_code) {
        return res.status(400).json({ error: 'ID бронирования и код подтверждения обязательны' });
    }

    const query = `UPDATE bookings SET status = 'confirmed', confirmed_at = datetime('now') WHERE id = ? AND user_id = ? AND confirmation_code = ? AND status = 'waiting' AND expires_at > datetime('now')`;
    
    db.run(query, [booking_id, req.user.id, confirmation_code.toUpperCase()], function(err) {
        if (err) {
            console.error('Ошибка подтверждения бронирования:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            db.get(`SELECT status, expires_at FROM bookings WHERE id = ? AND user_id = ?`, [booking_id, req.user.id], (err, row) => {
                if (err || !row) {
                    return res.status(400).json({ error: 'Бронирование не найдено' });
                }
                
                if (row.status !== 'waiting') {
                    return res.status(400).json({ error: 'Бронирование уже обработано' });
                }
                
                if (new Date(row.expires_at) < new Date()) {
                    return res.status(400).json({ error: 'Время подтверждения истекло' });
                }
                
                return res.status(400).json({ error: 'Неверный код подтверждения' });
            });
        } else {
            console.log('Бронирование подтверждено, ID:', booking_id);
            res.json({ 
                success: true, 
                message: 'Бронирование успешно подтверждено!',
                booking_id: booking_id
            });
        }
    });
});

// =============================================
// API ENDPOINTS - ТОЛЬКО ДЛЯ АДМИНИСТРАТОРОВ
// =============================================

// 1. Полные отчеты
app.get('/api/admin/reports-filtered', authenticateToken, authorizeRole('admin'), (req, res) => {
    const { month, year, status, car_class } = req.query;
    
    console.log('Запрос отчета администратором:', req.user.id, { month, year, status, car_class });
    
    let query = `
        SELECT b.*, c.model as car_model, cc.name as class_name, c.daily_price 
        FROM bookings b 
        LEFT JOIN cars c ON b.car_id = c.id 
        LEFT JOIN car_classes cc ON c.class_id = cc.id 
        WHERE 1=1
    `;
    const params = [];
    
    if (status && status !== 'all') {
        query += ` AND b.status = ?`;
        params.push(status);
    }
    
    if (car_class && car_class !== 'all') {
        query += ` AND cc.name = ?`;
        params.push(car_class);
    }
    
    if (month && year) {
        query += ` AND strftime('%m', b.start_date) = ? AND strftime('%Y', b.start_date) = ?`;
        params.push(month.padStart(2, '0'), year);
    } else if (month && !year) {
        query += ` AND strftime('%m', b.start_date) = ?`;
        params.push(month.padStart(2, '0'));
    } else if (year && !month) {
        query += ` AND strftime('%Y', b.start_date) = ?`;
        params.push(year);
    }
    
    query += ` ORDER BY b.created_at DESC`;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Ошибка получения фильтрованного отчета:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const stats = {
            total: rows.length,
            confirmed: rows.filter(b => b.status === 'confirmed').length,
            waiting: rows.filter(b => b.status === 'waiting').length,
            rejected: rows.filter(b => b.status === 'rejected').length,
            total_revenue: rows
                .filter(b => b.status === 'confirmed')
                .reduce((sum, booking) => {
                    const start = new Date(booking.start_date);
                    const end = new Date(booking.end_date);
                    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                    return sum + (booking.daily_price * days);
                }, 0)
        };
        
        res.json({
            success: true,
            filters: { month, year, status, car_class },
            stats: stats,
            bookings: rows
        });
    });
});

// 2. Годовой отчет
app.get('/api/admin/annual-report/:year', authenticateToken, authorizeRole('admin'), (req, res) => {
    const year = req.params.year;
    
    console.log('Запрос годового отчета администратором:', req.user.id);
    
    const query = `
        SELECT 
            strftime('%m', b.start_date) as month,
            COUNT(*) as total_bookings,
            SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
            SUM(CASE WHEN b.status = 'waiting' THEN 1 ELSE 0 END) as waiting_count,
            SUM(CASE WHEN b.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
            SUM(CASE WHEN b.status = 'confirmed' THEN 
                (julianday(b.end_date) - julianday(b.start_date) + 1) * c.daily_price 
                ELSE 0 END) as total_revenue,
            GROUP_CONCAT(DISTINCT cc.name) as car_classes
        FROM bookings b
        LEFT JOIN cars c ON b.car_id = c.id
        LEFT JOIN car_classes cc ON c.class_id = cc.id
        WHERE strftime('%Y', b.start_date) = ?
        GROUP BY strftime('%m', b.start_date)
        ORDER BY month
    `;
    
    db.all(query, [year], (err, rows) => {
        if (err) {
            console.error('Ошибка получения годового отчета:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const stats = {
            total: rows.reduce((sum, row) => sum + row.total_bookings, 0),
            confirmed: rows.reduce((sum, row) => sum + row.confirmed_count, 0),
            waiting: rows.reduce((sum, row) => sum + row.waiting_count, 0),
            rejected: rows.reduce((sum, row) => sum + row.rejected_count, 0),
            total_revenue: rows.reduce((sum, row) => sum + (row.total_revenue || 0), 0)
        };
        
        res.json({
            success: true,
            year: year,
            stats: stats,
            monthly_data: rows,
            message: `Годовой отчет за ${year} год`
        });
    });
});

// 3. Отклонение бронирования
app.post('/api/admin/reject-booking/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
    const bookingId = req.params.id;
    
    console.log('Отклонение бронирования администратором:', bookingId);
    
    const query = `UPDATE bookings SET status = 'rejected' WHERE id = ?`;
    
    db.run(query, [bookingId], function(err) {
        if (err) {
            console.error('Ошибка отклонения бронирования:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Бронирование не найдено' });
        }
        
        console.log('Бронирование отклонено, ID:', bookingId);
        res.json({ 
            success: true, 
            message: 'Бронирование отклонено',
            booking_id: bookingId
        });
    });
});

// 4. Удаление всех бронирований
app.delete('/api/admin/clear-all-bookings', authenticateToken, authorizeRole('admin'), (req, res) => {
    console.log('Запрос на удаление всех бронирований от админа:', req.user.id);
    
    const query = `DELETE FROM bookings`;
    
    db.run(query, function(err) {
        if (err) {
            console.error('Ошибка удаления бронирований:', err);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Удалено бронирований: ${this.changes}`);
        
        res.json({
            success: true,
            message: `Удалено ${this.changes} бронирований`,
            deleted_count: this.changes
        });
    });
});

// 5. Управление автомобилями
app.get('/api/admin/cars', authenticateToken, authorizeRole('admin'), (req, res) => {
    try {
        const query = `
            SELECT c.*, cc.name as class_name, u.name as creator_name
            FROM cars c
            LEFT JOIN car_classes cc ON c.class_id = cc.id
            LEFT JOIN users u ON c.created_by = u.id
            ORDER BY c.id DESC
        `;
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Ошибка получения автомобилей:', err);
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                success: true,
                cars: rows
            });
        });
        
    } catch (error) {
        console.error('Ошибка получения автомобилей:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.post('/api/admin/cars', authenticateToken, authorizeRole('admin'), (req, res) => {
    try {
        const { model, class_id, license_plate, year, color, features, daily_price } = req.body;
        
        if (!model || !class_id || !license_plate || !daily_price) {
            return res.status(400).json({ error: 'Обязательные поля: model, class_id, license_plate, daily_price' });
        }
        
        const query = `
            INSERT INTO cars (model, class_id, license_plate, year, color, features, daily_price, available, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        `;
        
        db.run(query, [model, class_id, license_plate, year || null, color || null, features || null, daily_price, req.user.id], function(err) {
            if (err) {
                console.error('Ошибка добавления автомобиля:', err);
                return res.status(500).json({ error: 'Ошибка БД: ' + err.message });
            }
            
            res.status(201).json({
                success: true,
                message: 'Автомобиль успешно добавлен',
                car_id: this.lastID
            });
        });
        
    } catch (error) {
        console.error('Ошибка добавления автомобиля:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.put('/api/admin/cars/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
    try {
        const carId = req.params.id;
        const { model, class_id, license_plate, year, color, features, daily_price, available } = req.body;
        
        const query = `
            UPDATE cars 
            SET model = ?, class_id = ?, license_plate = ?, year = ?, color = ?, features = ?, daily_price = ?, available = ?
            WHERE id = ?
        `;
        
        db.run(query, [model, class_id, license_plate, year || null, color || null, features || null, daily_price, available ? 1 : 0, carId], function(err) {
            if (err) {
                console.error('Ошибка обновления автомобиля:', err);
                return res.status(500).json({ error: 'Ошибка БД: ' + err.message });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Автомобиль не найден' });
            }
            
            res.json({
                success: true,
                message: 'Автомобиль успешно обновлен'
            });
        });
        
    } catch (error) {
        console.error('Ошибка обновления автомобиля:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.delete('/api/admin/cars/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
    try {
        const carId = req.params.id;
        
        db.get('SELECT COUNT(*) as count FROM bookings WHERE car_id = ? AND status IN ("waiting", "confirmed")', [carId], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка БД' });
            }
            
            if (result.count > 0) {
                return res.status(400).json({ error: 'Нельзя удалить автомобиль с активными бронированиями' });
            }
            
            db.run('DELETE FROM cars WHERE id = ?', [carId], function(err) {
                if (err) {
                    console.error('Ошибка удаления автомобиля:', err);
                    return res.status(500).json({ error: 'Ошибка БД' });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Автомобиль не найден' });
                }
                
                res.json({
                    success: true,
                    message: 'Автомобиль успешно удален'
                });
            });
        });
        
    } catch (error) {
        console.error('Ошибка удаления автомобиля:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// =============================================
// ДОПОЛНИТЕЛЬНЫЕ ENDPOINTS
// =============================================

// Проверка доступности автомобиля
app.post('/api/check-availability', (req, res) => {
    try {
        const { car_id, start_date, end_date } = req.body;
        
        if (!car_id || !start_date || !end_date) {
            return res.status(400).json({ error: 'Необходимы параметры: car_id, start_date, end_date' });
        }
        
        const query = `SELECT COUNT(*) as count FROM bookings WHERE car_id = ? AND status IN ('waiting', 'confirmed') AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))`;
        
        db.get(query, [car_id, start_date, start_date, end_date, end_date, start_date, end_date], (err, result) => {
            if (err) {
                console.error('Ошибка проверки доступности:', err);
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                available: result.count === 0,
                car_id: car_id,
                start_date: start_date,
                end_date: end_date,
                conflicting_bookings: result.count
            });
        });
    } catch (error) {
        console.error('Ошибка в check-availability:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получение автомобилей по классу
app.get('/api/cars-by-class/:className', (req, res) => {
    const className = req.params.className;
    
    const query = `SELECT c.*, cc.name as class_name, cc.base_daily_price FROM cars c LEFT JOIN car_classes cc ON c.class_id = cc.id WHERE cc.name = ? AND c.available = 1`;
    
    db.all(query, [className], (err, rows) => {
        if (err) {
            console.error('Ошибка БД:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Автомобили не найдены' });
        }
        
        res.json({
            class_info: {
                name: className,
                base_daily_price: rows[0].base_daily_price
            },
            cars: rows,
            total_count: rows.length
        });
    });
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'auto.html'));
});

// Обработка 404 ошибок
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработка ошибок сервера
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('СЕРВЕР ЗАПУЩЕН!');
    console.log(`📍 http://localhost:${PORT}`);
    console.log('БАЗА ДАННЫХ РАБОТАЕТ!');
    console.log('СИСТЕМА АВТОРИЗАЦИИ АКТИВНА');
    console.log('ТРИ РОЛИ: гость, пользователь, администратор');
    console.log('ОТЧЕТЫ: доступны только администраторам');
    console.log('='.repeat(50));
});