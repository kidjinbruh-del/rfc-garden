/* One-shot builder: expands data.js to 72 protocols, adds where/fact, syncs PROTOCOLS.json.
   Run: node build-data.js */
const fs = require("fs");
const dir = require("path").resolve(__dirname, "..");
const src = fs.readFileSync(dir + "/js/data.js", "utf8");
const protocolsData = new Function(src + "; return protocolsData;")();
const ps = protocolsData.protocols;

const WF = {
  rfc0791: ["Везде: каждый пакет в интернете", "Адреса IPv4 закончились ещё в 2011 году — поэтому придумали IPv6 и NAT"],
  rfc0792: ["Команда ping", "Ping написали за одну ночь в 1983 году"],
  rfc0793: ["Сайты, почта, файлы — почти всё", "Трёхэтапное рукопожатие: SYN → SYN-ACK → ACK"],
  rfc0768: ["Видео, игры, DNS", "Без гарантии доставки — зато быстрее всех"],
  rfc0826: ["Локальная сеть, домашний Wi-Fi", "ARP-таблицу компьютера видно командой arp -a"],
  rfc1035: ["Каждый адрес в браузере", "Первый домен symbolics.com зарегистрирован в 1985 году"],
  rfc5321: ["Отправка писем", "Первая версия 1982 года слала письма открытым текстом"],
  rfc0959: ["Старые файловые архивы", "Пароли в FTP летят открытым текстом — поэтому его вытеснили"],
  rfc1939: ["Почтовые программы", "Обычно удаляет письма с сервера после скачивания"],
  rfc3501: ["Почта на телефоне и компьютере сразу", "Письма хранятся на сервере и синхронизируются"],
  rfc2131: ["Подключение к Wi-Fi", "Именно DHCP выдаёт тебе IP в кафе с ноутбуком"],
  rfc5905: ["Часы телефона и компьютера", "Миллисекундная точность на миллиардах устройств"],
  rfc2616: ["Каждый сайт", "Методы GET и POST придуманы здесь"],
  rfc7540: ["Современные сайты", "Мультиплексирование: сто запросов в одном соединении"],
  rfc8200: ["Новые сети, мобильный интернет", "Адресов хватит на каждую песчинку Земли"],
  rfc8446: ["Замок в адресной строке (HTTPS)", "Рукопожатие за один round-trip — страницы открываются быстрее"],
  rfc4253: ["Удалённое управление серверами", "Придуман в 1995 году после атаки на сеть автора"],
  rfc4271: ["Магистрали интернета", "Ошибка в BGP в 2008 году «уронила» YouTube по всему миру"],
  rfc6455: ["Чаты, онлайн-игры, live-ленты", "Начинается как HTTP-запрос, а потом становится каналом"],
  rfc9000: ["YouTube, Google, HTTP/3", "Сделан поверх UDP, хотя ведёт себя как TCP"],
  rfc9114: ["Новейшие сайты", "Не боится потерь пакетов в плохом Wi-Fi"],
  rfc1034: ["Устройство DNS", "Всего 13 адресов корневых серверов на весь интернет"],
  rfc3848: ["Настройка IP, маршрутов и DNS", "Опции DHCP — маленькие «записки» роутера устройству"],
  rfc9106: ["Хранение паролей", "Специально медленный: сотни тысяч итераций против подбора"],
  rfc2326: ["Камеры видеонаблюдения", "Кнопки play/pause для сетевого видео"],
  rfc3986: ["Каждая ссылка", "Схема :// — его рук дело"],
  rfc6265: ["Корзины, «вы вошли как…»", "Придуманы в Netscape в 1994 году"],
  rfc4566: ["Zoom и звонки", "Два клиента договариваются о кодеках обычным текстом"],
  rfc5766: ["Видеозвонки через роутеры", "Пробивает NAT: находит путь, даже если оба за файрволом"],
};

