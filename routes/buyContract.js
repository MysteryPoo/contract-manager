var express = require('express');
var router = express.Router();
const materials = require('../materials');
const collections = require('../collections');

const admin = require('firebase-admin');

const db = admin.firestore();

router.post('/', async function(req, res, next) {
    let ticketNumber = 1;
    const ordersRefQuery = await db.collection(collections['Buy-Orders']).orderBy("TicketNumber", "desc").limit(1).get();
    let orderRef = undefined;
    if (!ordersRefQuery.empty) {
        orderRef = ordersRefQuery.docs[0].data();
        ticketNumber = Number(orderRef['TicketNumber']) + 1;
    }

    const priceRefQuery = await db.collection(collections['Price-List']).orderBy("DateTime", "desc").limit(1).get();
    
    let priceRef = priceRefQuery.docs[0].data();

    let dateTime = priceRef['DateTime'];

    let order = {
        'DateTime': dateTime,
        'CharacterName': req.body['form-character-name'],
        'DiscordName': req.body['form-discord-name'],
        'TicketNumber': ticketNumber,
        'Status': "Preview"
    };

    let materialList = {};

    let priceTotal = 0;

    for (ore of materials.ores) {
        let oreNoSpace = ore.replace(/ /g, "");
        priceTotal += Number(req.body[`form-${oreNoSpace}`]) * priceRef[ore];
        order[ore] = Number(req.body[`form-${oreNoSpace}`]);
        if (order[ore] > 0) {
            materialList[oreNoSpace] = order[ore];
        }
    }

    for (mineral of materials.minerals) {
        let mineralNoSpace = mineral.replace(/ /g, "");
        priceTotal += Number(req.body[`form-${mineralNoSpace}`]) * priceRef[mineral];
        order[mineral] = Number(req.body[`form-${mineralNoSpace}`]);
        if (order[mineral] > 0) {
            materialList[mineralNoSpace] = order[mineral];
        }
    }

    for (planetary of materials.planetary) {
        let planetaryNoSpace = planetary.replace(/ /g, "");
        priceTotal += Number(req.body[`form-${planetaryNoSpace}`]) * priceRef[planetary];
        order[planetary] = Number(req.body[`form-${planetaryNoSpace}`]);
        if (order[planetary] > 0) {
            materialList[planetaryNoSpace] = order[planetary];
        }
    }

    for (salvage of materials.salvage) {
        let salvageNoSpace = salvage.replace(/ /g, "");
        priceTotal += Number(req.body[`form-${salvageNoSpace}`]) * priceRef[salvage];
        order[salvage] = Number(req.body[`form-${salvageNoSpace}`]);
        if (order[salvage] > 0) {
            materialList[salvageNoSpace] = order[salvage];
        }
    }

    for (datacore of materials.datacores) {
        let datacoreNoSpace = datacore.replace(/ /g, "");
        priceTotal += Number(req.body[`form-${datacoreNoSpace}`]) * priceRef[datacore];
        order[datacore] = Number(req.body[`form-${datacoreNoSpace}`]);
        if (order[datacore] > 0) {
            materialList[datacoreNoSpace] = order[datacore];
        }
    }
    priceTotal *= priceRef['Buy Weight'];


    let success = true;
    await db.collection(collections['Buy-Orders']).doc(ticketNumber.toString()).set(order);

    res.render('buyContract', {
        title: 'Buy Contract',
        status: 'Preview',
        ticket: ticketNumber,
        total: priceTotal,
        materialOrder: materialList
    });
});

router.post('/confirm', async function(req, res, next) {
    const ticketNumber = req.body.formTicketNumber;

    const configRefQuery = await db.collection(collections['Settings']).doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
        return;
    }
    const config = configRefQuery.data();

    const orderRefQuery = await db.collection(collections['Buy-Orders']).where("TicketNumber", "==", Number(ticketNumber)).get();
    if (orderRefQuery.empty) {
        let error = `Cannot find order with ticket number: ${ticketNumber}`;
        console.log(error);
        res.send(error);
        return;
    }
    const orderRef = orderRefQuery.docs[0].data();

    if (orderRef['Status'] !== "Preview") {
        let error = `You cannot modify this order ${ticketNumber}`;
        console.log(error);
        res.send(error);
    }

    await db.collection('Buy-Orders').doc(ticketNumber).update({
        'Status': 'Pending'
    });
    console.log(`Ticket number (${ticketNumber})(Buy) confirmed and moved to 'Pending' status.`);


    const priceRefQuery = await db.collection(collections['Price-List']).where('DateTime', "==", orderRef['DateTime']).get();
    if (priceRefQuery.empty) {
        let error = `Cannot find price reference sheet dated: ${orderRef['DateTime']}`;
        console.log(error);
        res.send(error);
        return;
    }
    const priceRef = priceRefQuery.docs[0].data();

    let priceTotal = 0;

    let materialOrder = {};

    for (material of materials.ores) {
        let materialNoSpace = material.replace(/ /g, "");
        if (orderRef[material] !== 0) {
            materialOrder[materialNoSpace] = orderRef[material];
            priceTotal += orderRef[material] * priceRef[material];
        }
    }

    for (material of materials.minerals) {
        let materialNoSpace = material.replace(/ /g, "");
        if (orderRef[material] !== 0) {
            materialOrder[materialNoSpace] = orderRef[material];
            priceTotal += orderRef[material] * priceRef[material];
        }
    }

    for (material of materials.planetary) {
        let materialNoSpace = material.replace(/ /g, "");
        if (orderRef[material] !== 0) {
            materialOrder[materialNoSpace] = orderRef[material];
            priceTotal += orderRef[material] * priceRef[material];
        }
    }

    for (material of materials.salvage) {
        let materialNoSpace = material.replace(/ /g, "");
        if (orderRef[material] !== 0) {
            materialOrder[materialNoSpace] = orderRef[material];
            priceTotal += orderRef[material] * priceRef[material];
        }
    }

    for (material of materials.datacores) {
        let materialNoSpace = material.replace(/ /g, "");
        if (orderRef[material] !== 0) {
            materialOrder[materialNoSpace] = orderRef[material];
            priceTotal += orderRef[material] * priceRef[material];
        }
    }
    priceTotal *= priceRef['Buy Weight'];

    res.render('buyContract', {
        title: 'Buy Contract',
        contractContact: config['ContractContact'],
        status: "Pending",
        ticket: ticketNumber,
        total: priceTotal,
        materialOrder: materialOrder
    });
});

module.exports = router;
