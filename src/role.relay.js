let traveler = require('traveler');
let util = require('util');

// FIXME: When new structures are built around relays, fillTargetIds does not get updated

let roleRelay = {
	/**
	 * Draw visuals that show the relay creep's current state.
	 * Eg. Assigned position, fill targets, storage, and link
	 *
	 * Color key:
	 * - Orange: storage
	 * - Yellow: link
	 * - Blue: other object with store
	 * - Cyan: withdraw
	 * - Green: deposit
	 * - Red: bad transfer, withdraw is the same as deposit
	 *
	 * @param {Creep} creep Relay creep
	 */
	visualizeState(creep) {
		if (!creep.memory.assignedPos) {
			creep.log("ERROR: Can't visualize state because this creep does not have an assigned position");
			return;
		}
		const colorWithdraw = "#0ff";
		const colorDeposit = "#0f0";
		const colorBadTransfer = "#f00"; // used when last withdraw id is the same as last deposit id
		let vis = creep.room.visual;
		let assignedPos = new RoomPosition(creep.memory.assignedPos.x, creep.memory.assignedPos.y, creep.memory.assignedPos.roomName);

		// draw lines to storage and link
		let storage = Game.getObjectById(creep.memory.storageId);
		let link = Game.getObjectById(creep.memory.linkId);

		// FIXME: lots of repeated code here to find the correct colors
		let storageColor = "#fa0";
		if (creep.memory._lastWithdrawId === storage.id) {
			storageColor = colorWithdraw;
			if (creep.memory._lastDepositId === storage.id) {
				storageColor = colorBadTransfer;
			}
		}
		else if (creep.memory._lastDepositId === storage.id) {
			storageColor = colorDeposit;
		}

		let linkColor = "#ff0";
		if (creep.memory._lastWithdrawId === link.id) {
			linkColor = colorWithdraw;
			if (creep.memory._lastDepositId === link.id) {
				linkColor = colorBadTransfer;
			}
		}
		else if (creep.memory._lastDepositId === link.id) {
			linkColor = colorDeposit;
		}

		vis.line(assignedPos, storage.pos, {
			color: storageColor,
			opacity: 0.7,
		});
		vis.line(assignedPos, link.pos, {
			color: linkColor,
			opacity: 0.7,
		});

		// draw lines to fill targets
		for (let targetId of creep.memory.fillTargetIds) {
			let target = Game.getObjectById(targetId);
			if (!target) {
				creep.log("WARN: target", targetId, "does not exist");
				continue;
			}

			let color = "#00f";
			if (creep.memory._lastWithdrawId === target.id) {
				color = colorWithdraw;
				if (creep.memory._lastDepositId === target.id) {
					color = colorBadTransfer;
				}
			}
			else if (creep.memory._lastDepositId === target.id) {
				color = colorDeposit;
			}

			vis.line(assignedPos, target.pos, {
				color: color,
				opacity: 0.7,
			});
		}

		// draw assigned position on top
		if (creep.pos.isEqualTo(assignedPos)) {
			vis.circle(assignedPos, {
				radius: 0.3,
				stroke: "#0f0",
				fill: "#0f0",
			});
		}
		else {
			vis.rect(assignedPos.x - 0.3, assignedPos.y - 0.3, 0.6, 0.6, {
				stroke: "#f00",
				fill: "#f00",
			});
		}

		delete creep.memory._lastWithdrawId;
		delete creep.memory._lastDepositId;
	},

	/**
	 * Withdraw a resource from overfilledStruct down to a predetermined limit
	 * @param {Creep} creep Relay creep
	 * @param {Structure} overfilledStruct Structure to withdraw resource from
	 */
	withdrawOverfillTarget(creep, overfilledStruct, resource=RESOURCE_ENERGY) {
		let fillTargetAmount = 0;
		switch (overfilledStruct.structureType) {
			case STRUCTURE_TERMINAL:
				fillTargetAmount = Memory.terminalEnergyTarget;
				break;
			case STRUCTURE_FACTORY:
				fillTargetAmount = Memory.factoryEnergyTarget;
				break;
		}
		let r = creep.withdraw(overfilledStruct, resource, Math.min(Math.max(0, overfilledStruct.store.getUsedCapacity(resource) - fillTargetAmount), creep.store.getFreeCapacity()));
		creep.memory._lastWithdrawId = overfilledStruct.id; // used for visualizeState
	},

	run: function(creep) {
		if (!creep.memory.assignedPos) {
			creep.say("needs pos");
			return;
		}

		let assignedPos = new RoomPosition(creep.memory.assignedPos.x, creep.memory.assignedPos.y, creep.memory.assignedPos.roomName);
		if (!creep.pos.isEqualTo(assignedPos)) {
			let result = creep.travelTo(assignedPos);
			if (result != 0) {
				console.log(creep.name, "MOVE TO ASSIGNED POS:", result);
			}
			return;
		}

		if (assignedPos.roomName !== creep.memory.targetRoom) {
			creep.memory.targetRoom = assignedPos.roomName;
		}

		if (!creep.memory.linkId || !creep.memory.storageId) {
			let foundLinks = creep.pos.findInRange(FIND_STRUCTURES, 1, { filter: (s) => {
				return s.structureType == STRUCTURE_LINK;
			}});
			if (foundLinks.length == 0) {
				console.log(creep.name, "ERR: no link structures found");
				return;
			}
			creep.memory.linkId = foundLinks[0].id;

			let foundStorage = creep.pos.findInRange(FIND_STRUCTURES, 1, { filter: (s) => {
				return s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE;
			}});
			if (foundStorage.length > 0) {
				creep.memory.storageId = foundStorage[0].id;
			}
			else {
				console.log(creep.name, "WARN: no found storage");
			}
		}
		let link = Game.getObjectById(creep.memory.linkId);
		let storage = Game.getObjectById(creep.memory.storageId);
		if (!storage) {
			creep.log("Storage no longer exists");
			delete creep.memory.storageId;
		}
		if (storage && storage.structureType === STRUCTURE_STORAGE) {
			creep.memory.isStorageModule = true; // indicates that the creep is in the storage module
		}

		if (!creep.memory.fillTargetIds || creep.memory.fillTargetIds.length == 0 || creep.memory._needFillTargetRefresh) {
			let adjacentStructs = _.filter(creep.room.lookForAtArea(LOOK_STRUCTURES, creep.pos.y - 1, creep.pos.x - 1, creep.pos.y + 1, creep.pos.x + 1, asArray=true), (result) =>
				result.structure.structureType != STRUCTURE_CONTAINER &&
				result.structure.structureType != STRUCTURE_STORAGE &&
				result.structure.structureType != STRUCTURE_ROAD &&
				result.structure.structureType != STRUCTURE_LINK);
			console.log(creep.name, "has", adjacentStructs.length, "adjacent targets");
			let targets = [];
			for (let i = 0; i < adjacentStructs.length; i++) {
				const struct = adjacentStructs[i].structure;
				targets.push(struct.id);
			}
			creep.memory.fillTargetIds = targets;
			delete creep.memory._needFillTargetRefresh;
		}

		if (creep.memory.fillTargetIds.length == 0) {
			creep.log("can't find adjacent targets.");
			return;
		}

		let rootNeedsEnergy = false;
		if (creep.memory.isStorageModule && creep.room.memory.rootLink) {
			// if the root module needs energy
			let rootLink = Game.getObjectById(creep.room.memory.rootLink);
			if (rootLink && rootLink.store[RESOURCE_ENERGY] < 200) {
				rootNeedsEnergy = true;
			}
			//creep.log("rootNeedsEnergy:", rootNeedsEnergy);
		}

		// check if all the fill targets are full.
		let targetIdsNotFull = _.filter(creep.memory.fillTargetIds, (id) => {
			let struct = Game.getObjectById(id);
			if (!struct) {
				creep.log("WARN: structure with id", id, "no longer exists!");
				creep.memory._needFillTargetRefresh = true;
				return false;
			}
			switch (struct.structureType) {
				case STRUCTURE_TERMINAL:
					return struct.store[RESOURCE_ENERGY] < Memory.terminalEnergyTarget;
				case STRUCTURE_FACTORY:
					return struct.store[RESOURCE_ENERGY] < Memory.factoryEnergyTarget;
				default:
					return struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
			}
		});

		let targetIdsOverFilled = _.filter(creep.memory.fillTargetIds, id => {
			let struct = Game.getObjectById(id);
			if (!struct) {
				creep.log("WARN: structure with id", id, "no longer exists!");
				creep.memory._needFillTargetRefresh = true;
				return false;
			}

			switch (struct.structureType) {
				case STRUCTURE_TERMINAL:
					return struct.store[RESOURCE_ENERGY] > Memory.terminalEnergyTarget;
				case STRUCTURE_FACTORY:
					return struct.store[RESOURCE_ENERGY] > Memory.factoryEnergyTarget;
				default:
					return false;
			}
		})

		// if the root needs energy, put it in the link
		if (rootNeedsEnergy) {
			// check if the creep is carrying energy, and pick some up if needed
			if (creep.store[RESOURCE_ENERGY] < creep.store.getCapacity()) {
				if (targetIdsOverFilled.length > 0) {
					this.withdrawOverfillTarget(creep, Game.getObjectById(targetIdsOverFilled[0]));
				}
				else {
					creep.withdraw(storage, RESOURCE_ENERGY);
					creep.memory._lastWithdrawId = storage.id; // used for visualizeState
				}
			}

			creep.transfer(link, RESOURCE_ENERGY);
			creep.memory._lastDepositId = link.id; // used for visualizeState
		}
		// if fill targets aren't filled, fill them
		else if (targetIdsNotFull.length > 0) {
			// check if the creep is carrying energy, and pick some up if needed
			if (creep.store[RESOURCE_ENERGY] < creep.store.getCapacity()) {
				if (creep.withdraw(link, RESOURCE_ENERGY) !== OK) {
					creep.withdraw(storage, RESOURCE_ENERGY);
					creep.memory._lastWithdrawId = storage.id; // used for visualizeState
				}
				else {
					creep.memory._lastWithdrawId = link.id; // used for visualizeState
				}
			}

			for (let i = 0; i < targetIdsNotFull.length; i++) {
				const target = Game.getObjectById(targetIdsNotFull[i]);
				if (target.structureType == STRUCTURE_TERMINAL && Memory.terminalEnergyTarget - target.store[RESOURCE_ENERGY] < creep.store.getCapacity()) {
					creep.transfer(target, RESOURCE_ENERGY, Memory.terminalEnergyTarget - target.store[RESOURCE_ENERGY]);
				}
				else {
					creep.transfer(target, RESOURCE_ENERGY);
				}
				creep.memory._lastDepositId = target.id; // used for visualizeState
			}
		}
		// otherwise, fill the storage with energy from the link.
		else {
			// check if the creep is carrying energy, and pick some up if needed
			if (creep.store[RESOURCE_ENERGY] < creep.store.getCapacity()) {
				if (targetIdsOverFilled.length > 0) {
					this.withdrawOverfillTarget(creep, Game.getObjectById(targetIdsOverFilled[0]));
				}
				else if (link.store[RESOURCE_ENERGY] > 0) {
					creep.withdraw(link, RESOURCE_ENERGY);
					creep.memory._lastWithdrawId = link.id; // used for visualizeState
				}
			}

			if (creep.store[RESOURCE_ENERGY] > 0) {
				creep.transfer(storage, RESOURCE_ENERGY);
				creep.memory._lastDepositId = storage.id; // used for visualizeState
			}
		}

		// this.visualizeState(creep);
	}
};

module.exports = roleRelay;