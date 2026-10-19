import type { routing } from '@/routing';

/**
 * The job offers shown at /jobs. Each one gets its own page at
 * /jobs/<slug> (and /<locale>/jobs/<slug> for every site language), which is
 * the link to share in the job post; applications from it are emailed by
 * `sendJobApplication`.
 *
 * To post a job, add an entry here and redeploy. To stop taking applications,
 * set `open: false` rather than deleting the entry: the page keeps loading and
 * tells visitors the position is closed, so links already shared don't 404.
 *
 * Every text needs a version in every site language — the `Localized` type
 * makes a missing one a compile error, so a job can't go live half-translated.
 */

/**
 * Upper bound for the optional CV. Vercel rejects function request bodies
 * over 4.5 MB before our code runs, so the cap sits under that with room for
 * the text fields. `serverActions.bodySizeLimit` in next.config.ts is set just
 * above it so Next itself doesn't reject the upload at its 1 MB default.
 */
export const MAX_CV_BYTES = 4 * 1024 * 1024;

export type AppLocale = (typeof routing.locales)[number];

export type Localized = Record<AppLocale, string>;

export interface Job {
  /** URL segment: lowercase letters, digits and hyphens. Never change it once shared. */
  slug: string;
  open: boolean;
  title: Localized;
  /** e.g. "Porto · Hybrid". */
  location: Localized;
  /** e.g. "Full-time", "Internship". */
  employmentType: Localized;
  /** One line, used on the list and as the link-preview description. */
  summary: Localized;
  /** Intro paragraphs, separated by a blank line. */
  description: Localized;
  responsibilities: Localized[];
  requirements: Localized[];
  niceToHave?: Localized[];
  /** What iFound offers. */
  offer?: Localized[];
}

