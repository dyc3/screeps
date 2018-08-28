var roleCarrier = {
	/** @param {Creep} creep **/
	findHarvesterCreep: function(creep){
		var multiroomHarvesters = _.filter(Game.creeps, function(c){
			return c.memory.role == "multiroom-harvester" && !c.memory.hasCarrier && c.pos.findInRange(FIND_SOURCES, 1).length > 0;
		});
		if (multiroomHarvesters.length > 0) {
			var multiHarvester = multiroomHarvesters[0];
			creep.memory.harvesterCreep = multiHarvester.id;
			multiHarvester.memory.hasCarrier = true;
			creep.say("found");
			return true;
		}
		else {
			creep.say("waiting");
			return false;
		}
	},

	/** @param {Creep} creep **/
	run: function(creep) {

		// make sure we aren't blocking any sources
		if (!creep.memory.harvesterCreep) {
			if (!this.findHarvesterCreep(creep)) {
				if (creep.pos.findInRange(FIND_SOURCES, 1).length > 0) {
					creep.moveTo(Game.spawns["Spawn1"]); // TODO: remove dependancy on Spawn1
				}
				return;
			}
		}

		if(creep.memory.delivering && creep.carry.energy == 0) {
			creep.memory.delivering = false;
			creep.say('traveling');
		}
		else if(!creep.memory.delivering && creep.carry.energy == creep.carryCapacity) {
			creep.memory.delivering = true;
			creep.say('delivering');
		}

		if (creep.memory.delivering) {
			var spawn = Game.spawns["Spawn1"]; // TODO: remove dependancy on Spawn1
			var storage = creep.room.storage ? creep.room.storage : spawn.room.storage;
			if (storage) {
				if (creep.transfer(storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
					creep.moveTo(storage);
				}
			}
			else {
				creep.say("no storage");
			}
		}
		else {
			var harvesterCreep = Game.getObjectById(creep.memory.harvesterCreep);
			var harvestTarget = undefined;
			if (harvesterCreep) {
				harvestTarget = Game.getObjectById(harvesterCreep.memory.harvestTarget);
			}
			else {
				delete harvestTarget;
			}
			if (harvestTarget && creep.pos.inRangeTo(harvestTarget, 2)) {
				var container = creep.pos.findClosestByRange(FIND_STRUCTURES, {
					filter: function(struct) {
						return struct.structureType == STRUCTURE_CONTAINER;
					}
				});
				// pick up overflow energy first
				var lookResources = container.pos.lookFor(LOOK_ENERGY);
				if (lookResources.length > 0) {
					if (creep.pickup(lookResources[0]) == ERR_NOT_IN_RANGE) {
						creep.moveTo(container);
					}
				}
				else {
					if (creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
						creep.moveTo(container);
					}
				}
			}
			else {
				if (harvesterCreep) {
					if (harvestTarget) {
						creep.moveTo(harvestTarget);
					}
					else {
						creep.moveTo(harvesterCreep);
					}
				}
				else {
					this.findHarvesterCreep(creep);
				}
			}
		}

		// if the roads aren't finished, and we have a lot of energy, help speed up road construction
		if (creep.carry[RESOURCE_ENERGY] > 0) {
			var lookConstruction = creep.pos.lookFor(LOOK_CONSTRUCTION_SITES);
			if (lookConstruction.length > 0 && lookConstruction[0].structureType == STRUCTURE_ROAD) {
				creep.build(lookConstruction[0]);
			}
			else {
				var lookStruct = creep.pos.lookFor(LOOK_STRUCTURES);
				var road = undefined;
				for (var s in lookStruct) {
					var struct = lookStruct[s];
					if (struct.structureType == STRUCTURE_ROAD) {
						road = struct;
					}
				}
				if (road && road.hits < road.hitsMax) {
					creep.repair(road);
				}
				else {
					var nearbyConstruction = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {
						filter: function(site) {
							if (site.pos.findInRange(FIND_SOURCES, 1).length > 0) {
								return true;
							}
							return site.structureType == STRUCTURE_ROAD;
						}
					});
					if (nearbyConstruction) {
						if (creep.build(nearbyConstruction) == OK) {
							if (nearbyConstruction.structureType == STRUCTURE_ROAD) {
								creep.cancelOrder("move");
							}
						}
					}
				}
			}
		}

		// if there is any dropped energy on the ground nearby, grab it
		if (_.sum(creep.carry) < creep.carryCapacity) {
			var droppedResources = creep.pos.findInRange(FIND_DROPPED_ENERGY, 5);
			if (droppedResources.length > 0) {
				var closest = creep.pos.findClosestByPath(droppedResources);
				if (creep.pickup(closest) == ERR_NOT_IN_RANGE) {
					creep.moveTo(closest);
				}
			}
		}

		// if we are about to die, set make it so that the harvester gets a new carrier
		if (creep.ticksToLive <= 1) {
			harvesterCreep.memory.hasCarrier = false;
			delete creep.memory.harvestTarget;
		}
	}
}

module.exports = roleCarrier;
