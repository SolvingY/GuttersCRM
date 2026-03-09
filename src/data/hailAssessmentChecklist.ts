export interface ChecklistItem {
  id: string;
  label: string;
  photoRequired: boolean;
  photoLabel: string;
  photoConditional?: boolean;
  multiPhoto?: boolean;
  minPhotos?: number;
  photoHint?: string;
  requiresScale?: boolean;
}

export interface ChecklistResultOption {
  id: string;
  value: 'no_damage' | 'possible_damage' | 'confirmed_damage';
  label: string;
  photoRequired: boolean;
  photoLabel: string;
  multiPhoto: boolean;
}

export interface ChecklistSection {
  id: string;
  sectionNumber: number;
  title: string;
  required: boolean;
  optional?: boolean;
  type?: 'single-select';
  applicabilityQuestion?: string;
  dependsOn?: string;
  items?: ChecklistItem[];
  options?: ChecklistResultOption[];
}

export const HAIL_ASSESSMENT_SECTIONS: ChecklistSection[] = [
  {
    id: 'section-1',
    sectionNumber: 1,
    title: 'Roof Access & Safety',
    required: true,
    items: [
      {
        id: 's1-ladder-door',
        label: 'Ladder/door access is secure and stable',
        photoRequired: true,
        photoLabel: 'Photo of access point',
      },
      {
        id: 's1-walking-surface',
        label: 'Walking surface is safe (no ponding, debris, or slip hazards)',
        photoRequired: false,
        photoLabel: 'Photo of walking surface condition',
        photoConditional: true,
      },
      {
        id: 's1-skylights-decking',
        label: 'Skylights, weak decking, or fall hazards identified and marked',
        photoRequired: false,
        photoLabel: 'Photo of hazards identified',
        photoConditional: true,
      },
    ],
  },
  {
    id: 'section-2',
    sectionNumber: 2,
    title: 'Roof Overview',
    required: true,
    items: [
      {
        id: 's2-identify-system',
        label: 'Identify roof system type (TPO, PVC, EPDM, Mod Bit, BUR, Metal, etc.)',
        photoRequired: true,
        photoLabel: 'Photos of roof system identification',
        multiPhoto: true,
      },
      {
        id: 's2-overview-zones',
        label: 'Overview photos of each roof zone/section',
        photoRequired: true,
        photoLabel: 'Overview photos per zone',
        multiPhoto: true,
      },
      {
        id: 's2-storm-indicators',
        label: 'Storm indicators visible (debris, granule scatter, displaced materials)',
        photoRequired: true,
        photoLabel: 'Photos of storm indicators',
        multiPhoto: true,
      },
      {
        id: 's2-corners',
        label: 'Each corner of roof documented',
        photoRequired: true,
        photoLabel: 'Corner photos',
        multiPhoto: true,
        minPhotos: 4,
        photoHint: 'Minimum 4 photos — one per corner',
      },
      {
        id: 's2-midpoints',
        label: 'Midpoints of each side documented',
        photoRequired: true,
        photoLabel: 'Midpoint photos',
        multiPhoto: true,
      },
      {
        id: 's2-high-point',
        label: 'High point / ridge line documented',
        photoRequired: true,
        photoLabel: 'Photo of high point/ridge',
      },
      {
        id: 's2-ground-level',
        label: 'Ground-level perspective of building and roof',
        photoRequired: true,
        photoLabel: 'Ground-level photo',
      },
      {
        id: 's2-oblique-angles',
        label: 'Oblique angle shots showing roof planes and transitions',
        photoRequired: true,
        photoLabel: 'Oblique angle photos',
        multiPhoto: true,
      },
    ],
  },
  {
    id: 'section-3',
    sectionNumber: 3,
    title: 'Membrane Roof (TPO / PVC / EPDM)',
    required: false,
    applicabilityQuestion: 'Does this roof have a membrane system (TPO, PVC, or EPDM)?',
    items: [
      {
        id: 's3-impact-marks',
        label: 'Circular impact marks or fractures on membrane surface',
        photoRequired: true,
        photoLabel: 'Photos of impact marks',
        multiPhoto: true,
        requiresScale: true,
      },
      {
        id: 's3-cracks-splits',
        label: 'Cracks or splits in membrane material',
        photoRequired: true,
        photoLabel: 'Photo of cracks/splits',
      },
      {
        id: 's3-punctures',
        label: 'Punctures or fractures through membrane',
        photoRequired: true,
        photoLabel: 'Photos of punctures/fractures',
        multiPhoto: true,
      },
      {
        id: 's3-seam-separation',
        label: 'Seam separation or lifted seams',
        photoRequired: true,
        photoLabel: 'Photos of seam separation',
        multiPhoto: true,
      },
      {
        id: 's3-equipment-damage',
        label: 'Equipment surroundings showing damage patterns',
        photoRequired: true,
        photoLabel: 'Photos of equipment area damage',
        multiPhoto: true,
      },
      {
        id: 's3-coverage',
        label: 'Corner, ridge, and midplane coverage documented',
        photoRequired: true,
        photoLabel: 'Coverage documentation photos',
        multiPhoto: true,
      },
    ],
  },
  {
    id: 'section-4',
    sectionNumber: 4,
    title: 'Modified Bitumen / BUR',
    required: false,
    applicabilityQuestion: 'Does this roof have a Modified Bitumen or Built-Up Roof (BUR) system?',
    items: [
      {
        id: 's4-granule-displacement',
        label: 'Granule displacement or loss from impact',
        photoRequired: true,
        photoLabel: 'Photos of granule displacement',
        multiPhoto: true,
        requiresScale: true,
      },
      {
        id: 's4-exposed-asphalt',
        label: 'Exposed asphalt or bitumen from hail strikes',
        photoRequired: true,
        photoLabel: 'Photos of exposed asphalt/bitumen',
        multiPhoto: true,
      },
      {
        id: 's4-fractures-splits',
        label: 'Fractures or splits in modified bitumen cap sheet',
        photoRequired: true,
        photoLabel: 'Photos of fractures/splits',
        multiPhoto: true,
      },
      {
        id: 's4-bruising',
        label: 'Bruising or soft spots detected by touch',
        photoRequired: true,
        photoLabel: 'Photo of bruising/soft spots',
      },
      {
        id: 's4-coverage',
        label: 'Corner, ridge, and midplane coverage documented',
        photoRequired: true,
        photoLabel: 'Coverage documentation photos',
        multiPhoto: true,
      },
    ],
  },
  {
    id: 'section-5',
    sectionNumber: 5,
    title: 'Metal Roof',
    required: false,
    applicabilityQuestion: 'Does this roof have metal panels?',
    items: [
      {
        id: 's5-hail-dents',
        label: 'Hail dents on metal panels',
        photoRequired: true,
        photoLabel: 'Photos of hail dents',
        multiPhoto: true,
        requiresScale: true,
      },
      {
        id: 's5-chalked-dent',
        label: 'Chalked dent documentation (chalk circle around dents)',
        photoRequired: true,
        photoLabel: 'Photos of chalked dents',
        multiPhoto: true,
      },
      {
        id: 's5-panel-seams',
        label: 'Panel seam integrity check',
        photoRequired: true,
        photoLabel: 'Photos of panel seams',
        multiPhoto: true,
      },
      {
        id: 's5-fasteners-rib',
        label: 'Fastener and rib deformation from impacts',
        photoRequired: true,
        photoLabel: 'Photos of fastener/rib deformation',
        multiPhoto: true,
      },
      {
        id: 's5-probe-card',
        label: 'Probe or card test on standing seams',
        photoRequired: true,
        photoLabel: 'Photo of probe/card test',
      },
      {
        id: 's5-coverage',
        label: 'Corner, ridge, and midplane coverage documented',
        photoRequired: true,
        photoLabel: 'Coverage documentation photos',
        multiPhoto: true,
      },
    ],
  },
  {
    id: 'section-6',
    sectionNumber: 6,
    title: 'Roof Penetrations & Equipment',
    required: true,
    items: [
      {
        id: 's6-hvac',
        label: 'HVAC units inspected for hail damage',
        photoRequired: true,
        photoLabel: 'Photos of HVAC units',
        multiPhoto: true,
      },
      {
        id: 's6-pipe-boots',
        label: 'Pipe boots and flashings inspected',
        photoRequired: true,
        photoLabel: 'Photos of pipe boots',
        multiPhoto: true,
      },
      {
        id: 's6-vents-exhaust',
        label: 'Vents and exhaust fans inspected',
        photoRequired: true,
        photoLabel: 'Photos of vents/exhaust fans',
        multiPhoto: true,
      },
      {
        id: 's6-skylights',
        label: 'Skylights inspected for cracks or impact damage',
        photoRequired: true,
        photoLabel: 'Photos of skylights',
        multiPhoto: true,
      },
      {
        id: 's6-spatter',
        label: 'Paint spatter or oxidation on metals from impacts',
        photoRequired: true,
        photoLabel: 'Photos of spatter on metals',
        multiPhoto: true,
        requiresScale: true,
      },
    ],
  },
  {
    id: 'section-7',
    sectionNumber: 7,
    title: 'Other Metal Components',
    required: true,
    items: [
      {
        id: 's7-copings',
        label: 'Copings inspected for dents and damage',
        photoRequired: true,
        photoLabel: 'Photos of copings',
        multiPhoto: true,
        requiresScale: true,
      },
      {
        id: 's7-edge-metal',
        label: 'Edge metal and drip edge inspected',
        photoRequired: true,
        photoLabel: 'Photos of edge metal',
        multiPhoto: true,
      },
      {
        id: 's7-gutters-downspouts',
        label: 'Gutters and downspouts inspected for dents',
        photoRequired: true,
        photoLabel: 'Photos of gutters/downspouts',
        multiPhoto: true,
      },
    ],
  },
  {
    id: 'section-8',
    sectionNumber: 8,
    title: 'Interior Quick Check',
    required: false,
    optional: true,
    applicabilityQuestion: 'Is the interior accessible for inspection?',
    items: [
      {
        id: 's8-ceiling-tiles',
        label: 'Water-stained ceiling tiles observed',
        photoRequired: true,
        photoLabel: 'Photos of stained ceiling tiles',
        multiPhoto: true,
      },
      {
        id: 's8-drywall-paint',
        label: 'Stained drywall or paint bubbling observed',
        photoRequired: true,
        photoLabel: 'Photos of stained drywall/paint',
        multiPhoto: true,
      },
      {
        id: 's8-active-leaks',
        label: 'Active leaks or dripping observed',
        photoRequired: true,
        photoLabel: 'Photos of active leaks',
        multiPhoto: true,
      },
    ],
  },
  {
    id: 'section-9',
    sectionNumber: 9,
    title: 'Correlate Interior Areas with Roof',
    required: false,
    dependsOn: 'section-8',
    items: [
      {
        id: 's9-roof-above-stains',
        label: 'Roof area directly above interior stains identified and documented',
        photoRequired: true,
        photoLabel: 'Photos of roof area above stains',
        multiPhoto: true,
      },
      {
        id: 's9-seams-penetrations',
        label: 'Seams and penetrations in correlated areas inspected',
        photoRequired: true,
        photoLabel: 'Photos of seams/penetrations',
        multiPhoto: true,
      },
      {
        id: 's9-hail-damage-doc',
        label: 'Hail damage in correlated roof area documented',
        photoRequired: true,
        photoLabel: 'Photos of hail damage in correlated area',
        multiPhoto: true,
        requiresScale: true,
      },
    ],
  },
  {
    id: 'section-10',
    sectionNumber: 10,
    title: 'Inspection Result',
    required: true,
    type: 'single-select',
    options: [
      {
        id: 'result-no-damage',
        value: 'no_damage',
        label: 'No Hail Damage',
        photoRequired: true,
        photoLabel: 'Supporting photos for no-damage finding',
        multiPhoto: true,
      },
      {
        id: 'result-possible',
        value: 'possible_damage',
        label: 'Possible Hail Damage',
        photoRequired: true,
        photoLabel: 'Photos of possible damage areas',
        multiPhoto: true,
      },
      {
        id: 'result-confirmed',
        value: 'confirmed_damage',
        label: 'Confirmed Hail Damage',
        photoRequired: true,
        photoLabel: 'Photos confirming hail damage',
        multiPhoto: true,
      },
    ],
  },
];
