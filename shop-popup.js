// Simplified ProductPopup class - UPDATED to match shop.js popup style
class ProductPopup {
    constructor() {
        this.products = [];
        this.popupContainer = null;
        
        // Create popup container if it doesn't exist
        this.initPopupContainer();
        this.init();
    }

    initPopupContainer() {
        this.popupContainer = document.getElementById('popup-container');
        if (!this.popupContainer) {
            this.popupContainer = document.createElement('div');
            this.popupContainer.id = 'popup-container';
            document.body.appendChild(this.popupContainer);
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('products.json');
            if (!response.ok) throw new Error('Failed to load products');
            
            const data = await response.json();
            this.products = data.map(item => {
                const images = item.images || [item.image];
                const sizes = item.size || []; // Handle size array
                
                return {
                    id: item.id,
                    name: item.name,
                    price: item.discount > 0 ? Math.round(item.price * (1 - item.discount / 100)) : item.price,
                    originalPrice: item.price,
                    discount: item.discount || 0,
                    description: item.description,
                    category: item.category,
                    images: images,
                    size: sizes, // Add size property
                    currentImageIndex: 0,
                    
                    // Add methods to match shop.js Product class
                    hasDiscount() {
                        return this.discount > 0;
                    },
                    
                    calculateDiscountedPrice() {
                        if (this.hasDiscount()) {
                            return Math.round(this.originalPrice * (1 - this.discount / 100));
                        }
                        return this.price;
                    },
                    
                    hasMultipleImages() {
                        return this.images.length > 1;
                    },
                    
                    hasSizes() {
                        return this.size && this.size.length > 0;
                    },
                    
                    nextImage() {
                        if (this.hasMultipleImages()) {
                            this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
                        }
                        return this.images[this.currentImageIndex];
                    },
                    
                    previousImage() {
                        if (this.hasMultipleImages()) {
                            this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
                        }
                        return this.images[this.currentImageIndex];
                    },
                    
                    formatPrice(price) {
                        return 'Rp ' + price.toLocaleString('id-ID');
                    }
                };
            });
            return true;
        } catch (error) {
            console.error('Error loading products:', error);
            return false;
        }
    }

    formatPrice(price) {
        return 'Rp ' + price.toLocaleString('id-ID');
    }

