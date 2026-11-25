import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';

export const SYSTEM_CLINICAL_FORM_TEMPLATES: {
	code: string;
	title: string;
	schemaJson: ClinicalFormTemplateSchema;
}[] = [
	{
		code: 'ed_triage_esi_v1',
		title: 'ED Triage (ESI)',
		schemaJson: {
			sections: [
				{
					id: 'chief_complaint',
					type: 'textarea',
					label: 'Chief complaint',
					required: true
				},
				{
					id: 'esi_level',
					type: 'enum',
					label: 'ESI level',
					required: true,
					options: [
						{ value: '1', label: 'ESI 1 - Resuscitation' },
						{ value: '2', label: 'ESI 2 - Emergent' },
						{ value: '3', label: 'ESI 3 - Urgent' },
						{ value: '4', label: 'ESI 4 - Less urgent' },
						{ value: '5', label: 'ESI 5 - Non-urgent' }
					]
				},
				{
					id: 'fast_track',
					type: 'boolean',
					label: 'Fast track eligible'
				},
				{
					id: 'triage_notes',
					type: 'textarea',
					label: 'Triage notes'
				}
			]
		}
	},
	{
		code: 'ed_triage_mts_v1',
		title: 'ED Triage (MTS)',
		schemaJson: {
			sections: [
				{
					id: 'chief_complaint',
					type: 'textarea',
					label: 'Presenting complaint',
					required: true
				},
				{
					id: 'mts_category',
					type: 'enum',
					label: 'MTS category',
					required: true,
					options: [
						{ value: 'red', label: 'Red - Immediate' },
						{ value: 'orange', label: 'Orange - Very urgent' },
						{ value: 'yellow', label: 'Yellow - Urgent' },
						{ value: 'green', label: 'Green - Standard' },
						{ value: 'blue', label: 'Blue - Non-urgent' }
					]
				},
				{
					id: 'discriminator',
					type: 'text',
					label: 'Discriminator / flowchart'
				},
				{
					id: 'triage_notes',
					type: 'textarea',
					label: 'Triage notes'
				}
			]
		}
	},
	{
		code: 'who_surgical_safety_v1',
		title: 'WHO Surgical Safety Checklist',
		schemaJson: {
			sections: [
				{
					id: 'sign_in',
					type: 'section',
					label: 'Sign In',
					sectionFields: [
						{
							id: 'sign_in_identity',
							type: 'boolean',
							label: 'Patient identity confirmed',
							required: true
						},
						{
							id: 'sign_in_site',
							type: 'boolean',
							label: 'Site marked and confirmed',
							required: true
						},
						{
							id: 'sign_in_consent',
							type: 'boolean',
							label: 'Consent complete',
							required: true
						},
						{
							id: 'sign_in_airway',
							type: 'boolean',
							label: 'Airway risk assessed'
						},
						{
							id: 'sign_in_at',
							type: 'datetime',
							label: 'Sign in time'
						}
					]
				},
				{
					id: 'time_out',
					type: 'section',
					label: 'Time Out',
					sectionFields: [
						{
							id: 'timeout_team',
							type: 'boolean',
							label: 'Team introduced',
							required: true
						},
						{
							id: 'timeout_procedure',
							type: 'boolean',
							label: 'Procedure confirmed',
							required: true
						},
						{
							id: 'timeout_antibiotic',
							type: 'boolean',
							label: 'Antibiotic prophylaxis given'
						},
						{
							id: 'timeout_at',
							type: 'datetime',
							label: 'Time out time'
						}
					]
				},
				{
					id: 'sign_out',
					type: 'section',
					label: 'Sign Out',
					sectionFields: [
						{
							id: 'signout_procedure',
							type: 'text',
							label: 'Procedure recorded',
							required: true
						},
						{
							id: 'signout_instruments',
							type: 'boolean',
							label: 'Instrument/sponge count correct'
						},
						{
							id: 'signout_specimen',
							type: 'text',
							label: 'Specimen labeling'
						},
						{
							id: 'signout_at',
							type: 'datetime',
							label: 'Sign out time'
						}
					]
				}
			]
		}
	},
	{
		code: 'anesthesia_record_v1',
		title: 'Anesthesia Record',
		schemaJson: {
			sections: [
				{
					id: 'airway_grade',
					type: 'text',
					label: 'Airway grade / device'
				},
				{
					id: 'vitals_notes',
					type: 'textarea',
					label: 'Vitals timeline notes'
				},
				{
					id: 'drugs_fluids',
					type: 'textarea',
					label: 'Drugs and fluids'
				},
				{
					id: 'anesthesia_start',
					type: 'datetime',
					label: 'Anesthesia start'
				},
				{
					id: 'anesthesia_end',
					type: 'datetime',
					label: 'Anesthesia end'
				}
			]
		}
	},
	{
		code: 'pacu_recovery_v1',
		title: 'PACU Recovery',
		schemaJson: {
			sections: [
				{
					id: 'aldrete_score',
					type: 'number',
					label: 'Aldrete score',
					required: true
				},
				{
					id: 'pain_score',
					type: 'number',
					label: 'Pain score'
				},
				{
					id: 'complications',
					type: 'textarea',
					label: 'Complications'
				},
				{
					id: 'receiving_ward',
					type: 'text',
					label: 'Receiving ward / unit'
				},
				{
					id: 'handoff_notes',
					type: 'textarea',
					label: 'Handoff notes',
					required: true
				}
			]
		}
	},
	{
		code: 'pre_op_assessment_v1',
		title: 'Pre-operative Assessment',
		schemaJson: {
			sections: [
				{
					id: 'asa_class',
					type: 'enum',
					label: 'ASA class',
					options: [
						{ value: '1', label: 'I' },
						{ value: '2', label: 'II' },
						{ value: '3', label: 'III' },
						{ value: '4', label: 'IV' },
						{ value: '5', label: 'V' }
					]
				},
				{
					id: 'labs_ok',
					type: 'boolean',
					label: 'Labs reviewed'
				},
				{
					id: 'imaging_ok',
					type: 'boolean',
					label: 'Imaging reviewed'
				},
				{
					id: 'clearance_notes',
					type: 'textarea',
					label: 'Clearance notes'
				}
			]
		}
	},
	{
		code: 'ld_partogram_v1',
		title: 'Partogram',
		schemaJson: {
			sections: [
				{
					id: 'cervix_cm',
					type: 'number',
					label: 'Cervical dilatation (cm)'
				},
				{
					id: 'descent',
					type: 'text',
					label: 'Fetal descent'
				},
				{
					id: 'contractions',
					type: 'text',
					label: 'Contractions per 10 min'
				},
				{
					id: 'fhr',
					type: 'text',
					label: 'FHR'
				},
				{
					id: 'oxytocin',
					type: 'text',
					label: 'Oxytocin / fluids'
				},
				{
					id: 'partogram_notes',
					type: 'textarea',
					label: 'Notes'
				}
			]
		}
	},
	{
		code: 'ld_delivery_record_v1',
		title: 'Delivery Record',
		schemaJson: {
			sections: [
				{
					id: 'delivery_mode',
					type: 'enum',
					label: 'Mode of delivery',
					required: true,
					options: [
						{ value: 'svd', label: 'Spontaneous vaginal' },
						{ value: 'vacuum', label: 'Vacuum' },
						{ value: 'forceps', label: 'Forceps' },
						{ value: 'c_section', label: 'C-section' }
					]
				},
				{
					id: 'baby_sex',
					type: 'text',
					label: 'Sex'
				},
				{
					id: 'birth_weight_g',
					type: 'number',
					label: 'Birth weight (g)'
				},
				{
					id: 'apgar',
					type: 'text',
					label: 'Apgar scores'
				},
				{
					id: 'delivery_notes',
					type: 'textarea',
					label: 'Delivery notes'
				}
			]
		}
	},
	{
		code: 'procedure_log_cath_v1',
		title: 'Cath Lab Procedure Log',
		schemaJson: {
			sections: [
				{
					id: 'indication',
					type: 'textarea',
					label: 'Indication',
					required: true
				},
				{
					id: 'access_site',
					type: 'text',
					label: 'Access site'
				},
				{
					id: 'findings',
					type: 'textarea',
					label: 'Findings'
				},
				{
					id: 'interventions',
					type: 'textarea',
					label: 'Interventions'
				},
				{
					id: 'fluoro_time_min',
					type: 'number',
					label: 'Fluoroscopy time (min)'
				},
				{
					id: 'dose_mgy',
					type: 'number',
					label: 'Dose (mGy)'
				},
				{
					id: 'contrast_ml',
					type: 'number',
					label: 'Contrast volume (ml)'
				},
				{
					id: 'devices',
					type: 'textarea',
					label: 'Devices implanted'
				}
			]
		}
	},
	{
		code: 'procedure_log_endoscopy_v1',
		title: 'Endoscopy Procedure Log',
		schemaJson: {
			sections: [
				{
					id: 'indication',
					type: 'textarea',
					label: 'Indication',
					required: true
				},
				{
					id: 'scope_type',
					type: 'text',
					label: 'Scope type'
				},
				{
					id: 'findings',
					type: 'textarea',
					label: 'Findings'
				},
				{
					id: 'interventions',
					type: 'textarea',
					label: 'Interventions'
				},
				{
					id: 'specimens',
					type: 'text',
					label: 'Specimens'
				},
				{
					id: 'complications',
					type: 'textarea',
					label: 'Complications'
				}
			]
		}
	},
	{
		code: 'trauma_activation_v1',
		title: 'Trauma Team Activation',
		schemaJson: {
			sections: [
				{
					id: 'mechanism',
					type: 'textarea',
					label: 'Mechanism of injury',
					required: true
				},
				{
					id: 'team_present',
					type: 'textarea',
					label: 'Team members present'
				},
				{
					id: 'primary_survey',
					type: 'textarea',
					label: 'Primary survey notes'
				}
			]
		}
	},
	{
		code: 'ed_mlc_documentation_v2',
		title: 'MLC documentation',
		schemaJson: {
			sections: [
				{
					id: 'incident',
					type: 'section',
					label: 'Incident',
					sectionFields: [
						{
							id: 'incident_datetime',
							type: 'datetime',
							label: 'Incident date/time',
							required: true
						},
						{
							id: 'incident_location',
							type: 'text',
							label: 'Place of incident',
							required: true
						},
						{
							id: 'police_station',
							type: 'text',
							label: 'Police station',
							required: true
						},
						{
							id: 'fir_no',
							type: 'text',
							label: 'FIR / crime reference no'
						},
						{
							id: 'brought_by',
							type: 'text',
							label: 'Brought by (name)'
						},
						{
							id: 'brought_by_relation',
							type: 'text',
							label:
								'Relationship / designation of person bringing the case'
						}
					]
				},
				{
					id: 'history',
					type: 'section',
					label: 'History',
					sectionFields: [
						{
							id: 'alleged_history',
							type: 'textarea',
							label: 'Alleged history as narrated',
							required: true
						},
						{
							id: 'consciousness_state',
							type: 'enum',
							label: 'State at examination',
							required: true,
							options: [
								{
									value: 'oriented',
									label: 'Conscious and oriented'
								},
								{ value: 'drowsy', label: 'Drowsy' },
								{ value: 'unconscious', label: 'Unconscious' },
								{
									value: 'intoxicated',
									label: 'Apparently intoxicated'
								}
							]
						}
					]
				},
				{
					id: 'examination',
					type: 'section',
					label: 'Examination',
					sectionFields: [
						{
							id: 'exam_general',
							type: 'textarea',
							label: 'General examination findings',
							required: true
						},
						{
							id: 'exam_injuries',
							type: 'table',
							label: 'Injuries',
							required: true,
							columns: [
								{ id: 'region', label: 'Region', type: 'text' },
								{
									id: 'nature',
									label: 'Nature',
									type: 'enum',
									options: [
										{ value: 'abrasion', label: 'Abrasion' },
										{ value: 'contusion', label: 'Contusion' },
										{ value: 'laceration', label: 'Laceration' },
										{
											value: 'incised_wound',
											label: 'Incised wound'
										},
										{ value: 'stab_wound', label: 'Stab wound' },
										{ value: 'burn', label: 'Burn' },
										{ value: 'fracture', label: 'Fracture' },
										{ value: 'bite', label: 'Bite mark' }
									]
								},
								{ id: 'size', label: 'Size', type: 'text' },
								{ id: 'age', label: 'Age of injury', type: 'text' },
								{ id: 'remarks', label: 'Remarks', type: 'text' }
							]
						}
					]
				},
				{
					id: 'opinion',
					type: 'section',
					label: 'Opinion',
					sectionFields: [
						{
							id: 'nature_of_weapon',
							type: 'enum',
							label: 'Nature of weapon',
							options: [
								{ value: 'blunt', label: 'Blunt' },
								{ value: 'sharp', label: 'Sharp' },
								{ value: 'firearm', label: 'Firearm' },
								{ value: 'thermal', label: 'Thermal' },
								{ value: 'other', label: 'Other' },
								{ value: 'not_applicable', label: 'Not applicable' }
							]
						},
						{
							id: 'injury_age',
							type: 'text',
							label: 'Opinion on age of injuries'
						},
						{
							id: 'opinion',
							type: 'textarea',
							label: 'Opinion of the examining doctor',
							required: true
						},
						{
							id: 'advised_referral',
							type: 'text',
							label: 'Referral / admission advised'
						}
					]
				},
				{
					id: 'signatures',
					type: 'section',
					label: 'Attestation',
					sectionFields: [
						{
							id: 'doctor_signature',
							type: 'signature',
							label: 'Examining doctor',
							required: true
						},
						{
							id: 'doctor_signed_at',
							type: 'signature_datetime',
							label: 'Signed at',
							required: true
						},
						{
							id: 'witness_name',
							type: 'text',
							label: 'Witness name and designation',
							required: true
						},
						{
							id: 'witness_signature',
							type: 'witness_signature',
							label: 'Witness signature',
							required: true
						},
						{
							id: 'witness_signed_at',
							type: 'signature_datetime',
							label: 'Witness signed at',
							required: true
						}
					]
				}
			]
		}
	},
	{
		code: 'ed_mlc_documentation_v1',
		title: 'MLC documentation (legacy v1)',
		schemaJson: {
			sections: [
				{
					id: 'incident_datetime',
					type: 'text',
					label: 'Incident date/time',
					required: true
				},
				{
					id: 'incident_location',
					type: 'text',
					label: 'Incident location',
					required: true
				},
				{
					id: 'police_station',
					type: 'text',
					label: 'Police station / FIR reference'
				},
				{
					id: 'injury_description',
					type: 'textarea',
					label: 'Injury description',
					required: true
				},
				{
					id: 'mlc_notes',
					type: 'textarea',
					label: 'Additional MLC notes'
				}
			]
		}
	}
];
