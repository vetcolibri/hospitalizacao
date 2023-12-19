export class RepeatEvery {
  private _value: number;

  constructor(value: number) {
    this._value = value;
  }

  isValid() {
    return this._value > 1;
  }

  get value(): number {
    return this._value;
  }
}
