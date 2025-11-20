// Глобальные переменные
let currentBookingData = null;
const API_BASE = 'http://localhost:3000/api';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeForms();
    setDefaultDates();
    loadConfirmedBookingsFromBackend();
});

// 📊 Загрузка подтвержденных бронирований с бэкенда
async function loadConfirmedBookingsFromBackend() {
    try {
        const response = await fetch(`${API_BASE}/bookings-by-status/confirmed`);
        if (!response.ok) throw new Error('Ошибка загрузки бронирований');
        
        const result = await response.json();
        console.log('📊 Подтвержденные бронирования:', result);
        
        updateConfirmedBookingsTable(result.bookings);
        
    } catch (error) {
        console.error('Ошибка загрузки бронирований:', error);
    }
}

function updateConfirmedBookingsTable(bookings) {
    const tbody = document.querySelector('#confirmed-bookings-table tbody');
    tbody.innerHTML = '';
    
    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Нет подтвержденных заявок</td></tr>';
        return;
    }
    
    bookings.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.id}</td>
            <td>
                <strong>${booking.client_name}</strong><br>
                <small>${booking.client_phone}</small><br>
                <small>${booking.client_email}</small>
            </td>
            <td>
                ${booking.class_name || 'Неизвестно'}<br>
                <small>${booking.car_model || 'Неизвестно'}</small>
            </td>
            <td>${booking.start_date} - ${booking.end_date}</td>
            <td class="status-confirmed">Подтверждено</td>
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
            
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            
            this.classList.add('active');
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            
            if (sectionId === 'confirmed-reports') {
                loadConfirmedBookingsFromBackend();
            }
        });
    });
}

