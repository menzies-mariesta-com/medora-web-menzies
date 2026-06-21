/** Global EMR demo catalog for nursing/consultation order pages (seeded per hospital). */

export const MIN_SEEDED_SERVICES = 120;
export const MIN_SEEDED_DOCTORS = 100;
export const SEED_DOCTOR_PASSWORD = 'Doctor@123';
export const SEED_SERVICE_CODE_PREFIX = 'SEED-';

export type EmrDemoSubCategory = {
	id: number;
	categoryId: number;
	name: string;
};

export type EmrDemoService = {
	subCategoryId: number;
	serviceName: string;
	serviceCode: string;
	defaultAmount: number;
	defaultTax: number;
};

/** Category ids from master-table-seed: 1 Rad … 13 Medical Supply */
export const EMR_DEMO_SUB_CATEGORIES: EmrDemoSubCategory[] = [
	{ id: 91001, categoryId: 1, name: 'CT Scan' },
	{ id: 91002, categoryId: 1, name: 'MRI' },
	{ id: 91003, categoryId: 1, name: 'X-Ray' },
	{ id: 91004, categoryId: 1, name: 'Ultrasound' },
	{ id: 91005, categoryId: 1, name: 'Mammography' },
	{ id: 91006, categoryId: 1, name: 'Fluoroscopy' },
	{ id: 91007, categoryId: 2, name: 'Nursing Procedures' },
	{ id: 91008, categoryId: 2, name: 'Nursing Injections' },
	{ id: 91009, categoryId: 2, name: 'Nursing Monitoring' },
	{ id: 91010, categoryId: 2, name: 'Wound Care' },
	{ id: 91011, categoryId: 2, name: 'IV Therapy' },
	{ id: 91012, categoryId: 3, name: 'Medical Oxygen' },
	{ id: 91013, categoryId: 3, name: 'Therapeutic Gases' },
	{ id: 91014, categoryId: 4, name: 'Ambulance Basic' },
	{ id: 91015, categoryId: 4, name: 'Ambulance Advanced' },
	{ id: 91016, categoryId: 5, name: 'Hematology' },
	{ id: 91017, categoryId: 5, name: 'Clinical Chemistry' },
	{ id: 91018, categoryId: 5, name: 'Microbiology' },
	{ id: 91019, categoryId: 5, name: 'Serology' },
	{ id: 91020, categoryId: 5, name: 'Immunology' },
	{ id: 91021, categoryId: 5, name: 'Hormones' },
	{ id: 91022, categoryId: 5, name: 'Urinalysis' },
	{ id: 91023, categoryId: 6, name: 'Registration Fees' },
	{ id: 91024, categoryId: 6, name: 'Bed and Facility' },
	{ id: 91025, categoryId: 6, name: 'Administrative Fees' },
	{ id: 91026, categoryId: 7, name: 'OPD Consultation' },
	{ id: 91027, categoryId: 7, name: 'Specialist Consultation' },
	{ id: 91028, categoryId: 7, name: 'Emergency Consultation' },
	{ id: 91029, categoryId: 7, name: 'Procedure Fees' },
	{ id: 91030, categoryId: 8, name: 'Cathlab Diagnostic' },
	{ id: 91031, categoryId: 8, name: 'Cathlab Interventional' },
	{ id: 91032, categoryId: 9, name: 'Upper GI Endoscopy' },
	{ id: 91033, categoryId: 9, name: 'Lower GI Endoscopy' },
	{ id: 91034, categoryId: 9, name: 'Bronchoscopy' },
	{ id: 91035, categoryId: 10, name: 'Housekeeping' },
	{ id: 91036, categoryId: 11, name: 'General Consumables' },
	{ id: 91037, categoryId: 12, name: 'Pharmacy Medicines' },
	{ id: 91038, categoryId: 12, name: 'IV Fluids' },
	{ id: 91039, categoryId: 13, name: 'Medical Equipment' },
	{ id: 91040, categoryId: 13, name: 'Surgical Supplies' }
];

type RawService = [subCategoryId: number, name: string, code: string, amount: number, tax?: number];

