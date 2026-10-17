/* Additive migration for MySQL 8.0+. No demo/business records are inserted.
 * Existing columns are never dropped or narrowed. Conflicting unique data fails explicitly.
 */
const { db } = require("../src/core/store");
const { normalizeRole } = require("../src/core/access");
const { reconcileLegacyGroups } = require("./reconcile-legacy-groups");
const common = { created_at: "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP" };
const owned = { created_by: "INT NULL", group_id: "INT NULL" };
const schema = {
  roles: {
    role_name: "VARCHAR(80) NULL",
    name: "VARCHAR(80) NULL",
    code: "VARCHAR(80) NULL",
    description: "TEXT NULL",
    data_scope: "VARCHAR(12) NOT NULL DEFAULT 'OWN'",
  },
  groups: {
    name: "VARCHAR(100) NULL",
    description: "TEXT NULL",
    parent_id: "INT NULL",
    leader_id: "INT NULL",
    region: "VARCHAR(100) NULL",
    region_id: "INT NULL",
    ...common,
  },
  regions: { name: "VARCHAR(100) NOT NULL", code: "VARCHAR(80) NULL" },
  users: {
    email: "VARCHAR(255) NOT NULL",
    password: "VARCHAR(255) NOT NULL",
    full_name: "VARCHAR(100) NOT NULL",
    phone: "VARCHAR(25) NULL",
    email_signature: "TEXT NULL",
    avatar: "VARCHAR(255) NULL",
    avatar_thumbnail: "VARCHAR(255) NULL",
    role_id: "INT NULL",
    role_code: "VARCHAR(80) NULL",
    group_id: "INT NULL",
    status: "VARCHAR(50) NOT NULL DEFAULT 'Hoạt động'",
    is_active: "BOOLEAN NOT NULL DEFAULT TRUE",
    failed_login_attempts: "INT NOT NULL DEFAULT 0",
    lock_until: "DATETIME NULL",
    must_change_password: "BOOLEAN NOT NULL DEFAULT FALSE",
    ...common,
  },
  user_roles: { user_id: "INT NOT NULL", role_code: "VARCHAR(80) NOT NULL" },
  auth_sessions: {
    token_hash: "CHAR(64) NOT NULL",
    user_id: "INT NOT NULL",
    expires_at: "DATETIME NOT NULL",
    absolute_expires_at: "DATETIME NOT NULL",
    revoked_at: "DATETIME NULL",
    ...common,
  },
  auth_reset_tokens: {
    token_hash: "CHAR(64) NOT NULL",
    user_id: "INT NOT NULL",
    expires_at: "DATETIME NOT NULL",
    used_at: "DATETIME NULL",
    ...common,
  },
  auth_email_codes: {
    email: "VARCHAR(255) NOT NULL",
    code_hash: "CHAR(64) NOT NULL",
    expires_at: "DATETIME NOT NULL",
    attempts: "INT NOT NULL DEFAULT 0",
    used_at: "DATETIME NULL",
    ...common,
  },
  mail_outbox: {
    recipient: "VARCHAR(255) NOT NULL",
    subject: "VARCHAR(255) NOT NULL",
    body: "TEXT NOT NULL",
    attempts: "INT NOT NULL DEFAULT 0",
    sent_at: "DATETIME NULL",
    next_attempt_at: "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
    last_error: "VARCHAR(100) NULL",
    ...common,
  },
  audit_logs: {
    user_id: "INT NULL",
    user_name: "VARCHAR(100) NULL",
    action_type: "VARCHAR(100) NOT NULL",
    entity_type: "VARCHAR(100) NULL",
    entity_id: "INT NULL",
    before_value: "LONGTEXT NULL",
    after_value: "LONGTEXT NULL",
    description: "TEXT NULL",
    ...common,
  },
  customers: {
    name: "VARCHAR(255) NOT NULL",
    company_name: "VARCHAR(255) NULL",
    company: "VARCHAR(255) NULL",
    tax_code: "VARCHAR(50) NULL",
    industry: "VARCHAR(100) NULL",
    industry_code: "VARCHAR(80) NULL",
    company_size: "VARCHAR(100) NULL",
    customer_type: "VARCHAR(100) NULL",
    website: "VARCHAR(255) NULL",
    address: "TEXT NULL",
    phone: "VARCHAR(25) NULL",
    email: "VARCHAR(255) NULL",
    region: "VARCHAR(100) NULL",
    parent_id: "INT NULL",
    status: "VARCHAR(50) NOT NULL DEFAULT 'Tiềm năng'",
    custom_fields: "LONGTEXT NULL",
    total_contract_value: "DECIMAL(18,2) NOT NULL DEFAULT 0",
    last_contacted_at: "DATETIME NULL",
    risk_level: "VARCHAR(50) NOT NULL DEFAULT 'Bình thường'",
    ...owned,
    ...common,
  },
  customer_contacts: {
    customer_id: "INT NOT NULL",
    full_name: "VARCHAR(100) NOT NULL",
    position: "VARCHAR(100) NULL",
    phone: "VARCHAR(25) NULL",
    email: "VARCHAR(255) NULL",
    decision_role: "VARCHAR(100) NOT NULL DEFAULT 'Người dùng cuối'",
    is_primary: "BOOLEAN NOT NULL DEFAULT FALSE",
    ...common,
  },
  contact_histories: {
    contact_id: "INT NOT NULL",
    from_customer_id: "INT NULL",
    to_customer_id: "INT NULL",
    user_id: "INT NULL",
    reason: "TEXT NULL",
    ...common,
  },
  customer_activities: {
    customer_id: "INT NOT NULL",
    deal_id: "INT NULL",
    lead_id: "INT NULL",
    user_id: "INT NULL",
    activity_type: "VARCHAR(50) NOT NULL DEFAULT 'Ghi chú'",
    activity_type_id: "INT NULL",
    content: "TEXT NOT NULL",
    ...common,
  },
  customer_files: {
    customer_id: "INT NOT NULL",
    file_name: "VARCHAR(255) NOT NULL",
    storage_name: "VARCHAR(255) NOT NULL",
    mime_type: "VARCHAR(100) NOT NULL",
    size_bytes: "INT NOT NULL",
    user_id: "INT NOT NULL",
    ...common,
  },
  support_tickets: {
    customer_id: "INT NOT NULL",
    title: "VARCHAR(255) NOT NULL",
    priority: "VARCHAR(50) NOT NULL DEFAULT 'Cao'",
    status: "VARCHAR(50) NOT NULL DEFAULT 'Mới'",
    assigned_to: "INT NULL",
    ...common,
  },
  saved_filters: {
    user_id: "INT NOT NULL",
    entity_type: "VARCHAR(50) NOT NULL DEFAULT 'customer'",
    filter_name: "VARCHAR(255) NOT NULL",
    criteria: "LONGTEXT NOT NULL",
    ...common,
  },
  custom_fields: {
    field_name: "VARCHAR(100) NOT NULL",
    field_key: "VARCHAR(100) NOT NULL",
    field_type: "VARCHAR(50) NOT NULL DEFAULT 'text'",
    entity_type: "VARCHAR(50) NOT NULL DEFAULT 'customer'",
    is_required: "BOOLEAN NOT NULL DEFAULT FALSE",
    options: "TEXT NULL",
    is_active: "BOOLEAN NOT NULL DEFAULT TRUE",
    status: "VARCHAR(20) NOT NULL DEFAULT 'active'",
    ...common,
  },
  products: {
    code: "VARCHAR(50) NOT NULL",
    name: "VARCHAR(255) NOT NULL",
    type: "VARCHAR(50) NOT NULL DEFAULT 'ONE_TIME'",
    unit: "VARCHAR(50) NOT NULL",
    list_price: "DECIMAL(18,2) NOT NULL",
    floor_price: "DECIMAL(18,2) NOT NULL",
    cost_price: "DECIMAL(18,2) NULL",
    status: "VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'",
    ...common,
  },
  sales_categories: {
    type: "VARCHAR(50) NOT NULL",
    code: "VARCHAR(80) NOT NULL",
    name: "VARCHAR(100) NOT NULL",
    description: "TEXT NULL",
    sort_order: "INT NOT NULL DEFAULT 0",
    status: "VARCHAR(20) NOT NULL DEFAULT 'active'",
  },
  pipeline_stages: {
    code: "VARCHAR(80) NOT NULL",
    name: "VARCHAR(100) NOT NULL",
    description: "TEXT NULL",
    win_probability: "DECIMAL(5,2) NOT NULL DEFAULT 0",
    probability: "DECIMAL(5,2) NOT NULL DEFAULT 0",
    sort_order: "INT NOT NULL DEFAULT 0",
    exit_condition: "VARCHAR(100) NOT NULL DEFAULT 'none'",
    required_condition: "VARCHAR(100) NULL",
    stagnant_days: "INT NOT NULL DEFAULT 14",
    is_active: "BOOLEAN NOT NULL DEFAULT TRUE",
  },
  deal_reasons: {
    name: "VARCHAR(100) NOT NULL",
    type: "VARCHAR(20) NOT NULL DEFAULT 'LOST'",
    description: "TEXT NULL",
  },
  competitors: {
    name: "VARCHAR(255) NOT NULL",
    website: "VARCHAR(255) NULL",
    strengths: "TEXT NULL",
    weaknesses: "TEXT NULL",
    description: "TEXT NULL",
  },
  campaigns: {
    name: "VARCHAR(255) NOT NULL",
    budget: "DECIMAL(18,2) NOT NULL DEFAULT 0",
    start_date: "DATE NULL",
    end_date: "DATE NULL",
    channel: "VARCHAR(100) NOT NULL",
    ...owned,
    ...common,
  },
  leads: {
    full_name: "VARCHAR(100) NULL",
    email: "VARCHAR(255) NULL",
    phone: "VARCHAR(25) NULL",
    company_name: "VARCHAR(255) NULL",
    interest: "TEXT NULL",
    source_id: "INT NULL",
    campaign_id: "INT NULL",
    industry: "VARCHAR(100) NULL",
    company_size: "VARCHAR(100) NULL",
    region: "VARCHAR(100) NULL",
    interest_level: "VARCHAR(50) NULL",
    status: "VARCHAR(30) NOT NULL DEFAULT 'NEW'",
    score: "DECIMAL(12,2) NOT NULL DEFAULT 0",
    temperature: "VARCHAR(10) NOT NULL DEFAULT 'COLD'",
    owner_id: "INT NULL",
    group_id: "INT NULL",
    created_by: "INT NULL",
    assigned_at: "DATETIME NULL",
    contacted_at: "DATETIME NULL",
    sla_due_at: "DATETIME NULL",
    sla_breached: "BOOLEAN NOT NULL DEFAULT FALSE",
    customer_id: "INT NULL",
    contact_id: "INT NULL",
    deal_id: "INT NULL",
    converted_at: "DATETIME NULL",
    merged_into_id: "INT NULL",
    ...common,
  },
  lead_activities: {
    lead_id: "INT NOT NULL",
    user_id: "INT NULL",
    activity_type: "VARCHAR(50) NOT NULL",
    content: "TEXT NOT NULL",
    ...common,
  },
  lead_forms: {
    public_key: "CHAR(48) NOT NULL",
    name: "VARCHAR(100) NOT NULL",
    source_id: "INT NOT NULL",
    campaign_id: "INT NULL",
    created_by: "INT NOT NULL",
    is_active: "BOOLEAN NOT NULL DEFAULT TRUE",
    ...common,
  },
  lead_scoring_rules: {
    field_name: "VARCHAR(50) NOT NULL",
    match_value: "VARCHAR(255) NOT NULL",
    points: "DECIMAL(10,2) NOT NULL",
  },
  lead_assignment_rules: {
    name: "VARCHAR(100) NOT NULL",
    priority: "INT NOT NULL",
    region: "VARCHAR(100) NULL",
    industry: "VARCHAR(100) NULL",
    group_id: "INT NOT NULL",
    last_user_id: "INT NULL",
    sla_minutes: "INT NOT NULL DEFAULT 60",
    is_active: "BOOLEAN NOT NULL DEFAULT TRUE",
  },
  crm_settings: {
    setting_key: "VARCHAR(100) NOT NULL",
    setting_value: "LONGTEXT NOT NULL",
  },
  api_rate_limits: {
    bucket: "VARCHAR(191) NOT NULL",
    hits: "INT NOT NULL DEFAULT 0",
    expires_at: "DATETIME NOT NULL",
  },
  deals: {
    title: "VARCHAR(255) NOT NULL",
    customer_id: "INT NOT NULL",
    contact_id: "INT NULL",
    owner_id: "INT NULL",
    group_id: "INT NULL",
    source_id: "INT NULL",
    campaign_id: "INT NULL",
    stage_id: "INT NULL",
    stage: "VARCHAR(100) NULL",
    status: "VARCHAR(20) NOT NULL DEFAULT 'OPEN'",
    amount: "DECIMAL(18,2) NOT NULL DEFAULT 0",
    probability: "DECIMAL(5,2) NOT NULL DEFAULT 0",
    probability_note: "TEXT NULL",
    expected_close_date: "DATE NULL",
    actual_amount: "DECIMAL(18,2) NULL",
    signed_date: "DATE NULL",
    win_reason_id: "INT NULL",
    loss_reason_id: "INT NULL",
    competitor_id: "INT NULL",
    loss_note: "TEXT NULL",
    custom_fields: "LONGTEXT NULL",
    stagnant: "BOOLEAN NOT NULL DEFAULT FALSE",
    overdue: "BOOLEAN NOT NULL DEFAULT FALSE",
    last_activity_at: "DATETIME NULL",
    annual_value: "DECIMAL(18,2) NOT NULL DEFAULT 0",
    ...common,
  },
  deal_items: {
    deal_id: "INT NOT NULL",
    product_id: "INT NOT NULL",
    quantity: "DECIMAL(12,3) NOT NULL",
    unit_price: "DECIMAL(18,2) NOT NULL",
    periods: "INT NOT NULL DEFAULT 1",
    period_months: "INT NOT NULL DEFAULT 1",
    line_total: "DECIMAL(18,2) NOT NULL",
  },
  sales_targets: {
    user_id: "INT NOT NULL",
    start_date: "DATE NOT NULL",
    end_date: "DATE NOT NULL",
    amount: "DECIMAL(18,2) NOT NULL",
  },
  quotes: {
    title: "VARCHAR(255) NOT NULL",
    deal_id: "INT NOT NULL",
    customer_id: "INT NOT NULL",
    owner_id: "INT NOT NULL",
    group_id: "INT NULL",
    gross_amount: "DECIMAL(18,2) NOT NULL",
    discount_percent: "DECIMAL(5,2) NOT NULL DEFAULT 0",
    amount: "DECIMAL(18,2) NOT NULL",
    status: "VARCHAR(20) NOT NULL DEFAULT 'DRAFT'",
    ...common,
  },
  quote_items: {
    quote_id: "INT NOT NULL",
    product_id: "INT NOT NULL",
    product_name: "VARCHAR(255) NOT NULL",
    quantity: "DECIMAL(12,3) NOT NULL",
    unit_price: "DECIMAL(18,2) NOT NULL",
    periods: "INT NOT NULL DEFAULT 1",
    line_total: "DECIMAL(18,2) NOT NULL",
  },
  crm_notifications: {
    user_id: "INT NOT NULL",
    event_key: "VARCHAR(191) NOT NULL",
    message: "TEXT NOT NULL",
    read_at: "DATETIME NULL",
    ...common,
  },
  crm_job_runs: {
    job_name: "VARCHAR(80) NOT NULL",
    last_run_at: "DATETIME NOT NULL",
  },
  crm_migrations: { version: "VARCHAR(100) NOT NULL", ...common },
  crm_legacy_group_map: {
    legacy_group_id: "INT NOT NULL",
    group_id: "INT NOT NULL",
    remap_users: "BOOLEAN NOT NULL DEFAULT FALSE",
    users_remapped: "BOOLEAN NOT NULL DEFAULT FALSE",
  },
};
const indexes = {
  users: [["uq_users_email", ["email"], true]],
  user_roles: [["uq_user_roles", ["user_id", "role_code"], true]],
  auth_sessions: [
    ["uq_session_hash", ["token_hash"], true],
    ["ix_session_user", ["user_id"], false],
  ],
  auth_reset_tokens: [["uq_reset_hash", ["token_hash"], true]],
  customers: [
    ["uq_customer_tax", ["tax_code"], true],
    ["ix_customer_scope", ["created_by", "group_id"], false],
  ],
  customer_contacts: [["ix_contact_customer", ["customer_id"], false]],
  customer_activities: [
    ["ix_activity_customer", ["customer_id", "created_at"], false],
    ["ix_activity_deal", ["deal_id"], false],
  ],
  products: [["uq_product_code", ["code"], true]],
  sales_categories: [["uq_category_code", ["type", "code"], true]],
  pipeline_stages: [["uq_stage_code", ["code"], true]],
  leads: [
    ["ix_lead_assignment", ["status", "owner_id"], false],
    ["ix_lead_scope", ["owner_id", "group_id"], false],
    ["ix_lead_email", ["email"], false],
    ["ix_lead_phone", ["phone"], false],
  ],
  lead_forms: [["uq_form_key", ["public_key"], true]],
  lead_activities: [["ix_lead_activity", ["lead_id"], false]],
  deals: [
    ["ix_deal_scope", ["owner_id", "group_id"], false],
    ["ix_deal_customer", ["customer_id"], false],
  ],
  custom_fields: [["uq_custom_field", ["entity_type", "field_key"], true]],
  crm_settings: [["uq_setting_key", ["setting_key"], true]],
  api_rate_limits: [["uq_rate_bucket", ["bucket"], true]],
  crm_notifications: [
    ["uq_notification_event", ["user_id", "event_key"], true],
  ],
  crm_job_runs: [["uq_job_name", ["job_name"], true]],
  crm_migrations: [["uq_migration", ["version"], true]],
  crm_legacy_group_map: [["uq_legacy_group", ["legacy_group_id"], true]],
};
const foreignKeys = [
  ["users", "group_id", "groups"],
  ["groups", "parent_id", "groups"],
  ["groups", "leader_id", "users"],
  ["user_roles", "user_id", "users"],
  ["auth_sessions", "user_id", "users"],
  ["auth_reset_tokens", "user_id", "users"],
  ["customers", "created_by", "users"],
  ["customers", "group_id", "groups"],
  ["customers", "parent_id", "customers"],
  ["customer_contacts", "customer_id", "customers"],
  ["customer_activities", "customer_id", "customers"],
  ["customer_files", "customer_id", "customers"],
  ["support_tickets", "customer_id", "customers"],
  ["saved_filters", "user_id", "users"],
  ["campaigns", "created_by", "users"],
  ["leads", "owner_id", "users"],
  ["leads", "group_id", "groups"],
  ["leads", "campaign_id", "campaigns"],
  ["lead_activities", "lead_id", "leads"],
  ["lead_forms", "source_id", "sales_categories"],
  ["lead_assignment_rules", "group_id", "groups"],
  ["deals", "customer_id", "customers"],
  ["deals", "contact_id", "customer_contacts"],
  ["deals", "owner_id", "users"],
  ["deals", "stage_id", "pipeline_stages"],
  ["deals", "campaign_id", "campaigns"],
  ["deal_items", "deal_id", "deals"],
  ["deal_items", "product_id", "products"],
  ["quotes", "deal_id", "deals"],
  ["quotes", "customer_id", "customers"],
  ["quotes", "owner_id", "users"],
  ["quote_items", "quote_id", "quotes"],
  ["quote_items", "product_id", "products"],
  ["sales_targets", "user_id", "users"],
  ["crm_notifications", "user_id", "users"],
];
async function migrate() {
  const c = await db.getConnection();
  try {
    const [[lock]] = await c.query(
      "SELECT GET_LOCK(CONCAT(DATABASE(),':migrations'),30) AS acquired",
    );
    if (!lock.acquired) throw new Error("Migration lock unavailable");
    const added = {};
    for (const [table, columns] of Object.entries(schema)) {
      added[table] = new Set();
      await c.query(
        `CREATE TABLE IF NOT EXISTS \`${table}\` (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, ${Object.entries(
          columns,
        )
          .map(([k, v]) => `\`${k}\` ${v}`)
          .join(
            ",",
          )}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
      const [existing] = await c.query(`SHOW COLUMNS FROM \`${table}\``);
      const names = new Set(existing.map((x) => x.Field));
      for (const [name, type] of Object.entries(columns))
        if (!names.has(name)) {
          added[table].add(name);
          await c.query(
            `ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` ${type}`,
          );
        }
    }
    await reconcileLegacyGroups(c);
    // Copy known aliases only when their canonical column was newly introduced.
    for (const [table, aliases] of Object.entries({
      customer_contacts: {
        full_name: "name",
        position: "title",
        decision_role: "buying_role",
      },
      customers: { name: "company_name", company_name: "name" },
      products: { code: "sku" },
      users: { full_name: "name", password: "password_hash" },
      pipeline_stages: {
        win_probability: "probability",
        probability: "win_probability",
        exit_condition: "required_condition",
      },
      deals: { owner_id: "created_by" },
      leads: {
        full_name: "name",
        owner_id: "assigned_to",
        source_id: "lead_source_id",
      },
    })) {
      const [columns] = await c.query(`SHOW COLUMNS FROM \`${table}\``);
      for (const [canonical, legacy] of Object.entries(aliases))
        if (
          added[table].has(canonical) &&
          !added[table].has(legacy) &&
          columns.some((column) => column.Field === legacy)
        )
          await c.query(
            `UPDATE \`${table}\` SET \`${canonical}\`=\`${legacy}\` WHERE \`${legacy}\` IS NOT NULL`,
          );
    }
    // Preserve all existing values while widening legacy enum columns for canonical statuses.
    for (const [table, column] of [
      ["users", "status"],
      ["customers", "status"],
      ["deals", "status"],
    ]) {
      const [cols] = await c.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [
        column,
      ]);
      if (cols[0].Type.startsWith("enum("))
        await c.query(`ALTER TABLE ${table} MODIFY ${column} VARCHAR(50) NULL`);
    }
    // Old deals stored a stage code/name; link only unambiguous configured stages.
    await c.query(
      "UPDATE deals d JOIN pipeline_stages s ON d.stage=s.code OR d.stage=s.name SET d.stage_id=s.id WHERE d.stage_id IS NULL",
    );
    const [[version]] = await c.query(
      "SELECT id FROM crm_migrations WHERE version='001_sprint_1_5' LIMIT 1",
    );
    if (!version) {
      await c.query(
        "UPDATE deals SET status='WON',actual_amount=COALESCE(actual_amount,amount) WHERE UPPER(stage)='WON' AND status='OPEN'",
      );
      await c.query(
        "UPDATE deals SET status='LOST' WHERE UPPER(stage)='LOST' AND status='OPEN'",
      );
    }
    // Only backfill genuinely missing aliases; never replace existing role IDs.
    await c.query(
      "UPDATE roles SET role_name=COALESCE(role_name,name,code), name=COALESCE(name,role_name,code)",
    );
    const [users] = await c.query(
      "SELECT u.id,u.role_code,r.role_name,r.name FROM users u LEFT JOIN roles r ON r.id=u.role_id",
    );
    for (const u of users) {
      const role =
        normalizeRole(u.role_code) ||
        normalizeRole(u.role_name) ||
        normalizeRole(u.name);
      if (role) {
        const [r] = await c.query("SELECT id FROM user_roles WHERE user_id=?", [
          u.id,
        ]);
        if (!r.length)
          await c.query(
            "INSERT INTO user_roles (user_id,role_code) VALUES (?,?)",
            [u.id, role],
          );
      }
    }
    // Empty tax identifiers are absence, not a shared identifier.
    await c.query("UPDATE customers SET tax_code=NULL WHERE TRIM(tax_code)=''");
    for (const [table, list] of Object.entries(indexes)) {
      const [existing] = await c.query(`SHOW INDEX FROM \`${table}\``);
      for (const [name, cols, unique] of list)
        if (!existing.some((x) => x.Key_name === name))
          await c.query(
            `ALTER TABLE \`${table}\` ADD ${unique ? "UNIQUE " : ""}INDEX \`${name}\` (${cols.map((x) => `\`${x}\``).join(",")})`,
          );
    }
    for (const [table, column, parent] of foreignKeys) {
      const [existing] = await c.query(
        "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=? AND REFERENCED_TABLE_NAME=?",
        [table, column, parent],
      );
      if (existing.length) continue;
      const [[orphans]] = await c.query(
        `SELECT COUNT(*) n FROM \`${table}\` child LEFT JOIN \`${parent}\` parent ON parent.id=child.\`${column}\` WHERE child.\`${column}\` IS NOT NULL AND parent.id IS NULL`,
      );
      if (orphans.n)
        throw new Error(
          `Cannot add ${table}.${column} reference: ${orphans.n} orphaned records. Existing records were preserved.`,
        );
      await c.query(
        `ALTER TABLE \`${table}\` ADD CONSTRAINT \`fk_crm_${table}_${column}\` FOREIGN KEY (\`${column}\`) REFERENCES \`${parent}\` (id) ON DELETE RESTRICT`,
      );
    }
    await c.query(
      "INSERT INTO crm_migrations (version) VALUES ('001_sprint_1_5') ON DUPLICATE KEY UPDATE version=VALUES(version)",
    );
    console.log("Migration complete; no demo data inserted.");
  } finally {
    await c.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(),':migrations'))");
    c.release();
  }
}
if (require.main === module)
  migrate()
    .catch((e) => {
      console.error("Migration failed:", e.message);
      process.exitCode = 1;
    })
    .finally(() => db.end());
module.exports = { migrate, schema, foreignKeys };
