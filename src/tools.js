import util from "./util";
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

global.Market = {
	/**
	 * Utility function to sell excess energy on the market.
	 * Should ONLY be manually called by the user in the console.
	 *
	 * @returns String indicating the amount of energy sold, energy used for transation costs, and total energy spent.
	 */
	quickSellEnergy() {
		let buyOrders = Game.market.getAllOrders(order => {
			return order.type === ORDER_BUY && order.resourceType === RESOURCE_ENERGY && order.remainingAmount > 0;
		});

		if (buyOrders.length == 0) {
			return "No energy buy orders.";
		}

		let rooms = util.getOwnedRooms();
		let totalEnergySold = 0;
		let totalEnergyCost = 0;
		let totalDeals = 0;
		let fromRooms = [];
		let totalDealsAttempted = 0;

		for (let room of rooms) {
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
				let buy = buyOrders[0];
				let amount = Math.min(buy.remainingAmount, room.terminal.store[RESOURCE_ENERGY] / 2);
				let cost = Game.market.calcTransactionCost(amount, room.name, buy.roomName);
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
				}
				else {
					buyOrders.splice(0, 1);
					attempts++;
				}
			} while (result !== OK && attempts < 5 && buyOrders.length === 0);
		}

		return `Made ${totalDeals} deals (attempted ${totalDealsAttempted}). Sold ${totalEnergySold} energy, transactions costed ${totalEnergyCost} energy, for a total of ${totalEnergySold + totalEnergyCost} spent. From rooms: ${JSON.stringify(fromRooms)}`;
	},
};

global.Logistics = {
	/**
	 * An easier way to transfer a resource from one room's terminal to another.
	 * @param {String} from from room name
	 * @param {String} to to room name
	 * @param {String} resource the name of the resource
	 * @param {Number} [amount=undefined] number of the resource to send, default sends all possible of the resource
	 */
	send(from, to, resource, amount=undefined) {
		if (amount === undefined) {
			amount = Math.min(Game.rooms[from].terminal.store.getCapacity(resource), Game.rooms[to].terminal.store.getFreeCapacity(resource));
		}
		console.log(`Transfering ${amount} ${resource} from ${from} to ${to}`);
		return Game.rooms[from].terminal.send(resource, amount, to);
	},

	sendEnergy(from, to, amount=75000) {
		console.log(`Transfering ${amount} energy from ${from} to ${to}`);
		return Game.rooms[from].terminal.send(RESOURCE_ENERGY, amount, to);
	},

	/**
	 * Available options:
	 * `size`: number, default 20 - the number of CARRY parts, max 25
	 * `recycleAfterDelivery`: bool, default false - if true, the creep will recycle after delivering the entire inventory
	 * `recycleAfterDeposit`: bool, default false - if true, the creep will recycle immediately after the first deposit
	 * `renewAtWithdraw`: bool, default true - Prefer to renew the creep before it withdraws energy.
	 */
	spawnTmpDelivery(fromId, toId, options={}) {
		let opts = _.defaults(options, {
			size: 20,
			recycleAfterDelivery: false,
			recycleAfterDeposit: false,
			renewAtWithdraw: true,
			dropAfterDeposit: false,
			memory: {},
		});
		let spawn = null;
		if (!opts.spawnName) {
			rooms = util.getOwnedRooms();
			spawn = util.getSpawn(rooms[Math.floor(Math.random() * rooms.length)]);
		}
		else {
			spawn = Game.spawns[opts.spawnName];
		}
		opts.size = opts.size.clamp(1, 25);
		let result = spawn.createCreep(
			Array.apply(null, Array(opts.size)).map(_ => CARRY).concat(Array.apply(null, Array(opts.size)).map(_ => MOVE)),
			`tmpdeliver_${Game.time.toString(16)}${Math.floor(Math.random() * 16).toString(16)}`, Object.assign({
				role:"tmpdeliver",
				keepAlive:true,
				stage: 0,
				withdrawTargetId: fromId,
				depositTargetId: toId,
				recycleAfterDelivery: opts.recycleAfterDelivery,
				recycleAfterDeposit: opts.recycleAfterDeposit,
				renewAtWithdraw: opts.renewAtWithdraw,
				dropAfterDeposit: opts.dropAfterDeposit,
			}, opts.memory));

		if (typeof result === "string") {
			return result
		}
		else {
			return util.errorCodeToString(result)
		}
	},

	balance() {
		let rooms = util.getOwnedRooms();
		let hungryRooms = rooms.filter(room => {
			if (!room.storage || !room.terminal) {
				return false;
			}
			return room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 200000 &&
				room.storage.store.getUsedCapacity(RESOURCE_ENERGY) < 400000 &&
				room.terminal.store.getFreeCapacity(RESOURCE_ENERGY) > 100000;
		});
		if (hungryRooms.length === 0) {
			return "No hungry rooms"
		}
		let overflowingRooms = rooms.filter(room => !hungryRooms.map(r => r.name).includes(room.name)).filter(room => {
			if (!room.storage || !room.terminal || room.terminal.cooldown > 0) {
				return false;
			}
			return room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 700000 && room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) >= Memory.terminalEnergyTarget
		});

		console.log(`hungryRooms: ${hungryRooms}`);
		console.log(`overflowingRooms: ${overflowingRooms}`);

		let roomsFed = 0;
		let feedLog = [];
		for (let receiver of hungryRooms) {
			// TODO: get room that is closest linearly to optimize energy spent on transfer.
			if (overflowingRooms.length === 0) {
				break;
			}
			let sender = overflowingRooms.pop();

			// TODO: find actual maximum we can send instead of this approximation
			let needAmount = receiver.terminal.store.getFreeCapacity(RESOURCE_ENERGY);
			// Game.market.calcTransactionCost
			let cost = Game.market.calcTransactionCost(needAmount, receiver.name, sender.name)
			let totalNeeded = needAmount + cost;
			let toSend = needAmount;
			if (totalNeeded > sender.terminal.store.getUsedCapacity(RESOURCE_ENERGY)) {
				toSend -= cost;
			}
			let result = sender.terminal.send(RESOURCE_ENERGY, toSend, receiver.name);
			feedLog.push(`[${toSend} energy ${sender.name} -> ${receiver.name}; ${util.errorCodeToString(result)}]`);
			if (result === OK) {
				roomsFed++;
			}
		}

		return `Fed ${roomsFed}/${hungryRooms.length} hungry rooms. (hungry: ${hungryRooms.length}, overflow: ${overflowingRooms.length}) ${feedLog.join(" ")}`
	},
};

