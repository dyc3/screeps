import * as cartographer from "screeps-cartographer";

import { Role } from "./meta";
import util from "../util";

/*
 * Tell miners where to deposit materials with a "fill:?" flag or "miner:?" flag
 * "miner:?" flags use the same format as fill flags
 */

const roleMiner = {
	/**
	 */
	findMineralTarget(creep: Creep): Id<Mineral> | undefined {
		const rooms = util.getOwnedRooms();
		for (const room of rooms) {
			const minerals = room.find(FIND_MINERALS);
			for (const mineral of minerals) {
				if (util.getStructuresAt(mineral.pos, STRUCTURE_EXTRACTOR).length === 0) {
					continue;
				}
				const minersAssigned = util
					.getCreeps(Role.Miner)
					.filter(
						c => c.memory.mineralTarget === mineral.id || c.memory.mineralTargetSecondary === mineral.id
					);
				if (minersAssigned.length < 1) {
					return mineral.id;
				}
			}
		}
		return undefined;
	},

	/**
	 * Finds where to store minerals. Sets creeps memory for storage target.
	 * Target must be in the same room.
	 * @returns {Structure} The structure to store the mined minerals in.
	 **/
	getTargetStorage(creep: Creep): Structure | undefined {
		const fillFlags = _.filter(Game.flags, flag => {
			return (
				(flag.name.includes("fill") || flag.name.includes("miner")) && flag.pos.roomName === creep.pos.roomName
			);
		});
		for (const flag of fillFlags) {
			const material = flag.name.split(":")[1] as ResourceConstant;
			if (creep.store.getUsedCapacity(material) > 0) {
				const target = flag.pos
					.lookFor(LOOK_STRUCTURES)
					.filter(
						struct =>
							struct.structureType === STRUCTURE_LAB ||
							struct.structureType === STRUCTURE_TERMINAL ||
							struct.structureType === STRUCTURE_FACTORY ||
							struct.structureType === STRUCTURE_STORAGE
					)[0] as StructureStorage | StructureTerminal | StructureFactory | StructureLab | undefined;
				if (!target) {
					continue;
				}
				creep.memory.storageTarget = target.id;
				creep.memory.materialToStore = material;
				return target;
			}
		}

		if (!creep.memory.useSecondaryRoute) {
			creep.memory.storageTarget = creep.room.storage?.id;
		} else {
			creep.memory.storageTargetSecondary = creep.room.storage?.id;
		}
		delete creep.memory.materialToStore;
		return creep.room.storage;
	},

	/**
	 * @param {Creep} creep
	 * @returns {void}
	 */
	run(creep: Creep): void {
		if (!creep.memory.mineralTarget) {
			if (Game.cpu.bucket <= 100) {
				return;
			}
			creep.memory.mineralTarget = this.findMineralTarget(creep);
		}
		if (!creep.memory.mineralTargetSecondary && util.getOwnedRooms().length > 1) {
			if (Game.cpu.bucket <= 100) {
				return;
			}
			creep.memory.mineralTargetSecondary = this.findMineralTarget(creep);
		}
		if (!creep.memory.useSecondaryRoute) {
			creep.memory.useSecondaryRoute = false;
		}

		const totalCarry = creep.store.getUsedCapacity();

		const mineralTarget = creep.memory.mineralTarget ? Game.getObjectById(creep.memory.mineralTarget) : null;
		const mineralTargetSecondary = creep.memory.mineralTargetSecondary
			? Game.getObjectById(creep.memory.mineralTargetSecondary)
			: null;
		if (!mineralTarget) {
			console.log(creep.name, "no mineral target");
			return;
		}
		if (!mineralTargetSecondary) {
			console.log(creep.name, "no secondary mineral target");
			// return;
		}

		// HACK: If a mineral can be mined, then ticksToRegeneration is actually undefined instead of 0
		if (
			mineralTargetSecondary &&
			!creep.memory.useSecondaryRoute &&
			(mineralTarget.ticksToRegeneration ?? 0) > 0 &&
			(mineralTargetSecondary.ticksToRegeneration === undefined ||
				(mineralTarget.ticksToRegeneration ?? 0) > (mineralTargetSecondary.ticksToRegeneration ?? 0)) &&
			totalCarry === 0
		) {
			creep.memory.useSecondaryRoute = true;
			creep.say("switch->2");
			return;
		} else if (
			creep.memory.useSecondaryRoute &&
			mineralTargetSecondary &&
			(mineralTargetSecondary.ticksToRegeneration ?? 0) > 0 &&
			(mineralTarget.ticksToRegeneration === undefined ||
				(mineralTargetSecondary.ticksToRegeneration ?? 0) > mineralTarget.ticksToRegeneration) &&
			totalCarry === 0
		) {
			creep.memory.useSecondaryRoute = false;
			creep.say("switch->1");
			return;
		}

		if (!creep.memory.mining && totalCarry === 0) {
			creep.memory.mining = true;
			creep.say("mining");
			delete creep.memory.storageTarget;
			delete creep.memory.materialToStore;
		}
		if (
			creep.memory.mining &&
			(creep.store.getFreeCapacity() === 0 ||
				((creep.memory.useSecondaryRoute && mineralTargetSecondary
					? mineralTargetSecondary.ticksToRegeneration ?? 0
					: mineralTarget.ticksToRegeneration ?? 0) > 0 &&
					totalCarry > 0))
		) {
			creep.memory.mining = false;
			creep.say("storing");
		}

		if (creep.memory.mining) {
			const target = creep.memory.useSecondaryRoute ? mineralTargetSecondary : mineralTarget;
			if (!target) {
				creep.log("no target");
				return;
			}
			switch (creep.harvest(target)) {
				case ERR_NOT_IN_RANGE:
				case ERR_NOT_ENOUGH_RESOURCES:
					cartographer.moveTo(creep, target);
					break;
				default:
			}
		} else {
			let storageTarget = null;
			if (
				(!creep.memory.useSecondaryRoute && !creep.memory.storageTarget) ||
				(creep.memory.useSecondaryRoute && !creep.memory.storageTargetSecondary)
			) {
				storageTarget = this.getTargetStorage(creep);
			} else {
				if (!creep.memory.useSecondaryRoute) {
					storageTarget = creep.memory.storageTarget ? Game.getObjectById(creep.memory.storageTarget) : null;
				} else {
					storageTarget = creep.memory.storageTargetSecondary
						? Game.getObjectById(creep.memory.storageTargetSecondary)
						: null;
				}
			}

			if (!storageTarget) {
				creep.log("no storage target");
				return;
			}
			if (creep.pos.isNearTo(storageTarget)) {
				if (creep.memory.materialToStore) {
					creep.transfer(
						storageTarget,
						creep.memory.materialToStore,
						creep.store.getUsedCapacity(creep.memory.materialToStore)
					);
				} else {
					for (const resource of RESOURCES_ALL) {
						if (creep.store[resource] > 0) {
							creep.transfer(storageTarget, resource);
							break;
						}
					}
				}
			} else {
				cartographer.moveTo(creep, storageTarget);
			}
		}
	},
};

module.exports = roleMiner;
export default roleMiner;
