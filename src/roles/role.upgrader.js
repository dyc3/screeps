import "../traveler.js";
import util from "../util";
// @ts-expect-error hasn't been converted yet
import taskGather from "../task.gather.js";
import toolCreepUpgrader from "../tool.creepupgrader.js";

// get number of upgraders assigned to a room
function getUpgraderCount(room) {
	return _.filter(Game.creeps, (creep) => creep.memory.role == "upgrader" && creep.memory.targetRoom == room.name).length;
}

const roleUpgrader = {
	/** @param {Creep} creep **/
	findTargetRoom: function(creep) {
		let rooms = util.getOwnedRooms()
		for (let i = 0; i < rooms.length; i++) {
			let room = rooms[i];
			if (!room.controller || !room.controller.my) {
				continue;
			}
			// console.log("count: ", getUpgraderCount(room))
			if (getUpgraderCount(room) < toolCreepUpgrader.getUpgraderQuota(room)) {
				return room.name;
			}
		}

		// else return the first room with rcl < 8
		for (let i = 0; i < rooms.length; i++) {
			let room = rooms[i];
			if (!room.controller || !room.controller.my) {
				continue;
			}
			if (room.controller.level < 8) {
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
			if (Game.rooms[creep.memory.targetRoom]) {
				creep.moveTo(Game.rooms[creep.memory.targetRoom].controller, { range: 3 });
			}
			else {
				creep.moveToRoom(creep.memory.targetRoom);
			}
			return;
		}

		if(creep.memory.upgrading && creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
			creep.memory.upgrading = false;
			creep.say('gathering');
		}
		else if(!creep.memory.upgrading && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
			creep.memory.upgrading = true;
			creep.say('upgrading');
		}

		if(creep.memory.upgrading) {
			if (creep.room.controller.my) {
				const shouldUpgrade = creep.room.controller.level < 8 || creep.room.controller.ticksToDowngrade < 50000 || creep.room.storage.store[RESOURCE_ENERGY] > 500000

				if (shouldUpgrade) {
					if (!creep.pos.inRangeTo(creep.room.controller, 3)) {
						creep.moveTo(creep.room.controller, { range: 3, maxRooms: 1 });
					} else {
						creep.moveOffRoad();
						creep.upgradeController(creep.room.controller);
					}
				}
			}
			else {
				creep.moveToRoom(creep.memory.targetRoom);
			}
		}
		else {
			taskGather.run(creep);
		}
	}
};

module.exports = roleUpgrader;
export default roleUpgrader;
