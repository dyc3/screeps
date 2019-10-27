let traveler = require('traveler');
let util = require('util');

let roleMiner = {
	findMineralTarget: function(creep) {
		let rooms = util.getOwnedRooms();
		for (let room of rooms) {
			let minerals = util.getMinerals(room);
			for (let mineral of minerals) {
				let minersAssigned = util.getCreeps("miner").filter((creep) => creep.memory.mineralTarget == mineral.id);
				if (minersAssigned < 1) {
					return mineral.id;
				}
			}
		}
	},

	/**
	 * Finds where to store minerals. Sets creeps memory for storage target.
	 * Target must be in the same room.
	 * @returns {Structure} The structure to store the mined minerals in.
	 **/
	getTargetStorage: function(creep) {
		let fillFlags = _.filter(Game.flags, (flag) => { return flag.name.includes("fill") && flag.pos.roomName == creep.pos.roomName; });
		for (let flag of fillFlags) {
			let material = flag.name.split(":")[1];
			if (creep.carry[material] > 0) {
				let target = flag.pos.lookFor(LOOK_STRUCTURES).filter((struct) => { return struct.structureType == STRUCTURE_LAB || struct.structureType == STRUCTURE_TERMINAL })[0];
				creep.memory.storageTarget = target.id;
				creep.memory.materialToStore = material;
				return target;
			}
		}

		creep.memory.storageTarget = creep.room.storage.id;
		delete creep.memory.materialToStore;
		return creep.room.storage;
	},

	run: function(creep) {
		if (!creep.memory.mineralTarget) {
			if (Game.cpu.bucket <= 100) {
				return;
			}
			creep.memory.mineralTarget = this.findMineralTarget(creep);
		}

		let total_carry = _.sum(creep.carry);

		let mineralTarget = Game.getObjectById(creep.memory.mineralTarget);
		if (!mineralTarget) {
			console.log(creep.name, "no mineral target");
			return;
		}
		if (mineralTarget.ticksToRegeneration > 0 && total_carry == 0) {
			return;
		}

		if (!creep.memory.mining && total_carry == 0) {
			creep.memory.mining = true;
			creep.say("mining");
			delete creep.memory.storageTarget;
			delete creep.memory.materialToStore;
		}
		if (creep.memory.mining && (total_carry == creep.carryCapacity || (mineralTarget.ticksToRegeneration > 0 && total_carry > 0))) {
			creep.memory.mining = false;
			creep.say("storing");
		}

		if (creep.memory.mining) {
			switch (creep.harvest(mineralTarget)) {
				case ERR_NOT_IN_RANGE:
				case ERR_NOT_ENOUGH_RESOURCES:
					creep.travelTo(mineralTarget);
					break;
				default:

			}
		}
		else {
			let storageTarget = null;
			if (!creep.memory.storageTarget) {
				storageTarget = this.getTargetStorage(creep);
			}
			else {
				storageTarget = Game.getObjectById(creep.memory.storageTarget);
			}

			if (creep.pos.isNearTo(storageTarget)) {
				if (creep.memory.materialToStore) {
					creep.transfer(storageTarget, creep.memory.materialToStore, creep.carry[creep.memory.materialToStore]);
				}
				else {
					for (let resource of RESOURCES_ALL) {
						if (creep.carry[resource] > 0) {
							creep.transfer(storageTarget, resource);
						}
					}
				}
			}
			else {
				creep.travelTo(storageTarget);
			}
		}
	}
}

module.exports = roleMiner;
