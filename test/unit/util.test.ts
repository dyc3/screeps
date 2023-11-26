import { assert } from "chai";
import util from "../../src/util";

describe("util", () => {
	for (const [input, expected] of [
		[TOP, BOTTOM],
		[BOTTOM, TOP],
		[LEFT, RIGHT],
		[RIGHT, LEFT],
		[TOP_LEFT, BOTTOM_RIGHT],
		[BOTTOM_RIGHT, TOP_LEFT],
		[TOP_RIGHT, BOTTOM_LEFT],
		[BOTTOM_LEFT, TOP_RIGHT],
	]) {
		it(`should return opposite direction of ${input} => ${expected}`, () => {
			const got = util.getOppositeDirection(input);
			assert.equal(got, expected);
		});
	}

	for (const [inputPos, direction, offset, expected] of [
		[
			{ x: 10, y: 10, roomName: "W0N0" } as RoomPosition,
			LEFT,
			1,
			{ x: 9, y: 10, roomName: "W0N0" } as RoomPosition,
		],
		[
			{ x: 10, y: 10, roomName: "W0N0" } as RoomPosition,
			TOP_LEFT,
			1,
			{ x: 9, y: 9, roomName: "W0N0" } as RoomPosition,
		],
		[
			{ x: 10, y: 10, roomName: "W0N0" } as RoomPosition,
			TOP_LEFT,
			2,
			{ x: 8, y: 8, roomName: "W0N0" } as RoomPosition,
		],
		[
			{ x: 0, y: 0, roomName: "W0N0" } as RoomPosition,
			TOP_LEFT,
			1,
			{ x: 0, y: 0, roomName: "W0N0" } as RoomPosition,
		],
		[
			{ x: 2, y: 2, roomName: "W0N0" } as RoomPosition,
			TOP_LEFT,
			5,
			{ x: 0, y: 0, roomName: "W0N0" } as RoomPosition,
		],
	] as const) {
		it(`should return position ${JSON.stringify(expected)} from ${JSON.stringify(
			inputPos
		)} with direction ${direction} and offset ${offset}`, () => {
			const got = util.getPositionInDirection(inputPos, direction, offset);
			assert.equal(got.x, expected.x);
			assert.equal(got.y, expected.y);
		});
	}
});
