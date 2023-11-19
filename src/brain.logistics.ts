import brainAutoPlanner from "./brain.autoplanner.js";
import util, { isValidResource } from "./util";

export class ResourceSink {
	public resource: ResourceConstant;
	public objectId: Id<AnyStoreStructure>;
	public roomName = "";
	/**
	 * The amount of the resource that this sink needs.
	 */
	public amount: number;

	public constructor(resource: ResourceConstant, objectId: Id<AnyStoreStructure>, roomName: string, amount: number) {
		this.resource = resource;
		this.objectId = objectId;
		this.roomName = roomName;
		this.amount = amount;
	}

	public get object(): AnyStoreStructure | null {
		return Game.getObjectById(this.objectId);
	}
}

export class ResourceSource {
	public resource: ResourceConstant;
	public objectId: Id<AnyStoreStructure | Tombstone | Ruin | Resource>;
	public roomName = "";

	public constructor(
		resource: ResourceConstant,
		objectId: Id<AnyStoreStructure | Tombstone | Ruin | Resource>,
		roomName: string
	) {
		this.resource = resource;
		this.objectId = objectId;
		this.roomName = roomName;
	}

	public get object(): AnyStoreStructure | Tombstone | Ruin | Resource | null {
		return Game.getObjectById(this.objectId);
	}

	public get amount(): number {
		if (!this.object) {
			return 0;
		}
		if (this.object instanceof Resource) {
			return this.object.amount;
		}
		let amount = this.object.store.getUsedCapacity(this.resource);
		if (this.object instanceof Tombstone) {
			return amount;
		}
		if (this.object.structureType === STRUCTURE_TERMINAL && this.resource === RESOURCE_ENERGY) {
			amount = Math.max(this.object.store.getUsedCapacity(this.resource) - Memory.terminalEnergyTarget, 0);
		} else if (this.object.structureType === STRUCTURE_FACTORY && this.resource === RESOURCE_ENERGY) {
			amount = Math.max(this.object.store.getUsedCapacity(this.resource) - Memory.factoryEnergyTarget, 0);
		}
		return amount;
	}
}

// cache of all sources and sinks found so far, invalidated at the end of the tick
let sourcesCache: ResourceSource[] = [];
let sinksCache: ResourceSink[] = [];

function collectAllResourceSources() {
	if (sourcesCache.length > 0) {
		return sourcesCache;
	}

	const sources = [];

	const rooms = util.getOwnedRooms();
	for (const room of rooms) {
		if (room.memory.defcon === 0) {
			const dropped = room.find(FIND_DROPPED_RESOURCES, {
				filter: d => {
					if (util.isDistFromEdge(d.pos, 4)) {
						return d.pos.findInRange(FIND_SOURCES, 1).length > 0 && d.amount > 0;
					}

					return d.amount > 0;
				},
			});
			for (const drop of dropped) {
				const source = new ResourceSource(drop.resourceType, drop.id, drop.pos.roomName);
				if (source.amount <= 0) {
					continue;
				}
				sources.push(source);
			}

			const tombstones = room.find(FIND_TOMBSTONES, {
				filter: tomb => {
					if (util.isDistFromEdge(tomb.pos, 4)) {
						return false;
					}

					return tomb.store.getUsedCapacity() > 0;
				},
			});
			for (const tombstone of tombstones) {
				for (const resource in tombstone.store) {
					const source = new ResourceSource(resource, tombstone.id, tombstone.pos.roomName);
					if (source.amount <= 0) {
						continue;
					}
					sources.push(source);
				}
			}
		}

		const sourceStructures = room.find(FIND_STRUCTURES, {
			filter: struct => {
				if (struct.structureType === STRUCTURE_CONTAINER) {
					return struct.pos.getRangeTo(struct.room.controller) > CONTROLLER_UPGRADE_RANGE;
				}
				return (
					[STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_FACTORY, STRUCTURE_LAB].includes(
						struct.structureType
					) && struct.store
				);
			},
		});

		for (const struct of sourceStructures) {
			for (const resource in struct.store) {
				if (struct.structureType === STRUCTURE_LAB && resource === RESOURCE_ENERGY) {
					continue;
				}
				const source = new ResourceSource(resource, struct.id, struct.pos.roomName);
				if (source.amount <= 0) {
					continue;
				}
				sources.push(source);
			}
		}
	}

	sourcesCache = sources;

	return sources;
}

