# Nursery Bounded Context

The **Nursery** bounded context is responsible for managing patient feeding, elimination records, and measurement data (flow sheets) within the veterinary hospitalization system. This context follows Domain-Driven Design (DDD) patterns and maintains a flat module structure consistent with other bounded contexts in the system.

## Domain Model

### Aggregate Roots

- **IntakeOutput**: Manages collections of feeding and elimination records for a specific hospitalization.
- **FlowSheetRecord**: Manages collections of measurements (vitals) for a specific hospitalization.

### Value Objects

- **Feeding**: Represents patient intake records (oral fluids, IV fluids, feeding, medications)
- **Elimination**: Represents patient output records (feces, diarrhea, vomit, urine)
- **Measurement**: Represents patient measurements with date/time, measurement ID, value, and optional notes

### Enums

- **FeedingTypeEnum**: Types of feeding (ORAL_FLUIDS, IV_FLUIDS, FEEDING, MEDICATIONS)
- **FeedingCategoryEnum**: Categories for feeding type (KEEBLE, WET, RECOVERY) - only applicable when type is FEEDING
- **EliminationTypeEnum**: Types of elimination (FECES, DIARRHEA, VOMIT, URINE)
- **MeasurementTypeEnum**: Types of measurements (HR, RR, TEMP, BP, GLUCOSE, etc.)

### Constants

- **RoundPlan**: Defines standard measurement sets for different types of medical rounds (STANDARD_VITALS, COMPREHENSIVE, NEUROLOGICAL, POST_OPERATIVE, ICU)

## Domain Events

- **PatientIntakeRecordedEvent**: Published when a feeding record is added
- **PatientOutputRecordedEvent**: Published when an elimination record is added
- **PatientMeasurementsRecordedEvent**: Published when measurements are recorded (medical rounds or continuous measurements)

## Business Rules

### Feeding Rules

- When `type` is `FEEDING`, both `feedingCategory` and `appetiteScore` (0-10) are required
- When `type` is not `FEEDING`, `feedingCategory` and `appetiteScore` must not be provided
- Notes are limited to 500 characters
- Date/time is always required

### Elimination Rules

- All eliminations require a `type` and `aspect` description
- Aspect must be between 1-200 characters
- Date/time is always required

### Aggregate Rules

- One IntakeOutput per hospitalization
- Feedings and eliminations are sorted by date/time in descending order
- Events are published for each new feeding or elimination record

## Service Layer

### IntakeOutputService

The domain service that orchestrates intake and output recording operations:

- `recordIntake()`: Records a new feeding entry
- `recordOutput()`: Records a new elimination entry

Both methods require appropriate user roles (MED_VET or VET_ASSISTANT).

### FlowSheetService

The domain service that orchestrates measurement recording operations:

- `recordMedicalRound()`: Records measurements for a specific round type with predefined measurement requirements
- `recordContinuousMeasurements()`: Records on-demand measurements specified by the user

Both methods require appropriate user roles (MED_VET or VET_ASSISTANT).

## API Endpoints

### Record Intake

```
POST /nursery/intake-outputs/{hospitalizationId}/intakes
```

Request body for feeding:

```json
{
	"dateTime": "2024-01-01T10:00:00Z",
	"type": "FEEDING",
	"notes": "Pet ate well",
	"feedingCategory": "WET",
	"appetiteScore": 8
}
```

Request body for other types:

```json
{
	"dateTime": "2024-01-01T10:00:00Z",
	"type": "ORAL_FLUIDS",
	"notes": "Administered oral fluids"
}
```

### Record Elimination

```
POST /nursery/intake-outputs/{hospitalizationId}/eliminations
```

Request body:

```json
{
	"dateTime": "2024-01-01T10:00:00Z",
	"type": "FECES",
	"aspect": "firm, normal color"
}
```

### Record Medical Round

```
POST /nursery/flowsheets/{hospitalizationId}/medical-rounds
```

Request body:

```json
{
	"dateTime": "2024-01-01T10:00:00Z",
	"roundType": "STANDARD_VITALS",
	"measurements": [
		{
			"measurementId": "HR",
			"value": "85",
			"notes": "Regular rhythm"
		},
		{
			"measurementId": "RR",
			"value": "22",
			"notes": "Normal breathing"
		},
		{
			"measurementId": "TEMP",
			"value": "38.5",
			"notes": "Slight fever"
		}
	]
}
```

### Record Continuous Measurements

```
POST /nursery/flowsheets/{hospitalizationId}/continuous-measurements
```

Request body:

```json
{
	"dateTime": "2024-01-01T10:00:00Z",
	"measurements": [
		{
			"measurementId": "GLUCOSE",
			"value": "120",
			"notes": "mg/dL"
		},
		{
			"measurementId": "PAIN",
			"value": "3",
			"notes": "Mild discomfort"
		}
	]
}
```

### Get Available Round Types

```
GET /nursery/flowsheets/round-types
```

### Get Available Measurement Types

```
GET /nursery/flowsheets/measurement-types
```

## File Structure

