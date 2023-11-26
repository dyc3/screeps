import { assert } from "chai";
import { Game, Memory } from "./mock";
import util from "../../src/util";

describe("util", () => {
	for (const [input, expected] of [
		[TOP, BOTTOM],
		[BOTTOM, TOP],
		[TOP_LEFT, BOTTOM_RIGHT],
		[BOTTOM_RIGHT, TOP_LEFT],
	]) {
		it(`should return opposite direction of ${input} => ${expected}`, () => {
			const got = util.getOppositeDirection(input);
			assert.equal(got, expected);
		});
	}

	for (const [inputPos, direction, offset, expected] of [
		[new RoomPosition(10, 10, "W0N0"), LEFT, 1, new RoomPosition(9, 10, "W0N0")],
		[new RoomPosition(10, 10, "W0N0"), TOP_LEFT, 1, new RoomPosition(9, 9, "W0N0")],
		[new RoomPosition(10, 10, "W0N0"), TOP_LEFT, 2, new RoomPosition(8, 8, "W0N0")],
		[new RoomPosition(0, 0, "W0N0"), TOP_LEFT, 1, new RoomPosition(0, 0, "W0N0")],
		[new RoomPosition(2, 2, "W0N0"), TOP_LEFT, 5, new RoomPosition(0, 0, "W0N0")],
	] as const) {
		it(`should return position ${expected} from ${inputPos} with direction ${direction} and offset ${offset}`, () => {
			const got = util.getPositionInDirection(inputPos, direction, offset);
			assert.equal(got.x, expected.x);
			assert.equal(got.y, expected.y);
		});
	}
});
