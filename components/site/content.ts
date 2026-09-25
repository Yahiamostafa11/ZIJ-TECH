/**
 * Public site copy in English and Arabic. Every claim here comes from the
 * company; keep it factual when editing.
 */

export type SiteLocale = "en" | "ar";

export const LINKS = {
  stemVerify: "https://www.stem.net/verify/194897390",
  shoroukMap: "https://maps.app.goo.gl/moGQUUSSx94Cs6sP6",
};

export type DivisionKey = "academy" | "software" | "iot";

type WorkItem = {
  key: string;
  name: string;
  url?: string;
  /** Screenshot under /public/work; the card shows a styled placeholder until one exists. */
  image?: string;
  division: DivisionKey;
  kind: string;
  note: string;
};

export type SiteCopy = {
  dir: "ltr" | "rtl";
  nav: { academy: string; software: string; iot: string; work: string; contact: string; signIn: string; cta: string; language: string; languageHref: string; menu: string };
  hero: { eyebrow: string; titleLead: string; titleAccent: string; body: string; primary: string; secondary: string };
  divisionsShort: Record<DivisionKey, { title: string; body: string; cta: string }>;
  proof: { accredited: string; accreditedSub: string; verify: string; stats: { value: string; label: string }[] };
  academy: {
    eyebrow: string;
    title: string;
    body: string;
    points: { title: string; body: string }[];
    cta: string;
    directions: string;
    branch: string;
    certificateTitle: string;
    certificateBody: string;
    certificateId: string;
  };
  software: { eyebrow: string; title: string; body: string; points: { title: string; body: string }[]; cta: string };
  iot: { eyebrow: string; title: string; body: string; points: { title: string; body: string }[]; cta: string };
  work: { eyebrow: string; title: string; body: string; visit: string; privateNote: string; items: WorkItem[] };
  why: { title: string; points: { title: string; body: string }[] };
  contact: {
    eyebrow: string;
    title: string;
    body: string;
    division: string;
    divisions: Record<DivisionKey | "other", string>;
    name: string;
    email: string;
    phone: string;
    message: string;
    messagePlaceholder: string;
    send: string;
    sending: string;
    sent: string;
    failed: string;
    timeout: string;
  };
  footer: { tagline: string; divisions: string; company: string; portal: string; rights: string; branch: string };
};

const WORK_EN: WorkItem[] = [
  {
    key: "dental",
    name: "Dental Lab System",
    image: "/work/dental-lab.webp",
    division: "software",
    kind: "SaaS · Our own product",
    note: "Cases, work types and prices, doctors, invoices and revenue reports for dental laboratories, built by ZIJ from the ground up.",
  },
  {
    key: "iot-maintenance",
    name: "IoT Predictive Maintenance",
    image: "/work/iot-maintenance.webp",
    division: "iot",
    kind: "IoT · Embedded · Industry",
    note: "An ESP32-S3 sensor node streams machine vibration over MQTT. The dashboard raises warning and critical alarms and explains the likely fault, such as bearing wear or unbalance.",
  },
  {
    key: "digital-twin",
    name: "Robotic Arm Digital Twin",
    division: "iot",
    kind: "Robotics · Control · Simulation",
    note: "A live digital model of a robotic arm, mirroring the real machine for monitoring and control.",
  },
  {
    key: "academy-portal",
    name: "Zij Academy Portal",
    image: "/work/academy-portal.webp",
    division: "academy",
    kind: "LMS · Our own platform",
    note: "The bilingual system that runs Zij Academy: students, groups, payments, Excel import and parent accounts.",
  },
  {
    key: "styliiiish",
    name: "Styliiiish",
    url: "https://styliiiish.com/",
    image: "/work/styliiiish.webp",
    division: "software",
    kind: "Custom web platform",
    note: "A bilingual platform to buy, rent and resell occasion dresses. Designed and developed by ZIJ.",
  },
  {
    key: "masar-vet",
    name: "Masar Vet",
    url: "https://masar-vet.com/",
    image: "/work/masar-vet.webp",
    division: "software",
    kind: "Custom web platform",
    note: "Bilingual site for a veterinary and animal reproduction company: cattle and buffalo genetics, breeds and products. Designed and developed by ZIJ.",
  },
  {
    key: "bayodent",
    name: "Bayodent Lab",
    url: "https://bayodent-lab.com/",
    image: "/work/bayodent.webp",
    division: "software",
    kind: "WordPress website",
    note: "Website for a dental prosthetics lab (implants, crown and bridge, esthetic work) where dentists can send cases. Designed and hosted by ZIJ.",
  },
  {
    key: "vastr",
    name: "Vastr",
    url: "https://vastr.store/",
    image: "/work/vastr.webp",
    division: "software",
    kind: "WordPress store",
    note: "Online store for a premium cotton T-shirt brand. Designed by ZIJ.",
  },
];