// Инициализация форм
function initializeForms() {
    document.getElementById('booking-form').addEventListener('submit', function(e) {
        e.preventDefault();
        searchCars();
    });
    
    document.getElementById('confirm-booking').addEventListener('submit', function(e) {
        e.preventDefault();
        confirmBooking();
    });
    
    document.getElementById('reports-filter').addEventListener('submit', function(e) {
        e.preventDefault();
        loadConfirmedBookingsFromBackend();
    });
    
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
    
    const startDateInput = document.getElementById('start-date');
    startDateInput.min = formatDate(today);
    startDateInput.max = formatDate(maxDate);
    startDateInput.value = formatDate(today);
    
    document.getElementById('check-date').value = formatDate(today);
    
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

// Поиск автомобилей - ИСПРАВЛЕННАЯ ВЕРСИЯ
function searchCars() {
    const carClassName = document.getElementById('car-class').value; // теперь берем значение напрямую
    const startDate = document.getElementById('start-date').value;
    const duration = parseInt(document.getElementById('rental-duration').value);
    
    console.log('🔍 Параметры поиска:', { carClassName, startDate, duration });
    
    if (!carClassName || !startDate || !duration) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
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
    
    loadCarsByClassFromBackend(carClassName, startDate, duration);
}

// 📊 Загрузка автомобилей по классу с бэкенда - ДЕТАЛЬНАЯ ОТЛАДКА
async function loadCarsByClassFromBackend(className, startDate, duration) {
    try {
        console.log('🔍 Загрузка автомобилей класса:', className);
        
        const url = `${API_BASE}/cars-by-class/${className}`;
        console.log('🌐 URL запроса:', url);
        
        console.log('🔄 Отправка запроса...');
        const response = await fetch(url);
        
        console.log('📨 Ответ получен. Статус:', response.status);
        console.log('📨 OK?:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Ошибка сервера:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Данные получены:', result);
        console.log('🚗 Количество автомобилей:', result.cars ? result.cars.length : 0);
        
        if (!result.cars || result.cars.length === 0) {
            throw new Error('Нет автомобилей в ответе от сервера');
        }
        
        // Для простоты считаем все автомобили доступными
        const availableCars = result.cars.map(car => ({
            ...car,
            total_price: car.daily_price * duration
        }));
        
        const searchResult = {
            available: availableCars.length > 0,
            available_cars: availableCars
        };
        
        console.log('🎯 Отображаем результаты...');
        displaySearchResults(searchResult, className, startDate, duration);
        
    } catch (error) {
        console.error('💥 Полная ошибка:', error);
        console.error('💥 Stack:', error.stack);
        alert('Не удалось загрузить автомобили: ' + error.message);
    }
}

// Отображение результатов поиска - ИСПРАВЛЕННАЯ ВЕРСИЯ
function displaySearchResults(result, className, startDate, duration) {
    const resultsSection = document.getElementById('search-results');
    const availableCarsList = document.getElementById('available-cars-list');
    
    resultsSection.classList.remove('hidden');
    availableCarsList.innerHTML = '';
    
    // Сохраняем данные для будущего бронирования
    currentBookingData = { 
        className: className, 
        startDate: startDate, 
        duration: duration 
    };
    
    console.log('💾 currentBookingData установлен:', currentBookingData);
    
    if (result.available) {
        result.available_cars.forEach(car => {
            const carOption = document.createElement('div');
            carOption.className = 'car-option available';
            carOption.innerHTML = `
                <div class="car-info">
                    <div class="car-details">
                        <h4>${car.model}</h4>
                        <p>Госномер: ${car.license_plate}</p>
                        <p>Год: ${car.year}, Цвет: ${car.color}</p>
                        <p>Особенности: ${car.features}</p>
                        <p>Период: ${startDate} (${duration} дн.)</p>
                    </div>
                    <div class="car-price">
                        <div class="total-price">${car.total_price} руб.</div>
                        <button class="book-btn" onclick="showConfirmationForm(${car.id}, '${car.model}', ${car.total_price})">
                            Забронировать
                        </button>
                    </div>
                </div>
            `;
            availableCarsList.appendChild(carOption);
        });
    } else {
        availableCarsList.innerHTML = '<p class="no-cars">Нет доступных автомобилей по выбранным параметрам</p>';
    }
}

// Показать форму подтверждения брони
function showConfirmationForm(carId, carModel, totalPrice) {
    console.log('🔍 showConfirmationForm вызван с:', { carId, carModel, totalPrice });
    console.log('🔍 currentBookingData до:', currentBookingData);
    
    if (!carId || !carModel) {
        console.error('❌ Ошибка: не переданы carId или carModel');
        return;
    }
    
    const confirmationForm = document.getElementById('confirmation-form');
    const summaryCar = document.getElementById('summary-car');
    const summaryPeriod = document.getElementById('summary-period');
    
    if (!confirmationForm || !summaryCar || !summaryPeriod) {
        console.error('❌ Не найдены элементы формы подтверждения');
        return;
    }
    
    summaryCar.textContent = `Автомобиль: ${carModel}`;
    summaryPeriod.textContent = `Период: ${currentBookingData.startDate} (${currentBookingData.duration} дней) - ${totalPrice} руб.`;
    
    confirmationForm.classList.remove('hidden');
    confirmationForm.scrollIntoView({ behavior: 'smooth' });
    
    // Сохраняем данные для бронирования - УБЕДИТЕСЬ ЧТО ЭТО РАБОТАЕТ
    currentBookingData.carId = carId;
    currentBookingData.carModel = carModel;
    currentBookingData.totalPrice = totalPrice;
    
    console.log('💾 currentBookingData после обновления:', currentBookingData);
    console.log('✅ Форма подтверждения показана');
}

// Подтверждение бронирования - ОТПРАВКА НА СЕРВЕР
async function confirmBooking() {
    console.log('🔍 confirmBooking вызван, currentBookingData:', currentBookingData);
    
    const clientName = document.getElementById('client-name').value.trim();
    const clientPhone = document.getElementById('client-phone').value.trim();
    const clientEmail = document.getElementById('client-email').value.trim();
    
    console.log('📝 Данные формы:', { clientName, clientPhone, clientEmail });
    
    // Проверка полей
    if (!clientName || !clientPhone || !clientEmail) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    // Проверяем что есть данные о бронировании
    if (!currentBookingData || !currentBookingData.carId) {
        alert('Ошибка: данные о бронировании не найдены. Пожалуйста, выберите автомобиль заново.');
        return;
    }
    
    const bookingData = {
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        car_id: currentBookingData.carId,
        start_date: currentBookingData.startDate,
        duration: parseInt(currentBookingData.duration)
    };
    
    console.log('📤 Отправка данных бронирования на сервер:', bookingData);
    
    try {
        console.log('🔄 Отправка запроса на:', `${API_BASE}/bookings`);
        
        const response = await fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData)
        });
        
        console.log('📨 Ответ получен. Статус:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Ошибка ответа:', errorText);
            
            // Пытаемся распарсить JSON ошибки
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
            } catch (e) {
                throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
            }
        }
        
        const result = await response.json();
        console.log('✅ Успешный ответ:', result);
        
        alert(`Бронирование #${result.id} успешно создано!\n\nАвтомобиль: ${currentBookingData.carModel}\nПериод: ${currentBookingData.startDate} (${currentBookingData.duration} дней)\nСумма: ${currentBookingData.totalPrice} руб.`);
        
        // Очищаем форму
        document.getElementById('confirm-booking').reset();
        document.getElementById('confirmation-form').classList.add('hidden');
        document.getElementById('search-results').classList.add('hidden');
        document.getElementById('booking-form').reset();
        
        // Обновляем список бронирований
        setTimeout(() => {
            loadConfirmedBookingsFromBackend();
        }, 1000);
        
    } catch (error) {
        console.error('💥 Полная ошибка:', error);
        alert('Ошибка при создании бронирования: ' + error.message);
    }
}

// Загрузка отчета по подтвержденным заявкам
function loadConfirmedBookingsReport() {
    loadConfirmedBookingsFromBackend();
}

// Проверка доступности для отчета
function checkAvailabilityReport() {
    const date = document.getElementById('check-date').value;
    alert(`Проверка доступности на дату: ${date}\n(функция в разработке)`);
}

// Вспомогательные функции
function showError(message) {
    alert('Ошибка: ' + message);
}

function showSuccess(message) {
    alert('Успех: ' + message);
}