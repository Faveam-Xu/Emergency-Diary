export type AppLanguage = "en" | "ti";

type L = { en: string; ti: string };

export function tr(lang: AppLanguage, en: string, ti: string): string {
  if (lang === "ti") return ti;
  return en;
}

export function localize<T extends Record<string, L>>(
  lang: AppLanguage,
  dict: T,
): { [K in keyof T]: string } {
  const out = {} as { [K in keyof T]: string };
  for (const key of Object.keys(dict) as (keyof T)[]) {
    out[key] = dict[key][lang];
  }
  return out;
}

export const loginStrings = {
  title: {
    en: "Emergency Diary",
    ti: "መዝገብ ህጹጽ እዋን",
  },
  subtitle: {
    en: "My Secure Data Place",
    ti: "ናተይ ውሑስ ማዕኸን መረዳእታ",
  },
  intro: {
    en: "Your data is held securely and only for your own personal access. The supporting organisation that you trust and grant access may confidentially read your information, with the sole purpose to assist you, or organise assistance for you. This may not be immediately, and may take time, if the situation is complex. If you want to use the Secure Data Place, click 'authorize'.",
    ti: `መረዳእታኹምን ሓበሬታኹምን ውሑስ ብዝኾነ መልክዑ ንባዕልኹም ረብሓ ጥራሕ ይውዕል። እቲ እምነት ዘሕደርኩምሉን ዝመረጽኩምዎን ዝሕግዘኩም ትካል መረዳእታኹም ምስጢር ሕልው ብዝኾነ መንገዲ ኣንቢቡ ንኣኹም ዘድሊ ሓገዝ ንምፍላይን ሓገዝ ንምውዳድን ጥራሕ ዝዓለመ ሓበሬታ ክረክብ ይኸእል እዩ። አቲ ኩነታት ዝተሓላለኸ እንድሕር ኮይኑ እዚ ከይዲ ሽዑ ንሽዑ ከይኮነ ግዜ ክወስድ ይኽእል እዩ። ነዚ ውሑስ ማዕኸን መረዳእታ ክትጥቀሙ እንተፈቒድኩም ነቲ “ፈቒደ” ዝብል ጠውቑ።`,
  },
  notLoggedIn: {
    en: "You are not logged in.",
    ti: "ኣይኣተኹምን ዘለኹም",
  },
  btnLogin: {
    en: "Log in",
    ti: "እቶ", // ti: unverified, needs native-speaker check
  },
  // Consent and disclaimer: English and Tigrinya from
  // "Consent and Disclaimer Emergency Diary.docx"; Chinese translated from
  // the English (to be checked by a Chinese speaker).
  consentTitle: {
    en: "Consent",
    ti: "ፍቃድ",
    zh: "同意",
  },
  consentText: {
    en: "By using this application, you agree to share information only if you choose. Your data will stay in your personal Solid Pod storage. Participation is voluntary and will not affect your access to services or support.",
    ti: "ነዚ ኣፕሊኬሽን እዚ ብምጥቃም ሓበሬታ ክተካፍሉ ምስ እትመርጽ ጥራይ ኢኹም ትሰማምዑ። ሓበሬታኹም ኣብ ውልቃዊ መኽዘን ሶሊድ ፖድ ክዕቀብ እዩ። ተሳትፎ ብወለንታ ዝፍጸም ኮይኑ ኣብዚ ምስታፍ ነቲ ዝነበረ ግልጋሎት ወይ ደገፍ ኣይጸልዎን።",
    zh: "使用本应用即表示您同意：只有在您自己选择时才会分享信息。您的数据将保存在您个人的 Solid Pod 存储中。参与完全自愿，不会影响您获得服务或支持。",
  },
  disclaimerTitle: {
    en: "Disclaimer",
    ti: "መተሓሳሰቢ",
    zh: "免责声明",
  },
  disclaimerText: {
    en: "This application is a research tool, not an official registration or service. It is designed to improve privacy and data control. Using this app does not change your legal status or access to humanitarian aid.",
    ti: "እዚ ኣፕሊኬሽን እዚ መጽናዕታዊ መሳርሒ እምበር ወግዓዊ ምዝገባ ወይ ግልጋሎት ኣይኮነን። ብሕታዊነትን ምቁጽጻር ሓበሬታን ንምምሕያሽ ዝተዳለወ እዩ። ነዚ ኣፕሊኬሽን ምጥቃም ሕጋዊ ኩነታት ወይ ንሰብኣዊ ሓገዝ ንምርካብ ዝሕግዝ ወይ ዝኽልክል ኣይኮነን።",
    zh: "本应用是一个研究工具，并非官方登记或服务。它旨在改善隐私和数据控制。使用本应用不会改变您的法律身份，也不会影响您获得人道主义援助。",
  },
  consentCheckbox: {
    en: "I have read and agree to the consent and disclaimer above.",
    ti: "ነቲ ኣብ ላዕሊ ዘሎ ፍቃድን መተሓሳሰቢን ኣንቢበ ይሰማማዕ እየ።", // ti: unverified, needs native-speaker check
    zh: "我已阅读并同意以上同意书和免责声明。",
  },
  footer: {
    en: "To ask help, you can store your emergency data in your Solid Pod, and you choose which organisation may access it, to give you support.",
    ti: "ሓገዝ ንምሕታት ናይ ህጹጽ አዋን ሓበሬታኹም ኣብ ሶሊድ ፖድ ክትዕቅቡን ዝመረጽኩምዎ ትካል ነቲ ሓበሬታኹም ተጠቒሙ ዘድልየኩም ድጋፍ ክህበኩም ፍቓድ ክትህቡ ትኽእሉ ኢኹም።",
  },
  selectLanguage: {
    en: "Select Language / ቋንቋ ምረጽ/ጺ :",
    ti: "Select Language / ቋንቋ ምረጽ/ጺ :",
  },
  loading: {
    en: "Loading…",
    ti: "Loading…",
  },
} as const;

