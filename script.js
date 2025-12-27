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
    
    // Устанавливаем даты по умолчанию С ОГРАНИЧЕНИЯМИ
    setDefaultDatesWithLimits();
    
    // Инициализируем формы
    initializeForms();
    
    // Инициализируем навигацию (скрытая до выбора роли)
    initializeNavigation();
    
    console.log('Система инициализирована');
});

// =============================================
// НОВЫЕ ФУНКЦИИ ДЛЯ ПРОВЕРКИ ДАТ
// =============================================

function setDefaultDatesWithLimits() {
    console.log('Установка дат с ограничениями');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minBookingDate = new Date(today);
    minBookingDate.setDate(minBookingDate.getDate() + 30); // МИНИМУМ через 30 дней
    
    // 1. Поле для проверки доступности (сегодня и будущее)
    const checkDateInput = document.getElementById('check-date');
    if (checkDateInput) {
        checkDateInput.min = formatDate(today);
        checkDateInput.value = formatDate(today);
    }
    
    // 2. Поле для начала аренды (завтра + 30 дней максимум)
    const startDateInput = document.getElementById('start-date');
    if (startDateInput) {
      startDateInput.min = formatDate(minBookingDate);
        
        // Устанавливаем значение по умолчанию как минимальную дату
        startDateInput.value = formatDate(tomorrow);
        
        // Добавляем проверку при изменении
        startDateInput.addEventListener('change', validateStartDate);
    }
    
    // 3. Год для отчетов (текущий)
    const reportYearInput = document.getElementById('report-year');
    if (reportYearInput) {
        reportYearInput.value = today.getFullYear();
    }
    
    console.log('Даты установлены: мин:', formatDate(tomorrow), 'макс:', formatDate(maxBookingDate));
}

// Проверка даты начала аренды
function validateStartDate() {
    const startDateInput = document.getElementById('start-date');
    if (!startDateInput) return true;
    
    const selectedDate = new Date(startDateInput.value);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    
    // Сбрасываем время для сравнения
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    maxDate.setHours(0, 0, 0, 0);
    
 // Проверка: Нельзя бронировать раньше чем через 30 дней
const minBookingDate = new Date(today);
minBookingDate.setDate(minBookingDate.getDate() + 30);
minBookingDate.setHours(0, 0, 0, 0);

if (selectedDate < minBookingDate) {
    alert(` ОШИБКА!\nБронирование возможно только через 30 дней от текущей даты.\nМинимальная доступная дата: ${formatDate(minBookingDate)}`);
    
    // Сбрасываем на минимальную дату (через 30 дней)
    startDateInput.value = formatDate(minBookingDate);
    startDateInput.focus();
    return false;
}

// Проверку на максимальный срок УБИРАЕМ - можно бронировать на любой срок вперед
    
    return true;
}

// Проверка перед поиском автомобилей
function validateSearchDate() {
    const startDateInput = document.getElementById('start-date');
    if (!startDateInput) return false;
    
    return validateStartDate();
}

// Форматирование даты в YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// =============================================
// ОСТАЛЬНОЙ КОД (с небольшими изменениями)
// =============================================

// Проверка сохраненного пользователя
function checkSavedUser() {
    const savedUser = localStorage.getItem('user_data');
    const token = localStorage.getItem('auth_token');
    
    if (savedUser && token) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('Найден сохраненный пользователь:', currentUser.email, 'роль:', currentUser.role);
            
            // Сразу показываем основной интерфейс
            document.getElementById('start-page').style.display = 'none';
            document.getElementById('main-interface').style.display = 'block';
            
            // Обновляем UI
            updateUIForUserRole();
            
            // Показываем первую секцию в зависимости от роли
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
        // Гость - показываем основной интерфейс без авторизации
        currentUser = { role: 'guest' };
        showMainInterface('guest');
    } else if (role === 'user' || role === 'admin') {
        // Пользователь или админ - показываем окно входа
        showLoginModal(role);
    }
}

