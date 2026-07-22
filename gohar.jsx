import React, { useState, useEffect, useMemo } from "react";

import goharLogo from "./GOHAR logo.png";

/* ------------------------------------------------------------------ */
/*  Gohar Traders (Embroidery Thread) — Shop CRM                        */
/*  Green & white brand · white canvas · data saved automatically       */
/* ------------------------------------------------------------------ */

const T = {
  green900: "#0F3D26",
  green700: "#166534",
  green600: "#1B7A43",
  green500: "#22A05B",
  mint: "#EDF7F0",
  mintLine: "#D8EBDE",
  ink: "#182420",
  sub: "#5B6E63",
  white: "#FFFFFF",
  red: "#C2410C",
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) =>
  "Rs " + (Number(n) || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });

const EMPTY = {
  products: [],
  vendors: [],
  parties: [],
  stockIn: [],   // {id,date,productId,vendorId,qty,price}
  stockOut: [],  // {id,date,productId,partyId,qty,price}
  vendorPay: [], // {id,date,vendorId,amount,note}
  partyPay: [],  // {id,date,partyId,amount,note}
  accounts: [],  // {id,date,type:'in'|'out',desc,amount}
};

const KEY = "gohar-traders-crm";

export default function GoharCRM() {
  const [db, setDb] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [storageError, setStorageError] = useState("");

  // ---------- load / save ----------
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(KEY);
        if (r && r.value) setDb({ ...EMPTY, ...JSON.parse(r.value) });
      } catch (e) {
        setStorageError("Cloud data could not be loaded. Check your connection and Firestore rules, then refresh.");
      }
      setLoaded(true);
    })();
  }, []);

  const save = (next) => {
    setDb(next);
    try {
      window.storage.set(KEY, JSON.stringify(next))
        .then(() => setStorageError(""))
        .catch(() => setStorageError("Changes are visible here but could not be saved to Firestore. Check your connection."));
    } catch (e) {
      setStorageError("Changes are visible here but could not be saved to Firestore. Check your connection.");
    }
  };
  const add = (table, row) => save({ ...db, [table]: [{ id: uid(), ...row }, ...db[table]] });
  const remove = (table, id) =>
    save({ ...db, [table]: db[table].filter((r) => r.id !== id) });

  // ---------- derived ----------
  const productById = (id) => db.products.find((p) => p.id === id);
  const vendorById = (id) => db.vendors.find((v) => v.id === id);
  const partyById = (id) => db.parties.find((p) => p.id === id);

  const stockLeft = useMemo(() => {
    const map = {};
    db.products.forEach((p) => (map[p.id] = { in: 0, out: 0 }));
    db.stockIn.forEach((r) => { if (map[r.productId]) map[r.productId].in += +r.qty || 0; });
    db.stockOut.forEach((r) => { if (map[r.productId]) map[r.productId].out += +r.qty || 0; });
    return map;
  }, [db]);

  const vendorBalance = (vid) => {
    const bought = db.stockIn.filter((r) => r.vendorId === vid)
      .reduce((s, r) => s + (+r.qty || 0) * (+r.price || 0), 0);
    const paid = db.vendorPay.filter((r) => r.vendorId === vid)
      .reduce((s, r) => s + (+r.amount || 0), 0);
    return bought - paid; // payable
  };
  const partyBalance = (pid) => {
    const sold = db.stockOut.filter((r) => r.partyId === pid)
      .reduce((s, r) => s + (+r.qty || 0) * (+r.price || 0), 0);
    const recv = db.partyPay.filter((r) => r.partyId === pid)
      .reduce((s, r) => s + (+r.amount || 0), 0);
    return sold - recv; // receivable
  };

  if (!loaded)
    return (
      <div style={{ ...S.app, alignItems: "center", justifyContent: "center", display: "flex" }}>
        <div style={{ color: T.green700, fontWeight: 600 }}>Opening your shop…</div>
      </div>
    );

  const NAV = [
    ["dashboard", "Dashboard"],
    ["products", "Products"],
    ["stockin", "Stock In"],
    ["stockout", "Stock Out"],
    ["stockleft", "Stock Left"],
    ["parties", "Party Balance"],
    ["vendors", "Vendors"],
    ["ledger", "Ledgers"],
  ];

  return (
    <div id="gohar-app" style={S.app}>
      <style>{CSS}</style>

      {/* -------- sidebar -------- */}
      <aside style={S.side}>
        <div style={S.brand}>
          <img
            src={goharLogo}
            alt="Gohar Traders — Embroidery Thread"
            style={{ display: "block", width: "100%", maxWidth: 195, height: "auto" }}
          />
        </div>
        <nav style={{ display: "grid", gap: 4 }}>
          {NAV.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setPage(k)}
              className={`navbtn${page === k ? " active" : ""}`}
              style={{
                ...S.navBtn,
                background: page === k ? T.white : "transparent",
                color: page === k ? T.green700 : "#CDE8D6",
                fontWeight: page === k ? 700 : 500,
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div style={S.stitch} />
      </aside>

      {/* -------- main -------- */}
      <main style={S.main}>
        {storageError && (
          <div role="alert" style={{ marginBottom: 16, padding: "11px 13px", borderRadius: 9,
            background: "#FFF1ED", border: "1px solid #FED7AA", color: "#9A3412",
            fontSize: 13, fontWeight: 600 }}>
            {storageError}
          </div>
        )}
        {page === "dashboard" && <Dashboard db={db} stockLeft={stockLeft} vendorBalance={vendorBalance} partyBalance={partyBalance} />}
        {page === "products" && <Products db={db} add={add} remove={remove} />}
        {page === "stockin" && <StockIn db={db} add={add} remove={remove} productById={productById} vendorById={vendorById} />}
        {page === "stockout" && <StockOut db={db} add={add} remove={remove} productById={productById} partyById={partyById} />}
        {page === "stockleft" && <StockLeft db={db} stockLeft={stockLeft} />}
        {page === "parties" && <Parties db={db} add={add} remove={remove} partyBalance={partyBalance} />}
        {page === "vendors" && <Vendors db={db} add={add} remove={remove} vendorBalance={vendorBalance} />}
        {page === "ledger" && (
          <Ledgers db={db} add={add} remove={remove}
            productById={productById} vendorById={vendorById} partyById={partyById}
            vendorBalance={vendorBalance} partyBalance={partyBalance} />
        )}
      </main>
    </div>
  );
}

/* ================= pages ================= */

function Dashboard({ db, stockLeft, vendorBalance, partyBalance }) {
  const totalStockValue = db.products.reduce((s, p) => {
    const left = (stockLeft[p.id]?.in || 0) - (stockLeft[p.id]?.out || 0);
    return s + left * (+p.purchasePrice || 0);
  }, 0);
  const receivable = db.parties.reduce((s, p) => s + Math.max(0, partyBalance(p.id)), 0);
  const payable = db.vendors.reduce((s, v) => s + Math.max(0, vendorBalance(v.id)), 0);
  const cash = db.accounts.reduce((s, a) => s + (a.type === "in" ? +a.amount : -+a.amount), 0);

  return (
    <>
      <PageHead title="Dashboard" sub="Today at a glance" />
      <div style={S.cards}>
        <Stat label="Stock value (at cost)" value={fmt(totalStockValue)} />
        <Stat label="Receivable from parties" value={fmt(receivable)} />
        <Stat label="Payable to vendors" value={fmt(payable)} tone="red" />
        <Stat label="Cash book balance" value={fmt(cash)} />
      </div>
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={S.cardTitle}>Low stock (10 or less)</div>
        {db.products.filter((p) => (stockLeft[p.id]?.in || 0) - (stockLeft[p.id]?.out || 0) <= 10).length === 0 ? (
          <Empty text="All products have healthy stock." />
        ) : (
          <Table
            head={["Product", "Shade", "Left"]}
            rows={db.products
              .filter((p) => (stockLeft[p.id]?.in || 0) - (stockLeft[p.id]?.out || 0) <= 10)
              .map((p) => [p.name, p.shade || "—", (stockLeft[p.id]?.in || 0) - (stockLeft[p.id]?.out || 0)])}
          />
        )}
      </div>
    </>
  );
}

function Products({ db, add, remove }) {
  const [f, setF] = useState({ name: "", shade: "", unit: "spool", purchasePrice: "", salePrice: "" });
  const submit = () => {
    if (!f.name.trim()) return;
    add("products", f);
    setF({ name: "", shade: "", unit: "spool", purchasePrice: "", salePrice: "" });
  };
  return (
    <>
      <PageHead title="Products" sub="Your thread catalogue" />
      <div style={S.card}>
        <div style={S.cardTitle}>Add product</div>
        <div style={S.formRow}>
          <Input label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="e.g. Polyester Thread 120D" />
          <Input label="Shade / colour no." value={f.shade} onChange={(v) => setF({ ...f, shade: v })} placeholder="e.g. 402 Red" />
          <Select label="Unit" value={f.unit} onChange={(v) => setF({ ...f, unit: v })} options={["spool", "cone", "box", "dozen", "kg"]} />
          <Input label="Purchase price" type="number" value={f.purchasePrice} onChange={(v) => setF({ ...f, purchasePrice: v })} />
          <Input label="Sale price" type="number" value={f.salePrice} onChange={(v) => setF({ ...f, salePrice: v })} />
          <Btn onClick={submit}>Add product</Btn>
        </div>
      </div>
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={S.cardTitle}>All products ({db.products.length})</div>
        {db.products.length === 0 ? (
          <Empty text="No products yet. Add your first thread above." />
        ) : (
          <Table
            head={["Name", "Shade", "Unit", "Purchase", "Sale", ""]}
            rows={db.products.map((p) => [
              p.name, p.shade || "—", p.unit, fmt(p.purchasePrice), fmt(p.salePrice),
              <Del key={p.id} onClick={() => remove("products", p.id)} />,
            ])}
          />
        )}
      </div>
    </>
  );
}

function StockIn({ db, add, remove, productById, vendorById }) {
  const [f, setF] = useState({ date: today(), productId: "", vendorId: "", qty: "", price: "" });
  const pickProduct = (id) => {
    const p = productById(id);
    setF({ ...f, productId: id, price: p ? p.purchasePrice : f.price });
  };
  const submit = () => {
    if (!f.productId || !f.qty) return;
    add("stockIn", f);
    setF({ date: today(), productId: "", vendorId: "", qty: "", price: "" });
  };
  return (
    <>
      <PageHead title="Stock In" sub="Purchases coming into the shop" />
      <div style={S.card}>
        <div style={S.cardTitle}>New stock entry</div>
        <div style={S.formRow}>
          <Input label="Date" type="date" value={f.date} onChange={(v) => setF({ ...f, date: v })} />
          <Select label="Product" value={f.productId} onChange={pickProduct}
            options={db.products.map((p) => [p.id, `${p.name}${p.shade ? " · " + p.shade : ""}`])} placeholder="Select product" />
          <Select label="Vendor" value={f.vendorId} onChange={(v) => setF({ ...f, vendorId: v })}
            options={db.vendors.map((v) => [v.id, v.name])} placeholder="Select vendor" />
          <Input label="Quantity" type="number" value={f.qty} onChange={(v) => setF({ ...f, qty: v })} />
          <Input label="Price / unit" type="number" value={f.price} onChange={(v) => setF({ ...f, price: v })} />
          <Btn onClick={submit}>Add stock</Btn>
        </div>
        <Hint text={f.qty && f.price ? `Total: ${fmt(f.qty * f.price)} — this will also appear in the vendor's ledger.` : "Selecting a product fills its purchase price automatically. You can change it."} />
      </div>
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={S.cardTitle}>Stock in history</div>
        {db.stockIn.length === 0 ? <Empty text="No purchases recorded yet." /> : (
          <Table
            head={["Date", "Product", "Vendor", "Qty", "Price", "Total", ""]}
            rows={db.stockIn.map((r) => [
              r.date, productById(r.productId)?.name || "—", vendorById(r.vendorId)?.name || "—",
              r.qty, fmt(r.price), fmt(r.qty * r.price),
              <Del key={r.id} onClick={() => remove("stockIn", r.id)} />,
            ])}
          />
        )}
      </div>
    </>
  );
}

function ReceiptModal({ sale, product, party, onClose }) {
  if (!sale) return null;

  const total = (+sale.qty) * (+sale.price);
  const receiptNo = "GT-" + sale.id.slice(-6).toUpperCase();
  const money = (n) => "Rs " + (Number(n) || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
  const itemBits = [product?.name || "Unknown product", product?.shade, product?.unit].filter(Boolean);
  const billTo = party ? `${party.name}${party.phone ? " \u00B7 " + party.phone : ""}` : "Walk-in customer";
  const R = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(15,61,38,.45)",
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 14,
    },
    paper: {
      width: "100%",
      maxWidth: 420,
      background: T.white,
      color: T.ink,
      borderRadius: 8,
      boxShadow: "0 24px 70px rgba(15,61,38,.26)",
      padding: 22,
      boxSizing: "border-box",
    },
    top: {
      display: "flex",
      justifyContent: "space-between",
      gap: 16,
      alignItems: "flex-start",
      flexWrap: "wrap",
    },
    brand: { color: T.green900, fontSize: 22, fontWeight: 800, lineHeight: 1.1 },
    tag: {
      color: T.green700,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 0,
      marginTop: 4,
      fontWeight: 700,
    },
    meta: { textAlign: "right", color: T.sub, fontSize: 12, lineHeight: 1.6 },
    stitch: { borderTop: `3px dashed ${T.green500}`, margin: "18px 0" },
    label: { color: T.sub, fontSize: 12, fontWeight: 700, marginBottom: 4 },
    billed: { color: T.ink, fontSize: 14, marginBottom: 16 },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
    th: {
      textAlign: "left",
      color: T.green900,
      background: T.mint,
      borderBottom: `1px solid ${T.mintLine}`,
      padding: "8px 6px",
      fontSize: 12,
    },
    td: { padding: "10px 6px", borderBottom: `1px solid ${T.mintLine}`, verticalAlign: "top" },
    right: { textAlign: "right" },
    itemSub: { color: T.sub, fontSize: 12, marginTop: 2 },
    totalLabel: {
      padding: "12px 6px 4px",
      borderTop: `2px solid ${T.green900}`,
      fontWeight: 800,
      color: T.green900,
    },
    totalValue: {
      padding: "12px 6px 4px",
      borderTop: `2px solid ${T.green900}`,
      fontWeight: 800,
      color: T.green900,
      textAlign: "right",
    },
    footer: { color: T.sub, fontSize: 12, textAlign: "center", marginTop: 18 },
    actions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18, flexWrap: "wrap" },
    printBtn: {
      border: "none",
      background: T.green700,
      color: T.white,
      borderRadius: 8,
      padding: "10px 14px",
      cursor: "pointer",
      fontWeight: 700,
    },
    closeBtn: {
      border: `1px solid ${T.mintLine}`,
      background: T.white,
      color: T.green900,
      borderRadius: 8,
      padding: "10px 14px",
      cursor: "pointer",
      fontWeight: 700,
    },
  };

  return (
    <div style={R.overlay} onClick={onClose}>
      <style>{`@media print {
  body * { visibility: hidden !important; }
  #gt-receipt, #gt-receipt * { visibility: visible !important; }
  #gt-receipt {
    position: fixed !important; inset: 0 !important; margin: 0 !important;
    width: 100% !important; max-width: none !important;
    box-shadow: none !important; border-radius: 0 !important;
  }
  .gt-noprint { display: none !important; }
}`}</style>
      <div id="gt-receipt" style={R.paper} onClick={(e) => e.stopPropagation()}>
        <div style={R.top}>
          <div>
            <div style={R.brand}>Gohar Traders</div>
            <div style={R.tag}>Embroidery Thread</div>
          </div>
          <div style={R.meta}>
            <div><b>Receipt #</b> {receiptNo}</div>
            <div><b>Date</b> {sale.date}</div>
          </div>
        </div>
        <div style={R.stitch} />
        <div style={R.label}>Billed to:</div>
        <div style={R.billed}>{billTo}</div>
        <table style={R.table}>
          <thead>
            <tr>
              <th style={R.th}>Item</th>
              <th style={{ ...R.th, ...R.right }}>Qty</th>
              <th style={{ ...R.th, ...R.right }}>Price</th>
              <th style={{ ...R.th, ...R.right }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={R.td}>
                <div>{itemBits[0]}</div>
                <div style={R.itemSub}>{itemBits.slice(1).join(" \u00B7 ")}</div>
              </td>
              <td style={{ ...R.td, ...R.right }}>{(+sale.qty || 0).toLocaleString("en-PK")}</td>
              <td style={{ ...R.td, ...R.right }}>{money(sale.price)}</td>
              <td style={{ ...R.td, ...R.right }}>{money(total)}</td>
            </tr>
            <tr>
              <td colSpan="3" style={R.totalLabel}>Total</td>
              <td style={R.totalValue}>{money(total)}</td>
            </tr>
          </tbody>
        </table>
        <div style={R.footer}>{"Thank you for your business \u2014 \u0634\u06A9\u0631\u06CC\u06C1"}</div>
        <div className="gt-noprint" style={R.actions}>
          <button style={R.printBtn} onClick={() => window.print()}>Print receipt</button>
          <button style={R.closeBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function StockOut({ db, add, remove, productById, partyById }) {
  const [f, setF] = useState({ date: today(), productId: "", partyId: "", qty: "", price: "" });
  const [receipt, setReceipt] = useState(null);
  const pickProduct = (id) => {
    const p = productById(id);
    setF({ ...f, productId: id, price: p ? p.salePrice : f.price });
  };
  const submit = () => {
    if (!f.productId || !f.qty) return;
    add("stockOut", f);
    setF({ date: today(), productId: "", partyId: "", qty: "", price: "" });
  };
  return (
    <>
      <PageHead title="Stock Out" sub="Sales going out to parties" />
      <div style={S.card}>
        <div style={S.cardTitle}>New sale entry</div>
        <div style={S.formRow}>
          <Input label="Date" type="date" value={f.date} onChange={(v) => setF({ ...f, date: v })} />
          <Select label="Product" value={f.productId} onChange={pickProduct}
            options={db.products.map((p) => [p.id, `${p.name}${p.shade ? " · " + p.shade : ""}`])} placeholder="Select product" />
          <Select label="Party" value={f.partyId} onChange={(v) => setF({ ...f, partyId: v })}
            options={db.parties.map((p) => [p.id, p.name])} placeholder="Select party" />
          <Input label="Quantity" type="number" value={f.qty} onChange={(v) => setF({ ...f, qty: v })} />
          <Input label="Price / unit" type="number" value={f.price} onChange={(v) => setF({ ...f, price: v })} />
          <Btn onClick={submit}>Add sale</Btn>
        </div>
        <Hint text={f.qty && f.price ? `Total: ${fmt(f.qty * f.price)} — this will also appear in the party's ledger.` : "Selecting a product fills its sale price automatically. You can change it."} />
      </div>
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={S.cardTitle}>Stock out history</div>
        {db.stockOut.length === 0 ? <Empty text="No sales recorded yet." /> : (
          <Table
            head={["Date", "Product", "Party", "Qty", "Price", "Total", "", ""]}
            rows={db.stockOut.map((r) => [
              r.date, productById(r.productId)?.name || "—", partyById(r.partyId)?.name || "—",
              r.qty, fmt(r.price), fmt(r.qty * r.price),
              <button key={r.id + "rcpt"} title="Print receipt"
                onClick={() => setReceipt(r)}
                style={{ border: "none", background: "transparent",
                         cursor: "pointer", fontSize: 16 }}>{"\uD83E\uDDFE"}</button>,
              <Del key={r.id} onClick={() => remove("stockOut", r.id)} />,
            ])}
          />
        )}
      </div>
      <ReceiptModal sale={receipt} product={receipt ? productById(receipt.productId) : null}
        party={receipt ? partyById(receipt.partyId) : null} onClose={() => setReceipt(null)} />
    </>
  );
}

function StockLeft({ db, stockLeft }) {
  return <><PageHead title="Stock Left" sub="Current inventory position" /><div style={S.card}>
    {db.products.length === 0 ? <Empty text="Add products first — stock will show here." /> : <Table
      head={["Product", "Shade", "Unit", "In", "Out", "Left", "Value (cost)"]}
      rows={db.products.map((p) => { const x = stockLeft[p.id] || { in: 0, out: 0 }; const left = x.in - x.out;
        return [p.name, p.shade || "—", p.unit, x.in, x.out,
          <b key={p.id} style={{ color: left <= 10 ? T.red : T.green700 }}>{left}</b>, fmt(left * (+p.purchasePrice || 0))]; })} />}
  </div></>;
}

function Parties({ db, add, remove, partyBalance }) {
  const [f, setF] = useState({ name: "", phone: "" });
  const submit = () => { if (!f.name.trim()) return; add("parties", f); setF({ name: "", phone: "" }); };
  return <><PageHead title="Party Balance" sub="Customers and what they owe" />
    <div style={S.card}><div style={S.cardTitle}>Add party</div><div style={S.formRow}>
      <Input label="Party name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
      <Input label="Phone" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} /><Btn onClick={submit}>Add party</Btn>
    </div></div><div style={{ ...S.card, marginTop: 16 }}><div style={S.cardTitle}>Balances</div>
      {db.parties.length === 0 ? <Empty text="No parties yet." /> : <Table head={["Party", "Phone", "Balance (receivable)", ""]}
        rows={db.parties.map((p) => [p.name, p.phone || "—", <b key={p.id + "b"} style={{ color: partyBalance(p.id) > 0 ? T.red : T.green700 }}>{fmt(partyBalance(p.id))}</b>, <Del key={p.id} onClick={() => remove("parties", p.id)} />])} />}
      <Hint text="Balance = total sales to the party minus payments received. Record payments in Ledgers → Party Ledger." />
    </div></>;
}

function Vendors({ db, add, remove, vendorBalance }) {
  const [f, setF] = useState({ name: "", phone: "" });
  const submit = () => { if (!f.name.trim()) return; add("vendors", f); setF({ name: "", phone: "" }); };
  return <><PageHead title="Vendors" sub="Suppliers you buy thread from" />
    <div style={S.card}><div style={S.cardTitle}>Add vendor</div><div style={S.formRow}>
      <Input label="Vendor name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
      <Input label="Phone" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} /><Btn onClick={submit}>Add vendor</Btn>
    </div></div><div style={{ ...S.card, marginTop: 16 }}><div style={S.cardTitle}>Balances</div>
      {db.vendors.length === 0 ? <Empty text="No vendors yet." /> : <Table head={["Vendor", "Phone", "Balance (payable)", ""]}
        rows={db.vendors.map((v) => [v.name, v.phone || "—", <b key={v.id + "b"} style={{ color: vendorBalance(v.id) > 0 ? T.red : T.green700 }}>{fmt(vendorBalance(v.id))}</b>, <Del key={v.id} onClick={() => remove("vendors", v.id)} />])} />}
      <Hint text="Balance = total purchases from the vendor minus payments you made. Record payments in Ledgers → Vendor Ledger." />
    </div></>;
}

function Ledgers(props) {
  const [tab, setTab] = useState("vendor");
  return <><PageHead title="Ledgers" sub="Vendor khata, party khata, and your cash book" />
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>{[["vendor", "Vendor Ledger"], ["party", "Party Ledger"], ["accounts", "Accounts (Cash Book)"]].map(([k, label]) =>
      <button key={k} onClick={() => setTab(k)} style={{ ...S.tab, background: tab === k ? T.green700 : T.white, color: tab === k ? T.white : T.green700 }}>{label}</button>)}</div>
    {tab === "vendor" && <VendorLedger {...props} />}{tab === "party" && <PartyLedger {...props} />}{tab === "accounts" && <Accounts {...props} />}</>;
}

function VendorLedger({ db, add, remove, productById, vendorById, vendorBalance }) {
  const [id, setId] = useState(""); const [f, setF] = useState({ date: today(), amount: "", note: "" });
  const rows = [...db.stockIn.filter((r) => r.vendorId === id).map((r) => ({ date:r.date, desc:`Purchase — ${productById(r.productId)?.name || "?"} × ${r.qty} @ ${fmt(r.price)}`, debit:r.qty*r.price, credit:0, id:r.id, table:"stockIn" })),
    ...db.vendorPay.filter((r) => r.vendorId === id).map((r) => ({ date:r.date, desc:r.note ? `Payment — ${r.note}` : "Payment", debit:0, credit:+r.amount, id:r.id, table:"vendorPay" }))].sort((a,b) => a.date < b.date ? 1 : -1);
  const submit = () => { if (!+f.amount) return; add("vendorPay", { ...f, vendorId:id }); setF({ date:today(), amount:"", note:"" }); };
  return <div style={S.card}><div style={S.formRow}><Select label="Vendor" value={id} onChange={setId} options={db.vendors.map((v) => [v.id,v.name])} placeholder="Select vendor" />{id && <Stat label="Current payable" value={fmt(vendorBalance(id))} inlineStat />}</div>
    {id && <><div style={{...S.cardTitle,marginTop:16}}>Record payment to {vendorById(id)?.name}</div><div style={S.formRow}>
      <Input label="Date" type="date" value={f.date} onChange={(v)=>setF({...f,date:v})}/><Input label="Amount" type="number" value={f.amount} onChange={(v)=>setF({...f,amount:v})}/><Input label="Note" value={f.note} onChange={(v)=>setF({...f,note:v})}/><Btn onClick={submit}>Record payment</Btn></div>
      <div style={{...S.cardTitle,marginTop:16}}>Ledger entries</div>{rows.length === 0 ? <Empty text="No entries with this vendor yet."/> : <Table head={["Date","Description","Debit (purchase)","Credit (paid)",""]} rows={rows.map((r)=>[r.date,r.desc,r.debit?fmt(r.debit):"—",r.credit?fmt(r.credit):"—",<Del key={r.id} onClick={()=>remove(r.table,r.id)}/>])}/>}</>}
  </div>;
}

function PartyLedger({ db, add, remove, productById, partyById, partyBalance }) {
  const [id, setId] = useState(""); const [f, setF] = useState({ date: today(), amount: "", note: "" });
  const rows = [...db.stockOut.filter((r) => r.partyId === id).map((r) => ({ date:r.date, desc:`Sale — ${productById(r.productId)?.name || "?"} × ${r.qty} @ ${fmt(r.price)}`, debit:r.qty*r.price, credit:0, id:r.id, table:"stockOut" })),
    ...db.partyPay.filter((r) => r.partyId === id).map((r) => ({ date:r.date, desc:r.note ? `Payment received — ${r.note}` : "Payment received", debit:0, credit:+r.amount, id:r.id, table:"partyPay" }))].sort((a,b) => a.date < b.date ? 1 : -1);
  const submit = () => { if (!+f.amount) return; add("partyPay", { ...f, partyId:id }); setF({ date:today(), amount:"", note:"" }); };
  return <div style={S.card}><div style={S.formRow}><Select label="Party" value={id} onChange={setId} options={db.parties.map((p) => [p.id,p.name])} placeholder="Select party" />{id && <Stat label="Current receivable" value={fmt(partyBalance(id))} inlineStat />}</div>
    {id && <><div style={{...S.cardTitle,marginTop:16}}>Record payment from {partyById(id)?.name}</div><div style={S.formRow}>
      <Input label="Date" type="date" value={f.date} onChange={(v)=>setF({...f,date:v})}/><Input label="Amount" type="number" value={f.amount} onChange={(v)=>setF({...f,amount:v})}/><Input label="Note" value={f.note} onChange={(v)=>setF({...f,note:v})}/><Btn onClick={submit}>Record payment</Btn></div>
      <div style={{...S.cardTitle,marginTop:16}}>Ledger entries</div>{rows.length === 0 ? <Empty text="No entries with this party yet."/> : <Table head={["Date","Description","Debit (sale)","Credit (received)",""]} rows={rows.map((r)=>[r.date,r.desc,r.debit?fmt(r.debit):"—",r.credit?fmt(r.credit):"—",<Del key={r.id} onClick={()=>remove(r.table,r.id)}/>])}/>}</>}
  </div>;
}

function Accounts({ db, add, remove, productById }) {
  const [f,setF]=useState({date:today(),type:"in",desc:"",amount:""}); const [mode,setMode]=useState("manual");
  const [calc,setCalc]=useState({productId:"",qty:"",price:""}); const amount=(+calc.qty||0)*(+calc.price||0);
  const pick=(id)=>{const p=productById(id);setCalc({...calc,productId:id,price:p?p.salePrice:""});};
  const useAmount=()=>{const p=productById(calc.productId);setF({...f,amount:String(amount),desc:p?`${p.name}${p.shade?" · "+p.shade:""} × ${calc.qty} @ ${calc.price}`:f.desc});setMode("manual");};
  const submit=()=>{if(!+f.amount)return;add("accounts",f);setF({date:today(),type:"in",desc:"",amount:""});};
  const balance=db.accounts.reduce((s,a)=>s+(a.type==="in"?+a.amount:-+a.amount),0);
  return <div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><div style={S.cardTitle}>Cash book</div><Stat label="Balance" value={fmt(balance)} inlineStat/></div>
    <div style={{display:"flex",gap:8,margin:"10px 0"}}><button style={{...S.tabSm,background:mode==="manual"?T.mint:T.white}} onClick={()=>setMode("manual")}>Enter amount manually</button><button style={{...S.tabSm,background:mode==="product"?T.mint:T.white}} onClick={()=>setMode("product")}>Extract amount from product</button></div>
    {mode==="product"&&<div style={{...S.formRow,background:T.mint,padding:12,borderRadius:10}}><Select label="Product" value={calc.productId} onChange={pick} options={db.products.map((p)=>[p.id,p.name])} placeholder="Select product"/><Input label="Quantity" type="number" value={calc.qty} onChange={(v)=>setCalc({...calc,qty:v})}/><Input label="Price" type="number" value={calc.price} onChange={(v)=>setCalc({...calc,price:v})}/><Stat label="Amount" value={fmt(amount)} inlineStat/><Btn onClick={useAmount} disabled={!amount}>Use this amount</Btn></div>}
    <div style={{...S.formRow,marginTop:12}}><Input label="Date" type="date" value={f.date} onChange={(v)=>setF({...f,date:v})}/><Select label="Type" value={f.type} onChange={(v)=>setF({...f,type:v})} options={[["in","Money in"],["out","Money out"]]}/><Input label="Description" value={f.desc} onChange={(v)=>setF({...f,desc:v})}/><Input label="Amount" type="number" value={f.amount} onChange={(v)=>setF({...f,amount:v})}/><Btn onClick={submit}>Add entry</Btn></div>
    <div style={{...S.cardTitle,marginTop:16}}>Entries</div>{db.accounts.length===0?<Empty text="No entries yet."/>:<Table head={["Date","Description","Money in","Money out",""]} rows={db.accounts.map((a)=>[a.date,a.desc||"—",a.type==="in"?fmt(a.amount):"—",a.type==="out"?fmt(a.amount):"—",<Del key={a.id} onClick={()=>remove("accounts",a.id)}/>])}/>}</div>;
}

function PageHead({title,sub}) { return <div style={{marginBottom:18}}><h1 style={S.h1}>{title}</h1><div style={{color:T.sub,fontSize:14}}>{sub}</div><div style={S.headStitch}/></div>; }
function Stat({label,value,tone,inlineStat}) { return <div style={{...S.stat,...(inlineStat?{padding:"8px 14px",minWidth:0}:{})}}><div style={{fontSize:12,color:T.sub,textTransform:"uppercase",letterSpacing:.6}}>{label}</div><div style={{fontSize:inlineStat?18:24,fontWeight:800,color:tone==="red"?T.red:T.green700}}>{value}</div></div>; }
function Input({label,value,onChange,type="text",placeholder}) { return <label style={S.field}><span style={S.fieldLabel}>{label}</span><input style={S.input} type={type} value={value} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)}/></label>; }
function Select({label,value,onChange,options,placeholder}) { return <label style={S.field}><span style={S.fieldLabel}>{label}</span><select style={S.input} value={value} onChange={(e)=>onChange(e.target.value)}>{placeholder&&<option value="">{placeholder}</option>}{options.map((o)=>Array.isArray(o)?<option key={o[0]} value={o[0]}>{o[1]}</option>:<option key={o} value={o}>{o}</option>)}</select></label>; }
function Btn({children,onClick,disabled}) { return <button onClick={onClick} disabled={disabled} style={{...S.btn,opacity:disabled?.5:1,alignSelf:"end"}}>{children}</button>; }
function Del({onClick}) { return <button onClick={onClick} title="Delete entry" style={S.del}>×</button>; }
function Table({head,rows}) { return <div style={{overflowX:"auto"}}><table style={S.table}><thead><tr>{head.map((h,i)=><th key={i} style={S.th}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr className="trh" key={i}>{row.map((cell,j)=><td key={j} style={S.td}>{cell}</td>)}</tr>)}</tbody></table></div>; }
function Empty({text}) { return <div style={{padding:"22px 0",color:T.sub,fontSize:14}}>{text}</div>; }
function Hint({text}) { return <div style={{marginTop:8,fontSize:13,color:T.green600}}>{text}</div>; }

