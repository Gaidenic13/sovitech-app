/**
 * OB-6 Step 6 Goals (US-INTAKE-09; US-INTAKE-12 "Until decided"; PRD R-002, R-006, R-007, R-011;
 * guardrails rules 3 and 7, 2.6, section 5 rows §5-57a and §5-57b): the seven registered goals as one
 * multi-select, one decision field per goal, with no preselection until D-11 and no "Other" card or
 * note field. The shared behaviour is ./MultiChoiceStep.tsx.
 */
import { ChartNoAxesColumnIncreasing, Cloud, Leaf, PiggyBank, Settings, Shield, Users, type LucideIcon } from 'lucide-react';
import { copy } from '../../copy';
import { MultiChoiceStep, type CardCopy } from './MultiChoiceStep';

/**
 * The goals' icons (onboarding-spec 3, step 6), redrawn from Lucide; decorative only. None draws a
 * numeral or a currency sign (Lucide's coins draw a "1", read as a figure): "Reduce operating costs"
 * takes the piggy bank.
 */
const GOAL_ICONS: Readonly<Record<string, LucideIcon | undefined>> = {
  reduce_energy: Leaf,
  lower_carbon: Cloud,
  occupant_comfort: Users,
  operational_efficiency: Settings,
  compliance: Shield,
  asset_lifespan: ChartNoAxesColumnIncreasing,
  reduce_operating_costs: PiggyBank,
};

const GOAL_COPY: Readonly<Record<string, CardCopy | undefined>> = copy.goals;

export function Step6() {
  return <MultiChoiceStep step={6} title={copy.step6.title} subtitle={copy.step6.subtitle} cards={GOAL_COPY} icons={GOAL_ICONS} columns={4} maxWidth="max-w-[1240px]" />;
}
