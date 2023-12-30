import * as cartographer from "screeps-cartographer";
import { Assignable } from "utils/task-assigner";
import { CreepRole } from "./meta";
import taskGather from "../task.gather";

export interface WorkerTask {
	task: WorkerTaskKind;
	target: Id<AnyStructure | ConstructionSite | Mineral>;
}

export enum WorkerTaskKind {
	Upgrade,
	Build,
	Repair,
	Dismantle,
	Mine,
}

export class Worker extends CreepRole implements Assignable<WorkerTask> {
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
	}

	public run(): void {
		if (!this.task) {
			this.log("No worker task.");
			// TODO: ask for a task
			return;
		}

		if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
			taskGather.run(this.creep);
			return;
		}

		this.performTask();
	}

	public performTask(): void {
		if (!this.task) {
			this.log("No worker task.");
			return;
		}

		const target = Game.getObjectById(this.task.target);
		if (!target) {
			this.log("Target invalid. Removing task.");
			this.task = undefined;
			return;
		}

		const neededRange =
			this.task.task === WorkerTaskKind.Mine || this.task.task === WorkerTaskKind.Dismantle ? 1 : 3;
		cartographer.moveTo(this.creep, { pos: target.pos, range: neededRange });

		switch (this.task.task) {
			case WorkerTaskKind.Upgrade:
				this.creep.upgradeController(target as StructureController);
				break;
			case WorkerTaskKind.Build:
				this.creep.build(target as ConstructionSite);
				break;
			case WorkerTaskKind.Repair:
				this.creep.repair(target as AnyStructure);
				break;
			case WorkerTaskKind.Dismantle:
				this.creep.dismantle(target as AnyStructure);
				break;
			case WorkerTaskKind.Mine:
				this.creep.harvest(target as Mineral);
				break;
			default:
				this.creep.say("help");
				break;
		}
	}

	public forceTask(task: WorkerTask): void {
		this.task = task;
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
