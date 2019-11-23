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
		return Game.rooms[this._targetRoom];
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
			if (!util.isTreasureRoom(room.name)) {
				let hostiles = room.find(FIND_HOSTILE_CREEPS, creep => !toolFriends.isCreepFriendly(creep));
				if (hostiles.length === 0) {
					continue;
				}
			}

			let newTask = new GuardTask();
			newTask._targetRoom = room.name;
			if (util.isTreasureRoom(room.name)) {
				newTask.guardType = "treasure";
			}
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
		else if (guardType == "treasure") {
			return [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,HEAL,HEAL,HEAL,HEAL,MOVE];
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

			if (task.currentTarget) {
				console.log(`[guard] [${task.id}] currentTarget: ${task.currentTarget}`);
			}

			if (!task._currentTarget && Game.rooms[task._targetRoom]) {
				if (task.guardType == "treasure") {
					let hostiles = task.targetRoom.find(FIND_HOSTILE_CREEPS);

					if (hostiles.length > 0) {
						task._currentTarget = hostiles[0].id;
					}
					else {
						let keeperLairs = task.targetRoom.find(FIND_HOSTILE_STRUCTURES).filter(struct => struct.structureType === STRUCTURE_LAIR);
						keeperLairs.sort((a, b) => a.ticksToSpawn - b.ticksToSpawn);
						task._currentTarget = keeperLairs[0].id;
					}
				}
				else {
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
			}

			if (task.guardType == "treasure" && task.currentTarget instanceof StructureKeeperLair && !task.currentTarget.ticksToSpawn) {
				let hostiles = task.targetRoom.findInRange(FIND_HOSTILE_CREEPS, 8);
				if (hostiles.length > 0) {
					task._currentTarget = hostiles[0].id;
				}
			}

			let creeps = _.map(task.assignedCreeps, name => Game.creeps[name]);
			for (let creep of creeps) {
				if (!task.currentTarget && creep.room.name !== task._targetRoom) {
					creep.travelTo(new RoomPosition(25, 25, task._targetRoom));
					continue;
				}

				if (creep.hits < creep.hitsMax && creep.getActiveBodyparts(HEAL) > 0) {
					creep.heal(creep);
				}

				if (task.currentTarget) {
					if (task.guardType == "treasure") {
						if (task.currentTarget instanceof Creep) {
							console.log("[guard] attacking creep");
							if (creep.getActiveBodyparts(RANGED_ATTACK) > 0 && creep.pos.inRangeTo(task.currentTarget, 3)) {
								creep.rangedAttack(task.currentTarget);
							}
							else if (creep.getActiveBodyparts(ATTACK) > 0 && creep.pos.inRangeTo(task.currentTarget, 1)) {
								creep.rangedAttack(task.currentTarget);
							}
							else {
								creep.travelTo(task.currentTarget, { range: creep.getActiveBodyparts(RANGED_ATTACK) > 0 ? 3 : 1 });
							}
						}
						else if (task.currentTarget instanceof StructureKeeperLair) {
							console.log("[guard] waiting by keeper lair");
							if (!creep.pos.inRangeTo(task.currentTarget, 2)) {
								creep.travelTo(task.currentTarget);
							}
						}
						else {
							console.log("[guard] ERR: unknown current target");
						}
					}
					else {
						if (creep.attack(task.currentTarget) == ERR_NOT_IN_RANGE) {
							creep.travelTo(task.currentTarget);
						}
					}
				}
			}
		}
	},
};