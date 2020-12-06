let util = require('util');

const TASK_PREPARE = 0
const TASK_RUN = 1

const STRATEGY_ACT_LURE = 0
const STRATEGY_ACT_ATTACK = 1

class OffenseStrategy {
	get neededCreeps() {

	}

	areCreepRequirementsMet(creeps) {
		let grouped = _.groupBy(creeps, c => c.memory.type)
		for (let creepType of _.keys(this.neededCreeps)) {
			if (grouped[creepType].length < this.neededCreeps[creepType]) {
				return false
			}
		}
		return true
	}

	act() {

	}
}

class OffenseTask {
	constructor(mem) {
		this.creepNames = [];
		this.state = TASK_PREPARE;
		this.manualStart = false
		this.strategy = {}
		Object.assign(this, mem)
	}

	get creeps() {
		return this.creepNames.map(name => Game.creeps[name])
	}

	setState(s) {
		console.log(`Offense task: state ${this.state} => ${s}`)
		this.state = s
	}

	run() {
		// HACK: force creep role
		this.creeps.forEach(creep => creep.memory.role = "offense")

		let Strategy = _.find(Strategies, { name:this.strategy.name })
		let strat = new Strategy(this.strategy)
		if (this.state === TASK_PREPARE) {
			// HACK: hardcoded position
			this.creeps.forEach((creep, idx) => {
				creep.travelTo(new RoomPosition(9 + idx, 36, "W16N3"))

				// healing
				// FIXME: reduce duplicated code
				if (creep.getActiveBodyparts(HEAL) > 0) {
					if (creep.hits < creep.hitsMax) {
						creep.heal(creep);
					} else {
						let needHeal = this.creeps.filter(c => c.hits < c.hitsMax && creep.pos.inRangeTo(c, 3))
						if (!needHeal) {
							return;
						}
						let healTarget = needHeal[0]
						if (creep.pos.isNearTo(healTarget)) {
							creep.heal(healTarget)
						} else {
							creep.rangedHeal(healTarget)
						}
					}
				}
			})
			if (this.manualStart && strat.areCreepRequirementsMet(this.creeps)) {
				this.setState(TASK_RUN)
			}
		} else if (this.state === TASK_RUN) {
			strat.act(this.creeps)
		} else {
			this.state = TASK_PREPARE;
		}
		this.strategy = strat;
	}
}

class OffenseStrategyLureHarrass extends OffenseStrategy {
	static get name() {
		return "LureHarrass"
	}

	constructor(mem) {
		super(mem)
		this.state = STRATEGY_ACT_LURE;
		// HACK: hardcoded room
		this.targetRoom = "W16N2";
		this.currentTargetId = "";
		Object.assign(this, mem)
	}

	get neededCreeps() {
		return {
			"generic-attack": 2,
			"healer": 1,
		};
	}

	get currentTarget() {
		return Game.getObjectById(this.currentTargetId)
	}

