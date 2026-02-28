# Retro Kissaten Mobile Order — Real-Time QR Code Ordering System for Japanese Cafes

> **What:** A mobile ordering system where customers scan a QR code to browse the menu, place orders, and sync with the kitchen in real time
> **Who:** Small cafe and kissaten owners looking to streamline front-of-house operations
> **Tech:** HTML / CSS / JavaScript (ES Modules) + Firebase Firestore (Real-Time DB)

- **Source Code:** [github.com/mer-prog/qr-ordering-system](https://github.com/mer-prog/qr-ordering-system)

---

## 1. Skills Demonstrated

| Skill | Implementation |
|-------|---------------|
| Real-Time Data Sync | Firestore `onSnapshot` for instant order and menu updates between customer devices and the kitchen dashboard |
| Mobile-First UI Design | Tailwind CSS + custom CSS delivering a touch-optimized, responsive layout built for smartphones |
| Security Hardening | XSS prevention (`escapeHTML` / `sanitizeImageSrc` / `sanitizeId`), Firestore security rules with field-level validation, server-side input sanitization |
| Bilingual Support | JP/EN toggle button + MyMemory Translation API + `localStorage` caching for automatic translation |
| Full CRUD Admin Panel | Menu management with create, edit, delete, and reorder capabilities (drag-and-drop + button controls) |
| Data-Driven Category Design | Categories dynamically derived from menu item fields — no dedicated collection required. Categories can be created and reordered from the admin panel |
| Themed UI Implementation | Showa-era retro kissaten aesthetic with paper texture overlays, CRT shutdown animations, and ticket punch effects |

---

## 2. Problem → Solution

| Problem | Solution |
|---------|----------|
| Handwritten order slips lead to errors and miscommunication | Digital ordering directly from the customer's smartphone |
| Staff waste time walking back and forth to take orders | QR code scanning lets customers order on their own |
| Delays in relaying orders to the kitchen | Firestore real-time sync delivers orders to the kitchen instantly |
| Foreign customers cannot read the Japanese menu | JP/EN toggle with automatic translation API |
| Updating menus requires reprinting physical copies | Admin dashboard allows real-time menu changes |
| Manual calculation errors during checkout | Automatic per-table totals ensure accurate billing |

---

## 3. Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| Markup | HTML5 | Semantic structure, ES Modules support |
| Styling | Tailwind CSS (CDN) + Custom CSS | Responsive layout, retro theme effects |
| Frontend | JavaScript (ES Modules) | Application logic, DOM manipulation, state management |
| Database | Firebase Firestore | Real-time NoSQL with `onSnapshot` bidirectional sync |
| Fonts | Google Fonts (Noto Serif JP / Kaisei Decol) | Japanese serif typefaces for the retro cafe aesthetic |
| QR Codes | qrcodejs (CDN) | Table-specific QR code generation (tables 1–8) |
| Translation | MyMemory Translation API | Japanese-to-English auto-translation with `localStorage` cache |
| Local Server | Python3 `http.server` | Zero-dependency local development server |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client Layer                      │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ index.html   │  │ admin.html   │  │qr-codes    │ │
│  │ (Customer    │  │ (Kitchen     │  │  .html     │ │
│  │  Ordering)   │  │  Dashboard)  │  │ (QR Gen)   │ │
│  │ + app.js     │  │              │  │            │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────┘ │
│         │                 │                          │
│         ▼                 ▼                          │
│  ┌──────────────────────────────────┐                │
│  │       db-service.js              │                │
│  │  (Firestore Abstraction Layer)   │                │
│  │  addOrder / subscribeToOrders    │                │
│  │  updateOrderStatus / deleteOrder │                │
│  │  CRUD: menu collection           │                │
│  └──────────────┬───────────────────┘                │
│                 │                                    │
│  ┌──────────────┴───────────────────┐                │
│  │     firebase-config.js           │                │
│  │  (Firebase Init & Firestore)     │                │
│  └──────────────┬───────────────────┘                │
└─────────────────┼───────────────────────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────────┐
│              Firebase Firestore                      │
│                                                      │
│  ┌─────────────┐     ┌──────────────┐                │
│  │ menu        │     │ orders       │                │
│  │ collection  │     │ collection   │                │
│  │             │     │              │                │
│  │ - name      │     │ - tableId    │                │
│  │ - price     │     │ - items[]    │                │
│  │ - type      │     │ - status     │                │
│  │ - options[] │     │ - timestamp  │                │
│  └─────────────┘     └──────────────┘                │
│                                                      │
│  firestore.rules (Security Rules)                    │
└─────────────────────────────────────────────────────┘
```

---

## 5. Key Features

### 5.1 Customer Ordering Flow (`index.html` + `app.js`)

- **Table Identification:** Automatically reads the table number from the URL query parameter `?table=1`
- **Menu Display:** Fetched from Firestore in real time, automatically grouped by category
- **Quantity Controls:** +/- buttons with visual feedback on selected items (punch mark + red border)
- **Set Menu Options:** Modal for selecting sandwich types (Egg / Potato / Ham)
- **Morning Pricing:** Between 9:00 AM and 12:00 PM, the discounted `priceMorning` is automatically applied via `isMorningTime()`
- **Order Submission:** Writes order data to Firestore → plays a CRT shutdown animation → displays a confirmation modal
- **Live Total:** Cart total is calculated and displayed in real time

### 5.2 Bilingual Support

- **JP/EN Toggle:** Instant language switch via a button in the top-right corner of the header
- **Multi-Layer Fallback:** Firestore `nameEn` / `descEn` fields → MyMemory Translation API → original Japanese text
- **Translation Cache:** Results are stored in `localStorage` to minimize API calls
- **Batched Requests:** Translations are sent in parallel batches of 5 to avoid rate limiting
- **Static Text Switching:** Header, button labels, and other UI elements update to match the selected language

### 5.3 Kitchen & Admin Dashboard (`admin.html`)

**Order Management Tab:**
- **3-Column Kanban Board:** Pending → Served (Unpaid) → Paid (History)
- **Status Transitions:** One-way flow from `pending` → `served` → `paid`
- **Table-Grouped Bills:** Served orders are grouped by table with automatic total calculation
- **Daily Sales:** Real-time display of today's total revenue
- **History Filter:** Date picker with previous/next day navigation for browsing past transactions
- **Live Clock:** Current time display for kitchen reference

**Menu Management Tab:**
- **Full CRUD:** Create, edit, and delete menu items
- **Category Management:** Select from existing categories or create new ones on the fly
- **Reordering:** Arrow buttons for item and category reordering, plus drag-and-drop support
- **Image Upload:** File selection → Base64 conversion → resized to 300px max → stored in Firestore
- **Morning Price Toggle:** Checkbox to show/hide the morning price field
- **Set Options:** Dynamically add or remove sub-options (e.g., sandwich filling types)
- **Toast Notifications:** Visual feedback for all operations

### 5.4 QR Code Generator (`qr-codes.html`)

- Generates QR codes for tables 1 through 8 in a single view
- Auto-detects the base URL from the current server address
- Editable URL input field with a regenerate button
- Print-friendly CSS hides non-essential elements via `@media print`

### 5.5 Menu Data Seeder (`seed-menu.html`)

- Bulk-inserts initial menu data into the Firestore `menu` collection
- Checks for existing data before seeding to prevent duplicates
- Terminal-style UI (black background, green text) with real-time progress logging
- Default menu: 4 drinks, 4 food items, 2 morning sets (10 items total)

---

## 6. Data Model

### `menu` Collection

```typescript
interface MenuItem {
  name: string;           // Item name (Japanese) e.g. "ブレンド珈琲"
  nameEn: string;         // Item name (English) e.g. "Blend Coffee"
  price: number;          // Regular price (JPY) e.g. 450
  priceMorning: number | null;  // Morning price (JPY) e.g. 700 (applied 9AM–12PM)
  desc: string;           // Description (Japanese) e.g. "深煎りのコクと香り"
  descEn: string;         // Description (English) e.g. "Dark roast with rich aroma"
  type: string;           // Category key e.g. "drink" | "food" | "morning"
  typeName: string;       // Category display name (JP) e.g. "飲み物（ホット・アイス）"
  typeNameEn: string;     // Category display name (EN) e.g. "Drinks (Hot/Ice)"
  typeOrder: number;      // Category sort order e.g. 0, 10, 20
  image: string;          // Image (relative path or Base64 data URI)
  order: number;          // Sort order within category
  hasOptions: boolean;    // Whether this item has sub-options
  options: Option[];      // Option array (only used when hasOptions=true)
  createdAt: Timestamp;   // Creation timestamp (serverTimestamp)
  updatedAt?: Timestamp;  // Update timestamp (on edit only)
}

interface Option {
  id: string;             // Option ID e.g. "egg"
  name: string;           // Option name (Japanese) e.g. "たまご"
  nameEn: string;         // Option name (English) e.g. "Egg"
}
```

### `orders` Collection

```typescript
interface Order {
  tableId: number;        // Table number (1–100)
  items: OrderItem[];     // Ordered items array (1–50 items)
  status: 'pending' | 'served' | 'paid';  // Order status
  timestamp: Timestamp;   // Order placement time (serverTimestamp)
  paidAt?: Timestamp;     // Payment time (recorded when status='paid')
}

interface OrderItem {
  id: string;             // Item ID (max 100 chars)
  name: string;           // Item name (max 200 chars)
  nameEn: string;         // Item name in English (max 200 chars)
  price: number;          // Unit price (JPY)
  quantity: number;       // Quantity (1–99)
}
```

---

## 7. Design System

### Customer Ordering Screen (Showa-Era Retro Kissaten Theme)

| Element | Value | Purpose |
|---------|-------|---------|
| `retro-cream` | `#FDF5E6` | Background color (aged paper) |
| `retro-brown` | `#4B3621` | Text and border color (dark brown) |
| `retro-red` | `#A40000` | Accent color (prices, selected state) |
| `retro-dark` | `#2A1F1B` | Deep background (button shadows, QR codes) |
| Font | Noto Serif JP | Japanese serif typeface for retro ambiance |

**Visual Effects:**
- **Paper Texture:** SVG `feTurbulence` filter overlay for a grainy, aged paper look
- **CRT Animation:** Simulated cathode-ray tube shutdown effect on order submission
- **Ticket Punch:** Circular punch mark appears on selected menu items
- **Sepia Filter:** Light sepia tone applied to menu item images
- **3D Button:** Order button uses `border-b-4` + `translate-y` for a raised, pressable effect

### Admin Dashboard (Chalkboard Theme)

| Element | Value | Purpose |
|---------|-------|---------|
| Background | `#2b2b2b` | Dark chalkboard-style background |
| Accent | `#fbbf24` (amber) | Active tab and category headers |
| Slip (Pending) | `#fdf6e3` | Cream-colored paper slip for pending orders |
| Slip (Served) | `#e0f2f1` | Cyan-tinted slip for served orders |
| Font | Kaisei Decol | Handwritten-style Japanese serif typeface |

---

## 8. Project Structure

```
qr-ordering-system/
├── index.html           # Customer ordering page (mobile-first)
├── admin.html           # Kitchen & admin dashboard (2-tab layout)
├── qr-codes.html        # Table-specific QR code generator with print support
├── seed-menu.html       # One-time menu data seeder tool
├── app.js               # Customer-side application logic (ordering, translation, cart)
├── db-service.js        # Firestore abstraction layer (CRUD + real-time subscriptions)
├── firebase-config.js   # Firebase initialization and Firestore connection
├── firestore.rules      # Firestore security rules
├── styles.css           # Custom CSS (retro effects & animations)
├── start-server.sh      # Local development server launcher
├── images/
│   └── placeholder.png  # Menu image placeholder
├── .gitignore           # Git ignore rules
└── README.md            # Project overview
```

---

## 9. Setup

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/mer-prog/qr-ordering-system.git
cd qr-ordering-system

# 2. Run the start script (requires Python 3)
chmod +x start-server.sh
./start-server.sh

# 3. Open in your browser
#    Customer ordering:  http://localhost:8080/index.html?table=1
#    Admin dashboard:    http://localhost:8080/admin.html
#    QR codes:           http://localhost:8080/qr-codes.html
```

### First-Time Setup (Seed Menu Data)

```bash
# Open the following URL in your browser and click the seed button
http://localhost:8080/seed-menu.html
```

### Testing on Mobile

1. Connect your PC and smartphone to the **same Wi-Fi network**
2. Find your PC's local IP address (macOS: `ipconfig getifaddr en0`)
3. Update the base URL in `qr-codes.html` to your local IP and regenerate
4. Scan a QR code with your phone's camera to access the ordering page

---

## 10. Security & Production Roadmap

### Current Security Measures

| Measure | Location |
|---------|----------|
| XSS Sanitization | `escapeHTML()` / `sanitizeImageSrc()` / `sanitizeId()` in `app.js` and `admin.html` |
| Firestore Rules | `menu`: read=all, write=validated (name/price/type required, type and length checks) |
| Order Creation Validation | `orders`: tableId (1–100), items (1–50), status must be 'pending' |
| Order Update Restriction | Only `status` and `paidAt` fields can be modified |
| Order Deletion Blocked | Firestore rule `delete: if false` protects order history |
| Input Sanitization | `db-service.js` enforces string length limits (name: 200 chars, id: 100 chars) and numeric range limits (quantity: 1–99) |
| Security Headers | `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` |
| Image Validation | File type whitelist (JPEG/PNG/GIF/WebP), 1MB size limit, resized to 300px |

### Production Hardening Roadmap

| Area | Description |
|------|-------------|
| Authentication | Add Firebase Authentication to restrict admin dashboard access |
| Hosting | Deploy via Firebase Hosting for HTTPS delivery with CDN |
| Image Storage | Migrate to Firebase Storage to eliminate Base64 dependency |
| Environment Variables | Extract Firebase config values into environment variables |

---

## 11. Design Decisions

| Decision | Rationale |
|----------|-----------|
| No build tools (no Vite/Webpack) | Tailwind CSS via CDN + ES Modules provide everything needed without adding build complexity |
| Firebase Firestore | Eliminates the need for a backend server while providing real-time sync out of the box — free tier covers small cafe operations |
| Base64 image storage | Allows images to be stored directly in Firestore documents without setting up Firebase Storage (images are resized to 300px) |
| Dynamic category generation | Categories are derived from menu item fields (`type` / `typeName` / `typeOrder`), keeping the schema simple without a separate collection |
| MyMemory Translation API | Free, no-registration translation API enables bilingual support with minimal setup — `localStorage` cache reduces API calls |
| Python3 http.server | No Node.js dependency — uses the OS-bundled Python3 for a zero-install local dev environment |
| Set options as embedded arrays | `hasOptions` flag + `options` array on each menu item avoids the need for a separate options collection |

---

## 12. Running Costs

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Firebase Firestore | Spark (Free Tier) | $0 |
| Firebase Hosting | Spark (Free Tier) | $0 |
| Google Fonts | Free | $0 |
| Tailwind CSS CDN | Free | $0 |
| qrcodejs CDN | Free | $0 |
| MyMemory Translation API | Free Tier (1,000 requests/day) | $0 |
| **Total** | | **$0** |

> Firestore free tier includes 50,000 reads/day, 20,000 writes/day, and 20,000 deletes/day — more than enough for a small cafe operation.

---

## 13. Author

[@mer-prog](https://github.com/mer-prog)
