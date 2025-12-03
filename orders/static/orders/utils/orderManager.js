/**
 * Создает новый заказ и сохраняет его в orders.json и историю заказов
 * @param {Object} customerData - Данные клиента
 * @param {string} customerData.name - Имя клиента
 * @param {string} customerData.phone - Телефон клиента
 * @param {string} customerData.email - Email клиента
 * @param {string} customerData.comment - Комментарий к заказу
 * @param {string} customerData.orderType - Тип заказа (here/takeaway)
 * @param {string} customerData.paymentMethod - Способ оплаты (card/qr)
 * @returns {Promise<Object>} Результат операции
 */
async function makeOrder(customerData = {}) {
    try {
        // Получаем данные корзины
        const cartKey = 'crema_cafe_cart';
        const drinkDetailsKey = 'crema_cafe_drink_details';
        
        const cartItems = JSON.parse(localStorage.getItem(cartKey) || '[]');
        const drinkDetails = JSON.parse(localStorage.getItem(drinkDetailsKey) || '{}');
        
        if (cartItems.length === 0) {
            throw new Error('Корзина пуста. Добавьте товары перед оформлением заказа.');
        }

        // Получаем менеджер заказов для получения деталей товаров
        const orderManager = new OrderManager();
        await orderManager.loadMenuData();
        const orderDetails = await orderManager.getOrderDetails();

        // Рассчитываем итоговую сумму
        const totalAmount = orderDetails.reduce((sum, item) => sum + item.price, 0);

        // Создаем объект заказа
        const order = {
            id: Date.now(), // Используем timestamp как уникальный ID
            orderNumber: `ORD-${Date.now().toString().slice(-8)}`,
            date: new Date().toISOString(),
            status: 'pending', // pending, processing, completed, cancelled
            customer: {
                name: customerData.name || '',
                phone: customerData.phone || '',
                email: customerData.email || '',
                comment: customerData.comment || ''
            },
            orderType: customerData.orderType || 'here',
            paymentMethod: customerData.paymentMethod || 'card',
            items: orderDetails.map(item => ({
                productId: item.productId,
                productName: item.productName,
                basePrice: item.basePrice,
                totalPrice: item.price,
                volume: item.drinkDetails?.volume || null,
                toppings: item.selectedToppings || []
            })),
            totalAmount: totalAmount,
            receiptNumber: window.receiptManager?.receiptNumber || `RCPT-${Date.now().toString().slice(-6)}`
        };

        // Сохраняем в файл orders.json
        const saveResult = await this.saveOrderToFile(order);
        
        if (!saveResult.success) {
            throw new Error(`Ошибка сохранения в файл: ${saveResult.error}`);
        }

        // Сохраняем в историю заказов в localStorage
        this.saveOrderToHistory(order);

        // Очищаем текущую корзину и детали напитков
        this.clearCurrentOrder();

        // Генерируем новый номер чека
        if (window.receiptManager) {
            window.receiptManager.receiptNumber = window.receiptManager.generateReceiptNumber();
            window.receiptManager.orderDate = new Date();
            
            // Обновляем UI
            await window.receiptManager.displayReceipt();
            await window.receiptManager.updateDrinkDetailsUI();
        }

        // Показываем уведомление об успехе
        Toastify({
            text: "Заказ успешно оформлен!",
            duration: 4000,
            gravity: "bottom",
            position: "right",
            backgroundColor: "#28a745",
            stopOnFocus: true
        }).showToast();

        return {
            success: true,
            order: order,
            message: 'Заказ успешно оформлен'
        };

    } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        
        Toastify({
            text: `Ошибка оформления заказа: ${error.message}`,
            duration: 5000,
            gravity: "bottom",
            position: "right",
            backgroundColor: "#dc3545",
            stopOnFocus: true
        }).showToast();

        return {
            success: false,
            error: error.message,
            message: 'Не удалось оформить заказ'
        };
    }
}

/**
 * Сохраняет заказ в файл orders.json
 * @param {Object} order - Объект заказа
 * @returns {Promise<Object>} Результат сохранения
 */
async function saveOrderToFile(order) {
    try {
        // Отправляем заказ на сервер для сохранения в файл
        const response = await fetch('/api/save-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(order)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return {
            success: true,
            data: result
        };

    } catch (error) {
        console.error('Ошибка сохранения заказа в файл:', error);
        
        // Для демонстрации, если API недоступно, сохраняем в localStorage
        const fallbackOrders = JSON.parse(localStorage.getItem('crema_cafe_fallback_orders') || '[]');
        fallbackOrders.push(order);
        localStorage.setItem('crema_cafe_fallback_orders', JSON.stringify(fallbackOrders));
        
        return {
            success: true,
            fallback: true,
            message: 'Заказ сохранен локально (API недоступно)'
        };
    }
}

/**
 * Сохраняет заказ в историю в localStorage
 * @param {Object} order - Объект заказа
 */
