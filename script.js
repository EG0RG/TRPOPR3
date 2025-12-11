let currentBookingData = null;
let confirmationTimer = null;
const API_BASE = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeForms();
    setDefaultDates();
    loadFilteredReport();
});

// Загрузка фильтрованного отчета
async function loadFilteredReport() {
    try {
        const month = document.getElementById('report-month').value;
        const year = document.getElementById('report-year').value;
        const status = document.getElementById('report-status').value;
        const carClass = document.getElementById('report-car-class').value;
        
        console.log('📊 Загрузка фильтрованного отчета:', { month, year, status, carClass });
        
        let url = `${API_BASE}/reports-filtered?`;
        if (month) url += `month=${month}&`;
        if (year) url += `year=${year}&`;
        if (status && status !== 'all') url += `status=${status}&`;
        if (carClass && carClass !== 'all') url += `car_class=${carClass}`;
        
        console.log('🌐 URL запроса:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки отчета');
        }
        
        const result = await response.json();
        console.log('📊 Отчет получен:', result);
        
        updateReportHeader('Фильтрованный отчет', { month, year, status, carClass });
        updateBookingsTable(result.bookings, result.stats);
        
    } catch (error) {
        console.error('Ошибка загрузки отчета:', error);
        alert('Не удалось загрузить отчет: ' + error.message);
    }
}

// Годовой отчет
async function loadAnnualReport() {
    try {
        const year = document.getElementById('report-year').value || new Date().getFullYear();
        
        console.log('📊 Загрузка годового отчета за:', year);
        
        const response = await fetch(`${API_BASE}/annual-report/${year}`);
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки годового отчета');
        }
        
        const result = await response.json();
        console.log('📊 Годовой отчет получен:', result);
        
        // Обновляем фильтры
        document.getElementById('report-year').value = year;
        document.getElementById('report-month').value = '';
        document.getElementById('report-status').value = 'all';
        document.getElementById('report-car-class').value = 'all';
        
        // Показываем годовую статистику
        showAnnualReport(result);
        
    } catch (error) {
        console.error('Ошибка загрузки годового отчета:', error);
        alert('Не удалось загрузить годовой отчет: ' + error.message);
    }
}

