import util from "./util";
import { Role } from "roles/meta";
// @ts-ignore
import taskRenew from "./task.renew.js";

const rangedBody = [
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	MOVE,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
	RANGED_ATTACK,
];

const defendRoom = "W16N7";

export function dlog(...args: any[]) {
	console.log('<span style="color: orange">tmp defense: ', ...args, "</span>");
}

export function run() {
	const creeps = util.getCreeps(Role.TmpDefense);
	const room = Game.rooms[defendRoom];
	dlog(`Defending room ${defendRoom} - creeps: ${creeps.length}`);
	const hostiles = room.find(FIND_HOSTILE_CREEPS);

	for (const creep of creeps) {
		if (creep.room.name !== defendRoom) {
			creep.travelTo(new RoomPosition(27, 31, defendRoom), { range: 3 });
			continue;
		}

		if ((creep.ticksToLive as number) < 200) {
			creep.memory.renewing = true;
		}

		if (creep.memory.renewing) {
			// creep.memory.renewTarget = Game.spawns["Spawn8"].id;
			creep.memory.renew_force_amount = 1400;
			taskRenew.run(creep);
			continue;
		}

		// position to attack from
		let attackPos: RoomPosition | null = null;
		if (creep.name === "tmpdefense_2e9898f") {
			attackPos = room.getPositionAt(18, 46);
		} else if (creep.name === "tmpdefense_2e989ff") {
			attackPos = room.getPositionAt(30, 45);
			// attackPos = room.getPositionAt(19, 46);
		} else if (creep.name === "tmpdefense_2e98a6a") {
			attackPos = room.getPositionAt(30, 46);
		} else if (creep.name === "tmpdefense_2e98b21") {
			attackPos = room.getPositionAt(20, 46);
		} else if (creep.name === "tmpdefense_2e98c43") {
			attackPos = room.getPositionAt(34, 38);
		} else if (creep.name === "tmpdefense_2e98c41") {
			attackPos = room.getPositionAt(31, 42);
		} else if (creep.name === "tmpdefense_2e992da") {
			attackPos = room.getPositionAt(30, 46);
		} else if (creep.name === "tmpdefense_2e99421") {
			attackPos = room.getPositionAt(31, 42);
		}
		if (!attackPos) {
			creep.say("no pos");
			dlog(`No attack position for ${creep.name}`);
			creep.travelTo(new RoomPosition(27, 31, defendRoom), { range: 3 });
		} else {
			if (!creep.pos.isEqualTo(attackPos)) {
				dlog(`${creep.name} moving to ${attackPos.x},${attackPos.y}`);
				creep.travelTo(attackPos, { range: 0 });
			}
		}

		const hostilesInRange = hostiles.filter(h => h.pos.inRangeTo(creep.pos, 3));
		if (hostilesInRange.length === 0) {
			continue;
		}

		const target = hostilesInRange[0];
		dlog(`${creep.name} attacking ${target.name}`);
		if (creep.pos.isNearTo(target)) {
			creep.rangedMassAttack();
		} else {
			creep.rangedAttack(target);
		}
	}
}

function spawnTmpDefense(spawnName: string) {
	const spawn = Game.spawns[spawnName];

	const result = spawn.spawnCreep(rangedBody, `tmpdefense_${Game.time.toString(16)}`, {
		// @ts-ignore
		memory: {
			role: Role.TmpDefense,
			keepAlive: true,
			renewing: false,
			stage: 0,
		},
	});

	if (typeof result === "string") {
		return result;
	} else {
		return util.errorCodeToString(result);
	}
}

global.TmpDefense = {
	spawnTmpDefense,
};

export default {
	run,
};
