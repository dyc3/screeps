/* eslint-disable @typescript-eslint/unbound-method */
import brainAutoPlanner from "brain.autoplanner";
import util from "./util";
import { Role } from "roles/meta";
/**
 * Tools for use in the screeps console.
 *
 */

/*
## Control from the console

These methods should only be used from the console. They should not be used in the code anywhere.

### `Market`

`Market.quickSellEnergy()`
Sells energy on the market to free up some storage space.

### `Logistics`

`Logistics.send(from, to, resource, [amount])`

### `Util`

`Util.spawnMegaBuilder(spawnName=null)`
Spawns a very large builder creep with:
- 15 `WORK`
- 10 `CARRY`
- 25 `MOVE`
*/

// @ts-expect-error allow for console access
global.Market = {
	/**
	 * Utility function to sell excess energy on the market.
	 * Should ONLY be manually called by the user in the console.
	 *
	 * @returns String indicating the amount of energy sold, energy used for transation costs, and total energy spent.
	 */
	quickSellEnergy() {
		const buyOrders = Game.market.getAllOrders(order => {
			return (
				order.type === ORDER_BUY &&
				order.resourceType === RESOURCE_ENERGY &&
				order.remainingAmount > 0 &&
				order.price >= 1
			);
		});

		if (buyOrders.length === 0) {
			return "No energy buy orders.";
		}

		const rooms = util.getOwnedRooms();
		let totalEnergySold = 0;
		let totalEnergyCost = 0;
		let totalDeals = 0;
		const fromRooms = [];
		let totalDealsAttempted = 0;

		for (const room of rooms) {
			// we can only make 10 deals per tick
			if (totalDealsAttempted > 10 || buyOrders.length === 0) {
				break;
			}
			if (!room.storage || !room.terminal) {
				continue;
			}

			if (room.terminal.cooldown > 0 || room.terminal.store[RESOURCE_ENERGY] < Memory.terminalEnergyTarget) {
				continue;
			}

			if (room.storage.store[RESOURCE_ENERGY] < 700000) {
				continue;
			}

			let result = null;
			let attempts = 0;
			do {
				const buy = buyOrders[0];
				const amount = Math.min(
					buy.remainingAmount,
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					util.maximizeEnergyTransactionAmount(room.name, buy.roomName!, room.terminal.store[RESOURCE_ENERGY])
				);
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const cost = Game.market.calcTransactionCost(amount, room.name, buy.roomName!);
				if (amount + cost > room.terminal.store[RESOURCE_ENERGY]) {
					buyOrders.splice(0, 1);
					attempts++;
					continue;
				}
				result = Game.market.deal(buy.id, amount, room.name);
				totalDealsAttempted++;
				if (result === OK) {
					totalEnergySold += amount;
					totalEnergyCost += cost;
					totalDeals++;
					fromRooms.push(room.name);
					if (amount >= buy.remainingAmount) {
						// Don't try to make this deal again
						buyOrders.splice(0, 1);
					}
				} else {
					buyOrders.splice(0, 1);
					attempts++;
				}
			} while (result !== OK && attempts < 5 && buyOrders.length === 0);
		}

		return `Made ${totalDeals} deals (attempted ${totalDealsAttempted}). Sold ${totalEnergySold} energy, transactions costed ${totalEnergyCost} energy, for a total of ${
			totalEnergySold + totalEnergyCost
		} spent. From rooms: ${JSON.stringify(fromRooms)}`;
	},
};

