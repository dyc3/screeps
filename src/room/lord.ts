import util from "../util";
import combatCalc from "../combat/calc";
// @ts-expect-error not converted to ts yet
import taskGather from "../task.gather.js";
import { Role } from "../roles/meta";

/** How long to remain on alert. */
const ALERT_DURATION = 100;
/** If there are no build targets, wait for this many ticks before searching for a new build target. */
const BUILD_TARGET_SEARCH_DELAY = 20;
const REPAIR_TARGET_SEARCH_DELAY = 20;
const FORTIFY_TARGET_SEARCH_DELAY = 20;

export enum WorkerTask {
	Upgrade,
	Build,
	Repair,
	Fortify,
}

const WORK_ACTIONS: Record<WorkerTask, "build" | "upgradeController" | "repair"> = {
	[WorkerTask.Upgrade]: "upgradeController",
	[WorkerTask.Build]: "build",
	[WorkerTask.Repair]: "repair",
	[WorkerTask.Fortify]: "repair",
};

export class RoomLord {
	room: Room;

	constructor(public r: Room) {
		this.room = r;
	}

	public run() {
		this.setupMemory();
		this.cleanUpDeadWorkers();
		this.defendRoom();
		this.findBuildTarget();
		this.findRepairTarget();
		this.findFortifyTarget();
		this.calcWorkerAllocations();
		this.allocateWorkers();
		this.workCreeps();
	}

	setupMemory() {
		_.defaultsDeep(this.room.memory, {
			defense: {
				alertUntil: 0,
				focusQueue: [],
				defenderCreeps: [],
			},
			workers: [],
			findBuildTargetAt: 0,
			findRepairTargetAt: 0,
			findFortifyTargetAt: 0,
		})
	}

