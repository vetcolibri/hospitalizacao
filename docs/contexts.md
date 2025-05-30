# Vet Application Bounded Contexts

## 1. Pet & Owner Management Context

- **Purpose**: Manages pet and owner data, including identification, contact details, and relationships.
- **Key Entities**:
  - Pet (ID, Name, Species, Breed, Age, Medical History)
  - Owner (ID, Name, Contact, Address)

## 2. Hospitalization Management Context

- **Purpose**: Handles pet admissions, hospital stays, assigned rooms, and discharge processes.
- **Key Entities**:
  - Hospitalization (ID, Pet, Start Date, End Date, Assigned Room, Status, Contact Person, Notes)
  - Veterinarian Assignment (Vet, Pet, Role in Care)

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
