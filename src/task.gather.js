import "./traveler.js";
import util from "./util.ts";
import toolEnergySource from "./tool.energysource.ts";
import brainLogistics from "./brain.logistics.js";

let taskGather = {
	getGatherTarget(creep) {
		if (creep.memory.force_gather_target) {
			creep.memory.gatherTarget = creep.memory.force_gather_target
		}

		let gatherTarget;
		if (creep.memory.gatherTarget) {
			gatherTarget = Game.getObjectById(creep.memory.gatherTarget);
			if (gatherTarget && (!gatherTarget.store || gatherTarget.store.getUsedCapacity(RESOURCE_ENERGY) > 0)) {
				return gatherTarget;
			}
			else {
				delete creep.memory.gatherTarget;
				gatherTarget = null;
			}
		}

		let sources = brainLogistics.findSources({
			resource: RESOURCE_ENERGY,
			roomName: creep.memory.targetRoom,
			filter: s => s.amount > 30,
		});
		sources = _.sortByOrder(sources, [
			s => creep.pos.getRangeTo(s.object),
		],
		["asc"]);

		if (sources.length > 0) {
			let selectedSource = _.first(sources);
			creep.memory.gatherTarget = selectedSource.objectId;
			return selectedSource.object;
		}
		else if (creep.getActiveBodyparts(WORK) > 0) {
			let spawn = util.getSpawn(creep.room);
			let haveContainer = creep.room.find(FIND_STRUCTURES, {
				filter: struct => struct.structureType === STRUCTURE_CONTAINER || struct.structureType === STRUCTURE_STORAGE,
			}).length > 0;
			if (!spawn || !haveContainer || creep.room.controller.level <= 3 || !creep.room.storage || creep.room.storage.store[RESOURCE_ENERGY] <= 0) {
				let source = creep.pos.findClosestByPath(FIND_SOURCES, {
					filter: s => s.energy > 0,
				});
				if (source) {
					creep.memory.gatherTarget = source.id;
					return source;
				}
			}
		}
	},

	/**
	 * Gather energy for a creep to do work.
	 * @param {Creep} creep
	 */
	run(creep) {
		if (!creep.memory.rememberGatherTarget && (!creep.memory._gatherLastRun || Game.time - 1 > creep.memory._gatherLastRun)) {
			delete creep.memory.gatherTarget;
		}
		let gatherTarget = this.getGatherTarget(creep);

		if (creep.pos.isNearTo(gatherTarget)) {
			if (gatherTarget instanceof Source) {
				creep.harvest(gatherTarget);
			}
			else if (gatherTarget instanceof Resource) {
				creep.pickup(gatherTarget);
			}
			else if (gatherTarget.store) {
				creep.withdraw(gatherTarget, RESOURCE_ENERGY);
			}
			else {
				creep.log(`Don't know how to grab ${gatherTarget}`);
			}
		}
		else {
			let opts = {};
			if (creep.room.name === gatherTarget.room.name) {
				opts = { maxRooms: 1 };
			}
			creep.moveTo(gatherTarget, opts);
		}

		creep.memory._gatherLastRun = Game.time;
	},
}

module.exports = taskGather;
export default taskGather;
