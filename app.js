// Разрешаем доступ с любого домена
document.addEventListener('DOMContentLoaded', function() {
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.enableClosingConfirmation();
});

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние приложения
let transactions = [];
let balance = 0;
let expensesChart = null;
let categories = [
    { id: 'salary', name: 'Зарплата', color: '#4CAF50', type: 'income' },
    { id: 'food', name: 'Еда', color: '#FF9800', type: 'expense' },
    { id: 'transport', name: 'Транспорт', color: '#2196F3', type: 'expense' },
    { id: 'entertainment', name: 'Развлечения', color: '#9C27B0', type: 'expense' },
    { id: 'other', name: 'Другое', color: '#607D8B', type: 'expense' }
];

// DOM элементы
const transactionForm = document.getElementById('transactionForm');
const categoryForm = document.getElementById('categoryForm');
const editTransactionForm = document.getElementById('editTransactionForm');
const transactionsList = document.getElementById('transactionsList');
const totalBalance = document.getElementById('totalBalance');
const startMonthBalance = document.getElementById('startMonthBalance');
const balanceDifference = document.getElementById('balanceDifference');
const categorySelect = document.getElementById('category');
const editCategorySelect = document.getElementById('editCategory');
const monthSelect = document.getElementById('monthSelect');
const editAddCategoryBtn = document.getElementById('editAddCategoryBtn');
const transactionTypeContainer = document.querySelector('.transaction-type-container');
const editTransactionTypeContainer = document.querySelector('#editTransactionModal .transaction-type-container');
const transactionTypeSelect = document.getElementById('transactionType');
const editTransactionTypeSelect = document.getElementById('editTransactionType');

// Текущий выбранный месяц
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Модальные окна
const categoryModal = document.getElementById('categoryModal');
const transactionModal = document.getElementById('transactionModal');
const addButton = document.getElementById('addButton');
const addCategoryBtnInForm = document.querySelector('.add-category-btn');
const editTransactionModal = document.getElementById('editTransactionModal');

// Обработчики модальных окон
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.onclick = function() {
        this.closest('.modal').style.display = 'none';
    }
});

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

addButton.addEventListener('click', () => {
    transactionModal.style.display = 'block';
});

addCategoryBtnInForm.addEventListener('click', (e) => {
    e.preventDefault();
    categoryModal.style.display = 'block';
});

// Обработчик изменения категории в форме добавления
categorySelect.addEventListener('change', () => {
    const selectedCategory = categorySelect.value;
    const isOtherCategory = selectedCategory === 'other';
    transactionTypeContainer.style.display = isOtherCategory ? 'block' : 'none';
    if (!isOtherCategory) {
        transactionTypeSelect.value = 'expense';
    }
});

// Обработчик изменения категории в форме редактирования
editCategorySelect.addEventListener('change', () => {
    const selectedCategory = editCategorySelect.value;
    const isOtherCategory = selectedCategory === 'other';
    editTransactionTypeContainer.style.display = isOtherCategory ? 'block' : 'none';
    if (!isOtherCategory) {
        editTransactionTypeSelect.value = 'expense';
    }
});

// Обработчик отправки формы транзакции
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    
    // Определяем тип транзакции
    let type;
    if (category === 'other') {
        type = document.getElementById('transactionType').value;
    } else {
        const categoryObj = categories.find(c => c.id === category);
        type = categoryObj ? categoryObj.type : 'expense';
    }
    
    const transaction = {
        id: Date.now(),
        amount,
        type,
        category,
        description,
        date: new Date().toISOString()
    };
    
    addTransaction(transaction);
    transactionForm.reset();
    transactionModal.style.display = 'none';
    transactionTypeContainer.style.display = 'none';
});

// Обработчик отправки формы редактирования транзакции
editTransactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('editTransactionId').value);
    const amount = parseFloat(document.getElementById('editAmount').value);
    const category = document.getElementById('editCategory').value;
    const description = document.getElementById('editDescription').value;
    
    // Определяем тип транзакции
    let type;
    if (category === 'other') {
        type = document.getElementById('editTransactionType').value;
    } else {
        const categoryObj = categories.find(c => c.id === category);
        type = categoryObj ? categoryObj.type : 'expense';
    }
    
    // Находим и обновляем транзакцию
    const transactionIndex = transactions.findIndex(t => t.id === id);
    if (transactionIndex !== -1) {
        transactions[transactionIndex] = {
            ...transactions[transactionIndex],
            amount,
            category,
            description,
            type
        };
        
        updateBalance();
        renderTransactions();
        updateChart();
        saveToStorage();
        editTransactionModal.style.display = 'none';
        editTransactionTypeContainer.style.display = 'none';
    }
});

