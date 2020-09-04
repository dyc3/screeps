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
		if (this.object instanceof Resource) {
			return this.object.amount;
		}
		let amount = this.object.store.getUsedCapacity(this.resource);
		if (this.object.structureType === STRUCTURE_TERMINAL && this.resource === RESOURCE_ENERGY) {
			amount = Math.max(this.object.store.getUsedCapacity(this.resource) - Memory.terminalEnergyTarget, 0);
		}
		else if (this.object.structureType === STRUCTURE_FACTORY && this.resource === RESOURCE_ENERGY) {
			amount = Math.max(this.object.store.getUsedCapacity(this.resource) - Memory.factoryEnergyTarget, 0);
		}
		return amount;
	}
}

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
		return this.sink.amount;
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

		let sourceStruct = Game.getObjectById(this.source.objectId);
		let sinkStruct = Game.getObjectById(this.sink.objectId);
		if (sourceStruct.pos.roomName === sinkStruct.pos.roomName) {
			new RoomVisual(sourceStruct.pos.roomName).line(sourceStruct.pos, sinkStruct.pos, {
				color: "#ff0",
				opacity: 0.7,
				lineStyle: "dotted",
				width: Math.max(Math.min(0.05 * 0.001 * this.amount, 0.4), 0.02),
			});
		}
		else {
			new RoomVisual(sourceStruct.pos.roomName).circle(sourceStruct.pos, {
				fill: "#0af",
				stroke: "#0af",
				radius: 0.4,
				opacity: 0.7,
				lineStyle: "dotted",
			});
			new RoomVisual(sinkStruct.pos.roomName).circle(sinkStruct.pos, {
				fill: "#fa0",
				stroke: "#fa0",
				radius: 0.4,
				opacity: 0.7,
				lineStyle: "dotted",
			});
		}
	}
}

module.exports = {
	tasks: [],

	init() {
		if (!Memory.logistics) {
			Memory.logistics = {
				tasks: [],
			};
		}
		if (!Memory.guard.tasks) {
			Memory.guard.tasks = [];
		}
		this.tasks = _.map(Memory.logistics.tasks, task => {
			let t = new DeliveryTask(new ResourceSource(task.source), new ResourceSink(task.sink))
			t.id = task.id;
			return t;
		});
	},

	finalize() {
		Memory.logistics.tasks = _.map(this.tasks, task => task.serialize());
	},

	getTasks() {
		return this.tasks;
	},

	getTask(id) {
		return _.find(this.tasks, task => task.id === id);
	},

	findResourceSinks() {
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
		for (let room of rooms) {
			let sinkStructures = room.find(FIND_STRUCTURES, {
				filter: struct => {
					return ![STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LINK].includes(struct.structureType) && struct.store;
				}
			});

			for (let struct of sinkStructures) {
				let resource = RESOURCE_ENERGY;
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

		return sinks;
	},

	findResourceSources() {
		let sources = [];

		let rooms = util.getOwnedRooms();
		for (let room of rooms) {
			let sourceStructures = room.find(FIND_STRUCTURES, {
				filter: struct => {
					return [STRUCTURE_STORAGE, STRUCTURE_CONTAINER, STRUCTURE_TERMINAL, STRUCTURE_FACTORY].includes(struct.structureType) && struct.store;
				}
			});

			for (let struct of sourceStructures) {
				for (let resource in struct.store) {
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
		for (let miningTarget of Memory.remoteMining.targets) {
			let harvestPos = new RoomPosition(miningTarget.harvestPos.x, miningTarget.harvestPos.y, miningTarget.roomName);
			if (!Game.rooms[miningTarget.roomName]) {
				// No visibility
				continue;
			}
			let lookResult = harvestPos.lookFor(LOOK_RESOURCES);
			if (lookResult.length === 0) {
				continue;
			}
			let source = new ResourceSource({
				resource: lookResult[0].resourceType,
				objectId: lookResult[0].id,
				roomName: miningTarget.roomName,
			});
			if (source.amount <= 0) {
				continue;
			}
			sources.push(source);
		}

		return sources;
	},

	buildDeliveryTasks(sinks, sources) {
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

			// TODO: use links and terminals to improve efficiency

			let task = new DeliveryTask(possibleSources[0], sink);
			tasks.push(task);
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
	allocateCreep(creep) {
		let availableTasks = _.filter(this.tasks, task => {
			if (task.isComplete) {
				return false;
			}

			// if (task.amount < creep.store.getCapacity()) {
			// 	return false;
			// }

			let alreadyAssignedCreeps = _.filter([].concat(util.getCreeps("manager"), util.getCreeps("scientist"), util.getCreeps("testlogistics")), creep => creep.memory.deliveryTaskId === task.id);
			if (alreadyAssignedCreeps.length > 0) {
				if (task.amount <= alreadyAssignedCreeps[0].store.getCapacity() || alreadyAssignedCreeps.length >= 2) {
					return false;
				}
			}

			if (creep.memory.role === "manager" || creep.memory.role === "testlogistics") {
				return task.resource === RESOURCE_ENERGY;
			}
			else if (creep.memory.role === "scientist" || creep.memory.role === "testlogistics") {
				return task.resource !== RESOURCE_ENERGY;
			}
			else {
				return true;
			}
		});
		if (availableTasks.length === 0) {
			return null;
		}

		availableTasks = _.sortBy(availableTasks, "amount");

		creep.memory.deliveryTaskId = availableTasks[0].id;
		return availableTasks[0].id;
	},
}