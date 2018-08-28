var toolRoadPlanner = require('tool.roadplanner');

var roleMultiroomHarvester = {

	/** @param {Creep} creep **/
	run: function(creep) {
		var harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
		if ((!creep.memory.harvestTarget || typeof creep.memory.harvestTarget != "string" || !harvestTarget) && !creep.spawning) {
			var source = undefined;
			try {
				source = Game.flags["harvestme"].pos.lookFor(LOOK_SOURCES)[0];
			} catch (e) {
				console.log(e);
			} finally {

			}
			if (source != undefined) {
				creep.memory.harvestTarget = source.id;
				console.log(creep.name, "harvestTarget set to", creep.memory.harvestTarget, source);
			}
			else {
				console.log(creep.name, "no harvestTarget. building path to harvestme flag");
				creep.moveTo(Game.flags["harvestme"]);
			}
		}

		harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
		var container = creep.pos.findInRange(FIND_STRUCTURES, 1, {
			filter: (struct) => { return struct.structureType == STRUCTURE_CONTAINER; }
		})[0];
		if (!harvestTarget) {
			return;
		}

		// if (harvestTarget == null) {
		// 	delete creep.memory.harvestTarget;
		// 	return;
		// }
		if (creep.memory.harvesting == undefined) {
			creep.memory.harvesting = false;
		}

		if(!creep.memory.harvesting && creep.pos.isNearTo(harvestTarget) && container) {
			creep.memory.harvesting = true;
			creep.say('harvesting');
		}
		if (creep.memory.harvesting && (!creep.pos.isNearTo(harvestTarget) || !container)) {
			creep.memory.harvesting = false;
			creep.say("setting up");
		}

		if(creep.memory.harvesting) {
			Game.flags["harvestme"].setColor(COLOR_GREEN);
			creep.harvest(harvestTarget);
			if (container) {
				if (container.hits < container.hitsMax) {
					creep.repair(container);
				}
				else {
					creep.transfer(container, RESOURCE_ENERGY);
				}
			}
			else {
				var containerSites = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {filter: (site) => { return site.structureType == STRUCTURE_CONTAINER; }});
				if (creep.pos.isNearTo(harvestTarget) && containerSites.length == 0) {
					creep.pos.createConstructionSite(STRUCTURE_CONTAINER);
				}
				if (containerSites.length > 0) {
					if (creep.build(containerSites[0]) != OK) {
						creep.harvest(harvestTarget);
					}
				}
			}
		}
		else {
			Game.flags["harvestme"].setColor(COLOR_RED);
			if (!creep.pos.isNearTo(harvestTarget)) {
				creep.moveTo(harvestTarget);
			}

			if (!container) {
				var containerSites = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {filter: (site) => { return site.structureType == STRUCTURE_CONTAINER; }});
				if (creep.pos.isNearTo(harvestTarget) && containerSites.length == 0) {
					creep.pos.createConstructionSite(STRUCTURE_CONTAINER);
				}
				if(creep.carry[RESOURCE_ENERGY] < creep.carryCapacity) {
					creep.harvest(harvestTarget);
				}
				if (containerSites.length > 0) {
					if (creep.build(containerSites[0]) != OK) {
						creep.harvest(harvestTarget);
					}
				}
			}

			// create road construction sites if they aren't there
			if (!creep.memory.plannedRoad && creep.room == harvestTarget.room) {
				// var pathTo = creep.pos.findPathTo(harvestTarget.pos, {ignoreCreeps:true,});
				toolRoadPlanner.planPath(creep.pos, harvestTarget.pos);
				creep.memory.plannedRoad = true;
			}
		}

		// if the roads aren't finished, and we have a lot of energy, help speed up road construction
		// TODO: make this a task
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
						filter: (site) => { return site.structureType == STRUCTURE_ROAD; }
					});
					creep.build(nearbyConstruction);
				}
			}
		}

		if (creep.ticksToLive <= 1 && Game.flags["harvestme"]) {
			Game.flags["harvestme"].setColor(COLOR_WHITE);
		}
	},
}

module.exports = roleMultiroomHarvester;
