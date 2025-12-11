const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());
app.use(express.static('.'));

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
                console.error('❌ Ошибка подключения к Gmail:', error.message);
                
                transporter = {
                    sendMail: async () => {
                        console.log('📧 Email отправлен (заглушка)');
                        return { messageId: 'test-gmail-id' };
                    }
                };
            } else {
                console.log('✅ Gmail SMTP настроен успешно!');
                console.log('📧 Отправка с: confirmationsc94@gmail.com');
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка настройки Gmail:', error);
        transporter = {
            sendMail: async () => {
                console.log('📧 Email отправлен (заглушка)');
                return { messageId: 'test-message-id' };
            }
        };
    }
};

setupEmailTransporter();

const db = new sqlite3.Database('./car_rental.db', (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
    } else {
        console.log('✅ Подключено к базе данных car_rental.db');
        initDatabase();
        startConfirmationChecker();
    }
});

function initDatabase() {
    console.log('🔄 Инициализация базы данных...');
    
    db.serialize(() => {
        // Удаляем таблицы если существуют
        db.run(`DROP TABLE IF EXISTS bookings`);
        db.run(`DROP TABLE IF EXISTS cars`);
        db.run(`DROP TABLE IF EXISTS car_classes`);
        
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
            FOREIGN KEY (class_id) REFERENCES car_classes(id)
        )`);
        
        // Создаем таблицу бронирований
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            FOREIGN KEY (car_id) REFERENCES cars(id)
        )`);

        // Вставляем данные классов автомобилей
        const carClasses = [
            ['economy', 80],       
            ['comfort', 120],       
            ['business', 200],     
            ['suv', 150]           
        ];
        
        const insertClass = db.prepare("INSERT INTO car_classes (name, base_daily_price) VALUES (?, ?)");
        carClasses.forEach(cls => {
            insertClass.run(cls);
        });
        insertClass.finalize();

        // Вставляем автомобили с уникальными ценами - УВЕЛИЧЕННОЕ КОЛИЧЕСТВО
        const cars = [
            // Эконом класс (база 80 BYN) - 8 автомобилей
            ['Toyota Corolla', 1, '1234 AB-1', 2022, 'Белый', 'Кондиционер, Bluetooth', 85],
            ['Hyundai Solaris', 1, '5678 BC-1', 2021, 'Серый', 'Кондиционер, парктроник', 82],
            ['Kia Rio', 1, '9012 CD-1', 2023, 'Красный', 'Климат-контроль, камера', 90],
            ['Renault Logan', 1, '3456 DE-2', 2022, 'Серебристый', 'ЭУР, ABS', 78],
            ['Lada Vesta', 1, '7890 EF-2', 2023, 'Черный', 'Кондиционер, подогрев сидений', 75],
            ['Skoda Fabia', 1, '1234 GH-2', 2022, 'Синий', 'Климат-контроль, мультимедиа', 88],
            ['Nissan Almera', 1, '5678 IJ-2', 2021, 'Белый', 'Кондиционер, камера заднего вида', 80],
            ['Volkswagen Polo', 1, '9012 KL-2', 2023, 'Серый', 'Панорамная крыша, парктроник', 92],
            
            // Комфорт класс (база 120 BYN) - 8 автомобилей
            ['Volkswagen Passat', 2, '3456 MN-1', 2022, 'Черный', 'Кожаный салон, подогрев сидений', 130],
            ['Skoda Octavia', 2, '7890 OP-1', 2023, 'Синий', 'Панорамная крыша, ксенон', 140],
            ['Toyota Camry', 2, '1234 QR-1', 2022, 'Белый', 'Кожа, климат-контроль', 135],
            ['Mazda 6', 2, '5678 ST-1', 2023, 'Красный', 'Кожаный салон, BOSE аудио', 145],
            ['Ford Mondeo', 2, '9012 UV-1', 2022, 'Синий', 'Парктроник, камера 360', 125],
            ['Kia Optima', 2, '3456 WX-1', 2021, 'Черный', 'Вентиляция сидений, подогрев руля', 138],
            ['Hyundai Sonata', 2, '7890 YZ-1', 2023, 'Серебристый', 'Панорамная крыша, камера', 142],
            ['Subaru Legacy', 2, '1234 AA-2', 2022, 'Белый', 'Полный привод, климат-контроль', 155],
            
            // Бизнес класс (база 200 BYN) - 8 автомобилей
            ['Mercedes E-Class', 3, '5678 BB-1', 2023, 'Черный', 'Память сидений, массаж', 220],
            ['BMW 5 Series', 3, '9012 CC-1', 2022, 'Серый', 'Парктроник, камера 360', 210],
            ['Audi A6', 3, '3456 DD-1', 2023, 'Синий', 'Полный привод, премиум аудио', 230],
            ['Lexus ES', 3, '7890 EE-1', 2022, 'Белый', 'Марк Левенсон аудио, кожа', 240],
            ['Jaguar XF', 3, '1234 FF-1', 2023, 'Красный', 'Кожаный салон, массаж сидений', 250],
            ['Volvo S90', 3, '5678 GG-1', 2022, 'Черный', 'Панорамная крыша, система безопасности', 235],
            ['Genesis G80', 3, '9012 HH-1', 2023, 'Серебристый', 'Премиум аудио, адаптивный круиз', 245],
            ['Cadillac CT5', 3, '3456 II-1', 2022, 'Синий', 'Массаж сидений, ночное видение', 260],
            
            // Внедорожники (база 150 BYN) - 8 автомобилей
            ['Toyota RAV4', 4, '7890 JJ-1', 2022, 'Белый', 'Полный привод, круиз-контроль', 160],
            ['Honda CR-V', 4, '1234 KK-1', 2023, 'Красный', 'Парктроник, камера', 155],
            ['Nissan X-Trail', 4, '5678 LL-1', 2022, 'Черный', 'Климат-контроль, подогрев руля', 165],
            ['Mazda CX-5', 4, '9012 MM-1', 2023, 'Серый', 'Кожаный салон, камера 360', 170],
            ['Ford Explorer', 4, '3456 NN-1', 2022, 'Синий', 'Третий ряд сидений, парктроник', 180],
            ['Hyundai Tucson', 4, '7890 OO-1', 2023, 'Белый', 'Панорамная крыша, Apple CarPlay', 158],
            ['Kia Sportage', 4, '1234 PP-1', 2022, 'Красный', 'Вентиляция сидений, подогрев руля', 162],
            ['Volkswagen Tiguan', 4, '5678 QQ-1', 2023, 'Черный', 'Цифровая приборная панель, кожа', 175]
        ];
        
        const insertCar = db.prepare("INSERT INTO cars (model, class_id, license_plate, year, color, features, daily_price) VALUES (?, ?, ?, ?, ?, ?, ?)");
        cars.forEach(car => {
            insertCar.run(car);
        });
        insertCar.finalize();

        console.log('✅ База данных инициализирована с 32 автомобилями (по 8 в каждом классе)');
    });
}

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
        console.log('📧 Письмо отправлено с confirmationsc94@gmail.com на адрес:', clientEmail);
        console.log('📧 ID письма:', info.messageId);
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка отправки письма через Gmail:', error);
        return false;
    }
}