// Показать годовой отчет
function showAnnualReport(reportData) {
    const tbody = document.querySelector('#bookings-table tbody');
    const summaryElement = document.querySelector('#reports-summary');
    
    updateReportHeader(`Годовой отчет за ${reportData.year} год`, {});
    
    // Обновляем статистику
    if (summaryElement) {
        summaryElement.innerHTML = `
            <div class="report-summary">
                <h4>Годовая статистика за ${reportData.year} год:</h4>
                <div class="stats-grid">
                    <div class="stat-card total">
                        <h5>Всего бронирований</h5>
                        <p>${reportData.stats?.total || 0}</p>
                    </div>
                    <div class="stat-card confirmed">
                        <h5>Подтверждено</h5>
                        <p>${reportData.stats?.confirmed || 0}</p>
                    </div>
                    <div class="stat-card waiting">
                        <h5>В ожидании</h5>
                        <p>${reportData.stats?.waiting || 0}</p>
                    </div>
                    <div class="stat-card rejected">
                        <h5>Отклонено</h5>
                        <p>${reportData.stats?.rejected || 0}</p>
                    </div>
                    <div class="stat-card revenue">
                        <h5>Общая выручка</h5>
                        <p>${reportData.stats?.total_revenue ? reportData.stats.total_revenue.toFixed(2) : '0'} BYN</p>
                    </div>
                </div>
                
                ${reportData.monthly_data && reportData.monthly_data.length > 0 ? `
                <h5 style="margin-top: 20px;">Помесячная статистика:</h5>
                <div class="monthly-stats">
                    <table style="width: 100%; margin-top: 10px;">
                        <thead>
                            <tr>
                                <th>Месяц</th>
                                <th>Всего</th>
                                <th>Подтверждено</th>
                                <th>Ожидание</th>
                                <th>Отклонено</th>
                                <th>Выручка</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportData.monthly_data.map(month => `
                                <tr>
                                    <td>${getMonthName(month.month)}</td>
                                    <td>${month.total_bookings}</td>
                                    <td>${month.confirmed_count}</td>
                                    <td>${month.waiting_count}</td>
                                    <td>${month.rejected_count}</td>
                                    <td>${month.total_revenue ? month.total_revenue.toFixed(2) : '0'} BYN</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : '<p>Нет данных за выбранный год</p>'}
            </div>
        `;
    }
    
    // Очищаем таблицу детальных бронирований
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center">
                📊 Для просмотра детальных бронирований используйте фильтры выше
            </td>
        </tr>
    `;
}

function getMonthName(monthNumber) {
    const months = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return months[parseInt(monthNumber) - 1] || monthNumber;
}

// Текущий месяц
async function loadCurrentMonthReport() {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    document.getElementById('report-month').value = currentMonth;
    document.getElementById('report-year').value = currentYear;
    document.getElementById('report-status').value = 'all';
    document.getElementById('report-car-class').value = 'all';
    
    loadFilteredReport();
}

// Бронирования в ожидании
async function loadWaitingBookings() {
    document.getElementById('report-status').value = 'waiting';
    document.getElementById('report-month').value = '';
    document.getElementById('report-year').value = '';
    document.getElementById('report-car-class').value = 'all';
    
    loadFilteredReport();
}

// Подтвержденные бронирования
async function loadConfirmedBookings() {
    document.getElementById('report-status').value = 'confirmed';
    document.getElementById('report-month').value = '';
    document.getElementById('report-year').value = '';
    document.getElementById('report-car-class').value = 'all';
    
    loadFilteredReport();
}

// Старый метод для совместимости
async function loadAllBookingsReport() {
    loadFilteredReport();
}

async function clearAllBookings() {
    if (!confirm('⚠️ Вы уверены, что хотите удалить ВСЕ бронирования? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        console.log('🗑️ Отправка запроса на очистку...');
        
        const response = await fetch(`${API_BASE}/clear-all-bookings`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Ошибка очистки бронирований');
        }
        
        const result = await response.json();
        console.log('✅ Результат очистки:', result);
        
        alert(`✅ Удалено ${result.deleted_count} бронирований`);
        
        loadFilteredReport();
        
    } catch (error) {
        console.error('❌ Ошибка очистки бронирований:', error);
        alert('Ошибка очистки бронирований: ' + error.message);
    }
}

async function rejectBooking(bookingId) {
    if (!confirm('Вы уверены, что хотите отклонить это бронирование?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/reject-booking/${bookingId}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка отклонения');
        }
        
        const result = await response.json();
        alert('✅ Бронирование отклонено');
        
        loadFilteredReport();
        
    } catch (error) {
        console.error('❌ Ошибка отклонения:', error);
        alert('Ошибка отклонения: ' + error.message);
    }
}

function updateReportHeader(title, filters) {
    const badgeElement = document.getElementById('report-type-badge');
    if (badgeElement) {
        let filterText = '';
        if (filters.year) filterText += `Год: ${filters.year} `;
        if (filters.month) filterText += `Месяц: ${getMonthName(filters.month)} `;
        if (filters.status && filters.status !== 'all') filterText += `Статус: ${filters.status} `;
        if (filters.carClass && filters.carClass !== 'all') filterText += `Класс: ${filters.carClass}`;
        
        badgeElement.innerHTML = `<span class="report-badge">${title}${filterText ? '<br><small>' + filterText + '</small>' : ''}</span>`;
    }
}

function updateBookingsTable(bookings, stats) {
    const tbody = document.querySelector('#bookings-table tbody');
    const summaryElement = document.querySelector('#reports-summary');
    
    tbody.innerHTML = '';
    
    if (summaryElement && stats) {
        summaryElement.innerHTML = `
            <div class="report-summary">
                <h4>Статистика:</h4>
                <div class="stats-grid">
                    <div class="stat-card total">
                        <h5>Всего</h5>
                        <p>${stats?.total || 0}</p>
                    </div>
                    <div class="stat-card confirmed">
                        <h5>Подтверждено</h5>
                        <p>${stats?.confirmed || 0}</p>
                    </div>
                    <div class="stat-card waiting">
                        <h5>В ожидании</h5>
                        <p>${stats?.waiting || 0}</p>
                    </div>
                    <div class="stat-card rejected">
                        <h5>Отклонено</h5>
                        <p>${stats?.rejected || 0}</p>
                    </div>
                    <div class="stat-card revenue">
                        <h5>Выручка</h5>
                        <p>${stats?.total_revenue ? stats.total_revenue.toFixed(2) : '0'} BYN</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    Нет бронирований по выбранным фильтрам
                </td>
            </tr>
        `;
        return;
    }
    
    bookings.forEach(booking => {
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const totalPrice = booking.daily_price * days;
        
        const createdAt = new Date(booking.created_at);
        const createdStr = createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString();
        
        let statusBadge = '';
        if (booking.status === 'confirmed') {
            statusBadge = '<span class="status-confirmed">✅ Подтверждено</span>';
        } else if (booking.status === 'waiting') {
            const expiresAt = new Date(booking.expires_at);
            const now = new Date();
            const minutesLeft = Math.floor((expiresAt - now) / (1000 * 60));
            
            let timerText = '';
            if (minutesLeft > 0) {
                timerText = ` (${minutesLeft} мин)`;
            } else if (minutesLeft <= 0 && booking.status === 'waiting') {
                timerText = ' (просрочено)';
            }
            
            statusBadge = `<span class="status-waiting">⏳ В ожидании${timerText}</span>`;
        } else if (booking.status === 'rejected') {
            statusBadge = '<span class="status-rejected">❌ Отклонено</span>';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.id}</td>
            <td>
                <strong>${booking.client_name}</strong><br>
                <small>📞 ${booking.client_phone}</small><br>
                <small>✉️ ${booking.client_email}</small>
            </td>
            <td>
                <span class="car-class ${booking.class_name}">${booking.class_name}</span><br>
                <small>${booking.car_model}</small>
            </td>
            <td>
                📅 ${booking.start_date}<br>
                ⏰ ${booking.end_date}<br>
                <small>(${days} дней)</small>
            </td>
            <td>${totalPrice.toFixed(2)} BYN</td>
            <td>${createdStr}</td>
            <td>${statusBadge}</td>
            <td>
                ${booking.status === 'waiting' ? 
                    `<button class="btn-small btn-danger" onclick="rejectBooking(${booking.id})">Отклонить</button>` : 
                    ''
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

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
                loadFilteredReport();
            }
        });
    });
}

function initializeForms() {
    document.getElementById('booking-form').addEventListener('submit', function(e) {
        e.preventDefault();
        searchCars();
    });
    
    document.getElementById('confirm-booking').addEventListener('submit', function(e) {
        e.preventDefault();
        submitBooking();
    });
    
    document.getElementById('reports-filter').addEventListener('submit', function(e) {
        e.preventDefault();
        loadFilteredReport();
    });
    
    document.getElementById('availability-check').addEventListener('submit', function(e) {
        e.preventDefault();
        checkAvailabilityReport();
    });
    
    document.getElementById('confirmation-code-form-inner').addEventListener('submit', function(e) {
        e.preventDefault();
        submitConfirmationCode();
    });
}

function setDefaultDates() {
    const today = new Date();
    const minDate = new Date();
    minDate.setDate(today.getDate() + 30);
    
    const startDateInput = document.getElementById('start-date');
    startDateInput.min = formatDate(minDate);
    startDateInput.value = formatDate(minDate);
    
    document.getElementById('check-date').value = formatDate(minDate);
    
    const currentMonth = today.getMonth() + 1;
    document.getElementById('report-month').value = currentMonth;
    document.getElementById('report-year').value = today.getFullYear();
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function searchCars() {
    const carClassName = document.getElementById('car-class').value;
    const startDate = document.getElementById('start-date').value;
    const duration = parseInt(document.getElementById('rental-duration').value);
    
    console.log('🔍 Параметры поиска:', { carClassName, startDate, duration });
    
    if (!carClassName || !startDate || !duration) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    const today = new Date();
    const bookingDate = new Date(startDate);
    const minBookingDate = new Date();
    minBookingDate.setDate(today.getDate() + 30);
    
    if (bookingDate < minBookingDate) {
        const minDateStr = formatDate(minBookingDate);
        alert(`Бронирование возможно только с ${minDateStr} (через 30 дней от сегодняшней даты)`);
        return;
    }
    
    if (duration < 1) {
        alert('Продолжительность должна быть минимум 1 день');
        return;
    }
    
    loadCarsByClassFromBackend(carClassName, startDate, duration);
}

async function loadCarsByClassFromBackend(className, startDate, duration) {
    try {
        console.log('🔍 Загрузка автомобилей класса:', className);
        
        const url = `${API_BASE}/cars-by-class/${className}`;
        console.log('🌐 URL запроса:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Данные получены:', result);
        
        if (!result.cars || result.cars.length === 0) {
            throw new Error('Нет автомобилей в ответе от сервера');
        }
        
        // Проверяем доступность каждого авто
        const availableCars = [];
        
        for (const car of result.cars) {
            const isAvailable = await checkCarAvailability(car.id, startDate, duration);
            
            if (isAvailable) {
                availableCars.push({
                    ...car,
                    total_price: car.daily_price * duration,
                    daily_price: car.daily_price
                });
            }
        }
        
        const searchResult = {
            available: availableCars.length > 0,
            available_cars: availableCars
        };
        
        console.log('🎯 Отображаем результаты...');
        displaySearchResults(searchResult, className, startDate, duration);
        
    } catch (error) {
        console.error('💥 Полная ошибка:', error);
        alert('Не удалось загрузить автомобили: ' + error.message);
    }
}

async function checkCarAvailability(carId, startDate, duration) {
    try {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + duration);
        const end_date = endDate.toISOString().split('T')[0];
        
        const response = await fetch(`${API_BASE}/check-availability`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                car_id: carId,
                start_date: startDate,
                end_date: end_date
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            return result.available;
        }
        
        return true;
        
    } catch (error) {
        console.error('Ошибка проверки доступности:', error);
        return true;
    }
}

function displaySearchResults(result, className, startDate, duration) {
    const resultsSection = document.getElementById('search-results');
    const availableCarsList = document.getElementById('available-cars-list');
    
    resultsSection.classList.remove('hidden');
    availableCarsList.innerHTML = '';
    
    currentBookingData = { 
        className: className, 
        startDate: startDate, 
        duration: duration 
    };
    
    console.log('💾 currentBookingData установлен:', currentBookingData);
    
    if (result.available) {
        // Уникальные авто (убираем дубли)
        const uniqueCars = [];
        const seenModels = new Set();
        
        result.available_cars.forEach(car => {
            if (!seenModels.has(car.model + car.license_plate)) {
                seenModels.add(car.model + car.license_plate);
                uniqueCars.push(car);
            }
        });
        
        uniqueCars.forEach(car => {
            const carOption = document.createElement('div');
            carOption.className = 'car-option available';
            carOption.innerHTML = `
                <div class="car-info">
                    <div class="car-details">
                        <h4>${car.model}</h4>
                        <p>Госномер: ${car.license_plate}</p>
                        <p>Год: ${car.year}, Цвет: ${car.color}</p>
                        <p>Особенности: ${car.features}</p>
                        <p>Цена за день: ${car.daily_price} BYN</p>
                        <p>Период: ${startDate} (${duration} дн.)</p>
                    </div>
                    <div class="car-price">
                        <div class="total-price">${car.total_price} BYN</div>
                        <button class="book-btn" onclick="showBookingForm(${car.id}, '${car.model}', ${car.daily_price}, ${car.total_price})">
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

function showBookingForm(carId, carModel, dailyPrice, totalPrice) {
    console.log('🔍 showBookingForm вызван с:', { carId, carModel, dailyPrice, totalPrice });
    
    if (!carId || !carModel) {
        console.error('❌ Ошибка: не переданы carId или carModel');
        return;
    }
    
    const bookingForm = document.getElementById('confirmation-form');
    const summaryCar = document.getElementById('summary-car');
    const summaryPeriod = document.getElementById('summary-period');
    
    if (!bookingForm || !summaryCar || !summaryPeriod) {
        console.error('❌ Не найдены элементы формы бронирования');
        return;
    }
    
    summaryCar.textContent = `Автомобиль: ${carModel}`;
    summaryPeriod.textContent = `Период: ${currentBookingData.startDate} (${currentBookingData.duration} дней) - ${totalPrice} BYN`;
    
    bookingForm.classList.remove('hidden');
    bookingForm.scrollIntoView({ behavior: 'smooth' });
    
    currentBookingData.carId = carId;
    currentBookingData.carModel = carModel;
    currentBookingData.dailyPrice = dailyPrice;
    currentBookingData.totalPrice = totalPrice;
    
    console.log('💾 currentBookingData после обновления:', currentBookingData);
    console.log('✅ Форма бронирования показана');
}

async function submitBooking() {
    console.log('🔍 submitBooking вызван, currentBookingData:', currentBookingData);
    
    const clientName = document.getElementById('client-name').value.trim();
    const clientPhone = document.getElementById('client-phone').value.trim();
    const clientEmail = document.getElementById('client-email').value.trim();
    
    console.log('📝 Данные формы:', { clientName, clientPhone, clientEmail });
    
    if (!clientName || !clientPhone || !clientEmail) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
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
            
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
            } catch (e) {
                throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
            }
        }
        
        const result = await response.json();
        console.log('✅ Успешный ответ:', result);
        
        document.getElementById('confirmation-form').classList.add('hidden');
        
        showConfirmationCodeForm(result);
        
    } catch (error) {
        console.error('💥 Полная ошибка:', error);
        alert('Ошибка при создании бронирования: ' + error.message);
    }
}

