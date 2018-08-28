var taskGather = require("task.gather");
var taskDismantle = require("task.dismantle");
var util = require('util');

// get number of repairers assigned to a room
function getRepairerCount(room) {
	return _.filter(Game.creeps, (creep) => creep.memory.role == "repairer" && creep.memory.targetRoom == room.name).length;
}

var roleRepairer = {
	findRepairTarget: function(creep) {
	    if (Memory.disable_repair_search) {
	        return;
	    }

		// if (creep.memory.role == "repairer") {
		//	console.log(creep.name,"finding new target");
		// }
		var room = undefined;
		if (Game.rooms[creep.memory.targetRoom]) {
			room = Game.rooms[creep.memory.targetRoom];
		}
		else {
			room = creep.room;
		}
		var targets = room.find(FIND_STRUCTURES, {
			filter: (struct) => {
				var flags = struct.pos.lookFor(LOOK_FLAGS);
				if (flags.length > 0) {
					if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
						return false;
					}
				}
				if (struct.hits > struct.hitsMax * 0.75) {
					return false;
				}
				if (struct.structureType == STRUCTURE_ROAD && struct.hits >= struct.hitsMax * 0.5) {
					return false;
				}
				if (struct.structureType == STRUCTURE_WALL && struct.hits >= 70000) {
					return false;
				}
				if (struct.structureType == STRUCTURE_RAMPART && struct.hits >= 60000) {
					return false;
				}
				return struct.hits < struct.hitsMax;
			}
		});
		targets.sort(function(a, b) {
			var aScore = a.hits + (creep.pos.getRangeTo(a) * 1000);
			var bScore = b.hits + (creep.pos.getRangeTo(b) * 1000);

			if (aScore < bScore) {
				return -1;
			}
			if (aScore > bScore) {
				return 1;
			}
			return 0;
		});
		if (targets.length == 0) {
			targets = creep.room.find(FIND_STRUCTURES, {
				filter: (struct) => {
					var flags = struct.pos.lookFor(LOOK_FLAGS);
					if (flags.length > 0) {
						if (flags[0].name.includes("dismantle") || flags[0].name.includes("norepair")) {
							return false;
						}
					}
					if (struct.hits > struct.hitsMax * 0.75) {
						return false;
					}
					if (struct.structureType == STRUCTURE_ROAD && struct.hits >= struct.hitsMax * 0.5) {
						return false;
					}
					if (creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > 850000 && (struct.structureType == STRUCTURE_WALL || struct.structureType == STRUCTURE_RAMPART)) {
						return true
					}
					if (struct.structureType == STRUCTURE_WALL && struct.hits >= 100000) {
						return false;
					}
					if (struct.structureType == STRUCTURE_RAMPART && struct.hits >= 105000) {
						return false;
					}
					return struct.hits < struct.hitsMax;
				}
			});
			if (targets.length > 0) {
				var avgWallHits = 0;
				var sumWallHits = 0;
				var countWalls = 0;
				for (var t in targets) {
					var target = targets[t]
					if (target.structureType != STRUCTURE_WALL && target.structureType != STRUCTURE_RAMPART) {
						continue
					}
					countWalls += 1
					sumWallHits += target.hits
				}
				avgWallHits = sumWallHits / countWalls
				targets = _.reject(targets, function(struct) {
					return (target.structureType == STRUCTURE_WALL || target.structureType == STRUCTURE_RAMPART) && struct.hits > (avgWallHits * 0.95)
				})

				var structPriority = {}
				structPriority[STRUCTURE_SPAWN] = 2
				structPriority[STRUCTURE_STORAGE] = 3
				structPriority[STRUCTURE_ROAD] = 4
				structPriority[STRUCTURE_RAMPART] = 6
				structPriority[STRUCTURE_WALL] = 7
				targets.sort(function(a, b) {
					if (a.structureType != b.structureType && structPriority[a.structureType] && structPriority[b.structureType]) {
						return structPriority[a.structureType] - structPriority[b.structureType]
					}
					else {
						// return (a.hits / a.hitsMax) - (b.hits / b.hitsMax);
						return a.hits - b.hits;
					}
				})
				// if (creep.memory.role == "repairer") {
				// 	console.log("structures need repair:",targets.length);
				// }
			}
		}
		if (targets.length > 0) {
			creep.memory.repairTarget = targets[0].id;
		}
		else {
			console.log(creep.name, "WARN: no repair targets found");
			Memory.disable_repair_search = true;
		}
	},

	/** @param {Creep} creep **/
	run: function(creep) {
		// make sure we are in our assigned room first
		if (creep.memory.role == "repairer") { // exclude builders
			if (!creep.memory.targetRoom) {
				var rooms = util.getOwnedRooms();
				for (var r = 0; r < rooms.length; r++) {
					var room = rooms[r];
					if (getRepairerCount(room) < 1) {
						creep.memory.targetRoom = room.name;
						break;
					}
				}
			}

			if ((creep.room.name != creep.memory.targetRoom || util.isOnEdge(creep.pos)) && !creep.memory.repairTarget) {
				creep.moveTo(new RoomPosition(25,25,creep.memory.targetRoom), { visualizePathStyle:{} });
				return;
			}
		}

		// find a repair target if we don't have one
		if (creep.memory.repairTarget) {
			var repairTarget = Game.getObjectById(creep.memory.repairTarget);
			// console.log("repairTarget:",repairTarget);
			if (repairTarget) {
				creep.room.visual.circle(repairTarget.pos, {fill:"transparent", radius:0.5, stroke:"#ffff00"});

				if (creep.memory.role == "repairer" && repairTarget.room.name != creep.memory.targetRoom) {
					delete creep.memory.repairTarget;
				}
				else if (repairTarget.hits == repairTarget.hitsMax) {
					console.log(creep.name,"target fully repaired");
					delete creep.memory.repairTarget;
				}
				else if (repairTarget.structureType == STRUCTURE_WALL && ((repairTarget.hits >= 70000 && repairTarget.hits <= 75000) ||
						(repairTarget.hits >= 100000 && repairTarget.hits <= 105000) || (repairTarget.hits >= 200000))) {
					if (Game.time % 4 == 0)
						delete creep.memory.repairTarget;
				}
				else if (repairTarget.structureType == STRUCTURE_RAMPART && ((repairTarget.hits >= 80000 && repairTarget.hits <= 85000) ||
						(repairTarget.hits >= 105000 && repairTarget.hits <= 110000) || (repairTarget.hits >= 200000))) {
					if (Game.time % 4 == 0)
						delete creep.memory.repairTarget;
				}
				else {
					var weakRamparts = creep.room.find(FIND_STRUCTURES, {
						filter: function(struct) {
							return struct.structureType == STRUCTURE_RAMPART && struct.hits < 3000;
						}
					});
					if (weakRamparts.length > 0) {
						delete creep.memory.repairTarget;
					}
				}
			}
			else if (!repairTarget) {
				// console.log(creep.name,"repairTarget =",repairTarget);
				delete creep.memory.repairTarget;
			}
		}
		if (!creep.memory.repairTarget) {
			this.findRepairTarget(creep);
		}

		if(creep.memory.repairing && creep.carry.energy == 0) {
			creep.memory.repairing = false;
			creep.say('gathering');
		}
		else if(!creep.memory.repairing && creep.carry.energy == creep.carryCapacity) {
			creep.memory.repairing = true;
			creep.say('repairing');
		}

		if(creep.memory.repairing) {
			var repairTarget = Game.getObjectById(creep.memory.repairTarget);
			// if (creep.memory.role == "repairer") {
			// 	console.log(creep.name,"repairTarget:",repairTarget,repairTarget.hits+"/"+repairTarget.hitsMax,"dist:",creep.pos.getRangeTo(repairTarget));
			// }
			if(repairTarget) {
				if(creep.repair(repairTarget) == ERR_NOT_IN_RANGE) {
					creep.moveTo(repairTarget, { visualizePathStyle:{} });
				}
			}
			else {
				if (taskDismantle.run(creep)) {
					creep.say("dismantle");
				}
				else {
					var constructionSite = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {filter: function(site) {
						return site.structureType == STRUCTURE_WALL || site.structureType == STRUCTURE_RAMPART
					}})
					if (constructionSite) {
						if (creep.build(constructionSite) == ERR_NOT_IN_RANGE) {
							creep.moveTo(constructionSite);
						}
					}
					else {
						// move out of the way of other creeps
						let nearbyCreeps = creep.pos.findInRange(FIND_CREEPS, 1).filter((c) => c.id != creep.id);
						if (nearbyCreeps.length > 0) {
							let direction = creep.pos.getDirectionTo(nearbyCreeps[0]);
							// console.log(creep.name, "found creep in direction:", direction);
							creep.move(util.getOppositeDirection(direction));
						}
						else {
							if (util.isDistFromEdge(creep.pos, 3)) {
								creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom)); // TODO: avoid pathfinding
							}
						}
					}
				}
			}
		}
		else {
			taskGather.run(creep);
		}
	}
}

module.exports = roleRepairer;
