import { describe, expect, it } from 'vitest';
import { donorToFhirPatient } from './export-fhir.js';

describe('FHIR Export mapping', () => {
  it('maps a clean donor row to a valid FHIR Patient resource', () => {
    const donor = {
      donor_id: 'DNR-000001',
      sex: 'M',
      birth_date: '1990-05-15',
      blood_group: 'O+',
      home_county: 'Nairobi',
      registration_date: '2024-01-10',
      registration_site_id: 'RBTC-NBO',
      phone_last4: '4321',
    };

    const patient = donorToFhirPatient(donor);

    expect(patient.resourceType).toBe('Patient');
    expect(patient.id).toBe('DNR-000001');
    expect(patient.identifier[0]).toEqual({
      system: 'https://kenya.health.gov/identifiers/donors',
      value: 'DNR-000001',
    });
    expect(patient.gender).toBe('male');
    expect(patient.birthDate).toBe('1990-05-15');
    expect(patient.address?.[0].district).toBe('Nairobi');
    expect(patient.telecom?.[0].value).toBe('XXXXX4321');
    expect(patient.extension?.[0]).toEqual({
      url: 'http://hl7.org/fhir/StructureDefinition/patient-bloodGroup',
      valueString: 'O+',
    });
  });

  it('handles null or missing optional fields gracefully', () => {
    const donor = {
      donor_id: 'DNR-000002',
      sex: null,
      birth_date: null,
      blood_group: null,
      home_county: null,
      registration_date: null,
      registration_site_id: null,
      phone_last4: null,
    };

    const patient = donorToFhirPatient(donor);

    expect(patient.resourceType).toBe('Patient');
    expect(patient.id).toBe('DNR-000002');
    expect(patient.gender).toBe('unknown');
    expect(patient.birthDate).toBeUndefined();
    expect(patient.address).toBeUndefined();
    expect(patient.telecom).toBeUndefined();
  });
});

