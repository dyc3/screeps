var util = require('util');
var toolEnergySource = require('tool.energysource');

var droppedEnergyGatherMinimum = 50;

var taskGather = {
	run: function(creep) {
		var droppedResources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 10, {
			filter: (drop) => {
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
			var closest = creep.pos.findClosestByPath(droppedResources);
			if (closest) {
				if (creep.pickup(closest) == ERR_NOT_IN_RANGE) {
					creep.moveTo(closest);
				}
			}
		}
		else {
			var dismantleTargets = creep.room.find(FIND_STRUCTURES, {
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
				var closest = creep.pos.findClosestByPath(dismantleTargets);
				if (creep.dismantle(closest) == ERR_NOT_IN_RANGE){
					creep.moveTo(closest);
				}
			}
			else {
				var targets = creep.room.find(FIND_STRUCTURES, {
						filter: (structure) => {
							return (structure.structureType == STRUCTURE_CONTAINER ||
									structure.structureType == STRUCTURE_STORAGE) && structure.store[RESOURCE_ENERGY] > 0;
						}
				});
				if (targets.length) {
					var closest = creep.pos.findClosestByPath(targets);
					if (creep.withdraw(closest, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
						creep.moveTo(closest);
					}
				}
				else {
					var spawn = util.getSpawn(creep.room);
					var haveContainer = false;
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
					if (!spawn || !haveContainer) {
						var controllerHasContainerNearby = false;
						if (creep.memory.role == "upgrader" && creep.room.controller && creep.room.controller.my) {
							var controller = creep.room.controller;
							controllerHasContainerNearby = controller.pos.findInRange(FIND_STRUCTURES, 3, {
								filter: function(struct) {
									return struct.structureType == STRUCTURE_CONTAINER || struct.structureType == STRUCTURE_STORAGE
								}
							}).length > 0;
						}
						if (creep.getActiveBodyparts(WORK) > 0) {
						    var closest = creep.pos.findClosestByPath(FIND_SOURCES, {
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
		}
	}
}

module.exports = taskGather;
