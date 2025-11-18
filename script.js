// Глобальные переменные
let currentBookingData = null;
const API_BASE = 'http://localhost:3000/api';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeForms();
    setDefaultDates();
    loadCarClasses();
    
    // 📊 Загружаем данные с бэкенда при старте
    loadCarsFromBackend();
    loadConfirmedBookingsFromBackend();
});

// 📊 ФРОНТЕНД ПУНКТ 1: Загрузка автомобилей с бэкенда
async function loadCarsFromBackend() {
    try {
        const response = await fetch(`${API_BASE}/cars`);
        if (!response.ok) throw new Error('Ошибка загрузки автомобилей');
        
        const backendCars = await response.json();
        console.log('Автомобили с бэкенда:', backendCars);
        
        // Можно использовать эти данные для отображения
        displayBackendCars(backendCars);
    } catch (error) {
        console.error('Ошибка загрузки автомобилей с бэкенда:', error);
    }
}

function displayBackendCars(backendCars) {
    // Пример: отображаем в консоли или можно добавить в интерфейс
    if (backendCars && backendCars.length > 0) {
        console.log('📊 Автомобили из базы данных:');
        backendCars.forEach(car => {
            console.log(`- ${car.brand} ${car.model} (${car.year}) - ${car.price} руб.`);
        });
    }
}

// 📊 ФРОНТЕНД ПУНКТ 2: Загрузка подтвержденных бронирований с бэкенда
async function loadConfirmedBookingsFromBackend() {
    try {
        const response = await fetch(`${API_BASE}/bookings-by-status/confirmed`);
        if (!response.ok) throw new Error('Ошибка загрузки бронирований');
        
        const result = await response.json();
        console.log('Подтвержденные бронирования с бэкенда:', result);
        
        // Обновляем таблицу подтвержденных заявок
        updateConfirmedBookingsTable(result.bookings);
    } catch (error) {
        console.error('Ошибка загрузки бронирований с бэкенда:', error);
    }
}

