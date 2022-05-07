import util from "../util";

export class RoomLord {
	room: Room;

	constructor(public r: Room) {
		this.room = r;
	}

	public run() {

	}
}

/**
 * Run lords for all owned rooms.
 */
export function run() {
	for (let room of util.getOwnedRooms()) {
		let lord = new RoomLord(room);
		lord.run();
	}
}

export default {
	run,
}
