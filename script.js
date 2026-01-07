// Текущий пользователь и настройки
let currentUser = null;
let currentBookingData = null;
let confirmationTimer = null;
const API_BASE = 'http://localhost:3000/api';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Документ загружен');
    
    // Проверяем, есть ли сохраненный пользователь
    checkSavedUser();
    
    // Устанавливаем даты по умолчанию
    setDefaultDates();
    
    // Инициализируем формы
    initializeForms();
    
    // Инициализируем навигацию
    initializeNavigation();
    
    console.log('Система инициализирована');
});

// =============================================
// ФУНКЦИИ ДЛЯ ПРОВЕРКИ ДАТ
// =============================================

function setDefaultDates() {
    console.log('Установка дат с ограничениями');
    
    const today = new Date();
    const minBookingDate = new Date(today);
    minBookingDate.setDate(minBookingDate.getDate() + 30);
    
    // Поле для проверки доступности
    const checkDateInput = document.getElementById('check-date');
    if (checkDateInput) {
        checkDateInput.min = formatDate(today);
        checkDateInput.value = formatDate(today);
    }
    
    // Поле для начала аренды
    const startDateInput = document.getElementById('start-date');
    if (startDateInput) {
        startDateInput.min = formatDate(minBookingDate);
        startDateInput.value = formatDate(minBookingDate);
        startDateInput.addEventListener('change', validateStartDate);
    }
    
    // Год для отчетов
    const reportYearInput = document.getElementById('report-year');
    if (reportYearInput) {
        reportYearInput.value = today.getFullYear();
    }
    
    console.log('Даты установлены');
}

function validateStartDate() {
    const startDateInput = document.getElementById('start-date');
    if (!startDateInput) return true;
    
    const selectedDate = new Date(startDateInput.value);
    const today = new Date();
    const minBookingDate = new Date(today);
    minBookingDate.setDate(minBookingDate.getDate() + 30);
    
    // Сбрасываем время для сравнения
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    minBookingDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < minBookingDate) {
        alert(`ОШИБКА!\nБронирование возможно только через 30 дней от текущей даты.\nМинимальная доступная дата: ${formatDate(minBookingDate)}`);
        startDateInput.value = formatDate(minBookingDate);
        startDateInput.focus();
        return false;
    }
    
    return true;
}

function validateSearchDate() {
    const startDateInput = document.getElementById('start-date');
    if (!startDateInput) return false;
    return validateStartDate();
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// =============================================
// ПРОВЕРКА СОХРАНЕННОГО ПОЛЬЗОВАТЕЛЯ
// =============================================

function checkSavedUser() {
    const savedUser = localStorage.getItem('user_data');
    const token = localStorage.getItem('auth_token');
    
    if (savedUser && token) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('Найден сохраненный пользователь:', currentUser.name, 'роль:', currentUser.role);
            
            document.getElementById('start-page').style.display = 'none';
            document.getElementById('main-interface').style.display = 'block';
            
            updateUIForUserRole();
            
            if (currentUser.role === 'admin') {
                showSection('reports');
            } else {
                showSection('available-cars');
            }
            
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
            localStorage.removeItem('user_data');
            localStorage.removeItem('auth_token');
            showStartPage();
        }
    } else {
        showStartPage();
    }
}

function showStartPage() {
    document.getElementById('start-page').style.display = 'block';
    document.getElementById('start-page').classList.add('active');
    document.getElementById('main-interface').style.display = 'none';
}

// =============================================
// ФУНКЦИИ ВЫБОРА РОЛИ
// =============================================

function selectRole(role) {
    console.log('Выбрана роль:', role);
    
    if (role === 'guest') {
        currentUser = { role: 'guest' };
        showMainInterface('guest');
    } else if (role === 'user') {
        showLoginModal('user');
    } else if (role === 'admin') {
        showAdminLogin();
    }
}

function showMainInterface(userRole) {
    console.log('Показываем основной интерфейс для роли:', userRole);
    
    document.getElementById('start-page').style.display = 'none';
    document.getElementById('start-page').classList.remove('active');
    document.getElementById('main-interface').style.display = 'block';
    
    updateUIForUserRole();
    showSection('available-cars');
}

function switchToStartPage() {
    document.getElementById('main-interface').style.display = 'none';
    document.getElementById('start-page').style.display = 'block';
    document.getElementById('start-page').classList.add('active');
    
    currentUser = null;
    localStorage.removeItem('user_data');
    localStorage.removeItem('auth_token');
}

// =============================================
// УПРАВЛЕНИЕ СЕКЦИЯМИ
// =============================================

