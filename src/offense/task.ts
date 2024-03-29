import * as cartographer from "screeps-cartographer";
import { CREEP_BODIES, olog } from "./util";
import { NotImplementedException } from "utils/exceptions";
import { ObserveQueue } from "../observequeue";
import { OffenseStrategy } from "../strategies/BaseStrategy";
import { Role } from "../roles/meta";
import { Strategies } from "../strategies/all";
import { areAllCreepsInRange } from "combat/movement";
import util from "../util";

const TASK_PREPARE = 0;
const TASK_RUN = 1;

// FIXME: hard coded for now
const STAGING_POSITION = new RoomPosition(6, 42, "W16N9");

export class OffenseTask {
	public creepNames: string[];
	public state: typeof TASK_PREPARE | typeof TASK_RUN;
	public manualStart = false;
	public autoSpawn = true;
	public autoStart = false;
	public strategyName: string;
	public strategy: unknown;

	public constructor(mem: { strategyName: string }) {
		this.creepNames = [];
		this.state = TASK_PREPARE;
		this.strategyName = mem.strategyName;
		this.strategy = {};
		Object.assign(this, mem);
	}

	public get creeps(): Creep[] {
		return this.creepNames.map(name => Game.creeps[name]);
	}

	public setState(s: typeof this.state): void {
		console.log(`Offense task: state ${this.state} => ${s}`);
		this.state = s;
	}

	public getStrategy(): OffenseStrategy {
		const Strategy = _.find(Strategies, { strategyName: this.strategyName });
		const strat = new Strategy(this.strategy);
		return strat;
	}

	public run(taskIdx: number): void {
		// HACK: force creep role
		this.creeps.forEach(creep => (creep.memory.role = Role.Offense));

		const strat = this.getStrategy();
		if (this.state === TASK_PREPARE) {
			if (this.autoSpawn) {
				autoSpawn(taskIdx);
			}

			// HACK: hardcoded position
			this.creeps
				.filter(c => !c.memory.renewing)
				.forEach((creep, idx) => {
					const stagingPos = new RoomPosition(
						(STAGING_POSITION.x - Math.floor(this.creeps.length / 2)).clamp(1, 48) + idx,
						STAGING_POSITION.y + taskIdx,
						STAGING_POSITION.roomName
					);
					cartographer.moveTo(creep, stagingPos);

					// healing
					// FIXME: reduce duplicated code
					if (creep.getActiveBodyparts(HEAL) > 0) {
						if (creep.hits < creep.hitsMax) {
							creep.heal(creep);
						} else {
							const needHeal = this.creeps.filter(c => c.hits < c.hitsMax && creep.pos.inRangeTo(c, 3));
							if (!needHeal) {
								creep.heal(creep);
								return;
							}
							const healTarget = needHeal[0];
							if (creep.pos.isNearTo(healTarget)) {
								creep.heal(healTarget);
							} else {
								creep.rangedHeal(healTarget);
							}
						}
					}
				});

			if (
				this.autoStart &&
				strat.areCreepRequirementsMet(this.creeps) &&
				areAllCreepsInRange(this.creeps, STAGING_POSITION, Math.ceil(this.creeps.length / 2))
			) {
				this.setState(TASK_RUN);
			} else if (this.manualStart && strat.areCreepRequirementsMet(this.creeps)) {
				this.setState(TASK_RUN);
			} else if (strat.strategyName === "OvermindRemoteMinerBait" && strat.areCreepRequirementsMet(this.creeps)) {
				this.setState(TASK_RUN);
			}
		} else if (this.state === TASK_RUN) {
			if (this.creeps.length === 0) {
				this.state = TASK_PREPARE;
				this.manualStart = false;
			}

			strat.act(this.creeps);
		} else {
			this.state = TASK_PREPARE;
		}
		this.strategy = strat;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public setTarget(target: _HasId): void {
		throw new NotImplementedException("OffenseTask.setTarget");
	}
}

/** Quick and dirty automated spawner for Offense tasks. Should be good enough for now. */
export function autoSpawn(taskIdx: number): void {
	const task = new OffenseTask(Memory.offense.tasks[taskIdx]);
	const strat = task.getStrategy();
	const grouped = _.groupBy(task.creeps, c => c.memory.type);
	for (const [type, needCount] of Object.entries(strat.neededCreeps)) {
		const haveCount = grouped[type] ? grouped[type].length : 0;
		if (haveCount < needCount) {
			// TODO: really need some kind of spawn queue to generalize spawning creeps

			const closestRooms = util.findClosestOwnedRooms(STAGING_POSITION).map(r => r.name);
			let spawns = Object.values(Game.spawns).filter(s => !s.spawning);
			if (spawns.length === 0) {
				olog(`Failed to auto spawn for task ${taskIdx} ${task.strategyName}`);
				return;
			}
			spawns = _.sortBy(spawns, s => closestRooms.indexOf(s.room.name));

			const creepName = `offense_${Game.time.toString(16)}`; // _${Math.floor(Math.random() * 64).toString(16)}
			for (const spawn of spawns) {
				const result = spawn.spawnCreep(CREEP_BODIES[type], creepName, {
					// @ts-expect-error this is all the info the creep needs
					memory: {
						role: Role.Offense,
						keepAlive: true,
						type,
					},
				});
				if (result === OK) {
					task.creepNames.push(creepName);
					break;
				}
			}
		}
	}
}

export function hackAutoControllerAttack(): void {
	const targetRoom = "W18N8";
	const room = Game.rooms[targetRoom];
	const claimers = util.getCreeps(Role.Claimer);
	if (claimers.filter(c => c.memory.targetRoom === targetRoom).length > 0) {
		olog("Claimer spawned, waiting");
		return;
	}

	if (room) {
		const controller = room.controller;
		if (!controller) {
			return;
		}
		if (controller.my) {
			olog("Controller is already aquired");
			return;
		}
		// account for travel time
		if (controller.upgradeBlocked > 250) {
			olog("Waiting for controller to be attackable");
			return;
		}

		Memory.expansionTarget = targetRoom;
		olog(`Setting expansion target to ${targetRoom} to spawn a claimer.`);
	} else {
		ObserveQueue.queue(targetRoom);
	}
}
