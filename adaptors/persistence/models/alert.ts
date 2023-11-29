import { DataTypes, Model } from "https://deno.land/x/denodb@v1.4.0/mod.ts";

export class Alert extends Model {
	static table = "alerts";
	static timestamps = true;

	static fields = {
		alertId: DataTypes.UUID,
		parameters: DataTypes.JSON,
		repeatEvery: DataTypes.INTEGER,
		time: DataTypes.DATETIME,
		status: DataTypes.STRING,
		comments: DataTypes.TEXT,
	};
}
