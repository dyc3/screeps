let traveler = require('traveler');
let util = require('util');

let roleRemoteHarvester = {
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

		if (!creep.memory.harvestTarget) {
			console.log(creep.name, "ERR: no harvest target, this needs to be assigned by a job (similar to how relays are assigned)");
			return;
		}

		// console.log(creep.name, "observe result:", observer.observeRoom(creep.memory.harvestTarget.roomName));
		if (creep.room.name !== creep.memory.harvestTarget.roomName) {
			creep.travelTo(new RoomPosition(creep.memory.harvestTarget.x, creep.memory.harvestTarget.y, creep.memory.harvestTarget.roomName));
			return;
		}

		let harvestTarget = Game.getObjectById(creep.memory.harvestTarget.id);
		if (!harvestTarget) {
			console.log(creep.name, "CRITICAL: Unable to access harvest target");
			return;
		}

		// TODO: cache path to harvest target
		let harvestPos = new RoomPosition(creep.memory.harvestTarget.harvestPos.x, creep.memory.harvestTarget.harvestPos.y, creep.memory.harvestTarget.roomName);
		if (util.isTreasureRoom(harvestTarget.room.name)) {
			let hostiles = harvestTarget.pos.findInRange(FIND_HOSTILE_CREEPS, 7);
			if (hostiles.length > 0) {
				creep.travelTo(Game.creeps[creep.memory.harvestTarget.creepCarrier]);
				return;
			}

			let lairs = harvestTarget.pos.findInRange(FIND_HOSTILE_STRUCTURES, 7).filter(struct => struct.structureType === STRUCTURE_KEEPER_LAIR);
			if (lairs.length > 0 && lairs[0].ticksToLive < 20) {
				creep.travelTo(Game.creeps[creep.memory.harvestTarget.creepCarrier]);
				return;
			}
		}

		if (!creep.pos.isEqualTo(harvestPos)) {
			creep.travelTo(harvestPos);
			return;
		}

		if (harvestTarget.energy > 0) {
			creep.harvest(harvestTarget);
		}
		else {
			if (harvestTarget.ticksToRegenerate > 30 && creep.ticksToLive < 300) {
				creep.memory.renewing = true;
			}
		}
	},
}

module.exports = roleRemoteHarvester;
