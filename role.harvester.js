let traveler = require('traveler');
let toolEnergySource = require('tool.energysource');
let USE_RUN_NEW = true;

let roleHarvester = {
	/** @param {Creep} creep **/
	findTransferTargets: function(creep) {
		let harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
		if (harvestTarget) {
			let dedicatedLink = Game.getObjectById(creep.memory.dedicatedLinkId);
			if (!dedicatedLink && creep.room.controller.level >= 5) {
				if (!creep.memory.last_check_for_dedicated_link || creep.memory.last_check_for_dedicated_link && Game.time - creep.memory.last_check_for_dedicated_link > 100) {
					dedicatedLink = harvestTarget.pos.findInRange(FIND_STRUCTURES, 3, {
						filter: (struct) => { return struct.structureType == STRUCTURE_LINK; }
					})[0];
					if (dedicatedLink) {
						creep.memory.dedicatedLinkId = dedicatedLink.id;
					}
					else {
						creep.memory.last_check_for_dedicated_link = Game.time;
					}
				}

			}
		}

		var targets = creep.room.find(FIND_STRUCTURES, {
			filter: (struct) => {
				var flags = struct.pos.lookFor(LOOK_FLAGS);
				if (flags.length > 0) {
					if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
						return false;
					}
				}
				if (creep.memory.dedicatedLinkId && !creep.pos.inRangeTo(struct, 3)) {
					return false;
				}
				if (struct.structureType == STRUCTURE_LINK) {
					if (struct.room.storage && struct.pos.inRangeTo(struct.room.storage, 2)) {
						return false;
					}
					if (creep.pos.inRangeTo(struct, 4)) {
						return struct.energy < struct.energyCapacity;
					}
				}
				else if (!(creep.getActiveBodyparts(MOVE) == 1 && creep.getActiveBodyparts(WORK) >= 5)) { // check if creep is "optimized"
					if (struct.structureType == STRUCTURE_EXTENSION) {
						if (!creep.pos.inRangeTo(struct, 8)) {
							return false;
						}
					}
					else if (struct.structureType == STRUCTURE_SPAWN) {
						if (CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][creep.room.level] > 1 && creep.pos.inRangeTo(struct, 3)) {
							return true;
						}
					}
				}
				var a = (struct.structureType == STRUCTURE_EXTENSION ||
						(struct.structureType == STRUCTURE_SPAWN && (creep.room.controller.level == 1 || creep.room.energyAvailable > 295)) ||
						struct.structureType == STRUCTURE_TOWER) && struct.energy < struct.energyCapacity;
				var b = (struct.structureType == STRUCTURE_CONTAINER ||
						struct.structureType == STRUCTURE_STORAGE) &&
						//_.sum(struct.store) == struct.store[RESOURCE_ENERGY] &&
						_.sum(struct.store) < struct.storeCapacity;
				return a || b;
			}
		});
		if (targets.length > 0) {
// 			var harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
			if (!creep.memory.haveManagerForRoom || Game.time % 10 == 0) {
				creep.memory.haveManagerForRoom = _.filter(Game.creeps, function(c) {
					if (!Game.creeps[c.name]) { // checks if the creep is alive? maybe?
						return false;
					}
					return (c.memory.role == "manager") && (c.memory.targetRoom == creep.room.name);
				}).length > 0;
			}
			// console.log(creep.name, "has manager in room", creep.room.name, "=", haveManagerForRoom);
			// HACK: these aren't using the STRUCTURE_* constants
			var structPriority = {
				"extension":1,
				"tower":2,
				"link":3,
				"spawn":4,
				"container":5,
				"storage":6,
			};
			if (creep.memory.haveManagerForRoom) {
				structPriority[STRUCTURE_LINK] = 1;
				structPriority[STRUCTURE_CONTAINER] = 2;
				structPriority[STRUCTURE_SPAWN] = 3;
				structPriority[STRUCTURE_STORAGE] = 3;
				structPriority[STRUCTURE_EXTENSION] = 3;
				structPriority[STRUCTURE_TOWER] = 3;
			}
			if (creep.memory.dedicatedLinkId) {
				targets = targets.filter((struct) => { return harvestTarget.pos.inRangeTo(struct, 3); });
			}
			if (creep.memory.haveManagerForRoom && creep.memory.dedicatedLinkId) {
				structPriority[STRUCTURE_LINK] = 1;
				structPriority[STRUCTURE_SPAWN] = 2;
				structPriority[STRUCTURE_EXTENSION] = 3;
				structPriority[STRUCTURE_TOWER] = 3;
				structPriority[STRUCTURE_CONTAINER] = 5;
				structPriority[STRUCTURE_STORAGE] = 6;
			}
			targets.sort(function(a, b){
				if (a.structureType != b.structureType) {
					return structPriority[a.structureType] - structPriority[b.structureType];
				}
				else {
					return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
				}
			});
		}
		return targets;
	},

	findHarvestTarget: function(creep) {
		var sources = [];
		var spawns = _.values(Game.spawns);
		for (var r = 0; r < spawns.length; r++) {
			var spawn = spawns[r];
			var roomSources = spawn.room.find(FIND_SOURCES, { filter: (source) => { return toolEnergySource.canAssignSource(source); } });
			// console.log(roomSources.length)
			if (roomSources && roomSources != undefined && roomSources.length > 0) {
				sources = sources.concat(roomSources);
			}
		}
		// console.log(sources)

		if (sources.length > 0) {
			// var closest = creep.pos.findClosestByPath(sources);
			var closest = sources[0];
			if (closest) {
				// console.log(closest)
				return closest.id;
			}
			else {
				console.log(creep.name, "no closest harvestTarget (wtf?)");
			}
		}
		else {
			console.log(creep.name, "no harvestTarget");
		}
	},

	/** gets this creep's energy deposit mode depending on the current situation **/
	/** @param {Creep} creep **/
	getDepositMode: function(creep) {
		/*
		* These are the different modes:
		* wait - edge case
		* link - sit where link and source are reachable without moving, transfer all energy to link (indicated with `transferTarget`).
		* drop - stand on container (if applicable), drop all harvested energy on the ground
		* recovery - when full of energy, deposit it into spawns/extensions, then towers, then upgrade controller
		* direct - put the energy straight into adjacent storage
		*
		* `transferTarget` should indicate the current target structure and should NOT be used to determine mode.
		*/

		if (!creep.memory.harvestTarget) {
			console.log(creep.name, "Can't determine harvest mode without harvestTarget");
			return "wait";
		}

		let harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
		if (harvestTarget.pos.getRangeTo(harvestTarget.room.storage) <= 2) {
			return "direct";
		}

// 		let nearbyLinks = harvestTarget.pos.findInRange(FIND_STRUCTURES, 2, { filter: (struct) => { return struct.structureType == STRUCTURE_LINK; } });
		let dedicatedLink = Game.getObjectById(creep.memory.dedicatedLinkId);
// 		if (nearbyLinks.length > 0) {
		if (dedicatedLink) {
			return "link";
		}

		if (Object.keys(Game.creeps).length <= 2) {
			return "recovery";
		}

		return "drop";
	},

	/** Meant to replace findTransferTargets **/
	getTransferTarget: function(creep) {
		if (creep.depositMode == "direct") {
			return creep.room.storage;
		}

		if (creep.depositMode == "link") {
			return Game.getObjectById(creep.memory.dedicatedLinkId);
		}
	},

	/** @param {Creep} creep **/
	run: function(creep) {
		if (USE_RUN_NEW)
		{
			this.run_new(creep);
			return;
		}

		if ((!creep.memory.harvestTarget || creep.memory.harvestTarget == undefined || typeof creep.memory.harvestTarget != "string") && !creep.spawning) {
			creep.memory.harvestTarget = this.findHarvestTarget(creep);
		}

		let harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
		if (!harvestTarget) {
			delete creep.memory.harvestTarget;
			console.log(creep.name,"harvestTarget does not exist, deleting");
			creep.say("help");
			return;
		}

		if(!creep.memory.harvesting && creep.carry.energy <= 10) {
			creep.memory.harvesting = true;
			creep.say('harvesting');
		}
		if(creep.memory.harvesting && (creep.carry.energy == creep.carryCapacity)) {
			creep.memory.harvesting = false;
			creep.say('transport');
		}

		// if the normal target is out of energy, switch to another source temporarily, or go renew
		if (harvestTarget.energy == 0 && harvestTarget.ticksToRegeneration > 10 && creep.ticksToLive <= 350) {
			if (creep.memory.hasDedicatedLink || creep.memory.haveManagerForRoom) {
				console.log(creep.name, "harvestTarget empty, renewing...")
				creep.memory.renewing = true;
			}
			else {
				harvestTarget = creep.room.find(FIND_SOURCES_ACTIVE, {
					filter: (source) => { return source.energy > 0; }
				}).sort(function(a,b) { return a.ticksToRegeneration - b.ticksToRegeneration; })[0];
			}
		}

		if(creep.memory.harvesting) {
			if (creep.room.name == harvestTarget.room.name) {
				if(creep.harvest(harvestTarget) == ERR_NOT_IN_RANGE) {
					creep.travelTo(harvestTarget);
				}
			}
			else {
				creep.travelTo(new RoomPosition(25, 25, harvestTarget.room.name), {visualizePathStyle:{}});
			}
		}
		else {
			let targets = this.findTransferTargets(creep);
			if(targets.length > 0) {
				let target = targets[0];
				if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
					creep.travelTo(target, {visualizePathStyle:{}});
				}

				if (creep.memory.hasDedicatedLink) {
					creep.harvest(harvestTarget);
				}
			}
			else if (!creep.memory.hasDedicatedLink && !(creep.getActiveBodyparts(MOVE) == 1 && creep.getActiveBodyparts(WORK) >= 5)) { // don't move away from source if the creep is an "optimized" harvester
				//console.log(creep.name+": Err: no structure transfer targets");
				let hungryCreeps = creep.room.find(FIND_MY_CREEPS, {
					filter: function(c) {
						if (c.memory.role == "builder" || c.memory.role == "upgrader" || c.memory.role == "repairer"  || c.memory.role == "manager") {
							if (creep.pos.inRangeTo(c, 14)) {
								return !c.spawning && c.carry[RESOURCE_ENERGY] < c.carryCapacity * 0.8;
							}
						}
						return false;
					}
				});
				if (hungryCreeps.length > 0) {
					let closest = creep.pos.findClosestByPath(hungryCreeps);
					if (creep.transfer(closest, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
						creep.travelTo(closest, {visualizePathStyle:{}});
					}
				}
				else {
					if (creep.room.controller.my && creep.room.controller.level <= 2) {
						if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
							creep.travelTo(creep.room.controller, {visualizePathStyle:{}});
						}
					}
					else {
						let constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
						if (constructionSites.length > 0) {
							let closest = creep.pos.findClosestByPath(constructionSites);
							if (creep.build(closest) == ERR_NOT_IN_RANGE) {
								creep.travelTo(closest, {visualizePathStyle:{}});
							}
						}
						else {
							if (creep.room.controller.my && creep.room.controller.level < 8) {
								if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
									creep.travelTo(creep.room.controller, {visualizePathStyle:{}});
								}
							}
							else {
								creep.travelTo(harvestTarget, {visualizePathStyle:{}});
							}
						}
					}
				}
			}
			else {
				creep.travelTo(harvestTarget, {visualizePathStyle:{}});
			}
		}
	},

	/** @param {Creep} creep **/
	run_new: function(creep) {
		if (!creep.memory.harvestTarget) {
			creep.memory.harvestTarget = this.findHarvestTarget(creep);
		}

		let harvestTarget = Game.getObjectById(creep.memory.harvestTarget);

		if (!creep.memory.depositMode || (creep.memory.depositMode == "wait" && Game.time % 2 == 0)) {
			creep.memory.depositMode = this.getDepositMode(creep);
			if (creep.memory.depositMode == "wait") {
				creep.say("waiting"); // makes debugging quicker
			}
		}

		if (Game.time % 10 == 0 && (creep.memory.depositMode == "drop" || creep.memory.depositMode == "recovery")) {
			creep.memory.depositMode = this.getDepositMode(creep);
		}
		else if (Game.time % 40 == 0) {
			creep.memory.depositMode = this.getDepositMode(creep);
		}

		if(!creep.memory.harvesting && creep.carry.energy == 0) {
			creep.memory.harvesting = true;
			creep.say('harvesting');
		}
		if(creep.memory.harvesting && (creep.carry.energy == creep.carryCapacity)) {
			creep.memory.harvesting = false;
			creep.say('transport');
		}

		if(creep.memory.harvesting) {
			if (creep.room.name == harvestTarget.room.name) {
				if(creep.harvest(harvestTarget) == ERR_NOT_IN_RANGE) {
					creep.travelTo(harvestTarget);
				}
			}
			else {
				creep.travelTo(new RoomPosition(25,25,harvestTarget.room.name), {visualizePathStyle:{}});
			}
		}
		else {
			if (!creep.memory.transferTarget) {
				let targets = this.findTransferTargets(creep);
				if(targets.length > 0) {
					creep.memory.transferTarget = targets[0].id;
				}
				else {
					return;
				}
			}

			var target = Game.getObjectById(creep.memory.transferTarget);
			if (target) {
				target = this.getTransferTarget(creep);
				creep.memory.transferTarget = target.id;
			}

			if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
				creep.travelTo(target, {visualizePathStyle:{}});
			}
		}
	}
};

module.exports = roleHarvester;