const NEW = [
  { id: "rfc1157", number: 1157, name: "SNMP", fullName: "Simple Network Management Protocol", year: 1990, status: "active", layer: "application", category: "monitoring", plant: "mushroom", description: "Наблюдение за сетью: роутеры сами докладывают о нагрузке и поломках.", where: "Мониторинг сетей, Zabbix", fact: "Роутер сам присылает «тревогу» админу", dependsOn: ["rfc0768"], usedBy: [], replaces: [], replacedBy: [], color: "#7E57C2" },
  { id: "rfc0854", number: 854, name: "Telnet", fullName: "Telnet Protocol", year: 1983, status: "legacy", layer: "application", category: "remote", plant: "vine", description: "Древнее удалённое управление: печатаешь команды на чужой машине.", where: "Музей, старые железки", fact: "Пароль летит открытым текстом — его убил SSH", dependsOn: ["rfc0793"], usedBy: [], replaces: [], replacedBy: [], color: "#78909C" },
  { id: "rfc1122", number: 1122, name: "Host Req.", fullName: "Requirements for Internet Hosts", year: 1989, status: "active", layer: "network", category: "core", plant: "tree", description: "Конституция интернета: что обязан уметь каждый компьютер в сети.", where: "Учебники по сетям", fact: "Больше тысячи страниц требований", dependsOn: [], usedBy: ["rfc0791", "rfc0793"], replaces: [], replacedBy: [], color: "#26A69A" },
  { id: "rfc1436", number: 1436, name: "Gopher", fullName: "Gopher Protocol", year: 1993, status: "legacy", layer: "application", category: "web", plant: "flower", description: "Интернет до веба: меню из текстовых документов вместо сайтов.", where: "История интернета", fact: "Проиграл HTTP из-за платной лицензии", dependsOn: ["rfc0793"], usedBy: [], replaces: [], replacedBy: [], color: "#A1887F" },
  { id: "rfc1738", number: 1738, name: "URL", fullName: "Uniform Resource Locators", year: 1994, status: "legacy", layer: "application", category: "naming", plant: "sprout", description: "Первый формат адресов: как писать ссылки, чтобы все понимали.", where: "Старые ссылки", fact: "Его заменил более общий URI", dependsOn: [], usedBy: ["rfc2616"], replaces: [], replacedBy: ["rfc3986"], color: "#FFC107" },
  { id: "rfc1918", number: 1918, name: "PrivAddr", fullName: "Private Address Space", year: 1996, status: "active", layer: "network", category: "addressing", plant: "tree", description: "Домашние адреса: 192.168.x.x, которые нельзя маршрутизировать в интернет.", where: "192.168.x.x дома и в офисе", fact: "Три диапазона: 10/8, 172.16/12, 192.168/16 — выучи их", dependsOn: ["rfc0791"], usedBy: [], replaces: [], replacedBy: [], color: "#7CB342" },
  { id: "rfc1945", number: 1945, name: "HTTP/1.0", fullName: "Hypertext Transfer Protocol 1.0", year: 1996, status: "legacy", layer: "application", category: "web", plant: "flower", description: "Первый веб-протокол: один запрос — одно соединение, медленно, но работало.", where: "Первые сайты", fact: "Каждый запрос открывал новое соединение", dependsOn: ["rfc0793"], usedBy: [], replaces: [], replacedBy: ["rfc2616"], color: "#FFB300" },
  { id: "rfc2617", number: 2617, name: "HTTP Auth", fullName: "HTTP Authentication", year: 1999, status: "updated", layer: "application", category: "auth", plant: "flower", description: "Окна «введите логин и пароль»: как сайт проверяет, кто ты.", where: "Окна входа на сайтах", fact: "Схема Basic кодирует пароль в base64 — это НЕ шифрование", dependsOn: ["rfc2616"], usedBy: [], replaces: [], replacedBy: [], color: "#00897B" },
  { id: "rfc2818", number: 2818, name: "HTTPS", fullName: "HTTP Over TLS", year: 2000, status: "active", layer: "application", category: "security", plant: "flower", description: "Обычный HTTP внутри TLS-туннеля: замок в адресной строке.", where: "Замок в браузере", fact: "Просто HTTP + шифрование — а разница огромна", dependsOn: ["rfc2616", "rfc5246"], usedBy: [], replaces: [], replacedBy: [], color: "#F06292" },
  { id: "rfc3261", number: 3261, name: "SIP", fullName: "Session Initiation Protocol", year: 2002, status: "active", layer: "application", category: "voice", plant: "flower", description: "IP-телефония: устанавливает звонки, как HTTP открывает страницы.", where: "Офисные АТС, звонки", fact: "Похож на HTTP: INVITE вместо GET", dependsOn: ["rfc0768"], usedBy: [], replaces: [], replacedBy: [], color: "#BA68C8" },
  { id: "rfc3550", number: 3550, name: "RTP", fullName: "Real-time Transport Protocol", year: 2003, status: "active", layer: "application", category: "streaming", plant: "vine", description: "Голос и видео в звонках: лучше потерять кадр, чем зависнуть.", where: "Звонки, стримы", fact: "Не гарантирует доставку — специально", dependsOn: ["rfc0768"], usedBy: [], replaces: [], replacedBy: [], color: "#4FC3F7" },
  { id: "rfc3711", number: 3711, name: "SRTP", fullName: "Secure RTP", year: 2004, status: "active", layer: "application", category: "security", plant: "vine", description: "Тот же RTP, но зашифрованный: конфиденциальные звонки.", where: "Защищённые звонки", fact: "RTP + шифрование без потери скорости", dependsOn: ["rfc3550"], usedBy: [], replaces: [], replacedBy: [], color: "#7986CB" },
  { id: "rfc3977", number: 3977, name: "NNTP", fullName: "Network News Transfer Protocol", year: 2006, status: "active", layer: "application", category: "news", plant: "mushroom", description: "Группы новостей Usenet: предок форумов и Reddit.", where: "Usenet, история форумов", fact: "Дискуссии в интернете начались здесь — с 1986 года", dependsOn: ["rfc0793"], usedBy: [], replaces: [], replacedBy: [], color: "#9E9E9E" },
  { id: "rfc4511", number: 4511, name: "LDAP", fullName: "Lightweight Directory Access Protocol", year: 2006, status: "active", layer: "application", category: "auth", plant: "mushroom", description: "Корпоративный справочник: один логин на почту, Wi-Fi и принтер.", where: "Офисные сети, Active Directory", fact: "Телефонная книга всей компании", dependsOn: ["rfc0793"], usedBy: [], replaces: [], replacedBy: [], color: "#5C6BC0" },
  { id: "rfc4960", number: 4960, name: "SCTP", fullName: "Stream Control Transmission Protocol", year: 2007, status: "active", layer: "transport", category: "transport", plant: "vine", description: "Гибрид TCP и UDP: надёжно, но сообщениями, а не потоком.", where: "Сигнализация 4G/5G", fact: "Телефонные сети держатся на нём", dependsOn: ["rfc0791"], usedBy: [], replaces: [], replacedBy: [], color: "#00838F" },
  { id: "rfc5246", number: 5246, name: "TLS 1.2", fullName: "Transport Layer Security 1.2", year: 2008, status: "updated", layer: "presentation", category: "security", plant: "tree", description: "Шифрование эпохи 2010-х: замок интернета до версии 1.3.", where: "HTTPS до 2018 года", fact: "Устарел из-за слабых шифров — нужен 1.3", dependsOn: ["rfc0793"], usedBy: ["rfc2818"], replaces: [], replacedBy: ["rfc8446"], color: "#4DB6AC" },
  { id: "rfc5322", number: 5322, name: "EmailFmt", fullName: "Internet Message Format", year: 2008, status: "active", layer: "application", category: "email", plant: "flower", description: "Устройство письма: тема, от, кому — формат не менялся десятилетиями.", where: "Каждое письмо", fact: "Шапка письма читается человеком без программ", dependsOn: [], usedBy: ["rfc5321"], replaces: [], replacedBy: [], color: "#F48FB1" },
  { id: "rfc6749", number: 6749, name: "OAuth 2.0", fullName: "OAuth 2.0 Authorization Framework", year: 2012, status: "active", layer: "application", category: "auth", plant: "flower", description: "Кнопки «войти через Google»: сайт не видит твой пароль — только токен.", where: "Вход через соцсети", fact: "Пароль остаётся у Google, сайт получает токен", dependsOn: ["rfc2616"], usedBy: [], replaces: [], replacedBy: [], color: "#FF8A65" },
  { id: "rfc7252", number: 7252, name: "CoAP", fullName: "Constrained Application Protocol", year: 2014, status: "active", layer: "application", category: "iot", plant: "sprout", description: "HTTP для лампочек: тот же REST, но лёгкий и поверх UDP.", where: "Умный дом, датчики", fact: "Работает на батарейке годами", dependsOn: ["rfc0768"], usedBy: [], replaces: [], replacedBy: [], color: "#9CCC65" },
  { id: "rfc7519", number: 7519, name: "JWT", fullName: "JSON Web Token", year: 2015, status: "active", layer: "application", category: "auth", plant: "sprout", description: "Токены входа: три части через точку, подпись защищает от подделки.", where: "Токены на сайтах", fact: "Payload читается всеми — не клади туда секреты", dependsOn: [], usedBy: ["rfc6749"], replaces: [], replacedBy: [], color: "#FFE082" },
  { id: "rfc8484", number: 8484, name: "DoH", fullName: "DNS over HTTPS", year: 2018, status: "active", layer: "application", category: "security", plant: "flower", description: "Приватный DNS внутри HTTPS: провайдер не видит твои запросы.", where: "Приватность в браузере", fact: "DNS-запросы маскируются под обычный веб-трафик", dependsOn: ["rfc2616", "rfc1035"], usedBy: [], replaces: [], replacedBy: [], color: "#00ACC1" },
];

