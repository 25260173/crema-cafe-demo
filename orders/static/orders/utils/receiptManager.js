// receipt-manager.js - исправленный файл

class ToppingManager {
    constructor() {
        this.toppings = null;
    }

    async loadToppings() {
        try {
            const response = await fetch('../../static/orders/data/topings.json');
            if (!response.ok) {
                throw new Error(`Failed to load toppings: ${response.status}`);
            }
            this.toppings = await response.json();
            console.log('Toppings loaded successfully');
            return this.toppings;
        } catch (error) {
            console.error('Error loading toppings from file:', error);
            this.toppings = {
                toppings: [],
                alternative_milk: [],
                syrups_for_coffee: [],
                syrups_for_cold_drinks: []
            };
            return this.toppings;
        }
    }

    getToppingsByCategory(category) {
        if (!this.toppings) {
            console.warn('Toppings not loaded yet');
            return [];
        }
        return this.toppings[category] || [];
    }

    getToppingsForDrinkType(drinkCategory) {
        if (!this.toppings) return [];
        
        const toppings = [...this.getToppingsByCategory('toppings')];
        
        if (drinkCategory === 'hot_drinks') {
            toppings.push(...this.getToppingsByCategory('syrups_for_coffee'));
        } else if (drinkCategory === 'cold_drinks') {
            toppings.push(...this.getToppingsByCategory('syrups_for_cold_drinks'));
        }
        
        toppings.push(...this.getToppingsByCategory('alternative_milk'));
        
        return toppings;
    }
}

class OrderManager {
    constructor() {
        this.menuData = [];
        this.cartKey = 'crema_cafe_cart';
        this.toppingManager = new ToppingManager();
        this.currentDrinkDetails = {};
    }

    async loadMenuData() {
        try {
            const [menuResponse] = await Promise.allSettled([
                fetch('../../static/orders/data/menu.json'),
                this.toppingManager.loadToppings()
            ]);
            
            if (menuResponse.status === 'fulfilled') {
                this.menuData = await menuResponse.value.json();
            } else {
                console.error('Ошибка загрузки меню:', menuResponse.reason);
                this.menuData = [];
            }
            
            this.loadDrinkDetails();
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.menuData = [];
        }
    }

    loadDrinkDetails() {
        try {
            const savedData = localStorage.getItem('crema_cafe_drink_details');
            if (savedData) {
                this.currentDrinkDetails = JSON.parse(savedData);
            }
        } catch (error) {
            console.error('Ошибка загрузки деталей напитков:', error);
            this.currentDrinkDetails = {};
        }
    }

    saveDrinkDetails() {
        try {
            localStorage.setItem('crema_cafe_drink_details', JSON.stringify(this.currentDrinkDetails));
        } catch (error) {
            console.error('Ошибка сохранения деталей напитков:', error);
        }
    }

    getCartData() {
        try {
            const cartData = localStorage.getItem(this.cartKey);
            return cartData ? JSON.parse(cartData) : [];
        } catch (error) {
            console.error('Ошибка чтения корзины:', error);
            return [];
        }
    }

    findProductById(productId) {
        if (!this.menuData || this.menuData.length === 0) {
            console.warn('Данные меню не загружены');
            return null;
        }

        const product = this.menuData.find(item => item.id === parseInt(productId));
        return product || null;
    }

    async getOrderDetails() {
        if (this.menuData.length === 0) {
            await this.loadMenuData();
        }

        const cartItems = this.getCartData();
        const orderDetails = [];

        for (const cartItem of cartItems) {
            const productInfo = this.findProductById(cartItem.productId);
            
            if (productInfo) {
                const cartItemId = cartItem.id;
                const drinkDetails = this.currentDrinkDetails[cartItemId] || {};
                const selectedToppings = drinkDetails.selectedToppings || [];
                
                let basePrice = productInfo.price1 || 0;
                
                if (drinkDetails.volume && productInfo[drinkDetails.volume.replace('volume', 'price')]) {
                    basePrice = parseInt(productInfo[drinkDetails.volume.replace('volume', 'price')]) || basePrice;
                }
                
                const toppingsPrice = selectedToppings.reduce((sum, topping) => sum + (topping.price || 0), 0);
                const totalPrice = basePrice + toppingsPrice;

                orderDetails.push({
                    cartItemId: cartItemId,
                    productId: cartItem.productId,
                    productName: productInfo.name || 'Неизвестный продукт',
                    price: totalPrice,
                    basePrice: basePrice,
                    drinkDetails: drinkDetails,
                    selectedToppings: selectedToppings,
                    category: productInfo.category,
                    volume1: productInfo.volume1,
                    volume2: productInfo.volume2,
                    volume3: productInfo.volume3,
                    price1: productInfo.price1,
                    price2: productInfo.price2,
                    price3: productInfo.price3,
                    ...productInfo
                });
            } else {
                console.warn(`Продукт с ID ${cartItem.productId} не найден в меню`);
                orderDetails.push({
                    cartItemId: cartItem.id,
                    productId: cartItem.productId,
                    productName: 'Продукт не найден',
                    price: 0,
                    basePrice: 0,
                    selectedToppings: []
                });
            }
        }

        return orderDetails;
    }

