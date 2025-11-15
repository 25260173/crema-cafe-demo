fetch('../../static/orders/data/menu.json')
    .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    })
    .then(menuData => {
        renderMenuCards(menuData);
    })
    .catch(error => {
        console.error('Ошибка загрузки:', error);
        // Показываем ошибки для всех секций
        ['hot_drinks', 'matcha', 'cold_drinks', 'fresh'].forEach(category => {
            const section = document.getElementById(category + '-section');
            if (section) {
                section.innerHTML = `
                    <div class="container mt-4">
                        <div class="alert alert-warning d-flex align-items-center" role="alert">
                            <i class="bi bi-exclamation-triangle-fill ms-2 me-4 fs-1"></i>
                            <div>
                                <h4 class="alert-heading">Данные временно недоступны</h4>
                                <p class="mb-0">Мы не можем показать меню кофе. Пожалуйста, обновите страницу или зайдите позже.</p>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
    });

function renderMenuCards(menuData) {
    // Группируем элементы по категориям
    const categories = {};
    
    menuData.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push(item);
    });
    
    // Для каждой категории создаем секцию
    Object.keys(categories).forEach(category => {
        const section = document.getElementById(category + '-section');
        if (!section) return;
        
        section.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'container-fluid';
        
        let currentRow;
        
        categories[category].forEach((item, index) => {
            if (index % 3 === 0) {
                currentRow = document.createElement('div');
                currentRow.className = 'row d-flex flex-wrap';
                container.appendChild(currentRow);
            }
            
            const cardCol = document.createElement('div');
            cardCol.className = 'col-md-4 mb-3';
            
            // Создаем карточку (используем ту же логику что и для кофе)
            const card = createCard(item);
            cardCol.appendChild(card);
            currentRow.appendChild(cardCol);
        });
        
        section.appendChild(container);
    });
}

function createCard(item) {
    const card = document.createElement('div');
    card.className = 'card h-100';
    card.setAttribute('data-position-id', item.id);
    
    // Изображение
    const img = document.createElement('img');
    img.src = item.image || '../../static/orders/images/default.jpg';
    img.className = 'card-img-top';
    img.style.height = '200px';
    img.alt = item.name;
    
    // Тело карточки
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body d-flex flex-column';
    
    // Заголовок
    const title = document.createElement('h5');
    title.className = 'card-title';
    title.textContent = item.name;
    
    // Описание
    const description = document.createElement('p');
    description.className = 'card-text fs-6';
    description.textContent = item.description;

    // Пустота для выравнивания
    const flexGrow = document.createElement('div');
    description.className = 'flex-grow-1';
    
    // Контейнер для списка цен (только если есть объемы)
    const priceListContainer = document.createElement('div');
    priceListContainer.className = 'mb-2 mt-auto';
    
    if (item.volume1 && item.price1) {
        const priceRow1 = document.createElement('div');
        priceRow1.className = 'd-flex justify-content-between';
        priceRow1.innerHTML = `<span>${item.volume1}L</span><strong>${item.price1}₸</strong>`;
        priceListContainer.appendChild(priceRow1);
    }
    
    if (item.volume2 && item.price2) {
        const priceRow2 = document.createElement('div');
        priceRow2.className = 'd-flex justify-content-between';
        priceRow2.innerHTML = `<span>${item.volume2}L</span><strong>${item.price2}₸</strong>`;
        priceListContainer.appendChild(priceRow2);
    }
    
    if (item.volume3 && item.price3) {
        const priceRow3 = document.createElement('div');
        priceRow3.className = 'd-flex justify-content-between';
        priceRow3.innerHTML = `<span>${item.volume3}L</span><strong>${item.price3}₸</strong>`;
        priceListContainer.appendChild(priceRow3);
    }
    
    // Если нет объемов, показываем просто цену
    if (!item.volume1 && item.price1) {
        const singlePrice = document.createElement('div');
        singlePrice.className = 'd-flex justify-content-between';
        singlePrice.innerHTML = `<span></span><strong>${item.price1}₸</strong>`;
        priceListContainer.appendChild(singlePrice);
    }
    
    // Кнопка корзины
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'd-flex flex-row justify-content-end mt-auto';
    
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-dark';
    button.innerHTML = '<i class="bi bi-basket"></i> В корзину';
    button.setAttribute('data-id', item.id);
    
    button.addEventListener('click', function() {
        cartManager.addToCart(item.id);
    });
    
    // Собираем карточку
    buttonContainer.appendChild(button);
    
    cardBody.appendChild(title);
    cardBody.appendChild(description);
    cardBody.appendChild(flexGrow);
    cardBody.appendChild(priceListContainer);
    cardBody.appendChild(buttonContainer);
    
    card.appendChild(img);
    card.appendChild(cardBody);
    
    return card;
}
