import "types";
import {Game, Memory} from "./mock";
import { assert } from "chai";
import PortalScanner from "intel/PortalScanner";
import pathfinding from "utils/pathfinding";

describe("Map-level pathfinding", () => {
	beforeEach(() => {
		// runs before each test in this block
		// @ts-ignore : allow adding Game to global
		global.Game = _.clone(Game);
		// @ts-ignore : allow adding Memory to global
		global.Memory = _.clone(Memory);
		PortalScanner.interroomPortals = new Map();
	});

	it("should get all exits and include portal connections", () => {
		const room = "W5N5";
		Game.map.describeExits = () => {
			return {
				[FIND_EXIT_TOP]: "W5N6",
				[FIND_EXIT_LEFT]: "W4N5",
				[FIND_EXIT_BOTTOM]: "W5N4",
				[FIND_EXIT_RIGHT]: "W6N5",
			}
		}
		PortalScanner.interroomPortals.set("W5N5", "W10N10");

		const exits = pathfinding.getConnections(room);
		assert.deepEqual(exits, new Set(["W5N6", "W4N5", "W5N4", "W6N5", "W10N10"]));
	});
});