function collectAllResourceSinks() {
	if (sinksCache.length > 0) {
		return sinksCache;
	}

	const sinks = [];

	// read fill flags
	for (const flagName in Game.flags) {
		if (!flagName.startsWith("fill") && !flagName.startsWith("unmake")) {
			continue;
		}

		const flag = Game.flags[flagName];

		const struct = flag.pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType !== STRUCTURE_ROAD)[0];
		if (!struct) {
			console.log("WARN: fill flag does not have structure");
			continue;
		}

		const flagNameSplit = flag.name.split(":");
		const resource = flagNameSplit[1];
		if (!isValidResource(resource)) {
			console.log(`WARN: fill flag ${flag.name} has invalid resource ${resource}`);
			continue;
		}
		const amount =
			flagNameSplit.length > 2
				? Math.min(parseInt(flagNameSplit[2]), struct.store.getFreeCapacity(resource))
				: struct.store.getFreeCapacity(resource);

		if (amount === 0) {
			continue;
		}

		const sink = new ResourceSink(resource, struct.id, struct.pos.roomName, amount);
		sinks.push(sink);
	}

	// find energy sinks
	const rooms = util.getOwnedRooms();
	const resources = [RESOURCE_ENERGY, RESOURCE_POWER, RESOURCE_GHODIUM];
	for (const resource of resources) {
		for (const room of rooms) {
			const sinkStructures: AnyStoreStructure[] = room.find(FIND_STRUCTURES, {
				filter: struct => {
					if (struct.structureType === STRUCTURE_CONTAINER) {
						return (
							struct.pos.getRangeTo(struct.room.controller) <= CONTROLLER_UPGRADE_RANGE ||
							brainAutoPlanner.isInRootModule(struct)
						);
					}
					// FIXME: what happens when there are no relay creeps? what happens when the root module doesn't have a link?
					if (brainAutoPlanner.isInRootModule(struct) && struct.room.controller.level >= 5) {
						return false;
					}
					return ![STRUCTURE_ROAD, STRUCTURE_LINK].includes(struct.structureType) && struct.store;
				},
			});

			for (const struct of sinkStructures) {
				if (resource === RESOURCE_GHODIUM && struct.structureType !== STRUCTURE_NUKER) {
					continue;
				}
				if (resource === RESOURCE_POWER && struct.structureType !== STRUCTURE_POWER_SPAWN) {
					continue;
				}
				let amount = struct.store.getFreeCapacity(resource) ?? 0;

				if (struct.structureType === STRUCTURE_TERMINAL) {
					amount = Math.min(
						Memory.terminalEnergyTarget - struct.store.getUsedCapacity(resource),
						struct.store.getFreeCapacity(resource)
					);
				} else if (struct.structureType === STRUCTURE_FACTORY) {
					amount = Math.min(
						Memory.factoryEnergyTarget - struct.store.getUsedCapacity(resource),
						struct.store.getFreeCapacity(resource)
					);
				}

				if (amount <= 0) {
					continue;
				}

				const sink = new ResourceSink(resource, struct.id, struct.pos.roomName, amount);
				sinks.push(sink);
			}
		}
	}

	return sinks;
}

const brainLogistics = {
	tasks: [],

	init() {},

	finalize() {
		// invalidate cache
		sourcesCache = [];
		sinksCache = [];
	},

	/**
	 * Find resource sources
	 * @param {Object} options
	 * @param {string} options.resource
	 * @param {string} options.roomName
	 * @param {Function} options.filter
	 */
	findSources(options: Partial<ResourceSource & { filter: (s: ResourceSource) => boolean }> = {}): ResourceSource[] {
		options = _.defaults(options, {});
		let sources = collectAllResourceSources();
		if (options.resource) {
			sources = sources.filter(s => s.resource === options.resource);
		}
		if (options.roomName) {
			sources = sources.filter(s => s.roomName === options.roomName);
		}
		if (options.filter) {
			sources = sources.filter(options.filter);
		}
		return sources;
	},

	/**
	 * Find resource sinks
	 * @param {Object} options
	 * @param {string} options.resource
	 * @param {string} options.roomName
	 * @param {Function} options.filter
	 */
	findSinks(options: Partial<ResourceSink & { filter: (s: ResourceSink) => boolean }> = {}): ResourceSink[] {
		options = _.defaults(options, {});
		let sinks = collectAllResourceSinks();
		if (options.resource) {
			sinks = sinks.filter(s => s.resource === options.resource);
		}
		if (options.roomName) {
			sinks = sinks.filter(s => s.roomName === options.roomName);
		}
		if (options.filter) {
			sinks = sinks.filter(options.filter);
		}
		return sinks;
	},
};

export default brainLogistics;
