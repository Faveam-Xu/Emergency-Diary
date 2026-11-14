export type AppLanguage = "en" | "ti" | "zh";

type L = { en: string; ti: string; zh: string };

export function tr(lang: AppLanguage, en: string, ti: string, zh: string): string {
  if (lang === "ti") return ti;
  if (lang === "zh") return zh;
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
    zh: "应急日记",
  },
  subtitle: {
    en: "My Secure Data Place",
    ti: "ናተይ ውሑስ ማዕኸን መረዳእታ",
    zh: "我的安全数据空间",
  },
  intro: {
    en: "Your data is held securely and only for your own personal access. The supporting organisation that you trust and grant access may confidentially read your information, with the sole purpose to assist you, or organise assistance for you. This may not be immediately, and may take time, if the situation is complex. If you want to use the Secure Data Place, click 'authorize'.",
    ti: `መረዳእታኹምን ሓበሬታኹምን ውሑስ ብዝኾነ መልክዑ ንባዕልኹም ረብሓ ጥራሕ ይውዕል። እቲ እምነት ዘሕደርኩምሉን ዝመረጽኩምዎን ዝሕግዘኩም ትካል መረዳእታኹም ምስጢር ሕልው ብዝኾነ መንገዲ ኣንቢቡ ንኣኹም ዘድሊ ሓገዝ ንምፍላይን ሓገዝ ንምውዳድን ጥራሕ ዝዓለመ ሓበሬታ ክረክብ ይኸእል እዩ። አቲ ኩነታት ዝተሓላለኸ እንድሕር ኮይኑ እዚ ከይዲ ሽዑ ንሽዑ ከይኮነ ግዜ ክወስድ ይኽእል እዩ። ነዚ ውሑስ ማዕኸን መረዳእታ ክትጥቀሙ እንተፈቒድኩም ነቲ “ፈቒደ” ዝብል ጠውቑ።`,
    zh: "您的数据会被安全保存，默认只有您本人能访问。您信任并授权的救助机构可以保密读取这些信息，目的仅是帮助您或为您组织援助。情况复杂时可能无法立刻处理。若要使用安全数据空间，请点击“授权”。",
  },
  notLoggedIn: {
    en: "You are not logged in.",
    ti: "ኣይኣተኹምን ዘለኹም",
    zh: "您尚未登录。",
  },
  btnLogin: {
    en: "Log in",
    ti: "Log in", // TODO: Tigrinya translation needed
    zh: "登录",
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
    ti: "I have read and agree to the consent and disclaimer above.", // TODO: Tigrinya translation needed
    zh: "我已阅读并同意以上同意书和免责声明。",
  },
  footer: {
    en: "To ask help, you can store your emergency data in your Solid Pod, and you choose which organisation may access it, to give you support.",
    ti: "ሓገዝ ንምሕታት ናይ ህጹጽ አዋን ሓበሬታኹም ኣብ ሶሊድ ፖድ ክትዕቅቡን ዝመረጽኩምዎ ትካል ነቲ ሓበሬታኹም ተጠቒሙ ዘድልየኩም ድጋፍ ክህበኩም ፍቓድ ክትህቡ ትኽእሉ ኢኹም።",
    zh: "如需求助，您可以把应急数据存在自己的 Solid Pod 中，并选择允许哪家机构读取以提供支持。",
  },
  selectLanguage: {
    en: "Select Language / ቋንቋ ምረጽ/ጺ / 选择语言 :",
    ti: "Select Language / ቋንቋ ምረጽ/ጺ / 选择语言 :",
    zh: "Select Language / ቋንቋ ምረጽ/ጺ / 选择语言 :",
  },
  loading: {
    en: "Loading…",
    ti: "Loading…",
    zh: "加载中…",
  },
} as const;

