import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp, 
    updateDoc, 
    deleteDoc,
    doc,
    getDocs,
    writeBatch
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const ORDERS_COLLECTION = 'orders';
const MENU_COLLECTION = 'menu';

// ============================================================
//  ORDER FUNCTIONS (既存)
// ============================================================

/**
 * Add a new order to Firestore
 * @param {number} tableId - The table number
 * @param {Array<{name: string, price: number, quantity: number}>} items - List of ordered items
 * @returns {Promise<string>} The ID of the newly created order document
 */
export const addOrder = async (tableId, items) => {
    try {
        // Input validation
        const safeTableId = Number(tableId);
        if (!Number.isFinite(safeTableId) || safeTableId < 1 || safeTableId > 100) {
            throw new Error('Invalid table ID');
        }
        if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
            throw new Error('Invalid order items');
        }

        // Sanitize each item
        const safeItems = items.map(item => ({
            id: String(item.id || '').slice(0, 100),
            name: String(item.name || '').slice(0, 200),
            nameEn: String(item.nameEn || '').slice(0, 200),
            price: Number(item.price) || 0,
            quantity: Math.max(1, Math.min(99, parseInt(item.quantity) || 1))
        }));

        const orderData = {
            tableId: safeTableId,
            items: safeItems,
            status: 'pending',
            timestamp: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, ORDERS_COLLECTION), orderData);
        console.log("Order placed with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error adding order: ", e);
        throw e;
    }
};

/**
 * Subscribe to real-time order updates
 * @param {function} callback - Function to call with the list of orders whenever data changes
 * @returns {function} Unsubscribe function
 */
export const subscribeToOrders = (callback) => {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snapshot) => {
        const orders = [];
        snapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        callback(orders);
    });
};

/**
 * Delete an order permanently
 * @param {string} orderId - The document ID of the order to delete
 */
export const deleteOrder = async (orderId) => {
    try {
        await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));
        console.log(`Order ${orderId} deleted`);
    } catch (e) {
        console.error("Error deleting order: ", e);
        throw e;
    }
};

/**
 * Update the status of an order
 * @param {string} orderId - The document ID of the order
 * @param {'pending' | 'served' | 'paid'} newStatus - The new status
 */
export const updateOrderStatus = async (orderId, newStatus) => {
    try {
        // Validate status transitions
        const validStatuses = ['pending', 'served', 'paid'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}`);
        }

        const orderRef = doc(db, ORDERS_COLLECTION, orderId);
        const updateData = { status: newStatus };

        // Record payment time for sales calculation
        if (newStatus === 'paid') {
            updateData.paidAt = serverTimestamp();
        }

        await updateDoc(orderRef, updateData);
        console.log(`Order ${orderId} updated to: ${newStatus}`);
    } catch (e) {
        console.error("Error updating status: ", e);
        throw e;
    }
};

// ============================================================
//  MENU FUNCTIONS (新規)
// ============================================================

/**
 * メニュー全件取得（order フィールドでソート）
 * @returns {Promise<Array>} メニューアイテムの配列
 */
export const getMenuItems = async () => {
    try {
        const q = query(collection(db, MENU_COLLECTION), orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        const items = [];
        snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        return items;
    } catch (e) {
        console.error("Error fetching menu: ", e);
        throw e;
    }
};

/**
 * メニューのリアルタイム購読
 * @param {function} callback - メニューデータが変更された時に呼ばれるコールバック
 * @returns {function} Unsubscribe function
 */
export const subscribeToMenu = (callback) => {
    const q = query(collection(db, MENU_COLLECTION), orderBy("order", "asc"));
    return onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        callback(items);
    });
};

/**
 * 新規メニューアイテム追加
 * @param {Object} item - メニューアイテムデータ
 * @returns {Promise<string>} 作成されたドキュメントのID
 */
export const addMenuItem = async (item) => {
    try {
        const docRef = await addDoc(collection(db, MENU_COLLECTION), {
            ...item,
            createdAt: serverTimestamp()
        });
        console.log("Menu item added with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error adding menu item: ", e);
        throw e;
    }
};

/**
 * メニューアイテムの更新
 * @param {string} itemId - ドキュメントID
 * @param {Object} data - 更新するフィールド
 */
export const updateMenuItem = async (itemId, data) => {
    try {
        const ref = doc(db, MENU_COLLECTION, itemId);
        await updateDoc(ref, {
            ...data,
            updatedAt: serverTimestamp()
        });
        console.log(`Menu item ${itemId} updated`);
    } catch (e) {
        console.error("Error updating menu item: ", e);
        throw e;
    }
};

/**
 * メニューアイテムの削除
 * @param {string} itemId - ドキュメントID
 */
export const deleteMenuItem = async (itemId) => {
    try {
        await deleteDoc(doc(db, MENU_COLLECTION, itemId));
        console.log(`Menu item ${itemId} deleted`);
    } catch (e) {
        console.error("Error deleting menu item: ", e);
        throw e;
    }
};

/**
 * メニューの並び順を一括更新（バッチ書き込み）
 * @param {Array<{id: string, order: number}>} items - IDと新しい順序の配列
 */
export const updateMenuOrder = async (items) => {
    try {
        const batch = writeBatch(db);
        items.forEach(({ id, order }) => {
            const ref = doc(db, MENU_COLLECTION, id);
            batch.update(ref, { order: order });
        });
        await batch.commit();
        console.log("Menu order updated");
    } catch (e) {
        console.error("Error updating menu order: ", e);
        throw e;
    }
};
