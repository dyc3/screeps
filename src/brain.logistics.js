const util = require("util");

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
					return ![STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_STORAGE].includes(struct.structureType) && struct.store;
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
	}
}