const WORK_AR: WorkItem[] = [
  { ...WORK_EN[0], name: "نظام معامل الأسنان", kind: "SaaS · منتج خاص بنا", note: "الحالات وأنواع الشغل والأسعار والأطباء والفواتير وتقارير الإيرادات لمعامل الأسنان، طوّرته زيج من الصفر." },
  { ...WORK_EN[1], name: "الصيانة التنبؤية بإنترنت الأشياء", kind: "إنترنت الأشياء · أنظمة مدمجة · صناعة", note: "حساس مبني على ESP32-S3 يرسل اهتزازات الماكينة عبر MQTT، ولوحة المتابعة تطلق إنذارات التحذير والخطر وتشرح العطل المحتمل مثل تآكل الرولمان أو عدم الاتزان." },
  { ...WORK_EN[2], name: "التوأم الرقمي لذراع روبوتية", kind: "روبوتات · تحكم · محاكاة", note: "نموذج رقمي حي لذراع روبوتية يحاكي الماكينة الحقيقية للمراقبة والتحكم." },
  { ...WORK_EN[3], name: "بوابة أكاديمية زيج", kind: "نظام إدارة تعليم · منصتنا الخاصة", note: "النظام ثنائي اللغة الذي يدير أكاديمية زيج: الطلاب والمجموعات والمدفوعات واستيراد Excel وحسابات أولياء الأمور." },
  { ...WORK_EN[4], kind: "منصة ويب مخصصة", note: "منصة ثنائية اللغة لشراء وإيجار وإعادة بيع فساتين المناسبات. تصميم وتطوير زيج." },
  { ...WORK_EN[5], name: "مسار", kind: "منصة ويب مخصصة", note: "موقع ثنائي اللغة لشركة حلول بيطرية وتلقيح صناعي: جينات الأبقار والجاموس والسلالات والمنتجات. تصميم وتطوير زيج." },
  { ...WORK_EN[6], name: "بايودنت لاب", kind: "موقع ووردبريس", note: "موقع لمعمل تركيبات أسنان (زراعات، تيجان وجسور، تجميل) يرسل منه الأطباء حالاتهم. تصميم واستضافة زيج." },
  { ...WORK_EN[7], kind: "متجر ووردبريس", note: "متجر إلكتروني لعلامة تيشيرتات قطنية فاخرة. تصميم زيج." },
];

