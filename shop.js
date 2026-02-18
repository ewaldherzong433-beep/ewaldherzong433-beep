// Product class to create shop items
class Product {
    constructor(id, name, price, description, category, images, originalPrice = null, discount = 0, size = []) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.description = description;
        this.category = category;
        // Accept both single string or array of images
        this.images = Array.isArray(images) ? images : [images];
        this.originalPrice = originalPrice || price;
        this.discount = discount;
        this.currentImageIndex = 0;
        this.size = Array.isArray(size) ? size : []; // Handle size array
    }

    formatPrice(price) {
        return 'Rp ' + price.toLocaleString('id-ID')+', - IDR';
    }

    hasDiscount() {
        return this.discount > 0;
    }

    calculateDiscountedPrice() {
        if (this.hasDiscount()) {
            return Math.round(this.originalPrice * (1 - this.discount / 100));
        }
        return this.price;
    }

    hasMultipleImages() {
        return this.images.length > 1;
    }

    hasSizes() {
        // Treat an (empty) size array as valid so the popup layout remains consistent.
        // The popup will render a placeholder when there are no actual sizes.
        return Array.isArray(this.size);
    }

    nextImage() {
        if (this.hasMultipleImages()) {
            this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
        }
        return this.images[this.currentImageIndex];
    }

    previousImage() {
        if (this.hasMultipleImages()) {
            this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
        }
        return this.images[this.currentImageIndex];
    }

    createHTML() {
        const hasDiscount = this.hasDiscount();
        const discountedPrice = this.calculateDiscountedPrice();
        const hasMultipleImages = this.hasMultipleImages();
        const mainImage = this.images[0];

        return `
            <div class="product-card clickable-product" data-id="${this.id}">
                ${hasDiscount ? '<div class="discount-badge">-' + this.discount + '%</div>' : ''}
                <div class="product-image-container">
                    <img src="${mainImage}" alt="${this.name}" class="product-image main-image" loading="lazy">
                    ${hasMultipleImages ? `<img src="${this.images[1]}" alt="${this.name}" class="product-image hover-image" loading="lazy">` : ''}
                </div>
                <h3 class="product-name">${this.name}</h3>                
                <div class="product-price">
                    ${hasDiscount ?
                `<span class="original-price">${this.formatPrice(this.originalPrice)}</span>
                         <span class="discounted-price">${this.formatPrice(discountedPrice)}</span>`
                : this.formatPrice(this.price)
            }
                </div>
            </div>
        `;
    }

    createPopupHTML() {
        const hasDiscount = this.hasDiscount();
        const discountedPrice = this.calculateDiscountedPrice();
        const hasMultipleImages = this.hasMultipleImages();
        const hasSizes = this.hasSizes();

        return `
            <div class="product-popup" data-id="${this.id}">
    <div class="popup-content horizontal-layout">
        <button class="close-popup">&times;</button>
        
        <div class="popup-images">
            <div class="main-image-container">
                <img src="${this.images[0]}" alt="${this.name}" class="main-image" id="main-image-${this.id}">
                
                ${hasMultipleImages ? `
                    <button class="image-nav-btn prev-btn">‹</button>
                    <button class="image-nav-btn next-btn">›</button>
                ` : ''}
            </div>
        </div>
        
        <div class="popup-details">            
            <h2 class="popup-title">${this.name}</h2>
            <div class="category-badge">${this.category}</div>
            
            <div class="popup-price">
                ${hasDiscount ?
                    `<span class="original-price">${this.formatPrice(this.originalPrice)}</span>
                     <span class="discounted-price">${this.formatPrice(discountedPrice)}</span>
                     <span class="discount-percent">-${this.discount}%</span>`
                    : `<span class="current-price">${this.formatPrice(this.price)}</span>`
                }
            </div>
            
            ${hasSizes ? `
            <div class="popup-sizes">
                <h3>Available Sizes</h3>
                <div class="size-options">
                    ${Array.isArray(this.size) && this.size.length > 0
                        ? this.size.map(s => `<span class="size-tag">${s}</span>`).join('')
                        : `<span class="size-tag placeholder hidden">&nbsp;</span>`}
                </div>
            </div>
            ` : ` ` }
            
            <div class="popup-description">
                <p>${this.description}</p>
            </div>
            
            <div class="popup-actions">
                <a href="https://wa.me/6287864853508?text=Hi, I want to order: ${encodeURIComponent(this.name)} (ID: ${this.id}) - Price: ${this.formatPrice(this.calculateDiscountedPrice())}" 
                   target="_blank" 
                   class="whatsapp-order-btn">
                    <i class="fa-brands fa-whatsapp"></i> Order via WhatsApp
                </a>
            </div>
        </div>
    </div>
</div>
        `;
    }
}