function saveOrderToHistory(order) {
    try {
        const historyKey = 'crema_cafe_order_history';
        let orderHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
        
        // Добавляем новый заказ в начало истории
        orderHistory.unshift({
            ...order,
            archivedDate: new Date().toISOString()
        });
        
        // Ограничиваем историю последними 50 заказами
        if (orderHistory.length > 50) {
            orderHistory = orderHistory.slice(0, 50);
        }
        
        localStorage.setItem(historyKey, JSON.stringify(orderHistory));
        
    } catch (error) {
        console.error('Ошибка сохранения заказа в историю:', error);
    }
}

/**
 * Очищает текущую корзину и детали заказа
 */
function clearCurrentOrder() {
    try {
        // Сохраняем данные перед очисткой (для возможного восстановления)
        const cartKey = 'crema_cafe_cart';
        const drinkDetailsKey = 'crema_cafe_drink_details';
        const customerDataKey = 'crema_cafe_customer_data';
        
        const lastCart = localStorage.getItem(cartKey);
        const lastDrinkDetails = localStorage.getItem(drinkDetailsKey);
        
        // Сохраняем последний заказ для возможного восстановления
        if (lastCart || lastDrinkDetails) {
            localStorage.setItem('crema_cafe_last_order_backup', JSON.stringify({
                cart: JSON.parse(lastCart || '[]'),
                drinkDetails: JSON.parse(lastDrinkDetails || '{}'),
                timestamp: new Date().toISOString()
            }));
        }
        
        // Очищаем текущие данные
        localStorage.removeItem(cartKey);
        localStorage.removeItem(drinkDetailsKey);
        
        // Очищаем данные клиента, кроме предпочтений
        const customerData = JSON.parse(localStorage.getItem(customerDataKey) || '{}');
        // Сохраняем только предпочтения клиента
        localStorage.setItem(customerDataKey, JSON.stringify({
            name: customerData.name || '',
            phone: customerData.phone || '',
            email: customerData.email || ''
        }));
        
    } catch (error) {
        console.error('Ошибка очистки текущего заказа:', error);
    }
}

/**
 * Получает историю заказов из localStorage
 * @returns {Array} Массив заказов
 */
function getOrderHistory() {
    try {
        const historyKey = 'crema_cafe_order_history';
        return JSON.parse(localStorage.getItem(historyKey) || '[]');
    } catch (error) {
        console.error('Ошибка получения истории заказов:', error);
        return [];
    }
}

/**
 * Восстанавливает последний удаленный заказ
 * @returns {boolean} Успешность восстановления
 */
function restoreLastOrder() {
    try {
        const backup = JSON.parse(localStorage.getItem('crema_cafe_last_order_backup') || 'null');
        
        if (!backup) {
            Toastify({
                text: "Нет данных для восстановления",
                duration: 3000,
                gravity: "bottom",
                position: "right",
                backgroundColor: "#ffc107"
            }).showToast();
            return false;
        }
        
        localStorage.setItem('crema_cafe_cart', JSON.stringify(backup.cart));
        localStorage.setItem('crema_cafe_drink_details', JSON.stringify(backup.drinkDetails));
        
        Toastify({
            text: "Последний заказ восстановлен",
            duration: 3000,
            gravity: "bottom",
            position: "right",
            backgroundColor: "#17a2b8"
        }).showToast();
        
        return true;
        
    } catch (error) {
        console.error('Ошибка восстановления заказа:', error);
        return false;
    }
}



document.addEventListener('DOMContentLoaded', async function() {
    document.getElementById('makeOrder').addEventListener('change', () => {
        const savedData = localStorage.getItem('crema_cafe_customer_data');
        makeOrder(savedData ? JSON.parse(savedData) : {});
    }); 
});

// Добавляем функции в глобальную область видимости
window.makeOrder = makeOrder;
window.getOrderHistory = getOrderHistory;
window.restoreLastOrder = restoreLastOrder;

// Пример серверного API endpoint (должен быть реализован на бэкенде):
// app.post('/api/save-order', async (req, res) => {
//     try {
//         const order = req.body;
//         
//         // Читаем существующие заказы
//         const ordersPath = path.join(__dirname, 'data', 'orders.json');
//         let orders = [];
//         
//         if (fs.existsSync(ordersPath)) {
//             const data = await fs.promises.readFile(ordersPath, 'utf8');
//             orders = JSON.parse(data);
//         }
//         
//         // Добавляем новый заказ
//         orders.push(order);
//         
//         // Сохраняем обратно в файл
//         await fs.promises.writeFile(ordersPath, JSON.stringify(orders, null, 2));
//         
//         res.json({ success: true, message: 'Order saved successfully' });
//     } catch (error) {
//         console.error('Error saving order:', error);
//         res.status(500).json({ success: false, error: error.message });
//     }
// });