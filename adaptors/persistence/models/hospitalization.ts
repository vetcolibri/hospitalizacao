import { DataTypes, Model } from "https://deno.land/x/denodb@v1.4.0/mod.ts";

export class Hospitalization extends Model {
	static table = "hospitalizations";
	static timestamps = true;

	static fields = {
		hospitalizationId: DataTypes.UUID,
		weight: DataTypes.FLOAT,
		complaints: DataTypes.JSON,
		diagnostics: DataTypes.JSON,
		entryDate: DataTypes.DATE,
		dischargeDate: DataTypes.DATE,
		status: DataTypes.string(50),
	};
}
