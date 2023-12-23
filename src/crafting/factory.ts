import { JobRunner } from "../jobs";
import { util } from "../util";

const JOB_NAME = "work-factories";

function doWorkFactories() {
	let minWaitTime = JobRunner.getInstance().getInterval(JOB_NAME) ?? Infinity; // minimum time to wait before running again
	const rooms = util.getOwnedRooms();
	for (const room of rooms) {
		const factory = util.getStructures(room, STRUCTURE_FACTORY)[0];

		if (!factory || factory.cooldown > 0) {
			continue;
		}

		// FIXME: make this more dynamic
		// right now, everything is hard coded

		const productionTargets: (CommodityConstant | RESOURCE_ENERGY)[] = [
			RESOURCE_UTRIUM_BAR,
			RESOURCE_ZYNTHIUM_BAR,
			RESOURCE_LEMERGIUM_BAR,
			RESOURCE_KEANIUM_BAR,
			RESOURCE_REDUCTANT,
			RESOURCE_OXIDANT,
			RESOURCE_PURIFIER,
			RESOURCE_GHODIUM_MELT,

			RESOURCE_ALLOY,

			RESOURCE_CELL,

			RESOURCE_WIRE,

			RESOURCE_ESSENCE,
			RESOURCE_EMANATION,
			RESOURCE_SPIRIT,
			RESOURCE_EXTRACT,
			RESOURCE_CONCENTRATE,
		];

		if (room.storage) {
			if (room.storage.store[RESOURCE_ENERGY] > 800000 && factory.store[RESOURCE_BATTERY] < 10000) {
				productionTargets.push(RESOURCE_BATTERY);
			} else if (room.storage.store[RESOURCE_ENERGY] < 600000) {
				productionTargets.push(RESOURCE_ENERGY);
			}
		}

		for (const productionTarget of productionTargets) {
			console.log(`[work-factories] production target: ${productionTarget}`);
			let canProduce = true;
			const commodity = COMMODITIES[productionTarget];
			const neededLevel = commodity.level ?? 0;
			if (factory.level && neededLevel > factory.level) {
				console.log(`[work-factories] factory is level ${factory.level}, but level ${neededLevel} is required`);
				canProduce = false;
				continue;
			}

			for (const _component in commodity.components) {
				const component = _component as CommodityConstant;
				// console.log(`[work-factories] factory has component ${component}?`);
				if (factory.store.getUsedCapacity(component) === 0) {
					console.log(`[work-factories] no ${component} found`);
					canProduce = false;
					break;
				}
				// console.log(`[work-factories] found ${factory.store[component]} ${component}`);
				if (factory.store.getUsedCapacity(component) < commodity.components[component]) {
					console.log(
						`[work-factories] not enough ${component}, currently have ${factory.store[component]}/${commodity.components[component]}`
					);
					canProduce = false;
					break;
				}
			}

			console.log(`[work-factories] production target: ${productionTarget}, can produce: ${canProduce}`);
			if (canProduce) {
				const productionResult = factory.produce(productionTarget);
				if (productionResult !== OK) {
					console.log(`[work-factories] unable to produce ${productionTarget} => ${productionResult}`);
				} else {
					minWaitTime = Math.min(minWaitTime, 20); // FIXME: this is hardcoded, get real cooldown from factory
					break;
				}
			}
		}
	}

	JobRunner.getInstance().forceRunAfter(JOB_NAME, minWaitTime);
}

export function registerJob(): void {
	JobRunner.getInstance().registerJob({
		name: JOB_NAME,
		run: doWorkFactories,
		interval: 20,
	});
}
