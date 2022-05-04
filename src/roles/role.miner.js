import "../traveler.js";
import util from "../util";

/*
 * Tell miners where to deposit materials with a "fill:?" flag or "miner:?" flag
 * "miner:?" flags use the same format as fill flags
 */

const roleMiner = {
	findMineralTarget: function(creep) {
		let rooms = util.getOwnedRooms();
		for (let room of rooms) {
			let minerals = room.find(FIND_MINERALS);
			for (let mineral of minerals) {
				if (util.getStructuresAt(mineral.pos, STRUCTURE_EXTRACTOR).length === 0) {
					continue;
				}
				let minersAssigned = util.getCreeps("miner").filter((creep) => creep.memory.mineralTarget == mineral.id || creep.memory.mineralTargetSecondary == mineral.id);
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
		let fillFlags = _.filter(Game.flags, (flag) => { return (flag.name.includes("fill") || flag.name.includes("miner")) && flag.pos.roomName == creep.pos.roomName; });
		for (let flag of fillFlags) {
			let material = flag.name.split(":")[1];
			if (creep.carry[material] > 0) {
				let target = flag.pos.lookFor(LOOK_STRUCTURES).filter(struct =>  struct.structureType == STRUCTURE_LAB || struct.structureType == STRUCTURE_TERMINAL || struct.structureType == STRUCTURE_FACTORY )[0];
				creep.memory.storageTarget = target.id;
				creep.memory.materialToStore = material;
				return target;
			}
		}

		if (!creep.memory.useSecondaryRoute) {
			creep.memory.storageTarget = creep.room.storage.id;
		}
		else {
			creep.memory.storageTargetSecondary = creep.room.storage.id;
		}
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
		if (!creep.memory.mineralTargetSecondary) {
			if (Game.cpu.bucket <= 100) {
				return;
			}
			creep.memory.mineralTargetSecondary = this.findMineralTarget(creep);
		}
		if (!creep.memory.useSecondaryRoute) {
			creep.memory.useSecondaryRoute = false;
		}

		let total_carry = _.sum(creep.carry);

		let mineralTarget = Game.getObjectById(creep.memory.mineralTarget);
		let mineralTargetSecondary = Game.getObjectById(creep.memory.mineralTargetSecondary);
		if (!mineralTarget) {
			console.log(creep.name, "no mineral target");
			return;
		}
		if (!mineralTargetSecondary) {
			console.log(creep.name, "no secondary mineral target");
			// return;
		}

		// HACK: If a mineral can be mined, then ticksToRegeneration is actually undefined instead of 0
		if (mineralTargetSecondary && !creep.memory.useSecondaryRoute && mineralTarget.ticksToRegeneration > 0 && (mineralTargetSecondary.ticksToRegeneration === undefined || mineralTarget.ticksToRegeneration > mineralTargetSecondary.ticksToRegeneration) && total_carry == 0) {
			creep.memory.useSecondaryRoute = true;
			creep.say("switch->2");
			return;
		}
		else if (creep.memory.useSecondaryRoute && mineralTargetSecondary.ticksToRegeneration > 0 && (mineralTarget.ticksToRegeneration === undefined || mineralTargetSecondary.ticksToRegeneration > mineralTarget.ticksToRegeneration) && total_carry == 0) {
			creep.memory.useSecondaryRoute = false;
			creep.say("switch->1");
			return;
		}

		if (!creep.memory.mining && total_carry == 0) {
			creep.memory.mining = true;
			creep.say("mining");
			delete creep.memory.storageTarget;
			delete creep.memory.materialToStore;
		}
		if (creep.memory.mining && (total_carry == creep.carryCapacity || ((creep.memory.useSecondaryRoute ? mineralTargetSecondary.ticksToRegeneration : mineralTarget.ticksToRegeneration) > 0 && total_carry > 0))) {
			creep.memory.mining = false;
			creep.say("storing");
		}

		if (creep.memory.mining) {
			switch (creep.harvest(creep.memory.useSecondaryRoute ? mineralTargetSecondary : mineralTarget)) {
				case ERR_NOT_IN_RANGE:
				case ERR_NOT_ENOUGH_RESOURCES:
					creep.moveTo(creep.memory.useSecondaryRoute ? mineralTargetSecondary : mineralTarget, { priority: 5000 });
					break;
				default:

			}
		}
		else {
			let storageTarget = null;
			if ((!creep.memory.useSecondaryRoute && !creep.memory.storageTarget) || (creep.memory.useSecondaryRoute && !creep.memory.storageTargetSecondary)) {
				storageTarget = this.getTargetStorage(creep);
			}
			else {
				if (!creep.memory.useSecondaryRoute) {
					storageTarget = Game.getObjectById(creep.memory.storageTarget);
				}
				else {
					storageTarget = Game.getObjectById(creep.memory.storageTargetSecondary);
				}
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
				creep.moveTo(storageTarget);
			}
		}
	}
}

module.exports = roleMiner;
export default roleMiner;
