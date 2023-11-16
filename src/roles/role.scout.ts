import * as cartographer from "screeps-cartographer";

export class Scout {
	public creep: Creep;

	public constructor(creep: Creep) {
		this.creep = creep;
	}

	public get targetRoom(): string | undefined {
		return this.creep.memory.targetRoom;
	}

	public set targetRoom(roomName: string | undefined) {
		this.creep.memory.targetRoom = roomName;
	}

	public run(): void {
		if (this.targetRoom) {
			cartographer.moveTo(this.creep, { pos: new RoomPosition(25, 25, this.targetRoom), range: 15 });
		} else {
			this.creep.log("No target room.");
		}
	}
}