```
src/nursery/
├── feeding_type_enum.ts           # Feeding type enumeration
├── feeding_category_enum.ts       # Feeding category enumeration
├── elimination_type_enum.ts       # Elimination type enumeration
├── measurement_type_enum.ts       # Measurement type enumeration
├── feeding.ts                     # Feeding value object
├── elimination.ts                 # Elimination value object
├── measurement.ts                 # Measurement value object
├── round_plan.ts                  # Round plan constants for medical rounds
├── intake_output.ts              # IntakeOutput aggregate root
├── flowsheet_record.ts           # FlowSheetRecord aggregate root
├── patient_intake_recorded_event.ts       # Intake domain event
├── patient_output_recorded_event.ts       # Output domain event
├── patient_measurements_recorded_event.ts # Measurements domain event
├── intake_output_repository.ts    # IntakeOutput repository interface
├── inmem_intake_output_repository.ts      # In-memory IntakeOutput repository
├── flowsheet_record_repository.ts         # FlowSheetRecord repository interface
├── inmem_flowsheet_record_repository.ts   # In-memory FlowSheetRecord repository
├── intake_output_not_found_error.ts       # IntakeOutput domain error
├── flowsheet_record_not_found_error.ts    # FlowSheetRecord domain error
├── intake_output_service.ts       # IntakeOutput domain service
├── flowsheet_service.ts           # FlowSheetRecord domain service
├── nursery_http_handlers.ts       # HTTP request handlers for intake/output
├── flowsheet_http_handlers.ts     # HTTP request handlers for measurements
├── nursery_http_oak_router.ts     # Main nursery router configuration
├── flowsheet_http_oak_router.ts   # FlowSheet router configuration
├── feeding_test.ts               # Feeding value object tests
├── elimination_test.ts           # Elimination value object tests
├── measurement_test.ts           # Measurement value object tests
├── intake_output_test.ts         # IntakeOutput aggregate root tests
├── flowsheet_record_test.ts      # FlowSheetRecord aggregate root tests
├── intake_output_service_test.ts # IntakeOutput service layer tests
├── flowsheet_service_test.ts     # FlowSheetService layer tests
└── README.md                     # This file
```

## Dependencies

The nursery context depends on shared utilities:

- `@shared/id_value.ts` - For entity identifiers
- `@shared/date_value.ts` - For date handling
- `@shared/either.ts` - For error handling
- `@shared/validation_error.ts` - For validation errors
- `@shared/event.ts` - For domain events
- `@shared/user_role_enum.ts` - For authorization
- `@shared/context.ts` - For request context
- `@shared/event_bus.ts` - For event publishing
- `@shared/http_handler.ts` - For HTTP request handling

## Testing

All components include comprehensive unit tests covering:

- Value object validation and immutability
- Aggregate behavior and event publishing
- Service layer business logic and error handling
- Repository operations
- Authorization rules

Run tests with:

```bash
deno test src/nursery/
```

## Usage Example

```typescript
// Create services
const eventBus = new InMemEventBus();
const intakeOutputRepository = new InmemIntakeOutputRepository();
const flowSheetRepository = new InmemFlowSheetRecordRepository();
const intakeOutputService = new IntakeOutputService(
	eventBus,
	intakeOutputRepository,
);
const flowSheetService = new FlowSheetService(eventBus, flowSheetRepository);

// Record feeding
await intakeOutputService.recordIntake(context, {
	hospitalizationId: "hosp-123",
	dateTime: "2024-01-01T10:00:00Z",
	type: FeedingTypeEnum.FEEDING,
	notes: "Pet ate well",
	feedingCategory: FeedingCategoryEnum.WET,
	appetiteScore: 8,
});

// Record elimination
await intakeOutputService.recordOutput(context, {
	hospitalizationId: "hosp-123",
	dateTime: "2024-01-01T12:00:00Z",
	type: EliminationTypeEnum.FECES,
	aspect: "firm, normal color",
});

// Record medical round
await flowSheetService.recordMedicalRound(context, {
	hospitalizationId: "hosp-123",
	dateTime: "2024-01-01T08:00:00Z",
	roundType: "STANDARD_VITALS",
	measurements: [
		{
			measurementId: MeasurementTypeEnum.HEART_RATE,
			value: "85",
			notes: "Regular",
		},
		{
			measurementId: MeasurementTypeEnum.RESPIRATORY_RATE,
			value: "22",
			notes: "Normal",
		},
		{
			measurementId: MeasurementTypeEnum.TEMPERATURE,
			value: "38.5",
			notes: "Slight fever",
		},
	],
});

// Record continuous measurements
await flowSheetService.recordContinuousMeasurements(context, {
	hospitalizationId: "hosp-123",
	dateTime: "2024-01-01T14:00:00Z",
	measurements: [
		{
			measurementId: MeasurementTypeEnum.GLUCOSE,
			value: "120",
			notes: "mg/dL",
		},
		{
			measurementId: MeasurementTypeEnum.PAIN_SCORE,
			value: "3",
			notes: "Mild discomfort",
		},
	],
});
```