function showSection(sectionId) {
    console.log('Показываем секцию:', sectionId, 'для роли:', currentUser?.role);
    
    if (currentUser && currentUser.role === 'admin') {
        if (sectionId === 'booking' || sectionId === 'my-bookings') {
            alert('Администратор не может создавать бронирования.\nИспользуйте раздел "Отчеты" для просмотра всех бронирований.');
            showSection('reports');
            return;
        }
    }
    
    if (sectionId === 'booking' || sectionId === 'my-bookings') {
        if (!currentUser || currentUser.role === 'guest') {
            alert('Для доступа к этому разделу необходимо авторизоваться');
            showLoginModal('user');
            return;
        }
    }
    
    if (sectionId === 'reports' || sectionId === 'admin-cars') {
        if (!currentUser || currentUser.role !== 'admin') {
            alert('Доступ запрещен. Требуются права администратора.');
            return;
        }
    }
    
    // Обновляем активные ссылки
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Показываем выбранную секцию
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Загружаем данные для секции
    if (sectionId === 'my-bookings') {
        loadMyBookings();
    } else if (sectionId === 'reports') {
        loadAdminReport();
    } else if (sectionId === 'admin-cars') {
        loadAdminCars();
    } else if (sectionId === 'available-cars') {
        const resultsSection = document.getElementById('availability-results');
        if (resultsSection) {
            resultsSection.classList.add('hidden');
        }
    }
}

// =============================================
// ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ДЛЯ РОЛИ
// =============================================

function updateUIForUserRole() {
    console.log('Обновление UI для роли:', currentUser ? currentUser.role : 'none');
    
    // Получаем элементы навигации
    const availableCarsNav = document.getElementById('available-cars-nav');
    const bookingNav = document.getElementById('booking-nav');
    const myBookingsNav = document.getElementById('my-bookings-nav');
    const reportsNav = document.getElementById('reports-nav');
    const adminCarsNav = document.getElementById('admin-cars-nav');
    
    // Элементы верхней панели
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const guestNotice = document.getElementById('guest-notice');
    
    // Гость
    if (!currentUser || currentUser.role === 'guest') {
        console.log('Настройка UI для гостя');
        
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        if (guestNotice) guestNotice.style.display = 'block';
        
        if (availableCarsNav) availableCarsNav.style.display = 'block';
        if (bookingNav) bookingNav.style.display = 'none';
        if (myBookingsNav) myBookingsNav.style.display = 'none';
        if (reportsNav) reportsNav.style.display = 'none';
        if (adminCarsNav) adminCarsNav.style.display = 'none';
        
    // Обычный пользователь
    } else if (currentUser.role === 'user') {
        console.log('Настройка UI для пользователя:', currentUser.name);
        
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            const userName = document.getElementById('user-name');
            const userRoleBadge = document.getElementById('user-role-badge');
            if (userName) userName.textContent = currentUser.name;
            if (userRoleBadge) {
                userRoleBadge.textContent = 'Пользователь';
                userRoleBadge.style.background = 'var(--success-color)';
            }
        }
        if (guestNotice) guestNotice.style.display = 'none';
        
        if (availableCarsNav) availableCarsNav.style.display = 'block';
        if (bookingNav) bookingNav.style.display = 'block';
        if (myBookingsNav) myBookingsNav.style.display = 'block';
        if (reportsNav) reportsNav.style.display = 'none';
        if (adminCarsNav) adminCarsNav.style.display = 'none';
        
    // Администратор
    } else if (currentUser.role === 'admin') {
        console.log('Настройка UI для администратора:', currentUser.name);
        
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            const userName = document.getElementById('user-name');
            const userRoleBadge = document.getElementById('user-role-badge');
            if (userName) userName.textContent = currentUser.name;
            if (userRoleBadge) {
                userRoleBadge.textContent = 'Админ';
                userRoleBadge.style.background = 'var(--danger-color)';
            }
        }
        if (guestNotice) guestNotice.style.display = 'none';
        
        if (availableCarsNav) availableCarsNav.style.display = 'block';
        if (bookingNav) bookingNav.style.display = 'none';
        if (myBookingsNav) myBookingsNav.style.display = 'none';
        if (reportsNav) reportsNav.style.display = 'block';
        if (adminCarsNav) adminCarsNav.style.display = 'block';
    }
}

// =============================================
// МОДАЛЬНЫЕ ОКНА АВТОРИЗАЦИИ
// =============================================

function showLoginModal(requestedRole = 'user') {
    console.log('Показываем окно входа для роли:', requestedRole);
    
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        modal.setAttribute('data-requested-role', requestedRole);
        
        setTimeout(() => {
            const usernameInput = document.getElementById('login-username');
            if (usernameInput) usernameInput.focus();
        }, 100);
    }
}

function showRegisterModal() {
    console.log('Показываем окно регистрации');
    
    const modal = document.getElementById('register-modal');
    if (modal) {
        modal.style.display = 'flex';
        closeModal('login-modal');
        clearRegisterForm();
        
        setTimeout(() => {
            const nameInput = document.getElementById('register-name');
            if (nameInput) nameInput.focus();
        }, 100);
    }
}

