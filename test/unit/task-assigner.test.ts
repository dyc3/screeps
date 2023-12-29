import { Assignable, NaiveTaskAssigner, Ordering, PairingComparator } from "utils/task-assigner";
import { assert } from "chai";
import { Worker, WorkerTask, WorkerTaskKind } from "roles/role.worker";

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