	act(creeps) {
		let grouped = _.groupBy(creeps, c => c.memory.type)
		let attackers = grouped["generic-attack"]
		let healers = grouped["healer"]
		let targetRoomVision = !!Game.rooms[this.targetRoom]

		// healing
		healers.forEach(creep => {
			if (creep.hits < creep.hitsMax) {
				creep.heal(creep);
			} else {
				let needHeal = creeps.filter(c => c.hits < c.hitsMax && creep.pos.inRangeTo(c, 3))
				if (!needHeal) {
					return;
				}
				let healTarget = needHeal[0]
				if (creep.pos.isNearTo(healTarget)) {
					creep.heal(healTarget)
				} else {
					creep.rangedHeal(healTarget)
				}
			}
		})

		if (targetRoomVision) {
			// state changes
			let room = Game.rooms[this.targetRoom];
			let hostiles = room.find(FIND_HOSTILE_CREEPS)
			let dangerousHostiles = hostiles.filter(c => c.getActiveBodyparts(ATTACK) + c.getActiveBodyparts(RANGED_ATTACK) + c.getActiveBodyparts(HEAL) > 0)
			let hostileStructures = room.find(FIND_HOSTILE_STRUCTURES)
			let towers = hostileStructures.filter(s => s.structureType === STRUCTURE_TOWER)
			let spawns = hostileStructures.filter(s => s.structureType === STRUCTURE_SPAWN)
			console.log(`offense: dangerousHostiles ${dangerousHostiles.length} towers: ${_.some(towers, t => t.store[RESOURCE_ENERGY] > 0)}`)

			if (dangerousHostiles.length > 0 || _.some(towers, t => t.store[RESOURCE_ENERGY] > 0)) {
				this.state = STRATEGY_ACT_LURE
			}
			else {
				this.state = STRATEGY_ACT_ATTACK
			}

			if (!this.currentTarget) {
				// determine target
				if (dangerousHostiles.length > 0) {
					this.currentTargetId = dangerousHostiles[0].id
				} else if (towers.length > 0) {
					this.currentTargetId = towers[0].id
				} else if (spawns.length > 0) {
					this.currentTargetId = spawns[0].id
				} else if (hostiles.length > 0) {
					this.currentTargetId = hostiles[0].id
				} else if (hostileStructures.length > 0) {
					this.currentTargetId = hostileStructures[0].id
				} else {
					this.currentTargetId = "";
				}
			}
		}

		// HACK: hardcoded positions
		if (this.state === STRATEGY_ACT_LURE) {
			const baseX = 17;
			healers.forEach((creep, idx) => {
				creep.travelTo(new RoomPosition(baseX + idx, 47, "W16N3"));
			})
			attackers.forEach((creep, idx) => {
				if (creep.hitsMax - creep.hits > 400) {
					creep.travelTo(new RoomPosition(baseX + idx, 48, "W16N3"))
				} else {
					creep.travelTo(new RoomPosition(baseX + idx, 1, "W16N2"))
				}
			})
		} else if (this.state === STRATEGY_ACT_ATTACK) {
			healers.forEach((creep, idx) => {
				creep.travelTo(attackers[idx], { movingTarget: true });
			})

			attackers.forEach((creep, idx) => {
				if (creep.pos.isNearTo(this.currentTarget)) {
					creep.attack(this.currentTarget);
					creep.move(creep.pos.getDirectionTo(this.currentTarget));
				} else {
					creep.travelTo(this.currentTarget);
				}
			})
		} else {
			this.state = STRATEGY_ACT_LURE;
		}
	}
}

const Strategies = [OffenseStrategyLureHarrass];
const CREEP_BODIES = {
	"generic-attack": [TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE],
	"healer": [MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,MOVE],
}

module.exports = {
	run() {
		if (!Memory.offense) {
			Memory.offense = {};
		}
		Memory.offense = _.defaultsDeep(Memory.offense, {
			tasks: [],
		});

		let vis = new RoomVisual();

		for (let i = 0; i < Memory.offense.tasks.length; i++) {
			Memory.offense.tasks[i].creepNames = Memory.offense.tasks[i].creepNames.filter(c => !!Game.creeps[c])
			let task = new OffenseTask(Memory.offense.tasks[i]);
			task.run();
			Memory.offense.tasks[i] = _.omit(task, "creeps");

			vis.text(`${task.strategy.name}: state: ${task.state}, started: ${task.manualStart}, creeps: ${task.creeps.length} strategy ${JSON.stringify(_.omit(task.strategy, "name"))}`, 25, 25)
		}
	},
}

global.Offense = {
	spawn(taskIdx, creepType) {
		// HACK: hardcoded spawn
		let creepName = `${creepType}_${Game.time.toString(16)}` // _${Math.floor(Math.random() * 64).toString(16)}
		let result = Game.spawns["Spawn1"].spawnCreep(CREEP_BODIES[creepType], creepName, {
			memory: {
				role: "offense",
				keepAlive: true,
				type: creepType,
			}
		})
		if (result === OK) {
			Memory.offense.tasks[taskIdx].creepNames.push(creepName);
		}

		return `Spawn result ${result}: ${creepName}`
	},

	renewAll(taskIdx) {
		Memory.offense.tasks[taskIdx].creepNames.forEach(name => {
			Game.creeps[name].memory.renewing = true;
			Game.creeps[name].memory.renew_force_amount = 1400;
		})
	},

	create(strategy) {
		let task = new OffenseTask({ strategy: { name: strategy } })
		Memory.offense.tasks.push(_.omit(task, "creeps"));
	},

	pause(taskIdx) {
		Object.assign(Memory.offense.tasks[taskIdx], {
			state: TASK_PREPARE,
			manualStart: false
		})
	},

	start(taskIdx) {
		Object.assign(Memory.offense.tasks[taskIdx], {
			manualStart: true
		})
	}
}