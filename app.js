import { addOrder, subscribeToMenu } from './db-service.js';

// ============================================================
//  XSS SANITIZATION
// ============================================================
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeImageSrc(src) {
    if (!src || typeof src !== 'string') return '';
    if (src.startsWith('data:image/')) return src;
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    if (src.startsWith('./') || src.startsWith('/') || src.startsWith('../')) return src;
    return '';
}

function sanitizeId(id) {
    if (typeof id !== 'string') return '';
    return id.replace(/[^a-zA-Z0-9_\-]/g, '');
}

// Configuration
const TABLE_ID = new URLSearchParams(window.location.search).get('table') || 1;
let currentLang = 'ja'; // 'ja' or 'en'

// ============================================================
//  AUTO-TRANSLATION CACHE (ja → en)
// ============================================================
const TRANSLATION_CACHE_KEY = 'menu_translations_cache';
let translationCache = {};
try {
    translationCache = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '{}');
} catch(e) { translationCache = {}; }

function saveTranslationCache() {
    try { localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(translationCache)); } catch(e) {}
}

async function translateText(text) {
    if (!text || text.trim() === '') return '';
    if (translationCache[text]) return translationCache[text];
    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ja|en`);
        const data = await res.json();
        if (data.responseStatus === 200 && data.responseData.translatedText) {
            const translated = data.responseData.translatedText;
            translationCache[text] = translated;
            saveTranslationCache();
            return translated;
        }
    } catch (err) {
        console.warn('Translation failed for:', text, err);
    }
    return text; // fallback to original
}

async function translateAllMenuItems() {
    const textsToTranslate = [];
    
    // Collect all Japanese texts that need translation
    MENU_ITEMS.forEach(item => {
        if (item.name && !translationCache[item.name]) textsToTranslate.push(item.name);
        if (item.desc && !translationCache[item.desc]) textsToTranslate.push(item.desc);
    });
    CATEGORIES.forEach(cat => {
        if (cat.name && !translationCache[cat.name]) textsToTranslate.push(cat.name);
    });
    SANDWICH_OPTIONS.forEach(opt => {
        if (opt.name && !translationCache[opt.name]) textsToTranslate.push(opt.name);
    });

    // Translate in parallel (batch of 5 to avoid rate limits)
    for (let i = 0; i < textsToTranslate.length; i += 5) {
        const batch = textsToTranslate.slice(i, i + 5);
        await Promise.all(batch.map(t => translateText(t)));
    }

    // Re-render after translations are done
    renderMenu();
    updateOrderButton();
    updateStaticText();
}

// Menu Data — loaded from Firestore
let MENU_ITEMS = [];
let SANDWICH_OPTIONS = []; // built from items with hasOptions
let CATEGORIES = []; // built dynamically from menu items

function isMorningTime() {
    const hour = new Date().getHours();
    return hour >= 9 && hour < 12;
}

function getPrice(item) {
    if (item.parentId) {
        const parent = MENU_ITEMS.find(i => i.id === item.parentId);
        if (parent) return getPrice(parent);
    }

    if (item.type === 'morning' && isMorningTime()) {
        return item.priceMorning || item.price;
    }
    return item.price;
}

function getLocalizedText(item, field) {
    if (currentLang === 'en') {
        // Use stored English if available, otherwise use translation cache
        if (item[field + 'En'] && item[field + 'En'].length > 0) {
            return item[field + 'En'];
        }
        return translationCache[item[field]] || item[field];
    }
    return item[field];
}

function getLocalizedCategoryName(cat) {
    if (currentLang === 'en') {
        if (cat.nameEn && cat.nameEn.length > 0) return cat.nameEn;
        return translationCache[cat.name] || cat.name;
    }
    return cat.name;
}

// State
let cart = {}; // { itemId: quantity }

// DOM Elements
const tableNumberEl = document.getElementById('table-number');
const menuListEl = document.getElementById('menu-list');
const orderBtn = document.getElementById('order-btn');
const totalPriceEl = document.getElementById('total-price');
const crtOverlay = document.getElementById('crt-overlay');

// Initialization
function init() {
    tableNumberEl.textContent = String(TABLE_ID).padStart(2, '0');
    
    // Subscribe to menu updates from Firestore
    subscribeToMenu((items) => {
        processMenuData(items);
        renderMenu();
        updateOrderButton();
    });
}

/**
 * Process Firestore menu data into MENU_ITEMS, SANDWICH_OPTIONS, and CATEGORIES
 * Categories are automatically derived from the menu items' type/typeName fields
 */
function processMenuData(firestoreItems) {
    MENU_ITEMS = firestoreItems.map(item => ({
        id: item.id,
        name: item.name,
        nameEn: item.nameEn || '',
        price: item.price,
        priceMorning: item.priceMorning || null,
        desc: item.desc || '',
        descEn: item.descEn || '',
        type: item.type,
        typeName: item.typeName || item.type,
        typeNameEn: item.typeNameEn || item.type,
        typeOrder: item.typeOrder ?? 999,
        image: item.image || '',
        hasOptions: item.hasOptions || false,
        order: item.order || 0,
    }));

    // Build CATEGORIES dynamically from menu items
    const categoryMap = {};
    MENU_ITEMS.forEach(item => {
        if (!categoryMap[item.type]) {
            categoryMap[item.type] = {
                id: item.type,
                name: item.typeName,
                nameEn: item.typeNameEn,
                order: item.typeOrder
            };
        }
    });
    CATEGORIES = Object.values(categoryMap).sort((a, b) => a.order - b.order);

    // Build SANDWICH_OPTIONS from items that have options
    SANDWICH_OPTIONS = [];
    firestoreItems.forEach(item => {
        if (item.hasOptions && item.options && item.options.length > 0) {
            item.options.forEach(opt => {
                SANDWICH_OPTIONS.push({
                    id: `${item.id}_${opt.id}`,
                    parentId: item.id,
                    name: `${opt.name}（${item.name}）`,
                    nameEn: opt.nameEn ? `${opt.nameEn} (${item.nameEn || item.name})` : '',
                    price: 0
                });
            });
        }
    });
}

window.toggleLanguage = () => {
    currentLang = currentLang === 'ja' ? 'en' : 'ja';
    renderMenu();
    updateOrderButton();
    updateStaticText();
    
    if (currentLang === 'en') {
        // Auto-translate all menu items if needed
        translateAllMenuItems();
    }
};

function updateStaticText() {
    const orderText = document.querySelector('#order-btn span:nth-child(2)');
    if (orderText) orderText.textContent = currentLang === 'ja' ? '注文する' : 'ORDER';
    
    const checkoutText = document.querySelector('#order-btn span:nth-child(1)');
    if (checkoutText) checkoutText.textContent = currentLang === 'ja' ? '会計' : 'Total';

    const headerTitle = document.querySelector('header h1');
    if (headerTitle) {
         if (currentLang === 'ja') {
             headerTitle.innerHTML = '純喫茶<br><span class="text-xl text-retro-brown">ご注文票</span>';
         } else {
             headerTitle.innerHTML = 'Retro Cafe<br><span class="text-xl text-retro-brown">Order Slip</span>';
         }
    }
}

// Render Menu Items (categories are now dynamic)
function renderMenu() {
    menuListEl.innerHTML = '';

    if (MENU_ITEMS.length === 0) {
        menuListEl.innerHTML = '<div class="text-center py-12 opacity-50 col-span-full"><p class="text-lg">メニューを読み込み中...</p></div>';
        return;
    }

    CATEGORIES.forEach(cat => {
        const items = MENU_ITEMS.filter(item => item.type === cat.id);
        if (items.length === 0) return;

        // Section Header
        const sectionTitle = escapeHTML(getLocalizedCategoryName(cat));
        const sectionEl = document.createElement('div');
        sectionEl.className = 'col-span-full mt-6 mb-4 select-none';
        sectionEl.innerHTML = `
            <div class="flex items-center gap-4">
                <h2 class="text-xl font-bold text-retro-brown font-serif tracking-widest">${sectionTitle}</h2>
                <div class="flex-grow border-b-2 border-retro-brown opacity-30 border-dotted"></div>
            </div>
        `;
        menuListEl.appendChild(sectionEl);

        const gridEl = document.createElement('div');
        gridEl.className = 'grid grid-cols-1 gap-6 col-span-full';
        
        gridEl.innerHTML = items.map(item => {
            const price = getPrice(item);
            const name = escapeHTML(getLocalizedText(item, 'name'));
            const desc = escapeHTML(getLocalizedText(item, 'desc'));
            const safeId = sanitizeId(item.id);

            const hasOptions = item.hasOptions;
            const clickAction = hasOptions ? `openSandwichModal('${safeId}')` : `updateQuantity('${safeId}', 1)`;
            const minusAction = hasOptions ? `openSandwichModal('${safeId}')` : `updateQuantity('${safeId}', -1)`;

            const safeSrc = sanitizeImageSrc(item.image);
            const imageHtml = safeSrc
                ? `<img src="${safeSrc}" alt="${name}" class="w-full h-full object-cover sepia-[.3] group-hover:sepia-0 transition-all duration-300">`
                : `<div class="w-full h-full flex items-center justify-center bg-retro-brown/5 text-3xl opacity-40">☕</div>`;

            return `
            <div class="menu-item group" data-id="${safeId}">
                <div class="flex items-start select-none">
                    <div class="w-24 h-24 mr-4 flex-shrink-0 rounded overflow-hidden border border-retro-brown/20 relative" onclick="${clickAction}">
                        ${imageHtml}
                        <div class="absolute inset-0 bg-retro-brown/10 pointer-events-none"></div>
                    </div>
                    <div class="flex-grow min-w-0 flex flex-col justify-between h-24">
                        <div onclick="${clickAction}">
                            <h3 class="text-xl font-bold font-serif mb-1 group-hover:text-retro-red transition-colors leading-tight">${name}</h3>
                            <p class="text-xs opacity-70 mb-1 line-clamp-2">${desc}</p>
                        </div>
                        <div class="flex justify-between items-end">
                            <p class="font-mono text-lg text-retro-red tracking-wider">¥${price}</p>
                            <div class="flex items-center gap-3 z-10">
                                <button class="qty-btn opacity-0 pointer-events-none transition-opacity duration-200" onclick="${minusAction}" data-btn-minus="${safeId}">－</button>
                                <div class="qty-display-wrapper">
                                    <span class="quantity-display text-2xl font-mono font-bold opacity-30">0</span>
                                </div>
                                <button class="qty-btn" onclick="${clickAction}">＋</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="punch-mark"></div>
            </div>
        `}).join('');
        
        menuListEl.appendChild(gridEl);
    });
    
    Object.entries(cart).forEach(([id, qty]) => {
        updateItemVisual(id, qty);
    });
    
    updateParentVisuals();
}

// Sandwich Modal Logic
window.openSandwichModal = (parentId) => {
    const modal = document.getElementById('sandwich-modal');
    const optionsContainer = document.getElementById('sandwich-options');
    const closeBtn = document.getElementById('sandwich-close-btn');

    const options = SANDWICH_OPTIONS.filter(o => o.parentId === parentId);
    
    optionsContainer.innerHTML = options.map(opt => {
        const qty = cart[opt.id] || 0;
        const name = escapeHTML(getLocalizedText(opt, 'name'));
        const safeOptId = sanitizeId(opt.id);
        return `
        <div class="flex justify-between items-center bg-[#e8e4da] p-3 rounded border border-retro-brown/20">
            <span class="font-serif font-bold text-retro-brown">${name}</span>
            <div class="flex items-center gap-3">
                <button class="qty-btn w-8 h-8 flex items-center justify-center bg-white border border-retro-brown/30 rounded-full text-retro-brown shadow-sm active:translate-y-px" onclick="updateQuantity('${safeOptId}', -1, true)">－</button>
                <span class="font-mono text-xl w-6 text-center font-bold" id="qty-${safeOptId}">${qty}</span>
                <button class="qty-btn w-8 h-8 flex items-center justify-center bg-retro-red text-white border border-retro-red rounded-full shadow-sm active:translate-y-px" onclick="updateQuantity('${safeOptId}', 1, true)">＋</button>
            </div>
        </div>
        `;
    }).join('');

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        const content = modal.querySelector('div');
        content.classList.remove('scale-90');
        content.classList.add('scale-100');
    });

    closeBtn.onclick = () => {
        const content = modal.querySelector('div');
        content.classList.remove('scale-100');
        content.classList.add('scale-90');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            renderMenu();
        }, 300);
    };
};

// Update Quantity Logic
window.updateQuantity = (id, change, isModal = false) => {
    if (!cart[id]) cart[id] = 0;
    cart[id] += change;

    if (cart[id] <= 0) {
        delete cart[id];
        if (isModal) {
             const qtyEl = document.getElementById(`qty-${id}`);
             if(qtyEl) qtyEl.textContent = 0;
        } else {
             updateItemVisual(id, 0);
        }
    } else {
        if (isModal) {
             const qtyEl = document.getElementById(`qty-${id}`);
             if(qtyEl) qtyEl.textContent = cart[id];
        } else {
             updateItemVisual(id, cart[id]);
        }
    }
    
    updateOrderButton();
    updateParentVisuals();
};

function updateParentVisuals() {
    const parents = MENU_ITEMS.filter(i => i.hasOptions);
    parents.forEach(parent => {
        const children = SANDWICH_OPTIONS.filter(opt => opt.parentId === parent.id);
        const totalQty = children.reduce((sum, child) => sum + (cart[child.id] || 0), 0);
        updateItemVisual(parent.id, totalQty);
    });
}

function updateItemVisual(id, qty) {
    const el = document.querySelector(`.menu-item[data-id="${id}"]`);
    if (!el) return;

    const qtyDisplay = el.querySelector('.quantity-display');
    const minusBtn = el.querySelector(`[data-btn-minus="${id}"]`);
    
    qtyDisplay.textContent = qty;
    
    if (qty > 0) {
        el.classList.add('selected');
        qtyDisplay.classList.remove('opacity-30');
        qtyDisplay.classList.add('opacity-100', 'text-retro-red');
        minusBtn.classList.remove('opacity-0', 'pointer-events-none');
    } else {
        el.classList.remove('selected');
        qtyDisplay.classList.remove('opacity-100', 'text-retro-red');
        qtyDisplay.classList.add('opacity-30');
        minusBtn.classList.add('opacity-0', 'pointer-events-none');
    }
}

function updateOrderButton() {
    const total = Object.entries(cart).reduce((sum, [id, qty]) => {
        let item = MENU_ITEMS.find(i => i.id === id);
        
        if (!item) {
            const option = SANDWICH_OPTIONS.find(o => o.id === id);
            if (option) {
                const parent = MENU_ITEMS.find(i => i.id === option.parentId);
                item = parent;
            }
        }
        
        return sum + (item ? getPrice(item) * qty : 0);
    }, 0);
    
    totalPriceEl.textContent = `¥${total.toLocaleString()}`;
    
    if (total > 0) {
        orderBtn.classList.remove('opacity-50', 'pointer-events-none');
        orderBtn.classList.add('animate-pulse'); 
    } else {
        orderBtn.classList.add('opacity-50', 'pointer-events-none');
        orderBtn.classList.remove('animate-pulse');
    }
}

// Order Submission
orderBtn.addEventListener('click', async () => {
    if (Object.keys(cart).length === 0) return;

    orderBtn.disabled = true;

    crtOverlay.classList.remove('hidden');
    crtOverlay.classList.add('crt-animate');
    
    await new Promise(r => setTimeout(r, 600));

    try {
        const orderItems = Object.entries(cart).map(([id, qty]) => {
            let item = MENU_ITEMS.find(i => i.id === id);
            let name, nameEn, price;

            if (item) {
                name = item.name;
                nameEn = item.nameEn;
                price = getPrice(item);
            } else {
                const option = SANDWICH_OPTIONS.find(o => o.id === id);
                if (option) {
                    const parent = MENU_ITEMS.find(i => i.id === option.parentId);
                    name = option.name;
                    nameEn = option.nameEn;
                    price = getPrice(parent);
                }
            }

            return {
                id: id,
                name: name,
                nameEn: nameEn,
                price: price, 
                quantity: qty
            };
        });

        await addOrder(TABLE_ID, orderItems);
        
        const modal = document.getElementById('order-complete-modal');
        const modalContent = modal.querySelector('div');
        
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modalContent.classList.remove('scale-90');
            modalContent.classList.add('scale-100');
        });

    } catch (e) {
        console.error(e);
        alert("注文に失敗しました。店員をお呼びください。");
        crtOverlay.classList.remove('crt-animate');
        crtOverlay.classList.add('hidden');
        orderBtn.disabled = false;
    }
});

// Modal Close/Reset Handler
document.getElementById('modal-ok-btn')?.addEventListener('click', () => {
    window.location.reload();
});

// Run Init
init();
