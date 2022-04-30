import util from "./util";
import { OffenseTask } from "./offense/task";
import { CREEP_BODIES } from "./offense/util";

const TASK_PREPARE = 0
const TASK_RUN = 1

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
			try {
				task.run(i);
			} catch (e) {
				util.printException(e);
			}
			Memory.offense.tasks[i] = _.omit(task, "creeps");

			vis.text(`${task.strategy.name}: state: ${task.state}, started: ${task.manualStart}, creeps: ${task.creeps.length} strategy ${JSON.stringify(_.omit(task.strategy, "name"))}`, 25, 30 + i)
		}
	},
}

global.Offense = {
	spawn(taskIdx, creepType, spawnName="Spawn6") {
		// HACK: kinda hardcoded spawn
		let creepName = `offense_${Game.time.toString(16)}` // _${Math.floor(Math.random() * 64).toString(16)}
		let result = Game.spawns[spawnName].spawnCreep(CREEP_BODIES[creepType], creepName, {
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

	create(strategyName, init={}) {
		init.name = strategyName;
		let task = new OffenseTask({
			strategy: init,
		});
		Memory.offense.tasks.push(_.omit(task, "creeps"));
	},

	pause(taskIdx) {
		Object.assign(Memory.offense.tasks[taskIdx], {
			state: TASK_PREPARE,
			manualStart: false
		})
	},

	reset(taskIdx) {
		Object.assign(Memory.offense.tasks[taskIdx], {
			state: TASK_PREPARE,
			manualStart: false
		})
		if (Memory.offense.tasks[taskIdx].strategy.name === "LureHarrass") {
			Object.assign(Memory.offense.tasks[taskIdx].strategy, {
				state: 0,
				currentTargetId: ""
			})
		}
	},

	start(taskIdx) {
		Object.assign(Memory.offense.tasks[taskIdx], {
			manualStart: true
		})
	},

	/**
	 * If applicable, set the target object of the task.
	 */
	setTarget(taskIdx, target) {
		if (Memory.offense.tasks[taskIdx].strategy.name === "LureHarrass" || Memory.offense.tasks[taskIdx].strategy.name === "SimpleManual") {
			Object.assign(Memory.offense.tasks[taskIdx].strategy, {
				currentTargetId: target
			})
			return "Target was set."
		}
		else {
			return "setTarget is not available for this strategy."
		}
	}
}

export default module.exports;