function checkExpiredBookings() {
    const query = `UPDATE bookings SET status = 'rejected' WHERE status = 'waiting' AND expires_at < datetime('now')`;
    
    db.run(query, function(err) {
        if (err) {
            console.error('❌ Ошибка проверки просроченных бронирований:', err);
        } else if (this.changes > 0) {
            console.log(`⏰ Автоматически отклонено ${this.changes} просроченных бронирований`);
        }
    });
}

function startConfirmationChecker() {
    setInterval(checkExpiredBookings, 30000);
    console.log('⏰ Запущен проверщик просроченных бронирований');
}

// 📊 API: Проверка доступности автомобиля
app.post('/api/check-availability', (req, res) => {
    const { car_id, start_date, end_date } = req.body;
    
    console.log('🔍 Проверка доступности авто:', { car_id, start_date, end_date });
    
    const query = `SELECT COUNT(*) as count FROM bookings WHERE car_id = ? AND status IN ('waiting', 'confirmed') AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))`;
    
    db.get(query, [car_id, start_date, start_date, end_date, end_date, start_date, end_date], (err, result) => {
        if (err) {
            console.error('❌ Ошибка проверки доступности:', err);
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
});

// 📊 API: Автомобили по названию класса
app.get('/api/cars-by-class/:className', (req, res) => {
    const className = req.params.className;
    
    console.log('🔍 Запрос автомобилей класса:', className);
    
    const query = `SELECT c.*, cc.name as class_name, cc.base_daily_price FROM cars c LEFT JOIN car_classes cc ON c.class_id = cc.id WHERE cc.name = ? AND c.available = 1`;
    
    db.all(query, [className], (err, rows) => {
        if (err) {
            console.error('❌ Ошибка БД:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (rows.length === 0) {
            console.log('❌ Автомобили не найдены для класса:', className);
            return res.status(404).json({ error: 'Автомобили не найдены' });
        }
        
        console.log('✅ Найдено автомобилей:', rows.length);
        
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

// 📊 API: Бронирования по статусу
app.get('/api/bookings-by-status/:status', (req, res) => {
    const status = req.params.status;
    
    let query = `SELECT b.*, c.model as car_model, cc.name as class_name, c.daily_price FROM bookings b LEFT JOIN cars c ON b.car_id = c.id LEFT JOIN car_classes cc ON c.class_id = cc.id`;
    const params = [];
    
    if (status !== 'all') {
        query += ` WHERE b.status = ?`;
        params.push(status);
    }
    
    query += ` ORDER BY b.created_at DESC`;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('❌ Ошибка БД:', err);
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            status: status,
            bookings: rows,
            total_count: rows.length
        });
    });
});

// 📊 API: Годовой отчет
app.get('/api/annual-report/:year', (req, res) => {
    const year = req.params.year;
    
    console.log('📊 Запрос годового отчета за:', year);
    
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
            console.error('❌ Ошибка получения годового отчета:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Рассчитываем общую статистику
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

// 📊 API: Отчет с фильтрами
app.get('/api/reports-filtered', (req, res) => {
    const { month, year, status, car_class } = req.query;
    
    console.log('📊 Запрос отчета с фильтрами:', { month, year, status, car_class });
    
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
            console.error('❌ Ошибка получения фильтрованного отчета:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Рассчитываем статистику
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

// 📊 API: Все бронирования с фильтрацией (старый endpoint - оставляем для совместимости)
app.get('/api/all-bookings-report', (req, res) => {
    const { month, year, status } = req.query;
    
    console.log('📊 Запрос всех бронирований:', { month, year, status });
    
    let query = `SELECT b.*, c.model as car_model, cc.name as class_name, c.daily_price FROM bookings b LEFT JOIN cars c ON b.car_id = c.id LEFT JOIN car_classes cc ON c.class_id = cc.id WHERE 1=1`;
    const params = [];
    
    if (status && status !== 'all') {
        query += ` AND b.status = ?`;
        params.push(status);
    }
    
    if (month && year) {
        query += ` AND strftime('%m', b.start_date) = ? AND strftime('%Y', b.start_date) = ?`;
        params.push(month.padStart(2, '0'), year);
    } else if (month) {
        query += ` AND strftime('%m', b.start_date) = ?`;
        params.push(month.padStart(2, '0'));
    } else if (year) {
        query += ` AND strftime('%Y', b.start_date) = ?`;
        params.push(year);
    }
    
    query += ` ORDER BY b.created_at DESC`;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('❌ Ошибка получения отчета:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Рассчитываем статистику
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
            month: month || 'все',
            year: year || 'все',
            status: status || 'все',
            stats: stats,
            bookings: rows
        });
    });
});

// 🗑️ API: Удалить все бронирования
app.delete('/api/clear-all-bookings', (req, res) => {
    console.log('🗑️ Запрос на удаление всех бронирований');
    
    const query = `DELETE FROM bookings`;
    
    db.run(query, function(err) {
        if (err) {
            console.error('❌ Ошибка удаления бронирований:', err);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`✅ Удалено бронирований: ${this.changes}`);
        
        res.json({
            success: true,
            message: `Удалено ${this.changes} бронирований`,
            deleted_count: this.changes
        });
    });
});

// ✅ API: Подтверждение бронирования по коду
app.post('/api/confirm-booking', (req, res) => {
    const { booking_id, confirmation_code } = req.body;
    
    console.log('🔐 Запрос подтверждения бронирования:', { booking_id, confirmation_code });
    
    if (!booking_id || !confirmation_code) {
        return res.status(400).json({ error: 'ID бронирования и код подтверждения обязательны' });
    }

    const query = `UPDATE bookings SET status = 'confirmed', confirmed_at = datetime('now') WHERE id = ? AND confirmation_code = ? AND status = 'waiting' AND expires_at > datetime('now')`;
    
    db.run(query, [booking_id, confirmation_code.toUpperCase()], function(err) {
        if (err) {
            console.error('❌ Ошибка подтверждения бронирования:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            db.get(`SELECT status, expires_at FROM bookings WHERE id = ?`, [booking_id], (err, row) => {
                if (err) {
                    return res.status(400).json({ error: 'Неверный код подтверждения или бронирование просрочено' });
                }
                
                if (!row) {
                    return res.status(404).json({ error: 'Бронирование не найдено' });
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
            console.log('✅ Бронирование подтверждено, ID:', booking_id);
            res.json({ 
                success: true, 
                message: 'Бронирование успешно подтверждено!',
                booking_id: booking_id
            });
        }
    });
});

// ❌ API: Отклонить бронирование
app.post('/api/reject-booking/:id', (req, res) => {
    const bookingId = req.params.id;
    
    console.log('❌ Запрос отклонения бронирования:', bookingId);
    
    const query = `UPDATE bookings SET status = 'rejected' WHERE id = ? AND status = 'waiting'`;
    
    db.run(query, [bookingId], function(err) {
        if (err) {
            console.error('❌ Ошибка отклонения бронирования:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(400).json({ error: 'Бронирование не найдено или уже обработано' });
        }
        
        console.log('✅ Бронирование отклонено, ID:', bookingId);
        res.json({ 
            success: true, 
            message: 'Бронирование отклонено',
            booking_id: bookingId
        });
    });
});

// 📨 POST: Создание бронирования
app.post('/api/bookings', async (req, res) => {
    console.log('🎯 POST /api/bookings - ЗАПРОС ПОЛУЧЕН!');
    console.log('📦 Тело запроса:', JSON.stringify(req.body, null, 2));
    
    const { client_name, client_phone, client_email, car_id, start_date, duration } = req.body;
    
    const missingFields = [];
    if (!client_name || client_name.trim() === '') missingFields.push('client_name');
    if (!client_phone || client_phone.trim() === '') missingFields.push('client_phone');
    if (!client_email || client_email.trim() === '') missingFields.push('client_email');
    if (!car_id) missingFields.push('car_id');
    if (!start_date || start_date.trim() === '') missingFields.push('start_date');
    if (!duration) missingFields.push('duration');
    
    if (missingFields.length > 0) {
        console.error('❌ Отсутствуют поля:', missingFields);
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

    // Получаем данные автомобиля
    db.get(`SELECT c.*, cc.name as class_name FROM cars c LEFT JOIN car_classes cc ON c.class_id = cc.id WHERE c.id = ?`, [carId], async (err, car) => {
        if (err) {
            console.error('❌ Ошибка проверки автомобиля:', err);
            return res.status(500).json({ error: 'Ошибка проверки автомобиля' });
        }
        
        if (!car) {
            return res.status(404).json({ error: 'Автомобиль не найден' });
        }

        // Проверяем доступность авто на выбранные даты
        const endDate = new Date(start_date);
        endDate.setDate(endDate.getDate() + durationDays);
        const end_date = endDate.toISOString().split('T')[0];
        
        const checkQuery = `SELECT COUNT(*) as count FROM bookings WHERE car_id = ? AND status IN ('waiting', 'confirmed') AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))`;
        
        db.get(checkQuery, [carId, start_date, start_date, end_date, end_date, start_date, end_date], async (err, result) => {
            if (err) {
                console.error('❌ Ошибка проверки доступности:', err);
                return res.status(500).json({ error: 'Ошибка проверки доступности автомобиля' });
            }
            
            if (result && result.count > 0) {
                return res.status(400).json({ error: 'Автомобиль уже забронирован на выбранные даты' });
            }

            const confirmationCode = generateConfirmationCode();
            const totalPrice = car.daily_price * durationDays;

            console.log('📅 Даты бронирования:', { start_date, end_date, duration: durationDays });
            console.log('🔐 Код подтверждения:', confirmationCode);
            console.log('💰 Цена за день:', car.daily_price, 'BYN, Итого:', totalPrice, 'BYN');

            const insertQuery = `INSERT INTO bookings (client_name, client_phone, client_email, car_id, start_date, end_date, status, confirmation_code, confirmation_sent_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'waiting', ?, datetime('now'), datetime('now', '+5 minutes'))`;
            
            db.run(insertQuery, [client_name.trim(), client_phone.trim(), client_email.trim(), carId, start_date, end_date, confirmationCode], async function(err) {
                if (err) {
                    console.error('❌ Ошибка сохранения бронирования:', err);
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
                
                console.log('✅ Бронирование создано, ID:', bookingId);
                console.log('📧 Статус отправки email:', emailSent ? 'Успешно' : 'Ошибка');
                
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
                    note: 'У вас есть 5 минут для подтверждения бронирования. Введите код в форме на сайте.',
                    booking_id: bookingId,
                    confirmation_code: confirmationCode
                });
            });
        });
    });
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'auto.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log('🚀 СЕРВЕР ЗАПУЩЕН!');
    console.log('📍 http://localhost:3000');
    console.log('🎯 БАЗА ДАННЫХ РАБОТАЕТ!');
    console.log('📧 ПОЧТА: confirmationsc94@gmail.com');
    console.log('🚗 32 АВТОМОБИЛЯ (по 8 в каждом классе)');
    console.log('💰 УНИКАЛЬНЫЕ ЦЕНЫ ДЛЯ КАЖДОГО АВТО');
    console.log('📊 СТАТУСЫ: waiting → confirmed/rejected');
});