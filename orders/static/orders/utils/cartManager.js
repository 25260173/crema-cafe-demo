// Функции для работы с корзиной
class CartManager {
    constructor() {
        this.cartKey = 'crema_cafe_cart';
        this.menuData = null; // Будем хранить данные меню
        this.init();
    }

    async init() {
        await this.loadMenuData();
        this.loadCart();
        this.renderCart();
    }

    // Загрузка данных меню
    async loadMenuData() {
        try {
            const response = await fetch('../../static/orders/data/menu.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.menuData = await response.json();
        } catch (error) {
            console.error('Ошибка загрузки меню:', error);
            this.menuData = [];
        }
    }

    // Загрузка корзины из Local Storage
    loadCart() {
        const cartData = localStorage.getItem(this.cartKey);
        this.cart = cartData ? JSON.parse(cartData) : [];
    }

    // Сохранение корзины в Local Storage
    saveCart() {
        localStorage.setItem(this.cartKey, JSON.stringify(this.cart));
    }

    // Добавление товара в корзину (только ID)
    addToCart(productId) {
        const cartItem = {
            id: Date.now(), // Уникальный ID для позиции в корзине
            productId: productId // ID товара из меню
        };

        this.cart.push(cartItem);
        this.saveCart();
        this.renderCart();
        
        // Показываем название товара в уведомлении
        const product = this.findProductById(productId);
        if (product) {
            this.showAddToCartToast(`${product.name} добавлен в корзину`);
        } else {
            this.showAddToCartToast('Товар добавлен в корзину');
        }
    }

    // Поиск товара по ID в данных меню
    findProductById(productId) {
        if (!this.menuData) return null;
        return this.menuData.find(item => item.id === productId);
    }

    // Удаление товара из корзины
    removeFromCart(itemId) {
        const product = this.findProductById(itemId);
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.saveCart();
        this.renderCart();
        // Показываем название товара в уведомлении
        if (product) {
            this.showDeleteFromCartToast(`${product.name} убран из корзины`);
        } else {
            this.showDeleteFromCartToast('Товар убран из корзины');
        }
    }

    // Отрисовка корзины
    renderCart() {
        const cartItems = document.getElementById('cart-items');
        const cartCount = document.getElementById('cart-count');
        const cartFooter = document.getElementById('cart-footer');
        const emptyCartMessage = document.getElementById('empty-cart-message');
        const totalPrice = document.getElementById('total-price');

        if (this.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="text-muted text-center py-3" id="empty-cart-message">
                    Корзина пуста
                </div>
            `;
            cartCount.textContent = '0';
            cartFooter.classList.add('d-none');
            return;
        }

        // Отображаем товары с названиями из меню
        cartItems.innerHTML = this.cart.map(item => {
            const product = this.findProductById(item.productId);
            const productName = product ? product.name : `Товар #${item.productId}`;
            
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${productName}</div>
                        <div class="cart-item-details">
                            Объем и допы будут выбраны при оформлении
                        </div>
                    </div>
                    <div class="cart-item-actions">
                        <button class="remove-btn" onclick="cartManager.removeFromCart(${item.id})" title="Удалить">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Обновляем счетчик
        const totalCount = this.cart.length;

        cartCount.textContent = totalCount;
        totalPrice.textContent = `${totalCount} позиций`;
        cartFooter.classList.remove('d-none');
    }

    // Очистка корзины
    clearCart() {
        this.cart = [];
        this.saveCart();
        this.renderCart();
    }

    // Получение данных корзины (массив ID товаров)
    getCartData() {
        return this.cart.map(item => item.productId);
    }

    // Получение полных данных корзины с информацией о товарах
    getFullCartData() {
        return this.cart.map(item => {
            const product = this.findProductById(item.productId);
            return {
                ...item,
                productInfo: product
            };
        });
    }

    // Показ уведомления
    showAddToCartToast(message) {
        if (window.Toastify) {
            Toastify({
                text: message,
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "#28a745",
            }).showToast();
        }
    }

    showDeleteFromCartToast(message) {
        if (window.Toastify) {
            Toastify({
                text: message,
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "#c57320ff",
            }).showToast();
        }
    }
}

// Инициализация корзины
const cartManager = new CartManager();