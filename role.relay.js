var traveler = require('traveler');
let util = require('util');

let roleRelay = {
	run: function(creep) {
		if (!creep.memory.assignedPos) {
			creep.say("needs pos");
			return;
		}

		let assignedPos = new RoomPosition(creep.memory.assignedPos.x, creep.memory.assignedPos.y, creep.memory.assignedPos.roomName);
		if (!creep.pos.isEqualTo(assignedPos)) {
			let result = creep.travelTo(assignedPos);
			if (result != 0) {
			    console.log(creep.name, "MOVE TO ASSIGNED POS:", result);
			}
			return;
		}

		if (!creep.memory.linkId || !creep.memory.storageId) {
			let foundLinks = creep.pos.findInRange(FIND_STRUCTURES, 1, { filter: (s) => {
				return s.structureType == STRUCTURE_LINK;
			}});
			creep.memory.linkId = foundLinks[0].id;

			let foundStorage = creep.pos.findInRange(FIND_STRUCTURES, 1, { filter: (s) => {
				return s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE;
			}});
			if (foundStorage.length > 0) {
				creep.memory.storageId = foundStorage[0].id;
			}
			else {
				console.log(creep.name, "WARN: no found storage");
			}
		}
		let link = Game.getObjectById(creep.memory.linkId);
		let storage = Game.getObjectById(creep.memory.storageId);

		if (!creep.memory.fillTargetIds || creep.memory.fillTargetIds.length == 0) {
			let adjacentStructs = _.filter(creep.room.lookForAtArea(LOOK_STRUCTURES, creep.pos.y - 1, creep.pos.x - 1, creep.pos.y + 1, creep.pos.x + 1, asArray=true), (result) =>
				// _.has(result.structure, "energy") &&
				result.structure.structureType != STRUCTURE_CONTAINER &&
				result.structure.structureType != STRUCTURE_STORAGE &&
				result.structure.structureType != STRUCTURE_ROAD &&
				result.structure.structureType != STRUCTURE_LINK);
			console.log(creep.name, "has", adjacentStructs.length, "adjacent targets");
			let targets = [];
			for (let i = 0; i < adjacentStructs.length; i++) {
				const struct = adjacentStructs[i].structure;
				targets.push(struct.id);
			}
			creep.memory.fillTargetIds = targets;
		}

		if (creep.memory.fillTargetIds.length == 0) {
			console.log(creep.name, "can't find adjacent targets.");
			return;
		}

		// check if the creep is carrying energy, and pick some up if needed
		if (creep.carry[RESOURCE_ENERGY] < creep.carryCapacity) {
			//creep.memory.lastWithdrawFromLink = true;
			if (creep.withdraw(link, RESOURCE_ENERGY) !== OK) {
				creep.withdraw(storage, RESOURCE_ENERGY);
				// creep.memory.lastWithdrawFromLink = false;
			}
		}
		// if (storage.store[RESOURCE_ENERGY] < storage.storeCapacity) {
		//    creep.memory.lastWithdrawFromLink = true;
		// }

		// check if all the fill targets are full.
		let targetIdsNotFull = _.filter(creep.memory.fillTargetIds, (id) => {
			let struct = Game.getObjectById(id);
			if (struct.structureType == STRUCTURE_TERMINAL) {
				return struct.store[RESOURCE_ENERGY] < Memory.terminalEnergyTarget;
			}
			return struct.energy < struct.energyCapacity;
		});

		// if they aren't, fill them, then return
		if (targetIdsNotFull.length > 0) {
			for (let i = 0; i < targetIdsNotFull.length; i++) {
				const target = Game.getObjectById(targetIdsNotFull[i]);
				if (target.structureType == STRUCTURE_TERMINAL && Memory.terminalEnergyTarget - target.store[RESOURCE_ENERGY] < creep.carryCapacity) {
					creep.transfer(target, RESOURCE_ENERGY, Memory.terminalEnergyTarget - target.store[RESOURCE_ENERGY]);
				}
				else {
					creep.transfer(target, RESOURCE_ENERGY);
				}
			}
			return;
		}

		// otherwise, fill the storage with energy from the link.
		//if (creep.memory.lastWithdrawFromLink) {
			creep.transfer(storage, RESOURCE_ENERGY);
		//}
	}
};

module.exports = roleRelay;