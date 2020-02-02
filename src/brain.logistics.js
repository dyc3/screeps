const util = require("util");
const traveler = require("traveler");

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
		this.amount = 0;
		if (args) {
			Object.assign(this, args);
		}
	}
}

class ResourceSource {
	constructor(args=null) {
		this.resource = "";
		this.objectId = "";
		this.amount = 0;
		if (args) {
			Object.assign(this, args);
		}
	}
}

class DeliveryTask {
	constructor(source, sink) {
		this.source = source;
		this.sink = sink;
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

			let resource = flag.name.split(":")[1];
			let amount = struct.store.getFreeCapacity(resource);

			if (amount === 0) {
				continue;
			}

			let sink = new ResourceSink({
				resource,
				objectId: struct.id,
				amount,
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
					let amount = struct.store.getUsedCapacity(resource);

					if (struct.structureType === STRUCTURE_TERMINAL && resource === RESOURCE_ENERGY) {
						amount = Math.max(struct.store.getUsedCapacity(resource) - Memory.terminalEnergyTarget, 0);
					}
					else if (struct.structureType === STRUCTURE_FACTORY && resource === RESOURCE_ENERGY) {
						amount = Math.max(struct.store.getUsedCapacity(resource) - Memory.factoryEnergyTarget, 0);
					}

					let source = new ResourceSource({
						resource,
						objectId: struct.id,
						amount,
					});
					sources.push(source);
				}
			}
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
	}
}