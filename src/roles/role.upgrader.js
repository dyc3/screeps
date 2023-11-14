import * as cartographer from "screeps-cartographer";
import "../traveler.js";
import util from "../util";
// @ts-expect-error hasn't been converted yet
import taskGather from "../task.gather.js";
import toolCreepUpgrader from "../tool.creepupgrader.js";

// get number of upgraders assigned to a room
function getUpgraderCount(room) {
	return _.filter(Game.creeps, creep => creep.memory.role === "upgrader" && creep.memory.targetRoom === room.name)
		.length;
}

const roleUpgrader = {
	/** @param {Creep} creep **/
	findTargetRoom(creep) {
		let rooms = util.getOwnedRooms();
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
	run(creep) {
		if (!creep.memory.targetRoom) {
			creep.memory.targetRoom = this.findTargetRoom(creep);
			console.log(creep.name, "targetRoom:", creep.memory.targetRoom);
		}

		if (creep.room.name !== creep.memory.targetRoom) {
			if (Game.rooms[creep.memory.targetRoom]) {
				cartographer.moveTo(creep, Game.rooms[creep.memory.targetRoom].controller, { range: 3 });
			} else {
				cartographer.moveTo(creep, new RoomPosition(25, 25, creep.memory.targetRoom), { range: 20 });
			}
			return;
		}

		if (creep.memory.upgrading && creep.carry.energy === 0) {
			creep.memory.upgrading = false;
			creep.say("gathering");
		} else if (!creep.memory.upgrading && creep.carry.energy === creep.carryCapacity) {
			creep.memory.upgrading = true;
			creep.say("upgrading");
		}

		if (creep.memory.upgrading) {
			if (creep.room.controller.my) {
				// dont get in the way of the sources while we dont need them
				let energySources = creep.pos.findInRange(FIND_SOURCES, 1);
				if (energySources.length > 0) {
					cartographer.moveTo(creep, creep.room.controller);
				} else {
					if (creep.room.controller.level < 8) {
						if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
							cartographer.moveTo(creep, creep.room.controller, { range: 3, maxRooms: 1 });
						}
					} else {
						if (
							creep.room.controller.ticksToDowngrade < 50000 ||
							(creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > 500000)
						) {
							creep.upgradeController(creep.room.controller);
						}
						if (!creep.pos.inRangeTo(creep.room.controller, 3)) {
							cartographer.moveTo(creep, creep.room.controller, { range: 3, maxRooms: 1 });
						}
					}
					if (creep.pos.findInRange(FIND_CREEPS, 2).length > 2) {
						cartographer.moveTo(creep, creep.room.controller, { maxRooms: 1 });
					}
				}
			} else {
				cartographer.moveTo(creep, new RoomPosition(25, 25, creep.memory.targetRoom), { range: 20 });
			}
		} else {
			taskGather.run(creep);
		}
	},
};

module.exports = roleUpgrader;
export default roleUpgrader;
