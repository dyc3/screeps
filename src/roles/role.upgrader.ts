import * as cartographer from "screeps-cartographer";

import { getUpgraderQuota } from "../tool.creepupgrader";
// @ts-expect-error hasn't been converted yet
import taskGather from "../task.gather.js";
import util from "../util";

// get number of upgraders assigned to a room
function getUpgraderCount(room) {
	return _.filter(Game.creeps, creep => creep.memory.role === "upgrader" && creep.memory.targetRoom === room.name)
		.length;
}

const roleUpgrader = {
	findTargetRoom(): string {
		const rooms = util.getOwnedRooms();
		for (const room of rooms) {
			if (!room.controller || !room.controller.my) {
				continue;
			}
			// console.log("count: ", getUpgraderCount(room))
			if (getUpgraderCount(room) < getUpgraderQuota(room)) {
				return room.name;
			}
		}

		// else return the first room with rcl < 8
		for (const room of rooms) {
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

	run(creep: Creep): void {
		if (!creep.memory.targetRoom) {
			creep.memory.targetRoom = this.findTargetRoom(creep);
			console.log(creep.name, "targetRoom:", creep.memory.targetRoom);
		}

		if (creep.room.name !== creep.memory.targetRoom) {
			if (Game.rooms[creep.memory.targetRoom]) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				cartographer.moveTo(creep, { pos: Game.rooms[creep.memory.targetRoom].controller!.pos, range: 3 });
			} else {
				cartographer.moveTo(creep, { pos: new RoomPosition(25, 25, creep.memory.targetRoom), range: 20 });
			}
			return;
		}

		if (creep.memory.upgrading && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
			creep.memory.upgrading = false;
			creep.say("gathering");
		} else if (!creep.memory.upgrading && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
			creep.memory.upgrading = true;
			creep.say("upgrading");
		}

		if (creep.memory.upgrading) {
			if (creep.room.controller?.my) {
				const shouldUpgrade =
					creep.room.controller.level < 8 ||
					creep.room.controller.ticksToDowngrade < 50000 ||
					(creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > 500000);
				if (shouldUpgrade) {
					cartographer.moveTo(creep, { pos: creep.room.controller.pos, range: 3 }, { maxRooms: 1 });
					creep.upgradeController(creep.room.controller);
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