    getToppingsForCategory(category) {
        return this.toppingManager.getToppingsForDrinkType(category);
    }
}

class ReceiptManager {
    constructor() {
        this.orderManager = new OrderManager();
        this.receiptNumber = this.generateReceiptNumber();
        this.orderDate = new Date();
        this.binNumber = "123456789012";
        this.cashierName = "Иванов И.И.";
        this.companyInfo = {
            name: "TOO \"CREMA CAFE\"",
            address: "г. Алматы, ул. Абая 1",
            phone: "+7 (777) 123-45-67",
            email: "info@cremacafe.kz"
        };
    }

    generateReceiptNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${year}${month}${day}-${random}`;
    }

    formatDate(date) {
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('ru-RU', options);
    }

    async generateReceiptHTML(orderDetails) {
        if (orderDetails.length === 0) {
            return `
                <div class="empty-cart">
                    <i class="bi bi-cart-x" style="font-size: 3em;"></i>
                    <h4>Корзина пуста</h4>
                    <p>Добавьте товары в корзину для формирования чека</p>
                </div>
            `;
        }

        const customerName = document.getElementById('customerName')?.value || '';
        const customerPhone = document.getElementById('customerPhone')?.value || '';
        const customerEmail = document.getElementById('customerEmail')?.value || '';
        const comment = document.getElementById('orderComment')?.value || '';
        const orderType = document.getElementById('orderType')?.value || 'here';
        const paymentMethod = document.getElementById('paymentMethod')?.value || 'card';

        const orderTypeText = {
            'here': 'В зале',
            'takeaway': 'На вынос'
        }[orderType];

        const paymentMethodText = {
            'card': 'Банковская карта',
            'qr': 'Kaspi QR'
        }[paymentMethod];

        let html = `
            <div class="receipt-header">
                <div class="company-name">${this.companyInfo.name}</div>
                <div class="company-info">${this.companyInfo.address}</div>
                <div class="company-info">Тел: ${this.companyInfo.phone}</div>
                <div class="company-info">БИН: ${this.binNumber}</div>
            </div>
            
            <div class="receipt-title">КАССОВЫЙ ЧЕК</div>
            
            <div class="receipt-date">
                Чек №: ${this.receiptNumber}<br>
                ${this.formatDate(this.orderDate)}<br>
                Кассир: ${this.cashierName}
            </div>
            
            <div class="receipt-divider"></div>
            
            <div class="receipt-items">
        `;

        let calculatedTotal = 0;

        orderDetails.forEach((item, index) => {
            const drinkDetails = item.drinkDetails || {};
            const selectedToppings = item.selectedToppings || [];
            
            let basePrice = item.basePrice || 0;
            const toppingsPrice = selectedToppings.reduce((sum, topping) => sum + (topping.price || 0), 0);
            const itemTotal = basePrice + toppingsPrice;
            calculatedTotal += itemTotal;
            
            html += `
                <div class="receipt-item">
                    <div class="item-name">
                        ${index + 1}. ${item.productName}
                    </div>
                    <div class="item-price">
                        ${itemTotal} ₸
                    </div>
                </div>
            `;

            if (drinkDetails.volume) {
                let volumeDisplay = '';
                let volumePrice = 0;
                
                if (drinkDetails.volume === 'volume1' && item.volume1) {
                    volumeDisplay = item.volume1;
                    volumePrice = item.price1;
                } else if (drinkDetails.volume === 'volume2' && item.volume2) {
                    volumeDisplay = item.volume2;
                    volumePrice = item.price2;
                } else if (drinkDetails.volume === 'volume3' && item.volume3) {
                    volumeDisplay = item.volume3;
                    volumePrice = item.price3;
                }
                
                if (volumeDisplay) {
                    html += `<div class="volume-info">• Объем: ${volumeDisplay} л (${volumePrice} ₸)</div>`;
                }
            }

            if (selectedToppings.length > 0) {
                selectedToppings.forEach(topping => {
                    html += `<div class="topping-item">• ${topping.name} (+${topping.price} ₸)</div>`;
                });
            }
        });

        html += `
            </div>
            
