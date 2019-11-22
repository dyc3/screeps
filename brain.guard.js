let util = require("util");
let toolFriends = require("tool.friends");

/*
 * This coordinates guardian creeps to protect key assets most effectively.
 */

class GuardTask {
	constructor() {
		this.id = `${Game.shard.name}${Game.time.toString(24)}${Math.random()}`;
		this._targetRoom = null;
		this.guardType = "default";
		this.complete = false;
		this.assignedCreeps = [];
		this._currentTarget = null;
	}

	get targetRoom() {
		return new Room(this._targetRoom);
	}

	get currentTarget() {
		return Game.getObjectById(this._currentTarget);
	}

	serialize() {
		return {
			id: this.id,
			targetRoom: this._targetRoom,
			guardType: this.guardType,
			complete: this.complete,
			assignedCreeps: this.assignedCreeps,
			currentTarget: this._currentTarget,
		};
	}

	deserialize(mem) {
		this.id = mem.id;
		this._targetRoom = mem.targetRoom;
		this.guardType = mem.guardType;
		this.complete = mem.complete;
		this.assignedCreeps = mem.assignedCreeps;
		this._currentTarget = mem.currentTarget;
		return this;
	}
};

module.exports = {
	tasks: [],

	init() {
		if (!Memory.guard) {
			Memory.guard = {
				tasks: [],
				tasksMade: 0,
				guardiansSpawned: 0,
			};
		}
		if (!Memory.guard.tasks) {
			Memory.guard.tasks = [];
		}
		if (!Memory.guard.tasksMade) {
			Memory.guard.tasksMade = 0;
		}
		if (!Memory.guard.guardiansSpawned) {
			Memory.guard.guardiansSpawned = 0;
		}
		Memory.guard.tasks = _.map(this.tasks, task => new GuardTask().deserialize(task));
	},

	finalize() {
		Memory.guard.tasks = _.map(this.tasks, task => task.serialize());
	},

	getTasks() {
		return this.tasks;
	},

	getTask(id) {
		return _.find(this.tasks, task => task.id === id);
	},

	/**
	 * Search unguarded rooms and create new guard tasks, and remove completed guard tasks.
	 */
	updateGuardTasks() {
		// search unguarded rooms and create new guard tasks
		let guardedRooms = _.map(this.tasks, task => task._targetRoom);
		let roomsToSearch = _.map(_.filter(Memory.remoteMining.targets, miningTarget => !_.includes(guardedRooms, miningTarget.roomName) && _.keys(Game.rooms).includes(miningTarget.roomName)), miningTarget => new Room(miningTarget.roomName));
		for (let room of roomsToSearch) {
			let hostiles = room.find(FIND_HOSTILE_CREEPS, creep => !toolFriends.isCreepFriendly(creep));
			if (hostiles.length === 0) {
				continue;
			}

			let newTask = new GuardTask();
			newTask._targetRoom = room.name;
			this.tasks.push(newTask);
			Memory.guard.tasksMade++;
		}

		// remove completed guard tasks
		this.tasks = _.reject(this.tasks, task => task.complete);
	},

	/**
	 * Assigns guard tasks to guardian creeps, or spawn new guardians if needed.
	 */
	assignGuardTasks() {
		let guardians = util.getCreeps("guardian");

		// unassign creeps from completed or invalid tasks
		for (let guardian of guardians) {
			if (!guardian.memory.taskId) {
				continue;
			}
			let task = this.getTask(guardian.memory.taskId);
			if (!task || task.complete) {
				delete guardian.memory.taskId;
			}
		}

		// remove dead creeps from guard tasks
		for (let task of this.tasks) {
			task.assignedCreeps = _.filter(task.assignedCreeps, c => Game.creeps[c]);
		}

		// assign guardians to tasks
		let unfulfilledTasks = _.filter(this.tasks, task => !task.complete && task.assignedCreeps.length === 0);
		for (let task of unfulfilledTasks) {
			let idleGuardians = _.filter(guardians, guardian => !guardian.memory.taskId);

			if (idleGuardians.length > 0) {
				idleGuardians[0].memory.taskId = task.id;
				task.assignedCreeps.push(idleGuardians[0].name);
			}
			else {
				let creepBody = this.getGuardianBody(task.guardType);
				let targetSpawnRooms = util.findClosestOwnedRooms(new RoomPosition(25, 25, task._targetRoom), room => room.energyAvailable >= room.energyCapacityAvailable * 0.8 && room.energyAvailable >= util.getCreepSpawnCost(creepBody));
				let targetSpawn = null;
				for (let room of targetSpawnRooms) {
					let spawns = util.getStructures(room, STRUCTURE_SPAWN).filter(s => !s.spawning);
					if (spawns.length == 0) {
						continue;
					}
					targetSpawn = spawns[0];
					break;
				}

				if (!targetSpawn) {
					console.log("[guardians] Unable to spawn new guardians");
					break;
				}
				let creepName = `guardian_${Game.time.toString(32)}`;
				if (targetSpawn.spawnCreep(creepBody, creepName, { memory: { role: "guardian", stage: 0, keepAlive: false, renewing: false, taskId: task.id } }) === OK) {
					task.assignedCreeps.push(creepName);
					Memory.guard.guardiansSpawned++;
				}
				else {
					console.log("[guardians] Failed to spawn guardian creep for unknown reasons");
				}
			}
		}
	},

	getGuardianBody(guardType) {
		if (guardType == "max") {
			// TODO: build the biggest creep possible
			return [TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK];
		}
		else {
			if (util.getOwnedRooms().length > 2) {
				return [TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK];
			}
			else {
				return [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK];
			}
		}
	},

	runTasks() {
		for (let task of this.tasks) {
			if (task.complete) {
				continue;
			}
			console.log("[guard] running task", task.id);
			if (task._currentTarget && !task.currentTarget) {
				delete task._currentTarget;
			}

			if (!task._currentTarget && Game.rooms[task._targetRoom]) {
				let hostiles = task.targetRoom.find(FIND_HOSTILE_CREEPS);

				if (hostiles.length == 0) {
					task.complete = true;
					console.log("[guard] task", task.id, "completed");
					continue;
				}
				else {
					if (!task.currentTarget) {
						delete task._currentTarget;
					}
					task._currentTarget = hostiles[0].id;
				}
			}

			let creeps = _.map(task.assignedCreeps, name => Game.creeps[name]);
			for (let creep of creeps) {
				if (!task.currentTarget && creep.room.name !== task._targetRoom) {
					creep.travelTo(new RoomPosition(25, 25, task._targetRoom));
					continue;
				}

				if (task.currentTarget) {
					if (creep.attack(task.currentTarget) == ERR_NOT_IN_RANGE) {
						creep.travelTo(task.currentTarget);
					}
				}
			}
		}
	},
};