/**
 * TEST registry entries for the engine's TEST formulas (prompt 3 5.4 and phase 5: TEST formulas and their fields load
 * only inside the test runner; docs/adr/0047 "Built"). Every key carries "TEST"; none is a production field. The
 * production fields the mirrored formulas read are the production registry's own entries (`productionField`).
 *
 * Output fields: no production output field is registered while no SOVITECH dataset is approved (ADR 0047 decision
 * 2), so each TEST formula writes on a TEST output field declared here, with estimation allowed where its method is an
 * estimate (2.1) and the unit its output measures (2.7). Point outputs are quantities in the unit `count`, qualified by
 * their point type, because an estimate's central value is not a whole number (the registry's count fields hold whole
 * numbers only).
 *
 * Input fields: each TEST formula's own inputs, with the strict defaults (no tolerance, estimation forbidden,
 * `confirmBy` engineer unless the input is the owner's), as prompt 3 5.2 asks of registry values.
 */
import type { FieldDefinition } from '@sovitech/domain';
import { productionRegistry } from '@sovitech/registry';

/** A TEST field entry with the strict defaults. */
export function testFieldEntry(key: string, entry: Pick<FieldDefinition, 'kind' | 'subject'> & Partial<Omit<FieldDefinition, 'key'>>): FieldDefinition {
  if (!key.includes('TEST')) throw new Error(`a TEST field key carries TEST: ${key}`);
  return Object.freeze({
    label: `TEST ${key}`,
    estimation: 'forbidden',
    criticality: 'optional',
    affects: [],
    impactRank: 1,
    confirmBy: 'engineer',
    ...entry,
    key,
  });
}

/** The production registry's entry of a field the mirrored formulas read. Throws for a key it does not hold. */
export function productionField(key: string): FieldDefinition {
  const field = productionRegistry.fields.find((entry) => entry.key === key);
  if (field === undefined) throw new Error(`the production registry holds no field ${key}`);
  return field;
}

const estimatedOutput = (key: string, unit: string, qualifiers?: readonly string[]): FieldDefinition =>
  testFieldEntry(key, { kind: 'quantity', subject: 'project', unit, estimation: 'allowed', ...(qualifiers === undefined ? {} : { qualifiers }) });

/** The TEST output fields of the six mirrored formulas, by production output id. */
export const MIRRORED_OUTPUT_FIELDS = Object.freeze({
  'capex.indicativeRange': estimatedOutput('project.TEST_capexIndicativeRange', 'EUR'),
  'points.hardwareIo': estimatedOutput('project.TEST_pointsHardwareIo', 'count', ['hardware_io']),
  'points.integration': estimatedOutput('project.TEST_pointsIntegration', 'count', ['integration']),
  'points.virtual': estimatedOutput('project.TEST_pointsVirtual', 'count', ['virtual']),
  'capex.preliminaryEstimate': estimatedOutput('project.TEST_capexPreliminaryEstimate', 'EUR'),
  'energy.annualConsumption': estimatedOutput('project.TEST_annualEnergy', 'kWh/a'),
  'savings.annualEnergy': estimatedOutput('project.TEST_annualSavings', 'kWh/a'),
} satisfies Readonly<Record<string, FieldDefinition>>);

/** The 40 line items of G1-2's TEST total: a count of TEST devices each. */
export const LINE_ITEM_FIELDS: readonly FieldDefinition[] = Object.freeze(
  Array.from({ length: 40 }, (_, index) =>
    testFieldEntry(`building.TEST_lineItem${String(index + 1).padStart(2, '0')}`, {
      kind: 'count',
      subject: 'building',
      unit: 'count',
      label: `TEST line item ${String(index + 1).padStart(2, '0')}`,
    }),
  ),
);

/** The TEST periods of G8-7: twelve monthly bills of one metering point, in kWh as read. */
export const BILL_FIELDS: readonly FieldDefinition[] = Object.freeze(
  Array.from({ length: 12 }, (_, index) =>
    testFieldEntry(`metering_point.TEST_billM${String(index + 1).padStart(2, '0')}`, {
      kind: 'quantity',
      subject: 'metering_point',
      unit: 'kWh',
      label: `TEST bill for month ${String(index + 1).padStart(2, '0')}`,
    }),
  ),
);