export const JOBS: Job[] = [
  {
    slug: 'community-specialist',
    open: true,
    title: {
      en: 'Community Specialist',
      pt: 'Community Specialist',
      es: 'Community Specialist',
      fr: 'Community Specialist',
      it: 'Community Specialist',
      de: 'Community Specialist',
      hu: 'Community Specialist',
      el: 'Community Specialist',
      tr: 'Community Specialist',
      pl: 'Community Specialist',
      ro: 'Community Specialist',
      nl: 'Community Specialist',
    },
    location: {
      en: 'Remote',
      pt: 'Remoto',
      es: 'Remoto',
      fr: 'Télétravail',
      it: 'Da remoto',
      de: 'Remote',
      hu: 'Távmunka',
      el: 'Εξ αποστάσεως',
      tr: 'Uzaktan',
      pl: 'Zdalnie',
      ro: 'La distanță',
      nl: 'Op afstand',
    },
    employmentType: {
      en: 'Flexible hours',
      pt: 'Horário flexível',
      es: 'Horario flexible',
      fr: 'Horaires flexibles',
      it: 'Orario flessibile',
      de: 'Flexible Arbeitszeiten',
      hu: 'Rugalmas munkaidő',
      el: 'Ευέλικτο ωράριο',
      tr: 'Esnek çalışma saatleri',
      pl: 'Elastyczne godziny',
      ro: 'Program flexibil',
      nl: 'Flexibele uren',
    },
    summary: {
      en: 'Help people find what they lost by bringing iFound to Facebook lost and found groups.',
      pt: 'Ajude pessoas a encontrar o que perderam, levando a iFound aos grupos de perdidos e achados no Facebook.',
      es: 'Ayuda a las personas a encontrar lo que perdieron llevando iFound a los grupos de objetos perdidos de Facebook.',
      fr: "Aidez les gens à retrouver ce qu'ils ont perdu en faisant connaître iFound dans les groupes Facebook d'objets perdus et trouvés.",
      it: 'Aiuta le persone a ritrovare ciò che hanno perso portando iFound nei gruppi Facebook di oggetti smarriti e ritrovati.',
      de: 'Helfen Sie Menschen, Verlorenes wiederzufinden, indem Sie iFound in Facebook-Gruppen für Fundsachen bekannt machen.',
      hu: 'Segíts az embereknek megtalálni, amit elvesztettek, azzal, hogy megismerteted az iFoundot a Facebook elveszett-talált csoportjaiban.',
      el: 'Βοήθησε τους ανθρώπους να βρουν ό,τι έχασαν, φέρνοντας την iFound στις ομάδες απολεσθέντων αντικειμένων στο Facebook.',
      tr: "iFound'u Facebook'taki kayıp eşya gruplarına taşıyarak insanların kaybettiklerini bulmalarına yardım et.",
      pl: 'Pomagaj ludziom odnaleźć to, co zgubili, promując iFound w facebookowych grupach rzeczy zgubionych i znalezionych.',
      ro: 'Ajută oamenii să găsească ce au pierdut, aducând iFound în grupurile de obiecte pierdute și găsite de pe Facebook.',
      nl: 'Help mensen terugvinden wat ze kwijt zijn door iFound onder de aandacht te brengen in Facebookgroepen voor verloren en gevonden voorwerpen.',
    },
    description: {
      en: 'iFound, the lost and found platform that connects people searching for lost items, pets and vehicles, is growing its team.\n\nWe are looking for responsible, proactive people for a digital outreach role. The work consists of engaging with posts in Facebook lost and found groups, introducing iFound to users who could benefit from the platform.\n\nIf you are looking for a flexible opportunity and want to join an innovative, growing project, apply below. We will be happy to walk you through the role and explain the conditions.',
      pt: 'A iFound, a plataforma de perdidos e achados que liga pessoas à procura de objetos, animais e veículos perdidos, está a reforçar a sua equipa.\n\nProcuramos pessoas responsáveis e proativas para uma função de divulgação digital. O trabalho consiste em interagir com publicações de grupos de perdidos e achados no Facebook, promovendo a iFound junto de utilizadores que possam beneficiar da plataforma.\n\nSe procura uma oportunidade com flexibilidade e integração num projeto inovador e em crescimento, candidate-se abaixo. Teremos todo o gosto em apresentar a função e esclarecer as condições da oportunidade.',
      es: 'iFound, la plataforma de objetos perdidos que conecta a quienes buscan objetos, animales y vehículos perdidos, está ampliando su equipo.\n\nBuscamos personas responsables y proactivas para un puesto de difusión digital. El trabajo consiste en interactuar con publicaciones de grupos de objetos perdidos en Facebook, dando a conocer iFound a usuarios que puedan beneficiarse de la plataforma.\n\nSi buscas una oportunidad flexible y quieres formar parte de un proyecto innovador y en crecimiento, envía tu candidatura abajo. Estaremos encantados de presentarte el puesto y explicarte las condiciones.',
      fr: "iFound, la plateforme d'objets perdus et trouvés qui met en relation les personnes à la recherche d'objets, d'animaux et de véhicules perdus, renforce son équipe.\n\nNous recherchons des personnes responsables et proactives pour un poste de promotion digitale. La mission consiste à interagir avec les publications des groupes Facebook d'objets perdus et trouvés, afin de faire connaître iFound aux utilisateurs qui pourraient en bénéficier.\n\nSi vous cherchez une opportunité flexible et souhaitez rejoindre un projet innovant et en pleine croissance, postulez ci-dessous. Nous serons ravis de vous présenter le poste et de vous expliquer les conditions.",
      it: "iFound, la piattaforma di oggetti smarriti e ritrovati che mette in contatto chi cerca oggetti, animali e veicoli smarriti, sta ampliando il suo team.\n\nCerchiamo persone responsabili e proattive per un ruolo di promozione digitale. Il lavoro consiste nell'interagire con i post dei gruppi Facebook di oggetti smarriti e ritrovati, facendo conoscere iFound agli utenti che possono trarne beneficio.\n\nSe cerchi un'opportunità flessibile e vuoi entrare in un progetto innovativo e in crescita, candidati qui sotto. Saremo felici di presentarti il ruolo e spiegarti le condizioni.",
      de: 'iFound, die Fundbüro-Plattform, die Menschen auf der Suche nach verlorenen Gegenständen, Tieren und Fahrzeugen zusammenbringt, verstärkt ihr Team.\n\nWir suchen verantwortungsbewusste und proaktive Menschen für eine Rolle im digitalen Outreach. Ihre Aufgabe ist es, mit Beiträgen in Facebook-Gruppen für Fundsachen zu interagieren und iFound bei Nutzern bekannt zu machen, die von der Plattform profitieren können.\n\nWenn Sie eine flexible Tätigkeit suchen und Teil eines innovativen, wachsenden Projekts werden möchten, bewerben Sie sich unten. Gerne stellen wir Ihnen die Rolle vor und erläutern die Konditionen.',
      hu: 'Az iFound, az elveszett és talált tárgyak platformja, amely összeköti az elveszett tárgyakat, állatokat és járműveket keresőket, bővíti a csapatát.\n\nFelelősségteljes és proaktív embereket keresünk digitális népszerűsítési feladatra. A munka lényege, hogy a Facebook elveszett-talált csoportjaiban reagálj a bejegyzésekre, és megismertesd az iFoundot azokkal, akiknek hasznos lehet a platform.\n\nHa rugalmas lehetőséget keresel, és szeretnél egy innovatív, növekvő projekt része lenni, jelentkezz lent. Szívesen bemutatjuk a feladatot és elmondjuk a feltételeket.',
      el: 'Η iFound, η πλατφόρμα απολεσθέντων αντικειμένων που φέρνει σε επαφή όσους αναζητούν χαμένα αντικείμενα, ζώα και οχήματα, ενισχύει την ομάδα της.\n\nΑναζητούμε υπεύθυνους και δραστήριους ανθρώπους για έναν ρόλο ψηφιακής προώθησης. Η δουλειά αφορά την αλληλεπίδραση με αναρτήσεις σε ομάδες απολεσθέντων αντικειμένων στο Facebook, γνωστοποιώντας την iFound σε χρήστες που μπορούν να ωφεληθούν από την πλατφόρμα.\n\nΑν ψάχνεις μια ευέλικτη ευκαιρία και θέλεις να γίνεις μέρος ενός καινοτόμου έργου που μεγαλώνει, κάνε αίτηση παρακάτω. Θα χαρούμε να σου παρουσιάσουμε τον ρόλο και να σου εξηγήσουμε τους όρους.',
      tr: "Kayıp eşya, hayvan ve araç arayan insanları bir araya getiren kayıp eşya platformu iFound, ekibini büyütüyor.\n\nDijital tanıtım rolü için sorumluluk sahibi ve proaktif kişiler arıyoruz. İş, Facebook'taki kayıp eşya gruplarındaki paylaşımlarla etkileşim kurmayı ve iFound'u platformdan faydalanabilecek kullanıcılara tanıtmayı kapsıyor.\n\nEsnek bir fırsat arıyorsan ve yenilikçi, büyüyen bir projenin parçası olmak istiyorsan aşağıdan başvur. Rolü sana tanıtmaktan ve koşulları açıklamaktan memnuniyet duyarız.",
      pl: 'iFound, platforma rzeczy zgubionych i znalezionych, która łączy osoby szukające zgubionych przedmiotów, zwierząt i pojazdów, powiększa swój zespół.\n\nSzukamy odpowiedzialnych i proaktywnych osób do roli związanej z promocją w internecie. Praca polega na reagowaniu na posty w facebookowych grupach rzeczy zgubionych i znalezionych oraz przedstawianiu iFound użytkownikom, którym platforma może pomóc.\n\nJeśli szukasz elastycznej pracy i chcesz dołączyć do innowacyjnego, rozwijającego się projektu, aplikuj poniżej. Chętnie przedstawimy Ci tę rolę i wyjaśnimy warunki.',
      ro: 'iFound, platforma de obiecte pierdute și găsite care pune în legătură oamenii care caută obiecte, animale și vehicule pierdute, își mărește echipa.\n\nCăutăm oameni responsabili și proactivi pentru un rol de promovare digitală. Munca presupune interacțiunea cu postările din grupurile de obiecte pierdute și găsite de pe Facebook, făcând cunoscută iFound utilizatorilor care pot beneficia de platformă.\n\nDacă îți dorești o oportunitate flexibilă și vrei să faci parte dintr-un proiect inovator și în creștere, aplică mai jos. Vom fi bucuroși să-ți prezentăm rolul și să-ți explicăm condițiile.',
      nl: 'iFound, het platform voor verloren en gevonden voorwerpen dat mensen verbindt die op zoek zijn naar verloren spullen, dieren en voertuigen, breidt het team uit.\n\nWe zoeken verantwoordelijke en proactieve mensen voor een functie in digitale promotie. Je reageert op berichten in Facebookgroepen voor verloren en gevonden voorwerpen en laat gebruikers die er baat bij hebben kennismaken met iFound.\n\nZoek je een flexibele kans en wil je deel uitmaken van een innovatief, groeiend project? Solliciteer hieronder. We vertellen je graag meer over de functie en de voorwaarden.',
    },
    responsibilities: [
      {
        en: 'Follow lost and found groups on Facebook and spot new posts about lost or found items, pets and vehicles',
        pt: 'Acompanhar grupos de perdidos e achados no Facebook e identificar novas publicações sobre objetos, animais e veículos perdidos ou encontrados',
        es: 'Seguir grupos de objetos perdidos en Facebook e identificar nuevas publicaciones sobre objetos, animales y vehículos perdidos o encontrados',
        fr: "Suivre les groupes Facebook d'objets perdus et trouvés et repérer les nouvelles publications sur des objets, animaux et véhicules perdus ou trouvés",
        it: 'Seguire i gruppi Facebook di oggetti smarriti e ritrovati e individuare i nuovi post su oggetti, animali e veicoli smarriti o ritrovati',
        de: 'Facebook-Gruppen für Fundsachen verfolgen und neue Beiträge zu verlorenen oder gefundenen Gegenständen, Tieren und Fahrzeugen erkennen',
        hu: 'Facebook elveszett-talált csoportok követése, és az elveszett vagy megtalált tárgyakról, állatokról és járművekről szóló új bejegyzések kiszúrása',
        el: 'Παρακολούθηση ομάδων απολεσθέντων αντικειμένων στο Facebook και εντοπισμός νέων αναρτήσεων για χαμένα ή ευρεθέντα αντικείμενα, ζώα και οχήματα',
        tr: "Facebook'taki kayıp eşya gruplarını takip etmek ve kayıp ya da bulunmuş eşya, hayvan ve araçlarla ilgili yeni paylaşımları tespit etmek",
        pl: 'Śledzenie facebookowych grup rzeczy zgubionych i znalezionych oraz wyszukiwanie nowych postów o zgubionych lub znalezionych przedmiotach, zwierzętach i pojazdach',
        ro: 'Urmărirea grupurilor de obiecte pierdute și găsite de pe Facebook și identificarea postărilor noi despre obiecte, animale și vehicule pierdute sau găsite',
        nl: 'Facebookgroepen voor verloren en gevonden voorwerpen volgen en nieuwe berichten over verloren of gevonden spullen, dieren en voertuigen opmerken',
      },
      {
        en: 'Reply to posts with helpful, friendly comments that show how iFound can help',
        pt: 'Responder às publicações com comentários úteis e simpáticos que mostrem como a iFound pode ajudar',
        es: 'Responder a las publicaciones con comentarios útiles y amables que muestren cómo puede ayudar iFound',
        fr: 'Répondre aux publications avec des commentaires utiles et bienveillants qui montrent comment iFound peut aider',
        it: 'Rispondere ai post con commenti utili e cordiali che mostrino come iFound può aiutare',
        de: 'Auf Beiträge mit hilfreichen, freundlichen Kommentaren antworten, die zeigen, wie iFound helfen kann',
        hu: 'Hasznos, barátságos hozzászólások írása, amelyek megmutatják, hogyan segíthet az iFound',
        el: 'Απάντηση στις αναρτήσεις με χρήσιμα και φιλικά σχόλια που δείχνουν πώς μπορεί να βοηθήσει η iFound',
        tr: "Paylaşımlara iFound'un nasıl yardımcı olabileceğini gösteren faydalı ve samimi yorumlarla yanıt vermek",
        pl: 'Odpowiadanie na posty pomocnymi, życzliwymi komentarzami, które pokazują, jak iFound może pomóc',
        ro: 'Răspunsuri la postări cu comentarii utile și prietenoase care arată cum poate ajuta iFound',
        nl: 'Op berichten reageren met behulpzame, vriendelijke opmerkingen die laten zien hoe iFound kan helpen',
      },
      {
        en: 'Invite people to publish their case on iFound so it reaches more people nearby',
        pt: 'Convidar as pessoas a publicar o seu caso na iFound para chegar a mais pessoas na zona',
        es: 'Invitar a las personas a publicar su caso en iFound para que llegue a más gente de la zona',
        fr: 'Inviter les personnes à publier leur cas sur iFound pour toucher davantage de monde à proximité',
        it: 'Invitare le persone a pubblicare il loro caso su iFound per raggiungere più persone in zona',
        de: 'Menschen einladen, ihren Fall auf iFound zu veröffentlichen, damit er mehr Leute in der Nähe erreicht',
        hu: 'Az emberek bátorítása, hogy tegyék közzé az esetüket az iFoundon, így több közeli emberhez jut el',
        el: 'Πρόσκληση στους ανθρώπους να δημοσιεύσουν την περίπτωσή τους στην iFound ώστε να φτάσει σε περισσότερους κοντά τους',
        tr: "İnsanları, daha fazla yakındaki kişiye ulaşması için durumlarını iFound'da paylaşmaya davet etmek",
        pl: 'Zachęcanie ludzi do opublikowania swojej sprawy w iFound, aby dotarła do większej liczby osób w okolicy',
        ro: 'Invitarea oamenilor să-și publice cazul pe iFound, ca să ajungă la mai multe persoane din apropiere',
        nl: 'Mensen uitnodigen hun melding op iFound te plaatsen, zodat die meer mensen in de buurt bereikt',
      },
      {
        en: "Represent iFound with a respectful, human tone that follows each group's rules",
        pt: 'Representar a iFound com um tom humano e respeitoso, cumprindo as regras de cada grupo',
        es: 'Representar a iFound con un tono humano y respetuoso, cumpliendo las normas de cada grupo',
        fr: 'Représenter iFound avec un ton humain et respectueux, dans le respect des règles de chaque groupe',
        it: 'Rappresentare iFound con un tono umano e rispettoso, seguendo le regole di ogni gruppo',
        de: 'iFound mit einem respektvollen, menschlichen Ton vertreten und die Regeln jeder Gruppe einhalten',
        hu: 'Az iFound képviselete emberi, tiszteletteljes hangnemben, az egyes csoportok szabályait betartva',
        el: 'Εκπροσώπηση της iFound με ανθρώπινο και σεβαστικό τόνο, τηρώντας τους κανόνες κάθε ομάδας',
        tr: "iFound'u her grubun kurallarına uyarak saygılı ve samimi bir dille temsil etmek",
        pl: 'Reprezentowanie iFound w ludzkim, pełnym szacunku tonie, zgodnie z zasadami każdej grupy',
        ro: 'Reprezentarea iFound pe un ton uman și respectuos, cu respectarea regulilor fiecărui grup',
        nl: 'iFound vertegenwoordigen met een menselijke, respectvolle toon en de regels van elke groep volgen',
      },
      {
        en: 'Share feedback on what works and what users ask for',
        pt: 'Partilhar feedback sobre o que funciona e o que os utilizadores pedem',
        es: 'Compartir feedback sobre lo que funciona y lo que piden los usuarios',
        fr: 'Partager vos retours sur ce qui fonctionne et sur les demandes des utilisateurs',
        it: 'Condividere feedback su ciò che funziona e su ciò che chiedono gli utenti',
        de: 'Feedback dazu geben, was funktioniert und was Nutzer sich wünschen',
        hu: 'Visszajelzés arról, mi működik és mit kérnek a felhasználók',
        el: 'Ανατροφοδότηση για το τι λειτουργεί και τι ζητούν οι χρήστες',
        tr: 'Neyin işe yaradığı ve kullanıcıların neler istediği konusunda geri bildirim paylaşmak',
        pl: 'Dzielenie się uwagami na temat tego, co działa i czego oczekują użytkownicy',
        ro: 'Feedback despre ce funcționează și ce își doresc utilizatorii',
        nl: 'Feedback delen over wat werkt en waar gebruikers om vragen',
      },
    ],
    requirements: [
      {
        en: 'Responsible and proactive, able to work autonomously',
        pt: 'Responsabilidade e proatividade, com capacidade de trabalhar de forma autónoma',
        es: 'Persona responsable y proactiva, capaz de trabajar de forma autónoma',
        fr: 'Sens des responsabilités, esprit proactif et autonomie',
        it: 'Persona responsabile e proattiva, in grado di lavorare in autonomia',
        de: 'Verantwortungsbewusst und proaktiv, mit selbstständiger Arbeitsweise',
        hu: 'Felelősségteljes, proaktív hozzáállás és önálló munkavégzés',
        el: 'Υπευθυνότητα, πρωτοβουλία και ικανότητα αυτόνομης εργασίας',
        tr: 'Sorumluluk sahibi, proaktif ve bağımsız çalışabilen',
        pl: 'Odpowiedzialność, proaktywność i umiejętność samodzielnej pracy',
        ro: 'Responsabilitate, proactivitate și capacitatea de a lucra independent',
        nl: 'Verantwoordelijk en proactief, en in staat zelfstandig te werken',
      },
      {
        en: 'Comfortable using Facebook and social media every day',
        pt: 'À vontade com o Facebook e as redes sociais no dia a dia',
        es: 'Soltura con Facebook y las redes sociales en el día a día',
        fr: "À l'aise avec Facebook et les réseaux sociaux au quotidien",
        it: "Dimestichezza con Facebook e i social media nell'uso quotidiano",
        de: 'Sicherer Umgang mit Facebook und sozialen Medien im Alltag',
        hu: 'Magabiztos Facebook- és közösségimédia-használat a mindennapokban',
        el: 'Άνεση με το Facebook και τα social media στην καθημερινότητα',
        tr: 'Facebook ve sosyal medyayı günlük olarak rahatça kullanabilen',
        pl: 'Swobodne korzystanie z Facebooka i mediów społecznościowych na co dzień',
        ro: 'Familiaritate cu Facebook și rețelele sociale în viața de zi cu zi',
        nl: 'Dagelijks vertrouwd met Facebook en social media',
      },
      {
        en: 'Good written communication, with care and empathy for people who lost something',
        pt: 'Boa comunicação escrita, com cuidado e empatia para com quem perdeu algo',
        es: 'Buena comunicación escrita, con cuidado y empatía hacia quien ha perdido algo',
        fr: 'Bonne communication écrite, avec bienveillance et empathie envers ceux qui ont perdu quelque chose',
        it: 'Buone capacità di comunicazione scritta, con cura ed empatia verso chi ha perso qualcosa',
        de: 'Gute schriftliche Kommunikation, mit Feingefühl und Empathie für Menschen, die etwas verloren haben',
        hu: 'Jó írásbeli kommunikáció, odafigyelés és empátia azok iránt, akik elvesztettek valamit',
        el: 'Καλή γραπτή επικοινωνία, με φροντίδα και ενσυναίσθηση για όσους έχασαν κάτι',
        tr: 'İyi yazılı iletişim ve bir şeyini kaybetmiş insanlara karşı özen ve empati',
        pl: 'Dobra komunikacja pisemna oraz troska i empatia wobec osób, które coś zgubiły',
        ro: 'Comunicare scrisă bună, cu grijă și empatie față de cei care au pierdut ceva',
        nl: 'Goede schriftelijke communicatie, met zorg en empathie voor mensen die iets kwijt zijn',
      },
      {
        en: "Fluent in the language of the groups you'll work in",
        pt: 'Domínio da língua dos grupos onde vai trabalhar',
        es: 'Dominio del idioma de los grupos en los que trabajarás',
        fr: 'Maîtrise de la langue des groupes dans lesquels vous interviendrez',
        it: 'Ottima conoscenza della lingua dei gruppi in cui lavorerai',
        de: 'Fließende Kenntnisse der Sprache der Gruppen, in denen Sie tätig sind',
        hu: 'Azoknak a csoportoknak a magabiztos nyelvtudása, amelyekben dolgozni fogsz',
        el: 'Άριστη γνώση της γλώσσας των ομάδων στις οποίες θα δουλεύεις',
        tr: 'Çalışacağın grupların dilini akıcı konuşabilmek',
        pl: 'Biegła znajomość języka grup, w których będziesz działać',
        ro: 'Cunoașterea fluentă a limbii grupurilor în care vei lucra',
        nl: 'Vloeiend in de taal van de groepen waarin je actief bent',
      },
      {
        en: 'A computer or smartphone with internet access',
        pt: 'Computador ou smartphone com acesso à internet',
        es: 'Ordenador o smartphone con acceso a internet',
        fr: 'Un ordinateur ou un smartphone avec accès à internet',
        it: 'Un computer o uno smartphone con accesso a internet',
        de: 'Computer oder Smartphone mit Internetzugang',
        hu: 'Számítógép vagy okostelefon internet-hozzáféréssel',
        el: 'Υπολογιστής ή smartphone με πρόσβαση στο internet',
        tr: 'İnternet erişimi olan bir bilgisayar veya akıllı telefon',
        pl: 'Komputer lub smartfon z dostępem do internetu',
        ro: 'Un calculator sau smartphone cu acces la internet',
        nl: 'Een computer of smartphone met internettoegang',
      },
    ],
    niceToHave: [
      {
        en: 'Experience in community management, customer support or digital marketing',
        pt: 'Experiência em gestão de comunidades, apoio ao cliente ou marketing digital',
        es: 'Experiencia en gestión de comunidades, atención al cliente o marketing digital',
        fr: 'Expérience en community management, service client ou marketing digital',
        it: 'Esperienza in community management, assistenza clienti o marketing digitale',
        de: 'Erfahrung in Community-Management, Kundensupport oder digitalem Marketing',
        hu: 'Tapasztalat közösségkezelésben, ügyfélszolgálatban vagy digitális marketingben',
        el: 'Εμπειρία σε διαχείριση κοινοτήτων, εξυπηρέτηση πελατών ή ψηφιακό μάρκετινγκ',
        tr: 'Topluluk yönetimi, müşteri desteği veya dijital pazarlama deneyimi',
        pl: 'Doświadczenie w zarządzaniu społecznością, obsłudze klienta lub marketingu cyfrowym',
        ro: 'Experiență în community management, suport clienți sau marketing digital',
        nl: 'Ervaring met communitymanagement, klantenservice of digitale marketing',
      },
      {
        en: 'Already active in Facebook groups in your area',
        pt: 'Já participar em grupos do Facebook da sua zona',
        es: 'Participar ya en grupos de Facebook de tu zona',
        fr: 'Une présence déjà active dans des groupes Facebook de votre région',
        it: 'Partecipare già ai gruppi Facebook della tua zona',
        de: 'Bereits aktive Teilnahme an Facebook-Gruppen in Ihrer Region',
        hu: 'Aktív jelenlét a környéked Facebook-csoportjaiban',
        el: 'Ήδη ενεργή παρουσία σε ομάδες Facebook της περιοχής σου',
        tr: 'Bölgendeki Facebook gruplarında zaten aktif olmak',
        pl: 'Aktywność w facebookowych grupach z Twojej okolicy',
        ro: 'Prezență activă în grupuri de Facebook din zona ta',
        nl: 'Al actief in Facebookgroepen in je regio',
      },
    ],
    offer: [
      {
        en: 'Flexible hours that fit your schedule',
        pt: 'Horário flexível, adaptado à sua disponibilidade',
        es: 'Horario flexible que se adapta a tu disponibilidad',
        fr: 'Des horaires flexibles adaptés à vos disponibilités',
        it: 'Orari flessibili in base alla tua disponibilità',
        de: 'Flexible Arbeitszeiten, die sich nach Ihnen richten',
        hu: 'Rugalmas munkaidő, a saját beosztásodhoz igazítva',
        el: 'Ευέλικτο ωράριο που προσαρμόζεται στο πρόγραμμά σου',
        tr: 'Programına uyan esnek çalışma saatleri',
        pl: 'Elastyczne godziny dopasowane do Twojego grafiku',
        ro: 'Program flexibil, adaptat disponibilității tale',
        nl: 'Flexibele uren die passen bij je agenda',
      },
      {
        en: 'Remote work',
        pt: 'Trabalho remoto',
        es: 'Trabajo en remoto',
        fr: 'Télétravail',
        it: 'Lavoro da remoto',
        de: 'Remote-Arbeit',
        hu: 'Távmunka',
        el: 'Εργασία εξ αποστάσεως',
        tr: 'Uzaktan çalışma',
        pl: 'Praca zdalna',
        ro: 'Muncă la distanță',
        nl: 'Werken op afstand',
      },
      {
        en: 'A place in an innovative, growing project',
        pt: 'Integração num projeto inovador e em crescimento',
        es: 'Formar parte de un proyecto innovador y en crecimiento',
        fr: 'Rejoindre un projet innovant et en pleine croissance',
        it: 'Entrare in un progetto innovativo e in crescita',
        de: 'Teil eines innovativen, wachsenden Projekts werden',
        hu: 'Részvétel egy innovatív, növekvő projektben',
        el: 'Συμμετοχή σε ένα καινοτόμο έργο που μεγαλώνει',
        tr: 'Yenilikçi ve büyüyen bir projenin parçası olmak',
        pl: 'Udział w innowacyjnym, rozwijającym się projekcie',
        ro: 'Integrarea într-un proiect inovator și în creștere',
        nl: 'Deel uitmaken van een innovatief, groeiend project',
      },
      {
        en: 'Work with a real impact: helping people get back what matters to them',
        pt: 'Um trabalho com impacto real: ajudar pessoas a recuperar o que é importante para elas',
        es: 'Un trabajo con impacto real: ayudar a las personas a recuperar lo que les importa',
        fr: 'Un travail à impact réel : aider les gens à retrouver ce qui compte pour eux',
        it: 'Un lavoro con un impatto reale: aiutare le persone a ritrovare ciò che conta per loro',
        de: 'Eine Arbeit mit echter Wirkung: Menschen helfen, zurückzubekommen, was ihnen wichtig ist',
        hu: 'Valódi hatású munka: segíteni az embereknek visszakapni azt, ami fontos nekik',
        el: 'Δουλειά με πραγματικό αντίκτυπο: βοηθάς ανθρώπους να πάρουν πίσω ό,τι μετράει για εκείνους',
        tr: 'Gerçek etkisi olan bir iş: insanların kendileri için önemli olanı geri almasına yardım etmek',
        pl: 'Praca, która naprawdę coś zmienia: pomagasz ludziom odzyskać to, co dla nich ważne',
        ro: 'O muncă cu impact real: ajuți oamenii să recupereze ce contează pentru ei',
        nl: 'Werk met echte impact: mensen helpen terugkrijgen wat voor hen belangrijk is',
      },
    ],
  },
];

export function getJob(slug: string): Job | undefined {
  return JOBS.find((job) => job.slug === slug);
}

export function openJobs(): Job[] {
  return JOBS.filter((job) => job.open);
}

/** The text in the page's language; English for a locale the type doesn't know. */
export function pick(text: Localized, locale: string): string {
  return text[locale as AppLocale] ?? text.en;
}