function showConfirmationCodeForm(bookingResult) {
    // Сбрасываем старый таймер если есть
    if (confirmationTimer) {
        clearInterval(confirmationTimer);
    }
    
    const confirmationForm = document.getElementById('confirmation-code-form');
    const bookingIdElement = document.getElementById('confirmation-booking-id');
    const timerElement = document.getElementById('confirmation-timer');
    
    // Сброс стилей таймера
    timerElement.classList.remove('warning', 'danger');
    timerElement.textContent = '05:00';
    
    bookingIdElement.textContent = bookingResult.id;
    confirmationForm.classList.remove('hidden');
    confirmationForm.scrollIntoView({ behavior: 'smooth' });
    
    startConfirmationTimer(300, timerElement);
    
    currentBookingData.bookingId = bookingResult.id;
    console.log('✅ Форма ввода кода показана, ID бронирования:', bookingResult.id);
}

function startConfirmationTimer(seconds, timerElement) {
    if (confirmationTimer) {
        clearInterval(confirmationTimer);
    }
    
    let timeLeft = seconds;
    
    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 60) {
            timerElement.classList.add('danger');
        } else if (timeLeft <= 120) {
            timerElement.classList.add('warning');
        }
        
        if (timeLeft <= 0) {
            clearInterval(confirmationTimer);
            timerElement.textContent = '00:00';
            alert('Время подтверждения истекло!');
            resetForms();
        }
        
        timeLeft--;
    }
    
    updateTimer();
    confirmationTimer = setInterval(updateTimer, 1000);
}

