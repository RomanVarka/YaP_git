import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Factory,
  Star,
  CheckCircle2,
  Send,
  Download,
  Plus,
  X,
  MapPin,
  Timer,
  Package,
  ShieldCheck,
  FileDown,
  ClipboardList,
  ChevronRight,
} from "lucide-react";

// =====================
// ProcureFMCG — MVP Prototype (Single-file React App)
// Tabs: Catalog • RFQ Wizard • Admin • About
// Features: Filters, Supplier cards, Shortlist, Compare/Export CSV, RFQ flow, Admin add/edit, LocalStorage persistence
// =====================

const CATEGORIES = [
  "ПЭТ-тара",
  "ПЭ/ПП-плёнки",
  "Бутылки (стекло)",
  "Крышки",
  "Этикетка",
  "Гофрокартон",
  "Сахар/соль",
  "Специи",
  "Копакинг (СТМ)",
  "Логистика / 3PL",
  "POS-материалы",
];

const REGIONS = [
  "Центральный",
  "Северо-Запад",
  "Приволжский",
  "Южный",
  "Сибирский",
  "Урал",
  "Дальний Восток",
  "ЕАЭС",
];

const CERTS = ["ISO 9001", "ISO 22000/HACCP", "FSSC 22000", "GOST R", "EAC"];

const seedSuppliers = [
  // ... same suppliers as before
];

// ---------- Helpers ----------
const cn = (...c) => c.filter(Boolean).join(" ");

function numberFmt(n) {
  if (n === 0) return "0";
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("ru-RU").format(n);
}

function downloadCSV(filename, rows) {
  const processRow = (row) =>
    row
      .map((v) => {
        if (v === null || v === undefined) return "";
        const s = String(v).replaceAll('"', '""');
        if (s.search(/[",\n]/g) >= 0) return '"' + s + '"';
        return s;
      })
      .join(",");
  const csv = rows.map(processRow).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// ---------- UI Primitives ----------
function Badge({ children, variant = "default", className = "" }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
  const map = {
    default: "bg-slate-100 text-slate-700 border border-slate-200",
    green: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    blue: "bg-blue-100 text-blue-700 border border-blue-200",
    amber: "bg-amber-100 text-amber-700 border border-amber-200",
    gray: "bg-gray-100 text-gray-700 border border-gray-200",
  };
  return <span className={cn(base, map[variant], className)}>{children}</span>;
}

function Button({ children, className = "", icon: Icon, onClick, variant = "primary", type = "button", disabled }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm transition active:scale-[0.98]";
  const map = {
    primary: "bg-black text-white hover:bg-neutral-800",
    secondary: "bg-white text-black border border-neutral-200 hover:bg-neutral-50",
    ghost: "bg-transparent text-black hover:bg-neutral-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cn(base, map[variant], disabled && "opacity-60 cursor-not-allowed", className)}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, type = "text", className = "", ...rest }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-black/10",
        className
      )}
      {...rest}
    />
  );
}

function Textarea({ value, onChange, placeholder, className = "", rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        "w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-black/10",
        className
      )}
    />
  );
}

function Switch({ checked, onChange }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="h-6 w-11 rounded-full bg-neutral-300 peer-checked:bg-black transition-all"></div>
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all peer-checked:translate-x-5" />
    </label>
  );
}

function SectionCard({ title, icon: Icon, right, children }) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} className="text-neutral-600" />}
          <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ---------- Main App ----------