            <div class="receipt-divider"></div>
            
            <div class="receipt-total">
                <span>ИТОГ:</span>
                <span>${calculatedTotal} ₸</span>
            </div>
            
            <div class="receipt-info">
        `;

        if (customerName) {
            html += `
                <div class="receipt-item">
                    <span>Клиент:</span>
                    <span>${customerName}</span>
                </div>
            `;
        }

        if (customerPhone) {
            html += `
                <div class="receipt-item">
                    <span>Телефон:</span>
                    <span>${customerPhone}</span>
                </div>
            `;
        }

        if (customerEmail) {
            html += `
                <div class="receipt-item">
                    <span>Email:</span>
                    <span>${customerEmail}</span>
                </div>
            `;
        }

        html += `
                <div class="receipt-item">
                    <span>Тип заказа:</span>
                    <span>${orderTypeText}</span>
                </div>
                <div class="receipt-item">
                    <span>Оплата:</span>
                    <span>${paymentMethodText}</span>
                </div>
            </div>
        `;

        if (comment) {
            html += `
                <div class="receipt-divider"></div>
                <div class="receipt-comment">
                    <strong>Комментарий:</strong><br>
                    <small>${comment.replace(/\n/g, '<br>')}</small>
                </div>
            `;
        }

        html += `
            <div class="receipt-qr">
                <div class="receipt-qr-placeholder">
                    QR-код<br>для проверки
                </div>
            </div>
            
