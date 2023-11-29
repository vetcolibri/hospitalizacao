import { DataTypes, Model } from "https://deno.land/x/denodb@v1.4.0/mod.ts";
export class Measurement extends Model {
	static table = "measurements";
	static timestamps = true;

	static fields = {
		name: DataTypes.STRING,
		value: DataTypes.STRING,
		issuedAt: DataTypes.DATETIME,
	};
}