const S={app:{minHeight:"100vh",display:"flex",background:T.white,color:T.ink,fontFamily:"'Segoe UI', system-ui, sans-serif"},side:{width:230,minHeight:"100vh",background:`linear-gradient(180deg, ${T.green900}, ${T.green700})`,padding:"22px 14px",display:"flex",flexDirection:"column",gap:22,flexShrink:0,position:"sticky",top:0,alignSelf:"flex-start",height:"100vh",boxSizing:"border-box"},brand:{display:"flex",gap:10,alignItems:"center",padding:"0 6px"},spool:{width:38,height:38,borderRadius:8,background:T.white,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},spoolThread:{width:22,height:22,borderRadius:"50%",border:`3px solid ${T.green600}`,borderTopColor:T.green900,borderRightColor:T.green500},brandName:{color:T.white,fontWeight:800,fontSize:16,lineHeight:1.1},brandSub:{color:"#A9D8BA",fontSize:11,letterSpacing:.5},navBtn:{textAlign:"left",padding:"10px 12px",border:"none",borderRadius:8,fontSize:14,cursor:"pointer"},stitch:{marginTop:"auto",borderTop:"2px dashed rgba(255,255,255,.35)"},main:{flex:1,padding:"26px 30px",maxWidth:1100,boxSizing:"border-box"},h1:{margin:0,fontSize:26,fontWeight:800,color:T.green900},headStitch:{marginTop:10,width:90,borderTop:`3px dashed ${T.green500}`},cards:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12},stat:{background:T.mint,border:`1px solid ${T.mintLine}`,borderRadius:12,padding:"14px 16px"},card:{background:T.white,border:`1px solid ${T.mintLine}`,borderRadius:14,padding:18,boxShadow:"0 1px 3px rgba(15,61,38,.05)"},cardTitle:{fontWeight:700,color:T.green900,marginBottom:10,fontSize:15},formRow:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,alignItems:"end"},field:{display:"grid",gap:4},fieldLabel:{fontSize:12,color:T.sub,fontWeight:600},input:{padding:"9px 10px",borderRadius:8,border:`1px solid ${T.mintLine}`,fontSize:14,outlineColor:T.green500,background:T.white,width:"100%",boxSizing:"border-box"},btn:{padding:"10px 16px",borderRadius:8,border:"none",background:T.green700,color:T.white,fontWeight:700,fontSize:14,cursor:"pointer"},tab:{padding:"9px 16px",borderRadius:999,border:`1.5px solid ${T.green700}`,fontWeight:700,fontSize:13,cursor:"pointer"},tabSm:{padding:"7px 12px",borderRadius:999,border:`1px solid ${T.mintLine}`,fontSize:13,cursor:"pointer",color:T.green700,fontWeight:600},table:{width:"100%",borderCollapse:"collapse",fontSize:14},th:{textAlign:"left",padding:"9px 10px",background:T.mint,color:T.green900,fontSize:12,textTransform:"uppercase",letterSpacing:.5,borderBottom:`1px solid ${T.mintLine}`,whiteSpace:"nowrap"},td:{padding:"9px 10px",borderBottom:`1px solid ${T.mintLine}`},del:{border:"none",background:"transparent",color:T.red,fontSize:18,cursor:"pointer",lineHeight:1,padding:"0 6px"}};