export const dashboardStrings = {
  loggedIn: { en: "Logged in", ti: "ኣቲኹም ኣለኹም", zh: "已登录" },
  yourWebId: { en: "Your WebID:", ti: "ናትኩም ዌብኣይዲ:", zh: "您的 WebID：" },
  logout: { en: "Logout", ti: "ዉጻእ", zh: "退出登录" },
  podAndFile: { en: "Pod and file", ti: "ፖድን ፋይልን", zh: "Pod 与文件" },
  mandatoryNote: {
    en: "fields are mandatory",
    ti: "ዝተመላኸቱ ግዴታ ክምልኡ ዘለዎም እዮም።",
    zh: "为必填项",
  },
  record: { en: "Record", ti: "መዝግቡ", zh: "记录" },
  recordId: { en: "Record ID", ti: "መለለዪ መዝገብ", zh: "记录编号" },
  date: { en: "Date", ti: "ዕለት", zh: "日期" },
  myDetails: { en: "My Details", ti: "ናተይ ዝርዝር ሓበሬታ", zh: "我的信息" },
  myId: {
    en: "My Secure Data Place ID",
    ti: "ናተይ ውሑስ ዳታ ቦታ መለለዪ",
    zh: "我的安全数据空间编号",
  },
  nationality: { en: "Nationality", ti: "ዜግነት", zh: "国籍" },
  search: { en: "Search", ti: "ድለ", zh: "搜索" },
  gender: { en: "Gender", ti: "ጾታ", zh: "性别" },
  select: { en: "Select…", ti: "ምረጽ", zh: "请选择…" },
  female: { en: "Female", ti: "ኣነስታይ", zh: "女" },
  male: { en: "Male", ti: "ተባዕታይ", zh: "男" },
  other: { en: "Other", ti: "ካሊእ", zh: "其他" },
  preferNot: { en: "Prefer not to say", ti: "ክገልጽ ኣይደልን", zh: "不愿说明" },
  age: { en: "Age", ti: "ዕድመ", zh: "年龄" },
  enterAge: { en: "Enter age", ti: "ዕድመ ኣእቱ", zh: "请输入年龄" },
  category: { en: "Category *", ti: "ምደባ *", zh: "类别 *" },
  individual: { en: "Individual", ti: "ውልቀሰብ", zh: "个人" },
  group: { en: "Group", ti: "ጉጅለ", zh: "群体" },
  numberInGroup: {
    en: "Number of persons in the My Secure Data Place group",
    ti: "ኣብ ናተይ ውሑስ ማዕኸን መረዳእታ ጉጅለ ዘለው በዝሒ ሰባት",
    zh: "群体中的人数",
  },
  enterNumber: { en: "Enter number", ti: "ቁጽሪ ኣእቱ", zh: "请输入人数" },
  addNationality: { en: "Add nationality", ti: "ዜግነት ኣእቱ", zh: "添加国籍" },
  groupGenders: {
    en: "Gender(s) of group members",
    ti: "ናይቲ ጉጅለ ኣባላት ጾታ",
    zh: "群体成员性别",
  },
  mixed: { en: "Mixed", ti: "ሕውስዋስ", zh: "混合" },
  groupAges: {
    en: "Age(s) of group members",
    ti: "ናይቲ ጉጅለ ኣባላት ዕድመ",
    zh: "群体成员年龄",
  },
  whereAreYou: { en: "Where are you now?", ti: "ሐዚ ኣበይ ኣለኻ/ኺ", zh: "您现在在哪里？" },
  country: { en: "Country *", ti: "ጎይታ *", zh: "国家 *" },
  state: { en: "State / Region", ti: "ክልል", zh: "州 / 地区" },
  enterState: { en: "Enter state or region", ti: "ክልልኩም ኣእትው", zh: "请输入州或地区" },
  town: { en: "Town / City", ti: "ከተማ", zh: "城镇 / 城市" },
  enterTown: {
    en: "Enter name of the town or city",
    ti: "ስም ከተማኹም ኣእትው",
    zh: "请输入城镇或城市名称",
  },
  village: { en: "Village", ti: "ጣብያ", zh: "村庄" },
  enterVillage: {
    en: "Enter name of the village",
    ti: "ስም ጣብያኹም ኣእትው",
    zh: "请输入村庄名称",
  },
  latitude: { en: "Latitude", ti: "ላቲቱድ", zh: "纬度" },
  longitude: { en: "Longitude", ti: "ሎንጊቱድ", zh: "经度" },
  gpsNote: {
    en: "(To get your GPS coordinates, please click the button 'Get GPS Coordinates'...)",
    ti: "(ጂኦግራፊያዊ ጂፒኤስ ኮርዲኔትካ ንምርካብ፡ በይዘኦም/አን ነቲ 'ጂፒኤስ ኮርዲኔት ውሰድ' ዝብል ቁልፊ ጠውቕ እሞ ኣብ መርበብ ሓበሬታኻ ቦታ ንምእታው ፍቐድ። መተሓሳሰቢ፡ ዘለኻዩ ቦታ ከተካፍል ምስ እትደሊ ጥራይ ነዚ ጠውቕ።)",
    zh: "（要获取 GPS 坐标，请点击“获取 GPS 坐标”。浏览器可能会询问定位权限。请仅在您愿意分享位置时使用。）",
  },
  getGps: { en: "Get GPS Coordinates", ti: "ጂፒኤስ ኮርዲኔት ውሰድ", zh: "获取 GPS 坐标" },
  locationId: { en: "Location ID", ti: "መለለዩ ቦታ", zh: "地点编号" },
  locationName: { en: "Location Name", ti: "ስም ቦታ", zh: "地点名称" },
  enterLocationName: {
    en: "Enter location name",
    ti: "ስም ቦታ ኣእቱ/ኣእትዊ",
    zh: "请输入地点名称",
  },
  locationType: { en: "Type of Location *", ti: "ዓይነት ቦታ *", zh: "地点类型 *" },
  refugeeCamp: {
    en: "Refugee/IDP camp",
    ti: "መዕቆቢ ስደተኛ/ተመዛባላይ",
    zh: "难民营 / 境内流离失所者营地",
  },
  traffickingCamp: {
    en: "Human trafficking/smuggling camp",
    ti: "መዓስከር ዘይሕጋዊ ምስግጋር ደቂ ሰባት/ምዝውዋር ሰባት",
    zh: "人口贩运 / 偷渡营地",
  },
  whyNeedHelp: {
    en: "Why do you need help?",
    ti: "ንምንታይ ኢኻ/ኺ ሓገዝ ደሊኻ/ኺ?",
    zh: "您为什么需要帮助？",
  },
  youCanTick: {
    en: "You can tick more than one option.",
    ti: "ካብ ሓደ ንላዕሊ ኣማራጺ ምጥዋቕ ይከኣል።",
    zh: "可以勾选多项。",
  },
  abducted: { en: "I am abducted", ti: "ተዓጊተ እየ", zh: "我被绑架" },
  heldAgainstWill: {
    en: "I am held against my will",
    ti: "ብዘይድሌተይ እየ ተታሒዘ",
    zh: "我被违背意愿扣留",
  },
  threatened: { en: "I am threatened", ti: "ተፈራሪሐ እየ", zh: "我受到威胁" },
  extorted: { en: "I am extorted", ti: "ተጭበርቢረ እየ", zh: "我被勒索" },
  mustPayMoney: { en: "I have to pay money", ti: "ገንዘብ ክኸፍል ኣለኒ", zh: "我必须交钱" },
  beaten: { en: "I am beaten", ti: "ተወቒዐ እየ", zh: "我被殴打" },
  abused: { en: "I am abused", ti: "ተጸሪፈ እየ", zh: "我被虐待" },
  currentSituation: { en: "Current Situation", ti: "ህልው ኩነታት", zh: "当前处境" },
  placeStaying: {
    en: "Place where you are staying",
    ti: "እትጸንሐሉ ዘለኻ/ኺ ቦታ",
    zh: "您目前的住处",
  },
  house: { en: "House", ti: "ገዛ", zh: "房屋" },
  apartment: { en: "Apartment", ti: "መንበሪ", zh: "公寓" },
  tent: { en: "Tent", ti: "ኬንዳ", zh: "帐篷" },
  noAccommodation: { en: "No accommodation", ti: "መዕቖቢ የለን", zh: "没有住所" },
  moreSituationDetails: {
    en: "More details of the current situation",
    ti: "ዝርዝር ሓበሬታ ብዛዕባ ህልው ኩነታት",
    zh: "当前处境的更多说明",
  },
  enterSituationDescription: {
    en: "Enter situation description",
    ti: "ዝርዝር ኩነታት ግለጽ/ጺ",
    zh: "请描述当前处境",
  },
  yourNeeds: { en: "Your Needs", ti: "ድሌታትካ", zh: "您的需求" },
  health: { en: "Health", ti: "ጥዕና", zh: "健康" },
  education: { en: "Education", ti: "ትምህርቲ", zh: "教育" },
  shelter: { en: "Shelter", ti: "መጽለሊ", zh: "庇护" },
  protection: { en: "Protection", ti: "ውሕስና", zh: "保护" },
  wash: { en: "WASH", ti: "ማይ፣ ንጽህናን ከባብያዊ ጥዕናን", zh: "饮水卫生" },
  foodSecurity: { en: "Food security", ti: "ውሕስና ምግቢ", zh: "粮食安全" },
  transportation: { en: "Transportation", ti: "መጓዓዝያ", zh: "交通" },
  communication: { en: "Communication", ti: "ኮምዩኒኬሽን", zh: "通讯" },
  mentalHealth: { en: "Mental Health", ti: "ጥዕና ኣእምሮ", zh: "心理健康" },
  spiritualSupport: { en: "Spiritual Support", ti: "መንፈሳዊ ሓገዝ", zh: "精神支持" },
  administrativeSupport: {
    en: "Administrative Support",
    ti: "ምምሕዳራዊ ሓገዝ",
    zh: "行政支持",
  },
  moreNeedsDetails: {
    en: "More details about your needs",
    ti: "ብዛዕባ ድሌታትካ/ኪ ዝርዝር ሓበሬታ",
    zh: "需求的更多说明",
  },
  enterNeedsDescription: {
    en: "Enter needs description",
    ti: "ድሌታትካ ዝምልከት ግለጽ/ጺ",
    zh: "请描述您的需求",
  },
  captivityStatus: {
    en: "Captivity Status *",
    ti: "ኩነታት ኣተዓጋግታ *",
    zh: "是否被拘禁 *",
  },
  yes: { en: "Yes", ti: "እወ", zh: "是" },
  no: { en: "No", ti: "አይኮነን", zh: "否" },
  CaptivityDetail: {
    en: "Captivity Detail *",
    ti: "ዝርዝር ኣተዓጋግታ *",
    zh: "拘禁详情 *",
  },
  extraInfoQuestion: {
    en: "Do you have information that you think we should know?",
    ti: "ንሕና ክንፈልጦ ይግባእ ትብሎ/ትብልዮ ሓበሬታ ኣለካ/ኪ?",
    zh: "还有我们认为应该知道的信息吗？",
  },
  uploadPicturesTitle: {
    en: "Upload pictures or other proof of your situation",
    ti: "ዘለኻዩ ኩነታት ዝገልጽ ፎቶ ወይ ካሊእ መረዳእታ ጸዓን/ኒ",
    zh: "上传能说明处境的照片或其他证据",
  },
  uploadPicturesInfo: {
    en: "You can upload photos or other files that you think are important. These will be stored securely in your Solid Pod.",
    ti: "ኣገደስቲ እዮም ትብሎም/ትብልዮም ፎቶታት ወይ ካልኦት መረዳእታታት ክትጽዕን ትኽእል/ሊ ኢኻ/ኺ። እዚኦም ኣብ ሶሊድ ፖድካ ብውሑስ ይቐምጣሉ።",
    zh: "您可以上传认为重要的照片或其他文件。它们会安全存在您的 Solid Pod 中。",
  },
  chooseFiles: { en: "Choose Files", ti: "መረዳእታ ምረጽ/ጺ", zh: "选择文件" },
  noFilesSelected: {
    en: "no files selected",
    ti: "ዝመረጽኪዮ/ዝመረጽክዮ መረዳእታ የለን",
    zh: "未选择文件",
  },
  uploadSelected: {
    en: "Upload selected files",
    ti: "ዝመረጽካዮም/ዝመረጽክዮም መረዳእታ ጸዓኒ/ን",
    zh: "上传所选文件",
  },
  filesSelectedMessage: {
    en: '. file(s) selected, click "Upload selected files" to store them.',
    ti: 'ዝተመረጹ መረዳእታታት፣ ክተቕምጦም "ዝመረጽካዮም/ዝመረጽክዮም መረዳእታ ጸዓኒ/ን" ጠውቕ/ቒ',
    zh: " 个文件已选择，请点击“上传所选文件”保存。",
  },
  waysToContact: {
    en: "What are ways in which we can contact you?",
    ti: "ንዓኻ/ኺ ክንረኽበካ/ኪ ንኽእለሉ መንገዲ እንታይ እዩ?",
    zh: "我们可以通过哪些方式联系您？",
  },
  myPhoneNumber: { en: "My phone number", ti: "ቁጽሪ ስልከይ", zh: "我的电话号码" },
  phoneOfSomeoneWhoKnowsMe: {
    en: "Phone number of someone who knows me",
    ti: "ናይ ዝኾነ ዝፈልጠኒ ሰብ ቁጽሪ ስልኪ",
    zh: "认识我的人的电话",
  },
  socialMediaHandles: {
    en: "Social media handles",
    ti: "ዘለውኻ/ኺ ማሕበራዊ ሚድያታት",
    zh: "社交媒体账号",
  },
  messengerWhatsappSignal: {
    en: "Messenger / WhatsApp / Signal",
    ti: "መሰንጀር/ዋትስኣፕ/ሲግናል",
    zh: "Messenger / WhatsApp / Signal",
  },
  otherHandles: {
    en: "Other handles (Instagram, X, …)",
    ti: "ካልኦት ሜላታት ማሕበራዊ ሚድያ (ኢንስታግራም፣ ኤክስ፣ …)",
    zh: "其他账号（Instagram、X 等）",
  },
  contactSomeoneElse: {
    en: "Do you want us to contact someone for you?",
    ti: "ንዓኻ ዝረኽበካ ሰብ ክነራኽበካ ትደሊ ዲኻ?",
    zh: "需要我们代为联系其他人吗？",
  },
  writeWhoToContact: {
    en: "You can write who we should contact and how.",
    ti: "ንመንን ብኸመይን ክንረክብ ከምዘለና ክትጽሕፈልና ትኽእል/ሊ ኢኻ/ኺ",
    zh: "可以写下应联系谁、如何联系。",
  },
  saveToMySecureDataPlace: {
    en: "Save to My Secure Data Place",
    ti: "አብ ናተይ ውሑስ ማዕኸን መረዳእታ ኣቐምጥ/ጢ",
    zh: "保存到我的安全数据空间",
  },
  previewRdfCode: { en: "Preview RDF Code", ti: "RDF ኮድ ረአ/ረኣዪ", zh: "预览 RDF 代码" },
  status: { en: "Status", ti: "ኩነታት", zh: "状态" },
  selectTrustedNgos: {
    en: "Select Trusted NGOs",
    ti: "ትኣምኖ/ትኣምንዮ ዘይመንግስታዊ ትካላት",
    zh: "选择信任的 NGO",
  },
  addNewNgo: { en: "Add new NGO", ti: "ሓዱሽ ዘይመንግስታዊ ትካል ወስኽ/ኺ", zh: "添加新 NGO" },
  addNgo: { en: "Add NGO", ti: "ዘይመንግስታዊ ትካል ወስኽ", zh: "添加 NGO" },
  // PR1-1 texts. TODO: Tigrinya translations needed (English for now).
  chooseVerifiedNgo: {
    en: "Choose a verified NGO…",
    ti: "Choose a verified NGO…",
    zh: "选择已验证的机构…",
  },
  allVerifiedNgosAdded: {
    en: "All verified NGOs are already in your list.",
    ti: "All verified NGOs are already in your list.",
    zh: "所有已验证的机构都已在您的列表中。",
  },
  verifiedNgoListUnavailable: {
    en: "The list of verified NGOs could not be loaded, so no NGO can be added or granted access right now.",
    ti: "The list of verified NGOs could not be loaded, so no NGO can be added or granted access right now.",
    zh: "无法加载已验证机构列表，目前无法添加机构或授予访问权限。",
  },
  notVerifiedNgo: {
    en: "Not verified: you can revoke access or remove it, but not grant access.",
    ti: "Not verified: you can revoke access or remove it, but not grant access.",
    zh: "未验证：您可以撤销其访问权限或将其删除，但不能授予访问权限。",
  },
  notVerifiedHasAccess: {
    en: "Not verified, but still has access from an earlier grant. Consider revoking it.",
    ti: "Not verified, but still has access from an earlier grant. Consider revoking it.",
    zh: "未验证，但仍保留之前授予的访问权限。建议撤销。",
  },
  selectAll: { en: "Select All", ti: "ኩሎም ምረጽ/ጺ", zh: "全选" },
  deselectAll: { en: "Deselect All", ti: "ኩሎም ኣይትምረጽ/ጺ", zh: "取消全选" },
  deleteSelectedNgos: {
    en: "Delete Selected NGOs",
    ti: "ዝተመረጹ ዘይመንግስታዊ ትካላት ሰርዝ",
    zh: "删除所选 NGO",
  },
  allowTrustedRead: {
    en: "Allow Trusted Organisation(s) to read",
    ti: "ዝኣመንካዮም ትካላት ንኸንብቡ ፍቐድ",
    zh: "允许受信任机构读取",
  },
  revokeSelectedAccess: {
    en: "Revoke Access for Selected NGOs",
    ti: "ትካላት ንኸንብቡ ዝሃብካዮ ፍቓድ ከልከል",
    zh: "收回所选 NGO 的权限",
  },
  saving: { en: "Saving…", ti: "ይቕመጥ ኣሎ …", zh: "正在保存…" },
  saveUnauthorized: {
    en: "Save failed (401). Your Solid login expired. Click Logout, log in again, then save.",
    ti: "Save failed (401). Your Solid login expired. Click Logout, log in again, then save.",
    zh: "保存失败（401）：Solid 登录已失效。请先退出，重新登录后再保存。",
  },
  savedPrivate: { en: "saved (private)", ti: "ተቐሚጡ (ውልቃዊ)", zh: "已保存（私密）" },
  emergencyFilePublicNo: {
    en: "Emergency file public: No",
    ti: "ህጹጽ ፋይል ኩሉሰብ ይርኣዮ፡ ኣይፋልን።",
    zh: "应急文件公开：否",
  },
  emergencyFilePublicLabel: {
    en: "Emergency file public:",
    ti: "ህጹጽ ፋይል ኩሉሰብ ይርኣዮ፣",
    zh: "应急文件公开：",
  },
  unknown: { en: "unknown", ti: "ዘይፍለጥ", zh: "未知" },
  grantingAccess: {
    en: "Granting access to selected NGOs…",
    ti: "ንዝተመረጹ ዘይመንግስታዊ ትካላት ክሪእዎ ተበጻሕነት ፍቐድ",
    zh: "正在向所选 NGO 授权…",
  },
  cannotGrantInvalidWebIDs: {
    en: "Cannot grant access. These are not valid NGO WebIDs:",
    ti: "ተበጻሕነት ፍቓድ የለን። እዚ ትኽክለኛ መፍለዩ ዌብ መረዳእታ ዘይመንግስታዊ ትካል ኣይኮነን፡",
    zh: "无法授权。这些不是有效的 NGO WebID：",
  },
  emergencyDataLoaded: {
    en: "emergency data loaded from pod",
    ti: "ካብ ፖድ ዝተጻዕነ መረዳእታ ህጹጽ እዋን",
    zh: "已从 Pod 加载应急数据",
  },
  ngoViewedYourData: {
    en: "This NGO has viewed your data",
    ti: "እዚ ዘይመንግስታዊ ትካል እዚ መረዳእታኻ ሪእዎ ኣሎ",
    zh: "该 NGO 已查看您的数据",
  },
  couldNotGrantAccessFor: {
    en: "Could not grant access for:",
    ti: "ተበጻሕነት ፍቓድ ኣይተውሃበን ን:",
    zh: "无法为以下对象授权：",
  },
  checkWebIDsReachable: {
    en: "Check that these WebIDs exist and that the pods are reachable.",
    ti: "እዞም መፍለይ ዌብ ከምዘለዉን እቶም ፖድስ ክርከቡ ዝኽእል ምዃኖምን ኣረጋግጽ።",
    zh: "请确认这些 WebID 存在，并且 Pod 可以访问。",
  },
  alreadyHasAccess: {
    en: "✓ already has access",
    ti: "✓ ተበጻሕነት ፍቓድ ኣለዎ",
    zh: "✓ 已有访问权限",
  },
  hasAccessedYourFile: {
    en: "has accessed your file",
    ti: "መረዳእታኻ ተበጻሕነት ረኺቡ ኣሎ",
    zh: "已访问您的文件",
  },
  accessGrantedForSelectedNgos: {
    en: "Access granted for selected NGOs.",
    ti: "ንዝተመረጹ ዘይመንግስታዊ ትካላት ተበጻሕነት ፍቓድ ተዋሂቡ።",
    zh: "已向所选 NGO 授权。",
  },
  revokingAccess: {
    en: "Revoking access for selected NGOs…",
    ti: "ንዝተመረጹ ዘይመንግስታዊ ትካላት ተበጻሕነት ፍቓድ ይኽልክል ኣሎ።",
    zh: "正在收回所选 NGO 的权限…",
  },
  accessRevoked: {
    en: "Access revoked for selected NGOs.",
    ti: "ንዝተመረጹ ዘይመንግስታዊ ትካላት ተበጻሕነት ፍቓድ ተኸልኪሉ።",
    zh: "已收回所选 NGO 的权限。",
  },
  ngosRemovedFromList: {
    en: "Selected NGOs have been removed from your list.",
    ti: "ዝተመረጹ ዘይመንግስታዊ ትካላት ካብ ዝርዝርካ ተወጊዶም።",
    zh: "所选 NGO 已从列表中移除。",
  },
  selectPlaceholder: { en: "Select...", ti: "ምረጽ...", zh: "请选择..." },
  searchPlaceholder: { en: "Search...", ti: "ድለ...", zh: "搜索..." },
  groupMembersNationality: {
    en: "Nationality/nationalities of group members",
    ti: "ዜግነት/ዜግነት ናይቶም ኣባላት ጉጅለ",
    zh: "群体成员国籍",
  },
  additionalInfoPlaceholder: {
    en: "You can write anything that you think is important for us to know",
    ti: "ንሕና ክንፈልጦ ይግባእ ትብሎ/ትብልዮ ኣገዳሲ ሓበሬታ ክትጽሕፉልና ትኽእሉ ኢኹም።",
    zh: "可以写下您认为我们应该知道的任何重要信息",
  },
  uploadingPictures: {
    en: "Uploading pictures to your Solid Pod…",
    ti: "ፎቶታት ናብ ሶሊድ ፖድካ ይጸዓን ኣሎ…",
    zh: "正在把照片上传到您的 Solid Pod…",
  },
  uploadedPicturesSuccess: {
    en: "Uploaded {{count}} picture(s) successfully.",
    ti: "{{count}} ፎቶ (ፎቶታት) ብዕውት መንገዲ ተጻዒኑ ኣሎ።",
    zh: "已成功上传 {{count}} 张图片。",
  },
  requiredFieldsMessage: {
    en: "Please fill all required fields",
    ti: "ኩሎም ክምልኡ ዘለዎም ሓበሬታ ምልኡ",
    zh: "请填写所有必填项",
  },
  requiredFieldsError: {
    en: "error: Please fill all required fields",
    ti: "ስሕተት፡ በይዘኦም ኩሎም ክምልኡ ዘለዎም ሓበሬታ ምልኡ",
    zh: "错误：请填写所有必填项",
  },
  gettingGps: {
    en: "Getting GPS coordinates...",
    ti: "ጂፒኤስ ኮርዲኔት ይረክብ ኣሎ…",
    zh: "正在获取 GPS 坐标…",
  },
  gpsObtained: {
    en: "GPS coordinates obtained",
    ti: "ጂፒኤስ ኮርዲኔት ተረኺቡ",
    zh: "已获取 GPS 坐标",
  },
  gpsError: { en: "GPS Error", ti: "GPS ጌጋ", zh: "GPS 错误" },
  pleaseSelectAtLeastOneNgo: {
    en: "Please select at least one NGO",
    ti: "እንተነኣሰ ሓደ ዘይመንግስታዊ ትካል ምረጹ",
    zh: "请至少选择一个 NGO",
  },
  selectedLabel: { en: "Selected: ", ti: "ዝተመረጸ: ", zh: "已选择：" },
  trauma: {
    en: "Visible Injuries (Trauma)",
    ti: "ጉድኣት አካል (Trauma)",
    zh: "可见伤情（创伤）",
  },
  traumaCuts: { en: "Cuts / lacerations", ti: "ቁርጥቆሽ / ቁርጥቆሽታት", zh: "割伤 / 裂伤" },
  traumaBruises: { en: "Bruises", ti: "ጉድኣት ቆዳ", zh: "瘀伤" },
  traumaBurns: { en: "Burns", ti: "ቃጠሎ", zh: "烧伤" },
  traumaFractures: { en: "Fractures", ti: "ስባር ዓጽሚ", zh: "骨折" },
  traumaHeadInjury: { en: "Head injury", ti: "ጉድኣት ርእሲ", zh: "头部受伤" },
  traumaGunshot: {
    en: "Gunshot / shrapnel",
    ti: "ጥይት / ቁራጽ ብረት",
    zh: "枪伤 / 弹片",
  },
  traumaSexualViolence: {
    en: "Signs of sexual violence",
    ti: "ምልክታት ዓመጽ ብዛዕባ ዝምድና",
    zh: "性暴力迹象",
  },
  traumaDehydration: {
    en: "Dehydration / malnutrition",
    ti: "ውሃ ማጽዋት / ምግቢ ማጽዋት",
    zh: "脱水 / 营养不良",
  },
  traumaOther: {
    en: "Other visible injury",
    ti: "ካልእ ዝረአ ጉድኣት",
    zh: "其他可见伤",
  },
  healthStatus: { en: "Health Condition", ti: "ኩነታት ጥዕና", zh: "健康状况" },
  enterHealthStatus: {
    en: "Describe your health condition",
    ti: "ኩነታት ጥዕናኹም ግለጹ",
    zh: "请描述您的健康状况",
  },
} as const;