// Функция для открытия окна редактирования транзакции
function openEditTransactionModal(transactionId) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    document.getElementById('editTransactionId').value = transaction.id;
    document.getElementById('editAmount').value = transaction.amount;
    document.getElementById('editDescription').value = transaction.description || '';
    
    // Устанавливаем выбранную категорию
    const categorySelect = document.getElementById('editCategory');
    categorySelect.value = transaction.category;
    
    // Показываем/скрываем выбор типа транзакции
    const isOtherCategory = transaction.category === 'other';
    editTransactionTypeContainer.style.display = isOtherCategory ? 'block' : 'none';
    if (isOtherCategory) {
        document.getElementById('editTransactionType').value = transaction.type;
    }
    
    editTransactionModal.style.display = 'block';
}

// Функция для удаления транзакции
function deleteTransaction(id) {
    if (confirm('Вы уверены, что хотите удалить эту операцию?')) {
        transactions = transactions.filter(t => t.id !== id);
        updateBalance();
        renderTransactions();
        updateChart();
        saveToStorage();
    }
}

// Функция для генерации случайного цвета
function generateRandomColor() {
    const letters = '0123456789ABCDEF';
    let color;
    let isUnique;
    
    do {
        color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        // Проверяем, что цвет не слишком светлый и не совпадает с существующими
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        isUnique = !categories.some(cat => cat.color === color) && brightness < 200;
    } while (!isUnique);
    
    return color;
}

// Обработчик отправки формы категории
categoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('newCategoryName').value;
    const id = name.toLowerCase().replace(/\s+/g, '_');
    const color = generateRandomColor();
    const type = document.getElementById('categoryType').value;
    
    const newCategory = {
        id,
        name,
        color,
        type
    };
    
    addCategory(newCategory);
    categoryForm.reset();
    categoryModal.style.display = 'none';
});

// Добавление категории
function addCategory(category) {
    categories.push(category);
    updateCategorySelect();
    saveCategoriesToStorage();
}

// Обновление выпадающего списка категорий
function updateCategorySelect() {
    categorySelect.innerHTML = categories.map(category => 
        `<option value="${category.id}">${category.name}</option>`
    ).join('');
    
    editCategorySelect.innerHTML = categories.map(category => 
        `<option value="${category.id}">${category.name}</option>`
    ).join('');
}

// Добавление транзакции
function addTransaction(transaction) {
    transactions.unshift(transaction);
    updateBalance();
    renderTransactions();
    updateChart();
    saveToStorage();
    
    // Обновляем селектор месяца, если добавили транзакцию в новый месяц
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const existingOption = Array.from(monthSelect.options).find(option => option.value === monthKey);
    
    if (!existingOption) {
        initMonthSelector();
    }
}

// Инициализация селектора месяца
function initMonthSelector() {
    const months = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    // Очищаем селектор
    monthSelect.innerHTML = '';
    
    // Собираем уникальные месяцы с транзакциями
    const monthsWithData = new Set();
    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        monthsWithData.add(`${date.getFullYear()}-${date.getMonth()}`);
    });
    
    // Сортируем месяцы в обратном порядке (от новых к старым)
    const sortedMonths = Array.from(monthsWithData).sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        return yearB * 12 + monthB - (yearA * 12 + monthA);
    });
    
    // Добавляем опции для месяцев с данными
    sortedMonths.forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        const option = document.createElement('option');
        option.value = monthKey;
        option.textContent = `${months[month]} ${year}`;
        monthSelect.appendChild(option);
    });
    
    // Если есть транзакции, устанавливаем текущий месяц как выбранный
    if (sortedMonths.length > 0) {
        const [year, month] = sortedMonths[0].split('-').map(Number);
        currentYear = year;
        currentMonth = month;
        monthSelect.value = `${year}-${month}`;
    }
    
    // Добавляем обработчик изменения месяца
    monthSelect.addEventListener('change', () => {
        const [year, month] = monthSelect.value.split('-').map(Number);
        currentYear = year;
        currentMonth = month;
        updateBalance();
        renderTransactions();
        updateChart();
    });
}

