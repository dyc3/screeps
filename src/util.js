Creep.prototype.log = function(...args) {
	if (_.any(Memory.highlightCreepLog, value => value === this.name || value === this.memory.role)) {
		console.log('<span style="color: cyan">', this.name, ...args, "</span>");
	}
	else {
		console.log(this.name, ...args);
	}
};

PowerCreep.prototype.log = function(...args) {
	if (_.any(Memory.highlightCreepLog, value => value === this.name || value === "powercreep")) {
		console.log('<span style="color: cyan">', this.name, ...args, "</span>");
	}
	else {
		console.log(this.name, ...args);
	}
};

Number.prototype.clamp = function(min, max) {
	return util.clamp(this, min, max);
};

let util = {
	errorCodeToString(errorCode) {
		const errors = {
			"OK": 0,
			"ERR_NOT_OWNER": -1,
			"ERR_NO_PATH": -2,
			"ERR_NAME_EXISTS": -3,
			"ERR_BUSY": -4,
			"ERR_NOT_FOUND": -5,
			"ERR_NOT_ENOUGH_SOMETHING": -6,
			"ERR_INVALID_TARGET": -7,
			"ERR_FULL": -8,
			"ERR_NOT_IN_RANGE": -9,
			"ERR_INVALID_ARGS": -10,
			"ERR_TIRED": -11,
			"ERR_NO_BODYPART": -12,
			"ERR_RCL_NOT_ENOUGH": -14,
			"ERR_GCL_NOT_ENOUGH": -15,
		};
		try {
			return _.invert(errors)[errorCode];
		}
		catch (e) {
			return "<INVALID ERROR CODE>"
		}
	},

	clamp(x, min, max) {
		return Math.min(Math.max(x, min), max);
	},

	/**
	 * Sorts owned rooms using the distance to the specified RoomPosition in accending order.
	 * WARNING: VERY CPU HEAVY!
	 * @param {RoomPosition} targetPos The reference position.
	 * @returns {array} Array of rooms, the first one being the closest to the reference posiiton
	 *
	 * @example require("util").findClosestOwnedRooms(new RoomPosition(29, 43, "W15N9"))
	 * @example require("util").findClosestOwnedRooms(new RoomPosition(8, 15, "W15N9"))
	 */
	findClosestOwnedRooms(targetPos, filterCallback=room => true) {
		let rooms = this.getOwnedRooms();
		rooms = _.filter(rooms, filterCallback)
			// HACK: exclude certain room combos because they suck so much
			.filter(room => {
				if (targetPos.roomName === "W15N13") {
					return room.name !== "W13N11";
				} else if (targetPos.roomName === "W13N11") {
					return room.name !== "W15N13";
				}
				return true;
			});
		rooms.sort((a, b) => {
			let roomDistance = Game.map.getRoomLinearDistance(targetPos.roomName, b.name) - Game.map.getRoomLinearDistance(targetPos.roomName, a.name);
			if (roomDistance !== 0) {
				return roomDistance;
			}
			let roomPathA = Game.map.findRoute(targetPos.roomName, a.name);
			let roomPathB = Game.map.findRoute(targetPos.roomName, b.name);
			let roomPathDistance = roomPathB.length - roomPathA.length;
			if (roomPathDistance !== 0) {
				return roomPathDistance;
			}
			if (roomPathA[0].room === roomPathB[0].room) {
				return 0;
			}

			return PathFinder.search(targetPos, { pos: new RoomPosition(25, 25, roomPathB[0].room), range: 20 }).path.length - PathFinder.search(targetPos, { pos: new RoomPosition(25, 25, roomPathA[0].room), range: 20 }).path.length;
		});
		return rooms;
	},

	clearAllDebugFlags: function() {
		for (let flag in Game.flags) {
			if (flag.includes("debug")) {
				Game.flags[flag].remove();
			}
		}
	},

	/** A highway room is a room with no controllers and no sources, but sometimes contain power banks. **/
	isHighwayRoom: function(roomName) {
		let matches = roomName.match(/\d+/g);
		let x = parseInt(matches[0]);
		let y = parseInt(matches[1]);
		return x % 10 == 0 || y % 10 == 0;
	},

	/** A treasue room is a room with no controllers, but contain sources with an extra 1000 energy, and a mineral deposit. **/
	isTreasureRoom: function(roomName) {
		let matches = roomName.match(/\d+/g);
		// console.log("=========== MATCHES", roomName, JSON.stringify(matches));
		let x = parseInt(matches[0]) % 10;
		let y = parseInt(matches[1]) % 10;
		return (x >= 4 && x <= 6) && (y >= 4 && y <= 6);
	},

	/**
	 * Gets the estimated number of ticks to traverse the path. (Not tested, but should kinda work?)
	 * @param {Creep|PowerCreep} creep The creep to estimate
	 * @param {array} path Array of RoomPosition that the creep would travel on
	 * @param {Boolean} assumeCarryFull Whether or not to assume that the creep has a full load.
	 * @returns {Number} The minimum ticks for the creep to traverse the path.
	 *
	 * @example require("util").calculateEta(Game.creeps["manager_20d3c95"], PathFinder.search(new RoomPosition(15, 40, "W13N11"), { pos: new RoomPosition(20, 40, "W13N11"), range: 0 }).path)
	 */
	calculateEta(creep, path, assumeCarryFull=false) {
		if (creep instanceof PowerCreep) {
			return path.length;
		}

		let body = creep.body.map(b => b.type);
		let baseFatiguePerMove = body.filter(p => p !== MOVE && (!assumeCarryFull || assumeCarryFull && p !== CARRY)).length;
		let moveParts = body.filter(p => p === MOVE).length;

		let totalSteps = 0;
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

			let fatigue = baseFatiguePerMove * fatigueMultiplier;
			while (fatigue > 0) {
				fatigue -= moveParts * 2;
				totalSteps++;
			}
		}

		// console.log("[util][calculateEta]", "body:", body, "baseFatiguePerMove:", baseFatiguePerMove, "moveParts:", moveParts, "totalSteps:", totalSteps);

		return totalSteps;
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
			return room.find(FIND_STRUCTURES, { filter: struct => struct.structureType === type });
		}
		else {
			return room.find(FIND_STRUCTURES);
		}
	},

	getSpawn: function(room) {
		let spawns = this.getStructures(room, STRUCTURE_SPAWN);
		return spawns[Math.floor(Math.random() * spawns.length)];
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

	getCreeps(...roles) {
		return _.filter(Game.creeps, creep => roles.includes(creep.memory.role));
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
	},

	/**
	 * Calculate the effectiveness of a given part on a creep.
	 * @param {Creep} creep
	 * @param {String} part
	 */
	calcEffectiveness(creep, part) {
		let groups = _.groupBy(creep.body.filter(p => p.type === part), p => p.boost);
		// TODO: finish
		// TODO: write tests
	},
}

module.exports = util;