function showAdminLogin() {
    console.log('Показываем вход для администратора');
    
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('login-username').value = 'admin';
        document.getElementById('login-password').value = 'admin123';
        modal.setAttribute('data-requested-role', 'admin');
    }
}

function clearRegisterForm() {
    const fields = [
        'register-name',
        'register-email',
        'register-phone',
        'register-password',
        'register-confirm-password'
    ];
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
}

function closeModal(modalId = null) {
    if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    } else {
        ['login-modal', 'register-modal', 'add-car-modal'].forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// =============================================
// ИНИЦИАЛИЗАЦИЯ ФОРМ
// =============================================

function initializeForms() {
    console.log('Инициализация форм');
    
    // Форма входа
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await login();
        });
    }
    
    // Форма регистрации
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await register();
        });
    }
    
    // Форма проверки доступности
    const availabilityForm = document.getElementById('availability-check');
    if (availabilityForm) {
        availabilityForm.addEventListener('submit', function(e) {
            e.preventDefault();
            checkAvailabilityReport();
        });
    }
    
    // Форма бронирования
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (validateSearchDate()) {
                searchCars();
            }
        });
    }
    
    // Форма подтверждения бронирования
    const confirmBookingForm = document.getElementById('confirm-booking');
    if (confirmBookingForm) {
        confirmBookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitBooking();
        });
    }
    
    // Форма подтверждения кода
    const confirmCodeForm = document.getElementById('confirmation-code-form-inner');
    if (confirmCodeForm) {
        confirmCodeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitConfirmationCode();
        });
    }
    
    // Форма отчетов
    const reportsForm = document.getElementById('reports-filter');
    if (reportsForm) {
        reportsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            loadFilteredReport();
        });
    }
    
    // Форма добавления автомобиля
    const addCarForm = document.getElementById('add-car-form');
    if (addCarForm) {
        addCarForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await addCar();
        });
    }
}

// =============================================
// ИНИЦИАЛИЗАЦИЯ НАВИГАЦИИ
// =============================================

function initializeNavigation() {
    console.log('Инициализация навигации');
    
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            console.log('Переход к разделу:', sectionId);
            showSection(sectionId);
        });
    });
}

// =============================================
// ФУНКЦИИ ДЛЯ ГОСТЕЙ (СВОБОДНЫЕ АВТО)
// =============================================