for (const p of ps) {
  const wf = WF[p.id];
  if (!wf) throw new Error("no where/fact for " + p.id);
  p.where = wf[0]; p.fact = wf[1];
}
const byId = new Map(ps.map((p) => [p.id, p]));
for (const n of NEW) {
  if (byId.has(n.id)) throw new Error("dup " + n.id);
  for (const d of n.dependsOn) {
    if (!byId.has(d) && !NEW.some((x) => x.id === d)) throw new Error(n.id + " bad dep " + d);
  }
  ps.push(n); byId.set(n.id, n);
}
// auto usedBy from new dependsOn
for (const n of NEW) {
  for (const d of n.dependsOn) {
    const t = byId.get(d);
    if (t && !t.usedBy.includes(n.id)) t.usedBy.push(n.id);
  }
}
// explicit replaces links
byId.get("rfc3986").replaces.push("rfc1738");
byId.get("rfc2616").replaces.push("rfc1945");

const entry = (p) =>
  `        { "id": ${JSON.stringify(p.id)}, "number": ${p.number}, "name": ${JSON.stringify(p.name)}, "fullName": ${JSON.stringify(p.fullName)}, "year": ${p.year}, "status": ${JSON.stringify(p.status)}, "layer": ${JSON.stringify(p.layer)}, "category": ${JSON.stringify(p.category)}, "plant": ${JSON.stringify(p.plant)},\n` +
  `          "description": ${JSON.stringify(p.description)}, "where": ${JSON.stringify(p.where)}, "fact": ${JSON.stringify(p.fact)},\n` +
  `          "dependsOn": ${JSON.stringify(p.dependsOn)}, "usedBy": ${JSON.stringify(p.usedBy)}, "replaces": ${JSON.stringify(p.replaces)}, "replacedBy": ${JSON.stringify(p.replacedBy)}, "color": ${JSON.stringify(p.color)} },`;

const header = `/* data.js — база данных протоколов RFC Garden
   Источник истина. PROTOCOLS.json — экспорт той же структуры.
   Обновляйте оба файла синхронно. */`;
const out = header + '\nconst protocolsData = {\n    "protocols": [\n' + ps.map(entry).join("\n") + '\n    ]\n};\n';
fs.writeFileSync(dir + "/js/data.js", out);
fs.writeFileSync(dir + "/PROTOCOLS.json", JSON.stringify({ protocols: ps }));
console.log("wrote " + ps.length + " protocols");
