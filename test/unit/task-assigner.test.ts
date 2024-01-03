import { Assignable, NaiveTaskAssigner, Ordering, OverseerTaskAssigner, PairingComparator } from "utils/task-assigner";
import { Worker, WorkerTask, WorkerTaskKind } from "roles/role.worker";
import { assert } from "chai";

class MockWorker implements Assignable<WorkerTask> {
	private _task: WorkerTask | undefined;

	public constructor() {
		this.task = undefined;
	}

	public get task(): WorkerTask | undefined {
		return this._task;
	}
	public set task(value: WorkerTask | undefined) {
		this._task = value;
	}

	public forceTask(task: WorkerTask): void {
		this.task = task;
	}
}

function countAssignedTasks<W extends Assignable<WorkerTask>>(workers: W[]): { [kind: number]: number } {
	const counts: Record<WorkerTaskKind, number> = {
		[WorkerTaskKind.Upgrade]: 0,
		[WorkerTaskKind.Build]: 0,
		[WorkerTaskKind.Repair]: 0,
		[WorkerTaskKind.Dismantle]: 0,
		[WorkerTaskKind.Mine]: 0,
	};
	for (const worker of workers) {
		if (!worker.task) {
			continue;
		}
		counts[worker.task.task]++;
	}
	return counts;
}

describe("TaskAssigner", () => {
	it("should filter out tasks that are already assigned", () => {
		const workers = [new MockWorker(), new MockWorker()];
		workers[0].forceTask({ task: WorkerTaskKind.Build, target: "1" as Id<ConstructionSite> });

		const tasks: WorkerTask[] = [
			{ task: WorkerTaskKind.Build, target: "1" as Id<ConstructionSite> },
			{ task: WorkerTaskKind.Build, target: "2" as Id<ConstructionSite> },
			{ task: WorkerTaskKind.Upgrade, target: "1" as Id<StructureController> },
		];

		const assigner = new NaiveTaskAssigner(workers, tasks);
		// @ts-expect-error - private method
		const unassignedTasks = assigner.getUnassignedTasks();
		assert.deepEqual(unassignedTasks, [
			{ task: WorkerTaskKind.Build, target: "2" as Id<ConstructionSite> },
			{ task: WorkerTaskKind.Upgrade, target: "1" as Id<StructureController> },
		]);
	});

	it("should ensure all workers are assigned a task", () => {
		const workers = [new MockWorker(), new MockWorker()];

		const tasks: WorkerTask[] = [
			{ task: WorkerTaskKind.Build, target: "1" as Id<ConstructionSite> },
			{ task: WorkerTaskKind.Build, target: "2" as Id<ConstructionSite> },
			{ task: WorkerTaskKind.Upgrade, target: "1" as Id<StructureController> },
		];

		const assigner = new NaiveTaskAssigner(workers, tasks);
		assigner.assignTasks();
		for (const worker of workers) {
			assert.isDefined(worker.task);
		}
	});
});

