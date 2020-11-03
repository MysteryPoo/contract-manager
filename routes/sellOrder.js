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
      user: req.user,
      success: req.flash('success'),
      error: req.flash('error'),
      feature: "Sell Order"
    });
    return;
  }

  const priceRefQuery = await db.collection(collections['Price-List']).orderBy("DateTime", "desc").limit(1).get();
  if (priceRefQuery.empty) {
    const error = "Fatal error: No price list found.";
    console.log(error);
    req.flash('error', error);
    res.redirect('/');
    return;
  }
  const priceRef = priceRefQuery.docs[0].data();

  const demandRefQuery = await db.collection(collections['Demand-List']).orderBy("DateTime", "desc").limit(1).get();
  if (demandRefQuery.empty) {
    const error = "Fatal error: No demand list found.";
    console.log(error);
    req.flash('error', error);
    res.redirect('/');
    return;
  }
  const demandRef = demandRefQuery.docs[0].data();

  let materialList = {};

  let sellWeight = Number(priceRef['Sell Weight']);
  let buyWeight = Number(priceRef['Buy Weight']);

  for (let category in materials) {
    if (config['Categories']) {
      if (!config['Categories'][category]) {
        continue;
      }
    }
    for (let material of materials[category]) {
      let materialNoSpace = material.replace(/ /g, "");
      if (materialList[category] == undefined) {
        materialList[category] = {};
      }
      if (materialList[category][material] == undefined) {
        materialList[category][material] = {};
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
      materialList[category][material]['price'] = basePrice * sellWeight * demandRef['Demands'][demand];
      materialList[category][material]['demand'] = demand;
    }
  }

  res.render('sellOrder', {
    title: `${config['Organization']} Sell Contract`,
    banner: process.env.banner,
    logo: process.env.logo,
    user: req.user,
    donate: config['Donation Enabled'],
    success: req.flash('success'),
    error: req.flash('error'),
    materialList: materialList,
    priceTime: priceRef['DateTime'],
    demandTime: demandRef['DateTime']
  });
    
});

router.get('/:ticketNumber', async function(req, res, next) {

  if (!req.user) {
    req.flash('error', 'Unable to edit this order.');
    res.redirect('/');
    return;
  }

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
      user: req.user,
      feature: "Sell Order"
    });
    return;
  }

  const typeNoCase = "Sell";
  const ticketNumber = req.params.ticketNumber;
  const orderRefQuery = await db.collection(collections[`${typeNoCase}-Orders`]).where("TicketNumber", "==", Number(ticketNumber)).get();
  if (orderRefQuery.empty) {
    let error = `Cannot find order with ticket number: ${ticketNumber}`;
    console.log(error);
    req.flash('error', error);
    res.redirect(req.baseUrl);
    return;
  }
  const orderRef = orderRefQuery.docs[0].data();

  const priceRefQuery = await db.collection(collections['Price-List']).orderBy("DateTime", "desc").limit(1).get();
  if (priceRefQuery.empty) {
    const error = "Fatal error: No price list found.";
    console.log(error);
    req.flash('error', error);
    res.redirect(req.baseUrl);
    return;
  }
  const priceRef = priceRefQuery.docs[0].data();

  const demandRefQuery = await db.collection(collections['Demand-List']).orderBy("DateTime", "desc").limit(1).get();
  if (demandRefQuery.empty) {
    const error = "Fatal error: No demand list found.";
    console.log(error);
    req.flash('error', error);
    res.redirect(req.baseUrl);
    return;
  }
  const demandRef = demandRefQuery.docs[0].data();

  let materialList = {};

  let sellWeight = Number(priceRef['Sell Weight']);
  let buyWeight = Number(priceRef['Buy Weight']);

  for (let category in materials) {
    if (config['Categories']) {
      if (!config['Categories'][category]) {
        continue;
      }
    }
    for (let material of materials[category]) {
      let materialNoSpace = material.replace(/ /g, "");
      if (materialList[category] == undefined) {
        materialList[category] = {};
      }
      if (materialList[category][material] == undefined) {
        materialList[category][material] = {};
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
      materialList[category][material]['price'] = basePrice * sellWeight * demandRef['Demands'][demand];
      materialList[category][material]['demand'] = demand;
      materialList[category][material]['units'] = orderRef[material];
    }
  }

  res.render('sellOrder', {
    title: `${config['Organization']} Sell Contract`,
    banner: process.env.banner,
    logo: process.env.logo,
    user: req.user,
    donate: config['Donation Enabled'],
    materialList: materialList,
    ticketNumber: ticketNumber
  });
});

router.get('/csv', async function(req, res, next) {
  redirect('/api/csv');
});

module.exports = router;
