import * as cartographer from "screeps-cartographer";

import util, { isStoreStructure } from "./util";
import brainLogistics from "./brain.logistics";
import toolEnergySource from "tool.energysource";

const taskGather = {
	getGatherTarget(creep: Creep): Source | Resource | AnyStoreStructure | Tombstone | Ruin | null {
		if (creep.memory.forceGatherTarget) {
			creep.memory.gatherTarget = creep.memory.forceGatherTarget;
			return Game.getObjectById(creep.memory.forceGatherTarget);
		}

		let gatherTarget;
		if (creep.memory.gatherTarget) {
			gatherTarget = Game.getObjectById(creep.memory.gatherTarget);
			if (
				gatherTarget &&
				(!isStoreStructure(gatherTarget) || gatherTarget.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
			) {
				return gatherTarget;
			} else {
				delete creep.memory.gatherTarget;
				gatherTarget = null;
			}
		}

		let sources = brainLogistics.findSources({
			resource: RESOURCE_ENERGY,
			roomName: creep.memory.targetRoom,
			filter: s => s.amount >= creep.store.getFreeCapacity(RESOURCE_ENERGY),
		});
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		sources = _.sortByOrder(sources, [s => creep.pos.getRangeTo(s.object!)], ["asc"]);

		if (sources.length > 0) {
			const selectedSource = _.first(sources);
			creep.memory.gatherTarget = selectedSource.objectId;
			return selectedSource.object;
		} else if (creep.getActiveBodyparts(WORK) > 0) {
			const spawn = util.getSpawn(creep.room);
			const haveContainer =
				creep.room.find(FIND_STRUCTURES, {
					filter: struct =>
						struct.structureType === STRUCTURE_CONTAINER || struct.structureType === STRUCTURE_STORAGE,
				}).length > 0;
			if (
				!spawn ||
				!haveContainer ||
				(creep.room.controller?.level ?? 0) <= 3 ||
				!creep.room.storage ||
				creep.room.storage.store[RESOURCE_ENERGY] <= 0
			) {
				const source = creep.pos.findClosestByPath(FIND_SOURCES, {
					filter: s =>
						s.energy > 0 &&
						toolEnergySource.countFreeSpacesAroundSource(s) > toolEnergySource.getHarvesters(s),
				});
				if (source) {
					creep.memory.gatherTarget = source.id;
					return source;
				}
			}
		}
		return null;
	},

	/**
	 * Gather energy for a creep to do work.
	 * @param {Creep} creep
	 */
	run(creep: Creep): void {
		if (
			!creep.memory.rememberGatherTarget &&
			// eslint-disable-next-line no-underscore-dangle
			(!creep.memory._gatherLastRun || Game.time - 1 > creep.memory._gatherLastRun)
		) {
			delete creep.memory.gatherTarget;
		}
		const gatherTarget = this.getGatherTarget(creep);
		if (!gatherTarget) {
			creep.log(`No gather target found`);
			return;
		}

		if (creep.pos.isNearTo(gatherTarget)) {
			if (gatherTarget instanceof Source) {
				creep.harvest(gatherTarget);
			} else if (gatherTarget instanceof Resource) {
				creep.pickup(gatherTarget);
			} else if (isStoreStructure(gatherTarget)) {
				creep.withdraw(gatherTarget, RESOURCE_ENERGY);
			} else {
				creep.log(`Don't know how to grab ${gatherTarget}`);
			}
		} else {
			const opts: cartographer.MoveOpts = {};
			if (creep.room.name === gatherTarget.room?.name) {
				opts.maxRooms = 1;
			}
			if (gatherTarget instanceof Source) {
				opts.avoidCreeps = true;
			}
			cartographer.moveTo(creep, gatherTarget, opts);
		}

		// eslint-disable-next-line no-underscore-dangle
		creep.memory._gatherLastRun = Game.time;
	},
};

module.exports = taskGather;
export default taskGather;
