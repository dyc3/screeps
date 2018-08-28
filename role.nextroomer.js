var taskGather = require('task.gather');
var roleScout = require('role.scout');
var roleHarvester = require('role.harvester');
var util = require('util');

var roleNextRoomer = {

	setMode: function(creep, mode) {
		if (creep.memory.mode != mode) {
			creep.say(mode);
		}
		creep.memory.mode = mode;
	},

	moveToTargetRoom: function(creep) {
		if (creep.room.name != Memory.expansionTarget) {
			creep.moveTo(new RoomPosition(25, 25, Memory.expansionTarget));
		}
		else {
// 			creep.moveTo(creep.room.controller)
			creep.moveTo(new RoomPosition(25, 25, Memory.expansionTarget));
			console.log("Already in expansionTarget");
// 			if (Game.time % 3 == 0) {
				this.setMode(creep, "gather");
// 			}
		}
	},

	reserveTargetRoom: function(creep) {
		if (creep.pos.isNearTo(creep.room.controller)) {
			creep.reserveController(creep.room.controller);
		}
		else {
			creep.moveTo(creep.room.controller);
		}
	},

	claimTargetRoom: function(creep) {
		if (creep.pos.isNearTo(creep.room.controller)) {
			creep.claimController(creep.room.controller);
			this.setMode(creep, "gather");
			Memory.roomInfo[creep.room.name].ownership = roleScout.getRoomOwnershipInfo();
		}
		else {
			creep.moveTo(creep.room.controller);
		}
	},

	upgrade: function(creep) {
		if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
			creep.moveTo(creep.room.controller);
		}
	},

	build: function(creep) {
		var sites = util.getConstruction(creep.room);
		sites = sites.sort(function(a,b){
			return (a.hits / a.hitsMax) - (b.hits / b.hitsMax)
		})
		var targetSite = sites[0];
		if (creep.build(targetSite) == ERR_NOT_IN_RANGE) {
			creep.moveTo(targetSite)
		}
	},

	transfer: function(creep) {
		if (!creep.memory.transferTarget) {
			var targets = roleHarvester.findTransferTargets(creep)
			creep.memory.transferTarget = targets[0].id;
		}
		var transferTarget = Game.getObjectById(creep.memory.transferTarget)
		if (creep.transfer(transferTarget, RESOURCE_ENERGY)) {
			creep.moveTo(transferTarget)
		}
	},

	run: function(creep) {
		// fix up memory
		if (!Memory.expansionTarget) {
			console.log("WARN: No expansionTarget");
			return;
		}
		if (!creep.memory.mode) {
			this.setMode(creep, "moveToRoom");
		}
		else if (creep.memory.mode != "transfer") {
			delete creep.memory.transferTarget;
		}

		// determine mode
		// NOTE: im sorry
		var room = creep.room;
		if (creep.room.name != Memory.expansionTarget) {
			this.setMode(creep, "moveToRoom");
		}
		else if (creep.room.controller) {
// 			if (creep.room.controller.reservation) {
// 				if (creep.room.controller.reservation.username != creep.owner.username) {
// 					this.setMode(creep, "reserve")
// 				}
// 				else if (creep.room.controller.reservation.ticksToEnd <= 1500) {
// 					this.setMode(creep, "reserve")
// 				}
// 			}
// 			else {
// 				if (!creep.room.controller.owner) {
// 					this.setMode(creep, "claim")
// 				}
// 			}

			if (creep.room.controller.my) {
				if (creep.carry[RESOURCE_ENERGY] == 0) {
					this.setMode(creep, "gather");
				}
				if (creep.carry[RESOURCE_ENERGY] == creep.carryCapacity) {
					if (creep.room.controller.level <= 0 || creep.room.controller.ticksToDowngrade < 2000) {
						this.setMode(creep, "upgrade");
					}
					else {
						var spawn = util.getSpawn(creep.room);
						if (creep.room.controller.level >= 1 && !spawn) {
							// console.log("NO SPAWN")
							if (util.getConstruction(creep.room, STRUCTURE_SPAWN).length == 0) {
								// find where to place spawn
								//var cPos = creep.room.controller.pos;
								var closestSource = creep.room.controller.pos.findClosestByPath(FIND_SOURCES);
								var path = creep.room.controller.pos.findPathTo(closestSource);
								var cPos = new RoomPosition(path[0].x, path[0].y, creep.room.name)
								var off = 2;
								var possiblePos = [
									new RoomPosition(cPos.x, cPos.y - off, cPos.roomName), // up
									new RoomPosition(cPos.x, cPos.y + off, cPos.roomName), // down
									new RoomPosition(cPos.x - off, cPos.y, cPos.roomName), // left
									new RoomPosition(cPos.x + off, cPos.y, cPos.roomName), // right
								];
								for (var i = 0; i < possiblePos.length; i++) {
									var terrain = possiblePos[i].lookFor(LOOK_TERRAIN)[0];
									if (terrain == "wall") {
										possiblePos.splice(i, 1);
										i--;
									}
								}
								var spawnPos = closestSource.pos.findClosestByPath(possiblePos);

								// if (!Game.flags["newspawn"]) {
								// 	spawnPos.createFlag("newspawn");
								// }
								spawnPos.createConstructionSite(STRUCTURE_SPAWN);
							}
							this.setMode(creep, "build")
						}
						else {
							if (spawn && spawn.energy < spawn.energyCapacity && spawn.room.energyAvailable > 300) {
								this.setMode(creep, "transfer");
							}
							else if (util.getConstruction(room).length > 0) {
								this.setMode(creep, "build");
							}
							else {
								this.setMode(creep, "upgrade");
							}
						}
					}
				}
			}
		}

// 		creep.say(creep.memory.mode)

		switch (creep.memory.mode) {
			case "moveToRoom":
				this.moveToTargetRoom(creep);
				break;
			case "reserve":
				this.reserveTargetRoom(creep);
				break;
			case "claim":
				this.claimTargetRoom(creep);
				break;
			case "gather":
				taskGather.run(creep);
				break;
			case "upgrade":
				this.upgrade(creep);
				break;
			case "build":
				this.build(creep);
				break;
			case "transfer":
				this.transfer(creep);
				break;
			default:
				console.log(creep.name,"ERR: unknown mode",creep.memory.mode);
				break;
		}
	}
}

module.exports = roleNextRoomer;