function showMainInterface(userRole) {
    console.log('Показываем основной интерфейс для роли:', userRole);
    
    // Прячем стартовую страницу
    document.getElementById('start-page').style.display = 'none';
    document.getElementById('start-page').classList.remove('active');
    
    // Показываем основной интерфейс
    document.getElementById('main-interface').style.display = 'block';
    
    // Обновляем UI для текущей роли
    updateUIForUserRole();
    
    // Показываем первую секцию
    showSection('available-cars');
}

function switchToStartPage() {
    // Прячем основной интерфейс
    document.getElementById('main-interface').style.display = 'none';
    
    // Показываем стартовую страницу
    document.getElementById('start-page').style.display = 'block';
    document.getElementById('start-page').classList.add('active');
    
    // Сбрасываем пользователя
    currentUser = null;
    localStorage.removeItem('user_data');
    localStorage.removeItem('auth_token');
}

// =============================================
// УПРАВЛЕНИЕ СЕКЦИЯМИ
// =============================================

function showSection(sectionId) {
    console.log('Показываем секцию:', sectionId, 'для роли:', currentUser?.role);
    
    // СПЕЦИАЛЬНОЕ ПРАВИЛО ДЛЯ АДМИНА: скрываем бронирования
    if (currentUser && currentUser.role === 'admin') {
        // Админу запрещаем доступ к бронированиям
        if (sectionId === 'booking' || sectionId === 'my-bookings') {
            alert('Администратор не может создавать бронирования.\nИспользуйте раздел "Отчеты" для просмотра всех бронирований.');
            showSection('reports'); // Перенаправляем на отчеты
            return;
        }
    }
    
    // Проверка доступа для обычных пользователей
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
    
    // Находим и активируем нужную ссылку
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
        // Очищаем предыдущие результаты
        const resultsSection = document.getElementById('availability-results');
        if (resultsSection) {
            resultsSection.classList.add('hidden');
        }
    } else if (sectionId === 'booking') {
        // Показываем/скрываем уведомление о данных
        const bookingNotice = document.getElementById('booking-notice');
        const autofillBtn = document.getElementById('autofill-btn');
        
        if (currentUser && currentUser.role !== 'guest') {
            if (bookingNotice) bookingNotice.style.display = 'block';
            if (autofillBtn) autofillBtn.style.display = 'inline-block';
        } else {
            if (bookingNotice) bookingNotice.style.display = 'none';
            if (autofillBtn) autofillBtn.style.display = 'none';
        }
    }
}

// =============================================
// ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ДЛЯ РОЛИ
// =============================================

