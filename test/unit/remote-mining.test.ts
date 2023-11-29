/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable camelcase */
import { Game, Memory } from "./mock";
import { cleanUpAllocationInconsistencies, cleanUpInvalidAllocations } from "remotemining";
import { Role } from "roles/meta";
import { assert } from "chai";

describe("Remote Mining", () => {
	beforeEach(() => {
		// @ts-expect-error : allow adding Game to global
		global.Game = Game;
		// @ts-expect-error : allow adding Memory to global
		global.Memory = Memory;
	});

	describe("Creep Allocation", () => {
		it("should clean up invalid creep memory references", () => {
			Memory.remoteMining = {
				targets: [
					{
						id: "foo" as Id<Source>,
						x: 1,
						y: 1,
						roomName: "W1N1",
						harvestPos: { x: 2, y: 2 },
						creepHarvester: "remoteharvester_1",
						creepCarriers: ["carrier_1"],
						neededCarriers: 1,
						danger: 0,
						dangerPos: undefined,
						keeperLairId: undefined,
						paused: false,
					},
				],
			};

			Memory.creeps = {
				remoteharvester_1: {
					role: Role.RemoteHarvester,
					harvestTarget: "foo",
				},
				carrier_1: {
					role: Role.Carrier,
					harvestTarget: "foo",
				},
				remoteharvester_2: {
					role: Role.RemoteHarvester,
					harvestTarget: "bar",
				},
				carrier_2: {
					role: Role.Carrier,
					harvestTarget: "bar",
				},
			};

			Game.creeps = {};
			for (const creep in Memory.creeps) {
				Game.creeps[creep] = {
					name: creep,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					memory: Memory.creeps[creep],
				};
			}

			cleanUpInvalidAllocations();

			assert.isUndefined(
				Memory.creeps.remoteharvester_2.harvestTarget,
				"did not clean up invalid harvester memory"
			);
			assert.isUndefined(Memory.creeps.carrier_2.harvestTarget, "did not clean up invalid carrier memory");
		});

		it("should clean up invalid target memory references", () => {
			Memory.remoteMining = {
				targets: [
					{
						id: "foo" as Id<Source>,
						x: 1,
						y: 1,
						roomName: "W1N1",
						harvestPos: { x: 2, y: 2 },
						creepHarvester: "remoteharvester_gone",
						creepCarriers: ["carrier_1", "carrier_gone"],
						neededCarriers: 1,
						danger: 0,
						dangerPos: undefined,
						keeperLairId: undefined,
						paused: false,
					},
				],
			};

			Memory.creeps = {
				remoteharvester_1: {
					role: Role.RemoteHarvester,
					harvestTarget: "foo",
				},
				carrier_1: {
					role: Role.Carrier,
					harvestTarget: "foo",
				},
			};

			Game.creeps = {};
			for (const creep in Memory.creeps) {
				Game.creeps[creep] = {
					name: creep,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					memory: Memory.creeps[creep],
				};
			}

			cleanUpInvalidAllocations();

			assert.isUndefined(Memory.remoteMining.targets[0].creepHarvester);
			assert.equal(Memory.remoteMining.targets[0].creepCarriers.length, 1);
		});

		it("should unallocate any creeps that have an inconsistent allocation state", () => {
			Memory.remoteMining = {
				targets: [
					{
						id: "foo" as Id<Source>,
						x: 1,
						y: 1,
						roomName: "W1N1",
						harvestPos: { x: 2, y: 2 },
						creepHarvester: "remoteharvester_1",
						creepCarriers: ["carrier_1"],
						neededCarriers: 1,
						danger: 0,
						dangerPos: undefined,
						keeperLairId: undefined,
						paused: false,
					},
					{
						id: "bar" as Id<Source>,
						x: 1,
						y: 1,
						roomName: "W1N1",
						harvestPos: { x: 2, y: 2 },
						creepHarvester: "remoteharvester_2",
						creepCarriers: [],
						neededCarriers: 1,
						danger: 0,
						dangerPos: undefined,
						keeperLairId: undefined,
						paused: false,
					},
				],
			};

			Memory.creeps = {
				remoteharvester_1: {
					role: Role.RemoteHarvester,
					harvestTarget: "foo",
				},
				carrier_1: {
					role: Role.Carrier,
					harvestTarget: "foo",
				},
				remoteharvester_2: {
					role: Role.RemoteHarvester,
					harvestTarget: "foo",
				},
				carrier_2: {
					role: Role.Carrier,
					harvestTarget: "bar",
				},
			};

			Game.creeps = {};
			for (const creep in Memory.creeps) {
				Game.creeps[creep] = {
					name: creep,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					memory: Memory.creeps[creep],
				};
			}

			cleanUpAllocationInconsistencies();

			assert.isUndefined(
				Memory.creeps.remoteharvester_2.harvestTarget,
				"did not clean up conflicting harvester memory"
			);
			assert.equal(Memory.remoteMining.targets[0].creepCarriers.length, 1);
			assert.isUndefined(Memory.creeps.carrier_2.harvestTarget);
		});
	});
});
