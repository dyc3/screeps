import * as cartographer from "screeps-cartographer";

import taskRenew from "./task.renew";

/*
Ligma can reduce spawn times.
*/

export default {
	run(creep: PowerCreep): void {
		const powerSpawn: StructurePowerSpawn | null = Game.getObjectById("5ca9a834279bd66008505768");
		if (!powerSpawn) {
			creep.log("ERR: can't find power spawn");
			return;
		}
		if (!((creep.spawnCooldownTime ?? 0) > Date.now())) {
			// TODO: make this not hard coded
			creep.spawn(powerSpawn);
			// creep.spawn(util.getStructures(Game.rooms["W15N8"], STRUCTURE_POWER_SPAWN)[0]);
		}

		if (!creep.room) {
			// creep is not alive
			return;
		}

		if (creep.memory.renewing) {
			// 			taskRenew.run(creep);
			if (creep.pos.isNearTo(powerSpawn)) {
				creep.renew(powerSpawn);
				creep.memory.renewing = false;
			} else {
				cartographer.moveTo(creep, powerSpawn);
			}
			return;
		} else {
			creep.memory.renewing = taskRenew.checkRenew(creep);
		}

		if (creep.room.controller && !creep.room.controller.isPowerEnabled) {
			creep.log(`Enabling power usage for room ${creep.room.name}`);
			if (creep.pos.isNearTo(creep.room.controller)) {
				creep.enableRoom(creep.room.controller);
			} else {
				cartographer.moveTo(creep, creep.room.controller);
			}
			return;
		}

		if (
			creep.powers[PWR_GENERATE_OPS].cooldown === 0 &&
			creep.room.terminal &&
			creep.room.terminal.store[RESOURCE_OPS] < 10000
		) {
			const result = creep.usePower(PWR_GENERATE_OPS);
			creep.log(`generate ops result: ${result}`);
		}

		if (creep.store.getUsedCapacity(RESOURCE_POWER) > 0) {
			if (creep.pos.isNearTo(powerSpawn)) {
				creep.transfer(powerSpawn, RESOURCE_POWER);
			} else {
				cartographer.moveTo(creep, new RoomPosition(23, 33, "W15N8"));
			}
		} else if (
			(creep.room.terminal && creep.room.terminal.store.getUsedCapacity(RESOURCE_POWER) > 0) ||
			creep.store.getUsedCapacity(RESOURCE_OPS) >= 200
		) {
			if (creep.room.terminal) {
				if (creep.pos.isNearTo(creep.room.terminal)) {
					if (creep.store.getUsedCapacity(RESOURCE_OPS) > 0) {
						creep.transfer(creep.room.terminal, RESOURCE_OPS);
					} else if (creep.room.terminal.store.getUsedCapacity(RESOURCE_POWER) > 0) {
						creep.withdraw(creep.room.terminal, RESOURCE_POWER);
					}
				} else {
					cartographer.moveTo(creep, creep.room.terminal);
				}
			}
		} else {
			// cartographer.moveTo(creep, powerSpawn);
			cartographer.moveTo(creep, new RoomPosition(23, 33, "W15N8"));
		}
	},
};
