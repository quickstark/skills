'use strict';
function lineTotal(unitPrice, quantity) {
  const count = quantity || 1;
  return unitPrice * count;
}
module.exports = { lineTotal };
