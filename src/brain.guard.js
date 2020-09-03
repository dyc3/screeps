let util = require("util");
let toolFriends = require("tool.friends");

const MASS_ATTACK_DISTANCE_MULTIPLIER = { 0: 1, 1: 1, 2: 0.4, 3: 0.1 };

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
		this.neededCreeps = 1;
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
			neededCreeps: this.neededCreeps,
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
		this.neededCreeps = mem.neededCreeps;
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
		this.tasks = _.map(Memory.guard.tasks, task => new GuardTask().deserialize(task));
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
			let newTask = new GuardTask();
			if (!util.isTreasureRoom(room.name)) {
				let hostiles = room.find(FIND_HOSTILE_CREEPS, creep => !toolFriends.isCreepFriendly(creep));
				if (hostiles.length === 0) {
					continue;
				}

				newTask.neededCreeps = hostiles.length;
			}

			newTask._targetRoom = room.name;
			if (util.isTreasureRoom(room.name)) {
				newTask.guardType = "treasure";
				newTask.neededCreeps = 2;
			}
			this.tasks.push(newTask);
			Memory.guard.tasksMade++;
		}

		// remove completed guard tasks
		this.tasks = _.reject(this.tasks, task => task.complete);

		// update neededCreeps for existing tasks
		for (let task of this.tasks) {
			if (!task.room) {
				// can't access room, don't update
				continue;
			}

			if (task.guardType === "treasure") {
				let hostiles = task.targetRoom.find(FIND_HOSTILE_CREEPS);
				let invaders = _.filter(hostiles, c => c.owner.username === "Invader");
				if (invaders.length > 0) {
					newTask.neededCreeps = 3;
				}
				else {
					newTask.neededCreeps = 2;
				}
			}
		}
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
		let unfulfilledTasks = _.filter(this.tasks, task => !task.complete && task.assignedCreeps.length < task.neededCreeps);
		for (let task of unfulfilledTasks) {
			let idleGuardians = _.filter(guardians, guardian => !guardian.memory.taskId && guardian.memory.guardType == task.guardType);

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
				let newCreepMem = {
					role: "guardian",
					stage: 0,
					keepAlive: false,
					renewing: false,
					taskId: task.id,
					guardType: task.guardType
				};
				if (task.guardType === "treasure") {
					newCreepMem.keepAlive = true;
				}
				if (targetSpawn.spawnCreep(creepBody, creepName, { memory: newCreepMem }) === OK) {
					console.log(`[guardians] Spawned new ${task.guardType} guardian for ${task.id}`);
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
				return [TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK];
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
			console.log(`[guard] running task ${task.id} - creeps: ${task.assignedCreeps.length}/${task.neededCreeps}`);
			if (task._currentTarget && !task.currentTarget) {
				delete task._currentTarget;
			}

			if (task.currentTarget) {
				console.log(`[guard] [${task.id}] currentTarget: ${task.currentTarget} at ${task.currentTarget.pos}`);
				const offset = .7;
				new RoomVisual(task.currentTarget.pos.roomName).poly([
					[task.currentTarget.pos.x, task.currentTarget.pos.y - offset],
					[task.currentTarget.pos.x + offset, task.currentTarget.pos.y],
					[task.currentTarget.pos.x, task.currentTarget.pos.y + offset],
					[task.currentTarget.pos.x - offset, task.currentTarget.pos.y],
					[task.currentTarget.pos.x, task.currentTarget.pos.y - offset]
				], {
					stroke: '#ffff00',
					strokeWidth: .07,
					opacity: .5,
				});
			}

			// FIXME: store all hostile ids in memory as `allTargets`
			let hostiles = [];
			if (task.targetRoom) {
				hostiles = task.targetRoom.find(FIND_HOSTILE_CREEPS);
			}

			if (!task._currentTarget && Game.rooms[task._targetRoom]) {
				if (task.guardType == "treasure") {
					let hostiles = task.targetRoom.find(FIND_HOSTILE_CREEPS);

					if (hostiles.length > 0) {
						// prioritize creeps that can heal
						hostiles = _.sortByOrder(hostiles, [c => {
							return c.getActiveBodyparts(HEAL);
						},
						c => {
							return c.getActiveBodyparts(RANGED_ATTACK) + c.getActiveBodyparts(ATTACK);
						}
						], ["desc", "desc"]);

						task._currentTarget = hostiles[0].id;
					}
					else {
						let keeperLairs = task.targetRoom.find(FIND_HOSTILE_STRUCTURES).filter(struct => struct.structureType === STRUCTURE_KEEPER_LAIR);
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
				let hostiles = task.currentTarget.pos.findInRange(FIND_HOSTILE_CREEPS, 7);
				if (hostiles.length > 0) {
					task._currentTarget = hostiles[0].id;
				}
			}

			let creeps = _.map(task.assignedCreeps, name => Game.creeps[name]);
			let creepsInRange = _.filter(creeps, creep => creep.pos.inRangeTo(task.currentTarget, 3)); // guards that are in range of the current target
			for (let creep of creeps) {
				creep.notifyWhenAttacked(false);
				if (creep.spawning || creep.memory.renewing) {
					creep.memory.renew_force_amount = 1400;
					continue;
				}

				if (!task.currentTarget && creep.room.name !== task._targetRoom) {
					creep.travelTo(new RoomPosition(25, 25, task._targetRoom));
					continue;
				}

				if (creep.getActiveBodyparts(HEAL) > 0) {
					if (creep.hits < creep.hitsMax) {
						creep.log("[guard] healing self");
						creep.heal(creep);
					}
					else if (!creep.pos.inRangeTo(task.currentTarget, 3)) {
						let creepsNeedHeal = _.filter(creeps, c => {
							if (c.name === creep.name) {
								return false;
							}
							return c.hits < c.hitsMax && creep.pos.inRangeTo(c, 3);
						});
						if (creepsNeedHeal.length > 0) {
							if (creep.pos.isNearTo(creepsNeedHeal[0])) {
								creep.log("[guard] healing other guard");
								creep.heal(creepsNeedHeal[0]);
							}
							else {
								creep.log("[guard] ranged healing other guard");
								creep.rangedHeal(creepsNeedHeal[0]);
							}
						}
						else {
							// passively heal other friendly creeps in range.
							let otherCreepsNeedHeal = creep.pos.findInRange(FIND_CREEPS, 3).filter(c => {
								return toolFriends.isCreepFriendly(c) && c.hits < c.hitsMax;
							});
							if (otherCreepsNeedHeal.length > 0) {
								if (creep.pos.isNearTo(otherCreepsNeedHeal[0])) {
									creep.log("[guard] healing other friendly creep");
									creep.heal(otherCreepsNeedHeal[0]);
								}
								else {
									creep.log("[guard] ranged healing friendly creep");
									creep.rangedHeal(otherCreepsNeedHeal[0]);
								}
							}
						}
					}
				}

				if (task.currentTarget) {
					let rangeToTarget = creep.pos.getRangeTo(task.currentTarget);
					let isTargetInRange = rangeToTarget <= 3;
					let hostilesInRange = _.filter(hostiles, hostile => creep.pos.inRangeTo(hostile, 3));
					let hostileHealdersInRange = _.filter(hostilesInRange, hostile => hostile.getActiveBodyparts(HEAL) > 0);
					let rangedAttackEffectiveness = creep.getActiveBodyparts(RANGED_ATTACK) * RANGED_ATTACK_POWER; // Estimation of how much damage we will do to the target with a ranged attack.
					let rangedMassAttackEffectiveness = rangedAttackEffectiveness * (MASS_ATTACK_DISTANCE_MULTIPLIER[rangeToTarget] || 0); // Estimation of how much damage we will do to the target with a mass attack.
					let targetHealEffectiveness = task.currentTarget instanceof Creep ? task.currentTarget.getActiveBodyparts(HEAL) * HEAL_POWER : 0;

					let shouldMassAttack = false;
					// Needs to prioritize focusing down creeps that can heal
					if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
						if (isTargetInRange) {
							if (rangedMassAttackEffectiveness <= targetHealEffectiveness) {
								shouldMassAttack = false;
							}
							else if (hostileHealdersInRange.length == 0 && hostilesInRange.length >= 3) {
								shouldMassAttack = true;
							}
						}
						else if (hostilesInRange.length >= 2) {
							shouldMassAttack = true;
						}
					}

					// TODO: don't repeat code
					if (task.guardType === "treasure") {
						if (task.currentTarget instanceof Creep) {
							console.log("[guard] attacking creep");
							if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
								if (shouldMassAttack) {
									creep.rangedMassAttack();
								}
								else if (isTargetInRange) {
									creep.rangedAttack(task.currentTarget);
								}
								else if (hostilesInRange.length == 1) {
									creep.rangedAttack(hostilesInRange[0]);
								}
							}
							else if (creep.getActiveBodyparts(ATTACK) > 0 && creep.pos.inRangeTo(task.currentTarget, 1)) {
								creep.attack(task.currentTarget);
							}

							let minRange = task.currentTarget.getActiveBodyparts(ATTACK) > 0 && creep.getActiveBodyparts(RANGED_ATTACK) > 0 ? 2 : 1;
							if (!creep.pos.inRangeTo(task.currentTarget, minRange)) {
								creep.travelTo(task.currentTarget, { range: minRange });
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
						if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
							if (shouldMassAttack) {
								creep.rangedMassAttack();
							}
							else if (isTargetInRange) {
								creep.rangedAttack(task.currentTarget);
							}
							else if (hostilesInRange.length == 1) {
								creep.rangedAttack(hostilesInRange[0]);
							}
						}
						else if (creep.getActiveBodyparts(ATTACK) > 0 && creep.pos.inRangeTo(task.currentTarget, 1)) {
							creep.attack(task.currentTarget);
							creep.move(creep.pos.getDirectionTo(task.currentTarget));
						}

						if (!creep.pos.inRangeTo(task.currentTarget, 1)) {
							creep.travelTo(task.currentTarget, { ignoreCreeps: false, movingTarget: true });
						}
					}
				}
			}
		}
	},
};