export class NotImplementedException extends Error {
	public constructor(message: string) {
		super(message);
		this.name = "NotImplementedException";
	}
}
