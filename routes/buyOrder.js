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

  const priceRefQuery = await db.collection(collections['Price-List']).orderBy("DateTime", "desc").limit(1).get();
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
    oreValues[oreNoSpace] = priceRef[ore] * buyWeight;
  }

  for (mineral of materials.minerals) {
      let mineralNoSpace = mineral.replace(/ /g, "");
      mineralValues[mineralNoSpace] = priceRef[mineral] * buyWeight;
  }

  for (planetary of materials.planetary) {
      let planetaryNoSpace = planetary.replace(/ /g, "");
      planetaryValues[planetaryNoSpace] = priceRef[planetary] * buyWeight;
  }

  for (salvage of materials.salvage) {
      let salvageNoSpace = salvage.replace(/ /g, "");
      salvageValues[salvageNoSpace] = priceRef[salvage] * buyWeight;
  }

  for (datacore of materials.datacores) {
      let datacoreNoSpace = datacore.replace(/ /g, "");
      datacoreValues[datacoreNoSpace] = priceRef[datacore] * buyWeight;
  }

  res.render('buyOrder', {
    title: `${config['Organization']} Material (Buy) Contract`,
    ores: oreValues,
    minerals: mineralValues,
    planetary: planetaryValues,
    salvage: salvageValues,
    datacores: datacoreValues
  });
    
});

module.exports = router;
