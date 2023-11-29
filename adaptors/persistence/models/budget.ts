import { DataTypes, Model } from "https://deno.land/x/denodb@v1.4.0/mod.ts";

export class Budget extends Model {
	static table = "budgets";
	static timestamps = true;

	static fields = {
		budgetId: DataTypes.UUID,
		startOn: DataTypes.DATE,
		endOn: DataTypes.DATE,
		status: DataTypes.string(50),
	};
}
