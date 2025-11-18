// Тестовые данные
const carClasses = [
    { id: 1, name: 'economy', daily_price: 1500, description: 'Бюджетные автомобили для городской езды' },
    { id: 2, name: 'comfort', daily_price: 2500, description: 'Комфортабельные седаны для поездок' },
    { id: 3, name: 'business', daily_price: 5000, description: 'Премиальные автомобили для бизнеса' },
    { id: 4, name: 'suv', daily_price: 4000, description: 'Внедорожники для путешествий' }
];

const cars = [
    { id: 1, model: 'Toyota Corolla', class_id: 1, license_plate: 'А123ВС777', year: 2022, color: 'Белый', features: 'Кондиционер, Bluetooth' },
    { id: 2, model: 'Hyundai Solaris', class_id: 1, license_plate: 'В456ОР777', year: 2021, color: 'Серый', features: 'Кондиционер, парктроник' },
    { id: 3, model: 'Kia Rio', class_id: 1, license_plate: 'С789ТХ777', year: 2023, color: 'Красный', features: 'Климат-контроль, камера' },
    
    { id: 4, model: 'Volkswagen Passat', class_id: 2, license_plate: 'Е321КХ777', year: 2022, color: 'Черный', features: 'Кожаный салон, подогрев сидений' },
    { id: 5, model: 'Skoda Octavia', class_id: 2, license_plate: 'М654АВ777', year: 2023, color: 'Синий', features: 'Панорамная крыша, ксенон' },
    { id: 6, model: 'Toyota Camry', class_id: 2, license_plate: 'Н987УС777', year: 2022, color: 'Белый', features: 'Кожа, климат-контроль' },
    
    { id: 7, model: 'Mercedes E-Class', class_id: 3, license_plate: 'О159РВ777', year: 2023, color: 'Черный', features: 'Память сидений, массаж' },
    { id: 8, model: 'BMW 5 Series', class_id: 3, license_plate: 'Р753АК777', year: 2022, color: 'Серый', features: 'Парктроник, камера 360' },
    { id: 9, model: 'Audi A6', class_id: 3, license_plate: 'Т246СМ777', year: 2023, color: 'Синий', features: 'Полный привод, премиум аудио' },
    
    { id: 10, model: 'Toyota RAV4', class_id: 4, license_plate: 'У369ФН777', year: 2022, color: 'Белый', features: 'Полный привод, круиз-контроль' },
    { id: 11, model: 'Honda CR-V', class_id: 4, license_plate: 'Х582ЛО777', year: 2023, color: 'Красный', features: 'Парктроник, камера' },
    { id: 12, model: 'Nissan X-Trail', class_id: 4, license_plate: 'Ф714ПР777', year: 2022, color: 'Черный', features: 'Климат-контроль, подогрев руля' }
];

// Тестовые бронирования
let bookings = [
    { id: 1, client_name: 'Иванов Иван', client_phone: '+7-911-123-45-67', client_email: 'ivanov@mail.ru', car_id: 1, start_date: '2024-03-01', end_date: '2024-03-05', status: 'completed' },
    { id: 2, client_name: 'Петров Петр', client_phone: '+7-912-234-56-78', client_email: 'petrov@gmail.com', car_id: 5, start_date: '2024-03-10', end_date: '2024-03-12', status: 'confirmed' },
    { id: 3, client_name: 'Сидорова Анна', client_phone: '+7-913-345-67-89', client_email: 'sidorova@yandex.ru', car_id: 8, start_date: '2024-03-15', end_date: '2024-03-20', status: 'confirmed' }
];

// Функции для работы с данными
function getCarClassById(id) {
    return carClasses.find(cls => cls.id === id);
}

function getCarsByClass(classId) {
    return cars.filter(car => car.class_id === classId);
}

function isCarAvailable(carId, startDate, duration) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration);
    
    const conflictingBooking = bookings.find(booking => 
        booking.car_id === carId && 
        booking.status === 'confirmed' &&
        isDateOverlap(startDate, endDate, booking.start_date, booking.end_date)
    );
    
    return !conflictingBooking;
}

function isDateOverlap(start1, end1, start2, end2) {
    const startDate1 = new Date(start1);
    const endDate1 = new Date(end1);
    const startDate2 = new Date(start2);
    const endDate2 = new Date(end2);
    
    return startDate1 <= endDate2 && endDate1 >= startDate2;
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}