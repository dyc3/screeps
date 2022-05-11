import { OffenseStrategy } from "../strategies/BaseStrategy";
import { olog } from "../offense/util";
import { unitCohesion } from "../combat/movement";

const STRATEGY_ACT_TRAVEL = -1;
const STRATEGY_ACT_LURE = 0;
const STRATEGY_ACT_ATTACK = 1;

function visTarget(pos) {
	const offset = 0.7;
	new RoomVisual(pos.roomName).poly(
		[
			[pos.x, pos.y - offset],
			[pos.x + offset, pos.y],
			[pos.x, pos.y + offset],
			[pos.x - offset, pos.y],
			[pos.x, pos.y - offset],
		],
		{
			stroke: "#ffff00",
			strokeWidth: 0.07,
			opacity: 0.5,
		}
	);
}

/**
 * `attackerCount`: number of attackers
 * @example Offense.create("SimpleManual", init={attackerCount: 2, targetRoom: "W18N8"})
 */
export class OffenseStrategySimpleManual extends OffenseStrategy {
	static get strategyName() {
		return "SimpleManual";
	}

	constructor(mem) {
		super(mem);
		this.currentTargetId = "";
		this.targetRoom = "";
		this.rangedCount = 0;
		this.attackerCount = 0;
		this.healerCount = 0;
		this.bigHealerCount = 0;
		this.regroupPos = undefined;
		Object.assign(this, mem);
	}

	get neededCreeps() {
		return {
			"generic-attack": this.attackerCount,
			healer: this.healerCount,
			ranged: this.rangedCount,
			"big-healer": this.bigHealerCount,
		};
	}

	get currentTarget() {
		return Game.getObjectById(this.currentTargetId);
	}

	get shouldRegroup() {
		return this.regroupPos !== undefined;
	}

	act(creeps) {
		olog(`Unit Cohesion: ${unitCohesion(creeps)}`);

		let healers = creeps.filter(c => c.getActiveBodyparts(HEAL) > 0);
		let attackers = creeps.filter(c => c.getActiveBodyparts(ATTACK) > 0 || c.getActiveBodyparts(RANGED_ATTACK) > 0);
		let targetRoomVision = !!Game.rooms[this.targetRoom];

		// healing
		healers.forEach(creep => {
			if (creep.hits < creep.hitsMax) {
				creep.heal(creep);
			} else {
				let needHeal = creeps.filter(c => c.hits < c.hitsMax && creep.pos.inRangeTo(c, 3));
				if (!needHeal) {
					creep.heal(creep);
					return;
				}
				let healTarget = needHeal[0];
				if (creep.pos.isNearTo(healTarget)) {
					creep.heal(healTarget);
				} else {
					creep.rangedHeal(healTarget);
				}
			}
		});

		if (this.shouldRegroup) {
			olog(`Regrouping`);
			let regroupPos = new RoomPosition(this.regroupPos.x, this.regroupPos.y, this.regroupPos.roomName);
			creeps.forEach(creep => {
				creep.travelTo(regroupPos, {
					ensurePath: true,
				});
			});
			return;
		}

		if (targetRoomVision) {
			let room = Game.rooms[this.targetRoom];
			let hostiles = room.find(FIND_HOSTILE_CREEPS);
			let dangerousHostiles = hostiles.filter(
				c => c.getActiveBodyparts(ATTACK) + c.getActiveBodyparts(RANGED_ATTACK) + c.getActiveBodyparts(HEAL) > 0
			);
			let hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
			let towers = hostileStructures.filter(s => s.structureType === STRUCTURE_TOWER);
			let spawns = hostileStructures.filter(s => s.structureType === STRUCTURE_SPAWN);
			let extensions = hostileStructures.filter(s => s.structureType === STRUCTURE_EXTENSION);

			if (!this.currentTarget) {
				// determine target
				if (dangerousHostiles.length > 0) {
					this.currentTargetId = dangerousHostiles[0].id;
				} else if (towers.length > 0) {
					this.currentTargetId = towers[0].id;
				} else if (extensions.length > 0) {
					this.currentTargetId = extensions[0].id;
				} else if (hostiles.length > 0) {
					this.currentTargetId = hostiles[0].id;
				} else if (spawns.length > 0) {
					this.currentTargetId = spawns[0].id;
				} else if (hostileStructures.length > 0) {
					this.currentTargetId = hostileStructures[0].id;
				} else {
					this.currentTargetId = "";
				}
			} else {
				visTarget(this.currentTarget.pos);
			}
		}

		healers.forEach((creep, idx) => {
			creep.travelTo(attackers[idx % 2], { movingTarget: true });
		});

		attackers.forEach((creep, idx) => {
			if (this.currentTargetId !== "") {
				if (creep.pos.isNearTo(this.currentTarget)) {
					if (creep.getActiveBodyparts(ATTACK) > 0) {
						creep.attack(this.currentTarget);
					}
					if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
						creep.rangedMassAttack();
					}
					creep.move(creep.pos.getDirectionTo(this.currentTarget));
				} else if (creep.getActiveBodyparts(RANGED_ATTACK) > 0 && creep.pos.inRangeTo(this.currentTarget, 3)) {
					creep.rangedAttack(this.currentTarget);
				} else {
					creep.travelTo(this.currentTarget);
				}
			} else {
				olog(`traveling: ${creep.name} to ${this.targetRoom}, current pos: ${creep.pos}`);
				creep.travelTo(new RoomPosition(25, 25, this.targetRoom), {
					range: 20,
					useFindRoute: true,
					stuckValue: 4,
					ensurePath: true,
				});
			}
		});
	}
}

