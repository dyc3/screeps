let traveler = require("traveler");
let util = require("util");
let brainLogistics = require("brain.logistics");
let taskDepositMaterials = require("task.depositmaterials");

module.exports = {
	run(creep) {
		if (creep.fatigue > 0) {
			return;
		}

		if (!creep.memory.deliveryTaskId) {
			brainLogistics.allocateCreep(creep);
		}

		if (!creep.memory.deliveryTaskId) {
			creep.log("No available tasks");
			return;
		}

		let deliveryTask = brainLogistics.getTask(creep.memory.deliveryTaskId);

		if (!deliveryTask) {
			creep.log(`Delivery task ${creep.memory.deliveryTaskId} no longer valid`);
			delete creep.memory.deliveryTaskId;
			return;
		}
		if (deliveryTask.isComplete) {
			creep.log(`Delivery task ${creep.memory.deliveryTaskId} is completed`);
			delete creep.memory.deliveryTaskId;
			return;
		}

		creep.log("Delivery task:", JSON.stringify(deliveryTask));

		// HACK: deposit materials if the resources held don't match
		if (creep.store.getFreeCapacity(deliveryTask.resource) + creep.store.getUsedCapacity(deliveryTask.resource) !== creep.store.getCapacity()) {
			taskDepositMaterials.run(creep, exclude_energy=false);
			return;
		}

		if (creep.memory.delivering && creep.store.getUsedCapacity(deliveryTask.resource) === 0) {
			creep.memory.delivering = false;
		}

		if (creep.memory.delivering) {
			if (deliveryTask.sink.object) {
				if (creep.pos.isNearTo(deliveryTask.sink.object)) {
					let result = creep.transfer(deliveryTask.sink.object, deliveryTask.resource);
					if (result === OK) {
						deliveryTask.registerDelivery(creep.store.getCapacity());
						creep.memory.delivering = false;
					}
					else {
						creep.log(`FAILED TO TRANSFER: ${result}`);
					}
				}
				else {
					creep.travelTo(deliveryTask.sink.object);
				}
			}
			else {
				creep.travelTo(new RoomPosition(25, 25, deliveryTask.sink.roomName));
			}
		}
		else {
			if (deliveryTask.source.object) {
				if (creep.pos.isNearTo(deliveryTask.source.object)) {
					let result;
					if (deliveryTask.source.object instanceof Resource) {
						result = creep.pickup(deliveryTask.source.object);
					}
					else {
						result = creep.withdraw(deliveryTask.source.object, deliveryTask.source.resource, Math.min(creep.store.getFreeCapacity(), deliveryTask.amount));
					}
					if (result === OK || result === ERR_FULL) {
						creep.memory.delivering = true;
					}
					else {
						creep.log(`Unable to withdraw ${deliveryTask.source.resource}: ${result}`);
					}
				}
				else {
					creep.travelTo(deliveryTask.source.object);
				}
			}
			else {
				if (Game.rooms[deliveryTask.source.roomName]) {
					// the source is no longer valid
					creep.log("Source is gone, deleting task");
					delete creep.memory.deliveryTaskId;
				}
				else {
					creep.travelTo(new RoomPosition(25, 25, deliveryTask.source.roomName));
				}
			}
		}
	}
}