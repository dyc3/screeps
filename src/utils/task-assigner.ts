const UNASSIGNED = -1;

/**
 * Takes a list of workers `W` and tasks `T` and assigns workers to tasks.
 * All workers must be capable of all tasks.
 *
 * Implements Gale-Shapley algorithm to stable match workers to tasks.
 * For reference, other implementations refer to "men" and "women". In this:
 * men -> tasks
 * women -> workers
 */
export class TaskAssigner<W extends PairingComparator<T>, T extends PairingComparator<W>> {
	private workers: W[];
	private tasks: T[];

	/**
	 * The `w`th row of this matrix contains the preferences of the wth worker.
	 * The `t`th element of this row contains the index of the `t`th task in the ranking of the `w`th worker.
	 */
	private workerPreferences: number[][];
	/**
	 * The `t`th row of this matrix contains the preferences of the `t`th task.
	 * The `w`th element of this row contains the index of the `w`th worker in the ranking of the `t`th task.
	 */
	private taskPreferences: number[][];
	/**
	 * The `w`th element of this array contains the index of the task assigned to the `w`th worker.
	 */
	private taskAssignments: number[];

	public constructor(workers: W[], tasks: T[]) {
		this.workers = workers;
		this.tasks = tasks;

		this.workerPreferences = preallocateArray2d(UNASSIGNED, workers.length, tasks.length);
		this.taskPreferences = preallocateArray2d(UNASSIGNED, tasks.length, workers.length);
		this.taskAssignments = preallocateArray(UNASSIGNED, tasks.length);
	}

	private getAssignedTaskIndex(workerIndex: number): number {
		return this.taskAssignments[workerIndex];
	}

	public getAssignedTask(worker: W): T | undefined {
		const workerIndex = this.workers.indexOf(worker);
		const taskIndex = this.getAssignedTaskIndex(workerIndex);
		if (taskIndex === UNASSIGNED) {
			return undefined;
		}
		return this.tasks[taskIndex];
	}

	private buildPreferences(): void {
		for (let w = 0; w < this.workers.length; w++) {
			const worker = this.workers[w];
			this.workerPreferences[w] = this.tasks
				.map((task, t) => t)
				.sort((a, b) => worker.compare(this.tasks[a], this.tasks[b]));
		}
		for (let t = 0; t < this.tasks.length; t++) {
			const task = this.tasks[t];
			this.taskPreferences[t] = this.workers
				.map((worker, w) => w)
				.sort((a, b) => task.compare(this.workers[a], this.workers[b]));
		}
	}
}

function preallocateArray<T>(value: T, length: number): T[] {
	const arr = Array.apply(value, Array(length));
	return arr.map(() => value);
}

function preallocateArray2d<T>(value: T, rows: number, cols: number): T[][] {
	const arr = Array.apply(value, Array(rows));
	return arr.map(() => preallocateArray(value, cols));
}

// These values make it safe to use in sort()
export enum Ordering {
	/**
	 * a should be placed before b.
	 */
	More = -1,
	/**
	 * a and b are equivalent.
	 */
	Same = 0,
	/**
	 * a should be placed after b.
	 */
	Less = 1,
}

/**
 * Used to prioritize workers and tasks.
 *
 * Workers should implement PairingComparator<Task>, and tasks should implement PairingComparator<Worker>.
 */
export abstract class PairingComparator<T> {
	/**
	 * Returns if a is more preferred than b.
	 */
	public abstract compare(a: T, b: T): Ordering;
}