/** @deprecated Has hard coded stuff. */
export class OffenseStrategyLureHarrass extends OffenseStrategy {
	static get strategyName() {
		return "LureHarrass";
	}

	constructor(mem) {
		super(mem);
		this.state = STRATEGY_ACT_LURE;
		this.mode = 0; // basically, which direction are we attacking the room from?
		this.targetRoom = "";
		this.fromRoom = "";
		this.currentTargetId = "";
		Object.assign(this, mem);
	}

	get neededCreeps() {
		return {
			"generic-attack": 2,
			// "big-healer": 2,
		};
	}

	get currentTarget() {
		return Game.getObjectById(this.currentTargetId);
	}

	setState(s) {
		olog(`strat state: ${this.state} => ${s}`);
		this.state = s;
	}

	act(creeps) {
		olog("strat state: ", this.state);

		let grouped = _.groupBy(creeps, c => c.memory.type);
		let attackers = "generic-attack" in grouped ? grouped["generic-attack"] : [];
		attackers.push(...("ranged" in grouped ? grouped.ranged : []));
		let healers = "healer" in grouped ? grouped.healer : [];
		healers.push(...("big-healer" in grouped ? grouped["big-healer"] : []));
		let targetRoomVision = !!Game.rooms[this.targetRoom];

		// healing
		healers.forEach(creep => {
			if (creep.hits < creep.hitsMax) {
				creep.heal(creep);
			} else {
				let needHeal = creeps.filter(c => c.hits < c.hitsMax && creep.pos.inRangeTo(c, 3));
				if (!needHeal) {
					creep.heal(creep);
					return;
				}
				let healTarget = needHeal[0];
				if (creep.pos.isNearTo(healTarget)) {
					creep.heal(healTarget);
				} else {
					creep.rangedHeal(healTarget);
				}
			}
		});

		if (targetRoomVision) {
			// state changes
			let room = Game.rooms[this.targetRoom];
			let hostiles = room.find(FIND_HOSTILE_CREEPS);
			let dangerousHostiles = hostiles.filter(
				c => c.getActiveBodyparts(ATTACK) + c.getActiveBodyparts(RANGED_ATTACK) + c.getActiveBodyparts(HEAL) > 0
			);
			let hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
			let towers = hostileStructures.filter(s => s.structureType === STRUCTURE_TOWER);
			let spawns = hostileStructures.filter(s => s.structureType === STRUCTURE_SPAWN);
			let extensions = hostileStructures.filter(s => s.structureType === STRUCTURE_EXTENSION);
			console.log(
				`offense: dangerousHostiles ${dangerousHostiles.length} towers: ${_.some(
					towers,
					t => t.store[RESOURCE_ENERGY] > 0
				)}`
			);

			if (this.state === STRATEGY_ACT_TRAVEL) {
				if (
					_.all(
						creeps.map(c => c.room.name === this.fromRoom),
						Boolean
					)
				) {
					this.setState(STRATEGY_ACT_LURE);
				}
			} else if (this.state === STRATEGY_ACT_LURE) {
				if (dangerousHostiles.length === 0 && !_.some(towers, t => t.store[RESOURCE_ENERGY] >= 10)) {
					this.setState(STRATEGY_ACT_ATTACK);
				}
			} else if (this.state === STRATEGY_ACT_ATTACK) {
				this.setState(STRATEGY_ACT_ATTACK);
			}

			if (!this.currentTarget) {
				// determine target
				if (dangerousHostiles.length > 0) {
					this.currentTargetId = dangerousHostiles[0].id;
				} else if (towers.length > 0) {
					this.currentTargetId = towers[0].id;
				} else if (extensions.length > 0) {
					this.currentTargetId = extensions[0].id;
				} else if (hostiles.length > 0) {
					this.currentTargetId = hostiles[0].id;
				} else if (spawns.length > 0) {
					this.currentTargetId = spawns[0].id;
				} else if (hostileStructures.length > 0) {
					this.currentTargetId = hostileStructures[0].id;
				} else {
					this.currentTargetId = "";
				}
			} else {
				visTarget(this.currentTarget.pos);
			}
		}

		// HACK: hardcoded positions
		if (this.state === STRATEGY_ACT_TRAVEL) {
			creeps.forEach(creep => {
				if (creep.room.name === "W16N3") {
					olog("going to W16N2");
					creep.travelTo(new RoomPosition(4, 4, "W16N2"));
				} else {
					let walls = Game.rooms.W16N2
						? [
								{ x: 2, y: 4, roomName: "W16N2" },
								{ x: 2, y: 5, roomName: "W16N2" },
						  ]
								.map(n => new RoomPosition(n.x, n.y, n.roomName))
								.map(pos => _.first(pos.lookFor(LOOK_STRUCTURES)))
								.filter(s => !!s)
						: [];

					if (walls.length === 2) {
						if (creep.getActiveBodyparts(ATTACK) > 0) {
							olog("breaking walls");
							let wall = _.first(walls);
							if (creep.pos.isNearTo(wall)) {
								creep.attack(wall);
							} else {
								creep.travelTo(wall);
							}
						} else {
							olog("waiting");
							creep.travelTo(new RoomPosition(4, 4, "W16N2"));
						}
					} else {
						olog(`going to fromRoom ${this.fromRoom}`);
						creep.travelTo(new RoomPosition(45, 5, this.fromRoom), {
							freshMatrix: true,
						});
					}
				}
			});
		} else if (this.state === STRATEGY_ACT_LURE) {
			if (this.mode === 0) {
				const baseX = 26;
				healers.forEach((creep, idx) => {
					creep.travelTo(new RoomPosition(baseX + idx, 2, this.fromRoom));
				});
				attackers.forEach((creep, idx) => {
					if (creep.hitsMax - creep.hits > 800) {
						creep.travelTo(new RoomPosition(baseX + idx, 1, this.fromRoom));
					} else {
						creep.travelTo(new RoomPosition(baseX + idx, 48, this.targetRoom));
						// creep.attack(this.currentTarget);
						// creep.attack(Game.getObjectById("601efbde533d3d0c290bf9d2"));
					}
				});
			} else if (this.mode === 1) {
				const baseY = 11;
				healers.forEach((creep, idx) => {
					let opts = creep.room.name === this.targetRoom ? { maxRooms: 1 } : {};
					creep.travelTo(new RoomPosition(47, baseY + idx, this.fromRoom), opts);
				});
				attackers.forEach((creep, idx) => {
					let opts = creep.room.name === this.targetRoom ? { maxRooms: 1 } : {};
					if (creep.hitsMax - creep.hits > 400) {
						creep.travelTo(new RoomPosition(48, baseY + idx, this.fromRoom), opts);
					} else {
						// creep.travelTo(new RoomPosition(48, baseY + idx, "W17N2"), opts)
						creep.travelTo(new RoomPosition(1, baseY + idx, this.targetRoom), opts);
					}
				});
			} else {
				this.mode = 0;
			}
		} else if (this.state === STRATEGY_ACT_ATTACK) {
			healers.forEach((creep, idx) => {
				creep.travelTo(attackers[idx % 2], { movingTarget: true });
			});

			attackers.forEach((creep, idx) => {
				if (this.currentTargetId !== "") {
					if (creep.getActiveBodyparts(RANGED_ATTACK) > 0 && creep.pos.inRangeTo(this.currentTarget, 3)) {
						creep.rangedAttack(this.currentTarget);
					} else {
						creep.rangedMassAttack();
					}
					if (creep.pos.isNearTo(this.currentTarget)) {
						if (creep.getActiveBodyparts(ATTACK) > 0) {
							creep.attack(this.currentTarget);
						}
						if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
							creep.rangedMassAttack();
						}
						creep.move(creep.pos.getDirectionTo(this.currentTarget));
					} else {
						creep.travelTo(this.currentTarget);
					}
				} else {
					olog("moving to ready position");
					creep.travelTo(new RoomPosition(28, 44, this.targetRoom));
				}
			});
		} else {
			this.state = STRATEGY_ACT_LURE;
		}
	}
}

