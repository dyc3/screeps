declare module "screeps-pathfinding" {
	namespace NodeJS {
		interface Global {
			IN_RANGE: 1;
			IN_ROOM: 2;
		}
	}

	const IN_RANGE: 1;
	const IN_ROOM: 2;

	interface PathingManagerOptions {
		onRoomEnter?: (roomName: string) => void;
		getCreepWorkingTarget?: (creep: Creep) => {
			pos: RoomPosition;
			range: number;
			priority: number;
		} | undefined;
		getCreepInstance?: (creep: Creep) => Creep;
		getCreepEntity?: (instance: Creep) => Creep;
		avoidRooms?: string[];
	}

	interface MoveOptions {
		range?: number;
		priority?: number;
		allowIncomplete?: boolean;
		moveOffExit?: boolean;
		moveOffRoad?: boolean;
	}

	export class PathingManager {
		constructor(opts?: PathingManagerOptions);
		clearMatrixCache(): void;
		clearMatrixCacheRoom(roomName: string): void;
		moveTo(creep: Creep, target: RoomPosition | AnyStructure, options?: MoveOptions): ScreepsReturnCode | typeof IN_RANGE;
		moveOffRoad(creep: Creep, options?: MoveOptions): ScreepsReturnCode;
		runMoves(): void;
		runMovesRoom(roomName: string): void;
	}

	class TerrainMatrix {
		constructor(terrain: RoomTerrain);
		getCost(x: number, y: number): number;
		get(x: number, y: number): 0 | TERRAIN_MASK_SWAMP | TERRAIN_MASK_WALL;
	}

	interface TerrainCache {
		cache: Map<string, TerrainMatrix>,
		get(roomName: string): TerrainMatrix;
	}
}
