import util from "../util";
import combatCalc from "../combat/calc";

/** How long to remain on alert. */
const ALERT_DURATION = 100;

export class RoomLord {
	room: Room;

	constructor(public r: Room) {
		this.room = r;
	}

	public run() {
		this.setupMemory();
		this.defendRoom();
	}

	setupMemory() {
		if (!this.room.memory.defense) {
			this.room.memory.defense = {
				alertUntil: 0,
				focusQueue: [],
				defenderCreeps: [],
			}
		}
	}

	log(...args: any[]) {
		console.log(`${this.room.name} lord: `, ...args)
	}

	defendRoom() {
		// TODO: handle swarm attacks

		let towers = this.room.find<StructureTower>(FIND_MY_STRUCTURES, {
			filter: { structureType: STRUCTURE_TOWER }
		});
		let hostiles = this.room.find(FIND_HOSTILE_CREEPS);
		if (this.room.controller?.isPowerEnabled) {
			let powerhostiles = this.room.find(FIND_HOSTILE_POWER_CREEPS);
		}

		if (hostiles.length > 0) {
			this.pingAlertRoom();
		}

		if (this.isAlerted()) {
			this.log(`defending room`);

			// defender creeps that are still idle
			let  idleDefenders: Set<Id<Creep>> = new Set(this.room.memory.defense.defenderCreeps);

			let focusTargets = this.getAvailableFocusTargets();
			if (focusTargets.length === 0) {
				this.log("looking for focus targets")
				// this is a pretty naive selection, this could be a little bit smarter
				if (hostiles.length > 0) {
					let hostile = hostiles[0];
					this.room.memory.defense.focusQueue.push(hostile.id);
					focusTargets.push(hostile);
				}
			}
			this.log(`focus targets: ${focusTargets.length}`);

			if (focusTargets.length > 0) {
				// attack focus target with towers
				for (let tower of towers) {
					tower.attack(focusTargets[0]);
				}

				// attack focus targets using defense creeps
				for (let id of idleDefenders) {
					let creep = Game.getObjectById(id);
					if (!creep) {
						// TODO: remove creep ids that don't exist anymore.
						continue;
					}
					for (let focusTarget of focusTargets) {
						let result = this.creepAttackOptimized(creep, focusTarget);
						if (result === OK) {
							idleDefenders.delete(creep.id);
							continue;
						}
					}
				}
			}
		} else {
			// combat is over, clear memory
			this.room.memory.defense.focusQueue = [];
		}
	}

	getAvailableFocusTargets(): (Creep | PowerCreep)[] {
		let creeps = [];
		for (let id of this.room.memory.defense.focusQueue) {
			let creep = Game.getObjectById(id);
			if (!creep) {
				continue;
			}
			if (creep.room?.name !== this.room.name) {
				continue;
			}
			creeps.push(creep);
		}
		return creeps;
	}

	pingAlertRoom() {
		this.room.memory.defense.alertUntil = Game.time + ALERT_DURATION;
	}

	isAlerted() {
		return Game.time < this.room.memory.defense.alertUntil;
	}

	/** An optimized attack for a creep against a target. */
	creepAttackOptimized(creep: Creep, target: Creep | PowerCreep): ScreepsReturnCode {
		let dist = creep.pos.getRangeTo(target);
		let attackRange = combatCalc.getMaxAttackRange(creep);
		if (dist > attackRange) {
			return ERR_NOT_IN_RANGE;
		}
		if (creep.getActiveBodyparts(RANGED_ATTACK) > 0 && dist <= 3) {
			if (dist === 1) {
				return creep.rangedMassAttack();
			} else {
				return creep.rangedAttack(target);
			}
		}
		if (creep.getActiveBodyparts(ATTACK) > 0 && dist === 1) {
			return creep.attack(target);
		}
		return ERR_NOT_IN_RANGE;
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