describe("OverseerTaskAssigner", () => {
	const cases: [number, WorkerTask[], Record<WorkerTaskKind, number>][] = [
		[
			3,
			[{ task: WorkerTaskKind.Upgrade, target: "1" as Id<StructureController> }],
			{
				[WorkerTaskKind.Upgrade]: 3,
				[WorkerTaskKind.Build]: 0,
				[WorkerTaskKind.Repair]: 0,
				[WorkerTaskKind.Dismantle]: 0,
				[WorkerTaskKind.Mine]: 0,
			},
		],
		[
			6,
			[
				{ task: WorkerTaskKind.Upgrade, target: "1" as Id<StructureController> },
				{ task: WorkerTaskKind.Repair, target: "3" as Id<StructureController> },
				{ task: WorkerTaskKind.Repair, target: "4" as Id<StructureController> },
			],
			{
				[WorkerTaskKind.Upgrade]: 4,
				[WorkerTaskKind.Build]: 0,
				[WorkerTaskKind.Repair]: 2,
				[WorkerTaskKind.Dismantle]: 0,
				[WorkerTaskKind.Mine]: 0,
			},
		],
		[
			6,
			[
				{ task: WorkerTaskKind.Upgrade, target: "1" as Id<StructureController> },
				{ task: WorkerTaskKind.Build, target: "2" as Id<StructureController> },
				{ task: WorkerTaskKind.Repair, target: "3" as Id<StructureController> },
				{ task: WorkerTaskKind.Repair, target: "4" as Id<StructureController> },
			],
			{
				[WorkerTaskKind.Upgrade]: 1,
				[WorkerTaskKind.Build]: 5,
				[WorkerTaskKind.Repair]: 0,
				[WorkerTaskKind.Dismantle]: 0,
				[WorkerTaskKind.Mine]: 0,
			},
		],
		[
			6,
			[
				{ task: WorkerTaskKind.Upgrade, target: "1" as Id<StructureController> },
				{ task: WorkerTaskKind.Repair, target: "3" as Id<StructureController> },
				{ task: WorkerTaskKind.Build, target: "2" as Id<StructureController> },
				{ task: WorkerTaskKind.Repair, target: "4" as Id<StructureController> },
			],
			{
				[WorkerTaskKind.Upgrade]: 1,
				[WorkerTaskKind.Build]: 4,
				[WorkerTaskKind.Repair]: 1,
				[WorkerTaskKind.Dismantle]: 0,
				[WorkerTaskKind.Mine]: 0,
			},
		],
		[
			3,
			[
				{ task: WorkerTaskKind.Upgrade, target: "1" as Id<StructureController> },
				{ task: WorkerTaskKind.Build, target: "2" as Id<StructureController> },
			],
			{
				[WorkerTaskKind.Upgrade]: 1,
				[WorkerTaskKind.Build]: 2,
				[WorkerTaskKind.Repair]: 0,
				[WorkerTaskKind.Dismantle]: 0,
				[WorkerTaskKind.Mine]: 0,
			},
		],
	];

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	for (const [casenum, [numWorkers, tasks, _]] of cases.entries()) {
		it(`should ensure all workers have a task, even if there aren't enough tasks (case ${casenum})`, () => {
			const workers = [];
			for (let w = 0; w < numWorkers; w++) {
				workers.push(new MockWorker());
			}

			const assigner = new OverseerTaskAssigner(workers, tasks);
			assigner.assignTasks();
			const allAssigned = workers.every(w => !!w.task);
			assert.isTrue(allAssigned);
		});
	}

	for (const [casenum, [numWorkers, tasks, expectedCounts]] of cases.entries()) {
		it(`should assign the expected number of workers (case ${casenum})`, () => {
			const workers = [];
			for (let w = 0; w < numWorkers; w++) {
				workers.push(new MockWorker());
			}

			const assigner = new OverseerTaskAssigner(workers, tasks);
			assigner.assignTasks();
			const gotCounts = countAssignedTasks(workers);
			assert.deepEqual(gotCounts, expectedCounts);
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	for (const [casenum, [numWorkers, tasks, _]] of cases.entries()) {
		it(`should always focus workers on a single build target if there are build tasks (case ${casenum})`, () => {
			const workers = [];
			for (let w = 0; w < numWorkers; w++) {
				workers.push(new MockWorker());
			}

			const assigner = new OverseerTaskAssigner(workers, tasks);
			assigner.assignTasks();
			const uniqueAssignedBuildTargets = new Set<string>();
			for (const worker of workers) {
				if (worker.task?.task === WorkerTaskKind.Build) {
					uniqueAssignedBuildTargets.add(worker.task.target);
				}
			}
			assert.isAtMost(uniqueAssignedBuildTargets.size, 1);
		});
	}
});

describe("PairingComparator", () => {
	it("should produce a result safe to use in sort()", () => {
		class A {
			public value: number;
			public constructor(value: number) {
				this.value = value;
			}
		}

		class B extends PairingComparator<A> {
			public compare(a: A, b: A): Ordering {
				if (a.value < b.value) {
					return Ordering.Less;
				} else if (a.value > b.value) {
					return Ordering.More;
				} else {
					return Ordering.Same;
				}
			}
		}

		class C extends PairingComparator<A> {
			public compare(a: A, b: A): Ordering {
				if (a.value < b.value) {
					return Ordering.More;
				} else if (a.value > b.value) {
					return Ordering.Less;
				} else {
					return Ordering.Same;
				}
			}
		}

		const values = [2, 1, 5, 4, 3].map(v => new A(v));

		const bComp = new B();
		values.sort((a, b) => bComp.compare(a, b));
		assert.deepEqual(
			values.map(v => v.value),
			[5, 4, 3, 2, 1]
		);

		const cComp = new C();
		values.sort((a, b) => cComp.compare(a, b));
		assert.deepEqual(
			values.map(v => v.value),
			[1, 2, 3, 4, 5]
		);
	});
});