const CSS=`
*{box-sizing:border-box}
html,body,#root{margin:0;min-width:320px}
#gohar-app main{min-width:0}
.navbtn.active{background:${T.white}!important;color:${T.green700}!important}
.trh:hover{background:${T.mint}}
button:disabled{cursor:not-allowed}
@media(hover:hover){.navbtn:not(.active):hover{background:rgba(255,255,255,.12)!important}}
@media(max-width:700px){
  #gohar-app{display:block!important;min-height:100vh!important}
  #gohar-app aside{width:100%!important;height:auto!important;min-height:0!important;position:static!important;padding:14px 12px 12px!important;gap:12px!important}
  #gohar-app aside>div:first-child{padding-right:82px!important}
  #gohar-app aside nav{display:flex!important;gap:8px!important;overflow-x:auto!important;padding:2px 0 6px!important;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
  #gohar-app aside nav .navbtn{flex:0 0 auto!important;min-width:max-content!important;padding:9px 13px!important;text-align:center!important;border:1px solid rgba(255,255,255,.16)!important}
  #gohar-app aside>div:last-child{display:none!important}
  #gohar-app main{width:100%!important;max-width:none!important;padding:18px 12px 28px!important;overflow:hidden!important}
  #gohar-app h1{font-size:23px!important}
  #gohar-app main>div{max-width:100%}
  #gohar-app table{min-width:620px}
  #gohar-app label{min-width:0}
  #gohar-app input,#gohar-app select{font-size:16px!important}
  .logout-btn{top:12px!important;right:10px!important;padding:7px 10px!important}
}
@media(max-width:420px){
  #gohar-app main{padding-left:10px!important;padding-right:10px!important}
  #gohar-app main>div{border-radius:11px}
}
`;
