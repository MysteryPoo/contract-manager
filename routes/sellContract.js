var express = require('express');
var router = express.Router();
const materials = require('../materials')

const admin = require('firebase-admin');

const db = admin.firestore();

router.post('/', async function(req, res, next) {
    let ticketNumber = 1;
    const ordersRefQuery = await db.collection('Sell-Orders').orderBy("TicketNumber", "desc").limit(1).get();
    let orderRef = undefined;
    if (!ordersRefQuery.empty) {
        orderRef = ordersRefQuery.docs[0].data();
        ticketNumber = Number(orderRef['TicketNumber']) + 1;
    }

    const priceRefQuery = await db.collection('Price-List').orderBy("DateTime", "desc").limit(1).get();
    
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
    priceTotal *= priceRef['Sell Weight'];

    await db.collection('Sell-Orders').doc(ticketNumber.toString()).set(order);

    res.render('sellContract', {
        title: 'Sell Contract',
        status: "Preview",
        ticket: ticketNumber,
        total: priceTotal,
        materialOrder: materialList
    });
});

router.post('/confirm', async function(req, res, next) {
    const ticketNumber = req.body.formTicketNumber;

    const orderRefQuery = await db.collection('Sell-Orders').where("TicketNumber", "==", Number(ticketNumber)).get();
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

    await db.collection('Sell-Orders').doc(ticketNumber).update({
        'Status': 'Pending'
    });
    console.log(`Ticket number (${ticketNumber})(Sell) confirmed and moved to 'Pending' status.`);


    const priceRefQuery = await db.collection('Price-List').where('DateTime', "==", orderRef['DateTime']).get();
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
    priceTotal *= priceRef['Sell Weight'];

    res.render('sellContract', {
        title: 'Sell Contract',
        status: "Pending",
        ticket: ticketNumber,
        total: priceTotal,
        materialOrder: materialOrder
    });
});

module.exports = router;
