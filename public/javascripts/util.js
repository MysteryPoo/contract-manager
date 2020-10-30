
// Opera 8.0+
var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;

// Firefox 1.0+
var isFirefox = typeof InstallTrigger !== 'undefined';

// Safari 3.0+ "[object HTMLElementConstructor]" 
var isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification));

// Internet Explorer 6-11
var isIE = /*@cc_on!@*/false || !!document.documentMode;

// Edge 20+
var isEdge = !isIE && !!window.StyleMedia;

// Chrome 1 - 79
var isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);

// Edge (based on chromium) detection
var isEdgeChromium = isChrome && (navigator.userAgent.indexOf("Edg") != -1);

// Blink engine detection
var isBlink = (isChrome || isOpera) && !!window.CSS;

function updateSellWeight(value, realValue) {
    if (realValue) {
        document.getElementById('new-sell-weight').value=value;
    } else {
        document.getElementById('form-sell-weight').value=value;
    }
    
};

function updateBuyWeight(value, realValue) {
    if (realValue) {
        document.getElementById('new-buy-weight').value=value;
    } else {
        document.getElementById('form-buy-weight').value=value;
    }
    
};

function updateRange(element, index) {
    let value = element.value;

    document.getElementById(`demand-${index}-valueText`).value = value;
    document.getElementById(`demand-${index}-value`).value = value;
};

function updateOptionName(element, index) {
    let value = element.value;

    let selectList = document.getElementsByClassName("uk-select");
    for (let i = 0; i < selectList.length; ++i) {
        selectList[i].options[index].text = value;
    }
};

function addDemand() {
    let demandList = document.getElementById('demand-list');
    let children = demandList.children;

    let name = document.createElement("input");
    name.setAttribute("class", "uk-input");
    name.setAttribute("placeholder", "Name");
    name.setAttribute("id", `demand-${children.length}-name`);
    name.setAttribute("name", `demand-${children.length}-name`);
    name.setAttribute("required", "true");
    name.setAttribute("onchange", `updateOptionName(this, ${children.length - 1});`);

    let valueText = document.createElement("input");
    valueText.setAttribute("class", "uk-input");
    valueText.setAttribute("id", `demand-${children.length}-valueText`);
    valueText.setAttribute("type", "float");
    valueText.setAttribute("value", "1.0");
    valueText.setAttribute("name", `demand-${children.length}-valueText`);
    valueText.setAttribute("required", "true");
    valueText.setAttribute("onchange", `updateRange(this, ${children.length});`);

    let value = document.createElement("input");
    value.setAttribute("class", "uk-range");
    value.setAttribute("type", "range");
    value.setAttribute("id", `demand-${children.length}-value`);
    value.setAttribute("name", `demand-${children.length}-value`);
    value.setAttribute("min", "0");
    value.setAttribute("max", "2");
    value.setAttribute("step", "0.05");
    value.setAttribute("value", "1.0");
    value.setAttribute("onchange", `updateRange(this, ${children.length});`);
    
    let button = document.createElement("button");
    button.setAttribute("class", "uk-button uk-button-default");
    button.appendChild(document.createTextNode("Remove"));
    button.setAttribute("onclick", `removeDemand(${children.length});`);

    let card = document.createElement("div");
    card.setAttribute("class", "uk-card uk-card-body");
    card.setAttribute("id", `demand-${children.length}`);
    card.appendChild(name);
    card.appendChild(valueText);
    card.appendChild(value);
    card.appendChild(button);
    demandList.appendChild(card);

    let selectList = document.getElementsByClassName("uk-select");
    for (let i = 0; i < selectList.length; ++i) {
        var option = document.createElement("option");
        option.text = "";
        selectList[i].add(option);
    }

    document.getElementById('demand-count').value = demandList.children.length - 1;
};

function removeDemand(index) {
    let demandList = document.getElementById('demand-list');
    let toRemove = document.getElementById(`demand-${index}`);
    let name = document.getElementById(`demand-${index}-name`).value;
    demandList.removeChild(toRemove);

    let selectList = document.getElementsByClassName("uk-select");
    for (let i = 0; i < selectList.length; ++i) {
        for(let op = 0; op < selectList[i].options.length; ++op) {
            if (selectList[i].options[op].text == name) {
                selectList[i].remove(op);
                break;
            }
        }
    }

    document.getElementById('demand-count').value = demandList.children.length - 1;
};

document.onpaste = function(e) {
  var pastedText = isIE ? window.clipboardData.getData('Text') : e.clipboardData.getData('text/plain');

  let table = [];
  let tableFirstPass = pastedText.split("\n");

  for (let row of tableFirstPass) {
      let rowSplit = row.split("\t");
      let newRow = [];
      for (let element of rowSplit) {
          let newElement = element.replace(/\-/g, " ").replace(/ /g, "");
          newRow.push(newElement);
      }
      table.push(newRow);
  }

  for (let row of table) {
      for (let i = 0; i < 12; i += 1) {
        let name = row[i];
        let required = Math.ceil(Number(row[i + 1].replace(/,/g,"")));
        let cost = Math.ceil(Number(row[i + 2].replace(/,/g,"")));

        
        if (name !== "" && Number(name).toString() === "NaN" && required.toString() !== "NaN" && cost.toString() !== "NaN") {
            let dataPoint = {
                name: name,
                required: required
            };
            let field = document.getElementById(`form-${dataPoint.name}`);
            if (field) {
                field.value = dataPoint.required.toString();
            }
        }
      }
  }
  
  return false; // Prevent the default handler from running.
};

$(document).ready(() => {
    const stockURI = "/api/stock";
    setInterval(() => {
        const pathRegEx = /\/buyOrder.*/;
        if (!window.location.pathname.match(pathRegEx)) {
            return;
        }
        $.getJSON(stockURI, (result) => {
            for (const [material, stock] of Object.entries(result)) {
                let materialNoSpace = material.replace(/ /g, "");
                if ($(`form-${materialNoSpace}`)) {
                    let maxString = `Units In-Stock: ${(stock ? stock.toLocaleString(undefined) : false) || 'Disabled'}`;
                    let oldStock = Number($(`#form-${materialNoSpace}`).attr('max'));
                    if (oldStock != stock) {
                        $(`#form-${materialNoSpace}`).attr({
                            'max': stock || 0
                        });
                        $(`#form-label-${materialNoSpace}`).text(maxString);
                        $(`#form-label-${materialNoSpace}`).addClass('uk-animation-shake');
                        setTimeout(() => {
                            $(`#form-label-${materialNoSpace}`).removeClass('uk-animation-shake');
                        }, 500);
                    }
                }
            }
            
        });
    }, 1000);
});
