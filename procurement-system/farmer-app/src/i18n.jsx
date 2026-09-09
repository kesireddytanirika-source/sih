import React, { createContext, useContext } from 'react';

export const LANGUAGES = { en: 'English', hi: 'हिंदी', te: 'తెలుగు' };

// Maps a raw status string (as stored in the DB, always English) to a
// translation key, so the underlying data never changes — only the label
// shown to the farmer does.
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
    brand_tagline: 'Farmer',
    logout: 'Log out',
    nav_home: 'Home',
    nav_booking: 'Booking',
    nav_status: 'Status',
    nav_queue: 'Live Queue',
    language_label: 'Language',

    home_greeting: 'Namaste, {name}',
    home_sub: "Your profile and bookings only — no other farmer's data is visible here.",
    total_bookings: 'Total bookings',
    currently_active: 'Currently active',
    book_new_slot: 'Book a new procurement slot',
    recent_bookings: 'Recent bookings',
    no_bookings_yet: 'No bookings yet. Add a crop to get your first e-token.',
    see_all_bookings: 'See all bookings',

    step_of: 'Step {n} of 4',
    add_crop_title: 'Add your crop',
    select_centre_title: 'Select a centre',
    select_slot_title: 'Select date & slot',
    confirm_booking_title: 'Confirm booking',

    crop_type_label: 'Crop type',
    quantity_label: 'Quantity (quintals)',
    grade_label: 'Grade',
    grade_a: 'A — Premium',
    grade_b: 'B — Standard',
    grade_c: 'C — Basic',
    next_select_centre: 'Next: select centre',

    crop_row_label: 'Crop',
    centre_row_label: 'Centre',
    date_row_label: 'Date',
    slot_row_label: 'Slot',
    confirm_btn: 'Confirm booking',
    booking_in_progress: 'Booking…',

    your_e_token: 'Your e-token',
    live_status_note: 'Live status',
    track_status_btn: 'Track procurement status',
    book_another_btn: 'Book another slot',
    youre_booked: "You're booked",
    loading: 'Loading…',
    not_found: 'Not found',
    booking_not_found: 'Booking not found.',

    procurement_status_title: 'Procurement status',
    all_bookings_sub: 'All your bookings and where each one stands.',
    current_status_label: 'Current status',
    weighed_qty_label: 'Weighed qty',
    rate_label: 'Rate',
    total_payable_label: 'Total payable',
    status_note: "Status is updated by the procurement centre only — this screen just shows what they've recorded.",
    timeline_label: 'Timeline',

    live_queue_title: 'Live queue',
    live_queue_sub: "Your position among today's active bookings at each centre — no other farmer's details are shown.",
    refresh_btn: 'Refresh',
    no_active_bookings: 'You have no active bookings in a queue right now.',
    in_queue_today_suffix: 'of {total} in queue today',
    people_ahead_label: '{count} people ahead of you',
    queue_next_up: "You're next!",

    status_appointment_booked: 'Appointment Booked',
    status_checked_in: 'Checked In at Centre',
    status_quality_inspection: 'Quality Inspection',
    status_weighing_complete: 'Weighing Complete',
    status_payment_processing: 'Payment Processing',
    status_payment_completed: 'Payment Completed',
    status_rejected: 'Rejected',
    status_no_show: 'No Show',

    login_title: 'Log in',
    register_title: 'Create your account',
    auth_sub: 'Only your own profile and bookings will ever be visible to you.',
    login_tab: 'Log in',
    register_tab: 'New farmer',
    full_name_label: 'Full name',
    full_name_placeholder: 'e.g. Ramesh Reddy',
    phone_label: 'Phone number',
    phone_placeholder: '10-digit mobile',
    village_label: 'Village',
    optional_suffix: '(optional)',
    village_placeholder: 'e.g. Ravulapalli',
    password_label: 'Password',
    password_placeholder: 'At least 6 characters',
    please_wait: 'Please wait…',
    create_account_btn: 'Create account',

    chat_title: 'Kisan Setu Assistant',
    chat_placeholder: 'Ask about your bookings…',
    chat_greeting: 'Hi! Ask me about your bookings, your e-token, or how procurement status works.',
    chat_error: 'Sorry, something went wrong: {error}',
  },

  hi: {
    brand_tagline: 'किसान',
    logout: 'लॉग आउट',
    nav_home: 'होम',
    nav_booking: 'बुकिंग',
    nav_status: 'स्थिति',
    nav_queue: 'लाइव कतार',
    language_label: 'भाषा',

    home_greeting: 'नमस्ते, {name}',
    home_sub: 'केवल आपकी प्रोफ़ाइल और बुकिंग — यहाँ किसी अन्य किसान का डेटा नहीं दिखाया जाता।',
    total_bookings: 'कुल बुकिंग',
    currently_active: 'वर्तमान में सक्रिय',
    book_new_slot: 'नई खरीद स्लॉट बुक करें',
    recent_bookings: 'हाल की बुकिंग',
    no_bookings_yet: 'अभी तक कोई बुकिंग नहीं। अपना पहला ई-टोकन पाने के लिए फ़सल जोड़ें।',
    see_all_bookings: 'सभी बुकिंग देखें',

    step_of: 'चरण {n} / 4',
    add_crop_title: 'अपनी फ़सल जोड़ें',
    select_centre_title: 'केंद्र चुनें',
    select_slot_title: 'तारीख़ और स्लॉट चुनें',
    confirm_booking_title: 'बुकिंग की पुष्टि करें',

    crop_type_label: 'फ़सल का प्रकार',
    quantity_label: 'मात्रा (क्विंटल)',
    grade_label: 'ग्रेड',
    grade_a: 'A — प्रीमियम',
    grade_b: 'B — मानक',
    grade_c: 'C — सामान्य',
    next_select_centre: 'आगे: केंद्र चुनें',

    crop_row_label: 'फ़सल',
    centre_row_label: 'केंद्र',
    date_row_label: 'तारीख़',
    slot_row_label: 'स्लॉट',
    confirm_btn: 'बुकिंग पक्की करें',
    booking_in_progress: 'बुक हो रहा है…',

    your_e_token: 'आपका ई-टोकन',
    live_status_note: 'लाइव स्थिति',
    track_status_btn: 'खरीद की स्थिति देखें',
    book_another_btn: 'एक और स्लॉट बुक करें',
    youre_booked: 'आपकी बुकिंग हो गई',
    loading: 'लोड हो रहा है…',
    not_found: 'नहीं मिला',
    booking_not_found: 'बुकिंग नहीं मिली।',

    procurement_status_title: 'खरीद की स्थिति',
    all_bookings_sub: 'आपकी सभी बुकिंग और उनकी वर्तमान स्थिति।',
    current_status_label: 'वर्तमान स्थिति',
    weighed_qty_label: 'तौली गई मात्रा',
    rate_label: 'दर',
    total_payable_label: 'कुल देय राशि',
    status_note: 'स्थिति केवल खरीद केंद्र द्वारा अपडेट की जाती है — यह स्क्रीन केवल उनके द्वारा दर्ज जानकारी दिखाती है।',
    timeline_label: 'समयरेखा',

    live_queue_title: 'लाइव कतार',
    live_queue_sub: 'हर केंद्र पर आज की सक्रिय बुकिंग में आपकी स्थिति — किसी अन्य किसान का विवरण नहीं दिखाया जाता।',
    refresh_btn: 'रीफ़्रेश करें',
    no_active_bookings: 'अभी आपकी कोई सक्रिय बुकिंग कतार में नहीं है।',
    in_queue_today_suffix: 'आज कतार में {total} में से',
    people_ahead_label: 'आपसे पहले {count} लोग हैं',
    queue_next_up: 'अब आपकी बारी है!',

    status_appointment_booked: 'अपॉइंटमेंट बुक हुआ',
    status_checked_in: 'केंद्र पर चेक-इन हुआ',
    status_quality_inspection: 'गुणवत्ता जांच',
    status_weighing_complete: 'तौल पूरी हुई',
    status_payment_processing: 'भुगतान प्रक्रिया में',
    status_payment_completed: 'भुगतान पूर्ण',
    status_rejected: 'अस्वीकृत',
    status_no_show: 'अनुपस्थित',

    login_title: 'लॉग इन करें',
    register_title: 'अपना खाता बनाएं',
    auth_sub: 'केवल आपकी अपनी प्रोफ़ाइल और बुकिंग ही आपको दिखाई देंगी।',
    login_tab: 'लॉग इन करें',
    register_tab: 'नया किसान',
    full_name_label: 'पूरा नाम',
    full_name_placeholder: 'जैसे रमेश रेड्डी',
    phone_label: 'फ़ोन नंबर',
    phone_placeholder: '10 अंकों का मोबाइल नंबर',
    village_label: 'गांव',
    optional_suffix: '(वैकल्पिक)',
    village_placeholder: 'जैसे रावुलापल्ली',
    password_label: 'पासवर्ड',
    password_placeholder: 'कम से कम 6 अक्षर',
    please_wait: 'कृपया प्रतीक्षा करें…',
    create_account_btn: 'खाता बनाएं',

    chat_title: 'किसान सेतु सहायक',
    chat_placeholder: 'अपनी बुकिंग के बारे में पूछें…',
    chat_greeting: 'नमस्ते! अपनी बुकिंग, ई-टोकन या खरीद की स्थिति के बारे में पूछें।',
    chat_error: 'क्षमा करें, कुछ गड़बड़ हुई: {error}',
  },

  te: {
    brand_tagline: 'రైతు',
    logout: 'లాగ్ అవుట్',
    nav_home: 'హోమ్',
    nav_booking: 'బుకింగ్',
    nav_status: 'స్థితి',
    nav_queue: 'లైవ్ క్యూ',
    language_label: 'భాష',

    home_greeting: 'నమస్తే, {name}',
    home_sub: 'మీ ప్రొఫైల్ మరియు బుకింగ్‌లు మాత్రమే — ఇక్కడ మరే ఇతర రైతు డేటా కనిపించదు.',
    total_bookings: 'మొత్తం బుకింగ్‌లు',
    currently_active: 'ప్రస్తుతం యాక్టివ్',
    book_new_slot: 'కొత్త కొనుగోలు స్లాట్ బుక్ చేయండి',
    recent_bookings: 'ఇటీవలి బుకింగ్‌లు',
    no_bookings_yet: 'ఇంకా బుకింగ్‌లు లేవు. మీ మొదటి ఇ-టోకెన్ పొందడానికి పంటను జోడించండి.',
    see_all_bookings: 'అన్ని బుకింగ్‌లు చూడండి',

    step_of: 'దశ {n} / 4',
    add_crop_title: 'మీ పంటను జోడించండి',
    select_centre_title: 'కేంద్రాన్ని ఎంచుకోండి',
    select_slot_title: 'తేదీ & స్లాట్ ఎంచుకోండి',
    confirm_booking_title: 'బుకింగ్‌ను నిర్ధారించండి',

    crop_type_label: 'పంట రకం',
    quantity_label: 'పరిమాణం (క్వింటాళ్లు)',
    grade_label: 'గ్రేడ్',
    grade_a: 'A — ప్రీమియం',
    grade_b: 'B — ప్రామాణికం',
    grade_c: 'C — సాధారణం',
    next_select_centre: 'తదుపరి: కేంద్రాన్ని ఎంచుకోండి',

    crop_row_label: 'పంట',
    centre_row_label: 'కేంద్రం',
    date_row_label: 'తేదీ',
    slot_row_label: 'స్లాట్',
    confirm_btn: 'బుకింగ్‌ను నిర్ధారించండి',
    booking_in_progress: 'బుక్ అవుతోంది…',

    your_e_token: 'మీ ఇ-టోకెన్',
    live_status_note: 'లైవ్ స్థితి',
    track_status_btn: 'కొనుగోలు స్థితిని ట్రాక్ చేయండి',
    book_another_btn: 'మరో స్లాట్ బుక్ చేయండి',
    youre_booked: 'మీ బుకింగ్ పూర్తయింది',
    loading: 'లోడ్ అవుతోంది…',
    not_found: 'కనుగొనబడలేదు',
    booking_not_found: 'బుకింగ్ కనుగొనబడలేదు.',

    procurement_status_title: 'కొనుగోలు స్థితి',
    all_bookings_sub: 'మీ అన్ని బుకింగ్‌లు మరియు వాటి ప్రస్తుత స్థితి.',
    current_status_label: 'ప్రస్తుత స్థితి',
    weighed_qty_label: 'తూకం వేసిన పరిమాణం',
    rate_label: 'రేటు',
    total_payable_label: 'చెల్లించాల్సిన మొత్తం',
    status_note: 'స్థితిని కేవలం కొనుగోలు కేంద్రం మాత్రమే అప్‌డేట్ చేస్తుంది — ఈ స్క్రీన్ వారు నమోదు చేసిన సమాచారాన్ని మాత్రమే చూపిస్తుంది.',
    timeline_label: 'కాలక్రమం',

    live_queue_title: 'లైవ్ క్యూ',
    live_queue_sub: 'ప్రతి కేంద్రంలో ఈరోజు యాక్టివ్ బుకింగ్‌లలో మీ స్థానం — మరే ఇతర రైతు వివరాలు చూపబడవు.',
    refresh_btn: 'రిఫ్రెష్ చేయండి',
    no_active_bookings: 'ప్రస్తుతం మీకు క్యూలో యాక్టివ్ బుకింగ్‌లు లేవు.',
    in_queue_today_suffix: 'ఈరోజు క్యూలో {total} లో',
    people_ahead_label: 'మీకు ముందు {count} మంది ఉన్నారు',
    queue_next_up: 'ఇప్పుడు మీ వంతు!',

    status_appointment_booked: 'అపాయింట్‌మెంట్ బుక్ అయింది',
    status_checked_in: 'కేంద్రంలో చెక్-ఇన్ అయింది',
    status_quality_inspection: 'నాణ్యత తనిఖీ',
    status_weighing_complete: 'తూకం పూర్తయింది',
    status_payment_processing: 'చెల్లింపు ప్రాసెస్‌లో ఉంది',
    status_payment_completed: 'చెల్లింపు పూర్తయింది',
    status_rejected: 'తిరస్కరించబడింది',
    status_no_show: 'హాజరు కాలేదు',

    login_title: 'లాగిన్ అవ్వండి',
    register_title: 'మీ ఖాతాను సృష్టించండి',
    auth_sub: 'మీ స్వంత ప్రొఫైల్ మరియు బుకింగ్‌లు మాత్రమే మీకు కనిపిస్తాయి.',
    login_tab: 'లాగిన్ అవ్వండి',
    register_tab: 'కొత్త రైతు',
    full_name_label: 'పూర్తి పేరు',
    full_name_placeholder: 'ఉదా. రమేష్ రెడ్డి',
    phone_label: 'ఫోన్ నంబర్',
    phone_placeholder: '10 అంకెల మొబైల్ నంబర్',
    village_label: 'గ్రామం',
    optional_suffix: '(ఐచ్ఛికం)',
    village_placeholder: 'ఉదా. రావులపల్లి',
    password_label: 'పాస్‌వర్డ్',
    password_placeholder: 'కనీసం 6 అక్షరాలు',
    please_wait: 'దయచేసి వేచి ఉండండి…',
    create_account_btn: 'ఖాతా సృష్టించండి',

    chat_title: 'కిసాన్ సేతు సహాయకుడు',
    chat_placeholder: 'మీ బుకింగ్‌ల గురించి అడగండి…',
    chat_greeting: 'హాయ్! మీ బుకింగ్‌లు, ఇ-టోకెన్ లేదా కొనుగోలు స్థితి గురించి అడగండి.',
    chat_error: 'క్షమించండి, ఏదో తప్పు జరిగింది: {error}',
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

