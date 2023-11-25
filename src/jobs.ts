import util from "./util";

/**
 * A job is a function that is run on a set tick interval.
 */
export interface Job {
	name: string;
	run: (this: void, ...args: unknown[]) => void;
	interval: number;
}

let instance: JobRunner | undefined;

export class JobRunner {
	private get lastRun(): { [jobName: string]: number } {
		return Memory.jobLastRun;
	}

	private set lastRun(value: { [jobName: string]: number }) {
		Memory.jobLastRun = value;
	}

	public static getInstance(): JobRunner {
		if (!instance) {
			instance = new JobRunner();
		}
		// @ts-expect-error this is so that the job runner is available in the global context, and can be accessed from the console
		global.jobs = instance;
		return instance;
	}

	private jobs: Job[] = [];
	private queued: [number, unknown[]][] = [];
	private deferedJobs: [number, unknown[]][] = [];
	private delayedJobs: [number, number][] = [];

	private constructor() {
		if (instance) {
			return instance;
		}
		if (!this.lastRun) {
			this.lastRun = {};
		}
		instance = this;
	}

	public registerJob(job: Job): void {
		// make sure we don't have a job with the same name
		for (const existingJob of this.jobs) {
			if (existingJob.name === job.name) {
				console.log(`JobRunner: job with name ${job.name} already exists!`);
				return;
			}
		}
		this.jobs.push(job);
	}

	public queueJobs(): void {
		if (this.jobs.length === 0) {
			console.log("JobRunner: WARNING: no jobs registered! This is probably a bug.");
			return;
		}

		if (this.deferedJobs.length > 0) {
			this.queued = this.queued.concat(this.deferedJobs);
			this.deferedJobs = [];
		}

		for (const [j, job] of this.jobs.entries()) {
			if (this.lastRun[job.name] === undefined) {
				this.lastRun[job.name] = -1;
			}

			if (Game.time - this.lastRun[job.name] >= job.interval) {
				this.queued.push([j, []]);
				this.lastRun[job.name] = Game.time;
				console.log("JobRunner: queued job", job.name);
			}
		}
	}

	public runJobs(): void {
		while (this.queued.length > 0 && (Game.cpu.getUsed() < Game.cpu.limit * 0.7 || util.isSimulationMode())) {
			const item = this.queued.pop();
			if (item === undefined) {
				continue;
			}
			const [i, args] = item;
			const job = this.jobs[i];
			console.log("JobRunner: running job", job.name);
			try {
				job.run(...args);
			} catch (e) {
				console.log("ERR: Job failed", job.name);
				util.printException(e);
				continue;
			}
			this.lastRun[this.jobs[i].name] = Game.time;
		}
		for (const [j, delay] of this.delayedJobs) {
			const job = this.jobs[j];
			this.lastRun[job.name] = Game.time - job.interval + delay;
		}
		this.delayedJobs = [];
	}

	/**
	 * Force a job to run on the next tick.
	 *
	 * Optionally with arguments.
	 */
	public forceRunNextTick(jobName: string, ...args: unknown[]): void {
		for (const [j, job] of this.jobs.entries()) {
			if (job.name === jobName) {
				this.deferedJobs.push([j, args]);
				console.log("JobRunner: forced job next tick", job.name);
				return;
			}
		}
		console.log(`JobRunner: could not find job with name ${jobName}!`);
	}

	public forceRunAfter(jobName: string, afterTicks: number): void {
		if (afterTicks < 1) {
			console.log("JobRunner: forceRunAfter: afterTicks must be >= 1");
			return;
		}
		if (afterTicks === Infinity) {
			console.log("JobRunner: forceRunAfter: afterTicks must be finite");
			return;
		}
		for (const [j, job] of this.jobs.entries()) {
			if (job.name === jobName) {
				this.delayedJobs.push([j, afterTicks]);
				console.log(`JobRunner: forced job ${jobName} after ${afterTicks} ticks`);
				return;
			}
		}
		console.log(`JobRunner: could not find job with name ${jobName}!`);
	}

	public getInterval(jobName: string): number | undefined {
		for (const job of this.jobs) {
			if (job.name === jobName) {
				return job.interval;
			}
		}
		return undefined;
	}
}
