let traveler = require('traveler');
let util = require('util');

// Game.spawns["Spawn5"].createCreep([WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE], "remoteharvester_1", {role:"remoteharvester", keepAlive:true, stage: 0 }); Game.spawns["Spawn1"].createCreep([CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE], "carrier_1", {role:"carrier", keepAlive:true, stage: 0 })

let roleCarrier = {
	/** @param {Creep} creep **/
	run: function(creep) {
		// TEMP set harvest target for testing
		// creep.memory.harvestTarget = {
		// 	id: "55c34a6b5be41a0a6e80c5b5",
		// 	x: 29,
		// 	y: 43,
		// 	roomName: "W15N9",
		// 	harvestPos: { x: 30, y: 44 },
		// };
		creep.memory.depositTarget = "5b843ec8f656bb71dce8978d";

		if (!creep.memory.harvestTarget) {
			console.log(creep.name, "ERR: no harvest target, this needs to be assigned by a job (similar to how relays are assigned)");
			return;
		}
		if (!creep.memory.depositTarget) {
			console.log(creep.name, "ERR: need deposit target");
			return;
		}

		if (!creep.memory.delivering && creep.room.name !== creep.memory.harvestTarget.roomName) {
			creep.travelTo(new RoomPosition(creep.memory.harvestTarget.x, creep.memory.harvestTarget.y, creep.memory.harvestTarget.roomName));
			return;
		}
		let harvestPos = new RoomPosition(creep.memory.harvestTarget.harvestPos.x, creep.memory.harvestTarget.harvestPos.y, creep.memory.harvestTarget.roomName);

		if (!creep.memory.droppedEnergyId) {
			let lookResult = harvestPos.lookFor(LOOK_RESOURCES);
			if (lookResult.length > 0) {
				creep.memory.droppedEnergyId = lookResult[0].id;
			}
		}

		let harvestTarget = Game.getObjectById(creep.memory.harvestTarget.id);
		if (!harvestTarget) {
			console.log(creep.name, "CRITICAL: Unable to access harvest target");
			return;
		}

		if (creep.memory.delivering && _.sum(creep.carry) == 0) {
			creep.memory.delivering = false;
		}
		else if (!creep.memory.delivering && _.sum(creep.carry) == creep.carryCapacity) {
			creep.memory.delivering = true;
		}

		if (creep.memory.delivering) {
			let depositTarget = Game.getObjectById(creep.memory.depositTarget);
			if (creep.pos.isNearTo(depositTarget)) {
				creep.transfer(depositTarget, RESOURCE_ENERGY);
			}
			else {
				creep.travelTo(depositTarget);
			}
		}
		else {
			let dropped = Game.getObjectById(creep.memory.droppedEnergyId);
			if (!dropped) {
				delete creep.memory.droppedEnergyId;
			}
			if (creep.pos.isNearTo(harvestPos) && dropped) {
				creep.pickup(dropped);
			}
			else {
				creep.travelTo(harvestPos);
			}
		}
	}
}

module.exports = roleCarrier;
