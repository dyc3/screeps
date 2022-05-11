/**
 * Are all the creeps within the specified range?
 * @param creeps
 * @param pos
 * @param range
 */
export function areAllCreepsInRange(creeps: Creep[], pos: RoomPosition, range: number): boolean {
	return creeps.every(c => pos.inRangeTo(c, range));
}

/**
 * Assumes that all creeps are in the same room.
 * @param creeps
 * @returns
 */
export function getAveragePosition(creeps: Creep[]): RoomPosition {
	const roomName = creeps[0].room.name;
	const xy = creeps.map(c => [c.pos.x, c.pos.y] as [number, number]).reduce((a, b) => [a[0] + b[0], a[1] + b[1]]);
	return new RoomPosition(xy[0] / creeps.length, xy[1] / creeps.length, roomName);
}
