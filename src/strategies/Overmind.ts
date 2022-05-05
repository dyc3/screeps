import { OffenseStrategy } from "./BaseStrategy";
import util from "../util";
// @ts-expect-error not converted yet
import taskRenew from "../task.renew.js";
import { olog } from "../offense/util";
import { ObserveQueue } from "../observequeue";

/**
 * Bait hives into spawning very large and expensive creeps.
 *
 * Capable of baiting zerglings, hydralisks, into spawning.
 *
 * 1. bait overmind into spawning a guard with a 1 ATTACK creep
 * 2. wait for guard to enter room, and then get sufficiently close to getting in range
 * 3. move our creep out of the room
 * 4. remote observe mining room, wait for guard to despawn or leave room
 * 5. move our creep back into the room
 * 6. repeat
 *
 * Success condition, when the spawning room that is spawning the creeps is out of energy.
 *
 * @example
 * Offense.create("OvermindRemoteMinerBait", init={miningRoom: "W17N7", spawningRoom: "W18N7", waitingRoom: "W16N7"})
 * Offense.create("OvermindRemoteMinerBait", init={miningRoom: "W31N11", spawningRoom: "W32N11", waitingRoom: "W30N11"})
 * Memory.offense.tasks.map(t => t.autoSpawn = true)
 */
export class OffenseStrategyOvermindRemoteMinerBait extends OffenseStrategy {
	static get strategyName() {
		return "OvermindRemoteMinerBait";
	}

	/** The room to wait in while fleeing. */
	waitingRoom: string;
	/** The room the enemy is mining in. */
	miningRoom: string;
	/** The room the enemy is probably spawning the guard creeps from. */
	spawningRoom: string;
	objective: "travel" | "bait" | "flee";
	lastObservationTime: number = 0;
	outsideOfObservationRange: boolean = false;
	baitPosition: RoomPosition | undefined;

	constructor(mem: any) {
		super(mem);
		this.waitingRoom = "";
		this.miningRoom = "";
		this.spawningRoom = "";
		this.objective = "travel";
		Object.assign(this, mem);
		if (mem.baitPosition) {
			this.baitPosition = new RoomPosition(mem.baitPosition.x, mem.baitPosition.y, mem.baitPosition.roomName);
		}
	}

	get neededCreeps() {
		return {
			"naive-bait": 1,
		};
	}

	getKnownBadRooms(): string[] {
		let badRooms: string[] = [
			this.spawningRoom,
			...Memory.remoteMining.targets.filter(t => t.danger > 0).map(t => t.roomName),
			...Memory.offense.tasks.filter(t => t.strategyName === this.strategyName).map(t => t.spawningRoom),
		];
		return badRooms;
	}

