export enum ERROR_MESSAGES {
	INVALID_ENTRY_DATE = "Data de entrada não pode ser menor que a data actual.",
	INVALID_DISCHARGE_DATE = "Data prevista para alta médica não pode ser menor que a data actual.",
	INVALID_COMPLAINTS_NUMBER = "Número de queixas não pode ser maior que 10.",
	INVALID_DIAGNOSTICS_NUMBER = "Número de diagnósticos não pode ser maior que 5.",
	INVALID_HEART_RATE = "Frequência cardíaca não deve ser maior que 300 BPM.",
	INVALID_RESPIRATORY_RATE = "Frequência respiratória não deve ser maior que 100 RPM.",
	INVALID_TRC = "TRC não deve ser maior que 10'.",
	INVALID_AVDN = "AVDN inválida'.",
	INVALID_MUCOSAS = "Mucosas inválidas'.",
	INVALID_TEMPERATURE = "Temperatura não deve ser maior que 100 ºC'.",
	INVALID_BLOOD_GLUCOSE = "Glicemia não deve ser maior que 300 mg/dL.",
	INVALID_HCT = "HCT não deve ser maior que 100%.",
	INVALID_BLOOD_PRESSURE = "Pressão arterial não deve ser maior que 280/180 mmHg.",
}