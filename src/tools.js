let util = require("util");
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

		for (let room of rooms) {
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
				result = Game.market.deal(buy.id, amount, room.name);
				if (result === OK) {
					totalEnergySold += amount;
					totalEnergyCost += cost;
					totalDeals++;
					fromRooms.push(room.name);
				}
				else {
					buyOrders.splice(0, 1);
					attempts++;
				}
			} while (result !== OK && attempts < 5);
		}

		return `Made ${totalDeals} deals. Sold ${totalEnergySold} energy, transactions costed ${totalEnergyCost} energy, for a total of ${totalEnergySold + totalEnergyCost} spent. From rooms: ${JSON.stringify(fromRooms)}`;
	},
};

global.Logistics = {
	// TODO: make a function like quickSellEnergy but instead it transfers energy to rooms that need it.

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

	spawnTmpDelivery(fromId, toId, options={}) {
		let opts = _.defaults(options, {
			size: 20,
			recycleAfterDelivery: false,
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
		return spawn.createCreep(
			Array.apply(null, Array(opts.size)).map(_ => CARRY).concat(Array.apply(null, Array(opts.size)).map(_ => MOVE)),
			`tmpdeliver_${Game.time.toString(16)}${Math.floor(Math.random() * 16).toString(16)}`, {
				role:"tmpdeliver",
				keepAlive:true,
				stage: 0,
				withdrawTargetId: fromId,
				depositTargetId: toId,
				recycleAfterDelivery: opts.recycleAfterDelivery,
			});
	},
};

global.Util = {
	module: util,

	spawnMegaBuilder(spawnName=null) {
		let spawn = null;
		if (!spawnName) {
			rooms = util.getOwnedRooms();
			spawn = util.getSpawn(rooms[Math.floor(Math.random() * rooms.length)]);
		}
		else {
			spawn = Game.spawns[spawnName];
		}
		return spawn.spawnCreep([
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
