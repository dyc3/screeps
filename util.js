Creep.prototype.log = function(...args) {
	console.log(this.name, args);
};

let util = {
	clearAllDebugFlags: function() {
		for (let flag in Game.flags) {
			if (flag.includes("debug")) {
				Game.flags[flag].remove();
			}
		}
	},

	/** A highway room is a room with no controllers and no sources, but sometimes contain power banks. **/
	isHighwayRoom: function(roomName) {
		let matches = /d+/.exec(roomName);
		return matches[0] % 10 == 0 || matches[1] % 10 == 0;
	},

	/** A treasue room is a room with no controllers, but contain sources with an extra 1000 energy, and a mineral deposit. **/
	isTreasureRoom: function(roomName) {
		let matches = /d+/.exec(roomName);
		return (matches[0] % 10 >= 4 && matches[0] % 10 <= 6) && (matches[1] % 10 >= 4 && matches[1] % 10 <= 6);
	},

	/**
	 * Gets the estimated number of ticks to traverse the path. (Not tested, but should kinda work?)
	 * @param {Creep} creep The creep to estimate
	 * @param {array} path Array of RoomPosition that the creep would travel on
	 * @param {Boolean} assumeCarryFull Whether or not to assume that the creep has a full load.
	 * @returns {Number} The minimum ticks for the creep to traverse the path.
	 *
	 * @example require("util").calculateEta(Game.creeps["manager_20d3c95"], PathFinder.search(new RoomPosition(15, 40, "W13N11"), { pos: new RoomPosition(20, 40, "W13N11"), range: 0 }).path)
	 */
	calculateEta(creep, path, assumeCarryFull=false) {
		let body = creep.body.map(b => b.type);
		let baseFatiguePerMove = body.filter(p => p !== MOVE && (assumeCarryFull && p !== CARRY)).length;
		let moveParts = body.filter(p => p === MOVE).length;

		let totalFatigue = 0;
		for (let pos of path) {
			let fatigueMultiplier = 2;
			try {
				if (this.getStructuresAt(pos, STRUCTURE_ROAD).length > 0) {
					fatigueMultiplier = 1;
				}
				else if (this.getTerrainAt(pos) === "swamp") {
					fatigueMultiplier = 10;
				}
			}
			catch (e) {
				// probably can't access this room, just ignore it
				// creep.log(e);
			}

			totalFatigue += baseFatiguePerMove * fatigueMultiplier;
		}

		return Math.ceil(totalFatigue / moveParts);
	},

	/**
	 * Gets the cost to spawn a creep with the given body.
	 * @param {array} body The creep's body parts
	 * @returns {Number} The energy cost to spawn the creep.
	 */
	getCreepSpawnCost(body) {
		if (body.length > 0 && typeof body[0] === "object") {
			body = body.map(b => b.type);
		}
		return body.reduce((a, b) => (typeof a === "string" ? BODYPART_COST[a] : a) + BODYPART_COST[b]);
	},

	/**
	 * Gets the number of ticks a creep's time to live will increase by when it is renewed.
	 * @param {array} body The creep's body
	 * @returns {Number} Amount ticksToLive will increase
	 */
	getRenewTickIncrease(body) {
		if (body.length === 0) {
			throw new Error("Invalid body");
		}
		return Math.floor(600 / body.length);
	},

	/**
	 * Gets the cost to renew a creep with the given body.
	 * @param {array} body The creep's body
	 * @returns {Number} The energy cost to renew the creep.
	 */
	getRenewCost(body) {
		if (body.length === 0) {
			throw new Error("Invalid body");
		}
		return Math.ceil(this.getCreepSpawnCost(body) / 2.5 / body.length);
	},

	/**
	 * Gets the 2 spots on the side of the given position on a path
	 * @pram {object} pathStep
	 */
	getPerpendiculars: function(pathStep) {
		var perps = [
			{ x:pathStep.x + pathStep.dy , y:pathStep.y + pathStep.dx },
			{ x:pathStep.x - pathStep.dy , y:pathStep.y - pathStep.dx },
		];
		switch (pathStep.direction) {
			case RIGHT:
			case LEFT:
			case TOP:
			case BOTTOM:
				perps = [
					{ x:pathStep.x + pathStep.dy , y:pathStep.y + pathStep.dx },
					{ x:pathStep.x - pathStep.dy , y:pathStep.y - pathStep.dx },
				];
				break;
			case TOP_RIGHT:
			case BOTTOM_LEFT:
			case TOP_LEFT:
			case BOTTOM_RIGHT:
				perps = [
					{ x:pathStep.x + pathStep.dx , y:pathStep.y },
					{ x:pathStep.x - pathStep.dx , y:pathStep.y },
				];
				break;
			default:
				console.log("ERR: getPerpendiculars invalid direction", pathStep.direction);
		}
		return perps;
	},

	/** @param {RoomPosition} pos **/
	getConstructionAt: function(pos, type=undefined) {
		if (type) {
			return pos.lookFor(LOOK_CONSTRUCTION_SITES).filter(site => site.structureType === type);
		}
		else {
			return pos.lookFor(LOOK_CONSTRUCTION_SITES);
		}
	},

	/** @param {RoomPosition} pos **/
	getStructuresAt: function(pos, type=undefined) {
		if (type) {
			return pos.lookFor(LOOK_STRUCTURES).filter(struct => struct.structureType === type);
		}
		else {
			return pos.lookFor(LOOK_STRUCTURES);
		}
	},

	getSources: function(room) {
		return room.find(FIND_SOURCES);
	},

	/** @param {RoomPosition} pos **/
	getTerrainAt: function(pos) {
		return pos.lookFor(LOOK_TERRAIN)[0];
	},

	getStructures: function(room, type=undefined) {
		if (type) {
			return room.find(FIND_STRUCTURES, { filter: (struct) => { return struct.structureType == type; } });
		}
		else {
			return room.find(FIND_STRUCTURES);
		}
	},

	getSpawn: function(room) {
		return this.getStructures(room, STRUCTURE_SPAWN)[0];
	},

	getConstruction: function(room, type=undefined) {
		if (type) {
			return room.find(FIND_CONSTRUCTION_SITES, { filter: (site) => { return site.structureType == type; } });
		}
		else {
			return room.find(FIND_CONSTRUCTION_SITES);
		}
	},

	getOwnedRooms: function() {
		return _.values(Game.rooms).filter((room) => room.controller && room.controller.my);
	},

	getMinerals: function(room, mineralType=undefined) {
		if (mineralType) {
			return room.find(FIND_MINERALS, { filter: (mineral) => { return mineral.mineralType == mineralType; } });
		}
		else {
			return room.find(FIND_MINERALS);
		}
	},

	getCreeps: function(role=undefined) {
		if (role) {
			return _.filter(Game.creeps, creep => creep.memory.role === role);
		}
		else {
			return Game.creeps;
		}
	},

	/** @param {RoomPosition} pos **/
	getWorkFlag: function(pos) {
		return pos.lookFor(LOOK_FLAGS).filter(f => f.name.includes("make"))[0];
	},

	/** @param {RoomPosition} pos **/
	isOnEdge: function(pos) {
		return pos.x == 0 || pos.y == 0 || pos.x == 49 || pos.y == 49;
	},

	/** @param {RoomPosition} pos **/
	/** @param {number} dist **/
	isDistFromEdge: function(pos, dist) {
		return pos.x < dist || pos.y < dist || pos.x >= 49 - dist || pos.y >= 49 - dist;
	},

	/**
	 * Gets the mode of an array of numbers
	 */
	mode: function(arr) {
		return arr.sort((a,b) => arr.filter(v => v===a).length - arr.filter(v => v===b).length).pop();
	},

	/** @param {RoomPosition} pos **/
	getAdjacent: function(pos) {
		// console.log("type of pos:", typeof pos, JSON.stringify(pos));
		let adjacent = [];
		for (let y = pos.y - 1; y <= pos.y + 1; y++) {
			for (let x = pos.x - 1; x <= pos.x + 1; x++) {
				if (pos.x == x && pos.y == y) {
					continue;
				}
				adjacent.push(new RoomPosition(x, y, pos.roomName));
				// adjacent.push(pos);
			}
		}
		return adjacent;
	},

	getOppositeDirection: function(direction) {
		return (direction + 4) % 8;
	},

	getPositionInDirection: function(pos, direction) {
		switch (direction) {
			case TOP:
				return new RoomPosition(pos.x, pos.y - 1, pos.roomName);
			case BOTTOM:
				return new RoomPosition(pos.x, pos.y + 1, pos.roomName);
			case LEFT:
				return new RoomPosition(pos.x - 1, pos.y, pos.roomName);
			case RIGHT:
				return new RoomPosition(pos.x + 1, pos.y, pos.roomName);
			case TOP_LEFT:
				return new RoomPosition(pos.x - 1, pos.y - 1, pos.roomName);
			case TOP_RIGHT:
				return new RoomPosition(pos.x + 1, pos.y - 1, pos.roomName);
			case BOTTOM_LEFT:
				return new RoomPosition(pos.x - 1, pos.y + 1, pos.roomName);
			case BOTTOM_RIGHT:
				return new RoomPosition(pos.x + 1, pos.y + 1, pos.roomName);
			default:
				break;
		}
	}
}

module.exports = util;
