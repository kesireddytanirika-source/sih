import React, { createContext, useContext } from 'react';

export const LANGUAGES = { en: 'English', hi: 'हिंदी', te: 'తెలుగు' };

// Maps a raw status string (as stored in the DB, always English) to a
// translation key, so the underlying data never changes — only the label
// shown in the centre app does.
export const STATUS_KEY = {
  'Appointment Booked': 'status_appointment_booked',
  'Checked In at Centre': 'status_checked_in',
  'Quality Inspection': 'status_quality_inspection',
  'Weighing Complete': 'status_weighing_complete',
  'Payment Processing': 'status_payment_processing',
  'Payment Completed': 'status_payment_completed',
  Rejected: 'status_rejected',
  'No Show': 'status_no_show',
};

const dict = {
  en: {
    brand_tagline: 'Centre',
    logout: 'Log out',
    language_label: 'Language',

    todays_appointments: "Today's appointments",
    active_in_queue: 'Active in queue',
    payments_completed: 'Payments completed',
    farmers_served: 'Farmers served',
    live_queue_nav: 'Live queue',
    analytics_nav: 'Analytics',
    sorted_by_token: 'Sorted by token — oldest first',
    nothing_here_yet: 'Nothing here yet.',

    col_hash: '#',
    col_token: 'Token',
    col_farmer: 'Farmer',
    col_crop: 'Crop',
    col_slot: 'Slot',
    col_status: 'Status',
    grade_prefix: 'Grade',

    not_found: 'Not found',
    select_from_queue: 'Select an appointment from the queue.',
    farmer_label: 'Farmer',
    crop_label: 'Crop',
    slot_label: 'Slot',
    current_status_label: 'Current status',

    weighing_details_title: 'Weighing details',
    weighing_details_sub: 'Fill these in before pressing the "Weighing Complete" button below.',
    quantity_accepted_label: 'Quantity accepted (qtl)',
    rate_label: 'Rate (₹ / qtl)',

    move_status_title: 'Move status',
    move_status_sub: 'These buttons are only available in the centre app — clicking one updates the status the farmer sees on their Status tab.',
    exceptions_title: 'Exceptions',
    no_show_btn: 'No show',
    reject_btn: 'Reject',

    status_appointment_booked: 'Appointment Booked',
    status_checked_in: 'Checked In at Centre',
    status_quality_inspection: 'Quality Inspection',
    status_weighing_complete: 'Weighing Complete',
    status_payment_processing: 'Payment Processing',
    status_payment_completed: 'Payment Completed',
    status_rejected: 'Rejected',
    status_no_show: 'No Show',

    centre_login_title: 'Procurement centre login',
    centre_login_sub: 'Demo codes — RVP/1111, KDP/2222, SBD/3333.',
    centre_code_label: 'Centre code',
    centre_code_placeholder: 'e.g. RVP',
    pin_label: 'PIN',
    pin_placeholder: '4-digit PIN',
    please_wait: 'Please wait…',
    enter_dashboard_btn: 'Enter dashboard',

    no_data_yet: 'No data yet — appointments will show up here.',
    total_quintals_procured: 'Total quintals procured',
    total_value: 'Total value',
    procured_qty_by_crop: 'Procured quantity by crop (qtl)',
    status_mix: 'Appointment status mix',
  },

  hi: {
    brand_tagline: 'केंद्र',
    logout: 'लॉग आउट',
    language_label: 'भाषा',

    todays_appointments: 'आज की अपॉइंटमेंट',
    active_in_queue: 'कतार में सक्रिय',
    payments_completed: 'पूर्ण भुगतान',
    farmers_served: 'सेवा किए गए किसान',
    live_queue_nav: 'लाइव कतार',
    analytics_nav: 'विश्लेषण',
    sorted_by_token: 'टोकन के अनुसार क्रमबद्ध — सबसे पुराना पहले',
    nothing_here_yet: 'यहाँ अभी कुछ नहीं है।',

    col_hash: '#',
    col_token: 'टोकन',
    col_farmer: 'किसान',
    col_crop: 'फ़सल',
    col_slot: 'स्लॉट',
    col_status: 'स्थिति',
    grade_prefix: 'ग्रेड',

    not_found: 'नहीं मिला',
    select_from_queue: 'कतार से एक अपॉइंटमेंट चुनें।',
    farmer_label: 'किसान',
    crop_label: 'फ़सल',
    slot_label: 'स्लॉट',
    current_status_label: 'वर्तमान स्थिति',

    weighing_details_title: 'तौल विवरण',
    weighing_details_sub: 'नीचे "तौल पूरी हुई" बटन दबाने से पहले इन्हें भरें।',
    quantity_accepted_label: 'स्वीकृत मात्रा (क्विंटल)',
    rate_label: 'दर (₹ / क्विंटल)',

    move_status_title: 'स्थिति बदलें',
    move_status_sub: 'ये बटन केवल केंद्र ऐप में उपलब्ध हैं — किसी एक पर क्लिक करने से किसान को उनके स्थिति टैब पर दिखने वाली स्थिति अपडेट हो जाती है।',
    exceptions_title: 'अपवाद',
    no_show_btn: 'अनुपस्थित',
    reject_btn: 'अस्वीकार करें',

    status_appointment_booked: 'अपॉइंटमेंट बुक हुआ',
    status_checked_in: 'केंद्र पर चेक-इन हुआ',
    status_quality_inspection: 'गुणवत्ता जांच',
    status_weighing_complete: 'तौल पूरी हुई',
    status_payment_processing: 'भुगतान प्रक्रिया में',
    status_payment_completed: 'भुगतान पूर्ण',
    status_rejected: 'अस्वीकृत',
    status_no_show: 'अनुपस्थित',

    centre_login_title: 'खरीद केंद्र लॉगिन',
    centre_login_sub: 'डेमो कोड — RVP/1111, KDP/2222, SBD/3333.',
    centre_code_label: 'केंद्र कोड',
    centre_code_placeholder: 'जैसे RVP',
    pin_label: 'पिन',
    pin_placeholder: '4-अंकों का पिन',
    please_wait: 'कृपया प्रतीक्षा करें…',
    enter_dashboard_btn: 'डैशबोर्ड खोलें',

    no_data_yet: 'अभी तक कोई डेटा नहीं — अपॉइंटमेंट यहाँ दिखेंगी।',
    total_quintals_procured: 'कुल खरीदी गई मात्रा (क्विंटल)',
    total_value: 'कुल मूल्य',
    procured_qty_by_crop: 'फ़सल अनुसार खरीदी गई मात्रा (क्विंटल)',
    status_mix: 'अपॉइंटमेंट स्थिति मिश्रण',
  },

  te: {
    brand_tagline: 'కేంద్రం',
    logout: 'లాగ్ అవుట్',
    language_label: 'భాష',

    todays_appointments: 'ఈరోజు అపాయింట్‌మెంట్‌లు',
    active_in_queue: 'క్యూలో యాక్టివ్',
    payments_completed: 'పూర్తయిన చెల్లింపులు',
    farmers_served: 'సేవ చేసిన రైతులు',
    live_queue_nav: 'లైవ్ క్యూ',
    analytics_nav: 'విశ్లేషణ',
    sorted_by_token: 'టోకెన్ ప్రకారం క్రమబద్ధీకరించబడింది — పాతది మొదట',
    nothing_here_yet: 'ఇక్కడ ఇంకా ఏమీ లేదు.',

    col_hash: '#',
    col_token: 'టోకెన్',
    col_farmer: 'రైతు',
    col_crop: 'పంట',
    col_slot: 'స్లాట్',
    col_status: 'స్థితి',
    grade_prefix: 'గ్రేడ్',

    not_found: 'కనుగొనబడలేదు',
    select_from_queue: 'క్యూ నుండి ఒక అపాయింట్‌మెంట్‌ను ఎంచుకోండి.',
    farmer_label: 'రైతు',
    crop_label: 'పంట',
    slot_label: 'స్లాట్',
    current_status_label: 'ప్రస్తుత స్థితి',

    weighing_details_title: 'తూకం వివరాలు',
    weighing_details_sub: 'దిగువ "తూకం పూర్తయింది" బటన్ నొక్కే ముందు వీటిని పూరించండి.',
    quantity_accepted_label: 'ఆమోదించిన పరిమాణం (క్వింటాళ్లు)',
    rate_label: 'రేటు (₹ / క్వింటాల్)',

    move_status_title: 'స్థితిని మార్చండి',
    move_status_sub: 'ఈ బటన్‌లు కేంద్రం యాప్‌లో మాత్రమే అందుబాటులో ఉంటాయి — వాటిలో ఒకటి క్లిక్ చేస్తే రైతు తన స్థితి ట్యాబ్‌లో చూసే స్థితి అప్‌డేట్ అవుతుంది.',
    exceptions_title: 'మినహాయింపులు',
    no_show_btn: 'హాజరు కాలేదు',
    reject_btn: 'తిరస్కరించండి',

    status_appointment_booked: 'అపాయింట్‌మెంట్ బుక్ అయింది',
    status_checked_in: 'కేంద్రంలో చెక్-ఇన్ అయింది',
    status_quality_inspection: 'నాణ్యత తనిఖీ',
    status_weighing_complete: 'తూకం పూర్తయింది',
    status_payment_processing: 'చెల్లింపు ప్రాసెస్‌లో ఉంది',
    status_payment_completed: 'చెల్లింపు పూర్తయింది',
    status_rejected: 'తిరస్కరించబడింది',
    status_no_show: 'హాజరు కాలేదు',

    centre_login_title: 'కొనుగోలు కేంద్రం లాగిన్',
    centre_login_sub: 'డెమో కోడ్‌లు — RVP/1111, KDP/2222, SBD/3333.',
    centre_code_label: 'కేంద్రం కోడ్',
    centre_code_placeholder: 'ఉదా. RVP',
    pin_label: 'పిన్',
    pin_placeholder: '4-అంకెల పిన్',
    please_wait: 'దయచేసి వేచి ఉండండి…',
    enter_dashboard_btn: 'డాష్‌బోర్డ్ తెరవండి',

    no_data_yet: 'ఇంకా డేటా లేదు — అపాయింట్‌మెంట్‌లు ఇక్కడ కనిపిస్తాయి.',
    total_quintals_procured: 'మొత్తం కొనుగోలు చేసిన పరిమాణం (క్వింటాళ్లు)',
    total_value: 'మొత్తం విలువ',
    procured_qty_by_crop: 'పంట వారీగా కొనుగోలు చేసిన పరిమాణం (క్వింటాళ్లు)',
    status_mix: 'అపాయింట్‌మెంట్ స్థితి మిశ్రమం',
  },
};

export function translate(lang, key, vars) {
  let str = (dict[lang] && dict[lang][key]) || dict.en[key] || key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
  }
  return str;
}

export const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (k, v) => translate('en', k, v) });
export function useLang() { return useContext(LangContext); }

export function LanguageSwitcher({ compact }) {
  const { lang, setLang } = useLang();
  return (
    <select
      className={compact ? 'lang-select compact' : 'lang-select'}
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      aria-label="Language"
    >
      {Object.entries(LANGUAGES).map(([code, label]) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
}
