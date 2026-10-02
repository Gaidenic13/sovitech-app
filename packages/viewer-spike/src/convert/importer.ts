/**
 * The viewer spike's IfcImporter settings: the "view" profile (docs/adr/0046-viewer-spike.md,
 * "Measurements" and "Findings").
 *
 * A model shown while `ifc-values` is closed is a view of a document, never a source of values
 * (prompt 3 section 8): the viewer needs the shapes, the GlobalIds (the join to the register once
 * the gate opens) and the spatial tree (to step through storeys), and nothing else. So the
 * converted file keeps only those, and leaves out every attribute that carries the model's own
 * words or figures (names, descriptions, tags, long names, elevations, dimensions, addresses),
 * every property set, quantity set, material, type and unit, and every relation but aggregation
 * and spatial containment. The header's FILE_NAME and FILE_DESCRIPTION, which the importer always
 * copies into the model's metadata, are removed after the conversion (./convert.ts). Rule 13
 * still applies to what is left: the file is keyed by project id and content hash and erased with
 * its document (ifc-input 6.2.16, the stricter choice built in phase 2).
 *
 * The importer's defaults that reach the network are replaced: its web-ifc WebAssembly path is a
 * local folder given by the caller, never the library's relative default or a CDN.
 */
import { DataSet, IfcImporter } from '@thatopen/fragments';
import * as WebIFC from 'web-ifc';

/**
 * The one attribute the view profile keeps: the GlobalId, which the importer stores in its own
 * table (an identifier, not model text; logs may carry it, rule 13).
 */
export const VIEW_KEPT_ATTRIBUTES: ReadonlySet<string> = new Set(['GlobalId']);

/**
 * A set that "has" every attribute name except the kept ones, so the importer's exclusion test
 * (`attributesToExclude.has(name)`) drops every attribute it meets, whatever the schema names it.
 * A deny list of names would let through any attribute it forgot.
 */
export class EveryAttributeExcept extends Set<string> {
  readonly #kept: ReadonlySet<string>;

  constructor(kept: ReadonlySet<string>) {
    super();
    this.#kept = kept;
  }

  override has(name: string): boolean {
    return !this.#kept.has(name);
  }
}

/** The relations the view profile keeps: what the spatial tree is built from, in both directions. */
export const VIEW_RELATIONS: ReadonlyMap<number, { forRelating: string; forRelated: string }> = new Map([
  [WebIFC.IFCRELAGGREGATES, { forRelated: 'Decomposes', forRelating: 'IsDecomposedBy' }],
  [WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE, { forRelated: 'ContainedInStructure', forRelating: 'ContainsElements' }],
]);

/** Which settings a conversion uses: the view profile, or the library's own defaults (measured for comparison only). */
export type ConversionProfile = 'view' | 'library-defaults';

/**
 * An IfcImporter for one conversion. `wasmDirectory` is the absolute path of the folder holding
 * web-ifc's Node build and its `web-ifc-node.wasm`, ending in a slash.
 */
export function viewerImporter(wasmDirectory: string, profile: ConversionProfile = 'view'): IfcImporter {
  if (!wasmDirectory.startsWith('/') || !wasmDirectory.endsWith('/')) {
    throw new Error('viewer-spike: the web-ifc folder is an absolute local path ending in a slash');
  }
  const importer = new IfcImporter();
  importer.wasm = { path: wasmDirectory, absolute: true };
  // The model is moved to the origin, as the library does by default; it is stated here so a
  // change of default cannot move it silently.
  importer.webIfcSettings = { COORDINATE_TO_ORIGIN: true };
  if (profile === 'view') {
    importer.classes.abstract = new DataSet<number>();
    importer.attributesToExclude = new EveryAttributeExcept(VIEW_KEPT_ATTRIBUTES);
    importer.relations = new Map(VIEW_RELATIONS);
    importer.includeUniqueAttributes = false;
    importer.includeRelationNames = false;
    importer.includeMaterialProperties = false;
    // Elevations computed from placements are values read from the model: not written.
    importer.replaceStoreyElevation = false;
    importer.replaceSiteElevation = false;
  }
  return importer;
}
