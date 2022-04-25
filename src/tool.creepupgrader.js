var toolEnergySource = require('tool.energysource');
var util = require('./util');

/** @param {Room} room **/
function getUpgraderQuota(room) {
	// TODO: clean this up a little
	function _getQuota(rcl){
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
			case _.keys(CONTROLLER_LEVELS.length):
			case 8:
				value = 1;
				break;
			default:
				value = 2;
				break;
		}
		return value;
	}
	// HACK: increase upgraders for specific room
	if (room.name === "W16N7" && room.controller.level < 8) {
		return 2;
	}
	if (room.controller.pos.getRangeTo(room.storage) <= 5) {
		return 1;
	}
	return _getQuota(room.controller.level);
}

/** @param {Room} room **/
function getScientistQuota(room) {
	if (room.controller.level >= 6 && (util.getStructures(room, STRUCTURE_LAB).length > 0 || util.getStructures(room, STRUCTURE_FACTORY).length > 0)) {
		return 1;
	}
	return 0;
}

function getBuilderQuota() {
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
	let lowRCL = rooms.filter(room => room.controller.level <= 4).length;
	if (lowRCL > 0) {
		return 3;
	}
	return 1;
}

function getClaimerQuota() {
	var count = 0;

	if (Game.gcl.level > 1 && Game.flags["claim"]) {
		count = 1;
	}
	else if (Game.flags["reserve"]) {
		count = 1;
	}
	return count;
}

function getManagerQuota(room) {
	if (room.controller && room.controller.my && room.controller.level >= 4) {
		return 1;
	}
	return 0;
}

function getRelayQuota(room) {
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

function getMinerQuota() {
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

function getRepairerQuota(room) {
	let rooms = util.getOwnedRooms();
	if (room.controller.level >= (rooms.length > 1 ? 4 : 6)) {
		return 1;
	}
	return 0;
}

const creepUpgrader = {
	roles:{
		"harvester":{
			name:"harvester",
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
		"manager":{
			name:"manager",
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
		"relay": {
			name:"relay",
			quota:getRelayQuota,
			quota_per_room:true,
			stages:[
				[CARRY,CARRY,CARRY,CARRY,MOVE]
			]
		},
		"upgrader":{
			name:"upgrader",
			quota:getUpgraderQuota,
			quota_per_room:true,
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
		"builder":{
			name:"builder",
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
		"repairer":{
			name:"repairer",
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
		"remoteharvester":{
			name:"remoteharvester",
			quota:function() { return Memory.remoteMining.needHarvesterCount; },
			quota_per_room:false,
			stages:[
				[WORK,WORK,WORK,MOVE,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			],
		},
		"carrier":{
			name:"carrier",
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
		"miner": {
			name:"miner",
			quota:getMinerQuota,
			quota_per_room:false,
			stages:[
				[WORK,WORK,WORK,MOVE,CARRY,CARRY,MOVE,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,MOVE,CARRY,MOVE,CARRY,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK, CARRY,CARRY,CARRY,CARRY,CARRY,CARRY, MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			]
		},
		"scientist":{ // Game.spawns["Spawn1"].createCreep([CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], "scientist1", {role:"scientist", keepAlive:true})
			name:"scientist",
			quota:getScientistQuota,
			// quota:0,
			quota_per_room:true,
			stages:[
				[CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			],
		},
	},

	// getUpgraderQuota: getUpgraderQuota,

	// returns -1 if stage not found
	/** @param {Creep} creep **/
	getCreepStage: function(creep) {
		if (creep.memory.role == "guardian") {
			return 0;
		}
		for (var s = 0; s < this.roles[creep.memory.role].stages.length; s++) {
			var isMatch = true;
			for (var b = 0; b < creep.body.length; b++) {
				if (creep.body[b].type != this.roles[creep.memory.role].stages[s][b]) {
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

	// get the highest possible stage that a creep with the role specified can spawn with at the spawn specified.
	// returns -1 if the specified spawn can't spawn any stage
	/** @param {string} role **/
	/** @param {StructureSpawn} spawn **/
	getHighestStage: function(role, room) {
		// iterating backwards would probably be faster
		for (var i = 0; i < this.roles[role].stages.length; i++) {
			if (room.energyAvailable < this.getCreepCost(role, i)) {
				return i - 1;
			}
		}
		return this.roles[role].stages.length - 1;
	},

	/** @param {string} role **/
	/** @param {int} stage **/
	getCreepCost: function(role, stage) {
		var cost = 0;
		for (var i = 0; i < this.roles[role].stages[stage].length; i++) {
			cost += BODYPART_COST[this.roles[role].stages[stage][i]];
		}
		return cost;
	},

	getUpgraderQuota: function(room=undefined){
		return getUpgraderQuota(room);
	},

	getMinerQuota: function(room) {
		return getMinerQuota(room);
	},
}

module.exports = creepUpgrader;
export default creepUpgrader;
