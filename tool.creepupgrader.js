var toolEnergySource = require('tool.energysource');
var util = require('util');

/** @param {Room} room **/
function getUpgraderQuota(room) {
	// TODO: clean this up a little
	function _getQuota(rcl){
		var value = 2;
		switch (rcl) {
			case 1:
				value = 1;
				break;
			case 2:
			case 3:
				value = 2;
				break;
			case 4:
				value = 2;
				break;
			case 5:
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
	if (room.controller.pos.getRangeTo(room.storage) <= 5)
	{
		return 1;
	}
	return _getQuota(room.controller.level);
}

/** @param {Room} room **/
function getScientistQuota(room) {
	return 0;
	if (room.controller.level >= 6 && util.getStructures(room, STRUCTURE_LAB).length > 0) {
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
	if (count > 5) {
		count = 5;
	}
	return count;
}

function getMinerQuota(room) {
	let count = 0;
	if (CONTROLLER_STRUCTURES[STRUCTURE_EXTRACTOR][room.controller.level] > 0) {
		let extractors = util.getStructures(room, STRUCTURE_EXTRACTOR);
		for (let i = 0; i < extractors.length; i++) {
			let struct = extractors[i];
			let mineral = struct.pos.lookFor(LOOK_MINERALS)[0];
			if (mineral && mineral.amount > 0) {
				count++;
			}
		}
	}
	return count;
}

function getAttackerQuota() {
	return 2;
	let count = 0;
	let rooms = util.getOwnedRooms();
	for (let r = 0; r < rooms.length; r++) {
		let room = rooms[r];
		if (room.controller.level >= 2) {
			count += room.memory.defcon;
		}
	}
	return count;
}

function getRepairerQuota(room) {
	if (room.controller.level >= 6) {
		return 1;
	}
	return 0;
}

let creepUpgrader = {
	roles:{
		"harvester":{
			name:"harvester",
			quota:toolEnergySource.getHarvesterQuota,
			quota_per_room:true,
			stages:[
				[WORK,WORK,CARRY,MOVE],
				[WORK,WORK,CARRY,MOVE,MOVE],
				[WORK,WORK,WORK,CARRY,MOVE,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,WORK,WORK,CARRY,MOVE]
			],
		},
		"upgrader":{
			name:"upgrader",
			quota:getUpgraderQuota,
			quota_per_room:true,
			stages:[
				[WORK,CARRY,CARRY,MOVE,MOVE],
				[WORK,WORK,CARRY,CARRY,MOVE,MOVE],
				[WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
				// [WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
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
		"builder":{
			name:"builder",
			quota:getBuilderQuota,
			quota_per_room:false,
			stages:[
				[WORK,CARRY,CARRY,MOVE,MOVE],
				[WORK,WORK,CARRY,CARRY,MOVE,MOVE],
				[WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
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
				// [WORK,WORK,WORK,WORK,WORK,		WORK,WORK,WORK,WORK,WORK,		WORK,WORK,WORK,WORK,WORK,
				// CARRY,CARRY,CARRY,CARRY,CARRY,	CARRY,CARRY,CARRY,CARRY,CARRY,	CARRY,CARRY,CARRY,CARRY,CARRY,
				// MOVE,MOVE,MOVE,MOVE,MOVE,		MOVE,MOVE,MOVE,MOVE,MOVE, 		MOVE,MOVE,MOVE,MOVE,MOVE,		MOVE,MOVE,MOVE,MOVE,MOVE],
			],
		},
		"healer":{
			name:"healer",
			quota:function() { return 0; }, // Memory.doAttack != undefined
			quota_per_room:false,
			stages:[
				[HEAL,MOVE],
				[TOUGH,HEAL,HEAL,MOVE,MOVE],
				[TOUGH,TOUGH,HEAL,HEAL,MOVE,MOVE],
				[TOUGH,TOUGH,TOUGH,HEAL,HEAL,HEAL,MOVE,MOVE,MOVE],
			],
		},
		"attacker":{
			name:"attacker",
			quota: getAttackerQuota, //((Game.flags["attack"] || Game.flags["Defend"]) ? 2 : 0), // Memory.doAttack != undefined
			quota_per_room:false,
			stages:[
				[TOUGH,MOVE,TOUGH,MOVE,ATTACK],
				[TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK],
				[TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK],
				[TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK],
			],
		},
		// "claimer":{
		// 	name:"claimer",
		// 	quota:getClaimerQuota,
		// 	quota_per_room:false,
		// 	stages:[
		// 		[CLAIM,MOVE],
		// 		[CLAIM,CLAIM,MOVE,MOVE],
		// 		[CLAIM,CLAIM,CLAIM,MOVE,MOVE,MOVE],
		// 		// [CLAIM,CLAIM,CLAIM,CLAIM,MOVE,MOVE,MOVE,MOVE],
		// 	],
		// },
		"remoteharvester":{
			name:"remoteharvester",
			quota:function() { return Memory.remoteMining.needHarvesterCount; },
			quota_per_room:false,
			stages:[
				[WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE],
				[WORK,WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			],
		},
		"carrier":{
			name:"carrier",
			quota:function() { return Memory.remoteMining.needCarrierCount; },
			quota_per_room:false,
			stages:[
				[WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
				[WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
				[WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
				[WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY, MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
			],
		},
		"scout":{
			name:"scout",
			// quota:((Game.spawns["Spawn1"].room.controller.level >= 5) ? 1 : 0),
			quota:function() { return 0; },
			quota_per_room:false,
			stages:[
				[MOVE],
			],
		},
		"nextroomer":{
			name:"nextroomer",
			//quota:((Memory.expansionTarget != undefined) ? 1 : 0),
			quota:function() { return 0; },
			quota_per_room:false,
			stages:[
				// [CLAIM,MOVE],
				[WORK,MOVE,WORK,MOVE,CARRY,MOVE,WORK,MOVE,CARRY,MOVE],
			],
		},
		"miner": {
			name:"miner",
			quota:getMinerQuota,
			quota_per_room:true,
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
		"relay": {
			name:"relay",
			// quota:util.getOwnedRooms().length * 4,
			quota:getRelayQuota,
			quota_per_room:true,
			stages:[
				[CARRY,MOVE]
			]
		},
	},

	// getUpgraderQuota: getUpgraderQuota,

	// returns -1 if stage not found
	/** @param {Creep} creep **/
	getCreepStage: function(creep) {
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