async function submitConfirmationCode() {
    const confirmationCode = document.getElementById('confirmation-code').value.trim().toUpperCase();
    const bookingId = currentBookingData.bookingId;
    
    if (!confirmationCode || !bookingId) {
        alert('Пожалуйста, введите код подтверждения');
        return;
    }
    
    if (confirmationCode.length !== 6) {
        alert('Код подтверждения должен состоять из 6 символов');
        return;
    }
    
    console.log('🔐 Подтверждение кода:', { bookingId, confirmationCode });
    
    try {
        const response = await fetch(`${API_BASE}/confirm-booking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                booking_id: bookingId,
                confirmation_code: confirmationCode
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка подтверждения');
        }
        
        const result = await response.json();
        
        alert('✅ Бронирование успешно подтверждено!');
        
        if (confirmationTimer) {
            clearInterval(confirmationTimer);
        }
        
        // АВТОМАТИЧЕСКАЯ ОЧИСТКА ПОЛЕЙ ПОСЛЕ УСПЕШНОГО ПОДТВЕРЖДЕНИЯ
        resetForms();
        
        // Обновляем отчеты
        loadFilteredReport();
        
    } catch (error) {
        console.error('❌ Ошибка подтверждения:', error);
        alert('Ошибка подтверждения: ' + error.message);
    }
}

// ФУНКЦИЯ ДЛЯ ОЧИСТКИ ВСЕХ ПОЛЕЙ ПОСЛЕ БРОНИРОВАНИЯ
function resetForms() {
    console.log('🧹 Автоматическая очистка полей после бронирования');
    
    // 1. Останавливаем таймер
    if (confirmationTimer) {
        clearInterval(confirmationTimer);
    }
    
    // 2. Скрываем все формы
    document.getElementById('confirmation-code-form').classList.add('hidden');
    document.getElementById('confirmation-form').classList.add('hidden');
    document.getElementById('search-results').classList.add('hidden');
    
    // 3. Очищаем поля формы данных клиента
    document.getElementById('client-name').value = '';
    document.getElementById('client-phone').value = '';
    document.getElementById('client-email').value = '';
    
    // 4. Очищаем поле кода подтверждения
    document.getElementById('confirmation-code').value = '';
    
    // 5. Сбрасываем основную форму поиска автомобилей
    document.getElementById('booking-form').reset();
    
    // 6. Очищаем детали бронирования
    document.getElementById('summary-car').textContent = '';
    document.getElementById('summary-period').textContent = '';
    
    // 7. Очищаем результаты поиска автомобилей
    const availableCarsList = document.getElementById('available-cars-list');
    if (availableCarsList) availableCarsList.innerHTML = '';
    
    // 8. Сбрасываем таймер
    const timerElement = document.getElementById('confirmation-timer');
    if (timerElement) {
        timerElement.textContent = '05:00';
        timerElement.classList.remove('warning', 'danger');
    }
    
    // 9. Сбрасываем ID бронирования
    const bookingIdElement = document.getElementById('confirmation-booking-id');
    if (bookingIdElement) bookingIdElement.textContent = '-';
    
    // 10. Устанавливаем даты по умолчанию
    setDefaultDates();
    
    // 11. Сбрасываем данные
    currentBookingData = null;
    
    // 12. Показываем основную форму поиска
    document.getElementById('booking-form').classList.remove('hidden');
    
    console.log('✅ Все поля очищены, форма готова для нового бронирования');
}

// Функция для отмены бронирования
function resetBookingFlow() {
    resetForms();
    alert('❌ Бронирование отменено. Все поля очищены.');
}

function checkAvailabilityReport() {
    const date = document.getElementById('check-date').value;
    alert(`Проверка доступности на дату: ${date}\n(функция в разработке)`);
}