async function checkAvailabilityReport() {
    console.log('Проверка доступности автомобилей');
    
    const dateInput = document.getElementById('check-date');
    const date = dateInput.value;
    
    if (!date) {
        alert('Пожалуйста, выберите дату');
        dateInput.focus();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/available-cars`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ date: date })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка проверки доступности');
        }
        
        const result = await response.json();
        console.log('Получены доступные автомобили:', result.total_available);
        displayAvailableCars(result);
        
    } catch (error) {
        console.error('Ошибка проверки доступности:', error);
        alert('Не удалось проверить доступность: ' + error.message);
    }
}

function displayAvailableCars(data) {
    const resultsSection = document.getElementById('availability-results');
    if (!resultsSection) return;
    
    let carsGrid = resultsSection.querySelector('.cars-grid');
    
    if (!carsGrid) {
        carsGrid = document.createElement('div');
        carsGrid.className = 'cars-grid';
        resultsSection.appendChild(carsGrid);
    } else {
        carsGrid.innerHTML = '';
    }
    
    if (!data || !data.all_cars || data.all_cars.length === 0) {
        carsGrid.innerHTML = `
            <div class="no-cars-card" style="grid-column: 1 / -1; text-align: center; padding: 2rem; background: #f8f9fa; border-radius: 8px;">
                <h4 style="color: var(--danger-color); margin-bottom: 1rem;">Нет свободных автомобилей</h4>
                <p>На выбранную дату <strong>${data.date}</strong> нет свободных автомобилей.</p>
                <p style="margin-top: 1rem;">Попробуйте выбрать другую дату.</p>
            </div>
        `;
    } else {
        // Статистика
        const statsHtml = `
            <div class="availability-stats" style="grid-column: 1 / -1; background: #e8f4fd; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <h4 style="margin-top: 0; color: var(--primary-color);">Статистика на ${data.date}</h4>
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                    <div class="stat-card" style="background: white; padding: 1rem; border-radius: 6px; text-align: center;">
                        <h5 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Всего свободно</h5>
                        <p style="margin: 0; font-size: 1.5rem; font-weight: bold; color: var(--success-color);">${data.total_available} авто</p>
                    </div>
                    ${data.by_class.map(cls => `
                        <div class="stat-card" style="background: white; padding: 1rem; border-radius: 6px; text-align: center;">
                            <h5 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Класс "${cls.class_name}"</h5>
                            <p style="margin: 0; font-size: 1.2rem; font-weight: bold; color: var(--primary-color);">${cls.cars.length} авто</p>
                            <small style="color: #888;">от ${cls.base_price} BYN/день</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        carsGrid.innerHTML = statsHtml;
        
        // Карточки автомобилей
        data.all_cars.forEach(car => {
            const carCard = document.createElement('div');
            carCard.className = 'car-card';
            
            let actionButton = '';
            if (currentUser) {
                if (currentUser.role === 'guest') {
                    actionButton = `
                        <button class="btn-small btn-info" onclick="showLoginModal('user')" 
                            style="padding: 0.5rem 1rem; font-size: 0.9rem; background: var(--info-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Войти для бронирования
                        </button>`;
                } else if (currentUser.role === 'user') {
                    actionButton = `
                        <button class="btn-small btn-info" onclick="bookThisCar(${car.id})" 
                            style="padding: 0.5rem 1rem; font-size: 0.9rem; background: var(--info-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Забронировать
                        </button>`;
                } else if (currentUser.role === 'admin') {
                    actionButton = `
                        <span style="font-size: 0.9rem; color: #666; font-style: italic;">
                            (только просмотр)
                        </span>`;
                }
            } else {
                actionButton = `
                    <button class="btn-small btn-info" onclick="showLoginModal('user')" 
                        style="padding: 0.5rem 1rem; font-size: 0.9rem; background: var(--info-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Войти для бронирования
                    </button>`;
            }
            
            carCard.innerHTML = `
                <div class="car-image">
                    <div class="car-icon ${car.class_name}">${getClassIcon(car.class_name)}</div>
                </div>
                <div class="car-content">
                    <span class="car-class ${car.class_name}">${car.class_name}</span>
                    <h3 class="car-model">${car.model}</h3>
                    <p class="car-details">
                        <strong>${car.license_plate}</strong><br>
                        ${car.year} год, ${car.color}<br>
                        ${car.features}
                    </p>
                    <ul class="car-features">
                        <li>${car.daily_price} BYN/день</li>
                    </ul>
                    <div class="car-availability">
                        <span class="available-status">В наличии</span>
                        ${actionButton}
                    </div>
                </div>
            `;
            carsGrid.appendChild(carCard);
        });
    }
    
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function getClassIcon(className) {
    switch(className) {
        case 'economy': return 'E';
        case 'comfort': return 'C';
        case 'business': return 'B';
        case 'suv': return 'S';
        default: return 'A';
    }
}

function bookThisCar(carId) {
    if (!currentUser || currentUser.role === 'guest') {
        alert('Для бронирования необходимо авторизоваться');
        showLoginModal('user');
        return;
    }
    
    if (currentUser.role === 'admin') {
        alert('Администратор не может создавать бронирования. Используйте раздел "Отчеты".');
        showSection('reports');
        return;
    }
    
    if (!carId || isNaN(carId)) {
        console.error('Неверный ID автомобиля:', carId);
        return;
    }
    
    console.log('Быстрое бронирование авто ID:', carId);
    showSection('booking');
    alert('Выберите параметры бронирования в форме выше');
}

// =============================================
// ФУНКЦИИ БРОНИРОВАНИЯ (для пользователей)
// =============================================

async function searchCars() {
    const carClassName = document.getElementById('car-class').value;
    const startDate = document.getElementById('start-date').value;
    const duration = parseInt(document.getElementById('rental-duration').value);
    
    if (currentUser && currentUser.role === 'admin') {
        alert('Администратор не может создавать бронирования. Используйте раздел "Отчеты".');
        showSection('reports');
        return;
    }
    
    if (!currentUser || currentUser.role === 'guest') {
        alert('Для бронирования необходимо авторизоваться');
        showLoginModal('user');
        return;
    }
    
    if (!carClassName || !startDate || !duration) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    if (duration < 1) {
        alert('Продолжительность аренды должна быть не менее 1 дня');
        document.getElementById('rental-duration').value = 1;
        document.getElementById('rental-duration').focus();
        return;
    }
    
    console.log('Поиск автомобилей:', { carClassName, startDate, duration });
    
    try {
        const url = `${API_BASE}/cars-by-class/${carClassName}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Ошибка: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Найдено автомобилей:', result.cars.length);
        
        // Проверяем доступность каждого автомобиля
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
        
        displaySearchResults(searchResult, carClassName, startDate, duration);
        
    } catch (error) {
        console.error('Ошибка поиска автомобилей:', error);
        alert('Не удалось загрузить автомобили: ' + error.message);
    }
}

async function checkCarAvailability(carId, startDate, duration) {
    try {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + duration);
        const end_date = formatDate(endDate);
        
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
        
        return false;
        
    } catch (error) {
        console.error('Ошибка проверки доступности:', error);
        return false;
    }
}

function displaySearchResults(result, className, startDate, duration) {
    const resultsSection = document.getElementById('search-results');
    const availableCarsList = document.getElementById('available-cars-list');
    
    if (!resultsSection || !availableCarsList) return;
    
    resultsSection.classList.remove('hidden');
    availableCarsList.innerHTML = '';
    
    currentBookingData = { 
        className: className, 
        startDate: startDate, 
        duration: duration 
    };
    
    if (result.available && result.available_cars.length > 0) {
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
    
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function showBookingForm(carId, carModel, dailyPrice, totalPrice) {
    if (currentUser && currentUser.role === 'admin') {
        alert('Администратор не может создавать бронирования. Используйте раздел "Отчеты".');
        return;
    }
    
    const bookingForm = document.getElementById('confirmation-form');
    const summaryCar = document.getElementById('summary-car');
    const summaryPeriod = document.getElementById('summary-period');
    
    if (!bookingForm || !summaryCar || !summaryPeriod) return;
    
    summaryCar.textContent = `Автомобиль: ${carModel}`;
    summaryPeriod.textContent = `Период: ${currentBookingData.startDate} (${currentBookingData.duration} дней) - ${totalPrice} BYN`;
    
    bookingForm.classList.remove('hidden');
    bookingForm.scrollIntoView({ behavior: 'smooth' });
    
    currentBookingData.carId = carId;
    currentBookingData.carModel = carModel;
    currentBookingData.dailyPrice = dailyPrice;
    currentBookingData.totalPrice = totalPrice;
    
    console.log('Показываем форму бронирования для авто:', carModel);
}

async function submitBooking() {
    if (currentUser && currentUser.role === 'admin') {
        alert('Администратор не может создавать бронирования. Используйте раздел "Отчеты".');
        return;
    }
    
    console.log('Отправка бронирования:', currentBookingData);
    
    const clientName = document.getElementById('client-name').value.trim();
    const clientPhone = document.getElementById('client-phone').value.trim();
    const clientEmail = document.getElementById('client-email').value.trim();
    
    if (!clientName || !clientPhone || !clientEmail) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    if (!currentBookingData || !currentBookingData.carId) {
        alert('Ошибка: данные о бронировании не найдены');
        return;
    }
    
    if (currentUser && currentUser.role !== 'guest') {
        let dataErrors = [];
        
        if (clientName !== currentUser.name) {
            dataErrors.push('Имя не совпадает с данными из вашего профиля');
        }
        
        if (clientPhone !== currentUser.phone) {
            dataErrors.push('Телефон не совпадает с данными из вашего профиля');
        }
        
        if (clientEmail !== currentUser.email) {
            dataErrors.push('Email не совпадает с данными из вашего профиля');
        }
        
        if (dataErrors.length > 0) {
            const errorMessage = 'Обнаружены несоответствия данных:\n\n' + 
                dataErrors.join('\n') + 
                '\n\nИсправьте данные вручную.';
            alert(errorMessage);
            return;
        }
    }
    
    const token = localStorage.getItem('auth_token');
    if (!token) {
        alert('Требуется авторизация');
        showLoginModal('user');
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
    
    try {
        const response = await fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка создания бронирования');
        }
        
        const result = await response.json();
        console.log('Бронирование создано, ID:', result.id);
        
        document.getElementById('confirmation-form').classList.add('hidden');
        showConfirmationCodeForm(result);
        
    } catch (error) {
        console.error('Ошибка создания бронирования:', error);
        alert('Ошибка при создании бронирования: ' + error.message);
    }
}

function showConfirmationCodeForm(bookingResult) {
    if (confirmationTimer) {
        clearInterval(confirmationTimer);
    }
    
    const confirmationForm = document.getElementById('confirmation-code-form');
    const bookingIdElement = document.getElementById('confirmation-booking-id');
    const timerElement = document.getElementById('confirmation-timer');
    
    if (!confirmationForm || !bookingIdElement || !timerElement) return;
    
    timerElement.classList.remove('warning', 'danger');
    timerElement.textContent = '05:00';
    
    bookingIdElement.textContent = bookingResult.id;
    confirmationForm.classList.remove('hidden');
    confirmationForm.scrollIntoView({ behavior: 'smooth' });
    
    startConfirmationTimer(300, timerElement);
    currentBookingData.bookingId = bookingResult.id;
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
    
    const token = localStorage.getItem('auth_token');
    if (!token) {
        alert('Требуется авторизация');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/confirm-booking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
        
        alert('Бронирование успешно подтверждено!');
        
        if (confirmationTimer) {
            clearInterval(confirmationTimer);
        }
        
        resetForms();
        loadMyBookings();
        
    } catch (error) {
        console.error('Ошибка подтверждения:', error);
        alert('Ошибка подтверждения: ' + error.message);
    }
}

// =============================================
// МОИ БРОНИРОВАНИЯ
// =============================================

async function loadMyBookings() {
    if (currentUser && currentUser.role === 'admin') {
        const container = document.getElementById('my-bookings-container');
        if (container) {
            container.innerHTML = '<p>Администратор не имеет собственных бронирований.<br>Используйте раздел "Отчеты" для просмотра всех бронирований.</p>';
        }
        return;
    }
    
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    
    const container = document.getElementById('my-bookings-container');
    if (!container) return;
    
    container.innerHTML = '<p>Загрузка ваших бронирований...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/my-bookings`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки бронирований');
        }
        
        const data = await response.json();
        console.log('Загружено бронирований:', data.bookings.length);
        displayMyBookings(data.bookings);
        
    } catch (error) {
        console.error('Ошибка загрузки моих бронирований:', error);
        container.innerHTML = '<p>Ошибка загрузки бронирований</p>';
    }
}

