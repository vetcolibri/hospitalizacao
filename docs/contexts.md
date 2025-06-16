# Vet Application Bounded Contexts

## 1. Pet & Owner Management Context

- **Purpose**: Manages pet and owner data, including identification, contact details, and relationships.
- **Key Entities**:
  - Pet (ID, Name, Species, Breed, Age, Medical History)
  - Owner (ID, Name, Contact, Address)

Of course. Here is the updated explanation of the **Hospitalization Management Bounded Context**, revised with your specified additions and refinements.

---

## 2. Hospitalization Management Context

This context is responsible for managing all aspects of a pet's (dog or cat) stay at a veterinary clinic or hospital. Its primary focus is the detailed clinical monitoring of the hospitalized pet and ensuring clear, timely communication with the responsible parties.

---

### **Core Concepts & Entities**

#### **1. Hospitalization**

This is the central entity, the Aggregate Root, representing a single, continuous period of a pet's stay. It holds all the information related to a specific admission.

- **Attributes:**

  - `HospitalizationID`: A unique identifier for this specific stay.
  - `AdmissionDate`: The date and time the hospitalization began.
  - `EstimatedDischargeDate`: The initially planned date for the pet's discharge. This is for planning and communication purposes.
  - `DischargeDate`: The actual date and time the hospitalization ends. This is null while the pet is hospitalized.
  - `StateAtDischarge`: A description of the pet's condition at the moment of discharge (e.g., "Stable and recovering," "Referred for specialized surgery," "Deceased"). This field is filled in upon discharge.
  - `InitialDiagnosis`: A list of one or more predefined conditions or symptoms observed at admission (e.g., [`Vomiting`, `Dehydration`, `Lethargy`]).
  - `ActualDiagnosis`: A list of one or more definitive, confirmed diagnoses made during the hospitalization (e.g., [`Pancreatitis`, `Renal Insufficiency`]). This can be updated as test results become available.
  - `ReportsBlogURL`: A unique, shareable URL for this hospitalization's report log.

- **Pet Information (Snapshot at Admission):**

  - `PetID`: The permanent ID of the pet.
  - `PetName`: The pet's name.
  - `PetType`: The type of animal (e.g., `Dog`, `Cat`).
  - `PetAge`: The age of the pet at the time of admission (e.g., "3 years," "6 months").
  - `PetBreeds`: A list of the pet's breeds (e.g., [`Labrador Retriever`] or [`Mixed`, `German Shepherd`]).

- **Owner Information (Snapshot at Admission):**

  - `OwnerID`: The unique ID of the person who was the legal owner at the time of admission.
  - `OwnerName`: The full name of the owner.

- **Contact Management:**

  - `CurrentContactPerson`: The person currently designated to receive updates and make decisions. This is a reference to a `ContactPerson` entity.

- **Behaviors (Actions):**
  - `AdmitPet()`: Creates a new hospitalization record.
  - `UpdateDiagnosis()`: Modifies the `ActualDiagnosis` list.
  - `ChangeContactPerson()`: Updates the `CurrentContactPerson`.
  - `DischargePet()`: Finalizes the stay, setting the `DischargeDate` and `StateAtDischarge`.

#### **2. Contact Person**

Represents an individual who can be responsible for the pet during its stay.

- **Attributes:**
  - `PersonID`: A unique identifier for the person.
  - `FullName`: The person's full name.
  - `WhatsAppNumber`: The primary number for sending report notifications.
  - `Email` (Optional).

#### **3. Periodic Report**

This entity captures a snapshot of the pet's status at a specific point in time. A `Hospitalization` will have a collection of these reports, creating a chronological log.

- **Attributes:**

  - `ReportID`: A unique identifier for this specific report.
  - `Timestamp`: The exact date and time the report was created.
  - `IsAwake`: A boolean value (true/false) indicating if the pet is conscious and alert.
  - `Annotations`: General notes from the veterinary staff (e.g., "Showed interest in toys," "Remains quiet but responsive").

