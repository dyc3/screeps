import { OffenseStrategy, olog } from "./BaseStrategy";
import util from "../util";

/**
 * @example Offense.create("OvermindRemoteMinerBait", init={miningRoom: "W17N7", spawningRoom: "W18N7", waitingRoom: "W16N7"})
 */
export class OffenseStrategyOvermindRemoteMinerBait extends OffenseStrategy {
	// @ts-expect-error FIXME: should probably be renamed so it vibes better with typescript
	static get name() {
		return "OvermindRemoteMinerBait";
	}

	/** The room to wait in while fleeing. */
	waitingRoom: string;
	/** The room the enemy is mining in. */
	miningRoom: string;
	/** The room the enemy is probably spawning the guard creeps from. */
	spawningRoom: string;
	objective: "bait" | "flee";
	observerId: Id<StructureObserver> | undefined;
	lastObservationTime: number = 0;

	constructor(mem: any) {
		super(mem);
		this.waitingRoom = "";
		this.miningRoom = "";
		this.spawningRoom = "";
		this.objective = "bait";
		this.observerId = undefined;
		Object.assign(this, mem);
	}

	get neededCreeps() {
		return {
			"naive-bait": 1,
		};
	}

	findObserver(): Id<StructureObserver> | undefined {
		const rooms = util.getOwnedRooms();
		for (let room of rooms) {
			let observer = room.find(FIND_MY_STRUCTURES, {
				filter: s => s.structureType === STRUCTURE_OBSERVER
			})[0] as StructureObserver;
			if (observer) {
				return observer.id;
			}
		}
		return;
	}


	act(creeps: Creep[]): void {
		// TODO: finish implementation
		// 1. bait overmind into spawning a guard with a 1 ATTACK creep
		// 2. wait for guard to enter room
		// 3. move our creep out of the room
		// 4. remote observe mining room, wait for guard to despawn or leave room
		// 5. move our creep back into the room
		// 6. repeat

		// Success condition, when the spawning room that is spawning the creeps is out of energy.


		// act on creeps based on objective
		let creep = creeps[0];
		if (creep) {
			if (this.objective === "bait") {
				olog("bait: ", creep.name, creep.pos, "moving to ", this.miningRoom);
				if (creep.room.name !== this.miningRoom && !this.waitingRoom) {
					// if we are adjacent to the mining room, and we don't know what our waiting room is,
					// then we can assume that the current room is the waiting room.

					let exits = creep.room.find(FIND_EXIT);
					for (let exit of exits) {
						if (exit.roomName === this.miningRoom) {
							this.waitingRoom = creep.room.name;
							break;
						}
					}
				}
				creep.travelTo(new RoomPosition(25, 25, this.miningRoom), { range: 20 });
			} else if (this.objective === "flee") {
				olog("flee: ", creep.name, creep.pos, "moving to ", this.waitingRoom);
				creep.travelTo(new RoomPosition(25, 25, this.waitingRoom), { range: 20 });

				if (creep.ticksToLive ?? 1500 < 400) {
					creep.memory.renewing = true;
				}
			}
		}

		// determine if we need to change objectives
		if (this.objective === "bait") {
			let miningRoom = Game.rooms[this.miningRoom];
			if (miningRoom) {
				let enemyCreeps = miningRoom.find(FIND_HOSTILE_CREEPS);
				let hostiles = enemyCreeps.filter(c => c.getActiveBodyparts(ATTACK) + c.getActiveBodyparts(RANGED_ATTACK) > 0);
				if (hostiles.length > 0) {
					this.objective = "flee";
				}
			}
		} else if (this.objective === "flee") {
			let miningRoom = Game.rooms[this.miningRoom];
			if (miningRoom) {
				let enemyCreeps = miningRoom.find(FIND_HOSTILE_CREEPS);
				let hostiles = enemyCreeps.filter(c => c.getActiveBodyparts(ATTACK) + c.getActiveBodyparts(RANGED_ATTACK) > 0);
				if (hostiles.length === 0) {
					this.objective = "bait";
				}
				this.lastObservationTime = Game.time;
			} else {
				// TODO: we should have some sort of observation queue so we don't have to rely on one specific observer being available.
				if (!this.observerId) {
					this.observerId = this.findObserver();
				}
				if (!this.observerId) {
					throw new Error("No observer found. You need to build one.");
				}
				if (Game.time - this.lastObservationTime > 20) {
					let observer = Game.getObjectById(this.observerId);
					if (!observer) {
						throw new Error("Observer invalid, need to find a new one.");
					}
					observer.observeRoom(this.miningRoom);
				}
			}
		}

		// visualize on map
		Game.map.visual.line(new RoomPosition(25, 25, this.miningRoom), new RoomPosition(25, 25, this.waitingRoom), { color: "#ff0000" });
		Game.map.visual.line(new RoomPosition(25, 25, this.miningRoom), new RoomPosition(25, 25, this.spawningRoom), { color: "#0000ff" });
		let color = this.objective === "bait" ? "#00ff00" : "#ff0000";
		Game.map.visual.circle(new RoomPosition(25, 25, this.miningRoom), { stroke: color, fill: "transparent" });
	}
}