function updateUIForUserRole() {
    console.log('Обновление UI для роли:', currentUser ? currentUser.role : 'none');
    
    // Управление верхней панелью
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const guestNotice = document.getElementById('guest-notice');
    
    // Навигационные элементы
    const bookingNav = document.getElementById('booking-nav');
    const myBookingsNav = document.getElementById('my-bookings-nav');
    const reportsNav = document.getElementById('reports-nav');
    const adminCarsNav = document.getElementById('admin-cars-nav');
    
    // ВСПОМОГАТЕЛЬНЫЕ ЭЛЕМЕНТЫ
    // Секция поиска автомобилей
    const searchSection = document.getElementById('booking');
    const searchForm = document.getElementById('booking-form');
    
    // Секция проверки доступности
    const availabilitySection = document.getElementById('available-cars');
    const availabilityForm = document.getElementById('availability-check');
    
    // Секция отчетов
    const reportsSection = document.getElementById('reports');
    
    // Секция управления авто
    const adminCarsSection = document.getElementById('admin-cars');
    
    // ====================
    // Гость (неавторизованный)
    // ====================
    if (!currentUser || currentUser.role === 'guest') {
        console.log('Настройка UI для гостя');
        
        // Верхняя панель
        if (authButtons) {
            authButtons.style.display = 'flex';
            authButtons.style.gap = '10px';
        }
        if (userInfo) userInfo.style.display = 'none';
        if (guestNotice) guestNotice.style.display = 'block';
        
        // НАВИГАЦИЯ для гостя
        // Показываем только "Свободные авто"
        if (bookingNav) bookingNav.style.display = 'none';
        if (myBookingsNav) myBookingsNav.style.display = 'none';
        if (reportsNav) reportsNav.style.display = 'none';
        if (adminCarsNav) adminCarsNav.style.display = 'none';
        
        // СЕКЦИИ для гостя
        // Скрываем формы бронирования и управления
        if (searchSection) searchSection.style.display = 'none';
        if (reportsSection) reportsSection.style.display = 'none';
        if (adminCarsSection) adminCarsSection.style.display = 'none';
        
        // Показываем только проверку доступности
        if (availabilitySection) availabilitySection.style.display = 'block';
        if (availabilityForm) availabilityForm.style.display = 'block';
        
        // Внутри секции доступности убираем кнопки бронирования
        const bookButtons = document.querySelectorAll('.book-btn, .btn-info[onclick*="bookThisCar"]');
        bookButtons.forEach(btn => {
            btn.style.display = 'none';
        });
        
    // ====================
    // Обычный пользователь
    // ====================
    } else if (currentUser.role === 'user') {
        console.log('Настройка UI для пользователя:', currentUser.name);
        
        // Верхняя панель
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            userInfo.style.alignItems = 'center';
            userInfo.style.gap = '10px';
            
            const userName = document.getElementById('user-name');
            const userRoleBadge = document.getElementById('user-role-badge');
            
            if (userName) userName.textContent = currentUser.name;
            if (userRoleBadge) {
                userRoleBadge.textContent = 'Пользователь';
                userRoleBadge.style.background = 'var(--success-color)';
            }
        }
        if (guestNotice) guestNotice.style.display = 'none';
        
        // НАВИГАЦИЯ для пользователя
        // Показываем: "Свободные авто", "Бронирование", "Мои бронирования"
        if (bookingNav) bookingNav.style.display = 'block';
        if (myBookingsNav) myBookingsNav.style.display = 'block';
        // Скрываем админские разделы
        if (reportsNav) reportsNav.style.display = 'none';
        if (adminCarsNav) adminCarsNav.style.display = 'none';
        
        // СЕКЦИИ для пользователя
        // Показываем все, кроме админских разделов
        if (searchSection) searchSection.style.display = 'block';
        if (availabilitySection) availabilitySection.style.display = 'block';
        // Скрываем админские разделы
        if (reportsSection) reportsSection.style.display = 'none';
        if (adminCarsSection) adminCarsSection.style.display = 'none';
        
        // Внутри секции доступности показываем кнопки бронирования
        const bookButtons = document.querySelectorAll('.btn-info[onclick*="bookThisCar"]');
        bookButtons.forEach(btn => {
            btn.style.display = 'inline-block';
        });
        
    // ====================
    // Администратор
    // ====================
    } else if (currentUser.role === 'admin') {
        console.log('Настройка UI для администратора:', currentUser.name);
        
        // Верхняя панель
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            userInfo.style.alignItems = 'center';
            userInfo.style.gap = '10px';
            
            const userName = document.getElementById('user-name');
            const userRoleBadge = document.getElementById('user-role-badge');
            
            if (userName) userName.textContent = currentUser.name;
            if (userRoleBadge) {
                userRoleBadge.textContent = 'Админ';
                userRoleBadge.style.background = 'var(--danger-color)';
            }
        }
        if (guestNotice) guestNotice.style.display = 'none';
        
        // НАВИГАЦИЯ для администратора
        // Показываем: "Свободные авто", "Отчеты", "Управление авто"
        // Скрываем: "Бронирование", "Мои бронирования"
        if (bookingNav) bookingNav.style.display = 'none';
        if (myBookingsNav) myBookingsNav.style.display = 'none';
        if (reportsNav) reportsNav.style.display = 'block';
        if (adminCarsNav) adminCarsNav.style.display = 'block';
        
        // СЕКЦИИ для администратора
        // Скрываем формы бронирования
        if (searchSection) searchSection.style.display = 'none';
        // Показываем проверку доступности (только просмотр)
        if (availabilitySection) availabilitySection.style.display = 'block';
        // Показываем админские разделы
        if (reportsSection) reportsSection.style.display = 'block';
        if (adminCarsSection) adminCarsSection.style.display = 'block';
        
        // Внутри секции доступности убираем кнопки бронирования
        const bookButtons = document.querySelectorAll('.book-btn, .btn-info[onclick*="bookThisCar"]');
        bookButtons.forEach(btn => {
            btn.style.display = 'none';
        });
        
        // Вместо кнопок бронирования показываем сообщение
        const carCards = document.querySelectorAll('.car-card');
        carCards.forEach(card => {
            const bookingBtn = card.querySelector('.btn-info[onclick*="bookThisCar"]');
            if (bookingBtn) {
                bookingBtn.outerHTML = '<span class="admin-view-only">(только просмотр)</span>';
            }
        });
    }
}