- **Nested Entities within a Report:**
  - **Feeding Record:**
    - `TimeOfFeeding`: When the pet was fed.
    - `FoodType`: The kind of food provided.
    - `Appetite`: A qualitative measure (e.g., "Excellent," "Good," "Partial," "Refused").
  - **Physical Discharges (a list of zero or more):**
    - `DischargeType`: The type (e.g., `Urine`, `Poop`, `Vomit`).
    - `Aspect`: A description of the discharge.

### **Rules and Workflows Explained**

#### **Admission and Diagnosis**

1. **Admission:** When a pet is admitted, a `Hospitalization` record is created. The system captures the pet's details (`PetID`, `PetName`, etc.) and the legal owner's details (`OwnerID`, `OwnerName`) as a permanent part of that record. The `InitialDiagnosis` is recorded based on the admitting veterinarian's assessment.
2. **Diagnosis Evolution:** During the stay, as more information becomes available (e.g., from blood tests or imaging), a veterinarian can update the `ActualDiagnosis` field to reflect a more precise understanding of the pet's condition.

#### **Contact and Owner Management**

- **Immutable Admission Records:** The pet and owner details captured at admission (`PetName`, `OwnerName`, etc.) are fixed for this hospitalization record. This ensures that even if the pet's legal ownership changes years later, the history of who owned the pet during this specific stay is preserved.
- **Flexible Contact Person:** The `CurrentContactPerson` can be changed at any point during the hospitalization without affecting the historical owner record, ensuring communication is always directed to the correct individual.

#### **Reporting and Discharge**

1. **Periodic Reporting:** The workflow for creating and sharing periodic reports remains the same. Staff create reports detailing the pet's status, which are then added to the `ReportsBlogURL`.
2. **Discharge Process:** When the veterinarian decides to discharge the pet, they execute the `DischargePet` action. This requires them to record the final `StateAtDischarge` and sets the `DischargeDate`, formally closing the hospitalization period.

## 3. Billing & Payment Context

- **Purpose**: Tracks hospitalization costs, estimates, and payments.
- **Key Entities**:
  - Invoice (ID, Pet, Owner, Amount, Payment Status)
  - Payment (ID, Amount, Method, Date)
  - Budget Estimate (Treatment Plan, Estimated Cost, Approved Status)

## 4. Nursery Context

---

This section details the **Nursery Context** of the application, which is crucial for monitoring a pet's health and treatment progress during its hospitalization. It primarily focuses on capturing vital signs, medical observations, and tracking treatment efficacy.

### **Key Entities**

#### **4.1. Daily Round**

The **Daily Round** is the central aggregate within the Nursery Context, representing a comprehensive assessment of a pet's status at a specific point in time. It encapsulates all observations, measurements, and actions taken during a veterinarian's or technician's check-up.

- **Attributes:**

  - `RoundID`: A unique identifier for this specific daily round.
  - `HospitalizationID`: A reference to the `Hospitalization` entity this round belongs to.
  - `RoundTimestamp`: The exact date and time the round was conducted.
  - `VeterinarianID`: The ID of the veterinarian or veterinary technician who performed the round.
  - `VeterinarianName`: The name of the veterinarian or veterinary technician.
  - `GeneralNotes`: Overall observations and comments from the veterinary staff (e.g., "Pet appears more energetic," "Minimal response to stimuli").
  - `NextRoundDue`: The planned date and time for the next scheduled round, aiding in proactive care.

- **Behaviors (Actions):**
  - `StartNewRound()`: Initiates a new daily round for a hospitalized pet.
  - `AddObservation()`: Records a general observation or note.
  - `RecordMeasurement()`: Adds a new `Measurement Record` to the round.
  - `LogFeeding()`: Adds a `Feeding Record` to the round.
  - `LogPhysicalDischarge()`: Adds a `Physical Discharge` record to the round.
  - `FinalizeRound()`: Marks the round as complete and calculates `NextRoundDue`.

#### **4.2. Measurement Parameter**

**Measurement Parameter** defines the various vital signs or health indicators that can be monitored. It provides the metadata for how to interpret raw measurement values.

- **Attributes:**
  - `ParameterID`: A unique identifier for the measurement parameter (e.g., `TEMP`, `HR`, `BP`).
  - `Name`: A human-readable name for the parameter (e.g., "Body Temperature," "Heart Rate," "Blood Pressure").
  - `Unit`: The unit of measurement (e.g., `°C`, `BPM`, `mmHg`).
  - `NormalRange`: A defined range of values considered normal (e.g., `{Min: 37.5, Max: 39.2}`).
  - `HighThreshold`: The upper limit beyond which a measurement is considered high or critical.
  - `LowThreshold`: The lower limit below which a measurement is considered low or critical.

