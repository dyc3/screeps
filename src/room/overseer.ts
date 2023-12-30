// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CacheKey, memoryCacheGetter } from "screeps-cache";
import { Worker, WorkerTask, WorkerTaskKind, hydrateWorker } from "../roles/role.worker";
import { NaiveTaskAssigner } from "../utils/task-assigner";
import { Role } from "../roles/meta";
import util from "../util";

export class Overseer {
	public roomName: string;

	public constructor(roomName: string) {
		this.roomName = roomName;

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const _ in this) {
			// refresh props
		}
	}

	public get room(): Room {
		return Game.rooms[this.roomName];
	}

	public run(): void {
		if (!this.room) {
			console.log(`Overseer: No vision for room ${this.roomName}`);
			return;
		}
		this.assignWorkerTasks();

		this.visualize();
	}

	public visualize(): void {
		const tasks = this.getAllWorkerTasks();
		this.room.visual.text(`Overseer`, 20, 1, { align: "left" });
		this.room.visual.text(`Workers: ${this.getCreeps().length} - Tasks: ${tasks.length}`, 20, 2, { align: "left" });
		this.room.visual.text(`Assigned tasks:`, 20, 3, { align: "left" });
		const counts = this.countAssignedTasks();
		for (const [kind, count] of Object.entries(counts)) {
			const kindNum = parseInt(kind, 10);
			this.room.visual.text(`${WorkerTaskKind[kindNum]}: ${count}`, 20, 4 + kindNum, { align: "left" });
		}
	}

	private getCreeps(): Creep[] {
		return util.getCreeps(Role.Worker).filter(c => c.memory.targetRoom === this.roomName);
	}

	private getWorkers(): Worker[] {
		return this.getCreeps().map(hydrateWorker);
	}

	private assignWorkerTasks(): void {
		const tasks = this.getAllWorkerTasks();
		const sortedTasks = this.sortTasksByPriority(tasks);
		const assigner = new NaiveTaskAssigner(this.getWorkers(), sortedTasks);
		assigner.assignTasks();
	}

	private countAssignedTasks(): Record<WorkerTaskKind, number> {
		const workers = this.getWorkers().filter(c => !!c.task);
		const counts: Record<WorkerTaskKind, number> = {
			[WorkerTaskKind.Upgrade]: 0,
			[WorkerTaskKind.Build]: 0,
			[WorkerTaskKind.Repair]: 0,
			[WorkerTaskKind.Dismantle]: 0,
			[WorkerTaskKind.Mine]: 0,
		};
		for (const worker of workers) {
			if (!worker.task) {
				continue;
			}
			counts[worker.task.task]++;
		}
		return counts;
	}

	private get taskLimits(): Record<WorkerTaskKind, number> {
		return {
			[WorkerTaskKind.Upgrade]: 1,
			[WorkerTaskKind.Build]: 2,
			[WorkerTaskKind.Repair]: 1,
			[WorkerTaskKind.Dismantle]: 1,
			[WorkerTaskKind.Mine]: 1,
		};
	}

	private getBuildPriority(task: WorkerTask): number {
		if (task.task !== WorkerTaskKind.Build) {
			return 0;
		}
		const site = Game.getObjectById(task.target as Id<ConstructionSite>);
		switch (site?.structureType) {
			case STRUCTURE_SPAWN:
				return 4;
			case STRUCTURE_TOWER:
				return 3;
			case STRUCTURE_EXTENSION:
				return 2;
			case STRUCTURE_ROAD:
				return -1;
			default:
				return (site?.progress ?? 0) / (site?.progressTotal ?? 1);
		}
	}

	private sortTasksByPriority(tasks: WorkerTask[]): WorkerTask[] {
		return _.sortByOrder(
			tasks,
			[
				(t: WorkerTask) => t.task === WorkerTaskKind.Upgrade,
				(t: WorkerTask) => (t.task === WorkerTaskKind.Build ? this.getBuildPriority(t) : 0),
			],
			["desc", "desc"]
		);
	}

	private getAllWorkerTasks(): WorkerTask[] {
		const tasks: WorkerTask[] = [this.upgradeTask()].concat(
			this.buildTasks(),
			this.repairTasks(),
			this.miningTasks()
		);
		return tasks;
	}

	private upgradeTask(): WorkerTask {
		return {
			task: WorkerTaskKind.Upgrade,
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			target: this.room.controller!.id,
		};
	}

	private buildTasks(): WorkerTask[] {
		return this.room.find(FIND_MY_CONSTRUCTION_SITES).map(site => ({
			task: WorkerTaskKind.Build,
			target: site.id,
		}));
	}

	private repairTasks(): WorkerTask[] {
		return this.room
			.find(FIND_STRUCTURES)
			.filter(s => this.doesStructureNeedRepair(s))
			.map(structure => ({
				task: WorkerTaskKind.Repair,
				target: structure.id,
			}));
	}

	private doesStructureNeedRepair(structure: AnyStructure): boolean {
		if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
			return structure.hits < (this.wallRepairThreshold ?? 0);
		}
		if (structure.structureType === STRUCTURE_ROAD || structure.structureType === STRUCTURE_CONTAINER) {
			return structure.hits < structure.hitsMax * 0.5;
		}

		return structure.hits < structure.hitsMax;
	}

	@memoryCacheGetter(keyByClassAndRoomName, (i: Overseer) => i.calcWallRepairThreshold())
	private wallRepairThreshold?: number;

	/**
	 * If any wall or rampart is below this threatshold, it will be repaired.
	 */
	private calcWallRepairThreshold(): number {
		const walls = this.room
			.find(FIND_STRUCTURES)
			.filter(s => s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART);

		let hitsSum = 0;
		for (const wall of walls) {
			hitsSum += wall.hits;
		}
		const hitsAvg = hitsSum / walls.length;
		return Math.max(hitsAvg * 1.05, 2000);
	}

	private miningTasks(): WorkerTask[] {
		if (CONTROLLER_STRUCTURES[STRUCTURE_EXTRACTOR][this.room.controller!.level] === 0) {
			return [];
		}

		return this.room.find(FIND_MINERALS).map(source => ({
			task: WorkerTaskKind.Mine,
			target: source.id,
		}));
	}

	public workerQuota(): number {
		if (this.room.energyCapacityAvailable < 1200) {
			return 3;
		}
		return 4;
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function keyByClassAndRoomName(): CacheKey {
	return (i: Overseer) => `${i.constructor.name}${i.roomName}`;
}

const overseerHeapCache = new Map<string, Overseer>();

export function getOverseer(roomName: string): Overseer {
	if (!overseerHeapCache.has(roomName)) {
		overseerHeapCache.set(roomName, new Overseer(roomName));
	}
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return overseerHeapCache.get(roomName)!;
}

export function runOverseers(): void {
	const rooms = util.getOwnedRooms();
	for (const room of rooms) {
		try {
			getOverseer(room.name).run();
		} catch (e) {
			console.log(`Overseer: Error in room ${room.name}: ${e}`);
		}
	}
}