function updateConfirmedBookingsTable(bookings) {
    const tbody = document.querySelector('#confirmed-bookings-table tbody');
    if (!bookings || bookings.length === 0) return;
    
    // Добавляем строки с данными из бэкенда
    bookings.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Б-${booking.id}</td>
            <td>${booking.client_name}<br><small>${booking.client_phone}</small></td>
            <td>${booking.class_name}<br><small>${booking.car_model}</small></td>
            <td>${booking.start_date} - ${booking.end_date}</td>
            <td class="status-confirmed">${booking.status === 'confirmed' ? 'Подтверждено' : booking.status}</td>
        `;
        tbody.appendChild(row);
    });
}

// Навигация между разделами
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Убираем активный класс у всех ссылок и секций
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            
            // Добавляем активный класс к текущей ссылке и секции
            this.classList.add('active');
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            
            // При переходе на страницу отчетов загружаем актуальные данные
            if (sectionId === 'confirmed-reports') {
                loadConfirmedBookingsFromBackend();
            }
        });
    });
}

// Инициализация форм
function initializeForms() {
    // Форма бронирования
    document.getElementById('booking-form').addEventListener('submit', function(e) {
        e.preventDefault();
        searchCars();
    });
    
    // Форма подтверждения брони
    document.getElementById('confirm-booking').addEventListener('submit', function(e) {
        e.preventDefault();
        confirmBooking();
    });
    
    // Форма отчетов
    document.getElementById('reports-filter').addEventListener('submit', function(e) {
        e.preventDefault();
        loadConfirmedBookingsReport();
    });
    
    // Форма проверки доступности
    document.getElementById('availability-check').addEventListener('submit', function(e) {
        e.preventDefault();
        checkAvailabilityReport();
    });
}

// Установка дат по умолчанию
function setDefaultDates() {
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 30);
    
    // Устанавливаем минимальную и максимальную дату для бронирования
    const startDateInput = document.getElementById('start-date');
    startDateInput.min = formatDate(today);
    startDateInput.max = formatDate(maxDate);
    startDateInput.value = formatDate(today);
    
    // Устанавливаем текущую дату для проверки доступности
    document.getElementById('check-date').value = formatDate(today);
    
    // Устанавливаем текущий месяц и год для отчетов
    const currentMonth = today.getMonth() + 1;
    document.getElementById('report-month').value = currentMonth;
    document.getElementById('report-year').value = today.getFullYear();
}

// Форматирование даты в YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Загрузка классов автомобилей
function loadCarClasses() {
    const carClassSelect = document.getElementById('car-class');
    carClassSelect.innerHTML = '<option value="">Выберите класс</option>';
    
    carClasses.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = `${cls.name} - ${cls.daily_price} руб/день`;
        carClassSelect.appendChild(option);
    });
}

// Поиск автомобилей
function searchCars() {
    const carClassId = parseInt(document.getElementById('car-class').value);
    const startDate = document.getElementById('start-date').value;
    const duration = parseInt(document.getElementById('rental-duration').value);
    
    if (!carClassId || !startDate || !duration) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    // Валидация даты
    const today = new Date();
    const bookingDate = new Date(startDate);
    const maxBookingDate = new Date();
    maxBookingDate.setDate(today.getDate() + 30);
    
    if (bookingDate < today) {
        alert('Дата начала не может быть в прошлом');
        return;
    }
    
    if (bookingDate > maxBookingDate) {
        alert('Бронирование возможно не более чем за 30 дней');
        return;
    }
    
    // 📊 Используем API для получения автомобилей по классу
    loadCarsByClassFromBackend(carClassId, startDate, duration);
}

// 📊 Загрузка автомобилей по классу с бэкенда
async function loadCarsByClassFromBackend(classId, startDate, duration) {
    try {
        const response = await fetch(`${API_BASE}/cars-by-class/${classId}`);
        if (!response.ok) throw new Error('Ошибка загрузки автомобилей по классу');
        
        const result = await response.json();
        
        // Проверяем доступность автомобилей
        const availableCars = result.cars.filter(car => 
            isCarAvailable(car.id, startDate, duration)
        );
        
        const searchResult = {
            available: availableCars.length > 0,
            available_cars: availableCars.map(car => ({
                ...car,
                total_price: car.daily_price * duration
            })),
            alternative_dates: findAlternativeDates(classId, startDate, duration),
            alternative_classes: findAlternativeClasses(startDate, duration, classId)
        };
        
        displaySearchResults(searchResult, classId, startDate, duration);
        
    } catch (error) {
        console.error('Ошибка:', error);
        // fallback на локальные данные
        const localResult = checkAvailability(classId, startDate, duration);
        displaySearchResults(localResult, classId, startDate, duration);
    }
}

// Проверка доступности
function checkAvailability(carClassId, startDate, duration) {
    const availableCars = [];
    const carsInClass = getCarsByClass(carClassId);
    
    // Проверяем доступность каждого автомобиля
    carsInClass.forEach(car => {
        if (isCarAvailable(car.id, startDate, duration)) {
            const carClass = getCarClassById(carClassId);
            availableCars.push({
                ...car,
                daily_price: carClass.daily_price,
                total_price: carClass.daily_price * duration
            });
        }
    });
    
    // Поиск альтернативных дат
    const alternativeDates = findAlternativeDates(carClassId, startDate, duration);
    
    // Поиск альтернативных классов
    const alternativeClasses = findAlternativeClasses(startDate, duration, carClassId);
    
    return {
        available: availableCars.length > 0,
        available_cars: availableCars,
        alternative_dates: alternativeDates,
        alternative_classes: alternativeClasses
    };
}

// Поиск альтернативных дат
function findAlternativeDates(carClassId, desiredStart, duration, maxDaysCheck = 30) {
    const alternativeDates = [];
    const desiredDate = new Date(desiredStart);
    
    for (let days = 1; days <= maxDaysCheck; days++) {
        const checkDate = new Date(desiredDate);
        checkDate.setDate(checkDate.getDate() + days);
        
        const carsInClass = getCarsByClass(carClassId);
        const isAvailable = carsInClass.some(car => 
            isCarAvailable(car.id, formatDate(checkDate), duration)
        );
        
        if (isAvailable) {
            alternativeDates.push(formatDate(checkDate));
            if (alternativeDates.length >= 3) {
                break;
            }
        }
    }
    
    return alternativeDates;
}

// Поиск альтернативных классов
function findAlternativeClasses(startDate, duration, excludeClassId) {
    const alternativeClasses = [];
    
    carClasses.forEach(cls => {
        if (cls.id !== excludeClassId) {
            const carsInClass = getCarsByClass(cls.id);
            const availableCount = carsInClass.filter(car => 
                isCarAvailable(car.id, startDate, duration)
            ).length;
            
            if (availableCount > 0) {
                alternativeClasses.push({
                    ...cls,
                    available_count: availableCount,
                    total_price: cls.daily_price * duration
                });
            }
        }
    });
    
    return alternativeClasses;
}

// Отображение результатов поиска
function displaySearchResults(result, carClassId, startDate, duration) {
    const resultsSection = document.getElementById('search-results');
    const availableCarsList = document.getElementById('available-cars-list');
    const alternativeOptions = document.getElementById('alternative-options');
    
    resultsSection.classList.remove('hidden');
    availableCarsList.innerHTML = '';
    alternativeOptions.classList.add('hidden');
    
    // Сохраняем данные для бронирования
    currentBookingData = { carClassId, startDate, duration };
    
    if (result.available) {
        // Показываем доступные автомобили
        result.available_cars.forEach(car => {
            const carOption = document.createElement('div');
            carOption.className = 'car-option available';
            carOption.innerHTML = `
                <div class="car-info">
                    <div class="car-details">
                        <h4>${car.model}</h4>
                        <p>Госномер: ${car.license_plate}</p>
                        <p>Год: ${car.year}, Цвет: ${car.color}</p>
                        <p>Период: ${startDate} (${duration} дн.)</p>
                    </div>
                    <div class="car-price">${car.total_price} руб.</div>
                    <button class="book-btn" onclick="showConfirmationForm(${car.id}, '${car.model}', ${car.total_price})">
                        Забронировать
                    </button>
                </div>
            `;
            availableCarsList.appendChild(carOption);
        });
    } else {
        // Показываем альтернативные варианты
        alternativeOptions.classList.remove('hidden');
        const alternativeDates = document.getElementById('alternative-dates');
        const alternativeClasses = document.getElementById('alternative-classes');
        
        alternativeDates.innerHTML = '';
        alternativeClasses.innerHTML = '';
        
        // Альтернативные даты
        if (result.alternative_dates.length > 0) {
            result.alternative_dates.forEach(date => {
                const dateOption = document.createElement('div');
                dateOption.className = 'alternative-option';
                dateOption.innerHTML = `
                    <h5>Альтернативная дата</h5>
                    <p>Автомобиль будет доступен с ${date}</p>
                    <button class="book-btn" onclick="selectAlternativeDate('${date}')">
                        Выбрать эту дату
                    </button>
                `;
                alternativeDates.appendChild(dateOption);
            });
        } else {
            alternativeDates.innerHTML = '<p>Нет доступных дат в ближайшие 30 дней</p>';
        }
        
        // Альтернативные классы
        if (result.alternative_classes.length > 0) {
            result.alternative_classes.forEach(cls => {
                const classOption = document.createElement('div');
                classOption.className = 'alternative-option';
                classOption.innerHTML = `
                    <h5>Альтернативный класс</h5>
                    <p>${cls.name}: ${cls.available_count} авто доступно</p>
                    <p>Стоимость: ${cls.total_price} руб.</p>
                    <button class="book-btn" onclick="selectAlternativeClass(${cls.id})">
                        Выбрать ${cls.name}
                    </button>
                `;
                alternativeClasses.appendChild(classOption);
            });
        } else {
            alternativeClasses.innerHTML = '<p>Нет доступных автомобилей других классов</p>';
        }
    }
}

// Выбор альтернативной даты
function selectAlternativeDate(newDate) {
    document.getElementById('start-date').value = newDate;
    searchCars();
}

// Выбор альтернативного класса
function selectAlternativeClass(newClassId) {
    document.getElementById('car-class').value = newClassId;
    searchCars();
}

// Показать форму подтверждения брони
function showConfirmationForm(carId, carModel, totalPrice) {
    const confirmationForm = document.getElementById('confirmation-form');
    const summaryCar = document.getElementById('summary-car');
    const summaryPeriod = document.getElementById('summary-period');
    
    summaryCar.textContent = `Автомобиль: ${carModel}`;
    summaryPeriod.textContent = `Период: ${currentBookingData.startDate} (${currentBookingData.duration} дней) - ${totalPrice} руб.`;
    
    confirmationForm.classList.remove('hidden');
    confirmationForm.scrollIntoView({ behavior: 'smooth' });
    
    // Сохраняем данные о выбранном автомобиле
    currentBookingData.carId = carId;
    currentBookingData.carModel = carModel;
    currentBookingData.totalPrice = totalPrice;
}

// Подтверждение бронирования
function confirmBooking() {
    const clientName = document.getElementById('client-name').value;
    const clientPhone = document.getElementById('client-phone').value;
    const clientEmail = document.getElementById('client-email').value;
    
    if (!clientName || !clientPhone || !clientEmail) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    // Создаем новое бронирование
    const newBooking = {
        id: bookings.length + 1,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        car_id: currentBookingData.carId,
        start_date: currentBookingData.startDate,
        end_date: new Date(currentBookingData.startDate),
        status: 'confirmed'
    };
    
    newBooking.end_date.setDate(newBooking.end_date.getDate() + currentBookingData.duration);
    newBooking.end_date = formatDate(newBooking.end_date);
    
    bookings.push(newBooking);
    
    alert(`Бронирование #${newBooking.id} успешно создано!\n\nАвтомобиль: ${currentBookingData.carModel}\nПериод: ${currentBookingData.startDate} (${currentBookingData.duration} дней)\nСумма: ${currentBookingData.totalPrice} руб.`);
    
    // Очищаем форму
    document.getElementById('confirm-booking').reset();
    document.getElementById('confirmation-form').classList.add('hidden');
    document.getElementById('search-results').classList.add('hidden');
    document.getElementById('booking-form').reset();
    
    // 📊 Обновляем данные на бэкенде
    updateBackendWithNewBooking(newBooking);
}

