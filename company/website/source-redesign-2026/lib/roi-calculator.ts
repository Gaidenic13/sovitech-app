export type IndustryId = 'hospitality' | 'office' | 'retail' | 'healthcare' | 'industrial' | 'dataCenter'

// The savings domain the estimate refers to. A percentage without its domain
// means nothing (register rule): "percent of what" is part of the number.
export type SavingsDomain = 'whole_building' | 'hvac' | 'fdd'

export type FormData = {
  industry: IndustryId | ''
  annualEnergyCost: number
  buildingSize: number
  buildingCount: number
  occupancyRate: number
  guestComfortIssues: boolean
  officeType: '' | 'open-plan' | 'traditional' | 'hybrid'
  occupancyPatterns: string[]
  storeFormat: '' | 'Standalone' | 'Mall' | 'Strip Center'
  maintenanceBudget: number
  unexpectedRepairs: 'rare' | 'moderate' | 'frequent'
  equipmentAge: 'new' | '5-years' | '10-years'
  selectedGoals: ('energy' | 'maintenance' | 'comfort' | 'compliance' | 'environmental')[]
  implementationBudget: number
  timelineROI: '<1yr' | '1-3yrs' | '3-5yrs'
  hasExistingSystems: boolean
  savingsDomain: SavingsDomain
}

export type ROIResults = {
  // Point fields hold the typical value; the Low/High pair is what the UI
  // should lead with — doc 12: intervals, never a single decimal.
  energySavingsPercent: number
  energySavingsPercentLow: number
  energySavingsPercentHigh: number
  annualEnergySavings: number
  annualEnergySavingsLow: number
  annualEnergySavingsHigh: number
  annualMaintenanceSavings: number
  totalAnnualSavings: number
  totalAnnualSavingsLow: number
  totalAnnualSavingsHigh: number
  implementationCost: number
  implementationCostLow: number
  implementationCostHigh: number
  paybackMonths: number
  paybackYears: string
  paybackYearsLow: string
  paybackYearsHigh: string
  fiveYearReturn: number
  roiPercentage: number
}

type Band = { min: number; typical: number; max: number }

// Implementation cost bands, EUR/m², per building type (doc 12 §3.1, aligned
// with the published price article: offices A 9-18, hotels 6-13, retail 4-9,
// industrial 3-8). healthcare and dataCenter have no published band of their
// own; they use the aggregated non-residential band 4-18 with typical 13.
export const COST_PER_SQM_BANDS: Record<IndustryId, Band> = {
  office:      { min: 9, typical: 13, max: 18 },
  hospitality: { min: 6, typical: 9,  max: 13 },
  retail:      { min: 4, typical: 6,  max: 9  },
  industrial:  { min: 3, typical: 5,  max: 8  },
  healthcare:  { min: 4, typical: 13, max: 18 },
  dataCenter:  { min: 4, typical: 13, max: 18 },
}

// Register-backed savings bands per domain (doc 12 §3.2). The default is the
// most conservative and most defensible: whole-building, measured.
export const SAVINGS_BANDS: Record<SavingsDomain, Band & {
  labelRo: string
  labelEn: string
  source: string
}> = {
  whole_building: {
    min: 5, typical: 8, max: 15,
    labelRo: 'din consumul total al clădirii',
    labelEn: 'of whole-building consumption',
    source: 'Crowe et al. 2020; Kramer et al. 2019 (LBNL)',
  },
  hvac: {
    min: 10, typical: 15, max: 20,
    labelRo: 'din consumul HVAC, unde reglajul era deficitar',
    labelEn: 'of HVAC consumption, where controls were deficient',
    source: 'ACEEE',
  },
  fdd: {
    min: 5, typical: 9, max: 15,
    labelRo: 'cu analitică peste un BMS existent',
    labelEn: 'with an analytics layer over an existing BMS',
    source: 'LBNL SEAC',
  },
}

