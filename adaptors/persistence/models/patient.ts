import { DataTypes, Model } from "https://deno.land/x/denodb@v1.4.0/mod.ts";

export class Patient extends Model {
	static table = "patients";
	static timestamps = true;

	static fields = {
		patientId: DataTypes.STRING,
		name: DataTypes.string(50),
		specie: DataTypes.string(50),
		breed: DataTypes.string(50),
		birthDate: DataTypes.DATE,
		status: DataTypes.string(50),
	};
}