global.Util = {
	module: util,

	getCreeps: util.getCreeps,

	spawnMegaBuilder(spawnName=null) {
		let spawn = null;
		if (!spawnName) {
			rooms = util.getOwnedRooms();
			spawn = util.getSpawn(rooms[Math.floor(Math.random() * rooms.length)]);
		}
		else {
			spawn = Game.spawns[spawnName];
		}
		let result = spawn.spawnCreep([
			WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,
			CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,
			MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,
			MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,
			MOVE,MOVE,MOVE,MOVE,MOVE,
		],
		`builder_${Game.time.toString(16)}`,
		{
			memory: {
				role: "builder",
				keepAlive: false,
				stage: 5
			}
		})

		if (typeof result === "string") {
			return result
		}
		else {
			return util.errorCodeToString(result)
		}
	},

	spawnTestLogisticsCreep(spawnName=null, size=2) {
		let spawn = null;
		if (!spawnName) {
			rooms = util.getOwnedRooms();
			spawn = util.getSpawn(rooms[Math.floor(Math.random() * rooms.length)]);
		}
		else {
			spawn = Game.spawns[spawnName];
		}
		let body = [];
		for (let i = 0; i < size; i++) {
			body.unshift(CARRY);
			body.push(MOVE);
		}
		return spawn.spawnCreep(body,
			`testlogistics_${Game.time.toString(16)}`,
			{
				memory: {
					role: "testlogistics",
					keepAlive: true,
					stage: size
				}
			});
	},

	destroyAllTestLogisticsCreeps() {
		for (let creep of util.getCreeps("testlogistics")) {
			creep.suicide();
		}
	},

	/**
	 * Trashes the creep's movement cache, forcing it to calculate a new path.
	 * @param {Creep|String} creep
	 */
	forceRepath(creep) {
		if (typeof creep === "string") {
			creep = Game.creeps[creep];
		}
		delete creep.memory._trav;
	},

	forceReplan(roomName, full=false) {
		delete Memory.rooms[roomName].structures;
		if (full) {
			delete Memory.rooms[roomName].rootPos;
			delete Memory.rooms[roomName].storagePos;
		}
		Game.rooms[roomName].find(FIND_MY_CONSTRUCTION_SITES).forEach(site => site.remove());
		require("brain.autoplanner").planRoom(Game.rooms[roomName]);
	},
};

global.Debug = {
	/**
	 * Print debug info about a given harvester.
	 * @param {String|Creep} creep Creep name, object id, or creep object.
	 */
	harvester(creep) {
		if (typeof(creep) === "string") {
			if (creep in Game.creeps) {
				creep = Game.creeps[creep]
			}
			else {
				creep = Game.getObjectById(creep)
			}
		}

		if (!(creep instanceof Creep)) {
			return "Invalid input to debug function"
		}
		if (creep.memory.role !== "harvester") {
			return "Creep is not a harvester"
		}

		let harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
		let renewTarget = Game.getObjectById(creep.memory.renewTarget);
		let out = [
			`pos=${creep.pos}`,
			`targetRoom=${creep.memory.targetRoom}`,
		];
		if (creep.memory.harvestTarget) {
			out.push(`harvestTarget=${harvestTarget}${harvestTarget.pos}`)
		}
		out.push(`harvesting=${creep.memory.harvesting}`, `renewing=${creep.memory.renewing}`);
		if (creep.memory.renewTarget) {
			out.push(`renewTarget=${renewTarget}${renewTarget.pos}`);
		}
		return `Harvester ${creep.name}: ${out.join(", ")}`;
	}
};

global.id = Game.getObjectById
global.creep = creepName => Game.creeps[creepName]
global.obj = identifier => {
	if (identifier in Game.creeps) {
		return Game.creeps[identifier]
	}
	else {
		return Game.getObjectById(identifier)
	}
}

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
	return util.clamp(this, min, max);
};