export const industryDefaults: Record<IndustryId, {
  maintenanceMultiplier: number
  label: string
  description: string
  descriptionEn: string
  paybackInfo: string
  paybackInfoEn: string
  icon: string
}> = {
  hospitality: {
    maintenanceMultiplier: 1.3,
    label: 'Hospitality',
    description: 'Hoteluri, resorturi, spa-uri',
    descriptionEn: 'Hotels, resorts, spas',
    paybackInfo: 'Amortizare: 1-3 ani optimizare, 3-6 ani sistem nou',
    paybackInfoEn: 'Payback: 1-3 yrs optimisation, 3-6 yrs new system',
    icon: 'hotel',
  },
  office: {
    maintenanceMultiplier: 1.2,
    label: 'Birouri & Office',
    description: 'Clădiri de birouri, centre de afaceri',
    descriptionEn: 'Office buildings, business centres',
    paybackInfo: 'Amortizare: 1-3 ani optimizare, 3-6 ani sistem nou',
    paybackInfoEn: 'Payback: 1-3 yrs optimisation, 3-6 yrs new system',
    icon: 'building',
  },
  retail: {
    maintenanceMultiplier: 1.25,
    label: 'Retail & HORECA',
    description: 'Magazine, centre comerciale, restaurante',
    descriptionEn: 'Stores, shopping centres, restaurants',
    paybackInfo: 'Amortizare: 1-3 ani optimizare, 3-6 ani sistem nou',
    paybackInfoEn: 'Payback: 1-3 yrs optimisation, 3-6 yrs new system',
    icon: 'store',
  },
  healthcare: {
    maintenanceMultiplier: 1.15,
    label: 'Medical & Pharma',
    description: 'Spitale, clinici, centre medicale',
    descriptionEn: 'Hospitals, clinics, medical centres',
    paybackInfo: 'Amortizare: 1-3 ani optimizare, 3-6 ani sistem nou',
    paybackInfoEn: 'Payback: 1-3 yrs optimisation, 3-6 yrs new system',
    icon: 'hospital',
  },
  industrial: {
    maintenanceMultiplier: 1.3,
    label: 'Industrial',
    description: 'Fabrici, hale de producție, depozite',
    descriptionEn: 'Factories, production halls, warehouses',
    paybackInfo: 'Amortizare: 1-3 ani optimizare, 3-6 ani sistem nou',
    paybackInfoEn: 'Payback: 1-3 yrs optimisation, 3-6 yrs new system',
    icon: 'factory',
  },
  dataCenter: {
    maintenanceMultiplier: 1.2,
    label: 'Data Center',
    description: 'Centre de date, infrastructură IT',
    descriptionEn: 'Data centres, IT infrastructure',
    paybackInfo: 'Amortizare: 1-3 ani optimizare, 3-6 ani sistem nou',
    paybackInfoEn: 'Payback: 1-3 yrs optimisation, 3-6 yrs new system',
    icon: 'server',
  },
}

const emptyResults: ROIResults = {
  energySavingsPercent: 0, energySavingsPercentLow: 0, energySavingsPercentHigh: 0,
  annualEnergySavings: 0, annualEnergySavingsLow: 0, annualEnergySavingsHigh: 0,
  annualMaintenanceSavings: 0,
  totalAnnualSavings: 0, totalAnnualSavingsLow: 0, totalAnnualSavingsHigh: 0,
  implementationCost: 0, implementationCostLow: 0, implementationCostHigh: 0,
  paybackMonths: 0, paybackYears: '0', paybackYearsLow: '0', paybackYearsHigh: '0',
  fiveYearReturn: 0, roiPercentage: 0,
}