function displayMyBookings(bookings) {
    const container = document.getElementById('my-bookings-container');
    if (!container) return;
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p>У вас нет бронирований</p>';
        return;
    }
    
    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Автомобиль</th>
                        <th>Период</th>
                        <th>Сумма</th>
                        <th>Статус</th>
                        <th>Дата создания</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    bookings.forEach(booking => {
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const totalPrice = booking.daily_price * days;
        
        let statusBadge = '';
        if (booking.status === 'confirmed') {
            statusBadge = '<span class="status-confirmed">Подтверждено</span>';
        } else if (booking.status === 'waiting') {
            statusBadge = '<span class="status-waiting">В ожидании</span>';
        } else if (booking.status === 'rejected') {
            statusBadge = '<span class="status-rejected">Отклонено</span>';
        }
        
        html += `
            <tr>
                <td>${booking.id}</td>
                <td>${booking.car_model} (${booking.class_name})</td>
                <td>${booking.start_date} (${days} дн.)</td>
                <td>${totalPrice} BYN</td>
                <td>${statusBadge}</td>
                <td>${new Date(booking.created_at).toLocaleDateString()}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// =============================================
// ФУНКЦИИ ДЛЯ АДМИНИСТРАТОРОВ
// =============================================

async function loadAdminReport() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Доступ запрещен');
        return;
    }
    
    const container = document.getElementById('reports-results');
    if (!container) return;
    
    container.innerHTML = '<p>Загрузка отчета...</p>';
    
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch(`${API_BASE}/admin/reports-filtered`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки отчета');
        }
        
        const result = await response.json();
        console.log('Загружен отчет:', result.bookings.length, 'записей');
        displayAdminReport(result);
        
    } catch (error) {
        console.error('Ошибка загрузки отчета:', error);
        container.innerHTML = '<p>Ошибка загрузки отчета: ' + error.message + '</p>';
    }
}

async function loadFilteredReport() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Доступ запрещен');
        return;
    }
    
    const month = document.getElementById('report-month').value;
    const year = document.getElementById('report-year').value;
    const status = document.getElementById('report-status').value;
    const carClass = document.getElementById('report-car-class').value;
    
    const token = localStorage.getItem('auth_token');
    
    try {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        if (status) params.append('status', status);
        if (carClass) params.append('car_class', carClass);
        
        const response = await fetch(`${API_BASE}/admin/reports-filtered?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки отчета');
        }
        
        const result = await response.json();
        displayAdminReport(result);
        
    } catch (error) {
        console.error('Ошибка загрузки фильтрованного отчета:', error);
        alert('Не удалось загрузить отчет: ' + error.message);
    }
}

