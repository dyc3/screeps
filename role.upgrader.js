var taskGather = require("task.gather");
var util = require("util");
var toolCreepUpgrader = require("tool.creepupgrader");

// get number of upgraders assigned to a room
function getUpgraderCount(room) {
	return _.filter(Game.creeps, (creep) => creep.memory.role == "upgrader" && creep.memory.targetRoom == room.name).length;
}

var roleUpgrader = {
	/** @param {Creep} creep **/
	findTargetRoom: function(creep) {
		var rooms = util.getOwnedRooms()
		for (var i = 0; i < rooms.length; i++) {
			var room = rooms[i]
			if (!room.controller || !room.controller.my) {
				continue;
			}
			// console.log("count: ", getUpgraderCount(room))
			if (getUpgraderCount(room) < toolCreepUpgrader.getUpgraderQuota(room)) {
				return room.name;
			}
		}
		// else return the first room
		return rooms[0].name;
	},

	/** @param {Creep} creep **/
	run: function(creep) {
		if (!creep.memory.targetRoom) {
			creep.memory.targetRoom = this.findTargetRoom(creep);
			console.log(creep.name, "targetRoom:", creep.memory.targetRoom);
		}

		if (creep.room.name != creep.memory.targetRoom) {
			creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom));
			return;
		}

		if(creep.memory.upgrading && creep.carry.energy == 0) {
			creep.memory.upgrading = false;
			creep.say('gathering');
		}
		else if(!creep.memory.upgrading && creep.carry.energy == creep.carryCapacity) {
			creep.memory.upgrading = true;
			creep.say('upgrading');
		}

		if(creep.memory.upgrading) {
			if (creep.room.controller.my) {
				// dont get in the way of the sources while we dont need them
				var energySources = creep.pos.findInRange(FIND_SOURCES, 1);
				if (energySources.length > 0) {
					creep.moveTo(creep.room.controller);
				}
				else {
					if (creep.room.controller.level < 8) {
						if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
							creep.moveTo(creep.room.controller);
						}
					}
					else {
						if (creep.room.controller.ticksToDowngrade < 50000 || creep.room.storage.store[RESOURCE_ENERGY] > 800000) {
							creep.upgradeController(creep.room.controller);
						}
						if (!creep.pos.inRangeTo(creep.room.controller, 3)) {
							creep.moveTo(creep.room.controller);
						}
					}
					if (creep.pos.findInRange(FIND_CREEPS, 2).length > 2) {
						creep.moveTo(creep.room.controller);
					}
				}
			}
			else {
				creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom));
			}
		}
		else {
			taskGather.run(creep);
		}
	}
};

module.exports = roleUpgrader;
