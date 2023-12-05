/* eslint-disable no-underscore-dangle */
import * as cartographer from "screeps-cartographer";
import { Role } from "roles/meta";
import toolFriends from "./tool.friends.js";
import util from "./util.js";
import { JobRunner } from "jobs.js";

const MASS_ATTACK_DISTANCE_MULTIPLIER: { [i: number]: number } = { 0: 1, 1: 1, 2: 0.4, 3: 0.1 };

export interface GuardTaskSerialized {
	id: string;
	_targetRoom: string | null;
	guardType: string;
	complete: boolean;
	assignedCreeps: string[];
	neededCreeps: number;
	_currentTarget?: string;
	waiting: boolean;
	disableUntil: number;
}

/*
 * This coordinates guardian creeps to protect key assets most effectively.
 */

class GuardTask implements GuardTaskSerialized {
	public id: string;
	public _targetRoom = "";
	public guardType = "default";
	public complete = false;
	public assignedCreeps: string[] = [];
	public neededCreeps = 1;
	public _currentTarget: Id<AnyCreep> | Id<StructureKeeperLair> | undefined = undefined;
	/**
	 * Whether or not the task is waiting for all creeps to be spawned.
	 */
	public waiting = true;
	/**
	 * If set, the task will be disabled until this tick.
	 */
	public disableUntil = 0;

	public constructor() {
		this.id = `${Game.shard.name}${Game.time.toString(24)}${Math.random()}`;
	}

	public get targetRoom(): Room | undefined {
		if (!this._targetRoom) {
			return undefined;
		}
		return Game.rooms[this._targetRoom];
	}

	private set targetRoom(value) {
		if (value instanceof Room) {
			this._targetRoom = value.name;
		} else if (typeof value === "string") {
			this._targetRoom = value;
		} else {
			throw new Error("Invalid value for targetRoom");
		}
	}

	public get currentTarget(): AnyCreep | undefined {
		if (!this._currentTarget) {
			return undefined;
		}
		return Game.getObjectById<AnyCreep>(this._currentTarget) ?? undefined;
	}

	private set currentTarget(value) {
		if (typeof value === "string") {
			this._currentTarget = value;
		} else if (value !== undefined && value !== null) {
			this._currentTarget = value.id;
		} else {
			this._currentTarget = value;
		}
	}

	public serialize(): GuardTaskSerialized {
		return {
			id: this.id,
			_targetRoom: this._targetRoom,
			guardType: this.guardType,
			complete: this.complete,
			assignedCreeps: this.assignedCreeps,
			neededCreeps: this.neededCreeps,
			_currentTarget: this._currentTarget,
			waiting: this.waiting,
			disableUntil: this.disableUntil,
		};
	}

	public deserialize(mem: GuardTaskSerialized) {
		Object.assign(this, mem);
		return this;
	}

	public get isEnabled() {
		return this.disableUntil !== undefined && this.disableUntil < Game.time;
	}
}

