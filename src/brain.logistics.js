const util = require("util");
const traveler = require("traveler");

/*
 * This manages the transfer of resources.
 */

// 1. Determine where resources need to go.
// 2. Determine where we can grab resources from.
// 3. Build delivery tasks, optimizing based on creep travel distance, amount creep can carry.
//    a. Avoid making creeps deliver resources across rooms when terminals could be used.
// 4. Assign managers to energy tasks
// 5. Assign scientists to all other tasks
//    a. If there are no other tasks, assign them to energy tasks

class ResourceSink {
	constructor(args=null) {
		this.resource = "";
		this.objectId = "";
		this.roomName = "";
		this.amount = 0; // The amount of the resource that this sink needs.
		if (args) {
			Object.assign(this, args);
		}
	}

	get object() {
		return Game.getObjectById(this.objectId);
	}
}

class ResourceSource {
	constructor(args=null) {
		this.resource = "";
		this.objectId = "";
		this.roomName = "";
		if (args) {
			Object.assign(this, args);
		}
	}

	get object() {
		return Game.getObjectById(this.objectId);
	}

	get amount() {
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
		}
		else if (this.object.structureType === STRUCTURE_FACTORY && this.resource === RESOURCE_ENERGY) {
			amount = Math.max(this.object.store.getUsedCapacity(this.resource) - Memory.factoryEnergyTarget, 0);
		}
		return amount;
	}
}

/** DEPRECATED */
class DeliveryTask {
	constructor(source, sink) {
		// validate
		if (source.resource !== sink.resource) {
			throw new Error(`Source ${source.object} and sink ${sink.object} resources do not match`);
		}
		if (source.objectId === sink.objectId) {
			throw new Error(`Source object can't be the same as sink object ${source.object}`);
		}
		// if (source.amount === 0) {
		// 	throw new Error(`Source ${source.object} has ${source.resource} amount == 0`);
		// }
		// if (sink.amount === 0) {
		// 	throw new Error(`Sink ${sink.object} has ${sink.resource} amount == 0`);
		// }

		this.id = `${Game.shard.name}_${source.resource}_${source.objectId}${sink.objectId}`;
		this.source = source;
		this.sink = sink;
	}

	get resource() {
		return this.sink.resource;
	}

	get amount() {
		return Math.min(this.source.amount, this.sink.amount);
	}

	get isComplete() {
		return this.sink.amount <= 0;
	}

	/**
	 * Register that a specified amount of resource was delivered to the destination.
	 * @param {Number} amountDelivered The amount of the resource that was delivered
	 */
	registerDelivery(amountDelivered) {
		this.sink.amount -= amountDelivered;
	}

	/**
	 * Returns whether or not this DeliveryTask is equivalent to another given DeliveryTask.
	 * @param {DeliveryTask} other The task to compare to.
	 * @returns {Boolean} True if equivalent, otherwise false.
	 */
	isEqualTo(other) {
		return this.resource === other.resource &&
			this.sink.objectId === other.sink.objectId &&
			this.source.objectId === other.sink.objectId;
	}

	serialize() {
		return {
			id: this.id,
			source: this.source,
			sink: this.sink,
		}
	}

	visualize() {
		if (!this.source) {
			console.log("ERR: Delivery task has no source");
			return;
		}
		if (!this.sink) {
			console.log("ERR: Delivery task has no sink");
			return;
		}

		let lineStyle = {
			color: "#ff0",
			opacity: 0.7,
			lineStyle: "dotted",
			width: Math.max(Math.min(0.05 * 0.001 * this.amount, 0.4), 0.02),
		};
		if (this.source.object.pos.roomName === this.sink.object.pos.roomName) {
			new RoomVisual(this.source.object.pos.roomName).line(this.source.object.pos, this.sink.object.pos, lineStyle);
		}
		else {
			new RoomVisual(this.source.object.pos.roomName).circle(this.source.object.pos, {
				fill: "#0af",
				stroke: "#0af",
				radius: 0.4,
				opacity: 0.7,
				lineStyle: "dotted",
			});
			new RoomVisual(this.sink.object.pos.roomName).circle(this.sink.object.pos, {
				fill: "#fa0",
				stroke: "#fa0",
				radius: 0.4,
				opacity: 0.7,
				lineStyle: "dotted",
			});
			let mapLineStyle = lineStyle;
			mapLineStyle.width *= 100;
			Game.map.visual.line(this.source.object.pos, this.sink.object.pos, mapLineStyle);
		}
	}
}

