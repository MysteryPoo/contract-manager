
function updateSellWeight(value, realValue) {
    if (realValue) {
        document.getElementById('new-sell-weight').value=value;
    } else {
        document.getElementById('form-sell-weight').value=value;
    }
    
}

function updateBuyWeight(value, realValue) {
    if (realValue) {
        document.getElementById('new-buy-weight').value=value;
    } else {
        document.getElementById('form-buy-weight').value=value;
    }
    
}
