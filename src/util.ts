import _ from "lodash";
import { ErrorMapper } from "utils/ErrorMapper";
import type { Role } from "./roles/meta";

const errorMild = '<audio src="http://trekcore.com/audio/computer/alarm01.mp3" autoplay />';

export const util = {
	errorCodeToString(errorCode: ScreepsReturnCode): string {
		const errors = {
			OK: 0,
			ERR_NOT_OWNER: -1,
			ERR_NO_PATH: -2,
			ERR_NAME_EXISTS: -3,
			ERR_BUSY: -4,
			ERR_NOT_FOUND: -5,
			ERR_NOT_ENOUGH_SOMETHING: -6,
			ERR_INVALID_TARGET: -7,
			ERR_FULL: -8,
			ERR_NOT_IN_RANGE: -9,
			ERR_INVALID_ARGS: -10,
			ERR_TIRED: -11,
			ERR_NO_BODYPART: -12,
			ERR_RCL_NOT_ENOUGH: -14,
			ERR_GCL_NOT_ENOUGH: -15,
		};
		try {
			// @ts-expect-error FIXME: needs better typing
			return _.invert(errors)[errorCode];
		} catch (e) {
			return "<INVALID ERROR CODE>";
		}
	},

	clamp(x: number, min: number, max: number): number {
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
	findClosestOwnedRooms(targetPos: RoomPosition, filterCallback = (room: Room) => true): Room[] {
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
		// Old sort, just in case i need it
		// rooms.sort((a, b) => {
		// 	let roomDistance = Game.map.getRoomLinearDistance(targetPos.roomName, a.name) - Game.map.getRoomLinearDistance(targetPos.roomName, b.name);
		// 	if (roomDistance !== 0) {
		// 		return roomDistance;
		// 	}
		// 	let roomPathA = Game.map.findRoute(targetPos.roomName, a.name);
		// 	let roomPathB = Game.map.findRoute(targetPos.roomName, b.name);
		// 	let roomPathDistance = roomPathA.length - roomPathB.length;
		// 	if (roomPathDistance !== 0) {
		// 		return roomPathDistance;
		// 	}
		// 	if (roomPathA[0].room === roomPathB[0].room) {
		// 		return 0;
		// 	}

		// 	return PathFinder.search(targetPos, { pos: new RoomPosition(25, 25, roomPathA[0].room), range: 20 }).path.length - PathFinder.search(targetPos, { pos: new RoomPosition(25, 25, roomPathB[0].room), range: 20 }).path.length;
		// });
		rooms = _.sortByAll(
			rooms,
			...[
				(r: Room) => Game.map.getRoomLinearDistance(targetPos.roomName, r.name),
				// @ts-expect-error FIXME: needs better typing
				(r: Room) => Game.map.findRoute(targetPos.roomName, r.name).length,
				// TODO: use traveler.Traveler.findTravelPath instead
				(r: Room) =>
					PathFinder.search(targetPos, { pos: new RoomPosition(25, 25, r.name), range: 20 }).path.length,
			]
		);
		return rooms;
	},

	clearAllDebugFlags(): void {
		for (const flag in Game.flags) {
			if (flag.includes("debug")) {
				Game.flags[flag].remove();
			}
		}
	},

	/** A highway room is a room with no controllers and no sources, but sometimes contain power banks. **/
	isHighwayRoom(roomName: string): boolean {
		const matches = roomName.match(/\d+/g);
		if (!matches) {
			// invalid room
			return false;
		}
		const x = parseInt(matches[0], 10);
		const y = parseInt(matches[1], 10);
		return x % 10 === 0 || y % 10 === 0;
	},

	/** A treasue room is a room with no controllers, but contain sources with an extra 1000 energy, and a mineral deposit. **/
	isTreasureRoom(roomName: string): boolean {
		const matches = roomName.match(/\d+/g);
		if (!matches) {
			// invalid room
			return false;
		}
		// console.log("=========== MATCHES", roomName, JSON.stringify(matches));
		const x = parseInt(matches[0], 10) % 10;
		const y = parseInt(matches[1], 10) % 10;
		return x >= 4 && x <= 6 && y >= 4 && y <= 6;
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
	calculateEta(creep: Creep, path: RoomPosition[], assumeCarryFull = false): number {
		if (creep instanceof PowerCreep) {
			return path.length;
		}

		const body = creep.body.map(b => b.type);
		const baseFatiguePerMove = body.filter(
			p => p !== MOVE && (assumeCarryFull || (!assumeCarryFull && p !== CARRY))
		).length;
		const moveParts = body.filter(p => p === MOVE).length;

		let totalSteps = 0;
		for (const pos of path) {
			let fatigueMultiplier = 2;
			try {
				if (this.getStructuresAt(pos, STRUCTURE_ROAD).length > 0) {
					fatigueMultiplier = 1;
				} else if (this.getTerrainAt(pos) === "swamp") {
					fatigueMultiplier = 10;
				}
			} catch (e) {
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

		// HACK: make sure we don't output something that doesn't make sense.
		return Math.max(totalSteps, path.length);
	},

	/**
	 * Gets the cost to spawn a creep with the given body.
	 */
	getCreepSpawnCost(body: BodyPartDefinition[] | BodyPartConstant[]): number {
		function isFullBody(body: BodyPartDefinition[] | BodyPartConstant[]): body is BodyPartDefinition[] {
			return body.length > 0 && typeof body[0] !== "string" && "type" in body[0];
		}
		let parts: BodyPartConstant[];
		if (isFullBody(body)) {
			parts = body.map(b => b.type);
		} else {
			parts = body;
		}
		return parts.map(p => BODYPART_COST[p]).reduce((a: number, b: number) => a + b);
	},

	/**
	 * Gets the number of ticks a creep's time to live will increase by when it is renewed.
	 * @param {array} body The creep's body
	 */
	getRenewTickIncrease(body: BodyPartDefinition[]): number {
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
	getRenewCost(body: BodyPartDefinition[]): number {
		if (body.length === 0) {
			throw new Error("Invalid body");
		}
		return Math.ceil(this.getCreepSpawnCost(body) / 2.5 / body.length);
	},

	/** @deprecated */
	getConstructionAt(pos: RoomPosition, type = undefined): ConstructionSite[] {
		if (type) {
			return pos.lookFor(LOOK_CONSTRUCTION_SITES).filter(site => site.structureType === type);
		} else {
			return pos.lookFor(LOOK_CONSTRUCTION_SITES);
		}
	},

	/** @deprecated */
	getStructuresAt<S extends StructureConstant>(
		pos: RoomPosition,
		type: S | undefined = undefined
	): ConcreteStructure<S>[] | Structure[] {
		if (type) {
			return pos.lookFor(LOOK_STRUCTURES).filter(struct => struct.structureType === type);
		} else {
			return pos.lookFor(LOOK_STRUCTURES);
		}
	},

	/** @deprecated: Just use `room.find(FIND_SOURCES)` */
	getSources(room: Room): Source[] {
		return room.find(FIND_SOURCES);
	},

	/** @deprecated */
	getTerrainAt(pos: RoomPosition): Terrain {
		return pos.lookFor(LOOK_TERRAIN)[0];
	},

	/** @deprecated: Use getStructures for better type checking */
	getStructuresOld<S extends StructureConstant>(
		room: Room,
		type: StructureConstant | undefined = undefined
	): Structure<S>[] | AnyStructure[] {
		if (type) {
			return room.find(FIND_STRUCTURES, { filter: struct => struct.structureType === type });
		} else {
			return room.find(FIND_STRUCTURES);
		}
	},

	getStructures<S extends StructureConstant>(room: Room, type: S): ConcreteStructure<S>[] {
		return room.find(FIND_STRUCTURES, {
			filter: struct => struct.structureType === type,
		}) as unknown as ConcreteStructure<S>[];
	},

	getSpawn(room: Room): StructureSpawn {
		const spawns = this.getStructures(room, STRUCTURE_SPAWN);
		return spawns[Math.floor(Math.random() * spawns.length)];
	},

	/** @deprecated */
	getConstruction(room: Room, type = undefined): ConstructionSite[] {
		if (type) {
			return room.find(FIND_CONSTRUCTION_SITES, {
				filter: site => {
					return site.structureType === type;
				},
			});
		} else {
			return room.find(FIND_CONSTRUCTION_SITES);
		}
	},

	/**
	 * Gets all owned rooms.
	 * @returns {Array<Room>}
	 */
	getOwnedRooms(): Room[] {
		return Object.values(Game.rooms).filter(room => room.controller && room.controller.my);
	},

	getCreeps(...roles: Role[]): Creep[] {
		if (roles.length > 0) {
			return _.filter(Game.creeps, creep => roles.includes(creep.memory.role));
		} else {
			return _.values(Game.creeps);
		}
	},

	getWorkFlag(pos: RoomPosition): Flag {
		return pos.lookFor(LOOK_FLAGS).filter(f => f.name.includes("make"))[0];
	},

	isOnEdge(pos: RoomPosition): boolean {
		return pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49;
	},

	isDistFromEdge(pos: RoomPosition, dist: number): boolean {
		return pos.x < dist || pos.y < dist || pos.x >= 49 - dist || pos.y >= 49 - dist;
	},

	/**
	 * Gets the mode of an array of numbers
	 */
	mode(arr: number[]): number | undefined {
		return arr.sort((a, b) => arr.filter(v => v === a).length - arr.filter(v => v === b).length).pop();
	},

	getAdjacent(pos: RoomPosition): RoomPosition[] {
		// console.log("type of pos:", typeof pos, JSON.stringify(pos));
		const adjacent = [];
		for (let y = pos.y - 1; y <= pos.y + 1; y++) {
			for (let x = pos.x - 1; x <= pos.x + 1; x++) {
				if (pos.x === x && pos.y === y) {
					continue;
				}
				adjacent.push(new RoomPosition(x, y, pos.roomName));
				// adjacent.push(pos);
			}
		}
		return adjacent;
	},

	getOppositeDirection(direction: DirectionConstant): DirectionConstant {
		return ((direction + 4) % 8) as DirectionConstant;
	},

	getPositionInDirection(pos: RoomPosition, direction: DirectionConstant, amount = 1): RoomPosition {
		switch (direction) {
			case TOP:
				return new RoomPosition(pos.x, (pos.y - amount).clamp(0, 49), pos.roomName);
			case BOTTOM:
				return new RoomPosition(pos.x, (pos.y + amount).clamp(0, 49), pos.roomName);
			case LEFT:
				return new RoomPosition((pos.x - amount).clamp(0, 49), pos.y, pos.roomName);
			case RIGHT:
				return new RoomPosition((pos.x + amount).clamp(0, 49), pos.y, pos.roomName);
			case TOP_LEFT:
				return new RoomPosition((pos.x - amount).clamp(0, 49), (pos.y - amount).clamp(0, 49), pos.roomName);
			case TOP_RIGHT:
				return new RoomPosition((pos.x + amount).clamp(0, 49), (pos.y - amount).clamp(0, 49), pos.roomName);
			case BOTTOM_LEFT:
				return new RoomPosition((pos.x - amount).clamp(0, 49), (pos.y + amount).clamp(0, 49), pos.roomName);
			case BOTTOM_RIGHT:
				return new RoomPosition((pos.x + amount).clamp(0, 49), (pos.y + amount).clamp(0, 49), pos.roomName);
			default:
				throw new Error("Invalid direction");
		}
	},

	/**
	 * Gets the damage multiplier for tower damage
	 * @example let damage = TOWER_POWER_ATTACK * util.towerImpactFactor(10)
	 * @deprecated use combat.calc.towerImpactFactor
	 */
	towerImpactFactor(distance: number): number {
		if (distance <= TOWER_OPTIMAL_RANGE) {
			return 1;
		}
		if (distance >= TOWER_FALLOFF_RANGE) {
			return 1 - TOWER_FALLOFF;
		}
		const towerFalloffPerTile = TOWER_FALLOFF / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
		return 1 - (distance - TOWER_OPTIMAL_RANGE) * towerFalloffPerTile;
	},

	printException(e: any, creep: Creep | undefined = undefined): void {
		const msg = errorMild + ErrorMapper.renderError(e);
		if (creep) {
			console.log(creep.name, msg);
		} else {
			console.log(msg);
		}
		Game.notify(msg);
	},

	isSimulationMode(): boolean {
		return Game.rooms.sim !== undefined;
	},

	/**
	 * Shuffles array in place.
	 * @param {Array} a items An array containing the items.
	 */
	shuffle<T>(a: T[]): T[] {
		let j;
		let x;
		let i;
		for (i = a.length - 1; i > 0; i--) {
			j = Math.floor(Math.random() * (i + 1));
			x = a[i];
			a[i] = a[j];
			a[j] = x;
		}
		return a;
	},
};

declare global {
	interface Creep {
		log(...args: any[]): void;
	}

	interface PowerCreep {
		log(...args: any[]): void;
	}

	interface Number {
		clamp(min: number, max: number): number;
	}
}

module.exports = util;
export default util;