export function calculateROI(formData: FormData): ROIResults {
  if (!formData.industry) return { ...emptyResults }

  const industryConfig = industryDefaults[formData.industry]
  const band = SAVINGS_BANDS[formData.savingsDomain ?? 'whole_building']

  // Point estimate starts at the band's typical value; building-specific
  // signals nudge it toward the band maximum but can never leave the band —
  // the questionnaire refines a register-backed range, it does not invent one.
  let energySavingsPercent = band.typical

  if (formData.industry === 'hospitality') {
    if (formData.guestComfortIssues) energySavingsPercent += 2
    if (formData.occupancyRate < 60) energySavingsPercent += 1
  }
  if (formData.industry === 'office') {
    if (formData.officeType === 'hybrid') energySavingsPercent += 2
    if (formData.occupancyPatterns.includes('Variable occupancy')) energySavingsPercent += 1
    if (formData.occupancyPatterns.includes('After-hours usage')) energySavingsPercent += 1
  }
  if (formData.industry === 'retail' && formData.storeFormat === 'Mall') {
    energySavingsPercent += 2
  }
  energySavingsPercent = Math.min(energySavingsPercent, band.max)

  const annualEnergySavings = formData.annualEnergyCost * (energySavingsPercent / 100)
  const annualEnergySavingsLow = formData.annualEnergyCost * (band.min / 100)
  const annualEnergySavingsHigh = formData.annualEnergyCost * (band.max / 100)

  // Maintenance savings, unchanged: driven by equipment age and repair history.
  let maintenanceMultiplier = industryConfig.maintenanceMultiplier
  if (formData.equipmentAge === '10-years') maintenanceMultiplier *= 1.15
  else if (formData.equipmentAge === '5-years') maintenanceMultiplier *= 1.05
  if (formData.unexpectedRepairs === 'frequent') maintenanceMultiplier *= 1.2
  else if (formData.unexpectedRepairs === 'moderate') maintenanceMultiplier *= 1.1
  const annualMaintenanceSavings = formData.maintenanceBudget * (maintenanceMultiplier - 1)

  // No multipliers for selected goals: stating a priority cannot change how
  // much energy a building physically saves.
  const totalAnnualSavings = annualEnergySavings + annualMaintenanceSavings
  const totalAnnualSavingsLow = annualEnergySavingsLow + annualMaintenanceSavings
  const totalAnnualSavingsHigh = annualEnergySavingsHigh + annualMaintenanceSavings

  // Implementation cost scales with TOTAL portfolio area, banded by building
  // type (doc 12 §3.1). The band, not a single constant, is the honest answer.
  const costBand = COST_PER_SQM_BANDS[formData.industry]
  const totalArea = formData.buildingSize * Math.max(1, formData.buildingCount)
  let discount = 1
  if (formData.buildingCount > 1) {
    discount *= Math.max(0.6, 1 - formData.buildingCount * 0.05)
  }
  if (formData.hasExistingSystems) discount *= 0.7

  let implementationCost = totalArea * costBand.typical * discount
  let implementationCostLow = totalArea * costBand.min * discount
  let implementationCostHigh = totalArea * costBand.max * discount

  // A user-supplied budget pins the point estimate but the band still brackets it.
  if (formData.implementationBudget > 0) {
    implementationCost = formData.implementationBudget
    implementationCostLow = Math.min(implementationCostLow, implementationCost)
    implementationCostHigh = Math.max(implementationCostHigh, implementationCost)
  }

  const months = (cost: number, annual: number) => (annual > 0 ? cost / (annual / 12) : 0)
  const paybackMonths = months(implementationCost, totalAnnualSavings)
  // Best case pairs the low cost with the high savings; worst case the reverse.
  const paybackMonthsLow = months(implementationCostLow, totalAnnualSavingsHigh)
  const paybackMonthsHigh = months(implementationCostHigh, totalAnnualSavingsLow)

  const yrs = (m: number) => (m / 12).toFixed(1)
  const fiveYearReturn = totalAnnualSavings * 5 - implementationCost
  const roiPercentage = implementationCost > 0 ? Math.round((fiveYearReturn / implementationCost) * 100) : 0

  return {
    energySavingsPercent,
    energySavingsPercentLow: band.min,
    energySavingsPercentHigh: band.max,
    annualEnergySavings,
    annualEnergySavingsLow,
    annualEnergySavingsHigh,
    annualMaintenanceSavings,
    totalAnnualSavings,
    totalAnnualSavingsLow,
    totalAnnualSavingsHigh,
    implementationCost,
    implementationCostLow,
    implementationCostHigh,
    paybackMonths,
    paybackYears: yrs(paybackMonths),
    paybackYearsLow: yrs(paybackMonthsLow),
    paybackYearsHigh: yrs(paybackMonthsHigh),
    fiveYearReturn,
    roiPercentage,
  }
}

export const initialFormData: FormData = {
  industry: '',
  annualEnergyCost: 0,
  buildingSize: 0,
  buildingCount: 1,
  occupancyRate: 70,
  guestComfortIssues: false,
  officeType: '',
  occupancyPatterns: [],
  storeFormat: '',
  maintenanceBudget: 0,
  unexpectedRepairs: 'moderate',
  equipmentAge: '5-years',
  selectedGoals: [],
  implementationBudget: 0,
  timelineROI: '1-3yrs',
  hasExistingSystems: false,
  savingsDomain: 'whole_building',
}
