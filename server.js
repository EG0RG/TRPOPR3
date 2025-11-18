const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname)); // Обслуживаем файлы из ТЕКУЩЕЙ папки

// 📊 ПУНКТ 1: Получить автомобили по классу
app.get('/api/cars-by-class/:classId', (req, res) => {
    const classId = parseInt(req.params.classId);
    
    const carClasses = [
        { id: 1, name: 'economy', daily_price: 1500, description: 'Бюджетные автомобили для городской езды' },
        { id: 2, name: 'comfort', daily_price: 2500, description: 'Комфортабельные седаны для поездок' },
        { id: 3, name: 'business', daily_price: 5000, description: 'Премиальные автомобили для бизнеса' },
        { id: 4, name: 'suv', daily_price: 4000, description: 'Внедорожники для путешествий' }
    ];

const cars = [
    { id: 1, model: 'Toyota Corolla', class_id: 1, license_plate: '1234 AB-1', year: 2022, color: 'Белый', features: 'Кондиционер, Bluetooth' },
    { id: 2, model: 'Hyundai Solaris', class_id: 1, license_plate: '5678 BC-1', year: 2021, color: 'Серый', features: 'Кондиционер, парктроник' },
    { id: 3, model: 'Kia Rio', class_id: 1, license_plate: '9012 CD-1', year: 2023, color: 'Красный', features: 'Климат-контроль, камера' },
    { id: 4, model: 'Volkswagen Passat', class_id: 2, license_plate: '3456 DE-1', year: 2022, color: 'Черный', features: 'Кожаный салон, подогрев сидений' },
    { id: 5, model: 'Skoda Octavia', class_id: 2, license_plate: '7890 EF-1', year: 2023, color: 'Синий', features: 'Панорамная крыша, ксенон' },
    { id: 6, model: 'Toyota Camry', class_id: 2, license_plate: '1234 GH-1', year: 2022, color: 'Белый', features: 'Кожа, климат-контроль' },
    { id: 7, model: 'Mercedes E-Class', class_id: 3, license_plate: '5678 IJ-1', year: 2023, color: 'Черный', features: 'Память сидений, массаж' },
    { id: 8, model: 'BMW 5 Series', class_id: 3, license_plate: '9012 KL-1', year: 2022, color: 'Серый', features: 'Парктроник, камера 360' },
    { id: 9, model: 'Audi A6', class_id: 3, license_plate: '3456 MN-1', year: 2023, color: 'Синий', features: 'Полный привод, премиум аудио' },
    { id: 10, model: 'Toyota RAV4', class_id: 4, license_plate: '7890 OP-1', year: 2022, color: 'Белый', features: 'Полный привод, круиз-контроль' },
    { id: 11, model: 'Honda CR-V', class_id: 4, license_plate: '1234 QR-1', year: 2023, color: 'Красный', features: 'Парктроник, камера' },
    { id: 12, model: 'Nissan X-Trail', class_id: 4, license_plate: '5678 ST-1', year: 2022, color: 'Черный', features: 'Климат-контроль, подогрев руля' }
];
    
    const carsInClass = cars.filter(car => car.class_id === classId);
    
    if (carsInClass.length === 0) {
        return res.status(404).json({ error: 'Автомобили данного класса не найдены' });
    }
    
    const classInfo = carClasses.find(cls => cls.id === classId);
    const result = carsInClass.map(car => ({
        ...car,
        class_name: classInfo ? classInfo.name : 'Неизвестно',
        daily_price: classInfo ? classInfo.daily_price : 0
    }));
    
    res.json({
        class_info: classInfo,
        cars: result,
        total_count: result.length
    });
});

