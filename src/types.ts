import type { RemoteMiningTarget } from "./remotemining";
import type { ObserveQueue } from "./observequeue";
import type { Role } from "./roles/meta";
import { WorkerTask } from "room/lord";

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
		claimTargets: any[]; // TODO: define this
		job_queue: any[]; // TODO: define this
		job_last_run: any; // TODO: define this
		forceCreepSpawn: boolean; // TODO: deprecate this? maybe there's a better way to implemnt this kind of thing
		creepSpawnLog: string[];
		guard: {
			tasks: any[]; // TODO: define this
		};
		USE_ADV_LOGISTICS: boolean;
		/** @deprecated */
		attackTarget: string;
		offense: {
			tasks: any[]; // TODO: convert to typescript
		}
		observe: {
			observers: Id<StructureObserver>[];
			queue: string[];
		}
		portals: {
			intershard: [string, { shard: string, room: string }][];
			interroom: [string, string][];
		}
	}

	interface Creep {
		travelTo(pos: RoomPosition | RoomObject): ScreepsReturnCode;
		travelTo(pos: RoomPosition | RoomObject, opts: any): ScreepsReturnCode;
	}

	interface CreepMemory {
		role: Role;
		room: string;
		keepAlive: boolean;
		stage: number;
		renewing: boolean;
		renew_force_amount: number | undefined;
		renewTarget: Id<StructureSpawn>;
		working: boolean;
		workTask: WorkerTask;

		// TODO: make role-specific memory types
		depositMode?: any;
		harvestTarget?: any;
		targetRoom?: any;
		assignedPos?: any;
		mode?: any;
	}

	interface RoomMemory {
		harvestPositions: any; // TODO: define this
		defcon: number;
		rootLink?: Id<StructureLink>;
		storageLink?: Id<StructureLink>;
		rootPos: any; // TODO: define this
		storagePos: any; // TODO: define this
		/** @deprecated not sure if this is actually being used */
		storagePosDirection?: DirectionConstant;

		defense: {
			alertUntil: number;
			/** The list of creep/powercreep IDs to focus fire on.
			 * If any of these are in range of anything, these objects
			 * will get prioritized. It's a list because creeps could
			 * blink in and out of the room.
			 */
			focusQueue: Id<Creep | PowerCreep>[];
			defenderCreeps: Id<Creep>[];
		}
		workers: Id<Creep>[];
		buildTargetId: Id<ConstructionSite> | undefined;
		repairTargetId: Id<Structure> | undefined;
		fortifyTargetId: Id<StructureWall | StructureRampart> | undefined;
	}

	// Syntax for adding proprties to `global` (ex "global.log")
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