export const dashboardStrings = {
  loggedIn: { en: "Logged in", ti: "ኣቲኹም ኣለኹም" },
  yourWebId: { en: "Your WebID:", ti: "ናትኩም ዌብኣይዲ:" },
  logout: { en: "Logout", ti: "ዉጻእ" },
  podAndFile: { en: "Pod and file", ti: "ፖድን ፋይልን" },
  mandatoryNote: {
    en: "fields are mandatory",
    ti: "ዝተመላኸቱ ግዴታ ክምልኡ ዘለዎም እዮም።",
  },
  record: { en: "Record", ti: "መዝግቡ" },
  recordId: { en: "Record ID", ti: "መለለዪ መዝገብ" },
  date: { en: "Date", ti: "ዕለት" },
  myDetails: { en: "My Details", ti: "ናተይ ዝርዝር ሓበሬታ" },
  myId: {
    en: "My Secure Data Place ID",
    ti: "ናተይ ውሑስ ዳታ ቦታ መለለዪ",
  },
  nationality: { en: "Nationality", ti: "ዜግነት" },
  search: { en: "Search", ti: "ድለ" },
  gender: { en: "Gender", ti: "ጾታ" },
  select: { en: "Select…", ti: "ምረጽ" },
  female: { en: "Female", ti: "ኣነስታይ" },
  male: { en: "Male", ti: "ተባዕታይ" },
  other: { en: "Other", ti: "ካሊእ" },
  preferNot: { en: "Prefer not to say", ti: "ክገልጽ ኣይደልን" },
  age: { en: "Age", ti: "ዕድመ" },
  enterAge: { en: "Enter age", ti: "ዕድመ ኣእቱ" },
  category: { en: "Category *", ti: "ምደባ *" },
  individual: { en: "Individual", ti: "ውልቀሰብ" },
  group: { en: "Group", ti: "ጉጅለ" },
  numberInGroup: {
    en: "Number of persons in the My Secure Data Place group",
    ti: "ኣብ ናተይ ውሑስ ማዕኸን መረዳእታ ጉጅለ ዘለው በዝሒ ሰባት",
  },
  enterNumber: { en: "Enter number", ti: "ቁጽሪ ኣእቱ" },
  addNationality: { en: "Add nationality", ti: "ዜግነት ኣእቱ" },
  groupGenders: {
    en: "Gender(s) of group members",
    ti: "ናይቲ ጉጅለ ኣባላት ጾታ",
  },
  mixed: { en: "Mixed", ti: "ሕውስዋስ" },
  groupAges: {
    en: "Age(s) of group members",
    ti: "ናይቲ ጉጅለ ኣባላት ዕድመ",
  },
  whereAreYou: { en: "Where are you now?", ti: "ሐዚ ኣበይ ኣለኻ/ኺ" },
  country: { en: "Country *", ti: "ጎይታ *" },
  state: { en: "State / Region", ti: "ክልል" },
  enterState: { en: "Enter state or region", ti: "ክልልኩም ኣእትው" },
  town: { en: "Town / City", ti: "ከተማ" },
  enterTown: {
    en: "Enter name of the town or city",
    ti: "ስም ከተማኹም ኣእትው",
  },
  village: { en: "Village", ti: "ጣብያ" },
  enterVillage: {
    en: "Enter name of the village",
    ti: "ስም ጣብያኹም ኣእትው",
  },
  latitude: { en: "Latitude", ti: "ላቲቱድ" },
  longitude: { en: "Longitude", ti: "ሎንጊቱድ" },
  gpsNote: {
    en: "(To get your GPS coordinates, please click the button 'Get GPS Coordinates'...)",
    ti: "(ጂኦግራፊያዊ ጂፒኤስ ኮርዲኔትካ ንምርካብ፡ በይዘኦም/አን ነቲ 'ጂፒኤስ ኮርዲኔት ውሰድ' ዝብል ቁልፊ ጠውቕ እሞ ኣብ መርበብ ሓበሬታኻ ቦታ ንምእታው ፍቐድ። መተሓሳሰቢ፡ ዘለኻዩ ቦታ ከተካፍል ምስ እትደሊ ጥራይ ነዚ ጠውቕ።)",
  },
  getGps: { en: "Get GPS Coordinates", ti: "ጂፒኤስ ኮርዲኔት ውሰድ" },
  locationId: { en: "Location ID", ti: "መለለዩ ቦታ" },
  locationName: { en: "Location Name", ti: "ስም ቦታ" },
  enterLocationName: {
    en: "Enter location name",
    ti: "ስም ቦታ ኣእቱ/ኣእትዊ",
  },
  locationType: { en: "Type of Location *", ti: "ዓይነት ቦታ *" },
  refugeeCamp: {
    en: "Refugee/IDP camp",
    ti: "መዕቆቢ ስደተኛ/ተመዛባላይ",
  },
  traffickingCamp: {
    en: "Human trafficking/smuggling camp",
    ti: "መዓስከር ዘይሕጋዊ ምስግጋር ደቂ ሰባት/ምዝውዋር ሰባት",
  },
  whyNeedHelp: {
    en: "Why do you need help?",
    ti: "ንምንታይ ኢኻ/ኺ ሓገዝ ደሊኻ/ኺ?",
  },
  youCanTick: {
    en: "You can tick more than one option.",
    ti: "ካብ ሓደ ንላዕሊ ኣማራጺ ምጥዋቕ ይከኣል።",
  },
  abducted: { en: "I am abducted", ti: "ተዓጊተ እየ" },
  heldAgainstWill: {
    en: "I am held against my will",
    ti: "ብዘይድሌተይ እየ ተታሒዘ",
  },
  threatened: { en: "I am threatened", ti: "ተፈራሪሐ እየ" },
  extorted: { en: "I am extorted", ti: "ተጭበርቢረ እየ" },
  mustPayMoney: { en: "I have to pay money", ti: "ገንዘብ ክኸፍል ኣለኒ" },
  beaten: { en: "I am beaten", ti: "ተወቒዐ እየ" },
  abused: { en: "I am abused", ti: "ተጸሪፈ እየ" },
  currentSituation: { en: "Current Situation", ti: "ህልው ኩነታት" },
  placeStaying: {
    en: "Place where you are staying",
    ti: "እትጸንሐሉ ዘለኻ/ኺ ቦታ",
  },
  house: { en: "House", ti: "ገዛ" },
  apartment: { en: "Apartment", ti: "መንበሪ" },
  tent: { en: "Tent", ti: "ኬንዳ" },
  noAccommodation: { en: "No accommodation", ti: "መዕቖቢ የለን" },
  moreSituationDetails: {
    en: "More details of the current situation",
    ti: "ዝርዝር ሓበሬታ ብዛዕባ ህልው ኩነታት",
  },
  enterSituationDescription: {
    en: "Enter situation description",
    ti: "ዝርዝር ኩነታት ግለጽ/ጺ",
  },
  yourNeeds: { en: "Your Needs", ti: "ድሌታትካ" },
  health: { en: "Health", ti: "ጥዕና" },
  education: { en: "Education", ti: "ትምህርቲ" },
  shelter: { en: "Shelter", ti: "መጽለሊ" },
  protection: { en: "Protection", ti: "ውሕስና" },
  wash: { en: "WASH", ti: "ማይ፣ ንጽህናን ከባብያዊ ጥዕናን" },
  foodSecurity: { en: "Food security", ti: "ውሕስና ምግቢ" },
  transportation: { en: "Transportation", ti: "መጓዓዝያ" },
  communication: { en: "Communication", ti: "ኮምዩኒኬሽን" },
  mentalHealth: { en: "Mental Health", ti: "ጥዕና ኣእምሮ" },
  spiritualSupport: { en: "Spiritual Support", ti: "መንፈሳዊ ሓገዝ" },
  administrativeSupport: {
    en: "Administrative Support",
    ti: "ምምሕዳራዊ ሓገዝ",
  },
  moreNeedsDetails: {
    en: "More details about your needs",
    ti: "ብዛዕባ ድሌታትካ/ኪ ዝርዝር ሓበሬታ",
  },
  enterNeedsDescription: {
    en: "Enter needs description",
    ti: "ድሌታትካ ዝምልከት ግለጽ/ጺ",
  },
  captivityStatus: {
    en: "Captivity Status *",
    ti: "ኩነታት ኣተዓጋግታ *",
  },
  yes: { en: "Yes", ti: "እወ" },
  no: { en: "No", ti: "አይኮነን" },
  CaptivityDetail: {
    en: "Captivity Detail *",
    ti: "ዝርዝር ኣተዓጋግታ *",
  },
  extraInfoQuestion: {
    en: "Do you have information that you think we should know?",
    ti: "ንሕና ክንፈልጦ ይግባእ ትብሎ/ትብልዮ ሓበሬታ ኣለካ/ኪ?",
  },
  uploadPicturesTitle: {
    en: "Upload pictures or other proof of your situation",
    ti: "ዘለኻዩ ኩነታት ዝገልጽ ፎቶ ወይ ካሊእ መረዳእታ ጸዓን/ኒ",
  },
  uploadPicturesInfo: {
    en: "You can upload photos or other files that you think are important. These will be stored securely in your Solid Pod.",
    ti: "ኣገደስቲ እዮም ትብሎም/ትብልዮም ፎቶታት ወይ ካልኦት መረዳእታታት ክትጽዕን ትኽእል/ሊ ኢኻ/ኺ። እዚኦም ኣብ ሶሊድ ፖድካ ብውሑስ ይቐምጣሉ።",
  },
  chooseFiles: { en: "Choose Files", ti: "መረዳእታ ምረጽ/ጺ" },
  noFilesSelected: {
    en: "no files selected",
    ti: "ዝመረጽኪዮ/ዝመረጽክዮ መረዳእታ የለን",
  },
  uploadSelected: {
    en: "Upload selected files",
    ti: "ዝመረጽካዮም/ዝመረጽክዮም መረዳእታ ጸዓኒ/ን",
  },
  filesSelectedMessage: {
    en: '. file(s) selected, click "Upload selected files" to store them.',
    ti: 'ዝተመረጹ መረዳእታታት፣ ክተቕምጦም "ዝመረጽካዮም/ዝመረጽክዮም መረዳእታ ጸዓኒ/ን" ጠውቕ/ቒ',
  },
  waysToContact: {
    en: "What are ways in which we can contact you?",
    ti: "ንዓኻ/ኺ ክንረኽበካ/ኪ ንኽእለሉ መንገዲ እንታይ እዩ?",
  },
  myPhoneNumber: { en: "My phone number", ti: "ቁጽሪ ስልከይ" },
  phoneOfSomeoneWhoKnowsMe: {
    en: "Phone number of someone who knows me",
    ti: "ናይ ዝኾነ ዝፈልጠኒ ሰብ ቁጽሪ ስልኪ",
  },
  socialMediaHandles: {
    en: "Social media handles",
    ti: "ዘለውኻ/ኺ ማሕበራዊ ሚድያታት",
  },
  messengerWhatsappSignal: {
    en: "Messenger / WhatsApp / Signal",
    ti: "መሰንጀር/ዋትስኣፕ/ሲግናል",
  },
  otherHandles: {
    en: "Other handles (Instagram, X, …)",
    ti: "ካልኦት ሜላታት ማሕበራዊ ሚድያ (ኢንስታግራም፣ ኤክስ፣ …)",
  },
  contactSomeoneElse: {
    en: "Do you want us to contact someone for you?",
    ti: "ንዓኻ ዝረኽበካ ሰብ ክነራኽበካ ትደሊ ዲኻ?",
  },
  writeWhoToContact: {
    en: "You can write who we should contact and how.",
    ti: "ንመንን ብኸመይን ክንረክብ ከምዘለና ክትጽሕፈልና ትኽእል/ሊ ኢኻ/ኺ",
  },
  saveToMySecureDataPlace: {
    en: "Save to My Secure Data Place",
    ti: "አብ ናተይ ውሑስ ማዕኸን መረዳእታ ኣቐምጥ/ጢ",
  },
  previewRdfCode: { en: "Preview RDF Code", ti: "RDF ኮድ ረአ/ረኣዪ" },
  status: { en: "Status", ti: "ኩነታት" },
  selectTrustedNgos: {
    en: "Select Trusted NGOs",
    ti: "ትኣምኖ/ትኣምንዮ ዘይመንግስታዊ ትካላት",
  },
  addNewNgo: { en: "Add new NGO", ti: "ሓዱሽ ዘይመንግስታዊ ትካል ወስኽ/ኺ" },
  addNgo: { en: "Add NGO", ti: "ዘይመንግስታዊ ትካል ወስኽ" },
  // PR1-1 texts. Tigrinya below is unverified and needs a native-speaker check.
  chooseVerifiedNgo: {
    en: "Choose a verified NGO…",
    ti: "ዝተረጋገጸ ዘይመንግስታዊ ትካል ምረጽ…", // ti: unverified, needs native-speaker check
  },
  noVerifiedNgos: {
    en: "No verified NGOs are available right now.",
    ti: "ሕጂ ዝተረጋገጸ ዘይመንግስታዊ ትካል የለን።", // ti: unverified, needs native-speaker check
  },
  allVerifiedNgosAdded: {
    en: "All verified NGOs are already in your list.",
    ti: "ኩሎም ዝተረጋገጹ ዘይመንግስታዊ ትካላት ኣብ ዝርዝርካ ኣለዉ።", // ti: unverified, needs native-speaker check
  },
  verifiedNgoListUnavailable: {
    en: "The list of verified NGOs could not be loaded, so no NGO can be added or granted access right now.",
    ti: "ዝርዝር ዝተረጋገጹ ዘይመንግስታዊ ትካላት ክጽዓን ኣይከኣለን፣ ስለዚ ሕጂ ዝኾነ ትካል ክውሰኽ ወይ ተበጻሕነት ፍቓድ ክወሃቦ ኣይከኣልን።", // ti: unverified, needs native-speaker check
  },
  notVerifiedNgo: {
    en: "Not verified: you can revoke access or remove it, but not grant access.",
    ti: "ዘይተረጋገጸ፡ ተበጻሕነት ፍቓድ ክትከልክል ወይ ካብ ዝርዝርካ ከተወግዶ ትኽእል ኢኻ፣ ፍቓድ ግን ክትህቦ ኣይትኽእልን።", // ti: unverified, needs native-speaker check
  },
  notVerifiedHasAccess: {
    en: "Not verified, but still has access from an earlier grant. Consider revoking it.",
    ti: "ዘይተረጋገጸ፡ ግን ካብ ዝሓለፈ ፍቓድ ተበጻሕነት ኣለዎ። ፍቓዱ ክትከልክል ሕሰብ።", // ti: unverified, needs native-speaker check
  },
  selectAll: { en: "Select All", ti: "ኩሎም ምረጽ/ጺ" },
  deselectAll: { en: "Deselect All", ti: "ኩሎም ኣይትምረጽ/ጺ" },
  deleteSelectedNgos: {
    en: "Delete Selected NGOs",
    ti: "ዝተመረጹ ዘይመንግስታዊ ትካላት ሰርዝ",
  },
  allowTrustedRead: {
    en: "Allow Trusted Organisation(s) to read",
    ti: "ዝኣመንካዮም ትካላት ንኸንብቡ ፍቐድ",
  },
  revokeSelectedAccess: {
    en: "Revoke Access for Selected NGOs",
    ti: "ትካላት ንኸንብቡ ዝሃብካዮ ፍቓድ ከልከል",
  },
  saving: { en: "Saving…", ti: "ይቕመጥ ኣሎ …" },
  saveUnauthorized: {
    en: "Save failed (401). Your Solid login expired. Click Logout, log in again, then save.",
    ti: "Save failed (401). Your Solid login expired. Click Logout, log in again, then save.",
  },
  savedPrivate: { en: "saved (private)", ti: "ተቐሚጡ (ውልቃዊ)" },
  emergencyFilePublicNo: {
    en: "Emergency file public: No",
    ti: "ህጹጽ ፋይል ኩሉሰብ ይርኣዮ፡ ኣይፋልን።",
  },
  emergencyFilePublicLabel: {
    en: "Emergency file public:",
    ti: "ህጹጽ ፋይል ኩሉሰብ ይርኣዮ፣",
  },
  unknown: { en: "unknown", ti: "ዘይፍለጥ" },
  grantingAccess: {
    en: "Granting access to selected NGOs…",
    ti: "ንዝተመረጹ ዘይመንግስታዊ ትካላት ክሪእዎ ተበጻሕነት ፍቐድ",
  },
  cannotGrantInvalidWebIDs: {
    en: "Cannot grant access. These are not valid NGO WebIDs:",
    ti: "ተበጻሕነት ፍቓድ የለን። እዚ ትኽክለኛ መፍለዩ ዌብ መረዳእታ ዘይመንግስታዊ ትካል ኣይኮነን፡",
  },
  emergencyDataLoaded: {
    en: "emergency data loaded from pod",
    ti: "ካብ ፖድ ዝተጻዕነ መረዳእታ ህጹጽ እዋን",
  },
  ngoViewedYourData: {
    en: "This NGO has viewed your data",
    ti: "እዚ ዘይመንግስታዊ ትካል እዚ መረዳእታኻ ሪእዎ ኣሎ",
  },
  lastSuccessfulRead: {
    en: "Last successful read:",
    ti: "Last successful read:",
  },
  oldRecordResultUnknown: {
    en: "Old record, result unknown",
    ti: "Old record, result unknown",
  },
  failedReadAttempts: {
    en: "Failed read attempts:",
    ti: "Failed read attempts:",
  },
  accessGivenOn: {
    en: "Access given:",
    ti: "Access given:",
  },
  accessRemovedOn: {
    en: "Access removed:",
    ti: "Access removed:",
  },
  couldNotGrantAccessFor: {
    en: "Could not grant access for:",
    ti: "ተበጻሕነት ፍቓድ ኣይተውሃበን ን:",
  },
  checkWebIDsReachable: {
    en: "Check that these WebIDs exist and that the pods are reachable.",
    ti: "እዞም መፍለይ ዌብ ከምዘለዉን እቶም ፖድስ ክርከቡ ዝኽእል ምዃኖምን ኣረጋግጽ።",
  },
  alreadyHasAccess: {
    en: "✓ already has access",
    ti: "✓ ተበጻሕነት ፍቓድ ኣለዎ",
  },
  hasAccessedYourFile: {
    en: "has accessed your file",
    ti: "መረዳእታኻ ተበጻሕነት ረኺቡ ኣሎ",
  },
  accessGrantedForSelectedNgos: {
    en: "Access granted for selected NGOs.",
    ti: "ንዝተመረጹ ዘይመንግስታዊ ትካላት ተበጻሕነት ፍቓድ ተዋሂቡ።",
  },
  revokingAccess: {
    en: "Revoking access for selected NGOs…",
    ti: "ንዝተመረጹ ዘይመንግስታዊ ትካላት ተበጻሕነት ፍቓድ ይኽልክል ኣሎ።",
  },
  accessRevoked: {
    en: "Access revoked for selected NGOs.",
    ti: "ንዝተመረጹ ዘይመንግስታዊ ትካላት ተበጻሕነት ፍቓድ ተኸልኪሉ።",
  },
  ngosRemovedFromList: {
    en: "Selected NGOs have been removed from your list.",
    ti: "ዝተመረጹ ዘይመንግስታዊ ትካላት ካብ ዝርዝርካ ተወጊዶም።",
  },
  selectPlaceholder: { en: "Select...", ti: "ምረጽ..." },
  searchPlaceholder: { en: "Search...", ti: "ድለ..." },
  groupMembersNationality: {
    en: "Nationality/nationalities of group members",
    ti: "ዜግነት/ዜግነት ናይቶም ኣባላት ጉጅለ",
  },
  additionalInfoPlaceholder: {
    en: "You can write anything that you think is important for us to know",
    ti: "ንሕና ክንፈልጦ ይግባእ ትብሎ/ትብልዮ ኣገዳሲ ሓበሬታ ክትጽሕፉልና ትኽእሉ ኢኹም።",
  },
  uploadingPictures: {
    en: "Uploading pictures to your Solid Pod…",
    ti: "ፎቶታት ናብ ሶሊድ ፖድካ ይጸዓን ኣሎ…",
  },
  uploadedPicturesSuccess: {
    en: "Uploaded {{count}} picture(s) successfully.",
    ti: "{{count}} ፎቶ (ፎቶታት) ብዕውት መንገዲ ተጻዒኑ ኣሎ።",
  },
  requiredFieldsMessage: {
    en: "Please fill all required fields",
    ti: "ኩሎም ክምልኡ ዘለዎም ሓበሬታ ምልኡ",
  },
  requiredFieldsError: {
    en: "error: Please fill all required fields",
    ti: "ስሕተት፡ በይዘኦም ኩሎም ክምልኡ ዘለዎም ሓበሬታ ምልኡ",
  },
  gettingGps: {
    en: "Getting GPS coordinates...",
    ti: "ጂፒኤስ ኮርዲኔት ይረክብ ኣሎ…",
  },
  gpsObtained: {
    en: "GPS coordinates obtained",
    ti: "ጂፒኤስ ኮርዲኔት ተረኺቡ",
  },
  gpsError: { en: "GPS Error", ti: "GPS ጌጋ" },
  pleaseSelectAtLeastOneNgo: {
    en: "Please select at least one NGO",
    ti: "እንተነኣሰ ሓደ ዘይመንግስታዊ ትካል ምረጹ",
  },
  selectedLabel: { en: "Selected: ", ti: "ዝተመረጸ: " },
  trauma: {
    en: "Visible Injuries (Trauma)",
    ti: "ጉድኣት አካል (Trauma)",
  },
  traumaCuts: { en: "Cuts / lacerations", ti: "ቁርጥቆሽ / ቁርጥቆሽታት" },
  traumaBruises: { en: "Bruises", ti: "ጉድኣት ቆዳ" },
  traumaBurns: { en: "Burns", ti: "ቃጠሎ" },
  traumaFractures: { en: "Fractures", ti: "ስባር ዓጽሚ" },
  traumaHeadInjury: { en: "Head injury", ti: "ጉድኣት ርእሲ" },
  traumaGunshot: {
    en: "Gunshot / shrapnel",
    ti: "ጥይት / ቁራጽ ብረት",
  },
  traumaSexualViolence: {
    en: "Signs of sexual violence",
    ti: "ምልክታት ዓመጽ ብዛዕባ ዝምድና",
  },
  traumaDehydration: {
    en: "Dehydration / malnutrition",
    ti: "ውሃ ማጽዋት / ምግቢ ማጽዋት",
  },
  traumaOther: {
    en: "Other visible injury",
    ti: "ካልእ ዝረአ ጉድኣት",
  },
  healthStatus: { en: "Health Condition", ti: "ኩነታት ጥዕና" },
  enterHealthStatus: {
    en: "Describe your health condition",
    ti: "ኩነታት ጥዕናኹም ግለጹ",
  },
} as const;

