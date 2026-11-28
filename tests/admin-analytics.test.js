const test = require('node:test');
const assert = require('node:assert/strict');
const { aggregateAnalytics } = require('../src/utils/admin/analytics');
test('counts only dated events in period and returns aggregate visitor dimensions', () => {
 const records = {locataire:[{createdAt:'2026-11-28T12:00:00Z'},{createdAt:'2025-01-01'}],bailleur:[],annonce:[],alerte:[{createdAt:{seconds:1795867200}}],analitic:[{pages:[{enteredAt:'2026-11-28T10:00:00Z'},{enteredAt:'2026-11-28T11:00:00Z'}],device:{type:'mobile'}},{pages:[{enteredAt:'2020-01-01'}]}]};
 const result=aggregateAnalytics(records,7,new Date('2026-11-28T18:00:00Z'));
 assert.equal(result.series.length,7); assert.equal(result.totals.inscriptions,1);assert.equal(result.totals.visites,2);assert.equal(result.visitors,1);assert.deepEqual(result.devices,[{name:'mobile',value:1}]);assert.deepEqual(result.os,[{name:'Non renseigné',value:1}]);
});
test('empty data produces zero-filled timeline',()=>{const r=aggregateAnalytics({locataire:[],bailleur:[],annonce:[],alerte:[],analitic:[]},30);assert.equal(r.series.length,30);assert.equal(r.visitors,0);assert.equal(r.totals.alertes,0);});
