import util from "./util";
import { ObserveQueue } from "./observequeue";

export interface HighwayHarvestTaskSerialized {
	id: string;
	targetRoom: string | null;
	type: string | null;
	targetObject: Id<Deposit | StructurePowerBank> | null;
	harvesterCreeps: string[];
	carrierCreeps: string[];
}

export class HighwayHarvestTask {
	public id: string;
	public _targetRoom: string | null = null;
	public type: string | null = null;
	public _targetObject: Id<Deposit | StructurePowerBank> | null = null;
	public harvesterCreeps: string[] = [];
	public carrierCreeps: string[] = [];

	public constructor() {
		this.id = `${Game.shard.name}${Game.time.toString(24)}${Math.random()}`;
	}

	public get targetRoom(): Room | undefined {
		if (!this._targetRoom) return undefined;
		return Game.rooms[this._targetRoom];
	}

	public get targetObject(): Deposit | StructurePowerBank | null {
		if (!this._targetObject) return null;
		return Game.getObjectById(this._targetObject);
	}

	public serialize(): HighwayHarvestTaskSerialized {
		return {
			id: this.id,
			targetRoom: this._targetRoom,
			type: this.type,
			targetObject: this._targetObject,
			harvesterCreeps: this.harvesterCreeps,
			carrierCreeps: this.carrierCreeps,
		};
	}

	public static deserialize(mem: HighwayHarvestTaskSerialized): HighwayHarvestTask {
		const task = new HighwayHarvestTask();
		task.id = mem.id;
		task._targetRoom = mem.targetRoom;
		task.type = mem.type;
		task._targetObject = mem.targetObject;
		task.harvesterCreeps = mem.harvesterCreeps;
		task.carrierCreeps = mem.carrierCreeps;
		return task;
	}
}

let tasks: HighwayHarvestTask[] = [];

export default {
	init(): void {
		if (!Memory.highwayHarvesting) {
			Memory.highwayHarvesting = {
				tasks: [],
				viableRooms: [],
				lastObserved: {},
			};
		}
		if (tasks.length === 0 && Memory.highwayHarvesting.tasks.length > 0) {
			// rehydrate tasks
			tasks = _.map(Memory.highwayHarvesting.tasks, task => HighwayHarvestTask.deserialize(task));
		}
	},

	finalize(): void {
		Memory.highwayHarvesting.tasks = _.map(tasks, task => task.serialize());
	},

	getTasks(): HighwayHarvestTask[] {
		return tasks;
	},

	getTask(id: string): HighwayHarvestTask | undefined {
		return _.find(tasks, task => task.id === id);
	},

	markObserved(roomName: string): void {
		Memory.highwayHarvesting.lastObserved[roomName] = Game.time;
	},
};