// cache of all sources and sinks found so far, invalidated at the end of the tick
let sourcesCache = [];
let sinksCache = [];

function collectAllResourceSources() {
	if (sourcesCache.length > 0) {
		return sourcesCache;
	}

	let sources = [];

	let rooms = util.getOwnedRooms();
	for (let room of rooms) {
		let dropped = room.find(FIND_DROPPED_RESOURCES, {
			filter: d => {
				if (util.isDistFromEdge(d.pos, 4)) {
					return d.pos.findInRange(FIND_SOURCES, 1).length > 0 && d.amount > 0;
				}

				return d.amount > 0;
			}
		});
		for (let drop of dropped) {
			let source = new ResourceSource({
				resource: drop.resourceType,
				objectId: drop.id,
				roomName: drop.pos.roomName,
			});
			if (source.amount <= 0) {
				continue;
			}
			sources.push(source);
		}

		let tombstones = room.find(FIND_TOMBSTONES, {
			filter: (tomb) => {
				if (util.isDistFromEdge(tomb.pos, 4)) {
					return false;
				}

				return tomb.store.getUsedCapacity() > 0;
			}
		});
		for (let tombstone of tombstones) {
			for (let resource in tombstone.store) {
				let source = new ResourceSource({
					resource,
					objectId: tombstone.id,
					roomName: tombstone.pos.roomName,
				});
				if (source.amount <= 0) {
					continue;
				}
				sources.push(source);
			}
		}

		let sourceStructures = room.find(FIND_STRUCTURES, {
			filter: struct => {
				if (struct.structureType === STRUCTURE_CONTAINER) {
					return struct.pos.getRangeTo(struct.room.controller) > CONTROLLER_UPGRADE_RANGE;
				}
				return [STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_FACTORY, STRUCTURE_LAB].includes(struct.structureType) && struct.store;
			}
		});

		for (let struct of sourceStructures) {
			for (let resource in struct.store) {
				if (struct.structureType === STRUCTURE_LAB && resource === RESOURCE_ENERGY) {
					continue;
				}
				let source = new ResourceSource({
					resource,
					objectId: struct.id,
					roomName: struct.pos.roomName,
				});
				if (source.amount <= 0) {
					continue;
				}
				sources.push(source);
			}
		}
	}

	// add remote mining sources
	// WARN: this code is effectively useless because there's nothing wrong with the carriers and remote mining can have multiple carriers now, it should probably be removed
	// for (let miningTarget of Memory.remoteMining.targets) {
	// 	let harvestPos = new RoomPosition(miningTarget.harvestPos.x, miningTarget.harvestPos.y, miningTarget.roomName);
	// 	if (!Game.rooms[miningTarget.roomName]) {
	// 		// No visibility
	// 		continue;
	// 	}
	// 	let lookResult = harvestPos.lookFor(LOOK_RESOURCES);
	// 	if (lookResult.length === 0) {
	// 		continue;
	// 	}
	// 	let source = new ResourceSource({
	// 		resource: lookResult[0].resourceType,
	// 		objectId: lookResult[0].id,
	// 		roomName: miningTarget.roomName,
	// 	});
	// 	if (source.amount <= 0) {
	// 		continue;
	// 	}
	// 	sources.push(source);
	// }

	sourcesCache = sources;

	return sources;
}

