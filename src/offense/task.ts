import util from '../util';
import { Role } from "../roles/meta";
import { OffenseStrategy } from "../strategies/BaseStrategy";
import { Strategies } from "../strategies/all";
import { CREEP_BODIES } from "./util";

const TASK_PREPARE = 0;
const TASK_RUN = 1;

export class OffenseTask {
	creepNames: string[];
	state: typeof TASK_PREPARE | typeof TASK_RUN;
	manualStart: boolean = false;
	autoSpawn: boolean = false;
	strategy: unknown;

	constructor(mem: unknown) {
		this.creepNames = [];
		this.state = TASK_PREPARE;
		this.manualStart = false;
		this.autoSpawn = false;
		this.strategy = {}
		Object.assign(this, mem)
	}

	get creeps(): Creep[] {
		return this.creepNames.map(name => Game.creeps[name])
	}

	setState(s: typeof this.state) {
		console.log(`Offense task: state ${this.state} => ${s}`)
		this.state = s
	}

	getStrategy(): OffenseStrategy {
		// @ts-expect-error FIXME: The whole offense module needs to be reworked from the ground up to use typescript.
		let Strategy = _.find(Strategies, { name: this.strategy.name })
		let strat = new Strategy(this.strategy)
		return strat;
	}

	run(task_idx: number) {
		// HACK: force creep role
		this.creeps.forEach(creep => creep.memory.role = Role.Offense)

		let strat = this.getStrategy();
		if (this.state === TASK_PREPARE) {
			if (this.autoSpawn) {
				autoSpawn(task_idx);
			}

			// HACK: hardcoded position
			this.creeps.filter(c => !c.memory.renewing).forEach((creep, idx) => {
				creep.travelTo(new RoomPosition(27 + idx, 6 + task_idx, "W17N11"))

				// healing
				// FIXME: reduce duplicated code
				if (creep.getActiveBodyparts(HEAL) > 0) {
					if (creep.hits < creep.hitsMax) {
						creep.heal(creep);
					} else {
						let needHeal = this.creeps.filter(c => c.hits < c.hitsMax && creep.pos.inRangeTo(c, 3))
						if (!needHeal) {
							creep.heal(creep);
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
			} else if (strat.name === "OvermindRemoteMinerBait" && strat.areCreepRequirementsMet(this.creeps)) {
				this.setState(TASK_RUN)
			}
		} else if (this.state === TASK_RUN) {
			if (this.creeps.length === 0) {
				this.state = TASK_PREPARE;
				this.manualStart = false;
			}

			strat.act(this.creeps)
		} else {
			this.state = TASK_PREPARE;
		}
		this.strategy = strat;
	}
}

/** Quick and dirty automated spawner for Offense tasks. Should be good enough for now. */
export function autoSpawn(task_idx: number) {
	let task = new OffenseTask(Memory.offense.tasks[task_idx]);
	let strat = task.getStrategy();
	// @ts-expect-error FIXME: need to add `c.memory.type` to creep memory to CreepMemory
	let grouped = _.groupBy(task.creeps, c => c.memory.type);
	for (let [type, needCount] of Object.entries(strat.neededCreeps)) {
		let haveCount = grouped[type] ? grouped[type].length : 0;
		if (haveCount < needCount) {
			// TODO: really need some kind of spawn queue to generalize spawning creeps

			let spawns = Object.values(Game.spawns).filter(s => !s.spawning);
			if (spawns.length === 0) {
				// @ts-expect-error
				olog(`Failed to auto spawn for task ${task_idx} ${task.strategy.name}`)
				return;
			}
			spawns = util.shuffle(spawns);

			let creepName = `offense_${Game.time.toString(16)}` // _${Math.floor(Math.random() * 64).toString(16)}
			for (let spawn of spawns) {
				let result = spawn.spawnCreep(CREEP_BODIES[type], creepName, {
					memory: {
						role: Role.Offense,
						keepAlive: true,
						// @ts-expect-error
						type: type,
					}
				})
				if (result === OK) {
					task.creepNames.push(creepName);
					break
				}
			}
		}
	}
}
