/**
 * OB-1 Step 1 of a new project (`/projects/new`; US-INTAKE-02, US-INTAKE-03; PRD R-001, R-136;
 * F-QUESTION-05; guardrails rule 7 and section 5, step 1; G7-6).
 *
 * - The approved frame: no title block, the three questions, "Next" and no Back (US-INTAKE-01 AC5).
 * - The four required fields, with no "Skip for now" (rule 7): the project name, the project type
 *   (one single choice, none preselected: US-INTAKE-02 AC4; rule 3; PRD R-010 "Until decided"), and
 *   the location with the country first (guardrails section 5: "Country first, or one place
 *   search") and the city as typed (prompt 3 5.2 "City"; no city list and no city id until the
 *   SIRUTA licence is confirmed, D-94). Changing the country clears the typed city (US-INTAKE-03 AC3).
 * - Next is never disabled. With any field empty it shows an inline error on each empty field and
 *   sends nothing, so no project exists (G7-6; US-INTAKE-02 AC2; US-ADMIN-05 AC3). With all four
 *   filled it sends them in one request; the API writes each as the owner's answer (`user` with
 *   `user_confirmed`, 2.1) and step 2 opens (AC3). A refusal the API names for a field shows on it.
 *   One project per press: while the request is on its way, a further Next, click or Enter, is
 *   ignored (../../wizard/use-in-flight.ts), and Next takes presses again once a refusal is in.
 * - Nothing typed here is stored until Next (PRD R-009 "Until decided": unsaved input is not stored).
 * - The header shows no project name before the project exists (new Q1, D-10: open; the stricter
 *   choice shows nothing that is not stored).
 */
import { Building2, Globe, MapPin } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChoiceCard, ChoiceGroup, SelectField, TextField } from '@sovitech/ui';
import { CITY_MAX, PROJECT_NAME_MAX, PROJECT_TYPES, REQUIRED_FIELD_NAMES, STEP_TITLES, holdsRefusedOwnerTextCharacter } from '@sovitech/view-model/browser';
import { ApiError, isSignedOut, request } from '../../api/client';
import { copy } from '../../copy';
import { useOnSignedOut } from '../../session/SessionProvider';
import { AppShell } from '../../shell/AppShell';
import { WizardLayout } from '../../shell/WizardLayout';
import { useRenderReady } from '../../shell/render-ready';
import { FORM_WIDTH, WizardFooter } from '../../wizard/WizardFooter';
import { WizardStepper } from '../../wizard/WizardStepper';
import { stepPath } from '../../wizard/WizardProvider';
import { useInFlight } from '../../wizard/use-in-flight';
import { PROJECT_TYPE_ICONS, countryOptions, isProjectType, projectTypeLabel, type ProjectType } from './options';

type RequiredField = (typeof REQUIRED_FIELD_NAMES)[number];
type Errors = Partial<Record<RequiredField, string>>;

interface Form {
  readonly name: string;
  readonly projectType: ProjectType | '';
  readonly countryCode: string;
  readonly city: string;
}

const EMPTY: Form = { name: '', projectType: '', countryCode: '', city: '' };

const REQUIRED_MESSAGES: Readonly<Record<RequiredField, string>> = {
  name: copy.step1.required,
  projectType: copy.step1.typeRequired,
  countryCode: copy.step1.countryRequired,
  city: copy.step1.required,
};

/** The required fields left empty (blank text counts as empty, as the API reads it). */
export function emptyFields(form: Form): RequiredField[] {
  const filled: Readonly<Record<RequiredField, boolean>> = {
    name: form.name.trim() !== '',
    projectType: form.projectType !== '',
    countryCode: form.countryCode !== '',
    city: form.city.trim() !== '',
  };
  return REQUIRED_FIELD_NAMES.filter((field) => !filled[field]);
}

function errorsFor(fields: readonly string[]): Errors {
  const errors: Errors = {};
  for (const field of REQUIRED_FIELD_NAMES) if (fields.includes(field)) errors[field] = REQUIRED_MESSAGES[field];
  return errors;
}

/** Where focus goes when Next finds empty fields: the first of them, in the form's order. */
const FIELD_IDS: Readonly<Record<RequiredField, string>> = {
  name: 'step1-name',
  projectType: 'step1-type-new_construction',
  countryCode: 'step1-country',
  city: 'step1-city',
};

