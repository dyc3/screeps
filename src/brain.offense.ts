import { OffenseTask, hackAutoControllerAttack } from "./offense/task";
import { CREEP_BODIES } from "./offense/util";
import { Role } from "roles/meta";
import util from "./util";

const TASK_PREPARE = 0;
const TASK_RUN = 1;

export default {
	run(): void {
		Memory.offense = _.defaultsDeep(Memory.offense, {
			tasks: [],
		});

		const vis = new RoomVisual();

		for (let i = 0; i < Memory.offense.tasks.length; i++) {
			Memory.offense.tasks[i].creepNames = Memory.offense.tasks[i].creepNames.filter(c => !!Game.creeps[c]);
			const task = new OffenseTask(Memory.offense.tasks[i]);
			try {
				task.run(i);
			} catch (e) {
				util.printException(e);
			}
			Memory.offense.tasks[i] = _.omit(task, "creeps");

			vis.text(
				`${task.strategyName}: state: ${task.state}, started: ${task.state === TASK_RUN}, creeps: ${
					task.creeps.length
				} strategy ${JSON.stringify(_.omit(task.strategy, "name"))}`,
				25,
				30 + i
			);
		}

		// hackAutoControllerAttack();
	},
};

global.Offense = {
	spawn(taskIdx: number, creepType: string, spawnName = "Spawn6") {
		// HACK: kinda hardcoded spawn
		const creepName = `offense_${Game.time.toString(16)}`; // _${Math.floor(Math.random() * 64).toString(16)}
		const result = Game.spawns[spawnName].spawnCreep(CREEP_BODIES[creepType], creepName, {
			// @ts-expect-error this is all the offense creep needs
			memory: {
				role: Role.Offense,
				keepAlive: true,
				type: creepType,
			},
		});
		if (result === OK) {
			Memory.offense.tasks[taskIdx].creepNames.push(creepName);
		}

		return `Spawn result ${result}: ${creepName}`;
	},

	renewAll(taskIdx: number): void {
		Memory.offense.tasks[taskIdx].creepNames.forEach(name => {
			Game.creeps[name].memory.renewing = true;
			Game.creeps[name].memory.renewForceAmount = 1400;
		});
	},

	create(strategyName: string, init = {}): void {
		const task = new OffenseTask({
			strategyName,
			strategy: init,
		});
		Memory.offense.tasks.push(_.omit(task, "creeps"));
	},

	pause(taskIdx: number): void {
		Object.assign(Memory.offense.tasks[taskIdx], {
			state: TASK_PREPARE,
			manualStart: false,
		});
	},

	reset(taskIdx: number): void {
		Object.assign(Memory.offense.tasks[taskIdx], {
			state: TASK_PREPARE,
			manualStart: false,
		});
		if (Memory.offense.tasks[taskIdx].strategyName === "LureHarrass") {
			Object.assign(Memory.offense.tasks[taskIdx].strategy, {
				state: 0,
				currentTargetId: "",
			});
		}
	},

	start(taskIdx: number): void {
		Object.assign(Memory.offense.tasks[taskIdx], {
			manualStart: true,
		});
	},

	/**
	 * If applicable, set the target object of the task.
	 */
	setTarget(taskIdx: number, target: Id<Structure | Creep>): string {
		if (
			Memory.offense.tasks[taskIdx].strategyName === "LureHarrass" ||
			Memory.offense.tasks[taskIdx].strategyName === "SimpleManual"
		) {
			Object.assign(Memory.offense.tasks[taskIdx].strategy, {
				currentTargetId: target,
			});
			return "Target was set.";
		} else {
			return "setTarget is not available for this strategy.";
		}
	},
};