/** @deprecated Has hard coded stuff. */
export class OffenseStrategyBreakAltPath extends OffenseStrategy {
	static get strategyName() {
		return "BreakAltPath";
	}

	constructor(mem) {
		super(mem);
		// HACK: hardcoded room
		this.targetRoom = "W16N2";
		// HACK: hardcoded positions
		this._breakWallPosQueue = [
			{ x: 2, y: 4, roomName: "W16N2" },
			{ x: 2, y: 5, roomName: "W16N2" },
			{ x: 2, y: 6, roomName: "W16N2" },
			{ x: 2, y: 7, roomName: "W16N2" },
			{ x: 2, y: 30, roomName: "W16N2" },
			{ x: 2, y: 31, roomName: "W16N2" },
			{ x: 17, y: 33, roomName: "W16N2" },
		];
		this.currentIdx = 0;
		Object.assign(this, mem);
	}

	get neededCreeps() {
		return {
			breaker: 2,
		};
	}

	get currentTarget() {
		return Game.getObjectById(this.currentTargetId);
	}

	get breakWallPos() {
		return new RoomPosition(
			this._breakWallPosQueue[this.currentIdx].x,
			this._breakWallPosQueue[this.currentIdx].y,
			this._breakWallPosQueue[this.currentIdx].roomName
		);
	}

	get wallObj() {
		return _.first(this.breakWallPos.lookFor(LOOK_STRUCTURES));
	}

	act(creeps) {
		let grouped = _.groupBy(creeps, c => c.memory.type);
		let breakers = "breaker" in grouped ? grouped.breaker : [];

		let haveVision = this.currentIdx < this._breakWallPosQueue.length && !!Game.rooms[this.breakWallPos.roomName];

		if (haveVision) {
			olog("have vision to see in target room");
			if (!this.wallObj) {
				olog("structure broken, dequeuing next position");
				this.currentIdx++;
			}
		}

		if (this.currentIdx < this._breakWallPosQueue.length) {
			breakers.forEach(creep => {
				if (creep.pos.isNearTo(this.breakWallPos)) {
					creep.dismantle(this.wallObj);
				} else {
					creep.travelTo(this.breakWallPos);
				}
			});
		} else {
			olog("reached end of queue");
			breakers.forEach(creep => {
				creep.travelTo(new RoomPosition(8, 47, "W16N3"));
			});
		}
	}
}