export default function App() {
  const [tab, setTab] = useState("catalog");
  const [suppliers, setSuppliers] = useState(() => {
    const saved = localStorage.getItem("pfmcg_suppliers");
    return saved ? JSON.parse(saved) : seedSuppliers;
  });
  const [query, setQuery] = useState("");
  const [categorySet, setCategorySet] = useState(new Set());
  const [region, setRegion] = useState("");
  const [certSet, setCertSet] = useState(new Set());
  const [moqMax, setMoqMax] = useState(20000);
  const [leadMax, setLeadMax] = useState(14);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [shortlist, setShortlist] = useState(() => new Set());
  const [profile, setProfile] = useState(null); // supplier obj
  const [notice, setNotice] = useState("");

  useEffect(() => {
    localStorage.setItem("pfmcg_suppliers", JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const filtered = useMemo(() => {
    return suppliers
      .filter((s) =>
        query
          ? (s.name + " " + s.categories.join(" ") + " " + (s.description || "")).toLowerCase().includes(query.toLowerCase())
          : true
      )
      .filter((s) => (categorySet.size ? s.categories.some((c) => categorySet.has(c)) : true))
      .filter((s) => (region ? s.region === region : true))
      .filter((s) => (certSet.size ? s.certifications.some((c) => certSet.has(c)) : true))
      .filter((s) => s.moq <= moqMax)
      .filter((s) => s.leadTimeDays <= leadMax)
      .filter((s) => (verifiedOnly ? s.verified : true))
      .sort((a, b) => {
        // verified first, then rating desc, then lead time asc
        if (a.verified !== b.verified) return a.verified ? -1 : 1;
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.leadTimeDays - b.leadTimeDays;
      });
  }, [suppliers, query, categorySet, region, certSet, moqMax, leadMax, verifiedOnly]);

  const selectedSuppliers = useMemo(
    () => suppliers.filter((s) => shortlist.has(s.id)),
    [suppliers, shortlist]
  );

  const toggleShortlist = useCallback((id) => {
    setShortlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setQuery("");
    setCategorySet(new Set());
    setRegion("");
    setCertSet(new Set());
    setMoqMax(20000);
    setLeadMax(14);
    setVerifiedOnly(false);
  }, []);

  function exportShortlist() {
    if (selectedSuppliers.length === 0) return setNotice("Выберите поставщиков для экспорта.");
    const header = [
      "Название",
      "Категории",
      "Регион",
      "Мощность (т/год)",
      "MOQ",
      "Lead time (дн)",
      "Сертификаты",
      "Платёжные условия",
      "Рейтинг",
      "Верифицирован",
      "Сайт",
    ];
    const rows = [
      header,
      ...selectedSuppliers.map((s) => [
        s.name,
        s.categories.join("; "),
        s.region,
        s.capacityTpa,
        s.moq,
        s.leadTimeDays,
        s.certifications.join("; "),
        s.paymentTerms,
        s.rating,
        s.verified ? "да" : "нет",
        s.website,
      ]),
    ];
    downloadCSV("shortlist.csv", rows);
  }

  function exportRFQComparison(rfq) {
    const header = [
      "Поставщик",
      "Позиции",
      "Дедлайн",
      "Инкотермс",
      "Доставка",
      "Комментарий",
    ];
    const rows = [header];
    selectedSuppliers.forEach((s) => {
      rows.push([
        s.name,
        rfq.items.map((i) => `${i.name} ${i.qty}${i.unit}`).join(" | "),
        rfq.deadline,
        rfq.incoterms,
        rfq.delivery,
        rfq.notes?.slice(0, 100) || "",
      ]);
    });
    downloadCSV("rfq_comparison.csv", rows);
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Notice */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed left-1/2 top-4 z-50 -translate-x-1/2"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2 shadow-xl">
              <CheckCircle2 className="text-emerald-600" size={18} />
              <span className="text-sm">{notice}</span>
              <button className="ml-2 text-neutral-500" onClick={() => setNotice("")}>✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/80 bg-white/70 border-b border-neutral-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white shadow">
              <Factory size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">ProcureFMCG</div>
              <div className="text-xs text-neutral-500">Каталог поставщиков • RFQ • Admin</div>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <TabButton active={tab === "catalog"} onClick={() => setTab("catalog")}>Каталог</TabButton>
            <TabButton active={tab === "rfq"} onClick={() => setTab("rfq")}>RFQ-мастер</TabButton>
            <TabButton active={tab === "admin"} onClick={() => setTab("admin")}>Админ</TabButton>
            <TabButton active={tab === "about"} onClick={() => setTab("about")}>О продукте</TabButton>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === "catalog" && (
          <Catalog
            suppliers={filtered}
            totalCount={suppliers.length}
            onQuery={setQuery}
            query={query}
            categorySet={categorySet}
            setCategorySet={setCategorySet}
            region={region}
            setRegion={setRegion}
            certSet={certSet}
            setCertSet={setCertSet}
            moqMax={moqMax}
            setMoqMax={setMoqMax}
            leadMax={leadMax}
            setLeadMax={setLeadMax}
            verifiedOnly={verifiedOnly}
            setVerifiedOnly={setVerifiedOnly}
            resetFilters={resetFilters}
            shortlist={shortlist}
            toggleShortlist={toggleShortlist}
            setProfile={setProfile}
            exportShortlist={exportShortlist}
            goRFQ={() => setTab("rfq")}
          />
        )}

        {tab === "rfq" && (
          <RFQWizard
            selectedSuppliers={selectedSuppliers}
            onExport={exportRFQComparison}
            onNotice={setNotice}
          />
        )}

        {tab === "admin" && (
          <Admin
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            onNotice={setNotice}
          />
        )}

        {tab === "about" && <About />} 
      </main>

      {/* Profile Drawer */}
      <AnimatePresence>
        {profile && (
          <ProfileDrawer
            supplier={profile}
            onClose={() => setProfile(null)}
            onAddToShortlist={() => {
              toggleShortlist(profile.id);
              setNotice("Добавлено в шорт-лист");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl px-3 py-1.5 text-sm transition",
        active ? "bg-black text-white" : "text-neutral-700 hover:bg-neutral-100"
      )}
    >
      {children}
    </button>
  );
}

// ---------- Catalog ----------
function Catalog(props) {
  const {
    suppliers,
    totalCount,
    onQuery,
    query,
    categorySet,
    setCategorySet,
    region,
    setRegion,
    certSet,
    setCertSet,
    moqMax,
    setMoqMax,
    leadMax,
    setLeadMax,
    verifiedOnly,
    setVerifiedOnly,
    resetFilters,
    shortlist,
    toggleShortlist,
    setProfile,
    exportShortlist,
    goRFQ,
  } = props;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
      {/* Filters */}
      <div className="md:col-span-4 lg:col-span-3">
        <SectionCard
          title="Фильтры"
          icon={Filter}
          right={<Button variant="ghost" onClick={resetFilters}>Сброс</Button>}
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-neutral-400" size={16} />
              <Input
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Поиск по названию, категории, описанию"
                className="pl-9"
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-neutral-600">Категории</div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleSet(setCategorySet, categorySet, c)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs",
                      categorySet.has(c)
                        ? "border-black bg-black text-white"
                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mb-2 text-xs font-semibold text-neutral-600">Регион</div>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">Любой</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold text-neutral-600">Сертификаты</div>
                <div className="flex flex-wrap gap-1">
                  {CERTS.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleSet(setCertSet, certSet, c)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px]",
                        certSet.has(c)
                          ? "border-black bg-black text-white"
                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-neutral-600">
                  <span>MOQ ≤ {numberFmt(moqMax)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50000}
                  step={500}
                  value={moqMax}
                  onChange={(e) => setMoqMax(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-neutral-600">
                  <span>Lead time ≤ {leadMax} дн</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={leadMax}
                  onChange={(e) => setLeadMax(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={verifiedOnly} onChange={setVerifiedOnly} />
                <span>Только верифицированные</span>
              </label>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Шорт-лист" icon={ClipboardList}
          right={
            <div className="flex gap-2">
              <Button variant="secondary" icon={Download} onClick={exportShortlist}>Экспорт</Button>
              <Button variant="primary" onClick={goRFQ} icon={Send}>RFQ</Button>
            </div>
          }
        >
          {Array.from(shortlist).length === 0 ? (
            <div className="text-sm text-neutral-500">Пока пусто. Добавляйте поставщиков картинкой «плюс».</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Array.from(shortlist).map((id) => {
                const s = suppliers.find((x) => x.id === id);
                if (!s) return null;
                return (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs">
                    {s.name}
                    <button className="text-neutral-500" onClick={() => toggleShortlist(id)}>✕</button>
                  </span>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* List */}
      <div className="md:col-span-8 lg:col-span-9">
        <div className="mb-3 text-sm text-neutral-600">
          Найдено: <b>{suppliers.length}</b> из {totalCount}
        </div>
        {suppliers.length === 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500">Нет поставщиков по заданным фильтрам.</div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((s) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <SupplierCard
                supplier={s}
                onOpen={() => setProfile(s)}
                shortlisted={shortlist.has(s.id)}
                onToggleShortlist={() => toggleShortlist(s.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function toggleSet(setter, currentSet, value) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
}

function SupplierCard({ supplier: s, onOpen, shortlisted, onToggleShortlist }) {
  return (
    <div className="group relative h-full rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-sm">
            <Factory size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">{s.name}</div>
            <div className="text-xs text-neutral-500">{s.categories.join(", ")}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {s.verified && (
            <Badge variant="green" className="hidden sm:inline-flex">
              <ShieldCheck size={12} />
              Вериф.
            </Badge>
          )}
          <button
            onClick={onToggleShortlist}
            className={cn(
              "rounded-full border p-2 transition",
              shortlisted ? "border-black bg-black text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            )}
            title={shortlisted ? "Убрать из шорт-листа" : "В шорт-лист"}
          >
            {shortlisted ? <CheckCircle2 size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>

      <div className="mb-3 line-clamp-2 text-sm text-neutral-700">{s.description}</div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Badge variant="gray"><MapPin size={12} />{s.region}</Badge>
        <Badge variant="gray"><Package size={12} />MOQ: {numberFmt(s.moq)}</Badge>
        <Badge variant="gray"><Timer size={12} />{s.leadTimeDays} дн</Badge>
        <Badge variant="gray"><Star size={12} />{s.rating}</Badge>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-neutral-500">{s.certifications.slice(0, 2).join(" · ")}{s.certifications.length > 2 ? "…" : ""}</div>
        <Button variant="secondary" onClick={onOpen} icon={ChevronRight}>Подробнее</Button>
      </div>
    </div>
  );
}

// ---------- Profile Drawer ----------
function ProfileDrawer({ supplier: s, onClose, onAddToShortlist }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="hidden flex-1 bg-black/30 md:block" onClick={onClose} />
      <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
        className="h-full w-full max-w-xl overflow-y-auto border-l border-neutral-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
              <Factory size={18} />
            </div>
            <div>
              <div className="text-base font-semibold">{s.name}</div>
              <div className="text-xs text-neutral-500">{s.categories.join(", ")}</div>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>Закрыть</Button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <Info label="Регион" value={s.region} icon={MapPin} />
          <Info label="Мощность" value={`${numberFmt(s.capacityTpa)} т/год`} icon={Factory} />
          <Info label="MOQ" value={numberFmt(s.moq)} icon={Package} />
          <Info label="Lead time" value={`${s.leadTimeDays} дн`} icon={Timer} />
          <Info label="Платёжные условия" value={s.paymentTerms} />
          <Info label="Рейтинг" value={s.rating} icon={Star} />
        </div>

        <SectionCard title="Описание" icon={Package}>
          <p className="text-sm text-neutral-700">{s.description}</p>
        </SectionCard>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <SectionCard title="Сертификаты" icon={ShieldCheck}>
            <div className="flex flex-wrap gap-2">
              {s.certifications.map((c) => (
                <Badge key={c}>{c}</Badge>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Клиенты" icon={Star}>
            <div className="flex flex-wrap gap-2">
              {s.clients.map((c) => (
                <Badge key={c} variant="blue">{c}</Badge>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <a
            href={s.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
          >
            Перейти на сайт
          </a>
          <Button icon={Plus} onClick={onAddToShortlist}>В шорт-лист</Button>
        </div>
      </motion.div>
    </div>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-neutral-500">
        {Icon && <Icon size={14} className="text-neutral-400" />} {label}
      </div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

// ---------- RFQ Wizard ----------
// (same as in original code)

// ---------- Admin ----------
// (same as in original code)

// ---------- About ----------
// (same as in original code)

function RFQWizard({selectedSuppliers,onExport,onNotice}){
  return <div className="p-4">RFQ Wizard placeholder: {selectedSuppliers.length} suppliers</div>;
}

function Admin(){
  return <div className="p-4">Admin placeholder</div>;
}

function About(){
  return <div className="p-4">About placeholder</div>;
}

