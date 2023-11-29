import { DataTypes, Model } from "https://deno.land/x/denodb@v1.4.0/mod.ts";

export class Round extends Model {
	static table = "rounds";
	static timestamps = true;

	static fields = {
		roundId: DataTypes.UUID,
	};
}
