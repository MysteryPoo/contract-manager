var express = require('express');
var router = express.Router();
const materials = require('../materials');
const collections = require('../collections');

const admin = require('firebase-admin');

const db = admin.firestore();

router.get('/', async function(req, res, next) {

  const configRefQuery = await db.collection(collections['Settings']).doc('Config').get();
  if (configRefQuery.empty) {
    let error = "Fatal error: No server configuration found.";
    console.log(error);
    res.send(error);
    return;
  }
  const config = configRefQuery.data();

  if (!config['Sell Orders Enabled']) {
    res.render('disabled', {
      title: `${config['Organization']} Sell Contract`,
      banner: process.env.banner,
      logo: process.env.logo,
      feature: "Sell Order"
    });
    return;
  }

  const priceRefQuery = await db.collection(collections['Price-List']).orderBy("DateTime", "desc").limit(1).get();
  if (priceRefQuery.empty) {
    const error = "Fatal error: No price list found.";
    console.log(error);
    res.send(error);
    return;
  }
  const priceRef = priceRefQuery.docs[0].data();

  const demandRefQuery = await db.collection(collections['Demand-List']).orderBy("DateTime", "desc").limit(1).get();
  if (demandRefQuery.empty) {
    const error = "Fatal error: No demand list found.";
    console.log(error);
    res.send(error);
    return;
  }
  const demandRef = demandRefQuery.docs[0].data();

  let materialList = {};

  let sellWeight = Number(priceRef['Sell Weight']);
  let buyWeight = Number(priceRef['Buy Weight']);

  for (let category in materials) {
    for (let material of materials[category]) {
      let materialNoSpace = material.replace(/ /g, "");
      if (materialList[category] == undefined) {
        materialList[category] = {};
      }
      if (materialList[category][materialNoSpace] == undefined) {
        materialList[category][materialNoSpace] = {};
      }
      let demand = Object.keys(demandRef['Demands'])[0];
      // Backwards compatibility
      if (typeof demandRef[material] === "string") {
          demand = demandRef[material];
      } else if (demandRef[material] !== undefined) {
          demand = demandRef[material]['Sell'];
      }
      // End of backwards compatibility
      let basePrice = priceRef[material] || 0;
      materialList[category][materialNoSpace]['price'] = basePrice * sellWeight * demandRef['Demands'][demand];
      materialList[category][materialNoSpace]['demand'] = demand;
    }
  }

  res.render('sellOrder', {
    title: `${config['Organization']} Sell Contract`,
    banner: process.env.banner,
    logo: process.env.logo,
    donate: config['Donation Enabled'],
    materialList: materialList
  });
    
});

router.get('/csv', async function(req, res, next) {
  const priceRefQuery = await db.collection(collections['Price-List']).orderBy("DateTime", "desc").limit(1).get();
  if (priceRefQuery.empty) {
    const error = "Fatal error: No price list found.";
    console.log(error);
    res.send(error);
    return;
  }
  const priceRef = priceRefQuery.docs[0].data();

  const demandRefQuery = await db.collection(collections['Demand-List']).orderBy("DateTime", "desc").limit(1).get();
  if (demandRefQuery.empty) {
    const error = "Fatal error: No demand list found.";
    console.log(error);
    res.send(error);
    return;
  }
  const demandRef = demandRefQuery.docs[0].data();

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

module.exports = router;
