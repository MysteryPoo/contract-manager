var express = require('express');
var router = express.Router();
const materials = require('../materials');

const admin = require('firebase-admin');

const db = admin.firestore();

router.get('/', async function(req, res, next) {

  const configRefQuery = await db.collection('Settings').doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
        return;
    }
    const config = configRefQuery.data();

  const priceRefQuery = await db.collection('Price-List').orderBy("DateTime", "desc").limit(1).get();
  if (priceRefQuery.empty) {
    const error = "Fatal error: No price list found.";
    console.log(error);
    res.send(error);
    return;
  }

  const priceRef = priceRefQuery.docs[0].data();

  let oreValues = {};
  let mineralValues = {};
  let planetaryValues = {};
  let salvageValues = {};
  let datacoreValues = {};

  let sellWeight = Number(priceRef['Sell Weight']);
  let buyWeight = Number(priceRef['Buy Weight']);

  for (ore of materials.ores) {
    let oreNoSpace = ore.replace(/ /g, "");
    oreValues[oreNoSpace] = priceRef[ore] * sellWeight;
  }

  for (mineral of materials.minerals) {
      let mineralNoSpace = mineral.replace(/ /g, "");
      mineralValues[mineralNoSpace] = priceRef[mineral] * sellWeight;
  }

  for (planetary of materials.planetary) {
      let planetaryNoSpace = planetary.replace(/ /g, "");
      planetaryValues[planetaryNoSpace] = priceRef[planetary] * sellWeight;
  }

  for (salvage of materials.salvage) {
      let salvageNoSpace = salvage.replace(/ /g, "");
      salvageValues[salvageNoSpace] = priceRef[salvage] * sellWeight;
  }

  for (datacore of materials.datacores) {
      let datacoreNoSpace = datacore.replace(/ /g, "");
      datacoreValues[datacoreNoSpace] = priceRef[datacore] * sellWeight;
  }

  res.render('sellOrder', {
    title: `${config['Organization']} Material (Sell) Contract`,
    ores: oreValues,
    minerals: mineralValues,
    planetary: planetaryValues,
    salvage: salvageValues,
    datacores: datacoreValues
  });
    
});

router.get('/csv', async function(req, res, next) {
  const priceRefQuery = await db.collection('Price-List').orderBy("DateTime", "desc").limit(1).get();
  if (priceRefQuery.empty) {
    const error = "Fatal error: No price list found.";
    console.log(error);
    res.send(error);
    return;
  }

  const priceRef = priceRefQuery.docs[0].data();

  let oreValues = {};
  let mineralValues = {};
  let planetaryValues = {};
  let salvageValues = {};
  let datacoreValues = {};

  let sellWeight = Number(priceRef['Sell Weight']);
  let buyWeight = Number(priceRef['Buy Weight']);

  for (ore of materials.ores) {
    let oreNoSpace = ore.replace(/ /g, "");
    oreValues[oreNoSpace] = priceRef[ore];
  }

  for (mineral of materials.minerals) {
      let mineralNoSpace = mineral.replace(/ /g, "");
      mineralValues[mineralNoSpace] = priceRef[mineral];
  }

  for (planetary of materials.planetary) {
      let planetaryNoSpace = planetary.replace(/ /g, "");
      planetaryValues[planetaryNoSpace] = priceRef[planetary];
  }

  for (salvage of materials.salvage) {
      let salvageNoSpace = salvage.replace(/ /g, "");
      salvageValues[salvageNoSpace] = priceRef[salvage];
  }

  for (datacore of materials.datacores) {
      let datacoreNoSpace = datacore.replace(/ /g, "");
      datacoreValues[datacoreNoSpace] = priceRef[datacore];
  }

  let returnValue = "";

  for (const [key, value] of Object.entries(oreValues)) {
    returnValue += key + ",";
  }
  for (const [key, value] of Object.entries(mineralValues)) {
    returnValue += key + ",";
  }
  for (const [key, value] of Object.entries(planetaryValues)) {
    returnValue += key + ",";
  }
  for (const [key, value] of Object.entries(salvageValues)) {
    returnValue += key + ",";
  }
  for (const [key, value] of Object.entries(datacoreValues)) {
    returnValue += key + ",";
  }
  returnValue += "Sell Weight, Buy Weight, DateTime";
  returnValue += "\n";

  for (const [key, value] of Object.entries(oreValues)) {
    returnValue += value + ",";
  }
  for (const [key, value] of Object.entries(mineralValues)) {
    returnValue += value + ",";
  }
  for (const [key, value] of Object.entries(planetaryValues)) {
    returnValue += value + ",";
  }
  for (const [key, value] of Object.entries(salvageValues)) {
    returnValue += value + ",";
  }
  for (const [key, value] of Object.entries(datacoreValues)) {
    returnValue += value + ",";
  }
  returnValue += `${sellWeight}, ${buyWeight}, ${priceRef['DateTime']}`;

  res.set('Content-Type', 'text/plain');
  res.send(returnValue);
});

module.exports = router;