function displayAdminReport(data) {
    const container = document.getElementById('reports-results');
    if (!container) return;
    
    let html = `
        <div class="report-summary">
            <h4>Статистика:</h4>
            <div class="stats-grid">
                <div class="stat-card total">
                    <h5>Всего</h5>
                    <p>${data.stats?.total || 0}</p>
                </div>
                <div class="stat-card confirmed">
                    <h5>Подтверждено</h5>
                    <p>${data.stats?.confirmed || 0}</p>
                </div>
                <div class="stat-card waiting">
                    <h5>В ожидании</h5>
                    <p>${data.stats?.waiting || 0}</p>
                </div>
                <div class="stat-card rejected">
                    <h5>Отклонено</h5>
                    <p>${data.stats?.rejected || 0}</p>
                </div>
                <div class="stat-card revenue">
                    <h5>Выручка</h5>
                    <p>${data.stats?.total_revenue ? data.stats.total_revenue.toFixed(2) : '0'} BYN</p>
                </div>
            </div>
        </div>
    `;
    
    if (data.bookings && data.bookings.length > 0) {
        html += `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Клиент</th>
                            <th>Автомобиль</th>
                            <th>Период</th>
                            <th>Сумма</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        data.bookings.forEach(booking => {
            const startDate = new Date(booking.start_date);
            const endDate = new Date(booking.end_date);
            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            const totalPrice = booking.daily_price * days;
            
            let statusBadge = '';
            if (booking.status === 'confirmed') {
                statusBadge = '<span class="status-confirmed">Подтверждено</span>';
            } else if (booking.status === 'waiting') {
                statusBadge = '<span class="status-waiting">В ожидании</span>';
            } else if (booking.status === 'rejected') {
                statusBadge = '<span class="status-rejected">Отклонено</span>';
            }
            
            html += `
                <tr>
                    <td>${booking.id}</td>
                    <td>
                        <strong>${booking.client_name}</strong><br>
                        <small>${booking.client_email}</small>
                    </td>
                    <td>${booking.car_model} (${booking.class_name})</td>
                    <td>${booking.start_date} (${days} дн.)</td>
                    <td>${totalPrice} BYN</td>
                    <td>${statusBadge}</td>
                    <td>
                        ${booking.status === 'waiting' ? 
                            `<button class="btn-small btn-danger" onclick="rejectBookingAdmin(${booking.id})">Отклонить</button>` : 
                            ''
                        }
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
    } else {
        html += '<p>Нет бронирований</p>';
    }
    
    container.innerHTML = html;
}