function collectAllResourceSinks() {
	if (sinksCache.length > 0) {
		return sinksCache;
	}

	let sinks = [];

	// read fill flags
	for (let flagName in Game.flags) {
		if (!flagName.startsWith("fill")) {
			continue;
		}

		let flag = Game.flags[flagName];

		let struct = flag.pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType != STRUCTURE_ROAD)[0];
		if (!struct) {
			console.log("WARN: fill flag does not have structure");
			continue;
		}

		let flagNameSplit = flag.name.split(":");
		let resource = flagNameSplit[1];
		let amount = flagNameSplit.length > 2 ? Math.min(parseInt(flagNameSplit[2]), struct.store.getFreeCapacity(resource)) : struct.store.getFreeCapacity(resource);

		if (amount === 0) {
			continue;
		}

		let sink = new ResourceSink({
			resource,
			objectId: struct.id,
			amount,
			roomName: struct.pos.roomName,
		});
		sinks.push(sink);
	}

	// find energy sinks
	let rooms = util.getOwnedRooms();
	const resources = [RESOURCE_ENERGY, RESOURCE_POWER, RESOURCE_GHODIUM];
	for (let resource of resources) {
		for (let room of rooms) {
			let sinkStructures = room.find(FIND_STRUCTURES, {
				filter: struct => {
					if (struct.structureType === STRUCTURE_CONTAINER) {
						return struct.pos.getRangeTo(struct.room.controller) <= CONTROLLER_UPGRADE_RANGE;
					}
					return ![STRUCTURE_ROAD, STRUCTURE_LINK].includes(struct.structureType) && struct.store;
				}
			});

			for (let struct of sinkStructures) {
				if (resource === RESOURCE_GHODIUM && struct.structureType !== STRUCTURE_NUKER) {
					continue;
				}
				if (resource === RESOURCE_POWER && struct.structureType !== STRUCTURE_POWER_SPAWN) {
					continue;
				}
				let amount = struct.store.getFreeCapacity(resource);

				if (struct.structureType === STRUCTURE_TERMINAL) {
					amount = Math.min(Memory.terminalEnergyTarget - struct.store.getUsedCapacity(resource), struct.store.getFreeCapacity(resource));
				}
				else if (struct.structureType === STRUCTURE_FACTORY) {
					amount = Math.min(Memory.factoryEnergyTarget - struct.store.getUsedCapacity(resource), struct.store.getFreeCapacity(resource));
				}

				if (amount <= 0) {
					continue;
				}

				let sink = new ResourceSink({
					resource,
					objectId: struct.id,
					amount,
					roomName: struct.pos.roomName,
				});
				sinks.push(sink);
			}
		}
	}

	return sinks;
}