export default {
	tasks: [] as GuardTask[],

	init(): void {
		Memory.guard = _.defaults(Memory.guard, {
			tasks: [],
			tasksMade: 0,
			guardiansSpawned: 0,
		});
		this.tasks = _.map(Memory.guard.tasks, task => new GuardTask().deserialize(task));
	},

	finalize(): void {
		console.log(`[guard] Finalizing ${this.tasks.length} tasks`);
		Memory.guard.tasks = _.map(this.tasks, task => task.serialize());
	},

	getTasks(): GuardTask[] {
		return this.tasks;
	},

	getTask(id: string): GuardTask | undefined {
		return _.find(this.tasks, task => task.id === id);
	},

	remoteMiningsInDanger(): string[] {
		const remoteMinings = _.filter(Memory.remoteMining.targets, target => target.danger > 0).map(
			target => target.roomName
		);
		const guardedRooms = _.map(this.tasks, task => task._targetRoom);
		return _.difference(remoteMinings, guardedRooms);
	},

	/**
	 * Search unguarded rooms and create new guard tasks, and remove completed guard tasks.
	 */
	updateGuardTasks(): void {
		// search unguarded rooms and create new guard tasks
		const guardedRooms = _.map(this.tasks, task => task._targetRoom);
		const roomsToSearch = _.map(
			_.filter(
				Memory.remoteMining.targets,
				miningTarget =>
					!_.includes(guardedRooms, miningTarget.roomName) &&
					_.keys(Game.rooms).includes(miningTarget.roomName)
			),
			miningTarget => new Room(miningTarget.roomName)
		);
		console.log(`[guard] searching ${roomsToSearch.length} rooms`);
		// purely for debugging, we need vision to create a task
		const inDanger = this.remoteMiningsInDanger();
		if (inDanger.length > 0) {
			console.log(`[guard] remote minings in danger: ${inDanger.join(",")}`);
		}

		for (const room of roomsToSearch) {
			if (guardedRooms.includes(room.name)) {
				console.log(`[guard] room ${room.name} is already guarded`);
				continue;
			}
			this.autoCreateGuardTask(room);
			guardedRooms.push(room.name);
		}

		// TODO: benchmark this method, see if this is faster than doing it normally
		const grouped = _.groupBy(this.tasks, "complete");
		if (grouped.true) {
			console.log(`[guard] found ${grouped.true.length} completed tasks`);
			// clean up completed tasks
			for (const task of grouped.true) {
				if (task.guardType === "invader-subcore") {
					for (const creepName of task.assignedCreeps) {
						Game.creeps[creepName].suicide();
					}
				}
			}
		}
		if (grouped.false) {
			// remove completed guard tasks
			this.tasks = grouped.false;
		} else {
			this.tasks = [];
		}

		// update neededCreeps for existing tasks
		for (const task of this.tasks) {
			if (!task.targetRoom) {
				// can't access room, don't update
				continue;
			}

			if (task.guardType === "treasure") {
				const foundInvaderCore = _.first(
					task.targetRoom.find(FIND_HOSTILE_STRUCTURES, {
						filter: struct => struct.structureType === STRUCTURE_INVADER_CORE,
					})
				);
				const hostiles = task.targetRoom.find(FIND_HOSTILE_CREEPS);
				const invaders = _.filter(hostiles, c => c.owner.username === "Invader");
				if (invaders.length > 0 || foundInvaderCore) {
					task.neededCreeps = 3;
				} else {
					task.neededCreeps = 2;
				}
			} else if (task.guardType === "remote-miner-cheap" || task.guardType === "remote-miner-huge") {
				// HACK: determine if we should upgrade to the huge ones
				// also, I don't know if this even works
				// this needs to be generalized to all possible scenarios
				// maybe it would be a good idea to have a mechanism to
				// hand the task over to the Offense manager if it gets a little too bloody.
				const allEnemyCreeps = task.targetRoom
					.find(FIND_HOSTILE_CREEPS)
					.filter(creep => !toolFriends.isFriendly(creep));
				const hostiles = allEnemyCreeps.filter(
					creep =>
						creep.getActiveBodyparts(ATTACK) +
							creep.getActiveBodyparts(RANGED_ATTACK) +
							creep.getActiveBodyparts(HEAL) >
						0
				);

				if (allEnemyCreeps.length > 0 && hostiles.length === 0) {
					task.guardType = "remote-miner-cheap";
					task.neededCreeps = 1;
				} else {
					let bigBoys = 0;
					for (const creep of hostiles) {
						if (
							creep.getActiveBodyparts(ATTACK) +
								creep.getActiveBodyparts(RANGED_ATTACK) +
								creep.getActiveBodyparts(HEAL) >
							12
						) {
							bigBoys++;
							task.guardType = "remote-miner-huge";
						}
					}
					if (bigBoys > 0) {
						task.neededCreeps = bigBoys + 1;
					}
					if (bigBoys > 3) {
						console.log(
							`[guard] [${task.id}] has a lot of really big enemy creeps. Maybe we should hand it over to the offense manager? (TODO)`
						);
						task.neededCreeps = 0;
					}
				}
			}
		}
	},

	/**
	 * Creates a new guard task for the given room.
	 *
	 * Automatically determines the type of guard needed. Requires vision of the room.
	 */
	autoCreateGuardTask(room: Room): void {
		const newTask = new GuardTask();
		const isTreasureRoom = util.isTreasureRoom(room.name);
		const foundInvaderCore: StructureInvaderCore = _.first(
			room.find(FIND_HOSTILE_STRUCTURES, {
				filter: struct => struct.structureType === STRUCTURE_INVADER_CORE,
			})
		);
		const isRemoteMiningRoom = !!_.find(Memory.remoteMining.targets, target => target.roomName === room.name);
		const allEnemyCreeps = room.find(FIND_HOSTILE_CREEPS).filter(creep => !toolFriends.isFriendly(creep));
		const hostiles = allEnemyCreeps.filter(
			creep =>
				creep.getActiveBodyparts(ATTACK) +
					creep.getActiveBodyparts(RANGED_ATTACK) +
					creep.getActiveBodyparts(HEAL) >
				0
		);

		if (hostiles.length === 0 && !foundInvaderCore) {
			console.log(`[guard] room ${room.name} is not in danger, has no hostiles or invader core`);
			return;
		}

		console.log(
			`[guard] creating new task for room ${room.name} (${newTask.id}) enemies: ${allEnemyCreeps.length} hostiles: ${hostiles.length}`
		);

		if (!isTreasureRoom) {
			if (allEnemyCreeps.length === 0 && !foundInvaderCore) {
				console.log(`[guard] room ${room.name} is not in danger`);
				return;
			}

			newTask.neededCreeps = Math.max(hostiles.length, 1);
		}

		newTask._targetRoom = room.name;
		if (isTreasureRoom) {
			newTask.guardType = "treasure";
			newTask.neededCreeps = 2;
		} else if (foundInvaderCore && !foundInvaderCore.ticksToDeploy) {
			newTask.guardType = "invader-subcore";
			newTask.neededCreeps = 1;
		} else if (isRemoteMiningRoom) {
			if (allEnemyCreeps.length > 0 && hostiles.length === 0) {
				newTask.guardType = "remote-miner-cheap";
				newTask.neededCreeps = 1;
			} else {
				// TODO: I really need to figure out a better way to build creeps that can counter an arbitrary amount of creeps
				for (const creep of hostiles) {
					if (
						creep.getActiveBodyparts(ATTACK) +
							creep.getActiveBodyparts(RANGED_ATTACK) +
							creep.getActiveBodyparts(HEAL) >
						12
					) {
						newTask.guardType = "remote-miner-huge";
						newTask.neededCreeps = 2;
						break;
					}
				}
			}
		} else {
			newTask.guardType = "default";
		}
		this.tasks.push(newTask);
		Memory.guard.tasksMade++;

		if (isRemoteMiningRoom) {
			JobRunner.getInstance().forceRunNextTick("command-remote-mining");
		}
	},

	/**
	 * Assigns guard tasks to guardian creeps, or spawn new guardians if needed.
	 */
	assignGuardTasks(): void {
		const guardians = util.getCreeps(Role.Guardian);

		// unassign creeps from completed or invalid tasks
		for (const guardian of guardians) {
			if (!guardian.memory.taskId) {
				continue;
			}
			const task = this.getTask(guardian.memory.taskId);
			if (!task || task.complete) {
				delete guardian.memory.taskId;
			}
		}

		// remove dead creeps from guard tasks
		for (const task of this.tasks) {
			task.assignedCreeps = _.filter(task.assignedCreeps, c => Game.creeps[c]);
		}

		// assign guardians to tasks
		const unfulfilledTasks = _.filter(
			this.tasks,
			task => !task.complete && task.assignedCreeps.length < task.neededCreeps
		);
		for (const task of unfulfilledTasks) {
			if (!task.isEnabled) {
				continue;
			}
			const idleGuardians = _.filter(guardians, guardian => !guardian.memory.taskId);
			const idleGuardiansMatching = _.filter(
				idleGuardians,
				guardian => guardian.memory.guardType === task.guardType
			);

			if (idleGuardiansMatching.length > 0) {
				idleGuardiansMatching[0].memory.taskId = task.id;
				task.assignedCreeps.push(idleGuardiansMatching[0].name);
			} else if (idleGuardians.length > 0) {
				idleGuardians[0].memory.taskId = task.id;
				task.assignedCreeps.push(idleGuardians[0].name);
			} else {
				const creepBody = this.getGuardianBody(task.guardType);
				const targetSpawnRooms = util.findClosestOwnedRooms(
					new RoomPosition(25, 25, task._targetRoom),
					room =>
						room.energyAvailable >= room.energyCapacityAvailable * 0.8 &&
						room.energyAvailable >= util.getCreepSpawnCost(creepBody)
				);
				let targetSpawn = null;
				for (const room of targetSpawnRooms) {
					const spawns = util.getStructures(room, STRUCTURE_SPAWN).filter(s => !s.spawning);
					if (spawns.length === 0) {
						continue;
					}
					targetSpawn = spawns[0];
					break;
				}

				if (!targetSpawn) {
					console.log("[guardians] Unable to spawn new guardians");
					break;
				}
				const creepName = `guardian_${Game.time.toString(32)}`;
				const newCreepMem = {
					role: "guardian",
					stage: 0,
					keepAlive: false,
					renewing: false,
					taskId: task.id,
					guardType: task.guardType,
				};
				if (task.guardType === "treasure") {
					newCreepMem.keepAlive = true;
				}
				if (targetSpawn.spawnCreep(creepBody, creepName, { memory: newCreepMem }) === OK) {
					console.log(`[guardians] Spawned new ${task.guardType} guardian for ${task.id}`);
					task.assignedCreeps.push(creepName);
					Memory.guard.guardiansSpawned++;
				} else {
					console.log("[guardians] Failed to spawn guardian creep for unknown reasons");
				}
			}
		}
	},

	getGuardianBody(guardType: string): BodyPartConstant[] {
		if (guardType === "max") {
			// TODO: build the biggest creep possible
			// eslint-disable-next-line prettier/prettier
			return [TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK];
		} else if (guardType === "treasure") {
			// eslint-disable-next-line prettier/prettier
			return [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,HEAL,HEAL,HEAL,HEAL,HEAL,MOVE];
		} else if (guardType === "invader-subcore") {
			// used for killing invader cores that have expanded out from the main one.
			// eslint-disable-next-line prettier/prettier
			return [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK];
		} else if (guardType === "remote-miner-cheap") {
			// eslint-disable-next-line prettier/prettier
			return [MOVE, MOVE, ATTACK, ATTACK, MOVE]
		} else if (guardType === "remote-miner-huge") {
			// eslint-disable-next-line prettier/prettier
			return [RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,HEAL,HEAL,HEAL,HEAL,MOVE];
		} else {
			if (util.getOwnedRooms().length > 2) {
				// eslint-disable-next-line prettier/prettier
				return [TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK];
			} else {
				// eslint-disable-next-line prettier/prettier
				return [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,RANGED_ATTACK,RANGED_ATTACK,ATTACK,ATTACK,ATTACK,ATTACK];
			}
		}
	},

	runTasks(): void {
		for (const task of this.tasks) {
			if (task.complete) {
				continue;
			}
			console.log(
				`[guard] running task ${task.id} - creeps: ${task.assignedCreeps.length}/${task.neededCreeps} ${
					task.waiting ? "waiting" : "active"
				} ${task.isEnabled ? "enabled" : `disabled (${task.disableUntil - Game.time} remaining)`}`
			);
			if (!task.isEnabled) {
				continue;
			}
			if (task._currentTarget && !task.currentTarget) {
				delete task._currentTarget;
			}

			if (task.currentTarget) {
				console.log(`[guard] [${task.id}] currentTarget: ${task.currentTarget} at ${task.currentTarget.pos}`);
				const offset = 0.7;
				new RoomVisual(task.currentTarget.pos.roomName).poly(
					[
						[task.currentTarget.pos.x, task.currentTarget.pos.y - offset],
						[task.currentTarget.pos.x + offset, task.currentTarget.pos.y],
						[task.currentTarget.pos.x, task.currentTarget.pos.y + offset],
						[task.currentTarget.pos.x - offset, task.currentTarget.pos.y],
						[task.currentTarget.pos.x, task.currentTarget.pos.y - offset],
					],
					{
						stroke: "#ffff00",
						strokeWidth: 0.07,
						opacity: 0.5,
					}
				);
			}

			const creeps = _.map(task.assignedCreeps, name => Game.creeps[name]);
			const guardsUnavailable = creeps.filter(c => c.spawning || c.memory.renewing).length;

			if (task.waiting) {
				if (
					(task.currentTarget && task.currentTarget.owner.username === "Source Keeper") ||
					(guardsUnavailable === 0 && creeps.length === task.neededCreeps)
				) {
					task.waiting = false;
				}
			} else {
				if (creeps.length === 0) {
					task.waiting = true;
				}
			}

			if (task.targetRoom) {
				const foundInvaderCore: StructureInvaderCore = _.first(
					task.targetRoom.find(FIND_HOSTILE_STRUCTURES, {
						filter: struct => struct.structureType === STRUCTURE_INVADER_CORE,
					})
				);
				if (foundInvaderCore && foundInvaderCore.level > 0 && foundInvaderCore.effects.length > 0) {
					const collapseEffect = _.find(
						foundInvaderCore.effects,
						effect => effect.effect === EFFECT_COLLAPSE_TIMER
					);
					if (!collapseEffect) {
						console.log("[guard] Found main invader core, it's spawning in. We'll have to evacuate soon.");
						continue;
					}
					task.disableUntil = Game.time + collapseEffect.ticksRemaining;
					console.log(
						`[guard] Found main invader core, disabling task ${task.id} until ${task.disableUntil}`
					);
					continue;
				}
			}

			// FIXME: store all hostile ids in memory as `allTargets`
			let hostiles: Creep[] = [];
			if (task.targetRoom) {
				hostiles = task.targetRoom.find(FIND_HOSTILE_CREEPS);
			}

			if (!task._currentTarget && task.targetRoom) {
				if (task.guardType === "treasure") {
					const hostileStructures = task.targetRoom.find(FIND_HOSTILE_STRUCTURES);
					const towers = hostileStructures.filter(struct => struct.structureType === STRUCTURE_TOWER);
					if (towers.length > 0) {
						task._currentTarget = towers[0].id;
					} else {
						hostiles = task.targetRoom.find(FIND_HOSTILE_CREEPS, {
							filter: hostile => {
								if (hostile.owner.username !== "Source Keeper") {
									return true;
								}
								const struct = _.first(
									hostile.pos.findInRange(FIND_HOSTILE_STRUCTURES, 8, {
										filter: s => s.structureType === STRUCTURE_KEEPER_LAIR,
									})
								);
								if (struct) {
									return !!_.find(
										Memory.remoteMining.targets,
										target => target.keeperLairId === struct.id
									);
								} else {
									return true;
								}
							},
						});

						if (hostiles.length > 0) {
							// prioritize creeps that can heal
							hostiles = _.sortByOrder(
								hostiles,
								[
									c => {
										return c.owner.username !== "Source Keeper";
									},
									c => {
										return c.getActiveBodyparts(HEAL);
									},
									c => {
										return c.getActiveBodyparts(RANGED_ATTACK) + c.getActiveBodyparts(ATTACK);
									},
								],
								["desc", "desc", "desc"]
							);

							task._currentTarget = hostiles[0].id;
						} else {
							const keeperLairs = hostileStructures.filter(
								struct =>
									struct.structureType === STRUCTURE_KEEPER_LAIR &&
									_.find(Memory.remoteMining.targets, target => target.keeperLairId === struct.id)
							) as StructureKeeperLair[];
							if (keeperLairs) {
								keeperLairs.sort((a, b) => (a.ticksToSpawn ?? 0) - (b.ticksToSpawn ?? 0));
								task._currentTarget = keeperLairs[0].id;
							}
						}
					}
				} else if (task.guardType === "invader-subcore") {
					const invaderCores = task.targetRoom.find(FIND_HOSTILE_STRUCTURES, {
						filter: struct => struct.structureType === STRUCTURE_INVADER_CORE,
					});
					if (invaderCores.length > 0) {
						task._currentTarget = invaderCores[0].id;
					} else {
						task.complete = true;
						console.log("[guard] task", task.id, "completed");
						continue;
					}
				} else {
					hostiles = task.targetRoom.find(FIND_HOSTILE_CREEPS);

					if (hostiles.length === 0) {
						task.complete = true;
						console.log("[guard] task", task.id, "completed");
						continue;
					} else {
						if (!task.currentTarget) {
							delete task._currentTarget;
						}
						hostiles = _.sortByOrder(
							hostiles,
							[
								c => {
									return c.getActiveBodyparts(HEAL);
								},
								c => {
									return c.getActiveBodyparts(RANGED_ATTACK) + c.getActiveBodyparts(ATTACK);
								},
							],
							["desc", "desc"]
						);
						task._currentTarget = hostiles[0].id;
					}
				}
			}

			if (
				task.guardType === "treasure" &&
				task.currentTarget instanceof StructureKeeperLair &&
				!task.currentTarget.ticksToSpawn
			) {
				const hostilesAroundLair = task.currentTarget.pos.findInRange(FIND_HOSTILE_CREEPS, 7);
				if (hostilesAroundLair.length > 0) {
					task._currentTarget = hostilesAroundLair[0].id;
				}
			}

			// let creepsInRange = _.filter(creeps, creep => creep.pos.inRangeTo(task.currentTarget, 3)); // guards that are in range of the current target
			for (const creep of creeps) {
				creep.notifyWhenAttacked(false);
				if (creep.spawning || creep.memory.renewing) {
					creep.memory.renewForceAmount = 1400;
					continue;
				}

				if (!task.currentTarget && creep.room.name !== task._targetRoom && !task.targetRoom) {
					console.log(`[guard] no vision of ${task._targetRoom}, moving to center`);
					cartographer.moveTo(creep, { pos: new RoomPosition(25, 25, task._targetRoom), range: 10 });
					continue;
				}

				if (creep.getActiveBodyparts(HEAL) > 0) {
					if (creep.hits < creep.hitsMax) {
						creep.log("[guard] healing self");
						creep.heal(creep);
					} else if (task.currentTarget && !creep.pos.inRangeTo(task.currentTarget, 3)) {
						const creepsNeedHeal = _.filter(creeps, c => {
							if (c.name === creep.name) {
								return false;
							}
							return c.hits < c.hitsMax && creep.pos.inRangeTo(c, 3);
						});
						if (creepsNeedHeal.length > 0) {
							if (creep.pos.isNearTo(creepsNeedHeal[0])) {
								creep.log("[guard] healing other guard");
								creep.heal(creepsNeedHeal[0]);
							} else {
								creep.log("[guard] ranged healing other guard");
								creep.rangedHeal(creepsNeedHeal[0]);
							}
						} else {
							// passively heal other friendly creeps in range.
							const otherCreepsNeedHeal = creep.pos.findInRange(FIND_CREEPS, 3).filter(c => {
								return toolFriends.isFriendly(c) && c.hits < c.hitsMax;
							});
							if (otherCreepsNeedHeal.length > 0) {
								if (creep.pos.isNearTo(otherCreepsNeedHeal[0])) {
									creep.log("[guard] healing other friendly creep");
									creep.heal(otherCreepsNeedHeal[0]);
								} else {
									creep.log("[guard] ranged healing friendly creep");
									creep.rangedHeal(otherCreepsNeedHeal[0]);
								}
							}
						}
					}
				}

				if (task.currentTarget) {
					const rangeToTarget = creep.pos.getRangeTo(task.currentTarget);
					const isTargetInRange = rangeToTarget <= 3;
					const hostilesAdjacent = _.filter(hostiles, hostile => creep.pos.inRangeTo(hostile, 1));
					const hostilesInRange = _.filter(hostiles, hostile => creep.pos.inRangeTo(hostile, 3));
					const hostileHealdersInRange = _.filter(
						hostilesInRange,
						hostile => hostile.getActiveBodyparts(HEAL) > 0
					);
					const rangedAttackEffectiveness = creep.getActiveBodyparts(RANGED_ATTACK) * RANGED_ATTACK_POWER; // Estimation of how much damage we will do to the target with a ranged attack.
					const rangedMassAttackEffectiveness =
						rangedAttackEffectiveness * (MASS_ATTACK_DISTANCE_MULTIPLIER[rangeToTarget] ?? 0); // Estimation of how much damage we will do to the target with a mass attack.
					const targetHealEffectiveness =
						task.currentTarget instanceof Creep
							? task.currentTarget.getActiveBodyparts(HEAL) * HEAL_POWER
							: 0;

					let shouldMassAttack = false;
					// Needs to prioritize focusing down creeps that can heal
					if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
						if (isTargetInRange) {
							if (rangeToTarget === 1 && hostilesInRange.length > 1) {
								shouldMassAttack = true;
							} else if (rangedMassAttackEffectiveness <= targetHealEffectiveness) {
								shouldMassAttack = false;
							} else if (hostileHealdersInRange.length === 0 && hostilesInRange.length >= 3) {
								shouldMassAttack = true;
							} else if (rangeToTarget === 1) {
								shouldMassAttack = true;
							}
						} else if (hostilesInRange.length >= 2) {
							shouldMassAttack = true;
						}
					}

					if (task.currentTarget instanceof Creep) {
						console.log(`[guard] attacking creep, range=${rangeToTarget}`);
						if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
							if (shouldMassAttack) {
								creep.rangedMassAttack();
								if (rangeToTarget === 1) {
									let dir = creep.pos.getDirectionTo(task.currentTarget);
									if (
										task.currentTarget.getActiveBodyparts(ATTACK) > 0 &&
										creep.getActiveBodyparts(ATTACK) === 0
									) {
										dir = util.getOppositeDirection(dir);
									}
									creep.move(dir);
								}
							} else if (isTargetInRange) {
								creep.rangedAttack(task.currentTarget);
							} else if (hostilesInRange.length === 1) {
								creep.rangedAttack(hostilesInRange[0]);
							}
						}
						if (creep.getActiveBodyparts(ATTACK) > 0 && rangeToTarget === 1) {
							creep.attack(task.currentTarget);
							creep.move(creep.pos.getDirectionTo(task.currentTarget));
						} else if (creep.getActiveBodyparts(MOVE) === 0 && rangeToTarget > 1) {
							if (creep.getActiveBodyparts(ATTACK) > 0 && hostilesAdjacent.length > 0) {
								creep.attack(hostilesAdjacent[0]);
							}
						}

						if (task.waiting) {
							creep.say("waiting");
							creep.log("waiting for other guards to finish spawning");
							const remoteMiningTarget = _.find(Memory.remoteMining.targets, {
								roomName: task._targetRoom,
							});
							if (remoteMiningTarget && remoteMiningTarget.dangerPos) {
								const danger = remoteMiningTarget.dangerPos[2];
								const dangerPos = new RoomPosition(danger.x, danger.y, danger.roomName);
								cartographer.moveTo(creep, dangerPos);
							} else {
								if (!creep.memory.stagingObjectId) {
									creep.memory.stagingObjectId = util.getSpawn(
										util.findClosestOwnedRooms(creep.pos)[0]
									).id;
								}
								cartographer.moveTo(creep, Game.getObjectById(creep.memory.stagingObjectId), {
									ensurePath: true,
									avoidRooms: [task._targetRoom],
								});
							}
						} else {
							const minRange =
								task.currentTarget.getActiveBodyparts(ATTACK) > 0 &&
								creep.getActiveBodyparts(RANGED_ATTACK) > 0
									? 2
									: 1;
							if (!creep.pos.inRangeTo(task.currentTarget, minRange)) {
								cartographer.moveTo(
									creep,
									{ pos: task.currentTarget.pos, range: minRange },
									{
										avoidCreeps: true,
									}
								);
							}
						}
					} else if (task.guardType === "treasure" && task.currentTarget instanceof StructureTower) {
						console.log(`[guard] attacking tower, range=${rangeToTarget}`);

						if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
							if (shouldMassAttack) {
								creep.rangedMassAttack();
								if (rangeToTarget === 1) {
									creep.move(creep.pos.getDirectionTo(task.currentTarget));
								}
							} else if (isTargetInRange) {
								creep.rangedAttack(task.currentTarget);
							} else if (hostilesInRange.length === 1) {
								creep.rangedAttack(hostilesInRange[0]);
							}
						}
						if (creep.getActiveBodyparts(ATTACK) > 0 && rangeToTarget === 1) {
							creep.attack(task.currentTarget);
							creep.move(creep.pos.getDirectionTo(task.currentTarget));
						}

						const minRange = 1;
						if (!creep.pos.inRangeTo(task.currentTarget, minRange)) {
							cartographer.moveTo(
								creep,
								{ pos: task.currentTarget.pos, range: minRange },
								{
									avoidCreeps: true,
								}
							);
						}
					} else if (task.guardType === "treasure" && task.currentTarget instanceof StructureKeeperLair) {
						console.log("[guard] waiting by keeper lair");
						if (!creep.pos.inRangeTo(task.currentTarget, 2)) {
							cartographer.moveTo(creep, { pos: task.currentTarget.pos, range: 2 });
						}
					} else if (
						task.guardType === "invader-subcore" &&
						task.currentTarget instanceof StructureInvaderCore
					) {
						if (creep.pos.isNearTo(task.currentTarget)) {
							if (creep.getActiveBodyparts(ATTACK)) {
								creep.attack(task.currentTarget);
							}
						} else {
							cartographer.moveTo(creep, task.currentTarget);
						}
					} else {
						console.log("[guard] ERR: unknown current target");
					}
				}
			}
		}
	},
};
