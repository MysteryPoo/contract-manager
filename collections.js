
const live = {
    "Price-List": "Price-List",
    "Settings": "Settings",
    "Sell-Orders": "Sell-Orders",
    "Buy-Orders": "Buy-Orders"
};

const debug = {
    "Price-List": "Price-List-Debug",
    "Settings": "Settings-Debug",
    "Sell-Orders": "Sell-Orders-Debug",
    "Buy-Orders": "Buy-Orders-Debug"
};

module.exports = process.env.debug ? debug : live;
