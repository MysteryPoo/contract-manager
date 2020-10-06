
const live = {
    "Price-List": "Price-List",
    "Demand-List": "Demand-List",
    "Settings": "Settings",
    "Sell-Orders": "Sell-Orders",
    "Buy-Orders": "Buy-Orders"
};

const debug = {
    "Price-List": "Price-List-Debug",
    "Demand-List": "Demand-List-Debug",
    "Settings": "Settings-Debug",
    "Sell-Orders": "Sell-Orders-Debug",
    "Buy-Orders": "Buy-Orders-Debug"
};

module.exports = process.env.debug ? debug : live;