/** The TEST fields of the extra formulas, by name. */
export const TEST_FIELDS = Object.freeze({
  // G1-2: the total and what is computed from it.
  capexLineItems: testFieldEntry('building.TEST_capexLineItems', { kind: 'quantity', subject: 'building', unit: 'EUR', estimation: 'allowed' }),
  annualReturn: testFieldEntry('building.TEST_annualReturn', { kind: 'quantity', subject: 'building', unit: 'EUR', estimation: 'allowed' }),
  // G1-7: existing field devices, and whether they are reused (a site survey settles it: rule 1 "Reuse").
  fieldDevices: testFieldEntry('building.TEST_fieldDevices', { kind: 'count', subject: 'building', unit: 'count' }),
  fieldDevicesReuse: testFieldEntry('building.TEST_fieldDevicesReuse', { kind: 'enum', subject: 'building', options: ['reuse', 'replace'], criticality: 'for_quotation' }),
  capexFieldDevices: testFieldEntry('building.TEST_capexFieldDevices', { kind: 'quantity', subject: 'building', unit: 'EUR', estimation: 'allowed' }),
  // G4-12: a calculated total of levels, which takes no range.
  levelsTotal: testFieldEntry('building.TEST_levelsTotal', { kind: 'count', subject: 'building', unit: 'count' }),
  // G4-4: a pump group's configuration (2.5), and its hardware points.
  pumpConfiguration: testFieldEntry('asset.TEST_pumpConfiguration', { kind: 'enum', subject: 'asset', options: ['single', 'duty_standby', 'twin_head', 'n_plus_1'] }),
  pumpHardwareIo: testFieldEntry('asset.TEST_pumpHardwareIo', { kind: 'quantity', subject: 'asset', unit: 'count', estimation: 'allowed', qualifiers: ['hardware_io'] }),
  // G8-7: the regularisation invoice for months 10 to 12. Its absence makes no total incomplete: those months have their own bills.
  regularisationM10M12: testFieldEntry('metering_point.TEST_regularisationM10M12', {
    kind: 'quantity',
    subject: 'metering_point',
    unit: 'kWh',
    minorForTotals: true,
    label: 'TEST regularisation invoice for months 10 to 12',
  }),
  annualConsumption: testFieldEntry('metering_point.TEST_annualConsumption', { kind: 'quantity', subject: 'metering_point', unit: 'kWh' }),
  // G8-8: a utility meter, a BMS sub-meter export, and the site's total.
  utilityMeterTotal: testFieldEntry('metering_point.TEST_utilityMeterTotal', { kind: 'quantity', subject: 'metering_point', unit: 'kWh' }),
  subMeterTotal: testFieldEntry('metering_point.TEST_subMeterTotal', { kind: 'quantity', subject: 'metering_point', unit: 'kWh' }),
  siteConsumption: testFieldEntry('project.TEST_siteConsumption', { kind: 'quantity', subject: 'project', unit: 'kWh' }),
  // G9-7: the register's rated electrical input, a TEST climate factor from reference data, and the operating energy.
  ratedElectricalInput: testFieldEntry('building.TEST_ratedElectricalInput', { kind: 'quantity', subject: 'building', unit: 'kW' }),
  climateFactor: testFieldEntry('project.TEST_climateFactor', { kind: 'quantity', subject: 'project', unit: '%', referenceDatasets: ['TEST-climate-reference'] }),
  operatingEnergy: testFieldEntry('project.TEST_operatingEnergy', { kind: 'quantity', subject: 'project', unit: 'kWh/a', estimation: 'allowed' }),
  // G10-6: who supplies room control (rule 10's supply split), an owner-routed open item while unknown.
  roomControlSupplier: testFieldEntry('project.TEST_roomControlSupplier', { kind: 'enum', subject: 'project', options: ['sovitech_supplied', 'grms_integrated'] }),
  roomHardwareIo: testFieldEntry('project.TEST_roomHardwareIo', { kind: 'quantity', subject: 'project', unit: 'count', estimation: 'allowed', qualifiers: ['hardware_io'] }),
  roomIntegration: testFieldEntry('project.TEST_roomIntegration', { kind: 'quantity', subject: 'project', unit: 'count', estimation: 'allowed', qualifiers: ['integration'] }),
  // G11-3 and G10-7: the AHU panels in the register, and the fire interface points per panel (rule 11).
  ahuPanels: testFieldEntry('building.TEST_ahuPanels', { kind: 'count', subject: 'building', unit: 'count' }),
  fireAlarmInputs: testFieldEntry('project.TEST_fireAlarmInputs', { kind: 'count', subject: 'project', unit: 'count' }),
  fireModeStatuses: testFieldEntry('project.TEST_fireModeStatuses', { kind: 'count', subject: 'project', unit: 'count' }),
} satisfies Readonly<Record<string, FieldDefinition>>);

/** G9-3's points by hardware I/O type, integration protocol and virtual (rule 8 "Points"), each its own output field. */
export const POINT_TYPE_OUTPUTS = Object.freeze({
  'points.TEST_hardwareIo.AI': estimatedOutput('project.TEST_pointsAI', 'count', ['hardware_io']),
  'points.TEST_hardwareIo.AO': estimatedOutput('project.TEST_pointsAO', 'count', ['hardware_io']),
  'points.TEST_hardwareIo.DI': estimatedOutput('project.TEST_pointsDI', 'count', ['hardware_io']),
  'points.TEST_hardwareIo.DO': estimatedOutput('project.TEST_pointsDO', 'count', ['hardware_io']),
  'points.TEST_hardwareIo.UI': estimatedOutput('project.TEST_pointsUI', 'count', ['hardware_io']),
  'points.TEST_integration.bacnet_ip': estimatedOutput('project.TEST_pointsBacnetIp', 'count', ['integration']),
  'points.TEST_integration.modbus_rtu': estimatedOutput('project.TEST_pointsModbusRtu', 'count', ['integration']),
  'points.TEST_virtual': estimatedOutput('project.TEST_pointsVirtualByType', 'count', ['virtual']),
} satisfies Readonly<Record<string, FieldDefinition>>);

/** Every TEST field above, by key. */
export const TEST_FIELD_DEFINITIONS: ReadonlyMap<string, FieldDefinition> = new Map(
  [...Object.values(MIRRORED_OUTPUT_FIELDS), ...LINE_ITEM_FIELDS, ...BILL_FIELDS, ...Object.values(TEST_FIELDS), ...Object.values(POINT_TYPE_OUTPUTS)].map(
    (field) => [field.key, field] as const,
  ),
);

/** The registry lookup of the TEST runs: the TEST fields, then the production registry's. */
export function testFieldDefinition(key: string): FieldDefinition | undefined {
  return TEST_FIELD_DEFINITIONS.get(key) ?? productionRegistry.fields.find((entry) => entry.key === key);
}