export const SITE_COPY: Record<SiteLocale, SiteCopy> = {
  en: {
    dir: "ltr",
    nav: {
      academy: "Academy",
      software: "Software",
      iot: "IoT & Robotics",
      work: "Work",
      contact: "Contact",
      signIn: "Sign in",
      cta: "Get in touch",
      language: "العربية",
      languageHref: "/ar",
      menu: "Toggle navigation menu",
    },
    hero: {
      eyebrow: "ZIJ Technologies · Egypt",
      titleLead: "From classrooms",
      titleAccent: "to factories.",
      body: "We build software, connected hardware and the next generation of engineers. Three divisions, one standard of craft.",
      primary: "Explore our divisions",
      secondary: "See our work",
    },
    divisionsShort: {
      academy: { title: "Zij Academy", body: "Programming and robotics for kids, online and in our El Shorouk branch.", cta: "Book a trial class" },
      software: { title: "Software", body: "Custom platforms, SaaS, e-commerce and automation for growing businesses.", cta: "Start a project" },
      iot: { title: "IoT & Robotics", body: "Embedded systems, digital twins and control solutions for industry.", cta: "Talk to an engineer" },
    },
    proof: {
      accredited: "STEM.org Accredited™",
      accreditedSub: "Educational Experience",
      verify: "Verify",
      stats: [
        { value: "100+", label: "students taught at Zij Academy" },
        { value: "30+", label: "projects delivered" },
        { value: "5 yrs", label: "building software" },
        { value: "3 yrs", label: "in IoT & hardware" },
      ],
    },
    academy: {
      eyebrow: "Zij Academy",
      title: "Young minds, real engineering.",
      body: "Children learn programming and robotics by building things that move, react and think — in small groups, level by level.",
      points: [
        { title: "Online or in the branch", body: "Online groups of 2–5 students, or groups of 6–10 at our El Shorouk branch." },
        { title: "Level by level", body: "Each level is 12 sessions with a final assessment. Students who need it get extra support sessions before moving up." },
        { title: "Parents stay informed", body: "Regular updates on attendance and progress, with messages straight from the instructor." },
      ],
      cta: "Book a trial class",
      directions: "Get directions",
      branch: "El Shorouk branch",
      certificateTitle: "Officially STEM.org Accredited",
      certificateBody: "Zij Academy holds the STEM.org Accredited™ Educational Experience credential, verifiable online.",
      certificateId: "Credential ID #194897390 · Blockchain secured",
    },
    software: {
      eyebrow: "Software division",
      title: "Systems that run the business.",
      body: "From a first website to a full SaaS, we design, build and host software that owners actually use every day.",
      points: [
        { title: "Custom platforms & SaaS", body: "Web applications built around how your team works, not the other way round." },
        { title: "E-commerce & websites", body: "Stores and company sites that are fast and easy to update." },
        { title: "Automation & integrations", body: "Connect the tools you already use and remove repetitive work." },
        { title: "Dashboards & data", body: "Clear reports that turn daily operations into decisions." },
      ],
      cta: "Start a project",
    },
    iot: {
      eyebrow: "IoT, Embedded & Robotics",
      title: "Machines that report, predict and respond.",
      body: "We connect physical equipment to software: sensors, controllers and live digital models that keep production running.",
      points: [
        { title: "Predictive maintenance", body: "Sensor data that flags failing equipment before it stops a line." },
        { title: "Digital twins", body: "Live virtual models of machines for monitoring, testing and control." },
        { title: "Embedded & control", body: "Firmware, controllers and robotics built for real factory conditions." },
      ],
      cta: "Talk to an engineer",
    },
    work: {
      eyebrow: "Selected work",
      title: "Built and shipped by ZIJ.",
      body: "A few of the 30+ projects we have delivered across software and hardware.",
      visit: "Visit site",
      privateNote: "Private system · shown on request",
      items: WORK_EN,
    },
    why: {
      title: "Why ZIJ",
      points: [
        { title: "One team, three disciplines", body: "Software, hardware and teaching under one roof." },
        { title: "Built to last", body: "Secure, maintainable systems you own, with clear handover." },
        { title: "Arabic and English", body: "Interfaces and support in both languages from day one." },
        { title: "Proven", body: "An accredited academy and 30+ delivered projects." },
      ],
    },
    contact: {
      eyebrow: "Contact",
      title: "Tell us what you need.",
      body: "Choose the division and we'll get back to you soon.",
      division: "I'm interested in",
      divisions: { academy: "Zij Academy (classes for my child)", software: "Software project", iot: "IoT / robotics project", other: "Something else" },
      name: "Full name",
      email: "Email",
      phone: "Phone / WhatsApp (optional)",
      message: "Message",
      messagePlaceholder: "Tell us about your project or your child's age and interests…",
      send: "Send message",
      sending: "Sending…",
      sent: "Thank you — your message was sent.",
      failed: "The message could not be sent. Please try again.",
      timeout: "Sending took too long. Please check your connection and try again.",
    },
    footer: {
      tagline: "Software, connected hardware and STEM education.",
      divisions: "Divisions",
      company: "Company",
      portal: "Client portal",
      rights: "All rights reserved.",
      branch: "El Shorouk branch",
    },
  },
  ar: {
    dir: "rtl",
    nav: {
      academy: "الأكاديمية",
      software: "البرمجيات",
      iot: "إنترنت الأشياء والروبوتات",
      work: "أعمالنا",
      contact: "تواصل معنا",
      signIn: "تسجيل الدخول",
      cta: "تواصل معنا",
      language: "English",
      languageHref: "/",
      menu: "فتح قائمة التنقل",
    },
    hero: {
      eyebrow: "زيج للتكنولوجيا · مصر",
      titleLead: "من الفصول الدراسية",
      titleAccent: "إلى المصانع.",
      body: "نبني البرمجيات والأجهزة المتصلة، ونُعِدّ الجيل القادم من المهندسين. ثلاثة أقسام، ومعيار واحد للإتقان.",
      primary: "استكشف أقسامنا",
      secondary: "شاهد أعمالنا",
    },
    divisionsShort: {
      academy: { title: "أكاديمية زيج", body: "برمجة وروبوتات للأطفال، أونلاين وفي فرعنا بالشروق.", cta: "احجز حصة تجريبية" },
      software: { title: "البرمجيات", body: "منصات مخصصة وأنظمة SaaS ومتاجر إلكترونية وأتمتة للشركات.", cta: "ابدأ مشروعك" },
      iot: { title: "إنترنت الأشياء والروبوتات", body: "أنظمة مدمجة وتوائم رقمية وحلول تحكم للصناعة.", cta: "تحدث مع مهندس" },
    },
    proof: {
      accredited: "معتمدة من STEM.org™",
      accreditedSub: "تجربة تعليمية معتمدة",
      verify: "تحقق",
      stats: [
        { value: "+100", label: "طالب تعلّموا في أكاديمية زيج" },
        { value: "+30", label: "مشروعًا تم تسليمه" },
        { value: "5 سنوات", label: "في تطوير البرمجيات" },
        { value: "3 سنوات", label: "في إنترنت الأشياء والأجهزة" },
      ],
    },
    academy: {
      eyebrow: "أكاديمية زيج",
      title: "عقول صغيرة، وهندسة حقيقية.",
      body: "يتعلم الأطفال البرمجة والروبوتات ببناء أشياء تتحرك وتستجيب وتفكر — في مجموعات صغيرة، مستوى بعد مستوى.",
      points: [
        { title: "أونلاين أو في الفرع", body: "مجموعات أونلاين من 2 إلى 5 طلاب، أو مجموعات من 6 إلى 10 في فرعنا بالشروق." },
        { title: "مستوى بعد مستوى", body: "كل مستوى 12 حصة وينتهي بتقييم. ومن يحتاج دعمًا إضافيًا يحصل على حصص تقوية قبل الانتقال." },
        { title: "ولي الأمر على اطلاع دائم", body: "متابعة منتظمة للحضور والتقدم، مع رسائل مباشرة من المدرّس." },
      ],
      cta: "احجز حصة تجريبية",
      directions: "الاتجاهات على الخريطة",
      branch: "فرع الشروق",
      certificateTitle: "معتمدة رسميًا من STEM.org",
      certificateBody: "حصلت أكاديمية زيج على اعتماد STEM.org Accredited™ للتجربة التعليمية، ويمكن التحقق منه عبر الإنترنت.",
      certificateId: "رقم الاعتماد #194897390 · مؤمَّن بتقنية البلوك تشين",
    },
    software: {
      eyebrow: "قسم البرمجيات",
      title: "أنظمة تُدير العمل.",
      body: "من أول موقع إلى منصة SaaS كاملة، نصمم ونطوّر ونستضيف برمجيات يستخدمها أصحابها كل يوم.",
      points: [
        { title: "منصات مخصصة وأنظمة SaaS", body: "تطبيقات ويب مبنية على طريقة عمل فريقك، لا العكس." },
        { title: "متاجر ومواقع إلكترونية", body: "متاجر ومواقع شركات سريعة وسهلة التحديث." },
        { title: "أتمتة وربط الأنظمة", body: "ربط الأدوات التي تستخدمها بالفعل والتخلص من العمل المتكرر." },
        { title: "لوحات تحكم وبيانات", body: "تقارير واضحة تحوّل العمل اليومي إلى قرارات." },
      ],
      cta: "ابدأ مشروعك",
    },
    iot: {
      eyebrow: "إنترنت الأشياء والأنظمة المدمجة والروبوتات",
      title: "ماكينات تُبلّغ وتتنبأ وتستجيب.",
      body: "نربط المعدات الفعلية بالبرمجيات: حساسات ووحدات تحكم ونماذج رقمية حية تُبقي الإنتاج مستمرًا.",
      points: [
        { title: "الصيانة التنبؤية", body: "بيانات الحساسات تنبّه لأعطال المعدات قبل أن توقف خط الإنتاج." },
        { title: "التوائم الرقمية", body: "نماذج افتراضية حية للماكينات للمراقبة والاختبار والتحكم." },
        { title: "أنظمة مدمجة وتحكم", body: "برمجيات ثابتة ووحدات تحكم وروبوتات مصممة لظروف المصانع الحقيقية." },
      ],
      cta: "تحدث مع مهندس",
    },
    work: {
      eyebrow: "مختارات من أعمالنا",
      title: "صُنعت وسُلِّمت بواسطة زيج.",
      body: "نماذج من أكثر من 30 مشروعًا سلّمناها في البرمجيات والأجهزة.",
      visit: "زيارة الموقع",
      privateNote: "نظام خاص · يُعرض عند الطلب",
      items: WORK_AR,
    },
    why: {
      title: "لماذا زيج",
      points: [
        { title: "فريق واحد وثلاثة تخصصات", body: "البرمجيات والأجهزة والتعليم تحت سقف واحد." },
        { title: "مبني ليدوم", body: "أنظمة آمنة وسهلة الصيانة تمتلكها بالكامل، مع تسليم واضح." },
        { title: "بالعربية والإنجليزية", body: "واجهات ودعم باللغتين من اليوم الأول." },
        { title: "خبرة مثبتة", body: "أكاديمية معتمدة وأكثر من 30 مشروعًا تم تسليمه." },
      ],
    },
    contact: {
      eyebrow: "تواصل معنا",
      title: "أخبرنا بما تحتاجه.",
      body: "اختر القسم وسنتواصل معك قريبًا.",
      division: "أنا مهتم بـ",
      divisions: { academy: "أكاديمية زيج (حصص لطفلي)", software: "مشروع برمجي", iot: "مشروع إنترنت أشياء / روبوتات", other: "شيء آخر" },
      name: "الاسم بالكامل",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف / واتساب (اختياري)",
      message: "الرسالة",
      messagePlaceholder: "حدثنا عن مشروعك أو عن سن طفلك واهتماماته…",
      send: "إرسال الرسالة",
      sending: "جارٍ الإرسال…",
      sent: "شكرًا لك — تم إرسال رسالتك.",
      failed: "تعذر إرسال الرسالة. حاول مرة أخرى.",
      timeout: "استغرق الإرسال وقتًا طويلًا. تحقق من الاتصال وحاول مرة أخرى.",
    },
    footer: {
      tagline: "برمجيات وأجهزة متصلة وتعليم STEM.",
      divisions: "الأقسام",
      company: "الشركة",
      portal: "بوابة العملاء",
      rights: "جميع الحقوق محفوظة.",
      branch: "فرع الشروق",
    },
  },
};