// =============================================
// АВТОЗАПОЛНЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ
// =============================================

function autofillUserData() {
    if (!currentUser || currentUser.role === 'guest') {
        alert('Вы не авторизованы');
        return;
    }
    
    console.log('Автозаполнение данных пользователя:', currentUser);
    
    // Заполняем поля формы данными из профиля
    document.getElementById('client-name').value = currentUser.name || '';
    document.getElementById('client-phone').value = currentUser.phone || '';
    document.getElementById('client-email').value = currentUser.email || '';
    
    alert('Данные из вашего профиля заполнены автоматически');
}

function checkUserData() {
    if (!currentUser || currentUser.role === 'guest') {
        alert('Вы не авторизованы');
        return;
    }
    
    const clientName = document.getElementById('client-name').value.trim();
    const clientPhone = document.getElementById('client-phone').value.trim();
    const clientEmail = document.getElementById('client-email').value.trim();
    
    let errors = [];
    
    // Проверяем соответствие данных
    if (clientName !== currentUser.name) {
        errors.push('Имя не совпадает с данными из вашего профиля');
        document.getElementById('name-hint').style.color = 'var(--danger-color)';
    } else {
        document.getElementById('name-hint').style.color = 'var(--success-color)';
    }
    
    if (clientPhone !== currentUser.phone) {
        errors.push('Телефон не совпадает с данными из вашего профиля');
        document.getElementById('phone-hint').style.color = 'var(--danger-color)';
    } else {
        document.getElementById('phone-hint').style.color = 'var(--success-color)';
    }
    
    if (clientEmail !== currentUser.email) {
        errors.push('Email не совпадает с данными из вашего профиля');
        document.getElementById('email-hint').style.color = 'var(--danger-color)';
    } else {
        document.getElementById('email-hint').style.color = 'var(--success-color)';
    }
    
    if (errors.length > 0) {
        alert('Обнаружены ошибки:\n\n' + errors.join('\n'));
        return false;
    } else {
        alert('✓ Все данные соответствуют вашему профилю!');
        return true;
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
        
        // Очищаем поля формы
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        
        // Фокусируемся на поле email
        setTimeout(() => {
            const emailInput = document.getElementById('login-email');
            if (emailInput) emailInput.focus();
        }, 100);
        
        // Сохраняем запрошенную роль для использования после входа
        modal.setAttribute('data-requested-role', requestedRole);
    }
}

function showRegisterModal() {
    console.log('Показываем окно регистрации');
    
    const modal = document.getElementById('register-modal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Сначала закрываем окно входа
        closeModal('login-modal');
        
        // Очищаем поля формы при открытии
        clearRegisterForm();
        
        // Фокусируемся на поле имени
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
        
        // Автозаполняем данные администратора
        document.getElementById('login-email').value = 'admin@example.com';
        document.getElementById('login-password').value = 'admin123';
        
        // Устанавливаем запрошенную роль как администратор
        modal.setAttribute('data-requested-role', 'admin');
        
        // Показываем подсказку
        alert('Данные администратора заполнены автоматически. Нажмите "Войти" для продолжения.');
    }
}

