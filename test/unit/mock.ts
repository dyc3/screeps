export const Game: {
	creeps: { [name: string]: any };
	rooms: any;
	spawns: any;
	time: any;
	map: any;
} = {
	creeps: {},
	rooms: {},
	spawns: {},
	time: 12345,
	map: {},
};

export const Memory: {
	creeps: { [name: string]: any };
	portals: {
		intershard: [string, { shard: string, room: string }][];
		interroom: [string, string][];
	};
} = {
	creeps: {},
	portals: {
		intershard: [],
		interroom: [],
	}
};

declare global {
	namespace NodeJS {
		interface Global {
			log: any;
			WHOAMI: string;
			CONTROLLER_UPGRADE_RANGE: number;
			DROPPED_ENERGY_GATHER_MINIMUM: number;

			FIND_EXIT_TOP: 1;
			FIND_EXIT_LEFT: 3;
			FIND_EXIT_BOTTOM: 5;
			FIND_EXIT_RIGHT: 7;
		}
	}
}

global.FIND_EXIT_TOP = 1;
global.FIND_EXIT_LEFT = 3;
global.FIND_EXIT_BOTTOM = 5;
global.FIND_EXIT_RIGHT = 7;
