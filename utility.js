
const materials = require('./materials');
const collections = require('./collections');
const admin = require('firebase-admin');
const cache = require('./cache');

const db = admin.firestore();

async function updateStock(orderRef, isBuy) {

    if (!cache.stockList) {
        const stockRefQuery = await db.collection(collections["Inventory"]).orderBy("DateTime", "desc").limit(1).get();
        if (stockRefQuery.empty) {
            return;
        }
        cache.stockList = stockRefQuery.docs[0].data();
    }

    for (let category in materials) {
        for (let material of materials[category]) {
            if (cache.stockList[material] !== undefined && cache.stockList[material] !== false) {
                cache.stockList[material] += orderRef[material] * (isBuy ? -1 : 1);
            }
        }
    }

    const dateEntered = new Date().toISOString();
    cache.stockList['DateTime'] = dateEntered;
    const docRef = db.collection(collections["Inventory"]).doc(dateEntered);
    await docRef.set(cache.stockList);
}

module.exports.updateStock = updateStock;
