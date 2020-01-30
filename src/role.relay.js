let traveler = require('traveler');
let util = require('util');

// FIXME: When new structures are built around relays, fillTargetIds does not get updated

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

		if (assignedPos.roomName !== creep.memory.targetRoom) {
			creep.memory.targetRoom = assignedPos.roomName;
		}

		if (!creep.memory.linkId || !creep.memory.storageId) {
			let foundLinks = creep.pos.findInRange(FIND_STRUCTURES, 1, { filter: (s) => {
				return s.structureType == STRUCTURE_LINK;
			}});
			if (foundLinks.length == 0) {
				console.log(creep.name, "ERR: no link structures found");
				return;
			}
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
		if (!storage) {
			creep.log("Storage no longer exists");
			delete creep.memory.storageId;
		}
		if (storage && storage.structureType === STRUCTURE_STORAGE) {
			creep.memory.isStorageModule = true; // indicates that the creep is in the storage module
		}

		if (!creep.memory.fillTargetIds || creep.memory.fillTargetIds.length == 0 || creep.memory._needFillTargetRefresh) {
			let adjacentStructs = _.filter(creep.room.lookForAtArea(LOOK_STRUCTURES, creep.pos.y - 1, creep.pos.x - 1, creep.pos.y + 1, creep.pos.x + 1, asArray=true), (result) =>
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
			delete creep.memory._needFillTargetRefresh;
		}

		if (creep.memory.fillTargetIds.length == 0) {
			creep.log("can't find adjacent targets.");
			return;
		}

		let rootNeedsEnergy = false;
		if (creep.memory.isStorageModule && creep.room.memory.rootLink) {
			// if the root module needs energy
			let rootLink = Game.getObjectById(creep.room.memory.rootLink);
			if (rootLink && rootLink.store[RESOURCE_ENERGY] < 200) {
				rootNeedsEnergy = true;
			}
			//creep.log("rootNeedsEnergy:", rootNeedsEnergy);
		}

		// check if the creep is carrying energy, and pick some up if needed
		if (creep.carry[RESOURCE_ENERGY] < creep.carryCapacity) {
			if (rootNeedsEnergy) {
				// HACK: in the future, don't reference the terminal using this shortcut
				if (creep.room.terminal && creep.room.terminal.store[RESOURCE_ENERGY] > Memory.terminalEnergyTarget && creep.room.terminal.store[RESOURCE_ENERGY] > storage.store[RESOURCE_ENERGY]) {
					creep.withdraw(creep.room.terminal, RESOURCE_ENERGY);
				}
				else {
					creep.withdraw(storage, RESOURCE_ENERGY);
				}
			}
			else {
				if (creep.withdraw(link, RESOURCE_ENERGY) !== OK) {
					creep.withdraw(storage, RESOURCE_ENERGY);
				}
			}
		}

		// if the root needs energy, put it in the link
		if (rootNeedsEnergy) {
			creep.transfer(link, RESOURCE_ENERGY);
			return;
		}

		// check if all the fill targets are full.
		let targetIdsNotFull = _.filter(creep.memory.fillTargetIds, (id) => {
			let struct = Game.getObjectById(id);
			if (!struct) {
				creep.log("WARN: structure with id", id, "no longer exists!");
				creep.memory._needFillTargetRefresh = true;
				return false;
			}
			if (struct.structureType == STRUCTURE_TERMINAL) {
				return struct.store[RESOURCE_ENERGY] < Memory.terminalEnergyTarget;
			}
			if (struct.structureType == STRUCTURE_FACTORY) {
				return struct.store[RESOURCE_ENERGY] < Memory.factoryEnergyTarget;
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
		creep.transfer(storage, RESOURCE_ENERGY);
	}
};

module.exports = roleRelay;