// @ts-expect-error allow for console access
global.Logistics = {
	/**
	 * An easier way to transfer a resource from one room's terminal to another.
	 * @param {String} from from room name
	 * @param {String} to to room name
	 * @param {String} resource the name of the resource
	 * @param {Number} [amount=undefined] number of the resource to send, default sends all possible of the resource
	 */
	send(from: string, to: string, resource: ResourceConstant, amount: number | undefined = undefined) {
		const fromRoom = Game.rooms[from];
		const toRoom = Game.rooms[to];
		if (!fromRoom || !fromRoom.terminal || !toRoom || !toRoom.terminal) {
			return "One of the rooms does not have a terminal or vision.";
		}
		if (amount === undefined) {
			amount = Math.min(
				fromRoom.terminal.store.getCapacity(resource),
				toRoom.terminal.store.getFreeCapacity(resource)
			);
		}
		console.log(`Transfering ${amount} ${resource} from ${from} to ${to}`);
		const result = fromRoom.terminal.send(resource, amount, to);
		return util.errorCodeToString(result);
	},

	sendEnergy(from: string, to: string, amount = 75000) {
		const fromRoom = Game.rooms[from];
		const toRoom = Game.rooms[to];
		if (!fromRoom || !fromRoom.terminal || !toRoom || !toRoom.terminal) {
			return "One of the rooms does not have a terminal or vision.";
		}
		console.log(`Transfering ${amount} energy from ${from} to ${to}`);
		const result = fromRoom.terminal.send(RESOURCE_ENERGY, amount, to);
		return util.errorCodeToString(result);
	},

	/**
	 * Available options:
	 * `size`: number, default 20 - the number of CARRY parts, max 25
	 * `recycleAfterDelivery`: bool, default false - if true, the creep will recycle after delivering the entire inventory
	 * `recycleAfterDeposit`: bool, default false - if true, the creep will recycle immediately after the first deposit
	 * `renewAtWithdraw`: bool, default true - Prefer to renew the creep before it withdraws energy.
	 */
	spawnTmpDelivery(fromId: Id<AnyStoreStructure>, toId: Id<AnyStoreStructure>, options = {}) {
		const opts: {
			size: number;
			recycleAfterDelivery: boolean;
			recycleAfterDeposit: boolean;
			renewAtWithdraw: boolean;
			dropAfterDeposit: boolean;
			memory: CreepMemory;
			spawnName: string | undefined;
		} = _.defaults(options, {
			size: 20,
			recycleAfterDelivery: false,
			recycleAfterDeposit: false,
			renewAtWithdraw: true,
			dropAfterDeposit: false,
			memory: {},
		});
		let spawn = null;
		if (!opts.spawnName) {
			const rooms = util.getOwnedRooms();
			spawn = util.getSpawn(rooms[Math.floor(Math.random() * rooms.length)]);
		} else {
			spawn = Game.spawns[opts.spawnName];
		}
		if (!spawn) {
			return "Invalid spawn";
		}
		opts.size = opts.size.clamp(1, 25);
		const bodySection = [...(Array(opts.size) as unknown[])];
		const bodyCarry = bodySection.map(() => CARRY) as BodyPartConstant[];
		const bodyMove = bodySection.map(() => MOVE) as BodyPartConstant[];
		const body = bodyCarry.concat(bodyMove);
		const result = spawn.createCreep(
			body,
			`tmpdeliver_${Game.time.toString(16)}${Math.floor(Math.random() * 16).toString(16)}`,
			Object.assign(
				{
					role: "tmpdeliver",
					keepAlive: true,
					stage: 0,
					withdrawTargetId: fromId,
					depositTargetId: toId,
					recycleAfterDelivery: opts.recycleAfterDelivery,
					recycleAfterDeposit: opts.recycleAfterDeposit,
					renewAtWithdraw: opts.renewAtWithdraw,
					dropAfterDeposit: opts.dropAfterDeposit,
				},
				opts.memory
			)
		);

		if (typeof result === "string") {
			return result;
		} else {
			return util.errorCodeToString(result);
		}
	},

	balance() {
		const rooms = util.getOwnedRooms();
		const hungryRooms = rooms.filter(room => {
			if (!room.storage || !room.terminal) {
				return false;
			}
			return (
				room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 200000 &&
				room.storage.store.getUsedCapacity(RESOURCE_ENERGY) < 400000 &&
				room.terminal.store.getFreeCapacity(RESOURCE_ENERGY) > 100000
			);
		});
		if (hungryRooms.length === 0) {
			return "No hungry rooms";
		}
		const overflowingRooms = rooms
			.filter(room => !hungryRooms.map(r => r.name).includes(room.name))
			.filter(room => {
				if (!room.storage || !room.terminal || room.terminal.cooldown > 0) {
					return false;
				}
				return (
					room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 700000 &&
					room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) >= Memory.terminalEnergyTarget
				);
			});

		console.log(`hungryRooms: ${hungryRooms}`);
		console.log(`overflowingRooms: ${overflowingRooms}`);

		let roomsFed = 0;
		const feedLog = [];
		for (const receiver of hungryRooms) {
			// TODO: get room that is closest linearly to optimize energy spent on transfer.
			if (overflowingRooms.length === 0) {
				break;
			}
			if (!receiver.terminal) {
				continue;
			}
			const sender = overflowingRooms.pop();
			if (!sender || !sender.terminal) {
				continue;
			}

			// TODO: find actual maximum we can send instead of this approximation
			const needAmount = receiver.terminal.store.getFreeCapacity(RESOURCE_ENERGY);
			// Game.market.calcTransactionCost
			const cost = Game.market.calcTransactionCost(needAmount, receiver.name, sender.name);
			const totalNeeded = needAmount + cost;
			let toSend = needAmount;
			if (totalNeeded > sender.terminal.store.getUsedCapacity(RESOURCE_ENERGY)) {
				toSend -= cost;
			}
			const result = sender.terminal.send(RESOURCE_ENERGY, toSend, receiver.name);
			feedLog.push(`[${toSend} energy ${sender.name} -> ${receiver.name}; ${util.errorCodeToString(result)}]`);
			if (result === OK) {
				roomsFed++;
			}
		}

		return `Fed ${roomsFed}/${hungryRooms.length} hungry rooms. (hungry: ${hungryRooms.length}, overflow: ${
			overflowingRooms.length
		}) ${feedLog.join(" ")}`;
	},
};

