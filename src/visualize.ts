import toolCreepUpgrader, { getUpgraderQuota } from "./tool.creepupgrader";
import { Role } from "./roles/meta";
import toolEnergySource from "./tool.energysource";
import util from "./util";

export default {
	doVisualize(): void {
		const rooms = util.getOwnedRooms();
		const vis = new RoomVisual();

		// draw information about creep quotas
		let bottomRowCreepInfo = 0;
		try {
			const baseX = 1;
			const baseY = 1;
			let row = 0;
			for (const role of Object.values(toolCreepUpgrader.roles)) {
				const count = util.getCreeps(role.name).length;
				let quota = !role.quotaPerRoom ? role.quota() : 0;
				if (role.quotaPerRoom) {
					for (const room of rooms) {
						quota += role.quota(room);
					}
				}
				const percentQuota = util.clamp(count / quota, 0, 1);

				vis.text(role.name, baseX, baseY + row, {
					align: "left",
					font: 0.5,
				});
				vis.rect(baseX + 4, baseY - 0.4 + row, 5 * percentQuota, 0.6, {
					fill: count <= quota ? "#0084f0" : "#f02800",
				});
				vis.rect(baseX + 4, baseY - 0.4 + row, 5, 0.6, {
					fill: "transparent",
					stroke: "#ffffff",
					strokeWidth: 0.08,
					opacity: 1,
				});

				vis.text(`${count}/${quota}`, baseX + 4 + 5 / 2, baseY + row + 0.1, {
					align: "center",
					font: 0.5,
					color: count <= quota ? "#fff" : "#ff8888",
				});

				row++;
			}
			// show tmpdeliver creeps
			let side = 0;
			const colWidth = 4;
			for (const creep of util.getCreeps(Role.TmpDeliver)) {
				const name = creep.name.split("_")[1];
				vis.text(`${name}`, baseX + colWidth * side, baseY + row, {
					align: "left",
					font: 0.4,
				});
				const percentFilled = creep.store.getUsedCapacity() / creep.store.getCapacity();
				vis.rect(baseX + 2.2 + colWidth * side, baseY - 0.2 + row, 1.5 * percentFilled, 0.3, {
					fill: "#ffff00",
				});
				side = ++side % 2;
				if (side === 0) {
					row += 0.5;
				}
			}
			bottomRowCreepInfo = baseY + row;
		} catch (e) {
			util.printException(e);
		}

		// draw info about spawns
		let bottomRowSpawnInfo = 0;
		try {
			const baseX = 11;
			const baseY = 1;
			const yOffset = 1;
			const ySpacing = 2.2;
			const xOffset = 0.3;
			const xSpacing = 1.4;
			const spawnRadius = 0.5;
			for (let r = 0; r < rooms.length; r++) {
				const room = rooms[r];

				vis.text(`${room.name}`, baseX - 0.25, baseY + ySpacing * r, {
					align: "left",
					font: 0.5,
					color: "#fff",
				});

				const spawns = util.getStructures(room, STRUCTURE_SPAWN);
				for (let s = 0; s < spawns.length; s++) {
					const spawn = spawns[s];
					vis.circle(baseX + xSpacing * s + xOffset, baseY + ySpacing * r + yOffset, {
						radius: spawnRadius,
						fill: "#0084f0",
					});
					vis.circle(baseX + xSpacing * s + xOffset, baseY + ySpacing * r + yOffset, {
						radius: spawnRadius,
						fill: "transparent",
						stroke: "#ffffff",
						strokeWidth: 0.08,
						opacity: 1,
					});
					if (spawn.spawning) {
						vis.text(
							`${Math.round(
								((spawn.spawning.needTime - spawn.spawning.remainingTime) / spawn.spawning.needTime) *
									100
							)}%`,
							baseX + xSpacing * s + xOffset,
							baseY + ySpacing * r + yOffset + 0.1,
							{
								align: "center",
								font: 0.3,
								color: "#fff",
							}
						);
					}
				}
			}
			bottomRowSpawnInfo = baseY + ySpacing * (rooms.length - 1) + yOffset + 0.1;
		} catch (e) {
			util.printException(e);
		}

		// draw info about remote mining
		try {
			const baseX = 8;
			const baseY = Math.max(bottomRowCreepInfo, bottomRowSpawnInfo) + 1;
			let row = 0;
			for (const source of Memory.remoteMining.targets) {
				vis.text(
					`${source.roomName}: harvester: ${source.creepHarvester ?? "none"} carriers: ${
						source.creepCarriers ? source.creepCarriers.length : 0
					}/${source.neededCarriers} danger: ${source.danger}`,
					baseX,
					baseY + row * 0.6,
					{
						align: "left",
						font: 0.5,
						color: source.danger > 0 ? "#fa0" : "#fff",
					}
				);
				row++;
			}
		} catch (e) {
			util.printException(e);
		}

		// draw info about guard tasks
		try {
			const baseX = 27;
			const baseY = bottomRowCreepInfo + 1;
			let row = 0;
			for (const task of Memory.guard.tasks) {
				const enabled = task.disableUntil < Game.time;
				const disabledText = enabled ? "enabled" : `disabled (${task.disableUntil - Game.time} remaining)`;
				let spawningText = "";
				for (const creepName of task.assignedCreeps) {
					const creep = Game.creeps[creepName];
					if (creep && creep.spawning) {
						const spawn = Object.values(Game.spawns).find(s => s.spawning?.name === creep.name);
						if (!spawn || !spawn.spawning) {
							continue;
						}
						spawningText += `spawning: ${creep.name} (${(
							spawn.spawning.remainingTime / spawn.spawning.needTime
						).toLocaleString(undefined, { style: "percent" })}%, ETA: ${spawn.spawning.remainingTime}) `;
					}
				}
				vis.text(
					`${task.targetRoom}: ${task.guardType} creeps: ${
						task.assignedCreeps ? task.assignedCreeps.length : 0
					}/${task.neededCreeps} ${disabledText} ${spawningText}`,
					baseX,
					baseY + row * 0.6,
					{
						align: "left",
						font: 0.5,
						color: enabled ? "#fff" : "#aaa",
					}
				);
				row++;
			}
		} catch (e) {
			util.printException(e);
		}

		// draw creeps marked for death
		try {
			for (const c in Game.creeps) {
				const creep = Game.creeps[c];
				if (creep.memory.keepAlive) {
					continue;
				}
				creep.room.visual.circle(creep.pos, {
					stroke: "#f00",
					fill: "transparent",
					opacity: 0.6,
					radius: 0.5,
					lineStyle: "dotted",
				});
			}
		} catch (e) {
			util.printException(e);
		}

		// draw planned harvest positions
		try {
			for (const room of util.getOwnedRooms()) {
				if (!room.memory.harvestPositions) {
					continue;
				}
				Object.keys(room.memory.harvestPositions).forEach(id => {
					const source = Game.getObjectById(id as Id<Source>);
					if (!source) {
						return;
					}
					const { x, y } = room.memory.harvestPositions[id as Id<Source>];
					const pos = room.getPositionAt(x, y);
					if (!pos) {
						return;
					}
					room.visual.circle(pos, {
						stroke: "#ffff00",
						fill: "transparent",
						opacity: 0.8,
						radius: 0.5,
						lineStyle: "dotted",
					});

					room.visual.line(source.pos, pos, {
						color: "#ffff00",
						opacity: 0.8,
						lineStyle: "dotted",
					});
				});
			}
		} catch (e) {
			util.printException(e);
		}
	},

	drawQuotas(): void {
		toolEnergySource.drawAssignedCounts();

		const rooms = util.getOwnedRooms();
		for (const room of rooms) {
			// draw upgrader quotas on controllers
			const count = util.getCreeps(Role.Upgrader).filter(creep => creep.memory.targetRoom === room.name).length;
			const max = getUpgraderQuota(room);
			const text = `${count}/${max}`;
			const color = count <= max ? "#11dd11" : "#dd1111";
			const controllerPos = room.controller?.pos;
			if (controllerPos) {
				room.visual.text(text, controllerPos, { color, font: 0.4, stroke: "#000" });
			}

			// mark the room's rootPos, assists autoplanner debugging
			const root = room.memory.rootPos as { x: number; y: number } | undefined;
			if (root) {
				room.visual.rect(root.x - 0.45, root.y - 0.45, 0.9, 0.9, { fill: "#44dd44" });
			}

			// draw relay status
			const relays = util.getCreeps(Role.Relay).filter(creep => creep.memory.targetRoom === room.name);
			for (const relay of relays) {
				if (!relay.memory.assignedPos) {
					continue;
				}
				const pos = new RoomPosition(
					relay.memory.assignedPos.x,
					relay.memory.assignedPos.y,
					relay.memory.targetRoom
				);
				let stroke;
				if (relay.pos.isEqualTo(pos)) {
					stroke = "#44dd44";
				} else {
					stroke = "#ddbb44";
					if (relay.room.name === relay.memory.targetRoom) {
						room.visual.text(`${relay.pos.getRangeTo(pos)}`, pos, {
							font: 0.4,
						});
					} else {
						room.visual.text(relay.room.name, pos, {
							font: 0.4,
						});
					}
				}
				room.visual.circle(pos, {
					stroke,
					fill: "transparent",
					radius: 0.4,
					opacity: 0.5,
				});
			}
		}
	},

	drawMapVision(): void {
		const rooms = Object.values(Game.rooms);
		for (const room of rooms) {
			const pos = room.getPositionAt(2, 2);
			if (!pos) {
				continue;
			}
			Game.map.visual.rect(pos, 46, 46, {
				fill: "transparent",
				stroke: "#0047AB",
				opacity: 0.5,
			});
		}
	},

	drawNukeRange(): void {
		const rooms = util.getOwnedRooms();
		for (const room of rooms) {
			const nukers = util.getStructures(room, STRUCTURE_NUKER);
			for (const nuker of nukers) {
				Game.map.visual.circle(nuker.pos, {
					fill: "transparent",
					radius: NUKE_RANGE * 50,
					stroke: nuker.cooldown > 0 ? "#ffbb00" : "#bb7700",
					opacity: 0.3,
					strokeWidth: 3,
				});
			}
		}
	},
};
