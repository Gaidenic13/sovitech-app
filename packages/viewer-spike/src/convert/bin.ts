/**
 * The converter's entry in the conversion sandbox image (services/model-converter/Dockerfile). The single-threaded
 * Fragments model leaves timers behind, so the process ends with the status explicitly.
 */
import { main } from './cli';

const status = await main(process.argv.slice(2));
process.exit(status);
