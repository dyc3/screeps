import type { GuardTaskSerialized } from "./brain.guard";
import type { ObserveQueue } from "./observequeue";
import type { OffenseTask } from "offense/task";
import type { RemoteMiningTarget } from "./remotemining";
import type { Role } from "./roles/meta";

declare global {
	/*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
	// Memory extension samples
	interface Memory {
		highlightCreepLog: string[];
		mineralsToSell: ResourceConstant[];
		remoteMining: {
			needHarvesterCount: number;
			needCarrierCount: number;
			targets: RemoteMiningTarget[]; // TODO: define this
		};
		/** Used to force adding a claim target to the queue. */
		expansionTarget: string | undefined;
		terminalEnergyTarget: number;
		factoryEnergyTarget: number;
		claimTargets: {
			room: string;
			mode: "claim" | "reserve";
		}[];
		jobLastRun: { [jobName: string]: number };
		forceCreepSpawn: boolean; // TODO: deprecate this? maybe there's a better way to implemnt this kind of thing
		creepSpawnLog: string[];
		guard: {
			tasks: GuardTaskSerialized[];
			tasksMade: number;
			guardiansSpawned: number;
		};
		USE_ADV_LOGISTICS: boolean;
		/** @deprecated */
		attackTarget: string;
		offense: {
			tasks: OffenseTask[]; // TODO: convert to typescript
		};
		observe: {
			observers: Id<StructureObserver>[];
			queue: string[];
		};
		portals: {
			intershard: [string, { shard: string; room: string }][];
			interroom: [string, string][];
		};
	}

	interface Creep {
		travelTo(pos: RoomPosition): ScreepsReturnCode;
		travelTo(pos: RoomPosition, opts: any): ScreepsReturnCode;
	}

	interface CreepMemory {
		role: Role;
		room: string;
		keepAlive: boolean;
		stage: number;
		renewing: boolean;
		renewForceAmount: number | undefined;
		renewTarget: Id<StructureSpawn>;
		_renewTravelTime: number;
		_lastCheckTravelTime: number;

		// TODO: make role-specific memory types
		depositMode?: any;
		harvestTarget?: Id<Source>;
		targetRoom?: string;
		assignedPos?: { x: number; y: number };
		mode?: any;
		taskId?: string;
		repairTarget?: Id<AnyStructure>;
		repairing?: boolean;
		withdrawTargetId?: Id<AnyStoreStructure>;
		depositTargetId?: Id<AnyStoreStructure>;
		recycleAtId?: Id<StructureSpawn>;
		recycle?: boolean;
		withdrawCachePos?: RoomPosition;
		depositCachePos?: RoomPosition;
	}

	interface PowerCreepMemory {
		renewing: boolean;
		renewTarget: Id<StructurePowerSpawn>;
		_renewTravelTime: number;
		_lastCheckTravelTime: number;
	}

	interface RoomMemory {
		harvestPositions: { [id: Id<Source>]: { x: number; y: number } };
		defcon: number;
		rootLink?: Id<StructureLink>;
		storageLink?: Id<StructureLink>;
		rootPos?: { x: number; y: number };
		storagePos?: { x: number; y: number };
		/** @deprecated not sure if this is actually being used */
		storagePosDirection?: DirectionConstant;
	}

	// Syntax for adding proprties to `global` (ex "global.log")
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace NodeJS {
		interface Global {
			log: any;
			WHOAMI: string;
			CONTROLLER_UPGRADE_RANGE: number;
			DROPPED_ENERGY_GATHER_MINIMUM: number;
			ObserveQueue: ObserveQueue;
			TmpDefense: any;
		}
	}
}
