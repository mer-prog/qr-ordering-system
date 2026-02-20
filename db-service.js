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
        const orderData = {
            tableId: Number(tableId),
            items: items,
            status: 'pending', // Initial status
            timestamp: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, ORDERS_COLLECTION), orderData);
        return docRef.id;
    } catch (e) {
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
    } catch (e) {
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
        const orderRef = doc(db, ORDERS_COLLECTION, orderId);
        const updateData = { status: newStatus };
        
        // Record payment time for sales calculation
        if (newStatus === 'paid') {
            updateData.paidAt = serverTimestamp();
        }

        await updateDoc(orderRef, updateData);
    } catch (e) {
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
        return docRef.id;
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
        throw e;
    }
};
