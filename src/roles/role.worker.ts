import * as cartographer from "screeps-cartographer";
import { Assignable } from "utils/task-assigner";
import { CreepRole } from "./meta";
import taskGather from "../task.gather";
import { util } from "../util";
import { Overseer, getOverseer } from "room/overseer";
import type { AnyDestructibleStructure } from "utils/types";

export type WorkerTask =
	| WorkerTaskUpgrade
	| WorkerTaskBuild
	| WorkerTaskRepair
	| WorkerTaskFortify
	| WorkerTaskDismantle
	| WorkerTaskMine;

// TODO: maybe turn these into classes? or maybe just use `creep-tasks` package? https://github.com/bencbartlett/creep-tasks

export interface WorkerTaskUpgrade {
	task: WorkerTaskKind.Upgrade;
	target: Id<StructureController>;
}

export interface WorkerTaskBuild {
	task: WorkerTaskKind.Build;
	target: Id<ConstructionSite>;
}

export interface WorkerTaskRepair {
	task: WorkerTaskKind.Repair;
	target: Id<
		Exclude<
			AnyOwnedStructure & AnyDestructibleStructure,
			StructureInvaderCore | StructurePowerBank | StructureWall | StructureRampart
		>
	>;
}

export interface WorkerTaskFortify {
	task: WorkerTaskKind.Fortify;
	target: Id<StructureWall | StructureRampart>;
}

export interface WorkerTaskDismantle {
	task: WorkerTaskKind.Dismantle;
	target: Id<AnyDestructibleStructure>;
}

export interface WorkerTaskMine {
	task: WorkerTaskKind.Mine;
	target: Id<Mineral>;
}

export enum WorkerTaskKind {
	Upgrade,
	Build,
	Repair,
	Fortify,
	Dismantle,
	Mine,
}

export class Worker extends CreepRole implements Assignable<WorkerTask> {
	private startedTaskAt = 0;

	/**
	 * Has the worker done at least one round of work?
	 */
	private hasWorkedAtLeastOnce = false;

	public constructor(creep: Creep | string) {
		super(creep);
	}

	public get targetRoom(): string | undefined {
		return this.creep.memory.targetRoom;
	}

	public set targetRoom(roomName: string | undefined) {
		this.creep.memory.targetRoom = roomName;
	}

	public get task(): WorkerTask | undefined {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return this.creep.memory.task;
	}

	private set task(task: WorkerTask | undefined) {
		this.creep.memory.task = task;
		this.startedTaskAt = Game.time;
		this.hasWorkedAtLeastOnce = false;
	}

	public get working(): boolean {
		return this.creep.memory.working ?? false;
	}
	private set working(working: boolean) {
		this.creep.memory.working = working;
	}

	private get overseer(): Overseer {
		return getOverseer(this.targetRoom!);
	}

	public run(): void {
		if (this.working && this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
			this.working = false;
			this.creep.say("🔄 gather");
		} else if (!this.working && this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
			this.working = true;
			this.creep.say("🚧 work");
		}

		if (this.task && this.isTaskDone()) {
			this.log("Task done.");
			this.task = undefined;
			return;
		}

		if (!this.working) {
			taskGather.run(this.creep);
			return;
		}

		if (this.targetRoom && this.creep.room.name !== this.targetRoom) {
			cartographer.moveTo(this.creep, { pos: new RoomPosition(25, 25, this.targetRoom), range: 23 });
			return;
		}

		if (!this.task) {
			this.log("No worker task. Falling back to upgrade.");
			this.task = {
				task: WorkerTaskKind.Upgrade,
				target: this.creep.room.controller!.id,
			};
			return;
		}

		const result = this.performTask();
		if (result !== OK) {
			this.log(`Task failed with result ${util.errorCodeToString(result)}.`);
		} else {
			this.hasWorkedAtLeastOnce = true;
		}
	}

	public performTask(): ScreepsReturnCode {
		if (!this.task) {
			this.log("No worker task.");
			return ERR_NOT_FOUND;
		}

		const target = Game.getObjectById(this.task.target);
		if (!target) {
			this.log("Target invalid. Removing task.");
			this.task = undefined;
			return ERR_NOT_FOUND;
		}

		const neededRange =
			this.task.task === WorkerTaskKind.Mine || this.task.task === WorkerTaskKind.Dismantle ? 1 : 3;
		cartographer.moveTo(this.creep, { pos: target.pos, range: neededRange });

		switch (this.task.task) {
			case WorkerTaskKind.Upgrade:
				return this.creep.upgradeController(target as StructureController);
			case WorkerTaskKind.Build:
				return this.creep.build(target as ConstructionSite);
			case WorkerTaskKind.Repair:
				return this.creep.repair(target as AnyStructure);
			case WorkerTaskKind.Fortify:
				return this.creep.repair(target as AnyStructure);
			case WorkerTaskKind.Dismantle:
				return this.creep.dismantle(target as AnyStructure);
			case WorkerTaskKind.Mine:
				return this.creep.harvest(target as Mineral);
			default:
				this.creep.say("help");
				return ERR_NOT_FOUND;
		}
	}

	public forceTask(task: WorkerTask): void {
		this.task = task;
	}

	private isTaskDone(): boolean {
		if (!this.task) {
			return true;
		}

		const target = Game.getObjectById(this.task.target);
		if (!target) {
			return true;
		}

		switch (this.task.task) {
			case WorkerTaskKind.Upgrade:
				return (
					this.hasWorkedAtLeastOnce &&
					(Game.time - this.startedTaskAt > 40 || this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0)
				);
			case WorkerTaskKind.Repair:
				// eslint-disable-next-line no-case-declarations
				const repairTarget = target as AnyStructure;
				return repairTarget.hits === repairTarget.hitsMax;
			case WorkerTaskKind.Fortify:
				return (
					// (target as StructureWall | StructureRampart).hits > (this.overseer.wallRepairThreshold ?? 2000) ||
					this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && this.hasWorkedAtLeastOnce
				);
			case WorkerTaskKind.Mine:
				// eslint-disable-next-line no-case-declarations
				const mineralTarget = target as Mineral;
				return mineralTarget.mineralAmount === 0;
			default:
				return false;
		}
	}
}

/**
 * A cache or workers by name.
 */
const workerHeapCache: Map<string, Worker> = new Map();

export function hydrateWorker(creep: Creep): Worker {
	if (!workerHeapCache.has(creep.name)) {
		workerHeapCache.set(creep.name, new Worker(creep));
	}
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return workerHeapCache.get(creep.name)!;
}