const RAW_SERVICES: RawService[] = [
	// Radiology — CT (91001)
	[91001, 'CT Brain Plain', 'SEED-RAD-CT-BRAIN', 95000, 0],
	[91001, 'CT Brain Contrast', 'SEED-RAD-CT-BRAIN-C', 125000, 0],
	[91001, 'CT Chest Plain', 'SEED-RAD-CT-CHEST', 90000, 0],
	[91001, 'CT Abdomen Pelvis', 'SEED-RAD-CT-ABD', 110000, 0],
	[91001, 'CT Spine', 'SEED-RAD-CT-SPINE', 105000, 0],
	// MRI (91002)
	[91002, 'MRI Brain', 'SEED-RAD-MRI-BRAIN', 180000, 0],
	[91002, 'MRI Knee', 'SEED-RAD-MRI-KNEE', 160000, 0],
	[91002, 'MRI Lumbar Spine', 'SEED-RAD-MRI-LSPINE', 175000, 0],
	[91002, 'MRI Shoulder', 'SEED-RAD-MRI-SHOULDER', 165000, 0],
	// X-Ray (91003)
	[91003, 'Chest X-Ray PA', 'SEED-RAD-XR-CHEST', 15000, 0],
	[91003, 'X-Ray Abdomen', 'SEED-RAD-XR-ABD', 18000, 0],
	[91003, 'X-Ray Skull', 'SEED-RAD-XR-SKULL', 20000, 0],
	[91003, 'X-Ray Spine AP/LAT', 'SEED-RAD-XR-SPINE', 22000, 0],
	// Ultrasound (91004)
	[91004, 'Ultrasound Abdomen', 'SEED-RAD-US-ABD', 35000, 0],
	[91004, 'Ultrasound Pelvis', 'SEED-RAD-US-PELVIS', 32000, 0],
	[91004, 'Ultrasound Obstetric', 'SEED-RAD-US-OBS', 40000, 0],
	[91004, 'Ultrasound Thyroid', 'SEED-RAD-US-THY', 28000, 0],
	// Mammography (91005)
	[91005, 'Mammography Bilateral', 'SEED-RAD-MAMMO', 55000, 0],
	[91005, 'Mammography Screening', 'SEED-RAD-MAMMO-SCR', 45000, 0],
	// Fluoroscopy (91006)
	[91006, 'Barium Swallow', 'SEED-RAD-BARIUM-SW', 42000, 0],
	[91006, 'Barium Enema', 'SEED-RAD-BARIUM-EN', 48000, 0],
	// Nursing procedures (91007)
	[91007, 'Nebulization', 'SEED-NUR-NEB', 8000, 0],
	[91007, 'Wound Dressing Simple', 'SEED-NUR-DRESS-S', 5000, 0],
	[91007, 'Wound Dressing Complex', 'SEED-NUR-DRESS-C', 12000, 0],
	[91007, 'Catheterization', 'SEED-NUR-CATH', 15000, 0],
	[91007, 'NG Tube Insertion', 'SEED-NUR-NGT', 10000, 0],
	// Nursing injections (91008)
	[91008, 'Injection IM', 'SEED-NUR-INJ-IM', 3000, 0],
	[91008, 'Injection IV', 'SEED-NUR-INJ-IV', 5000, 0],
	[91008, 'Injection SC', 'SEED-NUR-INJ-SC', 3000, 0],
	[91008, 'Vaccination Administration', 'SEED-NUR-VAC-ADM', 6000, 0],
	// Nursing monitoring (91009)
	[91009, 'Vital Signs Monitoring', 'SEED-NUR-VITAL', 4000, 0],
	[91009, 'ECG Nursing Assist', 'SEED-NUR-ECG', 8000, 0],
	[91009, 'Blood Glucose Monitoring', 'SEED-NUR-BG', 3500, 0],
	// Wound care (91010)
	[91010, 'Suture Removal', 'SEED-NUR-SUT-REM', 7000, 0],
	[91010, 'Pressure Ulcer Care', 'SEED-NUR-PUC', 14000, 0],
	// IV therapy (91011)
	[91011, 'IV Cannulation', 'SEED-NUR-IV-CAN', 8000, 0],
	[91011, 'IV Fluid Administration', 'SEED-NUR-IV-FL', 10000, 0],
	[91011, 'Blood Transfusion Nursing', 'SEED-NUR-BT', 18000, 0],
	// Medical gases (91012–91013)
	[91012, 'Oxygen 1 Hour', 'SEED-GAS-O2-1H', 5000, 0],
	[91012, 'Oxygen 4 Hours', 'SEED-GAS-O2-4H', 15000, 0],
	[91013, 'Nitrous Oxide Sedation', 'SEED-GAS-N2O', 25000, 0],
	// Ambulance (91014–91015)
	[91014, 'Ambulance BLS Transfer', 'SEED-AMB-BLS', 45000, 0],
	[91014, 'Ambulance City Transfer', 'SEED-AMB-CITY', 35000, 0],
	[91015, 'Ambulance ALS Emergency', 'SEED-AMB-ALS', 85000, 0],
	[91015, 'Ambulance ICU Transfer', 'SEED-AMB-ICU', 120000, 0],
	// Laboratory (91016–91022)
	[91016, 'Complete Blood Count', 'SEED-LAB-CBC', 12000, 0],
	[91016, 'Peripheral Blood Smear', 'SEED-LAB-PBS', 8000, 0],
	[91016, 'ESR', 'SEED-LAB-ESR', 5000, 0],
	[91016, 'Reticulocyte Count', 'SEED-LAB-RETIC', 9000, 0],
	[91017, 'Liver Function Test', 'SEED-LAB-LFT', 18000, 0],
	[91017, 'Renal Function Test', 'SEED-LAB-RFT', 16000, 0],
	[91017, 'Lipid Profile', 'SEED-LAB-LIPID', 20000, 0],
	[91017, 'Fasting Blood Glucose', 'SEED-LAB-FBG', 6000, 0],
	[91017, 'HbA1c', 'SEED-LAB-HBA1C', 15000, 0],
	[91018, 'Blood Culture', 'SEED-LAB-BC', 22000, 0],
	[91018, 'Urine Culture', 'SEED-LAB-UC', 14000, 0],
	[91018, 'Stool Culture', 'SEED-LAB-STOOL-C', 12000, 0],
	[91018, 'Gram Stain', 'SEED-LAB-GRAM', 7000, 0],
	[91019, 'HIV Screening', 'SEED-LAB-HIV', 18000, 0],
	[91019, 'HBsAg', 'SEED-LAB-HBSAG', 12000, 0],
	[91019, 'HCV Antibody', 'SEED-LAB-HCV', 14000, 0],
	[91019, 'VDRL', 'SEED-LAB-VDRL', 8000, 0],
	[91020, 'CRP', 'SEED-LAB-CRP', 10000, 0],
	[91020, 'RF Factor', 'SEED-LAB-RF', 11000, 0],
	[91020, 'ANA Screen', 'SEED-LAB-ANA', 25000, 0],
	[91021, 'TSH', 'SEED-LAB-TSH', 12000, 0],
	[91021, 'Free T4', 'SEED-LAB-FT4', 14000, 0],
	[91021, 'Cortisol AM', 'SEED-LAB-CORT', 16000, 0],
	[91022, 'Urinalysis Routine', 'SEED-LAB-UA', 5000, 0],
	[91022, 'Urine Microalbumin', 'SEED-LAB-MAU', 9000, 0],
	// Hospital fees (91023–91025)
	[91023, 'OPD Registration Fee', 'SEED-HOS-REG-OPD', 3000, 0],
	[91023, 'Emergency Registration', 'SEED-HOS-REG-ED', 5000, 0],
	[91024, 'Daycare Bed Charge', 'SEED-HOS-BED-DAY', 25000, 0],
	[91024, 'Observation Bed 6 Hours', 'SEED-HOS-BED-OBS', 18000, 0],
	[91025, 'Medical Report Fee', 'SEED-HOS-REPORT', 8000, 0],
	[91025, 'Certificate Fee', 'SEED-HOS-CERT', 5000, 0],
	// Doctor fees (91026–91029)
	[91026, 'GP OPD Consultation', 'SEED-DOC-GP-OPD', 15000, 0],
	[91026, 'GP Follow-up Visit', 'SEED-DOC-GP-FU', 10000, 0],
	[91027, 'Specialist First Visit', 'SEED-DOC-SPEC-1', 25000, 0],
	[91027, 'Specialist Follow-up', 'SEED-DOC-SPEC-FU', 18000, 0],
	[91028, 'Emergency Doctor Fee', 'SEED-DOC-ED', 35000, 0],
	[91028, 'After Hours Consultation', 'SEED-DOC-AH', 40000, 0],
	[91029, 'Minor Procedure Fee', 'SEED-DOC-PROC-MIN', 20000, 0],
	[91029, 'Suturing Doctor Fee', 'SEED-DOC-SUT', 22000, 0],
	// Cathlab (91030–91031)
	[91030, 'Coronary Angiography Diagnostic', 'SEED-CATH-ANGIO', 350000, 0],
	[91030, 'Left Heart Catheterization', 'SEED-CATH-LHC', 280000, 0],
	[91031, 'PCI Single Vessel', 'SEED-CATH-PCI-1', 650000, 0],
	[91031, 'PCI with Stent', 'SEED-CATH-STENT', 850000, 0],
	// Endoscopy (91032–91034)
	[91032, 'OGD Diagnostic', 'SEED-END-OGD', 85000, 0],
	[91032, 'OGD with Biopsy', 'SEED-END-OGD-BX', 110000, 0],
	[91033, 'Colonoscopy Diagnostic', 'SEED-END-COLON', 120000, 0],
	[91033, 'Sigmoidoscopy', 'SEED-END-SIG', 65000, 0],
	[91034, 'Bronchoscopy Diagnostic', 'SEED-END-BRONCH', 95000, 0],
	// Housekeeping (91035)
	[91035, 'Patient Room Cleaning', 'SEED-HK-ROOM', 5000, 0],
	[91035, 'Linen Change Service', 'SEED-HK-LINEN', 4000, 0],
	// General supply (91036)
	[91036, 'Syringe 5ml', 'SEED-SUP-SYR-5', 500, 0],
	[91036, 'Gloves Pair', 'SEED-SUP-GLOVE', 300, 0],
	[91036, 'Face Mask Surgical', 'SEED-SUP-MASK', 200, 0],
	[91036, 'IV Set', 'SEED-SUP-IVSET', 1500, 0],
	// Pharmacy (91037–91038)
	[91037, 'Paracetamol 500mg Tab', 'SEED-PHARM-PARA', 100, 0],
	[91037, 'Amoxicillin 500mg Cap', 'SEED-PHARM-AMOX', 250, 0],
	[91037, 'Omeprazole 20mg Cap', 'SEED-PHARM-OME', 180, 0],
	[91038, 'Normal Saline 500ml', 'SEED-PHARM-NS500', 1200, 0],
	[91038, 'D5W 500ml', 'SEED-PHARM-D5W', 1300, 0],
	// Medical supply (91039–91040)
	[91039, 'Wheelchair Rental Daily', 'SEED-MS-WC', 8000, 0],
	[91039, 'Crutches Pair Rental', 'SEED-MS-CRUTCH', 5000, 0],
	[91040, 'Surgical Pack Minor', 'SEED-MS-SURG-PK', 12000, 0],
	[91040, 'Sterile Dressing Pack', 'SEED-MS-DRESS-PK', 3500, 0],
	// Additional services to reach comprehensive catalog (120+)
	[91001, 'CT Angiography Head', 'SEED-RAD-CTA-HEAD', 140000, 0],
	[91002, 'MRI Abdomen', 'SEED-RAD-MRI-ABD', 190000, 0],
	[91003, 'X-Ray Extremity', 'SEED-RAD-XR-EXT', 16000, 0],
	[91004, 'Ultrasound Doppler Limb', 'SEED-RAD-US-DOP', 45000, 0],
	[91007, 'Steam Inhalation', 'SEED-NUR-STEAM', 3500, 0],
	[91007, 'Peak Flow Measurement', 'SEED-NUR-PEAK', 4500, 0],
	[91016, 'Platelet Count', 'SEED-LAB-PLT', 7000, 0],
	[91017, 'Electrolytes Panel', 'SEED-LAB-LYTE', 14000, 0],
	[91018, 'AFB Smear', 'SEED-LAB-AFB', 9000, 0],
	[91019, 'Malaria Smear', 'SEED-LAB-MAL', 8000, 0],
	[91026, 'Telemedicine Consultation', 'SEED-DOC-TELE', 12000, 0],
	[91027, 'Second Opinion Consultation', 'SEED-DOC-2ND', 30000, 0],
	[91030, 'Coronary Angiography Report', 'SEED-CATH-RPT', 15000, 0],
	[91032, 'ERCP Diagnostic', 'SEED-END-ERCP', 145000, 0],
	[91037, 'Metformin 500mg Tab', 'SEED-PHARM-MET', 120, 0],
	[91036, 'Alcohol Swab', 'SEED-SUP-ALC', 50, 0]
];

export const EMR_DEMO_SERVICES: EmrDemoService[] = RAW_SERVICES.map(
	([subCategoryId, serviceName, serviceCode, defaultAmount, defaultTax = 0]) => ({
		subCategoryId,
		serviceName,
		serviceCode,
		defaultAmount,
		defaultTax
	})
);
