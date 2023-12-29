import { Ordering, PairingComparator } from "utils/task-assigner";
import { assert } from "chai";

describe("TaskAssigner", () => {
	it("should ensure all workers are assigned a task", () => {


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