            <div class="receipt-footer">
                Спасибо за покупку!<br>
                ${this.companyInfo.email}<br>
                ${new Date().getFullYear()}
            </div>
        `;

        return html;
    }

    async displayReceipt() {
        const container = document.getElementById('receipt-content');
        if (!container) return;

        const orderDetails = await this.orderManager.getOrderDetails();
        container.innerHTML = await this.generateReceiptHTML(orderDetails);
    }

    createVolumeDropdown(cartItemId, item, currentVolume) {
        let options = '';
        
        for (let i = 1; i <= 3; i++) {
            const volume = item[`volume${i}`];
            const price = item[`price${i}`];
            if (volume && price) {
                const volumeKey = `volume${i}`;
                const selected = currentVolume === volumeKey ? 'selected' : '';
                options += `<option value="${volumeKey}" ${selected}>${volume} л - ${price} ₸</option>`;
            }
        }
        
        return `
            <select class="form-select volume-select" data-cart-item-id="${cartItemId}">
                <option value="">Выберите объем</option>
                ${options}
            </select>
        `;
    }

    createToppingDropdown(cartItemId, toppings, category) {
        const toppingOptions = toppings.map(topping => 
            `<option value="${topping.id}" data-price="${topping.price}">${topping.name} (+${topping.price} ₸)</option>`
        ).join('');
        
        return `
            <div class="topping-dropdown-container mb-2">
                <select class="form-select topping-select" data-cart-item-id="${cartItemId}" data-category="${category}">
                    <option value="">Выберите добавку</option>
                    ${toppingOptions}
                </select>
                <button type="button" class="btn btn-sm btn-outline-primary add-topping-btn mt-2" data-cart-item-id="${cartItemId}">
                    + Добавить топпинг
                </button>
            </div>
        `;
    }

    renderSelectedToppings(selectedToppings, cartItemId) {
        if (selectedToppings.length === 0) {
            return '<div class="text-muted small">Нет добавленных топпингов</div>';
        }
        
        const toppingItems = selectedToppings.map(topping => `
            <div class="selected-topping-item d-flex justify-content-between align-items-center mb-1 p-1 border rounded">
                <span>${topping.name} (+${topping.price} ₸)</span>
                <button type="button" class="btn btn-sm btn-outline-danger remove-topping-btn" 
                        data-cart-item-id="${cartItemId}" 
                        data-topping-id="${topping.id}">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `).join('');
        
        return `
            <div class="selected-toppings-container mt-2">
                <small class="text-muted d-block mb-1">Добавленные топпинги:</small>
                ${toppingItems}
            </div>
        `;
    }

    async updateDrinkDetailsUI() {
        const container = document.getElementById('drink-details-container');
        if (!container) {
            console.error('Контейнер drink-details-container не найден!');
            return;
        }

        const orderDetails = await this.orderManager.getOrderDetails();
        
        if (orderDetails.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <small><i class="bi bi-info-circle"></i> Добавьте напитки в корзину для настройки деталей</small>
                </div>
            `;
            return;
        }

        let html = '';
        
        orderDetails.forEach((item, index) => {
            const cartItemId = item.cartItemId;
            const currentDetails = this.orderManager.currentDrinkDetails[cartItemId] || {
                volume: null,
                selectedToppings: []
            };

            // Получаем доступные топпинги для этой категории напитка
            const availableToppings = this.orderManager.getToppingsForCategory(item.category);
            
            html += `
                <div class="drink-details mb-4 p-3 border rounded">
                    <h6 class="mb-3">${index + 1}. ${item.productName}</h6>
                    
                    <div class="mb-3">
                        <label class="form-label">Объем</label>
                        ${this.createVolumeDropdown(cartItemId, item, currentDetails.volume)}
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Добавки и сиропы</label>
                        ${this.createToppingDropdown(cartItemId, availableToppings, item.category)}
                        ${this.renderSelectedToppings(currentDetails.selectedToppings || [], cartItemId)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Добавляем обработчики для выбора объема
        container.querySelectorAll('.volume-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const cartItemId = e.target.dataset.cartItemId;
                const volumeKey = e.target.value;
                
                if (!this.orderManager.currentDrinkDetails[cartItemId]) {
                    this.orderManager.currentDrinkDetails[cartItemId] = {
                        volume: null,
                        selectedToppings: []
                    };
                }
                
                this.orderManager.currentDrinkDetails[cartItemId].volume = volumeKey;
                this.orderManager.saveDrinkDetails();
                await this.displayReceipt();
            });
        });

        // Добавляем обработчики для кнопок добавления топпингов
        container.querySelectorAll('.add-topping-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const cartItemId = e.target.dataset.cartItemId;
                const select = button.previousElementSibling;
                const selectedValue = select.value;
                const selectedOption = select.options[select.selectedIndex];
                
                if (!selectedValue) {
                    alert('Пожалуйста, выберите топпинг из списка');
                    return;
                }
                
                const toppingId = parseInt(selectedValue);
                const toppingName = selectedOption.textContent.split(' (')[0];
                const toppingPrice = parseInt(selectedOption.dataset.price);
                
                if (!this.orderManager.currentDrinkDetails[cartItemId]) {
                    this.orderManager.currentDrinkDetails[cartItemId] = {
                        volume: null,
                        selectedToppings: []
                    };
                }
                
                // Проверяем, не добавлен ли уже этот топпинг
                const isAlreadyAdded = this.orderManager.currentDrinkDetails[cartItemId]
                    .selectedToppings.some(t => t.id === toppingId);
                
                if (isAlreadyAdded) {
                    alert('Этот топпинг уже добавлен');
                    return;
                }
                
                // Добавляем новый топпинг
                this.orderManager.currentDrinkDetails[cartItemId].selectedToppings.push({
                    id: toppingId,
                    name: toppingName,
                    price: toppingPrice
                });
                
                this.orderManager.saveDrinkDetails();
                
                // Обновляем UI и чек
                await this.updateDrinkDetailsUI();
                await this.displayReceipt();
                
                // Сбрасываем выпадающий список
                select.value = '';
            });
        });

        // Добавляем обработчики для кнопок удаления топпингов
        container.querySelectorAll('.remove-topping-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const cartItemId = e.target.closest('.remove-topping-btn').dataset.cartItemId;
                const toppingId = parseInt(e.target.closest('.remove-topping-btn').dataset.toppingId);
                
                if (this.orderManager.currentDrinkDetails[cartItemId]) {
                    this.orderManager.currentDrinkDetails[cartItemId].selectedToppings = 
                        this.orderManager.currentDrinkDetails[cartItemId]
                        .selectedToppings.filter(t => t.id !== toppingId);
                    
                    this.orderManager.saveDrinkDetails();
                    await this.updateDrinkDetailsUI();
                    await this.displayReceipt();
                }
            });
        });
    }

    async downloadAsPDF() {
        const { jsPDF } = window.jspdf;
        const receiptElement = document.getElementById('receipt-content');
        
        if (!receiptElement) return;

        const canvas = await html2canvas(receiptElement, {
            scale: 2,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 15, 15, imgWidth, imgHeight);
        pdf.save(`чек-${this.receiptNumber}.pdf`);
        
        Toastify({
            text: "Чек скачан в формате PDF",
            duration: 3000,
            gravity: "bottom",
            position: "right",
            backgroundColor: "#28a745"
        }).showToast();
    }

    printReceipt() {
        window.print();
    }

    clearCart() {
        if (confirm('Вы уверены, что хотите очистить корзину?')) {
            this.orderManager.currentDrinkDetails = {};
            this.orderManager.saveDrinkDetails();
            localStorage.removeItem(this.orderManager.cartKey);
            
            this.receiptNumber = this.generateReceiptNumber();
            this.orderDate = new Date();
            this.displayReceipt();
            this.updateDrinkDetailsUI();
            
            Toastify({
                text: "Корзина очищена",
                duration: 3000,
                gravity: "bottom",
                position: "right",
                backgroundColor: "#dc3545"
            }).showToast();
        }
    }

    saveSettings() {
        const customerData = {
            name: document.getElementById('customerName')?.value || '',
            phone: document.getElementById('customerPhone')?.value || '',
            email: document.getElementById('customerEmail')?.value || '',
            comment: document.getElementById('orderComment')?.value || '',
            orderType: document.getElementById('orderType')?.value || 'here',
            paymentMethod: document.getElementById('paymentMethod')?.value || 'card'
        };

        localStorage.setItem('crema_cafe_customer_data', JSON.stringify(customerData));
        
        this.displayReceipt();
        
        Toastify({
            text: "Настройки сохранены",
            duration: 2000,
            gravity: "bottom",
            position: "right",
            backgroundColor: "#17a2b8"
        }).showToast();
    }

    loadSavedSettings() {
        const savedData = localStorage.getItem('crema_cafe_customer_data');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                
                if (document.getElementById('customerName')) 
                    document.getElementById('customerName').value = data.name || '';
                if (document.getElementById('customerPhone')) 
                    document.getElementById('customerPhone').value = data.phone || '';
                if (document.getElementById('customerEmail')) 
                    document.getElementById('customerEmail').value = data.email || '';
                if (document.getElementById('orderComment')) 
                    document.getElementById('orderComment').value = data.comment || '';
                if (document.getElementById('orderType')) 
                    document.getElementById('orderType').value = data.orderType || 'here';
                if (document.getElementById('paymentMethod')) 
                    document.getElementById('paymentMethod').value = data.paymentMethod || 'card';
            } catch (error) {
                console.error('Ошибка загрузки настроек:', error);
            }
        }
    }

    makeOrder() {
        alert('Функция оформления заказа пока недоступна.');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    const receiptManager = new ReceiptManager();
    
    window.receiptManager = receiptManager;
    
    // Загружаем сохраненные настройки
    receiptManager.loadSavedSettings();
    
    // Инициализируем менеджер заказов и отображаем чек
    await receiptManager.orderManager.loadMenuData();
    await receiptManager.displayReceipt();
    await receiptManager.updateDrinkDetailsUI();
    
    // Назначаем обработчики событий
    document.getElementById('downloadPdf').addEventListener('click', () => {
        receiptManager.downloadAsPDF();
    });
    
    // document.getElementById('printReceipt').addEventListener('click', () => {
    //     receiptManager.printReceipt();
    // });
    
    document.getElementById('clearCart').addEventListener('click', () => {
        receiptManager.clearCart();
    });
    
    // document.getElementById('saveSettings').addEventListener('click', () => {
    //     receiptManager.saveSettings();
    // });
    
    // Обновляем чек при изменении корзины
    window.addEventListener('storage', async function(e) {
        if (e.key === receiptManager.orderManager.cartKey) {
            await receiptManager.displayReceipt();
            await receiptManager.updateDrinkDetailsUI();
        }
    });
    
    // Обновляем чек при изменении полей
    const updateFields = [
        'customerName',
        'customerPhone',
        'customerEmail',
        'orderComment',
        'orderType',
        'paymentMethod'
    ];
    
    updateFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('input', async () => {
                await receiptManager.displayReceipt();
            });
            element.addEventListener('change', async () => {
                await receiptManager.displayReceipt();
            });
        }
    });
});