// Main application with pagination
class ShopApp {
    constructor() {
        this.products = [];
        this.container = document.getElementById('shop-container');
        this.filterContainer = document.getElementById('category-filter-container');
        this.pageTitle = document.getElementById('page-title');
        this.popupContainer = document.getElementById('popup-container');
        this.paginationContainer = document.getElementById('pagination-container');

        // Pagination properties
        this.currentPage = 1;
        this.productsPerPage = 24;
        this.totalPages = 1;

        // Create popup container if it doesn't exist
        if (!this.popupContainer) {
            this.popupContainer = document.createElement('div');
            this.popupContainer.id = 'popup-container';
            document.body.appendChild(this.popupContainer);
        }

        // Define fixed categories in exact order
        this.fixedCategories = [
            'Women casualwear',
            'Women Sportwear',
            'Men Sportswear',
            'Caps & Hats',
            'Accessories'
        ];

        // Check URL parameters for category and page
        const urlParams = new URLSearchParams(window.location.search);
        this.currentCategory = urlParams.get('category') || this.fixedCategories[0];
        this.currentPage = parseInt(urlParams.get('page')) || 1;

        this.init();
    }

    async loadProducts() {
        try {
            const response = await fetch('products.json');
            if (!response.ok) throw new Error('Failed to load products');

            const data = await response.json();
            this.products = data.map(item => {
                // Filter out products with categories not in fixed list
                if (!this.fixedCategories.includes(item.category)) {
                    console.warn(`Product ${item.name} has invalid category: ${item.category}. Skipping.`);
                    return null;
                }

                // Handle both old format (single image) and new format (multiple images)
                const images = item.images || [item.image];
                
                // Handle size array - ensure it's always an array
                const sizes = item.size || [];

                return new Product(
                    item.id,
                    item.name,
                    item.discount > 0 ? Math.round(item.price * (1 - item.discount / 100)) : item.price,
                    item.description,
                    item.category,
                    images,
                    item.price,
                    item.discount || 0,
                    sizes // Pass size array
                );
            }).filter(product => product !== null);

            // Verify all products have valid categories
            const invalidCategories = this.products
                .filter(p => !this.fixedCategories.includes(p.category))
                .map(p => p.category);

            if (invalidCategories.length > 0) {
                console.warn('Some products have invalid categories:', invalidCategories);
            }

            // Use fixed categories as the source of truth
            this.categories = [...this.fixedCategories];

            // Check if current category is valid
            if (!this.categories.includes(this.currentCategory)) {
                this.currentCategory = this.categories[0];
            }

            return true;
        } catch (error) {
            console.error('Error loading products:', error);
            this.container.innerHTML = `<p style="color: red; text-align: center;">Error loading products: ${error.message}</p>`;
            return false;
        }
    }

    updateURL() {
        const url = new URL(window.location);
        if (this.currentCategory) {
            url.searchParams.set('category', this.currentCategory);
        }
        if (this.currentPage > 1) {
            url.searchParams.set('page', this.currentPage);
        } else {
            url.searchParams.delete('page');
        }
        window.history.pushState({}, '', url);
    }

    updatePageTitle() {
        if (this.pageTitle && this.currentCategory) {
            this.pageTitle.textContent = this.currentCategory;
        }
    }

    updateNavigationLinks() {
        const prevBtn = document.getElementById('prev-category');
        const nextBtn = document.getElementById('next-category');

        if (prevBtn) {
            if (this.currentCategory === 'Man Casual') {
                prevBtn.textContent = 'Home';
                prevBtn.href = 'index.html';
            } else {
                prevBtn.textContent = 'Back';
                prevBtn.href = '#';
            }
        }

        if (nextBtn) {
            if (this.currentCategory === 'Woman Accessories') {
                nextBtn.textContent = 'Home';
                nextBtn.href = 'index.html';
            } else {
                nextBtn.textContent = 'Next Collection';
                nextBtn.href = '#';
            }
        }
    }

    goToPreviousCategory() {
        if (this.categories.length <= 1) return;

        const currentIndex = this.categories.indexOf(this.currentCategory);
        let prevIndex = currentIndex - 1;

        if (currentIndex === 0) {
            window.location.href = 'index.html';
            return;
        }

        this.currentCategory = this.categories[prevIndex];
        this.currentPage = 1;
        this.updateCategoryNavigation();
    }

