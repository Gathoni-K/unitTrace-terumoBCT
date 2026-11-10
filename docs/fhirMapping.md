# HL7 FHIR Standards Mapping

This document details how the UnitTrace / Kenya Blood System data structures map to the **HL7 FHIR (Fast Healthcare Interoperability Resources) Release 4 (R4) / R5** clinical and supply specifications.

---

## 1. Entity Mapping Overview

| UnitTrace Database Entity | HL7 FHIR Resource | Description |
|---|---|---|
| `public.donors` / `donors_clean` | `Patient` | Demographic identity of the blood donor. |
| `public.units` | `BiologicallyDerivedProduct` | Collected, separated, and tested blood unit product. |
| `public.donations` | `Procedure` / `BiologicallyDerivedProduct.collection` | Blood collection encounter / donation event. |
| `public.requests` / `requests_clean` | `ServiceRequest` | Clinical hospital order for transfusion units. |
| `public.transfers` / `transfers_clean` | `SupplyDelivery` | Logistics movement of units across regional hubs and facilities. |
| `public.facilities` | `Location` / `Organization` | Physical blood bank or transfusion hospital site. |
| `public.temperature_logs` | `Observation` | Cold-chain continuous temperature sensor readings. |

---

## 2. Donors → HL7 FHIR `Patient`

| UnitTrace Column | FHIR Field | Format / Structure | Notes |
|---|---|---|---|
| `donor_id` | `Patient.id`, `Patient.identifier` | `Identifier` with `system: "https://kenya.health.gov/identifiers/donors"` | Primary national donor ID |
| `sex` | `Patient.gender` | `male` \| `female` \| `other` \| `unknown` | Lowercased code |
| `birth_date` | `Patient.birthDate` | `YYYY-MM-DD` | Masked in standard clerk views (`YYYY-XX-XX`) |
| `phone_last4` | `Patient.telecom` | `ContactPoint` (`system: "phone"`, `value: "XXXXX1234"`) | PII masked for privacy |
| `home_county` | `Patient.address` | `Address` (`district: home_county`, `country: "KE"`) | County administrative unit |
| `registration_date` | `Patient.meta.extension` | `Extension` (`url: ".../registrationDate"`) | Date donor first enrolled |
| `blood_group` | `Patient.extension` | `Extension` (`url: "http://hl7.org/fhir/StructureDefinition/patient-bloodGroup"`) | ABO and Rh factor (e.g., `A+`, `O-`) |

### Example FHIR `Patient` Resource:
```json
{
  "resourceType": "Patient",
  "id": "DNR-000001",
  "identifier": [
    {
      "system": "https://kenya.health.gov/identifiers/donors",
      "value": "DNR-000001"
    }
  ],
  "active": true,
  "gender": "male",
  "birthDate": "1994-06-15",
  "address": [
    {
      "district": "Nairobi",
      "country": "KE"
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "XXXXX1234"
    }
  ],
  "extension": [
    {
      "url": "http://hl7.org/fhir/StructureDefinition/patient-bloodGroup",
      "valueString": "O+"
    }
  ]
}
```

---

## 3. Units → HL7 FHIR `BiologicallyDerivedProduct`

| UnitTrace Column | FHIR Field | Notes |
|---|---|---|
| `unit_id` | `BiologicallyDerivedProduct.identifier` | ISBT 128 / National barcode (e.g. `U2509-NBO-000035-CRYO`) |
| `donation_id` | `BiologicallyDerivedProduct.collection.source` | Reference to collection procedure or donor |
| `blood_group` | `BiologicallyDerivedProduct.extension` | ABO/Rh typing of the blood component |
| `component` | `BiologicallyDerivedProduct.productCategory` | `biologicalAgent` with code `RBC`, `FFP`, `PLT`, `CRYO`, `WB` |
| `collection_date` | `BiologicallyDerivedProduct.collection.collectedDateTime` | Date/time phlebotomy completed |
| `expiry_date` | `BiologicallyDerivedProduct.expirationDate` | Shelf-life validity limit |
| `processed_at_id`| `BiologicallyDerivedProduct.processing.addon` | Regional blood transfusion centre (RBTC) |

---

## 4. Transfers → HL7 FHIR `SupplyDelivery`

| UnitTrace Column | FHIR Field | Notes |
|---|---|---|
| `transfer_id` | `SupplyDelivery.identifier` | Tracking dispatch manifest ID |
| `unit_id` | `SupplyDelivery.suppliedItem.itemReference` | Reference to `BiologicallyDerivedProduct` |
| `from_facility_id` | `SupplyDelivery.supplier` | Reference to dispatching `Location` |
| `to_facility_id` | `SupplyDelivery.destination` | Reference to receiving `Location` |
| `dispatched_at` | `SupplyDelivery.occurrencePeriod.start` | Departure timestamp |
| `received_at` | `SupplyDelivery.occurrencePeriod.end` | Receipt confirmation timestamp |
| `status` | `SupplyDelivery.status` | `in-progress` (if `received_at is null`) or `completed` |

---

## 5. Requests → HL7 FHIR `ServiceRequest`

| UnitTrace Column | FHIR Field | Notes |
|---|---|---|
| `request_id` | `ServiceRequest.identifier` | Hospital request order number |
| `facility_id` | `ServiceRequest.requester` | Reference to requesting `Location` |
| `requested_at` | `ServiceRequest.authoredOn` | Timestamp clinical order entered |
| `urgency` | `ServiceRequest.priority` | `routine` \| `urgent` \| `stat` \| `asap` |
| `patient_blood_group` | `ServiceRequest.orderDetail` | Required ABO/Rh compatibility parameter |