// @ts-expect-error allow for console access
global.Util = {
	module: util,

	getCreeps: util.getCreeps,

	spawnMegaBuilder(spawnName = null) {
		let spawn = null;
		if (!spawnName) {
			const rooms = util.getOwnedRooms();
			spawn = util.getSpawn(rooms[Math.floor(Math.random() * rooms.length)]);
		} else {
			spawn = Game.spawns[spawnName];
		}
		if (!spawn) {
			return "Invalid spawn";
		}
		const result = spawn.spawnCreep(
			[
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				WORK,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				CARRY,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
				MOVE,
			],
			`builder_${Game.time.toString(16)}`,
			{
				// @ts-expect-error ignore, this is a console tool
				memory: {
					role: Role.Builder,
					keepAlive: false,
					stage: 5,
				},
			}
		);

		if (typeof result === "string") {
			return result;
		} else {
			return util.errorCodeToString(result);
		}
	},

	forceReplan(roomName: string, full = false) {
		// @ts-expect-error ignore, this is a console tool
		delete Memory.rooms[roomName].structures;
		if (full) {
			delete Memory.rooms[roomName].rootPos;
			delete Memory.rooms[roomName].storagePos;
		}
		Game.rooms[roomName].find(FIND_MY_CONSTRUCTION_SITES).forEach(site => site.remove());
		brainAutoPlanner.planRoom(Game.rooms[roomName]);
	},
};

// @ts-expect-error allow for console access
global.Debug = {
	/**
	 * Print debug info about a given harvester.
	 * @param {String|Creep} creep Creep name, object id, or creep object.
	 */
	harvester(creep: Creep | string) {
		if (typeof creep === "string") {
			if (creep in Game.creeps) {
				creep = Game.creeps[creep];
			} else {
				creep = Game.getObjectById(creep) as Creep;
			}
		}

		if (!(creep instanceof Creep)) {
			return "Invalid input to debug function";
		}
		if (creep.memory.role !== "harvester") {
			return "Creep is not a harvester";
		}

		if (!creep.memory.harvestTarget) {
			return `Harvester ${creep.name} has no harvest target`;
		}

		const harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
		if (!harvestTarget) {
			return `Harvester ${creep.name} has no vision on harvest target ${creep.memory.harvestTarget}`;
		}
		const renewTarget = creep.memory.renewTarget ? Game.getObjectById(creep.memory.renewTarget) : null;
		if (!renewTarget) {
			return `Harvester ${creep.name} has no vision on renew target ${creep.memory.renewTarget}`;
		}
		const out = [`pos=${creep.pos}`, `targetRoom=${creep.memory.targetRoom}`];
		if (creep.memory.harvestTarget) {
			out.push(`harvestTarget=${harvestTarget}${harvestTarget.pos}`);
		}
		out.push(`harvesting=${creep.memory.harvesting}`, `renewing=${creep.memory.renewing}`);
		if (creep.memory.renewTarget) {
			out.push(`renewTarget=${renewTarget}${renewTarget.pos}`);
		}
		return `Harvester ${creep.name}: ${out.join(", ")}`;
	},
};

// @ts-expect-error allow for console access
global.id = Game.getObjectById;
// @ts-expect-error allow for console access
global.creep = (creepName: string) => Game.creeps[creepName];
// @ts-expect-error allow for console access
global.obj = (identifier: Id<RoomObject>) => {
	if (identifier in Game.creeps) {
		return Game.creeps[identifier];
	} else {
		return Game.getObjectById(identifier);
	}
};

Creep.prototype.log = function (...args) {
	if (_.any(Memory.highlightCreepLog, value => value === this.name || value === this.memory.role)) {
		console.log('<span style="color: cyan">', this.name, ...args, "</span>");
	} else {
		console.log(this.name, ...args);
	}
};

PowerCreep.prototype.log = function (...args) {
	if (_.any(Memory.highlightCreepLog, value => value === this.name || value === "powercreep")) {
		console.log('<span style="color: cyan">', this.name, ...args, "</span>");
	} else {
		console.log(this.name, ...args);
	}
};

Number.prototype.clamp = function (min, max) {
	return util.clamp(this as number, min, max);
};
