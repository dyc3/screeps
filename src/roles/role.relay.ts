import * as cartographer from "screeps-cartographer";
import util from "../util";

// FIXME: When new structures are built around relays, fillTargetIds does not get updated

const roleRelay = {
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
	 */
	visualizeState(creep: Creep): void {
		if (!creep.memory.assignedPos || !creep.memory.targetRoom) {
			creep.log("ERROR: Can't visualize state because this creep does not have an assigned position");
			return;
		}
		const colorWithdraw = "#0ff";
		const colorDeposit = "#0f0";
		const colorBadTransfer = "#f00"; // used when last withdraw id is the same as last deposit id
		const vis = creep.room.visual;
		const assignedPos = new RoomPosition(
			creep.memory.assignedPos.x,
			creep.memory.assignedPos.y,
			creep.memory.targetRoom
		);

		// draw lines to storage and link
		const link = creep.memory.linkId ? Game.getObjectById(creep.memory.linkId) : null;
		const storage = creep.memory.storageId ? Game.getObjectById(creep.memory.storageId) : null;

		// FIXME: lots of repeated code here to find the correct colors
		let linkColor = "#ff0";
		if (link) {
			if (creep.memory._lastWithdrawId === link.id) {
				linkColor = colorWithdraw;
				if (creep.memory._lastDepositId === link.id) {
					linkColor = colorBadTransfer;
				}
			} else if (creep.memory._lastDepositId === link.id) {
				linkColor = colorDeposit;
			}

			vis.line(assignedPos, link.pos, {
				color: linkColor,
				opacity: 0.7,
			});
		}

		let storageColor = "#fa0";
		if (storage) {
			if (creep.memory._lastWithdrawId === storage.id) {
				storageColor = colorWithdraw;
				if (creep.memory._lastDepositId === storage.id) {
					storageColor = colorBadTransfer;
				}
			} else if (creep.memory._lastDepositId === storage.id) {
				storageColor = colorDeposit;
			}

			vis.line(assignedPos, storage.pos, {
				color: storageColor,
				opacity: 0.7,
			});
		}

		// draw lines to fill targets
		for (const targetId of creep.memory.fillTargetIds ?? []) {
			const target = Game.getObjectById(targetId);
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
			} else if (creep.memory._lastDepositId === target.id) {
				color = colorDeposit;
			}

			vis.line(assignedPos, target.pos, {
				color,
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
		} else {
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
	withdrawOverfillTarget(
		creep: Creep,
		overfilledStruct: AnyStoreStructure,
		resource: ResourceConstant = RESOURCE_ENERGY
	): void {
		let fillTargetAmount = 0;
		switch (overfilledStruct.structureType) {
			case STRUCTURE_TERMINAL:
				fillTargetAmount = Memory.terminalEnergyTarget;
				break;
			case STRUCTURE_FACTORY:
				fillTargetAmount = Memory.factoryEnergyTarget;
				break;
		}
		creep.withdraw(
			overfilledStruct,
			resource,
			Math.min(
				Math.max(0, overfilledStruct.store.getUsedCapacity(resource) - fillTargetAmount),
				creep.store.getFreeCapacity()
			)
		);
		creep.memory._lastWithdrawId = overfilledStruct.id; // used for visualizeState
	},

	run(creep: Creep): void {
		if (!creep.memory.assignedPos || !creep.memory.targetRoom) {
			creep.say("needs pos");
			return;
		}

		const assignedPos = new RoomPosition(
			creep.memory.assignedPos.x,
			creep.memory.assignedPos.y,
			creep.memory.targetRoom
		);
		const moveResult = cartographer.moveTo(creep, { pos: assignedPos, range: 0 }, { priority: 100 });
		if (moveResult !== OK) {
			creep.log(`MOVE TO ASSIGNED POS: ${moveResult}`);
		}

		if (assignedPos.roomName !== creep.memory.targetRoom) {
			creep.memory.targetRoom = assignedPos.roomName;
		}

		if (!creep.memory.linkId || !creep.memory.storageId) {
			const foundLinks = creep.pos.findInRange(FIND_STRUCTURES, 1, {
				filter: s => {
					return s.structureType === STRUCTURE_LINK;
				},
			});
			if (foundLinks.length === 0) {
				creep.log("ERR: no link structures found");
			} else {
				creep.memory.linkId = foundLinks[0].id as Id<StructureLink>;
			}

			const foundStorage = creep.pos.findInRange(FIND_STRUCTURES, 1, {
				filter: s => {
					return s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE;
				},
			});
			if (foundStorage.length > 0) {
				creep.memory.storageId = foundStorage[0].id as Id<StructureContainer | StructureStorage>;
			} else {
				creep.log("WARN: no found storage");
			}
		}
		const link = creep.memory.linkId ? Game.getObjectById(creep.memory.linkId) : null;
		const storage = creep.memory.storageId ? Game.getObjectById(creep.memory.storageId) : null;
		if (!link) {
			creep.log("Link no longer exists");
			delete creep.memory.linkId;
		}
		if (!storage) {
			creep.log("Storage no longer exists");
			delete creep.memory.storageId;
		}
		if (storage && storage.structureType === STRUCTURE_STORAGE) {
			creep.memory.isStorageModule = true; // indicates that the creep is in the storage module
		}

		if (
			!creep.memory.fillTargetIds ||
			creep.memory.fillTargetIds.length === 0 ||
			creep.memory._needFillTargetRefresh
		) {
			const adjacentStructs = _.filter(
				creep.room.lookForAtArea(
					LOOK_STRUCTURES,
					creep.pos.y - 1,
					creep.pos.x - 1,
					creep.pos.y + 1,
					creep.pos.x + 1,
					true
				),
				result =>
					result.structure.structureType !== STRUCTURE_CONTAINER &&
					result.structure.structureType !== STRUCTURE_STORAGE &&
					result.structure.structureType !== STRUCTURE_ROAD &&
					result.structure.structureType !== STRUCTURE_RAMPART &&
					result.structure.structureType !== STRUCTURE_WALL &&
					result.structure.structureType !== STRUCTURE_LINK
			) as LookForAtAreaResultArray<AnyStoreStructure>;
			console.log(creep.name, "has", adjacentStructs.length, "adjacent targets");
			const targets = [];
			for (const look of adjacentStructs) {
				targets.push(look.structure.id);
			}
			creep.memory.fillTargetIds = targets;
			delete creep.memory._needFillTargetRefresh;
		}

		if (!creep.memory.fillTargetIds || creep.memory.fillTargetIds.length === 0) {
			creep.log("can't find adjacent targets.");
			return;
		}

		let rootNeedsEnergy = false;
		if (creep.memory.isStorageModule && creep.room.memory.rootLink) {
			// if the root module needs energy
			const rootLink = Game.getObjectById(creep.room.memory.rootLink);
			if (rootLink && rootLink.store[RESOURCE_ENERGY] < 200) {
				rootNeedsEnergy = true;
			}
			// creep.log("rootNeedsEnergy:", rootNeedsEnergy);
		}

		// check if all the fill targets are full.
		const targetIdsNotFull = _.filter(creep.memory.fillTargetIds, id => {
			const struct = Game.getObjectById(id);
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
					if (struct.store) {
						return struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
					} else {
						return false;
					}
			}
		});
		// creep.log(
		// 	"targetIdsNotFull:",
		// 	targetIdsNotFull.map(id => Game.getObjectById(id))
		// );

		const targetIdsOverFilled = _.filter(creep.memory.fillTargetIds, id => {
			const struct = Game.getObjectById(id);
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
		});

		// creep.log(
		// 	"targetIdsOverFilled:",
		// 	targetIdsOverFilled.map(id => Game.getObjectById(id))
		// );

		// if the root needs energy, put it in the link
		if (rootNeedsEnergy && link) {
			// check if the creep is carrying energy, and pick some up if needed
			if (creep.store[RESOURCE_ENERGY] < creep.store.getCapacity()) {
				if (targetIdsOverFilled.length > 0) {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					this.withdrawOverfillTarget(creep, Game.getObjectById(targetIdsOverFilled[0])!);
				} else if (storage) {
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
			if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
				let fallbackToStorage = !link;

				if (link && creep.withdraw(link, RESOURCE_ENERGY) !== OK) {
					fallbackToStorage = true;
				} else if (link) {
					creep.memory._lastWithdrawId = link.id; // used for visualizeState
				}

				if (storage && fallbackToStorage) {
					creep.withdraw(storage, RESOURCE_ENERGY);
					creep.memory._lastWithdrawId = storage.id; // used for visualizeState
				}
			}

			for (const id of targetIdsNotFull) {
				const target = Game.getObjectById(id);
				if (!target) {
					creep.log("WARN: target", id, "does not exist");
					continue;
				}
				if (target.structureType === STRUCTURE_TERMINAL) {
					const amount = Math.min(
						Memory.terminalEnergyTarget - target.store[RESOURCE_ENERGY],
						creep.store.getUsedCapacity(RESOURCE_ENERGY)
					);
					const result = creep.transfer(target, RESOURCE_ENERGY, amount);
					// creep.log(`Filled terminal with ${amount}: ${util.errorCodeToString(result)}`);
				} else {
					creep.transfer(target, RESOURCE_ENERGY);
				}
				// creep.log("Filled target", target.structureType, target.id);
				creep.memory._lastDepositId = target.id; // used for visualizeState
				break;
			}
		}
		// otherwise, fill the storage with energy from the link.
		else {
			// check if the creep is carrying energy, and pick some up if needed
			if (creep.store.getFreeCapacity() > 0) {
				if (targetIdsOverFilled.length > 0) {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					this.withdrawOverfillTarget(creep, Game.getObjectById(targetIdsOverFilled[0])!);
				} else if (link && link.store[RESOURCE_ENERGY] > 0) {
					creep.withdraw(link, RESOURCE_ENERGY);
					creep.memory._lastWithdrawId = link.id; // used for visualizeState
				}
			} else if (storage && creep.store[RESOURCE_ENERGY] > 0) {
				creep.transfer(storage, RESOURCE_ENERGY);
				creep.memory._lastDepositId = storage.id; // used for visualizeState
			}
		}

		// this.visualizeState(creep);

		this.autoCorrectRenewTarget(creep);
	},

	/** Force the renew target to be the spawn next to the relay. */
	autoCorrectRenewTarget(creep: Creep): void {
		if (!creep.memory.fillTargetIds) {
			return;
		}

		for (const id of creep.memory.fillTargetIds) {
			const struct = Game.getObjectById(id);
			if (!struct) {
				continue;
			}
			if (struct.structureType === STRUCTURE_SPAWN) {
				creep.memory.renewTarget = id as Id<StructureSpawn>;
				break;
			}
		}
	},
};

module.exports = roleRelay;
export default roleRelay;
