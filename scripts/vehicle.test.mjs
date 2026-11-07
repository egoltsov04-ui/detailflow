import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseVehicle,formatPlate,findBrand} from '../src/lib/vehicle.ts'

test('Ukrainian plates are recognised in Cyrillic or Latin and formatted AA 1234 BB',()=>{
 assert.deepEqual(formatPlate('аа1234вв'),{text:'AA 1234 BB',ua:true})
 assert.deepEqual(formatPlate('KA 0101 CI'),{text:'KA 0101 CI',ua:true})
 assert.deepEqual(formatPlate('ВН-7777-ОО'),{text:'BH 7777 OO',ua:true})
 // foreign or non-standard plates keep their text and never get the UA band
 assert.deepEqual(formatPlate('WX 12345'),{text:'WX 12345',ua:false})
 assert.deepEqual(formatPlate('TEST 001'),{text:'TEST 001',ua:false})
})

test('vehicle strings split into brand, name and plate',()=>{
 const a=parseVehicle({label:'Mercedes-Benz GLE · АА 1234 ВВ'})
 assert.equal(a.brand?.key,'mercedes');assert.equal(a.brand?.letters,'MB');assert.equal(a.name,'Mercedes-Benz GLE');assert.equal(a.plate,'AA 1234 BB');assert.equal(a.uaPlate,true)
 const b=parseVehicle({label:'BMW · X5 · KA0101CI · подряпина на дверях'})
 assert.equal(b.brand?.key,'bmw');assert.equal(b.brand?.logo,true);assert.equal(b.name,'BMW X5 подряпина на дверях');assert.equal(b.plate,'KA 0101 CI')
 const c=parseVehicle({label:'BMW X5 · READY'})
 assert.equal(c.plate,'');assert.equal(c.name,'BMW X5 READY')
 const d=parseVehicle({make:'Тойота',model:'Camry',plate:'ВІ5555АХ'})
 assert.equal(d.brand?.key,'toyota');assert.equal(d.name,'Тойота Camry');assert.equal(d.plate,'BI 5555 AX')
 assert.equal(parseVehicle({label:'Без авто'}).brand,null)
})

test('longer aliases win: Range Rover is not Land Rover, VW is Volkswagen',()=>{
 assert.equal(findBrand('Range Rover Sport')?.key,'rangerover')
 assert.equal(findBrand('Land Rover Defender')?.key,'landrover')
 assert.equal(findBrand('VW Passat')?.key,'volkswagen')
 assert.equal(findBrand('Minimal sedan'),null)
})
