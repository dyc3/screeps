export enum Role {
	Harvester = "harvester",
	Upgrader = "upgrader",
	Manager = "manager",
	Builder = "builder",
	Repairer = "repairer",
	Claimer = "claimer",
	RemoteHarvester = "remoteharvester",
	Carrier = "carrier",
	Miner = "miner",
	Scientist = "scientist",
	Relay = "relay",
	TmpDeliver = "tmpdeliver",
	Guardian = "guardian",
	HighwayHarvesting = "highwayharvesting",
	Offense = "offense",
	InvaderDestroyer = "invaderdestroyer",
	TestLogistics = "testlogistics",
	/** @deprecated */
	NextRoomer = "nextroomer",
	/** @deprecated */
	Attacker = "attacker",
	/** @deprecated */
	Healer = "healer",
	TmpDefense = "tmpdefense",
	Scout = "scout",
	Worker = "worker",
}

export abstract class CreepRole {
	public creepName: string;

	public constructor(creep: Creep | string) {
		this.creepName = creep instanceof Creep ? creep.name : creep;

		if (!this.creep) {
			throw new Error(`Creep ${this.creepName} does not exist.`);
		}
	}
	public get creep(): Creep {
		return Game.creeps[this.creepName];
	}

	protected log(message: string): void {
		this.creep.log(message);
	}

	public abstract run(): void;
}
