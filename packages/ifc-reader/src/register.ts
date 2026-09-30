/**
 * The element register of one model, as the IFC2X3 comparison needs it (ifc-input 5.4 IFC-11).
 *
 * One row per element occurrence: its GlobalId, its engineering tag (the Tag attribute when it
 * holds a letter; an all-digit Tag is an authoring-tool id, never a tag: ifc-input 3.3), its
 * class named as IFC4 names it, its predefined kind resolved from the occurrence or its type
 * object, the user-defined kind, the storey it sits in and the systems it belongs to.
 *
 * Naming an IFC2X3 generic occurrence (IfcFlowMovingDevice typed by IfcPumpType) by its IFC4
 * class (IfcPump) follows the schemas' own change log. It is not a mapping to an app type:
 * asset types come only from an approved taxonomy (ifc-input 6.2.9 and 6.2.10; the
 * `dataset-asset-taxonomy` gate). The register is the reader's own view for the engineer and
 * the tests; it is not a count, and nothing here counts elements or storeys.
 */
import type { ElementRead, ModelReading, ObjectRead } from './reading';

/** IFC2X3 IfcElectricDistributionPoint became two IFC4 classes, by its function (IFC4 change log). */
const CONTROL_PANEL_FUNCTIONS = new Set(['ALARMPANEL', 'CONTROLPANEL', 'GASDETECTORPANEL', 'INDICATORPANEL', 'MIMICPANEL']);

/** Type classes whose occurrence is not simply the type's name without "Type" (IFC4 change log). */
const TYPE_OCCURRENCE_EXCEPTIONS: Readonly<Record<string, string>> = {
  IfcGasTerminalType: 'IfcBurner',
  IfcElectricHeaterType: 'IfcSpaceHeater',
};

export interface RegisterRow {
  readonly globalId: string;
  readonly engineeringTag: string | undefined;
  readonly ifc4Class: string;
  readonly resolvedPredefined: string | undefined;
  readonly userDefined: string | undefined;
  readonly storey: string | undefined;
  readonly systems: readonly string[];
}

/** The occurrence class a type class stands for (IfcPumpType is IfcPump), per the IFC4 change log. */
export function occurrenceClassOfType(typeName: string): string | undefined {
  const exception = TYPE_OCCURRENCE_EXCEPTIONS[typeName];
  if (exception !== undefined) return exception;
  return typeName.endsWith('Type') ? typeName.slice(0, -'Type'.length) : undefined;
}

function typeOf(reading: ModelReading, element: ElementRead): ObjectRead | undefined {
  return element.typeRelation === undefined ? undefined : reading.objects.get(element.typeRelation.relatedGlobalId);
}

/** The element's class as IFC4 names it (the class itself outside IFC2X3). */
export function ifc4Class(reading: ModelReading, element: ElementRead): string {
  if (reading.family !== 'IFC2X3') return element.ifcClass;
  if (element.ifcClass === 'IfcElectricDistributionPoint') {
    const function_ = element.predefined;
    return function_ !== undefined && CONTROL_PANEL_FUNCTIONS.has(function_) ? 'IfcUnitaryControlElement' : 'IfcElectricDistributionBoard';
  }
  const typeObject = typeOf(reading, element);
  if (typeObject !== undefined && element.predefinedAttribute === undefined) {
    const occurrence = occurrenceClassOfType(typeObject.ifcClass);
    if (occurrence !== undefined) return occurrence;
  }
  return element.ifcClass;
}

/**
 * The predefined kind, from the occurrence or else its type object, and the user-defined kind
 * when that is USERDEFINED (the occurrence's ObjectType, or the type's ElementType).
 */
export function resolvedType(reading: ModelReading, element: ElementRead): { readonly predefined: string | undefined; readonly userDefined: string | undefined } {
  const occurrence = element.predefined;
  const typeObject = typeOf(reading, element);
  const fromType = typeObject?.predefined;
  let resolved: string | undefined;
  let source: 'type' | 'occurrence';
  if (fromType !== undefined && fromType !== 'NOTDEFINED' && (occurrence === undefined || occurrence === 'NOTDEFINED')) {
    resolved = fromType;
    source = 'type';
  } else if (occurrence !== undefined) {
    resolved = occurrence;
    source = 'occurrence';
  } else {
    resolved = fromType;
    source = 'type';
  }
  if (resolved !== 'USERDEFINED') return { predefined: resolved, userDefined: undefined };
  const userAttribute = element.userDefinedAttribute;
  const occurrenceText = userAttribute === undefined ? undefined : element.text(userAttribute);
  if (source === 'type' && typeObject !== undefined) return { predefined: resolved, userDefined: typeObject.text('ElementType') ?? occurrenceText };
  return { predefined: resolved, userDefined: occurrenceText };
}

/** The Tag when it holds a letter; an all-digit Tag is an authoring-tool id (ifc-input 3.3). */
export function engineeringTag(element: ElementRead): string | undefined {
  const tag = element.text('Tag');
  return tag !== undefined && /\p{L}/u.test(tag) ? tag : undefined;
}

export function register(reading: ModelReading): RegisterRow[] {
  return reading.elements().map((element) => {
    const container = element.container;
    const { predefined, userDefined } = resolvedType(reading, element);
    return {
      globalId: element.globalId,
      engineeringTag: engineeringTag(element),
      ifc4Class: ifc4Class(reading, element),
      resolvedPredefined: predefined,
      userDefined,
      storey: container === undefined ? undefined : reading.storeyOf(container.relatedGlobalId),
      systems: element.systems.map((link) => reading.objects.get(link.relatedGlobalId)?.text('Name') ?? ''),
    };
  });
}
