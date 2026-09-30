/**
 * The sandbox image's entry point (Dockerfile): runs one job from the command line and exits
 * with its status (./cli.ts).
 */
import { main } from './cli';

process.exitCode = await main(process.argv.slice(2));