export const ngoStrings = {
  dashboardTitle: { en: "NGO Dashboard", ti: "NGO Dashboard", zh: "NGO 控制台" },
  loggedInAsNgo: {
    en: "You are logged in as an NGO.",
    ti: "You are logged in as an NGO.",
    zh: "您已以救助机构身份登录。",
  },
  initInbox: {
    en: "Initialise NGO inbox",
    ti: "Initialise NGO inbox",
    zh: "初始化 NGO 收件箱",
  },
  initNeedNgoLogin: {
    en: "Please log in as an NGO first.",
    ti: "Please log in as an NGO first.",
    zh: "请先以救助机构身份登录。",
  },
  initNoPod: {
    en: "Could not detect your Pod base URL. Fill Pod and file first.",
    ti: "Could not detect your Pod base URL. Fill Pod and file first.",
    zh: "检测不到 Pod 地址。请先在「Pod 与文件」中填写，例如 https://ngo-11.solidcommunity.net/",
  },
  initChecking: {
    en: "Checking inbox status...",
    ti: "Checking inbox status...",
    zh: "正在检查收件箱…",
  },
  initAlready: {
    en: "NGO inbox already initialised! You can now go to the refugee page and grant access.",
    ti: "NGO inbox already initialised! You can now go to the refugee page and grant access.",
    zh: "NGO 收件箱已经初始化过。现在请到难民页面授权。",
  },
  initWorking: {
    en: "Initialising NGO inbox...",
    ti: "Initialising NGO inbox...",
    zh: "正在初始化 NGO 收件箱…",
  },
  initSuccess: {
    en: "NGO inbox initialised successfully. Now open the refugee page and grant this NGO WebID.",
    ti: "NGO inbox initialised successfully. Now open the refugee page and grant this NGO WebID.",
    zh: "NGO 收件箱初始化成功。请打开难民页面，把这个 NGO 的 WebID 加进去并授权。",
  },
  initError: {
    en: "Error initialising NGO inbox:",
    ti: "Error initialising NGO inbox:",
    zh: "初始化 NGO 收件箱失败：",
  },
  loadRefugees: {
    en: "Load refugees who granted you access",
    ti: "Load refugees who granted you access",
    zh: "加载已授权给您的难民",
  },
  hideCdm: {
    en: "Hide CDM documentation",
    ti: "Hide CDM documentation",
    zh: "隐藏 CDM 文档",
  },
  showCdm: {
    en: "Show CDM documentation",
    ti: "Show CDM documentation",
    zh: "显示 CDM 文档",
  },
  refugeesGranted: {
    en: "Refugees who granted access",
    ti: "Refugees who granted access",
    zh: "已授权的难民",
  },
  refugeeWebId: { en: "Refugee WebID:", ti: "Refugee WebID:", zh: "难民 WebID：" },
  emergencyFile: { en: "Emergency file:", ti: "Emergency file:", zh: "应急文件：" },
  grantedAt: { en: "Granted at:", ti: "Granted at:", zh: "授权时间：" },
  cdmDocsTitle: {
    en: "CDM Ontology documentation",
    ti: "CDM Ontology documentation",
    zh: "CDM 本体文档",
  },
  cdmDocsIntro: {
    en: "The terms below are loaded directly from the CDM ontology (cdm_sord.ttl). Use these property names when writing SPARQL queries against refugees' emergency data.",
    ti: "The terms below are loaded directly from the CDM ontology (cdm_sord.ttl). Use these property names when writing SPARQL queries against refugees' emergency data.",
    zh: "以下术语直接来自 CDM 本体（cdm_sord.ttl）。对难民应急数据写 SPARQL 查询时请使用这些属性名。",
  },
  loadingCdm: {
    en: "Loading CDM documentation…",
    ti: "Loading CDM documentation…",
    zh: "正在加载 CDM 文档…",
  },
  coreClasses: { en: "Core classes", ti: "Core classes", zh: "核心类" },
  recordProperties: {
    en: "Record properties",
    ti: "Record properties",
    zh: "记录属性",
  },
  victimProperties: {
    en: "Victim properties",
    ti: "Victim properties",
    zh: "受害人属性",
  },
  locationProperties: {
    en: "Location properties",
    ti: "Location properties",
    zh: "地点属性",
  },
  situationProperties: {
    en: "Situation and needs properties",
    ti: "Situation and needs properties",
    zh: "处境与需求属性",
  },
  querying: { en: "Querying...", ti: "Querying...", zh: "正在查询..." },
  queryData: { en: "Query Data", ti: "Query Data", zh: "查询数据" },
  exitCustomMode: {
    en: "Exit Custom Mode",
    ti: "Exit Custom Mode",
    zh: "退出自定义模式",
  },
  enterCustomMode: {
    en: "Enter Custom Query Mode",
    ti: "Enter Custom Query Mode",
    zh: "进入自定义查询模式",
  },
  filterData: { en: "Filter Data", ti: "Filter Data", zh: "筛选数据" },
  selectField: { en: "Select Field:", ti: "Select Field:", zh: "选择字段：" },
  selectValue: { en: "Select Value:", ti: "Select Value:", zh: "选择值：" },
  allNoFilter: { en: "All (No Filter)", ti: "All (No Filter)", zh: "全部（不筛选）" },
  all: { en: "All", ti: "All", zh: "全部" },
  visualize: { en: "Visualize", ti: "Visualize", zh: "可视化" },
  queryBuilder: {
    en: "Query Builder Chain",
    ti: "Query Builder Chain",
    zh: "查询构建链",
  },
  readableQuery: { en: "Readable query:", ti: "Readable query:", zh: "可读查询：" },
  noFilters: { en: "(no filters)", ti: "(no filters)", zh: "（无筛选）" },
  noFiltersYet: {
    en: "No filters yet. Start by adding a filter.",
    ti: "No filters yet. Start by adding a filter.",
    zh: "还没有筛选条件。请先添加一个筛选。",
  },
  addFilterField: {
    en: "1. Add Filter (Field)",
    ti: "1. Add Filter (Field)",
    zh: "1. 添加筛选（字段）",
  },
  addCondition: {
    en: "2. Add Condition",
    ti: "2. Add Condition",
    zh: "2. 添加条件",
  },
  addValue: { en: "3. Add Value", ti: "3. Add Value", zh: "3. 添加值" },
  add: { en: "Add", ti: "Add", zh: "添加" },
  greaterOrEqual: {
    en: "Greater Than or Equal",
    ti: "Greater Than or Equal",
    zh: "大于或等于",
  },
  lessOrEqual: {
    en: "Less Than or Equal",
    ti: "Less Than or Equal",
    zh: "小于或等于",
  },
  deleteLast: { en: "Delete Last", ti: "Delete Last", zh: "删除上一项" },
  running: { en: "Running...", ti: "Running...", zh: "正在运行..." },
  runQuery: { en: "Run Query", ti: "Run Query", zh: "运行查询" },
  detailedData: {
    en: "Detailed Refugee Data",
    ti: "Detailed Refugee Data",
    zh: "难民详细数据",
  },
  records: { en: "records", ti: "records", zh: "条记录" },
  viewDetailed: {
    en: "View detailed refugee data",
    ti: "View detailed refugee data",
    zh: "查看难民详细数据",
  },
  noResults: { en: "No results", ti: "No results", zh: "没有结果" },
  fieldCountry: { en: "Country", ti: "Country", zh: "国家" },
  fieldTown: { en: "Town", ti: "Town", zh: "城镇" },
  fieldNationality: { en: "Nationality", ti: "Nationality", zh: "国籍" },
  fieldLocationType: { en: "Location Type", ti: "Location Type", zh: "地点类型" },
  fieldAccommodation: { en: "Accommodation", ti: "Accommodation", zh: "住宿" },
  fieldNeeds: { en: "Needs", ti: "Needs", zh: "需求" },
  fieldAge: { en: "Age", ti: "Age", zh: "年龄" },
  fieldVictims: {
    en: "Number of Victims",
    ti: "Number of Victims",
    zh: "受害人数",
  },
  fieldDate: { en: "Date", ti: "Date", zh: "日期" },
  fieldCategory: { en: "Category", ti: "Category", zh: "类别" },
  fieldState: { en: "State / Region", ti: "State / Region", zh: "州 / 地区" },
  fieldVillage: { en: "Village", ti: "Village", zh: "村庄" },
  fieldLocationName: { en: "Location Name", ti: "Location Name", zh: "地点名称" },
  fieldCaptivity: {
    en: "Captivity Status",
    ti: "Captivity Status",
    zh: "拘禁状态",
  },
  fieldGender: { en: "Gender", ti: "Gender", zh: "性别" },
  fieldWhyNeedHelp: { en: "Why Need Help", ti: "Why Need Help", zh: "求助原因" },
  fieldUploadedPicture: {
    en: "Uploaded Picture",
    ti: "Uploaded Picture",
    zh: "已上传图片",
  },
  equals: { en: "Equals", ti: "Equals", zh: "等于" },
  greaterThan: { en: "Greater Than", ti: "Greater Than", zh: "大于" },
  lessThan: { en: "Less Than", ti: "Less Than", zh: "小于" },
  victims: { en: "Victims", ti: "Victims", zh: "受害人" },
} as const;
