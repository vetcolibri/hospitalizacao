import { MeasurementType, MeasurementTypeIdValue } from "./measurement_type.ts";

export const MEASUREMENT_TYPES: Record<string, MeasurementType> = {
	HeartRate: MeasurementType.create(
		MeasurementTypeIdValue.fromString("HR").right,
		"Frequência Cardíaca",
		"BPM",
		"Continuous",
		{
			normal: ["Normal", [70, 120]],
			veryLow: ["Muito Baixo", [0, 40]],
			low: ["Baixo", [40, 70]],
			veryHigh: ["Muito Alto", [140, 200]],
			high: ["Alto", [120, 140]],
		},
	).right,

	RespiratoryRate: MeasurementType.create(
		MeasurementTypeIdValue.fromString("RR").right,
		"Frequência Respiratória",
		"RPM",
		"Continuous",
		{
			normal: ["Normal", [12, 20]],
			veryLow: ["Muito Baixo", [0, 6]],
			low: ["Baixo", [6, 12]],
			veryHigh: ["Muito Alto", [30, 40]],
			high: ["Alto", [20, 30]],
		},
	).right,

	TRC: MeasurementType.create(
		MeasurementTypeIdValue.fromString("TRC").right,
		"TRC",
		"",
		"Discrete",
		{
			normal: ["Maior que 2'", [">2'"]],
			low: ["Menor que 2'", ["<2'"]],
		},
	).right,

	AVDN: MeasurementType.create(
		MeasurementTypeIdValue.fromString("AVDN").right,
		"AVDN",
		"",
		"Discrete",
		{
			normal: ["Alerta", ["Alerta"]],
			low: ["", ["Doloso", "Verbal"]],
			veryLow: ["", ["Não Responsivo"]],
		},
	).right,

	Mucous: MeasurementType.create(
		MeasurementTypeIdValue.fromString("MCSS").right,
		"Mucosas",
		"",
		"Continuous",
		{
			normal: ["Normal", ["Cianóticas", "Congestivas", "Ictéricas", "Pálidas", "Rosadas"]],
		},
	).right,

	Temperature: MeasurementType.create(
		MeasurementTypeIdValue.fromString("TEMP").right,
		"Temperatura",
		"°C",
		"Continuous",
		{
			normal: ["Normal", [37.5, 39]],
			veryLow: ["Muito Baixo", [0, 35]],
			low: ["Baixo", [35, 37.5]],
			high: ["Alto", [39, 40]],
			veryHigh: ["Muito Alto", [40, 42]],
		},
	).right,

	Glycemia: MeasurementType.create(
		MeasurementTypeIdValue.fromString("GLY").right,
		"Glicemia",
		"mg/dL",
		"Continuous",
		{
			normal: ["Normal", [60, 100]],
			veryLow: ["Muito Baixo", [0, 40]],
			low: ["Baixo", [40, 60]],
			high: ["Alto", [100, 180]],
			veryHigh: ["Muito Alto", [180, 300]],
		},
	).right,

	HTC_Canine: MeasurementType.create(
		MeasurementTypeIdValue.fromString("HTC").right,
		"HTCC",
		"%",
		"Continuous",
		{
			normal: ["Normal", [37, 55]],
			veryLow: ["Muito Baixo", [0, 20]],
			low: ["Baixo", [20, 37]],
			high: ["Alto", [55, 70]],
		},
	).right,

	HTC_Feline: MeasurementType.create(
		MeasurementTypeIdValue.fromString("HTC_FELINE").right,
		"HTCF",
		"%",
		"Continuous",
		{
			normal: ["Normal", [24, 45]],
			veryLow: ["Muito Baixo", [0, 15]],
			low: ["Baixo", [15, 24]],
			high: ["Alto", [45, 60]],
			veryHigh: ["Muito Alto", [60, 70]],
		},
	).right,

	BloodPressure_Systolic: MeasurementType.create(
		MeasurementTypeIdValue.fromString("SBP").right,
		"Pressão Arterial Sistólica",
		"mmHg",
		"Continuous",
		{
			normal: ["Normal", [90, 130]],
			veryLow: ["Muito Baixo", [0, 60]],
			low: ["Hipotensão", [60, 90]],
			high: ["Hipertensão", [130, 180]],
			veryHigh: ["Muito Alto", [180, 250]],
		},
	).right,

	BloodPressure_Diastolic: MeasurementType.create(
		MeasurementTypeIdValue.fromString("DBP").right,
		"Pressão Arterial Diastólica",
		"mmHg",
		"Continuous",
		{
			normal: ["Normal", [60, 80]],
			veryLow: ["Muito Baixo", [0, 40]],
			low: ["Hipotensão", [40, 60]],
			high: ["Hipertensão", [80, 110]],
			veryHigh: ["Muito Alto", [110, 150]],
		},
	).right,

	BloodPressure_PAM: MeasurementType.create(
		MeasurementTypeIdValue.fromString("PAM").right,
		"Pressão Arterial Média",
		"mm/Hg",
		"Continuous",
		{
			normal: ["Normal", [60, 60]],
			low: ["Hipotensão", [40, 59]],
			high: ["Hipertensão", [61, 80]],
		},
	).right,
};