	log(...args: any[]) {
		console.log(`<span style="color: lime">${this.room.name} lord: `, ...args, "</span>")
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

	findBuildTarget() {
		if (Game.time < this.room.memory.findBuildTargetAt) {
			return;
		}
		if (this.room.memory.buildTargetId && !!Game.getObjectById(this.room.memory.buildTargetId)) {
			return;
		}

		let sites = this.room.find(FIND_CONSTRUCTION_SITES);

		if (sites.length === 0) {
			this.room.memory.findBuildTargetAt = Game.time + BUILD_TARGET_SEARCH_DELAY;
			return;
		}

		sites = _.sortByOrder(sites, [
			site => site.structureType === STRUCTURE_SPAWN,
			site => site.structureType === STRUCTURE_TERMINAL,
			site => site.structureType === STRUCTURE_STORAGE,
			site => site.structureType !== STRUCTURE_ROAD,
		], ["desc", "desc", "desc", "desc"]);

		this.room.memory.buildTargetId = sites[0].id;
	}

	findRepairTarget() {
		if (Game.time < this.room.memory.findRepairTargetAt) {
			return;
		}
		if (this.room.memory.repairTargetId && !!Game.getObjectById(this.room.memory.repairTargetId)) {
			return;
		}

		let structures = this.room.find(FIND_STRUCTURES, {
			filter: struct => struct.structureType !== STRUCTURE_WALL && struct.structureType !== STRUCTURE_RAMPART && struct.hits < struct.hitsMax,
		});

		if (structures.length === 0) {
			this.room.memory.findRepairTargetAt = Game.time + REPAIR_TARGET_SEARCH_DELAY;
			return;
		}

		this.room.memory.repairTargetId = structures[0].id;
	}

	findFortifyTarget() {
		if (Game.time < this.room.memory.findFortifyTargetAt) {
			return;
		}
		if (this.room.memory.fortifyTargetId && !!Game.getObjectById(this.room.memory.fortifyTargetId)) {
			return;
		}

		let structures = this.room.find(FIND_STRUCTURES, {
			filter: struct => (struct.structureType === STRUCTURE_WALL || struct.structureType === STRUCTURE_RAMPART) && struct.hits < struct.hitsMax,
		}) as (StructureWall | StructureRampart)[];

		if (structures.length === 0) {
			this.room.memory.findFortifyTargetAt = Game.time + FORTIFY_TARGET_SEARCH_DELAY;
			return;
		}

		this.room.memory.fortifyTargetId = structures[0].id;
	}

	/** Determines which job should get how many creeps.
	 * This does not take into account the number of workers that already exist.
	 * This is what determines the number of workers that should exist.
	 */
	calcWorkerAllocations() {
		// TODO: use heuristics or something to be smart about creep allocation
		const sites = this.room.find(FIND_MY_CONSTRUCTION_SITES);
		const damangedStructures = this.room.find(FIND_STRUCTURES, {
			filter(struct) {
				if (struct.structureType === STRUCTURE_RAMPART || struct.structureType === STRUCTURE_WALL) {
					return false;
				}
				return struct.hits < struct.hitsMax;
			}
		})
		const desiredWorkers: Record<WorkerTask, number> = {
			[WorkerTask.Upgrade]: 3,
			[WorkerTask.Build]: sites.length > 0 ? 2 : 0,
			[WorkerTask.Repair]: damangedStructures.length > 0 ? 1 : 0,
			[WorkerTask.Fortify]: 1,
		};
		this.room.memory.workerAllocations = desiredWorkers;
		this.log(`allocations: ${JSON.stringify(desiredWorkers)}`);
	}

	/**
	 * This solves for the "Partition problem".
	 */
	allocateWorkers() {
		const workers = this.getWorkers();
		const currentAllocations = this.getCurrentAllocations();
		this.log(`current allocations: ${JSON.stringify(currentAllocations)}`);
		const neededNewAllocations: Record<WorkerTask, number> = {
			[WorkerTask.Upgrade]: this.room.memory.workerAllocations[WorkerTask.Upgrade] - currentAllocations[WorkerTask.Upgrade],
			[WorkerTask.Build]: this.room.memory.workerAllocations[WorkerTask.Build] - currentAllocations[WorkerTask.Build],
			[WorkerTask.Repair]: this.room.memory.workerAllocations[WorkerTask.Repair] - currentAllocations[WorkerTask.Repair],
			[WorkerTask.Fortify]: this.room.memory.workerAllocations[WorkerTask.Fortify] - currentAllocations[WorkerTask.Fortify],
		}
		// unallocate workers for overfilled tasks
		for (const task of [WorkerTask.Upgrade, WorkerTask.Build, WorkerTask.Repair, WorkerTask.Fortify]) {
			if (neededNewAllocations[task] < 0) {
				let workersOfTask = workers.filter(worker => worker.memory.workTask === task);
				let workersToUnallocate = workersOfTask.slice(0, -neededNewAllocations[task]);
				this.log(`unallocating ${workersToUnallocate.length} workers for ${task}`);
				workersToUnallocate.forEach(worker => {
					delete worker.memory.workTask;
				});
				neededNewAllocations[task] += workersToUnallocate.length;
			}
		}

		// allocate workers for underfilled tasks
		let unallocatedWorkers = workers.filter(worker => worker.memory.workTask === undefined);
		for (const task of [WorkerTask.Upgrade, WorkerTask.Build, WorkerTask.Repair, WorkerTask.Fortify]) {
			while (neededNewAllocations[task] > 0 && unallocatedWorkers.length > 0) {
				let worker = unallocatedWorkers.pop();
				if (!worker) {
					break;
				}
				this.log(`allocating worker ${worker.name} for task ${task}`);
				worker.memory.workTask = task;
				neededNewAllocations[task] -= 1;
			}
		}
		if (unallocatedWorkers.length > 0) {
			this.log(`WARN: still have unallocated workers: ${unallocatedWorkers.map(worker => worker.name).join(", ")}`);
		}
	}

	getWorkers(): Creep[] {
		return this.room.memory.workers.map(name => Game.creeps[name]).filter(creep => !!creep);
	}

	cleanUpDeadWorkers() {
		this.room.memory.workers = this.room.memory.workers.filter(name => !!Game.creeps[name]);
	}

	/** Get creeps to do work.
	 */
	workCreeps() {
		// Execute tasks
		for (const creep of this.getWorkers()) {
			if (creep.spawning) {
				continue;
			}

			if (creep.room.name !== this.room.name) {
				creep.travelTo(new RoomPosition(25, 25, this.room.name), { range: 22 });
				continue;
			}

			if (creep.memory.workTask === undefined) {
				continue;
			}

			// switch state
			if (creep.memory.working) {
				if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
					creep.memory.working = false;
				}
			} else {
				if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
					creep.memory.working = true;
				}
			}

			this.room.visual.circle(creep.pos, {
				fill: 'transparent',
				radius: 0.5,
				stroke: creep.memory.working ? '#00ff00' : '#ff0000',
			});
			this.room.visual.text(`${creep.memory.workTask}`, creep.pos.x, creep.pos.y - 0.5, );

			// act on state
			if (creep.memory.working) {
				const workTarget = this.getWorkTarget(creep.memory.workTask);
				if (!workTarget) {
					continue;
				}

				if (creep.pos.inRangeTo(workTarget, 3)) {
					// @ts-ignore This is OK, because it doesn't matter what the target is. This is type checked appropriately in other places.
					creep[WORK_ACTIONS[creep.memory.workTask]](workTarget);
				} else {
					creep.travelTo(workTarget, { range: 3, maxRooms: 1 });
				}
			} else {
				taskGather.run(creep);
			}
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

	getWorkTarget(worktask: WorkerTask): RoomObject | null | undefined {
		switch (worktask) {
			case WorkerTask.Upgrade:
				return this.room.controller;
			case WorkerTask.Build:
				if (!this.room.memory.buildTargetId) {
					return undefined;
				}
				return Game.getObjectById(this.room.memory.buildTargetId);
			case WorkerTask.Repair:
				if (!this.room.memory.repairTargetId) {
					return undefined;
				}
				return Game.getObjectById(this.room.memory.repairTargetId);
			case WorkerTask.Fortify:
				if (!this.room.memory.fortifyTargetId) {
					return undefined;
				}
				return Game.getObjectById(this.room.memory.fortifyTargetId);
			default:
				return undefined;
		}
	}

	public adoptCreep(creepName: string) {
		this.room.memory.workers.push(creepName);
	}

	getCurrentAllocations(): Record<WorkerTask, number> {
		const workersGroups = _.countBy(this.getWorkers().map(c => c.memory.workTask));
		this.log(`Worker groups: ${JSON.stringify(workersGroups)}`);
		const allocations: Record<WorkerTask, number> = {
			[WorkerTask.Upgrade]: workersGroups[WorkerTask.Upgrade] ?? 0,
			[WorkerTask.Build]: workersGroups[WorkerTask.Build] ?? 0,
			[WorkerTask.Repair]: workersGroups[WorkerTask.Repair] ?? 0,
			[WorkerTask.Fortify]: workersGroups[WorkerTask.Fortify] ?? 0,
		};
		return allocations;
	}
}

global.Lords = {
	/** Testing function to quickly spawn a worker for testing. */
	forceSpawnWorker(roomName: string) {
		const room = Game.rooms[roomName];
		let spawn = room.find(FIND_MY_SPAWNS)[0];
		const creepName = `worker_${Game.time.toString(16)}`;
		spawn.spawnCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], creepName, {
			// @ts-ignore
			memory: {
				role: Role.Worker,
				room: roomName,
				keepAlive: true,
				renewing: false,
				stage: 0,
				working: false,
			},
		});

		const lord = new RoomLord(room);
		lord.adoptCreep(creepName);
	},

	get(roomName: string): RoomLord {
		return new RoomLord(Game.rooms[roomName]);
	}
};



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
