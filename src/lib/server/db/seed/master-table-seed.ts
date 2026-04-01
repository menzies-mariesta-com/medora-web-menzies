import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { CountryCodeData } from '../../../model/data/country-code.data.ts';
import { StringUtil } from '../../../util/string.util.svelte.ts';
import { seedLogger } from '$lib/logger';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

/**
 * Seed master/lookup tables with basic reference data.
 *
 * This script is designed to be:
 * - **Order-aware** – inserts in FK‑safe order (status → country → state → city → others)
 * - **Idempotent-ish** – sets fixed primary keys so re-running will no-op on conflicts
 *
 * npx tsx src/lib/server/db/seed/master-table-seed.ts
 */
export async function seedMasterTables() {
	seedLogger.info('Seeding master tables...');

	// 1. Statuses
	await db.execute(sql`
		INSERT INTO status (id, name)
		VALUES 
			(1, 'active'),
			(2, 'inactive'),
			(3, 'pending'),
			(4, 'deleted')
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: status');

	// 1b. Billing discount type (OP billing visit-level discount mode; depends: status)
	await db.execute(sql`
		INSERT INTO billing_discount_type (id, code, name, status_id)
		VALUES
			(1, 'none', 'None', 1),
			(2, 'percent', 'Percent', 1),
			(3, 'amount', 'Amount', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: billing_discount_type');

	// 2. Category (depends: status)
	await db.execute(sql`
		INSERT INTO category (id, category_name, status_id)
		VALUES
			(1, 'Radiology', 1),
			(2, 'Nursing Procedure', 1),
			(3, 'Medical Gases', 1),
			(4, 'Ambulance Service', 1),
			(5, 'Laboratory', 1),
			(6, 'Hospital Fees', 1),
			(7, 'Doctor Fees', 1),
			(8, 'Cathlab', 1),
			(9, 'Endoscopy', 1),
			(10, 'Housekeeping', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: category');

	// 3. Countries
	await db.execute(sql`
		INSERT INTO country (id, name, code, image_url, country_calling_code, language, status_id)
		VALUES ${sql.join(
			CountryCodeData.map(
				(c) =>
					// name: formatted with StringUtil.countryName
					// code: kept in lowercase as in source data
					sql`(${c.id}, ${StringUtil.countryName(c.name)}, ${c.code}, ${c.image}, ${c.phone}, ${c.language}, 1)`
			),
			sql`, `
		)}
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: country');

	// 3. States / Regions
	await db.execute(sql`
		INSERT INTO state (id, name, code, country_id, status_id)
		VALUES 
			-- Myanmar (118) States and Regions
			(1, 'Yangon Region', 'YG', 118, 1),
			(2, 'Mandalay Region', 'MDY', 118, 1),
			(3, 'Naypyidaw Union Territory', 'NPT', 118, 1),
			(4, 'Ayeyarwady Region', 'AYW', 118, 1),
			(5, 'Bago Region', 'BG', 118, 1),
			(6, 'Magway Region', 'MGW', 118, 1),
			(7, 'Sagaing Region', 'SGG', 118, 1),
			(8, 'Tanintharyi Region', 'TNT', 118, 1),
			(9, 'Kachin State', 'KCN', 118, 1),
			(10, 'Kayah State', 'KYH', 118, 1),
			(11, 'Kayin State', 'KYN', 118, 1),
			(12, 'Chin State', 'CHN', 118, 1),
			(13, 'Mon State', 'MON', 118, 1),
			(14, 'Rakhine State', 'RKH', 118, 1),
			(15, 'Shan State', 'SHN', 118, 1),
			-- Thailand (171) Provinces
			(16, 'Bangkok', 'BKK', 171, 1),
			(17, 'Chiang Mai', 'CM', 171, 1),
			(18, 'Phuket', 'PKT', 171, 1),
			(19, 'Pattaya', 'PTY', 171, 1),
			(20, 'Krabi', 'KBI', 171, 1),
			-- Singapore (155) - City State (no states, but we'll add districts)
			(21, 'Central Region', 'CR', 155, 1),
			(22, 'East Region', 'ER', 155, 1),
			(23, 'North Region', 'NR', 155, 1),
			(24, 'North-East Region', 'NER', 155, 1),
			(25, 'West Region', 'WR', 155, 1),
			-- Malaysia (103) States
			(26, 'Kuala Lumpur', 'KL', 103, 1),
			(27, 'Selangor', 'SGR', 103, 1),
			(28, 'Penang', 'PNG', 103, 1),
			(29, 'Johor', 'JHR', 103, 1),
			(30, 'Sabah', 'SBH', 103, 1),
			-- Indonesia (76) Provinces
			(31, 'Jakarta', 'JKT', 76, 1),
			(32, 'Bali', 'BLI', 76, 1),
			(33, 'West Java', 'WJB', 76, 1),
			(34, 'East Java', 'EJB', 76, 1),
			(35, 'Central Java', 'CJB', 76, 1),
			-- India (75) States and Union Territories
			(36, 'Andhra Pradesh', 'AP', 75, 1),
			(37, 'Arunachal Pradesh', 'AR', 75, 1),
			(38, 'Assam', 'AS', 75, 1),
			(39, 'Bihar', 'BR', 75, 1),
			(40, 'Chhattisgarh', 'CG', 75, 1),
			(41, 'Goa', 'GA', 75, 1),
			(42, 'Gujarat', 'GJ', 75, 1),
			(43, 'Haryana', 'HR', 75, 1),
			(44, 'Himachal Pradesh', 'HP', 75, 1),
			(45, 'Jharkhand', 'JH', 75, 1),
			(46, 'Karnataka', 'KA', 75, 1),
			(47, 'Kerala', 'KL', 75, 1),
			(48, 'Madhya Pradesh', 'MP', 75, 1),
			(49, 'Maharashtra', 'MH', 75, 1),
			(50, 'Manipur', 'MN', 75, 1),
			(51, 'Meghalaya', 'ML', 75, 1),
			(52, 'Mizoram', 'MZ', 75, 1),
			(53, 'Nagaland', 'NL', 75, 1),
			(54, 'Odisha', 'OD', 75, 1),
			(55, 'Punjab', 'PB', 75, 1),
			(56, 'Rajasthan', 'RJ', 75, 1),
			(57, 'Sikkim', 'SK', 75, 1),
			(58, 'Tamil Nadu', 'TN', 75, 1),
			(59, 'Telangana', 'TG', 75, 1),
			(60, 'Tripura', 'TR', 75, 1),
			(61, 'Uttar Pradesh', 'UP', 75, 1),
			(62, 'Uttarakhand', 'UK', 75, 1),
			(63, 'West Bengal', 'WB', 75, 1),
			(64, 'Delhi', 'DL', 75, 1),
			(65, 'Jammu and Kashmir', 'JK', 75, 1),
			(66, 'Ladakh', 'LA', 75, 1),
			(67, 'Puducherry', 'PY', 75, 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: state');

	// 4. Cities
	await db.execute(sql`
		INSERT INTO city (id, name, code, state_id, status_id)
		VALUES 
			-- Yangon Region (1) Cities
			(1, 'Insein', 'isn', 1, 1),
			(2, 'Hlaingthaya', 'hty', 1, 1),
			(3, 'Ahlone', 'ahl', 1, 1),
			(4, 'Bahan', 'bhn', 1, 1),
			(5, 'Dagon', 'dgn', 1, 1),
			(6, 'Kamayut', 'kmt', 1, 1),
			(7, 'Kyauktada', 'ktd', 1, 1),
			(8, 'Latha', 'lth', 1, 1),
			(9, 'Pabedan', 'pbd', 1, 1),
			(10, 'Sanchaung', 'scg', 1, 1),
			(11, 'Thingangyun', 'tgy', 1, 1),
			(12, 'Yankin', 'ykn', 1, 1),
			(13, 'Tamwe', 'tmw', 1, 1),
			(14, 'Mingaladon', 'mgd', 1, 1),
			(15, 'North Okkalapa', 'nok', 1, 1),
			(16, 'South Okkalapa', 'sok', 1, 1),
			(17, 'Mayangon', 'myg', 1, 1),
			(18, 'Dawbon', 'dbn', 1, 1),
			(19, 'Botataung', 'btt', 1, 1),
			(20, 'Pazundaung', 'pzd', 1, 1),
			-- Mandalay Region (2) Cities
			(21, 'Amarapura', 'amr', 2, 1),
			(22, 'Mandalay', 'mdy', 2, 1),
			(23, 'Pyin Oo Lwin', 'pol', 2, 1),
			(24, 'Meiktila', 'mkt', 2, 1),
			(25, 'Myingyan', 'myy', 2, 1),
			(26, 'Monywa', 'mny', 2, 1),
			(28, 'Yamethin', 'ymt', 2, 1),
			(29, 'Kyaukse', 'kks', 2, 1),
			(30, 'Nyaung-U', 'nyu', 2, 1),
			-- Naypyidaw Union Territory (3) Cities
			(31, 'DetKhiNaThiRi', 'dkn', 3, 1),
			(32, 'Ottara Thiri', 'ott', 3, 1),
			(33, 'Pobbathiri', 'pbt', 3, 1),
			(34, 'Zabuthiri', 'zbt', 3, 1),
			(35, 'Zeyar Thiri', 'zyt', 3, 1),
			-- Ayeyarwady Region (4) Cities
			(36, 'Pathein', 'ptn', 4, 1),
			(37, 'Hinthada', 'hth', 4, 1),
			(38, 'Maubin', 'mbn', 4, 1),
			(39, 'Myaungmya', 'mym', 4, 1),
			(40, 'Pyapon', 'pyp', 4, 1),
			-- Bago Region (5) Cities
			(41, 'Bago', 'bgo', 5, 1),
			(42, 'Taungoo', 'tgo', 5, 1),
			(43, 'Pyay', 'pyy', 5, 1),
			(44, 'Tharrawaddy', 'trw', 5, 1),
			(45, 'Nattalin', 'ntl', 5, 1),
			-- Magway Region (6) Cities
			(46, 'Magway', 'mgw', 6, 1),
			(47, 'Pakokku', 'pkk', 6, 1),
			(48, 'Yenangyaung', 'yny', 6, 1),
			(49, 'Chauk', 'chk', 6, 1),
			(50, 'Minbu', 'mnb', 6, 1),
			-- Sagaing Region (7) Cities
			(51, 'Sagaing', 'sgg', 7, 1),
			(52, 'Shwebo', 'swb', 7, 1),
			(53, 'Shwebo', 'swb', 7, 1),
			(54, 'Katha', 'kth', 7, 1),
			(55, 'Kale', 'kle', 7, 1),
			-- Tanintharyi Region (8) Cities
			(56, 'Dawei', 'dwi', 8, 1),
			(57, 'Myeik', 'myk', 8, 1),
			(58, 'Kawthaung', 'kwt', 8, 1),
			(59, 'Thayetchaung', 'tyc', 8, 1),
			(60, 'Yebyu', 'yby', 8, 1),
			-- Kachin State (9) Cities
			(61, 'Myitkyina', 'mtk', 9, 1),
			(62, 'Bhamo', 'bhm', 9, 1),
			(63, 'Putao', 'pto', 9, 1),
			(64, 'Mogaung', 'mgg', 9, 1),
			(65, 'Mohnyin', 'mhn', 9, 1),
			-- Kayah State (10) Cities
			(66, 'Loikaw', 'lkw', 10, 1),
			(67, 'Demoso', 'dms', 10, 1),
			(68, 'Hpruso', 'hrs', 10, 1),
			(69, 'Shadaw', 'shd', 10, 1),
			(70, 'Bawlakhe', 'bwk', 10, 1),
			-- Kayin State (11) Cities
			(71, 'Hpa-an', 'hpn', 11, 1),
			(72, 'Myawaddy', 'mwd', 11, 1),
			(73, 'Kawkareik', 'kwk', 11, 1),
			(74, 'Thandaung', 'tdg', 11, 1),
			(75, 'Hlaingbwe', 'hlb', 11, 1),
			-- Chin State (12) Cities
			(76, 'Hakha', 'hkh', 12, 1),
			(77, 'Falam', 'flm', 12, 1),
			(78, 'Mindat', 'mdt', 12, 1),
			(79, 'Matupi', 'mtp', 12, 1),
			(80, 'Paletwa', 'plw', 12, 1),
			-- Mon State (13) Cities
			(81, 'Mawlamyine', 'mwm', 13, 1),
			(82, 'Thaton', 'tht', 13, 1),
			(83, 'Kyaikto', 'kyt', 13, 1),
			(84, 'Paung', 'png', 13, 1),
			(85, 'Chaungzon', 'chz', 13, 1),
			-- Rakhine State (14) Cities
			(86, 'Sittwe', 'stw', 14, 1),
			(87, 'Kyaukpyu', 'kyp', 14, 1),
			(88, 'Thandwe', 'tdw', 14, 1),
			(89, 'Mrauk U', 'mru', 14, 1),
			(90, 'Maungdaw', 'mgd', 14, 1),
			-- Shan State (15) Cities
			(91, 'Taunggyi', 'tgy', 15, 1),
			(92, 'Lashio', 'lsh', 15, 1),
			(93, 'Kengtung', 'kgt', 15, 1),
			(94, 'Tachileik', 'tcl', 15, 1),
			(95, 'Muse', 'mse', 15, 1),
			(96, 'Hsipaw', 'hsp', 15, 1),
			(97, 'Nyaungshwe', 'nys', 15, 1),
			(98, 'Kalaw', 'klw', 15, 1),
			(99, 'Pindaya', 'pdy', 15, 1),
			(100, 'Mong Hsat', 'mhs', 15, 1),
			-- Thailand - Bangkok (16) Districts
			(101, 'Sukhumvit', 'skv', 16, 1),
			(102, 'Silom', 'slm', 16, 1),
			(103, 'Siam', 'siam', 16, 1),
			(104, 'Chatuchak', 'ctc', 16, 1),
			(105, 'Ratchada', 'rcd', 16, 1),
			-- Thailand - Chiang Mai (17) Cities
			(106, 'Chiang Mai City', 'cmc', 17, 1),
			(107, 'Mae Rim', 'mrm', 17, 1),
			(108, 'Hang Dong', 'hdg', 17, 1),
			(109, 'San Kamphaeng', 'skp', 17, 1),
			(110, 'Doi Saket', 'dsk', 17, 1),
			-- Thailand - Phuket (18) Areas
			(111, 'Patong', 'ptg', 18, 1),
			(112, 'Kata', 'kta', 18, 1),
			(113, 'Karon', 'krn', 18, 1),
			(114, 'Rawai', 'rwi', 18, 1),
			(115, 'Phuket Town', 'pkt', 18, 1),
			-- Thailand - Pattaya (19) Areas
			(116, 'Pattaya Beach', 'ptb', 19, 1),
			(117, 'Jomtien', 'jmt', 19, 1),
			(118, 'Naklua', 'nkl', 19, 1),
			(119, 'Banglamung', 'blm', 19, 1),
			(120, 'Sattahip', 'sth', 19, 1),
			-- Thailand - Krabi (20) Areas
			(121, 'Ao Nang', 'aok', 20, 1),
			(122, 'Railay', 'rly', 20, 1),
			(123, 'Krabi Town', 'kbt', 20, 1),
			(124, 'Tonsai', 'tsi', 20, 1),
			(125, 'Phi Phi', 'phi', 20, 1),
			-- Singapore - Central Region (21) Areas
			(126, 'Orchard', 'orch', 21, 1),
			(127, 'Marina Bay', 'mrb', 21, 1),
			(128, 'Raffles Place', 'rfp', 21, 1),
			(129, 'Clarke Quay', 'clq', 21, 1),
			(130, 'Sentosa', 'snt', 21, 1),
			-- Singapore - East Region (22) Areas
			(131, 'Tampines', 'tmp', 22, 1),
			(132, 'Bedok', 'bdk', 22, 1),
			(133, 'Pasir Ris', 'psr', 22, 1),
			(134, 'Changi', 'chg', 22, 1),
			(135, 'Simei', 'sme', 22, 1),
			-- Singapore - North Region (23) Areas
			(136, 'Woodlands', 'wdl', 23, 1),
			(137, 'Yishun', 'ysn', 23, 1),
			(138, 'Sembawang', 'sbw', 23, 1),
			(139, 'Admiralty', 'adm', 23, 1),
			(140, 'Kranji', 'krj', 23, 1),
			-- Singapore - North-East Region (24) Areas
			(141, 'Ang Mo Kio', 'amk', 24, 1),
			(142, 'Serangoon', 'srg', 24, 1),
			(143, 'Punggol', 'pgl', 24, 1),
			(144, 'Sengkang', 'skg', 24, 1),
			(145, 'Hougang', 'hgg', 24, 1),
			-- Singapore - West Region (25) Areas
			(146, 'Jurong', 'jrg', 25, 1),
			(147, 'Clementi', 'clm', 25, 1),
			(148, 'Bukit Timah', 'bkt', 25, 1),
			(149, 'Choa Chu Kang', 'cck', 25, 1),
			(150, 'Boon Lay', 'bnl', 25, 1),
			-- Malaysia - Kuala Lumpur (26) Areas
			(151, 'Bukit Bintang', 'bkb', 26, 1),
			(152, 'KLCC', 'klcc', 26, 1),
			(153, 'Bangsar', 'bgs', 26, 1),
			(154, 'Mont Kiara', 'mkt', 26, 1),
			(155, 'Ampang', 'amp', 26, 1),
			-- Malaysia - Selangor (27) Cities
			(156, 'Petaling Jaya', 'ptj', 27, 1),
			(157, 'Shah Alam', 'sha', 27, 1),
			(158, 'Subang Jaya', 'sbj', 27, 1),
			(159, 'Klang', 'klg', 27, 1),
			(160, 'Cyberjaya', 'cyb', 27, 1),
			-- Malaysia - Penang (28) Areas
			(161, 'George Town', 'gtn', 28, 1),
			(162, 'Bayan Lepas', 'byl', 28, 1),
			(163, 'Tanjung Bungah', 'tjb', 28, 1),
			(164, 'Gurney', 'gny', 28, 1),
			(165, 'Batu Ferringhi', 'btf', 28, 1),
			-- Malaysia - Johor (29) Cities
			(166, 'Johor Bahru', 'jhb', 29, 1),
			(167, 'Iskandar Puteri', 'isp', 29, 1),
			(168, 'Pasir Gudang', 'psg', 29, 1),
			(169, 'Kulai', 'kli', 29, 1),
			(170, 'Batu Pahat', 'btp', 29, 1),
			-- Malaysia - Sabah (30) Cities
			(171, 'Kota Kinabalu', 'ktk', 30, 1),
			(172, 'Sandakan', 'sdk', 30, 1),
			(173, 'Tawau', 'taw', 30, 1),
			(174, 'Lahad Datu', 'lhd', 30, 1),
			(175, 'Keningau', 'kng', 30, 1),
			-- Indonesia - Jakarta (31) Areas
			(176, 'Central Jakarta', 'cjk', 31, 1),
			(177, 'South Jakarta', 'sjk', 31, 1),
			(178, 'North Jakarta', 'njk', 31, 1),
			(179, 'West Jakarta', 'wjk', 31, 1),
			(180, 'East Jakarta', 'ejk', 31, 1),
			-- Indonesia - Bali (32) Areas
			(181, 'Denpasar', 'dps', 32, 1),
			(182, 'Kuta', 'kta', 32, 1),
			(183, 'Ubud', 'ubd', 32, 1),
			(184, 'Seminyak', 'smy', 32, 1),
			(185, 'Sanur', 'snr', 32, 1),
			-- Indonesia - West Java (33) Cities
			(186, 'Bandung', 'bdg', 33, 1),
			(187, 'Bogor', 'bgr', 33, 1),
			(188, 'Bekasi', 'bks', 33, 1),
			(189, 'Depok', 'dpk', 33, 1),
			(190, 'Tangerang', 'tgr', 33, 1),
			-- Indonesia - East Java (34) Cities
			(191, 'Surabaya', 'sby', 34, 1),
			(192, 'Malang', 'mlg', 34, 1),
			(193, 'Sidoarjo', 'sdr', 34, 1),
			(194, 'Gresik', 'grs', 34, 1),
			(195, 'Kediri', 'kdr', 34, 1),
			-- Indonesia - Central Java (35) Cities
			(196, 'Semarang', 'smg', 35, 1),
			(197, 'Yogyakarta', 'ygy', 35, 1),
			(198, 'Solo', 'slo', 35, 1),
			(199, 'Magelang', 'mgl', 35, 1),
			(200, 'Salatiga', 'slg', 35, 1),
			-- India - Andhra Pradesh (36) Cities
			(201, 'Visakhapatnam', 'vsk', 36, 1),
			(202, 'Vijayawada', 'vjw', 36, 1),
			(203, 'Guntur', 'gnt', 36, 1),
			(204, 'Nellore', 'nlr', 36, 1),
			(205, 'Tirupati', 'tpt', 36, 1),
			(206, 'Kurnool', 'krl', 36, 1),
			(207, 'Rajahmundry', 'rjm', 36, 1),
			(208, 'Kakinada', 'kkd', 36, 1),
			(209, 'Kadapa', 'kdp', 36, 1),
			(210, 'Anantapur', 'ant', 36, 1),
			-- India - Arunachal Pradesh (37) Cities
			(211, 'Itanagar', 'itg', 37, 1),
			(212, 'Naharlagun', 'nhl', 37, 1),
			(213, 'Pasighat', 'psg', 37, 1),
			(214, 'Tawang', 'twg', 37, 1),
			(215, 'Ziro', 'zro', 37, 1),
			-- India - Assam (38) Cities
			(216, 'Guwahati', 'gwt', 38, 1),
			(217, 'Silchar', 'slc', 38, 1),
			(218, 'Dibrugarh', 'dbr', 38, 1),
			(219, 'Jorhat', 'jht', 38, 1),
			(220, 'Nagaon', 'ngn', 38, 1),
			(221, 'Tinsukia', 'tsk', 38, 1),
			(222, 'Tezpur', 'tzp', 38, 1),
			(223, 'Barpeta', 'brp', 38, 1),
			(224, 'Sivasagar', 'svg', 38, 1),
			(225, 'Goalpara', 'glp', 38, 1),
			-- India - Bihar (39) Cities
			(226, 'Patna', 'ptn', 39, 1),
			(227, 'Gaya', 'gya', 39, 1),
			(228, 'Bhagalpur', 'bgp', 39, 1),
			(229, 'Muzaffarpur', 'mzp', 39, 1),
			(230, 'Purnia', 'prn', 39, 1),
			(231, 'Darbhanga', 'dbg', 39, 1),
			(232, 'Bihar Sharif', 'bhs', 39, 1),
			(233, 'Arrah', 'arr', 39, 1),
			(234, 'Begusarai', 'bgs', 39, 1),
			(235, 'Katihar', 'kth', 39, 1),
			-- India - Chhattisgarh (40) Cities
			(236, 'Raipur', 'rpr', 40, 1),
			(237, 'Bhilai', 'bhl', 40, 1),
			(238, 'Bilaspur', 'bls', 40, 1),
			(239, 'Korba', 'krb', 40, 1),
			(240, 'Durg', 'drg', 40, 1),
			(241, 'Raigarh', 'rgh', 40, 1),
			(242, 'Jagdalpur', 'jdp', 40, 1),
			(243, 'Ambikapur', 'abk', 40, 1),
			(244, 'Rajnandgaon', 'rjn', 40, 1),
			(245, 'Dhamtari', 'dmt', 40, 1),
			-- India - Goa (41) Cities
			(246, 'Panaji', 'pnj', 41, 1),
			(247, 'Vasco da Gama', 'vsc', 41, 1),
			(248, 'Margao', 'mrg', 41, 1),
			(249, 'Mapusa', 'mps', 41, 1),
			(250, 'Ponda', 'pnd', 41, 1),
			-- India - Gujarat (42) Cities
			(251, 'Ahmedabad', 'ahd', 42, 1),
			(252, 'Surat', 'srt', 42, 1),
			(253, 'Vadodara', 'vdr', 42, 1),
			(254, 'Rajkot', 'rjt', 42, 1),
			(255, 'Bhavnagar', 'bvg', 42, 1),
			(256, 'Jamnagar', 'jmg', 42, 1),
			(257, 'Gandhinagar', 'gdn', 42, 1),
			(258, 'Anand', 'and', 42, 1),
			(259, 'Bharuch', 'brc', 42, 1),
			(260, 'Junagadh', 'jng', 42, 1),
			-- India - Haryana (43) Cities
			(261, 'Gurgaon', 'grg', 43, 1),
			(262, 'Faridabad', 'frd', 43, 1),
			(263, 'Panipat', 'pnp', 43, 1),
			(264, 'Ambala', 'amb', 43, 1),
			(265, 'Yamunanagar', 'ymn', 43, 1),
			(266, 'Rohtak', 'rht', 43, 1),
			(267, 'Hisar', 'hsr', 43, 1),
			(268, 'Karnal', 'krl', 43, 1),
			(269, 'Sonipat', 'snp', 43, 1),
			(270, 'Panchkula', 'pck', 43, 1),
			-- India - Himachal Pradesh (44) Cities
			(271, 'Shimla', 'shm', 44, 1),
			(272, 'Dharamshala', 'drm', 44, 1),
			(273, 'Manali', 'mnl', 44, 1),
			(274, 'Solan', 'sln', 44, 1),
			(275, 'Kullu', 'kll', 44, 1),
			(276, 'Mandi', 'mnd', 44, 1),
			(277, 'Palampur', 'plp', 44, 1),
			(278, 'Bilaspur', 'bls', 44, 1),
			(279, 'Chamba', 'chb', 44, 1),
			(280, 'Kangra', 'kgr', 44, 1),
			-- India - Jharkhand (45) Cities
			(281, 'Ranchi', 'rnc', 45, 1),
			(282, 'Jamshedpur', 'jsh', 45, 1),
			(283, 'Dhanbad', 'dnb', 45, 1),
			(284, 'Bokaro', 'bkr', 45, 1),
			(285, 'Hazaribagh', 'hzb', 45, 1),
			(286, 'Deoghar', 'dgh', 45, 1),
			(287, 'Giridih', 'grd', 45, 1),
			(288, 'Ramgarh', 'rmg', 45, 1),
			(289, 'Medininagar', 'mdn', 45, 1),
			(290, 'Chaibasa', 'chs', 45, 1),
			-- India - Karnataka (46) Cities
			(291, 'Bangalore', 'blr', 46, 1),
			(292, 'Mysore', 'mys', 46, 1),
			(293, 'Hubli', 'hbl', 46, 1),
			(294, 'Mangalore', 'mgl', 46, 1),
			(295, 'Belagavi', 'blg', 46, 1),
			(296, 'Gulbarga', 'glb', 46, 1),
			(297, 'Davangere', 'dvg', 46, 1),
			(298, 'Shimoga', 'shg', 46, 1),
			(299, 'Bijapur', 'bjp', 46, 1),
			(300, 'Raichur', 'rch', 46, 1),
			-- India - Kerala (47) Cities
			(301, 'Kochi', 'kch', 47, 1),
			(302, 'Thiruvananthapuram', 'tvm', 47, 1),
			(303, 'Kozhikode', 'kzk', 47, 1),
			(304, 'Thrissur', 'tsr', 47, 1),
			(305, 'Kannur', 'knr', 47, 1),
			(306, 'Kollam', 'klm', 47, 1),
			(307, 'Alappuzha', 'alp', 47, 1),
			(308, 'Palakkad', 'pld', 47, 1),
			(309, 'Malappuram', 'mlp', 47, 1),
			(310, 'Kottayam', 'ktm', 47, 1),
			-- India - Madhya Pradesh (48) Cities
			(311, 'Bhopal', 'bpl', 48, 1),
			(312, 'Indore', 'ind', 48, 1),
			(313, 'Gwalior', 'gwl', 48, 1),
			(314, 'Jabalpur', 'jbp', 48, 1),
			(315, 'Ujjain', 'ujn', 48, 1),
			(316, 'Sagar', 'sgr', 48, 1),
			(317, 'Ratlam', 'rtm', 48, 1),
			(318, 'Satna', 'stn', 48, 1),
			(319, 'Rewa', 'rwa', 48, 1),
			(320, 'Burhanpur', 'bhp', 48, 1),
			-- India - Maharashtra (49) Cities
			(321, 'Mumbai', 'mum', 49, 1),
			(322, 'Pune', 'pne', 49, 1),
			(323, 'Nagpur', 'ngp', 49, 1),
			(324, 'Thane', 'thn', 49, 1),
			(325, 'Nashik', 'nsk', 49, 1),
			(326, 'Aurangabad', 'arb', 49, 1),
			(327, 'Solapur', 'slp', 49, 1),
			(328, 'Amravati', 'amt', 49, 1),
			(329, 'Kolhapur', 'klp', 49, 1),
			(330, 'Sangli', 'sgl', 49, 1),
			-- India - Manipur (50) Cities
			(331, 'Imphal', 'imh', 50, 1),
			(332, 'Thoubal', 'thb', 50, 1),
			(333, 'Bishnupur', 'bsn', 50, 1),
			(334, 'Churachandpur', 'chc', 50, 1),
			(335, 'Ukhrul', 'ukr', 50, 1),
			-- India - Meghalaya (51) Cities
			(336, 'Shillong', 'shl', 51, 1),
			(337, 'Tura', 'tra', 51, 1),
			(338, 'Jowai', 'jwi', 51, 1),
			(339, 'Nongpoh', 'ngp', 51, 1),
			(340, 'Baghmara', 'bgm', 51, 1),
			-- India - Mizoram (52) Cities
			(341, 'Aizawl', 'azl', 52, 1),
			(342, 'Lunglei', 'lgl', 52, 1),
			(343, 'Saiha', 'sah', 52, 1),
			(344, 'Champhai', 'chp', 52, 1),
			(345, 'Kolasib', 'kls', 52, 1),
			-- India - Nagaland (53) Cities
			(346, 'Kohima', 'khm', 53, 1),
			(347, 'Dimapur', 'dmp', 53, 1),
			(348, 'Mokokchung', 'mkc', 53, 1),
			(349, 'Tuensang', 'tns', 53, 1),
			(350, 'Wokha', 'wkh', 53, 1),
			-- India - Odisha (54) Cities
			(351, 'Bhubaneswar', 'bbs', 54, 1),
			(352, 'Cuttack', 'ctk', 54, 1),
			(353, 'Rourkela', 'rkl', 54, 1),
			(354, 'Berhampur', 'brm', 54, 1),
			(355, 'Sambalpur', 'sbl', 54, 1),
			(356, 'Puri', 'pri', 54, 1),
			(357, 'Balasore', 'bls', 54, 1),
			(358, 'Bhadrak', 'bdr', 54, 1),
			(359, 'Baripada', 'brp', 54, 1),
			(360, 'Jharsuguda', 'jsg', 54, 1),
			-- India - Punjab (55) Cities
			(361, 'Ludhiana', 'ldh', 55, 1),
			(362, 'Amritsar', 'amt', 55, 1),
			(363, 'Jalandhar', 'jld', 55, 1),
			(364, 'Patiala', 'ptl', 55, 1),
			(365, 'Bathinda', 'btd', 55, 1),
			(366, 'Pathankot', 'ptk', 55, 1),
			(367, 'Hoshiarpur', 'hsp', 55, 1),
			(368, 'Moga', 'mga', 55, 1),
			(369, 'Firozpur', 'frz', 55, 1),
			(370, 'Sangrur', 'sgr', 55, 1),
			-- India - Rajasthan (56) Cities
			(371, 'Jaipur', 'jpr', 56, 1),
			(372, 'Jodhpur', 'jdp', 56, 1),
			(373, 'Kota', 'kta', 56, 1),
			(374, 'Bikaner', 'bkn', 56, 1),
			(375, 'Ajmer', 'ajm', 56, 1),
			(376, 'Udaipur', 'udp', 56, 1),
			(377, 'Bhilwara', 'bhl', 56, 1),
			(378, 'Alwar', 'alw', 56, 1),
			(379, 'Bharatpur', 'bht', 56, 1),
			(380, 'Sikar', 'skr', 56, 1),
			-- India - Sikkim (57) Cities
			(381, 'Gangtok', 'gtk', 57, 1),
			(382, 'Namchi', 'nmc', 57, 1),
			(383, 'Mangan', 'mgn', 57, 1),
			(384, 'Gyalshing', 'gyl', 57, 1),
			(385, 'Singtam', 'sgt', 57, 1),
			-- India - Tamil Nadu (58) Cities
			(386, 'Chennai', 'chn', 58, 1),
			(387, 'Coimbatore', 'cbt', 58, 1),
			(388, 'Madurai', 'mdr', 58, 1),
			(389, 'Tiruchirappalli', 'tcp', 58, 1),
			(390, 'Salem', 'slm', 58, 1),
			(391, 'Tirunelveli', 'tnl', 58, 1),
			(392, 'Erode', 'erd', 58, 1),
			(393, 'Vellore', 'vlr', 58, 1),
			(394, 'Thanjavur', 'tjv', 58, 1),
			(395, 'Dindigul', 'dgl', 58, 1),
			-- India - Telangana (59) Cities
			(396, 'Hyderabad', 'hyd', 59, 1),
			(397, 'Warangal', 'wrg', 59, 1),
			(398, 'Nizamabad', 'nzb', 59, 1),
			(399, 'Karimnagar', 'krm', 59, 1),
			(400, 'Khammam', 'khm', 59, 1),
			(401, 'Ramagundam', 'rmg', 59, 1),
			(402, 'Mahabubnagar', 'mbn', 59, 1),
			(403, 'Nalgonda', 'nlg', 59, 1),
			(404, 'Adilabad', 'adb', 59, 1),
			(405, 'Suryapet', 'srp', 59, 1),
			-- India - Tripura (60) Cities
			(406, 'Agartala', 'agt', 60, 1),
			(407, 'Udaipur', 'udp', 60, 1),
			(408, 'Dharmanagar', 'drm', 60, 1),
			(409, 'Kailasahar', 'kls', 60, 1),
			(410, 'Belonia', 'bln', 60, 1),
			-- India - Uttar Pradesh (61) Cities
			(411, 'Lucknow', 'lkw', 61, 1),
			(412, 'Kanpur', 'knp', 61, 1),
			(413, 'Agra', 'agr', 61, 1),
			(414, 'Varanasi', 'vns', 61, 1),
			(415, 'Allahabad', 'alb', 61, 1),
			(416, 'Meerut', 'mrt', 61, 1),
			(417, 'Ghaziabad', 'gzb', 61, 1),
			(418, 'Noida', 'nod', 61, 1),
			(419, 'Bareilly', 'brl', 61, 1),
			(420, 'Aligarh', 'alg', 61, 1),
			-- India - Uttarakhand (62) Cities
			(421, 'Dehradun', 'drd', 62, 1),
			(422, 'Haridwar', 'hrd', 62, 1),
			(423, 'Roorkee', 'rke', 62, 1),
			(424, 'Haldwani', 'hdw', 62, 1),
			(425, 'Rudrapur', 'rdp', 62, 1),
			(426, 'Kashipur', 'ksp', 62, 1),
			(427, 'Rishikesh', 'rsh', 62, 1),
			(428, 'Nainital', 'ntl', 62, 1),
			(429, 'Mussoorie', 'mss', 62, 1),
			(430, 'Almora', 'alm', 62, 1),
			-- India - West Bengal (63) Cities
			(431, 'Kolkata', 'kol', 63, 1),
			(432, 'Howrah', 'hwr', 63, 1),
			(433, 'Durgapur', 'drg', 63, 1),
			(434, 'Asansol', 'asn', 63, 1),
			(435, 'Siliguri', 'slg', 63, 1),
			(436, 'Kharagpur', 'khg', 63, 1),
			(437, 'Bardhaman', 'brd', 63, 1),
			(438, 'Malda', 'mld', 63, 1),
			(439, 'Jalpaiguri', 'jlp', 63, 1),
			(440, 'Krishnanagar', 'krn', 63, 1),
			-- India - Delhi (64) Areas
			(441, 'New Delhi', 'ndl', 64, 1),
			(442, 'Central Delhi', 'cdl', 64, 1),
			(443, 'North Delhi', 'ndl', 64, 1),
			(444, 'South Delhi', 'sdl', 64, 1),
			(445, 'East Delhi', 'edl', 64, 1),
			(446, 'West Delhi', 'wdl', 64, 1),
			(447, 'Dwarka', 'dwk', 64, 1),
			(448, 'Rohini', 'rhn', 64, 1),
			(449, 'Pitampura', 'ptm', 64, 1),
			(450, 'Laxmi Nagar', 'lxn', 64, 1),
			-- India - Jammu and Kashmir (65) Cities
			(451, 'Srinagar', 'srg', 65, 1),
			(452, 'Jammu', 'jmu', 65, 1),
			(453, 'Anantnag', 'ant', 65, 1),
			(454, 'Baramulla', 'brm', 65, 1),
			(455, 'Sopore', 'spr', 65, 1),
			(456, 'Udhampur', 'udh', 65, 1),
			(457, 'Kathua', 'kth', 65, 1),
			(458, 'Rajouri', 'rjr', 65, 1),
			(459, 'Poonch', 'pnc', 65, 1),
			(460, 'Kupwara', 'kpw', 65, 1),
			-- India - Ladakh (66) Cities
			(461, 'Leh', 'leh', 66, 1),
			(462, 'Kargil', 'krg', 66, 1),
			(463, 'Nubra', 'nbr', 66, 1),
			(464, 'Zanskar', 'znk', 66, 1),
			(465, 'Drass', 'drs', 66, 1),
			-- India - Puducherry (67) Cities
			(466, 'Puducherry', 'pdy', 67, 1),
			(467, 'Karaikal', 'krk', 67, 1),
			(468, 'Mahe', 'mhe', 67, 1),
			(469, 'Yanam', 'ynm', 67, 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: city');

	// 5. Genders
	await db.execute(sql`
		INSERT INTO gender (id, name, status_id)
		VALUES 
			(1, 'Male', 1),
			(2, 'Female', 1),
			(3, 'Other', 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: gender');

	// 6. Identity Types
	await db.execute(sql`
		INSERT INTO identity_type (id, name)
		VALUES 
			(1, 'NRC'),
			(2, 'Passport'),
			(3, 'Driving License')
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: identity_type');

	// 7. Marital / marital Status
	await db.execute(sql`
		INSERT INTO marital_status (id, name)
		VALUES 
			(1, 'Single'),
			(2, 'Married'),
			(3, 'Divorced'),
			(4, 'Widowed')
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: marital_status');

	// 10. Craft Groups
	await db.execute(sql`
		INSERT INTO craft_group (id, name, status_id)
		VALUES
			(1, 'GP', 1),
			(2, 'Admin', 1),
			(3, 'Aesthetic Clinic', 1),
			(4, 'Anaesthesia', 1),
			(5, 'Anaesthesiology', 1),
			(6, 'Behavior Science', 1),
			(7, 'Behavioural Health Sciences', 1),
			(8, 'Cardio', 1),
			(9, 'Dental', 1),
			(10, 'Emergency', 1),
			(11, 'Endoscopy', 1),
			(12, 'ENT', 1),
			(13, 'Gastroenterologist', 1),
			(14, 'General Surgery', 1),
			(15, 'Haemodialysis Center', 1),
			(16, 'Hepatology', 1),
			(17, 'Information Technology', 1),
			(18, 'Internal Medicine', 1),
			(19, 'Laboratory', 1),
			(20, 'Maxilofacial Clinic', 1),
			(21, 'Medical Record', 1),
			(22, 'Nephrology', 1),
			(23, 'Neuro-Science', 1),
			(24, 'Neurosurgery', 1),
			(25, 'Obstetrics & Gynaecology', 1),
			(26, 'Oncology', 1),
			(27, 'Opthalmology', 1),
			(28, 'Orthopaedics', 1),
			(29, 'Paediatrics', 1),
			(30, 'Paediatrics Cardiology', 1),
			(31, 'Pathology & Microbiology', 1),
			(32, 'Physical Therapy and Rehabilitation', 1),
			(33, 'Plastic Sugery', 1),
			(34, 'Plastic, Reconstructive and Asthetic Surgery', 1),
			(35, 'Pulmonology', 1),
			(36, 'Radiology', 1),
			(37, 'Rehabilitation Medicine', 1),
			(38, 'Speech Language Pathology', 1),
			(39, 'Urology', 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: craft_group');

	// 8. Specializations (for doctors / staff) – each linked to craft_group_id
	await db.execute(sql`
		INSERT INTO specialization (id, name, craft_group_id, status_id)
		VALUES 
			(1, 'GP', 1, 1),
			(2, 'Aesthetic and Dermatology', 3, 1),
			(3, 'Anaesthesiology', 4, 1),
			(4, 'Psychology', 6, 1),
			(5, 'Aesthetic and Dermatology', 6, 1),
			(6, 'Nutritional Medicine', 6, 1),
			(7, 'Rehabilitation Medicine', 6, 1),
			(8, 'Counselling Services', 6, 1),
			(9, 'Cardiac Surgery', 8, 1),
			(10, 'Cardiology', 8, 1),
			(11, 'Vascular', 8, 1),
			(12, 'Dental', 9, 1),
			(13, 'Endocrinology', 12, 1),
			(14, 'ENT', 12, 1),
			(15, 'Gastroenterologic Surgery', 13, 1),
			(16, 'Gastroenterologist', 13, 1),
			(17, 'General Surgery', 14, 1),
			(18, 'Cardiac Surgery', 14, 1),
			(19, 'Paediatrics Surgery', 14, 1),
			(20, 'Breast Surgery', 14, 1),
			(21, 'Aesthetic and Dermatology', 14, 1),
			(22, 'Hand Surgery', 14, 1),
			(23, 'Plastic and Maxillofacial Surgery', 14, 1),
			(24, 'HEPATOBILIARY & PANCREATIC SURGERY', 14, 1),
			(25, 'Haematology', 15, 1),
			(26, 'HEPATOBILIARY & PANCREATIC SURGERY', 16, 1),
			(27, 'Hepatology', 16, 1),
			(28, 'Internal Medicine', 18, 1),
			(29, 'Rheumatology', 18, 1),
			(30, 'Endocrinology', 18, 1),
			(31, 'Pulmonology', 18, 1),
			(32, 'Haematology', 18, 1),
			(33, 'Chest', 18, 1),
			(34, 'Gastroenterologist', 18, 1),
			(35, 'Aesthetic and Dermatology', 18, 1),
			(36, 'Neurology', 18, 1),
			(37, 'Cardiology', 18, 1),
			(38, 'Obstetrics & Gynaecology', 18, 1),
			(39, 'Infectious Disease', 18, 1),
			(40, 'Maxillofacial', 20, 1),
			(41, 'Plastic and Maxillofacial Surgery', 20, 1),
			(42, 'Nephrology', 22, 1),
			(43, 'Neuro Surgery', 23, 1),
			(44, 'Neurology', 23, 1),
			(45, 'Neurology', 25, 1),
			(46, 'Medical Oncology', 26, 1),
			(47, 'Opthalmology', 27, 1),
			(48, 'Orthopaedics', 28, 1),
			(49, 'Paediatrics', 29, 1),
			(50, 'Paediatrics Surgery', 29, 1),
			(51, 'Paediatrics Cardiology', 30, 1),
			(52, 'Pathology', 31, 1),
			(53, 'Microbiology', 31, 1),
			(54, 'Aesthetic and Dermatology', 32, 1),
			(55, 'Plastic and Maxillofacial Surgery', 33, 1),
			(56, 'Aesthetic and Dermatology', 34, 1),
			(57, 'Plastic and Maxillofacial Surgery', 34, 1),
			(58, 'Maxillofacial', 34, 1),
			(59, 'Pulmonology', 35, 1),
			(60, 'Radiology', 36, 1),
			(61, 'Interventional Radiology', 36, 1),
			(62, 'Rehabilitation Medicine', 37, 1),
			(63, 'Speech Pathology', 38, 1),
			(64, 'Urology', 39, 1),
			(65, 'Neuro Surgery', 39, 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: specialization');

	// 9. Blood Types
	await db.execute(sql`
		INSERT INTO blood_type (id, name, status_id)
		VALUES 
			(1, 'A+', 1),
			(2, 'A-', 1),
			(3, 'B+', 1),
			(4, 'B-', 1),
			(5, 'AB+', 1),
			(6, 'AB-', 1),
			(7, 'O+', 1),
			(8, 'O-', 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: blood_type');

	// 10. Nationalities
	await db.execute(sql`
		INSERT INTO nationality (id, name, status_id)
		VALUES
			(1, 'Myanmar', 1),
			(2, 'Thailand', 1),
			(3, 'Singapore', 1),
			(4, 'Malaysia', 1),
			(5, 'Indonesia', 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: nationality');

	// 11. Staff Types (legacy category)
	await db.execute(sql`
		INSERT INTO staff_type (id, name, code, status_id)
		VALUES
			(1, 'Nurse', 'NURSE', 1),
			(2, 'Employee', 'EMPLOYEE', 1),
			(3, 'Doctor', 'DOCTOR', 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: staff_type');

	// 12. Staff Employment Types (formerly staff_type)
	await db.execute(sql`
		INSERT INTO staff_employment_type (id, name, code, status_id)
		VALUES
			(1, 'Full Time', 'FULL_TIME', 1),
			(2, 'Part Time', 'PART_TIME', 1),
			(3, 'Contract', 'CONTRACT', 1),
			(4, 'Locum', 'LOCUM', 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: staff_employment_type');

	// 13. Titles
	await db.execute(sql`
		INSERT INTO title (id, name, status_id)
		VALUES
			(1, 'Dr.', 1),
			(2, 'Mr', 1),
			(3, 'Mrs.', 1),
			(4, 'Ms.', 1),
			(5, 'Baby', 1),
			(6, 'Prof.', 1),
			(7, 'Asst. Prof.', 1),
			(8, 'Daw', 1),
			(9, 'Ko', 1),
			(10, 'Ma', 1),
			(11, 'Mg', 1),
			(12, 'U', 1),
			(13, 'Prof. Dr.', 1),
			(14, 'Asso. Prof', 1),
			(15, 'RN.', 1),
			(16, 'Prof. Col', 1),
			(17, 'MW', 1),
			(18, 'Rector Prof', 1)
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: title');

	// 14. Departments
	await db.execute(sql`
		INSERT INTO department (id, name, code, status_id)
		VALUES 
			(1, 'Emergency', 'em', 1),
			(2, 'Cardiology', 'card', 1),
			(3, 'Pediatrics', 'ped', 1)
		ON CONFLICT (id) DO NOTHING;
		`);
	seedLogger.info('Seeded: department');

	// 15. Postal Codes
	await db.execute(sql`
		INSERT INTO postal_code (id, value, city_id, status_id)
		VALUES 
			-- Yangon Region Cities
			(1, 11011, 1, 1),
			(2, 11401, 2, 1),
			(3, 11121, 3, 1),
			(4, 11201, 4, 1),
			(5, 11141, 5, 1),
			(6, 11041, 6, 1),
			(7, 11131, 7, 1),
			(8, 11131, 8, 1),
			(9, 11131, 9, 1),
			(10, 11141, 10, 1),
			(11, 11061, 11, 1),
			(12, 11061, 12, 1),
			(13, 11211, 13, 1),
			(14, 11021, 14, 1),
			(15, 11031, 15, 1),
			(16, 11031, 16, 1),
			(17, 11021, 17, 1),
			(18, 11221, 18, 1),
			(19, 11131, 19, 1),
			(20, 11131, 20, 1),
			-- Mandalay Region Cities
			(21, 05062, 21, 1),
			(22, 05011, 22, 1),
			(23, 05082, 23, 1),
			(24, 05031, 24, 1),
			(25, 05021, 25, 1),
			(26, 05041, 26, 1),
			-- Note: city id 27 is intentionally skipped in city table; reuse 26 here to satisfy FK
			(27, 05051, 26, 1),
			(28, 05061, 28, 1),
			(29, 05071, 29, 1),
			(30, 05011, 30, 1),
			-- Naypyidaw Union Territory Cities
			(31, 15011, 31, 1),
			(32, 15011, 32, 1),
			(33, 15011, 33, 1),
			(34, 15011, 34, 1),
			(35, 15011, 35, 1),
			-- Ayeyarwady Region Cities
			(36, 10041, 36, 1),
			(37, 10031, 37, 1),
			(38, 10021, 38, 1),
			(39, 10051, 39, 1),
			(40, 10011, 40, 1),
			-- Bago Region Cities
			(41, 10061, 41, 1),
			(42, 10071, 42, 1),
			(43, 10081, 43, 1),
			(44, 10091, 44, 1),
			(45, 10101, 45, 1),
			-- Magway Region Cities
			(46, 10111, 46, 1),
			(47, 10121, 47, 1),
			(48, 10131, 48, 1),
			(49, 10141, 49, 1),
			(50, 10151, 50, 1),
			-- Sagaing Region Cities
			(51, 10161, 51, 1),
			(52, 10171, 52, 1),
			(53, 10181, 53, 1),
			(54, 10191, 54, 1),
			(55, 10201, 55, 1),
			-- Tanintharyi Region Cities
			(56, 10211, 56, 1),
			(57, 10221, 57, 1),
			(58, 10231, 58, 1),
			(59, 10241, 59, 1),
			(60, 10251, 60, 1),
			-- Kachin State Cities
			(61, 10261, 61, 1),
			(62, 10271, 62, 1),
			(63, 10281, 63, 1),
			(64, 10291, 64, 1),
			(65, 10301, 65, 1),
			-- Kayah State Cities
			(66, 10311, 66, 1),
			(67, 10321, 67, 1),
			(68, 10331, 68, 1),
			(69, 10341, 69, 1),
			(70, 10351, 70, 1),
			-- Kayin State Cities
			(71, 10361, 71, 1),
			(72, 10371, 72, 1),
			(73, 10381, 73, 1),
			(74, 10391, 74, 1),
			(75, 10401, 75, 1),
			-- Chin State Cities
			(76, 10411, 76, 1),
			(77, 10421, 77, 1),
			(78, 10431, 78, 1),
			(79, 10441, 79, 1),
			(80, 10451, 80, 1),
			-- Mon State Cities
			(81, 10461, 81, 1),
			(82, 10471, 82, 1),
			(83, 10481, 83, 1),
			(84, 10491, 84, 1),
			(85, 10501, 85, 1),
			-- Rakhine State Cities
			(86, 10511, 86, 1),
			(87, 10521, 87, 1),
			(88, 10531, 88, 1),
			(89, 10541, 89, 1),
			(90, 10551, 90, 1),
			-- Shan State Cities
			(91, 10561, 91, 1),
			(92, 10571, 92, 1),
			(93, 10581, 93, 1),
			(94, 10591, 94, 1),
			(95, 10601, 95, 1),
			(96, 10611, 96, 1),
			(97, 10621, 97, 1),
			(98, 10631, 98, 1),
			(99, 10641, 99, 1),
			(100, 10651, 100, 1),
			-- Thailand - Bangkok Districts
			(101, 10110, 101, 1),
			(102, 10500, 102, 1),
			(103, 10330, 103, 1),
			(104, 10900, 104, 1),
			(105, 10400, 105, 1),
			-- Thailand - Chiang Mai Cities
			(106, 50000, 106, 1),
			(107, 50180, 107, 1),
			(108, 50230, 108, 1),
			(109, 50130, 109, 1),
			(110, 50220, 110, 1),
			-- Thailand - Phuket Areas
			(111, 83150, 111, 1),
			(112, 83100, 112, 1),
			(113, 83100, 113, 1),
			(114, 83130, 114, 1),
			(115, 83000, 115, 1),
			-- Thailand - Pattaya Areas
			(116, 20150, 116, 1),
			(117, 20260, 117, 1),
			(118, 20150, 118, 1),
			(119, 20150, 119, 1),
			(120, 20180, 120, 1),
			-- Thailand - Krabi Areas
			(121, 81000, 121, 1),
			(122, 81000, 122, 1),
			(123, 81000, 123, 1),
			(124, 81000, 124, 1),
			(125, 81000, 125, 1),
			-- Singapore - Central Region Areas
			(126, 238801, 126, 1),
			(127, 018956, 127, 1),
			(128, 048581, 128, 1),
			(129, 179024, 129, 1),
			(130, 099981, 130, 1),
			-- Singapore - East Region Areas
			(131, 529000, 131, 1),
			(132, 460000, 132, 1),
			(133, 518000, 133, 1),
			(134, 819642, 134, 1),
			(135, 529000, 135, 1),
			-- Singapore - North Region Areas
			(136, 738000, 136, 1),
			(137, 760000, 137, 1),
			(138, 758000, 138, 1),
			(139, 730000, 139, 1),
			(140, 739000, 140, 1),
			-- Singapore - North-East Region Areas
			(141, 560000, 141, 1),
			(142, 550000, 142, 1),
			(143, 828000, 143, 1),
			(144, 540000, 144, 1),
			(145, 530000, 145, 1),
			-- Singapore - West Region Areas
			(146, 609000, 146, 1),
			(147, 120000, 147, 1),
			(148, 588000, 148, 1),
			(149, 680000, 149, 1),
			(150, 640000, 150, 1),
			-- Malaysia - Kuala Lumpur Areas
			(151, 50050, 151, 1),
			(152, 50088, 152, 1),
			(153, 59000, 153, 1),
			(154, 50450, 154, 1),
			(155, 68000, 155, 1),
			-- Malaysia - Selangor Cities
			(156, 46000, 156, 1),
			(157, 40000, 157, 1),
			(158, 47500, 158, 1),
			(159, 41000, 159, 1),
			(160, 63000, 160, 1),
			-- Malaysia - Penang Areas
			(161, 10000, 161, 1),
			(162, 11900, 162, 1),
			(163, 11200, 163, 1),
			(164, 10250, 164, 1),
			(165, 11100, 165, 1),
			-- Malaysia - Johor Cities
			(166, 80000, 166, 1),
			(167, 79100, 167, 1),
			(168, 81700, 168, 1),
			(169, 81000, 169, 1),
			(170, 83000, 170, 1),
			-- Malaysia - Sabah Cities
			(171, 88000, 171, 1),
			(172, 90000, 172, 1),
			(173, 91000, 173, 1),
			(174, 91100, 174, 1),
			(175, 89000, 175, 1),
			-- Indonesia - Jakarta Areas
			(176, 10110, 176, 1),
			(177, 12110, 177, 1),
			(178, 14110, 178, 1),
			(179, 11110, 179, 1),
			(180, 13210, 180, 1),
			-- Indonesia - Bali Areas
			(181, 80000, 181, 1),
			(182, 80361, 182, 1),
			(183, 80571, 183, 1),
			(184, 80361, 184, 1),
			(185, 80228, 185, 1),
			-- Indonesia - West Java Cities
			(186, 40100, 186, 1),
			(187, 16100, 187, 1),
			(188, 17100, 188, 1),
			(189, 16400, 189, 1),
			(190, 15100, 190, 1),
			-- Indonesia - East Java Cities
			(191, 60100, 191, 1),
			(192, 65100, 192, 1),
			(193, 61200, 193, 1),
			(194, 61100, 194, 1),
			(195, 64100, 195, 1),
			-- Indonesia - Central Java Cities
			(196, 50100, 196, 1),
			(197, 55000, 197, 1),
			(198, 57100, 198, 1),
			(199, 56100, 199, 1),
			(200, 50700, 200, 1),
			-- India - Andhra Pradesh Cities
			(201, 530001, 201, 1),
			(202, 520001, 202, 1),
			(203, 522001, 203, 1),
			(204, 524001, 204, 1),
			(205, 517501, 205, 1),
			(206, 518001, 206, 1),
			(207, 533101, 207, 1),
			(208, 533001, 208, 1),
			(209, 516001, 209, 1),
			(210, 515001, 210, 1),
			-- India - Arunachal Pradesh Cities
			(211, 791111, 211, 1),
			(212, 791110, 212, 1),
			(213, 791102, 213, 1),
			(214, 790104, 214, 1),
			(215, 791120, 215, 1),
			-- India - Assam Cities
			(216, 781001, 216, 1),
			(217, 788001, 217, 1),
			(218, 786001, 218, 1),
			(219, 785001, 219, 1),
			(220, 782001, 220, 1),
			(221, 786125, 221, 1),
			(222, 784001, 222, 1),
			(223, 781301, 223, 1),
			(224, 785640, 224, 1),
			(225, 783120, 225, 1),
			-- India - Bihar Cities
			(226, 800001, 226, 1),
			(227, 823001, 227, 1),
			(228, 812001, 228, 1),
			(229, 842001, 229, 1),
			(230, 854301, 230, 1),
			(231, 846001, 231, 1),
			(232, 803101, 232, 1),
			(233, 802301, 233, 1),
			(234, 851101, 234, 1),
			(235, 854105, 235, 1),
			-- India - Chhattisgarh Cities
			(236, 492001, 236, 1),
			(237, 490001, 237, 1),
			(238, 495001, 238, 1),
			(239, 495677, 239, 1),
			(240, 491001, 240, 1),
			(241, 496001, 241, 1),
			(242, 494001, 242, 1),
			(243, 497001, 243, 1),
			(244, 491441, 244, 1),
			(245, 493770, 245, 1),
			-- India - Goa Cities
			(246, 403001, 246, 1),
			(247, 403802, 247, 1),
			(248, 403601, 248, 1),
			(249, 403507, 249, 1),
			(250, 403401, 250, 1),
			-- India - Gujarat Cities
			(251, 380001, 251, 1),
			(252, 395001, 252, 1),
			(253, 390001, 253, 1),
			(254, 360001, 254, 1),
			(255, 364001, 255, 1),
			(256, 361001, 256, 1),
			(257, 382010, 257, 1),
			(258, 388001, 258, 1),
			(259, 392001, 259, 1),
			(260, 362001, 260, 1),
			-- India - Haryana Cities
			(261, 122001, 261, 1),
			(262, 121001, 262, 1),
			(263, 132103, 263, 1),
			(264, 133001, 264, 1),
			(265, 135001, 265, 1),
			(266, 124001, 266, 1),
			(267, 125001, 267, 1),
			(268, 132001, 268, 1),
			(269, 131001, 269, 1),
			(270, 134109, 270, 1),
			-- India - Himachal Pradesh Cities
			(271, 171001, 271, 1),
			(272, 176215, 272, 1),
			(273, 175131, 273, 1),
			(274, 173212, 274, 1),
			(275, 175101, 275, 1),
			(276, 175001, 276, 1),
			(277, 176061, 277, 1),
			(278, 174001, 278, 1),
			(279, 176310, 279, 1),
			(280, 176001, 280, 1),
			-- India - Jharkhand Cities
			(281, 834001, 281, 1),
			(282, 831001, 282, 1),
			(283, 826001, 283, 1),
			(284, 827001, 284, 1),
			(285, 825301, 285, 1),
			(286, 814112, 286, 1),
			(287, 815301, 287, 1),
			(288, 829122, 288, 1),
			(289, 822101, 289, 1),
			(290, 833201, 290, 1),
			-- India - Karnataka Cities
			(291, 560001, 291, 1),
			(292, 570001, 292, 1),
			(293, 580020, 293, 1),
			(294, 575001, 294, 1),
			(295, 590001, 295, 1),
			(296, 585101, 296, 1),
			(297, 577001, 297, 1),
			(298, 577201, 298, 1),
			(299, 586101, 299, 1),
			(300, 584101, 300, 1),
			-- India - Kerala Cities
			(301, 682001, 301, 1),
			(302, 695001, 302, 1),
			(303, 673001, 303, 1),
			(304, 680001, 304, 1),
			(305, 670001, 305, 1),
			(306, 691001, 306, 1),
			(307, 688001, 307, 1),
			(308, 678001, 308, 1),
			(309, 676301, 309, 1),
			(310, 686001, 310, 1),
			-- India - Madhya Pradesh Cities
			(311, 462001, 311, 1),
			(312, 452001, 312, 1),
			(313, 474001, 313, 1),
			(314, 482001, 314, 1),
			(315, 456001, 315, 1),
			(316, 470001, 316, 1),
			(317, 457001, 317, 1),
			(318, 485001, 318, 1),
			(319, 486001, 319, 1),
			(320, 450331, 320, 1),
			-- India - Maharashtra Cities
			(321, 400001, 321, 1),
			(322, 411001, 322, 1),
			(323, 440001, 323, 1),
			(324, 400601, 324, 1),
			(325, 422001, 325, 1),
			(326, 431001, 326, 1),
			(327, 413001, 327, 1),
			(328, 444601, 328, 1),
			(329, 416001, 329, 1),
			(330, 416416, 330, 1),
			-- India - Manipur Cities
			(331, 795001, 331, 1),
			(332, 795138, 332, 1),
			(333, 795126, 333, 1),
			(334, 795128, 334, 1),
			(335, 795142, 335, 1),
			-- India - Meghalaya Cities
			(336, 793001, 336, 1),
			(337, 794001, 337, 1),
			(338, 793150, 338, 1),
			(339, 793103, 339, 1),
			(340, 794101, 340, 1),
			-- India - Mizoram Cities
			(341, 796001, 341, 1),
			(342, 796701, 342, 1),
			(343, 796901, 343, 1),
			(344, 796321, 344, 1),
			(345, 796081, 345, 1),
			-- India - Nagaland Cities
			(346, 797001, 346, 1),
			(347, 797112, 347, 1),
			(348, 798601, 348, 1),
			(349, 798612, 349, 1),
			(350, 797111, 350, 1),
			-- India - Odisha Cities
			(351, 751001, 351, 1),
			(352, 753001, 352, 1),
			(353, 769001, 353, 1),
			(354, 760001, 354, 1),
			(355, 768001, 355, 1),
			(356, 752001, 356, 1),
			(357, 756001, 357, 1),
			(358, 756100, 358, 1),
			(359, 757001, 359, 1),
			(360, 768201, 360, 1),
			-- India - Punjab Cities
			(361, 141001, 361, 1),
			(362, 143001, 362, 1),
			(363, 144001, 363, 1),
			(364, 147001, 364, 1),
			(365, 151001, 365, 1),
			(366, 145001, 366, 1),
			(367, 146001, 367, 1),
			(368, 142001, 368, 1),
			(369, 152001, 369, 1),
			(370, 148001, 370, 1),
			-- India - Rajasthan Cities
			(371, 302001, 371, 1),
			(372, 342001, 372, 1),
			(373, 324001, 373, 1),
			(374, 334001, 374, 1),
			(375, 305001, 375, 1),
			(376, 313001, 376, 1),
			(377, 311001, 377, 1),
			(378, 301001, 378, 1),
			(379, 321001, 379, 1),
			(380, 332001, 380, 1),
			-- India - Sikkim Cities
			(381, 737101, 381, 1),
			(382, 737126, 382, 1),
			(383, 737116, 383, 1),
			(384, 737111, 384, 1),
			(385, 737134, 385, 1),
			-- India - Tamil Nadu Cities
			(386, 600001, 386, 1),
			(387, 641001, 387, 1),
			(388, 625001, 388, 1),
			(389, 620001, 389, 1),
			(390, 636001, 390, 1),
			(391, 627001, 391, 1),
			(392, 638001, 392, 1),
			(393, 632001, 393, 1),
			(394, 613001, 394, 1),
			(395, 624001, 395, 1),
			-- India - Telangana Cities
			(396, 500001, 396, 1),
			(397, 506001, 397, 1),
			(398, 503001, 398, 1),
			(399, 505001, 399, 1),
			(400, 507001, 400, 1),
			(401, 505208, 401, 1),
			(402, 509001, 402, 1),
			(403, 508001, 403, 1),
			(404, 504001, 404, 1),
			(405, 508213, 405, 1),
			-- India - Tripura Cities
			(406, 799001, 406, 1),
			(407, 799114, 407, 1),
			(408, 799250, 408, 1),
			(409, 799277, 409, 1),
			(410, 799155, 410, 1),
			-- India - Uttar Pradesh Cities
			(411, 226001, 411, 1),
			(412, 208001, 412, 1),
			(413, 282001, 413, 1),
			(414, 221001, 414, 1),
			(415, 211001, 415, 1),
			(416, 250001, 416, 1),
			(417, 201001, 417, 1),
			(418, 201301, 418, 1),
			(419, 243001, 419, 1),
			(420, 202001, 420, 1),
			-- India - Uttarakhand Cities
			(421, 248001, 421, 1),
			(422, 249401, 422, 1),
			(423, 247667, 423, 1),
			(424, 263139, 424, 1),
			(425, 263153, 425, 1),
			(426, 244713, 426, 1),
			(427, 249201, 427, 1),
			(428, 263001, 428, 1),
			(429, 248179, 429, 1),
			(430, 263601, 430, 1),
			-- India - West Bengal Cities
			(431, 700001, 431, 1),
			(432, 711101, 432, 1),
			(433, 713216, 433, 1),
			(434, 713301, 434, 1),
			(435, 734001, 435, 1),
			(436, 721301, 436, 1),
			(437, 713101, 437, 1),
			(438, 732101, 438, 1),
			(439, 735101, 439, 1),
			(440, 741101, 440, 1),
			-- India - Delhi Areas
			(441, 110001, 441, 1),
			(442, 110001, 442, 1),
			(443, 110009, 443, 1),
			(444, 110017, 444, 1),
			(445, 110092, 445, 1),
			(446, 110015, 446, 1),
			(447, 110075, 447, 1),
			(448, 110085, 448, 1),
			(449, 110034, 449, 1),
			(450, 110092, 450, 1),
			-- India - Jammu and Kashmir Cities
			(451, 190001, 451, 1),
			(452, 180001, 452, 1),
			(453, 192101, 453, 1),
			(454, 193101, 454, 1),
			(455, 193201, 455, 1),
			(456, 182101, 456, 1),
			(457, 184101, 457, 1),
			(458, 185131, 458, 1),
			(459, 185101, 459, 1),
			(460, 193222, 460, 1),
			-- India - Ladakh Cities
			(461, 194101, 461, 1),
			(462, 194103, 462, 1),
			(463, 194401, 463, 1),
			(464, 194302, 464, 1),
			(465, 194102, 465, 1),
			-- India - Puducherry Cities
			(466, 605001, 466, 1),
			(467, 609602, 467, 1),
			(468, 673310, 468, 1),
			(469, 533464, 469, 1)
		ON CONFLICT (id) DO NOTHING;
		`);
	seedLogger.info('Seeded: postal_code');

	// 14. Weekday
	await db.execute(sql`
		INSERT INTO weekday (id, name)
		VALUES
			(1, 'Sunday'),
			(2, 'Monday'),
			(3, 'Tuesday'),
			(4, 'Wednesday'),
			(5, 'Thursday'),
			(6, 'Friday'),
			(7, 'Saturday')
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: weekday');

	// 15. Refer-Type
	await db.execute(sql`
		INSERT INTO refer_type (id, name)
		VALUES
			(1, 'Internal'),
			(2, 'External')
		ON CONFLICT (id) DO NOTHING;
	`);

	seedLogger.info('Seeded: refer-type');

	// 16. Unit types (for categorising units: length, weight, etc.)
	await db.execute(sql`
		INSERT INTO unit_type (id, name, status_id)
		VALUES
			(1, 'Length', 1),
			(2, 'Weight', 1),
			(3, 'Pressure', 1),
			(4, 'Rate', 1),
			(5, 'Temperature', 1),
			(6, 'Percentage', 1),
			(7, 'Respiration', 1),
			(8, 'Blood sugar', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: unit_type');

	// 17. Units (for vitals and measurements; unit_type_id links to unit_type)
	await db.execute(sql`
		INSERT INTO unit (id, name, unit_type_id, status_id)
		VALUES
			(1, 'cm', 1, 1),
			(2, 'in', 1, 1),
			(3, 'kg', 2, 1),
			(4, 'lb', 2, 1),
			(5, 'mmHg', 3, 1),
			(6, 'bpm', 4, 1),
			(7, '°C', 5, 1),
			(8, '°F', 5, 1),
			(9, '%', 6, 1),
			(10, '/min', 7, 1),
			(11, 'mg/dL', 8, 1),
			(12, 'mmol/L', 8, 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: unit');

	// 18. Visit types (for patient_visit)
	await db.execute(sql`
		INSERT INTO visit_type (id, name, code, status_id)
		VALUES
			(1, 'OPD', 'O', 1),
			(2, 'IPD', 'I', 1),
			(3, 'ED', 'E', 1),
			(4, 'DayCare', 'DC', 1),
			(5, 'Package', 'PK', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: visit_type');

	// 19. Severity master (lookup for alert severity)
	await db.execute(sql`
		INSERT INTO severity (id, name, status_id)
		VALUES
			(1, 'Major', 1),
			(2, 'Moderate', 1),
			(3, 'Minor', 1),
			(4, 'No Alert', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: severity');

	// 20. Diagnosis type (lookup)
	await db.execute(sql`
		INSERT INTO diagnosis_type (id, name, status_id)
		VALUES
			(1, 'Provisional', 1),
			(2, 'Final', 1),
			(3, 'Chronic', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: diagnosis_type');

	// 21. Form name (which EMR / visit form or section)
	await db.execute(sql`
		INSERT INTO form_name (id, code, name, form_type, status_id)
		VALUES
			(1, 'chief_complaint', 'Chief complaint', 'observation_emr_visit', 1),
			(2, 'patient_condition', 'Patient condition', 'observation_emr_visit', 1),
			(3, 'diagnosis_notes', 'Diagnosis notes', 'observation_emr_visit', 1),
			(4, 'patient_registration', 'Patient registration', 'registration', 1)
		ON CONFLICT (id) DO NOTHING;
	`);
	seedLogger.info('Seeded: form_name');

	seedLogger.info('Master tables seeding completed');
}

// Allow running via `ts-node` / `tsx` / `node` (after build)
seedMasterTables()
	.then(() => {
		seedLogger.info('Master table seeding finished');
		process.exit(0);
	})
	.catch((error) => {
		seedLogger.error(
			'Error while seeding master tables',
			error instanceof Error ? error : new Error(String(error))
		);
		process.exit(1);
	});
