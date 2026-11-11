import fs from 'node:fs';import assert from 'node:assert/strict';
const rows=JSON.parse(fs.readFileSync('rows.json'));
assert.equal(rows.reduce((sum,row)=>sum+row.quantity*row.price,0),83);
assert.equal(rows.length,3);console.log('CALCULATED_TOTAL_83');
