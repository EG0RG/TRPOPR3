const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('.'));

// Подключение к БАЗЕ ДАННЫХ
const db = new sqlite3.Database('./car_rental.db', (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
    } else {
        console.log('✅ Подключено к базе данных car_rental.db');
        initDatabase();
    }
});

// Инициализация БД - УПРОЩЕННАЯ И РАБОЧАЯ ВЕРСИЯ
function initDatabase() {
    console.log('🔄 Инициализация базы данных...');
    
    db.serialize(() => {
        // Создаем таблицы
        db.run(`CREATE TABLE IF NOT EXISTS car_classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            daily_price REAL NOT NULL
        )`);
        
        db.run(`CREATE TABLE IF NOT EXISTS cars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model TEXT NOT NULL,
            class_id INTEGER,
            license_plate TEXT UNIQUE,
            year INTEGER,
            color TEXT,
            features TEXT
        )`);
        
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL,
            client_phone TEXT NOT NULL,
            client_email TEXT NOT NULL,
            car_id INTEGER,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            status TEXT DEFAULT 'confirmed'
        )`);

        // Сначала исправляем цены
        db.run("UPDATE car_classes SET daily_price = 1500 WHERE name = 'economy'");
        db.run("UPDATE car_classes SET daily_price = 2500 WHERE name = 'comfort'");
        db.run("UPDATE car_classes SET daily_price = 5000 WHERE name = 'business'");
        db.run("UPDATE car_classes SET daily_price = 4000 WHERE name = 'suv'");
        
        // Добавляем классы автомобилей
        const carClasses = [
            ['economy', 1500],       
            ['comfort', 2500],       
            ['business', 5000],     
            ['suv', 4000]           
        ];
        
        const insertClass = db.prepare("INSERT OR IGNORE INTO car_classes (name, daily_price) VALUES (?, ?)");
        carClasses.forEach(cls => {
            insertClass.run(cls);
        });
        insertClass.finalize();

        // Добавляем автомобили
        const cars = [
            ['Toyota Corolla', 1, '1234 AB-1', 2022, 'Белый', 'Кондиционер, Bluetooth'],
            ['Hyundai Solaris', 1, '5678 BC-1', 2021, 'Серый', 'Кондиционер, парктроник'],
            ['Kia Rio', 1, '9012 CD-1', 2023, 'Красный', 'Климат-контроль, камера'],
            ['Volkswagen Passat', 2, '3456 DE-1', 2022, 'Черный', 'Кожаный салон, подогрев сидений'],
            ['Skoda Octavia', 2, '7890 EF-1', 2023, 'Синий', 'Панорамная крыша, ксенон'],
            ['Toyota Camry', 2, '1234 GH-1', 2022, 'Белый', 'Кожа, климат-контроль'],
            ['Mercedes E-Class', 3, '5678 IJ-1', 2023, 'Черный', 'Память сидений, массаж'],
            ['BMW 5 Series', 3, '9012 KL-1', 2022, 'Серый', 'Парктроник, камера 360'],
            ['Audi A6', 3, '3456 MN-1', 2023, 'Синий', 'Полный привод, премиум аудио'],
            ['Toyota RAV4', 4, '7890 OP-1', 2022, 'Белый', 'Полный привод, круиз-контроль'],
            ['Honda CR-V', 4, '1234 QR-1', 2023, 'Красный', 'Парктроник, камера'],
            ['Nissan X-Trail', 4, '5678 ST-1', 2022, 'Черный', 'Климат-контроль, подогрев руля']
        ];
        
        const insertCar = db.prepare("INSERT OR IGNORE INTO cars (model, class_id, license_plate, year, color, features) VALUES (?, ?, ?, ?, ?, ?)");
        cars.forEach(car => {
            insertCar.run(car);
        });
        insertCar.finalize();

        console.log('✅ База данных инициализирована');
        
        // Проверяем данные
        db.all("SELECT name, daily_price FROM car_classes", (err, rows) => {
            if (!err) {
                console.log('📊 Классы автомобилей:');
                rows.forEach(row => {
                    console.log(`   ${row.name}: ${row.daily_price} руб.`);
                });
            }
        });
        
        db.get("SELECT COUNT(*) as count FROM cars", (err, row) => {
            if (!err) {
                console.log(`📊 Всего автомобилей: ${row.count}`);
            }
        });
    });
}

// 📊 API: Автомобили по названию класса
app.get('/api/cars-by-class/:className', (req, res) => {
    const className = req.params.className;
    
    console.log('🔍 Запрос автомобилей класса:', className);
    
    const query = `
        SELECT c.*, cc.name as class_name, cc.daily_price 
        FROM cars c 
        LEFT JOIN car_classes cc ON c.class_id = cc.id 
        WHERE cc.name = ?
    `;
    
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
                daily_price: rows[0].daily_price
            },
            cars: rows,
            total_count: rows.length
        });
    });
});

// 📊 API: Бронирования по статусу
app.get('/api/bookings-by-status/:status', (req, res) => {
    const status = req.params.status;
    
    const query = `
        SELECT b.*, c.model as car_model, cc.name as class_name 
        FROM bookings b
        LEFT JOIN cars c ON b.car_id = c.id
        LEFT JOIN car_classes cc ON c.class_id = cc.id
        WHERE b.status = ?
    `;
    
    db.all(query, [status], (err, rows) => {
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

// 📨 POST: Создание бронирования
app.post('/api/bookings', (req, res) => {
    console.log('🎯 POST /api/bookings - ЗАПРОС ПОЛУЧЕН!');
    console.log('📦 Тело запроса:', JSON.stringify(req.body, null, 2));
    
    const { client_name, client_phone, client_email, car_id, start_date, duration } = req.body;
    
    // УЛУЧШЕННАЯ ПРОВЕРКА ПОЛЕЙ
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

    // Проверяем существование автомобиля
    db.get('SELECT id FROM cars WHERE id = ?', [carId], (err, car) => {
        if (err) {
            console.error('❌ Ошибка проверки автомобиля:', err);
            return res.status(500).json({ error: 'Ошибка проверки автомобиля' });
        }
        
        if (!car) {
            return res.status(404).json({ error: 'Автомобиль не найден' });
        }

        // Рассчитываем дату окончания
        const endDate = new Date(start_date);
        endDate.setDate(endDate.getDate() + durationDays);
        const end_date = endDate.toISOString().split('T')[0];

        console.log('📅 Даты бронирования:', { start_date, end_date, duration: durationDays });

        // Сохраняем бронирование
        db.run(
            `INSERT INTO bookings (client_name, client_phone, client_email, car_id, start_date, end_date, status) 
             VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`,
            [client_name.trim(), client_phone.trim(), client_email.trim(), carId, start_date, end_date],
            function(err) {
                if (err) {
                    console.error('❌ Ошибка сохранения бронирования:', err);
                    return res.status(500).json({ error: 'Ошибка сохранения бронирования: ' + err.message });
                }
                
                console.log('✅ Бронирование создано, ID:', this.lastID);
                res.status(201).json({ 
                    id: this.lastID, 
                    message: 'Бронирование успешно создано',
                    details: { 
                        client_name, 
                        car_id: carId, 
                        start_date, 
                        end_date,
                        duration: durationDays
                    }
                });
            }
        );
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
});