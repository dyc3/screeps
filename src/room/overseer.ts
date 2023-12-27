// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CacheKey, memoryCacheGetter } from "screeps-cache";
import { WorkerTask, WorkerTaskKind } from "../roles/role.worker";
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
		this.assignWorkerTasks();
	}

	private getCreeps(): Creep[] {
		return util.getCreeps(Role.Worker).filter(c => c.memory.targetRoom === this.roomName);
	}

	/**
	 * Implements Gale-Shapley algorithm to stable match workers to tasks.
	 */
	private assignWorkerTasks(): void {
		const workers = this.getCreeps();
		const tasks = this.getWorkerTasks();
	}

	private countAssignedTasks(): Record<WorkerTaskKind, number> {
		const workers = this.getCreeps().filter(c => !!c.memory.task);
		const counts: Record<WorkerTaskKind, number> = {
			[WorkerTaskKind.Upgrade]: 0,
			[WorkerTaskKind.Build]: 0,
			[WorkerTaskKind.Repair]: 0,
			[WorkerTaskKind.Dismantle]: 0,
		};
		for (const worker of workers) {
			if (!worker.memory.task) {
				continue;
			}
			counts[worker.memory.task.task]++;
		}
		return counts;
	}

	private get taskLimits(): Record<WorkerTaskKind, number> {
		return {
			[WorkerTaskKind.Upgrade]: 1,
			[WorkerTaskKind.Build]: 2,
			[WorkerTaskKind.Repair]: 1,
			[WorkerTaskKind.Dismantle]: 1,
		};
	}

	private getWorkerTasks(): WorkerTask[] {
		const tasks: WorkerTask[] = [this.upgradeTask()].concat(this.buildTasks(), this.repairTasks());
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
		const isWallOrRampart =
			structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART;
		return (
			structure.hits < structure.hitsMax && (!isWallOrRampart || structure.hits < (this.wallRepairThreshold ?? 0))
		);
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
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function keyByClassAndRoomName(): CacheKey {
	return (i: Overseer) => `${i.constructor.name}${i.roomName}`;
}