async function loadAnnualReport() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Доступ запрещен');
        return;
    }
    
    const year = document.getElementById('report-year').value || new Date().getFullYear();
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch(`${API_BASE}/admin/annual-report/${year}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки годового отчета');
        }
        
        const result = await response.json();
        
        const container = document.getElementById('reports-results');
        if (container) {
            container.innerHTML = `
                <h3>Годовой отчет за ${year} год</h3>
                <div class="stats-grid">
                    <div class="stat-card total">
                        <h5>Всего бронирований</h5>
                        <p>${result.stats.total}</p>
                    </div>
                    <div class="stat-card confirmed">
                        <h5>Подтверждено</h5>
                        <p>${result.stats.confirmed}</p>
                    </div>
                    <div class="stat-card revenue">
                        <h5>Выручка</h5>
                        <p>${result.stats.total_revenue.toFixed(2)} BYN</p>
                    </div>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Месяц</th>
                                <th>Всего</th>
                                <th>Подтверждено</th>
                                <th>В ожидании</th>
                                <th>Отклонено</th>
                                <th>Выручка</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${result.monthly_data.map(month => `
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
            `;
        }
        
    } catch (error) {
        console.error('Ошибка загрузки годового отчета:', error);
        alert('Ошибка загрузки годового отчета: ' + error.message);
    }
}

function getMonthName(monthNumber) {
    const months = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return months[parseInt(monthNumber) - 1];
}

