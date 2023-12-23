import { JobRunner } from "../jobs";
import { util } from "../util";

const JOB_NAME = "work-labs";

function doWorkLabs() {
	const rooms = util.getOwnedRooms();
	let minWaitTime = JobRunner.getInstance().getInterval(JOB_NAME) ?? 30; // minimum time to wait before running again
	for (const room of rooms) {
		if ((room.controller?.level ?? 0) < 6) {
			continue;
		}
		const labs = util.getStructures(room, STRUCTURE_LAB);

		for (const lab of labs) {
			const workFlag = util.getWorkFlag(lab.pos);
			if (!workFlag || workFlag.secondaryColor !== COLOR_GREEN || lab.cooldown > 0) {
				continue;
			}
			// console.log(workFlag)
			const [m, makingWhat] = workFlag.name.split(":");
			let method = m;
			if (method.startsWith("make")) {
				method = "make";
			} else if (method.startsWith("unmake")) {
				method = "unmake";
			}

			if (method === "make") {
				let needsMinerals: ResourceConstant[] = [];
				switch (makingWhat) {
					case "G":
						needsMinerals = ["UL", "ZK"];
						break;
					default:
						if (makingWhat.startsWith("X")) {
							needsMinerals = ["X", makingWhat.slice(1) as ResourceConstant]; // untested
						} else {
							needsMinerals = makingWhat.split("") as ResourceConstant[];
						}
				}
				const sourceLabs: StructureLab[] = lab.pos.findInRange(FIND_STRUCTURES, 2, {
					filter: (l: StructureLab) => {
						return l.structureType === STRUCTURE_LAB && _.contains(needsMinerals, l.mineralType);
					},
				});
				// console.log(labs[l], "is making", isMakingWhat, "using", needsMinerals, "from", sourceLabs)
				try {
					new RoomVisual(lab.room.name).line(lab.pos, sourceLabs[0].pos);
					new RoomVisual(lab.room.name).line(lab.pos, sourceLabs[1].pos);
				} catch (e) {
					console.log("Error drawing line:", e);
				}
				if (sourceLabs.length === 2) {
					lab.runReaction(sourceLabs[0], sourceLabs[1]);
					minWaitTime = Math.min(minWaitTime, LAB_COOLDOWN);
				} else {
					// console.log("Too many/little source labs for", labs[l], ": ", sourceLabs);
				}
			} else if (method === "unmake") {
				if (!lab.mineralType) {
					console.log("[work-labs] WARN: lab", lab, "has no mineral");
					continue;
				}
				const splitsInto = lab.mineralType.split("") as ResourceConstant[];
				console.log("[work-labs] unmaking", lab.mineralType, "into", splitsInto);
				let destLabs: StructureLab[] = lab.pos.findInRange(FIND_STRUCTURES, 2, {
					filter: (l: StructureLab) => {
						return (
							l.structureType === STRUCTURE_LAB &&
							(!l.mineralType ||
								(_.contains(splitsInto, l.mineralType) && l.store.getFreeCapacity(l.mineralType) >= 5))
						);
					},
				});
				destLabs = _.sortBy(
					destLabs,
					(l: StructureLab) => {
						// @ts-expect-error FIXME: this is functional, but doesn't typecheck
						return _.contains(l.mineralType, splitsInto);
					},
					"desc"
				);
				destLabs = destLabs.slice(0, splitsInto.length);
				console.log(lab, "is unmaking", lab.mineralType, "into", splitsInto, "into", destLabs);
				try {
					const vis = new RoomVisual(lab.room.name);
					destLabs.forEach((l: StructureLab) => vis.line(l.pos, l.pos));
				} catch (e) {
					console.log("Error drawing line:", e);
				}

				lab.reverseReaction(destLabs[0], destLabs[1]);
				minWaitTime = Math.min(minWaitTime, LAB_COOLDOWN);
			} else {
				console.log("Unknown method:", method);
			}
		}
	}
	JobRunner.getInstance().forceRunAfter(JOB_NAME, minWaitTime);
}

export function registerJob(): void {
	JobRunner.getInstance().registerJob({
		name: JOB_NAME,
		run: doWorkLabs,
		interval: 30,
	});
}
