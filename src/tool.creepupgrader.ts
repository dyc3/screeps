import toolEnergySource from './tool.energysource';
import util from './util';
import { Role } from './roles/meta';

/** @param {Room} room **/
export function getUpgraderQuota(room: Room) {
	if (!room.controller) {
		return 0;
	}
	// TODO: clean this up a little
	function _getQuota(rcl: number | undefined) {
		var value = 2;
		switch (rcl) {
			case 1:
				value = util.getOwnedRooms().length > 1 ? 2 : 1;
				break;
			case 2:
			case 3:
			case 4:
			case 5:
				value = util.getOwnedRooms().length > 1 ? 4 : 2;
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
	return _getQuota(room.controller?.level);
}

/** @param {Room} room **/
export function getScientistQuota(room: Room) {
	if (!room.controller) {
		return 0;
	}
	if (room.controller.level>= 6 && (util.getStructures(room, STRUCTURE_LAB).length > 0 || util.getStructures(room, STRUCTURE_FACTORY).length > 0)) {
		return 1;
	}
	return 0;
}

export function getBuilderQuota() {
// 	var rooms = util.getOwnedRooms();
// 	var room = rooms[0];
// 	for (var r = 0; r < rooms.length; r++) {
// 		if (rooms[r].controller.my && (rooms[r].controller.level > room.controller.level || !room.controller.my)) {
// 			room = rooms[r];
// 		}
// 	}
// 	return room.controller.level > 2 ? 2 : 1;

	let rooms = util.getOwnedRooms();
	if (rooms.length < 3) {
		return 1;
	}
	let lowRCL = rooms.filter((room: Room) => room.controller && room.controller.level <= 4).length;
	if (lowRCL > 0) {
		return 3;
	}
	return 1;
}

export function getManagerQuota(room: Room) {
	if (!room.controller) {
		return 0;
	}
	if (room.controller.my && room.controller.level >= 4) {
		return 1;
	}
	return 0;
}

export function getRelayQuota(room: Room) {
	if (!room.controller) {
		return 0;
	}
	let linkCount = CONTROLLER_STRUCTURES[STRUCTURE_LINK][room.controller.level];
	if (linkCount === 0) {
		return 0;
	}
	let count = linkCount;
	if (count == 2) {
		count = 3;
	}
	else if (count > 5) {
		count = 5;
	}
	return count;
}

export function getMinerQuota() {
// 	let count = 0;
// 	if (CONTROLLER_STRUCTURES[STRUCTURE_EXTRACTOR][room.controller.level] > 0) {
// 		let extractors = util.getStructures(room, STRUCTURE_EXTRACTOR);
// 		for (let i = 0; i < extractors.length; i++) {
// 			let struct = extractors[i];
// 			let mineral = struct.pos.lookFor(LOOK_MINERALS)[0];
// 			if (mineral) {
// 				count++;
// 			}
// 		}
// 	}
// 	return count;
	// FIXME: miner quota is broken
	if (Game.shard.name === "shard0") {
		return 2;
	}
	return 0;
}

export function getRepairerQuota(room: Room) {
	if (!room.controller) {
		return 0;
	}
	let rooms = util.getOwnedRooms();
	if (room.controller.level >= (rooms.length > 1 ? 4 : 6)) {
		return 1;
	}
	return 0;
}

export type RoleMetadata = {
	name: Role,
	quota_per_room: true
	quota(room: Room): number,
	stages: BodyPartConstant[][],
} | {
	name: Role,
	quota_per_room: false
	quota(): number,
	stages: BodyPartConstant[][],
};

const roles: Partial<Record<Role, RoleMetadata>> = {
	[Role.Harvester]: {
		name: Role.Harvester,
		quota:toolEnergySource.getHarvesterQuota,
		quota_per_room:true,
		stages:[
			[WORK,CARRY,MOVE,MOVE],
			[WORK,WORK,CARRY,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,CARRY,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,WORK,WORK,CARRY,MOVE]
		],
	},
	[Role.Manager]: {
		name: Role.Manager,
		quota:getManagerQuota,
		quota_per_room:true,
		stages:[
			[CARRY,CARRY,MOVE,MOVE],
			[CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			[CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			//[CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			//[WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
		],
	},
	[Role.Relay]: {
		name: Role.Relay,
		quota: getRelayQuota,
		quota_per_room: true,
		stages:[
			[CARRY,CARRY,CARRY,CARRY,MOVE]
		]
	},
	[Role.Upgrader]: {
		name: Role.Upgrader,
		quota: getUpgraderQuota,
		quota_per_room: true,
		// HACK: there is a monkey patch in the creep spawning code to add a couple of additional move parts if the target room's RCL <= 5
		stages:[
			[WORK,CARRY,MOVE,MOVE],
			[WORK,WORK,CARRY,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
		],
	},
	[Role.Builder]: {
		name: Role.Builder,
		quota:getBuilderQuota,
		quota_per_room:false,
		stages:[
			[WORK,CARRY,MOVE,MOVE],
			[WORK,WORK,CARRY,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			// [WORK,WORK,WORK,WORK,WORK,		WORK,WORK,WORK,WORK,WORK,		WORK,WORK,WORK,WORK,WORK,
			// CARRY,CARRY,CARRY,CARRY,CARRY,	CARRY,CARRY,CARRY,CARRY,CARRY,	MOVE,MOVE,MOVE,MOVE,MOVE,
			// MOVE,MOVE,MOVE,MOVE,MOVE,		MOVE,MOVE,MOVE,MOVE,MOVE, 		MOVE,MOVE,MOVE,MOVE,MOVE,		MOVE,MOVE,MOVE,MOVE,MOVE],
		],
	},
	[Role.Repairer]:{
		name: Role.Repairer,
		quota:getRepairerQuota,
		quota_per_room:true,
		stages:[
			[WORK,CARRY,MOVE],
			[WORK,WORK,CARRY,MOVE,MOVE],
			[WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			// [WORK,WORK,WORK,WORK,WORK,		WORK,WORK,WORK,WORK,WORK,		WORK,WORK,WORK,WORK,WORK,
			// CARRY,CARRY,CARRY,CARRY,CARRY,	CARRY,CARRY,CARRY,CARRY,CARRY,	CARRY,CARRY,CARRY,CARRY,CARRY,
			// MOVE,MOVE,MOVE,MOVE,MOVE,		MOVE,MOVE,MOVE,MOVE,MOVE, 		MOVE,MOVE,MOVE,MOVE,MOVE,		MOVE,MOVE,MOVE,MOVE,MOVE],
		],
	},
	[Role.RemoteHarvester]:{
		name: Role.RemoteHarvester,
		quota:function() { return Memory.remoteMining.needHarvesterCount; },
		quota_per_room:false,
		stages:[
			[WORK,WORK,WORK,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
		],
	},
	[Role.Carrier]: {
		name: Role.Carrier,
		quota:function() { return Memory.remoteMining.needCarrierCount; },
		quota_per_room:false,
		stages:[
			[CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
			[CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY, MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
		],
	},
	// "scout":{
	// 	name:"scout",
	// 	// quota:((Game.spawns["Spawn1"].room.controller.level >= 5) ? 1 : 0),
	// 	quota:function() { return 0; },
	// 	quota_per_room:false,
	// 	stages:[
	// 		[MOVE],
	// 	],
	// },
	[Role.Miner]: {
		name: Role.Miner,
		quota:getMinerQuota,
		quota_per_room:false,
		stages:[
			[WORK,WORK,WORK,MOVE,CARRY,CARRY,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,MOVE,CARRY,MOVE,CARRY,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
			[WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK, CARRY,CARRY,CARRY,CARRY,CARRY,CARRY, MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
		]
	},
	[Role.Scientist]: { // Game.spawns["Spawn1"].createCreep([CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], "scientist1", {role:"scientist", keepAlive:true})
		name: Role.Scientist,
		quota:getScientistQuota,
		// quota:0,
		quota_per_room:true,
		stages:[
			[CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
		],
	},
};

const creepUpgrader = {
	roles,

	getRoleMetadata(role: Role): RoleMetadata {
		return roles[role as keyof typeof roles] as RoleMetadata;
	},

	// returns -1 if stage not found
	getCreepStage(creep: Creep) {
		if (creep.memory.role == "guardian") {
			return 0;
		}
		const roleMeta = this.roles[creep.memory.role];
		if (!roleMeta) {
			return -1;
		}
		for (var s = 0; s < roleMeta.stages.length; s++) {
			var isMatch = true;
			for (var b = 0; b < creep.body.length; b++) {
				if (creep.body[b].type != roleMeta.stages[s][b]) {
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
	getHighestStage(role: Role, room: Room) {
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

	/** @param {string} role **/
	/** @param {int} stage **/
	getCreepCost(role: Role, stage: number) {
		const roleMeta = this.roles[role];
		if (!roleMeta) {
			return -1;
		}
		let cost = 0;
		for (var i = 0; i < roleMeta.stages[stage].length; i++) {
			cost += BODYPART_COST[roleMeta.stages[stage][i]];
		}
		return cost;
	},

	getUpgraderQuota,
	getMinerQuota,
}

module.exports = creepUpgrader;
export default creepUpgrader;