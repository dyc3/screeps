let traveler = require('traveler');
let util = require('util');

// Game.spawns["Spawn5"].createCreep([WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE], "remoteharvester_1", {role:"remoteharvester", keepAlive:true, stage: 0 }); Game.spawns["Spawn1"].createCreep([CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE], "carrier_1", {role:"carrier", keepAlive:true, stage: 0 })

let roleCarrier = {
	findDespositTarget(creep) {
		if (!creep.memory.harvestTarget) {
			creep.log("Can't find despositTarget without harvestTarget");
			return;
		}

		let rooms = _.filter(util.findClosestOwnedRooms(new RoomPosition(creep.memory.harvestTarget.x, creep.memory.harvestTarget.y, creep.memory.harvestTarget.roomName)), r => r.storage);
		if (rooms.length === 0) {
			creep.log("ERR: All rooms don't have storage");
			return;
		}

		return rooms[0].storage.id;
	},

	passiveMaintainRoads(creep) {
		if (creep.store[RESOURCE_ENERGY] === 0) {
			return;
		}

		let lookResult = creep.pos.look();
		for (let result of lookResult) {
			if (result.type === LOOK_CONSTRUCTION_SITES) {
				creep.build(result.constructionSite);
				if (Game.time % 2 === 0) {
					creep.cancelOrder("moveTo");
				}
				return;
			}
			else if (result.type === LOOK_STRUCTURES) {
				if (result.structure.hits < result.structure.hitsMax) {
					creep.repair(result.structure);
				}
				return;
			}
		}
	},

	/** @param {Creep} creep **/
	run: function(creep) {
		if (!creep.memory.depositTarget) {
			creep.memory.depositTarget = this.findDespositTarget(creep);
		}

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

		if (creep.memory.delivering && _.sum(creep.store) == 0) {
			creep.memory.delivering = false;
		}
		else if (!creep.memory.delivering && _.sum(creep.store) == creep.carryCapacity) {
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
			if (creep.pos.isEqualTo(harvestPos)) {
				creep.move([TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT, TOP][Math.floor(Math.random() * 4)]);
				return;
			}
			let dropped = Game.getObjectById(creep.memory.droppedEnergyId);
			if (!dropped) {
				delete creep.memory.droppedEnergyId;
			}
			if (!creep.pos.isNearTo(harvestPos)) {
				creep.travelTo(harvestPos);
			}
			else if (dropped) {
				creep.pickup(dropped);
			}
		}

		this.passiveMaintainRoads(creep);
	}
}

module.exports = roleCarrier;
