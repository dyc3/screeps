let util = require('util');
let toolEnergySource = require('tool.energysource');

let droppedEnergyGatherMinimum = 50;

let taskGather = {
	run: function(creep) {

		// Pick up dropped resources
		let droppedResources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 10, {
			filter: (drop) => {
				if (creep.pos.getRangeTo(drop.pos) <= 2) {
					return true;
				}
				if (drop.amount < droppedEnergyGatherMinimum) {
					return false;
				}
				if (util.isDistFromEdge(drop.pos, 4)) {
					return false;
				}
				if (drop.pos.findInRange(FIND_HOSTILE_CREEPS, 6).length > 0) {
					return false;
				}
				//console.log("ENERGY DROP",drop.id,drop.amount);
				return creep.pos.findPathTo(drop).length < drop.amount - droppedEnergyGatherMinimum;
			}
		});
		if (droppedResources.length > 0) {
			let closest = creep.pos.findClosestByPath(droppedResources);
			if (creep.pickup(closest) == ERR_NOT_IN_RANGE) {
				creep.moveTo(closest);
			}
			return;
		}

		// Pick up resources from tombstones
		if (creep.memory.role == "manager" || creep.memory.role == "scientist" || (creep.room.controller.level < 6)) {
    		let tombstones = creep.room.find(FIND_TOMBSTONES, {
    			filter: (tomb) => {
    				if (util.isDistFromEdge(tomb.pos, 4)) {
    					return false;
    				}
    				if (tomb.pos.findInRange(FIND_HOSTILE_CREEPS, 10).length > 0) {
    					return false;
    				}
    
    				return _.sum(tomb.store) > 0 && creep.pos.findPathTo(tomb).length < tomb.ticksToDecay;
    			}
    		});
    		if (tombstones.length > 0) {
    			tombstones = tombstones.sort((a, b) => { return _.sum(b.store) - _.sum(a.store); });
    			let target = tombstones[0];
    			if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
    				creep.moveTo(target);
    			}
    			return;
    		}
		}

		// Dismantle marked structures
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
				creep.moveTo(closest);
			}
			return;
		}

		// extract energy from storage
		let targets = creep.room.find(FIND_STRUCTURES, {
			filter: (structure) => {
				return (structure.structureType == STRUCTURE_CONTAINER ||
						structure.structureType == STRUCTURE_STORAGE) && structure.store[RESOURCE_ENERGY] > 0;
			}
		});
		if (targets.length > 0) {
			let closest = creep.pos.findClosestByPath(targets);
			if (creep.withdraw(closest, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
				creep.moveTo(closest);
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
					creep.moveTo(spawn);
				}
			}
		}

		// harvest energy from sources
		if (!spawn || !haveContainer || creep.room.controller.level <= 2) {
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
					creep.moveTo(closest);
				}
			}
		}
	}
}

module.exports = taskGather;