function clearRegisterForm() {
    // Очищаем все поля формы регистрации
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
    
    console.log('Форма регистрации очищена');
}

function closeModal(modalId = null) {
    if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    } else {
        // Закрываем все модальные окна
        ['login-modal', 'register-modal', 'add-car-modal'].forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// =============================================
// ФОРМЫ АВТОРИЗАЦИИ
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
    
    // Форма бронирования (с проверкой даты)
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Проверяем дату перед поиском
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

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        alert('Заполните все поля');
        return;
    }
    
    console.log('Попытка входа:', email);
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка авторизации');
        }
        
        const data = await response.json();
        console.log('Успешный вход:', data.user.email, 'роль:', data.user.role);
        
        // Сохраняем данные
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        
        // Обновляем текущего пользователя
        currentUser = data.user;
        
        // Закрываем модальное окно
        closeModal('login-modal');
        
        // Обновляем UI
        updateUIForUserRole();
        
        // Проверяем, какую роль запрашивали
        const loginModal = document.getElementById('login-modal');
        const requestedRole = loginModal ? loginModal.getAttribute('data-requested-role') : 'user';
        
        alert(`Добро пожаловать, ${data.user.name}!`);
        
        // Если пользователь вошел как не та роль, которую запрашивал
        if (requestedRole === 'admin' && data.user.role !== 'admin') {
            alert('Вы вошли как пользователь. Для доступа к функциям администратора войдите с учетной записью администратора.');
        } else if (requestedRole === 'user' && data.user.role === 'admin') {
            // Если администратор вошел через выбор "Пользователь"
            alert('Вы вошли как администратор. У вас есть доступ ко всем функциям.');
        }
        
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        
        // Очищаем поля пароля при ошибке
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
    
    // Валидация данных
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
    
    if (email === 'admin@example.com') {
        alert('Этот email зарезервирован для администратора. Используйте другой email.');
        document.getElementById('register-email').value = '';
        document.getElementById('register-email').focus();
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
        
        // Сохраняем данные
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        
        // Обновляем текущего пользователя
        currentUser = data.user;
        
        // Очищаем форму регистрации
        clearRegisterForm();
        
        // Закрываем модальное окно
        closeModal('register-modal');
        
        // Обновляем UI
        updateUIForUserRole();
        
        alert(`Регистрация успешна! Добро пожаловать, ${data.user.name}!`);
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        
        // Очищаем поля паролей при ошибке
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
        
        // Обновляем UI для гостя
        updateUIForUserRole();
        
        // Показываем только секцию свободных авто
        showSection('available-cars');
        
        alert('Вы успешно вышли из системы');
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
            
            // Определяем, какую кнопку показывать в зависимости от роли
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
                <div class="car-image" style="height: 150px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #eee;">
                    <span style="font-size: 3rem;">🚗</span>
                </div>
                <div class="car-content" style="padding: 1rem;">
                    <span class="car-class ${car.class_name}" style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #f0f0f0; color: #333; margin-bottom: 0.5rem;">${car.class_name}</span>
                    <h3 class="car-model" style="margin: 0 0 0.5rem 0; font-size: 1.2rem; color: var(--primary-color);">${car.model}</h3>
                    <p class="car-details" style="font-size: 0.9rem; color: #666; margin: 0 0 1rem 0;">
                        <strong>${car.license_plate}</strong><br>
                        ${car.year} год, ${car.color}<br>
                        ${car.features}
                    </p>
                    <ul class="car-features" style="list-style: none; padding: 0; margin: 0 0 1rem 0;">
                        <li style="padding: 0.25rem 0; color: var(--success-color);">Свободен на ${data.date}</li>
                        <li style="padding: 0.25rem 0; font-weight: bold;">${car.daily_price} BYN/день</li>
                    </ul>
                    <div class="car-availability" style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="available-status" style="color: var(--success-color); font-weight: bold;">В наличии</span>
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

function bookThisCar(carId) {
    if (!currentUser || currentUser.role === 'guest') {
        alert('Для бронирования необходимо авторизоваться');
        showLoginModal('user');
        return;
    }
    
    // ОСОБАЯ ПРОВЕРКА ДЛЯ АДМИНА
    if (currentUser.role === 'admin') {
        alert('Администратор не может создавать бронирования. Используйте раздел "Отчеты".');
        showSection('reports');
        return;
    }
    
    console.log('Быстрое бронирование авто ID:', carId);
    
    // Переходим к разделу бронирования
    showSection('booking');
    
    // Можно добавить автоматический выбор автомобиля в форме
    alert('Выберите параметры бронирования в форме выше');
}

// =============================================
// ФУНКЦИИ БРОНИРОВАНИЯ (для пользователей)
// =============================================

async function searchCars() {
    const carClassName = document.getElementById('car-class').value;
    const startDate = document.getElementById('start-date').value;
    const duration = parseInt(document.getElementById('rental-duration').value);
    
    // ОСОБАЯ ПРОВЕРКА ДЛЯ АДМИНА
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
    
    // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: длительность аренды минимум 1 день
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
    
    // Сохраняем данные для бронирования
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
    // ОСОБАЯ ПРОВЕРКА ДЛЯ АДМИНА
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
    
    // Сохраняем данные автомобиля
    currentBookingData.carId = carId;
    currentBookingData.carModel = carModel;
    currentBookingData.dailyPrice = dailyPrice;
    currentBookingData.totalPrice = totalPrice;
    
    console.log('Показываем форму бронирования для авто:', carModel);
}

async function submitBooking() {
    // ОСОБАЯ ПРОВЕРКА ДЛЯ АДМИНА
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
    
    // ПРОВЕРКА СООТВЕТСТВИЯ ДАННЫХ ПОЛЬЗОВАТЕЛЯ
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
                '\n\nИспользуйте кнопку "Заполнить моими данными" или исправьте данные вручную.';
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
        
        // Скрываем форму данных
        document.getElementById('confirmation-form').classList.add('hidden');
        
        // Показываем форму подтверждения
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
    
    // Сохраняем ID бронирования
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
        
        // Загружаем обновленный список бронирований
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
    // ОСОБАЯ ПРОВЕРКА ДЛЯ АДМИНА
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
        
        // Отображаем годовой отчет
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
        
        // Обновляем отчет
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
        
        // Обновляем отчет
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
                        <button class="btn-small btn-info" onclick="editCar(${car.id})">Редактировать</button>
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

function editCar(carId) {
    alert('Функция редактирования автомобиля в разработке');
}

// =============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================

function resetForms() {
    console.log('Сброс форм');
    
    if (confirmationTimer) {
        clearInterval(confirmationTimer);
    }
    
    // Скрываем формы
    const forms = [
        'confirmation-code-form',
        'confirmation-form',
        'search-results'
    ];
    
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) form.classList.add('hidden');
    });
    
    // Очищаем поля
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
    
    // Сбрасываем подсказки
    const hints = ['name-hint', 'phone-hint', 'email-hint'];
    hints.forEach(hintId => {
        const hint = document.getElementById(hintId);
        if (hint) hint.style.color = '#666';
    });
    
    // Сбрасываем таймер
    const timerElement = document.getElementById('confirmation-timer');
    if (timerElement) {
        timerElement.textContent = '05:00';
        timerElement.classList.remove('warning', 'danger');
    }
    
    // Сбрасываем данные бронирования
    currentBookingData = null;
    
    // Сбрасываем форму бронирования
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) bookingForm.reset();
    
    // Устанавливаем даты по умолчанию
    setDefaultDatesWithLimits();
    
    console.log('Формы сброшены');
}

function resetBookingFlow() {
    resetForms();
    alert('Бронирование отменено. Все поля очищены.');
}