export function NewProjectStep1() {
  const navigate = useNavigate();
  const onSignedOut = useOnSignedOut();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const creating = useInFlight();
  const [failure, setFailure] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useRenderReady(true);

  const change = (next: Form) => {
    setForm(next);
    // After a first Next, an error goes away as soon as its field is filled.
    if (submitted) setErrors(errorsFor(emptyFields(next)));
  };

  const focusFirst = (fields: readonly RequiredField[]) => {
    const first = REQUIRED_FIELD_NAMES.find((field) => fields.includes(field));
    if (first === undefined) return;
    formRef.current?.querySelector<HTMLElement>(`#${FIELD_IDS[first]}`)?.focus();
  };

  const next = () => {
    // A press while the project is being created (a double-click, Enter then Next) sends nothing more.
    if (!creating.claim()) return;
    setSubmitted(true);
    setFailure(null);
    const empty = emptyFields(form);
    setErrors(errorsFor(empty));
    if (empty.length > 0) {
      creating.release();
      focusFirst(empty);
      return;
    }
    request('projects.create', { body: { name: form.name.trim(), projectType: form.projectType, countryCode: form.countryCode, city: form.city.trim() } }).then(
      (created) => {
        void navigate(stepPath(created.projectId, created.nextStep), { state: { leftSteps: [1] } });
      },
      (error: unknown) => {
        creating.release();
        if (isSignedOut(error)) {
          onSignedOut();
          return;
        }
        if (error instanceof ApiError && error.code === 'required_fields_missing') {
          const fields = error.body.fields ?? [];
          setErrors(errorsFor(fields));
          focusFirst(REQUIRED_FIELD_NAMES.filter((field) => fields.includes(field)));
          return;
        }
        if (error instanceof ApiError && error.code === 'project_type_invalid') {
          setErrors({ projectType: copy.step1.answerInvalid });
          return;
        }
        if (error instanceof ApiError && error.code === 'country_invalid') {
          setErrors({ countryCode: copy.step1.answerInvalid });
          return;
        }
        // A name or city holding a character the API refuses (a control or direction character: G2-13)
        // is named on its field; the rest of the form stays as typed.
        if (error instanceof ApiError && error.code === 'answer_invalid') {
          const refused: Errors = {
            ...(holdsRefusedOwnerTextCharacter(form.name) ? { name: copy.step1.answerInvalid } : {}),
            ...(holdsRefusedOwnerTextCharacter(form.city) ? { city: copy.step1.answerInvalid } : {}),
          };
          if (Object.keys(refused).length > 0) {
            setErrors(refused);
            focusFirst(REQUIRED_FIELD_NAMES.filter((field) => refused[field] !== undefined));
            return;
          }
        }
        setFailure(copy.step1.createFailed);
      },
    );
  };

  return (
    <AppShell>
      <WizardLayout
        stepper={<WizardStepper step={1} />}
        plainFooter
        footer={<WizardFooter primaryLabel={copy.nav.next} onPrimary={next} busy={creating.busy} error={failure} align="form" />}
      >
        {/* The approved step 1 draws no title block; the page's heading is there for assistive technology only. */}
        <h1 id="step-title" className="sr-only">
          {STEP_TITLES[0]}
        </h1>
        <form
          ref={formRef}
          noValidate
          aria-labelledby="step-title"
          className={`mx-auto mt-10 flex ${FORM_WIDTH} flex-col gap-10`}
          onSubmit={(event) => {
            event.preventDefault();
            next();
          }}
        >
          <TextField
            id={FIELD_IDS.name}
            label={copy.step1.projectName}
            icon={Building2}
            value={form.name}
            maxLength={PROJECT_NAME_MAX}
            autoComplete="off"
            required
            onChange={(name) => change({ ...form, name })}
            {...(errors.name === undefined ? {} : { error: errors.name })}
          />
          <ChoiceGroup legend={copy.step1.projectType} columns={4} {...(errors.projectType === undefined ? {} : { error: errors.projectType })}>
            {PROJECT_TYPES.map((type) => (
              <ChoiceCard
                key={type}
                id={`step1-type-${type}`}
                type="radio"
                name="project-type"
                value={type}
                checked={form.projectType === type}
                onChange={(checked) => {
                  if (checked && isProjectType(type)) change({ ...form, projectType: type });
                }}
                title={projectTypeLabel(type)}
                icon={PROJECT_TYPE_ICONS[type]}
                indicator="bottom-center"
              />
            ))}
          </ChoiceGroup>
          <fieldset className="flex flex-col gap-4">
            <legend className="sov-heading-group mb-4">{copy.step1.location}</legend>
            <div className="grid grid-cols-2 gap-5">
              <SelectField
                id={FIELD_IDS.countryCode}
                label={copy.step1.country}
                icon={Globe}
                options={countryOptions()}
                value={form.countryCode}
                placeholder={copy.step1.chooseCountry}
                required
                onChange={(countryCode) =>
                  change({ ...form, countryCode, city: form.countryCode !== '' && countryCode !== form.countryCode ? '' : form.city })
                }
                {...(errors.countryCode === undefined ? {} : { error: errors.countryCode })}
              />
              <TextField
                id={FIELD_IDS.city}
                label={copy.step1.city}
                labelPlacement="inside"
                icon={MapPin}
                value={form.city}
                maxLength={CITY_MAX}
                autoComplete="off"
                required
                onChange={(city) => change({ ...form, city })}
                {...(errors.city === undefined ? {} : { error: errors.city })}
              />
            </div>
          </fieldset>
          {/* Enter in a field presses Next, as the primary action of the form. */}
          <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
        </form>
      </WizardLayout>
    </AppShell>
  );
}
