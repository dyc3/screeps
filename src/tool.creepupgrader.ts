import { Role } from "./roles/meta";
import toolEnergySource from "./tool.energysource";
import util from "./util";

export function getUpgraderQuota(room: Room): number {
	if (!room.controller) {
		return 0;
	}
	// TODO: clean this up a little
	function getQuota(rcl: number | undefined): number {
		let value = 2;
		switch (rcl) {
			case 1:
				value = util.getOwnedRooms().length > 1 ? 2 : 1;
				break;
			case 2:
			case 3:
			case 4:
			case 5:
				value = util.getOwnedRooms().length > 1 ? 2 : 2;
				break;
			case 6:
				value = 2;
				break;
			case 7:
				value = 1;
				break;
			case _.keys(CONTROLLER_LEVELS).length:
			case 8:
				value = 1;
				break;
			default:
				value = 2;
				break;
		}
		return value;
	}
	if (room.storage && room.controller.pos.getRangeTo(room.storage) <= 5) {
		return 1;
	}
	return getQuota(room.controller?.level);
}

export function getScientistQuota(room: Room): number {
	if (!room.controller) {
		return 0;
	}
	if (
		room.controller.level >= 6 &&
		(util.getStructures(room, STRUCTURE_LAB).length > 0 || util.getStructures(room, STRUCTURE_FACTORY).length > 0)
	) {
		return 1;
	}
	return 0;
}

export function getBuilderQuota(): number {
	// 	var rooms = util.getOwnedRooms();
	// 	var room = rooms[0];
	// 	for (var r = 0; r < rooms.length; r++) {
	// 		if (rooms[r].controller.my && (rooms[r].controller.level > room.controller.level || !room.controller.my)) {
	// 			room = rooms[r];
	// 		}
	// 	}
	// 	return room.controller.level > 2 ? 2 : 1;

	const rooms = util.getOwnedRooms();
	if (rooms.length < 3) {
		return 1;
	}
	const lowRCL = rooms.filter((room: Room) => room.controller && room.controller.level <= 4).length;
	if (lowRCL > 0) {
		return 3;
	}
	return 3;
}

export function getManagerQuota(room: Room): number {
	if (!room.controller) {
		return 0;
	}
	if (room.controller.my && room.controller.level >= 4) {
		return 1;
	}
	return 0;
}

export function getRelayQuota(room: Room): number {
	if (!room.controller) {
		return 0;
	}
	if (room.controller.level >= 6) {
		return 5;
	}
	const linkCount = CONTROLLER_STRUCTURES[STRUCTURE_LINK][room.controller.level];
	if (linkCount === 0) {
		return 0;
	}
	if (linkCount === 2) {
		return 3;
	}
	if (linkCount >= 4) {
		return 5;
	}
	return linkCount;
}

export function getMinerQuota(): number {
	let mineable = 0;
	const rooms = util.getOwnedRooms();
	for (const room of rooms) {
		if (CONTROLLER_STRUCTURES[STRUCTURE_EXTRACTOR][room.controller?.level ?? 0] > 0) {
			const extractors = util.getStructures(room, STRUCTURE_EXTRACTOR);
			for (const struct of extractors) {
				const mineral = struct.pos.lookFor(LOOK_MINERALS)[0];
				if (mineral) {
					if (mineral.ticksToRegeneration ?? 0 > 200) {
						continue;
					}
					mineable++;
				}
			}
		}
	}
	return Math.ceil(mineable / 2);
}

export function getRepairerQuota(room: Room): number {
	if (!room.controller) {
		return 0;
	}
	const rooms = util.getOwnedRooms();
	if (room.controller.level >= (rooms.length > 1 ? 4 : 6)) {
		return 1;
	}
	return 0;
}

export type RoleMetadata =
	| {
			name: Role;
			quotaPerRoom: true;
			quota(room: Room): number;
			stages: BodyPartConstant[][];
	  }
	| {
			name: Role;
			quotaPerRoom: false;
			quota(): number;
			stages: BodyPartConstant[][];
	  };

