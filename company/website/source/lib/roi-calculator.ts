export type IndustryId = 'hospitality' | 'office' | 'retail' | 'healthcare' | 'industrial' | 'dataCenter'

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
}

export type ROIResults = {
  energySavingsPercent: number
  annualEnergySavings: number
  annualMaintenanceSavings: number
  totalAnnualSavings: number
  implementationCost: number
  paybackMonths: number
  paybackYears: string
  fiveYearReturn: number
  roiPercentage: number
}

export const industryDefaults: Record<IndustryId, {
  energySavingsRange: [number, number]
  maintenanceMultiplier: number
  label: string
  description: string
  descriptionEn: string
  paybackInfo: string
  paybackInfoEn: string
  icon: string
}> = {
  hospitality: {
    energySavingsRange: [15, 30],
    maintenanceMultiplier: 1.3,
    label: 'Hospitality',
    description: 'Hoteluri, resorturi, spa-uri',
    descriptionEn: 'Hotels, resorts, spas',
    paybackInfo: 'Amortizare: 10–15 luni',
    paybackInfoEn: 'Payback: 10–15 months',
    icon: 'hotel'
  },
  office: {
    energySavingsRange: [20, 40],
    maintenanceMultiplier: 1.2,
    label: 'Birouri & Office',
    description: 'Clădiri de birouri, centre de afaceri',
    descriptionEn: 'Office buildings, business centres',
    paybackInfo: 'Amortizare: 1.5–5 ani',
    paybackInfoEn: 'Payback: 1.5–5 years',
    icon: 'building'
  },
  retail: {
    energySavingsRange: [25, 35],
    maintenanceMultiplier: 1.25,
    label: 'Retail & HORECA',
    description: 'Magazine, centre comerciale, restaurante',
    descriptionEn: 'Stores, shopping centres, restaurants',
    paybackInfo: 'Amortizare: sub 2 ani',
    paybackInfoEn: 'Payback: under 2 years',
    icon: 'store'
  },
  healthcare: {
    energySavingsRange: [20, 30],
    maintenanceMultiplier: 1.15,
    label: 'Medical & Pharma',
    description: 'Spitale, clinici, centre medicale',
    descriptionEn: 'Hospitals, clinics, medical centres',
    paybackInfo: 'Amortizare: 2–4 ani',
    paybackInfoEn: 'Payback: 2–4 years',
    icon: 'hospital'
  },
  industrial: {
    energySavingsRange: [20, 40],
    maintenanceMultiplier: 1.3,
    label: 'Industrial',
    description: 'Fabrici, hale de producție, depozite',
    descriptionEn: 'Factories, production halls, warehouses',
    paybackInfo: 'Amortizare: 1.5–3 ani',
    paybackInfoEn: 'Payback: 1.5–3 years',
    icon: 'factory'
  },
  dataCenter: {
    energySavingsRange: [20, 35],
    maintenanceMultiplier: 1.2,
    label: 'Data Center',
    description: 'Centre de date, infrastructură IT',
    descriptionEn: 'Data centres, IT infrastructure',
    paybackInfo: 'Amortizare: 1–2 ani',
    paybackInfoEn: 'Payback: 1–2 years',
    icon: 'server'
  },
}

export function calculateROI(formData: FormData): ROIResults {
  if (!formData.industry) {
    return {
      energySavingsPercent: 0,
      annualEnergySavings: 0,
      annualMaintenanceSavings: 0,
      totalAnnualSavings: 0,
      implementationCost: 0,
      paybackMonths: 0,
      paybackYears: '0',
      fiveYearReturn: 0,
      roiPercentage: 0
    }
  }

  const industryConfig = industryDefaults[formData.industry]
  const [lowerBound, upperBound] = industryConfig.energySavingsRange

  // Calculate energy savings percentage
  let energySavingsPercent = lowerBound

  // Hospitality bonuses
  if (formData.industry === 'hospitality') {
    if (formData.guestComfortIssues) {
      energySavingsPercent += 5
    }
    if (formData.occupancyRate < 60) {
      energySavingsPercent += 3
    }
  }

  // Office bonuses based on type and patterns
  if (formData.industry === 'office') {
    if (formData.officeType === 'hybrid') {
      energySavingsPercent += 5
    }
    if (formData.occupancyPatterns.includes('Variable occupancy')) {
      energySavingsPercent += 3
    }
    if (formData.occupancyPatterns.includes('After-hours usage')) {
      energySavingsPercent += 2
    }
  }

  // Retail bonuses
  if (formData.industry === 'retail') {
    if (formData.storeFormat === 'Mall') {
      energySavingsPercent += 5
    }
  }

  // Cap at upper bound
  energySavingsPercent = Math.min(energySavingsPercent, upperBound)

  // Calculate annual energy savings
  const annualEnergySavings = formData.annualEnergyCost * (energySavingsPercent / 100)

  // Calculate maintenance multiplier
  let maintenanceMultiplier = industryConfig.maintenanceMultiplier

  if (formData.equipmentAge === '10-years') {
    maintenanceMultiplier *= 1.15
  } else if (formData.equipmentAge === '5-years') {
    maintenanceMultiplier *= 1.05
  }

  if (formData.unexpectedRepairs === 'frequent') {
    maintenanceMultiplier *= 1.2
  } else if (formData.unexpectedRepairs === 'moderate') {
    maintenanceMultiplier *= 1.1
  }

  // Calculate maintenance savings
  const annualMaintenanceSavings = formData.maintenanceBudget * (maintenanceMultiplier - 1)

  // Calculate total annual savings
  let totalAnnualSavings = annualEnergySavings + annualMaintenanceSavings

  // Comfort goal bonus
  if (formData.selectedGoals.includes('comfort')) {
    totalAnnualSavings *= 1.1
  }

  // Environmental goal bonus
  if (formData.selectedGoals.includes('environmental')) {
    totalAnnualSavings *= 1.05
  }

  // Calculate implementation cost
  let implementationCost = formData.buildingSize * 25 // EUR/m² base

  // Multi-building discount
  if (formData.buildingCount > 1) {
    const discount = Math.max(0.6, 1 - formData.buildingCount * 0.05)
    implementationCost *= discount
  }

  // Existing systems discount
  if (formData.hasExistingSystems) {
    implementationCost *= 0.7
  }

  // Use provided budget if available
  if (formData.implementationBudget > 0) {
    implementationCost = formData.implementationBudget
  }

  // Calculate ROI metrics
  const paybackMonths = totalAnnualSavings > 0 ? implementationCost / (totalAnnualSavings / 12) : 0
  const paybackYears = (paybackMonths / 12).toFixed(1)
  const fiveYearReturn = totalAnnualSavings * 5 - implementationCost
  const roiPercentage = implementationCost > 0 ? Math.round((fiveYearReturn / implementationCost) * 100) : 0

  return {
    energySavingsPercent,
    annualEnergySavings,
    annualMaintenanceSavings,
    totalAnnualSavings,
    implementationCost,
    paybackMonths,
    paybackYears,
    fiveYearReturn,
    roiPercentage
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
  hasExistingSystems: false
}
