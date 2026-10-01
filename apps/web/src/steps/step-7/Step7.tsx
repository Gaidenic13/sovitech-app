/**
 * OB-7 Step 7 Automation (US-INTAKE-10; US-INTAKE-11 "Until decided"; PRD R-002, R-005; guardrails
 * rules 3, 7 and 11, 2.6, section 5 rows §5-57b and §5-7): the six automation areas as one
 * multi-select, one decision field per area. No area is preselected until D-12 (R-005 "Until
 * decided": "step 7 preselects no area and the unanswered question shows 'Skip for now'"), and
 * unticking a step 4 system changes no answer here. Security & Access adds no control of any
 * life-safety system (rule 11): this screen only records the owner's choice. The information banner
 * is kept as drawn (US-INTAKE-10 AC8). The shared behaviour is ../step-6/MultiChoiceStep.tsx.
 */
import { Banner } from '@sovitech/ui';
import { Droplet, Lightbulb, Plug, Settings, Shield, Thermometer, type LucideIcon } from 'lucide-react';
import { copy } from '../../copy';
import { MultiChoiceStep, type CardCopy } from '../step-6/MultiChoiceStep';

/** The areas' icons (onboarding-spec 3, step 7), redrawn from Lucide; decorative only. */
const AREA_ICONS: Readonly<Record<string, LucideIcon | undefined>> = {
  hvac: Thermometer,
  lighting: Lightbulb,
  energy_management: Plug,
  water_management: Droplet,
  security_access: Shield,
  predictive_maintenance: Settings,
};

const AREA_COPY: Readonly<Record<string, CardCopy | undefined>> = copy.automation;

export function Step7() {
  return (
    <MultiChoiceStep
      step={7}
      title={copy.step7.title}
      subtitle={copy.step7.subtitle}
      cards={AREA_COPY}
      icons={AREA_ICONS}
      columns={3}
      maxWidth="max-w-[1070px]"
      after={<Banner>{copy.step7.banner}</Banner>}
    />
  );
}