    goToNextCategory() {
        if (this.categories.length <= 1) return;

        const currentIndex = this.categories.indexOf(this.currentCategory);
        let nextIndex = currentIndex + 1;

        if (currentIndex === this.categories.length - 1) {
            window.location.href = 'index.html';
            return;
        }

        this.currentCategory = this.categories[nextIndex];
        this.currentPage = 1;
        this.updateCategoryNavigation();
    }

    updateCategoryNavigation() {
        if (document.getElementById('category-select')) {
            document.getElementById('category-select').value = this.currentCategory;
        }

        this.updateURL();
        this.updateNavigationLinks();
        this.displayProducts();
        this.updatePageTitle();
    }

    setupNavigationListeners() {
        const prevBtn = document.getElementById('prev-category');
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToPreviousCategory();
            });
        }

        const nextBtn = document.getElementById('next-category');
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToNextCategory();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.goToPreviousCategory();
            }
            else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.goToNextCategory();
            }
        });
    }

    displayProducts() {
        const filteredProducts = this.products.filter(product => product.category === this.currentCategory);

        if (filteredProducts.length === 0) {
            this.container.innerHTML = `
            <div class="no-products">
                <p>No products available in the "${this.currentCategory}" category</p>
                <p class="category-hint">Select another category from the dropdown above</p>
            </div>
        `;
            if (this.paginationContainer) {
                this.paginationContainer.innerHTML = '';
            }
            return;
        }

        this.totalPages = Math.ceil(filteredProducts.length / this.productsPerPage);

        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
        }
        if (this.currentPage < 1) {
            this.currentPage = 1;
        }

        const startIndex = (this.currentPage - 1) * this.productsPerPage;
        const endIndex = startIndex + this.productsPerPage;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

        this.container.innerHTML = paginatedProducts
            .map(product => product.createHTML())
            .join('');

        this.addPaginationControls(filteredProducts.length);
        this.addEventListeners();
        this.addImageHoverEffects();
    }

    addPaginationControls(totalProducts) {
        const startProduct = ((this.currentPage - 1) * this.productsPerPage) + 1;
        const endProduct = Math.min(this.currentPage * this.productsPerPage, totalProducts);

        const paginationHTML = `
        <div class="pagination-wrapper">
            <div class="pagination-info">
                Showing ${startProduct} - ${endProduct} of ${totalProducts} products
            </div>
            
            <div class="pagination-controls">
                <button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                        id="prev-page" ${this.currentPage === 1 ? 'disabled' : ''}>
                    ← Previous
                </button>
                
                <div class="page-numbers">
                    ${this.generatePageNumbers()}
                </div>
                
                <button class="pagination-btn ${this.currentPage === this.totalPages ? 'disabled' : ''}" 
                        id="next-page" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                    Next →
                </button>
            </div>
        </div>
    `;

        if (this.paginationContainer) {
            this.paginationContainer.innerHTML = paginationHTML;
        } else {
            this.container.insertAdjacentHTML('beforeend', paginationHTML);
        }

        this.addPaginationEventListeners();
    }

    generatePageNumbers() {
        let pagesHTML = '';
        const maxVisiblePages = 5;

        if (this.totalPages <= maxVisiblePages) {
            for (let i = 1; i <= this.totalPages; i++) {
                pagesHTML += `
                    <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                            data-page="${i}">${i}</button>
                `;
            }
        } else {
            if (this.currentPage <= 3) {
                for (let i = 1; i <= 4; i++) {
                    pagesHTML += `
                        <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                                data-page="${i}">${i}</button>
                    `;
                }
                pagesHTML += `<span class="ellipsis">...</span>`;
                pagesHTML += `
                    <button class="page-number" data-page="${this.totalPages}">${this.totalPages}</button>
                `;
            } else if (this.currentPage >= this.totalPages - 2) {
                pagesHTML += `
                    <button class="page-number" data-page="1">1</button>
                    <span class="ellipsis">...</span>
                `;
                for (let i = this.totalPages - 3; i <= this.totalPages; i++) {
                    pagesHTML += `
                        <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                                data-page="${i}">${i}</button>
                    `;
                }
            } else {
                pagesHTML += `
                    <button class="page-number" data-page="1">1</button>
                    <span class="ellipsis">...</span>
                    <button class="page-number" data-page="${this.currentPage - 1}">${this.currentPage - 1}</button>
                    <button class="page-number active" data-page="${this.currentPage}">${this.currentPage}</button>
                    <button class="page-number" data-page="${this.currentPage + 1}">${this.currentPage + 1}</button>
                    <span class="ellipsis">...</span>
                    <button class="page-number" data-page="${this.totalPages}">${this.totalPages}</button>
                `;
            }
        }

        return pagesHTML;
    }

    addPaginationEventListeners() {
        const prevBtn = document.getElementById('prev-page');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.updateURL();
                    this.displayProducts();
                    this.scrollToTop();
                }
            });
        }

        const nextBtn = document.getElementById('next-page');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.updateURL();
                    this.displayProducts();
                    this.scrollToTop();
                }
            });
        }

        const pageNumbers = document.querySelectorAll('.page-number');
        pageNumbers.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                if (page !== this.currentPage) {
                    this.currentPage = page;
                    this.updateURL();
                    this.displayProducts();
                    this.scrollToTop();
                }
            });
        });
    }

    scrollToTop() {
        window.scrollTo({
            top: this.container.offsetTop - 100,
            behavior: 'smooth'
        });
    }

    addImageHoverEffects() {
        const productCards = this.container.querySelectorAll('.product-card');

        productCards.forEach(card => {
            const hoverImage = card.querySelector('.hover-image');
            if (hoverImage) {
                const mainImage = card.querySelector('.main-image');

                card.addEventListener('mouseenter', () => {
                    mainImage.style.opacity = '0';
                    hoverImage.style.opacity = '1';
                });

                card.addEventListener('mouseleave', () => {
                    mainImage.style.opacity = '1';
                    hoverImage.style.opacity = '0';
                });
            }
        });
    }

    showProductPopup(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        this.closePopup();

        this.popupContainer.innerHTML = product.createPopupHTML();
        const popup = this.popupContainer.querySelector('.product-popup');

        document.body.classList.add('popup-open');

        requestAnimationFrame(() => {
            popup.classList.add('active');
        });

        this.addPopupEventListeners(product);
    }

    closePopup() {
        const popup = this.popupContainer.querySelector('.product-popup');
        if (popup) {
            popup.classList.remove('active');
            document.body.classList.remove('popup-open');

            setTimeout(() => {
                if (popup.classList.contains('active') === false) {
                    this.popupContainer.innerHTML = '';
                }
            }, 300);
        }
    }

    addEventListeners() {
        this.container.addEventListener('click', (e) => {
            const productCard = e.target.closest('.clickable-product');
            if (productCard && !e.target.closest('a, button')) {
                const productId = parseInt(productCard.dataset.id);
                this.showProductPopup(productId);
            }
        });
    }

    addPopupEventListeners(product) {
        const popup = this.popupContainer.querySelector('.product-popup');
        if (!popup) return;

        const closeBtn = popup.querySelector('.close-popup');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closePopup();
            });
        }

        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                this.closePopup();
            }
        });

        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closePopup();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        if (product.hasMultipleImages()) {
            const mainImage = popup.querySelector(`#main-image-${product.id}`);
            const thumbnails = popup.querySelectorAll(`.thumbnail[data-id="${product.id}"]`);
            const prevBtn = popup.querySelector('.prev-btn');
            const nextBtn = popup.querySelector('.next-btn');

            if (thumbnails.length > 0) {
                thumbnails.forEach(thumb => {
                    thumb.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const index = parseInt(e.target.dataset.index);
                        product.currentImageIndex = index;
                        if (mainImage) mainImage.src = product.images[index];

                        thumbnails.forEach(t => t.classList.remove('active'));
                        e.target.classList.add('active');
                    });
                });
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    product.previousImage();
                    if (mainImage) mainImage.src = product.images[product.currentImageIndex];

                    if (thumbnails.length > 0) {
                        thumbnails.forEach(t => t.classList.remove('active'));
                        thumbnails[product.currentImageIndex].classList.add('active');
                    }
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    product.nextImage();
                    if (mainImage) mainImage.src = product.images[product.currentImageIndex];

                    if (thumbnails.length > 0) {
                        thumbnails.forEach(t => t.classList.remove('active'));
                        thumbnails[product.currentImageIndex].classList.add('active');
                    }
                });
            }
        }
    }

    async init() {
        await this.loadProducts();
        this.displayProducts();
        this.updatePageTitle();
        this.setupNavigationListeners();
        this.updateNavigationLinks();
    }
}

// Initialize the shop when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ShopApp();
});