// 📊 Обновление бэкенда с новым бронированием
async function updateBackendWithNewBooking(booking) {
    try {
        // Здесь можно отправить данные на бэкенд
        console.log('Новое бронирование для отправки на бэкенд:', booking);
        
        // Обновляем список подтвержденных бронирований
        loadConfirmedBookingsFromBackend();
    } catch (error) {
        console.error('Ошибка обновления бэкенда:', error);
    }
}

// Загрузка отчета по подтвержденным заявкам
function loadConfirmedBookingsReport() {
    const month = document.getElementById('report-month').value;
    const year = document.getElementById('report-year').value;
    
    const filteredBookings = bookings.filter(booking => {
        if (booking.status !== 'confirmed') return false;
        
        const bookingDate = new Date(booking.start_date);
        return bookingDate.getFullYear() == year && 
               (bookingDate.getMonth() + 1) == month;
    });
    
    displayBookingsReport(filteredBookings);
}

// Отображение отчета по заявкам
function displayBookingsReport(bookings) {
    const tbody = document.querySelector('#confirmed-bookings-table tbody');
    tbody.innerHTML = '';
    
    if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Нет подтвержденных заявок за указанный период</td></tr>';
        return;
    }
    
    bookings.forEach(booking => {
        const car = cars.find(c => c.id === booking.car_id);
        const carClass = getCarClassById(car.class_id);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.id}</td>
            <td>${booking.client_name}<br><small>${booking.client_phone}</small></td>
            <td>${carClass.name}<br><small>${car.model}</small></td>
            <td>${booking.start_date} - ${booking.end_date}</td>
            <td class="status-confirmed">Подтверждено</td>
        `;
        tbody.appendChild(row);
    });
}

// Проверка доступности для отчета
function checkAvailabilityReport() {
    const date = document.getElementById('check-date').value;
    const availableCars = {};
    
    carClasses.forEach(cls => {
        const carsInClass = getCarsByClass(cls.id);
        const availableCarsInClass = carsInClass.filter(car => 
            isCarAvailable(car.id, date, 1) // Проверяем доступность на 1 день
        );
        
        if (availableCarsInClass.length > 0) {
            availableCars[cls.name] = availableCarsInClass.map(car => ({
                ...car,
                daily_price: cls.daily_price
            }));
        }
    });
    
    displayAvailabilityReport(availableCars);
}

// Отображение отчета по доступным автомобилям
function displayAvailabilityReport(availableCars) {
    const carsGrid = document.querySelector('.cars-grid');
    carsGrid.innerHTML = '';
    
    if (Object.keys(availableCars).length === 0) {
        carsGrid.innerHTML = '<p class="text-center">Нет свободных автомобилей на указанную дату</p>';
        return;
    }
    
    for (const [className, carsList] of Object.entries(availableCars)) {
        carsList.forEach(car => {
            const carCard = document.createElement('div');
            carCard.className = 'car-card';
            carCard.innerHTML = `
                <div class="car-image">
                    <span>${car.model}</span>
                </div>
                <div class="car-content">
                    <span class="car-class ${className}">${className}</span>
                    <h3 class="car-model">${car.model}</h3>
                    <ul class="car-features">
                        <li>Госномер: ${car.license_plate}</li>
                        <li>Год: ${car.year}</li>
                        <li>Цвет: ${car.color}</li>
                    </ul>
                    <div class="car-availability">
                        <span class="available-count">Свободен</span>
                        <span class="car-price">${car.daily_price} руб/день</span>
                    </div>
                </div>
            `;
            carsGrid.appendChild(carCard);
        });
    }
}