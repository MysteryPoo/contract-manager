const express = require('express');
const router = express.Router();
const materials = require('../materials');
const collections = require('../collections');
const cache = require('../cache');

const admin = require('firebase-admin');

const db = admin.firestore();

router.get('/csv', async function(req, res, next) {

    let priceRef = cache.priceList;
    if (!priceRef) {
        const priceRefQuery = await db.collection(collections['Price-List']).orderBy("DateTime", "desc").limit(1).get();
        if (priceRefQuery.empty) {
        const error = "Fatal error: No price list found.";
        console.log(error);
        res.send(error);
        return;
        }
        priceRef = priceRefQuery.docs[0].data();
        cache.priceList = priceRef;
    }
  
    let demandRef = cache.demandDoc;
    if (!demandRef) {
        const demandRefQuery = await db.collection(collections['Demand-List']).orderBy("DateTime", "desc").limit(1).get();
        if (demandRefQuery.empty) {
        const error = "Fatal error: No demand list found.";
        console.log(error);
        res.send(error);
        return;
        }
        demandRef = demandRefQuery.docs[0].data();
        cache.demandDoc = demandRef;
    }
  
    let sellWeight = Number(priceRef['Sell Weight']);
    let buyWeight = Number(priceRef['Buy Weight']);
  
    let returnValue = "";
  
    // Global data
    returnValue += "Sell Weight, Buy Weight, Price-DateTime, Demand-DateTime,";
    returnValue += "\n";
    returnValue += `${sellWeight}, ${buyWeight}, ${priceRef['DateTime']}, ${demandRef['DateTime']},`;
    returnValue += "\n";
  
    // Material Data
    returnValue += "Material Name, Material Base Price, Buy Demand Multiplier, Sell Demand Multiplier,";
    returnValue += "\n";
  
    for (let category in materials) {
      for (let material of materials[category]) {
        let basePrice = priceRef[material] || 0;
        let buyDemand = Object.keys(demandRef['Demands'])[0];
        let sellDemand = Object.keys(demandRef['Demands'])[0];
        // Backwards compatibility
        if (typeof demandRef[material] === "string") {
            buyDemand = sellDemand = demandRef[material];
        } else if (demandRef[material] !== undefined) {
            buyDemand = demandRef[material]['Buy'];
            sellDemand = demandRef[material]['Sell'];
        }
        // End of backwards compatibility
        returnValue += `${material}, ${basePrice}, ${demandRef['Demands'][buyDemand]}, ${demandRef['Demands'][sellDemand]},`;
        returnValue += "\n";
      }
    }
  
    res.set('Content-Type', 'text/plain');
    res.send(returnValue);
  });

  router.get('/stock', async function(req, res, next) {
    let stockRef = cache.stockList;
    if (!stockRef) {
        const stockRefQuery = await db.collection(collections["Inventory"]).orderBy("DateTime", "desc").limit(1).get();
        
        stockRef = stockRefQuery.empty ? {} : stockRefQuery.docs[0].data();
        cache.stockList = stockRef;
    }
    res.set('Content-Type', 'application/json');
    res.send(cache.stockList);
  });

module.exports = router;