export const ngoStrings = {
  dashboardTitle: { en: "NGO Dashboard", ti: "NGO Dashboard" },
  loggedInAsNgo: {
    en: "You are logged in as an NGO.",
    ti: "You are logged in as an NGO.",
  },
  initInbox: {
    en: "Initialise NGO inbox",
    ti: "Initialise NGO inbox",
  },
  initNeedNgoLogin: {
    en: "Please log in as an NGO first.",
    ti: "Please log in as an NGO first.",
  },
  initNoPod: {
    en: "Could not detect your Pod base URL. Fill Pod and file first.",
    ti: "Could not detect your Pod base URL. Fill Pod and file first.",
  },
  initChecking: {
    en: "Checking inbox status...",
    ti: "Checking inbox status...",
  },
  initAlready: {
    en: "NGO inbox already initialised! You can now go to the refugee page and grant access.",
    ti: "NGO inbox already initialised! You can now go to the refugee page and grant access.",
  },
  initWorking: {
    en: "Initialising NGO inbox...",
    ti: "Initialising NGO inbox...",
  },
  initSuccess: {
    en: "NGO inbox initialised successfully. Now open the refugee page and grant this NGO WebID.",
    ti: "NGO inbox initialised successfully. Now open the refugee page and grant this NGO WebID.",
  },
  initError: {
    en: "Error initialising NGO inbox:",
    ti: "Error initialising NGO inbox:",
  },
  loadRefugees: {
    en: "Load refugees who granted you access",
    ti: "Load refugees who granted you access",
  },
  hideCdm: {
    en: "Hide CDM documentation",
    ti: "Hide CDM documentation",
  },
  showCdm: {
    en: "Show CDM documentation",
    ti: "Show CDM documentation",
  },
  refugeesGranted: {
    en: "Refugees who granted access",
    ti: "Refugees who granted access",
  },
  refugeeWebId: { en: "Refugee WebID:", ti: "Refugee WebID:" },
  emergencyFile: { en: "Emergency file:", ti: "Emergency file:" },
  grantedAt: { en: "Granted at:", ti: "Granted at:" },
  cdmDocsTitle: {
    en: "CDM Ontology documentation",
    ti: "CDM Ontology documentation",
  },
  cdmDocsIntro: {
    en: "The terms below are loaded directly from the CDM ontology (cdm_sord.ttl). Use these property names when writing SPARQL queries against refugees' emergency data.",
    ti: "The terms below are loaded directly from the CDM ontology (cdm_sord.ttl). Use these property names when writing SPARQL queries against refugees' emergency data.",
  },
  loadingCdm: {
    en: "Loading CDM documentation…",
    ti: "Loading CDM documentation…",
  },
  coreClasses: { en: "Core classes", ti: "Core classes" },
  recordProperties: {
    en: "Record properties",
    ti: "Record properties",
  },
  victimProperties: {
    en: "Victim properties",
    ti: "Victim properties",
  },
  locationProperties: {
    en: "Location properties",
    ti: "Location properties",
  },
  situationProperties: {
    en: "Situation and needs properties",
    ti: "Situation and needs properties",
  },
  querying: { en: "Querying...", ti: "Querying..." },
  queryData: { en: "Query Data", ti: "Query Data" },
  exitCustomMode: {
    en: "Exit Custom Mode",
    ti: "Exit Custom Mode",
  },
  enterCustomMode: {
    en: "Enter Custom Query Mode",
    ti: "Enter Custom Query Mode",
  },
  filterData: { en: "Filter Data", ti: "Filter Data" },
  selectField: { en: "Select Field:", ti: "Select Field:" },
  selectValue: { en: "Select Value:", ti: "Select Value:" },
  allNoFilter: { en: "All (No Filter)", ti: "All (No Filter)" },
  all: { en: "All", ti: "All" },
  visualize: { en: "Visualize", ti: "Visualize" },
  queryBuilder: {
    en: "Query Builder Chain",
    ti: "Query Builder Chain",
  },
  readableQuery: { en: "Readable query:", ti: "Readable query:" },
  noFilters: { en: "(no filters)", ti: "(no filters)" },
  noFiltersYet: {
    en: "No filters yet. Start by adding a filter.",
    ti: "No filters yet. Start by adding a filter.",
  },
  addFilterField: {
    en: "1. Add Filter (Field)",
    ti: "1. Add Filter (Field)",
  },
  addCondition: {
    en: "2. Add Condition",
    ti: "2. Add Condition",
  },
  addValue: { en: "3. Add Value", ti: "3. Add Value" },
  add: { en: "Add", ti: "Add" },
  greaterOrEqual: {
    en: "Greater Than or Equal",
    ti: "Greater Than or Equal",
  },
  lessOrEqual: {
    en: "Less Than or Equal",
    ti: "Less Than or Equal",
  },
  deleteLast: { en: "Delete Last", ti: "Delete Last" },
  running: { en: "Running...", ti: "Running..." },
  runQuery: { en: "Run Query", ti: "Run Query" },
  detailedData: {
    en: "Detailed Refugee Data",
    ti: "Detailed Refugee Data",
  },
  records: { en: "records", ti: "records" },
  viewDetailed: {
    en: "View detailed refugee data",
    ti: "View detailed refugee data",
  },
  noResults: { en: "No results", ti: "No results" },
  fieldCountry: { en: "Country", ti: "Country" },
  fieldTown: { en: "Town", ti: "Town" },
  fieldNationality: { en: "Nationality", ti: "Nationality" },
  fieldLocationType: { en: "Location Type", ti: "Location Type" },
  fieldAccommodation: { en: "Accommodation", ti: "Accommodation" },
  fieldNeeds: { en: "Needs", ti: "Needs" },
  fieldAge: { en: "Age", ti: "Age" },
  fieldVictims: {
    en: "Number of Victims",
    ti: "Number of Victims",
  },
  fieldDate: { en: "Date", ti: "Date" },
  fieldCategory: { en: "Category", ti: "Category" },
  fieldState: { en: "State / Region", ti: "State / Region" },
  fieldVillage: { en: "Village", ti: "Village" },
  fieldLocationName: { en: "Location Name", ti: "Location Name" },
  fieldCaptivity: {
    en: "Captivity Status",
    ti: "Captivity Status",
  },
  fieldGender: { en: "Gender", ti: "Gender" },
  fieldWhyNeedHelp: { en: "Why Need Help", ti: "Why Need Help" },
  fieldUploadedPicture: {
    en: "Uploaded Picture",
    ti: "Uploaded Picture",
  },
  equals: { en: "Equals", ti: "Equals" },
  greaterThan: { en: "Greater Than", ti: "Greater Than" },
  lessThan: { en: "Less Than", ti: "Less Than" },
  victims: { en: "Victims", ti: "Victims" },
} as const;