module.exports = {
	tasks: [],

	init() {

	},

	finalize() {
		// invalidate cache
		sourcesCache = [];
		sinksCache = [];
	},

	old_buildDeliveryTasks(sinks, sources) {
		let tasks = [];

		for (let sink of sinks) {
			let sinkStruct = Game.getObjectById(sink.objectId);

			// Try to source from the closest target, ideally in the same room
			let possibleSources = _.filter(sources, source => {
				return source.resource === sink.resource && source.objectId !== sink.objectId;
			});
			if (possibleSources.length <= 0) {
				continue;
			}
			possibleSources = _.sortBy(possibleSources, source => {
				let sourceStruct = Game.getObjectById(source.objectId);
				if (sinkStruct.pos.roomName === sourceStruct.pos.roomName) {
					return sinkStruct.pos.getRangeTo(sourceStruct.pos);
				}
				else {
					return 50 * Game.map.getRoomLinearDistance(sinkStruct.pos.roomName, sourceStruct.pos.roomName);
				}
			});

			// TODO: use links to improve efficiency

			// Split delivery tasks where the source and sink are in different rooms and there are available terminals.
			let source = possibleSources[0];
			if (source.roomName !== sink.roomName && source.object.room.terminal && sink.object.room.terminal) {
				let resource = sink.resource;

				if (source.object.structureType !== STRUCTURE_TERMINAL) {
					tasks.push(new DeliveryTask(source, new ResourceSink({
						resource,
						objectId: source.object.room.terminal.id,
						roomName: source.roomName,
						amount: sink.amount
					})));
				}

				tasks.push(new DeliveryTask(new ResourceSource({
					resource,
					objectId: source.object.room.terminal.id,
					roomName: source.roomName
				}), new ResourceSink({
					resource,
					objectId: sink.object.room.terminal.id,
					roomName: sink.roomName,
					amount: sink.amount
				})));

				if (sink.object.structureType !== STRUCTURE_TERMINAL) {
					tasks.push(new DeliveryTask(new ResourceSource({
						resource,
						objectId: sink.object.room.terminal.id,
						roomName: sink.roomName
					}), sink));
				}
			}
			else {
				let task = new DeliveryTask(source, sink);
				tasks.push(task);
			}
		}

		return tasks;
	},

	visualizeTasks(tasks) {
		for (let task of tasks) {
			task.visualize();
		}
	},

	/**
	 * Tell the specified creep what delivery task to fulfil.
	 * @param {Creep} creep The creep to give a task to.
	 */
	old_allocateCreep(creep) {
		let availableTasks = _.filter(this.tasks, task => {
			if (task.isComplete) {
				return false;
			}

			if (task.amount <= 20) {
				return false;
			}

			let alreadyAssignedCreeps = _.filter([].concat(util.getCreeps("manager"), util.getCreeps("scientist"), util.getCreeps("testlogistics")), creep => creep.memory.deliveryTaskId === task.id);
			if (alreadyAssignedCreeps.length > 0) {
				if (task.amount <= alreadyAssignedCreeps[0].store.getCapacity() || alreadyAssignedCreeps.length >= 2) {
					return false;
				}
			}

			// keep managers in their rooms
			if (creep.memory.role === "manager" && (creep.memory.targetRoom !== task.source.roomName || creep.memory.targetRoom !== task.sink.roomName)) {
				return false;
			}

			// don't have creeps transfer stuff from terminal to terminal
			if (task.source.object.structureType === task.sink.object.structureType === STRUCTURE_TERMINAL) {
				return false;
			}

			return true;
		});
		if (availableTasks.length === 0) {
			return null;
		}

		availableTasks = _.sortByOrder(availableTasks, [
			task =>
				(creep.memory.role === "manager" && task.resource === RESOURCE_ENERGY) ||
				(creep.memory.role === "scientist" && task.resource !== RESOURCE_ENERGY),
			task => {
				// sort by sink structure priority
				switch (task.sink.object.structureType) {
					case STRUCTURE_EXTENSION:
						return 1;
					case STRUCTURE_SPAWN:
						return 1;
					case STRUCTURE_TOWER:
						return 2;
					case STRUCTURE_POWER_SPAWN:
						return 4;
					case STRUCTURE_LAB:
						return 5;
					case STRUCTURE_FACTORY:
						return 5;
					case STRUCTURE_NUKER:
						return 6;
					case STRUCTURE_CONTAINER:
						return 9;
					case STRUCTURE_STORAGE:
						return 9;
					case STRUCTURE_TERMINAL:
						return 9;
					default:
						return 8;
				}
			},
			task => {
				return task.source.object.pos.getRangeTo(task.sink.object);
			},
			"amount"], ["desc", "asc", "asc", "asc"]);

		creep.memory.deliveryTaskId = availableTasks[0].id;
		return availableTasks[0].id;
	},

	old_fulfillTerminalTransfers() {
		let terminalTransferTasks = _.filter(this.tasks, task => task.source.object.structureType === task.sink.object.structureType === STRUCTURE_TERMINAL);
		for (let task of terminalTransferTasks) {
			if (task.source.object.cooldown > 0) {
				continue;
			}
			let result = task.source.object.send(task.resource, task.amount, task.sink.roomName);
			if (result !== OK) {
				console.log(`Failed to fulfil ${task.id} with terminals: ${result}`);
			}
		}
	},

	/**
	 * Find resource sources
	 * @param {Object} options
	 * @param {Function} options.resource
	 * @param {Function} options.roomName
	 * @param {Function} options.filter
	 */
	findSources(options={}) {
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
	 * @param {Function} options.resource
	 * @param {Function} options.roomName
	 * @param {Function} options.filter
	 */
	findSinks(options={}) {
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
}