// Обновление баланса с учетом выбранного месяца
function updateBalance() {
    const filteredTransactions = transactions.filter(transaction => {
        const date = new Date(transaction.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    // Рассчитываем текущий баланс
    balance = filteredTransactions.reduce((total, transaction) => {
        return transaction.type === 'income' 
            ? total + transaction.amount 
            : total - transaction.amount;
    }, 0);
    
    // Рассчитываем баланс на начало месяца
    const startBalance = transactions.reduce((total, transaction) => {
        const date = new Date(transaction.date);
        if (date.getFullYear() < currentYear || 
            (date.getFullYear() === currentYear && date.getMonth() < currentMonth)) {
            return transaction.type === 'income' 
                ? total + transaction.amount 
                : total - transaction.amount;
        }
        return total;
    }, 0);
    
    // Рассчитываем разницу
    const difference = balance - startBalance;
    
    // Обновляем отображение
    totalBalance.textContent = `${balance.toFixed(2)} ₽`;
    totalBalance.className = balance < 0 ? 'negative' : '';
    
    startMonthBalance.textContent = `${startBalance.toFixed(2)} ₽`;
    
    balanceDifference.textContent = `${difference >= 0 ? '+' : ''}${difference.toFixed(2)} ₽`;
    balanceDifference.className = difference >= 0 ? 'positive' : 'negative';
}

// Отрисовка списка транзакций с учетом выбранного месяца
function renderTransactions() {
    const filteredTransactions = transactions.filter(transaction => {
        const date = new Date(transaction.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    // Рассчитываем баланс на начало месяца
    const startBalance = transactions.reduce((total, transaction) => {
        const date = new Date(transaction.date);
        if (date.getFullYear() < currentYear || 
            (date.getFullYear() === currentYear && date.getMonth() < currentMonth)) {
            return transaction.type === 'income' 
                ? total + transaction.amount 
                : total - transaction.amount;
        }
        return total;
    }, 0);
    
    // Сортируем транзакции по дате (от старых к новым)
    const sortedTransactions = [...filteredTransactions].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
    );
    
    // Рассчитываем баланс после каждой транзакции
    let runningBalance = startBalance;
    const transactionsWithBalance = sortedTransactions.map(transaction => {
        runningBalance = transaction.type === 'income' 
            ? runningBalance + transaction.amount 
            : runningBalance - transaction.amount;
        return { ...transaction, balance: runningBalance };
    });
    
    // Сортируем обратно (от новых к старым) для отображения
    transactionsWithBalance.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    transactionsList.innerHTML = transactionsWithBalance.map(transaction => {
        const category = categories.find(c => c.id === transaction.category);
        return `
            <div class="transaction-item">
                <div class="transaction-content">
                    <strong>${category ? category.name : transaction.category}</strong>
                    <div>${transaction.description || ''}</div>
                    <small>${new Date(transaction.date).toLocaleString('ru-RU', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</small>
                </div>
                <div class="transaction-amounts">
                    <div class="${transaction.type}">
                        ${transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)} ₽
                    </div>
                    <div class="transaction-balance ${transaction.balance < 0 ? 'negative' : ''}">
                        ${transaction.balance.toFixed(2)} ₽
                    </div>
                </div>
                <div class="transaction-actions">
                    <button class="transaction-action edit" onclick="openEditTransactionModal(${transaction.id})">✎</button>
                    <button class="transaction-action delete" onclick="deleteTransaction(${transaction.id})">×</button>
                </div>
            </div>
        `;
    }).join('');
}

// Обновление диаграммы с учетом выбранного месяца
function updateChart() {
    const filteredTransactions = transactions.filter(transaction => {
        const date = new Date(transaction.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const expensesByCategory = {};
    
    filteredTransactions.forEach(transaction => {
        if (transaction.type === 'expense') {
            if (!expensesByCategory[transaction.category]) {
                expensesByCategory[transaction.category] = 0;
            }
            expensesByCategory[transaction.category] += transaction.amount;
        }
    });
    
    const categoryData = categories
        .filter(category => expensesByCategory[category.id])
        .map(category => ({
            name: category.name,
            amount: expensesByCategory[category.id],
            color: category.color
        }));
    
    const ctx = document.getElementById('expensesChart').getContext('2d');
    
    if (expensesChart) {
        expensesChart.destroy();
    }
    
    expensesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categoryData.map(item => item.name),
            datasets: [{
                data: categoryData.map(item => item.amount),
                backgroundColor: categoryData.map(item => item.color),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value.toFixed(2)} ₽ (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Сохранение в локальное хранилище
function saveToStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function saveCategoriesToStorage() {
    localStorage.setItem('categories', JSON.stringify(categories));
}

// Загрузка из локального хранилища
function loadFromStorage() {
    const savedTransactions = localStorage.getItem('transactions');
    const savedCategories = localStorage.getItem('categories');
    
    if (savedCategories) {
        categories = JSON.parse(savedCategories);
    }
    
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
        updateBalance();
        renderTransactions();
        updateChart();
    }
    
    updateCategorySelect();
}

// Инициализация приложения
function init() {
    loadFromStorage();
    initMonthSelector();
    updateCategorySelect();
    
    // Настройка темы Telegram
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

// Запуск приложения
init();

// Делаем функции доступными глобально
window.openEditTransactionModal = openEditTransactionModal;
window.deleteTransaction = deleteTransaction; 