// 📊 ПУНКТ 2: Получить бронирования по статусу
app.get('/api/bookings-by-status/:status', (req, res) => {
    const status = req.params.status;
    const validStatuses = ['confirmed', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Неверный статус. Допустимые: confirmed, completed, cancelled' });
    }
    
    const bookings = [
    { id: 1, client_name: 'Иванов Иван', client_phone: '+375-29-123-45-67', client_email: 'ivanov@mail.ru', car_id: 1, start_date: '2024-03-01', end_date: '2024-03-05', status: 'completed' },
    { id: 2, client_name: 'Петров Петр', client_phone: '+375-33-234-56-78', client_email: 'petrov@gmail.com', car_id: 4, start_date: '2024-03-10', end_date: '2024-03-12', status: 'confirmed' },
    { id: 3, client_name: 'Сидорова Анна', client_phone: '+375-25-345-67-89', client_email: 'sidorova@yandex.ru', car_id: 5, start_date: '2024-03-15', end_date: '2024-03-20', status: 'confirmed' }
];
    
  const cars = [
    { id: 1, model: 'Toyota Corolla', class_id: 1, license_plate: '1234 AB-1', year: 2022, color: 'Белый', features: 'Кондиционер, Bluetooth', image: '/images/toyota_corolla.jpg' },
    { id: 2, model: 'Hyundai Solaris', class_id: 1, license_plate: '5678 BC-1', year: 2021, color: 'Серый', features: 'Кондиционер, парктроник', image: '/images/hyundai_solaris.jpg' },
    { id: 3, model: 'Kia Rio', class_id: 1, license_plate: '9012 CD-1', year: 2023, color: 'Красный', features: 'Климат-контроль, камера', image: '/images/kia_rio.jpg' },
    { id: 4, model: 'Volkswagen Passat', class_id: 2, license_plate: '3456 DE-1', year: 2022, color: 'Черный', features: 'Кожаный салон, подогрев сидений', image: '/images/volkswagen_passat.jpg' },
    { id: 5, model: 'Skoda Octavia', class_id: 2, license_plate: '7890 EF-1', year: 2023, color: 'Синий', features: 'Панорамная крыша, ксенон', image: '/images/skoda_octavia.jpg' },
    { id: 6, model: 'Toyota Camry', class_id: 2, license_plate: '1234 GH-1', year: 2022, color: 'Белый', features: 'Кожа, климат-контроль', image: '/images/toyota_camry.jpg' },
    { id: 7, model: 'Mercedes E-Class', class_id: 3, license_plate: '5678 IJ-1', year: 2023, color: 'Черный', features: 'Память сидений, массаж', image: '/images/mercedes_eclass.jpg' },
    { id: 8, model: 'BMW 5 Series', class_id: 3, license_plate: '9012 KL-1', year: 2022, color: 'Серый', features: 'Парктроник, камера 360', image: '/images/bmw_5series.jpg' },
    { id: 9, model: 'Audi A6', class_id: 3, license_plate: '3456 MN-1', year: 2023, color: 'Синий', features: 'Полный привод, премиум аудио', image: '/images/audi_a6.jpg' },
    { id: 10, model: 'Toyota RAV4', class_id: 4, license_plate: '7890 OP-1', year: 2022, color: 'Белый', features: 'Полный привод, круиз-контроль', image: '/images/toyota_rav4.jpg' },
    { id: 11, model: 'Honda CR-V', class_id: 4, license_plate: '1234 QR-1', year: 2023, color: 'Красный', features: 'Парктроник, камера', image: '/images/honda_crv.jpg' },
    { id: 12, model: 'Nissan X-Trail', class_id: 4, license_plate: '5678 ST-1', year: 2022, color: 'Черный', features: 'Климат-контроль, подогрев руля', image: '/images/nissan_xtrail.jpg' }
];

    const carClasses = [
        { id: 1, name: 'economy', daily_price: 1500, description: 'Бюджетные автомобили для городской езды' },
        { id: 2, name: 'comfort', daily_price: 2500, description: 'Комфортабельные седаны для поездок' }
    ];
    
    const filteredBookings = bookings.filter(booking => booking.status === status);
    
    const result = filteredBookings.map(booking => {
        const car = cars.find(c => c.id === booking.car_id);
        const carClass = carClasses.find(cls => cls.id === car.class_id);
        
        return {
            ...booking,
            car_model: car ? car.model : 'Неизвестно',
            car_license: car ? car.license_plate : 'Неизвестно',
            class_name: carClass ? carClass.name : 'Неизвестно',
            daily_price: carClass ? carClass.daily_price : 0
        };
    });
    
    res.json({
        status: status,
        bookings: result,
        total_count: result.length,
        total_amount: result.reduce((sum, booking) => {
            const days = Math.ceil((new Date(booking.end_date) - new Date(booking.start_date)) / (1000 * 60 * 60 * 24));
            return sum + (booking.daily_price * days);
        }, 0)
    });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log('🚗 Сервер запущен!');
  console.log('📄 Открой в браузере: http://localhost:3000/auto.html');
  console.log('📊 API тест 1: http://localhost:3000/api/cars-by-class/1');
  console.log('📊 API тест 2: http://localhost:3000/api/bookings-by-status/confirmed');
});// Проект завершен
