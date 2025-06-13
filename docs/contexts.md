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

1.  **Admission:** When a pet is admitted, a `Hospitalization` record is created. The system captures the pet's details (`PetID`, `PetName`, etc.) and the legal owner's details (`OwnerID`, `OwnerName`) as a permanent part of that record. The `InitialDiagnosis` is recorded based on the admitting veterinarian's assessment.
2.  **Diagnosis Evolution:** During the stay, as more information becomes available (e.g., from blood tests or imaging), a veterinarian can update the `ActualDiagnosis` field to reflect a more precise understanding of the pet's condition.

#### **Contact and Owner Management**

- **Immutable Admission Records:** The pet and owner details captured at admission (`PetName`, `OwnerName`, etc.) are fixed for this hospitalization record. This ensures that even if the pet's legal ownership changes years later, the history of who owned the pet during this specific stay is preserved.
- **Flexible Contact Person:** The `CurrentContactPerson` can be changed at any point during the hospitalization without affecting the historical owner record, ensuring communication is always directed to the correct individual.

#### **Reporting and Discharge**

1.  **Periodic Reporting:** The workflow for creating and sharing periodic reports remains the same. Staff create reports detailing the pet's status, which are then added to the `ReportsBlogURL`.
2.  **Discharge Process:** When the veterinarian decides to discharge the pet, they execute the `DischargePet` action. This requires them to record the final `StateAtDischarge` and sets the `DischargeDate`, formally closing the hospitalization period.

## 3. Billing & Payment Context

- **Purpose**: Tracks hospitalization costs, estimates, and payments.
- **Key Entities**:
  - Invoice (ID, Pet, Owner, Amount, Payment Status)
  - Payment (ID, Amount, Method, Date)
  - Budget Estimate (Treatment Plan, Estimated Cost, Approved Status)

## 4. Rounds & Measurement Context (Nursery)

- **Purpose**: Logs vital signs, medical observations, and treatment progress.
- **Key Entities**:
  - Round (Vet, Pet, Date, Notes, Next Round Due)
  - Measurement (Temperature, Heart Rate, Weight, Custom Vitals)
  - Treatment Plan (Medication, Dosage, Schedule)

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