const roles: Partial<Record<Role, RoleMetadata>> = {
	[Role.Harvester]: {
		name: Role.Harvester,
		quota: toolEnergySource.getHarvesterQuota,
		quotaPerRoom: true,
		stages: [
			[WORK, CARRY, MOVE, MOVE],
			[WORK, WORK, CARRY, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE],
		],
	},
	[Role.Manager]: {
		name: Role.Manager,
		quota: getManagerQuota,
		quotaPerRoom: true,
		stages: [
			[CARRY, CARRY, MOVE, MOVE],
			[CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
			[CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
			// [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			// [WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
		],
	},
	[Role.Relay]: {
		name: Role.Relay,
		quota: getRelayQuota,
		quotaPerRoom: true,
		stages: [[CARRY, CARRY, CARRY, CARRY, MOVE]],
	},
	[Role.Upgrader]: {
		name: Role.Upgrader,
		quota: getUpgraderQuota,
		quotaPerRoom: true,
		// HACK: there is a monkey patch in the creep spawning code to add a couple of additional move parts if the target room's RCL <= 5
		stages: [
			[WORK, CARRY, MOVE, MOVE],
			[WORK, WORK, CARRY, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
			[
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
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
			],
		],
	},
	[Role.Builder]: {
		name: Role.Builder,
		quota: getBuilderQuota,
		quotaPerRoom: false,
		stages: [
			[WORK, CARRY, MOVE, MOVE],
			[WORK, WORK, CARRY, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
			[
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
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
			],
			// [WORK,WORK,WORK,WORK,WORK,		WORK,WORK,WORK,WORK,WORK,		WORK,WORK,WORK,WORK,WORK,
			// CARRY,CARRY,CARRY,CARRY,CARRY,	CARRY,CARRY,CARRY,CARRY,CARRY,	MOVE,MOVE,MOVE,MOVE,MOVE,
			// MOVE,MOVE,MOVE,MOVE,MOVE,		MOVE,MOVE,MOVE,MOVE,MOVE, 		MOVE,MOVE,MOVE,MOVE,MOVE,		MOVE,MOVE,MOVE,MOVE,MOVE],
		],
	},
	[Role.Repairer]: {
		name: Role.Repairer,
		quota: getRepairerQuota,
		quotaPerRoom: true,
		stages: [
			[WORK, CARRY, MOVE],
			[WORK, WORK, CARRY, MOVE, MOVE],
			[WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
			[
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
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
			],
			// [WORK,WORK,WORK,WORK,WORK,		WORK,WORK,WORK,WORK,WORK,		WORK,WORK,WORK,WORK,WORK,
			// CARRY,CARRY,CARRY,CARRY,CARRY,	CARRY,CARRY,CARRY,CARRY,CARRY,	CARRY,CARRY,CARRY,CARRY,CARRY,
			// MOVE,MOVE,MOVE,MOVE,MOVE,		MOVE,MOVE,MOVE,MOVE,MOVE, 		MOVE,MOVE,MOVE,MOVE,MOVE,		MOVE,MOVE,MOVE,MOVE,MOVE],
		],
	},
	[Role.RemoteHarvester]: {
		name: Role.RemoteHarvester,
		quota() {
			return Memory.remoteMining.needHarvesterCount;
		},
		quotaPerRoom: false,
		stages: [
			[WORK, WORK, WORK, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
		],
	},
	[Role.Carrier]: {
		name: Role.Carrier,
		quota() {
			return Memory.remoteMining.needCarrierCount;
		},
		quotaPerRoom: false,
		stages: [
			[CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
			[CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
			[
				WORK,
				WORK,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
			],
			[
				WORK,
				WORK,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
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
			],
			[
				WORK,
				WORK,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
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
			],
		],
	},
	[Role.Miner]: {
		name: Role.Miner,
		quota: getMinerQuota,
		quotaPerRoom: false,
		stages: [
			[WORK, WORK, WORK, MOVE, CARRY, CARRY, MOVE, MOVE, MOVE],
			[WORK, WORK, WORK, WORK, MOVE, CARRY, MOVE, CARRY, MOVE, MOVE],
			[
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				MOVE,
				MOVE,
				CARRY,
				CARRY,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
			],
			[
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
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
			],
		],
	},
	[Role.Scientist]: {
		// Game.spawns["Spawn1"].createCreep([CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], "scientist1", {role:"scientist", keepAlive:true})
		name: Role.Scientist,
		quota: getScientistQuota,
		// quota:0,
		quotaPerRoom: true,
		stages: [[CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]],
	},
};

const creepUpgrader = {
	roles,

	getRoleMetadata(role: Role): RoleMetadata | undefined {
		return roles[role];
	},

	// returns -1 if stage not found
	getCreepStage(creep: Creep): number {
		if (creep.memory.role === Role.Guardian) {
			return 0;
		}
		const roleMeta = this.roles[creep.memory.role];
		if (!roleMeta) {
			return -1;
		}
		for (let s = 0; s < roleMeta.stages.length; s++) {
			let isMatch = true;
			for (let b = 0; b < creep.body.length; b++) {
				if (creep.body[b].type !== roleMeta.stages[s][b]) {
					isMatch = false;
					break;
				}
			}
			if (isMatch) {
				return s;
			}
		}
		return -1;
	},

	/**
	 * Get the highest possible stage that a creep with the role specified can spawn with at the spawn specified.
	 * @param role
	 * @param room
	 * @returns The stage number, or -1 if the specified spawn can't spawn any stage
	 */
	getHighestStage(role: Role, room: Room): number {
		const roleMeta = this.roles[role];
		if (!roleMeta) {
			return -1;
		}
		// iterating backwards would probably be faster
		for (let i = 0; i < roleMeta.stages.length; i++) {
			if (room.energyAvailable < this.getCreepCost(role, i)) {
				return i - 1;
			}
		}
		return roleMeta.stages.length - 1;
	},

	getCreepCost(role: Role, stage: number): number {
		const roleMeta = this.roles[role];
		if (!roleMeta) {
			return -1;
		}
		let cost = 0;
		for (const part of roleMeta.stages[stage]) {
			cost += BODYPART_COST[part];
		}
		return cost;
	},

	getUpgraderQuota,
	getMinerQuota,
};

module.exports = creepUpgrader;
export default creepUpgrader;
