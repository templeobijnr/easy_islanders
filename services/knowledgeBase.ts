
// --- STATIC KNOWLEDGE BASE FOR NORTH CYPRUS (TRNC) ---

export const ISLAND_KNOWLEDGE_BASE = {
  real_estate_law: {
    title: "Real Estate Laws & Investor Protection",
    content: `
    **Buying Process in North Cyprus (TRNC):**
    1. **Reservation**: A deposit (usually £1k-£5k) takes the property off the market.
    2. **Contract Signing**: Usually requires 30-35% down payment. A lawyer MUST check the title deed before this.
    3. **Stamp Duty**: 0.5% of the contract price, must be paid within 21 days of signing to register the contract at the Land Registry. This protects the buyer's rights (Specific Performance Law).
    4. **Permission to Purchase (PTP)**: Non-citizens need PTP from the Council of Ministers. This takes 6-12 months. You can move in before this, but you can't get the full title deed yet.
    5. **Title Transfer**: Once PTP is granted and full payment is made, the title is transferred.

    **Title Deed Types:**
    - **Turkish Title (74 Pre-war)**: Considered the safest/most valuable. Land owned by Turkish Cypriots or foreigners before 1974.
    - **Exchange Title (Esdeg)**: Land given to Turkish Cypriots in exchange for land they left in the South. Recognized by the TRNC government and widely considered safe for international investors.
    - **TMD Title**: Land awarded for military service or settlement. slightly harder to get bank loans for, but generally safe.
    - **Leasehold**: Owned by the government, leased for 49 years (common in Karpaz or coastal tourism zones).

    **Taxes & Fees:**
    - **VAT**: 5% (Often payable upon key handover).
    - **Transfer Fee**: ~3-12% (First-time buyers often get a discount to 3-6%).
    - **Legal Fees**: Typically £1,500 - £2,000 per contract.
    `
  },
  
  residency_visas: {
    title: "Residency & Visas",
    content: `
    **Tourist Visa**: Most nationalities get 30-90 days upon arrival (Ercan or Borders).
    
    **High Income Residency (Pink Slip)**:
    - For those renting or owning a holiday home.
    - Requirements: Clean police record, property deed or rental agreement, and proof of funds in a local bank (approx. $15k - $30k depending on family size).
    - Renewable annually.
    
    **Property Ownership Residency**:
    - If you own a property fully paid, you are entitled to residency.
    - Does NOT grant right to work (Work permits are separate).
    `
  },

  utilities_admin: {
    title: "Utilities & Daily Administration",
    content: `
    **Electricity (Kib-Tek)**:
    - **Payment**: Can be paid at Kib-Tek district offices, via the "Kib-Tek Mobile" app, or at "PayPoint" kiosks in supermarkets (Lemar, Sah).
    - **Voltage**: 240V (UK Style 3-pin plugs).
    
    **Water**:
    - **Mains Water**: Often "Smart Card" based. You take your water card to the local Municipality (Belediye) kiosk or top-up point to load credits.
    - **Tank Water**: Delivered by truck if mains run out (approx 300-500 TL per 3 tons).
    
    **Internet**:
    - Providers: Multimax, Nethouse, Extend.
    - Mostly Microwave/Air-Fiber based (dish on roof). Fiber optic is rolling out in Kyrenia center and new Iskele projects.
    
    **Taxes (Road Tax)**:
    - Payable online via the Tax Office portal or at the local Tax Office (Vergi Dairesi).
    `
  },

  emergency_health: {
    title: "Emergency & Health",
    content: `
    **Emergency Numbers**:
    - Ambulance: 112
    - Police: 155
    - Fire: 199
    - Forest Fire: 177
    
    **Pharmacies (Eczane)**:
    - Working hours: 08:00 - 17:30 (Summer hours vary).
    - **Night Pharmacy (Nöbetçi Eczane)**: After hours, only designated pharmacies are open. This list changes DAILY. The agent must check the "Duty Pharmacy" list for the specific date.
    
    **Hospitals**:
    - State Hospitals (Nicosia Burhan Nalbantoglu, Kyrenia Akcicek) are free/low cost for emergencies.
    - Private Hospitals (Near East, Kolan, Kamiloglu) require insurance or upfront payment.
    `
  },

  banking_currency: {
    title: "Banking & Money",
    content: `
    **Currency**: Turkish Lira (TRY) is the official currency for daily shops.
    **Real Estate/Cars**: Priced in GBP (£) or EUR (€).
    
    **Banks**:
    - International: Garanti, Is Bankasi, Ziraat.
    - Local: Creditwest, Limasol Turkish Bank.
    - **Account Opening**: Requires Passport, Proof of Address (Muhtar letter), and sometimes a deposit.
    `
  }
};

export const MOCK_REALTIME_DATA = {
  weather: {
    kyrenia: "28°C, Sunny, Wind N 12km/h",
    iskele: "29°C, Clear Skies",
    nicosia: "32°C, Hot",
    troodos: "22°C, Cool"
  },
  currency: {
    GBP_TRY: "41.50",
    EUR_TRY: "35.20",
    USD_TRY: "32.10"
  },
  duty_pharmacy: {
    kyrenia: "Guven Eczanesi (Opposite State Hospital)",
    iskele: "Long Beach Pharmacy (Main Road)",
    alsancak: "Star Pharmacy"
  }
};
