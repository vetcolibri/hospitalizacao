import { DataTypes, Model } from "https://deno.land/x/denodb@v1.4.0/mod.ts";

export class Owner extends Model {
	static table = "owners";
	static timestamps = true;

	static fields = {
		owenId: DataTypes.STRING,
		name: DataTypes.string(50),
		phoneNumber: DataTypes.string(9),
	};
}
