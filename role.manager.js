var util = require("util");
var energyInTerminalTarget = 50000;

// NOTE: remember to modify the corresponding droppedEnergyGatherMinimum in task.gather.js
var droppedEnergyGatherMinimum = 100; // TODO: make this a global constant somehow

function doAquire(creep, passively=false) {
	var droppedResources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, (passively ? 1 : 20), {
		filter: (drop) => {
			if (!creep.pos.isNearTo(drop) && drop.amount < droppedEnergyGatherMinimum) {
				return false;
			}
			if (util.isDistFromEdge(drop.pos, 5)) {
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
		creep.room.visual.circle(closest.pos, {stroke:"#ff0000", fill:"transparent", radius:1});
		if (closest) {
			if (creep.pickup(closest) == ERR_NOT_IN_RANGE) {
				creep.moveTo(closest, {visualizePathStyle:{}});
			}
		}
	}
	else {
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
		if (tombstones.length > 0)
		{
			// NOTE: it might be better to prioritize tombs that will decay sooner (TOMBSTONE_DECAY_PER_PART * [# of creep parts])
			// prioritize tombs with more resources
			tombstones = tombstones.sort((a, b) => { return _.sum(b.store) - _.sum(a.store); });
			let target = tombstones[0];
			creep.room.visual.circle(target.pos, {stroke:"#ff0000", fill:"transparent", radius:1});
			if (creep.pos.isNearTo(target))
			{
				// prioritize "exotic" resources
				for (var r = 0; r < RESOURCES_ALL.length; r++)
				{
					if (_.sum(creep.carry) == creep.carryCapacity)
					{
						break;
					}
					var resource = RESOURCES_ALL[r];
					if (resource == RESOURCE_ENERGY)
					{
						continue;
					}
					if (target.store[resource] > 0)
					{
						creep.withdraw(target, resource);
					}
				}
				creep.withdraw(target, RESOURCE_ENERGY);
			}
			else
			{
				creep.moveTo(target, {visualizePathStyle:{}});
			}
		}
		else
		{
			var filledHarvesters = creep.pos.findInRange(FIND_MY_CREEPS, (passively ? 1 : 4), {
				filter: function(c) {
					// if (c.memory.role == "harvester") {
						// if (c.pos.findInRange(FIND_STRUCTURES, 1, { function(s) { return s.structureType == STRUCTURE_LINK } })) {
						// 	return false;
						// }
					// }
					return !c.spawning && c.memory.role == "harvester" && !c.memory.hasDedicatedLink && c.carry[RESOURCE_ENERGY] >= c.carryCapacity * 0.85;
				}
			});
			if (filledHarvesters.length > 0) {
				let closest = creep.pos.findClosestByPath(filledHarvesters);
				if (closest) {
					creep.room.visual.circle(closest.pos, {stroke:"#ff0000", fill:"transparent", radius:1})
					//console.log("NEARBY FILLED HARVESTER",closest.pos,"dist =",creep.pos.getRangeTo(closest))
					if (closest.transfer(creep, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
						creep.moveTo(closest, {visualizePathStyle:{}});
					}
				}
				else {
					console.log(creep.name, "no path to target harvester");
				}
			}
			else {
				// console.log("Can't withdraw from last deposit:",Game.getObjectById(creep.memory.lastDepositStructure))
				// console.log("last deposit:",Game.getObjectById(creep.memory.lastDepositStructure))
				var containers = creep.pos.findInRange(FIND_STRUCTURES, (passively ? 1 : 50), {
					filter: function(struct) {
						var flags = struct.pos.lookFor(LOOK_FLAGS);
						if (flags.length > 0) {
							if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
								return false;
							}
						}
						if (struct.id == creep.memory.lastDepositStructure && creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] < 800000) {
							return false; // comment this line to increase controller upgrade speed
						}
						if (struct.structureType == STRUCTURE_CONTAINER) {
							if (struct.pos.findInRange(FIND_STRUCTURES, 3, { filter: function(struct) {return struct.structureType == STRUCTURE_CONTROLLER} }).length > 0) {
								return false;
							}
						}
						else if (struct.structureType == STRUCTURE_LINK) {
							if (struct.energy > 0 && struct.pos.inRangeTo(struct.room.storage, 2)) {
								return true;
							}
						}
						else if (struct.structureType == STRUCTURE_TERMINAL) {
							if (struct.store[RESOURCE_ENERGY] > energyInTerminalTarget) {
								return true;
							}
						}
						return (struct.structureType == STRUCTURE_STORAGE && struct.store[RESOURCE_ENERGY] > creep.carryCapacity) ||
							(struct.structureType == STRUCTURE_CONTAINER && struct.store[RESOURCE_ENERGY] > 0);
					}
				});
				if (containers.length > 0) {
					// var closest = creep.pos.findClosestByPath(containers);
					containers.sort(function(a, b) {
						if (a.structureType != b.structureType) {
							if (a.structureType == STRUCTURE_STORAGE) {
								return 1;
							}
							if (b.structureType == STRUCTURE_STORAGE) {
								return -1;
							}
						}

						var aEnergy = 0
						if (a.store) {
							aEnergy = a.store[RESOURCE_ENERGY];
						}
						else if (a.energy) {
							aEnergy = a.energy;
						}

						var bEnergy = 0
						if (b.store) {
							bEnergy = b.store[RESOURCE_ENERGY];
						}
						else if (b.energy) {
							bEnergy = b.energy;
						}

						return bEnergy - aEnergy; // sort descending, highest energy first
					});
					var closest = containers[0];
					new RoomVisual(creep.room.name).circle(closest.pos, {stroke:"#ff0000", fill:"transparent", radius:1});
					var amount = (closest.structureType == STRUCTURE_TERMINAL ? closest.store[RESOURCE_ENERGY] - energyInTerminalTarget : undefined);
					if (creep.withdraw(closest, RESOURCE_ENERGY, amount) == ERR_NOT_IN_RANGE) {
						creep.moveTo(closest, {visualizePathStyle:{}});
					}
					else {
						if (closest) {
							creep.memory.lastWithdrawStructure = closest.id;
							passivelyWithdrawOtherResources(creep,closest);
						}
					}
				}
				else if (!passively) { // grab energy from other rooms
					// TODO: can be made waaaay more effifient.
					var storages = _.filter(Game.structures, function(struct) {
						if (struct.structureType != STRUCTURE_STORAGE) {
							return false;
						}
						if (struct.room.name == creep.memory.targetRoom) {
							return true;
						}
						var adjacentRooms = _.values(Game.map.describeExits(creep.memory.targetRoom));
						if (adjacentRooms.indexOf(creep.memory.targetRoom) == -1) {
							return false;
						}
						return struct.structureType == STRUCTURE_STORAGE && struct.store[RESOURCE_ENERGY] > 500000;
					});
					if (storages.length > 0) {
						var closest = storages[0];
						new RoomVisual(creep.room.name).circle(closest.pos, {stroke:"#ff0000", fill:"transparent", radius:1});
						if (creep.withdraw(closest, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
							creep.moveTo(closest, {visualizePathStyle:{}});
						}
						else {
							creep.memory.lastWithdrawStructure = closest.id;
						}
					}
					else {
						// creep.say("help me out")
					}
				}
			}
		}
	}
}

function passivelyWithdrawOtherResources(creep, structure) {
	// passively withdraw other resources from containers
	if (structure.structureType == STRUCTURE_CONTAINER && (structure.pos.isNearTo(structure.room.controller) || structure.pos.inRangeTo(FIND_SOURCES, 2).length > 0)) {
		console.log(creep.name,"passively withdrawing other resources from",structure)
		if (_.sum(structure.store) - structure.store[RESOURCE_ENERGY] > 0) {
			for (var r = 0; r < RESOURCES_ALL.length; r++) {
				if (_.sum(creep.carry) == creep.carryCapacity) {
					break;
				}
				var resource = RESOURCES_ALL[r];
				if (resource == RESOURCE_ENERGY) {
					continue;
				}
				if (structure.store[resource] > 0) {
					creep.withdraw(structure, resource);
				}
			}
		}
	}
}

// get number of managers assigned to a room
function getManagerCount(room) {
	return _.filter(Game.creeps, (creep) => creep.memory.role == "manager" && creep.memory.targetRoom == room.name).length;
}

// this role is for transporting energy short distances
var roleManager = {
	findTargetRoom: function(creep) {
		var rooms = util.getOwnedRooms();
		for (var i = 0; i < rooms.length; i++) {
			var room = rooms[i];
			if (room.controller.level < 4) {
				continue;
			}
			if (getManagerCount(room) < 1) {
				creep.memory.targetRoom = room.name;
				return;
			}
		}
	},

	run: function(creep) {
		if (creep.memory.role == "manager") {
			if (!creep.memory.targetRoom) {
				this.findTargetRoom(creep);
			}

			if (creep.room.name != creep.memory.targetRoom && creep.carry[RESOURCE_ENERGY] > 200) {
				creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom), {visualizePathStyle:{}});
				return;
			}
		}

		if (!creep.memory.transporting && creep.carry[RESOURCE_ENERGY] > 0) {
			creep.memory.transporting = true;
			creep.say("transport");
		}
		if (creep.memory.transporting && creep.carry[RESOURCE_ENERGY] <= 0) {
			creep.memory.transporting = false;
			creep.say("aquiring");
		}

		if (creep.memory.transporting) {
			var structPriority = {};
			structPriority[STRUCTURE_EXTENSION] = 1;
			structPriority[STRUCTURE_SPAWN] = 1;
			structPriority[STRUCTURE_TOWER] = 2;
			structPriority[STRUCTURE_POWER_SPAWN] = 4;
			structPriority[STRUCTURE_LAB] = 5;
			structPriority[STRUCTURE_NUKER] = 6;
			structPriority[STRUCTURE_CONTAINER] = 9;
			structPriority[STRUCTURE_STORAGE] = 9;
			structPriority[STRUCTURE_TERMINAL] = 9;

			// console.log("Can't transfer to last withdraw:",Game.getObjectById(creep.memory.lastWithdrawStructure))
			var hungryStructures = creep.room.find(FIND_STRUCTURES, {
				filter: function(struct) {
					var flags = struct.pos.lookFor(LOOK_FLAGS);
					if (flags.length > 0) {
						if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
							return false;
						}
					}
					if (struct.structureType == STRUCTURE_ROAD) {
						return false;
					}

					if (struct.id == creep.memory.lastWithdrawStructure) {
						return false;
					}

					if (struct.structureType == STRUCTURE_CONTAINER) {
						return _.sum(struct.store) < struct.storeCapacity * 0.5 &&
							struct.pos.findInRange(FIND_STRUCTURES, 3, { filter: (struct) => struct.structureType == STRUCTURE_CONTROLLER }).length > 0;
					}

					if (struct.structureType == STRUCTURE_TERMINAL) {
						 if (struct.room.storage && struct.room.storage.store[RESOURCE_ENERGY] > 150000) {
							if (struct.store[RESOURCE_ENERGY] < energyInTerminalTarget) {
								return true;
							}
						}
					}

					if (creep.room.controller.level >= 4) {
						if (struct.structureType == STRUCTURE_EXTENSION && struct.energy < struct.energyCapacity) {
							return true;
						}
					}

					if (struct.structureType == STRUCTURE_TOWER && struct.energy < struct.energyCapacity * 0.5) {
						structPriority[STRUCTURE_TOWER] = 1;
						structPriority[STRUCTURE_SPAWN] = 2;
						structPriority[STRUCTURE_EXTENSION] = 2;
					}

					return ((struct.structureType == STRUCTURE_SPAWN || struct.structureType == STRUCTURE_EXTENSION ||
							struct.structureType == STRUCTURE_LAB || struct.structureType == STRUCTURE_POWER_SPAWN ||
							struct.structureType == STRUCTURE_TOWER || struct.structureType == STRUCTURE_NUKER)
							&& struct.energy < struct.energyCapacity) ||
							(struct.structureType == STRUCTURE_STORAGE && _.sum(struct.store) < struct.storeCapacity);
				}
			});
			// creep.say("structs="+hungryStructures.length);
			if (hungryStructures.length > 0) {
				hungryStructures.sort(function(a, b){
					if (a.structureType != b.structureType && structPriority[a.structureType] - structPriority[b.structureType] != 0) {
						return structPriority[a.structureType] - structPriority[b.structureType];
					}
					else {
						return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
					}
				});
				// console.log(creep.name, "hungryStructures:",hungryStructures);
				// creep.say("GIVE")
				// var closest = creep.pos.findClosestByPath(hungryStructures); // NOTE: may sometimes be null
				var closest = hungryStructures[0]
				if (closest) {
					creep.room.visual.circle(closest.pos, {stroke:"#00ff00", fill:"transparent", radius:1})
					if (creep.transfer(closest, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
						creep.moveTo(closest, {visualizePathStyle:{}});
					}
					else {
						creep.memory.lastDepositStructure = closest.id;
						passivelyWithdrawOtherResources(creep,closest);
					}
				}
				else {
					console.log("ERROR:", creep.name, "can't find closest hungryStructure");
				}
			}
			else {
				var hungryCreeps = creep.pos.findInRange(FIND_MY_CREEPS, 4, {
					filter: function(c) {
						if (c.memory.role == "builder" || c.memory.role == "upgrader" || c.memory.role == "nextroomer") {
						    if (c.memory.role == "builder" && c.memory.mineralTarget) {
						        return false;
						    }
							//console.log(c.carry[RESOURCE_ENERGY],c.carryCapacity);
							return !c.spawning && c.carry[RESOURCE_ENERGY] < c.carryCapacity * 0.5 && !c.memory.renewing && c.memory.keepAlive;
						}
						return false;
					}
				});
				//console.log(hungryCreeps.length);
				if (hungryCreeps.length > 0) {
					var closest = creep.pos.findClosestByPath(hungryCreeps);
					creep.room.visual.circle(closest.pos, {stroke:"#00ff00", fill:"transparent", radius:1})
					if (creep.transfer(closest, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
						creep.moveTo(closest, {visualizePathStyle:{}});
					}
				}
				else {
					if (Game.time % 5 == 0) {
						delete creep.memory.lastDepositStructure;
						delete creep.memory.lastWithdrawStructure;
					}
					if (creep.memory.lastDepositStructure == creep.memory.lastWithdrawStructure) {
						delete creep.memory.lastDepositStructure;
					}
					if (creep.room.energyAvailable < creep.room.energyCapacityAvailable * 0.1) {
						delete creep.memory.lastWithdrawStructure;
					}
					creep.moveTo(creep.room.storage, {visualizePathStyle:{}});
					// if (Game.spawns["Spawn1"] && Game.spawns["Spawn1"].room.name == creep.memory.targetRoom && !creep.pos.inRangeTo(Game.spawns["Spawn1"], 3)) {
					// 	creep.moveTo(Game.spawns["Spawn1"], {visualizePathStyle:{}});
					// }
					// else {
					// 	creep.moveTo(new RoomPosition(25, 25, creep.room.name), {visualizePathStyle:{}});
					// }
				}
			}

			// passively aquire if not full
			if (_.sum(creep.carry) < creep.carryCapacity) {
				doAquire(creep, true);
			}
		}
		// aquire resources
		else {
			doAquire(creep, false);
		}
	}
}

module.exports = roleManager;
