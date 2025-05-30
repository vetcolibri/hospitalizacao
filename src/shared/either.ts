export type Either<L, R> = Left<L, R> | Right<L, R>;

export class Left<L, R> {
	readonly value: L;

	constructor(value: L) {
		this.value = value;
	}

	isLeft(): this is Left<L, R> {
		return true;
	}

	isRight(): this is Right<L, R> {
		return false;
	}

	get left(): L {
		return this.value;
	}

	get right(): R {
		throw new Error("Either.Left: it is not a right");
	}
}

export class Right<L, R> {
	readonly value: R;

	constructor(value: R) {
		this.value = value;
	}

	isLeft(): this is Left<L, R> {
		return false;
	}

	isRight(): this is Right<L, R> {
		return true;
	}

	get left(): L {
		throw new Error("Either.Right: it is not a left");
	}

	get right(): R {
		return this.value;
	}
}

export const left = <L, R>(l: L): Either<L, R> => {
	return new Left<L, R>(l);
};

export const right = <L, R>(a: R): Either<L, R> => {
	return new Right<L, R>(a);
};
