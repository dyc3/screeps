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

export class Worker extends CreepRole {
	public constructor(creep: Creep) {
		super(creep);
	}

	public get targetRoom(): string | undefined {
		return this.creep.memory.targetRoom;
	}

	public set targetRoom(roomName: string | undefined) {
		this.creep.memory.targetRoom = roomName;
	}

	public get workerTask(): WorkerTask | undefined {
		return this.creep.memory.task;
	}

	private set workerTask(task: WorkerTask | undefined) {
		this.creep.memory.task = task;
	}

	public run(): void {
		if (!this.workerTask) {
			this.log("No worker task.");
			// TODO: ask for a task
			return;
		}

		if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
			taskGather.run(this.creep);
			return;
		}
	}

	public performTask(): void {
		if (!this.workerTask) {
			this.log("No worker task.");
			return;
		}

		const target = Game.getObjectById(this.workerTask.target);

		switch (this.workerTask.task) {
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
			default:
				this.creep.say("help");
				break;
		}
	}
}
