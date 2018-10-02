let util = require('util');

let roleRelay = {
	run: function(creep) {
		if (!creep.memory.assignedPos) {
			creep.say("needs pos");
			return;
		}

		let assignedPos = creep.room.getPositionAt(creep.memory.assignedPos.x, creep.memory.assignedPos.y);
		if (!creep.pos.isEqualTo(assignedPos)) {
			let result = creep.moveTo(assignedPos);
			// console.log(creep.name, "MOVE TO ASSIGNED POS:", result);
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
			creep.memory.storageId = foundStorage[0].id;
		}
		let link = Game.getObjectById(creep.memory.linkId);
		let storage = Game.getObjectById(creep.memory.storageId);

		if (!creep.memory.fillTargetIds || creep.memory.fillTargetIds.length == 0) {
			let adjacentStructs = _.filter(creep.room.lookForAtArea(LOOK_STRUCTURES, creep.pos.y - 1, creep.pos.x - 1, creep.pos.y + 1, creep.pos.x + 1, asArray=true), (result) =>
				// _.has(result.structure, "energy") &&
				result.structure.structureType != STRUCTURE_CONTAINER &&
				result.structure.structureType != STRUCTURE_STORAGE &&
				result.structure.structureType != STRUCTURE_TERMINAL &&
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
			creep.memory.lastWithdrawFromLink = true;
			if (creep.withdraw(link, RESOURCE_ENERGY) == ERR_NOT_ENOUGH_RESOURCES) {
				creep.withdraw(storage, RESOURCE_ENERGY);
				creep.memory.lastWithdrawFromLink = false;
			}
		}

		// check if all the fill targets are full.
		let targetIdsNotFull = _.filter(creep.memory.fillTargetIds, (id) => {
			let struct = Game.getObjectById(id);
			return struct.energy < struct.energyCapacity;
		});

		// if they aren't, fill them, then return
		if (targetIdsNotFull.length > 0) {
			for (let i = 0; i < targetIdsNotFull.length; i++) {
				const target = Game.getObjectById(targetIdsNotFull[i]);
				creep.transfer(target, RESOURCE_ENERGY);
			}
			return;
		}

		// otherwise, fill the storage with energy from the link.
		if (creep.memory.lastWithdrawFromLink) {
			creep.transfer(storage, RESOURCE_ENERGY);
		}
	}
};

module.exports = roleRelay;