#### **4.3. Measurement Record**

A **Measurement Record** captures a single, specific measurement taken during a daily round.

- **Attributes:**
  - `RecordID`: A unique identifier for this measurement record.
  - `ParameterID`: A reference to the `Measurement Parameter` being recorded.
  - `Value`: The numerical value of the measurement (e.g., `38.5`, `120`, `90/60`).
  - `MeasurementTimestamp`: The exact date and time the measurement was taken (often the same as `RoundTimestamp` but can be more granular).
  - `Notes` (Optional): Specific comments related to this individual measurement.

#### **4.4. Feeding Record**

A **Feeding Record** details the pet's nutritional intake during a round.

- **Attributes:**
  - `FeedingID`: A unique identifier for this feeding instance.
  - `TimeOfFeeding`: The precise time the pet was fed.
  - `FoodType`: A description of the food provided (e.g., "Kibble," "Wet Food," "Prescription Diet").
  - `AmountGiven`: The quantity of food provided (e.g., "1 cup," "50g").
  - `Appetite`: A qualitative assessment of the pet's appetite (e.g., `Excellent`, `Good`, `Partial`, `Refused`).
  - `Notes` (Optional): Any additional observations related to feeding (e.g., "Ate slowly," "Vomited after eating").

#### **4.5. Physical Discharge**

**Physical Discharge** records any bodily excretions or discharges observed.

- **Attributes:**
  - `DischargeID`: A unique identifier for this discharge instance.
  - `DischargeType`: The type of discharge (e.g., `Urine`, `Feces`, `Vomit`, `Diarrhea`, `Bleeding`).
  - `Aspect`: A detailed description of the discharge's appearance, consistency, color, and volume (e.g., "Clear yellow urine, normal volume," "Dark brown, semi-formed feces," "Bloody vomit").
  - `Timestamp`: The time the discharge was observed.
  - `Notes` (Optional): Additional context or observations.

---

### **Rules and Workflows Explained**

#### **Monitoring and Documentation**

1.  **Scheduled Rounds:** Veterinarians or technicians initiate a `Daily Round` at scheduled intervals (e.g., every few hours, once a day) for each hospitalized pet.
2.  **Comprehensive Assessment:** During a round, staff record `Measurement Records` (e.g., temperature, heart rate, blood pressure), `Feeding Records`, and `Physical Discharges`. `GeneralNotes` are used to capture broader observations about the pet's demeanor, activity level, and overall well-being.
3.  **Dynamic Parameter Definition:** The `Measurement Parameter` entity allows for flexible definition of what vital signs are tracked, including their units and normal ranges. This supports different species, conditions, and evolving medical practices.
4.  **Chronological Logging:** Each `Daily Round` maintains a chronological log of all observations and treatments, providing a detailed history of the pet's progress throughout its hospitalization. This log is crucial for assessing treatment effectiveness and making informed decisions.

#### **Proactive Care and Communication**

1.  **Next Round Planning:** The `NextRoundDue` attribute in the `Daily Round` helps in planning and scheduling subsequent assessments, ensuring continuous and timely monitoring of the pet.
2.  **Integration with Hospitalization:** Each `Daily Round` is explicitly linked to a `Hospitalization` record, ensuring that all nursery-related data is associated with the correct pet's stay. This facilitates a holistic view of the pet's journey from admission to discharge.

---

## 5. Alert & Notification Context

- **Purpose**: Sends reminders for upcoming measurements and informs owners about hospitalization updates.
- **Key Entities**:
  - Alert (Type: Measurement, Treatment, Discharge, etc.)
  - Notification (Vet, Owner, Message, Timestamp)

## 6. Veterinarian Management Context

- **Purpose**: Manages veterinarian data, including identification, contact details, and availability.
- **Key Entities**:
  - Veterinarian (ID, Name, Specialty, Availability)
  - Nurse (ID, Name, Specialty, Availability)
