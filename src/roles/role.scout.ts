import * as cartographer from "screeps-cartographer";
import { CreepRole } from "./meta";

export class Scout extends CreepRole {
	public constructor(creep: Creep) {
		super(creep);
	}

	public get targetRoom(): string | undefined {
		return this.creep.memory.targetRoom;
	}

	public set targetRoom(roomName: string | undefined) {
		this.creep.memory.targetRoom = roomName;
	}

	/**
	 * Whether the scout has reached its target room.
	 */
	public get isComplete(): boolean {
		return this.creep.room.name === this.targetRoom;
	}

	public run(): void {
		if (this.targetRoom) {
			cartographer.moveTo(this.creep, { pos: new RoomPosition(25, 25, this.targetRoom), range: 15 });
		} else {
			this.creep.log("No target room.");
		}
	}
}