async function rejectBookingAdmin(bookingId) {
    if (!confirm('Вы уверены, что хотите отклонить это бронирование?')) {
        return;
    }
    
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch(`${API_BASE}/admin/reject-booking/${bookingId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка отклонения');
        }
        
        alert('Бронирование отклонено');
        loadAdminReport();
        
    } catch (error) {
        console.error('Ошибка отклонения:', error);
        alert('Ошибка отклонения: ' + error.message);
    }
}

async function clearAllBookings() {
    if (!confirm('ВНИМАНИЕ! Это удалит ВСЕ бронирования. Продолжить?')) {
        return;
    }
    
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch(`${API_BASE}/admin/clear-all-bookings`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка удаления');
        }
        
        const result = await response.json();
        alert(`Удалено ${result.deleted_count} бронирований`);
        loadAdminReport();
        
    } catch (error) {
        console.error('Ошибка удаления бронирований:', error);
        alert('Ошибка удаления бронирований: ' + error.message);
    }
}

// =============================================
// УПРАВЛЕНИЕ АВТОМОБИЛЯМИ (для админа)
// =============================================

async function loadAdminCars() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Доступ запрещен');
        return;
    }
    
    const container = document.getElementById('admin-cars-container');
    if (!container) return;
    
    container.innerHTML = '<p>Загрузка автомобилей...</p>';
    
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch(`${API_BASE}/admin/cars`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки автомобилей');
        }
        
        const result = await response.json();
        displayAdminCars(result.cars);
        
    } catch (error) {
        console.error('Ошибка загрузки автомобилей:', error);
        container.innerHTML = '<p>Ошибка загрузки автомобилей: ' + error.message + '</p>';
    }
}

function displayAdminCars(cars) {
    const container = document.getElementById('admin-cars-container');
    if (!container) return;
    
    let html = `
        <div class="button-group" style="margin-bottom: 20px;">
            <button class="btn-success" onclick="showAddCarModal()">Добавить автомобиль</button>
        </div>
    `;
    
    if (cars && cars.length > 0) {
        html += `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Модель</th>
                            <th>Госномер</th>
                            <th>Класс</th>
                            <th>Цена/день</th>
                            <th>Доступность</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        cars.forEach(car => {
            html += `
                <tr>
                    <td>${car.id}</td>
                    <td>${car.model}</td>
                    <td>${car.license_plate}</td>
                    <td>${car.class_name}</td>
                    <td>${car.daily_price} BYN</td>
                    <td>${car.available ? '<span class="status-confirmed">Доступен</span>' : '<span class="status-rejected">Недоступен</span>'}</td>
                    <td>
                        <button class="btn-small btn-danger" onclick="deleteCar(${car.id})">Удалить</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
    } else {
        html += '<p>Нет автомобилей в базе данных</p>';
    }
    
    container.innerHTML = html;
}

function showAddCarModal() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Доступ запрещен');
        return;
    }
    
    const modal = document.getElementById('add-car-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

async function addCar() {
    const token = localStorage.getItem('auth_token');
    
    const carData = {
        model: document.getElementById('car-model').value,
        class_id: document.getElementById('car-class-select').value,
        license_plate: document.getElementById('car-license').value,
        year: document.getElementById('car-year').value,
        color: document.getElementById('car-color').value,
        features: document.getElementById('car-features').value,
        daily_price: document.getElementById('car-price').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/cars`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(carData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка добавления');
        }
        
        alert('Автомобиль успешно добавлен');
        closeModal('add-car-modal');
        loadAdminCars();
        
    } catch (error) {
        alert('Ошибка добавления автомобиля: ' + error.message);
    }
}

async function deleteCar(carId) {
    if (!confirm('Вы уверены, что хотите удалить этот автомобиль?')) {
        return;
    }
    
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch(`${API_BASE}/admin/cars/${carId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка удаления');
        }
        
        alert('Автомобиль успешно удален');
        loadAdminCars();
        
    } catch (error) {
        alert('Ошибка удаления автомобиля: ' + error.message);
    }
}

// =============================================
// АВТОРИЗАЦИЯ
// =============================================

async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        alert('Заполните все поля');
        return;
    }
    
    console.log('Попытка входа:', username);
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email: username,
                password: password 
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка авторизации');
        }
        
        const data = await response.json();
        console.log('Успешный вход:', data.user.name, 'роль:', data.user.role);
        
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        currentUser = data.user;
        
        closeModal('login-modal');
        updateUIForUserRole();
        
        const loginModal = document.getElementById('login-modal');
        const requestedRole = loginModal ? loginModal.getAttribute('data-requested-role') : 'user';
        
        alert(`Добро пожаловать, ${data.user.name}!`);
        
        if (requestedRole === 'admin' && data.user.role !== 'admin') {
            alert('Вы вошли как пользователь. Для доступа к функциям администратора войдите с учетной записью администратора.');
        } else if (requestedRole === 'user' && data.user.role === 'admin') {
            alert('Вы вошли как администратор. У вас есть доступ ко всем функциям.');
            showSection('reports');
        } else {
            showSection('available-cars');
        }
        
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        document.getElementById('login-password').value = '';
        alert('Ошибка авторизации: ' + error.message);
    }
}

async function register() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (!name || !email || !password || !confirmPassword) {
        alert('Заполните все обязательные поля');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Пароли не совпадают');
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm-password').value = '';
        document.getElementById('register-password').focus();
        return;
    }
    
    if (password.length < 6) {
        alert('Пароль должен содержать минимум 6 символов');
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm-password').value = '';
        document.getElementById('register-password').focus();
        return;
    }
    
    console.log('Попытка регистрации:', email);
    
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, name, phone })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка регистрации');
        }
        
        const data = await response.json();
        console.log('Успешная регистрация:', data.user.email);
        
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        currentUser = data.user;
        
        clearRegisterForm();
        closeModal('register-modal');
        updateUIForUserRole();
        
        alert(`Регистрация успешна! Добро пожаловать, ${data.user.name}!`);
        showSection('available-cars');
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm-password').value = '';
        document.getElementById('register-password').focus();
        alert('Ошибка регистрации: ' + error.message);
    }
}

function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        currentUser = { role: 'guest' };
        updateUIForUserRole();
        showSection('available-cars');
        alert('Вы успешно вышли из системы');
    }
}

// =============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================

function resetForms() {
    console.log('Сброс форм');
    
    if (confirmationTimer) {
        clearInterval(confirmationTimer);
    }
    
    const forms = [
        'confirmation-code-form',
        'confirmation-form',
        'search-results'
    ];
    
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) form.classList.add('hidden');
    });
    
    const fields = [
        'client-name',
        'client-phone',
        'client-email',
        'confirmation-code'
    ];
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
    
    const timerElement = document.getElementById('confirmation-timer');
    if (timerElement) {
        timerElement.textContent = '05:00';
        timerElement.classList.remove('warning', 'danger');
    }
    
    currentBookingData = null;
    
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) bookingForm.reset();
    
    setDefaultDates();
    
    console.log('Формы сброшены');
}

function resetBookingFlow() {
    resetForms();
    alert('Бронирование отменено. Все поля очищены.');
}