    // Updated to include size display with thin borders
    getProductHTML(product) {
        const hasDiscount = product.hasDiscount();
        const discountedPrice = product.calculateDiscountedPrice();
        const hasMultipleImages = product.hasMultipleImages();
        const hasSizes = product.hasSizes();

        return `
            <div class="product-popup" data-id="${product.id}">
                <div class="popup-content horizontal-layout">
                    <button class="close-popup">&times;</button>
                    
                    <div class="popup-images">
                        <div class="main-image-container">
                            <img src="${product.images[0]}" alt="${product.name}" 
                                 class="main-image" id="main-image-${product.id}">
                            
                            ${hasMultipleImages ? `
                                <button class="image-nav-btn prev-btn">‹</button>
                                <button class="image-nav-btn next-btn">›</button>
                            ` : ''}
                        </div>
                        
                        ${hasMultipleImages ? `
                            <div class="image-thumbnails">
                                ${product.images.map((img, index) => `
                                    <img src="${img}" alt="Thumbnail ${index + 1}" 
                                         class="thumbnail ${index === 0 ? 'active' : ''}" 
                                         data-index="${index}">
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="popup-details">

                        <h2 class="popup-title">${product.name}</h2>
                        <div class="category-badge">${product.category}</div>
                        <div class="popup-price">
                            ${hasDiscount ?
                `<span class="original-price">${this.formatPrice(product.originalPrice)}</span>
                                 <span class="discounted-price">${this.formatPrice(discountedPrice)}</span>
                                 <span class="discount-percent">-${product.discount}%</span>`
                : `<span class="current-price">${this.formatPrice(product.price)}</span>`
            }
                        </div>
                        <div class="popup-sizes">
                            <h3>Available Sizes</h3>
                        ${hasSizes ? `
                            <div class="size-options">
                                ${product.size.map(s => `<span class="size-tag">${s}</span>`).join('')}
                            </div>
                        </div>
                        ` : `<span class="size-tag placeholder hidden">&nbsp;</span>`}
                        
                        <div class="popup-description">
                            <p>${product.description}</p>
                        </div>
                        
                        <div class="popup-actions">
                            <a href="https://wa.me/6287864853508?text=Hi, I want to order: ${encodeURIComponent(product.name)} (ID: ${product.id}) - Price: ${this.formatPrice(discountedPrice)}" 
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

    showProductPopup(productId) {
        const product = this.products.find(p => p.id == productId);
        if (!product) {
            console.error('Product not found with ID:', productId);
            return false;
        }

        // Close any existing popup
        this.closePopup();

        // Create and show new popup
        this.popupContainer.innerHTML = this.getProductHTML(product);
        const popup = this.popupContainer.querySelector('.product-popup');

        // Prevent body scroll
        document.body.classList.add('popup-open');

        // Show popup with animation (matching shop.js)
        requestAnimationFrame(() => {
            popup.classList.add('active');
        });

        // Add popup event listeners
        this.addPopupEventListeners(product);
        return true;
    }

    closePopup() {
        const popup = this.popupContainer.querySelector('.product-popup');
        if (popup) {
            popup.classList.remove('active');
            document.body.classList.remove('popup-open');

            // Remove from DOM after animation
            setTimeout(() => {
                if (popup.classList.contains('active') === false) {
                    this.popupContainer.innerHTML = '';
                }
            }, 300);
        }
    }

    addPopupEventListeners(product) {
        const popup = this.popupContainer.querySelector('.product-popup');
        if (!popup) return;

        // Close popup button
        const closeBtn = popup.querySelector('.close-popup');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closePopup();
            });
        }

        // Close popup when clicking outside (matching shop.js)
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                this.closePopup();
            }
        });

        // Close popup with Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closePopup();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Image navigation - matching shop.js
        if (product.hasMultipleImages()) {
            const mainImage = popup.querySelector(`#main-image-${product.id}`);
            const thumbnails = popup.querySelectorAll('.thumbnail');
            const prevBtn = popup.querySelector('.prev-btn');
            const nextBtn = popup.querySelector('.next-btn');

            // Thumbnail click
            if (thumbnails.length > 0) {
                thumbnails.forEach(thumb => {
                    thumb.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const index = parseInt(e.target.dataset.index);
                        product.currentImageIndex = index;
                        if (mainImage) mainImage.src = product.images[index];

                        // Update active thumbnail
                        thumbnails.forEach(t => t.classList.remove('active'));
                        e.target.classList.add('active');
                    });
                });
            }

            // Previous button
            if (prevBtn) {
                prevBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    product.previousImage();
                    if (mainImage) mainImage.src = product.images[product.currentImageIndex];

                    // Update active thumbnail
                    if (thumbnails.length > 0) {
                        thumbnails.forEach(t => t.classList.remove('active'));
                        thumbnails[product.currentImageIndex].classList.add('active');
                    }
                });
            }

            // Next button
            if (nextBtn) {
                nextBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    product.nextImage();
                    if (mainImage) mainImage.src = product.images[product.currentImageIndex];

                    // Update active thumbnail
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
        
        // Check for product ID in URL
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('product');
        
        if (productId) {
            this.showProductPopup(productId);
        }
        
        // Check for pending product popup
        if (window._pendingProductPopup) {
            this.showProductPopup(window._pendingProductPopup);
            window._pendingProductPopup = null;
        }
        
        // Make showPopup available globally
        window.showProductPopup = (id) => this.showProductPopup(id);
        window.closeProductPopup = () => this.closePopup();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.productPopup = new ProductPopup();
});