	act(creeps: Creep[]): void {
		// act on creeps based on objective
		let creep = creeps[0];
		creep.say(this.objective);
		if (creep) {
			if (creep.memory.renewing) {
				taskRenew.run(creep);
			} else if (this.objective === "travel") {
				// move to the waiting room
				olog(`travel: moving to ${this.waitingRoom}`);

				creep.travelTo(new RoomPosition(25, 25, this.waitingRoom), {
					range: 20,
					avoidRooms: this.getKnownBadRooms(),
					preferHighway: true,
				});
			} else if (this.objective === "bait") {
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
				creep.travelTo(new RoomPosition(25, 25, this.miningRoom), {
					range: 20,
					avoidRooms: this.getKnownBadRooms(),
					preferHighway: true,
				});

				// TODO: calculate baitPosition and waitPosition ahead of time and cache them
				this.baitPosition = creep.pos; // HACK: save the position of the bait
			} else if (this.objective === "flee") {
				olog("flee: ", creep.name, creep.pos, "moving to ", this.waitingRoom);
				creep.travelTo(new RoomPosition(25, 25, this.waitingRoom), {
					range: 20,
					avoidRooms: this.getKnownBadRooms(),
					preferHighway: true,
				});

				// this condition is a little arbitrary, might not be sufficient.
				if ((creep.ticksToLive ?? 1500) < 400) {
					creep.memory.renewing = true;
					creep.memory.renew_force_amount = 1400;
					olog("flee: ", creep.name, "renewing");
				}
			}
		}

		// determine if we need to change objectives
		if (!creep) {
			this.objective = "travel";
		} else if (this.objective === "travel") {
			if (creep.room.name === this.miningRoom) {
				this.objective = "bait";
			} else if (creep.room.name === this.waitingRoom) {
				this.objective = "flee";
			}
		} else if (this.objective === "bait") {
			let miningRoom = Game.rooms[this.miningRoom];
			if (miningRoom) {
				let enemyCreeps = miningRoom.find(FIND_HOSTILE_CREEPS);
				let hostiles = enemyCreeps.filter(c => c.getActiveBodyparts(ATTACK) + c.getActiveBodyparts(RANGED_ATTACK) > 0);
				if (hostiles.length > 0) {
					let closestDist = hostiles.map(c => c.pos.getRangeTo(creep)).reduce((a, b) => Math.min(a, b));
					olog(`bait: ${creep.name} is ${closestDist} away from an enemy.`);
					if (closestDist <= 12) {
						this.objective = "flee";
					}
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
				if (this.baitPosition) {
					if (hostiles.length > 0) {
						let closestDist = hostiles.map(c => c.pos.getRangeTo(this.baitPosition as RoomPosition)).reduce((a, b) => Math.min(a, b));
						olog(`flee: enemy is ${closestDist} away from the bait position.`);
						if (closestDist > 30) {
							this.objective = "bait";
						}
					}
				}
				this.lastObservationTime = Game.time;
			} else {
				if (Game.time - this.lastObservationTime > 20) {
					if (this.outsideOfObservationRange) {
						this.objective = "bait";
					} else {
						ObserveQueue.queue(this.miningRoom);
					}
				}
			}
		}

		this.visualize(creep);
	}

	visualize(creep: Creep | undefined): void {
		Game.map.visual.line(new RoomPosition(25, 25, this.miningRoom), new RoomPosition(25, 25, this.waitingRoom), { color: "#ff0000" });
		Game.map.visual.line(new RoomPosition(25, 25, this.miningRoom), new RoomPosition(25, 25, this.spawningRoom), { color: "#0000ff" });
		let color = {
			"bait": "#00ff00",
			"flee" : "#ff0000",
			"travel": "#ffff00",
		}[this.objective];
		Game.map.visual.circle(new RoomPosition(25, 25, this.miningRoom), { stroke: color, fill: "transparent" });
		if (creep) {
			Game.map.visual.circle(creep.pos, { stroke: "#ffff00", fill: "transparent", radius: 1 });
			Game.map.visual.line(new RoomPosition(25, 25, this.miningRoom), creep.pos, { color: "#ffff00" });
		}
	}
}

/**
 * Destroys an Overmind hive. Simple as that. WIP.
 *
 * Fully fortified hives are very tough. They have ramparts across the entire base.
 *
 * Types of creeps:
 * - Zergling: melee attacker, a little bit of healing
 * - Hydralisk: ranged attacker, a little bit of healing
 * - Transfuser: Fuck tons of heal, hella boosted
 *
 * Behavior documentation:
 * - If there are any enemies within 2 squares, of any critical structures (spawns, storage, terminal), it will activate a safe mode.
 * - When it activates the safe mode, it will evacuate all the resources in the terminal to another room.
 * - When a nuclear launch is detected, it will reinforce the ramparts in the impact area.
 * - If it sees enemy creeps in it's remote mining rooms, it will spawn zerglings and hydralisks defense creeps, even if there are already zerglings or hydralisks present and available.
 * - Infusers are only spawned for offensive action.
 * - Nukes will trigger immediate retaliation.
 */
export class OffenseStrategyHiveBuster extends OffenseStrategy {
	/**
	 * The room name that the target hive is in.
	 */
	hive: string;

	constructor(mem: any) {
		super(mem);
		this.hive = mem.hive;
		Object.assign(this, mem);
	}

	/**
	 * Indicates if the hive can activate a safe mode
	 */
	canSafeModeBeTriggered(controller: StructureController): boolean {
		return controller.safeModeAvailable > 0 && !controller.safeMode && !controller.safeModeCooldown;
	}

	act(creeps: Creep[]) {

	}
}
