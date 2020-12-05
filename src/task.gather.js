let traveler = require('traveler');
let util = require('util');
let toolEnergySource = require('tool.energysource');
let brainLogistics = require("brain.logistics");

let taskGather = {
	/**
	 *
	 * @param {Creep} creep
	 * @deprecated
	 */
	run_old(creep) {

		if (!creep.room.storage || (creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] < 100000)) {
			// Pick up dropped resources
			let droppedResources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 30, {
				filter: (drop) => {
					if (creep.memory.role !== "manager" && creep.memory.role !== "scientist" && drop.resourceType !== RESOURCE_ENERGY) {
						return false;
					}
					if (creep.pos.getRangeTo(drop.pos) <= 2) {
						return true;
					}
					if (drop.amount < global.DROPPED_ENERGY_GATHER_MINIMUM) {
						return false;
					}
					if (util.isDistFromEdge(drop.pos, 2)) {
						return false;
					}
					if (drop.pos.findInRange(FIND_HOSTILE_CREEPS, 6).length > 0) {
						return false;
					}

					if (creep.room.storage && creep.room.controller.level > 4) {
						if (drop.pos.findInRange(FIND_SOURCES, 1).length > 0 &&
							drop.pos.findInRange(FIND_STRUCTURES, 1).filter(s => s.structureType === STRUCTURE_LINK).length > 0) {
							return false;
						}
					}

					//console.log("ENERGY DROP",drop.id,drop.amount);
					return creep.pos.findPathTo(drop).length < drop.amount - global.DROPPED_ENERGY_GATHER_MINIMUM;
				}
			});
			if (droppedResources.length > 0) {
				let closest = creep.pos.findClosestByPath(droppedResources);
				if (creep.pickup(closest) == ERR_NOT_IN_RANGE) {
					creep.travelTo(closest);
				}
				return;
			}

			let ruins = creep.pos.findInRange(FIND_RUINS, 40, {
				filter: (ruin) => {
					return ruin.store[RESOURCE_ENERGY] > 0
				}
			});
			if (ruins.length > 0) {
				let closest = creep.pos.findClosestByPath(ruins);
				if (creep.withdraw(closest, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
					creep.travelTo(closest);
				}
				return;
			}
		}


		// Pick up resources from tombstones
		if (creep.memory.role == "manager" || creep.memory.role == "scientist" || (creep.room.controller && creep.room.controller.level < 6)) {
			let tombstones = creep.room.find(FIND_TOMBSTONES, {
				filter: (tomb) => {
					if (tomb.store[RESOURCE_ENERGY] > 0 && creep.pos.isNearTo(tomb)) {
						return true;
					}
					if (tomb.store[RESOURCE_ENERGY] < 10) {
						return false;
					}
					if (util.isDistFromEdge(tomb.pos, 4)) {
						return false;
					}
					if (tomb.pos.findInRange(FIND_HOSTILE_CREEPS, 10).length > 0) {
						return false;
					}

					return tomb.store.getUsedCapacity() > 0 && creep.pos.findPathTo(tomb).length < tomb.ticksToDecay;
				}
			});
			if (tombstones.length > 0) {
				tombstones = tombstones.sort((a, b) => { return _.sum(b.store) - _.sum(a.store); });
				let target = tombstones[0];
				if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
					creep.travelTo(target);
				}
				return;
			}
		}

		// Only builders dismantle marked structures
		if (creep.memory.role === "builder") {
			let dismantleTargets = creep.room.find(FIND_STRUCTURES, {
				filter: function(struct) {
					var flags = struct.pos.lookFor(LOOK_FLAGS);
					if (flags.length > 0) {
						return flags[0].name.includes("dismantle");
					}
					return false;
				}
			});
			if (dismantleTargets.length > 0) {
				//console.log("dismatle targets");
				let closest = creep.pos.findClosestByPath(dismantleTargets);
				if (creep.dismantle(closest) == ERR_NOT_IN_RANGE) {
					creep.travelTo(closest);
				}
				return;
			}
		}

		// extract energy from storage
		let targets = creep.room.find(FIND_STRUCTURES, {
			filter: (structure) => {
				if (structure.structureType !== STRUCTURE_CONTAINER && structure.structureType !== STRUCTURE_STORAGE) {
					return false;
				}

				if (structure.structureType === STRUCTURE_STORAGE) {
					if (structure.owner.username !== global.WHOAMI) {
						return structure.store[RESOURCE_ENERGY] > 0;
					}
					else {
						return structure.room.controller.level >= 4;
					}
				}

				if (creep.memory.role === "builder" && structure.store[RESOURCE_ENERGY] < creep.store.getCapacity()) {
					return false;
				}

				if (creep.room.storage && creep.room.controller.level > 4 && structure.structureType === STRUCTURE_CONTAINER) {
					if (structure.pos.findInRange(FIND_SOURCES, 1).length > 0) {
						if (structure.store[RESOURCE_ENERGY] < CONTAINER_CAPACITY * 0.25) {
							return false;
						}
						else if (structure.pos.findInRange(FIND_STRUCTURES, 1).filter(s => s.structureType === STRUCTURE_LINK).length > 0) {
							return false;
						}
					}
				}

				return structure.store[RESOURCE_ENERGY] > 0;
			}
		});
		if (targets.length > 0) {
			let closest = creep.pos.findClosestByPath(targets);
			if (creep.withdraw(closest, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
				creep.travelTo(closest);
			}
			return;
		}

		// finally, do this weird shit? as a last resort
		let spawn = util.getSpawn(creep.room);
		let haveContainer = false;
		if (spawn) {
			haveContainer = spawn.room.find(FIND_STRUCTURES, {
				filter: (struct) => {
					return (struct.structureType == STRUCTURE_CONTAINER || struct.structureType == STRUCTURE_STORAGE);
				}
			}).length > 0;
			if (!haveContainer && spawn.energy >= spawn.energyCapacity * 0.9 && creep.pos.inRangeTo(spawn, 3)) {
				if (creep.withdraw(spawn, RESOURCE_ENERGY, 50) == ERR_NOT_IN_RANGE) {
					creep.travelTo(spawn);
				}
			}
		}

		// harvest energy from sources
		if (!spawn || !haveContainer || creep.room.controller.level <= 3 || !creep.room.storage || creep.room.storage.store[RESOURCE_ENERGY] <= 0) {
			let controllerHasContainerNearby = false;
			if (creep.memory.role == "upgrader" && creep.room.controller && creep.room.controller.my) {
				let controller = creep.room.controller;
				controllerHasContainerNearby = controller.pos.findInRange(FIND_STRUCTURES, 3, {
					filter: function(struct) {
						return struct.structureType == STRUCTURE_CONTAINER || struct.structureType == STRUCTURE_STORAGE
					}
				}).length > 0;
			}
			if (creep.getActiveBodyparts(WORK) > 0) {
				// FIXME: dear god the CPU usage on this is terrible
				let closest = creep.pos.findClosestByPath(FIND_SOURCES, {
					filter: function(source) {
						if (creep.memory.role == "upgrader" && controllerHasContainerNearby) {
							return false;
						}
						if (creep.memory.role != "harvester" && toolEnergySource.getMaxHarvesters(source) <= 1) {
							return false;
						}
						return source.energy > 0;
					}
				});
				if(creep.harvest(closest) == ERR_NOT_IN_RANGE) {
					creep.travelTo(closest);
				}
			}
		}
	},

	getGatherTarget(creep) {
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
			creep.travelTo(gatherTarget);
		}

		creep.memory._gatherLastRun = Game.time;
	},
}

module.exports = taskGather;
